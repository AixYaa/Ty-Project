import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiResult } from '../apiResult';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return first error message
    const msg = errors.array()[0].msg;
    return res.status(400).json(ApiResult.error(msg, 400));
  }
  next();
};
