import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { User } from '../types';

const db = admin.firestore();

interface Organization {
  id: string;
  name: string;
  createdAt: number;
  createdBy: string;
}

const requireAdmin = async (uid: string): Promise<void> => {
  const doc = await db.collection('users').doc(uid).get();
  const user = doc.data() as User;
  if (!user?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can perform this action');
  }
};

export const createOrganization = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireAdmin(request.auth.uid);

  const { name } = request.data;
  if (!name?.trim()) throw new HttpsError('invalid-argument', 'Name is required');

  const ref = db.collection('organizations').doc();
  const org: Organization = {
    id: ref.id,
    name: name.trim(),
    createdAt: Date.now(),
    createdBy: request.auth.uid,
  };
  await ref.set(org);
  return { success: true, organization: org };
});

export const deleteOrganization = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireAdmin(request.auth.uid);

  const { organizationId } = request.data;
  if (!organizationId) throw new HttpsError('invalid-argument', 'organizationId is required');

  const ref = db.collection('organizations').doc(organizationId);
  if (!(await ref.get()).exists) throw new HttpsError('not-found', 'Organization not found');

  await ref.delete();
  return { success: true };
});

export const listManagedOrganizations = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireAdmin(request.auth.uid);

  const snapshot = await db.collection('organizations').orderBy('name').get();
  const organizations = snapshot.docs.map((doc) => doc.data() as Organization);
  return { organizations };
});

export const mergeOrganizations = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  await requireAdmin(request.auth.uid);

  const { sourceName, targetName } = request.data;
  if (!sourceName?.trim() || !targetName?.trim()) {
    throw new HttpsError('invalid-argument', 'sourceName and targetName are required');
  }
  if (sourceName.trim() === targetName.trim()) {
    throw new HttpsError('invalid-argument', 'sourceName and targetName must differ');
  }

  // Update all users whose organization === sourceName to use targetName.
  // Firestore batches max 500 writes; chunk if needed.
  const userSnap = await db.collection('users').where('organization', '==', sourceName).get();
  let usersUpdated = 0;
  const chunkSize = 400;
  for (let i = 0; i < userSnap.docs.length; i += chunkSize) {
    const batch = db.batch();
    const chunk = userSnap.docs.slice(i, i + chunkSize);
    for (const doc of chunk) {
      batch.update(doc.ref, { organization: targetName, updatedAt: Date.now() });
    }
    await batch.commit();
    usersUpdated += chunk.length;
  }

  // Remove source from managed organizations if present.
  let managedDeleted = 0;
  const managedSnap = await db.collection('organizations').where('name', '==', sourceName).get();
  for (const doc of managedSnap.docs) {
    await doc.ref.delete();
    managedDeleted++;
  }

  return { success: true, usersUpdated, managedDeleted };
});
