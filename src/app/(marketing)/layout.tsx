import { SanityLive } from '@/sanity/live'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <SanityLive />
    </>
  )
}
