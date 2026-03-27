import { getDb } from '../db/mongo';
import { ApiLog } from '../types/apiLog';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'sys_api_logs';

export class ApiLogService {
  static async log(entry: Omit<ApiLog, '_id' | 'createdAt'>) {
    try {
      const db = getDb();
      const logEntry: ApiLog = {
        ...entry,
        createdAt: new Date()
      };
      await db.collection(COLLECTION_NAME).insertOne(logEntry);
    } catch (error) {
      console.error('Failed to write API log:', error);
    }
  }

  static async getLogs(query: any = {}) {
    const db = getDb();
    const { page = 1, pageSize = 20, username, method, path, startDate, endDate, status } = query;
    const filter: any = {};

    if (username) {
      filter.username = { $regex: username, $options: 'i' };
    }
    if (method) {
      filter.method = method;
    }
    if (path) {
      filter.path = { $regex: path, $options: 'i' };
    }
    if (status) {
      filter.status = Number(status);
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const total = await db.collection(COLLECTION_NAME).countDocuments(filter);
    const list = await db.collection(COLLECTION_NAME)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return { list, total, page: Number(page), pageSize: Number(pageSize) };
  }

  static async getStatistics(query: any = {}) {
    const db = getDb();
    const { startDate, endDate } = query;
    const filter: any = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const totalRequests = await db.collection(COLLECTION_NAME).countDocuments(filter);

    const statusStats = await db.collection(COLLECTION_NAME).aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();

    const methodStats = await db.collection(COLLECTION_NAME).aggregate([
      { $match: filter },
      { $group: { _id: '$method', count: { $sum: 1 } } }
    ]).toArray();

    const pathStats = await db.collection(COLLECTION_NAME).aggregate([
      { $match: filter },
      { $group: { _id: '$path', count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray();

    const avgDuration = await db.collection(COLLECTION_NAME).aggregate([
      { $match: filter },
      { $group: { _id: null, avg: { $avg: '$duration' } } }
    ]).toArray();

    return {
      totalRequests,
      avgDuration: avgDuration[0]?.avg || 0,
      statusStats: statusStats.map(s => ({ status: s._id, count: s.count })),
      methodStats: methodStats.map(s => ({ method: s._id, count: s.count })),
      topPaths: pathStats.map(p => ({ path: p._id, count: p.count, avgDuration: Math.round(p.avgDuration) }))
    };
  }

  static async deleteLogs(ids: string[]) {
    const db = getDb();
    const objectIds = ids.map(id => new ObjectId(id));
    const result = await db.collection(COLLECTION_NAME).deleteMany({ _id: { $in: objectIds } });
    return result.deletedCount;
  }

  static async clearAllLogs() {
    const db = getDb();
    const result = await db.collection(COLLECTION_NAME).deleteMany({});
    return result.deletedCount;
  }
}