import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Message } from '../types';

const db = admin.firestore();

export const sendMessage = onCall({ cors: true }, async (request: any) => {
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

export const sendEventMessage = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { eventId, centerId, workgroupId, content, type } = request.data;

  if (!content || !type) {
    throw new HttpsError('invalid-argument', 'Missing required fields: content, type');
  }

  if (!eventId && !centerId && !workgroupId) {
    throw new HttpsError(
      'invalid-argument',
      'Must specify at least one of: eventId, centerId, workgroupId'
    );
  }

  // Determine recipients based on event/center/workgroup
  let recipientIds: string[] = [];

  if (workgroupId) {
    const workgroupDoc = await db.collection('workgroups').doc(workgroupId).get();
    if (workgroupDoc.exists) {
      const workgroup = workgroupDoc.data();
      recipientIds = [workgroup!.leadUserId, ...workgroup!.volunteerUserIds];
    }
  } else if (centerId) {
    const centerDoc = await db.collection('centers').doc(centerId).get();
    if (centerDoc.exists) {
      const center = centerDoc.data();
      recipientIds = center!.leadUserIds;
    }
  } else if (eventId) {
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (eventDoc.exists) {
      const event = eventDoc.data();
      recipientIds = event!.userIds;
    }
  }

  if (recipientIds.length === 0) {
    throw new HttpsError('not-found', 'No recipients found');
  }

  const threadId = workgroupId || centerId || eventId || '';

  const messageRef = db.collection('messages').doc();
  const message: Message = {
    id: messageRef.id,
    threadId,
    senderId: request.auth.uid,
    recipientIds,
    content,
    type,
    eventId,
    centerId,
    workgroupId,
    createdAt: Date.now(),
  };

  await messageRef.set(message);

  // TODO: Implement actual SMS/email sending based on user preferences
  console.log(`Event message sent: ${messageRef.id}`);

  return { success: true, messageId: messageRef.id, message };
});

export const getMessages = onCall({ cors: true }, async (request: any) => {
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