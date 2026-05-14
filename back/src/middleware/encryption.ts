import { Request, Response, NextFunction } from 'express';
import {
  parseHybridEncryptedRequest,
  encryptHybridResponse,
  getPublicKey
} from '../utils/cryptoUtils';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_ENABLED = process.env.ENCRYPTION_ENABLED === 'true';
const HYBRID_MODE = process.env.ENCRYPTION_HYBRID === 'true';

export interface EncryptedRequest extends Request {
  sessionId?: string;
}

export const encryptionMiddleware = (
  req: EncryptedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!ENCRYPTION_ENABLED) {
    return next();
  }

  if (req.method === 'OPTIONS') {
    return next();
  }

  const sessionId = (req.headers['x-session-id'] as string) || 'default-session';
  req.sessionId = sessionId;

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (res.locals.skipEncryption) {
      return originalJson(body);
    }

    if (!body || body._encrypted !== undefined) {
      return originalJson(body);
    }

    try {
      if (HYBRID_MODE) {
        const encrypted = encryptHybridResponse(body, sessionId);
        if (encrypted === null) {
          return originalJson(body);
        }
        return originalJson({
          status: 200,
          code: 200,
          ...encrypted,
          _encrypted: true
        });
      } else {
        const { encryptObject } = require('../utils/cryptoUtils');
        const encrypted = encryptObject(body, process.env.ENCRYPTION_KEY || '');
        return originalJson({
          status: 200,
          code: 200,
          data: encrypted,
          _encrypted: true
        });
      }
    } catch (encryptError) {
      console.error('[Encryption] Encrypt error:', encryptError);
      return originalJson(body);
    }
  };

  const contentType = req.headers['content-type'] || '';

  if (req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }

  if (!contentType.includes('application/json')) {
    return next();
  }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!rawBody || rawBody.trim() === '') {
      return next();
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = { raw: rawBody };
    }

    if (parsedBody._encrypted && parsedBody.key && parsedBody.data) {
      try {
        if (HYBRID_MODE) {
          const decrypted = parseHybridEncryptedRequest(parsedBody, sessionId);
          if (decrypted === null) {
            return res.status(400).json({
              status: 400,
              code: 400,
              msg: '加密会话无效或已过期，请刷新页面后重试'
            });
          }
          req.body = decrypted;
        } else {
          const { decryptObject } = require('../utils/cryptoUtils');
          const decrypted = decryptObject<Record<string, any>>(parsedBody.data, process.env.ENCRYPTION_KEY || '');
          req.body = decrypted;
        }
      } catch (decryptError) {
        console.error('[Encryption] Decrypt error:', decryptError);
        return res.status(400).json({
          status: 400,
          code: 400,
          msg: '数据解密失败，请检查加密参数'
        });
      }
    } else {
      req.body = parsedBody;
    }

    next();
  } catch (error) {
    console.error('[Encryption] Middleware error:', error);
    next();
  }
};

export const skipEncryption = (req: Request) => {
  (res as any).locals = (res as any).locals || {};
  (res as any).locals.skipEncryption = true;
};

export const getServerPublicKey = (): string => {
  return getPublicKey();
};
