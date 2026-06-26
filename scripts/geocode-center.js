const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'faith-responders-prod';
const CENTER_NAME = 'Nahunta, Georgia Base Camp';

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
  // List all centers
  const listOptions = {
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/centers`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  };
  const list = await httpsRequest(listOptions, null);
  if (list.error) { console.error('List failed:', list.error); process.exit(1); }

  const docs = list.documents || [];
  const center = docs.find(d => d.fields?.name?.stringValue === CENTER_NAME);

  if (!center) {
    console.log('Centers found:');
    docs.forEach(d => console.log(' -', d.fields?.name?.stringValue, '|', d.name));
    console.error(`\nCenter "${CENTER_NAME}" not found`);
    process.exit(1);
  }

  const docId = center.name.split('/').pop();
  const address = center.fields?.address?.stringValue;
  const currentLat = center.fields?.latitude?.doubleValue;
  const currentLng = center.fields?.longitude?.doubleValue;

  console.log('Found center:', CENTER_NAME);
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
      ...center.fields,
      latitude: { doubleValue: coords.lat },
      longitude: { doubleValue: coords.lng },
      updatedAt: { integerValue: Date.now().toString() }
    }
  });

  const patchPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/centers/${docId}` +
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
