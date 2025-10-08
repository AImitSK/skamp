// src/components/button.tsx
'use client'

import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import React, { forwardRef } from 'react'
import { Link } from './link'

// Wir definieren die Styling-Regeln neu mit einfachen Tailwind-Klassen
const styles = {
  // Basis-Styling, das für alle Buttons gilt
  // NEU: whitespace-nowrap hinzugefügt um Textumbruch zu verhindern
  base: 'relative inline-flex items-center justify-center gap-x-2 rounded-lg border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab] disabled:opacity-50 whitespace-nowrap',
  
  // Größe und Padding
  sizing: 'px-4 py-2',

  // Farbvarianten, jetzt mit direkten Tailwind-Klassen
  colors: {
    // Primary-Button für Hauptaktionen (Standard)
    primary: 'border-transparent bg-primary text-white hover:bg-primary-hover focus:ring-primary',
    // Secondary-Button für Aktionen in Boxen (defensiver)
    secondary: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-gray-400',
    // Zinc-Button für sekundäre Aktionen
    zinc: 'border-transparent bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-600 dark:hover:bg-zinc-500',
    // Indigo-Button für spezielle Aktionen
    indigo: 'border-transparent bg-indigo-600 text-white hover:bg-indigo-500',
    // "Plain" Variante für Abbrechen-Buttons
    plain: 'border-transparent bg-transparent text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800',
  },
}

// Typ-Definitionen für die Button-Props, jetzt vereinfacht
type ButtonProps = {
  color?: 'primary' | 'secondary' | 'zinc' | 'indigo';
  plain?: boolean;
  className?: string;
  children: React.ReactNode;
} & (
  | Omit<Headless.ButtonProps, 'as' | 'className'>
  | Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>
)

export const Button = forwardRef(function Button(
  { color, plain, className, children, ...props }: ButtonProps,
  ref: React.ForwardedRef<HTMLElement>
) {
  // Die Klassen werden jetzt einfach zusammengesetzt
  let finalClasses = clsx(
    className,
    styles.base,
    styles.sizing,
    plain ? styles.colors.plain : styles.colors[color ?? 'primary']
  )

  return 'href' in props ? (
    <Link {...props} className={finalClasses} ref={ref as React.ForwardedRef<HTMLAnchorElement>}>
      {children}
    </Link>
  ) : (
    <Headless.Button {...props} className={finalClasses} ref={ref}>
      {children}
    </Headless.Button>
  )
})

// TouchTarget bleibt unverändert
export function TouchTarget({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span
        className="absolute top-1/2 left-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 pointer-fine:hidden"
        aria-hidden="true"
      />
      {children}
    </>
  )
}