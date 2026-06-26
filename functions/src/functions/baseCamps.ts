import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { BaseCamp, User } from '../types';

const db = admin.firestore();

const requireAdmin = async (uid: string): Promise<void> => {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User;

  if (!user || !user.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can perform this action');
  }
};

export const createBaseCamp = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { name, address, latitude, longitude, eventIds, leadUserIds } = request.data;

  if (!name || !address) {
    throw new HttpsError('invalid-argument', 'Missing required fields: name, address');
  }

  const baseCampRef = db.collection('baseCamps').doc();
  const baseCamp: BaseCamp = {
    id: baseCampRef.id,
    name,
    address,
    eventIds: eventIds || [],
    leadUserIds: leadUserIds || [],
    createdBy: request.auth.uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Only set optional fields if provided
  if (latitude !== undefined) {
    baseCamp.latitude = latitude;
  }
  if (longitude !== undefined) {
    baseCamp.longitude = longitude;
  }

  await baseCampRef.set(baseCamp);

  // Update events to include this base camp
  if (eventIds && eventIds.length > 0) {
    const batch = db.batch();
    eventIds.forEach((eventId: string) => {
      const eventRef = db.collection('events').doc(eventId);
      batch.update(eventRef, {
        baseCampIds: admin.firestore.FieldValue.arrayUnion(baseCampRef.id),
        updatedAt: Date.now(),
      });
    });
    await batch.commit();
  }

  // Update lead users to include this base camp
  if (leadUserIds && leadUserIds.length > 0) {
    const batch = db.batch();
    leadUserIds.forEach((userId: string) => {
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        baseCampIds: admin.firestore.FieldValue.arrayUnion(baseCampRef.id),
        updatedAt: Date.now(),
      });
    });
    await batch.commit();
  }

  return { success: true, baseCampId: baseCampRef.id, baseCamp };
});

export const updateBaseCamp = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { baseCampId, updates } = request.data;

  if (!baseCampId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: baseCampId, updates');
  }

  const baseCampRef = db.collection('baseCamps').doc(baseCampId);
  const baseCampDoc = await baseCampRef.get();

  if (!baseCampDoc.exists) {
    throw new HttpsError('not-found', 'Base camp not found');
  }

  delete updates.id;
  delete updates.createdAt;
  delete updates.createdBy;

  await baseCampRef.update({
    ...updates,
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const getBaseCamp = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { baseCampId } = request.data;

  if (!baseCampId) {
    throw new HttpsError('invalid-argument', 'Missing required field: baseCampId');
  }

  const baseCampDoc = await db.collection('baseCamps').doc(baseCampId).get();

  if (!baseCampDoc.exists) {
    throw new HttpsError('not-found', 'Base camp not found');
  }

  return { baseCamp: baseCampDoc.data() };
});

export const listBaseCamps = onCall({ cors: true }, async (request: any) => {
  try {
    console.log('listBaseCamps called');
    console.log('Auth:', request.auth ? `uid=${request.auth.uid}` : 'null');
    console.log('Data type:', typeof request.data);
    console.log('Data:', JSON.stringify(request.data));

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Defensive handling of request.data
    let data = request.data;
    if (typeof data !== 'object' || data === null) {
      data = {};
    }

    const eventId = data.eventId;
    const limit = typeof data.limit === 'number' ? data.limit : 100;
    console.log('Using eventId:', eventId, 'limit:', limit);

    let query: admin.firestore.Query = db.collection('baseCamps');

    if (eventId) {
      query = query.where('eventIds', 'array-contains', eventId);
    }

    const snapshot = await query.limit(limit).get();
    console.log('Found', snapshot.docs.length, 'base camps');

    const baseCamps = snapshot.docs.map((doc) => doc.data());

    return { baseCamps };
  } catch (error: any) {
    console.error('listBaseCamps error:', error);
    console.error('Error stack:', error?.stack);
    throw error;
  }
});
