import adminRouter from './admin';
import clientRouter from './client';
import commonRouter from './common';
import healthRouter from './health';
import publicRouter from './public';
import { Router } from 'express';
import { apiAuthMiddleware } from '../middleware/apiAuth';

export { adminRouter, clientRouter, commonRouter, healthRouter, publicRouter };

const router = Router();
router.use('/admin', adminRouter);
router.use('/client', apiAuthMiddleware, clientRouter);
router.use('/common', apiAuthMiddleware, commonRouter);
router.use('/health', healthRouter);
router.use('/public', publicRouter);

export default router;
