import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Center, User } from '../types';

const db = admin.firestore();

const requireAdmin = async (uid: string): Promise<void> => {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User;

  if (!user || !user.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can perform this action');
  }
};

export const createCenter = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { name, address, latitude, longitude, eventIds, leadUserIds } = request.data;

  if (!name || !address) {
    throw new HttpsError('invalid-argument', 'Missing required fields: name, address');
  }

  const centerRef = db.collection('centers').doc();
  const center: Center = {
    id: centerRef.id,
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
    center.latitude = latitude;
  }
  if (longitude !== undefined) {
    center.longitude = longitude;
  }

  await centerRef.set(center);

  // Update events to include this center
  if (eventIds && eventIds.length > 0) {
    const batch = db.batch();
    eventIds.forEach((eventId: string) => {
      const eventRef = db.collection('events').doc(eventId);
      batch.update(eventRef, {
        centerIds: admin.firestore.FieldValue.arrayUnion(centerRef.id),
        updatedAt: Date.now(),
      });
    });
    await batch.commit();
  }

  // Update lead users to include this center
  if (leadUserIds && leadUserIds.length > 0) {
    const batch = db.batch();
    leadUserIds.forEach((userId: string) => {
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        centerIds: admin.firestore.FieldValue.arrayUnion(centerRef.id),
        updatedAt: Date.now(),
      });
    });
    await batch.commit();
  }

  return { success: true, centerId: centerRef.id, center };
});

export const updateCenter = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { centerId, updates } = request.data;

  if (!centerId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: centerId, updates');
  }

  const centerRef = db.collection('centers').doc(centerId);
  const centerDoc = await centerRef.get();

  if (!centerDoc.exists) {
    throw new HttpsError('not-found', 'Center not found');
  }

  delete updates.id;
  delete updates.createdAt;
  delete updates.createdBy;

  await centerRef.update({
    ...updates,
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const getCenter = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { centerId } = request.data;

  if (!centerId) {
    throw new HttpsError('invalid-argument', 'Missing required field: centerId');
  }

  const centerDoc = await db.collection('centers').doc(centerId).get();

  if (!centerDoc.exists) {
    throw new HttpsError('not-found', 'Center not found');
  }

  return { center: centerDoc.data() };
});

export const listCenters = onCall({ cors: true }, async (request: any) => {
  try {
    console.log('listCenters called');
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

    let query: admin.firestore.Query = db.collection('centers');

    if (eventId) {
      query = query.where('eventIds', 'array-contains', eventId);
    }

    const snapshot = await query.limit(limit).get();
    console.log('Found', snapshot.docs.length, 'centers');

    const centers = snapshot.docs.map((doc) => doc.data());

    return { centers };
  } catch (error: any) {
    console.error('listCenters error:', error);
    console.error('Error stack:', error?.stack);
    throw error;
  }
});