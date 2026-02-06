import { Router, Request, Response } from 'express';
import { ApiResult } from '../../apiResult';
import uploadRouter from './upload';

const router = Router();

// 通用接口示例
router.get('/', (req: Request, res: Response) => {
  res.json(ApiResult.success({ module: 'common' }));
});

router.use('/upload', uploadRouter);

router.get('/time', (req: Request, res: Response) => {
  res.json(ApiResult.success({ time: new Date().toISOString() }));
});

export default router;
