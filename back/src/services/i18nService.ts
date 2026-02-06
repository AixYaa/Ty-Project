import fs from 'fs';
import path from 'path';

const FILES = {
  'en-US': 'en-US.json',
  'zh-CN': 'zh-CN.json'
};

export class I18nService {
  private static flatten(obj: any, prefix = '', res: any = {}) {
    for (const key in obj) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        this.flatten(value, newKey, res);
      } else {
        res[newKey] = value;
      }
    }
    return res;
  }

  private static unflatten(data: any) {
    const result: any = {};
    for (const i in data) {
      const keys = i.split('.');
      keys.reduce((r, e, j) => {
        return r[e] || (r[e] = keys.length - 1 === j ? data[i] : {});
      }, result);
    }
    return result;
  }

  static getLocalesDir() {
    // Strategy 1: Relative to __dirname (Source layout)
    // D:\Hx\AixProject\back\src\services -> ../../../ -> D:\Hx\AixProject
    // Target: D:\Hx\AixProject\admin\public\locales
    let dir = path.resolve(__dirname, '../../../admin/public/locales');
    
    if (fs.existsSync(dir)) return dir;

    // Strategy 2: Relative to process.cwd() (Project root layout)
    // Assuming CWD is D:\Hx\AixProject\back
    dir = path.resolve(process.cwd(), '../admin/public/locales');
    if (fs.existsSync(dir)) return dir;

    // Strategy 3: Try to find common parent 'AixProject'
    // This is a desperate fallback
    const root = process.cwd().split('back')[0]; // D:\Hx\AixProject\
    if (root) {
      dir = path.join(root, 'admin/public/locales');
      if (fs.existsSync(dir)) return dir;
    }

    console.error('Could not find locales directory. Checked:', [
        path.resolve(__dirname, '../../../admin/public/locales'),
        path.resolve(process.cwd(), '../admin/public/locales')
    ]);
    return dir; // Return the most likely one to generate a useful error
  }

  static async getLocales() {
    const localesDir = this.getLocalesDir();
    const enPath = path.join(localesDir, FILES['en-US']);
    const zhPath = path.join(localesDir, FILES['zh-CN']);

    console.log('--- I18n Debug ---');
    console.log('Locales Dir:', localesDir);
    console.log('En Path:', enPath);

    if (!fs.existsSync(enPath)) {
        throw new Error(`Locale file not found: ${enPath}`);
    }

    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));

    const enFlat = this.flatten(enContent);
    const zhFlat = this.flatten(zhContent);

    const keys = new Set([...Object.keys(enFlat), ...Object.keys(zhFlat)]);
    const result: any[] = [];

    keys.forEach(key => {
      result.push({
        key,
        'en-US': enFlat[key] || '',
        'zh-CN': zhFlat[key] || ''
      });
    });

    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  static async saveLocales(items: any[]) {
    const localesDir = this.getLocalesDir();
    const enFlat: any = {};
    const zhFlat: any = {};

    items.forEach(item => {
      if (item.key) {
        enFlat[item.key] = item['en-US'];
        zhFlat[item.key] = item['zh-CN'];
      }
    });

    const enObj = this.unflatten(enFlat);
    const zhObj = this.unflatten(zhFlat);

    fs.writeFileSync(path.join(localesDir, FILES['en-US']), JSON.stringify(enObj, null, 2));
    fs.writeFileSync(path.join(localesDir, FILES['zh-CN']), JSON.stringify(zhObj, null, 2));

    return { success: true };
  }
}
