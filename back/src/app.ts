import express from 'express';
import cors from 'cors';
import router from './routes';

import path from 'path';

const app = express();

// Serve static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 1. 定义允许的来源 (白名单)
// 从环境变量获取，默认为空数组
const whitelist = (process.env.CORS_WHITELIST || '').split(',').filter(Boolean);
if (whitelist.length === 0) {
  // 开发环境默认值，防止配置漏掉导致无法访问
  whitelist.push('http://localhost:5173', 'http://localhost:6632');
}

// 2. 通用 API 日志中间件
app.use((req, res, next) => {
  const { method, url } = req;
  const origin = req.headers.origin;
  
  // 简单的日志格式：时间 | 方法 | URL | 来源
  const time = new Date().toISOString();
  console.log(`[API] ${time} | ${method} ${url} | Origin: ${origin || 'Same Origin/No Header'}`);
  
  next();
});

// 3. CORS 配置
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // 允许没有 origin 的请求 (如 Postman, curl, 同域请求)
    if (!origin) {
      return callback(null, true);
    }

    // 允许 localhost (任意端口) 或白名单中的来源
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (whitelist.includes(origin) || isLocalhost) {
      callback(null, true);
    } else {
      // 记录被 CORS 拦截的域名
      console.warn(`[CORS Blocked] Request from origin: ${origin} is not allowed.`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true // 允许携带 Cookie/凭证
};

app.use(cors(corsOptions));
app.use(express.json());

// 所有子路由统一挂载到 /api 下：/api/health, /api/admin, /api/client, /api/common
app.use('/api', router);

app.get('/', (req, res) => res.json({ message: 'Hello from Express + TypeScript' }));

export default app;
