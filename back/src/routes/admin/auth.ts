import { Router, Request, Response } from 'express';
import { AuthService } from '../../services/authService';
import { ApiResult } from '../../apiResult';
import { adminAuthMiddleware } from '../../middleware/adminAuth';

const router = Router();

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 用户名或密码错误
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.json(ApiResult.error('用户名和密码不能为空', 400));
      return;
    }
    const result = await AuthService.login(username, password);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message, 401));
  }
});

/**
 * @swagger
 * /admin/auth/refresh:
 *   post:
 *     summary: 刷新Token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 刷新令牌
 *     responses:
 *       200:
 *         description: 刷新成功
 *       401:
 *         description: 刷新令牌无效或已过期
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.json(ApiResult.error('Refresh token is required', 400));
      return;
    }
    const result = await AuthService.refreshToken(refreshToken);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message, 401));
  }
});

/**
 * @swagger
 * /admin/auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 */
router.post('/logout', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user) {
      await AuthService.logout(req.user.userId);
    }
    res.json(ApiResult.success(null));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/auth/permissions:
 *   get:
 *     summary: 获取用户权限
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/permissions', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const permissions = req.user?.permissions || [];
    res.json(ApiResult.success({ permissions }));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/auth/register:
 *   post:
 *     summary: 用户注册（开发测试用）
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - name
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *               name:
 *                 type: string
 *                 description: 姓名
 *     responses:
 *       200:
 *         description: 注册成功
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password || !name) {
      res.json(ApiResult.error('用户名、密码和姓名不能为空', 400));
      return;
    }
    const result = await AuthService.register({ username, password, name } as any);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message, 400));
  }
});

export default router;
