// src/app/dashboard/contacts/crm/components/shared/FlagIcon.tsx
"use client";

import { useState, useEffect, ComponentType, SVGProps } from 'react';

export interface FlagIconProps {
  countryCode?: string;
  className?: string;
}

/**
 * Flag Icon Component with Dynamic Loading
 *
 * Zeigt die Flagge eines Landes basierend auf dem ISO 3166-1 alpha-2 Code.
 * Lädt Flaggen dynamisch, um Bundle-Size zu reduzieren.
 *
 * @component
 * @example
 * ```tsx
 * <FlagIcon countryCode="DE" className="h-4 w-6" />
 * ```
 *
 * @param countryCode - ISO 3166-1 alpha-2 Ländercode (z.B. "DE", "AT", "CH")
 * @param className - Tailwind CSS Klassen für Größe und Styling
 *
 * @performance
 * - Lädt Flaggen nur bei Bedarf (Code Splitting)
 * - Reduziert Initial Bundle Size um ~500KB
 * - Cached geladene Flaggen im Browser
 */
export function FlagIcon({
  countryCode,
  className = "h-4 w-6"
}: FlagIconProps) {
  const [Flag, setFlag] = useState<ComponentType<SVGProps<SVGSVGElement>> | null>(null);

  useEffect(() => {
    if (!countryCode || countryCode.length !== 2) {
      setFlag(null);
      return;
    }

    const loadFlag = async () => {
      try {
        const code = countryCode.toUpperCase();
        // Dynamic import - only loads the specific flag needed
        const flagModule = await import(`country-flag-icons/react/3x2/${code}.js`);
        setFlag(() => flagModule.default);
      } catch (error) {
        // Flag not found - silently fail
        setFlag(null);
      }
    };

    loadFlag();
  }, [countryCode]);

  if (!Flag) return null;

  return <Flag className={className} title={countryCode} />;
}
