// src/components/icons/DnaIcon.tsx
import React from 'react';

interface DnaIconProps {
  className?: string;
}

/**
 * Doppelhelix DNA Icon
 *
 * Einheitliches Icon für alle Marken-DNA bezogenen Bereiche:
 * - Top-Navigation
 * - Bibliothek Tab-Navigation
 * - DNA-Synthese Sektion in Projekten
 */
export function DnaIcon({ className = 'h-6 w-6' }: DnaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      {/* Linke Helix-Spirale */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 3c0 3 3 4.5 6 4.5S18 6 18 3"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 9c0 3 3 4.5 6 4.5s6-1.5 6-4.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 15c0 3 3 4.5 6 4.5s6-1.5 6-4.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 21c0-3 3-4.5 6-4.5s6 1.5 6 4.5"
      />
      {/* Verbindungslinien (Basenpaare) */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5.5h6M8 11.5h8M9 17.5h6"
      />
    </svg>
  );
}
