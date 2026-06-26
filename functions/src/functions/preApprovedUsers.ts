import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const lookupPreApprovedUser = onCall({ cors: true }, async (request: any) => {
  const { email } = request.data;
  if (!email?.trim()) return { user: null };

  const doc = await db.collection('preApprovedUsers').doc(email.toLowerCase().trim()).get();
  if (!doc.exists) return { user: null };

  const data = doc.data()!;
  return {
    user: {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
    },
  };
});

export const listPreApprovedUsers = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');

  const snapshot = await db.collection('preApprovedUsers').orderBy('lastName').get();
  return { users: snapshot.docs.map((d) => d.data()) };
});
