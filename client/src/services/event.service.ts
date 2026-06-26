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
    baseCampIds?: string[];
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

  // Add base camp to event
  async addBaseCampToEvent(eventId: string, baseCampId: string): Promise<void> {
    const addBaseCampToEventFn = httpsCallable(functions, 'addBaseCampToEvent');
    await addBaseCampToEventFn({ eventId, baseCampId });
  },

  // Remove base camp from event
  async removeBaseCampFromEvent(eventId: string, baseCampId: string): Promise<void> {
    const removeBaseCampFromEventFn = httpsCallable(functions, 'removeBaseCampFromEvent');
    await removeBaseCampFromEventFn({ eventId, baseCampId });
  },
};
