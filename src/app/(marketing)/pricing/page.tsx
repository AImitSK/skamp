import { Button } from '@/components/marketing/Button'
import { Container } from '@/components/marketing/Container'
import { Footer } from '@/components/marketing/Footer'
import { Gradient } from '@/components/marketing/gradient'
import { LogoCloud } from '@/components/marketing/logo-cloud'
import { Navbar } from '@/components/marketing/navbar'
import { Heading, Lead, Subheading } from '@/components/marketing/text'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  CheckIcon,
  ChevronUpDownIcon,
  MinusIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { Link } from '@/components/marketing/link'

export const metadata: Metadata = {
  title: 'Preise',
  description:
    'Wähle das passende Paket für deine PR-Arbeit. Alle Pläne mit 14 Tagen Geld-zurück-Garantie.',
}

const tiers = [
  {
    name: 'Starter' as const,
    slug: 'STARTER',
    description: 'Perfekt für den Start in die PR-Arbeit.',
    priceMonthly: 49,
    priceYearly: 490,
    href: '/signup?plan=STARTER',
    highlights: [
      { description: '1 Nutzer' },
      { description: '1.000 Kontakte' },
      { description: '2.500 E-Mails pro Monat' },
      { description: '50.000 AI-Wörter pro Monat' },
      { description: '5 GB Cloud-Speicher' },
    ],
    features: [
      { section: 'Versand', name: 'E-Mails pro Monat', value: '2.500' },
      { section: 'Versand', name: 'Kontakte', value: '1.000' },
      { section: 'Versand', name: 'Verteilerlisten', value: 'Unlimited' },
      { section: 'Team', name: 'Nutzer', value: '1' },
      { section: 'KI-Features', name: 'AI-Wörter pro Monat', value: '50.000' },
      { section: 'KI-Features', name: 'Journalisten-Datenbank', value: false },
      { section: 'Speicher', name: 'Cloud-Speicher', value: '5 GB' },
      { section: 'Support', name: 'E-Mail Support', value: true },
      { section: 'Support', name: 'Chat Support', value: false },
      { section: 'Support', name: 'Telefon Support', value: false },
      { section: 'Onboarding', name: 'Persönliches Onboarding', value: false },
    ],
  },
  {
    name: 'Business' as const,
    slug: 'BUSINESS',
    description: 'Für wachsende Teams und mehr Reichweite.',
    priceMonthly: 149,
    priceYearly: 1490,
    href: '/signup?plan=BUSINESS',
    highlights: [
      { description: '3 Nutzer' },
      { description: '5.000 Kontakte' },
      { description: '10.000 E-Mails pro Monat' },
      { description: 'Unlimited AI-Wörter' },
      { description: 'Journalisten-Datenbank Zugriff' },
      { description: '25 GB Cloud-Speicher' },
    ],
    features: [
      { section: 'Versand', name: 'E-Mails pro Monat', value: '10.000' },
      { section: 'Versand', name: 'Kontakte', value: '5.000' },
      { section: 'Versand', name: 'Verteilerlisten', value: 'Unlimited' },
      { section: 'Team', name: 'Nutzer', value: '3' },
      { section: 'KI-Features', name: 'AI-Wörter pro Monat', value: 'Unlimited' },
      { section: 'KI-Features', name: 'Journalisten-Datenbank', value: true },
      { section: 'Speicher', name: 'Cloud-Speicher', value: '25 GB' },
      { section: 'Support', name: 'E-Mail Support', value: true },
      { section: 'Support', name: 'Chat Support', value: true },
      { section: 'Support', name: 'Telefon Support', value: false },
      { section: 'Onboarding', name: 'Persönliches Onboarding', value: '1h Video-Call' },
    ],
  },
  {
    name: 'Agentur' as const,
    slug: 'AGENTUR',
    description: 'Für Agenturen und professionelle PR-Teams.',
    priceMonthly: 399,
    priceYearly: 3990,
    href: '/signup?plan=AGENTUR',
    highlights: [
      { description: '10 Nutzer (+ €20/Monat für weitere)' },
      { description: '25.000 Kontakte' },
      { description: '50.000 E-Mails pro Monat' },
      { description: 'Unlimited AI-Wörter' },
      { description: 'Journalisten-Datenbank Zugriff' },
      { description: '100 GB Cloud-Speicher' },
    ],
    features: [
      { section: 'Versand', name: 'E-Mails pro Monat', value: '50.000' },
      { section: 'Versand', name: 'Kontakte', value: '25.000' },
      { section: 'Versand', name: 'Verteilerlisten', value: 'Unlimited' },
      { section: 'Team', name: 'Nutzer', value: '10 (+€20/Nutzer)' },
      { section: 'KI-Features', name: 'AI-Wörter pro Monat', value: 'Unlimited' },
      { section: 'KI-Features', name: 'Journalisten-Datenbank', value: true },
      { section: 'Speicher', name: 'Cloud-Speicher', value: '100 GB' },
      { section: 'Support', name: 'E-Mail Support', value: true },
      { section: 'Support', name: 'Chat Support', value: true },
      { section: 'Support', name: 'Telefon Support', value: true },
      { section: 'Onboarding', name: 'Persönliches Onboarding', value: 'Dedicated Support' },
    ],
  },
]

function Header() {
  return (
    <Container className="mt-16">
      <Heading as="h1">Preise, die mit deinem Team wachsen.</Heading>
      <Lead className="mt-6 max-w-3xl">
        Wähle das passende Paket für deine PR-Arbeit. Alle Pläne mit 14 Tagen Geld-zurück-Garantie.
        Keine versteckten Kosten.
      </Lead>
    </Container>
  )
}

function PricingCards() {
  return (
    <div className="relative py-24">
      <Gradient className="absolute inset-x-2 top-48 bottom-0 rounded-4xl ring-1 ring-black/5 ring-inset" />
      <Container className="relative">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier, tierIndex) => (
            <PricingCard key={tierIndex} tier={tier} />
          ))}
        </div>
        <LogoCloud className="mt-24" />
      </Container>
    </div>
  )
}

function PricingCard({ tier }: { tier: (typeof tiers)[number] }) {
  return (
    <div className="-m-2 grid grid-cols-1 rounded-4xl shadow-[inset_0_0_2px_1px_#ffffff4d] ring-1 ring-black/5 max-lg:mx-auto max-lg:w-full max-lg:max-w-md">
      <div className="grid grid-cols-1 rounded-4xl p-2 shadow-md shadow-black/5">
        <div className="rounded-3xl bg-white p-10 pb-9 shadow-2xl ring-1 ring-black/5">
          <Subheading>{tier.name}</Subheading>
          <p className="mt-2 text-sm/6 text-gray-950/75">{tier.description}</p>
          <div className="mt-8 flex items-center gap-4">
            <div className="text-5xl font-medium text-gray-950">
              €{tier.priceMonthly}
            </div>
            <div className="text-sm/5 text-gray-950/75">
              <p>pro Monat</p>
              <p className="text-xs text-gray-600">€{tier.priceYearly}/Jahr</p>
            </div>
          </div>
          <div className="mt-8">
            <Button href={tier.href} className="bg-primary hover:bg-primary-hover">
              Jetzt starten
            </Button>
          </div>
          <div className="mt-8">
            <h3 className="text-sm/6 font-medium text-gray-950">
              Highlights:
            </h3>
            <ul className="mt-3 space-y-3">
              {tier.highlights.map((props, featureIndex) => (
                <FeatureItem key={featureIndex} {...props} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function PricingTable({
  selectedTier,
}: {
  selectedTier: (typeof tiers)[number]
}) {
  return (
    <Container className="py-24">
      <table className="w-full text-left">
        <caption className="sr-only">Detaillierter Preisvergleich</caption>
        <colgroup>
          <col className="w-3/5 sm:w-2/5" />
          <col
            data-selected={selectedTier === tiers[0] ? true : undefined}
            className="w-2/5 data-selected:table-column max-sm:hidden sm:w-1/5"
          />
          <col
            data-selected={selectedTier === tiers[1] ? true : undefined}
            className="w-2/5 data-selected:table-column max-sm:hidden sm:w-1/5"
          />
          <col
            data-selected={selectedTier === tiers[2] ? true : undefined}
            className="w-2/5 data-selected:table-column max-sm:hidden sm:w-1/5"
          />
        </colgroup>
        <thead>
          <tr className="max-sm:hidden">
            <td className="p-0" />
            {tiers.map((tier) => (
              <th
                key={tier.slug}
                scope="col"
                data-selected={selectedTier === tier ? true : undefined}
                className="p-0 data-selected:table-cell max-sm:hidden"
              >
                <Subheading as="div">{tier.name}</Subheading>
              </th>
            ))}
          </tr>
          <tr className="sm:hidden">
            <td className="p-0">
              <div className="relative inline-block">
                <Menu>
                  <MenuButton className="flex items-center justify-between gap-2 font-medium">
                    {selectedTier.name}
                    <ChevronUpDownIcon className="size-4 fill-gray-900" />
                  </MenuButton>
                  <MenuItems
                    anchor="bottom start"
                    className="min-w-(--button-width) rounded-lg bg-white p-1 shadow-lg ring-1 ring-gray-200 [--anchor-gap:6px] [--anchor-offset:-4px] [--anchor-padding:10px]"
                  >
                    {tiers.map((tier) => (
                      <MenuItem key={tier.slug}>
                        <Link
                          scroll={false}
                          href={`/pricing?tier=${tier.slug}`}
                          data-selected={
                            tier === selectedTier ? true : undefined
                          }
                          className="group flex items-center gap-2 rounded-md px-2 py-1 data-focus:bg-gray-200"
                        >
                          {tier.name}
                          <CheckIcon className="hidden size-4 group-data-selected:block" />
                        </Link>
                      </MenuItem>
                    ))}
                  </MenuItems>
                </Menu>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                  <ChevronUpDownIcon className="size-4 fill-gray-900" />
                </div>
              </div>
            </td>
            <td colSpan={3} className="p-0 text-right">
              <Button variant="outline" href={selectedTier.href} className="border-primary text-primary hover:bg-primary-50">
                Jetzt starten
              </Button>
            </td>
          </tr>
          <tr className="max-sm:hidden">
            <th className="p-0" scope="row">
              <span className="sr-only">Jetzt starten</span>
            </th>
            {tiers.map((tier) => (
              <td
                key={tier.slug}
                data-selected={selectedTier === tier ? true : undefined}
                className="px-0 pt-4 pb-0 data-selected:table-cell max-sm:hidden"
              >
                <Button variant="outline" href={tier.href} className="border-primary text-primary hover:bg-primary-50">
                  Jetzt starten
                </Button>
              </td>
            ))}
          </tr>
        </thead>
        {[...new Set(tiers[0].features.map(({ section }) => section))].map(
          (section) => (
            <tbody key={section} className="group">
              <tr>
                <th
                  scope="colgroup"
                  colSpan={4}
                  className="px-0 pt-10 pb-0 group-first-of-type:pt-5"
                >
                  <div className="-mx-4 rounded-lg bg-gray-50 px-4 py-3 text-sm/6 font-semibold">
                    {section}
                  </div>
                </th>
              </tr>
              {tiers[0].features
                .filter((feature) => feature.section === section)
                .map(({ name }) => (
                  <tr
                    key={name}
                    className="border-b border-gray-100 last:border-none"
                  >
                    <th
                      scope="row"
                      className="px-0 py-4 text-sm/6 font-normal text-gray-600"
                    >
                      {name}
                    </th>
                    {tiers.map((tier) => {
                      let value = tier.features.find(
                        (feature) =>
                          feature.section === section && feature.name === name,
                      )?.value

                      return (
                        <td
                          key={tier.slug}
                          data-selected={
                            selectedTier === tier ? true : undefined
                          }
                          className="p-4 data-selected:table-cell max-sm:hidden"
                        >
                          {value === true ? (
                            <>
                              <CheckIcon className="size-4 fill-green-600" />
                              <span className="sr-only">
                                Enthalten in {tier.name}
                              </span>
                            </>
                          ) : value === false || value === undefined ? (
                            <>
                              <MinusIcon className="size-4 fill-gray-400" />
                              <span className="sr-only">
                                Nicht enthalten in {tier.name}
                              </span>
                            </>
                          ) : (
                            <div className="text-sm/6">{value}</div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
            </tbody>
          ),
        )}
      </table>
    </Container>
  )
}

function FeatureItem({
  description,
  disabled = false,
}: {
  description: string
  disabled?: boolean
}) {
  return (
    <li
      data-disabled={disabled ? true : undefined}
      className="flex items-start gap-4 text-sm/6 text-gray-950/75 data-disabled:text-gray-950/25"
    >
      <span className="inline-flex h-6 items-center">
        <PlusIcon className="size-3.75 shrink-0 fill-gray-950/25" />
      </span>
      {disabled && <span className="sr-only">Nicht enthalten:</span>}
      {description}
    </li>
  )
}

function PlusIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 15 15" aria-hidden="true" {...props}>
      <path clipRule="evenodd" d="M8 0H7v7H0v1h7v7h1V8h7V7H8V0z" />
    </svg>
  )
}

function FrequentlyAskedQuestions() {
  return (
    <Container>
      <section id="faqs" className="scroll-mt-8">
        <Subheading className="text-center">
          Häufig gestellte Fragen
        </Subheading>
        <Heading as="div" className="mt-2 text-center">
          Deine Fragen beantwortet.
        </Heading>
        <div className="mx-auto mt-16 mb-32 max-w-xl space-y-12">
          <dl>
            <dt className="text-sm font-semibold">
              Kann ich jederzeit kündigen?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              Ja, du kannst dein Abo jederzeit kündigen. Es gibt keine Mindestlaufzeit.
              Bei jährlicher Zahlung erhältst du eine anteilige Rückerstattung für die
              verbleibenden Monate.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              Was passiert mit meinen Daten bei einer Kündigung?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              Deine Daten bleiben für 30 Tage nach der Kündigung gespeichert,
              sodass du jederzeit reaktivieren kannst. Danach werden alle Daten
              dauerhaft gelöscht. Du kannst vorher einen Export deiner Daten anfordern.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              Kann ich zwischen Plänen wechseln?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              Ja, du kannst jederzeit upgraden oder downgraden. Bei einem Upgrade
              wird die Differenz anteilig berechnet. Bei einem Downgrade gilt der
              neue Preis ab dem nächsten Abrechnungszeitraum.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              Welche Zahlungsmethoden werden akzeptiert?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              Wir akzeptieren alle gängigen Kreditkarten (Visa, Mastercard, American Express)
              sowie SEPA-Lastschrift für europäische Kunden. Die Zahlung wird sicher über
              Stripe abgewickelt.
            </dd>
          </dl>
        </div>
      </section>
    </Container>
  )
}

export default async function Pricing({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  let params = await searchParams
  let tier =
    typeof params.tier === 'string'
      ? tiers.find(({ slug }) => slug === params.tier)!
      : tiers[1] // Default: BUSINESS

  return (
    <main className="overflow-hidden">
      <Container>
        <Navbar />
      </Container>
      <Header />
      <PricingCards />
      <PricingTable selectedTier={tier} />
      <FrequentlyAskedQuestions />
      <Footer />
    </main>
  )
}
