/**
 * Subscription Cancel Page (Simple Version)
 * Shown when user cancels Stripe Checkout
 */

'use client';

import { XCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-zinc-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
          {/* Cancel Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
              <XCircleIcon className="w-12 h-12 text-orange-600" />
            </div>
          </div>

          {/* Cancel Message */}
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              Checkout abgebrochen
            </h1>
            <p className="mt-4 text-lg text-zinc-600">
              Keine Sorge, es wurde keine Zahlung durchgeführt.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Du kannst jederzeit zurückkommen und einen Plan auswählen.
            </p>
          </div>

          {/* Why Cancel? */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-zinc-900 mb-2">
              Hast du Fragen?
            </p>
            <ul className="text-sm text-zinc-600 space-y-1">
              <li>• Alle Pläne haben eine 14-Tage Geld-zurück-Garantie</li>
              <li>• Du kannst jederzeit upgraden oder downgraden</li>
              <li>• Kontaktiere uns bei Fragen: support@celeropress.com</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/dashboard/subscription"
              className="block w-full px-6 py-3 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Zurück zur Preisübersicht
            </Link>
            <Link
              href="/dashboard"
              className="block w-full px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-medium transition-all"
            >
              Zurück zum Dashboard
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
