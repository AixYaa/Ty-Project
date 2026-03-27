import { Router, Request, Response } from 'express';
import { ApiLogService } from '../../services/apiLogService';
import { ApiResult } from '../../apiResult';

const router = Router();

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