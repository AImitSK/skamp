import { CallToAction } from '@/components/marketing/CallToAction'
import { Faqs } from '@/components/marketing/Faqs'
import { Pricing } from '@/components/marketing/Pricing'

export default function PricingPage() {
  return (
    <>
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
              Preise & Pakete
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600">
              Wähle das passende Paket für deine PR-Arbeit. Alle Pläne mit 14 Tagen Geld-zurück-Garantie.
            </p>
          </div>
        </div>
      </div>
      <Pricing />
      <Faqs />
      <CallToAction />
    </>
  )
}
