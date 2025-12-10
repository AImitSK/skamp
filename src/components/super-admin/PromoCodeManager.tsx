/**
 * Promo Code Manager Component
 * Super-Admin UI zum Erstellen und Verwalten von Promo-Codes
 */

'use client';

import { useState, useEffect } from 'react';
import { TicketIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { PromoCode } from '@/types/promo-code';
import { useTranslations } from 'next-intl';

export default function PromoCodeManager() {
  const t = useTranslations('superadmin.promoCodeManager');
  const [code, setCode] = useState('');
  const [tier, setTier] = useState<'BUSINESS' | 'AGENTUR'>('BUSINESS');
  const [maxUses, setMaxUses] = useState(10);
  const [validityMonths, setValidityMonths] = useState<number | null>(3);
  const [loading, setLoading] = useState(false);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  /**
   * Load existing promo codes
   */
  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      setLoadingList(true);
      const token = await getAuthToken();

      const response = await fetch('/api/super-admin/promo-codes', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPromoCodes(data.promoCodes || []);
      }
    } catch (error) {
      console.error('Error loading promo codes:', error);
    } finally {
      setLoadingList(false);
    }
  };

  const getAuthToken = async () => {
    const { auth } = await import('@/lib/firebase/client-init');
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getAuthToken();

      const response = await fetch('/api/super-admin/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          tier,
          maxUses,
          validityMonths,
          expiresAt: null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('form.successMessage', { code }));
        setCode('');
        loadPromoCodes(); // Refresh list
      } else {
        toast.error(data.error || t('form.errorMessage'));
      }
    } catch (error) {
      toast.error(t('form.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Form - InfoCard Pattern */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <TicketIcon className="h-5 w-5 text-zinc-700" />
            <h3 className="text-base font-semibold text-zinc-900">
              {t('form.title')}
            </h3>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          <form onSubmit={handleCreatePromoCode} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">
                {t('form.codeLabel')}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('form.codePlaceholder')}
                className="block w-full rounded-lg border border-zinc-300 bg-white
                           px-3 py-2 text-sm uppercase
                           placeholder:text-zinc-300
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                           h-10"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">
                {t('form.tierLabel')}
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as any)}
                className="block w-full rounded-lg border border-zinc-300 bg-white
                           px-3 py-2 text-sm h-10
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="BUSINESS">{t('form.tierBusiness')}</option>
                <option value="AGENTUR">{t('form.tierAgentur')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">
                {t('form.maxUsesLabel')}
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value))}
                className="block w-full rounded-lg border border-zinc-300 bg-white
                           px-3 py-2 text-sm h-10
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                min="1"
              />
              <p className="text-xs text-zinc-500 mt-1">
                {t('form.maxUsesHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">
                {t('form.validityLabel')}
              </label>
              <input
                type="number"
                value={validityMonths || ''}
                onChange={(e) =>
                  setValidityMonths(e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder={t('form.validityPlaceholder')}
                className="block w-full rounded-lg border border-zinc-300 bg-white
                           px-3 py-2 text-sm h-10
                           placeholder:text-zinc-300
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                min="1"
              />
              <p className="text-xs text-zinc-500 mt-1">
                {t('form.validityHint')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white
                         font-medium whitespace-nowrap
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]
                         h-10 px-6 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('form.submitting') : t('form.submitButton')}
            </button>
          </form>
        </div>
      </div>

      {/* Existing Promo Codes List - InfoCard Pattern */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <TicketIcon className="h-5 w-5 text-zinc-700" />
            <h3 className="text-base font-semibold text-zinc-900">
              {t('list.title', { count: promoCodes.length })}
            </h3>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          {loadingList ? (
            <p className="text-zinc-500">{t('list.loading')}</p>
          ) : promoCodes.length === 0 ? (
            <p className="text-zinc-500">{t('list.empty')}</p>
          ) : (
            <div className="space-y-2">
              {promoCodes.map((promo) => (
                <div
                  key={promo.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-zinc-900">
                        {promo.code}
                      </span>
                      <span className="px-2 py-0.5 bg-[#005fab]/10 text-[#005fab] text-xs font-medium rounded">
                        {promo.tier}
                      </span>
                      {promo.active ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircleIcon className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {t('list.usageInfo', {
                        current: promo.currentUses,
                        max: promo.maxUses === -1 ? '∞' : promo.maxUses
                      })}
                      {promo.validityMonths && (
                        <span className="ml-2">• {t('list.validityInfo', { months: promo.validityMonths })}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
