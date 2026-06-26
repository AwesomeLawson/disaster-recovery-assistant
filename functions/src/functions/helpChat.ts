import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { HelpConversation, HelpMessage, User } from '../types';
import { USER_GUIDE_MD } from '../data/user-guide';
import { resolveAnthropicKey, safeSecretValue } from '../lib/anthropicKey';

const db = admin.firestore();

const anthropicKey = defineSecret('ANTHROPIC_API_KEY');

const CONVERSATIONS = 'helpConversations';
const MESSAGES = 'helpMessages';

const DEFAULT_TITLE = 'New conversation';
const MAX_CONTENT_CHARS = 4000;
const MAX_TITLE_CHARS = 80;
const TITLE_FROM_FIRST_MESSAGE = 50;
const PREVIEW_CHARS = 100;

const SYSTEM_PROMPT = [
  'You are the Faith Responders help assistant. You help volunteers and staff use the',
  'Faith Responders relief-coordination app and answer questions about disaster-relief',
  'response process based on the user guide below.',
  '',
  'Guardrails:',
  "- Only answer questions about using this app or about disaster-relief response",
  '  topics covered in the user guide. If asked anything off-topic (personal advice,',
  '  unrelated subjects, code generation, etc.) politely decline and redirect to the',
  "  app's scope.",
  "- Never invent app features. If you don't know how to do something based on the",
  '  guide, say so and suggest contacting an administrator.',
  '- Never ask the user for sensitive information like passwords, SSNs, or survivor',
  '  PII beyond what the guide describes as normal app workflow.',
  '- Keep answers concise. If a step-by-step is needed, use a short numbered list.',
  '- When you cite specific features, name the page or button as it appears in the app.',
  '',
  'User Guide:',
  '---',
  USER_GUIDE_MD,
  '---',
  '',
  "Answer the user's questions about using the app based on the guide above.",
].join('\n');

interface CallableRequest {
  auth?: { uid: string };
  data?: any;
}

async function isAdmin(uid: string): Promise<boolean> {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User | undefined;
  return !!user && user.roles?.includes('administrator');
}

function requireAuth(request: CallableRequest): string {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  return request.auth.uid;
}

async function loadConversation(
  conversationId: string,
  uid: string,
  { allowAdmin = false }: { allowAdmin?: boolean } = {}
): Promise<HelpConversation> {
  if (!conversationId || typeof conversationId !== 'string') {
    throw new HttpsError('invalid-argument', 'conversationId is required');
  }
  const snap = await db.collection(CONVERSATIONS).doc(conversationId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Conversation not found');
  }
  const data = snap.data() as HelpConversation;
  if (data.userId !== uid && !(allowAdmin && (await isAdmin(uid)))) {
    throw new HttpsError('not-found', 'Conversation not found');
  }
  return { ...data, id: snap.id };
}

export const createHelpConversation = onCall({ cors: true }, async (request: any) => {
  const uid = requireAuth(request);
  const rawTitle = typeof request.data?.title === 'string' ? request.data.title.trim() : '';
  const title = rawTitle ? rawTitle.slice(0, MAX_TITLE_CHARS) : DEFAULT_TITLE;

  const now = Date.now();
  const ref = db.collection(CONVERSATIONS).doc();
  const conversation: HelpConversation = {
    id: ref.id,
    userId: uid,
    title,
    lastMessageAt: now,
    lastMessagePreview: '',
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(conversation);
  return { conversation };
});

export const listMyHelpConversations = onCall({ cors: true }, async (request: any) => {
  const uid = requireAuth(request);
  const snap = await db
    .collection(CONVERSATIONS)
    .where('userId', '==', uid)
    .orderBy('lastMessageAt', 'desc')
    .get();
  const conversations: HelpConversation[] = snap.docs.map((d) => ({
    ...(d.data() as HelpConversation),
    id: d.id,
  }));
  return { conversations };
});

export const getHelpConversation = onCall({ cors: true }, async (request: any) => {
  const uid = requireAuth(request);
  const { conversationId } = request.data || {};
  const conversation = await loadConversation(conversationId, uid);

  const msgSnap = await db
    .collection(MESSAGES)
    .where('conversationId', '==', conversationId)
    .orderBy('createdAt', 'asc')
    .get();
  const messages: HelpMessage[] = msgSnap.docs.map((d) => ({
    ...(d.data() as HelpMessage),
    id: d.id,
  }));
  return { conversation, messages };
});

export const renameHelpConversation = onCall({ cors: true }, async (request: any) => {
  const uid = requireAuth(request);
  const { conversationId, title } = request.data || {};
  if (typeof title !== 'string' || !title.trim()) {
    throw new HttpsError('invalid-argument', 'title is required');
  }
  await loadConversation(conversationId, uid);
  const trimmed = title.trim().slice(0, MAX_TITLE_CHARS);
  await db.collection(CONVERSATIONS).doc(conversationId).update({
    title: trimmed,
    updatedAt: Date.now(),
  });
  return { success: true, title: trimmed };
});

export const deleteHelpConversation = onCall({ cors: true }, async (request: any) => {
  const uid = requireAuth(request);
  const { conversationId } = request.data || {};
  await loadConversation(conversationId, uid, { allowAdmin: true });

  // Batch-delete all messages for this conversation (Firestore batch caps at 500).
  const msgSnap = await db
    .collection(MESSAGES)
    .where('conversationId', '==', conversationId)
    .get();

  const docs = msgSnap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await db.collection(CONVERSATIONS).doc(conversationId).delete();
  return { success: true };
});

interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

function extractAssistantText(content: any): string {
  if (!Array.isArray(content)) return '';
  return content
    .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
    .map((b: any) => b.text)
    .join('\n')
    .trim();
}

export const sendHelpMessage = onCall(
  { cors: true, secrets: [anthropicKey], timeoutSeconds: 60 },
  async (request: any) => {
    const uid = requireAuth(request);
    const { conversationId, content } = request.data || {};

    if (typeof content !== 'string' || !content.trim()) {
      throw new HttpsError('invalid-argument', 'content is required');
    }
    if (content.length > MAX_CONTENT_CHARS) {
      throw new HttpsError(
        'invalid-argument',
        `content must be ${MAX_CONTENT_CHARS} characters or fewer`
      );
    }

    const conversation = await loadConversation(conversationId, uid);
    const trimmedContent = content.trim();

    // 1) Persist the user's message.
    const now = Date.now();
    const userMsgRef = db.collection(MESSAGES).doc();
    const userMsg: HelpMessage = {
      id: userMsgRef.id,
      conversationId,
      userId: uid,
      role: 'user',
      content: trimmedContent,
      createdAt: now,
    };
    await userMsgRef.set(userMsg);

    // 2) Load prior history (includes the just-written user message).
    const historySnap = await db
      .collection(MESSAGES)
      .where('conversationId', '==', conversationId)
      .orderBy('createdAt', 'asc')
      .get();
    const history: HelpMessage[] = historySnap.docs.map((d) => ({
      ...(d.data() as HelpMessage),
      id: d.id,
    }));

    // 3) Determine if we need to auto-title this conversation.
    const isFirstUserMessage =
      history.filter((m) => m.role === 'user').length === 1 &&
      conversation.title === DEFAULT_TITLE;
    const autoTitle = isFirstUserMessage
      ? trimmedContent.slice(0, TITLE_FROM_FIRST_MESSAGE).trim() || DEFAULT_TITLE
      : null;

    // 4) Resolve API key. If missing, gracefully degrade.
    const { apiKey } = await resolveAnthropicKey(safeSecretValue(() => anthropicKey.value()));

    let assistantText: string;
    if (!apiKey) {
      assistantText =
        'AI assistant is not configured yet. An administrator can set the API key from Admin Settings.';
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Anthropic = require('@anthropic-ai/sdk').default;
        const client = new Anthropic({ apiKey });

        // Build Anthropic messages from prior history (in order).
        const anthropicMessages = history.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // System prompt + user guide as a single cached block. Prompt caching
        // requires the cached portion to exceed Anthropic's minimum cacheable
        // tokens (~1024 for Haiku) — our system prompt + ~1500-word user
        // guide comfortably clears that threshold.
        const systemBlocks: Array<{
          type: 'text';
          text: string;
          cache_control?: { type: 'ephemeral' };
        }> = [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ];

        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemBlocks,
          messages: anthropicMessages,
        });

        assistantText = extractAssistantText(response.content);
        if (!assistantText) {
          assistantText =
            "I'm sorry, I wasn't able to generate a response. Please try rephrasing your question.";
        }
      } catch (err: any) {
        console.error('sendHelpMessage Anthropic error:', err);
        assistantText =
          "I ran into an error talking to the assistant. Please try again in a moment, or contact an administrator if this keeps happening.";
      }
    }

    // 5) Persist the assistant's reply.
    const assistantNow = Date.now();
    const assistantMsgRef = db.collection(MESSAGES).doc();
    const assistantMsg: HelpMessage = {
      id: assistantMsgRef.id,
      conversationId,
      userId: uid, // owner-of-conversation, for Firestore rules
      role: 'assistant',
      content: assistantText,
      createdAt: assistantNow,
    };
    await assistantMsgRef.set(assistantMsg);

    // 6) Update conversation metadata (and auto-title if applicable).
    const update: Partial<HelpConversation> = {
      lastMessageAt: assistantNow,
      lastMessagePreview: assistantText.slice(0, PREVIEW_CHARS),
      messageCount: (conversation.messageCount || 0) + 2,
      updatedAt: assistantNow,
    };
    if (autoTitle) {
      update.title = autoTitle;
    }
    await db.collection(CONVERSATIONS).doc(conversationId).update(update);

    return { message: assistantMsg, userMessage: userMsg };
  }
);

// Compile-time sanity check: ensure the interface stays referenced so future
// imports of this file pick it up without `noUnusedLocals` complaints.
export type _HelpChatTypes = AnthropicTextBlock;
