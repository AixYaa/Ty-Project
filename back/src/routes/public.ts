import { Router, Request, Response } from 'express';
import { ApiResult } from '../apiResult';

const router = Router();

router.get('/test-echo', (req: Request, res: Response) => {
  res.json(ApiResult.success({
    message: '定时任务调用成功',
    timestamp: new Date().toISOString(),
    params: req.query,
    method: 'GET'
  }));
});

router.post('/test-echo', (req: Request, res: Response) => {
  res.json(ApiResult.success({
    message: '定时任务调用成功',
    timestamp: new Date().toISOString(),
    body: req.body,
    method: 'POST'
  }));
});

router.get('/user-count', (req: Request, res: Response) => {
  res.json(ApiResult.success({
    count: Math.floor(Math.random() * 100),
    timestamp: new Date().toISOString()
  }));
});

router.get('/time', (req: Request, res: Response) => {
  res.json(ApiResult.success({
    now: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }));
});

export default router;
