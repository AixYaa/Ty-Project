import { Router, Request, Response } from 'express';
import { SchedulerService } from '../../services/schedulerService';
import { adminAuthMiddleware } from '../../middleware/adminAuth';
import { ApiResult } from '../../apiResult';
import { getDb } from '../../db/mongo';
import { ObjectId } from 'mongodb';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/task/runs/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { limit = 20 } = req.query;
    const runs = await SchedulerService.getTaskRuns(taskId, Number(limit));
    res.json(ApiResult.success(runs));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.post('/task/run/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const task = await db.collection('sys定时任务').findOne({ _id: new ObjectId(id) });

    if (!task) {
      return res.json(ApiResult.error('Task not found'));
    }

    SchedulerService.runTask(task as any);
    res.json(ApiResult.success({ message: 'Task triggered' }));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.post('/task/stop/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    await SchedulerService.stopTask(code);
    res.json(ApiResult.success({ message: 'Task stopped' }));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.get('/task/list', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const tasks = await db.collection('sys定时任务').find().sort({ createdAt: -1 }).toArray();
    res.json(ApiResult.success(tasks));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
