import { Router, Request, Response } from 'express';
import { AuthService } from '../../services/authService';
import { ApiResult } from '../../apiResult';
import { adminAuthMiddleware } from '../../middleware/adminAuth';
import svgCaptcha from 'svg-captcha';
import crypto from 'crypto';
import { getRedis } from '../../db/redis';
import { rateLimit } from 'express-rate-limit';
import { body } from 'express-validator';
import { validateRequest } from '../../middleware/validator';
import { ConfigService } from '../../services/configService';

const router = Router();

// Login specific rate limiter: max 10 requests per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 429,
    code: 429,
    msg: '密码尝试次数过多，请稍后再试',
    data: null
  }
});

/**
 * @swagger
 * /admin/auth/captcha:
 *   get:
 *     summary: 获取验证码
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 成功获取验证码
 */
router.get('/captcha', async (req: Request, res: Response) => {
  try {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1i',
      noise: 2,
      color: true,
      background: '#f4f4f4'
    });

    const captchaId = crypto.randomUUID();
    const redis = getRedis();
    // 验证码有效期5分钟
    await redis.set(`captcha:${captchaId}`, captcha.text.toLowerCase(), 'EX', 300);

    res.json(ApiResult.success({
      captchaId,
      image: captcha.data
    }));
  } catch (error: any) {
    res.json(ApiResult.error('Failed to generate captcha', 500));
  }
});

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
router.post('/login', [
  body('username').notEmpty().withMessage('用户名不能为空').trim().escape(),
  body('password').notEmpty().withMessage('密码不能为空').trim(),
  body('captchaId').notEmpty().withMessage('验证码ID不能为空').trim(),
  body('captchaCode').notEmpty().withMessage('验证码不能为空').trim(),
  validateRequest
], loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password, captchaId, captchaCode } = req.body;

    const redis = getRedis();
    const storedCaptcha = await redis.get(`captcha:${captchaId}`);
    
    if (!storedCaptcha) {
      res.json(ApiResult.error('验证码已过期', 400));
      return;
    }
    
    if (storedCaptcha.toLowerCase() !== captchaCode.toLowerCase()) {
      res.json(ApiResult.error('验证码错误', 400));
      return;
    }
    
    // 验证成功后删除验证码，防止重复使用
    await redis.del(`captcha:${captchaId}`);

    const result = await AuthService.login(username, password);

    // 检查维护模式，拦截非管理员的登录请求
    const maintenanceStatus = await ConfigService.isMaintenanceMode();
    if (maintenanceStatus.enabled) {
      if (result.user.role !== 'admin' && result.user.role !== 'super_admin') {
        res.status(503).json(ApiResult.error(maintenanceStatus.message || '系统正在维护中，请稍后再试...', 503));
        return;
      }
    }

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
