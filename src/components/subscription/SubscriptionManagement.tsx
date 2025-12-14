/**
 * Subscription Management Component
 * Shows current subscription, usage, and management options
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SUBSCRIPTION_LIMITS, getUsagePercentage, getUsageColor, isUnlimited } from '@/config/subscription-limits';
import { Organization, OrganizationUsage } from '@/types/organization';
import { CheckIcon, PencilSquareIcon, XMarkIcon, EnvelopeIcon, UserGroupIcon, SparklesIcon, UserIcon, CloudIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { toastService } from '@/lib/utils/toast';
import CancelSubscriptionModal from './CancelSubscriptionModal';

interface Props {
  organization: Organization;
  onUpgrade: () => void;
}

export default function SubscriptionManagement({ organization, onUpgrade }: Props) {
  const t = useTranslations('subscription.management');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<{ currentPeriodEnd?: Date; cancelAtPeriodEnd?: boolean } | null>(null);

  // Defensive: Falls tier fehlt oder ungültig, nutze STARTER als Fallback
  const currentTierLimits = organization.tier && SUBSCRIPTION_LIMITS[organization.tier]
    ? SUBSCRIPTION_LIMITS[organization.tier]
    : SUBSCRIPTION_LIMITS['STARTER'];

  const usage = organization.usage || null;

  // Load subscription data for cancel modal
  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (!organization.stripeSubscriptionId) return;

      try {
        const { auth } = await import('@/lib/firebase/client-init');
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const response = await fetch('/api/subscription/details', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data.subscription);
        }
      } catch (error) {
        console.error('Error loading subscription data:', error);
      }
    };

    loadSubscriptionData();
  }, [organization.stripeSubscriptionId]);

  // Format Plan Features für bessere Darstellung
  const features = [
    { label: t('features.emailsPerMonth', { count: currentTierLimits.emails_per_month.toLocaleString('de-DE') }), icon: EnvelopeIcon },
    { label: t('features.contacts', { count: currentTierLimits.contacts.toLocaleString('de-DE') }), icon: UserGroupIcon },
    { label: currentTierLimits.ai_words_per_month === -1 ? t('features.unlimitedAiWords') : t('features.aiWords', { count: currentTierLimits.ai_words_per_month.toLocaleString('de-DE') }), icon: SparklesIcon },
    { label: t('features.teamMembers', { count: currentTierLimits.users }), icon: UserIcon },
    { label: t('features.cloudStorage', { gb: (currentTierLimits.storage_bytes / (1024 ** 3)).toFixed(0) }), icon: CloudIcon },
  ];

  const handleOpenCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const user = auth.currentUser;
      if (!user) throw new Error(t('errors.notAuthenticated'));

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
        throw new Error(errorData.error || t('payment.portalError'));
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toastService.error(error.message || 'Fehler beim Öffnen des Portals');
      setPortalLoading(false);
    }
  };

  const handleCancelSuccess = () => {
    setCancelModalOpen(false);
    window.location.reload();
  };

  const handleReactivateSubscription = async () => {
    setReactivateLoading(true);
    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const user = auth.currentUser;
      if (!user) throw new Error(t('errors.notAuthenticated'));

      const token = await user.getIdToken();
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('cancellation.reactivateError'));
      }

      toastService.success('Subscription erfolgreich reaktiviert');
      window.location.reload();
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      toastService.error(error.message || 'Fehler beim Reaktivieren');
      setReactivateLoading(false);
    }
  };

  const getDaysRemaining = (date?: Date) => {
    if (!date) return null;
    const now = new Date();
    const end = new Date(date);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatEndDate = (date?: Date) => {
    if (!date) return t('endOfBillingPeriod');
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const daysRemaining = getDaysRemaining(subscriptionData?.currentPeriodEnd);

  return (
    <div className="space-y-6">
      {/* Tier Warning */}
      {(!organization.tier || !SUBSCRIPTION_LIMITS[organization.tier]) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-semibold">
            ⚠️ {t('tierWarning.title')}
          </p>
          <p className="text-sm text-red-700 mt-1">
            {t('tierWarning.message')}
          </p>
        </div>
      )}

      {/* Plan & Features - Combined Box */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-zinc-900">
                {currentTierLimits.name} {t('plan')}
              </h3>
              <p className="mt-1 text-zinc-600">
                {organization.accountType === 'regular' ? (
                  <span className="text-lg font-medium">€{currentTierLimits.price_monthly_eur}{t('perMonth')}</span>
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
              {t('changePlan')}
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
                <span className="text-sm text-zinc-700">{t('features.journalistDb')}</span>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <CheckIcon className="w-5 h-5 text-[#005fab] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-zinc-700">{t('features.support', { types: currentTierLimits.support.join(', ') })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      {!usage && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            ⚠️ {t('usage.notAvailable')}
          </p>
        </div>
      )}
      {usage && !usage.emailsLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            ⚠️ {t('usage.incomplete')}
          </p>
        </div>
      )}
      {usage && usage.emailsLimit && (
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <h3 className="text-base font-semibold text-zinc-900">{t('usage.title')}</h3>
          </div>
          <div className="p-6 space-y-4">
            <UsageMeter
              label={t('usage.labels.emails')}
              current={usage.emailsSent}
              limit={usage.emailsLimit}
              unit=""
              t={t}
            />
            <UsageMeter
              label={t('usage.labels.contacts')}
              current={usage.contactsTotal}
              limit={usage.contactsLimit}
              unit=""
              t={t}
            />
            <UsageMeter
              label={t('usage.labels.aiWords')}
              current={usage.aiWordsUsed}
              limit={usage.aiWordsLimit}
              unit=""
              t={t}
            />
            <UsageMeter
              label={t('usage.labels.storage')}
              current={usage.storageUsed}
              limit={usage.storageLimit}
              unit="GB"
              formatter={(val) => (val / (1024 ** 3)).toFixed(2)}
              t={t}
            />
            <UsageMeter
              label={t('usage.labels.teamMembers')}
              current={usage.teamMembersActive}
              limit={usage.teamMembersLimit}
              unit=""
              t={t}
            />
          </div>
        </div>
      )}

      {/* Verwaltung */}
      {organization.accountType === 'regular' && organization.stripeCustomerId && (
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <h3 className="text-base font-semibold text-zinc-900">{t('payment.title')}</h3>
          </div>
          <div className="p-6 space-y-3">
            <button
              onClick={handleOpenCustomerPortal}
              disabled={portalLoading}
              className="w-full px-4 py-3 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-medium transition-colors disabled:opacity-50 h-11"
            >
              {portalLoading ? t('payment.openingPortal') : t('payment.manageButton')}
            </button>

            {/* Show cancellation info if subscription is canceled, otherwise show cancel button */}
            {subscriptionData?.cancelAtPeriodEnd ? (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">
                      {t('cancellation.expiringTitle')}
                    </p>
                    <p className="text-sm text-amber-800 mt-1">
                      {t('cancellation.accessUntil', { date: formatEndDate(subscriptionData?.currentPeriodEnd) })}
                      {daysRemaining !== null && (
                        <span className="block mt-0.5">
                          {t('cancellation.daysRemaining', { count: daysRemaining })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReactivateSubscription}
                  disabled={reactivateLoading}
                  className="w-full px-4 py-3 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-medium transition-colors disabled:opacity-50 h-11"
                >
                  {reactivateLoading ? t('cancellation.reactivating') : t('cancellation.reactivateButton')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="w-full px-4 py-3 border border-red-300 bg-white hover:bg-red-50 text-red-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 h-11"
              >
                <XMarkIcon className="w-5 h-5" />
                {t('cancellation.cancelButton')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onSuccess={handleCancelSuccess}
        currentPeriodEnd={subscriptionData?.currentPeriodEnd}
        planName={currentTierLimits.name}
      />
    </div>
  );
}

function UsageMeter({
  label,
  current,
  limit,
  unit,
  formatter,
  t
}: {
  label: string;
  current: number;
  limit: number;
  unit: string;
  formatter?: (val: number) => string;
  t: any;
}) {
  // Defensive: Falls current oder limit undefined, nutze 0
  const safeCurrent = current ?? 0;
  const safeLimit = limit ?? 0;

  const percentage = getUsagePercentage(safeCurrent, safeLimit);
  const unlimited = isUnlimited(safeLimit);

  const formatValue = formatter || ((val: number) => (val ?? 0).toLocaleString('de-DE'));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        {unlimited ? (
          <span className="text-sm font-semibold text-[#005fab]">{t('usage.unlimited')}</span>
        ) : (
          <span className="text-sm text-zinc-600">
            {formatValue(safeCurrent)} / {formatValue(safeLimit)} {unit}
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
