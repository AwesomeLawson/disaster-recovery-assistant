import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { Center } from '../types';

export const centerService = {
  // Create a new center
  async createCenter(data: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    groupId: string;
    leadUserIds?: string[];
  }): Promise<Center> {
    const createCenterFn = httpsCallable(functions, 'createCenter');
    const result = await createCenterFn(data);
    return (result.data as any).center;
  },

  // Update center
  async updateCenter(centerId: string, updates: Partial<Center>): Promise<void> {
    const updateCenterFn = httpsCallable(functions, 'updateCenter');
    await updateCenterFn({ centerId, updates });
  },

  // Get center by ID
  async getCenter(centerId: string): Promise<Center> {
    const getCenterFn = httpsCallable(functions, 'getCenter');
    const result = await getCenterFn({ centerId });
    return (result.data as any).center;
  },

  // List centers
  async listCenters(groupId?: string, limit?: number): Promise<Center[]> {
    const listCentersFn = httpsCallable(functions, 'listCenters');
    const result = await listCentersFn({ groupId, limit });
    return (result.data as any).centers;
  },
};
