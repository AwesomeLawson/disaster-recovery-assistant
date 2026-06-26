import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { VolunteerHours } from '../types';

export interface HoursEntryInput {
  date: number;
  hours: number;
  notes?: string;
}

export interface ImpactStats {
  familiesServed: number;
  totalHours: number;
  uniqueVolunteers: number;
  dollarValue: number;
  hourlyRate: number;
}

export interface AllHoursFilter {
  eventId?: string;
  startDate?: number;
  endDate?: number;
}

export const volunteerHoursService = {
  async logHours(eventId: string, entries: HoursEntryInput[]): Promise<void> {
    const fn = httpsCallable(functions, 'logVolunteerHours');
    await fn({ eventId, entries });
  },

  async listMine(eventId?: string): Promise<VolunteerHours[]> {
    const fn = httpsCallable(functions, 'listMyVolunteerHours');
    const result = await fn(eventId ? { eventId } : {});
    return (result.data as any).records as VolunteerHours[];
  },

  async listAll(filter: AllHoursFilter = {}): Promise<VolunteerHours[]> {
    const fn = httpsCallable(functions, 'listAllVolunteerHours');
    const result = await fn(filter);
    return (result.data as any).records as VolunteerHours[];
  },

  async getImpactStats(filter: AllHoursFilter = {}): Promise<ImpactStats> {
    const fn = httpsCallable(functions, 'getImpactStats');
    const result = await fn(filter);
    return result.data as ImpactStats;
  },
};
