'use client'

import { BookOpenIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface HelpFAQProps {
  article: {
    title: string
    slug: string
    excerpt: string
    category: { title: string; slug: string }
  }
}

export function HelpFAQ({ article }: HelpFAQProps) {
  const t = useTranslations('help')

  return (
    <div className="p-4">
      <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-3">
        <BookOpenIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        {t('sections.faq')}
      </h3>

      <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          {article.title}
        </h4>
        {article.excerpt && (
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-3 line-clamp-3">
            {article.excerpt}
          </p>
        )}
        <Link
          href={`/support/de/${article.category.slug}/${article.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {t('readMore')}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
