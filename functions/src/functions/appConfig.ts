import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { User } from '../types';
import { resolveAnthropicKey, safeSecretValue } from '../lib/anthropicKey';

const db = admin.firestore();
const anthropicKey = defineSecret('ANTHROPIC_API_KEY');

const CONFIG_COLLECTION = 'appConfig';
const ANTHROPIC_DOC = 'anthropic';

async function requireAdmin(uid: string): Promise<User> {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User | undefined;
  if (!user || !user.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can perform this action');
  }
  return user;
}

export const setAnthropicApiKey = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  const admin_ = await requireAdmin(request.auth.uid);

  const { apiKey } = request.data || {};
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new HttpsError('invalid-argument', 'apiKey is required');
  }
  const trimmed = apiKey.trim();
  if (trimmed.length < 20 || trimmed.length > 200) {
    throw new HttpsError('invalid-argument', 'apiKey length looks wrong');
  }

  await db.collection(CONFIG_COLLECTION).doc(ANTHROPIC_DOC).set({
    apiKey: trimmed,
    updatedAt: Date.now(),
    updatedBy: request.auth.uid,
    updatedByName: `${admin_.firstName} ${admin_.lastName}`.trim() || admin_.email,
  });

  return { success: true };
});

export const clearAnthropicApiKey = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireAdmin(request.auth.uid);

  await db.collection(CONFIG_COLLECTION).doc(ANTHROPIC_DOC).delete();
  return { success: true };
});

export const getAnthropicApiKeyStatus = onCall(
  { cors: true, secrets: [anthropicKey] },
  async (request: any) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
    await requireAdmin(request.auth.uid);

    const snap = await db.collection(CONFIG_COLLECTION).doc(ANTHROPIC_DOC).get();
    const data = snap.exists ? snap.data() : null;
    const firestoreConfigured = !!data?.apiKey;
    const secretConfigured = !!safeSecretValue(() => anthropicKey.value());

    return {
      configured: firestoreConfigured || secretConfigured,
      source: firestoreConfigured ? 'firestore' : secretConfigured ? 'secret' : 'none',
      updatedAt: data?.updatedAt || null,
      updatedByName: data?.updatedByName || null,
    };
  }
);

export const testAnthropicApiKey = onCall(
  { cors: true, secrets: [anthropicKey], timeoutSeconds: 30 },
  async (request: any) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
    await requireAdmin(request.auth.uid);

    const secretValue = safeSecretValue(() => anthropicKey.value());
    const resolution = await resolveAnthropicKey(secretValue);
    if (!resolution.apiKey) {
      return { ok: false, error: 'No API key configured', source: resolution.source };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Anthropic = require('@anthropic-ai/sdk').default;
      const client = new Anthropic({ apiKey: resolution.apiKey });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Reply with the single word "ok".' }],
      });
      const text = (response.content || [])
        .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
        .map((b: any) => b.text)
        .join('');
      return { ok: true, source: resolution.source, sampleResponse: text.trim().slice(0, 40) };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Test call failed', source: resolution.source };
    }
  }
);
