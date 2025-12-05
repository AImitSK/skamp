# Auto-Reporting Feature - Implementierungsplan

## Übersicht

Automatischer Versand von Monitoring-Reports an CRM-Kontakte (Kunden) in wöchentlichem oder monatlichem Rhythmus.

**Entscheidungen:**
- Zeitzone: Deutschland (Europe/Berlin)
- Retry bei Fehler: Nein - fällt aus, Fehlermeldung in Tabelle
- Benachrichtigung bei Auto-Ende: Nein - endet einfach still
- UI: React Hot Toast (zentralisiert wie CRM)
- Design: Tabellen-Design aus CRM-Bereich übernehmen

---

## Phase 1: Datenmodell & Types

### 1.1 Neue TypeScript-Types erstellen

**Datei:** `src/types/auto-reporting.ts`

```typescript
import { Timestamp } from 'firebase/firestore';

export type ReportingFrequency = 'weekly' | 'monthly';

export type SendStatus = 'success' | 'partial' | 'failed';

export interface AutoReportingRecipient {
  contactId: string;
  email: string;
  name: string; // Für Personalisierung
}

export interface AutoReporting {
  id?: string;
  organizationId: string;
  campaignId: string;
  campaignName: string; // Für Tabellen-Anzeige (denormalisiert)

  // Empfänger (max. 3)
  recipients: AutoReportingRecipient[];

  // Frequenz
  frequency: ReportingFrequency;
  dayOfWeek?: number;  // 0 (Sonntag) - 6 (Samstag) für 'weekly'
  dayOfMonth?: number; // 1-28 für 'monthly' (Standard: 1)

  // Status
  isActive: boolean;

  // Zeitsteuerung (alle Zeiten in Europe/Berlin)
  nextSendAt: Timestamp;
  lastSentAt?: Timestamp;

  // Letzter Versand-Status (für Tabellen-Anzeige)
  lastSendStatus?: SendStatus;
  lastSendError?: string;

  // Verknüpfung zum Monitoring (für Auto-Ende)
  monitoringEndDate: Timestamp;

  // Audit
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AutoReportingSendLog {
  id?: string;
  autoReportingId: string;
  organizationId: string;
  campaignId: string;

  sentAt: Timestamp;
  recipients: string[]; // E-Mail-Adressen

  status: SendStatus;
  errorMessage?: string;

  // Report-Referenz
  pdfUrl?: string;
  pdfStoragePath?: string;
}

// Labels für UI
export const frequencyLabels: Record<ReportingFrequency, string> = {
  weekly: 'Wöchentlich',
  monthly: 'Monatlich'
};

export const dayOfWeekLabels: Record<number, string> = {
  0: 'Sonntag',
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag'
};

export const sendStatusLabels: Record<SendStatus, string> = {
  success: 'Erfolgreich',
  partial: 'Teilweise',
  failed: 'Fehlgeschlagen'
};
```

### 1.2 Firestore Collection

**Collection:** `auto_reportings`

**Indexes benötigt:**
- `organizationId` + `isActive` + `nextSendAt` (für CRON-Query)
- `campaignId` (für Einzelabfragen)

**Collection:** `auto_reporting_logs` (optional, für Historie)

---

## Phase 2: Firebase Services

### 2.1 Auto-Reporting Service (Client)

**Datei:** `src/lib/firebase/auto-reporting-service.ts`

**Funktionen:**
```typescript
// CRUD
createAutoReporting(data, context): Promise<string>
updateAutoReporting(id, data, context): Promise<void>
deleteAutoReporting(id, context): Promise<void>

// Status
toggleAutoReporting(id, isActive, context): Promise<void>

// Queries
getAutoReportingByCampaign(campaignId, context): Promise<AutoReporting | null>
getAutoReportingsForOrganization(context): Promise<AutoReporting[]>

// Manueller Versand
sendReportNow(id, context): Promise<void>  // NEU: Sofort senden
```

### 2.2 Hilfsfunktionen

**Datei:** `src/lib/utils/reporting-helpers.ts`

```typescript
// Berechnet nächstes Versanddatum (Europe/Berlin)
calculateNextSendDate(
  frequency: ReportingFrequency,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date

// Formatiert Versanddatum für Anzeige
formatNextSendDate(date: Timestamp): string
```

---

## Phase 3: UI-Komponenten

### 3.1 Auto-Reporting Button (neben PDF-Export)

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/components/AutoReportingButton.tsx`

- Icon: `ClockIcon` (outline)
- Label: "Auto-Report"
- Öffnet Modal
- Zeigt grünen Dot/Badge wenn aktiv

### 3.2 Auto-Reporting Modal

**Datei:** `src/components/monitoring/AutoReportingModal.tsx`

**Inhalte:**

1. **Empfänger-Auswahl** (max. 3)
   - Kontakt-Suche aus CRM (wie in anderen Bereichen)
   - Chips für ausgewählte Kontakte mit X zum Entfernen
   - Validierung: mindestens 1, maximal 3

2. **Frequenz-Auswahl**
   - Radio-Buttons: Wöchentlich / Monatlich
   - Bei "Wöchentlich": Dropdown für Wochentag (Montag-Sonntag)
   - Bei "Monatlich": Info "Jeden 1. des Monats"

3. **Info-Box** (gelb/warning)
   - "Das Reporting endet automatisch am [Datum]"

4. **Footer-Buttons**
   - Abbrechen (plain)
   - Speichern / Aktivieren (primary)

**Toast-Meldungen:**
- Erfolg: "Auto-Reporting aktiviert"
- Fehler: "Fehler beim Speichern"
- Update: "Einstellungen gespeichert"

### 3.3 Reporting-Übersichtsseite

**Datei:** `src/app/dashboard/analytics/reporting/page.tsx`

**Design:** Analog zu CRM-Tabellen (Companies/Contacts)

**Tabelle:**
| Kampagne | Status | Nächster Versand | Letzter Status | Aktionen |
|----------|--------|------------------|----------------|----------|

**Status-Spalte:**
- Grüner Badge: "Aktiv"
- Grauer Badge: "Pausiert"
- Roter Badge: "Beendet" (wenn Monitoring abgelaufen)

**Letzter Status-Spalte:**
- Grün: Erfolgreich + Datum
- Rot: Fehlgeschlagen + Fehlermeldung (Tooltip)
- Grau: Noch nicht gesendet

**Aktionen-Dropdown [:]:**
- Jetzt senden (NEU) → Sofortiger Versand
- Bearbeiten → Öffnet Modal
- Pausieren / Fortsetzen → Toggle
- Löschen → Confirmation Dialog

**Empty State:**
- "Keine Auto-Reports konfiguriert"
- "Aktiviere Auto-Reports im Monitoring-Bereich einer Kampagne"

### 3.4 Navigation erweitern

**Datei:** `src/app/dashboard/layout.tsx`

Unter "Analyse" → children Array erweitern:
```typescript
{
  name: "Reporting",
  href: "/dashboard/analytics/reporting",
  icon: ClockIcon,
  description: "Automatische Report-Zustellung verwalten"
}
```

---

## Phase 4: CRON-Job für automatischen Versand

### 4.1 API Route

**Datei:** `src/app/api/reporting/cron/route.ts`

**Logik:**
```
1. Auth: Vercel CRON Secret validieren
2. Query: auto_reportings WHERE isActive=true AND nextSendAt <= now
3. Für jeden Eintrag:
   a) Prüfen: monitoringEndDate überschritten?
      → Ja: isActive=false setzen, überspringen
   b) PDF-Report generieren (bestehende Logik)
   c) E-Mail an Recipients senden
   d) Bei Erfolg:
      - lastSentAt = now
      - lastSendStatus = 'success'
      - nextSendAt = calculateNextSendDate(...)
   e) Bei Fehler:
      - lastSendStatus = 'failed'
      - lastSendError = error.message
      - nextSendAt TROTZDEM neu berechnen (kein Retry)
   f) SendLog schreiben
4. Response: { processed: X, success: Y, failed: Z }
```

### 4.2 Manueller Versand API

**Datei:** `src/app/api/reporting/send-now/route.ts`

- POST mit `{ autoReportingId }`
- Gleiche Logik wie CRON, aber für einzelnen Eintrag
- Aktualisiert NICHT nextSendAt (regulärer Rhythmus bleibt)

### 4.3 Vercel CRON Konfiguration

**Datei:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/reporting/cron",
      "schedule": "0 7 * * *"
    }
  ]
}
```
→ Täglich um 7:00 UTC = 8:00/9:00 Uhr deutscher Zeit

### 4.4 E-Mail Template

**Datei:** `src/lib/email/auto-reporting-email-templates.ts`

**Referenz:** Basiert auf `src/lib/email/approval-email-templates.ts`

Das E-Mail-Template nutzt das bestehende Branding-System:
- `EmailBrandingSettings` Interface für Logo, Firmenname, Adresse
- `generateEmailHeader()` - Header mit Logo oder Firmenname-Fallback
- `generateEmailFooter()` - Footer mit Branding (Logo + Adresse)
- `getBaseEmailStyles()` - Konsistente CSS-Styles

**Interface:**
```typescript
export interface AutoReportEmailData {
  recipientName: string;
  recipientEmail: string;
  campaignName: string;
  reportPeriod: string;        // z.B. "01.12.2024 - 07.12.2024"
  reportUrl?: string;          // Download-Link (optional)
  // Branding (wie bei Approval-Emails)
  brandingSettings?: EmailBrandingSettings;
  agencyName?: string;
  agencyLogoUrl?: string;
}
```

**Template-Funktionen:**
```typescript
// Haupt-Template für Report-Versand
getAutoReportEmailTemplate(data: AutoReportEmailData): { subject, html, text }

// Mit automatischem Branding-Loading
getAutoReportEmailTemplateWithBranding(data, organizationId): Promise<{ subject, html, text }>
```

**E-Mail-Struktur:**
```
Betreff: Monitoring-Report: [Kampagnenname] - [Zeitraum]

HEADER (mit Branding)
─────────────────────
[Logo oder Firmenname]

CONTENT
─────────────────────
Hallo [Name],

im Anhang finden Sie den aktuellen Monitoring-Report
für die Kampagne "[Kampagnenname]".

┌─────────────────────────────────────┐
│ Berichtszeitraum: [Datum - Datum]   │
│ Kampagne: [Name]                    │
└─────────────────────────────────────┘

Der Report enthält:
• Medienresonanz und Clippings
• E-Mail-Performance-Metriken
• Reichweiten-Analyse

[Optional: Download-Link wenn PDF nicht als Anhang]

FOOTER (mit Branding)
─────────────────────
[Logo]
[Firmenname]
[Adresse]
---------
[Telefon]
[E-Mail]
[Website]
```

**Wichtig:**
- PDF wird als Anhang versendet (nicht nur Link)
- HTML + Plain-Text Version
- Branding aus Organization-Settings laden
- Fallback auf "CeleroPress" wenn kein Branding

---

## Phase 5: Integration & Edge Cases

### 5.1 Monitoring-Ende

- CRON prüft `monitoringEndDate` bei jedem Lauf
- Wenn überschritten: `isActive: false`
- Kein letzter Report, kein Hinweis - endet einfach

### 5.2 Kampagne gelöscht

- Firestore Security Rule oder Cloud Function
- Löscht zugehöriges Auto-Reporting automatisch

### 5.3 Kontakt gelöscht

- Bei Versand: E-Mail-Validierung
- Ungültige Empfänger überspringen
- Status: `partial` wenn nicht alle erreicht

### 5.4 Bereits aktives Reporting

- Modal zeigt bestehende Konfiguration
- Button wechselt zu "Bearbeiten"

---

## Phase 6: Testing

### 6.1 Unit Tests

- `auto-reporting-service.test.ts`
- `reporting-helpers.test.ts` (calculateNextSendDate)

### 6.2 Component Tests

- `AutoReportingModal.test.tsx`
- `AutoReportingButton.test.tsx`

### 6.3 API Tests

- CRON Route mit Mock-Daten
- Send-Now Route

---

## Dateien-Übersicht

```
src/
├── types/
│   └── auto-reporting.ts                          # Types & Labels
├── lib/
│   ├── firebase/
│   │   └── auto-reporting-service.ts              # Client Service (CRUD)
│   ├── utils/
│   │   └── reporting-helpers.ts                   # Datums-Berechnungen
│   └── email/
│       └── auto-reporting-email-templates.ts      # E-Mail Templates (wie approval-email-templates.ts)
├── app/
│   ├── api/
│   │   └── reporting/
│   │       ├── cron/
│   │       │   └── route.ts                       # CRON Handler
│   │       └── send-now/
│   │           └── route.ts                       # Manueller Versand
│   └── dashboard/
│       └── analytics/
│           ├── monitoring/
│           │   └── [campaignId]/
│           │       └── components/
│           │           └── AutoReportingButton.tsx
│           └── reporting/
│               └── page.tsx                       # Übersichtsseite
└── components/
    └── monitoring/
        └── AutoReportingModal.tsx                 # Konfigurations-Modal

Referenz-Dateien (bestehend):
├── src/lib/email/approval-email-templates.ts      # Vorlage für E-Mail-Templates
└── src/lib/firebase/branding-service.ts           # Branding-Settings laden
```

---

## Abhängigkeiten

- `usePDFReportGenerator` - Bestehender PDF-Generator
- `toastService` - Zentralisiertes Toast-System
- CRM Contact Service - Kontakt-Suche
- Resend - E-Mail-Versand
- Vercel CRON - Zeitgesteuerte Ausführung

---

## Implementierungs-Reihenfolge

1. **Types** erstellen
2. **Firebase Service** implementieren
3. **Helpers** für Datumsberechnung
4. **Modal** bauen und testen
5. **Button** in Monitoring-Seite integrieren
6. **Übersichtsseite** erstellen
7. **Navigation** erweitern
8. **CRON-Job** implementieren
9. **E-Mail Template** erstellen
10. **Tests** schreiben
