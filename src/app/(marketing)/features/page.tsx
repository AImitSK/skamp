import { BentoCard } from '@/components/marketing/bento-card'
import { LinkedAvatars } from '@/components/marketing/linked-avatars'
import { MonitoringCluster } from '@/components/marketing/monitoring-cluster'
import { Button } from '@/components/marketing/Button'
import { Container } from '@/components/marketing/Container'
import { Footer } from '@/components/marketing/Footer'
import { GradientBackground } from '@/components/marketing/gradient'
import { Map } from '@/components/marketing/map'
import { Navbar } from '@/components/marketing/navbar'
import { Screenshot } from '@/components/marketing/screenshot'
import { Heading, Lead, Subheading } from '@/components/marketing/text'
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  RssIcon,
  CurrencyEuroIcon,
  BoltIcon,
  DocumentChartBarIcon,
  PhotoIcon,
  ViewColumnsIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Features - CeleroPress',
  description:
    'PR ohne Kompromisse. Vom ersten Entwurf bis zur globalen Kampagne: CeleroPress ist das einzige Tool, das mit Ihren Ambitionen wächst.',
}

// =============================================================================
// 1. HEADER SECTION
// =============================================================================
function Header() {
  return (
    <Container className="mt-16">
      <Heading as="h1">Alle Features im Überblick.</Heading>
      <Lead className="mt-6 max-w-3xl">
        Von KI-gestützter Content-Erstellung über intelligentes
        Kontaktmanagement bis hin zu umfassendem Monitoring – entdecken Sie,
        was CeleroPress für Ihre PR-Arbeit leisten kann.
      </Lead>
    </Container>
  )
}

// =============================================================================
// 2. KI & CONTENT SECTION (Dark, mit Screenshot)
// =============================================================================
function AIContentSection() {
  return (
    <div className="mx-2 mt-24 rounded-4xl bg-linear-115 from-[#fde68a] from-28% via-[#6ee7b7] via-70% to-[#60a5fa] sm:bg-linear-145 py-32">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Text Links */}
          <div>
            <Subheading>Intelligente Content-Erstellung</Subheading>
            <Heading as="h2" className="mt-2">
              Ihre Pressemitteilung.
              <br />
              In Minuten fertig.
              <br />
              Oder bis ins Detail
              <br />
              perfektioniert.
            </Heading>
            <p className="mt-6 text-lg/8 text-gray-700">
              Schluss mit Schreibblockaden. Nutzen Sie unsere KI als Turbo für
              schnelle News oder als strategischen Partner für komplexe Storys.
            </p>

            <dl className="mt-10 space-y-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-gray-900">
                    Schnellstart
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-700">
                    Verwandeln Sie lose Stichpunkte in Sekundenschnelle in eine vollständige Pressemitteilung und erzielen Sie als Einsteiger sofort professionelle Ergebnisse.
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900">
                  <MagnifyingGlassIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-gray-900">
                    Deep Dive
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-700">
                    Maximieren Sie Ihre Reichweite durch fundierte SEO-Analysen und strategische Stil-Optimierungen, die speziell auf die hohen Anforderungen von Profis zugeschnitten sind.
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900">
                  <PencilSquareIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-gray-900">
                    Perfekter Stil
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-700">
                    Sichern Sie sich jederzeit makellose Texte durch unsere automatische Korrektur von Tonalität und Grammatik für eine durchgehend professionelle Kommunikation.
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Screenshot Rechts */}
          <div className="relative lg:scale-[1.3] lg:origin-left">
            <Screenshot
              width={1216}
              height={768}
              src="/ki-pr-assistent.JPG"
              className="w-full"
            />
          </div>
        </div>
      </Container>
    </div>
  )
}

// =============================================================================
// 3. CRM & DISTRIBUTION SECTION (Light, alternierend)
// =============================================================================
function CRMSection() {
  return (
    <div className="py-32">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Screenshot Links */}
          <div className="relative order-2 lg:order-1 pt-16">
            {/* Journalistin Avatar - überlappend */}
            <img
              alt="Journalistin"
              src="/linked-avatars/manager.jpg"
              className="absolute top-0 left-[calc(50%-40px)] -translate-x-1/2 z-10 size-32 rounded-full bg-white shadow-xl ring-4 ring-white"
            />
            <Screenshot
              width={1216}
              height={768}
              src="/kontakte.JPG"
              className="w-full"
            />
          </div>

          {/* Text Rechts */}
          <div className="order-1 lg:order-2">
            <Subheading>Kontakte & Kampagnen</Subheading>
            <Heading as="h2" className="mt-2">
              Erreichen Sie die richtigen Journalisten. Jedes Mal.
            </Heading>
            <p className="mt-6 text-lg/8 text-gray-600">
              Verwalten Sie Ihre Kontakte nicht einfach nur. Arbeiten Sie mit Ihnen. Verwandeln Sie statische Listen in lebendige Beziehungen.
            </p>

            <dl className="mt-10 space-y-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-gray-900">
                    Smart
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-600">
                    Starten Sie unkompliziert, indem Sie Ihre bestehenden Kontakte per CSV importieren.
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900">
                  <ArrowPathIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-gray-900">Pro</dt>
                  <dd className="mt-1 text-sm/6 text-gray-600">
                    Nutzen Sie unsere kuratierten Premium-Journalisten-Listen, dynamische Verteiler und automatisches Reply-Tracking.
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900">
                  <ShieldCheckIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-gray-900">
                    Sicher
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-600">
                    Verifizierte Absender-Domains für garantierte Zustellbarkeit.
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </Container>
    </div>
  )
}

// =============================================================================
// 4. MONITORING & ANALYTICS BENTO GRID
// =============================================================================
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
            description="Vom Öffnungs-Tracking bis zum Vorstands-Report – alle Daten auf Knopfdruck."
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
            description="Öffnungsraten, Klicks und Bounces – sehen Sie genau, wie Ihre Kampagnen performen."
            graphic={<LinkedAvatars />}
            className="sm:col-span-2 lg:col-span-2 !bg-gray-800"
          />
        </div>
      </Container>
    </div>
  )
}

// =============================================================================
// 5. MEDIA ASSETS & TEAM (2x2 Grid)
// =============================================================================
const teamFeatures = [
  {
    name: 'Zentraler Asset-Speicher',
    description:
      'Bilder & Videos per Drag & Drop. Teilen Sie Pressemappen via gebrandetem Link – Passwortschutz inklusive.',
    icon: PhotoIcon,
  },
  {
    name: 'Kanban für PR',
    description:
      'Vom "To-Do" zum "Published". Behalten Sie den Status aller Kampagnen im Blick.',
    icon: ViewColumnsIcon,
  },
  {
    name: 'Chat & Feedback',
    description:
      'Diskutieren Sie Entwürfe direkt im Tool. @Mentions und Emojis für schnelle Abstimmungen.',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    name: 'Enterprise Ready',
    description:
      'DSGVO-konform, Rollenrechte (Admin/Viewer) und strikte Datentrennung zwischen Mandanten.',
    icon: LockClosedIcon,
  },
]

function TeamSection() {
  return (
    <div className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl lg:text-center">
          <Subheading>Zusammenarbeit</Subheading>
          <Heading as="h2" className="mt-2">
            Alles an einem Ort.
          </Heading>
          <p className="mt-6 text-lg/8 text-gray-600">
            Ihr gesamtes Team arbeitet in einer Plattform – von der Idee bis zur fertigen Kampagne.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {teamFeatures.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base/7 font-semibold text-gray-900">
                  <div className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-gray-900">
                    <feature.icon aria-hidden="true" className="size-6 text-white" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base/7 text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </div>
  )
}


// =============================================================================
// MAIN PAGE
// =============================================================================
export default function Features() {
  return (
    <main className="overflow-hidden">
      <GradientBackground />
      <Container>
        <Navbar />
      </Container>
      <Header />
      <AIContentSection />
      <CRMSection />
      <MonitoringSection />
      <TeamSection />
      <Footer />
    </main>
  )
}
