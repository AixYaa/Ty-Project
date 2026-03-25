import { Router, Request, Response } from 'express';
import { AuditLogService } from '../../services/auditService';
import { ApiResult } from '../../apiResult';

const router = Router();

// Get audit logs list
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
