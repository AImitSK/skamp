/**
 * Cancel Subscription Modal
 * Besseres UX für Subscription-Kündigung mit Restlaufzeit-Anzeige
 */

'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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
        throw new Error(errorData.error || 'Fehler beim Kündigen');
      }

      toast.success('Subscription erfolgreich gekündigt');
      onSuccess();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast.error(error.message || 'Fehler beim Kündigen');
    } finally {
      setLoading(false);
    }
  };

  const formatEndDate = (date?: Date) => {
    if (!date) return 'Ende der Billing Period';
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
                  Subscription kündigen?
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
              Du bist dabei, deinen <span className="font-semibold">{planName}</span> Plan zu kündigen.
            </p>

            {/* Restlaufzeit Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-900">
                ⏰ Dein Zugriff bleibt aktiv
              </p>
              <p className="text-sm text-amber-800">
                Du kannst CeleroPress noch bis zum <span className="font-semibold">{formatEndDate(currentPeriodEnd)}</span> nutzen
                {daysRemaining !== null && (
                  <span className="block mt-1">
                    ({daysRemaining} {daysRemaining === 1 ? 'Tag' : 'Tage'} verbleibend)
                  </span>
                )}
              </p>
            </div>

            {/* Was passiert */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                Was passiert jetzt?
              </p>
              <ul className="text-sm text-zinc-600 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Voller Zugriff bis zum Ende der Billing Period</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Keine weiteren Zahlungen</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>Danach kein Zugriff mehr auf deine Daten</span>
                </li>
              </ul>
            </div>

            {/* Alternative */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <span className="font-semibold">Tipp:</span> Du kannst stattdessen auch auf einen günstigeren Plan downgraden.
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
              Abbrechen
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Wird gekündigt...' : 'Ja, kündigen'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
