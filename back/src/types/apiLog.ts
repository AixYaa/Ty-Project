import { ObjectId } from 'mongodb';

export interface ApiLog {
  _id?: ObjectId;
  method: string;
  path: string;
  query?: string;
  params?: string;
  requestBody?: string;
  responseBody?: string;
  status: number;
  duration: number;
  ip: string;
  userId?: string;
  username?: string;
  userAgent?: string;
  contentType?: string;
  error?: string;
  createdAt: Date;
}