import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { LegalRelease } from '../types';

const db = admin.firestore();

export const createLegalRelease = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, releaseType, documentUrl, signatureImageUrl, signedDigitally, assessmentId } = request.data;

  if (!userId || !releaseType) {
    throw new HttpsError('invalid-argument', 'Missing required fields: userId, releaseType');
  }

  // Users can create their own releases, or admins can create for others
  if (request.auth.uid !== userId) {
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const user = userDoc.data();

    if (!user || !user.roles || !user.roles.includes('administrator')) {
      throw new HttpsError('permission-denied', 'Permission denied');
    }
  }

  const releaseRef = db.collection('legalReleases').doc();
  const release: LegalRelease = {
    id: releaseRef.id,
    userId,
    releaseType,
    documentUrl,
    signatureImageUrl,
    signedDigitally: signedDigitally || false,
    assessmentId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await releaseRef.set(release);

  // Update user with legal release reference if it's a volunteer waiver
  if (releaseType === 'volunteer') {
    await db.collection('users').doc(userId).update({
      legalReleaseId: releaseRef.id,
      legalReleaseSigned: false,
      updatedAt: Date.now(),
    });
  }

  return { success: true, releaseId: releaseRef.id, release };
});

export const signLegalRelease = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { releaseId, signatureImageUrl } = request.data;

  if (!releaseId) {
    throw new HttpsError('invalid-argument', 'Missing required field: releaseId');
  }

  const releaseRef = db.collection('legalReleases').doc(releaseId);
  const releaseDoc = await releaseRef.get();

  if (!releaseDoc.exists) {
    throw new HttpsError('not-found', 'Legal release not found');
  }

  const release = releaseDoc.data() as LegalRelease;

  // Users can only sign their own releases
  if (release.userId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Can only sign your own releases');
  }

  await releaseRef.update({
    signedDigitally: true,
    signedAt: Date.now(),
    signatureImageUrl: signatureImageUrl || release.signatureImageUrl,
    updatedAt: Date.now(),
  });

  // Update user to reflect signed status if it's a volunteer waiver
  if (release.releaseType === 'volunteer') {
    await db.collection('users').doc(release.userId).update({
      legalReleaseSigned: true,
      updatedAt: Date.now(),
    });
  }

  return { success: true };
});

export const getLegalRelease = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { releaseId } = request.data;

  if (!releaseId) {
    throw new HttpsError('invalid-argument', 'Missing required field: releaseId');
  }

  const releaseDoc = await db.collection('legalReleases').doc(releaseId).get();

  if (!releaseDoc.exists) {
    throw new HttpsError('not-found', 'Legal release not found');
  }

  const release = releaseDoc.data() as LegalRelease;

  // Users can only view their own releases, or admins can view any
  if (release.userId !== request.auth.uid) {
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const user = userDoc.data();

    if (!user || !user.roles || !user.roles.includes('administrator')) {
      throw new HttpsError('permission-denied', 'Permission denied');
    }
  }

  return { release };
});