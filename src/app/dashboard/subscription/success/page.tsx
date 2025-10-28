/**
 * Subscription Success Page
 * Shown after successful Stripe Checkout
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('session_id');
    setSessionId(id);

    // Redirect to dashboard after 5 seconds
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-zinc-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              Vielen Dank! 🎉
            </h1>
            <p className="mt-4 text-lg text-zinc-600">
              Deine Subscription wurde erfolgreich aktiviert.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Du erhältst in Kürze eine Bestätigungs-Email mit allen Details.
            </p>
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-1">Session ID:</p>
              <p className="text-xs text-zinc-700 font-mono break-all">{sessionId}</p>
            </div>
          )}

          {/* Next Steps */}
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full px-6 py-3 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Zum Dashboard
            </Link>
            <Link
              href="/dashboard/subscription"
              className="block w-full px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-medium transition-all"
            >
              Subscription verwalten
            </Link>
          </div>

          {/* Auto-redirect info */}
          <p className="text-xs text-zinc-400">
            Du wirst automatisch in 5 Sekunden weitergeleitet...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-zinc-50">
        <div className="text-center">
          <p className="text-zinc-600">Lädt...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
