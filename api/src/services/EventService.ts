import { v4 as uuidv4 } from "uuid";
import { Event } from "../models/Event";
//import { EventTableClient } from "../storage/TableClient";

export class EventService {
  static async create(event: Partial<Event>): Promise<Event> {
    const newEvent: Event = {
      partitionKey: "EVENT",
      rowKey: uuidv4(),
      name: event.name ?? "Untitled Event",
      description: event.description ?? "",
      startDate: event.startDate ?? new Date().toISOString(),
      endDate: event.endDate ?? "",
      location: event.location ?? "",
      createdBy: event.createdBy ?? "system",
      createdAt: new Date().toISOString(),
    };

    //await EventTableClient.createEntity(newEvent);
    return newEvent;
  }

  static async list(): Promise<Event[]> {
    const entities: Event[] = [];
    //for await (const entity of EventTableClient.listEntities<Event>()) {
    //  entities.push(entity);
   // }
    return entities;
  }

  static async getById(id: string): Promise<Event | undefined> {
    try {
      //const entity = await EventTableClient.getEntity<Event>("EVENT", id);
      //return entity;
      return null;
    } catch {
      return undefined;
    }
  }

  static async delete(id: string): Promise<void> {
    //await EventTableClient.deleteEntity("EVENT", id);
  }
}
