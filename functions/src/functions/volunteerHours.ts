import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import type { User, VolunteerHours } from '../types';

const db = admin.firestore();

// IRS Independent Sector volunteer time value, 2024
// NOTE: if this rate ever needs to change, update only this constant.
const VOLUNTEER_HOURLY_RATE = 33.49;

const docId = (userId: string, eventId: string, date: number) =>
  `${userId}_${eventId}_${date}`;

const requireAdmin = async (uid: string): Promise<User> => {
  const callerDoc = await db.collection('users').doc(uid).get();
  const caller = callerDoc.data() as User | undefined;
  if (!caller?.roles.some((r) => ['administrator'].includes(r))) {
    throw new HttpsError('permission-denied', 'Insufficient permissions');
  }
  return caller;
};

interface HoursEntry {
  date: number;
  hours: number;
  notes?: string;
}

export const logVolunteerHours = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const { eventId, entries } = request.data;
  if (!eventId || !Array.isArray(entries)) {
    throw new HttpsError('invalid-argument', 'Missing required fields: eventId, entries');
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data() as User | undefined;
  if (!user) throw new HttpsError('not-found', 'User not found');
  const userName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || uid;

  // Validate
  for (const e of entries as HoursEntry[]) {
    if (typeof e.date !== 'number' || typeof e.hours !== 'number') {
      throw new HttpsError('invalid-argument', 'Each entry must have numeric date and hours');
    }
    if (e.hours < 0 || e.hours > 24) {
      throw new HttpsError('invalid-argument', 'hours must be between 0 and 24');
    }
  }

  const now = Date.now();
  const batch = db.batch();

  for (const e of entries as HoursEntry[]) {
    const id = docId(uid, eventId, e.date);
    const ref = db.collection('volunteerHours').doc(id);
    const existing = await ref.get();

    if (e.hours === 0) {
      // Delete existing row if it was set to 0
      if (existing.exists) {
        batch.delete(ref);
      }
      continue;
    }

    if (existing.exists) {
      const updateData: any = {
        hours: e.hours,
        userName,
        updatedAt: now,
      };
      if (e.notes !== undefined) updateData.notes = e.notes;
      batch.update(ref, updateData);
    } else {
      const doc: VolunteerHours = {
        id,
        userId: uid,
        userName,
        eventId,
        date: e.date,
        hours: e.hours,
        ...(e.notes ? { notes: e.notes } : {}),
        createdAt: now,
        updatedAt: now,
      };
      batch.set(ref, doc);
    }
  }

  await batch.commit();

  return { success: true };
});

export const listMyVolunteerHours = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const { eventId } = request.data || {};
  let query: FirebaseFirestore.Query = db.collection('volunteerHours')
    .where('userId', '==', request.auth.uid);
  if (eventId) {
    query = query.where('eventId', '==', eventId);
  }

  const snap = await query.get();
  return { records: snap.docs.map((d) => d.data()) };
});

export const listAllVolunteerHours = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  await requireAdmin(request.auth.uid);

  const { eventId, startDate, endDate } = request.data || {};
  let query: FirebaseFirestore.Query = db.collection('volunteerHours');
  if (eventId) {
    query = query.where('eventId', '==', eventId);
  }
  if (typeof startDate === 'number') {
    query = query.where('date', '>=', startDate);
  }
  if (typeof endDate === 'number') {
    query = query.where('date', '<=', endDate);
  }

  const snap = await query.get();
  return { records: snap.docs.map((d) => d.data()) };
});

export const getImpactStats = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  await requireAdmin(request.auth.uid);

  const { eventId, startDate, endDate } = request.data || {};

  // Hours rows
  let hoursQuery: FirebaseFirestore.Query = db.collection('volunteerHours');
  if (eventId) hoursQuery = hoursQuery.where('eventId', '==', eventId);
  if (typeof startDate === 'number') hoursQuery = hoursQuery.where('date', '>=', startDate);
  if (typeof endDate === 'number') hoursQuery = hoursQuery.where('date', '<=', endDate);
  const hoursSnap = await hoursQuery.get();

  let totalHours = 0;
  const uniqueUserIds = new Set<string>();
  for (const d of hoursSnap.docs) {
    const data = d.data() as VolunteerHours;
    totalHours += data.hours;
    uniqueUserIds.add(data.userId);
  }

  // Completed work orders
  let woQuery: FirebaseFirestore.Query = db.collection('workOrders')
    .where('status', '==', 'completed');
  if (eventId) woQuery = woQuery.where('eventId', '==', eventId);
  if (typeof startDate === 'number') woQuery = woQuery.where('updatedAt', '>=', startDate);
  if (typeof endDate === 'number') woQuery = woQuery.where('updatedAt', '<=', endDate);
  const woSnap = await woQuery.get();

  const familiesServed = woSnap.size;
  const dollarValue = totalHours * VOLUNTEER_HOURLY_RATE;

  return {
    familiesServed,
    totalHours,
    uniqueVolunteers: uniqueUserIds.size,
    dollarValue,
    hourlyRate: VOLUNTEER_HOURLY_RATE,
  };
});
