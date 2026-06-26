import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export interface AnthropicKeyStatus {
  configured: boolean;
  source: 'firestore' | 'secret' | 'none';
  updatedAt: number | null;
  updatedByName: string | null;
}

export interface AnthropicKeyTestResult {
  ok: boolean;
  source: 'firestore' | 'secret' | 'none';
  error?: string;
  sampleResponse?: string;
}

export const appConfigService = {
  async setAnthropicApiKey(apiKey: string): Promise<void> {
    const fn = httpsCallable(functions, 'setAnthropicApiKey');
    await fn({ apiKey });
  },

  async clearAnthropicApiKey(): Promise<void> {
    const fn = httpsCallable(functions, 'clearAnthropicApiKey');
    await fn({});
  },

  async getAnthropicApiKeyStatus(): Promise<AnthropicKeyStatus> {
    const fn = httpsCallable(functions, 'getAnthropicApiKeyStatus');
    const result = await fn({});
    return result.data as AnthropicKeyStatus;
  },

  async testAnthropicApiKey(): Promise<AnthropicKeyTestResult> {
    const fn = httpsCallable(functions, 'testAnthropicApiKey');
    const result = await fn({});
    return result.data as AnthropicKeyTestResult;
  },
};
