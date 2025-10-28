/**
 * Promo Code Manager Component
 * Super-Admin UI zum Erstellen und Verwalten von Promo-Codes
 */

'use client';

import { useState, useEffect } from 'react';
import { TicketIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { PromoCode } from '@/types/promo-code';

export default function PromoCodeManager() {
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
        toast.success(`Promo-Code "${code}" erstellt!`);
        setCode('');
        loadPromoCodes(); // Refresh list
      } else {
        toast.error(data.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TicketIcon className="w-6 h-6 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Promo-Code erstellen
          </h2>
        </div>

        <form onSubmit={handleCreatePromoCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="LAUNCH2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="BUSINESS">BUSINESS (€149/Monat)</option>
              <option value="AGENTUR">AGENTUR (€399/Monat)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max. Nutzungen
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              -1 für unbegrenzte Nutzungen
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gültigkeit (Monate)
            </label>
            <input
              type="number"
              value={validityMonths || ''}
              onChange={(e) =>
                setValidityMonths(e.target.value ? parseInt(e.target.value) : null)
              }
              placeholder="null für unbegrenzt"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leer lassen für unbegrenzte Gültigkeit
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            {loading ? 'Erstelle...' : 'Promo-Code erstellen'}
          </button>
        </form>
      </div>

      {/* Existing Promo Codes List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Bestehende Promo-Codes ({promoCodes.length})
        </h3>

        {loadingList ? (
          <p className="text-gray-500">Lade Promo-Codes...</p>
        ) : promoCodes.length === 0 ? (
          <p className="text-gray-500">Keine Promo-Codes vorhanden</p>
        ) : (
          <div className="space-y-2">
            {promoCodes.map((promo) => (
              <div
                key={promo.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-gray-900">
                      {promo.code}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                      {promo.tier}
                    </span>
                    {promo.active ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {promo.currentUses} / {promo.maxUses === -1 ? '∞' : promo.maxUses} genutzt
                    {promo.validityMonths && (
                      <span className="ml-2">• {promo.validityMonths} Monate Gültigkeit</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
