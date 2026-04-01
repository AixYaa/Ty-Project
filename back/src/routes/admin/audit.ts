import { Router, Request, Response } from 'express';
import { AuditLogService } from '../../services/auditService';
import { ApiResult } from '../../apiResult';

const router = Router();

/**
 * @swagger
 * /admin/audit:
 *   get:
 *     summary: 获取审计日志列表
 *     tags: [Audit]
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
    const result = await AuditLogService.getLogs({
      page: req.query.pageNum || 1,
      pageSize: req.query.pageSize || 20,
      username: req.query.username,
      method: req.query.method,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

// Rollback operation
/**
 * @swagger
 * /admin/audit/{id}/rollback:
 *   post:
 *     summary: 回滚审计日志操作
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 审计日志ID
 *     responses:
 *       200:
 *         description: 回滚成功
 *       401:
 *         description: 未授权
 */
router.post('/:id/rollback', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(ApiResult.error('Unauthorized'));
    }
    const result = await AuditLogService.rollback(req.params.id, req.user.username);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
