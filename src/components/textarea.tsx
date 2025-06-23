// src/components/textarea.tsx
'use client'

import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import React, { forwardRef } from 'react'

export const Textarea = forwardRef(function Textarea(
  {
    className,
    resizable = true,
    ...props
  }: { className?: string; resizable?: boolean } & Omit<Headless.TextareaProps, 'as' | 'className'>,
  ref: React.ForwardedRef<HTMLTextAreaElement>
) {
  return (
    <span
      data-slot="control"
      className={clsx([
        className,
        'relative block w-full',
        'before:absolute before:inset-px before:rounded-lg before:bg-white before:shadow-sm dark:before:hidden',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset sm:focus-within:after:ring-2 sm:focus-within:after:ring-blue-500',
      ])}
    >
      <Headless.Textarea
        ref={ref}
        {...props}
        className={clsx([
          // KORREKTUR: Komplizierte Klassen durch einfaches Padding und Styling ersetzt
          'relative block w-full appearance-none rounded-lg border border-zinc-300 bg-white py-2 px-3',
          
          // Typografie und Farben
          'text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white dark:border-white/10 dark:bg-zinc-800',
          
          // Fokus-Styling
          'focus:outline-none focus:border-indigo-500',
          
          // Resizable-Klasse
          resizable ? 'resize-y' : 'resize-none',
        ])}
      />
    </span>
  )
})