import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { User } from '../types';
import { resolveAnthropicKey } from '../lib/anthropicKey';

const db = admin.firestore();

const ALLOWED_WRITE_ROLES = ['baseCampHost', 'administrator'];

async function requireToolWriter(uid: string): Promise<void> {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User | undefined;
  if (!user || !user.roles.some((r) => ALLOWED_WRITE_ROLES.includes(r))) {
    throw new HttpsError(
      'permission-denied',
      'Only base camp hosts or administrators can perform this action'
    );
  }
}

const SUGGESTION_PROMPT =
  'Look at this photo of relief-work tools. List each distinct tool or piece of equipment you can identify. ' +
  'Return ONLY a JSON array of objects with shape: {"name": "Chainsaw", "category": "chainsaw", "quantity": 1}. ' +
  'Use simple lowercase categories like "chainsaw", "ladder", "hand tool", "power tool", "ppe", "generator", etc. ' +
  "If you can't identify any tools, return [].";

interface SuggestedItem {
  name: string;
  category?: string;
  quantity?: number;
}

function extractJsonArray(text: string): SuggestedItem[] {
  if (!text) return [];
  // Strip code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  // Find the first [ and last ] to be robust against any preamble.
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  const slice = cleaned.substring(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((it) => it && typeof it === 'object' && typeof it.name === 'string' && it.name.trim())
      .map((it) => ({
        name: String(it.name).trim(),
        category: typeof it.category === 'string' ? it.category.trim() : undefined,
        quantity:
          typeof it.quantity === 'number' && it.quantity > 0 ? Math.floor(it.quantity) : 1,
      }));
  } catch {
    return [];
  }
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf.toString('base64'), mediaType: contentType };
}

export const suggestToolsFromPhoto = onCall(
  { cors: true, timeoutSeconds: 60 },
  async (request: any) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
    await requireToolWriter(request.auth.uid);

    const { photoUrl } = request.data || {};
    if (!photoUrl || typeof photoUrl !== 'string') {
      throw new HttpsError('invalid-argument', 'photoUrl is required');
    }

    const { apiKey } = await resolveAnthropicKey(null);
    if (!apiKey) {
      // No key configured — graceful degradation.
      return { available: false, items: [] };
    }

    try {
      const { data: imageBase64, mediaType } = await fetchImageAsBase64(photoUrl);

      // Lazy-load the SDK so missing-package failures surface cleanly.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Anthropic = require('@anthropic-ai/sdk').default;
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: SUGGESTION_PROMPT,
              },
            ],
          },
        ],
      });

      // Concatenate any text blocks in the response.
      const textOut = (response.content || [])
        .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
        .map((b: any) => b.text)
        .join('\n');

      const items = extractJsonArray(textOut);
      return { available: true, items };
    } catch (err: any) {
      console.error('suggestToolsFromPhoto error:', err);
      return {
        available: true,
        items: [],
        error: err?.message || 'Failed to analyze photo',
      };
    }
  }
);
