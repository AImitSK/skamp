/**
 * Cancel Subscription Modal
 * Besseres UX für Subscription-Kündigung mit Restlaufzeit-Anzeige
 */

'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { toastService } from '@/lib/utils/toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPeriodEnd?: Date;
  planName: string;
}

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
  currentPeriodEnd,
  planName,
}: Props) {
  const t = useTranslations('subscription.cancelModal');
  const tToast = useTranslations('toasts');
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
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
        throw new Error(errorData.error || t('errorCanceling'));
      }

      toastService.success(tToast('subscriptionCanceled'));
      onSuccess();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toastService.error(error.message || t('errorCanceling'));
    } finally {
      setLoading(false);
    }
  };

  const formatEndDate = (date?: Date) => {
    if (!date) return t('endOfBillingPeriod');
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (date?: Date) => {
    if (!date) return null;
    const now = new Date();
    const end = new Date(date);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = getDaysRemaining(currentPeriodEnd);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-zinc-900">
                  {t('title')}
                </Dialog.Title>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              {t('description', { planName })}
            </p>

            {/* Restlaufzeit Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-900">
                {t('accessRemainsTitle')}
              </p>
              <p className="text-sm text-amber-800">
                {t('accessRemainsUntil', { date: formatEndDate(currentPeriodEnd) })}
                {daysRemaining !== null && (
                  <span className="block mt-1">
                    {t('daysRemaining', { count: daysRemaining })}
                  </span>
                )}
              </p>
            </div>

            {/* Was passiert */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                {t('whatHappensTitle')}
              </p>
              <ul className="text-sm text-zinc-600 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{t('fullAccessUntilEnd')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{t('noMorePayments')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>{t('noAccessAfter')}</span>
                </li>
              </ul>
            </div>

            {/* Alternative */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                {t('downgradeTip')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {t('cancelButton')}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? t('canceling') : t('confirmButton')}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
