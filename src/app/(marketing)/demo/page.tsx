'use client'

import { Button } from '@/components/marketing/Button'
import { Container } from '@/components/marketing/Container'
import { Footer } from '@/components/marketing/Footer'
import { Gradient } from '@/components/marketing/gradient'
import { Navbar } from '@/components/marketing/navbar'
import { Heading, Subheading } from '@/components/marketing/text'
import { useState } from 'react'

export default function Demo() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // TODO: Hier API-Call für Formular-Versand implementieren
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <div className="relative">
        <Gradient className="absolute inset-2 bottom-0 rounded-4xl ring-1 ring-black/5 ring-inset" />
        <Container className="relative">
          <Navbar />
          <div className="pt-16 pb-24 sm:pt-24 sm:pb-32">
            <div className="text-center">
              <Subheading>Live-Demo</Subheading>
              <Heading as="h1" className="mt-2">
                Sehen Sie CeleroPress in Aktion
              </Heading>
              <p className="mx-auto mt-6 max-w-2xl text-lg/8 text-gray-600">
                Vereinbaren Sie eine persönliche Demo und erfahren Sie, wie
                CeleroPress Ihre PR-Arbeit revolutionieren kann.
              </p>
            </div>
          </div>
        </Container>
      </div>

      {/* Formular Section */}
      <Container className="py-16">
        <div className="mx-auto max-w-2xl">
          {isSubmitted ? (
            <div className="rounded-2xl bg-green-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Vielen Dank für Ihre Anfrage!
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Wir melden uns innerhalb von 24 Stunden bei Ihnen, um einen
                Termin zu vereinbaren.
              </p>
              <div className="mt-6">
                <Button href="/">Zurück zur Startseite</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-900"
                  >
                    Vorname *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-900"
                  >
                    Nachname *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-900"
                >
                  E-Mail-Adresse *
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="max@beispiel.de"
                />
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-gray-900"
                >
                  Unternehmen
                </label>
                <input
                  type="text"
                  name="company"
                  id="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="Musterfirma GmbH"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-900"
                >
                  Telefonnummer
                </label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="+49 123 456789"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-900"
                >
                  Was interessiert Sie besonders?
                </label>
                <textarea
                  name="message"
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                  placeholder="Erzählen Sie uns von Ihren PR-Anforderungen..."
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Wird gesendet...' : 'Demo-Termin anfragen'}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500">
                Mit dem Absenden stimmen Sie unserer{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Datenschutzerklärung
                </a>{' '}
                zu.
              </p>
            </form>
          )}
        </div>
      </Container>

      {/* Info Section */}
      <div className="bg-gray-50 py-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              Was Sie in der Demo erwartet
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-gray-900">
                  Persönliche Beratung
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  30 Minuten individuell auf Ihre Bedürfnisse zugeschnitten
                </p>
              </div>
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-gray-900">
                  Live-Walkthrough
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Alle Features in Aktion – von KI bis Monitoring
                </p>
              </div>
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-gray-900">
                  Q&A Session
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Alle Ihre Fragen werden beantwortet
                </p>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Footer />
    </div>
  )
}
