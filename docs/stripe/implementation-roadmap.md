# Stripe Integration - Implementation Roadmap

> **Ziel:** Vollständige Stripe-Integration für Usage-Based Pricing mit 3 Subscription-Tiers (STARTER/BUSINESS/AGENTUR)

---

## Phasen-Übersicht

| Phase | Name | Dauer | Status | Abhängigkeiten | Parallel zu |
|-------|------|-------|--------|----------------|-------------|
| **0** | Special Accounts | 2 Tage | 🚨 KRITISCH | - | - |
| **0.5** | Super-Admin Dashboard | 2 Tage | ⏳ Pending | Phase 0 | Phase 1 ✅ |
| **1** | Stripe Setup | 2-3 Tage | ⏳ Pending | Phase 0 | Phase 0.5 ✅ |
| **2** | Usage Tracking | 3-4 Tage | ⏳ Pending | Phase 0, 1 | - |
| **3** | Contract Page | 2-3 Tage | ⏳ Pending | Phase 1, 2 | - |
| **4** | Billing Page | 2-3 Tage | ⏳ Pending | Phase 1 | - |
| **5** | Limit Enforcement | 3-4 Tage | ⏳ Pending | Phase 0, 2 | - |

**Gesamt-Dauer:** ~14-19 Tage (3-4 Wochen) - durch Parallelisierung keine Verzögerung!

⚠️ **WICHTIG:** Phase 0 ist kritisch und MUSS zuerst implementiert werden!
💡 **TIPP:** Phase 0.5 und Phase 1 können parallel laufen → Zeitersparnis!

---

## Phase 0: Special Accounts System
**Dauer:** 2 Tage | **Detail:** [phase-0-special-accounts.md](./phase-0-special-accounts.md)

### Ziele:
- ✅ Account-Type System (regular, promo, beta, internal)
- ✅ Promo-Code System implementieren
- ✅ Super-Admin Interface für Account-Management
- ✅ Enforcement Bypass für Special Accounts
- ✅ Migration bestehender Organizations

### Deliverables:
- `account-type-service.ts` - Account-Type Management
- `promo-code-service.ts` - Promo-Code System
- Super-Admin UI: `/dashboard/super-admin/accounts`
- Migration-Script für bestehende Orgs
- Firestore Schema mit `accountType` Field

### Warum kritisch?
- ❌ Ohne Phase 0: Interne/Demo-Accounts werden durch Limits blockiert
- ❌ Ohne Phase 0: Keine Promo-Codes für Launch möglich
- ❌ Ohne Phase 0: Beta-Tester müssten zahlen
- ✅ Mit Phase 0: Special Accounts haben keine Limits

---

## Phase 0.5: Super-Admin Support Dashboard
**Dauer:** 2 Tage | **Detail:** [phase-0.5-super-admin-dashboard.md](./phase-0.5-super-admin-dashboard.md)
**Kann parallel zu Phase 1 laufen!** ⚡

### Ziele:
- ✅ Organizations Overview Page für Support
- ✅ Live Usage & Limits aller Organizations
- ✅ Quick Actions (Tier ändern, Promo verlängern)
- ✅ Support Notes System
- ✅ CSV Export für Reporting

### Deliverables:
- UI: `/dashboard/super-admin/organizations`
- Organizations Table mit Live-Usage
- Detail Modal mit Quick-Actions
- API Routes für Organization Management
- Navigation im Super-Admin Menü

### Warum wichtig?
- 📞 Telefon-Support: Kunde anruft → Sofort sehen, wo das Problem ist
- 📊 Reporting: Welche Tiers, Usage-Trends, expiring Promos
- ⚡ Quick Actions: Tier ändern, Promo verlängern mit 1 Klick
- 📝 Support Notes: Interne Dokumentation von Support-Cases

---

## Phase 1: Stripe Setup & SDK Integration
**Dauer:** 2-3 Tage | **Detail:** [phase-1-stripe-setup.md](./phase-1-stripe-setup.md)

### Ziele:
- ✅ Stripe Account konfigurieren (Test + Production)
- ✅ 3 Produkte + Preise in Stripe anlegen
- ✅ Stripe SDK in Next.js integrieren
- ✅ Subscription-Limits Config-Datei erstellen
- ✅ Firestore Schema für Subscriptions definieren

### Deliverables:
- Stripe Dashboard mit Produkten
- `subscription-limits.ts` Config
- `stripe-service.ts` Service
- API Routes: `/api/stripe/webhooks`

### Key Decisions:
- **Billing-Modell:** Monatlich + Jährlich (2 Monate gratis)
- **Currency:** EUR
- **Payment Methods:** Kreditkarte, SEPA

---

## Phase 2: Usage Tracking Services
**Dauer:** 3-4 Tage | **Detail:** [phase-2-usage-tracking.md](./phase-2-usage-tracking.md)

### Ziele:
- ✅ Usage-Tracking für Emails (SendGrid → Firestore → Stripe)
- ✅ Usage-Tracking für Kontakte (CRM Create/Import)
- ✅ Usage-Tracking für Storage (Firebase Storage)
- ✅ Usage-Tracking für AI-Wörter (Genkit Flows)
- ✅ Usage-Tracking für Team-Members

### Deliverables:
- `usage-tracking-service.ts`
- Firestore Collection: `usage/{organizationId}`
- Webhooks für Stripe Usage API
- Real-time Usage Dashboard Hook

### Messpunkte:
- `/api/sendgrid/send-pr-campaign/route.ts:353` (successCount)
- `/api/ai/generate-structured/route.ts` (response.usage.totalTokens)
- CRM Import/Create Operations
- Firebase Storage Upload Events
- Team Invitation Accept

---

## Phase 3: Contract Page (Usage Dashboard)
**Dauer:** 2-3 Tage | **Detail:** [phase-3-contract-page.md](./phase-3-contract-page.md)

### Ziele:
- ✅ Live Usage-Metriken mit Progress Bars
- ✅ Subscription-Tier Display
- ✅ Feature-Vergleich (aktuelle Tier vs. andere)
- ✅ Upgrade/Downgrade Buttons
- ✅ Vertragslaufzeit & Renewal-Datum

### Deliverables:
- UI: `/dashboard/admin/contract/page.tsx`
- Components: `UsageMetricCard.tsx`, `SubscriptionTierCard.tsx`
- API: `/api/stripe/subscription/route.ts` (GET current subscription)
- Hook: `useSubscriptionUsage.ts`

### UX:
- Progress Bars mit Farben (Grün <80%, Gelb 80-95%, Rot >95%)
- Upgrade-Banner bei Limit-Erreichen
- Feature-Lock Icons für gesperrte Features

---

## Phase 4: Billing Page (Payment Management)
**Dauer:** 2-3 Tage | **Detail:** [phase-4-billing-page.md](./phase-4-billing-page.md)

### Ziele:
- ✅ Zahlungsmethoden-Management (Stripe Customer Portal)
- ✅ Rechnungshistorie mit PDF-Download
- ✅ Nächste Zahlung & Betrag anzeigen
- ✅ Payment Method Update Flow

### Deliverables:
- UI: `/dashboard/admin/billing/page.tsx`
- Components: `PaymentMethodCard.tsx`, `InvoiceHistoryTable.tsx`
- API: `/api/stripe/billing-portal/route.ts` (Customer Portal Session)
- API: `/api/stripe/invoices/route.ts` (Invoice List)

### Integration:
- Stripe Customer Portal (Hosted by Stripe)
- Invoice Download via Stripe API

---

## Phase 5: Limit Enforcement
**Dauer:** 3-4 Tage | **Detail:** [phase-5-limit-enforcement.md](./phase-5-limit-enforcement.md)

### Ziele:
- ✅ Feature-Blocking bei Limit-Überschreitung
- ✅ Middleware für API-Route Protection
- ✅ UI-Blocking für gesperrte Features
- ✅ Email-Benachrichtigungen bei 80%, 90%, 100% Limit
- ✅ Upgrade-Prompts in der UI

### Deliverables:
- Middleware: `subscription-limit-middleware.ts`
- Service: `limit-enforcement-service.ts`
- Email-Templates: `limit-warning-80.html`, etc.
- UI-Components: `FeatureLockedModal.tsx`, `UpgradePrompt.tsx`

### Enforcement Points:
- Email-Versand: Vor SendGrid Call
- CRM-Import: Vor Firestore Create
- Storage-Upload: Vor Firebase Storage Upload
- AI-Generation: Vor Genkit Flow Call
- Team-Invite: Vor Invitation Send

---

## Abhängigkeiten-Graph

```
Phase 0 (Special Accounts) 🚨 KRITISCH
   ├─→ Phase 0.5 (Super-Admin Dashboard) ⚡ parallel zu Phase 1
   ├─→ Phase 1 (Stripe Setup) ⚡ parallel zu Phase 0.5
   │      ├─→ Phase 2 (Usage Tracking)
   │      │      └─→ Phase 5 (Limit Enforcement)
   │      ├─→ Phase 3 (Contract Page)
   │      └─→ Phase 4 (Billing Page)
   └─→ Phase 5 (Limit Enforcement)
```

**Kritischer Pfad:** Phase 0 → Phase 1 → Phase 2 → Phase 5

**Parallelisierung:** Phase 0.5 + Phase 1 laufen gleichzeitig ⚡

⚠️ **Phase 0 blockiert ALLES!** Ohne Phase 0 würden interne Accounts durch Limits blockiert werden.
💡 **Zeit-Optimierung:** Phase 0.5 kostet keine Extra-Zeit, da parallel zu Phase 1!

---

## Meilensteine

### Milestone 0: Special Accounts Ready (Ende Phase 0) 🚨
- ✅ Account-Type System funktioniert
- ✅ Promo-Codes können erstellt werden
- ✅ Interne Accounts haben keine Limits
- ✅ Bestehende Orgs migriert

### Milestone 0.5: Support Ready (Ende Phase 0.5 + Phase 1)
- ✅ Super-Admin kann alle Organizations einsehen
- ✅ Quick Actions funktionieren (Tier ändern, Promo verlängern)
- ✅ Support-Team kann Telefon-Support machen
- ✅ Stripe Foundation steht (parallel entwickelt)

### Milestone 1: Stripe Foundation (Ende Phase 1)
- ✅ Stripe Account produktiv
- ✅ Alle Produkte & Preise konfiguriert
- ✅ SDK integriert & getestet

### Milestone 2: Usage Tracking Live (Ende Phase 2)
- ✅ Alle Features messen Usage
- ✅ Daten in Firestore & Stripe
- ✅ Real-time Dashboard funktioniert

### Milestone 3: User-Facing Pages (Ende Phase 3 & 4)
- ✅ Contract Page zeigt Live-Metriken
- ✅ Billing Page zeigt Rechnungen
- ✅ Upgrade-Flow funktioniert

### Milestone 4: Production-Ready (Ende Phase 5)
- ✅ Alle Limits werden enforced
- ✅ Email-Benachrichtigungen aktiv
- ✅ Keine Feature-Nutzung über Limit

---

## Risiken & Mitigations

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Stripe Webhook-Delays | Mittel | Hoch | Firestore als Source of Truth, Stripe nur Sync |
| Usage-Tracking-Fehler | Mittel | Hoch | Retry-Logic + Error-Logging |
| False-Positive Limits | Niedrig | Hoch | Grace-Period von 5% über Limit |
| Migration bestehender User | Hoch | Mittel | Migration-Script + Default BUSINESS Tier |

---

## Testing-Strategie

### Unit Tests:
- `subscription-limits.ts` - Limit-Berechnungen
- `usage-tracking-service.ts` - Tracking-Logik
- `limit-enforcement-service.ts` - Enforcement-Logik

### Integration Tests:
- Stripe Webhooks → Firestore Updates
- Usage Tracking → Stripe API
- Limit Enforcement → Feature-Blocking

### E2E Tests:
- Upgrade-Flow (STARTER → BUSINESS)
- Limit-Erreichen → Email-Benachrichtigung
- Feature-Blocking bei Limit-Überschreitung

---

## Post-Launch Monitoring

### Metriken:
- Conversion Rate (Free → STARTER → BUSINESS → AGENTUR)
- Churn Rate pro Tier
- Feature-Usage pro Tier (welche Features werden genutzt?)
- Limit-Erreichen-Häufigkeit (wie oft stoßen User ans Limit?)

### Dashboards:
- Stripe Dashboard: Revenue, MRR, Churn
- Custom Analytics: Feature-Usage, Limit-Trends
- Error-Monitoring: Usage-Tracking Failures

---

## Rollout-Plan

### Soft Launch (Test-User):
1. 10 Test-Accounts auf STARTER/BUSINESS/AGENTUR
2. 2 Wochen Testing
3. Bug-Fixes & Adjustments

### Public Launch:
1. Migration bestehender User auf Default-Tier (BUSINESS)
2. Email-Ankündigung mit Feature-Overview
3. Grace-Period: 30 Tage ohne Enforcement
4. Enforcement aktivieren

---

## Team & Verantwortlichkeiten

| Phase | Verantwortlich | Review |
|-------|----------------|--------|
| Phase 1 | Backend Dev | Tech Lead |
| Phase 2 | Backend Dev | Tech Lead |
| Phase 3 | Frontend Dev | Product Owner |
| Phase 4 | Frontend Dev | Product Owner |
| Phase 5 | Backend + Frontend | Tech Lead + Product Owner |

---

## Nächste Schritte

1. [ ] Review & Approval dieses Roadmaps
2. [ ] 🚨 **START MIT PHASE 0!** (Special Accounts System)
3. [ ] Migration bestehender Organizations
4. [ ] Kick-off Meeting für Phase 1
5. [ ] Stripe Account Setup starten
6. [ ] Detail-Pläne für jede Phase durchgehen

⚠️ **WICHTIG:** Phase 0 kann NICHT übersprungen werden! Ohne Special Accounts würden:
- Interne Demo-Accounts blockiert
- Beta-Tester müssten zahlen
- Keine Promo-Codes möglich
- Super-Admin-Org würde limitiert

---

**Erstellt:** 2025-10-28
**Version:** 1.0
**Status:** 📋 Ready for Implementation
