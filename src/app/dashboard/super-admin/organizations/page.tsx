/**
 * Super-Admin Organizations Page
 * Support-Dashboard mit Übersicht über alle Organizations
 *
 * ZUGRIFF: Alle Mitglieder der Super-Admin Organization (info@sk-online-marketing.de)
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';
import { useRouter } from 'next/navigation';
import OrganizationTable from '@/components/super-admin/OrganizationTable';
import OrganizationDetailModal from '@/components/super-admin/OrganizationDetailModal';
import OrganizationStats from '@/components/super-admin/OrganizationStats';
import SearchAndFilter, { FilterState } from '@/components/super-admin/SearchAndFilter';
import { Organization } from '@/types/organization';
import toast from 'react-hot-toast';

/**
 * Helper: Convert Timestamp/Date/String to Date
 */
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return new Date();
}

export default function SuperAdminOrganizationsPage() {
  const t = useTranslations('superadmin.organizations');
  const { user } = useAuth();
  const router = useRouter();
  const { isSuperAdmin, isGlobalTeamMember } = useAutoGlobal();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tier: 'all',
    type: 'all',
    status: 'all',
  });

  useEffect(() => {
    if (user !== null) {
      setLoading(false);
    }
  }, [user]);

  // Super-Admin = Owner der Super-Admin Organization ODER Team-Mitglied
  const hasAccess = isSuperAdmin || isGlobalTeamMember;

  useEffect(() => {
    if (hasAccess && user) {
      fetchOrganizations();
    }
  }, [hasAccess, user]);

  useEffect(() => {
    applyFilters();
  }, [organizations, filters]);

  const getAuthToken = async () => {
    const { auth } = await import('@/lib/firebase/client-init');
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    return await currentUser.getIdToken();
  };

  const fetchOrganizations = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/super-admin/organizations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (error: any) {
      console.error('Error loading organizations:', error);
      toast.error(error.message || t('loadError'));
    }
  };

  const applyFilters = () => {
    let filtered = [...organizations];

    // Search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (org) =>
          org.name.toLowerCase().includes(search) ||
          org.adminEmail.toLowerCase().includes(search) ||
          org.id.toLowerCase().includes(search)
      );
    }

    // Tier filter
    if (filters.tier !== 'all') {
      filtered = filtered.filter((org) => org.tier === filters.tier);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter((org) => org.accountType === filters.type);
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'expiring') {
        // Promo accounts expiring in next 7 days
        filtered = filtered.filter((org) => {
          if (org.accountType !== 'promo' || !org.promoDetails?.expiresAt) {
            return false;
          }
          const daysUntilExpiry = Math.ceil(
            (toDate(org.promoDetails.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
        });
      }
    }

    setFilteredOrgs(filtered);
  };

  const handleExportCSV = () => {
    // Generate CSV from filteredOrgs
    const csv = generateCSV(filteredOrgs);
    downloadCSV(csv, `organizations-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(t('csvExported'));
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center">
          <p className="text-zinc-600">{t('checkingAccess')}</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!user || !hasAccess) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">{t('accessDenied')}</h2>
          <p className="text-red-700 mb-2">
            {t('accessDeniedMessage')}
          </p>
          <p className="text-red-600 text-sm">
            {t('accessDeniedHint')}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            {t('backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  // Super-Admin UI
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            🏢 {t('title')}
          </h1>
          <p className="mt-2 text-zinc-600">
            {t('subtitle')}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredOrgs.length === 0}
          className="px-4 py-2 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg font-medium transition
                     flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📊 {t('exportCSV')}
        </button>
      </div>

      {/* Stats Overview */}
      <OrganizationStats organizations={organizations} />

      {/* Search & Filter */}
      <SearchAndFilter filters={filters} onFiltersChange={setFilters} />

      {/* Organizations Table */}
      <OrganizationTable
        organizations={filteredOrgs}
        onViewDetails={(org) => setSelectedOrg(org)}
      />

      {/* Detail Modal */}
      {selectedOrg && (
        <OrganizationDetailModal
          organization={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onUpdate={() => {
            fetchOrganizations();
            setSelectedOrg(null);
          }}
        />
      )}
    </div>
  );
}

function generateCSV(organizations: Organization[]): string {
  const headers = [
    'ID',
    'Name',
    'Email',
    'Tier',
    'Type',
    'Emails Used',
    'Emails Limit',
    'Storage Used (GB)',
    'Storage Limit (GB)',
    'Created',
  ];

  const rows = organizations.map((org) => [
    org.id,
    org.name,
    org.adminEmail,
    org.tier,
    org.accountType,
    org.usage?.emailsSent?.toString() || '0',
    org.usage?.emailsLimit === -1 ? 'Unlimited' : org.usage?.emailsLimit?.toString() || '0',
    org.usage ? (org.usage.storageUsed / (1024 ** 3)).toFixed(2) : '0',
    org.usage?.storageLimit === -1 ? 'Unlimited' : org.usage ? (org.usage.storageLimit / (1024 ** 3)).toFixed(0) : '0',
    toDate(org.createdAt).toLocaleDateString('de-DE'),
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
