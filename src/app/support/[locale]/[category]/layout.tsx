import { SupportSidebarLayout } from '@/components/support/SupportSidebarLayout'
import { SupportSidebar } from '@/components/support/SupportSidebar'
import { client } from '@/sanity/client'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string; category: string }>
}

async function getCategoryWithArticles(categorySlug: string, locale: string) {
  const query = `*[_type == "helpCategory" && slug.current == $categorySlug][0] {
    _id,
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "description": select($locale == "en" && defined(descriptionEn) => descriptionEn, description),
    "slug": slug.current,
    "articles": *[_type == "helpArticle" && references(^._id)] | order(onboardingStep asc, title asc) {
      _id,
      "title": select($locale == "en" && defined(titleEn) => titleEn, title),
      "slug": slug.current,
      onboardingStep
    }
  }`

  return client.fetch(query, { categorySlug, locale })
}

export default async function CategoryLayout({ children, params }: LayoutProps) {
  const { locale, category } = await params
  const categoryData = await getCategoryWithArticles(category, locale)

  if (!categoryData) {
    return <>{children}</>
  }

  const sidebar = (
    <SupportSidebar
      category={{
        title: categoryData.title,
        slug: categoryData.slug,
        description: categoryData.description,
      }}
      articles={categoryData.articles || []}
      locale={locale}
    />
  )

  return (
    <SupportSidebarLayout sidebar={sidebar}>
      {children}
    </SupportSidebarLayout>
  )
}
