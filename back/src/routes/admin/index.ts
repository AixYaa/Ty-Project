import { Router, Request, Response } from 'express';
import { ApiResult } from '../../apiResult';
import sysRouter from './sys';
import authRouter from './auth';
import coreRouter from './core';
import i18nRouter from './i18n';
import { adminAuthMiddleware } from '../../middleware/adminAuth';

const router = Router();

// 注册认证路由 (登录/注册/刷新)
router.use('/auth', authRouter);

// 注册系统管理路由 (需鉴权)
router.use('/sys', adminAuthMiddleware, sysRouter);
router.use('/i18n', adminAuthMiddleware, i18nRouter);

// 注册通用 CRUD 路由 (需鉴权)
// 路径格式: /api/admin/core/:entityName
router.use('/core', adminAuthMiddleware, coreRouter);

// 管理平台接口示例
router.get('/', (req: Request, res: Response) => {
  res.json(ApiResult.success({ module: 'admin' }));
});

router.get('/users', (req: Request, res: Response) => {
  res.json(ApiResult.success({ users: [] }));
});

export default router;
