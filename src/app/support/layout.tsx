import { SanityLive } from '@/sanity/live'
import { SupportHeader } from '@/components/support/SupportHeader'
import { SupportFooter } from '@/components/support/SupportFooter'
import { SupportProvider } from '@/components/support/SupportContext'

export const metadata = {
  title: {
    default: 'CeleroPress Support',
    template: '%s | CeleroPress Support',
  },
  description: 'Hilfe und Dokumentation für CeleroPress',
}

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SupportProvider>
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
        <SupportHeader />
        <main className="flex-1">{children}</main>
        <SupportFooter />
        <SanityLive />
      </div>
    </SupportProvider>
  )
}
