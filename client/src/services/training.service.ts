import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL, getMetadata } from 'firebase/storage';
import { functions, storage } from '../config/firebase';
import type { Training, TrainingCategory } from '../types';

export interface CreateTrainingInput {
  title: string;
  description?: string;
  category: TrainingCategory;
  fileUrl: string;
  filePath: string;
  fileSizeBytes: number;
}

export const trainingService = {
  async listTrainings(): Promise<Training[]> {
    const fn = httpsCallable(functions, 'listTrainings');
    const result = await fn({});
    return (result.data as any).trainings as Training[];
  },

  async createTraining(input: CreateTrainingInput): Promise<Training> {
    const fn = httpsCallable(functions, 'createTraining');
    const result = await fn(input);
    return (result.data as any).training as Training;
  },

  async deleteTraining(trainingId: string): Promise<void> {
    const fn = httpsCallable(functions, 'deleteTraining');
    await fn({ trainingId });
  },

  /**
   * Uploads a training PDF directly to Firebase Storage and returns the metadata
   * the caller needs to persist via createTraining.
   */
  async uploadTrainingFile(
    file: File,
    userId: string
  ): Promise<{ fileUrl: string; filePath: string; fileSizeBytes: number }> {
    // Sanitize the original filename — strip path separators, keep extension.
    const safeName = file.name.replace(/[/\\]/g, '_');
    const filePath = `trainings/${userId}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file, { contentType: file.type || 'application/pdf' });
    const [fileUrl, metadata] = await Promise.all([
      getDownloadURL(storageRef),
      getMetadata(storageRef),
    ]);
    return {
      fileUrl,
      filePath,
      fileSizeBytes: metadata.size ?? file.size,
    };
  },
};
