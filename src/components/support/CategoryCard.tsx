'use client'

import Link from 'next/link'
import {
  RocketLaunchIcon,
  UserGroupIcon,
  FolderIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useSupportPath } from './SupportContext'

interface CategoryCardProps {
  title: string
  description?: string
  slug: string
  icon?: string
  articleCount: number
  locale: string
}

// Icon-Mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  RocketLaunchIcon,
  UserGroupIcon,
  FolderIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  UserIcon,
}

export function CategoryCard({
  title,
  description,
  slug,
  icon,
  articleCount,
  locale,
}: CategoryCardProps) {
  const { buildPath } = useSupportPath()
  const IconComponent = icon ? iconMap[icon] || FolderIcon : FolderIcon

  const articleText =
    locale === 'de'
      ? `${articleCount} ${articleCount === 1 ? 'Artikel' : 'Artikel'}`
      : `${articleCount} ${articleCount === 1 ? 'article' : 'articles'}`

  return (
    <Link
      href={buildPath(`/${locale}/${slug}`)}
      className="group block p-6 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700
                 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all"
    >
      <IconComponent className="h-8 w-8 text-primary-600 dark:text-primary-400 mb-3 group-hover:scale-110 transition-transform" />
      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">
          {description}
        </p>
      )}
      <p className="text-sm text-gray-400 dark:text-zinc-500 mt-2">
        {articleText}
      </p>
    </Link>
  )
}
