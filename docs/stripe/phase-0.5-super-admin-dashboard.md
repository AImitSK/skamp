# Phase 0.5: Super-Admin Support Dashboard

> **Ziel:** Support-Dashboard für Super-Admins mit Übersicht über alle Organizations, Usage-Metriken und Quick-Actions

**Dauer:** 2 Tage
**Status:** ⏳ Pending
**Abhängigkeiten:** Phase 0 (Special Accounts)
**Kann parallel laufen zu:** Phase 1 (Stripe Setup)

---

## Übersicht

Diese Phase baut ein umfassendes Support-Dashboard für Super-Admins, um:
- ✅ Alle Organizations auf einen Blick sehen
- ✅ Usage & Limits jeder Organization einsehen
- ✅ Schnelle Support-Actions (Tier ändern, Promo verlängern)
- ✅ Support-Notes für interne Dokumentation
- ✅ Telefon-Support effizient durchführen

**URL:** `https://www.celeropress.com/dashboard/super-admin/organizations`

**Wichtig:** Diese Seite muss im Super-Admin Menü verlinkt werden!

---

## Use Cases

### 1. Telefon-Support Szenario:
```
Kunde: "Ich kann keine Emails mehr versenden!"
Support:
  → Öffnet /super-admin/organizations
  → Sucht nach Kundenname/Email
  → Sieht: Emails 100% (10.000/10.000) 🔴
  → Quick-Action: "Upgrade zu AGENTUR"
  → Problem gelöst in 30 Sekunden
```

### 2. Promo-Account Management:
```
Support checkt täglich:
  → Filter: "Type = promo" + "Expires in 7 days"
  → Sieht alle ablaufenden Promo-Accounts
  → Sendet proaktiv Upgrade-Email
  → Oder: Verlängert Promo mit 1 Klick
```

### 3. Reporting:
```
Management will wissen:
  → Wie viele BUSINESS Accounts?
  → Durchschnittliche Email-Usage?
  → Wie viele Promo-Accounts laufen ab?
  → Export CSV → Excel → Report erstellt
```

---

## UI/UX Design

### Layout-Struktur:

```
┌──────────────────────────────────────────────────────────┐
│ 🏢 Organizations Overview              [Export CSV] 📊   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ 🔍 Search & Filter:                                       │
│  [Search: Name, Email, ID...]                            │
│  [Tier: All ▼] [Type: All ▼] [Status: All ▼]           │
│                                                           │
│ 📊 Quick Stats:                                           │
│  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │
│  │ Total    │ STARTER  │ BUSINESS │ AGENTUR  │ Promo  │ │
│  │  247     │   120    │    98    │    29    │   15   │ │
│  │          │ (49%)    │  (40%)   │  (12%)   │ (6%)   │ │
│  └──────────┴──────────┴──────────┴──────────┴────────┘ │
│                                                           │
│ 📋 Organizations Table:                                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Org      │Tier│Type │Emails  │Storage │Status│Act││  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Acme AG  │BUS │reg  │2.5k/10k│12/25GB │✅    │👁️ │  │
│  │ admin@.. │    │     │  25% 🟢│  48% 🟢│      │✏️ │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Demo Inc │AGE │int  │9.8k    │5 GB    │✅    │👁️ │  │
│  │ demo@..  │    │     │  ∞     │  5% 🟢 │      │   │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Test PR  │BUS │promo│8.1k/10k│23/25GB │⚠️    │👁️ │  │
│  │ test@..  │    │     │  81% 🟡│  92% 🟡│Exp:3d│⏰ │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Beta Co  │AGE │beta │1.2k    │8 GB    │✅    │👁️ │  │
│  │ beta@..  │    │     │  ∞     │  8% 🟢 │      │   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  Showing 1-10 of 247 [← Prev] [1][2][3]...[25] [Next→]  │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Legend:**
- 🟢 Green: < 80%
- 🟡 Yellow: 80-95%
- 🔴 Red: > 95%
- ⚠️ Warning: Promo expiring soon
- ∞ Unlimited

---

## Tasks

### 1. Page-Komponente erstellen

**Datei:** `src/app/dashboard/super-admin/organizations/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import OrganizationTable from '@/components/super-admin/OrganizationTable';
import OrganizationDetailModal from '@/components/super-admin/OrganizationDetailModal';
import OrganizationStats from '@/components/super-admin/OrganizationStats';
import SearchAndFilter from '@/components/super-admin/SearchAndFilter';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function SuperAdminOrganizationsPage() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    tier: 'all',
    type: 'all',
    status: 'all',
  });

  // Super-Admin Check
  if (user?.role !== 'super-admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Zugriff verweigert. Nur Super-Admins haben Zugang.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [organizations, filters]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/super-admin/organizations');
      const data = await response.json();
      setOrganizations(data.organizations);
    } catch (error) {
      toast.error('Fehler beim Laden der Organizations');
    } finally {
      setLoading(false);
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
            (org.promoDetails.expiresAt.toDate() - new Date()) / (1000 * 60 * 60 * 24)
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
    downloadCSV(csv, 'organizations-export.csv');
    toast.success('CSV exportiert');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🏢 Organizations Overview
          </h1>
          <p className="mt-2 text-gray-600">
            Verwalten Sie alle Organizations und deren Subscriptions
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center gap-2"
        >
          📊 Export CSV
        </button>
      </div>

      <OrganizationStats organizations={organizations} />

      <SearchAndFilter filters={filters} onFiltersChange={setFilters} />

      <OrganizationTable
        organizations={filteredOrgs}
        onViewDetails={(org) => setSelectedOrg(org)}
      />

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

function generateCSV(organizations: any[]): string {
  const headers = ['ID', 'Name', 'Email', 'Tier', 'Type', 'Emails Used', 'Storage Used', 'Created'];
  const rows = organizations.map((org) => [
    org.id,
    org.name,
    org.adminEmail,
    org.tier,
    org.accountType,
    `${org.usage?.emailsSent || 0}/${org.usage?.emailsLimit || 0}`,
    `${(org.usage?.storageUsed / (1024 ** 3)).toFixed(2)} GB`,
    org.createdAt.toDate().toLocaleDateString('de-DE'),
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
```

**Tasks:**
- [ ] Page erstellen
- [ ] Super-Admin Role-Check
- [ ] Filters & Search implementieren
- [ ] CSV Export
- [ ] Modal-Integration

---

### 2. OrganizationStats Component

**Datei:** `src/components/super-admin/OrganizationStats.tsx`

```typescript
interface Props {
  organizations: any[];
}

export default function OrganizationStats({ organizations }: Props) {
  const stats = {
    total: organizations.length,
    starter: organizations.filter((o) => o.tier === 'STARTER').length,
    business: organizations.filter((o) => o.tier === 'BUSINESS').length,
    agentur: organizations.filter((o) => o.tier === 'AGENTUR').length,
    promo: organizations.filter((o) => o.accountType === 'promo').length,
    beta: organizations.filter((o) => o.accountType === 'beta').length,
    internal: organizations.filter((o) => o.accountType === 'internal').length,
  };

  const StatCard = ({ label, value, percentage, color }: any) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {percentage && (
          <p className="text-sm text-gray-500">({percentage}%)</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <StatCard
        label="Total Organizations"
        value={stats.total}
        color="text-gray-900"
      />
      <StatCard
        label="STARTER"
        value={stats.starter}
        percentage={Math.round((stats.starter / stats.total) * 100)}
        color="text-blue-600"
      />
      <StatCard
        label="BUSINESS"
        value={stats.business}
        percentage={Math.round((stats.business / stats.total) * 100)}
        color="text-indigo-600"
      />
      <StatCard
        label="AGENTUR"
        value={stats.agentur}
        percentage={Math.round((stats.agentur / stats.total) * 100)}
        color="text-purple-600"
      />
      <StatCard
        label="Promo"
        value={stats.promo}
        percentage={Math.round((stats.promo / stats.total) * 100)}
        color="text-yellow-600"
      />
      <StatCard
        label="Beta"
        value={stats.beta}
        percentage={Math.round((stats.beta / stats.total) * 100)}
        color="text-green-600"
      />
      <StatCard
        label="Internal"
        value={stats.internal}
        percentage={Math.round((stats.internal / stats.total) * 100)}
        color="text-gray-600"
      />
    </div>
  );
}
```

**Tasks:**
- [ ] Component implementieren
- [ ] Stats-Berechnung
- [ ] Responsive Grid

---

### 3. OrganizationTable Component

**Datei:** `src/components/super-admin/OrganizationTable.tsx`

```typescript
import { EyeIcon, PencilIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Props {
  organizations: any[];
  onViewDetails: (org: any) => void;
}

export default function OrganizationTable({ organizations, onViewDetails }: Props) {
  const getUsageColor = (percentage: number) => {
    if (percentage < 80) return 'text-green-600';
    if (percentage < 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUsageEmoji = (percentage: number) => {
    if (percentage < 80) return '🟢';
    if (percentage < 95) return '🟡';
    return '🔴';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      regular: 'reg',
      promo: 'promo',
      beta: 'beta',
      internal: 'int',
    };
    return labels[type] || type;
  };

  const getTierBadgeColor = (tier: string) => {
    const colors = {
      STARTER: 'bg-blue-100 text-blue-800',
      BUSINESS: 'bg-indigo-100 text-indigo-800',
      AGENTUR: 'bg-purple-100 text-purple-800',
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  const getPromoExpiryWarning = (org: any) => {
    if (org.accountType !== 'promo' || !org.promoDetails?.expiresAt) {
      return null;
    }

    const daysUntilExpiry = Math.ceil(
      (org.promoDetails.expiresAt.toDate() - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      return (
        <span className="text-xs text-orange-600 flex items-center gap-1">
          ⚠️ Exp: {daysUntilExpiry}d
        </span>
      );
    }

    if (daysUntilExpiry <= 0) {
      return <span className="text-xs text-red-600">❌ Expired</span>;
    }

    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Organization
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Tier
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Emails
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Storage
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {organizations.map((org) => {
              const emailPercentage = org.usage?.emailsLimit === -1
                ? 0
                : Math.round((org.usage?.emailsSent / org.usage?.emailsLimit) * 100);

              const storagePercentage = org.usage?.storageLimit === -1
                ? 0
                : Math.round((org.usage?.storageUsed / org.usage?.storageLimit) * 100);

              return (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{org.name}</p>
                      <p className="text-xs text-gray-500">{org.adminEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getTierBadgeColor(org.tier)}`}>
                      {org.tier.substring(0, 3)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-gray-600 font-mono">
                      {getTypeLabel(org.accountType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {org.usage?.emailsLimit === -1 ? (
                      <span className="text-sm font-medium text-indigo-600">∞</span>
                    ) : (
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getUsageColor(emailPercentage)}`}>
                          {org.usage?.emailsSent?.toLocaleString() || 0}/{org.usage?.emailsLimit?.toLocaleString() || 0}
                        </p>
                        <p className={`text-xs ${getUsageColor(emailPercentage)}`}>
                          {emailPercentage}% {getUsageEmoji(emailPercentage)}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {org.usage?.storageLimit === -1 ? (
                      <span className="text-sm font-medium text-indigo-600">∞</span>
                    ) : (
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getUsageColor(storagePercentage)}`}>
                          {(org.usage?.storageUsed / (1024 ** 3)).toFixed(1)}/{(org.usage?.storageLimit / (1024 ** 3)).toFixed(0)} GB
                        </p>
                        <p className={`text-xs ${getUsageColor(storagePercentage)}`}>
                          {storagePercentage}% {getUsageEmoji(storagePercentage)}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">✅</span>
                      {getPromoExpiryWarning(org)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onViewDetails(org)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Details anzeigen"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {organizations.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          Keine Organizations gefunden
        </div>
      )}
    </div>
  );
}
```

**Tasks:**
- [ ] Table implementieren
- [ ] Color-Coding für Usage
- [ ] Promo-Expiry-Warning
- [ ] Responsive Design

---

### 4. OrganizationDetailModal Component

**Datei:** `src/components/super-admin/OrganizationDetailModal.tsx`

```typescript
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  organization: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function OrganizationDetailModal({ organization, onClose, onUpdate }: Props) {
  const [supportNote, setSupportNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeTier = async (newTier: string) => {
    if (!confirm(`Tier zu ${newTier} ändern?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/super-admin/organizations/${organization.id}/change-tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });

      if (response.ok) {
        toast.success('Tier erfolgreich geändert');
        onUpdate();
      } else {
        toast.error('Fehler beim Ändern des Tiers');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendPromo = async (months: number) => {
    if (!confirm(`Promo um ${months} Monate verlängern?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/super-admin/organizations/${organization.id}/extend-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months }),
      });

      if (response.ok) {
        toast.success('Promo erfolgreich verlängert');
        onUpdate();
      } else {
        toast.error('Fehler beim Verlängern');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/super-admin/organizations/${organization.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: supportNote }),
      });

      if (response.ok) {
        toast.success('Note gespeichert');
        setSupportNote('');
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  };

  const openStripe = () => {
    if (organization.stripeCustomerId) {
      window.open(`https://dashboard.stripe.com/customers/${organization.stripeCustomerId}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{organization.name}</h2>
            <p className="text-sm text-gray-500">{organization.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">📋 Basic Info</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Admin Email:</span>
                <span className="font-medium">{organization.adminEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {organization.createdAt?.toDate().toLocaleDateString('de-DE')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tier:</span>
                <span className="font-medium">{organization.tier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Type:</span>
                <span className="font-medium">{organization.accountType}</span>
              </div>
              {organization.stripeCustomerId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Stripe Customer:</span>
                  <button
                    onClick={openStripe}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {organization.stripeCustomerId.substring(0, 20)}...
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Usage Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">📊 Usage Details</h3>
            <div className="space-y-3">
              <UsageBar
                label="Emails"
                current={organization.usage?.emailsSent || 0}
                limit={organization.usage?.emailsLimit || 0}
              />
              <UsageBar
                label="Kontakte"
                current={organization.usage?.contactsTotal || 0}
                limit={organization.usage?.contactsLimit || 0}
              />
              <UsageBar
                label="Storage"
                current={organization.usage?.storageUsed || 0}
                limit={organization.usage?.storageLimit || 0}
                formatter={(val) => `${(val / (1024 ** 3)).toFixed(2)} GB`}
              />
              <UsageBar
                label="AI Words"
                current={organization.usage?.aiWordsUsed || 0}
                limit={organization.usage?.aiWordsLimit || 0}
              />
              <UsageBar
                label="Team Members"
                current={organization.usage?.teamMembersActive || 0}
                limit={organization.usage?.teamMembersLimit || 0}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">🛠️ Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <select
                onChange={(e) => handleChangeTier(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={loading}
                defaultValue=""
              >
                <option value="" disabled>Change Tier...</option>
                <option value="STARTER">STARTER</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="AGENTUR">AGENTUR</option>
              </select>

              {organization.accountType === 'promo' && (
                <>
                  <button
                    onClick={() => handleExtendPromo(1)}
                    disabled={loading}
                    className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition"
                  >
                    +1 Monat
                  </button>
                  <button
                    onClick={() => handleExtendPromo(3)}
                    disabled={loading}
                    className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition"
                  >
                    +3 Monate
                  </button>
                </>
              )}

              {organization.stripeCustomerId && (
                <button
                  onClick={openStripe}
                  className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-sm font-medium transition"
                >
                  View in Stripe
                </button>
              )}
            </div>
          </div>

          {/* Support Notes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">📝 Support Notes (Internal)</h3>
            <textarea
              value={supportNote}
              onChange={(e) => setSupportNote(e.target.value)}
              placeholder="Notizen für interne Zwecke..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
              rows={4}
            />
            <button
              onClick={handleSaveNote}
              disabled={loading || !supportNote}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageBar({ label, current, limit, formatter }: any) {
  const percentage = limit === -1 ? 0 : Math.round((current / limit) * 100);
  const isUnlimited = limit === -1;

  const getColor = () => {
    if (isUnlimited) return 'bg-indigo-500';
    if (percentage < 80) return 'bg-green-500';
    if (percentage < 95) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatValue = formatter || ((val: number) => val.toLocaleString('de-DE'));

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {isUnlimited ? (
          <span className="text-sm font-bold text-indigo-600">Unlimited ∞</span>
        ) : (
          <span className="text-sm font-medium text-gray-900">
            {formatValue(current)} / {formatValue(limit)} ({percentage}%)
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all duration-300`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

**Tasks:**
- [ ] Modal implementieren
- [ ] Quick Actions (Tier ändern, Promo verlängern)
- [ ] Support Notes
- [ ] Stripe Deep-Link

---

### 5. Navigation Update

**Datei zu ändern:** `src/components/layout/SuperAdminNav.tsx` (oder wo auch immer das Super-Admin Menü ist)

```typescript
// Füge zum Super-Admin Menü hinzu:
<nav className="flex gap-4">
  <NavLink href="/dashboard/super-admin/accounts">
    👥 Accounts
  </NavLink>
  <NavLink href="/dashboard/super-admin/organizations">
    🏢 Organizations
  </NavLink>
  <NavLink href="/dashboard/super-admin/settings">
    ⚙️ Settings
  </NavLink>
</nav>
```

**Tasks:**
- [ ] Navigation-Link hinzufügen
- [ ] Active-State Styling
- [ ] Icon hinzufügen

---

### 6. API Routes

#### 6.1 List All Organizations

**Datei:** `src/app/api/super-admin/organizations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { db } from '@/lib/firebase/firebase-admin';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    // Super-Admin Check
    if (auth.user?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
      // Get all organizations
      const orgsSnapshot = await db.collection('organizations').orderBy('createdAt', 'desc').get();

      const organizations = await Promise.all(
        orgsSnapshot.docs.map(async (doc) => {
          const orgData = doc.data();

          // Get usage data
          const usageDoc = await db.collection('usage').doc(doc.id).get();
          const usage = usageDoc.exists ? usageDoc.data() : null;

          return {
            id: doc.id,
            ...orgData,
            usage,
          };
        })
      );

      return NextResponse.json({ organizations });
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
}
```

#### 6.2 Change Tier

**Datei:** `src/app/api/super-admin/organizations/[id]/change-tier/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { db } from '@/lib/firebase/firebase-admin';
import { usageTrackingService } from '@/lib/stripe/usage-tracking-service';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, auth: AuthContext) => {
    if (auth.user?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
      const { tier } = await req.json();
      const organizationId = params.id;

      // Update organization tier
      await db.collection('organizations').doc(organizationId).update({
        tier,
        updatedAt: new Date(),
      });

      // Update usage limits
      const limits = SUBSCRIPTION_LIMITS[tier];
      await db.collection('usage').doc(organizationId).update({
        emailsLimit: limits.emails_per_month,
        contactsLimit: limits.contacts,
        storageLimit: limits.storage_bytes,
        aiWordsLimit: limits.ai_words_per_month,
        teamMembersLimit: limits.users,
        tier,
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
}
```

#### 6.3 Extend Promo

**Datei:** `src/app/api/super-admin/organizations/[id]/extend-promo/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { accountTypeService } from '@/lib/organization/account-type-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, auth: AuthContext) => {
    if (auth.user?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
      const { months } = await req.json();
      await accountTypeService.extendPromo(params.id, months);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
}
```

#### 6.4 Support Notes

**Datei:** `src/app/api/super-admin/organizations/[id]/notes/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { db } from '@/lib/firebase/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, auth: AuthContext) => {
    if (auth.user?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
      const { note } = await req.json();

      await db.collection('organizations').doc(params.id).update({
        supportNotes: FieldValue.arrayUnion({
          note,
          createdBy: auth.userId,
          createdAt: new Date(),
        }),
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
}
```

**Tasks:**
- [ ] Alle 4 API Routes implementieren
- [ ] Super-Admin Checks
- [ ] Error Handling
- [ ] Logging

---

## Testing

### Test Scenarios:

1. **Access Control:**
   - [ ] Normal User → Zugriff verweigert
   - [ ] Super-Admin → Voller Zugriff

2. **Organizations List:**
   - [ ] Alle Orgs werden geladen
   - [ ] Search funktioniert (Name, Email, ID)
   - [ ] Filter: Tier, Type, Status
   - [ ] Stats-Cards korrekt

3. **Detail Modal:**
   - [ ] Alle Infos korrekt angezeigt
   - [ ] Usage-Bars richtig
   - [ ] Quick Actions funktionieren

4. **Change Tier:**
   - [ ] Tier ändern → Limits aktualisiert
   - [ ] Toast-Notification
   - [ ] Table refreshed

5. **Extend Promo:**
   - [ ] +1 Monat → ExpiresAt aktualisiert
   - [ ] +3 Monate → ExpiresAt aktualisiert

6. **CSV Export:**
   - [ ] Filterte Daten werden exportiert
   - [ ] CSV korrekt formatiert

7. **Navigation:**
   - [ ] Link im Super-Admin Menü sichtbar
   - [ ] Active-State korrekt

---

## Definition of Done

- ✅ `/dashboard/super-admin/organizations` Page funktioniert
- ✅ Organizations Table mit Live-Usage
- ✅ Detail Modal mit allen Infos
- ✅ Quick Actions (Change Tier, Extend Promo)
- ✅ Support Notes System
- ✅ CSV Export
- ✅ Search & Filter
- ✅ Stats-Overview
- ✅ API Routes für alle Actions
- ✅ Navigation im Super-Admin Menü
- ✅ Super-Admin Role-Check überall
- ✅ Error Handling & Loading States
- ✅ Alle Test-Scenarios erfolgreich

---

## Nächste Phase

➡️ [Phase 1: Stripe Setup & SDK Integration](./phase-1-stripe-setup.md)

**Hinweis:** Phase 0.5 kann **parallel zu Phase 1** entwickelt werden, da keine direkten Dependencies bestehen.

---

**Erstellt:** 2025-10-28
**Version:** 1.0
**Status:** 📋 Ready to Start (Nach Phase 0, parallel zu Phase 1)
