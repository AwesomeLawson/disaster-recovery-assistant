const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'faith-responders-prod';
const DOC_ID = 'yL29HAnrw19v2XTuSvFO';
const NEW_ADDRESS = '113 W Cleveland St, Nahunta, GA 31553';
const LAT = 31.2019807;
const LNG = -81.9970843;

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

async function main() {
  // First read the existing document
  const getOptions = {
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/assessments/${DOC_ID}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  };
  const existing = await httpsRequest(getOptions, null);
  if (existing.error) { console.error('Read failed:', existing.error); process.exit(1); }
  console.log('Current address:', existing.fields.address?.stringValue);
  console.log('Current lat:', existing.fields.latitude?.doubleValue);
  console.log('Current lng:', existing.fields.longitude?.doubleValue);

  // Patch with new address + coordinates
  const updateBody = JSON.stringify({
    fields: {
      ...existing.fields,
      address: { stringValue: NEW_ADDRESS },
      latitude: { doubleValue: LAT },
      longitude: { doubleValue: LNG },
      updatedAt: { integerValue: Date.now().toString() }
    }
  });

  const patchPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/assessments/${DOC_ID}` +
    `?updateMask.fieldPaths=address&updateMask.fieldPaths=latitude&updateMask.fieldPaths=longitude&updateMask.fieldPaths=updatedAt`;

  const patchOptions = {
    hostname: 'firestore.googleapis.com',
    path: patchPath,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(updateBody)
    }
  };

  const result = await httpsRequest(patchOptions, updateBody);
  if (result.error) {
    console.error('Update failed:', JSON.stringify(result.error));
  } else {
    console.log('\nUpdated successfully!');
    console.log('  address:', result.fields?.address?.stringValue);
    console.log('  latitude:', result.fields?.latitude?.doubleValue);
    console.log('  longitude:', result.fields?.longitude?.doubleValue);
  }
}

main().catch(console.error);
