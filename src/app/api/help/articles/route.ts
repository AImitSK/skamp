import { NextRequest, NextResponse } from 'next/server'
import { getHelpArticle, getOnboardingArticles } from '@/sanity/help-queries'

/**
 * GET /api/help/articles?slug=projekt-erstellen&locale=de
 * GET /api/help/articles?onboarding=true&locale=de
 *
 * Lädt einen einzelnen Artikel oder die Onboarding-Artikel.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const onboarding = searchParams.get('onboarding') === 'true'
  const locale = searchParams.get('locale') || 'de'

  try {
    // Onboarding-Artikel laden
    if (onboarding) {
      const articles = await getOnboardingArticles(locale)
      return NextResponse.json(articles)
    }

    // Einzelnen Artikel laden
    if (slug) {
      const article = await getHelpArticle(slug, locale)

      if (!article) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 },
        )
      }

      return NextResponse.json(article)
    }

    return NextResponse.json(
      { error: 'Either slug or onboarding parameter is required' },
      { status: 400 },
    )
  } catch (error) {
    console.error('Error fetching help article:', error)
    return NextResponse.json(
      { error: 'Failed to fetch help article' },
      { status: 500 },
    )
  }
}
