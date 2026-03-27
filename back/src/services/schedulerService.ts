import { getDb } from '../db/mongo';
import { ObjectId } from 'mongodb';
import axios from 'axios';

export interface ScheduledTask {
  _id?: ObjectId;
  name: string;
  code: string;
  cronExpression: string;
  apiPath: string;
  apiMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  apiParams?: Record<string, any>;
  description?: string;
  status: number;
  lastRunTime?: Date;
  lastRunResult?: string;
  nextRunTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type TaskStatus = 'pending' | 'running' | 'success' | 'failed';

interface TaskRun {
  _id?: ObjectId;
  taskId: ObjectId;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  result?: string;
  error?: string;
  duration?: number;
}

class SchedulerService {
  private static timers: Map<string, NodeJS.Timeout> = new Map();
  private static isRunning = false;
  private static COLLECTION = 'sys定时任务';
  private static RUN_LOG_COLLECTION = 'sys定时任务运行记录';

  static parseCron(expression: string): { next: Date } | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5) return null;

    const [minute, hour, day, month, week] = parts;

    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    if (minute !== '*') {
      const m = parseInt(minute);
      next.setMinutes(m > 59 ? 0 : m);
      if (m <= now.getMinutes()) {
        next.setHours(next.getHours() + 1);
      }
    } else {
      next.setMinutes(0);
      next.setHours(next.getHours() + 1);
    }

    if (day !== '*') {
      const d = parseInt(day);
      next.setDate(d > 31 ? 1 : d);
    }
    if (month !== '*') {
      const mo = parseInt(month);
      next.setMonth((mo > 12 ? 1 : mo) - 1);
    }
    if (week !== '*') {
      // Day of week - simplified
    }

    return { next };
  }

  static async calculateNextRunTime(cronExpression: string): Promise<Date | null> {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length < 5) return null;

    const [minute, hour, day, month, week] = parts;
    const now = new Date();

    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    if (minute === '*') {
      next.setMinutes(next.getMinutes() + 1);
    } else {
      const m = parseInt(minute);
      if (m >= 0 && m <= 59) {
        if (m > next.getMinutes()) {
          next.setMinutes(m);
        } else {
          next.setMinutes(m);
          next.setHours(next.getHours() + 1);
        }
      }
    }

    if (hour !== '*') {
      const h = parseInt(hour);
      if (h >= 0 && h <= 23) {
        next.setHours(h);
        if (next.getTime() <= now.getTime()) {
          next.setDate(next.getDate() + 1);
        }
      }
    }

    if (day !== '*') {
      const d = parseInt(day);
      if (d >= 1 && d <= 31) {
        next.setDate(d);
        if (next.getTime() <= now.getTime()) {
          next.setMonth(next.getMonth() + 1);
        }
      }
    }

    if (month !== '*') {
      const mo = parseInt(month);
      if (mo >= 1 && mo <= 12) {
        next.setMonth(mo - 1);
        if (next.getTime() <= now.getTime()) {
          next.setFullYear(next.getFullYear() + 1);
        }
      }
    }

    return next;
  }

  static async initScheduler() {
    const db = getDb();
    const tasks = await db.collection<ScheduledTask>(this.COLLECTION).find({ status: 1 }).toArray();

    for (const task of tasks) {
      await this.scheduleTask(task);
    }

    console.log(`[Scheduler] Initialized ${tasks.length} scheduled tasks`);
  }

  static async scheduleTask(task: ScheduledTask) {
    const existing = this.timers.get(task.code);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(task.code);
    }

    const intervalMs = this.getIntervalFromCron(task.cronExpression);
    if (!intervalMs) {
      console.warn(`[Scheduler] Invalid cron expression: ${task.cronExpression}`);
      return;
    }

    const scheduleNext = async () => {
      const delay = intervalMs;
      const timer = setTimeout(async () => {
        await this.runTask(task);
        await this.scheduleTask(task);
      }, delay);

      this.timers.set(task.code, timer);

      const nextRun = new Date(Date.now() + delay);
      const db = getDb();
      await db.collection(this.COLLECTION).updateOne(
        { _id: task._id },
        { $set: { nextRunTime: nextRun } }
      );
    };

    await scheduleNext();
  }

  private static getIntervalFromCron(cronExpression: string): number | null {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const [minute, hour] = parts;

    const parseStep = (val: string): number | null => {
      if (val.startsWith('*/')) {
        const num = parseInt(val.replace('*/', ''));
        return Number.isNaN(num) ? null : num;
      }
      const num = parseInt(val);
      return Number.isNaN(num) ? null : num;
    };

    if (minute === '*' && hour === '*') {
      return 60 * 1000;
    }

    if (minute.startsWith('*/')) {
      const m = parseStep(minute);
      if (m && m > 0) return m * 60 * 1000;
    }

    if (hour.startsWith('*/')) {
      const h = parseStep(hour);
      if (h && h > 0) return h * 60 * 60 * 1000;
    }

    if (hour === '*' && minute !== '*') {
      const m = parseStep(minute);
      if (m && m > 0) {
        return m * 60 * 1000;
      }
    }

    if (minute !== '*' && hour !== '*') {
      const m = parseStep(minute);
      const h = parseStep(hour);
      if (m !== null && h !== null) {
        return 60 * 1000;
      }
    }

    return 60 * 1000;
  }

  static async runTask(task: ScheduledTask) {
    const db = getDb();
    const startTime = new Date();

    const runRecord: TaskRun = {
      taskId: task._id!,
      status: 'running',
      startTime
    };

    const runId = (await db.collection(this.RUN_LOG_COLLECTION).insertOne(runRecord as any)).insertedId;

    try {
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:6632';
      const path = task.apiPath.startsWith('/api') ? task.apiPath : `/api${task.apiPath.startsWith('/') ? '' : '/'}${task.apiPath}`;
      const url = `${baseUrl}${path}`;

      const config: any = {
        method: task.apiMethod,
        url,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (task.apiParams) {
        if (['POST', 'PUT', 'PATCH'].includes(task.apiMethod)) {
          config.data = task.apiParams;
        } else {
          config.params = task.apiParams;
        }
      }

      const response = await axios(config);
      const result = JSON.stringify({
        status: response.status,
        data: response.data
      }).substring(0, 500);

      await db.collection(this.RUN_LOG_COLLECTION).updateOne(
        { _id: runId },
        {
          $set: {
            status: 'success',
            endTime: new Date(),
            result,
            duration: Date.now() - startTime.getTime()
          }
        }
      );

      await db.collection(this.COLLECTION).updateOne(
        { _id: task._id },
        {
          $set: {
            lastRunTime: startTime,
            lastRunResult: 'success'
          }
        }
      );

      console.log(`[Scheduler] Task ${task.code} executed successfully`);
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      await db.collection(this.RUN_LOG_COLLECTION).updateOne(
        { _id: runId },
        {
          $set: {
            status: 'failed',
            endTime: new Date(),
            error: errorMsg.substring(0, 500),
            duration: Date.now() - startTime.getTime()
          }
        }
      );

      await db.collection(this.COLLECTION).updateOne(
        { _id: task._id },
        {
          $set: {
            lastRunTime: startTime,
            lastRunResult: 'failed: ' + errorMsg.substring(0, 200)
          }
        }
      );

      console.error(`[Scheduler] Task ${task.code} failed:`, error.message);
    }
  }

  static async stopTask(code: string) {
    const existing = this.timers.get(code);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(code);
      console.log(`[Scheduler] Task ${code} stopped`);
    }
  }

  static async deleteTask(code: string, taskId: string) {
    await this.stopTask(code);
    const db = getDb();
    await db.collection(this.COLLECTION).deleteOne({ _id: new ObjectId(taskId) });
    console.log(`[Scheduler] Task ${code} deleted`);
  }

  static async getTaskRuns(taskId: string, limit = 20) {
    const db = getDb();
    const runs = await db.collection(this.RUN_LOG_COLLECTION)
      .find({ taskId: new ObjectId(taskId) })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
    return runs;
  }
}

export { SchedulerService };
