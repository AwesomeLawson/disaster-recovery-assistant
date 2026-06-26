import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { functions, storage } from '../config/firebase';
import type { Tool, ToolCondition, ToolLending } from '../types';

export interface CreateToolInput {
  baseCampId: string;
  name: string;
  description?: string;
  category?: string;
  condition: ToolCondition;
  quantity: number;
  photoUrl?: string;
  photoPath?: string;
}

export interface CheckOutToolInput {
  toolId: string;
  borrowerName: string;
  borrowerUserId?: string;
  borrowerPhone?: string;
  expectedReturnAt?: number;
  notes?: string;
}

export interface SuggestedToolItem {
  name: string;
  category?: string;
  quantity?: number;
}

export interface SuggestToolsResult {
  available: boolean;
  items: SuggestedToolItem[];
  error?: string;
}

export const toolService = {
  async listTools(baseCampId?: string): Promise<Tool[]> {
    const fn = httpsCallable(functions, 'listTools');
    const result = await fn(baseCampId ? { baseCampId } : {});
    return (result.data as any).tools as Tool[];
  },

  async createTool(input: CreateToolInput): Promise<Tool> {
    const fn = httpsCallable(functions, 'createTool');
    const result = await fn(input);
    return (result.data as any).tool as Tool;
  },

  async updateTool(toolId: string, updates: Partial<Tool>): Promise<void> {
    const fn = httpsCallable(functions, 'updateTool');
    await fn({ toolId, updates });
  },

  async deleteTool(toolId: string): Promise<void> {
    const fn = httpsCallable(functions, 'deleteTool');
    await fn({ toolId });
  },

  async checkOutTool(input: CheckOutToolInput): Promise<ToolLending> {
    const fn = httpsCallable(functions, 'checkOutTool');
    const result = await fn(input);
    return (result.data as any).lending as ToolLending;
  },

  async returnTool(lendingId: string, notes?: string): Promise<void> {
    const fn = httpsCallable(functions, 'returnTool');
    await fn({ lendingId, notes });
  },

  async listToolLendings(args: {
    toolId?: string;
    baseCampId?: string;
    activeOnly?: boolean;
  }): Promise<ToolLending[]> {
    const fn = httpsCallable(functions, 'listToolLendings');
    const result = await fn(args);
    return (result.data as any).lendings as ToolLending[];
  },

  async suggestToolsFromPhoto(photoUrl: string): Promise<SuggestToolsResult> {
    const fn = httpsCallable(functions, 'suggestToolsFromPhoto');
    const result = await fn({ photoUrl });
    return result.data as SuggestToolsResult;
  },

  /**
   * Uploads a tool photo to Firebase Storage and returns the public URL plus
   * the storage path (kept for later deletion).
   */
  async uploadToolPhoto(
    file: File,
    baseCampId: string
  ): Promise<{ photoUrl: string; photoPath: string }> {
    const safeName = file.name.replace(/[/\\]/g, '_');
    const photoPath = `tools/${baseCampId}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, photoPath);
    await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
    const photoUrl = await getDownloadURL(storageRef);
    return { photoUrl, photoPath };
  },

  /**
   * Best-effort delete of a tool photo from storage. Used to clean up a photo
   * uploaded for AI scanning when the user doesn't end up creating a tool from it.
   */
  async deleteToolPhoto(photoPath: string): Promise<void> {
    try {
      const storageRef = ref(storage, photoPath);
      await deleteObject(storageRef);
    } catch (err) {
      // Swallow — the photo may already be gone.
      console.warn('Failed to delete tool photo:', err);
    }
  },
};
