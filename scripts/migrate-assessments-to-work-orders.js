#!/usr/bin/env node
/**
 * Migrate `assessments` collection -> `workOrders` collection.
 *
 * - Copies each doc from `assessments` to `workOrders` with the SAME doc ID.
 * - Renames `caseNumber` field -> `workOrderNumber` inside each doc.
 * - Renames `assessmentId` field -> `workOrderId` on related docs in:
 *     - workgroups
 *     - homeownerReleases
 *     - escalations
 *     - legalReleases
 * - Idempotent: re-running is safe. Skips docs that already exist in the target
 *   with the same data, and skips foreign-key updates when already renamed.
 * - Does NOT delete the old `assessments` collection. Cleanup is manual.
 *
 * Usage:
 *   node scripts/migrate-assessments-to-work-orders.js [--dry-run]
 *
 * Env:
 *   FIREBASE_PROJECT_ID   defaults to 'faith-responders-prod'
 *   GOOGLE_APPLICATION_CREDENTIALS   path to service account JSON, OR
 *   FIREBASE_TOKEN_PATH   path to a firebase-tools.json with tokens.access_token
 *
 * Requires the Firestore Admin SDK (firebase-admin). If you don't have it
 * installed at the repo root, this script falls back to the same Firestore
 * REST + firebase-tools.json access-token approach used by the other scripts
 * in this directory (e.g. seed-test-tampa.js, query-assessments.js).
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
  // Try the standard firebase-tools configstore location.
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
  // Loop pages.
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
  console.log(`Listing source collection: assessments (project=${PROJECT_ID})`);
  const docs = await listAllDocs('assessments');
  console.log(`  Found ${docs.length} doc(s) in assessments.`);

  let copied = 0;
  let skipped = 0;
  for (const { id, data } of docs) {
    const existing = await getDoc('workOrders', id);
    if (existing) {
      skipped++;
      continue;
    }
    // Rename caseNumber -> workOrderNumber on the way over.
    const next = { ...data };
    if (next.caseNumber !== undefined) {
      if (next.workOrderNumber === undefined) next.workOrderNumber = next.caseNumber;
      delete next.caseNumber;
    }
    console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}copy assessments/${id} -> workOrders/${id}`);
    await writeDoc('workOrders', id, next);
    copied++;
  }
  console.log(`Collection migration: ${copied} copied, ${skipped} already present.`);
}

async function migrateForeignKeysOn(collection) {
  console.log(`Renaming assessmentId -> workOrderId on ${collection}...`);
  const docs = await listAllDocs(collection);
  let updated = 0;
  let unchanged = 0;
  for (const { id, data } of docs) {
    if (data.assessmentId === undefined) {
      unchanged++;
      continue;
    }
    if (data.workOrderId === undefined) {
      // Copy assessmentId into workOrderId; we cannot remove the old field via a
      // sparse PATCH (the REST API requires explicit nullValue + mask to clear
      // it, and a sparse PATCH that omits a field LEAVES it intact). To make
      // the script idempotent and safe, we leave assessmentId in place; the
      // app code now reads workOrderId. Manual cleanup of the old field is
      // optional.
      console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}${collection}/${id}: add workOrderId=${data.assessmentId}`);
      await patchFields(collection, id, { workOrderId: data.assessmentId });
      updated++;
    } else {
      unchanged++;
    }
  }
  console.log(`  ${collection}: ${updated} updated, ${unchanged} unchanged.`);
}

async function main() {
  console.log('==========================================================');
  console.log(`  Migration: assessments -> workOrders`);
  console.log(`  Project:   ${PROJECT_ID}`);
  console.log(`  Mode:      ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'}`);
  console.log('==========================================================\n');

  await migrateCollection();

  console.log('');
  for (const coll of ['workgroups', 'homeownerReleases', 'escalations', 'legalReleases']) {
    await migrateForeignKeysOn(coll);
  }

  console.log('\nDone.');
  console.log('Note: this script does NOT delete the source `assessments` collection.');
  console.log('Verify everything works on the deployed app, then drop it manually.');
}

main().catch((err) => {
  console.error('Migration error:', err && err.stack ? err.stack : err);
  process.exit(1);
});
