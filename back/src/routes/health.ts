import { Router, Request, Response } from 'express';
import { mongoPing } from '../db/mongo';
import { redisPing } from '../db/redis';
import { ApiResult } from '../apiResult';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const [mongoOk, redisOk] = await Promise.all([mongoPing(), redisPing()]);
  res.json(ApiResult.success({
    services: {
      mongo: mongoOk ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'disconnected'
    }
  }));
});

export default router;
