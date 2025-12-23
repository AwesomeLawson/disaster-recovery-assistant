import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Center, User } from '../types';

const db = admin.firestore();

const callableOptions = {
  cors: [/localhost/, /127\.0\.0\.1/],
};

const requireAdmin = async (uid: string): Promise<void> => {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User;

  if (!user || !user.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can perform this action');
  }
};

export const createCenter = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { name, address, latitude, longitude, groupId, leadUserIds } = request.data;

  if (!name || !address || !groupId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: name, address, groupId');
  }

  const centerRef = db.collection('centers').doc();
  const center: Center = {
    id: centerRef.id,
    name,
    address,
    latitude,
    longitude,
    groupId,
    leadUserIds: leadUserIds || [],
    createdBy: request.auth.uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await centerRef.set(center);

  // Update group to include this center
  await db.collection('groups').doc(groupId).update({
    centerIds: admin.firestore.FieldValue.arrayUnion(centerRef.id),
    updatedAt: Date.now(),
  });

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

export const updateCenter = onCall(callableOptions, async (request: any) => {
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

export const getCenter = onCall(callableOptions, async (request: any) => {
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

export const listCenters = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, limit = 100 } = request.data;

  let query: admin.firestore.Query = db.collection('centers');

  if (groupId) {
    query = query.where('groupId', '==', groupId);
  }

  const snapshot = await query.limit(limit).get();
  const centers = snapshot.docs.map((doc) => doc.data());

  return { centers };
});