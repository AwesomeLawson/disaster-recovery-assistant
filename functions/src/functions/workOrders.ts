import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { WorkOrder, User } from '../types';

const db = admin.firestore();

const requireRole = async (uid: string, roles: string[]): Promise<User> => {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User;
  if (!user || !user.roles.some((r) => roles.includes(r))) {
    throw new HttpsError('permission-denied', 'Insufficient permissions');
  }
  return user;
};

export const createWorkOrder = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const user = await requireRole(request.auth.uid, ['administrator', 'fieldCoordinator', 'assessor', 'workGroupLead']);

  const {
    survivorName, survivorPhone, altContact, altContactPhone,
    address, latitude, longitude, tempAddress,
    descriptionOfNeed, source, workOrderNumber,
    baseCampId, eventId,
  } = request.data;

  if (!survivorName || !survivorPhone || !address || !descriptionOfNeed || !baseCampId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: survivorName, survivorPhone, address, descriptionOfNeed, baseCampId'
    );
  }

  const workOrderRef = db.collection('workOrders').doc();
  const now = Date.now();
  const workOrder: WorkOrder = {
    id: workOrderRef.id,
    status: 'intake',
    survivorName,
    survivorPhone,
    address,
    descriptionOfNeed,
    baseCampId,
    intakeVolunteerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
    photoUrls: [],
    reassessmentCount: 0,
    flaggedForReview: false,
    createdAt: now,
    updatedAt: now,
  };

  if (altContact) workOrder.altContact = altContact;
  if (altContactPhone) workOrder.altContactPhone = altContactPhone;
  if (latitude !== undefined) workOrder.latitude = latitude;
  if (longitude !== undefined) workOrder.longitude = longitude;
  if (tempAddress) workOrder.tempAddress = tempAddress;
  if (source) workOrder.source = source;
  if (workOrderNumber) workOrder.workOrderNumber = workOrderNumber;
  if (eventId) workOrder.eventId = eventId;

  await workOrderRef.set(workOrder);

  return { success: true, workOrderId: workOrderRef.id, workOrder };
});

export const updateWorkOrder = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { workOrderId, updates } = request.data;

  if (!workOrderId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: workOrderId, updates');
  }

  const workOrderRef = db.collection('workOrders').doc(workOrderId);
  const workOrderDoc = await workOrderRef.get();

  if (!workOrderDoc.exists) {
    throw new HttpsError('not-found', 'Work order not found');
  }

  const workOrder = workOrderDoc.data() as WorkOrder;

  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;

  const isAdmin = user?.roles.includes('administrator');
  const isFieldCoordinator = user?.roles.includes('fieldCoordinator');
  const isAssessor = user?.roles.includes('assessor');
  const isOwner = workOrder.assessorId === request.auth.uid;

  if (!isAdmin && !isFieldCoordinator && !(isAssessor && isOwner)) {
    throw new HttpsError('permission-denied', 'Permission denied');
  }

  delete updates.id;
  delete updates.createdAt;
  delete updates.assessorId;

  await workOrderRef.update({
    ...updates,
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const reassessment = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireRole(request.auth.uid, ['administrator', 'fieldCoordinator', 'assessor']);

  const { workOrderId, updates, flagForReview } = request.data;

  if (!workOrderId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: workOrderId, updates');
  }

  const workOrderRef = db.collection('workOrders').doc(workOrderId);
  const workOrderDoc = await workOrderRef.get();

  if (!workOrderDoc.exists) {
    throw new HttpsError('not-found', 'Work order not found');
  }

  const workOrder = workOrderDoc.data() as WorkOrder;

  delete updates.id;
  delete updates.createdAt;
  delete updates.assessorId;

  await workOrderRef.update({
    ...updates,
    reassessmentCount: workOrder.reassessmentCount + 1,
    flaggedForReview: flagForReview || false,
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const completeFieldAssessment = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireRole(request.auth.uid, ['administrator', 'fieldCoordinator', 'assessor']);

  const { workOrderId, ...fields } = request.data;

  if (!workOrderId) {
    throw new HttpsError('invalid-argument', 'Missing required field: workOrderId');
  }

  const workOrderRef = db.collection('workOrders').doc(workOrderId);
  if (!(await workOrderRef.get()).exists) {
    throw new HttpsError('not-found', 'Work order not found');
  }

  const allowedFields = [
    'placeName', 'damages', 'needs', 'affectedPeople', 'severity',
    'currentlyOccupied', 'numberOfOccupants', 'householdUnder18', 'household19to64', 'household65plus',
    'isPrimaryResidence', 'isHabitable', 'survivorOwnsProperty', 'ownerName', 'ownerPhone', 'homeType',
    'registeredForFEMA', 'hasHOInsurance', 'insuranceContacted',
    'accessConcerns', 'photoUrls', 'flaggedForReview',
  ];

  const updates: Record<string, any> = { status: 'assessed', assessorId: request.auth.uid, updatedAt: Date.now() };
  for (const key of allowedFields) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }

  await workOrderRef.update(updates);

  return { success: true };
});

export const getWorkOrder = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { workOrderId } = request.data;

  if (!workOrderId) {
    throw new HttpsError('invalid-argument', 'Missing required field: workOrderId');
  }

  const workOrderDoc = await db.collection('workOrders').doc(workOrderId).get();

  if (!workOrderDoc.exists) {
    throw new HttpsError('not-found', 'Work order not found');
  }

  return { workOrder: workOrderDoc.data() };
});

export const deleteWorkOrder = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;
  if (!user?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can delete work orders');
  }

  const { workOrderId } = request.data;
  if (!workOrderId) {
    throw new HttpsError('invalid-argument', 'Missing required field: workOrderId');
  }

  const ref = db.collection('workOrders').doc(workOrderId);
  if (!(await ref.get()).exists) {
    throw new HttpsError('not-found', 'Work order not found');
  }

  await ref.delete();
  return { success: true };
});

export const assignAssessor = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireRole(request.auth.uid, ['administrator', 'fieldCoordinator']);

  const { workOrderId, assessorId } = request.data;
  if (!workOrderId || !assessorId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: workOrderId, assessorId');
  }

  const assessorDoc = await db.collection('users').doc(assessorId).get();
  const assessorUser = assessorDoc.data() as User | undefined;
  if (!assessorUser || !assessorUser.roles.includes('assessor')) {
    throw new HttpsError('invalid-argument', 'Selected user does not have the assessor role');
  }

  const workOrderRef = db.collection('workOrders').doc(workOrderId);
  if (!(await workOrderRef.get()).exists) {
    throw new HttpsError('not-found', 'Work order not found');
  }

  await workOrderRef.update({
    assessorId,
    status: 'awaitingAssessment',
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const listWorkOrders = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { baseCampId, eventId, flaggedForReview, limit = 100 } = request.data || {};

  let query: admin.firestore.Query = db.collection('workOrders');

  if (baseCampId) {
    query = query.where('baseCampId', '==', baseCampId);
  }

  if (eventId) {
    query = query.where('eventId', '==', eventId);
  }

  if (typeof flaggedForReview === 'boolean') {
    query = query.where('flaggedForReview', '==', flaggedForReview);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();
  const workOrders = snapshot.docs.map((doc) => doc.data());

  return { workOrders };
});
