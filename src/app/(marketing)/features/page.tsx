import { BentoCard } from '@/components/marketing/bento-card'
import { Button } from '@/components/marketing/Button'
import { Container } from '@/components/marketing/Container'
import { Footer } from '@/components/marketing/Footer'
import { Gradient } from '@/components/marketing/gradient'
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
// 1. HERO SECTION
// =============================================================================
function Hero() {
  return (
    <div className="relative">
      <Gradient className="absolute inset-2 bottom-0 rounded-4xl ring-1 ring-black/5 ring-inset" />
      <Container className="relative">
        <Navbar />
        <div className="pt-16 pb-24 sm:pt-24 sm:pb-32 md:pt-32 md:pb-48">
          <h1 className="font-display text-6xl/[0.9] font-medium tracking-tight text-balance text-gray-950 sm:text-8xl/[0.8] md:text-9xl/[0.8]">
            PR ohne Kompromisse.
          </h1>
          <p className="mt-8 max-w-xl text-xl/7 font-medium text-gray-950/75 sm:text-2xl/8">
            Vom ersten Entwurf bis zur globalen Kampagne: CeleroPress ist das
            einzige Tool, das mit Ihren Ambitionen wächst. Einfach für
            Einsteiger, mächtig für Profis.
          </p>
          <div className="mt-12 flex flex-col gap-x-6 gap-y-4 sm:flex-row">
            <Button href="/signup">Kostenlos starten</Button>
            <Button variant="secondary" href="/pricing">
              Live-Demo buchen
            </Button>
          </div>
        </div>
      </Container>
    </div>
  )
}

// =============================================================================
// 2. KI & CONTENT SECTION (Dark, mit Screenshot)
// =============================================================================
function AIContentSection() {
  return (
    <div className="mx-2 mt-2 rounded-4xl bg-gray-900 py-32">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Text Links */}
          <div>
            <Subheading dark>Intelligente Content-Erstellung</Subheading>
            <Heading as="h2" dark className="mt-2">
              Ihre Pressemitteilung. In Minuten fertig. Oder bis ins Detail
              perfektioniert.
            </Heading>
            <p className="mt-6 text-lg/8 text-gray-300">
              Schluss mit Schreibblockaden. Nutzen Sie unsere KI als Turbo für
              schnelle News oder als strategischen Partner für komplexe Storys.
            </p>

            <dl className="mt-10 space-y-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-white">
                    Schnellstart
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-400">
                    Generieren Sie komplette Pressemitteilungen aus Stichpunkten
                    – perfekt für Einsteiger.
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <MagnifyingGlassIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-white">
                    Deep Dive
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-400">
                    Nutzen Sie SEO-Analysen und Stil-Optimierung für maximale
                    Reichweite – für Profis.
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <PencilSquareIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-white">
                    Perfekter Stil
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-400">
                    Automatische Korrektur von Tonalität und Grammatik für
                    professionelle Ergebnisse.
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Screenshot Rechts */}
          <div className="relative">
            <Screenshot
              width={1216}
              height={768}
              src="/screenshots/app.png"
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
          <div className="relative order-2 lg:order-1">
            <Screenshot
              width={1216}
              height={768}
              src="/screenshots/profile.png"
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
              Verwalten Sie Ihre Kontakte nicht nur – aktivieren Sie sie. Ob
              lokaler Verteiler oder internationale Kampagne.
            </p>

            <dl className="mt-10 space-y-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <UserGroupIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-gray-900">
                    Smart
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-600">
                    Importieren Sie Kontakte per CSV oder nutzen Sie kuratierte
                    Journalisten-Listen.
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ArrowPathIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-gray-900">Pro</dt>
                  <dd className="mt-1 text-sm/6 text-gray-600">
                    Dynamische Verteiler, die sich selbst aktualisieren und
                    Reply-Tracking direkt ins CRM.
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ShieldCheckIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <dt className="text-base font-semibold text-gray-900">
                    Sicher
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-600">
                    Verifizierte Absender-Domains für garantierte
                    Zustellbarkeit.
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
          {/* Box 1 - Groß: Media Monitoring */}
          <BentoCard
            eyebrow="Echtzeit"
            title="Media Monitoring"
            description="Verpassen Sie keine Erwähnung. Automatisches Crawling von RSS-Feeds und News-Seiten findet Ihre Clippings."
            graphic={
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <RssIcon className="h-24 w-24 text-primary/40" />
              </div>
            }
            className="sm:col-span-2 lg:col-span-2 lg:row-span-2"
          />

          {/* Box 2 - AVE-Berechnung */}
          <BentoCard
            eyebrow="ROI"
            title="AVE-Berechnung"
            description="Der wahre Wert Ihrer PR. Berechnen Sie den Advertising Value Equivalent automatisch."
            graphic={
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                <CurrencyEuroIcon className="h-20 w-20 text-emerald-500/40" />
              </div>
            }
            className="lg:col-span-1"
          />

          {/* Box 3 - Auto-Clipping */}
          <BentoCard
            eyebrow="Automatisch"
            title="Auto-Clipping"
            description="Kein Copy-Paste mehr. Treffer werden automatisch Ihren Kampagnen zugeordnet."
            graphic={
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                <BoltIcon className="h-20 w-20 text-amber-500/40" />
              </div>
            }
            className="lg:col-span-1"
          />

          {/* Box 4 - Reporting */}
          <BentoCard
            eyebrow="Reports"
            title="Reporting"
            description="Vom Öffnungs-Tracking bis zum Vorstands-Report – alle Daten auf Knopfdruck."
            graphic={
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-500/5">
                <DocumentChartBarIcon className="h-20 w-20 text-violet-500/40" />
              </div>
            }
            className="sm:col-span-2 lg:col-span-2"
          />
        </div>
      </Container>
    </div>
  )
}

// =============================================================================
// 5. MEDIA ASSETS & TEAM (2x2 Grid)
// =============================================================================
function TeamSection() {
  return (
    <div className="py-32">
      <Container>
        <div className="text-center">
          <Subheading>Zusammenarbeit</Subheading>
          <Heading as="h2" className="mt-2">
            Alles an einem Ort. Für das ganze Team.
          </Heading>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {/* Block 1: Media Hub */}
          <div className="relative rounded-2xl border border-gray-200 bg-white p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <PhotoIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              Zentraler Asset-Speicher
            </h3>
            <p className="mt-2 text-sm/6 text-gray-600">
              Bilder & Videos per Drag & Drop. Teilen Sie Pressemappen via
              gebrandetem Link – Passwortschutz inklusive.
            </p>
          </div>

          {/* Block 2: Projekt-Management */}
          <div className="relative rounded-2xl border border-gray-200 bg-white p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <ViewColumnsIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              Kanban für PR
            </h3>
            <p className="mt-2 text-sm/6 text-gray-600">
              Vom &quot;To-Do&quot; zum &quot;Published&quot;. Behalten Sie den
              Status aller Kampagnen im Blick.
            </p>
          </div>

          {/* Block 3: Kollaboration */}
          <div className="relative rounded-2xl border border-gray-200 bg-white p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              Chat & Feedback
            </h3>
            <p className="mt-2 text-sm/6 text-gray-600">
              Diskutieren Sie Entwürfe direkt im Tool. @Mentions und Emojis für
              schnelle Abstimmungen.
            </p>
          </div>

          {/* Block 4: Sicherheit */}
          <div className="relative rounded-2xl border border-gray-200 bg-white p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <LockClosedIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              Enterprise Ready
            </h3>
            <p className="mt-2 text-sm/6 text-gray-600">
              DSGVO-konform, Rollenrechte (Admin/Viewer) und strikte
              Datentrennung zwischen Mandanten.
            </p>
          </div>
        </div>
      </Container>
    </div>
  )
}

// =============================================================================
// 6. CTA SECTION
// =============================================================================
function CTASection() {
  return (
    <div className="relative py-32">
      <Gradient className="absolute inset-2 rounded-4xl ring-1 ring-black/5 ring-inset" />
      <Container className="relative">
        <div className="text-center">
          <Heading as="h2">Bereit für bessere PR?</Heading>
          <p className="mx-auto mt-6 max-w-xl text-lg/8 text-gray-600">
            Starten Sie einfach und schalten Sie die Profi-Tools frei, wenn Sie
            sie brauchen. Keine Kreditkarte erforderlich.
          </p>
          <div className="mt-10 flex justify-center gap-x-6">
            <Button href="/signup">Kostenlos registrieren</Button>
          </div>
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
    <div className="overflow-hidden">
      <Hero />
      <main>
        <AIContentSection />
        <CRMSection />
        <MonitoringSection />
        <TeamSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
