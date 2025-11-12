'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/marketing/Button'
import { Gradient } from '@/components/marketing/gradient'
import { Link } from '@/components/marketing/link'
import { Mark } from '@/components/marketing/Logo'
import { Field, Input, Label } from '@headlessui/react'
import { clsx } from 'clsx'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth'
import { auth } from '@/lib/firebase/client-init'
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/config/subscription-limits'

function SignupForm() {
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Plan aus URL Parameter
  const selectedPlan = (searchParams?.get('plan') || 'STARTER') as SubscriptionTier
  const planDetails = SUBSCRIPTION_LIMITS[selectedPlan]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Erstelle pending_signup (KEIN Firebase User)
      const pendingResponse = await fetch('/api/signup/create-pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password: password,
          companyName: companyName || `${email.split('@')[0]}'s Organization`,
          tier: selectedPlan,
          billingInterval: 'monthly',
          provider: 'email'
        }),
      })

      if (!pendingResponse.ok) {
        const errorData = await pendingResponse.json()
        throw new Error(errorData.error || 'Fehler beim Erstellen der Registrierung')
      }

      const { token } = await pendingResponse.json()

      // 2. Erstelle Stripe Checkout Session
      const checkoutResponse = await fetch('/api/signup/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (!checkoutResponse.ok) {
        throw new Error('Fehler beim Erstellen der Checkout-Session')
      }

      const { url } = await checkoutResponse.json()

      // 3. Zu Stripe Checkout weiterleiten
      window.location.href = url
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')

      let result
      try {
        result = await signInWithPopup(auth, provider)
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy')) {
          await signInWithRedirect(auth, provider)
          return
        }
        throw popupError
      }

      const googleUser = result.user
      const idToken = await googleUser.getIdToken()

      // Logout sofort - User wird erst nach Zahlung erstellt
      await auth.signOut()

      // 1. Erstelle pending_signup mit Google-Daten (KEIN Firebase User persistence)
      const pendingResponse = await fetch('/api/signup/create-pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: googleUser.email?.toLowerCase() || '',
          companyName: `${googleUser.displayName || googleUser.email?.split('@')[0]}'s Organization`,
          tier: selectedPlan,
          billingInterval: 'monthly',
          provider: 'google',
          googleIdToken: idToken,
          googleUserInfo: {
            uid: googleUser.uid,
            displayName: googleUser.displayName,
            photoURL: googleUser.photoURL
          }
        }),
      })

      if (!pendingResponse.ok) {
        const errorData = await pendingResponse.json()
        throw new Error(errorData.error || 'Fehler beim Erstellen der Registrierung')
      }

      const { token } = await pendingResponse.json()

      // 2. Erstelle Stripe Checkout Session
      const checkoutResponse = await fetch('/api/signup/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (!checkoutResponse.ok) {
        throw new Error('Fehler beim Erstellen der Checkout-Session')
      }

      const { url } = await checkoutResponse.json()

      // 3. Zu Stripe Checkout weiterleiten
      window.location.href = url
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User hat Popup geschlossen - keine Fehlermeldung
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain nicht für OAuth autorisiert. Bitte kontaktiere den Support.')
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Ein Account mit dieser E-Mail existiert bereits mit einer anderen Anmeldemethode.')
      } else {
        setError(err.message || 'Google-Registrierung fehlgeschlagen. Bitte versuche es erneut.')
      }
      setLoading(false)
    }
  }

  return (
    <main className="overflow-hidden bg-gray-50">
      <Gradient className="absolute inset-2 -z-10 rounded-4xl" />
      <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-black/5">
          <form onSubmit={handleSubmit} className="p-7 sm:p-11">
            <div className="flex items-start">
              <Link href="/" title="Home">
                <Mark className="h-9" />
              </Link>
            </div>
            <h1 className="mt-8 text-base/6 font-medium">
              Jetzt mit {planDetails.name} starten
            </h1>
            <p className="mt-1 text-sm/5 text-gray-600">
              Bereits registriert?{' '}
              <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
                Hier anmelden
              </Link>
            </p>

            {/* Plan Info Box */}
            <div className="mt-6 rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{planDetails.name}</p>
                  <p className="text-xs text-gray-600">
                    €{planDetails.price_monthly_eur}/Monat • {planDetails.contacts.toLocaleString('de-DE')} Kontakte • {planDetails.emails_per_month.toLocaleString('de-DE')} E-Mails
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="text-xs text-primary hover:text-primary-hover font-medium"
                >
                  Ändern
                </Link>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-lg bg-red-50 p-4 ring-1 ring-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Google Sign-In */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={clsx(
                  'flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm',
                  'hover:bg-gray-50 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary',
                  'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
                )}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Mit Google registrieren
              </button>
            </div>

            {/* Divider */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">Oder weiter mit E-Mail</span>
              </div>
            </div>

            {/* Email Form */}
            <div className="mt-6 space-y-6">
              <Field className="space-y-3">
                <Label className="text-sm/5 font-medium">Firmenname</Label>
                <Input
                  required
                  type="text"
                  name="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  className={clsx(
                    'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                    'px-[calc(theme(spacing.2)-1px)] py-[calc(theme(spacing[1.5])-1px)] text-base/6 sm:text-sm/6',
                    'focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-primary',
                    'disabled:bg-gray-50 disabled:text-gray-400',
                  )}
                />
              </Field>

              <Field className="space-y-3">
                <Label className="text-sm/5 font-medium">E-Mail-Adresse</Label>
                <Input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className={clsx(
                    'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                    'px-[calc(theme(spacing.2)-1px)] py-[calc(theme(spacing[1.5])-1px)] text-base/6 sm:text-sm/6',
                    'focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-primary',
                    'disabled:bg-gray-50 disabled:text-gray-400',
                  )}
                />
              </Field>

              <Field className="space-y-3">
                <Label className="text-sm/5 font-medium">Passwort</Label>
                <Input
                  required
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={clsx(
                    'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                    'px-[calc(theme(spacing.2)-1px)] py-[calc(theme(spacing[1.5])-1px)] text-base/6 sm:text-sm/6',
                    'focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-primary',
                    'disabled:bg-gray-50 disabled:text-gray-400',
                  )}
                />
              </Field>
            </div>

            <div className="mt-8">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover"
                disabled={loading}
              >
                {loading ? 'Wird erstellt...' : 'Weiter zur Zahlung →'}
              </Button>
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
              Mit der Registrierung akzeptierst du unsere AGB und Datenschutzerklärung.
              14 Tage Geld-zurück-Garantie.
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <main className="overflow-hidden bg-gray-50">
        <Gradient className="absolute inset-2 -z-10 rounded-4xl" />
        <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-black/5">
            <div className="p-7 sm:p-11">
              <div className="flex items-start">
                <Link href="/" title="Home">
                  <Mark className="h-9" />
                </Link>
              </div>
              <h1 className="mt-8 text-base/6 font-medium">
                Laden...
              </h1>
            </div>
          </div>
        </div>
      </main>
    }>
      <SignupForm />
    </Suspense>
  )
}
