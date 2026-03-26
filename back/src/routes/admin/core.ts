import { Router, Request, Response } from 'express';
import { GeneralService } from '../../services/generalService';
import { ApiResult } from '../../apiResult';
import { checkPermission } from '../../middleware/requirePermission';

const router = Router();

const ENTITY_PERMISSION_MAP: Record<string, { view?: string; edit?: string; delete?: string }> = {
  'sys用户': { view: 'user:view', edit: 'user:edit', delete: 'user:edit' },
  'sys角色': { view: 'role:view', edit: 'role:edit', delete: 'role:edit' },
  'sys权限': { view: 'permission:view', edit: 'permission:edit', delete: 'permission:edit' },
  'sys菜单': { view: 'menu:view', edit: 'menu:edit', delete: 'menu:edit' },
  'sys架构': { view: 'schema:view', edit: 'schema:edit', delete: 'schema:edit' },
  'sys实体': { view: 'entity:view', edit: 'entity:edit', delete: 'entity:edit' },
  'sys视图': { view: 'entity:view', edit: 'entity:edit', delete: 'entity:edit' },
  'sys审计日志': { view: 'audit:view', delete: 'audit:rollback' },
  'sys国际化': { view: 'i18n:view', edit: 'i18n:edit', delete: 'i18n:edit' }
};

const getEntityPermission = (entity: string, action: 'view' | 'edit' | 'delete') => {
  const perms = ENTITY_PERMISSION_MAP[entity];
  return perms ? perms[action] : null;
};

// Get List (Pagination)
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

// Create
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
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

// Update
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
    const result = await GeneralService.update(entity, id, req.body);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

// Batch Delete
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
    await GeneralService.batchDelete(entity, ids);
    res.json(ApiResult.success(null));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

// Delete
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
    await GeneralService.delete(entity, id);
    res.json(ApiResult.success(null));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
