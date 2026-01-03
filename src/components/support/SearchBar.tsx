'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useSupportPath } from './SupportContext'

interface SearchBarProps {
  locale: string
  placeholder?: string
  defaultValue?: string
}

export function SearchBar({ locale, placeholder, defaultValue }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue || '')
  const router = useRouter()
  const { buildPath } = useSupportPath()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(buildPath(`/${locale}/search?q=${encodeURIComponent(query)}`))
    }
  }

  const defaultPlaceholder =
    locale === 'de' ? 'Wie können wir helfen?' : 'How can we help?'

  return (
    <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
      <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || defaultPlaceholder}
        className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border border-gray-200 dark:border-zinc-700
                   bg-white dark:bg-zinc-800 text-gray-900 dark:text-white
                   placeholder:text-gray-400 dark:placeholder:text-zinc-500
                   focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800
                   focus:outline-none transition-all"
      />
    </form>
  )
}
