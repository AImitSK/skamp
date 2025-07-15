// src/components/search-input.tsx
'use client'

import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'
import React, { forwardRef } from 'react'

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  className?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className={clsx('relative', className)}>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" aria-hidden="true" />
        </div>
        <input
          ref={ref}
          type="search"
          className={clsx(
            'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm',
            'placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            'dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-400',
            'h-10' // Fixed height to match buttons
          )}
          {...props}
        />
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'