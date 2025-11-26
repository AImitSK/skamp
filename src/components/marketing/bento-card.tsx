'use client'

import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { Subheading } from './text'

export function BentoCard({
  dark = false,
  darkText = false,
  className = '',
  eyebrow,
  title,
  description,
  graphic,
  fade = [],
}: {
  dark?: boolean
  darkText?: boolean
  className?: string
  eyebrow: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  graphic: React.ReactNode
  fade?: ('top' | 'bottom')[]
}) {
  const textDark = dark || darkText
  return (
    <motion.div
      initial="idle"
      whileHover="active"
      variants={{ idle: {}, active: {} }}
      data-dark={dark ? 'true' : undefined}
      className={clsx(
        className,
        'group relative flex flex-col overflow-hidden rounded-lg',
        'bg-white shadow-xs ring-1 ring-black/5',
        'data-dark:bg-gray-800 data-dark:ring-white/15',
      )}
    >
      <div className="relative h-80 shrink-0">
        {graphic}
        {fade.includes('top') && (
          <div className="absolute inset-0 bg-linear-to-b from-white to-50% group-data-dark:from-gray-800 group-data-dark:from-[-25%]" />
        )}
        {fade.includes('bottom') && (
          <div className="absolute inset-0 bg-linear-to-t from-white to-50% group-data-dark:from-gray-800 group-data-dark:from-[-25%]" />
        )}
      </div>
      <div className={clsx('relative p-10 flex-1', darkText && 'bg-gray-800')}>
        <Subheading as="h3" dark={textDark}>
          {eyebrow}
        </Subheading>
        <p className={clsx('mt-1 text-2xl/8 font-medium tracking-tight', textDark ? 'text-white' : 'text-gray-950')}>
          {title}
        </p>
        <p className={clsx('mt-2 max-w-[600px] text-sm/6', textDark ? 'text-gray-400' : 'text-gray-600')}>
          {description}
        </p>
      </div>
    </motion.div>
  )
}
