/**
 * i18n Konfiguration
 * Zentrale Konfiguration für Internationalisierung
 */

export const SUPPORTED_UI_LANGUAGES = ['de', 'en'] as const;
export type UILanguage = typeof SUPPORTED_UI_LANGUAGES[number];

export const DEFAULT_LANGUAGE: UILanguage = 'de';

export const LANGUAGE_NAMES: Record<UILanguage, string> = {
  de: 'Deutsch',
  en: 'English',
};

// Für spätere Erweiterung:
// export const SUPPORTED_UI_LANGUAGES = ['de', 'en', 'fr', 'es'] as const;
