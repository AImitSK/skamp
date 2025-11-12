import { AnimatedNumber } from '@/components/marketing/animated-number'
import { Button } from '@/components/marketing/Button'
import { Container } from '@/components/marketing/Container'
import { Footer } from '@/components/marketing/Footer'
import { GradientBackground } from '@/components/marketing/gradient'
import { Navbar } from '@/components/marketing/navbar'
import { Heading, Lead, Subheading } from '@/components/marketing/text'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Unternehmen - CeleroPress',
  description:
    'Wir haben es uns zur Aufgabe gemacht, PR-Arbeit durch intelligente Technologie zu transformieren.',
}

function Header() {
  return (
    <Container className="mt-16">
      <Heading as="h1">PR-Arbeit neu gedacht.</Heading>
      <Lead className="mt-6 max-w-3xl">
        Wir haben es uns zur Aufgabe gemacht, PR-Arbeit durch intelligente
        Technologie und KI-gestützte Tools zu transformieren.
      </Lead>
      <section className="mt-16 grid grid-cols-1 lg:grid-cols-2 lg:gap-12">
        <div className="max-w-lg">
          <h2 className="text-2xl font-medium tracking-tight">Unsere Mission</h2>
          <p className="mt-6 text-sm/6 text-gray-600">
            Bei CeleroPress widmen wir uns der Transformation von PR-Arbeit und
            Unternehmenskommunikation. Unsere Mission ist es, Unternehmen und
            PR-Profis die Tools zu geben, die sie brauchen, um effizienter zu
            arbeiten und bessere Ergebnisse zu erzielen.
          </p>
          <p className="mt-8 text-sm/6 text-gray-600">
            Wir glauben an die Kraft von Technologie und künstlicher Intelligenz,
            um repetitive Aufgaben zu automatisieren und Teams zu ermöglichen,
            sich auf das Wesentliche zu konzentrieren: Beziehungen aufbauen und
            überzeugende Geschichten erzählen.
          </p>
        </div>
        <div className="pt-20 lg:row-span-2 lg:-mr-16 xl:mr-auto">
          <div className="-mx-8 grid grid-cols-2 gap-4 sm:-mx-16 sm:grid-cols-4 lg:mx-0 lg:grid-cols-2 lg:gap-4 xl:gap-8">
            <div className="aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
              <img
                alt=""
                src="/company/1.jpg"
                className="block size-full object-cover"
              />
            </div>
            <div className="-mt-8 aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10 lg:-mt-32">
              <img
                alt=""
                src="/company/2.jpg"
                className="block size-full object-cover"
              />
            </div>
            <div className="aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
              <img
                alt=""
                src="/company/3.jpg"
                className="block size-full object-cover"
              />
            </div>
            <div className="-mt-8 aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10 lg:-mt-32">
              <img
                alt=""
                src="/company/4.jpg"
                className="block size-full object-cover"
              />
            </div>
          </div>
        </div>
        <div className="max-lg:mt-16 lg:col-span-1">
          <Subheading>Die Zahlen</Subheading>
          <hr className="mt-6 border-t border-gray-200" />
          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div className="flex flex-col gap-y-2 border-b border-dotted border-gray-200 pb-4">
              <dt className="text-sm/6 text-gray-600">Nutzer</dt>
              <dd className="order-first text-6xl font-medium tracking-tight">
                <AnimatedNumber start={500} end={1000} />+
              </dd>
            </div>
            <div className="flex flex-col gap-y-2 border-b border-dotted border-gray-200 pb-4">
              <dt className="text-sm/6 text-gray-600">Unternehmen</dt>
              <dd className="order-first text-6xl font-medium tracking-tight">
                <AnimatedNumber start={50} end={100} />+
              </dd>
            </div>
            <div className="flex flex-col gap-y-2 max-sm:border-b max-sm:border-dotted max-sm:border-gray-200 max-sm:pb-4">
              <dt className="text-sm/6 text-gray-600">Kampagnen versandt</dt>
              <dd className="order-first text-6xl font-medium tracking-tight">
                <AnimatedNumber start={5} end={10} />K
              </dd>
            </div>
            <div className="flex flex-col gap-y-2">
              <dt className="text-sm/6 text-gray-600">E-Mails versandt</dt>
              <dd className="order-first text-6xl font-medium tracking-tight">
                <AnimatedNumber start={50} end={100} />K
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </Container>
  )
}

function Story() {
  return (
    <Container className="mt-32">
      <Subheading>Unsere Geschichte</Subheading>
      <Heading as="h3" className="mt-2">
        Von der Idee zur Plattform.
      </Heading>
      <Lead className="mt-6 max-w-3xl">
        CeleroPress wurde aus der Frustration heraus geboren, dass PR-Tools
        entweder zu komplex oder zu eingeschränkt waren.
      </Lead>
      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div className="max-w-lg">
          <p className="text-sm/6 text-gray-600">
            Als PR-Profis selbst wussten wir, wie mühsam es ist, Kontakte zu
            verwalten, Kampagnen zu planen und Erfolge zu messen. Wir wollten
            ein Tool, das all diese Aspekte in einer einzigen, intuitiven
            Plattform vereint.
          </p>
          <p className="mt-8 text-sm/6 text-gray-600">
            Heute hilft CeleroPress hunderten von Unternehmen dabei, ihre
            PR-Arbeit zu optimieren. Mit Features wie intelligenten
            Verteilerlisten, KI-gestützter Content-Erstellung und
            detaillierten Analysen machen wir PR-Arbeit effizienter und
            erfolgreicher.
          </p>
          <div className="mt-6">
            <Button className="w-full sm:w-auto" href="/signup">
              Jetzt testen
            </Button>
          </div>
        </div>
        <div className="max-lg:order-first max-lg:max-w-lg">
          <div className="aspect-3/2 overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
            <img
              alt=""
              src="/company/5.jpg"
              className="block size-full object-cover"
            />
          </div>
        </div>
      </div>
    </Container>
  )
}

function Values() {
  return (
    <Container className="my-32">
      <Subheading>Unsere Werte</Subheading>
      <Heading as="h3" className="mt-2">
        Was uns antreibt.
      </Heading>
      <Lead className="mt-6 max-w-3xl">
        Wir glauben an Transparenz, Einfachheit und kontinuierliche
        Verbesserung.
      </Lead>
      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div>
          <h3 className="text-xl font-medium">Transparenz</h3>
          <p className="mt-4 text-sm/6 text-gray-600">
            Wir kommunizieren offen über Features, Preise und Roadmap. Keine
            versteckten Kosten, keine Überraschungen.
          </p>
        </div>
        <div>
          <h3 className="text-xl font-medium">Einfachheit</h3>
          <p className="mt-4 text-sm/6 text-gray-600">
            Leistungsstarke Tools müssen nicht kompliziert sein. Wir
            entwickeln intuitive Software, die jeder sofort nutzen kann.
          </p>
        </div>
        <div>
          <h3 className="text-xl font-medium">Innovation</h3>
          <p className="mt-4 text-sm/6 text-gray-600">
            Wir hören auf Feedback und verbessern CeleroPress kontinuierlich.
            Neue Features basieren auf echten Bedürfnissen unserer Nutzer.
          </p>
        </div>
      </div>
    </Container>
  )
}

export default function Company() {
  return (
    <main className="overflow-hidden">
      <GradientBackground />
      <Container>
        <Navbar />
      </Container>
      <Header />
      <Story />
      <Values />
      <Footer />
    </main>
  )
}
