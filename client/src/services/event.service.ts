import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { Event } from '../types';

export const eventService = {
  // Create a new event
  async createEvent(data: {
    name: string;
    eventType: string;
    description?: string;
    userIds?: string[];
    centerIds?: string[];
  }): Promise<Event> {
    const createEventFn = httpsCallable(functions, 'createEvent');
    const result = await createEventFn(data);
    return (result.data as any).event;
  },

  // Update event
  async updateEvent(eventId: string, updates: Partial<Event>): Promise<void> {
    const updateEventFn = httpsCallable(functions, 'updateEvent');
    await updateEventFn({ eventId, updates });
  },

  // Get event by ID
  async getEvent(eventId: string): Promise<Event> {
    const getEventFn = httpsCallable(functions, 'getEvent');
    const result = await getEventFn({ eventId });
    return (result.data as any).event;
  },

  // List all events
  async listEvents(limit?: number): Promise<Event[]> {
    const listEventsFn = httpsCallable(functions, 'listEvents');
    const result = await listEventsFn({ limit });
    return (result.data as any).events;
  },

  // Add user to event
  async addUserToEvent(eventId: string, userId: string): Promise<void> {
    const addUserToEventFn = httpsCallable(functions, 'addUserToEvent');
    await addUserToEventFn({ eventId, userId });
  },

  // Add center to event
  async addCenterToEvent(eventId: string, centerId: string): Promise<void> {
    const addCenterToEventFn = httpsCallable(functions, 'addCenterToEvent');
    await addCenterToEventFn({ eventId, centerId });
  },

  // Remove center from event
  async removeCenterFromEvent(eventId: string, centerId: string): Promise<void> {
    const removeCenterFromEventFn = httpsCallable(functions, 'removeCenterFromEvent');
    await removeCenterFromEventFn({ eventId, centerId });
  },
};
