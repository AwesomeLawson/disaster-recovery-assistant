import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Message } from '../types';

const db = admin.firestore();

export const sendMessage = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { threadId, recipientIds, content, type } = request.data;

  if (!threadId || !recipientIds || !content || !type) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: threadId, recipientIds, content, type'
    );
  }

  const messageRef = db.collection('messages').doc();
  const message: Message = {
    id: messageRef.id,
    threadId,
    senderId: request.auth.uid,
    recipientIds,
    content,
    type,
    createdAt: Date.now(),
  };

  await messageRef.set(message);

  // TODO: Implement actual SMS/email sending based on user preferences
  console.log(`Message sent: ${messageRef.id}`);

  return { success: true, messageId: messageRef.id, message };
});

export const sendGroupMessage = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, centerId, workgroupId, content, type } = request.data;

  if (!content || !type) {
    throw new HttpsError('invalid-argument', 'Missing required fields: content, type');
  }

  if (!groupId && !centerId && !workgroupId) {
    throw new HttpsError(
      'invalid-argument',
      'Must specify at least one of: groupId, centerId, workgroupId'
    );
  }

  // Determine recipients based on group/center/workgroup
  let recipientIds: string[] = [];

  if (workgroupId) {
    const workgroupDoc = await db.collection('workgroups').doc(workgroupId).get();
    if (workgroupDoc.exists) {
      const workgroup = workgroupDoc.data();
      recipientIds = [workgroup!.leadUserId, ...workgroup!.workerUserIds];
    }
  } else if (centerId) {
    const centerDoc = await db.collection('centers').doc(centerId).get();
    if (centerDoc.exists) {
      const center = centerDoc.data();
      recipientIds = center!.leadUserIds;
    }
  } else if (groupId) {
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (groupDoc.exists) {
      const group = groupDoc.data();
      recipientIds = group!.userIds;
    }
  }

  if (recipientIds.length === 0) {
    throw new HttpsError('not-found', 'No recipients found');
  }

  const threadId = workgroupId || centerId || groupId || '';

  const messageRef = db.collection('messages').doc();
  const message: Message = {
    id: messageRef.id,
    threadId,
    senderId: request.auth.uid,
    recipientIds,
    content,
    type,
    groupId,
    centerId,
    workgroupId,
    createdAt: Date.now(),
  };

  await messageRef.set(message);

  // TODO: Implement actual SMS/email sending based on user preferences
  console.log(`Group message sent: ${messageRef.id}`);

  return { success: true, messageId: messageRef.id, message };
});

export const getMessages = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { threadId, limit = 100 } = request.data;

  if (!threadId) {
    throw new HttpsError('invalid-argument', 'Missing required field: threadId');
  }

  const snapshot = await db
    .collection('messages')
    .where('threadId', '==', threadId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const messages = snapshot.docs.map((doc) => doc.data());

  return { messages };
});