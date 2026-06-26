import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { HelpConversation, HelpMessage } from '../types';

export const helpChatService = {
  async createConversation(title?: string): Promise<HelpConversation> {
    const fn = httpsCallable(functions, 'createHelpConversation');
    const result = await fn(title ? { title } : {});
    return (result.data as any).conversation as HelpConversation;
  },

  async listMyConversations(): Promise<HelpConversation[]> {
    const fn = httpsCallable(functions, 'listMyHelpConversations');
    const result = await fn({});
    return (result.data as any).conversations as HelpConversation[];
  },

  async getConversation(
    conversationId: string
  ): Promise<{ conversation: HelpConversation; messages: HelpMessage[] }> {
    const fn = httpsCallable(functions, 'getHelpConversation');
    const result = await fn({ conversationId });
    return result.data as { conversation: HelpConversation; messages: HelpMessage[] };
  },

  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<{ message: HelpMessage; userMessage: HelpMessage }> {
    const fn = httpsCallable(functions, 'sendHelpMessage');
    const result = await fn({ conversationId, content });
    return result.data as { message: HelpMessage; userMessage: HelpMessage };
  },

  async renameConversation(conversationId: string, title: string): Promise<string> {
    const fn = httpsCallable(functions, 'renameHelpConversation');
    const result = await fn({ conversationId, title });
    return (result.data as any).title as string;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const fn = httpsCallable(functions, 'deleteHelpConversation');
    await fn({ conversationId });
  },
};
