'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/marketing/Button';
import { TextField } from '@/components/marketing/Fields';
import { Logo } from '@/components/marketing/Logo';
import { SlimLayout } from '@/components/marketing/SlimLayout';
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/config/subscription-limits';

export default function SignupPage() {
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

  return (
    <SlimLayout>
      <div className="flex">
        <Link href="/" aria-label="Home">
          <Logo className="h-10 w-auto" />
        </Link>
      </div>
      <h2 className="mt-20 text-lg font-semibold text-gray-900">
        Jetzt mit {planDetails.name} starten
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        Bereits registriert?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Hier anmelden
        </Link>
      </p>

      {/* Plan Info Box */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{planDetails.name}</p>
            <p className="text-xs text-gray-600">
              €{planDetails.price_monthly_eur}/Monat • {planDetails.contacts.toLocaleString('de-DE')} Kontakte • {planDetails.emails_per_month.toLocaleString('de-DE')} Emails
            </p>
          </div>
          <Link
            href="/pricing"
            className="text-xs text-blue-600 hover:underline"
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

      <form
        onSubmit={handleSubmit}
        className="mt-10 grid grid-cols-1 gap-y-8"
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
        <p className="text-xs text-gray-500 text-center">
          Mit der Registrierung akzeptierst du unsere AGB und Datenschutzerklärung.
          14 Tage Geld-zurück-Garantie.
        </p>
      </form>
    </SlimLayout>
  );
}
