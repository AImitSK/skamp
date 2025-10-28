/**
 * Subscription Management Component
 * Shows current subscription, usage, and management options
 */

'use client';

import { useState } from 'react';
import { SUBSCRIPTION_LIMITS, getUsagePercentage, getUsageColor, isUnlimited } from '@/config/subscription-limits';
import { Organization, OrganizationUsage } from '@/types/organization';
import { CheckIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
    <div className="space-y-8">
      {/* Current Plan Header */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              {currentTierLimits.name} Plan
            </h2>
            <p className="mt-1 text-zinc-600">
              {organization.accountType === 'regular' ? (
                <>€{currentTierLimits.price_monthly_eur}/Monat</>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                  {organization.accountType.toUpperCase()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <PencilSquareIcon className="w-5 h-5" />
            Plan ändern
          </button>
        </div>
      </div>

      {/* Usage Meters */}
      {usage && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Nutzung</h3>
          <div className="space-y-4">
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

      {/* Plan Features */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">Enthaltene Features</h3>
        <ul className="space-y-3">
          <FeatureItem text={`${currentTierLimits.emails_per_month.toLocaleString('de-DE')} Emails pro Monat`} />
          <FeatureItem text={`${currentTierLimits.contacts.toLocaleString('de-DE')} Kontakte`} />
          <FeatureItem text={currentTierLimits.ai_words_per_month === -1 ? 'Unlimited AI-Wörter' : `${currentTierLimits.ai_words_per_month.toLocaleString('de-DE')} AI-Wörter`} />
          <FeatureItem text={`${currentTierLimits.users} Team-Mitglied${currentTierLimits.users > 1 ? 'er' : ''}`} />
          <FeatureItem text={`${(currentTierLimits.storage_bytes / (1024 ** 3)).toFixed(0)} GB Cloud-Speicher`} />
          {currentTierLimits.journalist_db_access && <FeatureItem text="Journalisten-Datenbank Zugriff" />}
          <FeatureItem text={`${currentTierLimits.support.join(', ')} Support`} />
        </ul>
      </div>

      {/* Actions */}
      {organization.accountType === 'regular' && organization.stripeCustomerId && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Verwaltung</h3>
          <div className="space-y-3">
            <button
              onClick={handleOpenCustomerPortal}
              disabled={portalLoading}
              className="w-full px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {portalLoading ? 'Öffne Portal...' : 'Zahlungsmethode & Rechnungen verwalten'}
            </button>
            <button
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
  const color = getUsageColor(percentage);

  const formatValue = formatter || ((val: number) => val.toLocaleString('de-DE'));

  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        {unlimited ? (
          <span className="text-sm font-bold text-[#005fab]">Unlimited ∞</span>
        ) : (
          <span className="text-sm text-zinc-600">
            {formatValue(current)} / {formatValue(limit)} {unit} ({percentage}%)
          </span>
        )}
      </div>
      {!unlimited && (
        <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClasses[color]} transition-all duration-300`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
      <span className="text-sm text-zinc-700">{text}</span>
    </li>
  );
}
