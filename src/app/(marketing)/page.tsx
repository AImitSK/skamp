import { BentoCard } from '@/components/marketing/bento-card'
import { Button } from '@/components/marketing/Button'
import { Container } from '@/components/marketing/Container'
import { Footer } from '@/components/marketing/Footer'
import { Gradient } from '@/components/marketing/gradient'
import { Keyboard } from '@/components/marketing/keyboard'
import { Link } from '@/components/marketing/link'
import { LinkedAvatars } from '@/components/marketing/linked-avatars'
import { LogoCloud } from '@/components/marketing/logo-cloud'
import { LogoCluster } from '@/components/marketing/logo-cluster'
import { LogoTimeline } from '@/components/marketing/logo-timeline'
import { Map } from '@/components/marketing/map'
import { Navbar } from '@/components/marketing/navbar'
import { Screenshot } from '@/components/marketing/screenshot'
import { Testimonials } from '@/components/marketing/Testimonials'
import { Heading, Subheading } from '@/components/marketing/text'
import { ChevronRightIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  description:
    'CeleroPress hilft dir, deine PR-Arbeit zu optimieren und mehr zu verkaufen.',
}

function Hero() {
  return (
    <div className="relative">
      <Gradient className="absolute inset-2 bottom-0 rounded-4xl ring-1 ring-black/5 ring-inset" />
      <Container className="relative">
        <Navbar
          banner={
            <Link
              href="/pricing"
              className="flex items-center gap-1 rounded-full bg-primary/35 px-3 py-0.5 text-sm/6 font-medium text-white data-hover:bg-primary/30"
            >
              Jetzt 14 Tage kostenlos testen
              <ChevronRightIcon className="size-4" />
            </Link>
          }
        />
        <div className="pt-16 pb-24 sm:pt-24 sm:pb-32 md:pt-32 md:pb-48">
          <h1 className="font-display text-6xl/[0.9] font-medium tracking-tight text-balance text-gray-950 sm:text-8xl/[0.8] md:text-9xl/[0.8]">
            PR-Arbeit neu gedacht.
          </h1>
          <p className="mt-8 max-w-lg text-xl/7 font-medium text-gray-950/75 sm:text-2xl/8">
            CeleroPress hilft dir, deine PR-Arbeit zu optimieren und mehr zu verkaufen.
          </p>
          <div className="mt-12 flex flex-col gap-x-6 gap-y-4 sm:flex-row">
            <Button href="/signup">Jetzt starten</Button>
            <Button variant="secondary" href="/pricing">
              Preise ansehen
            </Button>
          </div>
        </div>
      </Container>
    </div>
  )
}

function FeatureSection() {
  return (
    <div className="overflow-hidden">
      <Container className="pb-24">
        <Heading as="h2" className="max-w-3xl">
          Dein komplettes PR-Management in einer Plattform.
        </Heading>
        <Screenshot
          width={1216}
          height={768}
          src="/screenshots/app.png"
          className="mt-16 h-144 sm:h-auto sm:w-304"
        />
      </Container>
    </div>
  )
}

function BentoSection() {
  return (
    <Container>
      <Subheading>Features</Subheading>
      <Heading as="h3" className="mt-2 max-w-3xl">
        Alles, was du für erfolgreiche PR-Arbeit brauchst.
      </Heading>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
        <BentoCard
          eyebrow="Kontakte"
          title="Perfekte Übersicht"
          description="Verwalte alle deine Medienkontakte zentral. Importiere Kontakte aus Excel oder erstelle sie direkt in der App."
          graphic={
            <div className="h-80 bg-[url(/screenshots/profile.png)] bg-size-[1000px_560px] bg-position-[left_-109px_top_-112px] bg-no-repeat" />
          }
          fade={['bottom']}
          className="max-lg:rounded-t-4xl lg:col-span-3 lg:rounded-tl-4xl"
        />
        <BentoCard
          eyebrow="Verteilerlisten"
          title="Zielgerichtete Kampagnen"
          description="Erstelle intelligente Verteilerlisten und erreiche genau die richtigen Kontakte für deine Story."
          graphic={
            <div className="absolute inset-0 bg-[url(/screenshots/competitors.png)] bg-size-[1100px_650px] bg-position-[left_-38px_top_-73px] bg-no-repeat" />
          }
          fade={['bottom']}
          className="lg:col-span-3 lg:rounded-tr-4xl"
        />
        <BentoCard
          eyebrow="E-Mail-Editor"
          title="Professionelle Kampagnen"
          description="Erstelle und versende professionelle E-Mail-Kampagnen mit unserem intuitiven Drag-and-Drop Editor."
          graphic={
            <div className="flex size-full pt-10 pl-10">
              <Keyboard highlighted={['LeftCommand', 'LeftShift', 'D']} />
            </div>
          }
          className="lg:col-span-2 lg:rounded-bl-4xl"
        />
        <BentoCard
          eyebrow="Tracking"
          title="Erfolg messbar machen"
          description="Verfolge Öffnungen, Klicks und Antworten. Optimiere deine Kampagnen basierend auf echten Daten."
          graphic={<LogoCluster />}
          className="lg:col-span-2"
        />
        <BentoCard
          eyebrow="Projekte"
          title="Strukturiert arbeiten"
          description="Organisiere deine PR-Arbeit in Projekten und behalte den Überblick über alle laufenden Kampagnen."
          graphic={<Map />}
          className="max-lg:rounded-b-4xl lg:col-span-2 lg:rounded-br-4xl"
        />
      </div>
    </Container>
  )
}

function DarkBentoSection() {
  return (
    <div className="mx-2 mt-2 rounded-4xl bg-gray-900 py-32">
      <Container>
        <Subheading dark>Automatisierung</Subheading>
        <Heading as="h3" dark className="mt-2 max-w-3xl">
          Spare Zeit mit intelligenter Automatisierung.
        </Heading>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
          <BentoCard
            dark
            eyebrow="Templates"
            title="Schneller arbeiten"
            description="Erstelle Vorlagen für wiederkehrende E-Mails und spare Zeit bei der Kampagnenerstellung."
            graphic={
              <div className="h-80 bg-[url(/screenshots/networking.png)] bg-size-[851px_344px] bg-no-repeat" />
            }
            fade={['top']}
            className="max-lg:rounded-t-4xl lg:col-span-4 lg:rounded-tl-4xl"
          />
          <BentoCard
            dark
            eyebrow="Integrationen"
            title="Nahtlos verbunden"
            description="Integriere CeleroPress mit deinen bestehenden Tools und arbeite noch effizienter."
            graphic={<LogoTimeline />}
            className="z-10 overflow-visible! lg:col-span-2 lg:rounded-tr-4xl"
          />
          <BentoCard
            dark
            eyebrow="Planung"
            title="Termingerecht versenden"
            description="Plane deine Kampagnen im Voraus und versende sie zum optimalen Zeitpunkt."
            graphic={<LinkedAvatars />}
            className="lg:col-span-2 lg:rounded-bl-4xl"
          />
          <BentoCard
            dark
            eyebrow="Reporting"
            title="Transparente Erfolge"
            description="Erstelle Berichte über deine PR-Erfolge und teile sie mit deinem Team oder Kunden."
            graphic={
              <div className="h-80 bg-[url(/screenshots/engagement.png)] bg-size-[851px_344px] bg-no-repeat" />
            }
            fade={['top']}
            className="max-lg:rounded-b-4xl lg:col-span-4 lg:rounded-br-4xl"
          />
        </div>
      </Container>
    </div>
  )
}

export default function Home() {
  return (
    <div className="overflow-hidden">
      <Hero />
      <main>
        <Container className="mt-10">
          <LogoCloud />
        </Container>
        <div className="bg-linear-to-b from-white from-50% to-gray-100 py-32">
          <FeatureSection />
          <BentoSection />
        </div>
        <DarkBentoSection />
      </main>
      <Testimonials />
      <Footer />
    </div>
  )
}
