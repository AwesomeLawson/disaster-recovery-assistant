const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'faith-responders-prod';

const config = JSON.parse(fs.readFileSync('C:/ClaudeProfiles/personal/.config/configstore/firebase-tools.json', 'utf8'));
const token = config.tokens.access_token;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Convert a plain JS value to a Firestore REST field value
function toField(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number' && Number.isInteger(v)) return { integerValue: v.toString() };
  if (typeof v === 'number') return { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toField) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = toField(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function toDoc(obj) {
  const fields = {};
  for (const k of Object.keys(obj)) fields[k] = toField(obj[k]);
  return { fields };
}

async function findUser(email) {
  // List users and find by email
  const result = await request('GET', '/users?pageSize=200', null);
  if (result.error) throw new Error('Failed to list users: ' + JSON.stringify(result.error));
  const docs = result.documents || [];
  for (const doc of docs) {
    if (doc.fields?.email?.stringValue === email) {
      return doc.name.split('/').pop(); // doc ID = uid
    }
  }
  return null;
}

async function createDoc(collection, data) {
  const result = await request('POST', `/${collection}`, toDoc(data));
  if (result.error) throw new Error(`Failed to create ${collection}: ` + JSON.stringify(result.error));
  return result.name.split('/').pop(); // return generated doc ID
}

async function patchDoc(collection, id, data, fieldPaths) {
  const mask = fieldPaths.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const path = `/${collection}/${id}?${mask}`;
  const result = await request('PATCH', path, toDoc(data));
  if (result.error) throw new Error(`Failed to patch ${collection}/${id}: ` + JSON.stringify(result.error));
  return result;
}

async function main() {
  const now = Date.now();

  console.log('Looking up user mattlawson80@gmail.com...');
  const userId = await findUser('mattlawson80@gmail.com');
  if (!userId) {
    console.error('User not found. Aborting.');
    process.exit(1);
  }
  console.log('  Found user:', userId);

  // 1. Create Tampa test event
  console.log('\nCreating Tampa test event...');
  const eventId = await createDoc('events', {});
  await patchDoc('events', eventId, {
    id: eventId,
    name: 'Tampa Hurricane Test Event',
    eventType: 'hurricane',
    description: 'Test event for Tampa Bay area hurricane response',
    userIds: [userId],
    baseCampIds: [],
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  }, ['id', 'name', 'eventType', 'description', 'userIds', 'baseCampIds', 'createdBy', 'createdAt', 'updatedAt']);
  console.log('  Event ID:', eventId);

  // 2. Create Lake Magdalene Church base camp
  console.log('\nCreating Lake Magdalene Church base camp...');
  const baseCampId = await createDoc('baseCamps', {});
  await patchDoc('baseCamps', baseCampId, {
    id: baseCampId,
    name: 'Lake Magdalene United Methodist Church',
    address: '2902 W Fletcher Ave, Tampa, FL 33618',
    latitude: 28.066075,
    longitude: -82.497916,
    eventIds: [eventId],
    leadUserIds: [userId],
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  }, ['id', 'name', 'address', 'latitude', 'longitude', 'eventIds', 'leadUserIds', 'createdBy', 'createdAt', 'updatedAt']);
  console.log('  Base Camp ID:', baseCampId);

  // Link base camp to event
  await patchDoc('events', eventId, { baseCampIds: [baseCampId], updatedAt: now }, ['baseCampIds', 'updatedAt']);
  console.log('  Linked base camp to event');

  // Add event to user record
  await patchDoc('users', userId, { eventIds: [eventId], updatedAt: now }, ['eventIds', 'updatedAt']);
  console.log('  Linked event to user');

  // 3. Create test case
  console.log('\nCreating test case at 14511 Nettle Creek Rd...');
  const assessmentId = await createDoc('assessments', {});
  await patchDoc('assessments', assessmentId, {
    id: assessmentId,
    status: 'awaitingAssessment',
    survivorName: 'Matt Lawson',
    survivorPhone: '555-867-5309',
    address: '14511 Nettle Creek Rd, Tampa, FL 33624, USA',
    latitude: 28.073816,
    longitude: -82.502045,
    descriptionOfNeed: 'Test case — roof damage and debris removal needed after storm',
    source: 'walk-in',
    baseCampId,
    eventId,
    assessorId: userId,
    intakeVolunteerName: 'Matt Lawson',
    photoUrls: [],
    reassessmentCount: 0,
    flaggedForReview: false,
    createdAt: now,
    updatedAt: now,
  }, ['id', 'status', 'survivorName', 'survivorPhone', 'address', 'latitude', 'longitude',
      'descriptionOfNeed', 'source', 'baseCampId', 'eventId', 'assessorId', 'intakeVolunteerName',
      'photoUrls', 'reassessmentCount', 'flaggedForReview', 'createdAt', 'updatedAt']);
  console.log('  Assessment ID:', assessmentId);

  console.log('\nAll test data created successfully!');
  console.log('  Event:', eventId);
  console.log('  Base Camp:', baseCampId);
  console.log('  Assessment:', assessmentId);
  console.log('  Assignee:', userId, '(mattlawson80@gmail.com)');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
