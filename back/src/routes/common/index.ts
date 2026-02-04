import { Router, Request, Response } from 'express';
import { ApiResult } from '../../apiResult';

const router = Router();

// 通用接口示例
router.get('/', (req: Request, res: Response) => {
  res.json(ApiResult.success({ module: 'common' }));
});

router.get('/time', (req: Request, res: Response) => {
  res.json(ApiResult.success({ time: new Date().toISOString() }));
});

export default router;
