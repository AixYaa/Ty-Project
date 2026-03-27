import { Router, Request, Response } from 'express';
import { SchedulerService } from '../../services/schedulerService';
import { adminAuthMiddleware } from '../../middleware/adminAuth';
import { ApiResult } from '../../apiResult';
import { getDb } from '../../db/mongo';
import { ObjectId } from 'mongodb';

const router = Router();

router.use(adminAuthMiddleware);

/**
 * @swagger
 * /admin/scheduler/task/runs/{taskId}:
 *   get:
 *     summary: 获取定时任务执行记录
 *     tags: [Scheduler]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功
 */
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

/**
 * @swagger
 * /admin/scheduler/task/run/{id}:
 *   post:
 *     summary: 手动触发定时任务
 *     tags: [Scheduler]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 任务已触发
 */
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

/**
 * @swagger
 * /admin/scheduler/task/stop/{code}:
 *   post:
 *     summary: 停止定时任务
 *     tags: [Scheduler]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 任务已停止
 */
router.post('/task/stop/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    await SchedulerService.stopTask(code);
    res.json(ApiResult.success({ message: 'Task stopped' }));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/scheduler/task/list:
 *   get:
 *     summary: 获取所有定时任务
 *     tags: [Scheduler]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 */
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
