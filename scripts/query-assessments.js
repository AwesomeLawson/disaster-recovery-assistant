const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');

const origHome = process.env.HOME;
process.env.HOME = 'C:\\Users\\mattl';
const configDir = path.join(os.homedir(), '.config', 'configstore');
process.env.HOME = origHome;

const fbConfig = JSON.parse(fs.readFileSync(path.join(configDir, 'firebase-tools.json'), 'utf8'));
const token = fbConfig.tokens?.access_token;
if (!token) { console.error('No access token found'); process.exit(1); }

function firestoreGet(collection) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/faith-responders-prod/databases/(default)/documents/${collection}?pageSize=100`,
      headers: { Authorization: `Bearer ${token}` },
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function val(field) {
  if (!field) return '';
  return field.stringValue ?? field.integerValue ?? field.doubleValue ?? String(field.booleanValue ?? '');
}

(async () => {
  const result = await firestoreGet('assessments');
  if (result.error) { console.error('Firestore error:', result.error.message); process.exit(1); }
  if (!result.documents || result.documents.length === 0) {
    console.log('No assessments found.');
    return;
  }
  console.log(`Found ${result.documents.length} assessment(s):\n`);
  for (const doc of result.documents) {
    const f = doc.fields || {};
    const id = doc.name.split('/').pop();
    const ts = Number(val(f.createdAt));
    console.log(`--- ${id} ---`);
    console.log(`  Place:         ${val(f.placeName)}`);
    console.log(`  Address:       ${val(f.address)}`);
    console.log(`  Severity:      ${val(f.severity)}`);
    console.log(`  Damages:       ${val(f.damages)}`);
    console.log(`  Needs:         ${val(f.needs)}`);
    console.log(`  Affected:      ${val(f.affectedPeople)} people`);
    console.log(`  Assessor ID:   ${val(f.assessorId)}`);
    console.log(`  Center ID:     ${val(f.centerId)}`);
    console.log(`  Event ID:      ${val(f.eventId) || '(none)'}`);
    console.log(`  Flagged:       ${val(f.flaggedForReview)}`);
    console.log(`  Reassessments: ${val(f.reassessmentCount)}`);
    console.log(`  Created:       ${ts ? new Date(ts).toLocaleString() : ''}`);
    console.log();
  }
})();
