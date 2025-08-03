// src/components/input.tsx
'use client'

import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import React, { forwardRef } from 'react'

export function InputGroup({ children }: React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      data-slot="control"
      className={clsx(
        'relative isolate block',
        // Diese Klassen sorgen dafür, dass Platz für ein Icon links oder rechts gemacht wird
        'has-[[data-slot=icon]:first-child]:[&_input]:pl-10 sm:has-[[data-slot=icon]:first-child]:[&_input]:pl-8',
        '*:data-[slot=icon]:pointer-events-none *:data-[slot=icon]:absolute *:data-[slot=icon]:top-1/2 *:data-[slot=icon]:-translate-y-1/2 *:data-[slot=icon]:z-10 *:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:size-4',
        '[&>[data-slot=icon]:first-child]:left-3 sm:[&>[data-slot=icon]:first-child]:left-2.5',
        '*:data-[slot=icon]:text-zinc-500 dark:*:data-[slot=icon]:text-zinc-400'
      )}
    >
      {children}
    </span>
  )
}

const dateTypes = ['date', 'datetime-local', 'month', 'time', 'week']
type DateType = (typeof dateTypes)[number]

export const Input = forwardRef(function Input(
  {
    className,
    ...props
  }: {
    className?: string
    type?: 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url' | DateType
  } & Omit<Headless.InputProps, 'as' | 'className'>,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  return (
    // Der äußere Wrapper bleibt größtenteils unverändert für den Fokus-Ring etc.
    <span
      data-slot="control"
      className={clsx([
        className,
        'relative block w-full',
        'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm',
        'dark:before:hidden',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset sm:focus-within:after:ring-2 sm:focus-within:after:ring-blue-500',
        'has-data-disabled:opacity-50',
      ])}
    >
      <Headless.Input
        ref={ref}
        {...props}
        className={clsx([
          // HIER IST DIE KORREKTUR:
          // Wir ersetzen die komplizierten `calc(var(--spacing...))` Klassen
          // durch einfache, verständliche Tailwind-Klassen für Padding.
          'relative block w-full appearance-none rounded-lg px-3 py-2',
          
          // Der Rest der Klassen ist meist Standard und sollte funktionieren
          'text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white',
          'border border-zinc-950/10 data-hover:border-zinc-950/20 dark:border-white/10 dark:data-hover:border-white/20',
          'bg-white/95 dark:bg-white/5',
          'focus:outline-none',
          'data-invalid:border-red-500 dark:data-invalid:border-red-500',
          'data-disabled:border-zinc-950/20 dark:data-disabled:border-white/15',
        ])}
      />
    </span>
  )
})