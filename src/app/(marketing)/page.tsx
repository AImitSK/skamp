import { CallToAction } from '@/components/marketing/CallToAction'
import { Faqs } from '@/components/marketing/Faqs'
import { Hero } from '@/components/marketing/Hero'
import { Pricing } from '@/components/marketing/Pricing'
import { PrimaryFeatures } from '@/components/marketing/PrimaryFeatures'
import { SecondaryFeatures } from '@/components/marketing/SecondaryFeatures'
import { Testimonials } from '@/components/marketing/Testimonials'

export default function Home() {
  return (
    <>
      <Hero />
      <PrimaryFeatures />
      <SecondaryFeatures />
      <CallToAction />
      <Testimonials />
      <Pricing />
      <Faqs />
    </>
  )
}
