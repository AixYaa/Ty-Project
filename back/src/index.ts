import './bootstrap';
import app from './app';
import { connectMongo } from './db/mongo';
import { connectRedis } from './db/redis';
import { AuthService } from './services/authService';
import { SchedulerService } from './services/schedulerService';
import { DataInitializer } from './utils/initData';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectMongo();
    await connectRedis();

    await SchedulerService.initScheduler();

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
