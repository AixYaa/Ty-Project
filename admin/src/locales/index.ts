import { createI18n } from 'vue-i18n';

const i18n = createI18n({
  legacy: false, // use Composition API
  locale: localStorage.getItem('language') || 'zh-CN', // default locale
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': {},
    'en-US': {}
  }
});

export const loadLocaleMessages = async (locale: string) => {
  try {
    const res = await fetch(`/locales/${locale}.json`);
    const messages = await res.json();
    i18n.global.setLocaleMessage(locale, messages);
    return nextTick(); // Wait for Vue to react
  } catch (e) {
    console.error(`Failed to load locale: ${locale}`, e);
  }
};

import { nextTick } from 'vue';

export default i18n;
