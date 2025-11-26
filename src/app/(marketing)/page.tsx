import { BentoCard } from '@/components/marketing/bento-card'
import { Button } from '@/components/marketing/Button'
import { Container } from '@/components/marketing/Container'
import { Footer } from '@/components/marketing/Footer'
import { Gradient } from '@/components/marketing/gradient'
import { Link } from '@/components/marketing/link'
import { LinkedAvatars } from '@/components/marketing/linked-avatars'
import { Map } from '@/components/marketing/map'
import { MonitoringCluster } from '@/components/marketing/monitoring-cluster'
import { Navbar } from '@/components/marketing/navbar'
import { Screenshot } from '@/components/marketing/screenshot'
import { Heading, Subheading } from '@/components/marketing/text'
import { ChevronRightIcon } from '@heroicons/react/16/solid'
import {
  SparklesIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  FolderIcon,
  NewspaperIcon,
  ViewColumnsIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CeleroPress - PR-Arbeit neu gedacht',
  description:
    'CeleroPress hilft dir, deine PR-Arbeit zu optimieren und mehr zu verkaufen. Moderne Email-Kampagnen, KI-gestützte Inhalte und intelligentes Kontaktmanagement.',
}

function Hero() {
  return (
    <div className="relative">
      <Gradient className="absolute inset-2 bottom-0 rounded-4xl ring-1 ring-black/5 ring-inset" />
      <Container className="relative">
        <Navbar
          banner={
            <Link
              href="/demo"
              className="flex items-center gap-1 rounded-full bg-primary/35 px-3 py-0.5 text-sm/6 font-medium text-white data-hover:bg-primary/30"
            >
              Jetzt Onboarding buchen
              <ChevronRightIcon className="size-4" />
            </Link>
          }
        />
        <div className="pt-16 pb-24 sm:pt-24 sm:pb-32 md:pt-32 md:pb-48">
          <h1 className="font-display text-6xl/[0.9] font-medium tracking-tight text-balance text-gray-950 sm:text-8xl/[0.8] md:text-9xl/[0.8]">
            Pressearbeit mit
            <br />
            KI Power <SparklesIcon className="inline-block size-12 sm:size-16 md:size-20 text-[#66b7a9]" />
          </h1>
          <p className="mt-8 text-xl/7 font-medium text-gray-950/75 sm:text-2xl/8">
            Vom ersten Entwurf bis zur fertigen Kampagne: CeleroPress ist das richtige Tool,
            <br />
            das mit Ihren Ambitionen wächst. Einfach für Einsteiger, mächtig für Profis.
          </p>
          <div className="mt-12 flex flex-col gap-x-6 gap-y-4 sm:flex-row">
            <Button href="/signup">Jetzt durchstarten</Button>
            <Button variant="secondary" href="/demo">
              Live-Demo buchen
            </Button>
          </div>
        </div>
      </Container>
    </div>
  )
}

const heroFeatures = [
  {
    name: 'KI-Assistent.',
    description: 'Erstellen Sie Pressemitteilungen in Minuten statt Stunden mit unserem intelligenten Schreibassistenten.',
    icon: SparklesIcon,
  },
  {
    name: 'Kontaktmanagement.',
    description: 'Verwalten Sie Ihre Journalisten-Kontakte zentral und versenden Sie zielgerichtete Kampagnen.',
    icon: UserGroupIcon,
  },
  {
    name: 'Media Monitoring.',
    description: 'Behalten Sie den Überblick über alle Erwähnungen und messen Sie Ihren PR-Erfolg.',
    icon: ChartBarIcon,
  },
]

function FeatureSection() {
  return (
    <div className="overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <div className="lg:ml-auto lg:pt-4 lg:pl-4">
            <div className="lg:max-w-lg">
              <Subheading>Alles in einer Plattform</Subheading>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
                Deine gesamte PR-Kampagne auf einen Blick.
              </p>
              <p className="mt-6 text-lg/8 text-gray-600">
                CeleroPress vereint alle Werkzeuge für erfolgreiche PR-Arbeit in einer Plattform. Von der Idee bis zur Veröffentlichung.
              </p>
              <dl className="mt-10 max-w-xl space-y-8 text-base/7 text-gray-600 lg:max-w-none">
                {heroFeatures.map((feature) => (
                  <div key={feature.name} className="relative pl-9">
                    <dt className="inline font-semibold text-gray-900">
                      <feature.icon
                        aria-hidden="true"
                        className="absolute top-1 left-1 size-5 text-[#66b7a9]"
                      />
                      {feature.name}
                    </dt>{' '}
                    <dd className="inline">{feature.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="flex items-start justify-end lg:order-first">
            <Screenshot
              width={1300}
              height={900}
              src="/celero.JPG"
              className="w-[48rem] max-w-none sm:w-[57rem]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const allFeatures = [
  {
    name: 'KI-Assistent',
    description: 'Erstellen Sie professionelle Pressemitteilungen in Minuten mit unserem KI-gestützten Schreibassistenten.',
    icon: SparklesIcon,
  },
  {
    name: 'PR-SEO-Analyse',
    description: 'Optimieren Sie Ihre Pressemitteilungen für Suchmaschinen mit automatischer Keyword-Analyse.',
    icon: MagnifyingGlassIcon,
  },
  {
    name: 'Medienkontakt-Datenbank',
    description: 'Verwalten Sie Journalisten, Redakteure und Medienunternehmen zentral an einem Ort.',
    icon: UserGroupIcon,
  },
  {
    name: 'E-Mail-Kampagnen',
    description: 'Versenden Sie personalisierte Pressemitteilungen mit automatischer Anrede und Variablen.',
    icon: EnvelopeIcon,
  },
  {
    name: 'Media-Monitoring',
    description: 'Finden Sie automatisch Veröffentlichungen durch tägliches RSS-Feed-Crawling.',
    icon: NewspaperIcon,
  },
  {
    name: 'Media-Bibliothek',
    description: 'Verwalten Sie Bilder, Videos und Dokumente an einem zentralen Ort.',
    icon: FolderIcon,
  },
  {
    name: 'Kanban-Board',
    description: 'Visualisieren Sie den Status Ihrer Projekte auf einem übersichtlichen Board.',
    icon: ViewColumnsIcon,
  },
  {
    name: 'Team-Chat',
    description: 'Kommunizieren Sie in Echtzeit mit Ihrem Team direkt im Projekt-Kontext.',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    name: 'Analytics & Reporting',
    description: 'Öffnungsraten, Klickraten und alle wichtigen Kennzahlen auf einen Blick.',
    icon: ChartBarIcon,
  },
  {
    name: 'Geplanter Versand',
    description: 'Planen Sie den Versand Ihrer Kampagnen für den optimalen Zeitpunkt.',
    icon: ClockIcon,
  },
  {
    name: 'AVE-Berechnung',
    description: 'Berechnen Sie den Werbewert Ihrer Medienberichterstattung automatisch.',
    icon: DocumentChartBarIcon,
  },
  {
    name: 'DSGVO-konform',
    description: 'Alle Daten werden sicher in der EU gespeichert und verarbeitet.',
    icon: ShieldCheckIcon,
  },
]

function AllFeaturesSection() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <Subheading>Alles was Sie brauchen</Subheading>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
            Das können Sie erwarten!
          </p>
          <p className="mt-6 text-lg/8 text-gray-600">
            Von KI-gestützter Content-Erstellung über intelligentes Kontaktmanagement bis hin zu umfassendem Monitoring.
          </p>
        </div>
        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-base/7 text-gray-600 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-16">
          {allFeatures.map((feature) => (
            <div key={feature.name} className="relative pl-9">
              <dt className="inline font-semibold text-gray-900">
                <feature.icon aria-hidden="true" className="absolute left-1 top-1 size-5 text-[#66b7a9]" />
                {feature.name}
              </dt>{' '}
              <dd className="inline">{feature.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

function MonitoringSection() {
  return (
    <div className="bg-gray-50 py-32">
      <Container>
        <div className="text-center">
          <Subheading>Analytics & Monitoring</Subheading>
          <Heading as="h2" className="mt-2">
            Messen Sie, was zählt.
          </Heading>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Box 1 - Media Monitoring */}
          <BentoCard
            dark
            eyebrow="Echtzeit"
            title="Media Monitoring"
            description="Verpassen Sie keine Erwähnung. Automatisches Crawling von RSS-Feeds und News-Seiten findet Ihre Clippings."
            graphic={<MonitoringCluster />}
            className="sm:col-span-2 lg:col-span-2 !bg-gray-800"
          />

          {/* Box 2 - AVE-Berechnung */}
          <BentoCard
            dark
            eyebrow="ROI"
            title="AVE-Berechnung"
            description="Der wahre Wert Ihrer PR. Berechnen Sie den Advertising Value Equivalent automatisch."
            graphic={
              <div className="h-full overflow-hidden">
                <div className="h-full bg-[url(/ave.jpg)] bg-cover bg-center -rotate-[8deg] scale-[1.2] opacity-90 transition-transform duration-300 group-hover:scale-[1.25]" />
              </div>
            }
            className="lg:col-span-1 !bg-gray-800"
          />

          {/* Box 3 - Reporting */}
          <BentoCard
            dark
            eyebrow="Reports"
            title="Reporting"
            description="Vom Öffnungs-Tracking bis zum Vorstands-Report. Alle Daten auf Knopfdruck."
            graphic={
              <div className="flex h-full items-center justify-center">
                <DocumentChartBarIcon className="h-20 w-20 text-white/30" />
              </div>
            }
            className="lg:col-span-1 !bg-gray-800"
          />

          {/* Box 4 - Auto-Clipping mit Map */}
          <BentoCard
            dark
            eyebrow="Automatisch"
            title="Auto-Clipping"
            description="Kein Copy-Paste mehr. Treffer werden automatisch Ihren Kampagnen zugeordnet."
            graphic={<Map />}
            className="lg:col-span-1 !bg-gray-800"
          />

          {/* Box 5 - E-Mail Performance */}
          <BentoCard
            dark
            eyebrow="Tracking"
            title="E-Mail Performance"
            description="Öffnungsraten, Klicks und Bounces. Sehen Sie genau, wie Ihre Kampagnen performen."
            graphic={<LinkedAvatars />}
            className="sm:col-span-2 lg:col-span-2 !bg-gray-800"
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
        <FeatureSection />
        <MonitoringSection />
        <AllFeaturesSection />
      </main>
      <Footer />
    </div>
  )
}
