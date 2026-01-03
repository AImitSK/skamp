import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/outline'
import { ArticleContent } from '@/components/support/ArticleContent'
import { SupportLink } from '@/components/support/SupportContext'
import { getHelpArticle } from '@/sanity/help-queries'

interface PageProps {
  params: Promise<{ locale: string; category: string; slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, category, slug } = await params
  const article = await getHelpArticle(slug, locale)

  if (!article) {
    return { title: 'Artikel nicht gefunden' }
  }

  return {
    title: article.title,
    description: article.excerpt,
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale, category, slug } = await params

  const article = await getHelpArticle(slug, locale)

  if (!article) {
    notFound()
  }

  const backText = locale === 'de' ? 'Zurück' : 'Back'
  const homeText = locale === 'de' ? 'Hilfe-Center' : 'Help Center'

  return (
    <div className="py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 mb-6">
          <SupportLink
            href={`/${locale}`}
            className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <HomeIcon className="h-4 w-4" />
            <span className="sr-only">{homeText}</span>
          </SupportLink>
          <span>/</span>
          <SupportLink
            href={`/${locale}/${category}`}
            className="hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {article.category?.title || category}
          </SupportLink>
          <span>/</span>
          <span className="text-gray-900 dark:text-white truncate max-w-[200px]">
            {article.title}
          </span>
        </nav>

        {/* Back Button */}
        <SupportLink
          href={`/${locale}/${category}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {backText}
        </SupportLink>

        {/* Article Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {article.onboardingStep && (
              <span className="text-primary-600 dark:text-primary-400 mr-2">
                {article.onboardingStep}
              </span>
            )}
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="text-lg text-gray-600 dark:text-zinc-400 mt-3">
              {article.excerpt}
            </p>
          )}
        </div>

        {/* Article Content */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-zinc-700">
          <ArticleContent
            content={article.content}
            tips={article.tips}
            videos={article.videos}
            relatedArticles={article.relatedArticles}
            locale={locale}
            categorySlug={category}
          />
        </div>

        {/* Article Footer */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-zinc-700 text-center">
          <p className="text-gray-600 dark:text-zinc-400 mb-4">
            {locale === 'de'
              ? 'War dieser Artikel hilfreich?'
              : 'Was this article helpful?'}
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
              {locale === 'de' ? '👍 Ja' : '👍 Yes'}
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
              {locale === 'de' ? '👎 Nein' : '👎 No'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
