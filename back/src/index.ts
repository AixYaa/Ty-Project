import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectMongo } from './db/mongo';
import { connectRedis } from './db/redis';
import { AuthService } from './services/authService';
import { DataInitializer } from './utils/initData';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectMongo();
    await connectRedis();
    
    // 初始化默认用户 admin password123 初始化测试数据 初始化系统管理页面架构 初始化默认角色
    await AuthService.initSuperAdmin();
    await DataInitializer.initTestSchemaAndMenu();
    await DataInitializer.initSysManagementSchemas();
    await DataInitializer.initDefaultRoles();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
