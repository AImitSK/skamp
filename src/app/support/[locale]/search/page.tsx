import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { SearchBar } from '@/components/support/SearchBar'
import { ArticleCard } from '@/components/support/ArticleCard'
import { searchHelpArticles } from '@/sanity/help-queries'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'de' ? 'Suche - Hilfe-Center' : 'Search - Help Center',
    description:
      locale === 'de'
        ? 'Durchsuche unsere Wissensdatenbank'
        : 'Search our knowledge base',
  }
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { q: query } = await searchParams

  const results = query ? await searchHelpArticles(query, locale) : []

  const content = {
    de: {
      title: 'Suchergebnisse',
      backToHelp: 'Zurück zum Hilfe-Center',
      searchPlaceholder: 'Suche nach Artikeln...',
      resultsFor: 'Ergebnisse für',
      noResults: 'Keine Ergebnisse gefunden',
      noResultsDescription:
        'Versuche es mit anderen Suchbegriffen oder durchsuche unsere Kategorien.',
      browseCategories: 'Kategorien durchsuchen',
      enterSearch: 'Gib einen Suchbegriff ein',
      enterSearchDescription:
        'Suche nach Artikeln in unserer Wissensdatenbank.',
    },
    en: {
      title: 'Search Results',
      backToHelp: 'Back to Help Center',
      searchPlaceholder: 'Search for articles...',
      resultsFor: 'Results for',
      noResults: 'No results found',
      noResultsDescription:
        'Try different keywords or browse our categories.',
      browseCategories: 'Browse Categories',
      enterSearch: 'Enter a search term',
      enterSearchDescription: 'Search for articles in our knowledge base.',
    },
  }

  const t = content[locale as keyof typeof content]

  return (
    <div className="py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href={`/support/${locale}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t.backToHelp}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t.title}
          </h1>
          <SearchBar locale={locale} defaultValue={query} />
        </div>

        {/* Results */}
        {query ? (
          <div>
            <p className="text-gray-600 dark:text-zinc-400 mb-6">
              {results.length} {t.resultsFor}{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                &quot;{query}&quot;
              </span>
            </p>

            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map(
                  (article: {
                    _id: string
                    title: string
                    slug: string
                    excerpt?: string
                    category?: { title: string; slug: string }
                  }) => (
                    <ArticleCard
                      key={article._id}
                      title={article.title}
                      excerpt={article.excerpt}
                      slug={article.slug}
                      categorySlug={article.category?.slug || 'general'}
                      locale={locale}
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 dark:text-zinc-500 mx-auto mb-4" />
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t.noResults}
                </h2>
                <p className="text-gray-600 dark:text-zinc-400 mb-6">
                  {t.noResultsDescription}
                </p>
                <Link
                  href={`/support/${locale}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                >
                  {t.browseCategories}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 dark:text-zinc-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t.enterSearch}
            </h2>
            <p className="text-gray-600 dark:text-zinc-400">
              {t.enterSearchDescription}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
