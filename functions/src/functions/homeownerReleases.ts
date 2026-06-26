import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { HomeownerRelease, User } from '../types';

const db = admin.firestore();

const ALLOWED_ROLES = ['assessor', 'administrator', 'fieldCoordinator'];

async function requireAllowedRole(uid: string): Promise<void> {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User;
  if (!user || !user.roles.some((r) => ALLOWED_ROLES.includes(r))) {
    throw new HttpsError('permission-denied', 'Only assessors, field coordinators, or administrators can manage homeowner releases');
  }
}

export const createHomeownerRelease = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireAllowedRole(request.auth.uid);

  const {
    assessmentId,
    homeownerName,
    phoneNumber,
    propertyAddress,
    propertyCityStateZip,
    coOwnerName,
    coOwnerPhone,
    frrRepName,
    frrPhone,
    homeownerSignatureUrl,
    coOwnerSignatureUrl,
    frrWitnessSignatureUrl,
  } = request.data;

  if (!assessmentId || !homeownerName || !phoneNumber || !propertyAddress || !propertyCityStateZip || !frrRepName || !frrPhone || !homeownerSignatureUrl || !frrWitnessSignatureUrl) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  const assessmentRef = db.collection('assessments').doc(assessmentId);
  const assessmentDoc = await assessmentRef.get();
  if (!assessmentDoc.exists) throw new HttpsError('not-found', 'Assessment not found');

  const releaseRef = db.collection('homeownerReleases').doc();
  const now = Date.now();

  const release: HomeownerRelease = {
    id: releaseRef.id,
    assessmentId,
    createdBy: request.auth.uid,
    homeownerName,
    phoneNumber,
    propertyAddress,
    propertyCityStateZip,
    frrRepName,
    frrPhone,
    homeownerSignatureUrl,
    frrWitnessSignatureUrl,
    signedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  if (coOwnerName) release.coOwnerName = coOwnerName;
  if (coOwnerPhone) release.coOwnerPhone = coOwnerPhone;
  if (coOwnerSignatureUrl) release.coOwnerSignatureUrl = coOwnerSignatureUrl;

  await releaseRef.set(release);
  await assessmentRef.update({ homeownerReleaseId: releaseRef.id, updatedAt: now });

  return { success: true, releaseId: releaseRef.id, release };
});

export const getHomeownerRelease = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireAllowedRole(request.auth.uid);

  const { releaseId } = request.data;
  if (!releaseId) throw new HttpsError('invalid-argument', 'Missing required field: releaseId');

  const doc = await db.collection('homeownerReleases').doc(releaseId).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Homeowner release not found');

  return { release: doc.data() };
});
