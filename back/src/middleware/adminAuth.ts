import { Request, Response, NextFunction } from 'express';
import { JwtUtils, TokenPayload } from '../utils/jwt';
import { ApiResult } from '../apiResult';
import { getDb } from '../db/mongo';
import { ObjectId } from 'mongodb';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { permissions?: string[] };
    }
  }
}

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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

  try {
    const db = getDb();
    const user = await db.collection('sys用户').findOne({ _id: new ObjectId(payload.userId) });

    if (!user) {
      return res.status(401).json(ApiResult.error('User not found', 401));
    }

    let permissions: string[] = [];

    if (user.role) {
      const role = await db.collection('sys角色').findOne({ code: user.role });
      if (role && role.permissions) {
        permissions = role.permissions;
      }
    }

    req.user = { ...payload, permissions };
    next();
  } catch (error) {
    console.error('Error loading user permissions:', error);
    req.user = { ...payload, permissions: [] };
    next();
  }
};
