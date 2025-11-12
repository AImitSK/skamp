'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
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
import { auth, db } from '@/lib/firebase/client-init'
import { doc, setDoc } from 'firebase/firestore'

export default function LoginPage() {
  const { user, login } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Redirect wenn bereits eingeloggt
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email.toLowerCase(), password)
      router.push('/dashboard')
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setError('Falsches Passwort. Bitte erneut versuchen.')
      } else if (err.code === 'auth/user-not-found') {
        setError('Kein Account mit dieser E-Mail-Adresse gefunden.')
      } else if (err.code === 'auth/invalid-credential') {
        setError('Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre Eingaben.')
      } else {
        setError('Login fehlgeschlagen. Bitte versuchen Sie es erneut.')
      }
    } finally {
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

      // User-Dokument erstellen/updaten
      await setDoc(doc(db, "users", googleUser.uid), {
        userId: googleUser.uid,
        email: googleUser.email,
        displayName: googleUser.displayName,
        photoURL: googleUser.photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        provider: 'google'
      }, { merge: true })

      // Beta-Organisation erstellen falls noch keine existiert
      const { organizationService } = await import('@/lib/firebase/organization-service')
      await organizationService.create({
        name: `${googleUser.displayName || googleUser.email?.split('@')[0]}'s Organization`,
        ownerId: googleUser.uid,
        ownerEmail: googleUser.email || '',
        ownerName: googleUser.displayName || googleUser.email || '',
        accountType: 'beta',
        tier: 'STARTER',
        photoUrl: googleUser.photoURL || undefined
      })

      router.push('/dashboard')
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User hat Popup geschlossen - keine Fehlermeldung
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain nicht für OAuth autorisiert. Bitte kontaktiere den Support.')
      } else {
        setError('Google-Anmeldung fehlgeschlagen. Bitte versuche es erneut.')
      }
    } finally {
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
            <h1 className="mt-8 text-base/6 font-medium">Willkommen zurück!</h1>
            <p className="mt-1 text-sm/5 text-gray-600">
              Melde dich an, um fortzufahren.
            </p>

            {error && (
              <div className="mt-6 rounded-lg bg-red-50 p-4 ring-1 ring-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Field className="mt-8 space-y-3">
              <Label className="text-sm/5 font-medium">E-Mail-Adresse</Label>
              <Input
                required
                autoFocus
                type="email"
                name="email"
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

            <Field className="mt-8 space-y-3">
              <Label className="text-sm/5 font-medium">Passwort</Label>
              <Input
                required
                type="password"
                name="password"
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

            <div className="mt-8">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover"
                disabled={loading}
              >
                {loading ? 'Wird angemeldet...' : 'Anmelden'}
              </Button>
            </div>

            {/* Google Sign-In */}
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-gray-500">Oder</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={clsx(
                  'mt-4 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm',
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
                Mit Google anmelden
              </button>
            </div>
          </form>

          <div className="m-1.5 rounded-lg bg-gray-50 py-4 text-center text-sm/5 ring-1 ring-black/5">
            Noch kein Account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:text-primary-hover">
              Jetzt registrieren
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
