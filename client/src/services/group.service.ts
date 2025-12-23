import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { Group } from '../types';

export const groupService = {
  // Create a new group
  async createGroup(data: {
    name: string;
    eventType: string;
    description?: string;
    userIds?: string[];
    centerIds?: string[];
  }): Promise<Group> {
    const createGroupFn = httpsCallable(functions, 'createGroup');
    const result = await createGroupFn(data);
    return (result.data as any).group;
  },

  // Update group
  async updateGroup(groupId: string, updates: Partial<Group>): Promise<void> {
    const updateGroupFn = httpsCallable(functions, 'updateGroup');
    await updateGroupFn({ groupId, updates });
  },

  // Get group by ID
  async getGroup(groupId: string): Promise<Group> {
    const getGroupFn = httpsCallable(functions, 'getGroup');
    const result = await getGroupFn({ groupId });
    return (result.data as any).group;
  },

  // List all groups
  async listGroups(limit?: number): Promise<Group[]> {
    const listGroupsFn = httpsCallable(functions, 'listGroups');
    const result = await listGroupsFn({ limit });
    return (result.data as any).groups;
  },

  // Add user to group
  async addUserToGroup(groupId: string, userId: string): Promise<void> {
    const addUserToGroupFn = httpsCallable(functions, 'addUserToGroup');
    await addUserToGroupFn({ groupId, userId });
  },
};
