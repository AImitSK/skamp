import { NextRequest, NextResponse } from 'next/server'
import { getHelpForRoute } from '@/sanity/help-queries'

/**
 * GET /api/help?route=/dashboard/projects&locale=de
 *
 * Lädt kontextuelle Hilfe für eine bestimmte App-Route.
 * Wird vom Hilfe-Panel verwendet.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const route = searchParams.get('route')
  const locale = searchParams.get('locale') || 'de'

  if (!route) {
    return NextResponse.json(
      { error: 'Route parameter is required' },
      { status: 400 },
    )
  }

  try {
    const helpContent = await getHelpForRoute(route, locale)

    if (!helpContent) {
      return NextResponse.json(null, { status: 404 })
    }

    return NextResponse.json(helpContent)
  } catch (error) {
    console.error('Error fetching help content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch help content' },
      { status: 500 },
    )
  }
}
