export interface Event {
  partitionKey: string;     // usually "EVENT"
  rowKey: string;           // unique ID (e.g. UUID)
  name: string;
  description?: string;
  startDate: string;        // ISO 8601 format
  endDate?: string;
  location?: string;
  createdBy: string;
  createdAt: string;        // ISO 8601
  [key: string]: any;       // Allow extensions
}
