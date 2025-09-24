# PR-Monitoring & Clipping-Tracking Masterplan

## 📋 AKTUELLER STATUS & OVERVIEW

**Stand:** ✅ Phase 1 (Basic Monitoring) fast abgeschlossen - UI & Basis-Funktionen fertig
**Nächste Schritte:** Testing & Projekt-Monitoring-Tab
**Architektur:** Erweiterung bestehender SendGrid-Integration (KEINE neuen Services)

### 🎯 ZIELSETZUNG
- **Vollständiges PR-Tracking** von Versand bis Veröffentlichung
- **Media Monitoring** mit automatischer Artikel-Erkennung
- **Clipping-Archiv** mit Reichweiten- und Sentiment-Analyse
- **Reporting** für Kunden mit AVE und Performance-Metriken
- **ZERO Breaking Changes** - Alle bestehenden E-Mail-Funktionen bleiben erhalten

---

## ✅ WAS WIR BEREITS HABEN

### 1. **SendGrid Integration (Komplett)**

#### **Versand-System**
- ✅ API Route: `/api/sendgrid/send-pr-campaign/route.ts`
- ✅ Rate Limiting & Security
- ✅ Batch-Versand (max 100 Empfänger pro Batch)
- ✅ Custom Args für Tracking:
  - `campaign_id`
  - `user_id`
  - `organization_id`
  - `email_address_id`

#### **Tracking aktiviert**
- ✅ Click Tracking (SendGrid)
- ✅ Open Tracking (SendGrid)
- ✅ Custom Headers für besseres Matching

#### **Webhook-Integration**
- ✅ API Route: `/api/sendgrid/webhook/route.ts`
- ✅ Event-Types verarbeitet:
  - `delivered` - E-Mail zugestellt
  - `open` - E-Mail geöffnet
  - `click` - Link geklickt
  - `bounce` - Zustellung fehlgeschlagen
  - `dropped` - Von SendGrid blockiert
  - `deferred` - Temporär verzögert
  - `blocked` - Vom Empfänger blockiert

### 2. **Email Campaign Tracking (`email_campaign_sends` Collection)**

#### **Bereits getrackte Daten**
```typescript
interface EmailCampaignSend {
  // Basis-Daten
  id?: string;
  campaignId: string;
  recipientEmail: string;
  recipientName: string;
  messageId?: string;

  // Status-Tracking (SendGrid)
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

  // Zeitstempel
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  openedAt?: Timestamp;
  clickedAt?: Timestamp;
  bouncedAt?: Timestamp;
  failedAt?: Timestamp;

  // Engagement-Metriken
  openCount?: number;
  clickCount?: number;
  lastOpenedAt?: Timestamp;
  lastClickedAt?: Timestamp;
  lastClickedUrl?: string;

  // Technical Information
  lastUserAgent?: string;
  lastIpAddress?: string;

  // Error-Handling
  errorMessage?: string;
  bounceReason?: string;
  deferredAt?: Timestamp;
  deferredReason?: string;
}
```

### 3. **Empfänger-Verwaltung**
- ✅ Distribution Lists (Contact Lists)
- ✅ Manuelle Empfänger (Ad-hoc hinzufügen)
- ✅ Contact-Datenbank Integration
- ✅ CRM-Integration (Companies, Publications, Journalists)

### 4. **E-Mail Composer System**
- ✅ 3-Step Wizard (Content → Details → Preview)
- ✅ Test-E-Mail Funktion
- ✅ Scheduling (Zeitversatz)
- ✅ Draft Auto-Save
- ✅ Template-System

---

## 🔍 ANALYSE: WAS FEHLT

### ❌ **1. Veröffentlichungs-Tracking**

**Problem:** Wir wissen, ob ein Journalist die E-Mail geöffnet hat, aber NICHT ob er etwas veröffentlicht hat.

**Fehlende Daten:**
- Hat der Journalist tatsächlich einen Artikel veröffentlicht?
- Link zum veröffentlichten Artikel
- Veröffentlichungsdatum
- Medium/Outlet (falls unterschiedlich zur Kontakt-Organisation)
- Reichweite des Artikels (Auflage, Online-Visits)
- Tonalität/Sentiment (positiv/neutral/negativ)
- AVE (Advertising Value Equivalent)

### ❌ **2. Media Monitoring / Automatische Artikel-Erkennung**

**Problem:** User muss manuell im Internet nach Veröffentlichungen suchen.

**Fehlende Features:**
- Google News API Integration
- RSS Feed Monitoring
- Automatische Keyword-Suche
- Artikel-Vorschläge: "Könnte das eure PM sein?"
- Matching mit Empfänger-Liste

### ❌ **3. Clipping-Datenbank & Archiv**

**Problem:** Keine zentrale Sammlung aller Veröffentlichungen.

**Fehlende Strukturen:**
- Clipping-Collection (separate Datenbank)
- Screenshot/PDF-Archivierung
- Sentiment-Analyse (manuell oder AI)
- AVE-Berechnung
- Historische Daten für Reports

### ❌ **4. Analytics & Reporting**

**Problem:** Keine aggregierten Metriken für Kunden-Reports.

**Fehlende Features:**
- Campaign Performance Dashboard
- Gesamtreichweite (Summe aller Clippings)
- Clipping-Count vs. Versand-Count (Conversion-Rate)
- Export als PDF für Kunden
- Vergleich mit anderen Kampagnen

### ❌ **5. UI für Monitoring**

**Problem:** Keine dedizierte Ansicht für Tracking nach dem Versand.

**Fehlende Views:**
- Monitoring-Tab in der Kampagne
- Empfänger-Liste mit Status (delivered/opened/clicked)
- Manuelles "Veröffentlicht"-Abhaken
- Clipping-Eingabe-Modal
- Dashboard mit KPIs

---

## 🏗️ SYSTEM-INTEGRATION KONZEPT

### **Konsistente Architektur: Zentrale + Projekt-Ansichten**

Das System folgt dem etablierten Pattern:
- **Zentrale Übersicht** unter `/dashboard/pr-tools/[bereich]` (alle Daten org-weit)
- **Projekt-Ansicht** unter `/dashboard/projects/[projectId]` (nur Projekt-Daten)

**Bestehende Bereiche:**
```
/dashboard/pr-tools/campaigns       ← Alle Kampagnen
/dashboard/pr-tools/approvals       ← Alle Freigaben
/dashboard/contacts/crm             ← Alle Kontakte
```

**NEUER Bereich:**
```
/dashboard/pr-tools/monitoring      ← Alle Monitoring-Daten
```

---

### **1. ZENTRALE MONITORING-SEITE** (NEU)

#### **Route:** `/dashboard/pr-tools/monitoring`

**Zweck:** Übersicht aller versendeten Kampagnen (mit UND ohne Projekt)

**UI-Struktur:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 PR-Monitoring & Versandhistorie                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Filter: Alle Projekte ▼] [Status: Versendet ▼] [🔍 Suchen...] │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Kampagne                   │ Projekt  │ Versendet │ Status   ││
│  ├───────────────────────────┼──────────┼───────────┼──────────┤│
│  │ Produktlaunch Q1          │ Projekt A│ 15.01.25  │ 📧 150   ││
│  │ ✅ 89 geöffnet (59%)       │          │           │ 📰 8     ││
│  │ ❌ 12 bounced (8%) ⚠️      │          │           │          ││
│  ├───────────────────────────┼──────────┼───────────┼──────────┤│
│  │ CEO Interview             │ -        │ 10.01.25  │ 📧 45    ││
│  │ ✅ 23 geöffnet (51%)       │          │           │ 📰 3     ││
│  │ ❌ 2 bounced (4%)          │          │           │          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  Klick auf Zeile → Detail-Ansicht                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Spalten:**
- **Kampagne** (Titel)
- **Projekt** (leer wenn ohne Projekt)
- **Versendet** (Datum)
- **Status:**
  - 📧 Empfänger-Count
  - Öffnungsrate (%)
  - ❌ Bounce-Count (⚠️ wenn >5%)
  - 📰 Clippings-Count

**Filter:**
- Nach Projekt (inkl. "Ohne Projekt")
- Nach Status (Versendet/Archiviert)
- Nach Datum
- Nach Bounce-Rate (>5%, >10%)

---

### **2. MONITORING DETAIL-SEITE** (NEU)

#### **Route:** `/dashboard/pr-tools/monitoring/[campaignId]`

**Zweck:** Detaillierte Analyse EINER Kampagne

**UI = Gleiche Komponenten wie Projekt-Tab "Monitoring"**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Zurück zu Monitoring    |    Kampagne: "Produktlaunch Q1"    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 E-Mail Performance                                           │
│  [Versendet: 150] [Zugestellt: 148] [Geöffnet: 89] [Geklickt: 34]│
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  📋 Empfänger & Veröffentlichungen                               │
│  [Gleiche Liste wie in Projekt-Monitoring]                       │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  🔍 Monitoring-Vorschläge                                        │
│  [Google News Integration]                                       │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  📰 Clipping-Archiv                                              │
│  [Grid mit Screenshots/Links]                                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Komponenten (wiederverwendbar):**
- ✅ `<EmailPerformanceStats />` - SendGrid-Metriken (FERTIG)
- ✅ `<RecipientTrackingList />` - Empfänger-Liste mit "Als veröffentlicht markieren" (FERTIG)
- ✅ `<MarkPublishedModal />` - Modal zum Erfassen von Veröffentlichungen (FERTIG)
- ⏳ `<MonitoringSuggestions />` - Google News (PHASE 2)
- ✅ `<ClippingArchive />` - Veröffentlichungen (FERTIG - zeigt aktuell Mock-Daten)

---

### **3. PROJEKT-MONITORING-TAB** (Bestehend, erweitert)

#### **Route:** `/dashboard/projects/[projectId]` → Tab "Monitoring"

**Zweck:** Monitoring ALLER Kampagnen dieses Projekts

**UI-Struktur:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Projekt-Monitoring: "Produktlaunch 2025"                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📈 Projekt-Statistiken                                          │
│  ├── Kampagnen: 3                                                │
│  ├── Gesamt-Empfänger: 450                                       │
│  ├── Clippings: 18                                               │
│  └── Gesamtreichweite: 8.5M                                      │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  📋 Kampagnen in diesem Projekt                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Kampagne 1: Ankündigung        │ 📧 150 │ 📰 8 │ [Details]   ││
│  │ Kampagne 2: Features           │ 📧 200 │ 📰 6 │ [Details]   ││
│  │ Kampagne 3: Preise             │ 📧 100 │ 📰 4 │ [Details]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  Klick auf [Details] → öffnet /pr-tools/monitoring/[campaignId] │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  📰 Alle Clippings (projekt-weit)                                │
│  [Kombiniertes Clipping-Archiv aller Kampagnen]                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### **4. NAVIGATION & MENÜ-STRUKTUR**

#### **Hauptnavigation erweitern:**

```
PR-Tools
├── Kampagnen
├── Freigaben
├── Media Library
├── Boilerplates
└── Monitoring ← NEU
    └── /dashboard/pr-tools/monitoring
```

#### **E-Mail-Qualität (NEU - für Bounce-Management):**

```
PR-Tools
├── ...
├── Monitoring
└── E-Mail-Qualität ← NEU
    └── /dashboard/pr-tools/email-quality
    └── Bounce-Liste, Reputation, Cleanup
```

---

### **5. USER JOURNEYS**

#### **Szenario A: User ohne Projekt**
1. Schreibt Pressemeldung direkt unter `/dashboard/pr-tools/campaigns`
2. Versendet über E-Mail-Composer
3. Will Tracking sehen:
   - **Weg 1:** Geht zu `/dashboard/pr-tools/monitoring`
   - **Weg 2:** Bleibt in Kampagne, klickt Tab "Monitoring" (wenn vorhanden)
4. Sieht Detail-Ansicht mit allen Metriken

#### **Szenario B: User mit Projekt**
1. Arbeitet in Projekt `/dashboard/projects/[projectId]`
2. Versendet Kampagne aus Projekt-Context
3. Will Tracking sehen:
   - **Weg 1:** Bleibt in Projekt → Tab "Monitoring" → Liste der Kampagnen → Klick [Details]
   - **Weg 2:** Geht zu `/dashboard/pr-tools/monitoring` → Filtert nach Projekt
4. Sieht Detail-Ansicht

#### **Szenario C: Bounce-Management**
1. User bekommt Warnung: "Hohe Bounce-Rate!"
2. Geht zu `/dashboard/pr-tools/email-quality`
3. Sieht Bounce-Liste
4. Klickt "Alle Hard Bounces bereinigen"
5. System entfernt aus Listen
6. Nächster Versand → weniger Bounces

---

### **6. KOMPONENTEN-WIEDERVERWENDUNG**

**Zentrale Komponenten (shared):**
```typescript
// Diese werden ÜBERALL verwendet:

<EmailPerformanceStats campaignId={id} />
  → Zeigt SendGrid-Metriken

<RecipientTrackingList campaignId={id} />
  → Empfänger-Liste mit Status

<MonitoringSuggestions campaignId={id} />
  → Google News Vorschläge

<ClippingArchive campaignId={id} />
  → Clippings-Grid
```

**Verwendung:**
1. `/dashboard/pr-tools/monitoring/[campaignId]` → Alle 4 Komponenten
2. `/dashboard/projects/[projectId]` Tab "Monitoring" → Aggregierte Stats + Kampagnen-Liste, bei Detail-Klick → alle 4 Komponenten
3. `/dashboard/pr-tools/campaigns/[campaignId]` Tab "Monitoring" (optional) → Alle 4 Komponenten

---

## 📐 DATENMODELL-ERWEITERUNGEN

### **1. Erweiterung: `EmailCampaignSend` Interface** ✅ IMPLEMENTIERT

```typescript
// NEUE Felder für email_campaign_sends Collection
interface EmailCampaignSend {
  // ... bestehende Felder ...

  // MONITORING-ERWEITERUNG ✅

  // Veröffentlichungs-Status
  publishedStatus?: 'not_published' | 'published' | 'pending' | 'declined';
  publishedAt?: Timestamp;

  // Clipping-Verknüpfung
  clippingId?: string; // Referenz zu media_clippings Collection

  // Quick-Daten (denormalisiert für Performance)
  articleUrl?: string;
  articleTitle?: string;
  reach?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  publicationNotes?: string;

  // Manuelles Tracking
  manuallyMarkedPublished?: boolean;
  markedPublishedBy?: string; // userId
  markedPublishedAt?: Timestamp;
}
```
**Datei:** `src/types/email.ts` ✅

### **2. NEUE Collection: `media_clippings`** ✅ IMPLEMENTIERT

```typescript
interface MediaClipping {
  id?: string;
  organizationId: string;

  // Verknüpfungen
  campaignId?: string;
  projectId?: string;
  emailSendId?: string; // Welcher Empfänger hat veröffentlicht?

  // Artikel-Daten
  title: string;
  url: string;
  publishedAt: Timestamp;

  // Medium/Outlet
  outletName: string; // "Süddeutsche Zeitung"
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  outletUrl?: string;

  // Inhalt
  excerpt?: string; // Auszug
  fullText?: string; // Volltext (falls scraping)
  screenshot?: string; // Storage URL
  pdfArchive?: string; // Storage URL

  // Metriken
  reach?: number; // Auflage oder Online-Visits
  ave?: number; // Advertising Value Equivalent in EUR
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number; // -1 bis 1
  sentimentNotes?: string;

  // Kategorisierung
  tags?: string[];
  category?: 'news' | 'feature' | 'interview' | 'mention';
  prominenceScore?: number; // 1-10, wie prominent ist die Erwähnung?

  // Tracking
  detectionMethod: 'manual' | 'google_news' | 'rss' | 'web_scraping' | 'imported';
  detectedAt: Timestamp;
  verifiedBy?: string; // userId
  verifiedAt?: Timestamp;

  // Metadata
  createdBy: string; // userId
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```
**Datei:** `src/types/monitoring.ts` ✅
**Service:** `src/lib/firebase/clipping-service.ts` ✅

### **3. NEUE Collection: `monitoring_suggestions`** ⏳ PHASE 2

```typescript
interface MonitoringSuggestion {
  id?: string;
  organizationId: string;
  campaignId: string;

  // Gefundener Artikel
  articleUrl: string;
  articleTitle: string;
  articleExcerpt?: string;
  source: 'google_news' | 'rss' | 'web_scraping';
  foundAt: Timestamp;

  // Matching
  matchScore: number; // 0-100, Confidence
  matchedKeywords: string[];

  // Status
  status: 'pending' | 'confirmed' | 'rejected' | 'duplicate';
  reviewedBy?: string; // userId
  reviewedAt?: Timestamp;

  // Falls bestätigt → wird zu Clipping
  clippingId?: string;

  createdAt: Timestamp;
}
```

---

## 🎨 UI/UX KONZEPT

### **Tab: "Monitoring" in Kampagnen-Detail**

#### **Section 1: SendGrid-Tracking (Oben)**

```
┌─────────────────────────────────────────────────────┐
│  📊 E-Mail Performance                               │
├─────────────────────────────────────────────────────┤
│                                                       │
│  [📤 Versendet: 150]  [✓ Zugestellt: 148]           │
│  [👁️ Geöffnet: 89]    [🖱️ Geklickt: 34]            │
│  [❌ Bounced: 2]                                     │
│                                                       │
│  ─────────────────────────────────────────────────── │
│                                                       │
│  Öffnungsrate: 60.1% | Klickrate: 22.9%             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### **Section 2: Empfänger-Liste mit Status**

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Empfänger & Veröffentlichungen                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Filter: Alle ▼] [Status: Alle ▼] [🔍 Suchen...]               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ Max Müller (Süddeutsche Zeitung)                         ││
│  │    📧 Zugestellt ✓  |  👁️ Geöffnet 3x  |  🖱️ Geklickt      ││
│  │    📰 Veröffentlicht am 15.01.2025                          ││
│  │    → [Artikel ansehen] | Reichweite: 2.5M | Positiv 😊      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ⏳ Anna Schmidt (FAZ)                                        ││
│  │    📧 Zugestellt ✓  |  👁️ Nicht geöffnet                    ││
│  │    [⊕ Als veröffentlicht markieren]                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ❌ Peter Klein (Spiegel)                                     ││
│  │    📧 Bounce (ungültige E-Mail)                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### **Section 3: Monitoring-Vorschläge (Google News)**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Automatisch gefundene Artikel                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🆕 Handelsblatt: "Neue KI-Lösung revolutioniert..."        ││
│  │    Gefunden: vor 2 Stunden | Match: 87%                     ││
│  │    Keywords: "KI", "Automatisierung", "Firma XY"            ││
│  │                                                              ││
│  │    [✓ Bestätigen] [✗ Ablehnen] [→ Artikel öffnen]          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### **Section 4: Clipping-Archiv**

```
┌─────────────────────────────────────────────────────────────────┐
│  📰 Veröffentlichte Artikel (8)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Gesamtreichweite: 12.5M | Gesamt-AVE: €45.000                  │
│  Sentiment: 😊 6 positiv | 😐 2 neutral | 😞 0 negativ           │
│                                                                   │
│  [+ Manuell hinzufügen] [📊 Report generieren] [📥 Exportieren] │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  Grid-Ansicht der Clippings mit Screenshots/Links               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 WORKFLOW & USER JOURNEY

### **Szenario 1: Manuelles Tracking**

1. User versendet Kampagne
2. Wechselt zu Tab "Monitoring"
3. Sieht E-Mail-Status (delivered/opened)
4. Nach einigen Tagen: Findet Artikel manuell im Internet
5. Klickt bei Empfänger auf "Als veröffentlicht markieren"
6. Modal öffnet sich:
   - Artikel-URL eingeben
   - Reichweite schätzen
   - Sentiment wählen
   - Screenshot hochladen (optional)
7. Speichert → Clipping wird erstellt und mit Empfänger verknüpft

### **Szenario 2: Automatisches Monitoring**

1. User versendet Kampagne
2. System startet automatisch Google News Monitoring
   - Sucht täglich nach Kampagnen-Keywords
   - Findet potenziellen Artikel
   - Erstellt `monitoring_suggestion`
3. User sieht in Tab "Monitoring" → "🆕 Neuer Vorschlag (1)"
4. Prüft Vorschlag:
   - "Ja, das ist unsere PM" → Klick auf "Bestätigen"
   - System erstellt Clipping
   - Verknüpft mit passendem Empfänger (wenn identifizierbar)
5. Oder: "Nein" → Ablehnen → Vorschlag verschwindet

### **Szenario 3: Report für Kunden**

1. Kampagne läuft seit 30 Tagen
2. User geht zu "Monitoring"-Tab
3. Klickt auf "Report generieren"
4. System erstellt PDF:
   - Versand-Statistiken (delivered/opened/clicked)
   - Anzahl Veröffentlichungen
   - Gesamtreichweite
   - Sentiment-Verteilung
   - Screenshots aller Clippings
   - AVE-Berechnung
5. PDF-Download → an Kunden senden

---

## 📋 IMPLEMENTIERUNGS-PHASEN

### **Phase 1: Basis-Tracking (MVP)** ✅ ABGESCHLOSSEN

#### **Ziel:** Manuelles Veröffentlichungs-Tracking ohne Automatisierung

**Tasks:**
1. ✅ Erweitere `EmailCampaignSend` Interface um Publishing-Felder
2. ✅ Erstelle `media_clippings` Collection & Types
3. ✅ Baue Monitoring-Übersicht (`/pr-tools/monitoring`)
4. ✅ Baue Monitoring-Detail-Seite (`/pr-tools/monitoring/[campaignId]`)
5. ✅ Implementiere Empfänger-Liste mit SendGrid-Status
6. ✅ Baue "Als veröffentlicht markieren" Modal
7. ✅ Clipping-Eingabe-Formular (URL, Reichweite, Sentiment)
8. ✅ Clipping-Archiv-View mit Tabellen-Layout
9. ✅ Email Performance Stats mit Charts (Funnel, Pie)
10. ✅ Projekt-Monitoring-Tab mit aggregierten Stats
11. ✅ Navigation & Integration (Analytics-Button → Monitoring)

**Ergebnis:**
- ✅ User kann nach Versand manuell Veröffentlichungen tracken
- ✅ Alle Clippings in einem Archiv
- ✅ Performance-Charts mit Markenfarben
- ✅ Projekt-weite Monitoring-Übersicht
- ✅ Vollständige Navigation integriert

**Stand:** 24. September 2025 - Phase 1 komplett abgeschlossen und getestet

---

### **Phase 2: Analytics & Reporting** ✅ ABGESCHLOSSEN

#### **Ziel:** Professionelle Reports für Kunden

**Tasks:**
1. ✅ Dashboard mit KPIs
   - ✅ Total Clippings
   - ✅ Gesamtreichweite
   - ✅ AVE Total (falls vorhanden)
   - ✅ Sentiment-Pie-Chart
   - ✅ Timeline-Graph (Veröffentlichungen über Zeit)
   - ✅ Medium-Verteilung (Pie Chart)
   - ✅ Top 5 Medien nach Reichweite
   - ✅ E-Mail Performance KPIs
   - ✅ Conversion-Rate (Opens → Clippings)
2. ✅ Export-Funktion
   - ✅ PDF-Report-Generator (mit Brand Colors #005fab, #DEDC00)
   - ✅ Excel-Export (Multi-Sheet: Zusammenfassung, E-Mails, Clippings)
   - ✅ Client-Side Upload (kein Admin SDK)
3. ⏳ Vergleichs-Analytics (VERSCHOBEN - nicht priorisiert)
   - Kampagne vs. Kampagne
   - Projekt vs. Projekt
   - Zeitraum-Vergleiche
4. 📋 Benchmarking (VERSCHOBEN - optional)
   - Branchendurchschnitt
   - Historische Daten

**Implementierte Komponenten:**
- `MonitoringDashboard.tsx` - Analytics Dashboard mit Charts (Recharts)
- `monitoring-report-service.ts` - PDF-Report Generator
- `monitoring-excel-export.ts` - Excel Multi-Sheet Export
- Export-Buttons in Monitoring-Detail-Seite integriert
- Projekt-Monitoring-Tab mit Dashboard erweitert

**Priorisierung:**
1. ✅ Dashboard mit KPIs (ERLEDIGT)
2. ✅ PDF-Report für einzelne Kampagne (ERLEDIGT)
3. ✅ Excel-Export der Monitoring-Daten (ERLEDIGT)
4. ⏳ Vergleichs-Analytics (Verschoben - bei Bedarf später)

---

### **Phase 3: Clipping-Enhancement** 🚧 IN ARBEIT

#### **Ziel:** Reichere Daten und bessere Analyse

**Tasks:**
1. 🚧 AVE-Berechnung (Advertising Value Equivalent)
   - Formel: `AVE = Reichweite × Faktor × Sentiment-Multiplikator`
   - Default-Faktoren:
     - Print: 3€ pro Reichweite
     - Online: 1€ pro Reichweite
     - Broadcast: 5€ pro Reichweite
     - Blog: 0.5€ pro Reichweite
   - Sentiment-Multiplikatoren:
     - Positiv: 1.0 (voller Wert)
     - Neutral: 0.8 (20% Abzug)
     - Negativ: 0.5 (50% Abzug)
   - Monitoring-Settings-Seite für AVE-Faktor-Konfiguration
   - AVE-Display in ClippingArchive und Dashboard

2. 🚧 Sentiment-Analyse Verbesserung
   - Sentiment-Score (-1 bis 1) zusätzlich zu Labels
   - Slider in MarkPublishedModal für feinere Abstufung
   - Score-basierte Berechnung statt nur Label

3. 📋 Screenshot-Capture (Puppeteer) - VERSCHOBEN auf später
   - Automatischer Screenshot bei URL-Eingabe
   - Upload zu Firebase Storage
   - **Grund:** Komplexität, erst nach AVE-Features

4. 📋 Web Scraping (Volltext-Extraktion) - VERSCHOBEN auf später
   - Artikel-Text extrahieren
   - Metadaten (Autor, Datum)
   - **Grund:** Erst nach Screenshot-Feature

**Priorisierung (aktualisiert):**
1. ✅ AVE-Berechnung + Settings (HEUTE)
2. ✅ Sentiment-Score mit Slider (HEUTE)
3. 📋 Screenshot-Capture (SPÄTER - Phase 4)
4. 📋 Web-Scraping (SPÄTER - Phase 5)

**Status:** 24. September 2025 - Implementierung gestartet

---

### **Phase 4: RSS Feed Monitoring** 🔄 NIEDRIG

#### **Ziel:** Überwachung spezifischer Medien-RSS-Feeds

**Tasks:**
1. ⏳ RSS Parser Integration (npm package)
2. ⏳ User kann RSS Feeds hinzufügen (pro Kampagne oder global)
3. ⏳ Firebase Function: RSS Crawler
4. ⏳ Keyword-Matching in RSS Items
5. ⏳ Vorschläge in UI wie bei Google News

**Use Case:**
- User fügt RSS Feed von "Süddeutsche Zeitung Tech" hinzu
- System checkt täglich auf neue Artikel
- Bei Keyword-Match → Vorschlag

---

### **Phase 5: Google News Integration** 🔄 MITTEL (SPÄTER)

#### **Ziel:** Automatische Artikel-Erkennung

**Tasks:**
1. 📋 Google News API Account & Setup
2. 📋 Firebase Function: Daily News Crawler
3. 📋 `monitoring_suggestions` Collection
4. 📋 Keyword-Extraction aus Kampagnen-Content
5. 📋 Matching-Algorithmus (Score-Berechnung)
6. 📋 UI: Vorschläge in Monitoring-Tab
7. 📋 Bestätigen/Ablehnen-Flow
8. 📋 Auto-Verknüpfung mit Empfängern (wenn möglich)

**Technische Details:**
- Firebase Scheduled Function (täglich um 06:00)
- Durchsucht Google News nach:
  - Firmenname
  - Produktname
  - Keywords aus PM (top 5)
- Zeitfenster: 30 Tage nach Versand
- Speichert Treffer als `monitoring_suggestion`
- User bestätigt/lehnt ab in UI

---

## 🛠️ TECHNISCHE ARCHITEKTUR

### **Services & Functions**

#### **1. Neue Firebase Services**

```typescript
// src/lib/firebase/clipping-service.ts
class ClippingService {
  async create(clipping: MediaClipping, context): Promise<string>
  async getById(id: string, context): Promise<MediaClipping | null>
  async getByCampaignId(campaignId: string, context): Promise<MediaClipping[]>
  async getByProjectId(projectId: string, context): Promise<MediaClipping[]>
  async update(id: string, data: Partial<MediaClipping>, context): Promise<void>
  async delete(id: string, context): Promise<void>

  // Analytics
  async getCampaignStats(campaignId: string, context): Promise<ClippingStats>
  async getProjectStats(projectId: string, context): Promise<ClippingStats>
}

// src/lib/firebase/monitoring-service.ts
class MonitoringService {
  async createSuggestion(suggestion: MonitoringSuggestion, context): Promise<string>
  async getSuggestionsByCampaign(campaignId: string, context): Promise<MonitoringSuggestion[]>
  async confirmSuggestion(suggestionId: string, userId: string): Promise<MediaClipping>
  async rejectSuggestion(suggestionId: string, userId: string): Promise<void>

  // Matching
  async findPotentialMatches(article: ArticleData, campaign: PRCampaign): Promise<number>
}

// src/lib/firebase/email-tracking-service.ts (Erweiterung)
class EmailTrackingService {
  // ... existing methods ...

  async markAsPublished(sendId: string, publishingData: PublishingData, context): Promise<void>
  async linkClipping(sendId: string, clippingId: string, context): Promise<void>
  async getPublishedByCampaign(campaignId: string, context): Promise<EmailCampaignSend[]>
}
```

#### **2. Firebase Functions**

```typescript
// functions/src/monitoring/google-news-crawler.ts
export const dailyNewsCrawler = functions.pubsub
  .schedule('0 6 * * *') // Täglich 06:00
  .onRun(async (context) => {
    // Hole alle aktiven Kampagnen (versendet in letzten 30 Tagen)
    // Suche Google News nach Keywords
    // Erstelle monitoring_suggestions
  });

// functions/src/monitoring/rss-crawler.ts
export const dailyRssCrawler = functions.pubsub
  .schedule('0 7 * * *')
  .onRun(async (context) => {
    // Hole alle konfigurierten RSS Feeds
    // Parse Feeds
    // Match gegen Kampagnen-Keywords
  });

// functions/src/monitoring/screenshot-capture.ts
export const captureScreenshot = functions.https.onCall(async (data, context) => {
  // Puppeteer
  // Screenshot von URL
  // Upload zu Storage
  // Return URL
});
```

#### **3. API Routes**

```typescript
// src/app/api/monitoring/google-news/route.ts
POST /api/monitoring/google-news
// Manuelle News-Suche triggern

// src/app/api/monitoring/screenshot/route.ts
POST /api/monitoring/screenshot
// Screenshot-Capture

// src/app/api/monitoring/sentiment/route.ts
POST /api/monitoring/sentiment
// AI Sentiment-Analyse
```

---

## 🗂️ KOMPONENTEN-STRUKTUR

```
src/components/monitoring/
├── MonitoringTab.tsx                    # Haupt-Tab in Kampagne
├── EmailPerformanceStats.tsx            # SendGrid Stats (Section 1)
├── RecipientTrackingList.tsx            # Empfänger-Liste (Section 2)
│   ├── RecipientTrackingItem.tsx        # Einzelner Empfänger
│   └── MarkPublishedModal.tsx           # "Als veröffentlicht" Modal
├── MonitoringSuggestions.tsx            # Google News Vorschläge (Section 3)
│   ├── SuggestionCard.tsx
│   └── SuggestionConfirmModal.tsx
├── ClippingArchive.tsx                  # Clippings-Grid (Section 4)
│   ├── ClippingCard.tsx
│   └── ClippingDetailModal.tsx
├── ClippingForm.tsx                     # Manuelles Clipping hinzufügen
├── MonitoringDashboard.tsx              # Analytics-Dashboard
└── ReportGenerator.tsx                  # PDF-Export
```

---

## ⚠️ KRITISCHE PROBLEME & LÖSUNGEN

### **Problem 1: Hohe Bounce Rate & E-Mail-Reputation**

#### **Problemstellung:**
- User hat hohe Bounce-Rate (z.B. 15%)
- Gefahr: SendGrid sperrt Account bei zu vielen Bounces
- Spam-Score steigt → E-Mails landen im Spam-Ordner
- **FEHLT:** Bounce-Liste und Qualitätskontrolle

#### **Lösung: Bounce-Management-System**

**1. Bounce-Liste UI (NEU)**
- Eigener Tab unter "PR-Tools" → **"E-Mail-Qualität"**
- Zeigt ALLE gebounced E-Mail-Adressen org-weit
- Spalten:
  - E-Mail-Adresse
  - Bounce-Typ (hard/soft)
  - Bounce-Grund
  - Kampagne (wo gebounced)
  - Datum
  - Aktion: [🗑️ Aus Listen entfernen] [✓ Als gültig markieren]

**2. Automatische Bounce-Handling**
```typescript
// Webhook erweitern
case 'bounce':
  // Prüfe Bounce-Typ
  if (event.type === 'hard_bounce') {
    // Hard Bounce = ungültige E-Mail
    await contactService.markAsInvalid(email, organizationId);
    await contactListService.removeFromAllLists(email, organizationId);
    // Warnung an User
    await notificationService.create({
      type: 'email_quality_alert',
      message: `E-Mail ${email} ist ungültig und wurde aus allen Listen entfernt`
    });
  }
```

**3. Bounce-Rate Warnsystem**
```typescript
// Vor jedem Versand prüfen
async checkBouncRate(campaignId: string): Promise<ValidationResult> {
  const sends = await emailCampaignService.getSends(campaignId);
  const bounceCount = sends.filter(s => s.status === 'bounced').length;
  const bounceRate = (bounceCount / sends.length) * 100;

  if (bounceRate > 5) {
    return {
      canSend: false,
      warning: `⚠️ Bounce-Rate zu hoch (${bounceRate}%). Bitte Liste bereinigen!`,
      action: 'clean_list'
    };
  }

  return { canSend: true };
}
```

**4. Pre-Send Validation (NEU)**
- Vor jedem Versand: Prüfe Empfänger-Liste gegen Bounce-History
- Modal zeigt:
  ```
  ⚠️ WARNUNG: 15 Empfänger haben bereits gebounced

  - max.mueller@invalid.de (Hard Bounce in Kampagne #123)
  - anna.schmidt@fake.com (Hard Bounce in Kampagne #156)
  ...

  [Diese entfernen] [Trotzdem versenden]
  ```

**5. SendGrid-Schutz**
- **Reputation-Dashboard:**
  - Bounce-Rate (Warnung bei >5%, Fehler bei >10%)
  - Spam-Reports
  - SendGrid-Reputation-Score
- **Auto-Pause:**
  - Bei >10% Bounce-Rate: Versand blockieren
  - Erst nach Bereinigung wieder erlauben

---

### **Problem 2: Kampagne ohne Projekt - Wo ist die Versandliste?**

#### **Problemstellung:**
- User erstellt Kampagne OHNE Projekt
- Versendet E-Mail
- **FEHLT:** Zugriff auf Monitoring/Tracking

#### **Aktueller Stand (vermutlich):**
```
/dashboard/pr-tools/campaigns/page.tsx
→ Zeigt alle Kampagnen in Tabelle
→ Klick auf Kampagne → Detail-Seite mit Tabs
```

#### **Lösung: Monitoring-Tab für ALLE Kampagnen**

**1. Kampagnen-Übersicht erweitern**
```
Tabelle: Alle Kampagnen
├── Spalte: Status (Entwurf/Versendet/Archiviert)
├── Spalte: Versanddatum
├── Spalte: Empfänger-Count
├── NEUE Spalte: Bounce-Rate (rot bei >5%)
├── NEUE Spalte: Öffnungsrate
└── Klick → Detail-Seite
```

**2. Kampagnen-Detail (OHNE Projekt)**
```
/dashboard/pr-tools/campaigns/campaigns/[campaignId]

Tabs:
├── Overview (Titel, Inhalt, Status)
├── Content (Pressemeldung)
├── Distribution (Versand-Config)
└── Monitoring ← DIESER TAB!
    ├── E-Mail-Performance
    ├── Empfänger-Liste
    ├── Bounce-Liste (wenn >0)
    ├── Clippings
    └── Report-Export
```

**3. Navigation zu Monitoring**
```
Variante A: Über Kampagnen-Übersicht
/dashboard/pr-tools/campaigns
→ Klick auf Kampagne
→ Tab "Monitoring"

Variante B: Direkt-Link (falls aus Projekt)
/dashboard/projects/[projectId]
→ Tab "Monitoring"
→ Zeigt ALLE Kampagnen des Projekts
→ Klick auf Kampagne → öffnet Kampagnen-Monitoring
```

**4. Globale "Versandhistorie" (NEU - Optional)**
```
/dashboard/pr-tools/email-history

Zeigt ALLE Versände org-weit:
├── Filter: Kampagne, Datum, Status
├── Bounce-Filter: Nur gebounced
├── Export-Funktion
└── Bulk-Aktionen (z.B. alle Bounces entfernen)
```

---

### **Problem 3: Bounce-Bereinigung & Listen-Hygiene**

#### **Automatische Bereinigung (Empfehlung)**

**1. Täglicher Cleanup-Job**
```typescript
// Firebase Function
export const dailyBounceCleanup = functions.pubsub
  .schedule('0 3 * * *') // Täglich 03:00
  .onRun(async (context) => {
    // Hole alle Hard Bounces der letzten 24h
    const bounces = await getRecentBounces('hard', 1);

    for (const bounce of bounces) {
      // Entferne aus ALLEN Contact Lists
      await contactListService.removeEmailFromAllLists(
        bounce.email,
        bounce.organizationId
      );

      // Markiere Kontakt als "ungültig"
      await contactService.updateByEmail(bounce.email, {
        emailStatus: 'invalid',
        invalidatedAt: Timestamp.now(),
        invalidationReason: 'hard_bounce'
      });

      // Log für User
      await auditLog.create({
        action: 'email_invalidated',
        email: bounce.email,
        reason: 'automatic_hard_bounce_cleanup'
      });
    }
  });
```

**2. Manual Cleanup UI**
```
/dashboard/pr-tools/email-quality

┌─────────────────────────────────────────────────┐
│  ⚠️ E-Mail-Qualität & Bounce-Management         │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Statistiken                                  │
│  ├── Bounce-Rate (letzte 30 Tage): 8.5% ⚠️      │
│  ├── Hard Bounces: 45                           │
│  ├── Soft Bounces: 12                           │
│  └── Spam-Reports: 2                            │
│                                                  │
│  [🧹 Alle Hard Bounces bereinigen]              │
│                                                  │
│  ─────────────────────────────────────────────  │
│                                                  │
│  📋 Bounce-Liste (45)                           │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ ❌ max@invalid.de                          │ │
│  │    Hard Bounce: "Mailbox does not exist"  │ │
│  │    Kampagne: "Produktlaunch Q1"           │ │
│  │    Datum: 22.01.2025                      │ │
│  │    [🗑️ Aus Listen entfernen] [Details]   │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

**3. Kontakt-Detail: E-Mail-Status**
```
Kontakt bearbeiten → Zeigt:

📧 E-Mail-Status: ❌ UNGÜLTIG (Hard Bounce)
   Grund: Mailbox existiert nicht
   Gebounced am: 22.01.2025
   Kampagne: Produktlaunch Q1

   [✓ Als gültig markieren] (wenn User sicher ist)
```

---

## 📊 OFFENE FRAGEN & DISKUSSIONSPUNKTE

### **1. Google News API**
- ❓ Welche API nutzen? (News API, Google Custom Search, oder Scraping?)
- ❓ Kosten-Limit festlegen?
- ❓ Wie viele Suchen pro Tag? (1x täglich oder on-demand?)

### **2. AVE-Berechnung**
- ❓ Formel definieren (z.B. Reichweite × 0.50€ × Sentiment-Faktor)
- ❓ Unterschiedliche Faktoren für Print vs. Online?
- ❓ Konfigurierbar pro Organisation?

### **3. Screenshot-Capture**
- ❓ Automatisch bei jeder URL oder nur auf Anfrage?
- ❓ Storage-Limit pro Organisation?
- ❓ Puppeteer in Firebase Functions oder separate Service?

### **4. Sentiment-Analyse**
- ❓ Manuell oder AI?
- ❓ Wenn AI: Welche API? (OpenAI, Claude, eigenes Modell?)
- ❓ Kosten-Nutzen?

### **5. Monitoring-Frequenz**
- ❓ Wie lange nach Versand monitoren? (30 Tage? 90 Tage? Unbegrenzt?)
- ❓ Auto-Stop oder manuell?

### **6. Matching-Logik**
- ❓ Wie matchen wir Artikel zu Empfängern?
  - Medium-Name Matching?
  - E-Mail-Domain Matching?
  - Nur manuell?

---

## ✅ NÄCHSTE SCHRITTE

1. **Diskussion & Klärung** (Dieser Schritt)
   - Offene Fragen beantworten
   - UI-Konzept absegnen
   - Priorisierung festlegen

2. **Phase 1 starten** (Nach Freigabe)
   - Datenmodell erweitern
   - Monitoring-Tab UI bauen
   - Manuelles Tracking implementieren

3. **Testing** (Nach Phase 1)
   - E2E-Tests für Tracking-Flow
   - UI-Tests für Monitoring-Tab
   - Performance-Tests (große Empfänger-Listen)

4. **Phase 2-6** (Iterativ)
   - Google News Integration
   - RSS Monitoring
   - Analytics & Reporting

---

## 📝 CHANGELOG

**2025-01-23** - Initiale Version
- Analyse bestehender Infrastruktur
- Datenmodell-Konzept
- UI/UX-Entwurf
- 6-Phasen Implementierungsplan

---

**Status: 🟢 PHASE 1 IMPLEMENTIERT**

Nächster Schritt: Testing mit echter Kampagne, dann Phase 2 (Google News Integration)