import { NextRequest, NextResponse } from 'next/server'
import { searchHelpArticles } from '@/sanity/help-queries'

/**
 * GET /api/help/search?q=kampagne&locale=de
 *
 * Sucht nach Hilfe-Artikeln.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const locale = searchParams.get('locale') || 'de'

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 },
    )
  }

  try {
    const results = await searchHelpArticles(query, locale) // query wird intern zu searchQuery
    return NextResponse.json(results)
  } catch (error) {
    console.error('Error searching help articles:', error)
    return NextResponse.json(
      { error: 'Failed to search help articles' },
      { status: 500 },
    )
  }
}
