import { httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { functions, db } from '../config/firebase';
import type { Thread, Message } from '../types';

export const messageService = {
  async getReachableContacts(): Promise<{ users: any[]; workgroups: any[] }> {
    const fn = httpsCallable(functions, 'getReachableContacts');
    const result = await fn({});
    return result.data as { users: any[]; workgroups: any[] };
  },

  async getOrCreateDirectThread(otherUserId: string): Promise<Thread> {
    const fn = httpsCallable(functions, 'getOrCreateDirectThread');
    const result = await fn({ otherUserId });
    return (result.data as any).thread as Thread;
  },

  async getOrCreateWorkgroupThread(workgroupId: string): Promise<Thread> {
    const fn = httpsCallable(functions, 'getOrCreateWorkgroupThread');
    const result = await fn({ workgroupId });
    return (result.data as any).thread as Thread;
  },

  async sendMessage(threadId: string, content: string): Promise<Message> {
    const fn = httpsCallable(functions, 'sendMessage');
    const result = await fn({ threadId, content });
    return (result.data as any).message as Message;
  },

  subscribeToThreads(uid: string, callback: (threads: Thread[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'threads'),
      where('participantIds', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc')
    );
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Thread));
    });
  },

  subscribeToMessages(threadId: string, callback: (messages: Message[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'messages'),
      where('threadId', '==', threadId),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(
      q,
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message)),
      err => console.error('subscribeToMessages error:', err)
    );
  },
};
