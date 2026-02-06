import { Router, Request, Response } from 'express';
import { I18nService } from '../../services/i18nService';
import { ApiResult } from '../../apiResult';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await I18nService.getLocales();
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await I18nService.saveLocales(req.body);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
