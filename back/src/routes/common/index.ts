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

router.get('/git-logs', async (req: Request, res: Response) => {
  try {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    
    if (!owner || !repo) {
      console.warn('GITHUB_OWNER or GITHUB_REPO not set in .env');
      return res.json(ApiResult.success([]));
    }

    // Fetch commits from GitHub
    // Note: Using native fetch (Node 18+)
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
      // GitHub date is ISO string (e.g. 2023-10-27T10:00:00Z)
      // We format it to match local git log format: YYYY-MM-DD HH:mm:ss
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

export default router;
