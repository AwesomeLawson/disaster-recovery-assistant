import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Assessment, User } from '../types';

const db = admin.firestore();

const requireAssessor = async (uid: string): Promise<void> => {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User;

  if (!user || !user.roles.includes('assessor')) {
    throw new HttpsError('permission-denied', 'Only assessors can perform this action');
  }
};

export const createAssessment = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  await requireAssessor(request.auth.uid);

  const { placeName, address, latitude, longitude, centerId, eventId, damages, needs, affectedPeople, severity, photoUrls, legalReleaseUrl } = request.data;

  if (!placeName || !address || !centerId || !damages || !needs || affectedPeople === undefined || !severity) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: placeName, address, centerId, damages, needs, affectedPeople, severity'
    );
  }

  const assessmentRef = db.collection('assessments').doc();
  const assessment: Assessment = {
    id: assessmentRef.id,
    placeName,
    address,
    assessorId: request.auth.uid,
    centerId,
    damages,
    needs,
    affectedPeople,
    severity,
    photoUrls: photoUrls || [],
    reassessmentCount: 0,
    flaggedForReview: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Set optional fields
  if (latitude !== undefined) assessment.latitude = latitude;
  if (longitude !== undefined) assessment.longitude = longitude;
  if (eventId) assessment.eventId = eventId;
  if (legalReleaseUrl) assessment.legalReleaseUrl = legalReleaseUrl;

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

  // Check permissions
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const user = userDoc.data() as User;

  const isAssessor = user && user.roles.includes('assessor');
  const isAdmin = user && user.roles.includes('administrator');
  const isOwner = assessment.assessorId === request.auth.uid;

  if (!isAdmin && !(isAssessor && isOwner)) {
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

  await requireAssessor(request.auth.uid);

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