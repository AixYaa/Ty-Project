import { ObjectId } from 'mongodb';

export interface AuditLog {
  _id?: ObjectId;
  userId: string;
  username: string;
  method: string;
  path: string;
  params?: string; // stored as JSON string to accommodate various structures
  snapshot?: string; // stored as JSON string of the document BEFORE modification
  collectionName?: string; // name of the collection being modified
  documentId?: string; // ID of the document being modified
  status: number;
  duration: number; // ms
  ip: string;
  userAgent?: string;
  isRolledBack?: boolean;
  createdAt: Date;
}
