import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

// WICHTIG: Nur für Development/Testing!
// In Production sollte dieser Endpoint entfernt oder geschützt werden
export async function GET() {
  try {
    // Alle Blog-Pfade revalidieren
    revalidatePath('/blog')
    revalidatePath('/blog/feed.xml')

    // Alle Blog-Posts revalidieren (wildcards werden unterstützt)
    revalidatePath('/blog/[slug]', 'page')

    console.log('✅ Manuell alle Blog-Pfade revalidiert')

    return NextResponse.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
      paths: ['/blog', '/blog/feed.xml', '/blog/[slug]'],
    })
  } catch (err: any) {
    console.error('❌ Manuelle Revalidation fehlgeschlagen:', err)
    return new NextResponse(err.message, { status: 500 })
  }
}
