import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/configService';
import { JwtUtils } from '../utils/jwt';

const SKIP_PATHS = [
  '/common/maintenance-status',
  '/common/copyright-info',
  '/common/system-info',
  '/common/git-logs',
  '/common/time',
  '/common/test-echo',
  '/common/user-count',
  '/common/public-key',
  '/api-docs',
  '/swagger.json',
  '/health',
  '/auth/login',
  '/auth/register',
  '/admin/auth/login',
  '/admin/auth/register',
  '/admin/auth/captcha',
  '/admin/auth/refresh',
  '/admin/common/public-key'
];

const SKIP_PREFIXES = [
  '/public/',
  '/api/public/'
];

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;

  if (SKIP_PATHS.some(skipPath => path.startsWith(skipPath))) {
    return next();
  }

  if (SKIP_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return next();
  }

  try {
    const maintenanceStatus = await ConfigService.isMaintenanceMode();

    if (maintenanceStatus.enabled) {
      const authHeader = req.headers.authorization;
      let isAdmin = false;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = JwtUtils.verifyAccessToken(token);
        console.log('[Maintenance] Token payload:', JSON.stringify(payload));
        if (payload) {
          if (payload.role === 'admin' || payload.role === 'super_admin') {
            isAdmin = true;
          }
        }
      }

      if (!isAdmin) {
        console.log('[Maintenance] Access denied for path:', path);
        return res.status(503).json({
          status: 503,
          code: 503,
          msg: maintenanceStatus.message,
          data: null
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    next();
  }
};
