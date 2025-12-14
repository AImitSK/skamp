/**
 * Change Plan Modal
 * Allows users to upgrade/downgrade their subscription tier
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/config/subscription-limits';
import { Button } from '@/components/ui/button';
import { toastService } from '@/lib/utils/toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  stripeSubscriptionId: string;
}

export default function ChangePlanModal({ isOpen, onClose, currentTier, stripeSubscriptionId }: Props) {
  const t = useTranslations('subscription.changePlan');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(currentTier);
  const [loading, setLoading] = useState(false);
  const [violations, setViolations] = useState<string[]>([]);

  const tiers: SubscriptionTier[] = ['STARTER', 'BUSINESS', 'AGENTUR'];

  const handleChangePlan = async () => {
    if (selectedTier === currentTier) {
      toastService.error('Bitte wähle einen anderen Plan aus');
      return;
    }

    // Reset violations
    setViolations([]);

    setLoading(true);
    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newTier: selectedTier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check if it's a downgrade violation error
        if (errorData.violations) {
          setViolations(errorData.violations);
          toastService.error('Downgrade nicht möglich - siehe Details unten');
          setLoading(false);
          return;
        }

        throw new Error(errorData.error || 'Fehler beim Plan-Wechsel');
      }

      const data = await response.json();
      toastService.success(`Plan erfolgreich zu ${selectedTier} geändert!`);

      // Reload page to show updated subscription
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Error changing plan:', error);
      toastService.error(error.message || 'Fehler beim Plan-Wechsel');
      setLoading(false);
    }
  };

  const isUpgrade = (tier: SubscriptionTier): boolean => {
    const tierOrder = { STARTER: 0, BUSINESS: 1, AGENTUR: 2 };
    return tierOrder[tier] > tierOrder[currentTier];
  };

  const isDowngrade = (tier: SubscriptionTier): boolean => {
    const tierOrder = { STARTER: 0, BUSINESS: 1, AGENTUR: 2 };
    return tierOrder[tier] < tierOrder[currentTier];
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <div>
              <DialogTitle className="text-2xl font-bold text-zinc-900">
                {t('title')}
              </DialogTitle>
              <p className="mt-1 text-sm text-zinc-600">
                {t('currentPlan')}: <span className="font-semibold">{currentTier}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Plan Cards */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map((tier) => {
                const limits = SUBSCRIPTION_LIMITS[tier];
                const isCurrent = tier === currentTier;
                const isSelected = tier === selectedTier;

                return (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    disabled={isCurrent}
                    className={`
                      relative p-6 rounded-lg border-2 text-left transition-all
                      ${isCurrent ? 'border-zinc-300 bg-zinc-50 cursor-not-allowed' : ''}
                      ${isSelected && !isCurrent ? 'border-[#005fab] bg-blue-50' : ''}
                      ${!isSelected && !isCurrent ? 'border-zinc-200 hover:border-[#005fab] hover:bg-blue-50/50' : ''}
                    `}
                  >
                    {/* Current Badge */}
                    {isCurrent && (
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center px-2.5 py-1 bg-[#005fab] text-white text-xs font-semibold rounded-md">
                          {t('badges.current')}
                        </span>
                      </div>
                    )}

                    {/* Selected Badge */}
                    {isSelected && !isCurrent && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 rounded-full bg-[#005fab] flex items-center justify-center">
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Tier Name */}
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">
                      {limits.name}
                    </h3>

                    {/* Price */}
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-zinc-900">
                        €{limits.price_monthly_eur}
                      </span>
                      <span className="text-zinc-600">{t('perMonth')}</span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>{t('features.contacts', { count: limits.contacts.toLocaleString('de-DE') })}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>{t('features.emailsPerMonth', { count: limits.emails_per_month.toLocaleString('de-DE') })}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>
                          {limits.ai_words_per_month === -1
                            ? t('features.unlimitedAi')
                            : t('features.aiWords', { count: limits.ai_words_per_month.toLocaleString('de-DE') })}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>{t('features.teamMembers', { count: limits.users })}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>{t('features.storage', { gb: (limits.storage_bytes / (1024 ** 3)).toFixed(0) })}</span>
                      </li>
                    </ul>

                    {/* Upgrade/Downgrade Label */}
                    {!isCurrent && (
                      <div className="mt-4 pt-4 border-t border-zinc-200">
                        {isUpgrade(tier) && (
                          <span className="text-xs font-semibold text-green-600">
                            ⬆ {t('badges.upgrade')}
                          </span>
                        )}
                        {isDowngrade(tier) && (
                          <span className="text-xs font-semibold text-orange-600">
                            ⬇ {t('badges.downgrade')}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Violations Box (Downgrade Errors) */}
            {violations.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-300 rounded-lg">
                <div className="flex items-start gap-3 mb-2">
                  <XMarkIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900 mb-2">
                      {t('violations.title')}
                    </p>
                    <ul className="space-y-1">
                      {violations.map((violation, idx) => (
                        <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                          <span className="text-red-600 font-bold">•</span>
                          <span>{violation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{t('info.label')}</strong> {t('info.message')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200 bg-zinc-50">
            <Button
              onClick={onClose}
              className="px-6 py-2 border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 rounded-lg font-medium transition"
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={loading || selectedTier === currentTier}
              className="px-6 py-2 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('actions.changing') : t('actions.changePlan')}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
