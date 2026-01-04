import { SupportSidebarLayout } from '@/components/support/SupportSidebarLayout'
import { SupportSidebar } from '@/components/support/SupportSidebar'
import { getHelpCategoriesWithArticles } from '@/sanity/help-queries'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function SearchLayout({ children, params }: LayoutProps) {
  const { locale } = await params
  const categories = await getHelpCategoriesWithArticles(locale)

  const sidebar = (
    <SupportSidebar
      categories={categories || []}
      locale={locale}
    />
  )

  return (
    <SupportSidebarLayout sidebar={sidebar}>
      {children}
    </SupportSidebarLayout>
  )
}
