/**
 * Subscription & Pricing Page
 * Zeigt aktuelle Subscription und ermöglicht Upgrade/Downgrade
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/config/subscription-limits';
import { CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type BillingInterval = 'monthly' | 'yearly';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('STARTER');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCurrentSubscription();
    }
  }, [user]);

  const fetchCurrentSubscription = async () => {
    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/subscription/current', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentTier(data.tier || 'STARTER');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      toast.error('Bitte melde dich an');
      router.push('/');
      return;
    }

    setCheckoutLoading(tier);

    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      const token = await currentUser.getIdToken();

      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier,
          billingInterval,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Checkout konnte nicht erstellt werden');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Keine Checkout-URL erhalten');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Fehler beim Erstellen des Checkouts');
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (tier: SubscriptionTier, interval: BillingInterval) => {
    const limits = SUBSCRIPTION_LIMITS[tier];
    const price = interval === 'monthly' ? limits.price_monthly_eur : limits.price_yearly_eur;
    const pricePerMonth = interval === 'yearly' ? price / 12 : price;

    return {
      total: price,
      perMonth: Math.round(pricePerMonth),
      interval: interval === 'monthly' ? 'Monat' : 'Jahr',
    };
  };

  const tiers: SubscriptionTier[] = ['STARTER', 'BUSINESS', 'AGENTUR'];

  if (!user) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-8 text-center">
          <p className="text-zinc-600">Bitte melde dich an, um Subscriptions zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900">
          Wähle deinen Plan
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Starte noch heute und wachse mit CeleroPress
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-sm font-medium ${billingInterval === 'monthly' ? 'text-zinc-900' : 'text-zinc-500'}`}>
          Monatlich
        </span>
        <button
          onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
          className="relative w-14 h-7 bg-zinc-200 rounded-full transition-colors hover:bg-zinc-300"
        >
          <div
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              billingInterval === 'yearly' ? 'translate-x-7' : ''
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${billingInterval === 'yearly' ? 'text-zinc-900' : 'text-zinc-500'}`}>
          Jährlich
        </span>
        {billingInterval === 'yearly' && (
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
            2 Monate gratis
          </span>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {tiers.map((tier) => {
          const limits = SUBSCRIPTION_LIMITS[tier];
          const price = formatPrice(tier, billingInterval);
          const isCurrentTier = tier === currentTier;
          const isPopular = tier === 'BUSINESS';

          return (
            <div
              key={tier}
              className={`relative bg-white rounded-xl shadow-lg border-2 transition-all hover:shadow-xl ${
                isPopular ? 'border-[#005fab] scale-105' : 'border-zinc-200'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#005fab] text-white text-sm font-semibold rounded-full">
                  Beliebteste Wahl
                </div>
              )}

              <div className="p-8">
                {/* Tier Name */}
                <h3 className="text-2xl font-bold text-zinc-900">{limits.name}</h3>

                {/* Current Badge */}
                {isCurrentTier && (
                  <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    Aktueller Plan
                  </span>
                )}

                {/* Price */}
                <div className="mt-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-zinc-900">€{price.perMonth}</span>
                    <span className="ml-2 text-zinc-600">/Monat</span>
                  </div>
                  {billingInterval === 'yearly' && (
                    <p className="mt-2 text-sm text-zinc-500">
                      €{price.total} pro Jahr
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="mt-8 space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-700">
                      {limits.emails_per_month.toLocaleString('de-DE')} Emails/Monat
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-700">
                      {limits.contacts.toLocaleString('de-DE')} Kontakte
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-700">
                      {limits.ai_words_per_month === -1 ? 'Unlimited' : limits.ai_words_per_month.toLocaleString('de-DE')} AI-Wörter
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-700">
                      {limits.users} Team-{limits.users === 1 ? 'Mitglied' : 'Mitglieder'}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-700">
                      {(limits.storage_bytes / (1024 ** 3)).toFixed(0)} GB Cloud-Speicher
                    </span>
                  </li>
                  {limits.journalist_db_access && (
                    <li className="flex items-start gap-3">
                      <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-zinc-700">Journalisten-Datenbank</span>
                    </li>
                  )}
                  <li className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-700">
                      {limits.support.join(', ')} Support
                    </span>
                  </li>
                  {limits.additional_user_cost_eur && (
                    <li className="flex items-start gap-3">
                      <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-zinc-700">
                        +€{limits.additional_user_cost_eur}/Monat pro User
                      </span>
                    </li>
                  )}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(tier)}
                  disabled={isCurrentTier || checkoutLoading !== null}
                  className={`mt-8 w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                    isCurrentTier
                      ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                      : isPopular
                      ? 'bg-[#005fab] hover:bg-[#004a8c] text-white shadow-lg hover:shadow-xl'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  } ${checkoutLoading === tier ? 'opacity-50' : ''}`}
                >
                  {checkoutLoading === tier ? (
                    'Weiterleitung...'
                  ) : isCurrentTier ? (
                    'Aktueller Plan'
                  ) : (
                    `${tier} wählen`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-12 text-center text-sm text-zinc-500">
        <p>Alle Pläne beinhalten eine 14-tägige Geld-zurück-Garantie</p>
        <p className="mt-2">Fragen? Kontaktiere uns unter support@celeropress.com</p>
      </div>
    </div>
  );
}
