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
    
    // 初始化超级管理员
    // await AuthService.initSuperAdmin();
    
    // 初始化测试数据 (Schema & Menu)
    await DataInitializer.initTestSchemaAndMenu();
    
    // 初始化系统管理页面架构
    await DataInitializer.initSysManagementSchemas();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
