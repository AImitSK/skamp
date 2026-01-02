import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

// Redirect zur deutschen Version als Default
export default async function SupportPage() {
  const headersList = await headers()
  const host = headersList.get('host') || ''

  // Wenn Subdomain support.celeropress.com, dann ohne /support prefix
  if (host.startsWith('support.')) {
    redirect('/de')
  }

  // Ansonsten normaler Redirect
  redirect('/support/de')
}
