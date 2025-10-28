# Phase 4: Billing Page (Payment Management)

> **Ziel:** Billing-Seite mit Zahlungsmethoden-Management, Rechnungshistorie und Payment-Updates bauen

**Dauer:** 2-3 Tage
**Status:** ⏳ Pending
**Abhängigkeiten:** Phase 1 (Stripe Setup)

---

## Übersicht

Diese Phase baut die Billing-Seite für Payment-Management:
- ✅ Zahlungsmethoden-Anzeige & Update
- ✅ Rechnungshistorie mit PDF-Download
- ✅ Nächste Zahlung & Betrag
- ✅ Stripe Customer Portal Integration

**URL:** `https://www.celeropress.com/dashboard/admin/billing`

---

## UI/UX Design

### Layout-Struktur:

```
┌─────────────────────────────────────────────────────┐
│ Billing & Zahlungsverwaltung                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Payment Method Card]                               │
│  💳 •••• •••• •••• 4242                             │
│  Visa | Läuft ab: 12/2027                           │
│  [Update Payment Method]                            │
│                                                     │
│ [Next Payment Card]                                 │
│  Nächste Zahlung: €149,00                           │
│  Fälligkeit: 15. November 2025                      │
│                                                     │
│ [Invoice History Table]                             │
│  ┌────────────────────────────────────────────┐    │
│  │ Datum      │ Betrag  │ Status │ Download   │    │
│  ├────────────────────────────────────────────┤    │
│  │ 15.10.2025 │ €149,00 │ Bezahlt│ [PDF] 📄  │    │
│  │ 15.09.2025 │ €149,00 │ Bezahlt│ [PDF] 📄  │    │
│  │ 15.08.2025 │ €149,00 │ Bezahlt│ [PDF] 📄  │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Tasks

### 1. Page-Komponente erstellen

**Datei:** `src/app/dashboard/admin/billing/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import PaymentMethodCard from '@/components/billing/PaymentMethodCard';
import NextPaymentCard from '@/components/billing/NextPaymentCard';
import InvoiceHistoryTable from '@/components/billing/InvoiceHistoryTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function BillingPage() {
  const { user, organizationId } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    if (subscription?.stripeCustomerId) {
      fetchInvoices(subscription.stripeCustomerId);
    }
  }, [subscription]);

  const fetchInvoices = async (customerId: string) => {
    try {
      const response = await fetch(`/api/stripe/invoices?customerId=${customerId}`);
      const data = await response.json();
      setInvoices(data.invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Nur Admins erlauben
  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Nur Admins haben Zugriff auf Billing-Einstellungen.
          </p>
        </div>
      </div>
    );
  }

  if (subLoading) {
    return <LoadingSpinner />;
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Keine aktive Subscription gefunden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Billing & Zahlungsverwaltung
        </h1>
        <p className="mt-2 text-gray-600">
          Verwalten Sie Ihre Zahlungsmethoden und sehen Sie Ihre Rechnungshistorie.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentMethodCard
          customerId={subscription.stripeCustomerId}
          organizationId={organizationId}
        />

        <NextPaymentCard subscription={subscription} />
      </div>

      <InvoiceHistoryTable
        invoices={invoices}
        loading={loadingInvoices}
      />
    </div>
  );
}
```

**Tasks:**
- [ ] Page erstellen
- [ ] Admin-Check
- [ ] Invoice-Fetching
- [ ] Error Handling

---

### 2. PaymentMethodCard Component

**Datei:** `src/components/billing/PaymentMethodCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { CreditCardIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  customerId: string;
  organizationId: string;
}

export default function PaymentMethodCard({ customerId, organizationId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpdatePaymentMethod = async () => {
    setLoading(true);

    try {
      // Create Stripe Billing Portal Session
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create billing portal session');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Öffnen des Billing-Portals');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <CreditCardIcon className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Zahlungsmethode
          </h3>
          <p className="text-sm text-gray-500">
            Verwalten Sie Ihre Zahlungsinformationen
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">💳</div>
            <div>
              <p className="font-medium text-gray-900">•••• •••• •••• ••••</p>
              <p className="text-sm text-gray-500">
                Details im Stripe-Portal einsehbar
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleUpdatePaymentMethod}
        disabled={loading}
        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Lädt...' : 'Zahlungsmethode verwalten'}
      </button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Sie werden zu Stripe weitergeleitet, um Ihre Zahlungsmethode zu verwalten.
      </p>
    </div>
  );
}
```

**Tasks:**
- [ ] Component implementieren
- [ ] Stripe Billing Portal Integration
- [ ] Loading States
- [ ] Error Handling mit Toast

---

### 3. NextPaymentCard Component

**Datei:** `src/components/billing/NextPaymentCard.tsx`

```typescript
import { OrganizationSubscription } from '@/types/subscription';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface Props {
  subscription: OrganizationSubscription;
}

export default function NextPaymentCard({ subscription }: Props) {
  const limits = SUBSCRIPTION_LIMITS[subscription.tier];
  const nextPaymentDate = subscription.currentPeriodEnd.toDate();
  const amount = limits.price_monthly_eur;

  const daysUntilPayment = Math.ceil(
    (nextPaymentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <CalendarIcon className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Nächste Zahlung
          </h3>
          <p className="text-sm text-gray-500">
            Automatische Abbuchung
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-gray-900">€{amount}</span>
          <span className="text-gray-500">/Monat</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarIcon className="w-4 h-4" />
          <span>
            Fällig am{' '}
            <strong>
              {nextPaymentDate.toLocaleDateString('de-DE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </strong>
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          In {daysUntilPayment} Tagen
        </p>
      </div>

      {subscription.cancelAtPeriodEnd && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            ⚠️ Abo wird am {nextPaymentDate.toLocaleDateString('de-DE')} beendet.
            Keine weitere Zahlung erfolgt.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Tasks:**
- [ ] Component implementieren
- [ ] Days-Until-Payment Berechnung
- [ ] Cancel-Warning anzeigen
- [ ] Styling

---

### 4. InvoiceHistoryTable Component

**Datei:** `src/components/billing/InvoiceHistoryTable.tsx`

```typescript
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  created: number;
  amount_paid: number;
  status: string;
  invoice_pdf: string;
  hosted_invoice_url: string;
}

interface Props {
  invoices: Invoice[];
  loading: boolean;
}

export default function InvoiceHistoryTable({ invoices, loading }: Props) {
  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-100 text-green-800',
      open: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
      uncollectible: 'bg-red-100 text-red-800',
      void: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      paid: 'Bezahlt',
      open: 'Offen',
      draft: 'Entwurf',
      uncollectible: 'Unbezahlbar',
      void: 'Ungültig',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Rechnungshistorie
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Alle Rechnungen der letzten 12 Monate
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-3">Lade Rechnungen...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-500">Keine Rechnungen vorhanden</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Betrag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(invoice.created * 1000).toLocaleDateString('de-DE', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    €{(invoice.amount_paid / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      {invoice.invoice_pdf && (
                        <a
                          href={invoice.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                          PDF
                        </a>
                      )}
                      {invoice.hosted_invoice_url && (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-700 text-xs"
                        >
                          Details
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Tasks:**
- [ ] Table implementieren
- [ ] Status-Badges (bezahlt/offen/etc.)
- [ ] PDF-Download Links
- [ ] Loading & Empty States

---

### 5. API Routes erstellen

#### 5.1 Billing Portal Route

**Datei:** `src/app/api/stripe/billing-portal/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { createBillingPortalSession } from '@/lib/stripe/stripe-service';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body = await req.json();
      const { customerId, returnUrl } = body;

      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer ID required' },
          { status: 400 }
        );
      }

      const session = await createBillingPortalSession(
        customerId,
        returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/billing`
      );

      return NextResponse.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating billing portal session:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}
```

**Tasks:**
- [ ] Route erstellen
- [ ] Auth-Check
- [ ] Error Handling

#### 5.2 Invoices Route

**Datei:** `src/app/api/stripe/invoices/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { stripe } from '@/lib/stripe/stripe-service';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const customerId = searchParams.get('customerId');

      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer ID required' },
          { status: 400 }
        );
      }

      // Fetch invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 12, // Last 12 invoices
      });

      return NextResponse.json({ invoices: invoices.data });
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}
```

**Tasks:**
- [ ] Route erstellen
- [ ] Stripe API Call
- [ ] Error Handling
- [ ] Pagination (optional)

---

### 6. Stripe Customer Portal konfigurieren

**In Stripe Dashboard:**

1. [ ] Gehe zu Settings → Customer Portal
2. [ ] Aktiviere Features:
   - [x] Update payment method
   - [x] View invoice history
   - [x] Cancel subscription (optional)
3. [ ] Branding konfigurieren:
   - Logo hochladen
   - Farben anpassen
   - Business Name
4. [ ] Terms & Privacy URLs hinzufügen

**Tasks:**
- [ ] Customer Portal in Stripe aktivieren
- [ ] Branding konfigurieren
- [ ] Testen mit Test-Customer

---

## Testing

### Test Scenarios:

1. **Payment Method Update:**
   - [ ] Button klicken → Stripe Portal öffnet sich
   - [ ] Neue Kreditkarte hinzufügen
   - [ ] Zurück zur App → Update sichtbar

2. **Invoice History:**
   - [ ] Rechnungen werden korrekt geladen
   - [ ] PDF-Download funktioniert
   - [ ] Status-Badges korrekt
   - [ ] Datum-Formatierung korrekt (DE)

3. **Next Payment:**
   - [ ] Betrag stimmt mit Tier überein
   - [ ] Datum korrekt berechnet
   - [ ] Days-Until richtig

4. **Edge Cases:**
   - [ ] Keine Rechnungen vorhanden
   - [ ] Stripe API Error
   - [ ] Canceled Subscription

---

## Definition of Done

- ✅ `/dashboard/admin/billing` Page funktioniert
- ✅ Payment Method Card mit Stripe Portal Integration
- ✅ Next Payment Card zeigt korrekten Betrag & Datum
- ✅ Invoice History Table mit PDF-Downloads
- ✅ Stripe Customer Portal konfiguriert
- ✅ API Routes für Billing Portal & Invoices
- ✅ Admin-Only Access (Role-Check)
- ✅ Error Handling & Loading States
- ✅ Responsive Design
- ✅ Alle Test-Scenarios erfolgreich

---

## Nächste Phase

➡️ [Phase 5: Limit Enforcement](./phase-5-limit-enforcement.md)

---

**Erstellt:** 2025-10-28
**Version:** 1.0
**Status:** 📋 Ready to Start
