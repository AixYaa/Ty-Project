import { Request, Response, NextFunction } from 'express';
import { ApiLogService } from '../services/apiLogService';

export const apiLogMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, path, query, params, headers } = req;

  let requestBody: string | undefined;
  let responseBody: any;
  let error: string | undefined;

  const contentType = headers['content-type'] || '';
  const userAgent = headers['user-agent'];
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const originalSend = res.send;
    res.send = function (body) {
      try {
        if (typeof body === 'string') {
          responseBody = body;
        } else if (typeof body === 'object') {
          responseBody = JSON.stringify(body);
        }
      } catch (e) {
        responseBody = String(body);
      }
      return originalSend.call(this, body);
    };
  }

  res.on('finish', () => {
    const duration = Date.now() - start;

    try {
      if (req.body && Object.keys(req.body).length > 0) {
        requestBody = JSON.stringify(req.body);
      }
    } catch (e) {
      requestBody = String(req.body);
    }

    if (res.statusCode >= 400 && res.statusCode < 600) {
      try {
        const responseData = responseBody ? JSON.parse(responseBody) : null;
        error = responseData?.msg || responseData?.message || `HTTP ${res.statusCode}`;
      } catch (e) {
        error = `HTTP ${res.statusCode}`;
      }
    }

    const logEntry = {
      method,
      path,
      query: query ? JSON.stringify(query) : undefined,
      params: Object.keys(params || {}).length > 0 ? JSON.stringify(params) : undefined,
      requestBody,
      responseBody: responseBody ? (responseBody.length > 5000 ? responseBody.substring(0, 5000) + '...[truncated]' : responseBody) : undefined,
      status: res.statusCode,
      duration,
      ip,
      userId: req.user?.userId,
      username: req.user?.username,
      userAgent,
      contentType,
      error
    };

    ApiLogService.log(logEntry).catch(err => {
      console.error('Failed to write API log:', err);
    });
  });

  next();
};