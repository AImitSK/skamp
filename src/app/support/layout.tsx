import { SanityLive } from '@/sanity/live'
import { SupportHeader } from '@/components/support/SupportHeader'
import { SupportFooter } from '@/components/support/SupportFooter'

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
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <SupportHeader />
      <main className="flex-1">{children}</main>
      <SupportFooter />
      <SanityLive />
    </div>
  )
}
