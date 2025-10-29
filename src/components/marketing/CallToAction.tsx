import Image from 'next/image'

import { Button } from '@/components/marketing/Button'
import { Container } from '@/components/marketing/Container'
import backgroundImage from '@/images/background-call-to-action.jpg'

export function CallToAction() {
  return (
    <section
      id="get-started-today"
      className="relative overflow-hidden bg-blue-600 py-32"
    >
      <Image
        className="absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
        src={backgroundImage}
        alt=""
        width={2347}
        height={1244}
        unoptimized
      />
      <Container className="relative">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
            Bereit für bessere PR-Arbeit?
          </h2>
          <p className="mt-4 text-lg tracking-tight text-white">
            Starte jetzt mit CeleroPress und erlebe, wie einfach professionelle
            Pressemitteilungen sein können. 14 Tage kostenlos testen, keine Kreditkarte nötig.
          </p>
          <Button href="/signup" color="white" className="mt-10">
            Jetzt kostenlos starten
          </Button>
        </div>
      </Container>
    </section>
  )
}
