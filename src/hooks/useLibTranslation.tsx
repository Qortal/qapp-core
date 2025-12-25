// src/hooks/useLibTranslation.ts
import { useTranslation as useTranslationOriginal } from 'react-i18next';
import libI18n from '../i18n/i18n';

export function useLibTranslation(ns?: string | string[]) {
  return useTranslationOriginal(ns || 'lib-core', { i18n: libI18n });
}
