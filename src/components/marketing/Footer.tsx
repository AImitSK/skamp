import { PlusGrid, PlusGridItem, PlusGridRow } from './plus-grid'
import { Button } from './Button'
import { Container } from './Container'
import { Gradient } from './gradient'
import { Logo } from './Logo'
import { Subheading } from './text'

function CallToAction() {
  return (
    <div className="relative pt-20 pb-16 text-center sm:py-24">
      <hgroup>
        <Subheading>Überzeugen Sie sich selbst</Subheading>
        <p className="mt-6 text-3xl font-medium tracking-tight text-gray-950 sm:text-5xl">
          Sehen Sie CeleroPress
          <br />
          in Aktion.
        </p>
      </hgroup>
      <p className="mx-auto mt-6 max-w-xs text-sm/6 text-gray-500">
        In 30 Minuten zeigen wir Ihnen, wie CeleroPress Ihre PR-Arbeit revolutioniert.
      </p>
      <div className="mt-6">
        <Button className="w-full sm:w-auto" href="/demo">
          Live-Demo buchen
        </Button>
      </div>
    </div>
  )
}

function Copyright() {
  return (
    <div className="text-sm/6 text-gray-950">
      &copy; {new Date().getFullYear()} CeleroPress
    </div>
  )
}

function FooterLinks() {
  return (
    <div className="flex gap-x-6 text-sm/6 text-gray-950">
      <a href="https://support.celeropress.com" className="hover:text-gray-700">
        Support
      </a>
    </div>
  )
}

export function Footer() {
  return (
    <footer>
      <Gradient className="relative">
        <div className="absolute inset-2 rounded-4xl bg-white/80" />
        <Container>
          <CallToAction />
          <PlusGrid className="pb-16">
            <PlusGridRow className="flex justify-between items-center">
              <div>
                <PlusGridItem className="py-3">
                  <Logo className="h-9" />
                </PlusGridItem>
              </div>
              <div>
                <PlusGridItem className="py-3">
                  <FooterLinks />
                </PlusGridItem>
              </div>
              <div>
                <PlusGridItem className="py-3">
                  <Copyright />
                </PlusGridItem>
              </div>
            </PlusGridRow>
          </PlusGrid>
        </Container>
      </Gradient>
    </footer>
  )
}
