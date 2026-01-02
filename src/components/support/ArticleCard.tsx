import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

interface ArticleCardProps {
  title: string
  excerpt?: string
  slug: string
  categorySlug: string
  locale: string
  onboardingStep?: string
}

export function ArticleCard({
  title,
  excerpt,
  slug,
  categorySlug,
  locale,
  onboardingStep,
}: ArticleCardProps) {
  return (
    <Link
      href={`/support/${locale}/${categorySlug}/${slug}`}
      className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700
                 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-all"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {onboardingStep && (
            <span className="text-primary-600 dark:text-primary-400 mr-2">
              {onboardingStep}
            </span>
          )}
          {title}
        </h3>
        {excerpt && (
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-1">
            {excerpt}
          </p>
        )}
      </div>
      <ChevronRightIcon className="h-5 w-5 text-gray-400 dark:text-zinc-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 flex-shrink-0 ml-4 transition-colors" />
    </Link>
  )
}
