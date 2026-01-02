import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { ArticleCard } from '@/components/support/ArticleCard'
import { client } from '@/sanity/client'

interface PageProps {
  params: Promise<{ locale: string; category: string }>
}

async function getCategoryWithArticles(categorySlug: string, locale: string) {
  const query = `*[_type == "helpCategory" && slug.current == $categorySlug][0] {
    _id,
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "description": select($locale == "en" && defined(descriptionEn) => descriptionEn, description),
    "slug": slug.current,
    icon,
    "articles": *[_type == "helpArticle" && references(^._id)] | order(onboardingStep asc, title asc) {
      _id,
      "title": select($locale == "en" && defined(titleEn) => titleEn, title),
      "slug": slug.current,
      "excerpt": select($locale == "en" && defined(excerptEn) => excerptEn, excerpt),
      onboardingStep
    }
  }`

  return client.fetch(query, { categorySlug, locale })
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, category } = await params
  const categoryData = await getCategoryWithArticles(category, locale)

  if (!categoryData) {
    return { title: 'Kategorie nicht gefunden' }
  }

  return {
    title: categoryData.title,
    description: categoryData.description,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { locale, category } = await params

  const categoryData = await getCategoryWithArticles(category, locale)

  if (!categoryData) {
    notFound()
  }

  const backText = locale === 'de' ? 'Zurück' : 'Back'

  return (
    <div className="py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Link
          href={`/support/${locale}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {backText}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {categoryData.title}
          </h1>
          {categoryData.description && (
            <p className="text-gray-600 dark:text-zinc-400 mt-2">
              {categoryData.description}
            </p>
          )}
        </div>

        {/* Articles */}
        <div className="space-y-3">
          {categoryData.articles?.length > 0 ? (
            categoryData.articles.map((article: {
              _id: string
              title: string
              slug: string
              excerpt?: string
              onboardingStep?: string
            }) => (
              <ArticleCard
                key={article._id}
                title={article.title}
                excerpt={article.excerpt}
                slug={article.slug}
                categorySlug={category}
                locale={locale}
                onboardingStep={article.onboardingStep}
              />
            ))
          ) : (
            <p className="text-gray-500 dark:text-zinc-400 text-center py-8">
              {locale === 'de'
                ? 'Noch keine Artikel in dieser Kategorie.'
                : 'No articles in this category yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
