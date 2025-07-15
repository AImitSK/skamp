// src/components/view-toggle.tsx
'use client'

import * as Headless from '@headlessui/react'
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'

export type ViewMode = 'grid' | 'list'

interface ViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <Headless.RadioGroup
      value={value}
      onChange={onChange}
      className={clsx('inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800', className)}
    >
      <Headless.RadioGroupOption
        value="list"
        className={({ checked }) =>
          clsx(
            'group relative flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all focus:outline-none',
            checked
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          )
        }
      >
        <ListBulletIcon className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </Headless.RadioGroupOption>
      
      <Headless.RadioGroupOption
        value="grid"
        className={({ checked }) =>
          clsx(
            'group relative flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all focus:outline-none',
            checked
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          )
        }
      >
        <Squares2X2Icon className="h-4 w-4" />
        <span className="sr-only">Grid view</span>
      </Headless.RadioGroupOption>
    </Headless.RadioGroup>
  )
}