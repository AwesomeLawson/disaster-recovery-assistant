import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { LegalRelease } from '../types';

const db = admin.firestore();

export const createLegalRelease = onCall({ cors: true }, async (request: any) => {
  try {
    console.log('createLegalRelease called, auth:', !!request.auth);

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    console.log('Auth UID:', request.auth.uid);
    console.log('Request data:', JSON.stringify(request.data));

    const { userId, releaseType, documentUrl, signatureImageUrl, signedDigitally, assessmentId } = request.data;

    if (!userId || !releaseType) {
      throw new HttpsError('invalid-argument', 'Missing required fields: userId, releaseType');
    }

    // Users can create their own releases, or admins can create for others
    if (request.auth.uid !== userId) {
      console.log('Checking admin permissions for user:', request.auth.uid);
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const user = userDoc.data();

      if (!user || !user.roles || !user.roles.includes('administrator')) {
        throw new HttpsError('permission-denied', 'Permission denied');
      }
    }

    console.log('Creating legal release document');
    const releaseRef = db.collection('legalReleases').doc();
    const release: Partial<LegalRelease> = {
      id: releaseRef.id,
      userId,
      releaseType,
      signedDigitally: signedDigitally || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Only add optional fields if they have values (Firestore doesn't accept undefined)
    if (documentUrl) release.documentUrl = documentUrl;
    if (signatureImageUrl) release.signatureImageUrl = signatureImageUrl;
    if (assessmentId) release.assessmentId = assessmentId;

    console.log('Setting release document:', releaseRef.id);
    await releaseRef.set(release);
    console.log('Release document created');

    // Update user with legal release reference if it's a volunteer waiver
    if (releaseType === 'volunteer') {
      console.log('Updating user document for volunteer release');
      await db.collection('users').doc(userId).update({
        legalReleaseId: releaseRef.id,
        legalReleaseSigned: false,
        updatedAt: Date.now(),
      });
      console.log('User document updated');
    }

    return { success: true, releaseId: releaseRef.id, release };
  } catch (error: any) {
    console.error('createLegalRelease error:', error);
    console.error('Error stack:', error.stack);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'An unexpected error occurred');
  }
});

export const signLegalRelease = onCall({ cors: true }, async (request: any) => {
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

export const getLegalRelease = onCall({ cors: true }, async (request: any) => {
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