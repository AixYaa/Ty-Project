import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/auditService';
import { GeneralService } from '../services/generalService';

export const auditLogMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Only log state-changing methods (POST, PUT, DELETE, PATCH)
  const targetMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  if (!targetMethods.includes(req.method)) {
    return next();
  }

  // Capture response body for POST requests to extract ID later
  let responseBody: any = null;
  if (req.method === 'POST') {
    const originalSend = res.send;
    res.send = function (body) {
      try {
        if (typeof body === 'string') {
          responseBody = JSON.parse(body);
        } else if (typeof body === 'object') {
          responseBody = body;
        }
      } catch (e) {
        // ignore parse errors
      }
      return originalSend.call(this, body);
    };
  }

  // Attempt to capture snapshot BEFORE the operation
  // We need to infer collection name and ID from the URL
  // URL Pattern: /api/admin/core/:collectionName/:id?
  // or /api/admin/sys/:entity/:id? (less standard)
  let snapshotData: any = null;
  let targetCollection = '';
  let targetId = '';

  try {
    // req.path is decoded by Express, but let's use req.originalUrl to be safe and manual split
    // req.originalUrl: /api/admin/core/sys%E7%94%A8%E6%88%B7/6985...
    const urlPath = req.originalUrl.split('?')[0]; // Remove query string
    const parts = urlPath.split('/').filter(Boolean); // e.g. ['api', 'admin', 'core', 'sys%E7...', '6985...']
    
    // Check for standard core CRUD pattern: /core/:collectionName/:id
    const coreIndex = parts.indexOf('core');
    if (coreIndex !== -1 && parts.length > coreIndex + 1) {
      targetCollection = decodeURIComponent(parts[coreIndex + 1]);
      if (parts.length > coreIndex + 2) {
        targetId = parts[coreIndex + 2];
      }
    } 
    // Check for system specific pattern if needed, but core is most general.
    // For specific sys routes like /sys/menu/:id, we might need mapping.
    else if (parts.includes('sys')) {
      // Handle /api/admin/sys/menu/:id
      const sysIndex = parts.indexOf('sys');
      if (parts.length > sysIndex + 1) {
         const entity = parts[sysIndex + 1]; // 'menu', 'role', 'user', 'entity', 'view', 'schema'
         const map: Record<string, string> = {
            'menu': 'sys菜单',
            'role': 'sys角色',
            'user': 'sys用户',
            'entity': 'sys实体',
            'view': 'sys视图',
            'schema': 'sys架构'
         };
         if (map[entity]) {
            targetCollection = map[entity];
            if (parts.length > sysIndex + 2) {
               targetId = parts[sysIndex + 2];
            }
         }
      }
    }

    // console.log(`[Audit] Analysis: method=${req.method} collection=${targetCollection} id=${targetId}`);

    // Only capture snapshot for UPDATE (PUT/PATCH) and DELETE
    // CREATE (POST) doesn't have a previous state (snapshot is null)
    if (targetCollection && targetId && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
       // Ignore batch operations for now or handle them separately
       if (targetId !== 'batch-delete') {
          // console.log(`[Audit] Fetching snapshot for ${targetCollection} ${targetId}`);
          const doc = await GeneralService.getById(targetCollection, targetId);
          if (doc) {
            snapshotData = doc;
            // console.log(`[Audit] Snapshot captured`);
          } else {
            // console.warn(`[Audit] Document not found for snapshot`);
          }
       }
    }
  } catch (err) {
    console.warn('Failed to capture audit snapshot:', err);
    // Don't block request if snapshot fails
  }

  const start = Date.now();

  // Use 'finish' event to capture the response status after it's sent
  res.on('finish', () => {
    // Try to extract documentId from response body for POST requests if missing
    if (req.method === 'POST' && !targetId && responseBody) {
      if (responseBody.data && (responseBody.data._id || responseBody.data.id)) {
        targetId = (responseBody.data._id || responseBody.data.id).toString();
      } else if (responseBody._id || responseBody.id) {
        targetId = (responseBody._id || responseBody.id).toString();
      }
    }

    // req.user is populated by adminAuthMiddleware
    if (req.user) {
      const duration = Date.now() - start;
      const { userId, username } = req.user;
      
      let paramsData = { ...req.query, ...req.body };
      const sensitiveFields = ['password', 'token', 'refreshToken', 'secret'];
      sensitiveFields.forEach(field => {
        if (paramsData[field]) paramsData[field] = '******';
      });

      const paramsStr = JSON.stringify(paramsData);
      const finalParams = paramsStr.length > 2000 
        ? paramsStr.substring(0, 2000) + '...[truncated]' 
        : paramsStr;

      const snapshotStr = snapshotData ? JSON.stringify(snapshotData) : undefined;
      const finalSnapshot = snapshotStr && snapshotStr.length > 5000 
        ? snapshotStr.substring(0, 5000) + '...[truncated]' 
        : snapshotStr;

      AuditLogService.log({
        userId,
        username,
        method: req.method,
        path: req.originalUrl,
        params: finalParams,
        snapshot: finalSnapshot,
        collectionName: targetCollection,
        documentId: targetId,
        status: res.statusCode,
        duration,
        ip: req.ip || (req.socket && req.socket.remoteAddress) || 'unknown',
        userAgent: req.get('User-Agent')
      });
    }
  });

  next();
};
