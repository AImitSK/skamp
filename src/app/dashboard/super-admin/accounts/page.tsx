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

export default function SuperAdminAccountsPage() {
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
          <p className="text-gray-600">Überprüfe Zugriffsrechte...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!user || !hasAccess) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Zugriff verweigert</h2>
          <p className="text-red-700 mb-2">
            Nur Super-Admins haben Zugang zu dieser Seite.
          </p>
          <p className="text-red-600 text-sm">
            Super-Admin = Mitglieder der Organization von <strong>info@sk-online-marketing.de</strong>
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Zurück zum Dashboard
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
        <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
        <p className="mt-2 text-gray-600">
          Verwalten Sie Special Accounts und Promo-Codes
        </p>
      </div>

      {/* Promo Code Manager */}
      <PromoCodeManager />

      {/* Organization List */}
      <OrganizationList />
    </div>
  );
}
