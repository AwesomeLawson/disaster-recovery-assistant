const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'faith-responders-prod';

const CHURCHES = [
  'Alpharetta Methodist',
  'Bethesda Global Methodist Church',
  'Bonaire Church',
  'Boynton Chapel Methodist',
  'Cairo First Methodist Cairo Ga',
  'Christ Church Frederica, St Simons Island',
  'Christ the King, Pine Mountain',
  'College Place Methodist',
  'Community Methodist Church',
  'Cornerstone Marion',
  'County Line Church',
  'Crossroad Church, Jacksonville',
  'Dundee Methodist Church',
  'Faith community Methodist JAX',
  'First Methodist Albany',
  'First Methodist Church of DeLand',
  'First Methodist Church of Moore Haven',
  'First Methodist Church of Zephyrhills',
  'Fort Meade Methodist',
  'Georgianna Church',
  'Glynn Amateur Radio Association',
  'Good Shepherd Savannah',
  'Gulfshores Methodist',
  'Harvest Church',
  'Hazlehurst First Methodist',
  'Killearn Methodist Church',
  'Living Hope Church',
  'McIntosh County Volunteer Fire Department',
  'Miccosukee Methodist Church',
  'Nashville Methodist Church',
  'New Hope Church',
  'Park Avenue Church',
  'Peachtree Road United Methodist Church',
  'Pierce Chapel',
  'Pine Ridge Baptist Church',
  'Pinehurst Global Methodist Church',
  'Plains Methodist',
  'Ressurection Methodist Church',
  'Rockledge Methodist Church',
  'Shellman Charge',
  'Skidaway Island Methodist',
  'Skidaway Island Methodist Church',
  'The Chapel Brunswick',
  'The Ridge Columbus GA',
  'Trinity Community Church of Fleming Island',
  'Trinity Grace Fellowship, Mansfield, OH',
  'Turning Point Community Church',
  'University Carillon Church',
  'Vacherie Global Methodist',
  'Vero Beach Methodist',
  'Welaka Methodist Church',
  'Westview GMC Blakely',
  'Wilmington Island Methodist Church',
];

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

async function createOrg(name) {
  const id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const body = JSON.stringify({
    fields: {
      id: { stringValue: id },
      name: { stringValue: name },
      createdAt: { integerValue: Date.now().toString() },
      createdBy: { stringValue: 'seed-script' },
    }
  });

  return httpsRequest({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/organizations/${id}`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  }, body);
}

async function main() {
  // Check if collection already has docs
  const list = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/organizations?pageSize=1`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }, null);

  if (list.documents && list.documents.length > 0) {
    console.log('Organizations collection already has data — skipping seed.');
    console.log('Delete existing docs first if you want to re-seed.');
    process.exit(0);
  }

  console.log(`Seeding ${CHURCHES.length} organizations...`);
  let ok = 0;
  for (const name of CHURCHES) {
    const result = await createOrg(name);
    if (result.error) {
      console.error(`  FAILED: ${name} —`, result.error.message);
    } else {
      ok++;
      process.stdout.write('.');
    }
  }
  console.log(`\nDone. ${ok}/${CHURCHES.length} created.`);
}

main().catch(console.error);
