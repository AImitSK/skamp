# Phase 0: Special Accounts System

> **Ziel:** Promo-Accounts, Beta-Tester und interne Accounts ohne Zahlungspflicht ermöglichen

**Dauer:** 2 Tage
**Status:** ⏳ Pending
**Abhängigkeiten:** Keine - MUSS vor Phase 1 laufen!

---

## Übersicht

Diese Phase legt das Fundament für Special Accounts, die von Subscription-Limits und Zahlungen ausgenommen sind:
- ✅ **Regular:** Normale zahlende Kunden (mit Stripe)
- ✅ **Promo:** Promo-Code Accounts (zeitlich begrenzt oder unbegrenzt)
- ✅ **Beta:** Beta-Tester (voller Zugang, kein Payment)
- ✅ **Internal:** Interne Accounts (Super-Admin, Demo-Accounts)

**Wichtig:** Ohne diese Phase würden auch interne/Promo-Accounts durch Limits blockiert!

---

## Warum Phase 0?

### Problem ohne Special Accounts:
❌ Interne Demo-Accounts würden Email-Limits erreichen
❌ Keine Möglichkeit für Promo-Codes bei Launch
❌ Beta-Tester müssten zahlen oder wären limitiert
❌ Super-Admin-Organization würde blockiert

### Lösung mit Phase 0:
✅ Special Accounts haben **keine Limits**
✅ Promo-Code-System für Launch-Kampagnen
✅ Beta-Tester können alles testen
✅ Interne Accounts nie blockiert

---

## Tasks

### 1. Firestore Schema erweitern

#### 1.1 Organization Schema Update

**Typ-Definition:** `src/types/organization.ts`

```typescript
export type AccountType = 'regular' | 'promo' | 'beta' | 'internal';

export interface PromoDetails {
  code: string;
  grantedBy: string; // User ID des Admins, der den Promo-Code vergab
  grantedAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp | null; // null = nie
  reason: string; // "Launch Promo", "Beta Tester", etc.
  originalTier: 'STARTER' | 'BUSINESS' | 'AGENTUR'; // Welches Tier sie bekommen
}

export interface Organization {
  id: string;
  name: string;
  adminEmail: string;

  // NEU: Account Type
  accountType: AccountType;

  // NEU: Promo Details (nur wenn accountType = 'promo')
  promoDetails?: PromoDetails;

  // Subscription Info (nur wenn accountType = 'regular')
  tier: 'STARTER' | 'BUSINESS' | 'AGENTUR';
  stripeCustomerId?: string; // Nur für 'regular'

  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

**Tasks:**
- [ ] Type Definition erstellen
- [ ] Bestehende Organization-Typen aktualisieren
- [ ] Migration-Script für bestehende Orgs schreiben

---

#### 1.2 Promo Codes Collection

**Collection:** `promoCodes/{codeId}`

```typescript
export interface PromoCode {
  id: string;
  code: string; // "LAUNCH2025", "BETA50", etc.
  tier: 'BUSINESS' | 'AGENTUR'; // Welches Tier wird gewährt
  maxUses: number; // -1 = unlimited
  currentUses: number;
  expiresAt: FirebaseFirestore.Timestamp | null; // null = nie
  validityMonths: number | null; // Wie lange gilt der Account? null = unbegrenzt
  active: boolean;
  createdBy: string; // Super-Admin User ID
  createdAt: FirebaseFirestore.Timestamp;
}
```

**Tasks:**
- [ ] Collection Schema definieren
- [ ] Firestore Security Rules für `promoCodes`
- [ ] Index für `code` + `active`

---

### 2. Account Type Service erstellen

**Datei:** `src/lib/organization/account-type-service.ts`

```typescript
import { db } from '@/lib/firebase/firebase-admin';
import { Organization, PromoDetails, AccountType } from '@/types/organization';

export class AccountTypeService {
  /**
   * Check if organization is a special account (no limits)
   */
  async isSpecialAccount(organizationId: string): Promise<boolean> {
    const org = await this.getOrganization(organizationId);
    return ['promo', 'beta', 'internal'].includes(org.accountType);
  }

  /**
   * Check if account has access to feature
   */
  async hasFeatureAccess(
    organizationId: string,
    feature: string
  ): Promise<boolean> {
    const org = await this.getOrganization(organizationId);

    // Special accounts = full access
    if (['beta', 'internal'].includes(org.accountType)) {
      return true;
    }

    // Promo accounts: Check expiry
    if (org.accountType === 'promo') {
      return this.isPromoValid(org);
    }

    // Regular accounts: Use tier limits
    return this.checkRegularAccountAccess(org, feature);
  }

  /**
   * Check if promo is still valid
   */
  private isPromoValid(org: Organization): boolean {
    if (!org.promoDetails?.expiresAt) {
      return true; // No expiry = always valid
    }

    const now = new Date();
    const expiryDate = org.promoDetails.expiresAt.toDate();

    return now < expiryDate;
  }

  /**
   * Get organization data
   */
  async getOrganization(organizationId: string): Promise<Organization> {
    const doc = await db.collection('organizations').doc(organizationId).get();

    if (!doc.exists) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    return doc.data() as Organization;
  }

  /**
   * Convert promo to regular account
   */
  async convertToRegular(
    organizationId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string
  ): Promise<void> {
    await db.collection('organizations').doc(organizationId).update({
      accountType: 'regular',
      stripeCustomerId,
      stripeSubscriptionId,
      promoDetails: null,
      updatedAt: new Date(),
    });

    console.log(`✅ Converted ${organizationId} to regular account`);
  }

  /**
   * Extend promo expiry
   */
  async extendPromo(
    organizationId: string,
    additionalMonths: number
  ): Promise<void> {
    const org = await this.getOrganization(organizationId);

    if (org.accountType !== 'promo') {
      throw new Error('Organization is not a promo account');
    }

    const currentExpiry = org.promoDetails?.expiresAt?.toDate() || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + additionalMonths);

    await db.collection('organizations').doc(organizationId).update({
      'promoDetails.expiresAt': newExpiry,
      updatedAt: new Date(),
    });

    console.log(`✅ Extended promo for ${organizationId} until ${newExpiry}`);
  }
}

export const accountTypeService = new AccountTypeService();
```

**Tasks:**
- [ ] Service implementieren
- [ ] Unit Tests schreiben
- [ ] Error Handling

---

### 3. Promo Code Service erstellen

**Datei:** `src/lib/organization/promo-code-service.ts`

```typescript
import { db } from '@/lib/firebase/firebase-admin';
import { PromoCode } from '@/types/promo-code';
import { FieldValue } from 'firebase-admin/firestore';

export class PromoCodeService {
  /**
   * Validate and apply promo code
   */
  async applyPromoCode(
    organizationId: string,
    code: string
  ): Promise<{ valid: boolean; tier?: string; error?: string }> {
    // Get promo code
    const promoCodeDoc = await db
      .collection('promoCodes')
      .where('code', '==', code.toUpperCase())
      .where('active', '==', true)
      .limit(1)
      .get();

    if (promoCodeDoc.empty) {
      return { valid: false, error: 'Ungültiger Promo-Code' };
    }

    const promoData = promoCodeDoc.docs[0].data() as PromoCode;

    // Check expiry
    if (promoData.expiresAt && new Date() > promoData.expiresAt.toDate()) {
      return { valid: false, error: 'Promo-Code abgelaufen' };
    }

    // Check max uses
    if (promoData.maxUses !== -1 && promoData.currentUses >= promoData.maxUses) {
      return { valid: false, error: 'Promo-Code bereits vollständig eingelöst' };
    }

    // Calculate expiry for account
    let accountExpiry = null;
    if (promoData.validityMonths !== null) {
      accountExpiry = new Date();
      accountExpiry.setMonth(accountExpiry.getMonth() + promoData.validityMonths);
    }

    // Apply to organization
    await db.collection('organizations').doc(organizationId).update({
      accountType: 'promo',
      tier: promoData.tier,
      promoDetails: {
        code: code.toUpperCase(),
        grantedBy: 'promo-code',
        grantedAt: new Date(),
        expiresAt: accountExpiry,
        reason: `Promo Code: ${code}`,
        originalTier: promoData.tier,
      },
      updatedAt: new Date(),
    });

    // Increment usage count
    await db.collection('promoCodes').doc(promoCodeDoc.docs[0].id).update({
      currentUses: FieldValue.increment(1),
    });

    console.log(`✅ Applied promo code ${code} to ${organizationId}`);

    return { valid: true, tier: promoData.tier };
  }

  /**
   * Create promo code (Super-Admin only)
   */
  async createPromoCode(
    code: string,
    tier: 'BUSINESS' | 'AGENTUR',
    maxUses: number,
    validityMonths: number | null,
    expiresAt: Date | null,
    createdBy: string
  ): Promise<string> {
    // Check if code already exists
    const existing = await db
      .collection('promoCodes')
      .where('code', '==', code.toUpperCase())
      .get();

    if (!existing.empty) {
      throw new Error('Promo-Code existiert bereits');
    }

    const promoDoc = await db.collection('promoCodes').add({
      code: code.toUpperCase(),
      tier,
      maxUses,
      currentUses: 0,
      expiresAt,
      validityMonths,
      active: true,
      createdBy,
      createdAt: new Date(),
    });

    console.log(`✅ Created promo code: ${code}`);

    return promoDoc.id;
  }

  /**
   * Deactivate promo code
   */
  async deactivatePromoCode(code: string): Promise<void> {
    const promoCodeDoc = await db
      .collection('promoCodes')
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();

    if (promoCodeDoc.empty) {
      throw new Error('Promo-Code nicht gefunden');
    }

    await db.collection('promoCodes').doc(promoCodeDoc.docs[0].id).update({
      active: false,
    });

    console.log(`✅ Deactivated promo code: ${code}`);
  }

  /**
   * List all promo codes (Super-Admin)
   */
  async listPromoCodes(): Promise<PromoCode[]> {
    const snapshot = await db.collection('promoCodes').orderBy('createdAt', 'desc').get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PromoCode[];
  }
}

export const promoCodeService = new PromoCodeService();
```

**Tasks:**
- [ ] Service implementieren
- [ ] Code-Validation Logic
- [ ] Usage-Tracking
- [ ] Unit Tests

---

### 4. Enforcement Bypass Integration

**Datei zu ändern:** `src/lib/stripe/limit-enforcement-service.ts`

**Am Anfang von `enforceLimit()` hinzufügen:**

```typescript
import { accountTypeService } from '@/lib/organization/account-type-service';

async enforceLimit(
  organizationId: string,
  feature: string,
  requestedAmount: number
): Promise<void> {
  // ✅ NEU: Check if special account
  const isSpecial = await accountTypeService.isSpecialAccount(organizationId);

  if (isSpecial) {
    console.log(`✅ Bypassing limit for special account: ${organizationId}`);
    return; // No limits for special accounts!
  }

  // Check if promo expired
  const org = await accountTypeService.getOrganization(organizationId);
  if (org.accountType === 'promo' && org.promoDetails?.expiresAt) {
    const now = new Date();
    const expiryDate = org.promoDetails.expiresAt.toDate();

    if (now > expiryDate) {
      throw new Error(
        'Ihr Promo-Account ist abgelaufen. Bitte upgraden Sie zu einem regulären Abo.'
      );
    }
  }

  // ... rest of normal limit checking for 'regular' accounts ...
}
```

**Tasks:**
- [ ] Import hinzufügen
- [ ] Bypass-Logic am Anfang
- [ ] Promo-Expiry-Check
- [ ] Testen mit allen Account-Types

---

### 5. Super-Admin Interface

#### 5.1 Account Management Page

**Datei:** `src/app/dashboard/super-admin/accounts/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AccountTypeSelector from '@/components/super-admin/AccountTypeSelector';
import PromoCodeManager from '@/components/super-admin/PromoCodeManager';
import OrganizationList from '@/components/super-admin/OrganizationList';

export default function SuperAdminAccountsPage() {
  const { user } = useAuth();

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Account Management
        </h1>
        <p className="mt-2 text-gray-600">
          Verwalten Sie Special Accounts und Promo-Codes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PromoCodeManager />
        <AccountTypeSelector />
      </div>

      <OrganizationList />
    </div>
  );
}
```

**Tasks:**
- [ ] Page erstellen
- [ ] Super-Admin Role-Check
- [ ] Layout & Components

---

#### 5.2 Promo Code Manager Component

**Datei:** `src/components/super-admin/PromoCodeManager.tsx`

```typescript
'use client';

import { useState } from 'react';
import { TicketIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function PromoCodeManager() {
  const [code, setCode] = useState('');
  const [tier, setTier] = useState<'BUSINESS' | 'AGENTUR'>('BUSINESS');
  const [maxUses, setMaxUses] = useState(10);
  const [validityMonths, setValidityMonths] = useState<number | null>(3);
  const [loading, setLoading] = useState(false);

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/super-admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          tier,
          maxUses,
          validityMonths,
          expiresAt: null, // oder Date-Picker
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Promo-Code "${code}" erstellt!`);
        setCode('');
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
            <option value="BUSINESS">BUSINESS</option>
            <option value="AGENTUR">AGENTUR</option>
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
            onChange={(e) => setValidityMonths(e.target.value ? parseInt(e.target.value) : null)}
            placeholder="null für unbegrenzt"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            min="1"
          />
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
  );
}
```

**Tasks:**
- [ ] Component implementieren
- [ ] Form-Validation
- [ ] API-Integration
- [ ] Toast-Notifications

---

### 6. API Routes für Super-Admin

#### 6.1 Create Promo Code

**Datei:** `src/app/api/super-admin/promo-codes/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { promoCodeService } from '@/lib/organization/promo-code-service';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    // Super-Admin Check
    if (auth.user?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
      const body = await req.json();
      const { code, tier, maxUses, validityMonths, expiresAt } = body;

      const promoId = await promoCodeService.createPromoCode(
        code,
        tier,
        maxUses,
        validityMonths,
        expiresAt ? new Date(expiresAt) : null,
        auth.userId
      );

      return NextResponse.json({ success: true, promoId });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    if (auth.user?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const promoCodes = await promoCodeService.listPromoCodes();
    return NextResponse.json({ promoCodes });
  });
}
```

**Tasks:**
- [ ] POST Route (Create)
- [ ] GET Route (List)
- [ ] Super-Admin Role-Check
- [ ] Error Handling

---

#### 6.2 Apply Promo Code

**Datei:** `src/app/api/promo-code/apply/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { promoCodeService } from '@/lib/organization/promo-code-service';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body = await req.json();
      const { code } = body;

      const result = await promoCodeService.applyPromoCode(
        auth.organizationId,
        code
      );

      if (result.valid) {
        return NextResponse.json({
          success: true,
          tier: result.tier,
          message: 'Promo-Code erfolgreich eingelöst!',
        });
      } else {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
}
```

**Tasks:**
- [ ] Route erstellen
- [ ] Validation
- [ ] Success/Error Responses

---

### 7. Migration-Script für bestehende Organizations

**Datei:** `src/scripts/migrate-organizations-to-accounttype.ts`

```typescript
import { db } from '@/lib/firebase/firebase-admin';

/**
 * Migrate all existing organizations to have accountType field
 */
export async function migrateOrganizationsToAccountType() {
  const orgsSnapshot = await db.collection('organizations').get();

  console.log(`Migrating ${orgsSnapshot.size} organizations...`);

  for (const doc of orgsSnapshot.docs) {
    const data = doc.data();

    // Skip if already has accountType
    if (data.accountType) {
      console.log(`✅ ${doc.id} already migrated`);
      continue;
    }

    // Determine accountType based on existing data
    let accountType: 'regular' | 'internal' = 'regular';

    // Mark super-admin organization as internal
    if (doc.id === 'SUPER_ADMIN_ORG_ID' || data.name === 'CeleroPress Internal') {
      accountType = 'internal';
    }

    await db.collection('organizations').doc(doc.id).update({
      accountType,
      updatedAt: new Date(),
    });

    console.log(`✅ Migrated ${doc.id} to ${accountType}`);
  }

  console.log('✅ Migration complete');
}

// Run if called directly
if (require.main === module) {
  migrateOrganizationsToAccountType()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
```

**Ausführen:**
```bash
npx tsx src/scripts/migrate-organizations-to-accounttype.ts
```

**Tasks:**
- [ ] Script erstellen
- [ ] Testen mit Backup
- [ ] Auf Production laufen lassen
- [ ] Verify Migration

---

### 8. Firestore Security Rules Update

**Datei:** `firestore.rules`

```javascript
// Promo Codes Collection
match /promoCodes/{codeId} {
  // Only super-admins can write
  allow read: if request.auth != null;
  allow write: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super-admin';
}

// Organizations - add accountType field
match /organizations/{orgId} {
  allow read: if request.auth != null &&
    resource.data.members[request.auth.uid] != null;

  allow update: if request.auth != null &&
    (resource.data.members[request.auth.uid].role == 'admin' ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super-admin');
}
```

**Tasks:**
- [ ] Rules aktualisieren
- [ ] Deploy zu Firebase
- [ ] Testen mit verschiedenen Rollen

---

## Testing

### Test Scenarios:

#### 1. Internal Account:
- [ ] Erstelle interne Organization
- [ ] Versende 10.000 Emails → Kein Limit erreicht
- [ ] Verwende alle Features → Alles funktioniert

#### 2. Beta Account:
- [ ] Markiere Org als 'beta'
- [ ] Alle Features unlimited
- [ ] Kein Stripe Customer benötigt

#### 3. Promo Code:
- [ ] Erstelle Promo-Code "LAUNCH2025" (3 Monate, BUSINESS)
- [ ] User löst Code ein
- [ ] Account-Type = 'promo'
- [ ] Nach 3 Monaten → Expiry-Warnung
- [ ] Versuch über Limit → Blocked nach Expiry

#### 4. Promo Code Limits:
- [ ] Erstelle Code mit maxUses=1
- [ ] 1. User löst ein → Success
- [ ] 2. User löst ein → "Bereits eingelöst"

#### 5. Conversion:
- [ ] Promo-Account läuft ab
- [ ] User upgraded zu Regular
- [ ] Stripe Subscription erstellt
- [ ] accountType = 'regular'

---

## Definition of Done

- ✅ Organization Schema mit `accountType` erweitert
- ✅ Promo Code System implementiert (Service + API)
- ✅ Account Type Service erstellt
- ✅ Enforcement Bypass für Special Accounts
- ✅ Super-Admin Interface funktioniert
- ✅ Migration-Script für bestehende Orgs
- ✅ Firestore Security Rules aktualisiert
- ✅ Alle Test-Scenarios erfolgreich
- ✅ Documentation aktualisiert

---

## Wichtig für nachfolgende Phasen:

### Phase 1 (Stripe Setup):
- ✅ Nur für `accountType = 'regular'` Stripe Customer erstellen
- ✅ Webhook ignoriert Special Accounts

### Phase 2 (Usage Tracking):
- ✅ Tracking läuft für alle Account-Types (für Analytics)
- ✅ Aber Enforcement nur für 'regular'

### Phase 5 (Limit Enforcement):
- ✅ Bypass für Special Accounts am Anfang jeder Funktion
- ✅ Promo-Expiry-Check vor Enforcement

---

## Nächste Phase

➡️ [Phase 1: Stripe Setup & SDK Integration](./phase-1-stripe-setup.md)

---

**Erstellt:** 2025-10-28
**Version:** 1.0
**Status:** 🚨 KRITISCH - MUSS ZUERST! 📋 Ready to Start
