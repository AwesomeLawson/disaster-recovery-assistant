import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import type { User, UserEventData } from '../types';

const db = admin.firestore();

const docId = (userId: string, eventId: string) => `${userId}_${eventId}`;

export const setUserEventAvailability = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const { eventId, availability } = request.data;
  if (!eventId || !Array.isArray(availability)) {
    throw new HttpsError('invalid-argument', 'Missing required fields: eventId, availability');
  }

  const uid = request.auth.uid;
  const id = docId(uid, eventId);
  const now = Date.now();

  const ref = db.collection('userEventData').doc(id);
  const existing = await ref.get();

  if (existing.exists) {
    await ref.update({ submittedAvailability: availability, updatedAt: now });
  } else {
    const doc: UserEventData = {
      id,
      userId: uid,
      eventId,
      submittedAvailability: availability,
      confirmedDates: [],
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(doc);
  }

  return { success: true };
});

export const listMyEventData = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const snap = await db.collection('userEventData')
    .where('userId', '==', request.auth.uid)
    .get();

  return { records: snap.docs.map((d) => d.data()) };
});

export const listUserEventData = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User | undefined;
  if (!caller?.roles.some((r) => ['administrator', 'fieldCoordinator'].includes(r))) {
    throw new HttpsError('permission-denied', 'Insufficient permissions');
  }

  const { userId } = request.data;
  if (!userId) throw new HttpsError('invalid-argument', 'Missing required field: userId');

  const snap = await db.collection('userEventData')
    .where('userId', '==', userId)
    .get();

  return { records: snap.docs.map((d) => d.data()) };
});

export const listAllEventData = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User | undefined;
  if (!caller?.roles.some((r) => ['administrator', 'fieldCoordinator'].includes(r))) {
    throw new HttpsError('permission-denied', 'Insufficient permissions');
  }

  const { eventId } = request.data;
  let query: FirebaseFirestore.Query = db.collection('userEventData');
  if (eventId) {
    query = query.where('eventId', '==', eventId);
  }

  const snap = await query.get();
  return { records: snap.docs.map((d) => d.data()) };
});

export const confirmUserEventDates = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User | undefined;
  if (!caller?.roles.some((r) => ['administrator', 'fieldCoordinator'].includes(r))) {
    throw new HttpsError('permission-denied', 'Insufficient permissions');
  }

  const { userId, eventId, confirmedDates, notes } = request.data;
  if (!userId || !eventId || !Array.isArray(confirmedDates)) {
    throw new HttpsError('invalid-argument', 'Missing required fields: userId, eventId, confirmedDates');
  }

  const id = docId(userId, eventId);
  const now = Date.now();
  const ref = db.collection('userEventData').doc(id);
  const existing = await ref.get();

  if (existing.exists) {
    await ref.update({
      confirmedDates,
      confirmedBy: request.auth.uid,
      confirmedAt: now,
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: now,
    });
  } else {
    const doc: UserEventData = {
      id,
      userId,
      eventId,
      submittedAvailability: [],
      confirmedDates,
      confirmedBy: request.auth.uid,
      confirmedAt: now,
      ...(notes ? { notes } : {}),
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(doc);
  }

  return { success: true };
});
