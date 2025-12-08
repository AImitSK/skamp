// src/components/ui/language-flag-icon.tsx
"use client";

import * as Flags from 'country-flag-icons/react/3x2';
import { ComponentType, SVGProps } from 'react';
import { LanguageCode } from '@/types/international';

export interface LanguageFlagIconProps {
  /** ISO 639-1 Sprachcode (z.B. "de", "en", "fr") */
  languageCode: LanguageCode | string;
  /** Tailwind CSS Klassen für Größe und Styling */
  className?: string;
}

/**
 * Mapping von Sprach-Codes zu Länder-Codes für Flaggen
 *
 * Hinweis: Manche Sprachen werden in mehreren Ländern gesprochen.
 * Wir verwenden das "Haupt-Land" für die Flagge.
 */
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  de: 'DE', // Deutsch → Deutschland
  en: 'GB', // Englisch → Großbritannien
  fr: 'FR', // Französisch → Frankreich
  es: 'ES', // Spanisch → Spanien
  it: 'IT', // Italienisch → Italien
  nl: 'NL', // Niederländisch → Niederlande
  pl: 'PL', // Polnisch → Polen
  pt: 'PT', // Portugiesisch → Portugal
  cs: 'CZ', // Tschechisch → Tschechien
  da: 'DK', // Dänisch → Dänemark
  sv: 'SE', // Schwedisch → Schweden
  no: 'NO', // Norwegisch → Norwegen
  fi: 'FI', // Finnisch → Finnland
  hu: 'HU', // Ungarisch → Ungarn
  ro: 'RO', // Rumänisch → Rumänien
  bg: 'BG', // Bulgarisch → Bulgarien
  el: 'GR', // Griechisch → Griechenland
  tr: 'TR', // Türkisch → Türkei
  ru: 'RU', // Russisch → Russland
  zh: 'CN', // Chinesisch → China
  ja: 'JP', // Japanisch → Japan
  ko: 'KR', // Koreanisch → Südkorea
  ar: 'SA', // Arabisch → Saudi-Arabien
  uk: 'UA', // Ukrainisch → Ukraine
  sk: 'SK', // Slowakisch → Slowakei
  sl: 'SI', // Slowenisch → Slowenien
  hr: 'HR', // Kroatisch → Kroatien
  sr: 'RS', // Serbisch → Serbien
  et: 'EE', // Estnisch → Estland
  lv: 'LV', // Lettisch → Lettland
  lt: 'LT', // Litauisch → Litauen
  he: 'IL', // Hebräisch → Israel
  th: 'TH', // Thailändisch → Thailand
  vi: 'VN', // Vietnamesisch → Vietnam
  id: 'ID', // Indonesisch → Indonesien
  ms: 'MY', // Malaiisch → Malaysia
  hi: 'IN', // Hindi → Indien
};

/**
 * Konvertiert einen Sprach-Code in einen Länder-Code
 */
export function languageToCountryCode(languageCode: string): string | null {
  const code = languageCode.toLowerCase();
  return LANGUAGE_TO_COUNTRY[code] || null;
}

/**
 * Language Flag Icon Component
 *
 * Zeigt die Flagge eines Landes basierend auf dem Sprachcode.
 * Verwendet SVG-Flaggen aus dem country-flag-icons Package.
 *
 * @component
 * @example
 * ```tsx
 * <LanguageFlagIcon languageCode="de" className="h-3 w-5" />
 * <LanguageFlagIcon languageCode="en" />
 * ```
 */
export function LanguageFlagIcon({
  languageCode,
  className = "h-3 w-5"
}: LanguageFlagIconProps) {
  const countryCode = languageToCountryCode(languageCode);

  if (!countryCode) {
    // Fallback: Zeige einen Placeholder für unbekannte Sprachen
    return (
      <span className={`inline-flex items-center justify-center bg-gray-200 rounded ${className}`} title={languageCode}>
        <span className="text-[8px] text-gray-500 font-medium">{languageCode.toUpperCase()}</span>
      </span>
    );
  }

  const code = countryCode.toUpperCase() as keyof typeof Flags;
  const FlagComponent = Flags[code] as ComponentType<SVGProps<SVGSVGElement>> | undefined;

  if (!FlagComponent) {
    // Fallback für unbekannte Länder-Codes
    return (
      <span className={`inline-flex items-center justify-center bg-gray-200 rounded ${className}`} title={languageCode}>
        <span className="text-[8px] text-gray-500 font-medium">{languageCode.toUpperCase()}</span>
      </span>
    );
  }

  return <FlagComponent className={className} aria-label={`${languageCode} flag`} />;
}

export default LanguageFlagIcon;
