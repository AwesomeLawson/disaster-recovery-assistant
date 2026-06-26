const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'faith-responders-prod';
const BASE_CAMP_NAME = 'Nahunta, Georgia Base Camp';

const config = JSON.parse(fs.readFileSync('C:/ClaudeProfiles/personal/.config/configstore/firebase-tools.json', 'utf8'));
const token = config.tokens.access_token;

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function geocode(address) {
  const encoded = encodeURIComponent(address);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'nominatim.openstreetmap.org',
      path: `/search?format=json&q=${encoded}&limit=1`,
      method: 'GET',
      headers: { 'User-Agent': 'faith-responders-app/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), display: results[0].display_name });
          } else {
            resolve(null);
          }
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // List all base camps
  const listOptions = {
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/baseCamps`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  };
  const list = await httpsRequest(listOptions, null);
  if (list.error) { console.error('List failed:', list.error); process.exit(1); }

  const docs = list.documents || [];
  const baseCamp = docs.find(d => d.fields?.name?.stringValue === BASE_CAMP_NAME);

  if (!baseCamp) {
    console.log('Base camps found:');
    docs.forEach(d => console.log(' -', d.fields?.name?.stringValue, '|', d.name));
    console.error(`\nBase camp "${BASE_CAMP_NAME}" not found`);
    process.exit(1);
  }

  const docId = baseCamp.name.split('/').pop();
  const address = baseCamp.fields?.address?.stringValue;
  const currentLat = baseCamp.fields?.latitude?.doubleValue;
  const currentLng = baseCamp.fields?.longitude?.doubleValue;

  console.log('Found base camp:', BASE_CAMP_NAME);
  console.log('  Doc ID:', docId);
  console.log('  Address:', address);
  console.log('  Current coords:', currentLat != null ? `${currentLat}, ${currentLng}` : 'none');

  if (!address) { console.error('No address to geocode'); process.exit(1); }

  console.log('\nGeocoding...');
  const coords = await geocode(address);
  if (!coords) { console.error('Geocoding returned no results'); process.exit(1); }
  console.log('  Result:', coords.display);
  console.log('  Coords:', coords.lat, coords.lng);

  // Patch the document
  const updateBody = JSON.stringify({
    fields: {
      ...baseCamp.fields,
      latitude: { doubleValue: coords.lat },
      longitude: { doubleValue: coords.lng },
      updatedAt: { integerValue: Date.now().toString() }
    }
  });

  const patchPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/baseCamps/${docId}` +
    `?updateMask.fieldPaths=latitude&updateMask.fieldPaths=longitude&updateMask.fieldPaths=updatedAt`;

  const result = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path: patchPath,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(updateBody)
    }
  }, updateBody);

  if (result.error) {
    console.error('\nUpdate failed:', JSON.stringify(result.error));
  } else {
    console.log('\nUpdated successfully!');
    console.log('  latitude:', result.fields?.latitude?.doubleValue);
    console.log('  longitude:', result.fields?.longitude?.doubleValue);
  }
}

main().catch(console.error);
