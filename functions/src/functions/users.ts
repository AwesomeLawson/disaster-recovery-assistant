import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { User } from '../types';

const db = admin.firestore();

export const registerUser = onCall(async (request: any) => {
  const { email, phoneNumber, communicationPreference, requestedRoles } = request.data;

  if (!email || !phoneNumber || !communicationPreference || !requestedRoles) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: email, phoneNumber, communicationPreference, requestedRoles'
    );
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;

  const user: User = {
    id: userId,
    email,
    phoneNumber,
    communicationPreference,
    roles: [], // Initially empty until approved
    requestedRoles,
    roleApprovalStatus: 'pending',
    legalReleaseSigned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.collection('users').doc(userId).set(user);

  return { success: true, userId, user };
});

export const approveUserRole = onCall(async (request: any) => {
  const { userId, approve, roles } = request.data;

  if (!userId || approve === undefined) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: userId, approve'
    );
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if caller is admin
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User;

  if (!caller || !caller.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can approve roles');
  }

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  const user = userDoc.data() as User;

  if (approve) {
    await userRef.update({
      roles: roles || user.requestedRoles || [],
      roleApprovalStatus: 'approved',
      updatedAt: Date.now(),
    });
  } else {
    await userRef.update({
      roleApprovalStatus: 'rejected',
      updatedAt: Date.now(),
    });
  }

  return { success: true };
});

export const updateUserProfile = onCall(async (request: any) => {
  const { userId, updates } = request.data;

  if (!userId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: userId, updates');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Users can update their own profile, or admins can update any profile
  if (request.auth.uid !== userId) {
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    const caller = callerDoc.data() as User;

    if (!caller || !caller.roles.includes('administrator')) {
      throw new HttpsError('permission-denied', 'Permission denied');
    }
  }

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  // Prevent updating sensitive fields
  delete updates.roles;
  delete updates.roleApprovalStatus;
  delete updates.id;
  delete updates.createdAt;

  await userRef.update({
    ...updates,
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const getUser = onCall(async (request: any) => {
  try {
    console.log('getUser called with request:', JSON.stringify({ auth: !!request.auth, data: request.data }));

    const { userId } = request.data;

    if (!userId) {
      console.error('Missing userId in request.data');
      throw new HttpsError('invalid-argument', 'Missing required field: userId');
    }

    if (!request.auth) {
      console.error('Missing auth in request');
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    console.log(`Fetching user document for userId: ${userId}`);
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.error(`User not found: ${userId}`);
      throw new HttpsError('not-found', 'User not found');
    }

    console.log('User found successfully');
    return { user: userDoc.data() };
  } catch (error) {
    console.error('Error in getUser:', error);
    throw error;
  }
});

export const listUsers = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { role, groupId, centerId, limit = 100 } = request.data;

  let query: admin.firestore.Query = db.collection('users');

  if (role) {
    query = query.where('roles', 'array-contains', role);
  }

  if (groupId) {
    query = query.where('groupIds', 'array-contains', groupId);
  }

  if (centerId) {
    query = query.where('centerIds', 'array-contains', centerId);
  }

  const snapshot = await query.limit(limit).get();
  const users = snapshot.docs.map((doc) => doc.data());

  return { users };
});