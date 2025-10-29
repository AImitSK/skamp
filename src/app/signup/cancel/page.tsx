'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Logo } from '@/components/marketing/Logo';

function CancelContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!token) {
      alert('Kein gültiger Token gefunden');
      return;
    }

    setRetrying(true);

    try {
      // Erstelle neue Checkout Session mit dem gleichen Token
      const response = await fetch('/api/signup/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Checkout-Session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error retrying payment:', error);
      alert('Fehler beim Erstellen der Checkout-Session. Bitte versuche es später erneut.');
      setRetrying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/">
            <Logo className="h-10 w-auto" />
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-white shadow-xl p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
              <XCircleIcon className="w-12 h-12 text-orange-600" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              Zahlung abgebrochen
            </h1>
            <p className="mt-4 text-lg text-zinc-600">
              Keine Sorge, es wurde keine Zahlung durchgeführt.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-zinc-900 mb-2">
              Was möchtest du tun?
            </p>
            <ul className="text-sm text-zinc-600 space-y-1">
              <li>• Versuche die Zahlung erneut (deine Daten sind gespeichert)</li>
              <li>• Wähle einen anderen Plan auf unserer Preisseite</li>
              <li>• Kontaktiere uns bei Fragen: support@celeropress.com</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {token ? (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full px-6 py-3 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {retrying ? (
                  <span className="flex items-center justify-center gap-2">
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Wird geladen...
                  </span>
                ) : (
                  'Zahlung erneut versuchen'
                )}
              </button>
            ) : (
              <Link
                href="/pricing"
                className="block w-full px-6 py-3 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl text-center"
              >
                Zur Preisübersicht
              </Link>
            )}
            <Link
              href="/"
              className="block w-full px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-medium transition-all text-center"
            >
              Zurück zur Startseite
            </Link>
          </div>

          {/* Support Link */}
          <p className="text-sm text-zinc-500">
            Brauchst du Hilfe?{' '}
            <a
              href="mailto:support@celeropress.com"
              className="text-[#005fab] hover:text-[#004a8c] font-medium"
            >
              Kontaktiere unseren Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupCancelPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-500">Lade...</div>
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
