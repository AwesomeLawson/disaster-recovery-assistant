import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '../config/firebase';
import type { HomeownerRelease } from '../types';

export const homeownerReleaseService = {
  async createHomeownerRelease(data: {
    workOrderId: string;
    homeownerName: string;
    phoneNumber: string;
    propertyAddress: string;
    propertyCityStateZip: string;
    coOwnerName?: string;
    coOwnerPhone?: string;
    frrRepName: string;
    frrPhone: string;
    homeownerSignatureUrl: string;
    coOwnerSignatureUrl?: string;
    frrWitnessSignatureUrl: string;
  }): Promise<HomeownerRelease> {
    const fn = httpsCallable(functions, 'createHomeownerRelease');
    const result = await fn(data);
    return (result.data as any).release;
  },

  async getHomeownerRelease(releaseId: string): Promise<HomeownerRelease> {
    const fn = httpsCallable(functions, 'getHomeownerRelease');
    const result = await fn({ releaseId });
    return (result.data as any).release;
  },

  async uploadSignature(file: File, workOrderId: string, signatureType: 'homeowner' | 'coOwner' | 'frrWitness'): Promise<string> {
    const path = `homeowner-signatures/${workOrderId}/${signatureType}_${Date.now()}.png`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  },
};
