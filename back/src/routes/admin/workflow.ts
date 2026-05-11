import { Router, Request, Response } from 'express';
import { ApiResult } from '../../apiResult';
import { WorkflowService } from '../../services/workflowService';
import { checkPermission } from '../../middleware/requirePermission';

const router = Router();

const must = (req: Request, perms: string[]) => {
  const userPerms = req.user?.permissions || [];
  return checkPermission(userPerms, perms);
};

// 模板
router.get('/template', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:view'])) {
      return res.status(403).json(ApiResult.error('Permission denied. Required: workflow:view', 403));
    }
    const result = await WorkflowService.getTemplates(req.query as any);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.get('/template/:id', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:view'])) {
      return res.status(403).json(ApiResult.error('Permission denied. Required: workflow:view', 403));
    }
    const result = await WorkflowService.getTemplateById(req.params.id);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.post('/template', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:edit'])) {
      return res.status(403).json(ApiResult.error('Permission denied. Required: workflow:edit', 403));
    }
    const username = req.user?.username || 'system';
    const result = await WorkflowService.createTemplate(req.body, username);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.put('/template/:id', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:edit'])) {
      return res.status(403).json(ApiResult.error('Permission denied. Required: workflow:edit', 403));
    }
    const result = await WorkflowService.updateTemplate(req.params.id, req.body);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.delete('/template/:id', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:edit'])) {
      return res.status(403).json(ApiResult.error('Permission denied. Required: workflow:edit', 403));
    }
    const result = await WorkflowService.deleteTemplate(req.params.id);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

// 实例
router.get('/instance', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:view'])) {
      return res.status(403).json(ApiResult.error('Permission denied. Required: workflow:view', 403));
    }
    const result = await WorkflowService.getInstances(req.query as any);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.get('/instance/:id', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:view'])) {
      return res.status(403).json(ApiResult.error('Permission denied. Required: workflow:view', 403));
    }
    const result = await WorkflowService.getInstanceDetail(req.params.id);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.post('/instance', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:operate'])) {
      return res
        .status(403)
        .json(ApiResult.error('Permission denied. Required: workflow:operate', 403));
    }
    const username = req.user?.username || 'system';
    const result = await WorkflowService.startInstance(req.body, username);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.put('/instance/:id/terminate', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:operate'])) {
      return res
        .status(403)
        .json(ApiResult.error('Permission denied. Required: workflow:operate', 403));
    }
    const username = req.user?.username || 'system';
    const result = await WorkflowService.terminateInstance(
      req.params.id,
      username,
      String(req.body?.comment || '').trim()
    );
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

// 任务
router.get('/task', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:view'])) {
      return res.status(403).json(ApiResult.error('Permission denied. Required: workflow:view', 403));
    }
    const username = String(req.user?.username || '').trim();
    const isSuperAdmin = (req.user?.permissions || []).includes('*');
    const query = { ...(req.query as any) };
    // 非超级管理员只能查看自己的待处理任务，避免越权看他人任务
    if (!isSuperAdmin && username) {
      query.assignee = username;
    }
    const result = await WorkflowService.getTasks(query);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.put('/task/:id/handle', async (req: Request, res: Response) => {
  try {
    if (!must(req, ['workflow:operate'])) {
      return res
        .status(403)
        .json(ApiResult.error('Permission denied. Required: workflow:operate', 403));
    }
    const username = req.user?.username || 'system';
    const isSuperAdmin = (req.user?.permissions || []).includes('*');
    const action = String(req.body?.action || '').trim() as 'approve' | 'reject' | 'back';
    if (!['approve', 'reject', 'back'].includes(action)) {
      return res.json(ApiResult.error('action 必须是 approve / reject / back'));
    }
    const result = await WorkflowService.handleTask(
      req.params.id,
      action,
      username,
      req.body || {},
      isSuperAdmin
    );
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
