import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import type { User, Workgroup, Thread, Message } from '../types';

const db = admin.firestore();

const directThreadId = (uid1: string, uid2: string) =>
  `direct_${[uid1, uid2].sort().join('_')}`;

const workgroupThreadId = (wgId: string) => `workgroup_${wgId}`;

// Returns users and workgroups the caller is allowed to message, scoped by role/hierarchy
export const getReachableContacts = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const uid = request.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

  const currentUser = userDoc.data() as User;
  const roles = currentUser.roles;
  const isAdminOrFC = roles.includes('administrator') || roles.includes('fieldCoordinator');
  const isWGL = roles.includes('workGroupLead');

  const pickUser = (doc: admin.firestore.DocumentSnapshot) => {
    if (!doc.exists || doc.id === uid) return null;
    const d = doc.data() as User;
    return { id: doc.id, firstName: d.firstName, lastName: d.lastName, email: d.email, roles: d.roles };
  };

  if (isAdminOrFC) {
    const [usersSnap, workgroupsSnap] = await Promise.all([
      db.collection('users').where('roleApprovalStatus', '==', 'approved').get(),
      db.collection('workgroups').get(),
    ]);
    const users = usersSnap.docs.map(pickUser).filter(Boolean);
    const workgroups = workgroupsSnap.docs.map(d => {
      const wg = d.data() as Workgroup;
      return { id: d.id, name: wg.name, volunteerUserIds: wg.volunteerUserIds };
    });
    return { users, workgroups };
  }

  if (isWGL) {
    const myWorkgroupsSnap = await db.collection('workgroups')
      .where('leadUserId', '==', uid).get();

    const memberIds = new Set<string>();
    const workgroups: { id: string; name: string; volunteerUserIds: string[] }[] = [];

    for (const doc of myWorkgroupsSnap.docs) {
      const wg = doc.data() as Workgroup;
      workgroups.push({ id: doc.id, name: wg.name, volunteerUserIds: wg.volunteerUserIds });
      wg.volunteerUserIds.forEach(id => memberIds.add(id));
    }

    const [adminSnap, memberDocs] = await Promise.all([
      db.collection('users')
        .where('roles', 'array-contains-any', ['administrator', 'fieldCoordinator'])
        .get(),
      memberIds.size > 0
        ? db.getAll(...[...memberIds].map(id => db.collection('users').doc(id)))
        : Promise.resolve([] as admin.firestore.DocumentSnapshot[]),
    ]);

    const userMap = new Map<string, object>();
    for (const doc of [...adminSnap.docs, ...memberDocs]) {
      const u = pickUser(doc);
      if (u) userMap.set(doc.id, u);
    }

    return { users: [...userMap.values()], workgroups };
  }

  // Volunteer / Assessor / SecChaplain:
  // Can DM their workgroup lead(s) and peer members in shared workgroups.
  // Can also participate in group threads for their workgroups.
  const myWorkgroupsSnap = await db.collection('workgroups')
    .where('volunteerUserIds', 'array-contains', uid).get();

  const contactIds = new Set<string>();
  const workgroups: { id: string; name: string; volunteerUserIds: string[] }[] = [];

  for (const doc of myWorkgroupsSnap.docs) {
    const wg = doc.data() as Workgroup;
    workgroups.push({ id: doc.id, name: wg.name, volunteerUserIds: wg.volunteerUserIds });
    contactIds.add(wg.leadUserId);
    wg.volunteerUserIds.forEach(id => { if (id !== uid) contactIds.add(id); });
  }

  if (contactIds.size === 0) return { users: [], workgroups };

  const contactDocs = await db.getAll(...[...contactIds].map(id => db.collection('users').doc(id)));
  const users = contactDocs.map(pickUser).filter(Boolean);

  return { users, workgroups };
});

// Gets or creates a 1:1 thread between the caller and another user
export const getOrCreateDirectThread = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const { otherUserId } = request.data;
  if (!otherUserId) throw new HttpsError('invalid-argument', 'otherUserId required');

  const uid = request.auth.uid;
  const threadId = directThreadId(uid, otherUserId);
  const threadRef = db.collection('threads').doc(threadId);
  const threadDoc = await threadRef.get();

  if (threadDoc.exists) return { thread: { id: threadId, ...threadDoc.data() } };

  const [myDoc, otherDoc] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('users').doc(otherUserId).get(),
  ]);

  if (!otherDoc.exists) throw new HttpsError('not-found', 'User not found');

  const me = myDoc.data() as User;
  const other = otherDoc.data() as User;

  const thread: Thread = {
    id: threadId,
    type: 'direct',
    participantIds: [uid, otherUserId],
    participantNames: {
      [uid]: `${me.firstName} ${me.lastName}`,
      [otherUserId]: `${other.firstName} ${other.lastName}`,
    },
    title: `${other.firstName} ${other.lastName}`,
    lastMessageAt: Date.now(),
    lastMessagePreview: '',
    createdAt: Date.now(),
  };

  await threadRef.set(thread);
  return { thread };
});

// Gets or creates a group thread for a workgroup (all members are participants)
export const getOrCreateWorkgroupThread = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const { workgroupId } = request.data;
  if (!workgroupId) throw new HttpsError('invalid-argument', 'workgroupId required');

  const threadId = workgroupThreadId(workgroupId);
  const threadRef = db.collection('threads').doc(threadId);
  const threadDoc = await threadRef.get();

  if (threadDoc.exists) return { thread: { id: threadId, ...threadDoc.data() } };

  const wgDoc = await db.collection('workgroups').doc(workgroupId).get();
  if (!wgDoc.exists) throw new HttpsError('not-found', 'Workgroup not found');

  const wg = wgDoc.data() as Workgroup;
  const participantIds = [...new Set([wg.leadUserId, ...wg.volunteerUserIds])];

  const userDocs = await db.getAll(...participantIds.map(id => db.collection('users').doc(id)));
  const participantNames: Record<string, string> = {};
  for (const doc of userDocs) {
    if (doc.exists) {
      const u = doc.data() as User;
      participantNames[doc.id] = `${u.firstName} ${u.lastName}`;
    }
  }

  const thread: Thread = {
    id: threadId,
    type: 'workgroup',
    workgroupId,
    participantIds,
    participantNames,
    title: wg.name,
    lastMessageAt: Date.now(),
    lastMessagePreview: '',
    createdAt: Date.now(),
  };

  await threadRef.set(thread);
  return { thread };
});

// Sends a message to a thread the caller belongs to
export const sendMessage = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const { threadId, content } = request.data;
  if (!threadId || !content?.trim()) {
    throw new HttpsError('invalid-argument', 'threadId and content are required');
  }

  const uid = request.auth.uid;
  const threadDoc = await db.collection('threads').doc(threadId).get();
  if (!threadDoc.exists) throw new HttpsError('not-found', 'Thread not found');

  const thread = threadDoc.data() as Thread;
  if (!thread.participantIds.includes(uid)) {
    throw new HttpsError('permission-denied', 'Not a participant in this thread');
  }

  const msgRef = db.collection('messages').doc();
  const trimmed = content.trim();
  const message: Message = {
    id: msgRef.id,
    threadId,
    senderId: uid,
    senderName: thread.participantNames?.[uid] || 'Unknown',
    content: trimmed,
    participantIds: thread.participantIds,
    createdAt: Date.now(),
  };

  await Promise.all([
    msgRef.set(message),
    db.collection('threads').doc(threadId).update({
      lastMessageAt: message.createdAt,
      lastMessagePreview: trimmed.substring(0, 100),
    }),
  ]);

  return { message };
});
