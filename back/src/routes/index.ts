import adminRouter from './admin';
import clientRouter from './client';
import commonRouter from './common';
import healthRouter from './health';
import { Router } from 'express';
import { apiAuthMiddleware } from '../middleware/apiAuth';

// 导出单独路由以便在 app 中按需挂载
export { adminRouter, clientRouter, commonRouter, healthRouter };

// 同时提供一个组合的默认路由（可选）
const router = Router();
router.use('/admin', adminRouter);
router.use('/client', apiAuthMiddleware, clientRouter);
router.use('/common', apiAuthMiddleware, commonRouter);
router.use('/health', healthRouter);

export default router;
