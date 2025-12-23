import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Escalation, User } from '../types';

const db = admin.firestore();

const callableOptions = {
  cors: [/localhost/, /127\.0\.0\.1/],
};

export const createEscalation = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { workgroupId, centerId, groupId, type, reason, assessmentId } = request.data;

  if (!workgroupId || !centerId || !groupId || !type || !reason) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: workgroupId, centerId, groupId, type, reason'
    );
  }

  // Check permissions - must be workgroup lead or assessor
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;

  if (!user || (!user.roles.includes('workGroupLead') && !user.roles.includes('assessor'))) {
    throw new HttpsError('permission-denied', 'Only work group leads or assessors can create escalations');
  }

  const escalationRef = db.collection('escalations').doc();
  const escalation: Escalation = {
    id: escalationRef.id,
    assessmentId,
    workgroupId,
    centerId,
    groupId,
    type,
    status: 'pending',
    reason,
    createdBy: request.auth.uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await escalationRef.set(escalation);

  // Update workgroup status
  await db.collection('workgroups').doc(workgroupId).update({
    taskStatus: 'needsEscalation',
    updatedAt: Date.now(),
  });

  return { success: true, escalationId: escalationRef.id, escalation };
});

export const updateEscalationStatus = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { escalationId, status, assignedTo } = request.data;

  if (!escalationId || !status) {
    throw new HttpsError('invalid-argument', 'Missing required fields: escalationId, status');
  }

  const escalationRef = db.collection('escalations').doc(escalationId);
  const escalationDoc = await escalationRef.get();

  if (!escalationDoc.exists) {
    throw new HttpsError('not-found', 'Escalation not found');
  }

  // Check permissions - must be admin or workgroup lead
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;

  if (!user || (!user.roles.includes('administrator') && !user.roles.includes('workGroupLead'))) {
    throw new HttpsError('permission-denied', 'Permission denied');
  }

  const updateData: any = {
    status,
    updatedAt: Date.now(),
  };

  if (assignedTo) {
    updateData.assignedTo = assignedTo;
  }

  await escalationRef.update(updateData);

  return { success: true };
});

export const resolveEscalation = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { escalationId, resolution } = request.data;

  if (!escalationId || !resolution) {
    throw new HttpsError('invalid-argument', 'Missing required fields: escalationId, resolution');
  }

  const escalationRef = db.collection('escalations').doc(escalationId);
  const escalationDoc = await escalationRef.get();

  if (!escalationDoc.exists) {
    throw new HttpsError('not-found', 'Escalation not found');
  }

  // Check permissions - must be admin or workgroup lead
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;

  if (!user || (!user.roles.includes('administrator') && !user.roles.includes('workGroupLead'))) {
    throw new HttpsError('permission-denied', 'Permission denied');
  }

  await escalationRef.update({
    status: 'resolved',
    resolution,
    resolvedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const getEscalation = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { escalationId } = request.data;

  if (!escalationId) {
    throw new HttpsError('invalid-argument', 'Missing required field: escalationId');
  }

  const escalationDoc = await db.collection('escalations').doc(escalationId).get();

  if (!escalationDoc.exists) {
    throw new HttpsError('not-found', 'Escalation not found');
  }

  return { escalation: escalationDoc.data() };
});

export const listEscalations = onCall(callableOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { centerId, groupId, workgroupId, status, limit = 100 } = request.data;

  let query: admin.firestore.Query = db.collection('escalations');

  if (centerId) {
    query = query.where('centerId', '==', centerId);
  }

  if (groupId) {
    query = query.where('groupId', '==', groupId);
  }

  if (workgroupId) {
    query = query.where('workgroupId', '==', workgroupId);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();
  const escalations = snapshot.docs.map((doc) => doc.data());

  return { escalations };
});