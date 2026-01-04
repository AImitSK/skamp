'use client'

import { usePathname } from 'next/navigation'
import { SupportLink } from './SupportContext'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface Article {
  _id: string
  title: string
  slug: string
  onboardingStep?: string
}

interface Category {
  title: string
  slug: string
  description?: string
}

interface SupportSidebarProps {
  category: Category
  articles: Article[]
  locale: string
  currentSlug?: string
}

export function SupportSidebar({
  category,
  articles,
  locale,
}: Omit<SupportSidebarProps, 'currentSlug'>) {
  const pathname = usePathname()
  const backText = locale === 'de' ? 'Alle Kategorien' : 'All Categories'

  // Extract current slug from pathname: /support/de/category/slug or /de/category/slug
  const pathParts = pathname.split('/')
  const currentSlug = pathParts.length >= 4 ? pathParts[pathParts.length - 1] : undefined

  return (
    <nav className="flex flex-col">
      {/* Back link */}
      <SupportLink
        href={`/${locale}`}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {backText}
      </SupportLink>

      {/* Category header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {category.title}
        </h2>
        {category.description && (
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            {category.description}
          </p>
        )}
      </div>

      {/* Articles list */}
      <div className="space-y-1">
        {articles.map((article) => {
          const isActive = currentSlug === article.slug

          return (
            <SupportLink
              key={article._id}
              href={`/${locale}/${category.slug}/${article.slug}`}
              className={clsx(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
              )}
            >
              <span className="flex items-center gap-2">
                {article.onboardingStep && (
                  <span className={clsx(
                    'text-xs font-medium',
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 dark:text-zinc-500'
                  )}>
                    {article.onboardingStep}
                  </span>
                )}
                <span className="truncate">{article.title}</span>
              </span>
            </SupportLink>
          )
        })}
      </div>

      {/* Article count */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          {articles.length} {locale === 'de' ? 'Artikel' : 'Articles'}
        </p>
      </div>
    </nav>
  )
}
