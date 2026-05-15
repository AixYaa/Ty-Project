import { getDb } from '../db/mongo';

const COLLECTION_NAME = 'sys系统配置';

export class ConfigService {
  static async getByKey(key: string): Promise<string | null> {
    const db = getDb();
    const config = await db.collection(COLLECTION_NAME).findOne({ key });
    return config?.value || null;
  }

  static async getByKeys(keys: string[]): Promise<Record<string, string | null>> {
    const db = getDb();
    const configs = await db.collection(COLLECTION_NAME)
      .find({ key: { $in: keys } })
      .toArray();
    const result: Record<string, string | null> = {};
    for (const key of keys) {
      const config = configs.find(c => c.key === key);
      result[key] = config?.value || null;
    }
    return result;
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

  static async getSystemInfo(): Promise<{
    systemName: string;
    systemVersion: string;
    systemDescription: string;
    defaultLanguage: string;
    timezone: string;
    systemLogo: string;
  }> {
    const configs = await this.getByKeys([
      'system_name',
      'system_version',
      'system_description',
      'default_language',
      'timezone',
      'system_logo'
    ]);
    return {
      systemName: configs['system_name'] || 'AixProject',
      systemVersion: configs['system_version'] || '1.0.0',
      systemDescription: configs['system_description'] || '',
      defaultLanguage: configs['default_language'] || 'zh-CN',
      timezone: configs['timezone'] || 'Asia/Shanghai',
      systemLogo: configs['system_logo'] || ''
    };
  }

  static async isMaintenanceMode(): Promise<{ enabled: boolean; message: string }> {
    const configs = await this.getByKeys(['maintenance_mode', 'maintenance_message']);
    return {
      enabled: configs['maintenance_mode'] === 'true',
      message: configs['maintenance_message'] || '系统正在维护中，请稍后再试...'
    };
  }

  static async getCopyrightInfo(): Promise<{
    copyright: string;
    icpLicense: string;
  }> {
    const configs = await this.getByKeys(['copyright', 'icp_license']);
    return {
      copyright: configs['copyright'] || '© 2024 AixProject. All rights reserved.',
      icpLicense: configs['icp_license'] || ''
    };
  }
}
