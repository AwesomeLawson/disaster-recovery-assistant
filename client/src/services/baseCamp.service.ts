import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { BaseCamp } from '../types';

export const baseCampService = {
  // Create a new base camp
  async createBaseCamp(data: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    eventIds?: string[];
    leadUserIds?: string[];
  }): Promise<BaseCamp> {
    const createBaseCampFn = httpsCallable(functions, 'createBaseCamp');
    const result = await createBaseCampFn(data);
    return (result.data as any).baseCamp;
  },

  // Update base camp
  async updateBaseCamp(baseCampId: string, updates: Partial<BaseCamp>): Promise<void> {
    const updateBaseCampFn = httpsCallable(functions, 'updateBaseCamp');
    await updateBaseCampFn({ baseCampId, updates });
  },

  // Get base camp by ID
  async getBaseCamp(baseCampId: string): Promise<BaseCamp> {
    const getBaseCampFn = httpsCallable(functions, 'getBaseCamp');
    const result = await getBaseCampFn({ baseCampId });
    return (result.data as any).baseCamp;
  },

  // List base camps
  async listBaseCamps(eventId?: string, limit?: number): Promise<BaseCamp[]> {
    const listBaseCampsFn = httpsCallable(functions, 'listBaseCamps');
    const result = await listBaseCampsFn({ eventId, limit });
    return (result.data as any).baseCamps;
  },
};
