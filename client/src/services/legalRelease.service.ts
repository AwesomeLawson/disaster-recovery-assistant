import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '../config/firebase';
import type { LegalRelease, ReleaseType } from '../types';

export const legalReleaseService = {
  // Create a legal release
  async createLegalRelease(
    userId: string,
    releaseType: ReleaseType,
    options?: {
      documentUrl?: string;
      signatureImageUrl?: string;
      signedDigitally?: boolean;
      assessmentId?: string;
    }
  ): Promise<LegalRelease> {
    const createLegalReleaseFn = httpsCallable(functions, 'createLegalRelease');
    const result = await createLegalReleaseFn({
      userId,
      releaseType,
      ...options,
    });
    return (result.data as any).release;
  },

  // Sign a legal release
  async signLegalRelease(releaseId: string, signatureImageUrl?: string): Promise<void> {
    const signLegalReleaseFn = httpsCallable(functions, 'signLegalRelease');
    await signLegalReleaseFn({ releaseId, signatureImageUrl });
  },

  // Get legal release by ID
  async getLegalRelease(releaseId: string): Promise<LegalRelease> {
    const getLegalReleaseFn = httpsCallable(functions, 'getLegalRelease');
    const result = await getLegalReleaseFn({ releaseId });
    return (result.data as any).release;
  },

  // Upload signature image
  async uploadSignature(file: File, userId: string): Promise<string> {
    const fileName = `signatures/${userId}/${Date.now()}_signature.png`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  // Upload legal release document
  async uploadDocument(file: File, userId: string): Promise<string> {
    const fileName = `legal-releases/${userId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  // Convert canvas to blob for signature upload
  canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  },
};
