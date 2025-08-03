// src/components/checkbox.tsx
import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import type React from 'react'

export function CheckboxGroup({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      data-slot="control"
      {...props}
      className={clsx(
        className,
        'space-y-3',
        'has-data-[slot=description]:space-y-6 has-data-[slot=description]:**:data-[slot=label]:font-medium'
      )}
    />
  )
}

export function CheckboxField({
  className,
  ...props
}: { className?: string } & Omit<Headless.FieldProps, 'as' | 'className'>) {
  return (
    <Headless.Field
      data-slot="field"
      {...props}
      className={clsx(
        className,
        'grid grid-cols-[1.125rem_1fr] gap-x-4 gap-y-1 sm:grid-cols-[1rem_1fr]',
        '*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:mt-0.75 sm:*:data-[slot=control]:mt-1',
        '*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
        '*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
        'has-data-[slot=description]:**:data-[slot=label]:font-medium'
      )}
    />
  )
}

// Vereinfachte Checkbox-Komponente
export function Checkbox({
  className,
  indeterminate = false,
  ...props
}: {
  className?: string
  indeterminate?: boolean
} & Omit<Headless.CheckboxProps, 'as' | 'className' | 'indeterminate'>) {
  return (
    <Headless.Checkbox
      data-slot="control"
      {...props}
      indeterminate={indeterminate}
      className={clsx(className, 'group inline-flex cursor-pointer focus:outline-none')}
    >
      <span className={clsx(
        // Basis-Layout
        'relative flex h-5 w-5 items-center justify-center rounded',
        // Border und Background
        'border border-gray-300 bg-white',
        // Hover-Effekt
        'group-hover:border-gray-400',
        // Focus-Ring
        'group-focus-visible:ring-2 group-focus-visible:ring-[#0660ab] group-focus-visible:ring-offset-2',
        // Checked State
        'group-data-[checked]:border-[#dedc00] group-data-[checked]:bg-[#dedc00]',
        // Indeterminate State
        'group-data-[indeterminate]:border-[#dedc00] group-data-[indeterminate]:bg-[#dedc00]',
        // Disabled State
        'group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-50',
        // Dark Mode
        'dark:border-gray-600 dark:bg-gray-800',
        'dark:group-hover:border-gray-500',
        'dark:group-data-[checked]:border-[#dedc00] dark:group-data-[checked]:bg-[#dedc00]',
        'dark:group-data-[indeterminate]:border-[#dedc00] dark:group-data-[indeterminate]:bg-[#dedc00]'
      )}>
        <svg
          className="h-3.5 w-3.5 text-white opacity-0 group-data-[checked]:opacity-100 group-data-[indeterminate]:opacity-100"
          viewBox="0 0 14 14"
          fill="none"
        >
          {/* Checkmark icon */}
          <path
            className="opacity-100 group-data-[indeterminate]:opacity-0"
            d="M3 8L6 11L11 3.5"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Indeterminate icon */}
          <path
            className="opacity-0 group-data-[indeterminate]:opacity-100"
            d="M3 7H11"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Headless.Checkbox>
  )
}