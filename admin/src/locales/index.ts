import { createI18n } from 'vue-i18n';
import zhCN from './zh-CN';
import enUS from './en-US';

const i18n = createI18n({
  legacy: false, // use Composition API
  locale: localStorage.getItem('language') || 'zh-CN', // default locale
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
});

export default i18n;
