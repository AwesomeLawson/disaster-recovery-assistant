import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Tool, ToolCondition, ToolLending, User } from '../types';

const db = admin.firestore();

const VALID_CONDITIONS: ToolCondition[] = ['new', 'good', 'fair', 'needs_repair', 'broken'];

const ALLOWED_WRITE_ROLES = ['baseCampHost', 'administrator'];

async function requireToolWriter(uid: string): Promise<User> {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User | undefined;
  if (!user || !user.roles.some((r) => ALLOWED_WRITE_ROLES.includes(r))) {
    throw new HttpsError(
      'permission-denied',
      'Only base camp hosts or administrators can perform this action'
    );
  }
  return user;
}

function stripUndefined(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
}

export const createTool = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireToolWriter(request.auth.uid);

  const data = request.data || {};
  const { baseCampId, name, description, category, condition, quantity, photoUrl, photoPath } = data;

  if (!baseCampId) throw new HttpsError('invalid-argument', 'baseCampId is required');
  if (!name?.trim()) throw new HttpsError('invalid-argument', 'name is required');
  if (!condition || !VALID_CONDITIONS.includes(condition)) {
    throw new HttpsError('invalid-argument', 'condition is required and must be a valid condition');
  }
  const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1;

  // Validate base camp exists
  const baseCampDoc = await db.collection('baseCamps').doc(baseCampId).get();
  if (!baseCampDoc.exists) {
    throw new HttpsError('not-found', 'Base camp not found');
  }

  const now = Date.now();
  const ref = db.collection('tools').doc();
  const tool: Tool = {
    id: ref.id,
    baseCampId,
    name: name.trim(),
    description: description?.trim() || undefined,
    category: category?.trim() || undefined,
    condition,
    quantity: qty,
    photoUrl: photoUrl || undefined,
    photoPath: photoPath || undefined,
    isLentOut: false,
    createdBy: request.auth.uid,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(stripUndefined(tool));
  return { success: true, tool };
});

export const updateTool = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireToolWriter(request.auth.uid);

  const { toolId, updates } = request.data || {};
  if (!toolId) throw new HttpsError('invalid-argument', 'toolId is required');
  if (!updates || typeof updates !== 'object') {
    throw new HttpsError('invalid-argument', 'updates object is required');
  }

  const ref = db.collection('tools').doc(toolId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Tool not found');

  // Strip system-managed fields
  const safe: Record<string, any> = { ...updates };
  delete safe.id;
  delete safe.baseCampId;
  delete safe.createdAt;
  delete safe.createdBy;
  delete safe.isLentOut;
  delete safe.currentLendingId;

  if (safe.condition && !VALID_CONDITIONS.includes(safe.condition)) {
    throw new HttpsError('invalid-argument', 'Invalid condition');
  }
  if (safe.quantity !== undefined) {
    const q = Number(safe.quantity);
    if (!Number.isFinite(q) || q < 1) {
      throw new HttpsError('invalid-argument', 'quantity must be >= 1');
    }
    safe.quantity = Math.floor(q);
  }
  if (typeof safe.name === 'string') safe.name = safe.name.trim();
  if (typeof safe.description === 'string') safe.description = safe.description.trim() || null;
  if (typeof safe.category === 'string') safe.category = safe.category.trim() || null;

  // Convert nulls to FieldValue.delete() so optional fields can be cleared.
  Object.keys(safe).forEach((k) => {
    if (safe[k] === null) safe[k] = admin.firestore.FieldValue.delete();
  });

  await ref.update({ ...safe, updatedAt: Date.now() });
  return { success: true };
});

export const deleteTool = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireToolWriter(request.auth.uid);

  const { toolId } = request.data || {};
  if (!toolId) throw new HttpsError('invalid-argument', 'toolId is required');

  const ref = db.collection('tools').doc(toolId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Tool not found');

  const tool = snap.data() as Tool;
  if (tool.isLentOut) {
    throw new HttpsError(
      'failed-precondition',
      'Tool is currently lent out. Confirm the return before deleting.'
    );
  }

  if (tool.photoPath) {
    try {
      await admin.storage().bucket().file(tool.photoPath).delete();
    } catch (err: any) {
      if (err?.code !== 404) {
        console.error('Failed to delete tool photo:', err);
      }
    }
  }

  await ref.delete();
  return { success: true };
});

export const listTools = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');

  let data = request.data;
  if (typeof data !== 'object' || data === null) data = {};
  const { baseCampId } = data;

  let query: admin.firestore.Query = db.collection('tools');
  if (baseCampId) {
    query = query.where('baseCampId', '==', baseCampId);
  }

  const snapshot = await query.get();
  const tools = snapshot.docs.map((doc) => doc.data() as Tool);
  // Sort client-side by name to avoid needing a composite index.
  tools.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return { tools };
});

export const checkOutTool = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  const user = await requireToolWriter(request.auth.uid);

  const {
    toolId,
    borrowerName,
    borrowerUserId,
    borrowerPhone,
    expectedReturnAt,
    notes,
  } = request.data || {};

  if (!toolId) throw new HttpsError('invalid-argument', 'toolId is required');
  if (!borrowerName?.trim()) throw new HttpsError('invalid-argument', 'borrowerName is required');

  const toolRef = db.collection('tools').doc(toolId);
  const lendingRef = db.collection('toolLendings').doc();
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const toolSnap = await tx.get(toolRef);
    if (!toolSnap.exists) throw new HttpsError('not-found', 'Tool not found');
    const tool = toolSnap.data() as Tool;
    if (tool.isLentOut) {
      throw new HttpsError('failed-precondition', 'Tool is already lent out');
    }

    const lending: ToolLending = {
      id: lendingRef.id,
      toolId,
      baseCampId: tool.baseCampId,
      borrowerUserId: borrowerUserId || undefined,
      borrowerName: borrowerName.trim(),
      borrowerPhone: borrowerPhone?.trim() || undefined,
      checkedOutBy: request.auth.uid,
      checkedOutByName: `${user.firstName} ${user.lastName}`.trim(),
      checkedOutAt: now,
      expectedReturnAt: typeof expectedReturnAt === 'number' ? expectedReturnAt : undefined,
      notes: notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(lendingRef, stripUndefined(lending));
    tx.update(toolRef, {
      isLentOut: true,
      currentLendingId: lendingRef.id,
      updatedAt: now,
    });
  });

  const lendingSnap = await lendingRef.get();
  return { success: true, lending: lendingSnap.data() };
});

export const returnTool = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  const user = await requireToolWriter(request.auth.uid);

  const { lendingId, notes } = request.data || {};
  if (!lendingId) throw new HttpsError('invalid-argument', 'lendingId is required');

  const lendingRef = db.collection('toolLendings').doc(lendingId);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const lendingSnap = await tx.get(lendingRef);
    if (!lendingSnap.exists) throw new HttpsError('not-found', 'Lending record not found');
    const lending = lendingSnap.data() as ToolLending;
    if (lending.returnedAt) {
      throw new HttpsError('failed-precondition', 'This tool has already been returned');
    }

    const update: Record<string, any> = {
      returnedAt: now,
      returnedToUserId: request.auth.uid,
      returnedToName: `${user.firstName} ${user.lastName}`.trim(),
      updatedAt: now,
    };
    if (notes?.trim()) {
      const existing = lending.notes ? `${lending.notes}\n` : '';
      update.notes = `${existing}[Return] ${notes.trim()}`;
    }
    tx.update(lendingRef, update);

    const toolRef = db.collection('tools').doc(lending.toolId);
    tx.update(toolRef, {
      isLentOut: false,
      currentLendingId: admin.firestore.FieldValue.delete(),
      updatedAt: now,
    });
  });

  return { success: true };
});

export const listToolLendings = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireToolWriter(request.auth.uid);

  let data = request.data;
  if (typeof data !== 'object' || data === null) data = {};
  const { toolId, baseCampId, activeOnly } = data;

  let query: admin.firestore.Query = db.collection('toolLendings');
  if (toolId) query = query.where('toolId', '==', toolId);
  if (baseCampId) query = query.where('baseCampId', '==', baseCampId);

  const snap = await query.get();
  let lendings = snap.docs.map((d) => d.data() as ToolLending);
  if (activeOnly) {
    lendings = lendings.filter((l) => !l.returnedAt);
  }
  // Newest first.
  lendings.sort((a, b) => (b.checkedOutAt || 0) - (a.checkedOutAt || 0));
  return { lendings };
});
