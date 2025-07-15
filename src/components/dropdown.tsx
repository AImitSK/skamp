// src/components/dropdown.tsx
'use client'

import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import type React from 'react'
import { Button } from './button'
import { Link } from './link'

export function Dropdown(props: Headless.MenuProps) {
  return <Headless.Menu {...props} />
}

export function HoverDropdown({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
    </div>
  )
}

export function HoverDropdownTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export function HoverDropdownMenu({
  className,
  children,
  ...props
}: { className?: string; children: React.ReactNode } & React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        // Positioning
        'absolute left-0 top-full mt-1',
        // Base styles
        'w-max min-w-[320px] max-w-md rounded-xl p-1',
        // Invisible by default, visible on hover
        'invisible opacity-0 transition-all duration-200',
        'group-hover:visible group-hover:opacity-100',
        // Visual styles
        'bg-white/95 backdrop-blur-xl dark:bg-zinc-800/95',
        'shadow-xl ring-1 ring-zinc-950/10 dark:ring-white/10',
        // Z-index to appear above content
        'z-50'
      )}
    >
      {children}
    </div>
  )
}

export function DropdownButton<T extends React.ElementType = typeof Button>({
  as = Button,
  ...props
}: { className?: string } & Omit<Headless.MenuButtonProps<T>, 'className'>) {
  return <Headless.MenuButton as={as} {...props} />
}

export function DropdownMenu({
  anchor = 'bottom',
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuItemsProps, 'as' | 'className'>) {
  return (
    <Headless.MenuItems
      {...props}
      transition
      anchor={anchor}
      className={clsx(
        className,
        // Anchor positioning
        '[--anchor-gap:var(--spacing-2)] [--anchor-padding:var(--spacing-1)]',
        // Base styles - feste Breite statt volle Seitenbreite
        'isolate w-max min-w-[320px] max-w-md rounded-xl p-1',
        // Invisible border that is only visible in `forced-colors` mode for accessibility purposes
        'outline outline-transparent focus:outline-hidden',
        // Handle scrolling when menu won't fit in viewport
        'overflow-y-auto',
        // Popover background
        'bg-white/95 backdrop-blur-xl dark:bg-zinc-800/95',
        // Shadows - stärkere Schatten für mehr Tiefe
        'shadow-xl ring-1 ring-zinc-950/10 dark:ring-white/10',
        // Transitions
        'transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0'
      )}
    />
  )
}

export function DropdownItem({
  className,
  description,
  icon: Icon,
  children,
  ...props
}: { 
  className?: string; 
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
} & (
  | Omit<Headless.MenuItemProps<'button'>, 'as' | 'className' | 'children'>
  | Omit<Headless.MenuItemProps<typeof Link>, 'as' | 'className' | 'children'>
)) {
  let classes = clsx(
    className,
    // Base styles - größere Padding für mehr Raum
    'group relative flex gap-x-4 rounded-lg p-3 focus:outline-hidden',
    // Hover state
    'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
    // Focus state
    'data-focus:bg-zinc-100 dark:data-focus:bg-zinc-800',
    // Disabled state
    'data-disabled:opacity-50',
    // Forced colors mode
    'forced-color-adjust-none forced-colors:data-focus:bg-[Highlight] forced-colors:data-focus:text-[HighlightText]'
  )

  const content = (
    <>
      {/* Icon container mit Hintergrund */}
      {Icon && (
        <div className="mt-1 flex size-10 flex-none items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 transition-colors duration-200">
          <Icon className="size-5 text-zinc-600 group-hover:text-[#dedc00] dark:text-zinc-400 dark:group-hover:text-[#dedc00] transition-colors duration-200" />
        </div>
      )}
      {/* Text content */}
      <div className="flex-auto">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          {children}
        </div>
        {description && (
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </div>
        )}
      </div>
    </>
  )

  return 'href' in props ? (
    <Headless.MenuItem as={Link} {...props} className={classes}>
      {content}
    </Headless.MenuItem>
  ) : (
    <Headless.MenuItem as="button" type="button" {...props} className={classes}>
      {content}
    </Headless.MenuItem>
  )
}

export function DropdownHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={clsx(className, 'col-span-5 px-3.5 pt-2.5 pb-1 sm:px-3')} />
}

export function DropdownSection({
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuSectionProps, 'as' | 'className'>) {
  return (
    <Headless.MenuSection
      {...props}
      className={clsx(
        className,
        // Define grid at the section level instead of the item level if subgrid is supported
        'col-span-full supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]'
      )}
    />
  )
}

export function DropdownHeading({
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuHeadingProps, 'as' | 'className'>) {
  return (
    <Headless.MenuHeading
      {...props}
      className={clsx(
        className,
        'col-span-full grid grid-cols-[1fr_auto] gap-x-12 px-3.5 pt-2 pb-1 text-sm/5 font-medium text-zinc-500 sm:px-3 sm:text-xs/5 dark:text-zinc-400'
      )}
    />
  )
}

export function DropdownDivider({
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuSeparatorProps, 'as' | 'className'>) {
  return (
    <Headless.MenuSeparator
      {...props}
      className={clsx(
        className,
        'col-span-full mx-3.5 my-1 h-px border-0 bg-zinc-950/5 sm:mx-3 dark:bg-white/10 forced-colors:bg-[CanvasText]'
      )}
    />
  )
}

export function DropdownLabel({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div {...props} data-slot="label" className={clsx(className, 'col-start-2 row-start-1')} {...props} />
}

export function DropdownDescription({
  className,
  ...props
}: { className?: string } & Omit<Headless.DescriptionProps, 'as' | 'className'>) {
  return (
    <Headless.Description
      data-slot="description"
      {...props}
      className={clsx(
        className,
        'col-span-2 col-start-2 row-start-2 text-sm/5 text-zinc-500 group-data-focus:text-white sm:text-xs/5 dark:text-zinc-400 forced-colors:group-data-focus:text-[HighlightText]'
      )}
    />
  )
}

export function DropdownShortcut({
  keys,
  className,
  ...props
}: { keys: string | string[]; className?: string } & Omit<Headless.DescriptionProps<'kbd'>, 'as' | 'className'>) {
  return (
    <Headless.Description
      as="kbd"
      {...props}
      className={clsx(className, 'col-start-5 row-start-1 flex justify-self-end')}
    >
      {(Array.isArray(keys) ? keys : keys.split('')).map((char, index) => (
        <kbd
          key={index}
          className={clsx([
            'min-w-[2ch] text-center font-sans text-zinc-400 capitalize group-data-focus:text-white forced-colors:group-data-focus:text-[HighlightText]',
            // Make sure key names that are longer than one character (like "Tab") have extra space
            index > 0 && char.length > 1 && 'pl-1',
          ])}
        >
          {char}
        </kbd>
      ))}
    </Headless.Description>
  )
}