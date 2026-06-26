import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export interface ManagedOrganization {
  id: string;
  name: string;
  createdAt: number;
  createdBy: string;
}

export const organizationService = {
  async listManagedOrganizations(): Promise<ManagedOrganization[]> {
    const fn = httpsCallable(functions, 'listManagedOrganizations');
    const result = await fn({});
    return (result.data as any).organizations;
  },

  async createOrganization(name: string): Promise<ManagedOrganization> {
    const fn = httpsCallable(functions, 'createOrganization');
    const result = await fn({ name });
    return (result.data as any).organization;
  },

  async deleteOrganization(organizationId: string): Promise<void> {
    const fn = httpsCallable(functions, 'deleteOrganization');
    await fn({ organizationId });
  },

  async mergeOrganizations(sourceName: string, targetName: string): Promise<{ usersUpdated: number; managedDeleted: number }> {
    const fn = httpsCallable(functions, 'mergeOrganizations');
    const result = await fn({ sourceName, targetName });
    return result.data as { usersUpdated: number; managedDeleted: number };
  },
};
