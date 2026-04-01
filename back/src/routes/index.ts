import adminRouter from './admin';
import clientRouter from './client';
import commonRouter from './common';
import healthRouter from './health';
import publicRouter from './public';
import swaggerRouter from './swagger';
import { Router } from 'express';
import { apiAuthMiddleware } from '../middleware/apiAuth';
import { maintenanceMiddleware } from '../middleware/maintenance';

export { adminRouter, clientRouter, commonRouter, healthRouter, publicRouter, swaggerRouter };

const router = Router();
router.use(maintenanceMiddleware);
router.use('/admin', adminRouter);
router.use('/client', apiAuthMiddleware, clientRouter);
router.use('/common', commonRouter);
router.use('/health', healthRouter);
router.use('/public', publicRouter);
router.use('/', swaggerRouter);

export default router;
