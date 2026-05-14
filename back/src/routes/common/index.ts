import { Router, Request, Response } from 'express';
import { ApiResult } from '../../apiResult';
import { ConfigService } from '../../services/configService';
import { getServerPublicKey } from '../../middleware/encryption';
import uploadRouter from './upload';

const router = Router();

/**
 * @swagger
 * /common:
 *   get:
 *     summary: 公共模块信息
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', (req: Request, res: Response) => {
  res.json(ApiResult.success({ module: 'common' }));
});

router.use('/upload', uploadRouter);

/**
 * @swagger
 * /common/time:
 *   get:
 *     summary: 获取服务器时间
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/time', (req: Request, res: Response) => {
  res.json(ApiResult.success({ time: new Date().toISOString() }));
});

/**
 * @swagger
 * /common/test-echo:
 *   get:
 *     summary: GET测试接口（定时任务调用）
 *     tags: [Common]
 *     parameters:
 *       - in: query
 *         name: param
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/test-echo', (req: Request, res: Response) => {
  res.json(ApiResult.success({
    message: '定时任务调用成功',
    timestamp: new Date().toISOString(),
    params: req.query,
    method: 'GET'
  }));
});

/**
 * @swagger
 * /common/test-echo:
 *   post:
 *     summary: POST测试接口（定时任务调用）
 *     tags: [Common]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/test-echo', (req: Request, res: Response) => {
  res.json(ApiResult.success({
    message: '定时任务调用成功',
    timestamp: new Date().toISOString(),
    body: req.body,
    method: 'POST'
  }));
});

/**
 * @swagger
 * /common/user-count:
 *   get:
 *     summary: 获取用户数量（测试用）
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/user-count', (req: Request, res: Response) => {
  res.json(ApiResult.success({
    count: Math.floor(Math.random() * 100),
    timestamp: new Date().toISOString()
  }));
});

/**
 * @swagger
 * /common/system-info:
 *   get:
 *     summary: 获取系统信息配置
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/system-info', async (req: Request, res: Response) => {
  try {
    const systemInfo = await ConfigService.getSystemInfo();
    res.json(ApiResult.success(systemInfo));
  } catch (error) {
    console.error('Failed to get system info:', error);
    res.status(500).json(ApiResult.error('Failed to get system info'));
  }
});

/**
 * @swagger
 * /common/maintenance-status:
 *   get:
 *     summary: 获取维护模式状态
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/maintenance-status', async (req: Request, res: Response) => {
  try {
    const maintenanceStatus = await ConfigService.isMaintenanceMode();
    res.json(ApiResult.success(maintenanceStatus));
  } catch (error) {
    console.error('Failed to get maintenance status:', error);
    res.status(500).json(ApiResult.error('Failed to get maintenance status'));
  }
});

/**
 * @swagger
 * /common/copyright-info:
 *   get:
 *     summary: 获取版权信息
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/copyright-info', async (req: Request, res: Response) => {
  try {
    const copyrightInfo = await ConfigService.getCopyrightInfo();
    res.json(ApiResult.success(copyrightInfo));
  } catch (error) {
    console.error('Failed to get copyright info:', error);
    res.status(500).json(ApiResult.error('Failed to get copyright info'));
  }
});

/**
 * @swagger
 * /common/git-logs:
 *   get:
 *     summary: 获取Git提交记录
 *     tags: [Common]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/git-logs', async (req: Request, res: Response) => {
  try {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!owner || !repo) {
      console.warn('GITHUB_OWNER or GITHUB_REPO not set in .env');
      return res.json(ApiResult.success([]));
    }

    const headers: HeadersInit = {};
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status} ${response.statusText}`);
    }

    const data: any[] = await response.json();

    const logs = data.map((item: any) => {
      const dateObj = new Date(item.commit.author.date);
      const formattedDate = dateObj.toISOString().replace('T', ' ').substring(0, 19);

      return {
        hash: item.sha.substring(0, 7),
        author: item.commit.author.name,
        date: formattedDate,
        message: item.commit.message
      };
    });

    return res.json(ApiResult.success(logs));

  } catch (ghError: any) {
    console.error('GitHub fetch failed:', ghError);
    return res.json(ApiResult.success([]));
  }
});

router.get('/public-key', (req: Request, res: Response) => {
  try {
    const publicKey = getServerPublicKey();
    res.json(ApiResult.success({ publicKey }));
  } catch (error) {
    console.error('[Common] Failed to get public key:', error);
    res.status(500).json(ApiResult.error('获取公钥失败'));
  }
});

export default router;
