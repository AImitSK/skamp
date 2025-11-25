# Clipping-System - Dateien-Referenz

Detaillierte Referenz aller relevanten Dateien mit Zeilennummern und Funktionen.

---

## Typen-Definitionen

### src/types/monitoring.ts

| Zeilen | Type/Interface | Beschreibung |
|--------|----------------|--------------|
| 3-50 | `MediaClipping` | Bestätigter Presse-Artikel mit Metriken |
| 61-110 | `MonitoringSuggestion` | Automatisch gefundener Artikel (pending) |
| 254-278 | `CampaignMonitoringTracker` | Zentrales Tracking-Objekt pro Kampagne |
| 287-309 | `MonitoringChannel` | Ein RSS-Feed oder Google News Channel |
| 322-343 | `SpamPattern` | Filter für unerwünschte Artikel |

### src/types/library.ts

| Zeilen | Type/Interface | Beschreibung |
|--------|----------------|--------------|
| 1-200 | `Publication` | Publikations-Datenmodell |
| 737+ | `PublicationMonitoringConfig` | Monitoring-Konfiguration pro Publikation |

### src/types/pr.ts

| Feld | Type | Beschreibung |
|------|------|--------------|
| `monitoringConfig` | Object | Kampagnen-Monitoring-Einstellungen |
| `monitoringConfig.isEnabled` | boolean | Monitoring aktiv? |
| `monitoringConfig.monitoringPeriod` | 30/90/365 | Tage |
| `monitoringConfig.keywords` | string[] | Google News Keywords |

---

## Firebase Services (Client)

### src/lib/firebase/clipping-service.ts

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `create()` | ClippingData | string (id) | Erstellt Clipping |
| `getById()` | id, orgId | MediaClipping | Lädt einzelnes Clipping |
| `getByCampaignId()` | campaignId, orgId | MediaClipping[] | Alle Clippings einer Kampagne |
| `getByProjectId()` | projectId, orgId | MediaClipping[] | Alle Clippings eines Projekts |
| `update()` | id, data, orgId | void | Aktualisiert Clipping |
| `delete()` | id, orgId | void | Löscht Clipping |
| `getCampaignStats()` | campaignId | ClippingStats | Statistiken |
| `calculateStats()` | clippings[] | ClippingStats | Berechnet Aggregat-Stats |

### src/lib/firebase/media-clippings-service.ts

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `saveClippingAsset()` | clippingData, orgId | string | Speichert als Media Asset |
| `getProjectClippings()` | projectId, orgId | MediaClipping[] | Projekt-Clippings |
| `updateClippingMetrics()` | id, metrics, orgId | void | Updates Metriken |
| `generateClippingScreenshot()` | url | string | **PLACEHOLDER** Screenshot-URL |
| `searchClippings()` | filters | MediaClipping[] | Erweiterte Suche |
| `createClippingPackage()` | clippingIds | ShareLink | Share-Link erstellen |
| `exportClippings()` | format, clippingIds | Blob | **PLACEHOLDER** Export |

### src/lib/firebase/monitoring-suggestion-service.ts

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `getByCampaignId()` | campaignId, orgId | Suggestion[] | Alle Suggestions |
| `getById()` | id, orgId | Suggestion | Einzelne Suggestion |
| `confirmSuggestion()` | id, orgId | string (clippingId) | Konvertiert zu Clipping |
| `rejectSuggestion()` | id, orgId | void | Markiert als rejected |
| `markAsSpam()` | id, orgId, pattern? | void | Spam-Markierung |

### src/lib/firebase/campaign-monitoring-service.ts

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `createTrackerForCampaign()` | campaignId, orgId | string | **HAUPTFUNKTION** Erstellt Tracker |
| `buildChannelsFromRecipients()` | emailSends, orgId | Channel[] | Channel-Sammlung |
| `buildChannelsFromPublication()` | publication | Channel[] | RSS Channels |
| `buildGoogleNewsChannel()` | keywords | Channel | Google News Channel |
| `markChannelAsFound()` | trackerId, channelId | void | Deaktiviert Channel |
| `getActiveTrackers()` | - | Tracker[] | Alle aktiven Tracker |
| `deactivateExpiredTrackers()` | - | void | Cleanup |
| `updateStats()` | trackerId, stats | void | Statistik-Update |

### src/lib/firebase/publication-matcher.ts

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `handleRecipientLookup()` | email, orgId | LookupResult | Email → Publications |

**LookupResult:**
```typescript
{
  contact: Contact | null;
  company: Company | null;
  publications: Publication[];
}
```

### src/lib/firebase/publication-helpers.ts

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `getWebsiteUrl()` | publication | string | URL mit Fallback |
| `getRssFeedUrls()` | publication | string[] | RSS URLs mit Fallback |
| `isMonitoringEnabled()` | publication | boolean | Monitoring aktiv? |
| `getCheckFrequency()` | publication | string | Frequenz mit Default |
| `getKeywords()` | publication | string[] | Keywords mit Fallback |
| `migrateToMonitoringConfig()` | publication | Publication | Migration Helper |

---

## Firebase Admin Services (Server)

### src/lib/firebase-admin/monitoring-crawler-service.ts

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `getActiveTrackers()` | - | Tracker[] | Admin SDK Query |
| `getCampaign()` | campaignId | Campaign | Kampagne laden |
| `getSpamPatternsForCampaign()` | campaignId, orgId | Pattern[] | Global + Campaign Patterns |
| `checkForSpam()` | article, patterns | boolean | Spam-Check |
| `findExistingSuggestion()` | normalizedUrl, campaignId | Suggestion? | Duplicate-Check |
| `updateSuggestionWithNewSource()` | id, source | void | Multi-Source Update |
| `createSuggestion()` | data | string | Neue Suggestion |
| `createClippingFromSuggestion()` | suggestion, campaign | string | Auto-Import |
| `updateTrackerChannel()` | trackerId, channelId, data | void | Channel Update |
| `updateTrackerStats()` | trackerId, stats | void | Stats Update |
| `deactivateExpiredTrackers()` | - | void | Cleanup |

### src/lib/firebase-admin/crawler-control-service.ts

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `getCronJobStatus()` | - | CrawlerStatus | enabled/paused/disabled |
| `toggleCrawler()` | enabled | void | Ein/Aus |
| `pauseCrawler()` | reason, pausedBy | void | Pausieren mit Grund |

### src/lib/firebase-admin/monitoring-stats-service.ts

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `getSystemStats()` | - | SystemStats | Gesamt-Statistiken |
| `getOrganizationStats()` | orgId | OrgStats | Pro-Organisation |
| `getChannelHealth()` | - | HealthReport | Error/Success Rates |

---

## API Routes

### src/app/api/cron/monitoring-crawler/route.ts

```typescript
// GET - Cron Job (täglich 06:00)
// Header: Authorization: Bearer {CRON_SECRET}
// Vercel Cron Config in vercel.json

// Response:
{
  success: boolean;
  trackersProcessed: number;
  totalArticlesFound: number;
  totalAutoConfirmed: number;
}
```

### src/app/api/v1/publications/route.ts

```typescript
// GET - Liste mit Filtern
// Query Params:
// - search: string
// - types: string[] (magazine, newspaper, website, blog, podcast, tv, radio, newsletter)
// - formats: string[] (print, online, both, broadcast)
// - languages: string[]
// - countries: string[]
// - status: string (active, inactive, pending)
// - page: number (default: 1)
// - limit: number (default: 20, max: 100)
// - sortBy: string (createdAt, circulation, monthlyVisitors)
// - sortOrder: string (asc, desc)
// - expand: string[] (publisher, editions, contacts, guidelines)

// POST - Erstellen
// Body: APIPublicationCreateRequest | APIPublicationBulkCreateRequest
```

### src/app/api/rss-detect/route.ts

```typescript
// POST - RSS Feed Detection
// Body: { websiteUrl: string }

// Response:
{
  foundFeeds: string[];
  totalFound: number;
}

// Testet Standard-Patterns:
// - /feed, /rss, /feed.xml, /rss.xml
// - /atom.xml, /index.xml, /feeds/posts/default
```

### src/app/api/admin/monitoring-stats/route.ts

```typescript
// GET - Admin Dashboard Data
// **ACHTUNG: Auth nicht implementiert!**

// Response:
{
  systemStats: SystemStats;
  organizationStats: OrgStats[];
  channelHealth: HealthReport;
  errorLogs: ErrorLog[]; // limit: 50
}
```

---

## UI Komponenten

### src/app/dashboard/analytics/monitoring/

| Datei | Komponente | Beschreibung |
|-------|------------|--------------|
| `page.tsx` | MonitoringDashboard | Hauptseite |
| `[campaignId]/page.tsx` | CampaignMonitoring | Kampagnen-Detail |

### src/app/dashboard/analytics/monitoring/components/

| Datei | Komponente | Props |
|-------|------------|-------|
| `MonitoringHeader.tsx` | MonitoringHeader | stats, campaign |
| `TabNavigation.tsx` | TabNavigation | activeTab, onTabChange |
| `PDFExportButton.tsx` | PDFExportButton | campaignId |
| `ErrorState.tsx` | ErrorState | error, onRetry |
| `LoadingState.tsx` | LoadingState | - |

### src/app/dashboard/analytics/monitoring/context/

| Datei | Export | Beschreibung |
|-------|--------|--------------|
| `MonitoringContext.tsx` | MonitoringProvider | State Management |
| `MonitoringContext.tsx` | useMonitoring | Hook für Context |

### src/app/dashboard/library/publications/

| Datei | Komponente | Beschreibung |
|-------|------------|--------------|
| `page.tsx` | PublicationsPage | Publikationsliste |
| `[publicationId]/page.tsx` | PublicationDetail | Detail-Ansicht |
| `PublicationModal.tsx` | PublicationModal | Erstellen/Bearbeiten |
| `PublicationImportModal.tsx` | PublicationImportModal | CSV/Excel Import |

### src/app/dashboard/library/publications/PublicationModal/

| Datei | Komponente | Felder |
|-------|------------|--------|
| `BasicInfoSection.tsx` | BasicInfoSection | title, publisherId, type, format |
| `IdentifiersSection.tsx` | IdentifiersSection | issn, isbn, doi, urls |
| `MetricsSection.tsx` | MetricsSection | circulation, traffic, engagement |
| `MonitoringSection.tsx` | MonitoringSection | rssFeedUrls, frequency, keywords |

---

## Tests

### Monitoring Tests

| Datei | Beschreibung |
|-------|--------------|
| `plan-5-9-media-service-clipping-management.test.ts` | Clipping CRUD Tests |
| `plan-5-9-monitoring-pipeline-integration.test.ts` | Pipeline Integration |
| `plan-5-9-monitoring-ui-components.test.tsx` | UI Component Tests |
| `plan-5-9-project-service-monitoring.test.ts` | Project Service Tests |
| `monitoring-modal-flow.test.tsx` | Modal Integration Tests |

---

## Konfigurationsdateien

### vercel.json (Cron)

```json
{
  "crons": [
    {
      "path": "/api/cron/monitoring-crawler",
      "schedule": "0 6 * * *"
    }
  ]
}
```

---

*Letzte Aktualisierung: 25.11.2025*
