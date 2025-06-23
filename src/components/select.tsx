// src/components/select.tsx
'use client'

import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import { forwardRef } from 'react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'

export const Select = forwardRef(function Select(
  { className, ...props }: { className?: string } & Omit<Headless.SelectProps, 'className'>,
  ref: React.ForwardedRef<HTMLSelectElement>
) {
  return (
    <span
      data-slot="control"
      className={clsx([
        className,
        'relative block w-full',
        // Basis-Styling für den Wrapper
        'before:absolute before:inset-px before:rounded-lg before:bg-white before:shadow-sm dark:before:hidden',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset sm:focus-within:after:ring-2 sm:focus-within:after:ring-blue-500',
      ])}
    >
      <Headless.Select
        ref={ref}
        {...props}
        className={clsx([
          // KORREKTUR: Komplizierte Klassen durch einfaches Padding und Styling ersetzt
          'relative block w-full appearance-none rounded-lg border border-zinc-950/10 bg-transparent py-2 px-3',
          
          // Typografie und Farben
          'text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white dark:border-white/10 dark:bg-white/5',
          
          // Fokus-Styling
          'focus:outline-none',

          // Spezielles Padding für den Pfeil rechts
          'pr-8'
        ])}
      />
      {/* Pfeil-Icon für das Select-Feld */}
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <ChevronDownIcon className="size-5 fill-zinc-500 dark:fill-zinc-400" />
      </span>
    </span>
  )
})