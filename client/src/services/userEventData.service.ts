import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { AvailabilityRange, UserEventData } from '../types';

export const userEventDataService = {
  async setAvailability(eventId: string, availability: AvailabilityRange[]): Promise<void> {
    const fn = httpsCallable(functions, 'setUserEventAvailability');
    await fn({ eventId, availability });
  },

  async listMine(): Promise<UserEventData[]> {
    const fn = httpsCallable(functions, 'listMyEventData');
    const result = await fn({});
    return (result.data as any).records as UserEventData[];
  },

  async listForUser(userId: string): Promise<UserEventData[]> {
    const fn = httpsCallable(functions, 'listUserEventData');
    const result = await fn({ userId });
    return (result.data as any).records as UserEventData[];
  },

  async listAll(eventId?: string): Promise<UserEventData[]> {
    const fn = httpsCallable(functions, 'listAllEventData');
    const result = await fn(eventId ? { eventId } : {});
    return (result.data as any).records as UserEventData[];
  },

  async confirmDates(
    userId: string,
    eventId: string,
    confirmedDates: AvailabilityRange[],
    notes?: string
  ): Promise<void> {
    const fn = httpsCallable(functions, 'confirmUserEventDates');
    await fn({ userId, eventId, confirmedDates, notes });
  },
};
