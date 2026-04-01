import { Router, Request, Response } from 'express';
import { SysService } from '../../services/sysService';
import { ApiResult } from '../../apiResult';

const router = Router();

// --- Schema Routes ---
router.post('/schema', async (req: Request, res: Response) => {
  try {
    const result = await SysService.createSchema(req.body);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.get('/schema', async (req: Request, res: Response) => {
  try {
    const result = await SysService.getSchemas(req.query);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.get('/schema/:id', async (req: Request, res: Response) => {
  try {
    const result = await SysService.getSchemaById(req.params.id);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.put('/schema/:id', async (req: Request, res: Response) => {
  try {
    const result = await SysService.updateSchema(req.params.id, req.body);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.delete('/schema/:id', async (req: Request, res: Response) => {
  try {
    await SysService.deleteSchema(req.params.id);
    res.json(ApiResult.success(null));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

// --- Menu Routes ---
router.get('/menu/tree', async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;
    const result = await SysService.getFullMenuTree(userRole);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.post('/menu', async (req: Request, res: Response) => {
  try {
    const result = await SysService.createMenu(req.body);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.get('/menu', async (req: Request, res: Response) => {
  try {
    const result = await SysService.getMenus(req.query);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.put('/menu/:id', async (req: Request, res: Response) => {
  try {
    const result = await SysService.updateMenu(req.params.id, req.body);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.post('/menu/batch-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
       res.json(ApiResult.error('ids must be a non-empty array'));
       return;
    }
    await SysService.deleteMenus(ids);
    res.json(ApiResult.success(null));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.delete('/menu/:id', async (req: Request, res: Response) => {
  try {
    await SysService.deleteMenu(req.params.id);
    res.json(ApiResult.success(null));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
