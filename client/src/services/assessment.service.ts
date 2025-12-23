import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '../config/firebase';
import type { Assessment, AssessmentFormData } from '../types';

export const assessmentService = {
  // Create a new assessment
  async createAssessment(data: AssessmentFormData): Promise<Assessment> {
    const createAssessmentFn = httpsCallable(functions, 'createAssessment');
    const result = await createAssessmentFn(data);
    return (result.data as any).assessment;
  },

  // Update assessment
  async updateAssessment(assessmentId: string, updates: Partial<Assessment>): Promise<void> {
    const updateAssessmentFn = httpsCallable(functions, 'updateAssessment');
    await updateAssessmentFn({ assessmentId, updates });
  },

  // Reassess an assessment
  async reassessment(
    assessmentId: string,
    updates: Partial<Assessment>,
    flagForReview: boolean = false
  ): Promise<void> {
    const reassessmentFn = httpsCallable(functions, 'reassessment');
    await reassessmentFn({ assessmentId, updates, flagForReview });
  },

  // Get assessment by ID
  async getAssessment(assessmentId: string): Promise<Assessment> {
    const getAssessmentFn = httpsCallable(functions, 'getAssessment');
    const result = await getAssessmentFn({ assessmentId });
    return (result.data as any).assessment;
  },

  // List assessments with filters
  async listAssessments(filters?: {
    centerId?: string;
    groupId?: string;
    flaggedForReview?: boolean;
    limit?: number;
  }): Promise<Assessment[]> {
    const listAssessmentsFn = httpsCallable(functions, 'listAssessments');
    const result = await listAssessmentsFn(filters || {});
    return (result.data as any).assessments;
  },

  // Upload photo for assessment
  async uploadPhoto(file: File, assessmentId: string): Promise<string> {
    const fileName = `assessments/${assessmentId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  // Upload multiple photos
  async uploadPhotos(files: File[], assessmentId: string): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadPhoto(file, assessmentId));
    return await Promise.all(uploadPromises);
  },
};
