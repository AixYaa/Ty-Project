import { Request, Response, NextFunction } from 'express';
import { ApiResult } from '../apiResult';

export const requirePermissions = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(ApiResult.error('Unauthorized', 401));
    }

    const userPermissions = req.user.permissions || [];

    if (userPermissions.includes('*')) {
      return next();
    }

    const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json(ApiResult.error(`Permission denied. Required: ${requiredPermissions.join(' or ')}`, 403));
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return requirePermissions(permission);
};

export const checkPermission = (userPermissions: string[], required: string | string[]): boolean => {
  if (userPermissions.includes('*')) return true;
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some(perm => userPermissions.includes(perm));
};
