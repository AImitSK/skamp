// src/components/icons/DnaIcon.tsx
import React from 'react';

interface DnaIconProps {
  className?: string;
}

/**
 * Doppelhelix DNA Icon - Klassischer gedrehter DNA-Strang
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
      {/* Linker DNA-Strang */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 3C6 3 10 5 12 5C14 5 18 3 18 3"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 7C18 7 14 9 12 9C10 9 6 7 6 7"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 11C6 11 10 13 12 13C14 13 18 11 18 11"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 15C18 15 14 17 12 17C10 17 6 15 6 15"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 19C6 19 10 21 12 21C14 21 18 19 18 19"
      />
      {/* Vertikale Verbindungen (Backbone) */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 3L6 7M6 11L6 15M6 19L6 21M18 3L18 7M18 11L18 15M18 19L18 21"
        strokeWidth={1}
        strokeDasharray="0"
      />
      {/* Basenpaare (horizontale Verbindungen) */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5L15 5M9 9L15 9M9 13L15 13M9 17L15 17"
        strokeWidth={1.5}
      />
    </svg>
  );
}
