import { NextRequest, NextResponse } from 'next/server'
import {
  getHelpCategories,
  getHelpCategoriesWithArticles,
} from '@/sanity/help-queries'

/**
 * GET /api/help/categories?locale=de&withArticles=true
 *
 * Lädt alle Hilfe-Kategorien.
 * Mit withArticles=true werden auch die Artikel geladen (für Academy).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const locale = searchParams.get('locale') || 'de'
  const withArticles = searchParams.get('withArticles') === 'true'

  try {
    const categories = withArticles
      ? await getHelpCategoriesWithArticles(locale)
      : await getHelpCategories(locale)

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching help categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch help categories' },
      { status: 500 },
    )
  }
}
