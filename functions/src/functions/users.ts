import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { User } from '../types';

const db = admin.firestore();

// Options for onCall functions
const callOptions = { cors: true };

export const registerUser = onCall(callOptions, async (request: any) => {
  const { email, firstName, lastName, phoneNumber, address, organization, availability, eventIds, communicationPreference, requestedRoles } = request.data;

  if (!email || !firstName || !lastName || !phoneNumber || !communicationPreference || !requestedRoles) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: email, firstName, lastName, phoneNumber, communicationPreference, requestedRoles'
    );
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;

  const user: User = {
    id: userId,
    firstName,
    lastName,
    email,
    phoneNumber,
    ...(address ? { address } : {}),
    ...(organization ? { organization } : {}),
    ...(availability?.length ? { availability } : {}),
    ...(eventIds?.length ? { eventIds } : {}),
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

export const approveUserRole = onCall(callOptions, async (request: any) => {
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

export const updateUserProfile = onCall(callOptions, async (request: any) => {
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

export const getUser = onCall(callOptions, async (request: any) => {
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

export const getUserAuthInfo = onCall(callOptions, async (request: any) => {
  const { userId } = request.data;

  if (!userId) throw new HttpsError('invalid-argument', 'Missing required field: userId');
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User;
  if (!caller?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can view auth info');
  }

  const authUser = await admin.auth().getUser(userId);
  return {
    creationTime: authUser.metadata.creationTime,
    lastSignInTime: authUser.metadata.lastSignInTime,
    providers: authUser.providerData.map((p) => p.providerId),
  };
});

export const updateUserRoles = onCall(callOptions, async (request: any) => {
  const { userId, roles } = request.data;

  if (!userId || !Array.isArray(roles)) {
    throw new HttpsError('invalid-argument', 'Missing required fields: userId, roles');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User;
  if (!caller?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can update roles');
  }

  const userRef = db.collection('users').doc(userId);
  if (!(await userRef.get()).exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  await userRef.update({ roles, updatedAt: Date.now() });
  return { success: true };
});

export const listUsers = onCall(callOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { role, eventId, centerId, limit = 100 } = request.data || {};

  let query: admin.firestore.Query = db.collection('users');

  if (role) {
    query = query.where('roles', 'array-contains', role);
  }

  if (eventId) {
    query = query.where('eventIds', 'array-contains', eventId);
  }

  if (centerId) {
    query = query.where('centerIds', 'array-contains', centerId);
  }

  const snapshot = await query.limit(limit).get();
  const users = snapshot.docs.map((doc) => doc.data());

  return { users };
});

export const listOrganizations = onCall(callOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const snapshot = await db.collection('users')
    .where('organization', '!=', '')
    .select('organization')
    .limit(500)
    .get();

  const orgs = new Set<string>();
  snapshot.docs.forEach((doc) => {
    const org = doc.data().organization;
    if (org) orgs.add(org);
  });

  return { organizations: Array.from(orgs).sort() };
});