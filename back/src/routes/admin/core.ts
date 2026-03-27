import { Router, Request, Response } from 'express';
import { GeneralService } from '../../services/generalService';
import { SchedulerService } from '../../services/schedulerService';
import { ApiResult } from '../../apiResult';
import { checkPermission } from '../../middleware/requirePermission';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: number
 *         code:
 *           type: number
 *         msg:
 *           type: string
 *         data:
 *           type: object
 */

const ENTITY_PERMISSION_MAP: Record<string, { view?: string; edit?: string; delete?: string }> = {
  'sys用户': { view: 'user:view', edit: 'user:edit', delete: 'user:edit' },
  'sys角色': { view: 'role:view', edit: 'role:edit', delete: 'role:edit' },
  'sys权限': { view: 'permission:view', edit: 'permission:edit', delete: 'permission:edit' },
  'sys菜单': { view: 'menu:view', edit: 'menu:edit', delete: 'menu:edit' },
  'sys架构': { view: 'schema:view', edit: 'schema:edit', delete: 'schema:edit' },
  'sys实体': { view: 'entity:view', edit: 'entity:edit', delete: 'entity:edit' },
  'sys视图': { view: 'entity:view', edit: 'entity:edit', delete: 'entity:edit' },
  'sys审计日志': { view: 'audit:view', delete: 'audit:rollback' },
  'sys国际化': { view: 'i18n:view', edit: 'i18n:edit', delete: 'i18n:edit' },
  'sys定时任务': { view: 'scheduler:view', edit: 'scheduler:edit', delete: 'scheduler:delete' },
  'sys系统配置': { view: 'system:view', edit: 'system:edit', delete: 'system:edit' }
};

const getEntityPermission = (entity: string, action: 'view' | 'edit' | 'delete') => {
  const perms = ENTITY_PERMISSION_MAP[entity];
  return perms ? perms[action] : null;
};

/**
 * @swagger
 * /admin/{entity}:
 *   get:
 *     summary: 获取实体列表（分页）
 *     tags: [CRUD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *         description: 实体名称 (sys用户, sys角色, etc.)
 *       - in: query
 *         name: pageNum
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:entity', async (req: Request, res: Response) => {
  try {
    const { entity } = req.params;
    const requiredPerm = getEntityPermission(entity, 'view');
    if (requiredPerm) {
      const userPermissions = req.user?.permissions || [];
      if (!checkPermission(userPermissions, requiredPerm)) {
        return res.status(403).json(ApiResult.error(`Permission denied. Required: ${requiredPerm}`, 403));
      }
    }
    const { pageNum = 1, pageSize = 10, ...query } = req.query;
    const result = await GeneralService.getList(
      entity,
      query,
      Number(pageNum),
      Number(pageSize)
    );
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/{entity}:
 *   post:
 *     summary: 创建实体
 *     tags: [CRUD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/:entity', async (req: Request, res: Response) => {
  try {
    const { entity } = req.params;
    const requiredPerm = getEntityPermission(entity, 'edit');
    if (requiredPerm) {
      const userPermissions = req.user?.permissions || [];
      if (!checkPermission(userPermissions, requiredPerm)) {
        return res.status(403).json(ApiResult.error(`Permission denied. Required: ${requiredPerm}`, 403));
      }
    }
    const result = await GeneralService.create(entity, req.body);
    if (entity === 'sys定时任务') {
      if (result.status === 1 && result.cronExpression) {
        await SchedulerService.scheduleTask(result);
      }
    }
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/{entity}/{id}:
 *   put:
 *     summary: 更新实体
 *     tags: [CRUD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:entity/:id', async (req: Request, res: Response) => {
  try {
    const { entity, id } = req.params;
    const requiredPerm = getEntityPermission(entity, 'edit');
    if (requiredPerm) {
      const userPermissions = req.user?.permissions || [];
      if (!checkPermission(userPermissions, requiredPerm)) {
        return res.status(403).json(ApiResult.error(`Permission denied. Required: ${requiredPerm}`, 403));
      }
    }
    const result = await GeneralService.update(entity, id, req.body) as any;
    if (entity === 'sys定时任务') {
      if (result && result.status === 1 && result.cronExpression) {
        await SchedulerService.scheduleTask(result);
      } else if (result && result.code) {
        await SchedulerService.stopTask(result.code);
      }
    }
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/{entity}/batch-delete:
 *   post:
 *     summary: 批量删除实体
 *     tags: [CRUD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.post('/:entity/batch-delete', async (req: Request, res: Response) => {
  try {
    const { entity } = req.params;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.json(ApiResult.error('ids must be a non-empty array'));
      return;
    }
    const requiredPerm = getEntityPermission(entity, 'delete');
    if (requiredPerm) {
      const userPermissions = req.user?.permissions || [];
      if (!checkPermission(userPermissions, requiredPerm)) {
        return res.status(403).json(ApiResult.error(`Permission denied. Required: ${requiredPerm}`, 403));
      }
    }
    if (entity === 'sys定时任务') {
      const tasks = await Promise.all(ids.map((taskId: string) => GeneralService.getById(entity, taskId)));
      for (const task of tasks) {
        if (task?.code) {
          await SchedulerService.stopTask(task.code);
        }
      }
    }
    await GeneralService.batchDelete(entity, ids);
    res.json(ApiResult.success(null));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/{entity}/{id}:
 *   delete:
 *     summary: 删除实体
 *     tags: [CRUD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:entity/:id', async (req: Request, res: Response) => {
  try {
    const { entity, id } = req.params;
    const requiredPerm = getEntityPermission(entity, 'delete');
    if (requiredPerm) {
      const userPermissions = req.user?.permissions || [];
      if (!checkPermission(userPermissions, requiredPerm)) {
        return res.status(403).json(ApiResult.error(`Permission denied. Required: ${requiredPerm}`, 403));
      }
    }
    if (entity === 'sys定时任务') {
      const task = await GeneralService.getById(entity, id);
      if (task?.code) {
        await SchedulerService.stopTask(task.code);
      }
    }
    await GeneralService.delete(entity, id);
    res.json(ApiResult.success(null));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
