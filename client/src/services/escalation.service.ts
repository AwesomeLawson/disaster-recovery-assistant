import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { Escalation, EscalationFormData, EscalationStatus } from '../types';

export const escalationService = {
  // Create a new escalation
  async createEscalation(data: EscalationFormData): Promise<Escalation> {
    const createEscalationFn = httpsCallable(functions, 'createEscalation');
    const result = await createEscalationFn(data);
    return (result.data as any).escalation;
  },

  // Update escalation status
  async updateEscalationStatus(
    escalationId: string,
    status: EscalationStatus,
    assignedTo?: string
  ): Promise<void> {
    const updateEscalationStatusFn = httpsCallable(functions, 'updateEscalationStatus');
    await updateEscalationStatusFn({ escalationId, status, assignedTo });
  },

  // Resolve escalation
  async resolveEscalation(escalationId: string, resolution: string): Promise<void> {
    const resolveEscalationFn = httpsCallable(functions, 'resolveEscalation');
    await resolveEscalationFn({ escalationId, resolution });
  },

  // Get escalation by ID
  async getEscalation(escalationId: string): Promise<Escalation> {
    const getEscalationFn = httpsCallable(functions, 'getEscalation');
    const result = await getEscalationFn({ escalationId });
    return (result.data as any).escalation;
  },

  // List escalations with filters
  async listEscalations(filters?: {
    centerId?: string;
    groupId?: string;
    workgroupId?: string;
    status?: EscalationStatus;
    limit?: number;
  }): Promise<Escalation[]> {
    const listEscalationsFn = httpsCallable(functions, 'listEscalations');
    const result = await listEscalationsFn(filters || {});
    return (result.data as any).escalations;
  },
};
