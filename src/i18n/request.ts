/**
 * next-intl Server-Konfiguration
 * Wird für Server Components verwendet
 */

import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LANGUAGE, UILanguage } from '@/config/i18n';

export default getRequestConfig(async () => {
  // TODO: Locale aus User-Preferences oder Cookie lesen
  // Für jetzt: Default-Sprache verwenden
  const locale: UILanguage = DEFAULT_LANGUAGE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
