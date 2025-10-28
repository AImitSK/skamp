# CeleroPress Subscription-Features

> **Marktbasierte Pricing-Strategie basierend auf Wettbewerber-Analyse (Stand: Jan 2025)**
>
> - 📊 **Recherche-Basis:** Prowly, Prezly, Cision, Mailchimp, HubSpot, Jasper AI
> - 💰 **Preisspanne:** €49-399/Monat (50-90% günstiger als Wettbewerb)
> - 🎯 **Positionierung:** All-in-One PR-Tool mit fairem Usage-Based Pricing
> - ✅ **Trend:** Unlimited AI statt Token-Limits (wie Jasper, Copy.ai)

---

## Übersicht Subscription-Modelle

| Modell | Beschreibung | Zielgruppe |
|--------|-------------|------------|
| **STARTER** | Einzelplatz Version | Freiberufler, Einzelpersonen |
| **BUSINESS** | Team bis 3 Mitglieder | Kleine Teams, Start-ups |
| **AGENTUR** | Teams ab 4 Mitglieder | Agenturen, große Teams |

---

## Feature-Limits im Vergleich

| Feature | STARTER | BUSINESS | AGENTUR |
|---------|---------|----------|---------|
| **Preis (Monat)** | €49 | €149 | €399 |
| **Preis (Jahr)** | €490 (2 Monate gratis) | €1.490 (2 Monate gratis) | €3.990 (2 Monate gratis) |
| **Kontakte** | 1.000 | 5.000 | 25.000 |
| **Emails** | 2.500 / Monat | 10.000 / Monat | 50.000 / Monat |
| **KI Nutzung** | 50.000 Wörter/Monat | Unlimited | Unlimited |
| **User** | 1 | 3 | 10 |
| **Cloud Speicher** | 5 GB | 25 GB | 100 GB |
| **Journalisten DB** | ❌ Gesperrt | ✅ Freie Nutzung | ✅ Freie Nutzung |
| **Support** | Email | Email + Chat | Email + Chat + Telefon |
| **Onboarding** | Self-Service | 1h Video-Call | Dediziertes Onboarding |

---

## Feature-Beschreibungen

### 1. Kontakte (CRM)

Das CRM-Modul von CeleroPress ermöglicht die Verwaltung von Firmen (Companies) und Kontakten (Contacts) mit umfangreichen Filtermöglichkeiten, Bulk-Actions und Export-Funktionen.

**Documentation:**
- `docs/crm/README.md`

**Navigation:**
- Companies: https://www.celeropress.com/dashboard/contacts/crm/companies
- Contacts: https://www.celeropress.com/dashboard/contacts/crm/contacts

**Subscription-Limits:**
- **STARTER:** 1.000 Kontakte
- **BUSINESS:** 5.000 Kontakte
- **AGENTUR:** 25.000 Kontakte

**Technik Stack:**
- **Firestore Collections:** `companies`, `contacts`
- **Services:**
  - `crm-service.ts` - CRM-Verwaltung
  - `bulk-actions-service.ts` - Massenaktionen
- **Export:** CSV, Excel (via `papaparse`, `xlsx`)
- **Filter:** Multi-Property Firestore Queries mit Composite Indexes

**Stripe Usage Metering:**
- **Metric:** Anzahl aktive Kontakte (Companies + Contacts)
- **Aggregation:** Pro Organization
- **Check:** Bei Create/Import von Kontakten

---

### 2. Emails (Kampagnen & Inbox)

Massenversand von Pressemeldungen über das Pressemeldungen-Modul in Projekten und der Nutzung der Inbox.

**Documentation:**
- Email-Service Architektur (in Planung)

**Navigation:**
- Kampagnen-Versand: https://www.celeropress.com/dashboard/projects/[projectId] → Pressemeldungen Tab
- Inbox: https://www.celeropress.com/dashboard/communication/inbox

**Subscription-Limits:**
- **STARTER:** 2.500 Emails / Monat (~100 Emails/Arbeitstag)
- **BUSINESS:** 10.000 Emails / Monat (~400 Emails/Arbeitstag)
- **AGENTUR:** 50.000 Emails / Monat (~2.000 Emails/Arbeitstag)

**Technik Stack:**
- **Provider:** SendGrid (`@sendgrid/mail` v8.1.5)
- **Versand-Route:** `/api/sendgrid/send-pr-campaign/route.ts`
- **Inbox (Inbound):** `/api/webhooks/sendgrid/inbound/route.ts`
- **Event-Tracking:** `/api/sendgrid/webhook/route.ts` (delivered, bounce, open, click)
- **Services:**
  - `email-address-service.ts` - Domain & Absender-Verwaltung
  - `campaign-monitoring-service.ts` - Versand-Tracking & Analytics
  - `rate-limit-service-api.ts` - Usage Limits & Security
- **Messpunkt:** `successCount` in Response (Zeile 353 in send-pr-campaign)
- **Storage:** Firestore Collections: `emailCampaigns`, `campaignRecipients`, `emailActivity`

**Stripe Usage Metering:**
- **Metric:** Erfolgreich versendete Emails (`successCount`)
- **Aggregation:** Pro Organization & Campaign
- **Webhook:** SendGrid → `/api/sendgrid/webhook/route.ts` → Firestore → Stripe API

---

### 3. KI Nutzung (AI Assistant)

Bei der Verwendung des KI Assistenten zum Schreiben von Pressemeldungen, KI Vorschläge für Headlines, PR-SEO Vorschläge, E-Mail Analyse und KI Vorschläge für E-Mail Antworten.

**Documentation:**
- `GENKIT.md` - Genkit Framework Integration
- `docs/genkit/` - AI-Flow Dokumentation

**Navigation:**
- PR-Kampagnen Editor: https://www.celeropress.com/dashboard/pr-tools/campaigns/campaigns/edit/
- Inbox (Email-Analyse): https://www.celeropress.com/dashboard/communication/inbox

**Subscription-Limits:**
- **STARTER:** 50.000 Wörter / Monat (~25-50 Pressemeldungen)
- **BUSINESS:** Unlimited Wörter
- **AGENTUR:** Unlimited Wörter

**Technik Stack:**
- **Framework:** Genkit v1.21.0 (`genkit`, `@genkit-ai/google-genai`)
- **AI-Provider:** Google Gemini (`gemini-2.5-pro`, `gemini-2.5-flash`)
- **Flows:**
  - `generate-press-release-structured.ts` - Strukturierte PR-Generierung (680 Zeilen)
  - `generate-headlines.ts` - Headline-Vorschläge
  - `pr-seo-score.ts` - SEO-Optimierung (Target: 85-95%)
- **API-Routes:**
  - `/api/ai/generate-structured/route.ts` (120 Zeilen, -84% nach Genkit-Migration)
  - `/api/ai/generate/route.ts` - Standard-Generierung
- **Server:** `src/genkit-server.ts` - Genkit Flow Export
- **Schemas:** `press-release-structured-schemas.ts` (74 Zeilen)

**Features:**
- Strukturierte PR-Generierung mit Prompt Library (700+ Zeilen)
- 7 Industry-Prompts, 4 Tone-Prompts, 3 Audience-Prompts
- PR-SEO Score Optimierung (85-95% Target)
- Dokumenten-Kontext Support (bis zu 3 Dateien, 15k chars)
- Verbessertes Quote-Parsing (aus Body-Paragraphen)

**Stripe Usage Metering:**
- **Metric:** Verbrauchte AI-Tokens (Input + Output)
- **Aggregation:** Pro Organization & Flow
- **Tracking:** Genkit Response Metadata → Firestore → Stripe API
- **Messpunkt:** `response.usage.totalTokens` in AI-Flow Response

---

### 4. Cloud Speicher (Media Management)

Das Media-Modul ist das zentrale Asset-Management-System von CeleroPress. Es ermöglicht das Hochladen, Verwalten, Organisieren und Teilen von Medien-Dateien (Bilder, Videos, Dokumente) in einer hierarchischen Ordnerstruktur.

**Documentation:**
- `docs/media/README.md`

**Navigation:**
- Media Library: https://www.celeropress.com/dashboard/library/media

**Subscription-Limits:**
- **STARTER:** 5 GB (~2.500 hochauflösende Pressebilder)
- **BUSINESS:** 25 GB (~12.500 Pressebilder oder 50 Videos)
- **AGENTUR:** 100 GB (~50.000 Pressebilder oder 200 Videos)

**Technik Stack:**
- **Storage:** Firebase Storage
- **Firestore Collections:** `mediaAssets`, `mediaFolders`
- **Services:**
  - `media-service.ts` - Asset-Verwaltung
  - `media-folders-service.ts` - Ordner-Hierarchie
- **Upload:** Multi-File Upload mit Progress Tracking
- **Formate:** Bilder (JPEG, PNG, GIF), Videos (MP4, MOV), Dokumente (PDF, DOCX)
- **Features:**
  - Ordner-Hierarchie (unbegrenzte Tiefe)
  - Drag & Drop Upload
  - Bildvorschau & Thumbnails
  - Metadaten (Größe, Typ, Upload-Datum)
  - Sharing (Public URLs, Team-Sharing)

**Stripe Usage Metering:**
- **Metric:** Genutzte Storage-Kapazität (in GB)
- **Aggregation:** Pro Organization, alle Assets summiert
- **Check:** Bei Upload, Storage-Limit validieren
- **Tracking:** `totalBytes` in Firestore → Stripe API

---

### 5. Journalisten Datenbank (Editors)

Die Premium-Datenbank (Editors) ist eine kuratierte Journalisten-Datenbank mit Multi-Entity Reference-System.

**Documentation:**
- `docs/editors/README.md`

**Navigation:**
- Editors Library: https://www.celeropress.com/dashboard/library/editors

**Subscription-Limits:**
- **STARTER:** ❌ Gesperrt
- **BUSINESS:** ✅ Freie Nutzung
- **AGENTUR:** ✅ Freie Nutzung

**Technik Stack:**
- **Firestore Collection:** `editors`
- **Services:** `editors-service.ts` - Journalisten-Verwaltung
- **Features:**
  - Multi-Entity Reference (Journalist → Outlet → Beat)
  - Kuratierte Datenbank mit Verifizierung
  - Filter nach Themenbereich, Medium, Region
  - Export für Verteiler-Erstellung
- **Integration:** Direkter Import in CRM & Distribution Lists

**Stripe Access Control:**
- **Check:** Subscription-Tier bei Zugriff auf `/dashboard/library/editors`
- **Enforcement:** UI + API-Route Protection

---

### 6. Team Management

Es gibt einen Organisations-Administrator, der eine gewisse Zahl an Mitgliedern einladen kann, die innerhalb der Organisation alle Anwendungen nutzen können. Ausgenommen sind Account-Einstellungen wie Zahlungsverkehr oder Vertragsmodelle.

**Documentation:**
- Team-Management (in Planung)

**Navigation:**
- Team Settings: https://www.celeropress.com/dashboard/settings/team

**Subscription-Limits:**
- **STARTER:** 1 User (kein Team)
- **BUSINESS:** 3 Teammitglieder
- **AGENTUR:** 10 Teammitglieder (Aufpreis: +€20/Monat pro zusätzlichem User)

**Technik Stack:**
- **Firestore Collections:** `organizations`, `users`, `teamInvitations`
- **Services:**
  - `organization-service.ts` - Organization-Verwaltung
  - `team-invitation-service.ts` - Einladungs-Management
- **API-Routes:**
  - `/api/team/invite/route.ts` - Einladung senden
  - `/api/team/accept-invitation/route.ts` - Einladung akzeptieren
  - `/api/team/process-invitations/route.ts` - Verarbeitung
- **Rollen:**
  - `admin` - Volle Kontrolle (exkl. Billing)
  - `member` - Standard-Zugriff
  - `guest` - Eingeschränkter Zugriff (optional)

**Stripe Usage Metering:**
- **Metric:** Anzahl aktive Team-Mitglieder
- **Aggregation:** Pro Organization
- **Check:** Bei Team-Einladung, User-Limit validieren

---

## Implementierungs-Hinweise für Stripe Integration

### 1. Usage-Based Metering Setup

Für jedes Feature mit Limits muss ein Stripe Metering-Flow implementiert werden:

```typescript
// Beispiel: Email Usage Tracking
async function trackEmailUsage(organizationId: string, count: number) {
  // 1. Aktuellen Verbrauch in Firestore speichern
  await firestore.collection('usage').doc(organizationId).set({
    emailsSent: FieldValue.increment(count),
    lastUpdated: FieldValue.serverTimestamp()
  }, { merge: true });

  // 2. An Stripe Usage API senden
  await stripe.subscriptionItems.createUsageRecord(
    subscriptionItemId,
    { quantity: count }
  );
}
```

### 2. Limit Enforcement

Vor jeder Feature-Nutzung Subscription-Tier prüfen:

```typescript
// Middleware: Check Feature Limit
async function checkFeatureLimit(
  organizationId: string,
  feature: 'emails' | 'contacts' | 'storage' | 'ai_tokens',
  requestedAmount: number
) {
  const subscription = await getSubscription(organizationId);
  const currentUsage = await getCurrentUsage(organizationId, feature);
  const limit = SUBSCRIPTION_LIMITS[subscription.tier][feature];

  if (currentUsage + requestedAmount > limit) {
    throw new Error(`${feature} limit erreicht: ${currentUsage}/${limit}`);
  }
}
```

### 3. Subscription-Limits Konfiguration

```typescript
// src/config/subscription-limits.ts
export const SUBSCRIPTION_LIMITS = {
  STARTER: {
    name: 'STARTER',
    price_monthly_eur: 49,
    price_yearly_eur: 490,
    contacts: 1000,
    emails_per_month: 2500,
    ai_words_per_month: 50000, // ~25-50 Pressemeldungen
    users: 1,
    storage_bytes: 5 * 1024 * 1024 * 1024, // 5 GB
    editors_access: false,
    support: ['email'],
    onboarding: 'self-service'
  },
  BUSINESS: {
    name: 'BUSINESS',
    price_monthly_eur: 149,
    price_yearly_eur: 1490,
    contacts: 5000,
    emails_per_month: 10000,
    ai_words_per_month: -1, // Unlimited
    users: 3,
    storage_bytes: 25 * 1024 * 1024 * 1024, // 25 GB
    editors_access: true,
    support: ['email', 'chat'],
    onboarding: '1h-video-call'
  },
  AGENTUR: {
    name: 'AGENTUR',
    price_monthly_eur: 399,
    price_yearly_eur: 3990,
    contacts: 25000,
    emails_per_month: 50000,
    ai_words_per_month: -1, // Unlimited
    users: 10,
    additional_user_cost_eur: 20, // Pro zusätzlichem User
    storage_bytes: 100 * 1024 * 1024 * 1024, // 100 GB
    editors_access: true,
    support: ['email', 'chat', 'phone'],
    onboarding: 'dedicated'
  }
};

// Helper: Check if feature is unlimited
export function isUnlimited(value: number): boolean {
  return value === -1;
}

// Helper: Format limit display
export function formatLimit(value: number, unit: string): string {
  if (isUnlimited(value)) return 'Unlimited';
  return `${value.toLocaleString('de-DE')} ${unit}`;
}
```

---

## Marktvergleich & Pricing-Rationale

### Wettbewerber-Analyse (2025)

**PR-Software:**
- **Prowly Basic:** $258/Monat (€240) - 1.000 Emails, limitierte Features
- **Prezly:** $100/Monat (€93) - Basis-Features ohne AI
- **Cision:** ~$583/Monat (€542, $7.000/Jahr) - Enterprise-Level
- **PRWeb:** $110-455 pro einzelne Pressemitteilung

**Email-Marketing:**
- **Mailchimp Standard:** $60/Monat - 2.500 Kontakte, 30.000 Emails
- **SendinBlue:** Unlimited Kontakte, aber nur 300 Emails/Tag im Free-Plan

**CRM:**
- **HubSpot Starter:** $15/Monat/User - 1.000 Marketing Kontakte
- **Pipedrive Essential:** €14/Monat/User - Unbegrenzte Kontakte

**AI Content:**
- **Jasper Creator:** $49/Monat - Unlimited Wörter
- **Copy.ai Pro:** $36/Monat - Unlimited Wörter

### Warum CeleroPress konkurrenzfähig ist:

#### STARTER (€49/Monat)
✅ **Günstigste All-in-One Lösung**
- Vergleich: Mailchimp ($13) + Jasper ($49) + Storage = $62+ (€58+)
- CeleroPress bietet mehr Features zum gleichen Preis
- **Value Proposition:** 5-in-1 Tool (PR + Email + CRM + AI + Storage)

#### BUSINESS (€149/Monat)
✅ **80% günstiger als PR-Software-Konkurrenz**
- Prowly Basic: €240/Monat (nur 1.000 Emails, keine AI)
- CeleroPress: €149/Monat (10.000 Emails + Unlimited AI + Journalisten-DB)
- **Ersparnis:** €91/Monat = €1.092/Jahr

#### AGENTUR (€399/Monat)
✅ **90% günstiger als Enterprise-Lösungen**
- Cision: ~€542/Monat (limitierte Features)
- CeleroPress: €399/Monat (volle Features + 10 User)
- **Ersparnis:** €143/Monat = €1.716/Jahr

### Unique Selling Points (USP):

1. **All-in-One Plattform** - Keine Tool-Silos mehr
2. **Unlimited AI ab BUSINESS** - Trend folgen (Jasper, Copy.ai)
3. **Großzügige Email-Limits** - 10x mehr als Prowly im Mid-Tier
4. **Faire Storage-Limits** - 5-100 GB statt 1-20 GB
5. **Transparente Preise** - Keine versteckten Kosten oder Demos-Zwang
6. **Deutsche DSGVO-Compliance** - Firebase EU-Region

---

## Nächste Schritte

1. [ ] Stripe Produkte & Preise konfigurieren
2. [ ] Usage Metering für alle Features implementieren
3. [ ] Limit Enforcement Middleware erstellen
4. [ ] Subscription Management UI bauen
5. [ ] Billing Dashboard für Admins
6. [ ] Usage Analytics Dashboard für User
7. [ ] Email-Benachrichtigungen bei Limit-Erreichen (80%, 90%, 100%)
8. [ ] Upgrade-Flow implementieren

---

---

## Changelog

**Version 1.1** (2025-10-28)
- ✅ Marktrecherche durchgeführt (Prowly, Cision, Mailchimp, Jasper AI)
- ✅ Realistische Limits basierend auf Wettbewerber-Analyse
- ✅ Preise: €49/149/399 statt unrealistische Werte
- ✅ Unlimited AI ab BUSINESS (Trend 2025)
- ✅ Großzügigere Email & Storage Limits
- ✅ Marktvergleichs-Section mit USPs hinzugefügt

**Version 1.0** (2025-10-28)
- Initiale Dokumentation erstellt
- Feature-Beschreibungen mit Technik Stack
- Stripe Integration Hinweise

---

**Letzte Aktualisierung:** 2025-10-28
**Version:** 1.1
**Status:** ✅ Production-Ready - Bereit für Stripe Integration
