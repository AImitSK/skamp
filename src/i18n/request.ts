/**
 * next-intl Server-Konfiguration
 * Wird für Server Components verwendet
 *
 * Liest die Sprache aus dem NEXT_LOCALE Cookie (gesetzt in Settings-Seite)
 */

import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LANGUAGE, SUPPORTED_UI_LANGUAGES, UILanguage } from '@/config/i18n';

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export default getRequestConfig(async () => {
  // Cookie lesen (gesetzt von Settings-Seite)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  // Validieren dass es eine unterstützte Sprache ist
  let locale: UILanguage = DEFAULT_LANGUAGE;
  if (localeCookie && SUPPORTED_UI_LANGUAGES.includes(localeCookie as UILanguage)) {
    locale = localeCookie as UILanguage;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
