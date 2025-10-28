/**
 * Subscription Success Page (Simple Version ohne useSearchParams)
 * Shown after successful Stripe Checkout
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function SubscriptionSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to subscription page after 5 seconds
    const timeout = setTimeout(() => {
      router.push('/dashboard/subscription');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

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
