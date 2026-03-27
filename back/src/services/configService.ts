import { getDb } from '../db/mongo';

const COLLECTION_NAME = 'sys系统配置';

export class ConfigService {
  static async getByKey(key: string): Promise<string | null> {
    const db = getDb();
    const config = await db.collection(COLLECTION_NAME).findOne({ key });
    return config?.value || null;
  }

  static async setByKey(key: string, value: string): Promise<void> {
    const db = getDb();
    await db.collection(COLLECTION_NAME).updateOne(
      { key },
      { $set: { value, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  static async isSwaggerEnabled(): Promise<boolean> {
    const value = await this.getByKey('enable_swagger');
    return value === 'true';
  }
}
