import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Group, User } from '../types';

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

export const createGroup = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { name, eventType, description, userIds, centerIds } = request.data;

  if (!name || !eventType) {
    throw new HttpsError('invalid-argument', 'Missing required fields: name, eventType');
  }

  const groupRef = db.collection('groups').doc();
  const group: Group = {
    id: groupRef.id,
    name,
    eventType,
    description: description || '',
    userIds: userIds || [],
    centerIds: centerIds || [],
    createdBy: request.auth.uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await groupRef.set(group);

  // Update users to include this group
  if (userIds && userIds.length > 0) {
    const batch = db.batch();
    userIds.forEach((userId: string) => {
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        groupIds: admin.firestore.FieldValue.arrayUnion(groupRef.id),
        updatedAt: Date.now(),
      });
    });
    await batch.commit();
  }

  return { success: true, groupId: groupRef.id, group };
});

export const updateGroup = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { groupId, updates } = request.data;

  if (!groupId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: groupId, updates');
  }

  const groupRef = db.collection('groups').doc(groupId);
  const groupDoc = await groupRef.get();

  if (!groupDoc.exists) {
    throw new HttpsError('not-found', 'Group not found');
  }

  delete updates.id;
  delete updates.createdAt;
  delete updates.createdBy;

  await groupRef.update({
    ...updates,
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const getGroup = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId } = request.data;

  if (!groupId) {
    throw new HttpsError('invalid-argument', 'Missing required field: groupId');
  }

  const groupDoc = await db.collection('groups').doc(groupId).get();

  if (!groupDoc.exists) {
    throw new HttpsError('not-found', 'Group not found');
  }

  return { group: groupDoc.data() };
});

export const listGroups = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { limit = 100 } = request.data;

  const snapshot = await db.collection('groups').limit(limit).get();
  const groups = snapshot.docs.map((doc) => doc.data());

  return { groups };
});

export const addUserToGroup = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAdmin(request.auth.uid);

  const { groupId, userId } = request.data;

  if (!groupId || !userId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: groupId, userId');
  }

  const groupRef = db.collection('groups').doc(groupId);
  const userRef = db.collection('users').doc(userId);

  const [groupDoc, userDoc] = await Promise.all([groupRef.get(), userRef.get()]);

  if (!groupDoc.exists) {
    throw new HttpsError('not-found', 'Group not found');
  }

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  await Promise.all([
    groupRef.update({
      userIds: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: Date.now(),
    }),
    userRef.update({
      groupIds: admin.firestore.FieldValue.arrayUnion(groupId),
      updatedAt: Date.now(),
    }),
  ]);

  return { success: true };
});