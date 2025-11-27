import { revalidatePath, revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

// Secret für Webhook-Authentifizierung
const SANITY_REVALIDATE_SECRET = process.env.SANITY_REVALIDATE_SECRET

export async function POST(req: NextRequest) {
  try {
    // Webhook-Secret validieren
    const secret = req.nextUrl.searchParams.get('secret')
    if (!SANITY_REVALIDATE_SECRET || secret !== SANITY_REVALIDATE_SECRET) {
      return new NextResponse('Invalid secret', { status: 401 })
    }

    // Webhook-Body parsen
    const { body, isValidSignature } = await parseBody<{
      _type: string
      slug?: { current: string }
    }>(req, process.env.SANITY_WEBHOOK_SECRET)

    // Optional: Signature validieren (wenn SANITY_WEBHOOK_SECRET gesetzt ist)
    if (process.env.SANITY_WEBHOOK_SECRET && !isValidSignature) {
      return new NextResponse('Invalid signature', { status: 401 })
    }

    if (!body?._type) {
      return new NextResponse('Bad Request', { status: 400 })
    }

    // Je nach Dokumenttyp verschiedene Pfade revalidieren
    switch (body._type) {
      case 'post':
        // Revalidate Blog-Übersicht
        revalidatePath('/blog')
        revalidatePath('/blog/feed.xml')

        // Revalidate spezifischen Post wenn slug vorhanden
        if (body.slug?.current) {
          revalidatePath(`/blog/${body.slug.current}`)
        }

        console.log(`✅ Revalidated blog paths for post: ${body.slug?.current || 'unknown'}`)
        break

      case 'category':
        // Revalidate gesamten Blog wenn Kategorie geändert wurde
        revalidatePath('/blog')
        console.log('✅ Revalidated blog for category change')
        break

      default:
        console.log(`ℹ️ Unhandled document type: ${body._type}`)
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      type: body._type,
    })
  } catch (err: any) {
    console.error('❌ Revalidation error:', err)
    return new NextResponse(err.message, { status: 500 })
  }
}
