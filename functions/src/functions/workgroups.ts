import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Workgroup, User } from '../types';

const db = admin.firestore();

const requireWorkGroupLeadOrAdmin = async (uid: string): Promise<void> => {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User;

  if (!user || (!user.roles.includes('workGroupLead') && !user.roles.includes('administrator'))) {
    throw new HttpsError('permission-denied', 'Only work group leads or administrators can perform this action');
  }
};

export const createWorkgroup = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireWorkGroupLeadOrAdmin(request.auth.uid);

  const { name, centerId, groupId, leadUserId, workerUserIds, assessmentId, taskDescription } = request.data;

  if (!name || !centerId || !groupId || !leadUserId || !assessmentId || !taskDescription) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: name, centerId, groupId, leadUserId, assessmentId, taskDescription'
    );
  }

  const workgroupRef = db.collection('workgroups').doc();
  const workgroup: Workgroup = {
    id: workgroupRef.id,
    name,
    centerId,
    groupId,
    leadUserId,
    workerUserIds: workerUserIds || [],
    assessmentId,
    taskDescription,
    taskStatus: 'notStarted',
    progressNotes: [],
    photoUrls: [],
    createdBy: request.auth.uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await workgroupRef.set(workgroup);

  return { success: true, workgroupId: workgroupRef.id, workgroup };
});

export const updateWorkgroup = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { workgroupId, updates } = request.data;

  if (!workgroupId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: workgroupId, updates');
  }

  const workgroupRef = db.collection('workgroups').doc(workgroupId);
  const workgroupDoc = await workgroupRef.get();

  if (!workgroupDoc.exists) {
    throw new HttpsError('not-found', 'Workgroup not found');
  }

  const workgroup = workgroupDoc.data() as Workgroup;

  // Check permissions
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;

  const isAdmin = user && user.roles.includes('administrator');
  const isLead = workgroup.leadUserId === request.auth.uid;
  const isWorker = workgroup.workerUserIds.includes(request.auth.uid);

  if (!isAdmin && !isLead && !isWorker) {
    throw new HttpsError('permission-denied', 'Permission denied');
  }

  delete updates.id;
  delete updates.createdAt;
  delete updates.createdBy;

  await workgroupRef.update({
    ...updates,
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const updateWorkgroupStatus = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { workgroupId, status, note, photoUrls } = request.data;

  if (!workgroupId || !status) {
    throw new HttpsError('invalid-argument', 'Missing required fields: workgroupId, status');
  }

  const workgroupRef = db.collection('workgroups').doc(workgroupId);
  const workgroupDoc = await workgroupRef.get();

  if (!workgroupDoc.exists) {
    throw new HttpsError('not-found', 'Workgroup not found');
  }

  const workgroup = workgroupDoc.data() as Workgroup;

  // Check permissions
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;

  const isAdmin = user && user.roles.includes('administrator');
  const isLead = workgroup.leadUserId === request.auth.uid;
  const isWorker = workgroup.workerUserIds.includes(request.auth.uid);

  if (!isAdmin && !isLead && !isWorker) {
    throw new HttpsError('permission-denied', 'Permission denied');
  }

  const updateData: any = {
    taskStatus: status,
    updatedAt: Date.now(),
  };

  if (note) {
    updateData.progressNotes = admin.firestore.FieldValue.arrayUnion({
      note,
      userId: request.auth.uid,
      timestamp: Date.now(),
    });
  }

  if (photoUrls && photoUrls.length > 0) {
    updateData.photoUrls = admin.firestore.FieldValue.arrayUnion(...photoUrls);
  }

  await workgroupRef.update(updateData);

  return { success: true };
});

export const addWorkerToWorkgroup = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { workgroupId, userId } = request.data;

  if (!workgroupId || !userId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: workgroupId, userId');
  }

  const workgroupRef = db.collection('workgroups').doc(workgroupId);
  const workgroupDoc = await workgroupRef.get();

  if (!workgroupDoc.exists) {
    throw new HttpsError('not-found', 'Workgroup not found');
  }

  const workgroup = workgroupDoc.data() as Workgroup;

  // Check permissions
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;

  const isAdmin = user && user.roles.includes('administrator');
  const isLead = workgroup.leadUserId === request.auth.uid;

  if (!isAdmin && !isLead) {
    throw new HttpsError('permission-denied', 'Only work group leads or administrators can add workers');
  }

  await workgroupRef.update({
    workerUserIds: admin.firestore.FieldValue.arrayUnion(userId),
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const getWorkgroup = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { workgroupId } = request.data;

  if (!workgroupId) {
    throw new HttpsError('invalid-argument', 'Missing required field: workgroupId');
  }

  const workgroupDoc = await db.collection('workgroups').doc(workgroupId).get();

  if (!workgroupDoc.exists) {
    throw new HttpsError('not-found', 'Workgroup not found');
  }

  return { workgroup: workgroupDoc.data() };
});

export const listWorkgroups = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { centerId, groupId, assessmentId, limit = 100 } = request.data;

  let query: admin.firestore.Query = db.collection('workgroups');

  if (centerId) {
    query = query.where('centerId', '==', centerId);
  }

  if (groupId) {
    query = query.where('groupId', '==', groupId);
  }

  if (assessmentId) {
    query = query.where('assessmentId', '==', assessmentId);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();
  const workgroups = snapshot.docs.map((doc) => doc.data());

  return { workgroups };
});