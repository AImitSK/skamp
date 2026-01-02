import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SearchBar } from '@/components/support/SearchBar'
import { CategoryCard } from '@/components/support/CategoryCard'
import { getHelpCategoriesWithArticles } from '@/sanity/help-queries'

interface PageProps {
  params: Promise<{ locale: string }>
}

const validLocales = ['de', 'en']

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params

  return {
    title: locale === 'de' ? 'Hilfe-Center' : 'Help Center',
    description:
      locale === 'de'
        ? 'Finde Antworten auf deine Fragen zu CeleroPress'
        : 'Find answers to your questions about CeleroPress',
  }
}

export default async function SupportHomePage({ params }: PageProps) {
  const { locale } = await params

  if (!validLocales.includes(locale)) {
    notFound()
  }

  const categories = await getHelpCategoriesWithArticles(locale)

  const content = {
    de: {
      title: 'Wie können wir helfen?',
      subtitle: 'Durchsuche unsere Wissensdatenbank oder kontaktiere den Support',
      categories: 'Kategorien',
      needHelp: 'Brauchst du persönliche Hilfe?',
      contactSupport: 'Support kontaktieren',
      supportDescription:
        'Unser Team antwortet in der Regel innerhalb von 24 Stunden.',
    },
    en: {
      title: 'How can we help?',
      subtitle: 'Search our knowledge base or contact support',
      categories: 'Categories',
      needHelp: 'Need personal help?',
      contactSupport: 'Contact Support',
      supportDescription: 'Our team typically responds within 24 hours.',
    },
  }

  const t = content[locale as keyof typeof content]

  return (
    <div className="py-12 sm:py-16">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-zinc-400 mb-8">
            {t.subtitle}
          </p>
          <SearchBar locale={locale} />
        </div>

        {/* Categories */}
        <div className="mt-16">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {t.categories}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category._id}
                title={category.title}
                description={category.description}
                slug={category.slug}
                icon={category.icon}
                articleCount={category.articles?.length || 0}
                locale={locale}
              />
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-16 text-center p-8 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t.needHelp}
          </h2>
          <p className="text-gray-600 dark:text-zinc-400 mb-4">
            {t.supportDescription}
          </p>
          <a
            href="mailto:support@celeropress.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700
                       text-white font-medium rounded-lg transition-colors"
          >
            {t.contactSupport}
          </a>
        </div>
      </div>
    </div>
  )
}
