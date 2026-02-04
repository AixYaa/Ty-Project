import { Router, Request, Response } from 'express';
import { AuthService } from '../../services/authService';
import { ApiResult } from '../../apiResult';
// import { authMiddleware } from '../../middleware/auth';
import { adminAuthMiddleware } from '../../middleware/adminAuth';

const router = Router();

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
    // 刷新失败，通常意味着需要重新登录
    res.json(ApiResult.error(error.message, 401));
  }
});

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

// 开发测试用注册接口
router.post('/register', async (req: Request, res: Response) => {
  try {
    const result = await AuthService.register(req.body);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
