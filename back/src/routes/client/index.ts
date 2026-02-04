import { Router, Request, Response } from 'express';
import { ApiResult } from '../../apiResult';

const router = Router();

// 客户端接口示例
router.get('/', (req: Request, res: Response) => {
  res.json(ApiResult.success({ module: 'client' }));
});

router.get('/info', (req: Request, res: Response) => {
  res.json(ApiResult.success({ version: '1.0.0' }));
});

export default router;
