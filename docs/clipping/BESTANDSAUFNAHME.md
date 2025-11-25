# Clipping/Monitoring-System - Bestandsaufnahme (KORRIGIERT)

**Datum:** 25.11.2025
**Status:** System ist weitgehend implementiert!

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [System-Status](#system-status)
3. [System-Architektur](#system-architektur)
4. [Crawler-Details](#crawler-details)
5. [UI-Bereiche](#ui-bereiche)
6. [Datenmodelle](#datenmodelle)
7. [Services](#services)
8. [API-Routen](#api-routen)
9. [Datei-Index](#datei-index)
10. [Offene Punkte](#offene-punkte)

---

## Übersicht

Das Clipping/Monitoring-System findet automatisch Presseveröffentlichungen, die auf versendete PR-Kampagnen zurückzuführen sind.

### Ablauf
1. **Publikationen** werden mit RSS-Feed-URLs hinterlegt
2. **Journalisten** werden den Publikationen zugeordnet
3. **Kampagnen** werden an Journalisten versendet (Massen-Mail)
4. **Cron-Job** crawlt RSS-Feeds täglich um 06:00 Uhr
5. **Keyword-Matching** findet relevante Artikel
6. **Auto-Confirm** bei hoher Confidence → direkt als Clipping
7. **Auto-Funde Tab** für unsichere Treffer zur manuellen Prüfung

---

## System-Status

| Komponente | Status | Anmerkung |
|------------|--------|-----------|
| Datenmodelle | ✅ 100% | Vollständig |
| UI-Komponenten | ✅ 100% | Alle Tabs vorhanden |
| RSS-Crawler | ✅ 100% | 404 Zeilen Code |
| Admin SDK Service | ✅ 100% | 507 Zeilen Code |
| Cron Job | ✅ 100% | Vercel täglich 06:00 |
| Auto-Confirm Logik | ✅ 100% | Score-basiert |
| Keyword-Matching | ✅ 100% | Titel zählt doppelt |
| Spam-Filter | ✅ 100% | Pattern-basiert |
| **Production-Ready** | ✅ **JA** | Grundfunktionen komplett |

---

## System-Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PUBLIKATIONEN                                  │
│  /dashboard/library/publications                                        │
│  - RSS-Feed-URLs hinterlegen                                            │
│  - PublicationMonitoringConfig.rssFeedUrls[]                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    JOURNALISTEN → PUBLIKATIONEN                          │
│  /dashboard/contacts/crm/contacts                                       │
│  - Journalisten anlegen                                                 │
│  - publication-matcher.ts: handleRecipientLookup()                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        KAMPAGNE VERSENDEN                                │
│  - Massen-Mail an Journalisten                                          │
│  - campaign.monitoringConfig.keywords definieren                        │
│  - CampaignMonitoringTracker wird erstellt                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    VERCEL CRON JOB (06:00 Uhr)                          │
│  /api/cron/monitoring-crawler                                           │
│  - rss-parser Bibliothek                                                │
│  - Keyword-Matching mit Score                                           │
│  - Spam-Filter                                                          │
│  - Duplicate-Check                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│   AUTO-CONFIRM                │  │      SUGGESTION               │
│   Score >= 85 ODER            │  │   Score 50-84                 │
│   2+ Quellen                  │  │   1 Quelle                    │
│   → MediaClipping erstellt    │  │   → Tab "Auto-Funde"          │
│   → Channel deaktiviert       │  │   → Manuelle Prüfung          │
└───────────────────────────────┘  └───────────────────────────────┘
```

---

## Crawler-Details

### Vercel Cron Konfiguration (vercel.json)

```json
{
  "path": "/api/cron/monitoring-crawler",
  "schedule": "0 6 * * *"
}
```

### Keyword-Matching (route.ts:353-374)

```typescript
function calculateMatchScore(title: string, content: string, keywords: string[]): number {
  let matchedCount = 0;

  for (const keyword of keywords) {
    if (title.includes(keyword)) {
      matchedCount += 2; // Titel-Match zählt DOPPELT
    } else if (content.includes(keyword)) {
      matchedCount += 1;
    }
  }

  // Score: (matched / total) * 100
  return (matchedCount / (keywords.length * 2)) * 100;
}
```

### Mindest-Scores

| Quelle | Mindest-Score für Aufnahme |
|--------|---------------------------|
| RSS Feed | 50 |
| Google News | 80 |

### Auto-Confirm Logik (service.ts:491-506)

```typescript
function shouldAutoConfirmSuggestion(sourceCount, avgScore, highestScore, minMatchScore) {
  // 2+ Quellen = Auto-Confirm
  if (sourceCount >= 2) return true;

  // 1 Quelle aber Score >= 85
  if (sourceCount === 1 && highestScore >= 85 && highestScore >= minMatchScore) {
    return true;
  }

  return false;
}
```

### Confidence-Levels

| Level | Bedingung |
|-------|-----------|
| `very_high` | 3+ Quellen UND avgScore >= 80 |
| `high` | 2+ Quellen UND avgScore >= 70 |
| `medium` | 2+ Quellen ODER avgScore >= 80 |
| `low` | Alles andere |

### Spam-Filter

- Pattern-basiert (RegEx oder String-Match)
- Typen: `url_domain`, `keyword_title`, `outlet_name`
- Scope: `global` oder `campaign`

---

## UI-Bereiche

### 1. Dashboard-Startseite (`/dashboard`)

**PR-Monitoring Widget:**
- Filter: "Veröffentlichungen" | "Auto-Funde"
- Tabelle mit Typ, Titel, Medium, Status
- "Bestätigen"-Button für Auto-Funde
- Sentiment-Icons für Clippings

### 2. Monitoring-Übersicht (`/dashboard/analytics/monitoring`)

**Kampagnen-Liste:**
- Alle versendeten Kampagnen
- Stats: Öffnungsrate, Bounce-Rate, Clippings

### 3. Kampagnen-Detail (`/dashboard/analytics/monitoring/[campaignId]`)

**5 Tabs:**

| Tab | Label | Komponente |
|-----|-------|------------|
| `dashboard` | Analytics | MonitoringDashboard |
| `performance` | E-Mail Performance | EmailPerformanceStats |
| `recipients` | **Empfänger & Veröffentlichungen** | RecipientTrackingList |
| `clippings` | Clipping-Archiv | ClippingArchive |
| `suggestions` | **Auto-Funde** | MonitoringSuggestionsTable |

### 4. Projekt-Monitoring (`/dashboard/projects/[projectId]?tab=monitoring`)

**3 Views:**
- `overview`: Stats + Charts
- `recipients`: Empfänger-Liste
- `clippings`: Clipping-Archiv

### 5. Super-Admin Control Center (`/dashboard/super-admin/monitoring`)

**Admin-Oberfläche für Crawler-Steuerung:**

**SystemOverview:**
- System-weite Statistiken
- Gesamt-Tracker, Artikel, Auto-Confirms

**CrawlerControlPanel:**
- Status-Badge: Aktiv / Pausiert
- "Cron Job pausieren" Button (mit Grund-Eingabe)
- "Cron Job aktivieren" Button
- "Manuell starten (alle Orgs)" Button

**3 Tabs:**

| Tab | Komponente | Inhalt |
|-----|------------|--------|
| Organizations | OrganizationStatsTable | Stats pro Organisation, "Crawl triggern" Button |
| Channel Health | ChannelHealthTable | RSS-Channel-Status, Fehler-Rate |
| Error Logs | ErrorLogTable | Crawler-Fehler-Protokoll |

**API-Endpunkte:**
- `GET /api/admin/monitoring-stats` - System-Statistiken
- `GET /api/admin/crawler-status` - Cron-Job Status
- `POST /api/admin/crawler-control` - Actions: pause, resume, trigger_all, trigger_org

---

## Datenmodelle

### Firestore Collections

| Collection | Zweck |
|------------|-------|
| `publications` | Publikationen mit RSS-Feed-Konfiguration |
| `contacts` | Journalisten mit Publikations-Zuordnung |
| `pr_campaigns` | Kampagnen mit `monitoringConfig.keywords` |
| `campaign_monitoring_trackers` | Tracking-Objekt pro Kampagne |
| `monitoring_suggestions` | Auto-Funde (pending) |
| `media_clippings` | Bestätigte Clippings |
| `spam_patterns` | Spam-Filter-Regeln |

### Wichtige Typen

#### CampaignMonitoringTracker
```typescript
{
  campaignId: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;        // 30/90/365 Tage
  isActive: boolean;
  channels: MonitoringChannel[];  // RSS-Feeds + Google News
  totalArticlesFound: number;
  totalAutoConfirmed: number;
}
```

#### MonitoringSuggestion
```typescript
{
  campaignId: string;
  articleUrl: string;
  normalizedUrl: string;  // Für Duplicate-Check
  articleTitle: string;
  sources: MonitoringSource[];
  avgMatchScore: number;
  highestMatchScore: number;
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  autoConfirmed: boolean;
  status: 'pending' | 'confirmed' | 'auto_confirmed' | 'spam';
}
```

---

## Services

### Crawler (Server-side)

| Datei | Zeilen | Inhalt |
|-------|--------|--------|
| `src/app/api/cron/monitoring-crawler/route.ts` | 404 | Cron Job Handler |
| `src/lib/firebase-admin/monitoring-crawler-service.ts` | 507 | Admin SDK Logik |
| `src/lib/firebase-admin/crawler-control-service.ts` | ~50 | Feature Flags |

### Client-side

| Datei | Service |
|-------|---------|
| `src/lib/firebase/clipping-service.ts` | ClippingService |
| `src/lib/firebase/monitoring-suggestion-service.ts` | MonitoringSuggestionService |
| `src/lib/firebase/campaign-monitoring-service.ts` | CampaignMonitoringService |
| `src/lib/firebase/publication-matcher.ts` | handleRecipientLookup() |

### React Hooks

| Hook | Zweck |
|------|-------|
| `useClippingStats` | Stats-Aggregation |
| `useAVECalculation` | AVE-Berechnung |
| `useProjectMonitoringData` | Projekt-Daten |
| `useConfirmSuggestion` | Suggestion bestätigen |

---

## API-Routen

| Route | Schedule | Zweck |
|-------|----------|-------|
| `/api/cron/monitoring-crawler` | 06:00 täglich | RSS-Crawling |
| `/api/admin/crawler-control` | - | Crawler Ein/Aus |
| `/api/admin/monitoring-stats` | - | Dashboard-Stats |
| `/api/rss-detect` | - | RSS-Feed Auto-Detection |

---

## Datei-Index

### Crawler

| Pfad | Beschreibung |
|------|--------------|
| `vercel.json:32-34` | Cron-Konfiguration |
| `src/app/api/cron/monitoring-crawler/route.ts` | Crawler Entry Point |
| `src/lib/firebase-admin/monitoring-crawler-service.ts` | Admin SDK Service |
| `src/lib/firebase-admin/crawler-control-service.ts` | Feature Flags |

### UI-Komponenten

| Pfad | Komponente |
|------|------------|
| `src/app/dashboard/page.tsx:763-1001` | PR-Monitoring Widget |
| `src/app/dashboard/analytics/monitoring/[campaignId]/components/TabNavigation.tsx` | Tab-Navigation |
| `src/components/monitoring/MonitoringDashboard.tsx` | Analytics |
| `src/components/monitoring/RecipientTrackingList.tsx` | Empfänger-Liste |
| `src/components/monitoring/ClippingArchive.tsx` | Clipping-Archiv |
| `src/components/monitoring/MonitoringSuggestionsTable.tsx` | Auto-Funde |

### Super-Admin Komponenten

| Pfad | Komponente |
|------|------------|
| `src/app/dashboard/super-admin/monitoring/page.tsx` | Control Center Page |
| `src/components/admin/SystemOverview.tsx` | System-Statistiken |
| `src/components/admin/CrawlerControlPanel.tsx` | Pause/Resume/Trigger Buttons |
| `src/components/admin/OrganizationStatsTable.tsx` | Org-Stats + Trigger |
| `src/components/admin/ChannelHealthTable.tsx` | RSS-Channel Status |
| `src/components/admin/ErrorLogTable.tsx` | Fehler-Protokoll |

---

## Offene Punkte

### Noch zu klären

1. **Keyword-Quelle:** Keywords kommen aus `campaign.monitoringConfig.keywords`
   - Werden diese manuell eingegeben?
   - Oder automatisch aus Pressemeldung extrahiert?

2. **Tracker-Erstellung:** Wann wird `CampaignMonitoringTracker` erstellt?
   - Beim Kampagnen-Versand?
   - Manuell?

### Mögliche Verbesserungen

- Keywords automatisch aus Pressemeldung extrahieren
- Firmenname aus Organisation als Default-Keyword
- NLP/AI für bessere Keyword-Extraktion

---

## Crawler-Ablauf (Flowchart)

```
06:00 Uhr Vercel Cron
         │
         ▼
  Feature Flag Check ──────▶ Deaktiviert? → Skip
         │
         ▼
  Abgelaufene Tracker deaktivieren
         │
         ▼
  Aktive Tracker laden
         │
         ▼
  ┌──────────────────────────────┐
  │ Für jeden Tracker:           │
  │  1. Kampagne laden           │
  │  2. Keywords extrahieren     │
  │                              │
  │  Für jeden Channel:          │
  │   - RSS/Google News parsen   │
  │   - Keyword-Matching         │
  │   - Score berechnen          │
  │                              │
  │   Score < 50? → Skip         │
  │                              │
  │   Spam-Check                 │
  │   Duplicate-Check            │
  │                              │
  │   Auto-Confirm?              │
  │   ├─ JA: Clipping erstellen  │
  │   │      Channel deaktivieren│
  │   └─ NEIN: Suggestion        │
  │            (status: pending) │
  └──────────────────────────────┘
```

---

*Korrigiert am 25.11.2025 - System ist weitgehend implementiert!*
