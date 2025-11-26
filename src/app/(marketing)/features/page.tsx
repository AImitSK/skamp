import { Container } from '@/components/marketing/Container'
import { Footer } from '@/components/marketing/Footer'
import { Gradient } from '@/components/marketing/gradient'
import { Navbar } from '@/components/marketing/navbar'
import { Heading, Lead, Subheading } from '@/components/marketing/text'
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  ListBulletIcon,
  TagIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  BeakerIcon,
  CheckBadgeIcon,
  DocumentArrowDownIcon,
  ArrowUturnLeftIcon,
  RssIcon,
  AdjustmentsHorizontalIcon,
  BoltIcon,
  ChartBarIcon,
  ArchiveBoxIcon,
  PhotoIcon,
  CloudArrowUpIcon,
  FolderIcon,
  ShareIcon,
  LockClosedIcon,
  EyeIcon,
  NewspaperIcon,
  GlobeAltIcon,
  PresentationChartLineIcon,
  RectangleStackIcon,
  RocketLaunchIcon,
  ViewColumnsIcon,
  UsersIcon,
  LinkIcon,
  ChatBubbleLeftRightIcon,
  AtSymbolIcon,
  DocumentIcon,
  FaceSmileIcon,
  ChartPieIcon,
  CursorArrowRaysIcon,
  SignalIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  ServerStackIcon,
  FingerPrintIcon,
} from '@heroicons/react/24/outline'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Features - CeleroPress',
  description:
    'Entdecke alle Funktionen von CeleroPress: KI-gestützte Pressemitteilungen, Medien-Monitoring, Email-Kampagnen und mehr.',
}

// Feature-Kategorien mit allen Features
const featureCategories = [
  {
    id: 'ki',
    name: 'KI-Funktionen',
    description: 'Künstliche Intelligenz für effizientere PR-Arbeit',
    color: 'indigo',
    features: [
      {
        name: 'KI-Assistent für Pressemitteilungen',
        description: 'Erstellen Sie professionelle Pressemitteilungen in Minuten mit unserem KI-gestützten Schreibassistenten.',
        icon: SparklesIcon,
      },
      {
        name: 'PR-SEO-Analyse',
        description: 'Optimieren Sie Ihre Pressemitteilungen für Suchmaschinen mit automatischer Keyword-Analyse und SEO-Empfehlungen.',
        icon: MagnifyingGlassIcon,
      },
      {
        name: 'KI-Textbearbeitungstools',
        description: 'Verbessern Sie Ihre Texte mit intelligenten Vorschlägen für Stil, Tonalität und Lesbarkeit.',
        icon: PencilSquareIcon,
      },
    ],
  },
  {
    id: 'crm',
    name: 'Kontakt- & CRM-Management',
    description: 'Alle Medienkontakte zentral verwalten',
    color: 'emerald',
    features: [
      {
        name: 'Medienkontakt-Datenbank',
        description: 'Verwalten Sie Journalisten, Redakteure und Medienunternehmen zentral an einem Ort.',
        icon: UserGroupIcon,
      },
      {
        name: 'Premium-Journalisten-Datenbank',
        description: 'Greifen Sie auf eine kuratierte Datenbank mit verifizierten Journalisten inkl. Themenschwerpunkten zu.',
        icon: BuildingOffice2Icon,
      },
      {
        name: 'Intelligente Verteilerlisten',
        description: 'Erstellen Sie dynamische Verteiler, die sich automatisch basierend auf Ihren Filterkriterien aktualisieren.',
        icon: ListBulletIcon,
      },
      {
        name: 'Tag-System & Kategorisierung',
        description: 'Organisieren Sie Kontakte flexibel mit benutzerdefinierten Tags und Kategorien.',
        icon: TagIcon,
      },
      {
        name: 'Import & Export',
        description: 'Importieren Sie bestehende Kontakte per CSV und exportieren Sie Listen nach Excel.',
        icon: ArrowDownTrayIcon,
      },
    ],
  },
  {
    id: 'email',
    name: 'Kampagnen & E-Mail-Versand',
    description: 'Professionelle PR-Kampagnen versenden',
    color: 'blue',
    features: [
      {
        name: 'E-Mail-Composer mit Personalisierung',
        description: 'Versenden Sie personalisierte Pressemitteilungen mit automatischer Anrede und individuellen Variablen.',
        icon: EnvelopeIcon,
      },
      {
        name: 'Geplanter Versand',
        description: 'Planen Sie den Versand Ihrer Kampagnen für den optimalen Zeitpunkt.',
        icon: CalendarDaysIcon,
      },
      {
        name: 'Test-E-Mail-Funktion',
        description: 'Prüfen Sie Ihre E-Mails vor dem Versand mit einer Testmail an sich selbst.',
        icon: BeakerIcon,
      },
      {
        name: 'Verifizierte Absender-Domains',
        description: 'Versenden Sie E-Mails von Ihrer eigenen Domain für maximale Zustellbarkeit.',
        icon: CheckBadgeIcon,
      },
      {
        name: 'PDF-Anhang-Generierung',
        description: 'Pressemitteilungen werden automatisch als professionelles PDF angehängt.',
        icon: DocumentArrowDownIcon,
      },
      {
        name: 'Reply-Tracking',
        description: 'Antworten von Journalisten landen automatisch in Ihrem CRM.',
        icon: ArrowUturnLeftIcon,
      },
    ],
  },
  {
    id: 'monitoring',
    name: 'Medien-Monitoring & Clipping',
    description: 'Veröffentlichungen automatisch finden',
    color: 'amber',
    features: [
      {
        name: 'Automatisches Medien-Monitoring',
        description: 'Finden Sie automatisch Veröffentlichungen zu Ihren Pressemitteilungen durch tägliches RSS-Feed-Crawling.',
        icon: RssIcon,
      },
      {
        name: 'Keyword-basierte Erkennung',
        description: 'Intelligenter Abgleich Ihrer Kampagnen-Keywords mit veröffentlichten Artikeln.',
        icon: AdjustmentsHorizontalIcon,
      },
      {
        name: 'Auto-Confirm bei hoher Trefferquote',
        description: 'Bei eindeutigen Treffern werden Clippings automatisch zugeordnet.',
        icon: BoltIcon,
      },
      {
        name: 'AVE-Berechnung',
        description: 'Berechnen Sie den Werbewert Ihrer Medienberichterstattung (Advertising Value Equivalent).',
        icon: ChartBarIcon,
      },
      {
        name: 'Clipping-Archiv',
        description: 'Alle gefundenen Veröffentlichungen übersichtlich dokumentiert und durchsuchbar.',
        icon: ArchiveBoxIcon,
      },
    ],
  },
  {
    id: 'media',
    name: 'Media-Bibliothek & Assets',
    description: 'Medien zentral verwalten und teilen',
    color: 'violet',
    features: [
      {
        name: 'Zentrale Medienverwaltung',
        description: 'Verwalten Sie Bilder, Videos, Dokumente und Logos an einem zentralen Ort.',
        icon: PhotoIcon,
      },
      {
        name: 'Drag & Drop Upload',
        description: 'Laden Sie mehrere Dateien gleichzeitig per Drag & Drop hoch.',
        icon: CloudArrowUpIcon,
      },
      {
        name: 'Ordner-Struktur',
        description: 'Organisieren Sie Ihre Medien in beliebig verschachtelten Ordnern.',
        icon: FolderIcon,
      },
      {
        name: 'Share-Links mit Branding',
        description: 'Teilen Sie Pressemappen mit eigenem Logo und Unternehmensfarben.',
        icon: ShareIcon,
      },
      {
        name: 'Passwort-geschützte Freigaben',
        description: 'Schützen Sie sensible Materialien mit optionalem Passwortschutz.',
        icon: LockClosedIcon,
      },
      {
        name: 'Download-Tracking',
        description: 'Sehen Sie, wann und wie oft Ihre geteilten Dateien heruntergeladen wurden.',
        icon: EyeIcon,
      },
    ],
  },
  {
    id: 'publications',
    name: 'Publikations-Datenbank',
    description: 'Alle Medien im Überblick',
    color: 'rose',
    features: [
      {
        name: 'Medien-Verzeichnis',
        description: 'Übersicht aller relevanten Publikationen mit Reichweiten und Kontaktdaten.',
        icon: NewspaperIcon,
      },
      {
        name: 'Multi-Format-Support',
        description: 'Zeitungen, Magazine, Online-Medien, TV und Radio in einer Datenbank.',
        icon: GlobeAltIcon,
      },
      {
        name: 'Metriken & Reichweiten',
        description: 'Auflagenzahlen, Online-Traffic und Zielgruppen-Daten auf einen Blick.',
        icon: PresentationChartLineIcon,
      },
      {
        name: 'RSS-Feed-Integration',
        description: 'Automatische Erkennung und Einbindung von RSS-Feeds für das Monitoring.',
        icon: RectangleStackIcon,
      },
    ],
  },
  {
    id: 'projects',
    name: 'Projekt-Management',
    description: 'PR-Projekte effizient steuern',
    color: 'cyan',
    features: [
      {
        name: 'Projekt-Wizard',
        description: 'Erstellen Sie neue PR-Projekte in wenigen Schritten mit automatischer Ressourcen-Anlage.',
        icon: RocketLaunchIcon,
      },
      {
        name: 'Kanban-Board',
        description: 'Visualisieren Sie den Status Ihrer Projekte auf einem übersichtlichen Board.',
        icon: ViewColumnsIcon,
      },
      {
        name: 'Team-Zuordnung',
        description: 'Weisen Sie Projekte Team-Mitgliedern zu und definieren Sie Verantwortlichkeiten.',
        icon: UsersIcon,
      },
      {
        name: 'Automatische Kampagnen-Verknüpfung',
        description: 'Neue Projekte erstellen automatisch verknüpfte PR-Kampagnen.',
        icon: LinkIcon,
      },
    ],
  },
  {
    id: 'communication',
    name: 'Team-Kommunikation',
    description: 'Zusammenarbeit in Echtzeit',
    color: 'teal',
    features: [
      {
        name: 'Projekt-Chat',
        description: 'Kommunizieren Sie in Echtzeit mit Ihrem Team direkt im Projekt-Kontext.',
        icon: ChatBubbleLeftRightIcon,
      },
      {
        name: '@-Mentions',
        description: 'Erwähnen Sie Team-Mitglieder und erhalten Sie Push-Benachrichtigungen.',
        icon: AtSymbolIcon,
      },
      {
        name: 'Datei-Sharing im Chat',
        description: 'Teilen Sie Assets direkt aus der Media-Bibliothek im Chat.',
        icon: DocumentIcon,
      },
      {
        name: 'Reaktionen & Feedback',
        description: 'Reagieren Sie auf Nachrichten mit Emojis für schnelles Feedback.',
        icon: FaceSmileIcon,
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics & Reporting',
    description: 'Erfolge messen und auswerten',
    color: 'orange',
    features: [
      {
        name: 'E-Mail-Performance',
        description: 'Öffnungsraten, Klickraten und Bounce-Statistiken für jede Kampagne.',
        icon: ChartPieIcon,
      },
      {
        name: 'Kampagnen-Dashboard',
        description: 'Alle wichtigen Kennzahlen Ihrer PR-Aktivitäten auf einen Blick.',
        icon: CursorArrowRaysIcon,
      },
      {
        name: 'Clipping-Statistiken',
        description: 'Auswertung Ihrer Medienresonanz mit Reichweiten und Sentiment.',
        icon: SignalIcon,
      },
    ],
  },
  {
    id: 'security',
    name: 'Sicherheit & Multi-Tenancy',
    description: 'Sicher und datenschutzkonform',
    color: 'slate',
    features: [
      {
        name: 'Team-Verwaltung',
        description: 'Laden Sie Kollegen ein und verwalten Sie Berechtigungen.',
        icon: UserPlusIcon,
      },
      {
        name: 'Rollen-System',
        description: 'Admin, Editor und Viewer-Rollen für granulare Zugriffssteuerung.',
        icon: ShieldCheckIcon,
      },
      {
        name: 'Daten-Isolation',
        description: 'Vollständige Trennung der Daten zwischen verschiedenen Organisationen.',
        icon: ServerStackIcon,
      },
      {
        name: 'DSGVO-konform',
        description: 'Alle Daten werden sicher in der EU gespeichert und verarbeitet.',
        icon: FingerPrintIcon,
      },
    ],
  },
]

function Header() {
  return (
    <Container className="mt-16">
      <Heading as="h1">Alle Funktionen im Überblick</Heading>
      <Lead className="mt-6 max-w-3xl">
        CeleroPress bietet alles, was Sie für erfolgreiche PR-Arbeit brauchen.
        Von KI-gestützter Content-Erstellung bis zum automatischen Medien-Monitoring.
      </Lead>
    </Container>
  )
}

function FeatureGrid({ category }: { category: typeof featureCategories[number] }) {
  return (
    <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
      <dl className="mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 text-base/7 text-gray-600 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
        {category.features.map((feature) => (
          <div key={feature.name} className="relative pl-9">
            <dt className="inline font-semibold text-gray-900">
              <feature.icon
                aria-hidden="true"
                className="absolute left-1 top-1 size-5 text-primary"
              />
              {feature.name}
            </dt>{' '}
            <dd className="inline">{feature.description}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function FeatureSection({ category, index }: { category: typeof featureCategories[number]; index: number }) {
  const isEven = index % 2 === 0

  return (
    <div className={`py-24 sm:py-32 ${isEven ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl sm:text-center">
          <Subheading>{category.name}</Subheading>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-4xl sm:text-balance">
            {category.description}
          </p>
        </div>
      </div>
      <FeatureGrid category={category} />
    </div>
  )
}

function HeroSection() {
  // KI-Features als Hero-Sektion
  const kiCategory = featureCategories[0]

  return (
    <div className="relative py-24 sm:py-32">
      <Gradient className="absolute inset-x-2 top-0 bottom-0 rounded-4xl ring-1 ring-black/5 ring-inset" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl sm:text-center">
          <Subheading>Powered by AI</Subheading>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl sm:text-balance">
            Künstliche Intelligenz für Ihre PR-Arbeit
          </p>
          <p className="mt-6 text-lg/8 text-gray-600">
            Unsere KI-Tools helfen Ihnen, professionelle Pressemitteilungen zu erstellen,
            SEO-Optimierungen durchzuführen und Ihre Texte zu perfektionieren.
          </p>
        </div>
      </div>

      {/* KI-Features Grid */}
      <div className="relative mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
        <dl className="mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 text-base/7 text-gray-600 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
          {kiCategory.features.map((feature) => (
            <div key={feature.name} className="relative pl-9">
              <dt className="inline font-semibold text-gray-900">
                <feature.icon
                  aria-hidden="true"
                  className="absolute left-1 top-1 size-5 text-primary"
                />
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

export default function Features() {
  // Alle Kategorien außer KI (die wird im Hero angezeigt)
  const otherCategories = featureCategories.slice(1)

  return (
    <main className="overflow-hidden">
      <Container>
        <Navbar />
      </Container>
      <Header />
      <HeroSection />

      {otherCategories.map((category, index) => (
        <FeatureSection key={category.id} category={category} index={index} />
      ))}

      <Footer />
    </main>
  )
}
