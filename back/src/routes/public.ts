import { Router, Request, Response } from 'express';
import { ApiResult } from '../apiResult';
import { getServerPublicKey } from '../middleware/encryption';

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

router.get('/public-key', (req: Request, res: Response) => {
  try {
    const publicKey = getServerPublicKey();
    res.json(ApiResult.success({ publicKey }));
  } catch (error) {
    console.error('[Public] Failed to get public key:', error);
    res.status(500).json(ApiResult.error('获取公钥失败'));
  }
});

export default router;
