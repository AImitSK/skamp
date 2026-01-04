'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { SupportLink, useSupportPath } from './SupportContext'
import clsx from 'clsx'

interface Article {
  title: string
  slug: string
  onboardingStep?: string
}

interface Category {
  _id: string
  title: string
  slug: string
  articles: Article[]
}

interface SupportSidebarProps {
  categories: Category[]
  locale: string
}

export function SupportSidebar({ categories, locale }: SupportSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { buildPath } = useSupportPath()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(buildPath(`/${locale}/search?q=${encodeURIComponent(searchQuery)}`))
    }
  }

  const searchPlaceholder = locale === 'de' ? 'Suchen...' : 'Search...'

  // Extract current category and article slug from pathname
  const pathParts = pathname.split('/')
  // Patterns: /support/de/category/slug or /de/category/slug (subdomain)
  const currentCategorySlug = pathParts.length >= 3 ? pathParts[pathParts.length - 2] : undefined
  const currentArticleSlug = pathParts.length >= 4 ? pathParts[pathParts.length - 1] : undefined

  return (
    <nav className="flex flex-col">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700
                     bg-white dark:bg-zinc-800 text-gray-900 dark:text-white
                     placeholder:text-gray-400 dark:placeholder:text-zinc-500
                     focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                     focus:outline-none transition-colors"
        />
      </form>

      {/* Categories */}
      <div className="space-y-6">
      {categories.map((category) => {
        const isCategoryActive = currentCategorySlug === category.slug

        return (
          <div key={category._id}>
            {/* Category Header */}
            <SupportLink
              href={`/${locale}/${category.slug}`}
              className={clsx(
                'block text-sm font-semibold mb-2 transition-colors',
                isCategoryActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400'
              )}
            >
              {category.title}
            </SupportLink>

            {/* Articles */}
            {category.articles && category.articles.length > 0 && (
              <div className="space-y-0.5 ml-3 border-l border-gray-200 dark:border-zinc-700">
                {category.articles.map((article, index) => {
                  const isActive = isCategoryActive && currentArticleSlug === article.slug

                  return (
                    <SupportLink
                      key={`${category._id}-${article.slug}-${index}`}
                      href={`/${locale}/${category.slug}/${article.slug}`}
                      className={clsx(
                        'block pl-3 py-1 text-sm transition-colors border-l-2 -ml-px',
                        isActive
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400 font-medium'
                          : 'border-transparent text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-zinc-500'
                      )}
                    >
                      {article.onboardingStep && (
                        <span className={clsx(
                          'mr-1.5 text-xs',
                          isActive ? 'text-primary-500' : 'text-gray-400 dark:text-zinc-500'
                        )}>
                          {article.onboardingStep}
                        </span>
                      )}
                      {article.title}
                    </SupportLink>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </nav>
  )
}
