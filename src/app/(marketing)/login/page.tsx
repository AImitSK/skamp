'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/marketing/Button';
import { TextField } from '@/components/marketing/Fields';
import { Logo } from '@/components/marketing/Logo';
import { SlimLayout } from '@/components/marketing/SlimLayout';

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      await login(email.toLowerCase(), password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login Fehler:', err);

      if (err.code === 'auth/wrong-password') {
        setError('Falsches Passwort. Bitte erneut versuchen.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Kein Account mit dieser E-Mail-Adresse gefunden.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre Eingaben.');
      } else {
        setError('Login fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
    } finally {
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
        Bei CeleroPress anmelden
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        Noch kein Account?{' '}
        <Link
          href="/signup"
          className="font-medium text-blue-600 hover:underline"
        >
          Jetzt registrieren
        </Link>{' '}
        und 14 Tage kostenlos testen.
      </p>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-10 grid grid-cols-1 gap-y-8">
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
          autoComplete="current-password"
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
              {loading ? 'Wird angemeldet...' : 'Anmelden'}{' '}
              <span aria-hidden="true">&rarr;</span>
            </span>
          </Button>
        </div>
      </form>
    </SlimLayout>
  );
}
