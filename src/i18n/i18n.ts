import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import compiled from './compiled-i18n.json';

export const supportedLanguages = compiled.supportedLanguages;

const libI18n = createInstance(); // ✅ this avoids conflict with consumer app

libI18n.use(initReactI18next).init({
  resources: compiled.resources,
  supportedLngs: compiled.supportedLanguages,
  fallbackLng: 'en',
  lng: typeof navigator !== 'undefined' ? navigator.language : 'en',
  defaultNS: 'lib-core',
  ns: ['lib-core'],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  debug: false,
});

export default libI18n;
