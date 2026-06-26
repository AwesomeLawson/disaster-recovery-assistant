import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '../config/firebase';
import type { WorkOrder, WorkOrderFormData, FieldAssessmentFormData } from '../types';

export const workOrderService = {
  async createWorkOrder(data: WorkOrderFormData): Promise<WorkOrder> {
    const fn = httpsCallable(functions, 'createWorkOrder');
    const result = await fn(data);
    return (result.data as any).workOrder;
  },

  async completeFieldAssessment(data: FieldAssessmentFormData): Promise<void> {
    const fn = httpsCallable(functions, 'completeFieldAssessment');
    await fn(data);
  },

  // Update work order
  async updateWorkOrder(workOrderId: string, updates: Partial<WorkOrder>): Promise<void> {
    const updateWorkOrderFn = httpsCallable(functions, 'updateWorkOrder');
    await updateWorkOrderFn({ workOrderId, updates });
  },

  // Reassess a work order (redo the field assessment)
  async reassessment(
    workOrderId: string,
    updates: Partial<WorkOrder>,
    flagForReview: boolean = false
  ): Promise<void> {
    const reassessmentFn = httpsCallable(functions, 'reassessment');
    await reassessmentFn({ workOrderId, updates, flagForReview });
  },

  async assignAssessor(workOrderId: string, assessorId: string): Promise<void> {
    const fn = httpsCallable(functions, 'assignAssessor');
    await fn({ workOrderId, assessorId });
  },

  // Delete work order (admin only)
  async deleteWorkOrder(workOrderId: string): Promise<void> {
    const fn = httpsCallable(functions, 'deleteWorkOrder');
    await fn({ workOrderId });
  },

  // Get work order by ID
  async getWorkOrder(workOrderId: string): Promise<WorkOrder> {
    const getWorkOrderFn = httpsCallable(functions, 'getWorkOrder');
    const result = await getWorkOrderFn({ workOrderId });
    return (result.data as any).workOrder;
  },

  // List work orders with filters
  async listWorkOrders(filters?: {
    baseCampId?: string;
    eventId?: string;
    flaggedForReview?: boolean;
    limit?: number;
  }): Promise<WorkOrder[]> {
    const listWorkOrdersFn = httpsCallable(functions, 'listWorkOrders');
    const result = await listWorkOrdersFn(filters || {});
    return (result.data as any).workOrders;
  },

  // Upload photo for work order
  async uploadPhoto(file: File, workOrderId: string): Promise<string> {
    const fileName = `workOrders/${workOrderId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  // Upload multiple photos
  async uploadPhotos(files: File[], workOrderId: string): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadPhoto(file, workOrderId));
    return await Promise.all(uploadPromises);
  },
};
