'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Logo } from '@/components/marketing/Logo';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  useEffect(() => {
    // Redirect zum Login nach 10 Sekunden
    const timeout = setTimeout(() => {
      router.push('/login');
    }, 10000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/">
            <Logo className="h-10 w-auto" />
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-white shadow-2xl p-8 text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              Vielen Dank! 🎉
            </h1>
            <p className="mt-4 text-lg text-zinc-600">
              Deine Zahlung war erfolgreich.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 text-left space-y-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                ✅ Was passiert jetzt?
              </p>
              <p className="text-sm text-zinc-600 mt-1">
                Dein CeleroPress-Account wird gerade erstellt. Das dauert nur wenige Sekunden.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                📧 Du erhältst eine Email
              </p>
              <p className="text-sm text-zinc-600 mt-1">
                Wir senden dir eine Bestätigung mit allen wichtigen Informationen.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                🚀 Bereit zum Loslegen
              </p>
              <p className="text-sm text-zinc-600 mt-1">
                Melde dich an und starte direkt mit deiner ersten Pressemitteilung!
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full px-6 py-3 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl text-center"
            >
              Jetzt anmelden
            </Link>
            <p className="text-xs text-zinc-400">
              Du wirst automatisch in 10 Sekunden weitergeleitet...
            </p>
          </div>

          {/* Support */}
          <p className="text-sm text-zinc-500 pt-4 border-t border-zinc-100">
            Fragen?{' '}
            <a
              href="mailto:support@celeropress.com"
              className="text-[#005fab] hover:text-[#004a8c] font-medium"
            >
              Kontaktiere unseren Support
            </a>
          </p>
        </div>

        {/* Additional Info */}
        <div className="text-center text-xs text-zinc-500">
          <p>
            14 Tage Geld-zurück-Garantie • Jederzeit kündbar
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-500">Lade...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
