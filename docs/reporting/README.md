# Auto-Reporting Dokumentation

> **Modul**: auto-reporting
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 05.12.2024

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Architektur](#architektur)
  - [Datenfluss](#datenfluss)
  - [Komponenten-Übersicht](#komponenten-übersicht)
- [Datenmodell](#datenmodell)
  - [Firestore Collections](#firestore-collections)
  - [TypeScript Types](#typescript-types)
- [API Referenz](#api-referenz)
  - [CRON Endpoint](#cron-endpoint)
  - [Send-Now Endpoint](#send-now-endpoint)
- [Services](#services)
  - [Auto-Reporting Service](#auto-reporting-service)
  - [Reporting Helpers](#reporting-helpers)
  - [E-Mail Templates](#e-mail-templates)
- [UI/UX](#uiux)
  - [AutoReportingModal](#autoreportingmodal)
  - [Reporting-Übersichtsseite](#reporting-übersichtsseite)
  - [AutoReportingButton](#autoreportingbutton)
- [CRON-Job](#cron-job)
  - [Zeitplanung](#zeitplanung)
  - [Verarbeitungslogik](#verarbeitungslogik)
- [E-Mail-Versand](#e-mail-versand)
  - [SendGrid Integration](#sendgrid-integration)
  - [E-Mail Templates](#e-mail-templates-1)
- [PDF-Generierung](#pdf-generierung)
  - [Report-Datensammlung](#report-datensammlung)
  - [HTML-Template](#html-template)
- [Konfiguration](#konfiguration)
  - [Environment Variables](#environment-variables)
  - [Vercel CRON](#vercel-cron)
- [Testing](#testing)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [Performance](#performance)
- [Sicherheit](#sicherheit)

---

## Übersicht

Das **Auto-Reporting Feature** ermöglicht den automatischen, zeitgesteuerten Versand von Monitoring-Reports per E-Mail an bis zu 3 Kundenempfänger pro Kampagne.

### Kernfunktionalität

- **Automatischer Versand**: Reports werden automatisch in wöchentlichem oder monatlichem Rhythmus versendet
- **PDF-Generierung**: Reports werden on-the-fly als PDF generiert (nicht aus vorhandenen PDFs geladen)
- **Multi-Recipient**: Bis zu 3 Empfänger pro Auto-Reporting
- **Personalisierung**: E-Mails werden mit Kundendaten personalisiert
- **Branding**: Unterstützt organisationsspezifisches Branding in E-Mails
- **Flexibles Scheduling**: Wöchentlich (mit Wochentag-Auswahl) oder monatlich (am 1. des Monats)
- **Automatisches Ende**: Deaktiviert sich automatisch wenn das Monitoring ausläuft
- **Manueller Versand**: "Jetzt Versenden"-Funktion für sofortige Reports
- **Status-Tracking**: Logging aller Versandvorgänge mit Fehlerbehandlung

### Use Case

**Szenario**: Eine PR-Agentur möchte ihre Kunden wöchentlich über die Performance einer PR-Kampagne informieren.

1. **Einrichtung**: Im Monitoring-Bereich einer Kampagne wird Auto-Reporting aktiviert
2. **Konfiguration**: 3 CRM-Kontakte werden als Empfänger ausgewählt, Frequenz auf "Wöchentlich, jeden Montag" gesetzt
3. **Automatik**: Jeden Montag um 8:00 Uhr deutscher Zeit (7:00 UTC im Winter, 6:00 UTC im Sommer) wird ein PDF-Report generiert und an die 3 Empfänger versendet
4. **Ende**: Wenn das Monitoring am 1. März endet, wird das Auto-Reporting automatisch deaktiviert

---

## Features

### ✅ Implementierte Features

- **Automatischer Versand via CRON**
  - Täglich um 7:00 UTC läuft ein CRON-Job
  - Verarbeitet alle fälligen Auto-Reportings
  - Batch-Processing: Maximal 20 Reports pro Run
  - Fehlerbehandlung mit Logging

- **Flexible Frequenz-Optionen**
  - Wöchentlich: Auswahl des Wochentags (Montag-Sonntag)
  - Monatlich: Fixer Versand am 1. des Monats um 8:00 Uhr
  - Zeitzone: Europe/Berlin (Berücksichtigung von Sommer-/Winterzeit)

- **PDF-Report-Generierung**
  - On-the-fly Generierung (nicht aus Storage geladen)
  - Monitoring-Daten: Clippings, E-Mail-Statistiken, Reichweiten
  - Branding: Organisationsspezifisches Logo und Farben
  - Format: A4, Hochformat

- **E-Mail-Versand via SendGrid**
  - Personalisierte Anrede pro Empfänger
  - HTML + Plain-Text Fallback
  - PDF als Attachment
  - Branding: Organisationsspezifisches Header/Footer

- **Status-Management**
  - Aktivierung/Pausierung per Toggle
  - Automatische Deaktivierung bei Monitoring-Ende
  - Letzter Versand-Status (Erfolgreich/Teilweise/Fehlgeschlagen)
  - Fehler-Logging für Debugging

- **UI/UX**
  - Modal für Einrichtung/Bearbeitung
  - Übersichtsseite mit allen Auto-Reportings
  - Button im Monitoring-Bereich
  - "Jetzt Versenden"-Funktion

- **CRM-Integration**
  - Empfänger-Auswahl aus CRM-Kontakten
  - Automatische E-Mail-Extraktion
  - Name für Personalisierung

### 🚧 Geplante Erweiterungen

- **Template-Anpassung**: Individuelles Report-Layout pro Organisation
- **Erweiterte Scheduling-Optionen**: Zweimal pro Woche, alle 2 Wochen, quartalsweise
- **Webhook-Benachrichtigungen**: Bei erfolgreichen/fehlgeschlagenen Sendungen
- **Analytics**: Tracking von Report-Öffnungen und -Downloads
- **Custom Report-Inhalte**: Auswahl welche Metriken enthalten sein sollen

---

## Architektur

### Datenfluss

```
┌─────────────────┐
│  Vercel CRON    │ (täglich 7:00 UTC)
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│ /api/reporting/cron                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. Lade fällige Auto-Reportings (nextSendAt <= now)    │ │
│ │ 2. Prüfe Monitoring-Ende → Deaktiviere wenn abgelaufen │ │
│ │ 3. Für jedes Auto-Reporting:                           │ │
│ │    a) Generiere PDF-Report                             │ │
│ │    b) Sende E-Mails an Empfänger (SendGrid)           │ │
│ │    c) Schreibe Log-Eintrag                             │ │
│ │    d) Update nextSendAt für nächsten Versand           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │
         v
┌──────────────────┐        ┌──────────────────┐
│ Firestore        │        │ SendGrid API     │
│ - auto_reportings│◄───────┤ E-Mail-Versand   │
│ - auto_reporting_│        └──────────────────┘
│   logs           │
└──────────────────┘
```

### Komponenten-Übersicht

```
src/
├── types/
│   └── auto-reporting.ts              # TypeScript-Typen
│
├── lib/
│   ├── firebase/
│   │   └── auto-reporting-service.ts  # CRUD-Operationen (Client SDK)
│   │
│   ├── utils/
│   │   └── reporting-helpers.ts       # Datums-Berechnungen
│   │
│   └── email/
│       └── auto-reporting-email-      # E-Mail-Templates
│           templates.ts
│
├── app/
│   ├── api/
│   │   └── reporting/
│   │       ├── cron/
│   │       │   └── route.ts           # CRON-Job Endpoint
│   │       └── send-now/
│   │           └── route.ts           # Manueller Versand Endpoint
│   │
│   └── dashboard/
│       └── analytics/
│           ├── reporting/
│           │   └── page.tsx           # Übersichtsseite
│           │
│           └── monitoring/
│               └── [campaignId]/
│                   └── components/
│                       └── AutoReporting
│                           Button.tsx  # Button im Monitoring
│
└── components/
    └── monitoring/
        ├── AutoReportingModal.tsx     # Einrichtungs-Modal
        │
        └── __tests__/
            └── AutoReportingModal.    # Tests
                test.tsx
```

### Datenfluss-Details

**1. Einrichtung durch User**
```
User → AutoReportingModal → auto-reporting-service.createAutoReporting()
  → Firestore: auto_reportings Collection
```

**2. Automatischer Versand**
```
Vercel CRON (7:00 UTC) → /api/reporting/cron
  → Query: WHERE isActive = true AND nextSendAt <= now
  → Für jedes Reporting:
    a) collectReportDataWithAdminSDK() → Firestore-Daten laden
    b) generateReportHTML() → HTML erstellen
    c) /api/generate-pdf → PDF erstellen
    d) SendGrid API → E-Mails versenden
    e) Update Firestore: nextSendAt, lastSentAt, lastSendStatus
    f) Insert Firestore: auto_reporting_logs
```

**3. Manueller Versand**
```
User → "Jetzt Versenden" Button → /api/reporting/send-now
  → Firebase Auth Token Validierung
  → Identische Logik wie CRON (aber ohne nextSendAt Update)
  → SendGrid API → E-Mails versenden
  → Update Firestore: lastSentAt, lastSendStatus
```

---

## Datenmodell

### Firestore Collections

#### `auto_reportings`

Hauptsammlung für Auto-Reporting-Konfigurationen.

**Collection Path**: `/auto_reportings`

**Indizes**:
- `organizationId` + `campaignId` (für schnelle Kampagnen-Suche)
- `isActive` + `nextSendAt` + `organizationId` (für CRON-Queries)

**Dokument-Struktur**:

```typescript
{
  // Identifikation
  organizationId: string;              // Multi-Tenancy
  campaignId: string;                  // Verknüpfung zur PR-Kampagne
  campaignName: string;                // Denormalisiert für Tabellen-Anzeige

  // Empfänger (max. 3)
  recipients: [
    {
      contactId: string;               // Referenz zu CRM-Kontakt
      email: string;                   // E-Mail-Adresse (denormalisiert)
      name: string;                    // Name für Personalisierung
    }
  ];

  // Frequenz-Einstellungen
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: number;                  // 0-6 (nur bei weekly)
  dayOfMonth?: number;                 // 1-28 (nur bei monthly, Standard: 1)

  // Status
  isActive: boolean;

  // Zeitsteuerung (alle Zeiten in UTC, aber berechnet für Europe/Berlin)
  nextSendAt: Timestamp;               // Nächster Versandtermin
  lastSentAt?: Timestamp;              // Letzter erfolgreicher Versand

  // Letzter Versand-Status
  lastSendStatus?: 'success' | 'partial' | 'failed';
  lastSendError?: string;              // Fehlermeldung bei Fehler

  // Verknüpfung zum Monitoring (für Auto-Ende)
  monitoringEndDate: Timestamp;        // Aus monitoring_trackers

  // Audit
  createdBy: string;                   // User-ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Beispiel-Dokument**:

```json
{
  "organizationId": "org_abc123",
  "campaignId": "campaign_xyz789",
  "campaignName": "Produktlaunch 2024",
  "recipients": [
    {
      "contactId": "contact_123",
      "email": "kunde@firma.de",
      "name": "Max Mustermann"
    },
    {
      "contactId": "contact_456",
      "email": "chef@firma.de",
      "name": "Anna Schmidt"
    }
  ],
  "frequency": "weekly",
  "dayOfWeek": 1,
  "isActive": true,
  "nextSendAt": "2024-12-09T07:00:00Z",
  "lastSentAt": "2024-12-02T07:00:00Z",
  "lastSendStatus": "success",
  "monitoringEndDate": "2025-03-01T00:00:00Z",
  "createdBy": "user_abc",
  "createdAt": "2024-11-15T10:30:00Z",
  "updatedAt": "2024-12-02T07:05:00Z"
}
```

#### `auto_reporting_logs`

Log-Sammlung für alle Versandvorgänge.

**Collection Path**: `/auto_reporting_logs`

**Indizes**:
- `autoReportingId` + `sentAt` (für Log-History-Queries)
- `organizationId` + `sentAt` (für Organisation-Reports)

**Dokument-Struktur**:

```typescript
{
  // Referenzen
  autoReportingId: string;             // Verknüpfung zu auto_reportings
  organizationId: string;              // Multi-Tenancy
  campaignId: string;                  // Für direkte Kampagnen-Suche

  // Versand-Informationen
  sentAt: Timestamp;                   // Zeitpunkt des Versands
  recipients: string[];                // Array von E-Mail-Adressen

  // Status
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;               // Nur bei failed/partial

  // Report-Referenz (optional, derzeit nicht genutzt)
  pdfUrl?: string;
  pdfStoragePath?: string;
}
```

**Beispiel-Dokument**:

```json
{
  "autoReportingId": "reporting_123",
  "organizationId": "org_abc123",
  "campaignId": "campaign_xyz789",
  "sentAt": "2024-12-02T07:05:00Z",
  "recipients": [
    "kunde@firma.de",
    "chef@firma.de"
  ],
  "status": "success"
}
```

**Beispiel-Fehler-Log**:

```json
{
  "autoReportingId": "reporting_123",
  "organizationId": "org_abc123",
  "campaignId": "campaign_xyz789",
  "sentAt": "2024-12-02T07:05:00Z",
  "recipients": [
    "kunde@firma.de",
    "invalid@",
    "chef@firma.de"
  ],
  "status": "partial",
  "errorMessage": "invalid@: Invalid email format; kunde@firma.de: Sent successfully; chef@firma.de: Sent successfully"
}
```

### TypeScript Types

#### `AutoReporting`

```typescript
// src/types/auto-reporting.ts

interface AutoReporting {
  id?: string;
  organizationId: string;
  campaignId: string;
  campaignName: string;

  recipients: AutoReportingRecipient[];

  frequency: ReportingFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;

  isActive: boolean;

  nextSendAt: Timestamp;
  lastSentAt?: Timestamp;

  lastSendStatus?: SendStatus;
  lastSendError?: string;

  monitoringEndDate: Timestamp;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `AutoReportingRecipient`

```typescript
interface AutoReportingRecipient {
  contactId: string;    // Referenz zu CRM-Kontakt
  email: string;        // Denormalisiert für schnellen Zugriff
  name: string;         // Für E-Mail-Personalisierung
}
```

#### `AutoReportingSendLog`

```typescript
interface AutoReportingSendLog {
  id?: string;
  autoReportingId: string;
  organizationId: string;
  campaignId: string;

  sentAt: Timestamp;
  recipients: string[];

  status: SendStatus;
  errorMessage?: string;

  pdfUrl?: string;
  pdfStoragePath?: string;
}
```

#### Enums & Helper Types

```typescript
// Frequenz-Typen
type ReportingFrequency = 'weekly' | 'monthly';

// Status-Typen
type SendStatus = 'success' | 'partial' | 'failed';

// UI-Labels
const frequencyLabels: Record<ReportingFrequency, string> = {
  weekly: 'Wöchentlich',
  monthly: 'Monatlich'
};

const dayOfWeekLabels: Record<number, string> = {
  0: 'Sonntag',
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag'
};

const sendStatusLabels: Record<SendStatus, string> = {
  success: 'Erfolgreich',
  partial: 'Teilweise',
  failed: 'Fehlgeschlagen'
};

const sendStatusColors: Record<SendStatus, string> = {
  success: 'green',
  partial: 'yellow',
  failed: 'red'
};

// Konstanten
const MAX_RECIPIENTS = 3;
const DEFAULT_DAY_OF_MONTH = 1;
const DEFAULT_DAY_OF_WEEK = 1;      // Montag
const DEFAULT_SEND_HOUR = 8;        // 8:00 Uhr deutscher Zeit
```

---

## API Referenz

### CRON Endpoint

**POST** `/api/reporting/cron`

Verarbeitet fällige Auto-Reportings. Wird täglich um 7:00 UTC von Vercel CRON aufgerufen.

#### Authentifizierung

```typescript
// Header
Authorization: Bearer {CRON_SECRET}

// ODER Query-Parameter
?secret={CRON_SECRET}
```

#### Request

```http
POST /api/reporting/cron?secret=your-cron-secret
Content-Type: application/json
```

**Body**: Kein Body erforderlich

#### Response

**Success (200)**:

```json
{
  "success": true,
  "results": {
    "processed": 5,
    "sent": 4,
    "failed": 1,
    "deactivated": 0,
    "errors": [
      "reporting-123: SendGrid API error: Invalid recipient"
    ]
  }
}
```

**No pending reports (200)**:

```json
{
  "success": true,
  "message": "Keine fälligen Auto-Reportings",
  "processed": 0
}
```

**Error (500)**:

```json
{
  "success": false,
  "error": "Fehler beim Verarbeiten der Reports"
}
```

**Unauthorized (401)**:

```json
{
  "error": "Unauthorized"
}
```

#### Health-Check Endpoint

**GET** `/api/reporting/cron?secret={CRON_SECRET}`

Gibt Status-Informationen zurück.

**Response (200)**:

```json
{
  "status": "healthy",
  "timestamp": "2024-12-05T07:00:00.000Z",
  "stats": {
    "pending": 3,
    "active": 12
  }
}
```

#### Verarbeitungslogik

1. **Authentifizierung prüfen**
   - CRON_SECRET aus Environment Variable
   - Bearer Token ODER Query-Parameter

2. **Fällige Reports laden**
   ```typescript
   WHERE isActive = true
     AND nextSendAt <= NOW
   ORDER BY nextSendAt ASC
   LIMIT 20
   ```

3. **Für jedes Auto-Reporting**:
   - **Monitoring-Ende prüfen**: Wenn `monitoringEndDate < now`, deaktiviere
   - **PDF generieren**: `generateReportPDF()`
   - **E-Mails senden**: `sendReportForAutoReporting()`
   - **Status aktualisieren**:
     ```typescript
     nextSendAt = calculateNextSendDate()
     lastSentAt = NOW
     lastSendStatus = 'success' | 'partial' | 'failed'
     lastSendError = errorMessage | null
     ```
   - **Log schreiben**: Eintrag in `auto_reporting_logs`

4. **Fehlerbehandlung**
   - Bei Fehler: Status auf 'failed' setzen
   - nextSendAt wird trotzdem aktualisiert (kein Retry)
   - Fehler wird in `lastSendError` gespeichert

#### Rate Limits & Performance

- **Batch-Größe**: Max. 20 Reports pro CRON-Run
- **Timeout**: 300 Sekunden (5 Minuten) per Vercel Config
- **Parallel-Processing**: Nein, sequenziell (um SendGrid Rate Limits zu respektieren)

#### Monitoring & Logging

```typescript
// Console Logs
[Auto-Reporting CRON] Gestartet
[Auto-Reporting CRON] Zeitstempel: 2024-12-05T07:00:00.000Z
[Auto-Reporting CRON] Gefunden: 5 fällige Reports
[Auto-Reporting CRON] Verarbeite: Produktlaunch 2024 (reporting-123)
[Auto-Reporting CRON] Generiere PDF für Kampagne: campaign-xyz789
[Auto-Reporting CRON] E-Mail gesendet an: kunde@firma.de
[Auto-Reporting CRON] Abgeschlossen: {processed: 5, sent: 4, failed: 1}
```

---

### Send-Now Endpoint

**POST** `/api/reporting/send-now`

Sendet einen Report sofort, ohne den regulären CRON-Rhythmus zu ändern.

#### Authentifizierung

**Firebase ID Token** (Bearer Token):

```typescript
// Header
Authorization: Bearer {FIREBASE_ID_TOKEN}
```

**ODER Session Cookie**:

```typescript
// Cookie
session={SESSION_COOKIE}
```

#### Request

```http
POST /api/reporting/send-now
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "autoReportingId": "reporting-123"
}
```

**Body**:

```typescript
{
  autoReportingId: string;  // ID des Auto-Reportings
}
```

#### Response

**Success (200)**:

```json
{
  "success": true,
  "status": "success",
  "recipients": 3
}
```

**Partial Success (200)**:

```json
{
  "success": true,
  "status": "partial",
  "recipients": 3
}
```

**Error (500)**:

```json
{
  "success": false,
  "error": "PDF-Generierung fehlgeschlagen: Campaign not found"
}
```

**Not Found (404)**:

```json
{
  "error": "Auto-Reporting nicht gefunden"
}
```

**Bad Request (400)**:

```json
{
  "error": "autoReportingId erforderlich"
}
```

**Unauthorized (401)**:

```json
{
  "error": "Invalid token"
}
```

#### Verarbeitungslogik

1. **Authentifizierung**
   - Firebase ID Token verifizieren ODER
   - Session Cookie verifizieren

2. **Auto-Reporting laden**
   ```typescript
   const reporting = await adminDb
     .collection('auto_reportings')
     .doc(autoReportingId)
     .get();
   ```

3. **Report senden**
   - Identische Logik wie CRON
   - **WICHTIG**: `nextSendAt` wird NICHT geändert

4. **Status aktualisieren**
   ```typescript
   lastSentAt = NOW
   lastSendStatus = 'success' | 'partial' | 'failed'
   lastSendError = errorMessage | null
   // nextSendAt bleibt unverändert!
   ```

5. **Log schreiben**
   - Eintrag in `auto_reporting_logs`

#### Verwendung im Frontend

```typescript
// AutoReportingButton.tsx (Beispiel)

const handleSendNow = async (reporting: AutoReporting) => {
  const token = await user.getIdToken();

  const response = await fetch('/api/reporting/send-now', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      autoReportingId: reporting.id
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const result = await response.json();
  console.log(`Report gesendet: ${result.status}`);
};
```

---

## Services

### Auto-Reporting Service

**Datei**: `src/lib/firebase/auto-reporting-service.ts`

Client-seitiger Service für CRUD-Operationen auf Auto-Reportings.

#### API-Übersicht

```typescript
interface ServiceContext {
  organizationId: string;
  userId: string;
}

const autoReportingService = {
  // CRUD
  createAutoReporting(data, context): Promise<string>
  updateAutoReporting(id, data, context): Promise<void>
  deleteAutoReporting(id, context): Promise<void>

  // Status
  toggleAutoReporting(id, isActive, context): Promise<void>

  // Queries
  getAutoReportingByCampaign(campaignId, context): Promise<AutoReporting | null>
  getAutoReportingsForOrganization(context): Promise<AutoReporting[]>
  getAutoReportingById(id, context): Promise<AutoReporting | null>

  // Logs
  getAutoReportingLogs(autoReportingId, context, limit?): Promise<AutoReportingSendLog[]>
}
```

#### createAutoReporting

Erstellt ein neues Auto-Reporting für eine Kampagne.

```typescript
async function createAutoReporting(
  data: CreateAutoReportingData,
  context: ServiceContext
): Promise<string>
```

**Parameter**:

```typescript
interface CreateAutoReportingData {
  campaignId: string;
  campaignName: string;
  recipients: AutoReportingRecipient[];
  frequency: ReportingFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monitoringEndDate: Timestamp;
}
```

**Beispiel**:

```typescript
const id = await autoReportingService.createAutoReporting(
  {
    campaignId: 'campaign-123',
    campaignName: 'Produktlaunch 2024',
    recipients: [
      {
        contactId: 'contact-1',
        email: 'kunde@firma.de',
        name: 'Max Mustermann'
      }
    ],
    frequency: 'weekly',
    dayOfWeek: 1, // Montag
    monitoringEndDate: Timestamp.fromDate(new Date('2025-03-01'))
  },
  {
    organizationId: 'org-123',
    userId: 'user-abc'
  }
);

console.log('Auto-Reporting erstellt:', id);
```

**Logik**:

1. Berechne `nextSendAt` mit `calculateNextSendDate()`
2. Baue Firestore-Dokument dynamisch auf (keine undefined-Werte!)
3. Füge `dayOfWeek` nur bei `frequency === 'weekly'` hinzu
4. Füge `dayOfMonth` nur bei `frequency === 'monthly'` hinzu
5. Setze `isActive: true` per Default
6. Füge Audit-Felder hinzu: `createdBy`, `createdAt`, `updatedAt`

**Wichtige Hinweise**:

- **Keine undefined-Werte**: Firestore erlaubt keine `undefined`. Felder werden nur hinzugefügt wenn sie einen Wert haben.
- **Zeitzone**: `nextSendAt` wird für Europe/Berlin berechnet (Sommer-/Winterzeit berücksichtigt)
- **serverTimestamp()**: Für `createdAt` und `updatedAt` verwenden

#### updateAutoReporting

Aktualisiert ein bestehendes Auto-Reporting.

```typescript
async function updateAutoReporting(
  id: string,
  data: Partial<AutoReportingFormData>,
  context: ServiceContext
): Promise<void>
```

**Beispiel**:

```typescript
await autoReportingService.updateAutoReporting(
  'reporting-123',
  {
    frequency: 'monthly',
    dayOfMonth: 1,
    recipients: [
      {
        contactId: 'contact-1',
        email: 'kunde@firma.de',
        name: 'Max Mustermann'
      },
      {
        contactId: 'contact-2',
        email: 'chef@firma.de',
        name: 'Anna Schmidt'
      }
    ]
  },
  {
    organizationId: 'org-123',
    userId: 'user-abc'
  }
);
```

**Logik**:

1. Lade existierendes Dokument
2. Sicherheitscheck: `organizationId` muss übereinstimmen
3. Wenn Frequenz geändert wurde, berechne `nextSendAt` neu
4. Baue Update-Objekt dynamisch (keine undefined-Werte)
5. Update Firestore-Dokument

#### deleteAutoReporting

Löscht ein Auto-Reporting.

```typescript
async function deleteAutoReporting(
  id: string,
  context: ServiceContext
): Promise<void>
```

**Beispiel**:

```typescript
await autoReportingService.deleteAutoReporting(
  'reporting-123',
  {
    organizationId: 'org-123',
    userId: 'user-abc'
  }
);
```

**Logik**:

1. Lade existierendes Dokument
2. Sicherheitscheck: `organizationId` muss übereinstimmen
3. Lösche Dokument
4. **Hinweis**: Logs in `auto_reporting_logs` bleiben erhalten (für Historie)

#### toggleAutoReporting

Aktiviert oder pausiert ein Auto-Reporting.

```typescript
async function toggleAutoReporting(
  id: string,
  isActive: boolean,
  context: ServiceContext
): Promise<void>
```

**Beispiel**:

```typescript
// Pausieren
await autoReportingService.toggleAutoReporting(
  'reporting-123',
  false,
  {
    organizationId: 'org-123',
    userId: 'user-abc'
  }
);

// Wieder aktivieren
await autoReportingService.toggleAutoReporting(
  'reporting-123',
  true,
  {
    organizationId: 'org-123',
    userId: 'user-abc'
  }
);
```

**Logik**:

1. Lade existierendes Dokument
2. Sicherheitscheck: `organizationId` muss übereinstimmen
3. Wenn `isActive = true`, berechne `nextSendAt` neu (sonst bleibt es unverändert)
4. Update `isActive` und optional `nextSendAt`

**Use Case**:

- **Pausieren**: User möchte temporär keine Reports versenden (z.B. Weihnachtsurlaub)
- **Fortsetzen**: Berechnet das nächste Versanddatum neu ab dem aktuellen Datum

#### getAutoReportingByCampaign

Lädt das Auto-Reporting für eine bestimmte Kampagne.

```typescript
async function getAutoReportingByCampaign(
  campaignId: string,
  context: ServiceContext
): Promise<AutoReporting | null>
```

**Beispiel**:

```typescript
const reporting = await autoReportingService.getAutoReportingByCampaign(
  'campaign-123',
  {
    organizationId: 'org-123',
    userId: 'user-abc'
  }
);

if (reporting) {
  console.log('Auto-Reporting gefunden:', reporting);
} else {
  console.log('Kein Auto-Reporting für diese Kampagne');
}
```

**Query**:

```typescript
WHERE organizationId = 'org-123'
  AND campaignId = 'campaign-123'
```

**Hinweis**: Pro Kampagne gibt es maximal 1 Auto-Reporting.

#### getAutoReportingsForOrganization

Lädt alle Auto-Reportings einer Organisation.

```typescript
async function getAutoReportingsForOrganization(
  context: ServiceContext
): Promise<AutoReporting[]>
```

**Beispiel**:

```typescript
const reportings = await autoReportingService.getAutoReportingsForOrganization({
  organizationId: 'org-123',
  userId: 'user-abc'
});

console.log(`${reportings.length} Auto-Reportings gefunden`);
```

**Query**:

```typescript
WHERE organizationId = 'org-123'
ORDER BY createdAt DESC
```

**Use Case**: Übersichtsseite `/dashboard/analytics/reporting`

#### getAutoReportingById

Lädt ein einzelnes Auto-Reporting per ID.

```typescript
async function getAutoReportingById(
  id: string,
  context: ServiceContext
): Promise<AutoReporting | null>
```

**Beispiel**:

```typescript
const reporting = await autoReportingService.getAutoReportingById(
  'reporting-123',
  {
    organizationId: 'org-123',
    userId: 'user-abc'
  }
);
```

**Logik**:

1. Lade Dokument per ID
2. Sicherheitscheck: `organizationId` muss übereinstimmen
3. Return `null` wenn nicht gefunden oder keine Berechtigung

#### getAutoReportingLogs

Lädt die Versand-Logs für ein Auto-Reporting.

```typescript
async function getAutoReportingLogs(
  autoReportingId: string,
  context: ServiceContext,
  limit: number = 10
): Promise<AutoReportingSendLog[]>
```

**Beispiel**:

```typescript
const logs = await autoReportingService.getAutoReportingLogs(
  'reporting-123',
  {
    organizationId: 'org-123',
    userId: 'user-abc'
  },
  20
);

logs.forEach(log => {
  console.log(`${log.sentAt.toDate()}: ${log.status}`);
});
```

**Query**:

```typescript
WHERE organizationId = 'org-123'
  AND autoReportingId = 'reporting-123'
ORDER BY sentAt DESC
LIMIT 10
```

**Use Case**: Historie/Debugging anzeigen

---

### Reporting Helpers

**Datei**: `src/lib/utils/reporting-helpers.ts`

Hilfs-Funktionen für Datums-Berechnungen und Formatierungen.

#### calculateNextSendDate

Berechnet das nächste Versanddatum basierend auf Frequenz und Wochentag/Monatstag.

```typescript
function calculateNextSendDate(
  frequency: ReportingFrequency,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date
```

**Parameter**:
- `frequency`: `'weekly'` oder `'monthly'`
- `dayOfWeek`: 0 (Sonntag) - 6 (Samstag), nur für weekly
- `dayOfMonth`: 1-28, nur für monthly (Standard: 1)

**Rückgabe**: JavaScript `Date`-Objekt in UTC, aber berechnet für Europe/Berlin um 8:00 Uhr

**Beispiele**:

```typescript
// Wöchentlich, jeden Montag
const nextMonday = calculateNextSendDate('weekly', 1);
console.log(nextMonday); // Nächster Montag, 8:00 Uhr deutscher Zeit

// Monatlich, am 1. des Monats
const firstOfMonth = calculateNextSendDate('monthly', undefined, 1);
console.log(firstOfMonth); // 1. des nächsten Monats, 8:00 Uhr

// Wöchentlich, jeden Freitag
const nextFriday = calculateNextSendDate('weekly', 5);
```

**Logik**:

**Weekly**:
1. Aktueller Tag und Uhrzeit in deutscher Zeit
2. Berechne Tage bis zum Ziel-Wochentag
3. Wenn Ziel-Tag heute ist:
   - Vor 8:00 Uhr: Heute
   - Nach 8:00 Uhr: Nächste Woche
4. Wenn Ziel-Tag bereits vorbei: Nächste Woche
5. Erstelle Date-Objekt für 8:00 Uhr deutscher Zeit

**Monthly**:
1. Aktueller Tag und Uhrzeit in deutscher Zeit
2. Wenn Ziel-Tag diesen Monat schon vorbei: Nächster Monat
3. Wenn heute der Ziel-Tag ist:
   - Vor 8:00 Uhr: Heute
   - Nach 8:00 Uhr: Nächster Monat
4. Stelle sicher dass Tag im Monat existiert (z.B. 31. Februar → 28.)
5. Erstelle Date-Objekt für 8:00 Uhr deutscher Zeit

**Zeitzone-Handling**:

Die Funktion verwendet `createGermanDateTime()` um sicherzustellen dass der Report immer um 8:00 Uhr **deutscher Zeit** versendet wird, unabhängig von Sommer-/Winterzeit:

```typescript
// Intern verwendet
function createGermanDateTime(
  year: number,
  month: number,
  day: number,
  hour: number = 8,
  minute: number = 0
): Date {
  // Berechnet UTC-Offset für deutsche Zeit
  // Berücksichtigt automatisch Sommer-/Winterzeit
  // Gibt UTC-Date zurück das in Deutschland die gewünschte Zeit ergibt
}
```

#### formatNextSendDate

Formatiert ein Timestamp für die Anzeige.

```typescript
function formatNextSendDate(timestamp: Timestamp): string
```

**Beispiel**:

```typescript
const timestamp = Timestamp.fromDate(new Date('2024-12-09T07:00:00Z'));
const formatted = formatNextSendDate(timestamp);
console.log(formatted); // "Mo, 09.12.2024 um 08:00 Uhr"
```

**Format**: `"Wochentag, TT.MM.JJJJ um HH:MM Uhr"`

#### formatShortDate

Formatiert ein Timestamp als kurzes Datum.

```typescript
function formatShortDate(timestamp: Timestamp): string
```

**Beispiel**:

```typescript
const timestamp = Timestamp.fromDate(new Date('2024-12-09'));
const formatted = formatShortDate(timestamp);
console.log(formatted); // "09.12.2024"
```

**Format**: `"TT.MM.JJJJ"`

#### formatReportPeriod

Formatiert einen Zeitraum für den Report.

```typescript
function formatReportPeriod(startDate: Date, endDate: Date): string
```

**Beispiel**:

```typescript
const start = new Date('2024-11-25');
const end = new Date('2024-12-01');
const period = formatReportPeriod(start, end);
console.log(period); // "25.11.2024 - 01.12.2024"
```

**Format**: `"TT.MM.JJJJ - TT.MM.JJJJ"`

#### calculateReportPeriod

Berechnet den Berichtszeitraum basierend auf der Frequenz.

```typescript
function calculateReportPeriod(
  frequency: ReportingFrequency,
  referenceDate: Date = new Date()
): { start: Date; end: Date }
```

**Beispiel**:

```typescript
// Wöchentlicher Report: Letzte 7 Tage
const weeklyPeriod = calculateReportPeriod('weekly');
console.log(weeklyPeriod);
// { start: Date (vor 7 Tagen), end: Date (heute) }

// Monatlicher Report: Letzter Monat (ca. 30 Tage)
const monthlyPeriod = calculateReportPeriod('monthly');
console.log(monthlyPeriod);
// { start: Date (vor 30 Tagen), end: Date (heute) }
```

**Use Case**: Wird verwendet um die Report-Daten zu filtern (Clippings, E-Mails)

#### isMonitoringExpired

Prüft ob das Monitoring-Enddatum überschritten ist.

```typescript
function isMonitoringExpired(monitoringEndDate: Timestamp): boolean
```

**Beispiel**:

```typescript
const endDate = Timestamp.fromDate(new Date('2025-03-01'));
const isExpired = isMonitoringExpired(endDate);

if (isExpired) {
  console.log('Monitoring ist abgelaufen');
}
```

**Use Case**:
- CRON-Job prüft dies und deaktiviert Auto-Reportings
- UI zeigt "Beendet"-Badge

#### isSendDateReached

Prüft ob ein Versanddatum erreicht oder überschritten ist.

```typescript
function isSendDateReached(nextSendAt: Timestamp): boolean
```

**Beispiel**:

```typescript
const nextSend = Timestamp.fromDate(new Date('2024-12-09T07:00:00Z'));
const isReached = isSendDateReached(nextSend);

if (isReached) {
  console.log('Report sollte jetzt versendet werden');
}
```

**Use Case**: CRON-Job verwendet dies für die Query:

```typescript
WHERE nextSendAt <= NOW
```

---

### E-Mail Templates

**Datei**: `src/lib/email/auto-reporting-email-templates.ts`

Templates für Auto-Reporting E-Mails mit Branding-Support.

#### getAutoReportEmailTemplate

Generiert E-Mail-Template für Auto-Reports.

```typescript
function getAutoReportEmailTemplate(
  data: AutoReportEmailData
): {
  subject: string;
  html: string;
  text: string;
}
```

**Parameter**:

```typescript
interface AutoReportEmailData {
  recipientName: string;        // Für Personalisierung
  recipientEmail: string;
  campaignName: string;
  reportPeriod: string;         // z.B. "25.11.2024 - 01.12.2024"
  frequency: 'weekly' | 'monthly';

  // Optionales Branding
  brandingSettings?: EmailBrandingSettings;
  agencyName?: string;
  agencyLogoUrl?: string;
}
```

**Beispiel**:

```typescript
const emailTemplate = getAutoReportEmailTemplate({
  recipientName: 'Max Mustermann',
  recipientEmail: 'kunde@firma.de',
  campaignName: 'Produktlaunch 2024',
  reportPeriod: '02.12.2024 - 09.12.2024',
  frequency: 'weekly',
  agencyName: 'PR-Agentur GmbH',
  agencyLogoUrl: 'https://example.com/logo.png'
});

console.log(emailTemplate.subject);
// "Wöchentlicher Monitoring-Report: Produktlaunch 2024"

console.log(emailTemplate.html);
// HTML mit Logo, personalisierten Inhalten, etc.

console.log(emailTemplate.text);
// Plain-Text Fallback
```

**Template-Struktur**:

**HTML**:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Responsive CSS */
  </style>
</head>
<body>
  <!-- Header mit Logo/Firmenname -->
  <div class="header">
    <img src="logo.png" alt="Firma">
  </div>

  <!-- Hauptinhalt -->
  <div class="content">
    <h1>Wöchentlicher Monitoring-Report</h1>
    <p>Hallo Max Mustermann,</p>
    <p>im Anhang finden Sie den aktuellen Report...</p>

    <!-- Info-Box -->
    <div class="info-box">
      <strong>Berichtszeitraum:</strong> 02.12.2024 - 09.12.2024<br>
      <strong>Kampagne:</strong> Produktlaunch 2024<br>
      <strong>Frequenz:</strong> Wöchentlich
    </div>

    <!-- Inhalt-Übersicht -->
    <ul>
      <li>Medienresonanz und Clippings</li>
      <li>E-Mail-Performance-Metriken</li>
      <li>Reichweiten-Analyse</li>
    </ul>
  </div>

  <!-- Footer mit Kontaktdaten -->
  <div class="footer">
    <img src="logo.png" alt="Firma">
    <strong>PR-Agentur GmbH</strong><br>
    Musterstraße 123<br>
    12345 Berlin<br>
    ---------<br>
    Email: info@agentur.de<br>
    Web: <a href="https://agentur.de">agentur.de</a>
  </div>
</body>
</html>
```

**Text** (Plain-Text Fallback):
```
Wöchentlicher Monitoring-Report: Produktlaunch 2024

Hallo Max Mustermann,

im Anhang finden Sie den aktuellen Monitoring-Report für die Kampagne "Produktlaunch 2024".

BERICHTSZEITRAUM: 02.12.2024 - 09.12.2024
KAMPAGNE: Produktlaunch 2024
FREQUENZ: Wöchentlich

Der Report enthält:
- Medienresonanz und Clippings
- E-Mail-Performance-Metriken
- Reichweiten-Analyse

Den vollständigen Report finden Sie im PDF-Anhang dieser E-Mail.

---
Diese E-Mail wurde automatisch generiert.
© 2024 PR-Agentur GmbH. Alle Rechte vorbehalten.
```

#### getAutoReportEmailTemplateWithBranding

Lädt Branding-Einstellungen automatisch und generiert Template.

```typescript
async function getAutoReportEmailTemplateWithBranding(
  data: AutoReportEmailData,
  organizationId: string
): Promise<{
  subject: string;
  html: string;
  text: string;
}>
```

**Beispiel**:

```typescript
const emailTemplate = await getAutoReportEmailTemplateWithBranding(
  {
    recipientName: 'Max Mustermann',
    recipientEmail: 'kunde@firma.de',
    campaignName: 'Produktlaunch 2024',
    reportPeriod: '02.12.2024 - 09.12.2024',
    frequency: 'weekly'
  },
  'org-123'
);
```

**Logik**:
1. Lade `BrandingSettings` aus Firestore: `/branding_settings/{organizationId}`
2. Wenn vorhanden, füge zu `data.brandingSettings` hinzu
3. Rufe `getAutoReportEmailTemplate()` auf

**Use Case**: Wird in API-Routes verwendet (`/api/reporting/cron`, `/api/reporting/send-now`)

---

## UI/UX

### AutoReportingModal

**Datei**: `src/components/monitoring/AutoReportingModal.tsx`

Modal-Dialog für Einrichtung und Bearbeitung von Auto-Reportings.

#### Props

```typescript
interface AutoReportingModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  organizationId: string;
  existingReporting: AutoReporting | null;
  onSaved: (reporting: AutoReporting) => void;
  onDeleted: () => void;
}
```

#### Verwendung

```typescript
import { AutoReportingModal } from '@/components/monitoring/AutoReportingModal';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existingReporting, setExistingReporting] = useState<AutoReporting | null>(null);

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        Auto-Reporting einrichten
      </Button>

      <AutoReportingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        campaignId="campaign-123"
        campaignName="Produktlaunch 2024"
        organizationId="org-123"
        existingReporting={existingReporting}
        onSaved={(reporting) => {
          setExistingReporting(reporting);
          setIsModalOpen(false);
        }}
        onDeleted={() => {
          setExistingReporting(null);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
```

#### Features

**1. Empfänger-Auswahl**
- Dropdown mit CRM-Kontakten der Organisation
- Maximal 3 Empfänger
- Anzeige als Chips mit Namen
- Entfernen per X-Button
- Validierung: Kontakt muss E-Mail-Adresse haben

**2. Frequenz-Auswahl**
- Radio-Buttons: Wöchentlich / Monatlich
- Bei "Wöchentlich": Dropdown für Wochentag (Montag-Sonntag)
- Bei "Monatlich": Info-Text "Am 1. des Monats um 8:00 Uhr"

**3. Monitoring-Ende Info**
- Info-Box mit Enddatum des Monitorings
- Hinweis dass Auto-Reporting automatisch endet
- Wenn kein Monitoring gefunden: Fehler-Box

**4. Aktionen**
- **Abbrechen**: Schließt Modal ohne Speichern
- **Löschen**: Nur bei existierenden Reportings, Bestätigung erforderlich
- **Aktivieren/Speichern**: Erstellt oder aktualisiert Auto-Reporting

**5. Validierung**
- Mindestens 1 Empfänger erforderlich
- Monitoring muss aktiv sein
- Speichern-Button deaktiviert wenn Validierung fehlschlägt

#### UI-Flow

**Neu-Erstellung**:
```
1. User öffnet Modal
2. Modal lädt CRM-Kontakte und Monitoring-Tracker
3. User wählt Empfänger aus Dropdown → Chips erscheinen
4. User wählt Frequenz (weekly/monthly)
5. User wählt Wochentag (bei weekly)
6. User klickt "Aktivieren"
7. autoReportingService.createAutoReporting()
8. onSaved() wird aufgerufen mit neuem Reporting
9. Modal schließt
```

**Bearbeitung**:
```
1. User öffnet Modal mit existierendem Reporting
2. Modal lädt Daten und initialisiert Form mit existierenden Werten
3. User ändert Empfänger/Frequenz
4. User klickt "Speichern"
5. autoReportingService.updateAutoReporting()
6. onSaved() wird aufgerufen mit aktualisiertem Reporting
7. Modal schließt
```

**Löschen**:
```
1. User klickt "Löschen"-Button
2. Bestätigungs-Dialog
3. autoReportingService.deleteAutoReporting()
4. onDeleted() wird aufgerufen
5. Modal schließt
```

#### Code-Beispiel: Empfänger hinzufügen

```typescript
const handleAddRecipient = (contactId: string) => {
  // Maximal 3 Empfänger
  if (selectedRecipients.length >= MAX_RECIPIENTS) {
    toastService.warning('Maximal 3 Empfänger erlaubt');
    return;
  }

  // Finde Kontakt in CRM-Daten
  const contact = contacts.find(c => c.id === contactId);
  if (!contact) return;

  // Prüfe ob bereits hinzugefügt
  if (selectedRecipients.some(r => r.contactId === contactId)) {
    toastService.warning('Kontakt bereits hinzugefügt');
    return;
  }

  // Extrahiere E-Mail (primär oder erste)
  const email = contact.emails?.find(e => e.isPrimary)?.email
    || contact.emails?.[0]?.email;

  if (!email) {
    toastService.error('Kontakt hat keine E-Mail-Adresse');
    return;
  }

  // Baue Empfänger-Objekt
  const name = `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`.trim()
    || email;

  const newRecipient: AutoReportingRecipient = {
    contactId,
    email,
    name
  };

  setSelectedRecipients([...selectedRecipients, newRecipient]);
};
```

---

### Reporting-Übersichtsseite

**Datei**: `src/app/dashboard/analytics/reporting/page.tsx`

Übersichtsseite für alle Auto-Reportings einer Organisation.

#### URL

```
/dashboard/analytics/reporting
```

#### Features

**1. Liste aller Auto-Reportings**
- Tabellarische Darstellung
- Spalten:
  - **Kampagne**: Name + Anzahl Empfänger
  - **Status**: Badge (Aktiv/Pausiert/Beendet)
  - **Frequenz**: Wöchentlich/Monatlich + Wochentag
  - **Nächster Versand**: Datum + Uhrzeit
  - **Letzter Status**: Badge + Fehler-Icon
  - **Aktionen**: Dropdown-Menü

**2. Status-Badges**
- **Aktiv** (grün): `isActive = true` und Monitoring nicht abgelaufen
- **Pausiert** (grau): `isActive = false`
- **Beendet** (rot): Monitoring abgelaufen (`monitoringEndDate < now`)

**3. Aktionen pro Reporting**
- **Jetzt senden**: Sofortiger Report-Versand via `/api/reporting/send-now`
- **Bearbeiten**: Öffnet AutoReportingModal
- **Pausieren/Fortsetzen**: Toggle-Funktion
- **Löschen**: Mit Bestätigung

**4. Empty State**
- Anzeige wenn keine Auto-Reportings konfiguriert
- Button "Zum Monitoring" führt zu `/dashboard/analytics/monitoring`

#### UI-Layout

**Desktop**:
```
┌──────────────────────────────────────────────────────────────┐
│ Auto-Reporting                                               │
│ Automatische Report-Zustellung an Kunden verwalten          │
├──────────────────────────────────────────────────────────────┤
│ KAMPAGNE       │ STATUS │ FREQUENZ    │ NÄCHSTER  │ LETZTER │
│                │        │             │ VERSAND   │ STATUS  │
├────────────────┼────────┼─────────────┼───────────┼─────────┤
│ Produktlaunch  │ ● Aktiv│ Wöchentlich │ 09.12.2024│ ✓ Erfolg│
│ 3 Empfänger    │        │ (Montag)    │ 07:00 Uhr │ reich   │
│                │        │             │           │ 02.12.24│
│                │        │             │           │    ⋮    │
└────────────────┴────────┴─────────────┴───────────┴─────────┘
```

**Dropdown-Menü**:
```
⋮
├─ 📧 Jetzt senden
├─ ✏️  Bearbeiten
├─ ────────────
├─ ⏸  Pausieren
└─ 🗑️  Löschen
```

#### Code-Beispiel: Jetzt Senden

```typescript
const handleSendNow = async (reporting: AutoReporting) => {
  if (!reporting.id || !user) return;

  try {
    toastService.loading('Report wird gesendet...');

    // Firebase ID-Token für Authentifizierung
    const token = await user.getIdToken();

    const response = await fetch('/api/reporting/send-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        autoReportingId: reporting.id
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Versand fehlgeschlagen');
    }

    toastService.dismiss();
    toastService.success('Report wurde versendet');
    loadReportings(); // Reload Daten
  } catch (error) {
    toastService.dismiss();
    console.error('Fehler beim Senden:', error);
    toastService.error(error instanceof Error ? error.message : 'Versand fehlgeschlagen');
  }
};
```

---

### AutoReportingButton

**Datei**: `src/app/dashboard/analytics/monitoring/[campaignId]/components/AutoReportingButton.tsx`

Button im Monitoring-Bereich zum Einrichten/Bearbeiten von Auto-Reporting.

#### Verwendung

```typescript
import { AutoReportingButton } from './components/AutoReportingButton';

function MonitoringPage() {
  return (
    <div>
      <h1>Monitoring</h1>
      <AutoReportingButton />
    </div>
  );
}
```

#### Features

**1. Status-Indikator**
- Grüner pulsierender Dot wenn Auto-Reporting aktiv
- Kein Indikator wenn pausiert oder nicht vorhanden

**2. Button-Text**
- "Auto-Report" (immer gleich, unabhängig vom Status)

**3. Modal-Öffnung**
- Klick öffnet AutoReportingModal
- Modal zeigt existierende Daten oder leeres Formular

**4. Auto-Loading**
- Lädt automatisch existierendes Auto-Reporting beim Mount
- useEffect mit Abhängigkeiten: `campaignId`, `organizationId`, `userId`

#### UI-States

**Laden**:
```typescript
<Button disabled>
  <ClockIcon /> Laden...
</Button>
```

**Kein Auto-Reporting**:
```typescript
<Button>
  <ClockIcon /> Auto-Report
</Button>
```

**Aktiv**:
```typescript
<Button className="relative">
  <ClockIcon /> Auto-Report
  {/* Pulsierender grüner Dot */}
  <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />
</Button>
```

**Pausiert**:
```typescript
<Button>
  <ClockIcon /> Auto-Report
</Button>
```

#### Code-Beispiel

```typescript
export const AutoReportingButton = memo(function AutoReportingButton() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { campaign } = useMonitoring();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existingReporting, setExistingReporting] = useState<AutoReporting | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lade existierendes Auto-Reporting
  useEffect(() => {
    async function load() {
      if (!campaign?.id || !currentOrganization?.id) return;

      try {
        const reporting = await autoReportingService.getAutoReportingByCampaign(
          campaign.id,
          { organizationId: currentOrganization.id, userId: user?.uid || '' }
        );
        setExistingReporting(reporting);
      } catch (error) {
        console.error('Fehler beim Laden:', error);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [campaign?.id, currentOrganization?.id, user?.uid]);

  const isActive = existingReporting?.isActive ?? false;

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        disabled={isLoading}
        className="relative"
      >
        <ClockIcon className="h-4 w-4 mr-2" />
        {isLoading ? 'Laden...' : 'Auto-Report'}

        {/* Aktiv-Indikator */}
        {isActive && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
        )}
      </Button>

      {/* Modal */}
      {isModalOpen && campaign && currentOrganization && (
        <AutoReportingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          campaignId={campaign.id!}
          campaignName={campaign.title || 'Unbenannte Kampagne'}
          organizationId={currentOrganization.id}
          existingReporting={existingReporting}
          onSaved={(reporting) => {
            setExistingReporting(reporting);
            setIsModalOpen(false);
          }}
          onDeleted={() => {
            setExistingReporting(null);
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
});
```

---

## CRON-Job

### Zeitplanung

**Vercel CRON Konfiguration** (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/reporting/cron?secret=$CRON_SECRET",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Schedule**: `0 7 * * *` = Täglich um 7:00 UTC

**Warum 7:00 UTC?**
- **Winterzeit (MEZ)**: 7:00 UTC = 8:00 Uhr deutscher Zeit
- **Sommerzeit (MESZ)**: 7:00 UTC = 9:00 Uhr deutscher Zeit
- Reports werden also immer zwischen 8:00-9:00 Uhr deutscher Zeit versendet

**Timeout**: 300 Sekunden (5 Minuten) per Function Config in `vercel.json`

```json
{
  "functions": {
    "src/app/api/reporting/cron/route.ts": {
      "maxDuration": 300
    }
  }
}
```

### Verarbeitungslogik

**Ablauf**:

```typescript
1. Authentifizierung prüfen (CRON_SECRET)
2. Fällige Auto-Reportings laden:
   WHERE isActive = true
     AND nextSendAt <= NOW
   ORDER BY nextSendAt ASC
   LIMIT 20

3. Für jedes Auto-Reporting:
   a) Prüfe Monitoring-Ende:
      IF monitoringEndDate < NOW:
        - Setze isActive = false
        - Überspringe Versand
        - Continue mit nächstem

   b) Generiere PDF-Report:
      - Lade Campaign-Daten (Admin SDK)
      - Lade Email Sends (Admin SDK)
      - Lade Media Clippings (Admin SDK)
      - Lade Branding (Admin SDK)
      - Berechne Statistiken
      - Generiere HTML
      - POST /api/generate-pdf
      - Erhalte Base64-PDF

   c) Sende E-Mails:
      FOR EACH recipient:
        - Personalisiere Template
        - SendGrid API Call
        - Track Success/Failure

   d) Update Auto-Reporting:
      - nextSendAt = calculateNextSendDate()
      - lastSentAt = NOW
      - lastSendStatus = 'success' | 'partial' | 'failed'
      - lastSendError = errorMessage | null

   e) Schreibe Log:
      INSERT INTO auto_reporting_logs
      - autoReportingId, organizationId, campaignId
      - sentAt, recipients, status, errorMessage

4. Return Results:
   {
     processed: N,
     sent: N,
     failed: N,
     deactivated: N,
     errors: [...]
   }
```

**Batch-Processing**:

- **Warum Limit 20?**: Um CRON-Timeouts zu vermeiden
- **Was wenn mehr als 20 fällig?**: Nächster CRON-Run verarbeitet den Rest
- **Sequenziell vs. Parallel**: Sequenziell, um SendGrid Rate Limits zu respektieren

**Fehlerbehandlung**:

```typescript
try {
  // Versand-Logik
} catch (error) {
  // Fehler loggen
  console.error('[CRON] Fehler bei Reporting:', error);

  // Status auf 'failed' setzen
  await doc.ref.update({
    lastSendStatus: 'failed',
    lastSendError: error.message,
    nextSendAt: calculateNextSendDate(), // Trotzdem weiter planen!
    updatedAt: Timestamp.now()
  });

  // Kein Retry! Report wird beim nächsten regulären Termin versendet
}
```

**Wichtig**: Bei Fehlern wird `nextSendAt` trotzdem aktualisiert. Es gibt **keine automatischen Retries**. Der Report wird beim nächsten regulären Versandtermin erneut versucht.

### Monitoring & Debugging

**Console Logs**:

```typescript
[Auto-Reporting CRON] Gestartet
[Auto-Reporting CRON] Zeitstempel: 2024-12-05T07:00:00.000Z
[Auto-Reporting CRON] Gefunden: 5 fällige Reports

[Auto-Reporting CRON] Verarbeite: Produktlaunch 2024 (reporting-123)
[Auto-Reporting CRON] Generiere PDF für Kampagne: campaign-xyz789
[Auto-Reporting CRON] E-Mail gesendet an: kunde@firma.de
[Auto-Reporting CRON] E-Mail gesendet an: chef@firma.de
[Auto-Reporting CRON] E-Mail-Fehler für invalid@: Invalid email format

[Auto-Reporting CRON] Monitoring abgelaufen, deaktiviere: reporting-456

[Auto-Reporting CRON] Abgeschlossen: {
  processed: 5,
  sent: 4,
  failed: 1,
  deactivated: 1,
  errors: ["reporting-123: Invalid email"]
}
```

**Vercel Logs abrufen**:

```bash
# Live-Logs
vercel logs --since 1h

# Spezifische Function
vercel logs src/app/api/reporting/cron/route.ts --since 24h

# Nach Error filtern
vercel logs --since 24h | grep ERROR
```

**Health-Check**:

```bash
# GET Request mit Secret
curl https://app.celeropress.com/api/reporting/cron?secret=your-secret

# Response
{
  "status": "healthy",
  "timestamp": "2024-12-05T07:00:00.000Z",
  "stats": {
    "pending": 3,
    "active": 12
  }
}
```

---

## E-Mail-Versand

### SendGrid Integration

**Wichtig**: Das Auto-Reporting Feature verwendet **SendGrid** für E-Mail-Versand, **NICHT Resend**!

**Grund**:
- Zuverlässigere Zustellung für Transactional Emails
- Bessere Deliverability-Rates
- Etablierter E-Mail-Service mit hoher Reputation

#### Konfiguration

**Environment Variables** (`.env.local`):

```bash
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=noreply@celeropress.com
SENDGRID_FROM_NAME=CeleroPress
```

#### API-Client Initialisierung

```typescript
// src/app/api/reporting/send-now/route.ts

import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
```

#### E-Mail senden

```typescript
await sgMail.send({
  to: recipient.email,
  from: {
    email: process.env.SENDGRID_FROM_EMAIL || 'noreply@celeropress.com',
    name: process.env.SENDGRID_FROM_NAME || 'CeleroPress'
  },
  subject: emailTemplate.subject,
  html: personalizedHtml,
  text: personalizedText,
  attachments: [
    {
      filename: `Monitoring-Report-${campaignName}.pdf`,
      content: pdfBase64,
      type: 'application/pdf',
      disposition: 'attachment'
    }
  ]
});
```

#### Fehlerbehandlung

```typescript
try {
  await sgMail.send(emailData);
  successCount++;
} catch (emailError) {
  failureCount++;
  const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
  errors.push(`${recipient.email}: ${errMsg}`);
  console.error(`[Send-Now] E-Mail-Fehler für ${recipient.email}:`, emailError);
}
```

**Häufige SendGrid-Fehler**:

- **Invalid Email**: `recipient.email` ist nicht valide
- **Suppression List**: Empfänger hat sich abgemeldet oder E-Mail ist gebounced
- **Rate Limit**: Zu viele E-Mails in kurzer Zeit
- **Invalid API Key**: `SENDGRID_API_KEY` ist falsch oder abgelaufen

#### Status-Tracking

```typescript
// Nach Versand an alle Empfänger
let status: SendStatus;

if (failureCount === 0) {
  status = 'success';        // Alle erfolgreich
} else if (successCount > 0) {
  status = 'partial';        // Einige erfolgreich, einige fehlgeschlagen
} else {
  status = 'failed';         // Alle fehlgeschlagen
}
```

### E-Mail Templates

**Template-System** basiert auf `approval-email-templates.ts`:

- **Konsistentes Branding**: Gleiche Header/Footer wie Approval-E-Mails
- **Responsive Design**: Mobile-optimiert
- **Plain-Text Fallback**: Für E-Mail-Clients ohne HTML-Support
- **Personalisierung**: Empfängername in Anrede

**Template-Komponenten**:

1. **Header**:
   - Logo (wenn vorhanden) ODER
   - Firmenname als Text

2. **Hauptinhalt**:
   - Personalisierte Anrede: "Hallo {Name},"
   - Erklärung: "Im Anhang finden Sie den aktuellen Report..."
   - Info-Box mit Berichtszeitraum, Kampagne, Frequenz
   - Übersicht der Report-Inhalte (Bullet-List)

3. **Footer**:
   - Logo (wenn vorhanden)
   - Firmenname
   - Adresse (Straße, PLZ Stadt)
   - Kontakt (Telefon, E-Mail, Website)

**Branding-Loading**:

```typescript
// Lade Branding aus Firestore
const brandingDoc = await adminDb
  .collection('branding_settings')
  .doc(organizationId)
  .get();

if (brandingDoc.exists) {
  const branding = brandingDoc.data() as BrandingSettings;

  // Verwende Branding in Template
  emailTemplate = getAutoReportEmailTemplate({
    ...emailData,
    brandingSettings: branding
  });
}
```

---

## PDF-Generierung

### Report-Datensammlung

**Funktion**: `collectReportDataWithAdminSDK()`

Sammelt alle benötigten Daten für den Report mit dem Firebase Admin SDK.

**Datenquellen**:

1. **Campaign** (`pr_campaigns`):
   ```typescript
   const campaign = await adminDb.collection('pr_campaigns').doc(campaignId).get();
   ```

2. **Email Sends** (`email_campaign_sends`):
   ```typescript
   const sends = await adminDb.collection('email_campaign_sends')
     .where('campaignId', '==', campaignId)
     .get();
   ```

3. **Media Clippings** (`media_clippings`):
   ```typescript
   const clippings = await adminDb.collection('media_clippings')
     .where('campaignId', '==', campaignId)
     .get();
   ```

4. **Branding** (`branding_settings`):
   ```typescript
   const branding = await adminDb.collection('branding_settings')
     .doc(organizationId)
     .get();
   ```

**Statistik-Berechnungen**:

```typescript
// E-Mail-Statistiken
const emailStats = {
  totalSent: sends.length,
  delivered: sends.filter(s => s.status === 'delivered' || ...).length,
  opened: sends.filter(s => s.status === 'opened' || ...).length,
  clicked: sends.filter(s => s.status === 'clicked').length,
  bounced: sends.filter(s => s.status === 'bounced').length,
  openRate: Math.round((opened / totalSent) * 100),
  clickRate: Math.round((clicked / opened) * 100),
  ctr: Math.round((clicked / totalSent) * 100),
  conversionRate: Math.round((clippings.length / opened) * 100)
};

// Clipping-Statistiken
const clippingStats = {
  totalClippings: clippings.length,
  totalReach: clippings.reduce((sum, c) => sum + (c.reach || 0), 0),
  totalAVE: clippings.reduce((sum, c) => sum + (c.ave || 0), 0),
  avgReach: Math.round(totalReach / clippings.length),
  sentimentDistribution: {
    positive: clippings.filter(c => c.sentiment === 'positive').length,
    neutral: clippings.filter(c => c.sentiment === 'neutral').length,
    negative: clippings.filter(c => c.sentiment === 'negative').length
  },
  topOutlets: [...], // Top 5 nach Reichweite
  outletTypeDistribution: [...] // Online/Print/TV/Radio
};

// Timeline
const timeline = [
  { date: '2024-12-01', clippings: 5, reach: 50000 },
  { date: '2024-12-02', clippings: 3, reach: 30000 },
  ...
];
```

### HTML-Template

**Funktion**: `generateReportHTML(reportData)`

**Datei**: `src/lib/monitoring-report/templates/report-template.ts`

Generiert HTML für den PDF-Report.

**Template-Struktur**:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* PDF-spezifisches CSS */
    @page { size: A4; margin: 20mm; }
    body { font-family: Arial, sans-serif; }
    .header { text-align: center; }
    .section { page-break-inside: avoid; }
  </style>
</head>
<body>
  <!-- Header mit Logo -->
  <div class="header">
    <img src="logo-base64" alt="Logo">
    <h1>Monitoring Report</h1>
    <p>Berichtszeitraum: 02.12.2024 - 09.12.2024</p>
  </div>

  <!-- Zusammenfassung -->
  <div class="section">
    <h2>Zusammenfassung</h2>
    <div class="stats-grid">
      <div class="stat">
        <div class="label">Clippings</div>
        <div class="value">23</div>
      </div>
      <div class="stat">
        <div class="label">Reichweite</div>
        <div class="value">1.2M</div>
      </div>
    </div>
  </div>

  <!-- E-Mail-Performance -->
  <div class="section">
    <h2>E-Mail-Performance</h2>
    <table>
      <tr><td>Versendet</td><td>156</td></tr>
      <tr><td>Zugestellt</td><td>152 (97%)</td></tr>
      <tr><td>Geöffnet</td><td>89 (58%)</td></tr>
    </table>
  </div>

  <!-- Medienresonanz -->
  <div class="section">
    <h2>Medienresonanz</h2>
    <!-- Clippings-Liste -->
  </div>

  <!-- Timeline -->
  <div class="section">
    <h2>Timeline</h2>
    <!-- Chart oder Tabelle -->
  </div>
</body>
</html>
```

### PDF-API Call

**Endpoint**: `POST /api/generate-pdf`

```typescript
const pdfResponse = await fetch(`${baseUrl}/api/generate-pdf`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campaignId: reporting.campaignId,
    organizationId: reporting.organizationId,
    html: reportHtml,
    title: `Monitoring Report: ${reporting.campaignName}`,
    fileName: `Monitoring_Report_${reporting.campaignId}_${Date.now()}.pdf`,
    mainContent: reportHtml,
    clientName: reporting.campaignName,
    userId: 'auto-reporting-cron',
    options: {
      format: 'A4',
      orientation: 'portrait',
      printBackground: true,
      waitUntil: 'networkidle0'
    }
  })
});

const pdfResult = await pdfResponse.json();
const pdfBase64 = pdfResult.pdfBase64;
```

**Response**:

```json
{
  "pdfBase64": "JVBERi0xLjcKCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjI...",
  "fileName": "Monitoring_Report_campaign123_1733385600000.pdf"
}
```

**Verwendung im E-Mail-Attachment**:

```typescript
attachments: [
  {
    filename: `Monitoring-Report-${campaignName}.pdf`,
    content: pdfBase64, // Base64-String direkt von API
    type: 'application/pdf',
    disposition: 'attachment'
  }
]
```

---

## Konfiguration

### Environment Variables

**Erforderliche Variablen**:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@celeropress.com
SENDGRID_FROM_NAME=CeleroPress

# CRON Security
CRON_SECRET=your-random-secret-string

# App URL (für PDF-Generierung)
NEXT_PUBLIC_BASE_URL=https://app.celeropress.com
```

**Entwicklungs-Setup** (`.env.local`):

```bash
# Firebase Admin SDK (aus Service Account JSON)
FIREBASE_PROJECT_ID=celeropress-dev
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@celeropress-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...ABCD\n-----END PRIVATE KEY-----\n"

# SendGrid (Test-API-Key)
SENDGRID_API_KEY=SG.test_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=test@celeropress.com
SENDGRID_FROM_NAME=CeleroPress Test

# CRON Secret (für lokale Tests)
CRON_SECRET=local-test-secret

# Localhost URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Produktions-Setup** (Vercel Environment Variables):

1. Gehe zu Vercel Dashboard → Projekt → Settings → Environment Variables
2. Füge alle Variablen hinzu
3. **Wichtig**: `CRON_SECRET` als "Encrypted" markieren
4. **Wichtig**: `FIREBASE_PRIVATE_KEY` mit echten Newlines (\n) eingeben

**CRON_SECRET generieren**:

```bash
# Mac/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Vercel CRON

**Datei**: `vercel.json`

```json
{
  "functions": {
    "src/app/api/reporting/cron/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/reporting/send-now/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/reporting/cron?secret=$CRON_SECRET",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**CRON Schedule Syntax**:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of Week (0-7, 0 & 7 = Sonntag)
│ │ │ └─── Month (1-12)
│ │ └───── Day of Month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Beispiele**:

```bash
# Täglich um 7:00 UTC
0 7 * * *

# Jeden Montag um 8:00 UTC
0 8 * * 1

# Alle 6 Stunden
0 */6 * * *

# Jeden ersten Tag des Monats um 9:00 UTC
0 9 1 * *
```

**Deployment**:

```bash
# Deploy mit CRON-Config
vercel --prod

# Logs prüfen
vercel logs --since 24h

# Spezifische Function logs
vercel logs src/app/api/reporting/cron/route.ts --since 1h
```

**CRON manuell testen** (Entwicklung):

```bash
# Mit curl
curl -X POST "http://localhost:3000/api/reporting/cron?secret=local-test-secret"

# Oder mit Postman/Insomnia
POST http://localhost:3000/api/reporting/cron?secret=local-test-secret
```

---

## Testing

### Unit Tests

**Reporting Helpers Tests** (`src/lib/utils/__tests__/reporting-helpers.test.ts`):

```bash
npm test reporting-helpers
```

**Test-Coverage**:
- ✅ calculateNextSendDate() - Weekly
- ✅ calculateNextSendDate() - Monthly
- ✅ formatNextSendDate()
- ✅ formatShortDate()
- ✅ formatReportPeriod()
- ✅ calculateReportPeriod()
- ✅ isMonitoringExpired()
- ✅ isSendDateReached()

**Beispiel-Test**:

```typescript
describe('calculateNextSendDate', () => {
  it('sollte nächsten Montag berechnen wenn heute Sonntag ist', () => {
    const mockDate = new Date('2024-12-01T10:00:00'); // Sonntag
    jest.useFakeTimers().setSystemTime(mockDate);

    const result = calculateNextSendDate('weekly', 1); // Montag

    expect(result.getDay()).toBe(1); // Montag
    expect(result > mockDate).toBe(true);

    jest.useRealTimers();
  });
});
```

**Modal Tests** (`src/components/monitoring/__tests__/AutoReportingModal.test.tsx`):

```bash
npm test AutoReportingModal
```

**Test-Coverage**:
- ✅ Modal rendern
- ✅ Kampagnenname anzeigen
- ✅ Kontakte laden
- ✅ Monitoring-Enddatum anzeigen
- ✅ Frequenz-Auswahl
- ✅ Existierende Empfänger anzeigen
- ✅ Validierung (keine Empfänger)
- ✅ Löschen-Button bei Edit-Modus

### Integration Tests

**API-Tests** (lokal):

```bash
# CRON Endpoint
curl -X POST "http://localhost:3000/api/reporting/cron?secret=local-test-secret"

# Send-Now Endpoint (mit Firebase Token)
curl -X POST "http://localhost:3000/api/reporting/send-now" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"autoReportingId": "reporting-123"}'

# Health-Check
curl "http://localhost:3000/api/reporting/cron?secret=local-test-secret"
```

**Manueller End-to-End Test**:

1. **Setup**: Erstelle Test-Kampagne und Test-Monitoring
   ```typescript
   const campaign = await createTestCampaign();
   const monitoring = await createTestMonitoring(campaign.id);
   ```

2. **Auto-Reporting erstellen**:
   - Öffne Modal im Monitoring-Bereich
   - Wähle Test-Kontakt als Empfänger
   - Setze Frequenz auf "Wöchentlich, Montag"
   - Klicke "Aktivieren"

3. **"Jetzt Versenden" testen**:
   - Gehe zu `/dashboard/analytics/reporting`
   - Klicke auf ⋮ → "Jetzt senden"
   - Prüfe E-Mail-Postfach des Test-Kontakts
   - Prüfe PDF-Attachment

4. **CRON simulieren**:
   ```bash
   # Setze nextSendAt auf Vergangenheit
   firebase firestore:update auto_reportings/{id} nextSendAt=past-timestamp

   # Rufe CRON manuell auf
   curl -X POST "http://localhost:3000/api/reporting/cron?secret=test-secret"

   # Prüfe Logs
   vercel logs --since 1h
   ```

5. **Cleanup**:
   ```typescript
   await deleteTestAutoReporting();
   await deleteTestMonitoring();
   await deleteTestCampaign();
   ```

---

## Troubleshooting

### Häufige Probleme

#### 1. CRON läuft nicht

**Symptome**:
- Keine Reports werden versendet
- `nextSendAt` ist in der Vergangenheit aber keine Logs

**Debugging**:

```bash
# Prüfe Vercel Logs
vercel logs --since 24h | grep reporting/cron

# Prüfe CRON-Config
cat vercel.json | grep -A 5 "crons"

# Manueller Test
curl -X POST "https://app.celeropress.com/api/reporting/cron?secret=$CRON_SECRET"
```

**Lösungen**:
- ✅ Prüfe dass `CRON_SECRET` Environment Variable gesetzt ist
- ✅ Prüfe dass `vercel.json` committed ist
- ✅ Prüfe Vercel Dashboard → Cron Jobs → Letzte Ausführungen
- ✅ Prüfe ob Function-Timeout nicht zu kurz (sollte 300s sein)

#### 2. E-Mails kommen nicht an

**Symptome**:
- Status ist "success" aber Empfänger erhält keine E-Mail
- ODER Status ist "failed" mit SendGrid-Fehler

**Debugging**:

```bash
# Prüfe Logs
vercel logs --since 1h | grep "E-Mail gesendet"

# Prüfe SendGrid Dashboard
# → https://app.sendgrid.com/activity

# Prüfe auto_reporting_logs
firebase firestore:get auto_reporting_logs --where "status == failed" --limit 10
```

**Lösungen**:
- ✅ Prüfe dass `SENDGRID_API_KEY` korrekt ist
- ✅ Prüfe SendGrid Dashboard → Suppressions (Bounced/Blocked Emails)
- ✅ Prüfe dass E-Mail-Adressen valide sind
- ✅ Prüfe Spam-Ordner des Empfängers
- ✅ Prüfe SendGrid Sender Authentication (SPF/DKIM)

#### 3. PDF-Generierung schlägt fehl

**Symptome**:
- Fehler "PDF-Generierung fehlgeschlagen"
- ODER "PDF-API Fehler: Campaign not found"

**Debugging**:

```bash
# Prüfe PDF-API Logs
vercel logs src/app/api/generate-pdf/route.ts --since 1h

# Teste PDF-Generierung direkt
curl -X POST "http://localhost:3000/api/generate-pdf" \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

**Lösungen**:
- ✅ Prüfe dass Campaign-Daten in Firestore vorhanden sind
- ✅ Prüfe dass `NEXT_PUBLIC_BASE_URL` korrekt gesetzt ist
- ✅ Prüfe PDF-API Timeout (sollte 30s sein)
- ✅ Prüfe dass Puppeteer korrekt installiert ist

#### 4. nextSendAt wird nicht aktualisiert

**Symptome**:
- Report wird mehrfach versendet
- ODER `nextSendAt` bleibt in der Vergangenheit

**Debugging**:

```typescript
// Prüfe calculateNextSendDate()
const nextSend = calculateNextSendDate('weekly', 1);
console.log('Nächster Versand:', nextSend);

// Vergleiche mit aktuellem nextSendAt
const reporting = await autoReportingService.getAutoReportingById('reporting-123', context);
console.log('Aktueller nextSendAt:', reporting?.nextSendAt.toDate());
```

**Lösungen**:
- ✅ Prüfe dass `calculateNextSendDate()` korrekt funktioniert (siehe Tests)
- ✅ Prüfe dass Update im CRON durchgeführt wird (Logs)
- ✅ Prüfe Zeitzone-Handling (sollte Europe/Berlin sein)

#### 5. Monitoring-Ende-Deaktivierung funktioniert nicht

**Symptome**:
- Auto-Reporting läuft weiter obwohl Monitoring abgelaufen
- `isActive` ist noch `true`

**Debugging**:

```typescript
// Prüfe Monitoring-Enddatum
const reporting = await getAutoReportingById('reporting-123', context);
console.log('Monitoring Ende:', reporting.monitoringEndDate.toDate());
console.log('Ist abgelaufen?', isMonitoringExpired(reporting.monitoringEndDate));
```

**Lösungen**:
- ✅ Prüfe dass CRON diese Logik ausführt (Logs: "Monitoring abgelaufen, deaktiviere")
- ✅ Prüfe dass `monitoringEndDate` korrekt aus Monitoring-Tracker übernommen wurde

### Debug-Modus aktivieren

**Lokale Entwicklung**:

```typescript
// src/app/api/reporting/cron/route.ts

// Füge detaillierte Logs hinzu
console.log('[DEBUG] Auto-Reporting:', JSON.stringify(reporting, null, 2));
console.log('[DEBUG] PDF Result:', pdfResult);
console.log('[DEBUG] SendGrid Response:', sendGridResponse);
```

**Produktions-Debugging** (temporär):

```typescript
// Erhöhe Log-Level
if (process.env.DEBUG_AUTO_REPORTING === 'true') {
  console.log('[DEBUG]', ...);
}
```

**Firestore Query testen**:

```typescript
// src/lib/scripts/test-auto-reporting-query.ts

async function testQuery() {
  const snapshot = await adminDb
    .collection('auto_reportings')
    .where('isActive', '==', true)
    .where('nextSendAt', '<=', Timestamp.now())
    .get();

  console.log(`Gefunden: ${snapshot.size} fällige Reports`);
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.campaignName}: nextSendAt=${data.nextSendAt.toDate()}`);
  });
}

testQuery();
```

---

## Best Practices

### Empfänger-Management

**DO**:
- ✅ Verwende CRM-Kontakte als Single Source of Truth
- ✅ Denormalisiere E-Mail und Name für schnellen Zugriff
- ✅ Validiere E-Mail-Adressen bei Eingabe
- ✅ Limitiere auf 3 Empfänger pro Auto-Reporting

**DON'T**:
- ❌ Speichere keine Custom-E-Mails außerhalb des CRMs
- ❌ Keine unbegrenzte Empfänger-Liste
- ❌ Keine E-Mails ohne Validierung

### Zeitplanung

**DO**:
- ✅ Berechne `nextSendAt` immer in Europe/Berlin
- ✅ Berücksichtige Sommer-/Winterzeit automatisch
- ✅ Setze fixe Sendezeit (8:00 Uhr) für Konsistenz
- ✅ Update `nextSendAt` auch bei Fehlern (kein Retry)

**DON'T**:
- ❌ Keine manuellen Zeitberechnungen ohne Timezone-Handling
- ❌ Keine unterschiedlichen Sendezeiten pro Reporting
- ❌ Keine automatischen Retries (User sollte informiert werden)

### Fehlerbehandlung

**DO**:
- ✅ Logge alle Fehler detailliert in Console
- ✅ Schreibe `auto_reporting_logs` auch bei Fehlern
- ✅ Setze `lastSendError` für User-Feedback
- ✅ Continue mit nächstem Reporting bei Fehler

**DON'T**:
- ❌ Keine Silent Failures ohne Logging
- ❌ Keine Retries ohne User-Benachrichtigung
- ❌ Keine generischen Fehlermeldungen

### E-Mail Best Practices

**DO**:
- ✅ Verwende personalisierte Anrede
- ✅ Inkludiere Plain-Text Fallback
- ✅ Teste E-Mails in verschiedenen Clients
- ✅ Verwende organisationsspezifisches Branding

**DON'T**:
- ❌ Keine generischen "Hallo Kunde"-Anreden
- ❌ Keine HTML-only E-Mails
- ❌ Keine zu großen Attachments (>10MB)

### Performance

**DO**:
- ✅ Verwende Batch-Processing (max. 20 Reports)
- ✅ Prozessiere sequenziell (SendGrid Rate Limits)
- ✅ Cache Branding-Einstellungen wo möglich
- ✅ Verwende Firestore-Indizes für Queries

**DON'T**:
- ❌ Keine unbegrenzte Batch-Größe
- ❌ Keine parallelen SendGrid-Calls ohne Rate-Limit-Handling
- ❌ Keine wiederholten Firestore-Reads für gleiche Daten

---

## Migration Guide

### Von manuellem Report-Versand zu Auto-Reporting

**Szenario**: Du hast bisher Reports manuell aus dem Monitoring-Bereich versendet und möchtest auf Auto-Reporting umstellen.

**Schritte**:

1. **Vorbereitung**:
   ```typescript
   // Stelle sicher dass Kampagne Monitoring-Tracker hat
   const tracker = await monitoringTrackerService.getTrackerByCampaign(
     campaignId,
     context
   );

   if (!tracker) {
     console.error('Kein Monitoring-Tracker gefunden');
     return;
   }
   ```

2. **CRM-Kontakte erstellen**:
   - Gehe zu CRM-Modul
   - Erstelle Kontakte für alle Report-Empfänger
   - Stelle sicher dass E-Mail-Adressen valide sind

3. **Auto-Reporting einrichten**:
   - Gehe zum Monitoring-Bereich der Kampagne
   - Klicke auf "Auto-Report"-Button
   - Wähle 1-3 Empfänger aus
   - Setze Frequenz (wöchentlich/monatlich)
   - Klicke "Aktivieren"

4. **Ersten Report testen**:
   - Gehe zu `/dashboard/analytics/reporting`
   - Klicke auf ⋮ → "Jetzt senden"
   - Prüfe E-Mail-Postfach

5. **Monitoring**:
   - Prüfe nach erstem automatischen Versand die Logs
   - Stelle sicher dass `nextSendAt` korrekt aktualisiert wurde
   - Prüfe `lastSendStatus` auf Fehler

### Von Resend zu SendGrid

**Hinweis**: Das Auto-Reporting Feature nutzt bereits SendGrid. Wenn du andere E-Mail-Features von Resend auf SendGrid migrieren möchtest:

**Schritte**:

1. **SendGrid Account erstellen**:
   - https://signup.sendgrid.com/
   - Verifiziere Domain (für bessere Deliverability)

2. **API Key erstellen**:
   - SendGrid Dashboard → Settings → API Keys
   - Erstelle neuen Key mit "Mail Send" Permissions
   - Kopiere Key

3. **Environment Variables updaten**:
   ```bash
   # .env.local
   SENDGRID_API_KEY=SG.xxxxx
   SENDGRID_FROM_EMAIL=noreply@celeropress.com
   SENDGRID_FROM_NAME=CeleroPress
   ```

4. **Code anpassen**:
   ```typescript
   // Vorher (Resend)
   import { Resend } from 'resend';
   const resend = new Resend(process.env.RESEND_API_KEY);
   await resend.emails.send({ ... });

   // Nachher (SendGrid)
   import sgMail from '@sendgrid/mail';
   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
   await sgMail.send({ ... });
   ```

5. **Testen**:
   - Sende Test-E-Mail
   - Prüfe SendGrid Dashboard → Activity
   - Prüfe Spam-Score

---

## Performance

### Benchmarks

**CRON-Job Ausführung** (durchschnittlich):

```
10 Auto-Reportings:
- Query: ~200ms
- PDF-Generierung (gesamt): ~15s (1.5s pro Report)
- E-Mail-Versand (gesamt): ~5s (0.5s pro Report)
- Firestore Updates: ~2s
- Total: ~22s

20 Auto-Reportings (Batch-Limit):
- Query: ~200ms
- PDF-Generierung (gesamt): ~30s
- E-Mail-Versand (gesamt): ~10s
- Firestore Updates: ~4s
- Total: ~44s
```

**Send-Now Endpoint** (1 Report):

```
- PDF-Generierung: ~1.5s
- E-Mail-Versand (3 Empfänger): ~1.5s
- Firestore Updates: ~200ms
- Total: ~3.2s
```

### Optimierungspotenzial

**1. Parallele PDF-Generierung**

**Aktuell**: Sequenziell
**Optimierung**: Parallel mit Promise.all()

```typescript
// Vorher
for (const reporting of reportings) {
  const pdf = await generateReportPDF(reporting);
  await sendEmails(pdf);
}

// Nachher
const pdfPromises = reportings.map(r => generateReportPDF(r));
const pdfs = await Promise.all(pdfPromises);
```

**Einsparung**: ~30% bei 10+ Reports

**2. Branding-Caching**

**Aktuell**: Jeder Report lädt Branding neu
**Optimierung**: Cache Branding pro Organization

```typescript
const brandingCache = new Map<string, BrandingSettings>();

async function getBrandingCached(orgId: string) {
  if (!brandingCache.has(orgId)) {
    const branding = await loadBranding(orgId);
    brandingCache.set(orgId, branding);
  }
  return brandingCache.get(orgId);
}
```

**Einsparung**: ~500ms bei 10 Reports derselben Organization

**3. Firestore Batch-Updates**

**Aktuell**: Einzelne Updates
**Optimierung**: Batch-Writes

```typescript
// Vorher
for (const reporting of reportings) {
  await updateDoc(reporting.ref, { ... });
}

// Nachher
const batch = writeBatch(db);
for (const reporting of reportings) {
  batch.update(reporting.ref, { ... });
}
await batch.commit();
```

**Einsparung**: ~1s bei 10 Reports

---

## Sicherheit

### CRON-Endpoint-Schutz

**Authentifizierung**:

```typescript
// 1. Bearer Token
Authorization: Bearer {CRON_SECRET}

// 2. Query-Parameter
?secret={CRON_SECRET}

// 3. Fallback für Vercel Expansion Issues
?secret=$CRON_SECRET
```

**Best Practices**:
- ✅ Verwende starken, zufälligen CRON_SECRET (min. 32 Zeichen)
- ✅ Rotiere Secret regelmäßig (alle 3-6 Monate)
- ✅ Speichere Secret als Encrypted Environment Variable
- ✅ Logge keine Secrets in Console/Logs

### Firebase Admin SDK

**Berechtigungen**:

```json
// Service Account sollte minimal Permissions haben
{
  "role": "roles/firestore.user",
  "members": ["serviceAccount:firebase-adminsdk@project.iam.gserviceaccount.com"]
}
```

**Best Practices**:
- ✅ Verwende Service Account nur für Backend
- ✅ Keine Admin-Rechte wenn nicht nötig
- ✅ Rotiere Service Account Keys jährlich
- ✅ Speichere Private Key als Encrypted Environment Variable

### SendGrid API Key

**Best Practices**:
- ✅ Erstelle separaten API Key nur für Auto-Reporting
- ✅ Limitiere Permissions auf "Mail Send" only
- ✅ Verwende IP Whitelisting (Vercel IPs)
- ✅ Rotiere Key bei Verdacht auf Kompromittierung

**Revocation**:

```bash
# Bei kompromittiertem Key
1. Vercel Dashboard → Environment Variables → SENDGRID_API_KEY löschen
2. SendGrid Dashboard → API Keys → Delete
3. Neuen Key erstellen
4. Neue Environment Variable setzen
5. Redeploy triggern
```

### Multi-Tenancy

**Isolation**:

```typescript
// Jede Query muss organizationId filtern
const reportings = await adminDb
  .collection('auto_reportings')
  .where('organizationId', '==', context.organizationId) // WICHTIG!
  .get();
```

**Validierung**:

```typescript
// Bei Updates/Deletes: Prüfe Ownership
const existing = await getDoc(reportingRef);
if (existing.data().organizationId !== context.organizationId) {
  throw new Error('Keine Berechtigung');
}
```

**Best Practices**:
- ✅ Verwende immer `organizationId` in Queries
- ✅ Validiere Ownership bei jeder Mutation
- ✅ Teste Cross-Organization-Zugriff explizit
- ✅ Verwende Firestore Security Rules als zweite Verteidigungslinie

---

## Siehe auch

- [Monitoring Documentation](../monitoring/README.md)
- [CRM Enhanced Documentation](../crm/README.md)
- [E-Mail Templates Documentation](../email/templates.md)
- [PDF Generation Documentation](../pdf/README.md)
- [Design System](../design-system/DESIGN_SYSTEM.md)
