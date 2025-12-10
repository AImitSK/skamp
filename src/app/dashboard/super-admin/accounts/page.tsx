/**
 * Super-Admin Accounts Page
 * Account Management für Special Accounts und Promo-Codes
 *
 * ZUGRIFF: Alle Mitglieder der Super-Admin Organization (info@sk-online-marketing.de)
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';
import PromoCodeManager from '@/components/super-admin/PromoCodeManager';
import OrganizationList from '@/components/super-admin/OrganizationList';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function SuperAdminAccountsPage() {
  const t = useTranslations('superadmin.accounts');
  const { user } = useAuth();
  const router = useRouter();
  const { isSuperAdmin, isGlobalTeamMember } = useAutoGlobal();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check completed when user is loaded
    if (user !== null) {
      setLoading(false);
    }
  }, [user]);

  // Super-Admin = Owner der Super-Admin Organization ODER Team-Mitglied
  const hasAccess = isSuperAdmin || isGlobalTeamMember;

  // Loading state
  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!user || !hasAccess) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">{t('accessDenied.title')}</h2>
          <p className="text-red-700 mb-2">
            {t('accessDenied.message')}
          </p>
          <p className="text-red-600 text-sm">
            {t('accessDenied.hint')} <strong>info@sk-online-marketing.de</strong>
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            {t('accessDenied.backButton')}
          </button>
        </div>
      </div>
    );
  }

  // Super-Admin UI
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">{t('title')}</h1>
        <p className="mt-2 text-zinc-600">
          {t('description')}
        </p>
      </div>

      {/* Promo Code Manager */}
      <PromoCodeManager />

      {/* Organization List */}
      <OrganizationList />
    </div>
  );
}
