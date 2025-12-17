import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';
import { storage } from '@/lib/storage';

const resources = {
  en: {
    popup: en.popup,
    options: {
      ...en.options
    }
  },
  zh: {
    popup: zh.popup,
    options: {
      ...zh.options
    }
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default, will be updated asynchronously
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Load language from storage
storage.getSettings().then((settings) => {
  if (settings.locale) {
    i18n.changeLanguage(settings.locale);
  }
});

// Listen to changes
storage.onChange((settings) => {
  if (settings.locale) {
    i18n.changeLanguage(settings.locale);
  }
});

export default i18n;
