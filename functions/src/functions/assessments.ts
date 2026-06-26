import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Assessment, User } from '../types';

const db = admin.firestore();

const requireRole = async (uid: string, roles: string[]): Promise<User> => {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User;
  if (!user || !user.roles.some((r) => roles.includes(r))) {
    throw new HttpsError('permission-denied', 'Insufficient permissions');
  }
  return user;
};

export const createAssessment = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const user = await requireRole(request.auth.uid, ['administrator', 'fieldCoordinator', 'assessor']);

  const {
    survivorName, survivorPhone, altContact, altContactPhone,
    address, latitude, longitude, tempAddress,
    descriptionOfNeed, source, caseNumber,
    centerId, eventId,
  } = request.data;

  if (!survivorName || !survivorPhone || !address || !descriptionOfNeed || !centerId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: survivorName, survivorPhone, address, descriptionOfNeed, centerId'
    );
  }

  const assessmentRef = db.collection('assessments').doc();
  const now = Date.now();
  const assessment: Assessment = {
    id: assessmentRef.id,
    status: 'intake',
    survivorName,
    survivorPhone,
    address,
    descriptionOfNeed,
    centerId,
    intakeVolunteerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
    photoUrls: [],
    reassessmentCount: 0,
    flaggedForReview: false,
    createdAt: now,
    updatedAt: now,
  };

  if (altContact) assessment.altContact = altContact;
  if (altContactPhone) assessment.altContactPhone = altContactPhone;
  if (latitude !== undefined) assessment.latitude = latitude;
  if (longitude !== undefined) assessment.longitude = longitude;
  if (tempAddress) assessment.tempAddress = tempAddress;
  if (source) assessment.source = source;
  if (caseNumber) assessment.caseNumber = caseNumber;
  if (eventId) assessment.eventId = eventId;

  await assessmentRef.set(assessment);

  return { success: true, assessmentId: assessmentRef.id, assessment };
});

export const updateAssessment = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { assessmentId, updates } = request.data;

  if (!assessmentId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: assessmentId, updates');
  }

  const assessmentRef = db.collection('assessments').doc(assessmentId);
  const assessmentDoc = await assessmentRef.get();

  if (!assessmentDoc.exists) {
    throw new HttpsError('not-found', 'Assessment not found');
  }

  const assessment = assessmentDoc.data() as Assessment;

  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;

  const isAdmin = user?.roles.includes('administrator');
  const isFieldCoordinator = user?.roles.includes('fieldCoordinator');
  const isAssessor = user?.roles.includes('assessor');
  const isOwner = assessment.assessorId === request.auth.uid;

  if (!isAdmin && !isFieldCoordinator && !(isAssessor && isOwner)) {
    throw new HttpsError('permission-denied', 'Permission denied');
  }

  delete updates.id;
  delete updates.createdAt;
  delete updates.assessorId;

  await assessmentRef.update({
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

  const { assessmentId, updates, flagForReview } = request.data;

  if (!assessmentId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: assessmentId, updates');
  }

  const assessmentRef = db.collection('assessments').doc(assessmentId);
  const assessmentDoc = await assessmentRef.get();

  if (!assessmentDoc.exists) {
    throw new HttpsError('not-found', 'Assessment not found');
  }

  const assessment = assessmentDoc.data() as Assessment;

  delete updates.id;
  delete updates.createdAt;
  delete updates.assessorId;

  await assessmentRef.update({
    ...updates,
    reassessmentCount: assessment.reassessmentCount + 1,
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

  const { assessmentId, ...fields } = request.data;

  if (!assessmentId) {
    throw new HttpsError('invalid-argument', 'Missing required field: assessmentId');
  }

  const assessmentRef = db.collection('assessments').doc(assessmentId);
  if (!(await assessmentRef.get()).exists) {
    throw new HttpsError('not-found', 'Assessment not found');
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

  await assessmentRef.update(updates);

  return { success: true };
});

export const getAssessment = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { assessmentId } = request.data;

  if (!assessmentId) {
    throw new HttpsError('invalid-argument', 'Missing required field: assessmentId');
  }

  const assessmentDoc = await db.collection('assessments').doc(assessmentId).get();

  if (!assessmentDoc.exists) {
    throw new HttpsError('not-found', 'Assessment not found');
  }

  return { assessment: assessmentDoc.data() };
});

export const deleteAssessment = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;
  if (!user?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can delete assessments');
  }

  const { assessmentId } = request.data;
  if (!assessmentId) {
    throw new HttpsError('invalid-argument', 'Missing required field: assessmentId');
  }

  const ref = db.collection('assessments').doc(assessmentId);
  if (!(await ref.get()).exists) {
    throw new HttpsError('not-found', 'Assessment not found');
  }

  await ref.delete();
  return { success: true };
});

export const assignAssessor = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireRole(request.auth.uid, ['administrator', 'fieldCoordinator']);

  const { assessmentId, assessorId } = request.data;
  if (!assessmentId || !assessorId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: assessmentId, assessorId');
  }

  const assessorDoc = await db.collection('users').doc(assessorId).get();
  const assessorUser = assessorDoc.data() as User | undefined;
  if (!assessorUser || !assessorUser.roles.includes('assessor')) {
    throw new HttpsError('invalid-argument', 'Selected user does not have the assessor role');
  }

  const assessmentRef = db.collection('assessments').doc(assessmentId);
  if (!(await assessmentRef.get()).exists) {
    throw new HttpsError('not-found', 'Assessment not found');
  }

  await assessmentRef.update({
    assessorId,
    status: 'awaitingAssessment',
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const listAssessments = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { centerId, eventId, flaggedForReview, limit = 100 } = request.data || {};

  let query: admin.firestore.Query = db.collection('assessments');

  if (centerId) {
    query = query.where('centerId', '==', centerId);
  }

  if (eventId) {
    query = query.where('eventId', '==', eventId);
  }

  if (typeof flaggedForReview === 'boolean') {
    query = query.where('flaggedForReview', '==', flaggedForReview);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();
  const assessments = snapshot.docs.map((doc) => doc.data());

  return { assessments };
});