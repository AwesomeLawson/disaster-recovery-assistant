import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Event, User } from '../types';

const db = admin.firestore();

const requireAdmin = async (uid: string): Promise<void> => {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User;

  if (!user || !user.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can perform this action');
  }
};

export const createEvent = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { name, eventType, description, userIds, centerIds } = request.data;

  if (!name || !eventType) {
    throw new HttpsError('invalid-argument', 'Missing required fields: name, eventType');
  }

  const eventRef = db.collection('events').doc();
  const event: Event = {
    id: eventRef.id,
    name,
    eventType,
    description: description || '',
    userIds: userIds || [],
    centerIds: centerIds || [],
    createdBy: request.auth.uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await eventRef.set(event);

  // Update users to include this event
  if (userIds && userIds.length > 0) {
    const batch = db.batch();
    userIds.forEach((userId: string) => {
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        eventIds: admin.firestore.FieldValue.arrayUnion(eventRef.id),
        updatedAt: Date.now(),
      });
    });
    await batch.commit();
  }

  return { success: true, eventId: eventRef.id, event };
});

export const updateEvent = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { eventId, updates } = request.data;

  if (!eventId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: eventId, updates');
  }

  const eventRef = db.collection('events').doc(eventId);
  const eventDoc = await eventRef.get();

  if (!eventDoc.exists) {
    throw new HttpsError('not-found', 'Event not found');
  }

  delete updates.id;
  delete updates.createdAt;
  delete updates.createdBy;

  await eventRef.update({
    ...updates,
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const getEvent = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { eventId } = request.data;

  if (!eventId) {
    throw new HttpsError('invalid-argument', 'Missing required field: eventId');
  }

  const eventDoc = await db.collection('events').doc(eventId).get();

  if (!eventDoc.exists) {
    throw new HttpsError('not-found', 'Event not found');
  }

  return { event: { id: eventDoc.id, ...eventDoc.data() } };
});

export const listEvents = onCall({ cors: true }, async (request: any) => {
  try {
    let data = request.data;
    if (typeof data !== 'object' || data === null) {
      data = {};
    }

    const limit = typeof data.limit === 'number' ? data.limit : 100;

    const snapshot = await db.collection('events').limit(limit).get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return { events };
  } catch (error: any) {
    console.error('listEvents error:', error);
    throw error;
  }
});

export const addUserToEvent = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { eventId, userId } = request.data;

  if (!eventId || !userId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: eventId, userId');
  }

  const eventRef = db.collection('events').doc(eventId);
  const userRef = db.collection('users').doc(userId);

  const [eventDoc, userDoc] = await Promise.all([eventRef.get(), userRef.get()]);

  if (!eventDoc.exists) {
    throw new HttpsError('not-found', 'Event not found');
  }

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  await Promise.all([
    eventRef.update({
      userIds: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: Date.now(),
    }),
    userRef.update({
      eventIds: admin.firestore.FieldValue.arrayUnion(eventId),
      updatedAt: Date.now(),
    }),
  ]);

  return { success: true };
});

export const addCenterToEvent = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { eventId, centerId } = request.data;

  if (!eventId || !centerId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: eventId, centerId');
  }

  const eventRef = db.collection('events').doc(eventId);
  const centerRef = db.collection('centers').doc(centerId);

  const [eventDoc, centerDoc] = await Promise.all([eventRef.get(), centerRef.get()]);

  if (!eventDoc.exists) {
    throw new HttpsError('not-found', 'Event not found');
  }

  if (!centerDoc.exists) {
    throw new HttpsError('not-found', 'Center not found');
  }

  await Promise.all([
    eventRef.update({
      centerIds: admin.firestore.FieldValue.arrayUnion(centerId),
      updatedAt: Date.now(),
    }),
    centerRef.update({
      eventIds: admin.firestore.FieldValue.arrayUnion(eventId),
      updatedAt: Date.now(),
    }),
  ]);

  return { success: true };
});

export const removeCenterFromEvent = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { eventId, centerId } = request.data;

  if (!eventId || !centerId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: eventId, centerId');
  }

  const eventRef = db.collection('events').doc(eventId);
  const centerRef = db.collection('centers').doc(centerId);

  await Promise.all([
    eventRef.update({
      centerIds: admin.firestore.FieldValue.arrayRemove(centerId),
      updatedAt: Date.now(),
    }),
    centerRef.update({
      eventIds: admin.firestore.FieldValue.arrayRemove(eventId),
      updatedAt: Date.now(),
    }),
  ]);

  return { success: true };
});
