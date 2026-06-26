#!/usr/bin/env node
/**
 * Migrate `centers` collection -> `baseCamps` collection.
 *
 * - Copies each doc from `centers` to `baseCamps` with the SAME doc ID.
 *   The destination doc gets the same fields the source had (so existing
 *   data lives untouched under its new name).
 * - Adds `baseCampId` foreign-key references on related docs in:
 *     - workOrders   (was using `centerId`)
 *     - workgroups   (was using `centerId`)
 *     - escalations  (was using `centerId`)
 *     - users        (was using `centerIds` array; we add `baseCampIds`)
 *     - events       (was using `centerIds` array; we add `baseCampIds`)
 * - Idempotent: re-running is safe. Skips collection copies where the
 *   destination doc already exists, and skips foreign-key updates when
 *   the new field is already populated.
 * - Does NOT delete the old `centers` collection or the old `centerId` /
 *   `centerIds` fields. Cleanup is manual after verifying the cutover.
 *
 * Usage:
 *   node scripts/migrate-centers-to-base-camps.js [--dry-run]
 *
 * Env:
 *   FIREBASE_PROJECT_ID   defaults to 'faith-responders-prod'
 *   GOOGLE_APPLICATION_CREDENTIALS   path to service account JSON, OR
 *   FIREBASE_TOKEN_PATH   path to a firebase-tools.json with tokens.access_token
 *
 * Uses the same Firestore REST + firebase-tools.json access-token approach
 * as the other scripts in this directory (e.g. migrate-assessments-to-work-orders.js).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'faith-responders-prod';
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Firestore REST helpers — same shape as other scripts in this directory.
// ---------------------------------------------------------------------------
function loadAccessToken() {
  if (process.env.FIREBASE_TOKEN_PATH && fs.existsSync(process.env.FIREBASE_TOKEN_PATH)) {
    const cfg = JSON.parse(fs.readFileSync(process.env.FIREBASE_TOKEN_PATH, 'utf8'));
    return cfg.tokens && cfg.tokens.access_token;
  }
  const candidates = [
    path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
    'C:/ClaudeProfiles/personal/.config/configstore/firebase-tools.json',
    'C:/Users/mattl/.config/configstore/firebase-tools.json',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(c, 'utf8'));
        if (cfg.tokens && cfg.tokens.access_token) return cfg.tokens.access_token;
      } catch (_) { /* try next */ }
    }
  }
  throw new Error(
    'No Firestore access token found. Set FIREBASE_TOKEN_PATH or run `firebase login`.'
  );
}

const TOKEN = loadAccessToken();

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${urlPath}`,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Firestore REST field encoding/decoding.
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

function fromField(f) {
  if (!f) return undefined;
  if (f.nullValue !== undefined) return null;
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.booleanValue !== undefined) return f.booleanValue;
  if (f.integerValue !== undefined) return Number(f.integerValue);
  if (f.doubleValue !== undefined) return f.doubleValue;
  if (f.timestampValue !== undefined) return f.timestampValue;
  if (f.arrayValue) return (f.arrayValue.values || []).map(fromField);
  if (f.mapValue) {
    const out = {};
    for (const k of Object.keys(f.mapValue.fields || {})) out[k] = fromField(f.mapValue.fields[k]);
    return out;
  }
  return undefined;
}

function decodeDoc(doc) {
  const out = {};
  for (const k of Object.keys(doc.fields || {})) out[k] = fromField(doc.fields[k]);
  return out;
}

async function listAllDocs(collection) {
  const all = [];
  let pageToken = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = `?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const result = await request('GET', `/${collection}${query}`, null);
    if (result && result.error) {
      // 404 for an empty/non-existent collection is fine.
      if (result.error.code === 404) break;
      throw new Error(`list ${collection} failed: ${JSON.stringify(result.error)}`);
    }
    for (const doc of result.documents || []) {
      const id = doc.name.split('/').pop();
      all.push({ id, data: decodeDoc(doc) });
    }
    pageToken = result.nextPageToken || '';
    if (!pageToken) break;
  }
  return all;
}

async function getDoc(collection, id) {
  const result = await request('GET', `/${collection}/${id}`, null);
  if (result && result.error) {
    if (result.error.code === 404) return null;
    throw new Error(`get ${collection}/${id} failed: ${JSON.stringify(result.error)}`);
  }
  return decodeDoc(result);
}

async function writeDoc(collection, id, data) {
  if (DRY_RUN) return;
  // Use full PATCH without updateMask to fully replace the doc with the given fields.
  const result = await request('PATCH', `/${collection}/${id}`, { fields: toField(data).mapValue.fields });
  if (result && result.error) throw new Error(`write ${collection}/${id} failed: ${JSON.stringify(result.error)}`);
}

async function patchFields(collection, id, partial) {
  if (DRY_RUN) return;
  const masks = Object.keys(partial).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const result = await request('PATCH', `/${collection}/${id}?${masks}`, { fields: toField(partial).mapValue.fields });
  if (result && result.error) throw new Error(`patch ${collection}/${id} failed: ${JSON.stringify(result.error)}`);
}

// ---------------------------------------------------------------------------
// Migration.
// ---------------------------------------------------------------------------
async function migrateCollection() {
  console.log(`Listing source collection: centers (project=${PROJECT_ID})`);
  const docs = await listAllDocs('centers');
  console.log(`  Found ${docs.length} doc(s) in centers.`);

  let copied = 0;
  let skipped = 0;
  for (const { id, data } of docs) {
    const existing = await getDoc('baseCamps', id);
    if (existing) {
      skipped++;
      continue;
    }
    console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}copy centers/${id} -> baseCamps/${id}`);
    await writeDoc('baseCamps', id, data);
    copied++;
  }
  console.log(`Collection migration: ${copied} copied, ${skipped} already present.`);
}

// Rename a scalar `centerId` field by writing `baseCampId` alongside it.
async function migrateScalarForeignKeyOn(collection) {
  console.log(`Adding baseCampId (from centerId) on ${collection}...`);
  const docs = await listAllDocs(collection);
  let updated = 0;
  let unchanged = 0;
  for (const { id, data } of docs) {
    if (data.centerId === undefined) {
      unchanged++;
      continue;
    }
    if (data.baseCampId === undefined) {
      // Copy centerId into baseCampId; we cannot remove the old field via a
      // sparse PATCH (the REST API requires explicit nullValue + mask to
      // clear it, and a sparse PATCH that omits a field LEAVES it intact).
      // To make the script idempotent and safe, we leave centerId in place;
      // the app code now reads baseCampId. Manual cleanup of the old field
      // is optional.
      console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}${collection}/${id}: add baseCampId=${data.centerId}`);
      await patchFields(collection, id, { baseCampId: data.centerId });
      updated++;
    } else {
      unchanged++;
    }
  }
  console.log(`  ${collection}: ${updated} updated, ${unchanged} unchanged.`);
}

// Rename an array `centerIds` field by writing `baseCampIds` alongside it.
async function migrateArrayForeignKeyOn(collection) {
  console.log(`Adding baseCampIds (from centerIds) on ${collection}...`);
  const docs = await listAllDocs(collection);
  let updated = 0;
  let unchanged = 0;
  for (const { id, data } of docs) {
    const centerIds = data.centerIds;
    if (centerIds === undefined) {
      unchanged++;
      continue;
    }
    if (data.baseCampIds === undefined) {
      const arr = Array.isArray(centerIds) ? centerIds : [];
      console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}${collection}/${id}: add baseCampIds=[${arr.join(',')}]`);
      await patchFields(collection, id, { baseCampIds: arr });
      updated++;
    } else {
      unchanged++;
    }
  }
  console.log(`  ${collection}: ${updated} updated, ${unchanged} unchanged.`);
}

async function main() {
  console.log('==========================================================');
  console.log(`  Migration: centers -> baseCamps`);
  console.log(`  Project:   ${PROJECT_ID}`);
  console.log(`  Mode:      ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'}`);
  console.log('==========================================================\n');

  await migrateCollection();

  console.log('');
  // Collections with a scalar `centerId` field.
  for (const coll of ['workOrders', 'workgroups', 'escalations']) {
    await migrateScalarForeignKeyOn(coll);
  }

  console.log('');
  // Collections with an array `centerIds` field.
  for (const coll of ['users', 'events']) {
    await migrateArrayForeignKeyOn(coll);
  }

  console.log('\nDone.');
  console.log('Note: this script does NOT delete the source `centers` collection');
  console.log('or the old `centerId`/`centerIds` fields. Verify everything works');
  console.log('on the deployed app, then drop them manually.');
}

main().catch((err) => {
  console.error('Migration error:', err && err.stack ? err.stack : err);
  process.exit(1);
});
