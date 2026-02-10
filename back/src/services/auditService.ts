import { getDb } from '../db/mongo';
import { AuditLog } from '../types/audit';
import { ObjectId } from 'mongodb';
import { GeneralService } from './generalService';

const COLLECTION_NAME = 'sys_audit_logs';

export class AuditLogService {
  /**
   * Record an audit log entry
   */
  static async log(entry: Omit<AuditLog, '_id' | 'createdAt'>) {
    try {
      const db = getDb();
      const logEntry: AuditLog = {
        ...entry,
        createdAt: new Date()
      };
      await db.collection(COLLECTION_NAME).insertOne(logEntry);
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Do not throw error to avoid affecting main business logic
    }
  }

  /**
   * Retrieve audit logs with pagination and filtering
   */
  static async getLogs(query: any = {}) {
    const db = getDb();
    const { page = 1, pageSize = 20, username, method, startDate, endDate } = query;
    const filter: any = {};

    if (username) {
      filter.username = { $regex: username, $options: 'i' };
    }
    if (method) {
      filter.method = method;
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
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit)
      .toArray();

    return { list, total, page: Number(page), pageSize: Number(pageSize) };
  }

  /**
   * Rollback an operation based on audit log ID
   */
  static async rollback(logId: string, operator: string) {
    const db = getDb();
    const log = await db.collection<AuditLog>(COLLECTION_NAME).findOne({ _id: new ObjectId(logId) });
    
    if (!log) {
      throw new Error('Audit log not found');
    }

    if (log.isRolledBack) {
      throw new Error('This operation has already been rolled back');
    }

    if (!log.snapshot && log.method !== 'POST') {
       throw new Error('No snapshot available for rollback');
    }

    if (!log.collectionName || !log.documentId) {
      throw new Error('Target collection or document ID missing in log');
    }

    // Determine rollback action
    // 1. If original was DELETE, we insert the snapshot
    // 2. If original was PUT/PATCH, we update with snapshot
    // 3. If original was POST, we delete the created document (snapshot might be null)
    
    let result;

    if (log.method === 'DELETE') {
      const snapshot = JSON.parse(log.snapshot!);
      // Ensure _id is ObjectId if needed
      if (snapshot._id && typeof snapshot._id === 'string') {
         snapshot._id = new ObjectId(snapshot._id);
      }
      await db.collection(log.collectionName).insertOne(snapshot);
      result = 'Restored deleted document';
    } 
    else if (['PUT', 'PATCH'].includes(log.method)) {
      const snapshot = JSON.parse(log.snapshot!);
      delete snapshot._id; // Don't update _id
      await GeneralService.update(log.collectionName, log.documentId, snapshot);
      result = 'Reverted updates';
    } 
    else if (log.method === 'POST') {
      await GeneralService.delete(log.collectionName, log.documentId);
      result = 'Deleted created document';
    } 
    else {
      throw new Error(`Unsupported rollback method: ${log.method}`);
    }

    // Record the rollback action itself as a new audit log
    await this.log({
      userId: 'system',
      username: operator, // The user who triggered rollback
      method: 'ROLLBACK',
      path: `/rollback/${logId}`,
      params: JSON.stringify({ originalLogId: logId }),
      status: 200,
      duration: 0,
      ip: 'internal',
      collectionName: log.collectionName,
      documentId: log.documentId
    });

    // Mark the original log as rolled back
    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(logId) },
      { $set: { isRolledBack: true } }
    );

    return { success: true, message: result };
  }

  /**
   * Sync rollback status for existing logs (Migration)
   */
  static async syncRollbackStatus() {
    const db = getDb();
    const rollbackLogs = await db.collection(COLLECTION_NAME).find({ method: 'ROLLBACK' }).toArray();
    let count = 0;
    for (const log of rollbackLogs) {
        if (log.params) {
            try {
                const params = typeof log.params === 'string' ? JSON.parse(log.params) : log.params;
                if (params.originalLogId) {
                    await db.collection(COLLECTION_NAME).updateOne(
                        { _id: new ObjectId(params.originalLogId) },
                        { $set: { isRolledBack: true } }
                    );
                    count++;
                }
            } catch (e) {
                console.warn('Failed to parse params for log:', log._id);
            }
        }
    }
    console.log(`Synced rollback status for ${count} logs.`);
  }
}
