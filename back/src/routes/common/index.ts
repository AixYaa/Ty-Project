import { Router, Request, Response } from 'express';
import { ApiResult } from '../../apiResult';
import uploadRouter from './upload';
import { exec } from 'child_process';

const router = Router();

// 通用接口示例
router.get('/', (req: Request, res: Response) => {
  res.json(ApiResult.success({ module: 'common' }));
});

router.use('/upload', uploadRouter);

router.get('/time', (req: Request, res: Response) => {
  res.json(ApiResult.success({ time: new Date().toISOString() }));
});

router.get('/git-logs', (req: Request, res: Response) => {
  // Execute git log to get latest 10 commits
  // Format: short-hash|author-name|date|message
  const command = 'git log --pretty=format:"%h|%an|%ad|%s" --date=format:"%Y-%m-%d %H:%M:%S" -n 10';
  
  exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Git log error: ${error.message}`);
      // If git is not initialized or not found, return empty list instead of 500
      return res.json(ApiResult.success([]));
    }
    
    try {
      const logs = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, author, date, message] = line.split('|');
          return { hash, author, date, message };
        });
      res.json(ApiResult.success(logs));
    } catch (e: any) {
      res.json(ApiResult.error('Failed to parse git logs'));
    }
  });
});

export default router;
