# Phase 2: Usage Tracking Services

> **Ziel:** Usage-Tracking für alle Features implementieren (Emails, Kontakte, Storage, AI, Team-Members)

**Dauer:** 3-4 Tage
**Status:** ⏳ Pending
**Abhängigkeiten:** Phase 1 (Stripe Setup)

---

## Übersicht

In dieser Phase implementieren wir das Tracking für alle messbaren Features:
- ✅ **Emails:** SendGrid → Firestore → Stripe API
- ✅ **Kontakte:** CRM Create/Import → Firestore
- ✅ **Storage:** Firebase Storage → Firestore
- ✅ **AI-Wörter:** Genkit Flows → Firestore
- ✅ **Team-Members:** User Count → Firestore

Am Ende haben wir eine zentrale `usage`-Collection in Firestore mit Real-time Updates.

---

## Firestore Schema

### Collection: `usage/{organizationId}`

```typescript
interface OrganizationUsage {
  organizationId: string;

  // Period info
  periodStart: FirebaseFirestore.Timestamp;
  periodEnd: FirebaseFirestore.Timestamp;

  // Email usage
  emailsSent: number;
  emailsLimit: number;

  // Contact usage
  contactsTotal: number;
  contactsLimit: number;

  // Storage usage (in bytes)
  storageUsed: number;
  storageLimit: number;

  // AI usage (in words)
  aiWordsUsed: number;
  aiWordsLimit: number; // -1 = unlimited

  // Team usage
  teamMembersActive: number;
  teamMembersLimit: number;

  // Metadata
  lastUpdated: FirebaseFirestore.Timestamp;
  tier: 'STARTER' | 'BUSINESS' | 'AGENTUR';
}
```

**Tasks:**
- [ ] Type Definition erstellen (`src/types/usage.ts`)
- [ ] Firestore Security Rules für `usage` Collection
- [ ] Firestore Index für `organizationId`

---

## Tasks

### 1. Usage Tracking Service erstellen

**Datei:** `src/lib/stripe/usage-tracking-service.ts`

```typescript
import { db } from '@/lib/firebase/firebase-admin';
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/config/subscription-limits';
import { FieldValue } from 'firebase-admin/firestore';

export class UsageTrackingService {
  /**
   * Initialize usage tracking for new organization
   */
  async initializeUsage(organizationId: string, tier: SubscriptionTier) {
    const limits = SUBSCRIPTION_LIMITS[tier];
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await db.collection('usage').doc(organizationId).set({
      organizationId,
      periodStart: now,
      periodEnd,
      emailsSent: 0,
      emailsLimit: limits.emails_per_month,
      contactsTotal: 0,
      contactsLimit: limits.contacts,
      storageUsed: 0,
      storageLimit: limits.storage_bytes,
      aiWordsUsed: 0,
      aiWordsLimit: limits.ai_words_per_month,
      teamMembersActive: 1,
      teamMembersLimit: limits.users,
      tier,
      lastUpdated: now,
    });
  }

  /**
   * Track email sent
   */
  async trackEmailsSent(organizationId: string, count: number) {
    await db.collection('usage').doc(organizationId).update({
      emailsSent: FieldValue.increment(count),
      lastUpdated: new Date(),
    });
  }

  /**
   * Track contacts created/imported
   */
  async trackContactsChange(organizationId: string, change: number) {
    await db.collection('usage').doc(organizationId).update({
      contactsTotal: FieldValue.increment(change),
      lastUpdated: new Date(),
    });
  }

  /**
   * Update storage usage
   */
  async updateStorageUsage(organizationId: string, totalBytes: number) {
    await db.collection('usage').doc(organizationId).update({
      storageUsed: totalBytes,
      lastUpdated: new Date(),
    });
  }

  /**
   * Track AI words used
   */
  async trackAIWordsUsed(organizationId: string, words: number) {
    await db.collection('usage').doc(organizationId).update({
      aiWordsUsed: FieldValue.increment(words),
      lastUpdated: new Date(),
    });
  }

  /**
   * Update team members count
   */
  async updateTeamMembersCount(organizationId: string, count: number) {
    await db.collection('usage').doc(organizationId).update({
      teamMembersActive: count,
      lastUpdated: new Date(),
    });
  }

  /**
   * Get current usage for organization
   */
  async getUsage(organizationId: string) {
    const doc = await db.collection('usage').doc(organizationId).get();
    return doc.exists ? doc.data() : null;
  }

  /**
   * Check if feature usage is within limit
   */
  async checkLimit(
    organizationId: string,
    feature: 'emails' | 'contacts' | 'storage' | 'ai_words' | 'team_members',
    requestedAmount: number = 1
  ): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
    const usage = await this.getUsage(organizationId);

    if (!usage) {
      throw new Error('Usage data not found for organization');
    }

    let current: number;
    let limit: number;

    switch (feature) {
      case 'emails':
        current = usage.emailsSent;
        limit = usage.emailsLimit;
        break;
      case 'contacts':
        current = usage.contactsTotal;
        limit = usage.contactsLimit;
        break;
      case 'storage':
        current = usage.storageUsed;
        limit = usage.storageLimit;
        break;
      case 'ai_words':
        current = usage.aiWordsUsed;
        limit = usage.aiWordsLimit;
        break;
      case 'team_members':
        current = usage.teamMembersActive;
        limit = usage.teamMembersLimit;
        break;
    }

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, current, limit, remaining: -1 };
    }

    const allowed = (current + requestedAmount) <= limit;
    const remaining = Math.max(0, limit - current);

    return { allowed, current, limit, remaining };
  }

  /**
   * Reset monthly usage (run at start of billing period)
   */
  async resetMonthlyUsage(organizationId: string) {
    const usage = await this.getUsage(organizationId);

    if (!usage) return;

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await db.collection('usage').doc(organizationId).update({
      periodStart: now,
      periodEnd,
      emailsSent: 0,
      aiWordsUsed: 0, // Reset monthly limits
      lastUpdated: now,
    });
  }
}

export const usageTrackingService = new UsageTrackingService();
```

**Tasks:**
- [ ] Service implementieren
- [ ] Error Handling hinzufügen
- [ ] Logging für alle Tracking-Events

---

### 2. Email-Tracking Integration

**Datei zu ändern:** `src/app/api/sendgrid/send-pr-campaign/route.ts`

**Änderung nach Zeile 349 (nach erfolgreichem Versand):**

```typescript
// NEU: Track email usage
await usageTrackingService.trackEmailsSent(auth.organizationId, successCount);
```

**Tasks:**
- [ ] Import hinzufügen: `import { usageTrackingService } from '@/lib/stripe/usage-tracking-service';`
- [ ] Tracking-Call nach erfolgreichem Versand
- [ ] Error Handling (Tracking-Fehler soll Versand nicht blockieren)

**Weitere Routes:**
- [ ] `/api/sendgrid/send-approval-email/route.ts` - Approval-Emails tracken
- [ ] `/api/email/send/route.ts` - Standard-Email-Versand tracken

---

### 3. Kontakte-Tracking Integration

#### 3.1 CRM Create

**Dateien zu ändern:**
- `src/lib/firebase/crm-service.ts` (Company/Contact Create)

```typescript
// Nach erfolgreichem Create:
await usageTrackingService.trackContactsChange(organizationId, 1);
```

#### 3.2 CRM Import

**Datei zu ändern:** Bulk-Import Route für CRM

```typescript
// Nach erfolgreichem Import:
const importedCount = validContacts.length;
await usageTrackingService.trackContactsChange(organizationId, importedCount);
```

#### 3.3 CRM Delete

```typescript
// Nach erfolgreichem Delete:
await usageTrackingService.trackContactsChange(organizationId, -1);
```

**Tasks:**
- [ ] Create-Tracking in `crm-service.ts`
- [ ] Import-Tracking in Bulk-Import Route
- [ ] Delete-Tracking in Delete-Handler
- [ ] Testen: Create → Delete → Count muss stimmen

---

### 4. Storage-Tracking Integration

**Strategie:** Bei jedem Upload die Gesamtgröße aller Assets für Organization berechnen.

#### 4.1 Storage Service erweitern

**Datei:** `src/lib/firebase/media-service.ts`

```typescript
import { usageTrackingService } from '@/lib/stripe/usage-tracking-service';

// Nach Upload:
async function updateStorageUsage(organizationId: string) {
  // Alle Assets für Organization abrufen
  const assetsSnapshot = await db
    .collection('mediaAssets')
    .where('organizationId', '==', organizationId)
    .get();

  let totalBytes = 0;
  assetsSnapshot.forEach(doc => {
    const asset = doc.data();
    totalBytes += asset.size || 0;
  });

  await usageTrackingService.updateStorageUsage(organizationId, totalBytes);
}
```

**Tasks:**
- [ ] `updateStorageUsage()` Funktion erstellen
- [ ] Nach jedem Upload aufrufen
- [ ] Nach jedem Delete aufrufen
- [ ] Performance optimieren (eventuell Cache)

---

### 5. AI-Wörter-Tracking Integration

**Datei zu ändern:** `src/lib/ai/flows/generate-press-release-structured.ts`

```typescript
import { usageTrackingService } from '@/lib/stripe/usage-tracking-service';

// Nach AI-Generation:
const response = await ai.generate({
  model: googleAI.model('gemini-2.5-pro'),
  prompt: '...',
});

// Wörter zählen
const wordCount = countWords(response.text);
await usageTrackingService.trackAIWordsUsed(organizationId, wordCount);

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}
```

**Weitere Flows:**
- [ ] `generate-headlines.ts`
- [ ] Email-Antwort-Vorschläge
- [ ] Andere AI-Features

**Tasks:**
- [ ] `countWords()` Helper erstellen
- [ ] In allen Genkit Flows integrieren
- [ ] API-Route `/api/ai/generate-structured/route.ts` updaten

---

### 6. Team-Members-Tracking Integration

**Datei zu ändern:** `src/app/api/team/accept-invitation/route.ts`

```typescript
// Nach erfolgreichem Accept:
const teamMembers = await getTeamMemberCount(organizationId);
await usageTrackingService.updateTeamMembersCount(organizationId, teamMembers);
```

**Helper-Funktion:**

```typescript
async function getTeamMemberCount(organizationId: string): Promise<number> {
  const usersSnapshot = await db
    .collection('users')
    .where('organizationId', '==', organizationId)
    .where('status', '==', 'active')
    .get();

  return usersSnapshot.size;
}
```

**Tasks:**
- [ ] Team-Member Count nach Invite-Accept
- [ ] Team-Member Count nach User-Deactivation
- [ ] Initial Count beim Organization-Setup

---

### 7. Real-time Usage Hook erstellen

**Datei:** `src/lib/hooks/useOrganizationUsage.ts`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export interface UsageData {
  emails: { current: number; limit: number; percentage: number };
  contacts: { current: number; limit: number; percentage: number };
  storage: { current: number; limit: number; percentage: number };
  aiWords: { current: number; limit: number; percentage: number };
  teamMembers: { current: number; limit: number; percentage: number };
}

export function useOrganizationUsage() {
  const { organizationId } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'usage', organizationId),
      (doc) => {
        if (!doc.exists()) {
          setLoading(false);
          return;
        }

        const data = doc.data();

        setUsage({
          emails: {
            current: data.emailsSent,
            limit: data.emailsLimit,
            percentage: calculatePercentage(data.emailsSent, data.emailsLimit),
          },
          contacts: {
            current: data.contactsTotal,
            limit: data.contactsLimit,
            percentage: calculatePercentage(data.contactsTotal, data.contactsLimit),
          },
          storage: {
            current: data.storageUsed,
            limit: data.storageLimit,
            percentage: calculatePercentage(data.storageUsed, data.storageLimit),
          },
          aiWords: {
            current: data.aiWordsUsed,
            limit: data.aiWordsLimit,
            percentage: calculatePercentage(data.aiWordsUsed, data.aiWordsLimit),
          },
          teamMembers: {
            current: data.teamMembersActive,
            limit: data.teamMembersLimit,
            percentage: calculatePercentage(data.teamMembersActive, data.teamMembersLimit),
          },
        });

        setLoading(false);
      },
      (error) => {
        console.error('Error listening to usage:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [organizationId]);

  return { usage, loading };
}

function calculatePercentage(current: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return 0;
  return Math.round((current / limit) * 100);
}
```

**Tasks:**
- [ ] Hook implementieren
- [ ] Real-time Updates testen
- [ ] Error Handling
- [ ] Loading States

---

### 8. Monthly Reset Job

**Strategie:** Cloud Function oder Cron Job, der monatlich läuft und Usage zurücksetzt.

**Datei:** `src/scripts/reset-monthly-usage.ts`

```typescript
import { usageTrackingService } from '@/lib/stripe/usage-tracking-service';
import { db } from '@/lib/firebase/firebase-admin';

/**
 * Reset monthly usage for all organizations
 * Run this at the start of each billing period
 */
export async function resetAllMonthlyUsage() {
  const usageSnapshot = await db.collection('usage').get();

  console.log(`Resetting usage for ${usageSnapshot.size} organizations`);

  for (const doc of usageSnapshot.docs) {
    const organizationId = doc.id;
    await usageTrackingService.resetMonthlyUsage(organizationId);
    console.log(`✅ Reset usage for ${organizationId}`);
  }

  console.log('✅ All monthly usage reset complete');
}

// Run if called directly
if (require.main === module) {
  resetAllMonthlyUsage()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
```

**Alternative: Vercel Cron Job**

**Datei:** `src/app/api/cron/reset-usage/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { resetAllMonthlyUsage } from '@/scripts/reset-monthly-usage';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await resetAllMonthlyUsage();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Vercel Cron Config:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/reset-usage",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**Tasks:**
- [ ] Script erstellen
- [ ] Vercel Cron konfigurieren
- [ ] Testen mit manuellem Call
- [ ] Monitoring & Logging

---

### 9. Testing

#### 9.1 Unit Tests

**Datei:** `src/lib/stripe/__tests__/usage-tracking-service.test.ts`

```typescript
import { usageTrackingService } from '../usage-tracking-service';

describe('UsageTrackingService', () => {
  it('should track emails sent', async () => {
    await usageTrackingService.trackEmailsSent('org123', 10);
    const usage = await usageTrackingService.getUsage('org123');
    expect(usage.emailsSent).toBe(10);
  });

  it('should check limits correctly', async () => {
    const result = await usageTrackingService.checkLimit('org123', 'emails', 100);
    expect(result.allowed).toBe(true);
  });

  // ... more tests
});
```

#### 9.2 Integration Tests

- [ ] Email-Versand → Usage Update
- [ ] CRM-Import → Usage Update
- [ ] Storage-Upload → Usage Update
- [ ] AI-Generation → Usage Update

---

## Definition of Done

- ✅ `usage-tracking-service.ts` implementiert & getestet
- ✅ Email-Tracking in allen Versand-Routes integriert
- ✅ Kontakte-Tracking in CRM-Service integriert
- ✅ Storage-Tracking in Media-Service integriert
- ✅ AI-Tracking in Genkit-Flows integriert
- ✅ Team-Members-Tracking implementiert
- ✅ Real-time Hook `useOrganizationUsage()` funktioniert
- ✅ Monthly Reset Job eingerichtet
- ✅ Unit Tests geschrieben & grün
- ✅ Integration Tests erfolgreich

---

## Nächste Phase

➡️ [Phase 3: Contract Page (Usage Dashboard)](./phase-3-contract-page.md)

---

**Erstellt:** 2025-10-28
**Version:** 1.0
**Status:** 📋 Ready to Start
