import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '../config/firebase';
import type { Workgroup, WorkgroupFormData, WorkgroupTaskStatus } from '../types';

export const workgroupService = {
  // Create a new workgroup
  async createWorkgroup(data: WorkgroupFormData): Promise<Workgroup> {
    const createWorkgroupFn = httpsCallable(functions, 'createWorkgroup');
    const result = await createWorkgroupFn(data);
    return (result.data as any).workgroup;
  },

  // Update workgroup
  async updateWorkgroup(workgroupId: string, updates: Partial<Workgroup>): Promise<void> {
    const updateWorkgroupFn = httpsCallable(functions, 'updateWorkgroup');
    await updateWorkgroupFn({ workgroupId, updates });
  },

  // Update workgroup status with note and photos
  async updateWorkgroupStatus(
    workgroupId: string,
    status: WorkgroupTaskStatus,
    note?: string,
    photoUrls?: string[]
  ): Promise<void> {
    const updateWorkgroupStatusFn = httpsCallable(functions, 'updateWorkgroupStatus');
    await updateWorkgroupStatusFn({ workgroupId, status, note, photoUrls });
  },

  // Get workgroup by ID
  async getWorkgroup(workgroupId: string): Promise<Workgroup> {
    const getWorkgroupFn = httpsCallable(functions, 'getWorkgroup');
    const result = await getWorkgroupFn({ workgroupId });
    return (result.data as any).workgroup;
  },

  // List workgroups with filters
  async listWorkgroups(filters?: {
    centerId?: string;
    groupId?: string;
    assessmentId?: string;
    limit?: number;
  }): Promise<Workgroup[]> {
    const listWorkgroupsFn = httpsCallable(functions, 'listWorkgroups');
    const result = await listWorkgroupsFn(filters || {});
    return (result.data as any).workgroups;
  },

  // Add worker to workgroup
  async addWorkerToWorkgroup(workgroupId: string, userId: string): Promise<void> {
    const addWorkerToWorkgroupFn = httpsCallable(functions, 'addWorkerToWorkgroup');
    await addWorkerToWorkgroupFn({ workgroupId, userId });
  },

  // Upload photo for workgroup
  async uploadPhoto(file: File, workgroupId: string): Promise<string> {
    const fileName = `workgroups/${workgroupId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  // Upload multiple photos
  async uploadPhotos(files: File[], workgroupId: string): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadPhoto(file, workgroupId));
    return await Promise.all(uploadPromises);
  },
};
