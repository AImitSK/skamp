// src/app/dashboard/contacts/crm/components/shared/FlagIcon.tsx
"use client";

import * as Flags from 'country-flag-icons/react/3x2';
import { ComponentType, SVGProps } from 'react';

export interface FlagIconProps {
  countryCode?: string;
  className?: string;
}

/**
 * Flag Icon Component
 *
 * Zeigt die Flagge eines Landes basierend auf dem ISO 3166-1 alpha-2 Code.
 *
 * @component
 * @example
 * ```tsx
 * <FlagIcon countryCode="DE" className="h-4 w-6" />
 * ```
 *
 * @param countryCode - ISO 3166-1 alpha-2 Ländercode (z.B. "DE", "AT", "CH")
 * @param className - Tailwind CSS Klassen für Größe und Styling
 */
export function FlagIcon({
  countryCode,
  className = "h-4 w-6"
}: FlagIconProps) {
  if (!countryCode || countryCode.length !== 2) {
    return null;
  }

  const code = countryCode.toUpperCase() as keyof typeof Flags;
  const FlagComponent = Flags[code] as ComponentType<SVGProps<SVGSVGElement>> | undefined;

  if (!FlagComponent) {
    return null;
  }

  return <FlagComponent className={className} title={countryCode} aria-label={countryCode} />;
}
