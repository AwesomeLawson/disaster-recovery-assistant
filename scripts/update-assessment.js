const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'faith-responders-prod';
const NEW_ADDRESS = '113 W Cleveland St, Nahunta, GA 31553';

// Read Firebase access token
const configPath = 'C:/ClaudeProfiles/personal/.config/configstore/firebase-tools.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.tokens.access_token;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // 1. Geocode the real address via Nominatim (OpenStreetMap)
  console.log('Geocoding address...');
  const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(NEW_ADDRESS)}&format=json&limit=1`;
  const geocodeRaw = await new Promise((resolve, reject) => {
    https.get(geocodeUrl, { headers: { 'User-Agent': 'faith-responders-app/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
  if (!geocodeRaw.length) {
    console.error('Geocoding returned no results');
    process.exit(1);
  }
  const lat = parseFloat(geocodeRaw[0].lat);
  const lng = parseFloat(geocodeRaw[0].lon);
  console.log(`Coordinates: ${lat}, ${lng}`);

  // 2. Query Firestore for assessments with "Nahunta" in the address
  console.log('Querying Firestore for Nahunta assessment...');
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const queryBody = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'assessments' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'address' },
          op: 'GREATER_THAN_OR_EQUAL',
          value: { stringValue: 'Nahunta' }
        }
      },
      limit: 10
    }
  });

  const queryOptions = {
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(queryBody)
    }
  };

  const results = await httpsRequest(queryOptions, queryBody);
  const docs = results.filter(r => r.document);
  console.log(`Found ${docs.length} document(s):`);
  docs.forEach(r => {
    const fields = r.document.fields;
    const name = r.document.name;
    const docId = name.split('/').pop();
    console.log(`  ID: ${docId}`);
    console.log(`  placeName: ${fields.placeName?.stringValue}`);
    console.log(`  address: ${fields.address?.stringValue}`);
    console.log(`  lat: ${fields.latitude?.doubleValue ?? fields.latitude?.integerValue}`);
    console.log(`  lng: ${fields.longitude?.doubleValue ?? fields.longitude?.integerValue}`);
  });

  if (docs.length === 0) {
    console.log('\nNo exact match. Listing all assessments:');
    const listUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/assessments?pageSize=20`;
    const listOptions = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/assessments?pageSize=20`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    const list = await httpsRequest(listOptions, null);
    (list.documents || []).forEach(doc => {
      const fields = doc.fields;
      const docId = doc.name.split('/').pop();
      console.log(`  ID: ${docId} | ${fields.placeName?.stringValue} | ${fields.address?.stringValue}`);
    });
    return;
  }

  // 3. Update the first matching assessment
  const doc = docs[0].document;
  const docId = doc.name.split('/').pop();
  console.log(`\nUpdating assessment ${docId}...`);

  const updateBody = JSON.stringify({
    fields: {
      ...doc.fields,
      address: { stringValue: NEW_ADDRESS },
      latitude: { doubleValue: lat },
      longitude: { doubleValue: lng },
      updatedAt: { integerValue: Date.now().toString() }
    }
  });

  const updateOptions = {
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/assessments/${docId}`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(updateBody)
    }
  };

  const updateResult = await httpsRequest(updateOptions, updateBody);
  if (updateResult.error) {
    console.error('Update failed:', JSON.stringify(updateResult.error));
  } else {
    console.log('Updated successfully!');
    console.log(`  address: ${updateResult.fields?.address?.stringValue}`);
    console.log(`  latitude: ${updateResult.fields?.latitude?.doubleValue}`);
    console.log(`  longitude: ${updateResult.fields?.longitude?.doubleValue}`);
  }
}

main().catch(console.error);
