import { httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { functions, db } from '../config/firebase';
import type { Message, MessageType } from '../types';

export const messageService = {
  // Send a message
  async sendMessage(
    threadId: string,
    recipientIds: string[],
    content: string,
    type: MessageType
  ): Promise<Message> {
    const sendMessageFn = httpsCallable(functions, 'sendMessage');
    const result = await sendMessageFn({ threadId, recipientIds, content, type });
    return (result.data as any).message;
  },

  // Send group message
  async sendGroupMessage(
    content: string,
    type: MessageType,
    options: {
      groupId?: string;
      centerId?: string;
      workgroupId?: string;
    }
  ): Promise<Message> {
    const sendGroupMessageFn = httpsCallable(functions, 'sendGroupMessage');
    const result = await sendGroupMessageFn({ ...options, content, type });
    return (result.data as any).message;
  },

  // Get messages for a thread
  async getMessages(threadId: string, limit?: number): Promise<Message[]> {
    const getMessagesFn = httpsCallable(functions, 'getMessages');
    const result = await getMessagesFn({ threadId, limit });
    return (result.data as any).messages;
  },

  // Subscribe to real-time messages for a thread
  subscribeToMessages(
    threadId: string,
    callback: (messages: Message[]) => void
  ): Unsubscribe {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('threadId', '==', threadId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        messages.push(doc.data() as Message);
      });
      callback(messages);
    });
  },
};
