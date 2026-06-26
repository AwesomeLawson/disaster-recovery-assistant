import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Training, TrainingCategory, User } from '../types';

const db = admin.firestore();

const VALID_CATEGORIES: TrainingCategory[] = [
  'chainsaw',
  'basic',
  'assessment',
  'spiritualEmotional',
  'other',
];

const requireAdmin = async (uid: string): Promise<User> => {
  const doc = await db.collection('users').doc(uid).get();
  const user = doc.data() as User | undefined;
  if (!user?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can perform this action');
  }
  return user;
};

export const createTraining = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  const user = await requireAdmin(request.auth.uid);

  const { title, description, category, fileUrl, filePath, fileSizeBytes } = request.data || {};
  if (!title?.trim()) throw new HttpsError('invalid-argument', 'title is required');
  if (!category || !VALID_CATEGORIES.includes(category)) {
    throw new HttpsError('invalid-argument', 'category is required and must be a valid category');
  }
  if (!fileUrl?.trim()) throw new HttpsError('invalid-argument', 'fileUrl is required');
  if (!filePath?.trim()) throw new HttpsError('invalid-argument', 'filePath is required');
  if (typeof fileSizeBytes !== 'number' || fileSizeBytes < 0) {
    throw new HttpsError('invalid-argument', 'fileSizeBytes must be a non-negative number');
  }

  const now = Date.now();
  const ref = db.collection('trainings').doc();
  const training: Training = {
    id: ref.id,
    title: title.trim(),
    description: description?.trim() || undefined,
    category,
    fileUrl,
    filePath,
    fileSizeBytes,
    uploadedBy: request.auth.uid,
    uploadedByName: `${user.firstName} ${user.lastName}`.trim(),
    createdAt: now,
    updatedAt: now,
  };

  // Strip undefined values before writing to Firestore.
  const payload: Record<string, any> = { ...training };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  await ref.set(payload);
  return { success: true, training };
});

export const listTrainings = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');

  const snapshot = await db.collection('trainings').orderBy('createdAt', 'desc').get();
  const trainings = snapshot.docs.map((doc) => doc.data() as Training);
  return { trainings };
});

export const deleteTraining = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireAdmin(request.auth.uid);

  const { trainingId } = request.data || {};
  if (!trainingId) throw new HttpsError('invalid-argument', 'trainingId is required');

  const ref = db.collection('trainings').doc(trainingId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Training not found');

  const training = snap.data() as Training;

  // Delete the storage blob first; if it's already gone, swallow and proceed.
  if (training.filePath) {
    try {
      await admin.storage().bucket().file(training.filePath).delete();
    } catch (err: any) {
      // 404 means the file was already deleted; anything else we log but don't block.
      if (err?.code !== 404) {
        console.error('Failed to delete training storage blob:', err);
      }
    }
  }

  await ref.delete();
  return { success: true };
});
