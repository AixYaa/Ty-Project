import { Router, Request, Response } from 'express';
import { I18nService } from '../../services/i18nService';
import { ApiResult } from '../../apiResult';

const router = Router();

/**
 * @swagger
 * /admin/i18n:
 *   get:
 *     summary: 获取所有国际化内容
 *     tags: [I18n]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await I18nService.getLocales();
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

/**
 * @swagger
 * /admin/i18n:
 *   post:
 *     summary: 保存国际化内容
 *     tags: [I18n]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: 国际化内容对象，键为语言代码，值为翻译对象
 *     responses:
 *       200:
 *         description: 保存成功
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await I18nService.saveLocales(req.body);
    res.json(ApiResult.success(result));
  } catch (error: any) {
    res.json(ApiResult.error(error.message));
  }
});

export default router;
