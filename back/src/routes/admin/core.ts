import { Router, Request, Response } from 'express';
import { GeneralService } from '../../services/generalService';
import { ApiResult } from '../../apiResult';

const router = Router();

// Middleware to ensure collection name is valid could be added here
// For now we assume the frontend sends valid names

// Get List (Pagination)
router.get('/:entity', async (req: Request, res: Response) => {
  try {
    const { entity } = req.params;
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
    await GeneralService.delete(entity, id);
    res.json(ApiResult.success(null));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
