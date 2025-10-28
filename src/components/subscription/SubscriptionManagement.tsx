/**
 * Subscription Management Component
 * Shows current subscription, usage, and management options
 */

'use client';

import { useState } from 'react';
import { SUBSCRIPTION_LIMITS, getUsagePercentage, getUsageColor, isUnlimited } from '@/config/subscription-limits';
import { Organization, OrganizationUsage } from '@/types/organization';
import { CheckIcon, PencilSquareIcon, XMarkIcon, EnvelopeIcon, UserGroupIcon, SparklesIcon, UserIcon, CloudIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  organization: Organization;
  onUpgrade: () => void;
}

export default function SubscriptionManagement({ organization, onUpgrade }: Props) {
  const [cancelLoading, setCancelLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentTierLimits = SUBSCRIPTION_LIMITS[organization.tier];
  const usage = organization.usage;

  // Format Plan Features für bessere Darstellung
  const features = [
    { label: `${currentTierLimits.emails_per_month.toLocaleString('de-DE')} Emails pro Monat`, icon: EnvelopeIcon },
    { label: `${currentTierLimits.contacts.toLocaleString('de-DE')} Kontakte`, icon: UserGroupIcon },
    { label: currentTierLimits.ai_words_per_month === -1 ? 'Unlimited AI-Wörter' : `${currentTierLimits.ai_words_per_month.toLocaleString('de-DE')} AI-Wörter`, icon: SparklesIcon },
    { label: `${currentTierLimits.users} Team-Mitglied${currentTierLimits.users > 1 ? 'er' : ''}`, icon: UserIcon },
    { label: `${(currentTierLimits.storage_bytes / (1024 ** 3)).toFixed(0)} GB Cloud-Speicher`, icon: CloudIcon },
  ];

  const handleOpenCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch('/api/subscription/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Öffnen des Customer Portals');
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error(error.message || 'Fehler beim Öffnen des Portals');
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Möchtest du deine Subscription wirklich kündigen? Sie bleibt bis zum Ende der aktuellen Billing Period aktiv.')) {
      return;
    }

    setCancelLoading(true);
    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Kündigen');
      }

      toast.success('Subscription erfolgreich gekündigt');
      window.location.reload();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast.error(error.message || 'Fehler beim Kündigen');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan & Features - Combined Box */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-zinc-900">
                {currentTierLimits.name} Plan
              </h3>
              <p className="mt-1 text-zinc-600">
                {organization.accountType === 'regular' ? (
                  <span className="text-lg font-medium">€{currentTierLimits.price_monthly_eur}/Monat</span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-md">
                    {organization.accountType.toUpperCase()}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="px-4 py-2 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-medium transition-colors flex items-center gap-2 h-10"
            >
              <PencilSquareIcon className="w-5 h-5" />
              Plan ändern
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                  <Icon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-700">{feature.label}</span>
                </div>
              );
            })}
            {currentTierLimits.journalist_db_access && (
              <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-zinc-700">Journalisten-Datenbank Zugriff</span>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-zinc-700">{currentTierLimits.support.join(', ')} Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      {usage && (
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <h3 className="text-base font-semibold text-zinc-900">Aktuelle Nutzung</h3>
          </div>
          <div className="p-6 space-y-4">
            <UsageMeter
              label="Emails"
              current={usage.emailsSent}
              limit={usage.emailsLimit}
              unit=""
            />
            <UsageMeter
              label="Kontakte"
              current={usage.contactsTotal}
              limit={usage.contactsLimit}
              unit=""
            />
            <UsageMeter
              label="AI-Wörter"
              current={usage.aiWordsUsed}
              limit={usage.aiWordsLimit}
              unit=""
            />
            <UsageMeter
              label="Speicher"
              current={usage.storageUsed}
              limit={usage.storageLimit}
              unit="GB"
              formatter={(val) => (val / (1024 ** 3)).toFixed(2)}
            />
            <UsageMeter
              label="Team-Mitglieder"
              current={usage.teamMembersActive}
              limit={usage.teamMembersLimit}
              unit=""
            />
          </div>
        </div>
      )}

      {/* Verwaltung */}
      {organization.accountType === 'regular' && organization.stripeCustomerId && (
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <h3 className="text-base font-semibold text-zinc-900">Zahlungsverwaltung</h3>
          </div>
          <div className="p-6 space-y-3">
            <button
              onClick={handleOpenCustomerPortal}
              disabled={portalLoading}
              className="w-full px-4 py-3 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-medium transition-colors disabled:opacity-50 h-11"
            >
              {portalLoading ? 'Öffne Portal...' : 'Zahlungsmethode & Rechnungen verwalten'}
            </button>
            <button
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="w-full px-4 py-3 border border-red-300 bg-white hover:bg-red-50 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 h-11"
            >
              <XMarkIcon className="w-5 h-5" />
              {cancelLoading ? 'Kündige...' : 'Subscription kündigen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UsageMeter({
  label,
  current,
  limit,
  unit,
  formatter
}: {
  label: string;
  current: number;
  limit: number;
  unit: string;
  formatter?: (val: number) => string;
}) {
  const percentage = getUsagePercentage(current, limit);
  const unlimited = isUnlimited(limit);

  const formatValue = formatter || ((val: number) => val.toLocaleString('de-DE'));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        {unlimited ? (
          <span className="text-sm font-semibold text-[#005fab]">Unlimited ∞</span>
        ) : (
          <span className="text-sm text-zinc-600">
            {formatValue(current)} / {formatValue(limit)} {unit}
          </span>
        )}
      </div>
      {!unlimited && (
        <div className="h-2 bg-zinc-200 rounded-full overflow-hidden relative">
          {/* Blauer Bereich (0-90%) */}
          <div
            className="h-full bg-[#005fab] transition-all duration-300 absolute left-0"
            style={{ width: `${Math.min(percentage, 90)}%` }}
          />
          {/* Gelber Bereich (90-100%) - nur wenn über 90% */}
          {percentage > 90 && (
            <div
              className="h-full bg-[#dedc00] transition-all duration-300 absolute"
              style={{
                left: '90%',
                width: `${Math.min(percentage - 90, 10)}%`
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
