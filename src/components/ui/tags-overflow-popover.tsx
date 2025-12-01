// src/components/ui/tags-overflow-popover.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Transition } from '@headlessui/react'
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
 * Verwendet ein Portal um overflow-hidden Container zu umgehen.
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
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = 280 // max-w-xs entspricht ca. 280px
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Berechne Position - standardmäßig unter dem Trigger, nach links ausgerichtet
    let left = rect.left
    let top = rect.bottom + 4 // 4px Abstand

    // Wenn das Popover rechts über den Viewport hinausgeht, nach links verschieben
    if (left + popoverWidth > viewportWidth - 16) {
      left = viewportWidth - popoverWidth - 16
    }

    // Wenn das Popover links über den Viewport hinausgeht
    if (left < 16) {
      left = 16
    }

    // Wenn das Popover unten über den Viewport hinausgeht, über dem Trigger anzeigen
    if (top + 200 > viewportHeight) { // 200px geschätzte Höhe
      top = rect.top - 200 - 4
    }

    setPosition({ top, left })
  }, [])

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    updatePosition()
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150) // Kleine Verzögerung für bessere UX
  }

  if (tags.length === 0) return null

  const popoverContent = (
    <Transition
      show={isOpen}
      enter="transition ease-out duration-150"
      enterFrom="opacity-0 translate-y-1"
      enterTo="opacity-100 translate-y-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100 translate-y-0"
      leaveTo="opacity-0 translate-y-1"
    >
      <div
        ref={popoverRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 9999
        }}
        className="w-max max-w-xs rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10"
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
      </div>
    </Transition>
  )

  return (
    <span className={clsx('relative inline-block', className)}>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-default transition-colors"
      >
        +{overflowCount}
      </span>
      {mounted && createPortal(popoverContent, document.body)}
    </span>
  )
}
