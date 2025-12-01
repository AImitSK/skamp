// src/components/ui/tags-overflow-popover.tsx
'use client'

import { useState, useRef } from 'react'
import { Popover, Transition } from '@headlessui/react'
import { Badge } from './badge'
import clsx from 'clsx'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagsOverflowPopoverProps {
  /** Alle Tags die im Popover angezeigt werden sollen */
  tags: Tag[]
  /** Anzahl der überschüssigen Tags (wird als "+X" angezeigt) */
  overflowCount: number
  /** Optionale zusätzliche CSS-Klassen */
  className?: string
}

/**
 * TagsOverflowPopover
 *
 * Zeigt ein "+X" Badge an, das bei Hover ein Popover mit allen Tags öffnet.
 * Wird verwendet wenn mehr als 3 Tags vorhanden sind.
 *
 * @example
 * ```tsx
 * {tagIds.length > 3 && (
 *   <TagsOverflowPopover
 *     tags={allTags}
 *     overflowCount={tagIds.length - 3}
 *   />
 * )}
 * ```
 */
export function TagsOverflowPopover({
  tags,
  overflowCount,
  className
}: TagsOverflowPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150) // Kleine Verzögerung für bessere UX
  }

  if (tags.length === 0) return null

  return (
    <Popover className={clsx('relative inline-block', className)}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Popover.Button
          as="span"
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-default transition-colors"
        >
          +{overflowCount}
        </Popover.Button>

        <Transition
          show={isOpen}
          enter="transition ease-out duration-150"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <Popover.Panel
            static
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="absolute left-0 z-50 mt-1 w-max max-w-xs rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10"
          >
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Alle Tags ({tags.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  color={tag.color as any}
                  className="text-xs"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </Popover.Panel>
        </Transition>
      </div>
    </Popover>
  )
}
