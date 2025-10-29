'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/marketing/Button';
import { TextField } from '@/components/marketing/Fields';
import { Logo } from '@/components/marketing/Logo';
import { SlimLayout } from '@/components/marketing/SlimLayout';
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/config/subscription-limits';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';
import { db } from '@/lib/firebase/client-init';
import { doc, setDoc } from 'firebase/firestore';

function SignupForm() {
  const { user, register: registerUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Plan aus URL Parameter
  const selectedPlan = (searchParams?.get('plan') || 'STARTER') as SubscriptionTier;
  const planDetails = SUBSCRIPTION_LIMITS[selectedPlan];

  // Redirect wenn bereits eingeloggt
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Firebase Registrierung
      await registerUser(email.toLowerCase(), password);

      // 2. Organization erstellen mit gewähltem Plan
      const { organizationService } = await import('@/lib/firebase/organization-service');
      const { auth } = await import('@/lib/firebase/client-init');
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated after registration');
      }

      const orgId = await organizationService.create({
        name: companyName || `${email.split('@')[0]}'s Organization`,
        ownerId: currentUser.uid,
        ownerEmail: email,
        ownerName: companyName || email,
        accountType: 'regular', // Regular account (nicht beta)
        tier: selectedPlan,
        subscriptionStatus: 'incomplete', // Zahlung noch nicht abgeschlossen
      });

      // 3. Zu Stripe Checkout weiterleiten
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: selectedPlan,
          billingInterval: 'monthly',
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Checkout-Session');
      }

      const { url } = await response.json();
      window.location.href = url; // Zu Stripe Checkout
    } catch (err: any) {
      console.error('Registrierung Fehler:', err);

      if (err.code === 'auth/email-already-in-use') {
        setError('Diese E-Mail-Adresse wird bereits verwendet.');
      } else if (err.code === 'auth/weak-password') {
        setError('Das Passwort ist zu schwach. Mindestens 6 Zeichen erforderlich.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Ungültige E-Mail-Adresse.');
      } else {
        setError(err.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy')) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }

      const googleUser = result.user;

      // User-Dokument erstellen
      await setDoc(doc(db, "users", googleUser.uid), {
        userId: googleUser.uid,
        email: googleUser.email,
        displayName: googleUser.displayName,
        photoURL: googleUser.photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        provider: 'google'
      }, { merge: true });

      // Regular-Organisation erstellen mit gewähltem Plan
      const { organizationService } = await import('@/lib/firebase/organization-service');
      await organizationService.create({
        name: `${googleUser.displayName || googleUser.email?.split('@')[0]}'s Organization`,
        ownerId: googleUser.uid,
        ownerEmail: googleUser.email || '',
        ownerName: googleUser.displayName || googleUser.email || '',
        accountType: 'regular',
        tier: selectedPlan,
        subscriptionStatus: 'incomplete', // Zahlung noch nicht abgeschlossen
        photoUrl: googleUser.photoURL || undefined
      });

      // Zu Stripe Checkout weiterleiten
      const token = await googleUser.getIdToken();
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: selectedPlan,
          billingInterval: 'monthly',
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Checkout-Session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err: any) {
      console.error("Google Sign-In Fehler:", err);

      if (err.code === 'auth/popup-closed-by-user') {
        // User hat Popup geschlossen - keine Fehlermeldung
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain nicht für OAuth autorisiert. Bitte kontaktiere den Support.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Ein Account mit dieser E-Mail existiert bereits mit einer anderen Anmeldemethode.');
      } else {
        setError(err.message || 'Google-Registrierung fehlgeschlagen. Bitte versuche es erneut.');
      }
      setLoading(false);
    }
  };

  return (
    <SlimLayout>
      <div className="flex">
        <Link href="/" aria-label="Home">
          <Logo className="h-10 w-auto" />
        </Link>
      </div>
      <h2 className="mt-20 text-lg font-semibold text-zinc-900">
        Jetzt mit {planDetails.name} starten
      </h2>
      <p className="mt-2 text-sm text-zinc-700">
        Bereits registriert?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Hier anmelden
        </Link>
      </p>

      {/* Plan Info Box */}
      <div className="mt-6 rounded-lg bg-primary-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">{planDetails.name}</p>
            <p className="text-xs text-zinc-600">
              €{planDetails.price_monthly_eur}/Monat • {planDetails.contacts.toLocaleString('de-DE')} Kontakte • {planDetails.emails_per_month.toLocaleString('de-DE')} Emails
            </p>
          </div>
          <Link
            href="/pricing"
            className="text-xs text-primary hover:underline"
          >
            Ändern
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Google Sign-In */}
      <div className="mt-10">
        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full"
          disabled={loading}
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Mit Google registrieren
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mt-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-zinc-500">Oder weiter mit E-Mail</span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid grid-cols-1 gap-y-8"
      >
        <TextField
          label="Firmenname"
          name="company"
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <TextField
          label="E-Mail-Adresse"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Passwort"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div>
          <Button
            type="submit"
            variant="solid"
            color="blue"
            className="w-full"
            disabled={loading}
          >
            <span>
              {loading ? 'Wird erstellt...' : 'Weiter zur Zahlung'}{' '}
              <span aria-hidden="true">&rarr;</span>
            </span>
          </Button>
        </div>
        <p className="text-xs text-zinc-500 text-center">
          Mit der Registrierung akzeptierst du unsere AGB und Datenschutzerklärung.
          14 Tage Geld-zurück-Garantie.
        </p>
      </form>
    </SlimLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <SlimLayout>
        <div className="flex">
          <Link href="/" aria-label="Home">
            <Logo className="h-10 w-auto" />
          </Link>
        </div>
        <h2 className="mt-20 text-lg font-semibold text-zinc-900">
          Laden...
        </h2>
      </SlimLayout>
    }>
      <SignupForm />
    </Suspense>
  );
}
