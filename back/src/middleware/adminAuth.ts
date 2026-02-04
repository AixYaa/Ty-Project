import { Request, Response, NextFunction } from 'express';
import { JwtUtils, TokenPayload } from '../utils/jwt';
import { ApiResult } from '../apiResult';

// 扩展 Request 类型以包含 user 信息
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json(ApiResult.error('No token provided', 401));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json(ApiResult.error('Token error', 401));
  }

  const token = parts[1];
  const payload = JwtUtils.verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json(ApiResult.error('Invalid or expired token', 401));
  }

  req.user = payload;
  next();
};
