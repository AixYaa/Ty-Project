import { Router, Request, Response } from 'express';
import { ApiLogService } from '../../services/apiLogService';
import { ApiResult } from '../../apiResult';

const router = Router();

/**
 * @swagger
 * /admin/api-log:
 *   get:
 *     summary: 获取API日志列表
 *     tags: [ApiLog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageNum
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE, PATCH]
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await ApiLogService.getLogs({
      page: req.query.pageNum || 1,
      pageSize: req.query.pageSize || 20,
      username: req.query.username,
      method: req.query.method,
      path: req.query.path,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/api-log/statistics:
 *   get:
 *     summary: 获取API日志统计
 *     tags: [ApiLog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const result = await ApiLogService.getStatistics({
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/api-log:
 *   delete:
 *     summary: 删除API日志
 *     tags: [ApiLog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要删除的日志ID数组，不传则清空所有日志
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    if (req.body && req.body.ids && Array.isArray(req.body.ids)) {
      const count = await ApiLogService.deleteLogs(req.body.ids);
      res.json(ApiResult.success({ deletedCount: count }));
    } else {
      const count = await ApiLogService.clearAllLogs();
      res.json(ApiResult.success({ deletedCount: count }));
    }
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;