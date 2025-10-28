# Phase 3: Contract Page (Usage Dashboard)

> **Ziel:** Admin-Seite mit Live-Usage-Metriken, Subscription-Tier-Display und Upgrade-Optionen bauen

**Dauer:** 2-3 Tage
**Status:** ⏳ Pending
**Abhängigkeiten:** Phase 1 (Stripe Setup), Phase 2 (Usage Tracking)

---

## Übersicht

Diese Phase baut die zentrale Contract-Seite für Admins:
- ✅ Live Usage-Metriken mit Progress Bars
- ✅ Subscription-Tier Display mit Feature-Liste
- ✅ Feature-Vergleich (aktuell vs. andere Tiers)
- ✅ Upgrade/Downgrade Buttons
- ✅ Vertragslaufzeit & Renewal-Datum

**URL:** `https://www.celeropress.com/dashboard/admin/contract`

---

## UI/UX Design

### Layout-Struktur:

```
┌─────────────────────────────────────────────────────┐
│ Contract & Usage Dashboard                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Current Plan Card]                                 │
│  BUSINESS - €149/Monat                              │
│  Nächste Zahlung: 15.11.2025                        │
│  [Manage Billing] [Upgrade]                         │
│                                                     │
│ [Usage Metrics Grid]                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Emails   │ │ Kontakte │ │ Storage  │           │
│  │ ████░░░░ │ │ ████████ │ │ ██░░░░░░ │           │
│  │ 49%      │ │ 95% ⚠️   │ │ 23%      │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                     │
│  ┌──────────┐ ┌──────────┐                         │
│  │ AI       │ │ Team     │                         │
│  │ Unlimited│ │ ████░░░░ │                         │
│  │ ∞        │ │ 67%      │                         │
│  └──────────┘ └──────────┘                         │
│                                                     │
│ [Feature Comparison Table]                          │
│                                                     │
│ [Upgrade Options Cards]                             │
│  ┌─────────────┐ ┌─────────────┐                   │
│  │ BUSINESS    │ │ AGENTUR     │                   │
│  │ (Current)   │ │ €399/Monat  │                   │
│  │             │ │ [Upgrade]   │                   │
│  └─────────────┘ └─────────────┘                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Tasks

### 1. Page-Komponente erstellen

**Datei:** `src/app/dashboard/admin/contract/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationUsage } from '@/lib/hooks/useOrganizationUsage';
import { useSubscription } from '@/lib/hooks/useSubscription';
import CurrentPlanCard from '@/components/subscription/CurrentPlanCard';
import UsageMetricsGrid from '@/components/subscription/UsageMetricsGrid';
import FeatureComparisonTable from '@/components/subscription/FeatureComparisonTable';
import UpgradeOptionsCards from '@/components/subscription/UpgradeOptionsCards';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ContractPage() {
  const { user, organizationId } = useAuth();
  const { usage, loading: usageLoading } = useOrganizationUsage();
  const { subscription, loading: subLoading } = useSubscription();

  // Nur Admins erlauben
  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Nur Admins haben Zugriff auf Contract-Einstellungen.
          </p>
        </div>
      </div>
    );
  }

  if (usageLoading || subLoading) {
    return <LoadingSpinner />;
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Keine aktive Subscription gefunden. Bitte kontaktieren Sie den Support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Contract & Usage Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Verwalten Sie Ihr Abo und überprüfen Sie Ihre Feature-Nutzung.
        </p>
      </div>

      <CurrentPlanCard subscription={subscription} />

      {usage && <UsageMetricsGrid usage={usage} tier={subscription.tier} />}

      <FeatureComparisonTable currentTier={subscription.tier} />

      <UpgradeOptionsCards
        currentTier={subscription.tier}
        organizationId={organizationId}
      />
    </div>
  );
}
```

**Tasks:**
- [ ] Page erstellen
- [ ] Auth-Check für Admin-Rolle
- [ ] Loading States implementieren
- [ ] Error Handling

---

### 2. CurrentPlanCard Component

**Datei:** `src/components/subscription/CurrentPlanCard.tsx`

```typescript
import { OrganizationSubscription } from '@/types/subscription';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';
import { ArrowUpIcon, CreditCardIcon } from '@heroicons/react/24/outline';

interface Props {
  subscription: OrganizationSubscription;
}

export default function CurrentPlanCard({ subscription }: Props) {
  const limits = SUBSCRIPTION_LIMITS[subscription.tier];
  const nextPayment = subscription.currentPeriodEnd.toDate();

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-indigo-100 text-sm font-medium">Aktueller Plan</p>
          <h2 className="text-3xl font-bold mt-1">{subscription.tier}</h2>
          <p className="text-xl mt-2">€{limits.price_monthly_eur}/Monat</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = '/dashboard/admin/billing'}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
          >
            <CreditCardIcon className="w-5 h-5" />
            Billing
          </button>

          {subscription.tier !== 'AGENTUR' && (
            <button
              onClick={() => {/* Open upgrade modal */}}
              className="px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition flex items-center gap-2"
            >
              <ArrowUpIcon className="w-5 h-5" />
              Upgrade
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/20">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-indigo-100">Nächste Zahlung</p>
            <p className="font-semibold mt-1">
              {nextPayment.toLocaleDateString('de-DE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <div>
            <p className="text-indigo-100">Status</p>
            <p className="font-semibold mt-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              {subscription.status === 'active' ? 'Aktiv' : subscription.status}
            </p>
          </div>
        </div>
      </div>

      {subscription.cancelAtPeriodEnd && (
        <div className="mt-4 bg-red-500/20 border border-red-300/30 rounded-lg p-3">
          <p className="text-sm">
            ⚠️ Ihr Abo wird am {nextPayment.toLocaleDateString('de-DE')} gekündigt.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Tasks:**
- [ ] Component implementieren
- [ ] Upgrade-Modal-Trigger
- [ ] Styling optimieren
- [ ] Responsive Design

---

### 3. UsageMetricsGrid Component

**Datei:** `src/components/subscription/UsageMetricsGrid.tsx`

```typescript
import { UsageData } from '@/lib/hooks/useOrganizationUsage';
import { SubscriptionTier } from '@/config/subscription-limits';
import UsageMetricCard from './UsageMetricCard';

interface Props {
  usage: UsageData;
  tier: SubscriptionTier;
}

export default function UsageMetricsGrid({ usage, tier }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Feature-Nutzung
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UsageMetricCard
          icon="📧"
          label="Emails"
          current={usage.emails.current}
          limit={usage.emails.limit}
          percentage={usage.emails.percentage}
          unit="Emails"
        />

        <UsageMetricCard
          icon="👥"
          label="Kontakte"
          current={usage.contacts.current}
          limit={usage.contacts.limit}
          percentage={usage.contacts.percentage}
          unit="Kontakte"
        />

        <UsageMetricCard
          icon="💾"
          label="Cloud Speicher"
          current={formatBytes(usage.storage.current)}
          limit={formatBytes(usage.storage.limit)}
          percentage={usage.storage.percentage}
          unit=""
        />

        <UsageMetricCard
          icon="🤖"
          label="KI-Nutzung"
          current={usage.aiWords.current}
          limit={usage.aiWords.limit}
          percentage={usage.aiWords.percentage}
          unit="Wörter"
          unlimited={usage.aiWords.limit === -1}
        />

        <UsageMetricCard
          icon="🧑‍💼"
          label="Team-Mitglieder"
          current={usage.teamMembers.current}
          limit={usage.teamMembers.limit}
          percentage={usage.teamMembers.percentage}
          unit="Mitglieder"
        />
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 GB';
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}
```

**Tasks:**
- [ ] Grid-Layout implementieren
- [ ] Cards rendern
- [ ] Responsive Design
- [ ] Format-Helper für Bytes

---

### 4. UsageMetricCard Component

**Datei:** `src/components/subscription/UsageMetricCard.tsx`

```typescript
interface Props {
  icon: string;
  label: string;
  current: number | string;
  limit: number | string;
  percentage: number;
  unit: string;
  unlimited?: boolean;
}

export default function UsageMetricCard({
  icon,
  label,
  current,
  limit,
  percentage,
  unit,
  unlimited = false
}: Props) {
  // Color based on percentage
  const getColor = () => {
    if (unlimited) return 'text-indigo-600 bg-indigo-50';
    if (percentage < 80) return 'text-green-600 bg-green-50';
    if (percentage < 95) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getProgressColor = () => {
    if (unlimited) return 'bg-indigo-500';
    if (percentage < 80) return 'bg-green-500';
    if (percentage < 95) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-2xl mb-1">{icon}</p>
          <p className="text-sm font-medium text-gray-600">{label}</p>
        </div>
        {!unlimited && percentage >= 90 && (
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
            Limit erreicht
          </span>
        )}
      </div>

      {unlimited ? (
        <div className="text-center py-4">
          <p className="text-4xl font-bold text-indigo-600">∞</p>
          <p className="text-sm text-gray-500 mt-1">Unlimited</p>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-300`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Numbers */}
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {typeof current === 'number' ? current.toLocaleString('de-DE') : current}
              </p>
              <p className="text-xs text-gray-500">
                von {typeof limit === 'number' ? limit.toLocaleString('de-DE') : limit} {unit}
              </p>
            </div>
            <div className={`text-right ${getColor().split(' ')[0]}`}>
              <p className="text-xl font-bold">{percentage}%</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

**Tasks:**
- [ ] Component implementieren
- [ ] Progress Bar Animation
- [ ] Color Logic (grün/gelb/rot)
- [ ] Unlimited-Anzeige

---

### 5. FeatureComparisonTable Component

**Datei:** `src/components/subscription/FeatureComparisonTable.tsx`

```typescript
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/config/subscription-limits';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  currentTier: SubscriptionTier;
}

export default function FeatureComparisonTable({ currentTier }: Props) {
  const tiers: SubscriptionTier[] = ['STARTER', 'BUSINESS', 'AGENTUR'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Feature-Vergleich
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Vergleichen Sie die Features aller Subscription-Tiers
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Feature
              </th>
              {tiers.map(tier => (
                <th
                  key={tier}
                  className={`px-6 py-3 text-center text-xs font-medium uppercase ${
                    tier === currentTier
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-500'
                  }`}
                >
                  {tier}
                  {tier === currentTier && (
                    <span className="block text-[10px] font-normal mt-1">
                      (Aktuell)
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <FeatureRow
              label="Kontakte"
              values={tiers.map(t => SUBSCRIPTION_LIMITS[t].contacts.toLocaleString('de-DE'))}
              currentTier={currentTier}
            />
            <FeatureRow
              label="Emails / Monat"
              values={tiers.map(t => SUBSCRIPTION_LIMITS[t].emails_per_month.toLocaleString('de-DE'))}
              currentTier={currentTier}
            />
            <FeatureRow
              label="KI-Nutzung"
              values={tiers.map(t =>
                t === 'STARTER' ? '50.000 Wörter' : 'Unlimited'
              )}
              currentTier={currentTier}
            />
            <FeatureRow
              label="Team-Mitglieder"
              values={tiers.map(t => SUBSCRIPTION_LIMITS[t].users.toString())}
              currentTier={currentTier}
            />
            <FeatureRow
              label="Cloud Speicher"
              values={tiers.map(t => `${SUBSCRIPTION_LIMITS[t].storage_bytes / (1024**3)} GB`)}
              currentTier={currentTier}
            />
            <FeatureRow
              label="Journalisten-DB"
              values={tiers.map(t => SUBSCRIPTION_LIMITS[t].editors_access)}
              currentTier={currentTier}
              boolean
            />
            <FeatureRow
              label="Support"
              values={tiers.map(t => SUBSCRIPTION_LIMITS[t].support.join(', '))}
              currentTier={currentTier}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeatureRow({
  label,
  values,
  currentTier,
  boolean = false
}: {
  label: string;
  values: (string | boolean)[];
  currentTier: SubscriptionTier;
  boolean?: boolean;
}) {
  const tiers: SubscriptionTier[] = ['STARTER', 'BUSINESS', 'AGENTUR'];

  return (
    <tr>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">
        {label}
      </td>
      {values.map((value, index) => (
        <td
          key={index}
          className={`px-6 py-4 text-sm text-center ${
            tiers[index] === currentTier ? 'bg-indigo-50' : ''
          }`}
        >
          {boolean ? (
            value ? (
              <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
            ) : (
              <XMarkIcon className="w-5 h-5 text-gray-300 mx-auto" />
            )
          ) : (
            <span className="text-gray-700">{value}</span>
          )}
        </td>
      ))}
    </tr>
  );
}
```

**Tasks:**
- [ ] Table implementieren
- [ ] Current-Tier-Highlighting
- [ ] Boolean-Features (Check/X Icons)
- [ ] Responsive Table (horizontales Scrolling auf Mobile)

---

### 6. useSubscription Hook erstellen

**Datei:** `src/lib/hooks/useSubscription.ts`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { OrganizationSubscription } from '@/types/subscription';

export function useSubscription() {
  const { organizationId } = useAuth();
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'subscriptions', organizationId),
      (doc) => {
        if (doc.exists()) {
          setSubscription(doc.data() as OrganizationSubscription);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to subscription:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [organizationId]);

  return { subscription, loading };
}
```

**Tasks:**
- [ ] Hook implementieren
- [ ] Real-time Updates
- [ ] Error Handling

---

## Definition of Done

- ✅ `/dashboard/admin/contract` Page funktioniert
- ✅ Live-Usage-Metriken mit Progress Bars
- ✅ Color-Coding (grün/gelb/rot) basierend auf %
- ✅ Feature-Comparison Table zeigt alle Tiers
- ✅ Current-Plan Card mit Subscription-Info
- ✅ Admin-Only Access (Role-Check)
- ✅ Real-time Updates bei Usage-Changes
- ✅ Responsive Design (Mobile, Tablet, Desktop)
- ✅ Loading States & Error Handling

---

## Nächste Phase

➡️ [Phase 4: Billing Page (Payment Management)](./phase-4-billing-page.md)

---

**Erstellt:** 2025-10-28
**Version:** 1.0
**Status:** 📋 Ready to Start
