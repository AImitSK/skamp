# UI-Analyse: Clipping-System

**Datum:** 25.11.2025

---

## 1. Publikations-Modal - Monitoring Tab

**URL:** `/dashboard/library/publications` → Modal → Tab "Monitoring"

**Datei:** `src/app/dashboard/library/publications/PublicationModal/MonitoringSection.tsx`

### Felder im Modal

| Feld | Gespeichert in | Im Crawler verwendet? | Status |
|------|----------------|----------------------|--------|
| Monitoring aktivieren | `publication.monitoringConfig.isEnabled` | ✅ Ja (für Channel-Erstellung) | OK |
| Website URL | `publication.monitoringConfig.websiteUrl` | ✅ Ja (RSS-Detection) | OK |
| RSS Feed URLs | `publication.monitoringConfig.rssFeedUrls[]` | ✅ Ja (Channels) | OK |
| **Prüf-Frequenz** | `publication.monitoringConfig.checkFrequency` | ❌ **NEIN** | **PROBLEM** |
| **Keywords (optional)** | `publication.monitoringConfig.keywords[]` | ❌ **NEIN** | **PROBLEM** |

---

## PROBLEM 1: Prüf-Frequenz wird nicht verwendet

### Was der User sieht
```
Prüf-Frequenz: [Dropdown]
- Täglich
- Zweimal täglich
```

### Was tatsächlich passiert
- Der Wert wird in `publication.monitoringConfig.checkFrequency` gespeichert
- **ABER:** Der Cron-Job läuft **immer nur einmal täglich um 06:00 Uhr**
- Die `checkFrequency` wird **nirgends im Crawler ausgewertet**

### Code-Beweis
```typescript
// vercel.json - Cron läuft NUR einmal täglich
{
  "path": "/api/cron/monitoring-crawler",
  "schedule": "0 6 * * *"  // ← Einmal täglich 06:00
}

// monitoring-crawler/route.ts - checkFrequency wird nicht verwendet
// Keine Referenz auf checkFrequency im gesamten Crawler-Code
```

### Fazit
**Das Feld "Prüf-Frequenz" ist FUNKTIONSLOS.** Es täuscht dem User vor, dass er die Häufigkeit steuern kann, aber der Crawler ignoriert diese Einstellung komplett.

---

## PROBLEM 2: Keywords auf Publikations-Ebene werden nicht verwendet

### Was der User sieht
```
Keywords (optional):
[+ Keyword hinzufügen]

Optionale Filter für relevante Artikel (zusätzlich zur Kampagnen-basierten Suche)
```

### Was tatsächlich passiert
- Der User kann Keywords pro Publikation eintragen
- Diese werden in `publication.monitoringConfig.keywords[]` gespeichert
- **ABER:** Der Crawler verwendet **nur die Keywords der KAMPAGNE**

### Code-Beweis
```typescript
// monitoring-crawler/route.ts:112
const keywords = campaign.monitoringConfig?.keywords || [];
//               ^^^^^^^^
//               Nur KAMPAGNEN-Keywords, nicht Publikations-Keywords!
```

### Fazit
**Das Feld "Keywords" auf Publikations-Ebene ist FUNKTIONSLOS.** Die Keywords der Publikation werden vom Crawler komplett ignoriert. Es werden nur die Keywords der PR-Kampagne verwendet.

---

## Zusammenfassung: Publikations-Monitoring Tab

| Feld | Funktion | Realität |
|------|----------|----------|
| ✅ Monitoring aktivieren | Steuert ob Publication gemonitort wird | Funktioniert |
| ✅ Website URL | Für RSS-Auto-Detection | Funktioniert |
| ✅ RSS Feed URLs | Werden zu Channels | Funktioniert |
| ❌ **Prüf-Frequenz** | Suggeriert Frequenz-Steuerung | **Wird ignoriert** |
| ❌ **Keywords** | Suggeriert Publikations-Filter | **Wird ignoriert** |

---

## Empfehlung

### Option A: Felder entfernen
- "Prüf-Frequenz" und "Keywords" aus dem Publikations-Modal entfernen
- Diese Felder gehören auf Kampagnen-Ebene (wo sie funktionieren)

### Option B: Funktionalität implementieren
- `checkFrequency` im Crawler auswerten (zweiter Cron-Job um 18:00?)
- Publikations-Keywords mit Kampagnen-Keywords kombinieren

### Option C: UI anpassen
- Felder als "Coming Soon" / "Geplant" markieren
- Oder Tooltip: "Diese Einstellung wird in einer zukünftigen Version unterstützt"

---

## Wo Keywords tatsächlich verwendet werden

**Kampagnen-Ebene:** `campaign.monitoringConfig.keywords[]`

```
PR-Kampagne erstellen
└── Monitoring-Einstellungen
    └── Keywords: ["Firmenname", "Produktname", ...]
         ↓
    Crawler verwendet DIESE Keywords für Matching
```

---

## 2. Monitoring-Übersicht - 5 Tabs

**URL:** `/dashboard/analytics/monitoring/[campaignId]`

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx`

### Tab-Navigation

| Tab | Komponente | Status |
|-----|------------|--------|
| Analytics | `MonitoringDashboard` | ✅ OK |
| E-Mail Performance | `EmailPerformanceStats` | ✅ OK |
| Empfänger & Veröffentlichungen | `RecipientTrackingList` | ✅ OK |
| Clipping-Archiv | `ClippingArchive` | ✅ OK |
| Auto-Funde | `MonitoringSuggestionsTable` | ⚠️ Siehe unten |

---

### Tab 1: Analytics

**Datei:** `src/components/monitoring/MonitoringDashboard.tsx`

**Funktionen:**
- Gesamt-Clippings, Reichweite, AVE
- Open-Rate, Conversion-Rate aus E-Mail-Sends
- Timeline-Chart (Veröffentlichungen über Zeit)
- Media Distribution Chart (nach Outlet-Typ)
- Sentiment Chart (Positiv/Neutral/Negativ)
- Top Outlets Chart

**Status:** ✅ Funktioniert korrekt

---

### Tab 2: E-Mail Performance

**Datei:** `src/components/monitoring/EmailPerformanceStats.tsx`

**Funktionen:**
- Status-Verteilung (Pie Chart): Geklickt, Geöffnet, Zugestellt, Bounced
- E-Mail Funnel (Bar Chart): Versendet → Zugestellt → Geöffnet → Geklickt
- Metriken: Öffnungsrate, Klickrate, Engagement, Bounce-Rate

**Status:** ✅ Funktioniert korrekt

---

### Tab 3: Empfänger & Veröffentlichungen

**Datei:** `src/components/monitoring/RecipientTrackingList.tsx`

**Funktionen:**
- Liste aller E-Mail-Empfänger
- Filter: Suche + Status (Alle/Veröffentlicht/Nicht veröffentlicht)
- Status-Badges: Bounce, Fehler, Geklickt, Geöffnet, Zugestellt, Versendet
- Publish-Status: Veröffentlicht, Ausstehend, Abgelehnt
- Interaktion: Open-Count, Click-Count
- Aktionen:
  - "Als veröffentlicht markieren" → `MarkPublishedModal`
  - "Artikel ansehen" → Externe URL
  - "Bearbeiten" → `EditClippingModal`
  - "Veröffentlichung löschen"

**Status:** ✅ Funktioniert korrekt

---

### Tab 4: Clipping-Archiv

**Datei:** `src/components/monitoring/ClippingArchive.tsx`

**Funktionen:**
- Gesamtübersicht: Reichweite, AVE, Sentiment-Counts
- Tabelle aller bestätigten Clippings
- Pro Clipping: Titel, Outlet, Reichweite, AVE, Sentiment, Datum
- Aktion: "Artikel ansehen"

**Status:** ✅ Funktioniert korrekt

---

### Tab 5: Auto-Funde

**Datei:** `src/components/monitoring/MonitoringSuggestionsTable.tsx`

**Funktionen:**
- Gruppiert nach Status:
  1. **Zur Überprüfung (pending)** - Mit Aktionen
  2. **Automatisch importiert (auto_confirmed)** - Nur Info
  3. **Weitere Vorschläge** - Spam, etc.
- Pro Suggestion:
  - Artikel-Titel + Link
  - Quellen mit Match-Score (%)
  - Confidence-Badge: Niedrig/Mittel/Hoch/Sehr Hoch
  - Zeitstempel
- Aktionen: "Übernehmen" / "Spam"

**Status:** ⚠️ Relevant für Refactoring-Plan 02

**Anpassungen bei Refactoring 02:**
- Confidence-Berechnung wird geändert (Firmenname als Pflicht)
- Match-Score Berechnung wird angepasst
- Die UI-Komponente selbst bleibt kompatibel

---

## 3. Zusammenfassung aller UI-Komponenten

| Bereich | Komponente | Probleme | Refactoring-Plan |
|---------|------------|----------|------------------|
| Publication Modal | `MonitoringSection.tsx` | checkFrequency + keywords sind funktionslos | 01 |
| Monitoring Tabs | `MonitoringDashboard.tsx` | Keine | - |
| Monitoring Tabs | `EmailPerformanceStats.tsx` | Keine | - |
| Monitoring Tabs | `RecipientTrackingList.tsx` | Keine | - |
| Monitoring Tabs | `ClippingArchive.tsx` | Keine | - |
| Monitoring Tabs | `MonitoringSuggestionsTable.tsx` | Backend-Logik ändert sich | 02 (Backend) |
| Projekt Tab | `ProjectMonitoringTab.tsx` | Neue Control-Box nötig | 03 |

---

## 4. Super-Admin Panel - Monitoring & Control Center

**URL:** `/dashboard/super-admin/monitoring`

**Datei:** `src/app/dashboard/super-admin/monitoring/page.tsx`

### Struktur

```
┌─────────────────────────────────────────────────────┐
│ Monitoring & Control Center                          │
├─────────────────────────────────────────────────────┤
│ [SystemOverview]                                    │
│  - Aktive Tracker | Artikel heute | Auto-Confirmed  │
│  - Pending Review | Letzter Crawler-Run Info        │
├─────────────────────────────────────────────────────┤
│ [CrawlerControlPanel]                               │
│  - Status: Aktiv/Pausiert                           │
│  - [Pausieren] [Manuell starten (alle Orgs)]       │
├─────────────────────────────────────────────────────┤
│ [Tabs: Organizations | Channel Health | Error Logs] │
│  - OrganizationStatsTable (Crawl pro Org starten)  │
│  - ChannelHealthTable (Fehlerhafte RSS Feeds)       │
│  - ErrorLogTable (mit Detail-Modal)                 │
└─────────────────────────────────────────────────────┘
```

### Komponenten

| Komponente | Datei | Funktion |
|------------|-------|----------|
| `SystemOverview` | `src/components/admin/SystemOverview.tsx` | Stats-Karten + letzter Crawler-Run |
| `CrawlerControlPanel` | `src/components/admin/CrawlerControlPanel.tsx` | Pause/Resume/Trigger All |
| `OrganizationStatsTable` | `src/components/admin/OrganizationStatsTable.tsx` | Org-Liste + Crawl pro Org |
| `ChannelHealthTable` | `src/components/admin/ChannelHealthTable.tsx` | Fehlerhafte Channels |
| `ErrorLogTable` | `src/components/admin/ErrorLogTable.tsx` | Error Logs mit Details |

### API Endpoints

| Endpoint | Datei | Funktion |
|----------|-------|----------|
| `GET /api/admin/monitoring-stats` | `src/app/api/admin/monitoring-stats/route.ts` | System + Org Stats |
| `GET /api/admin/crawler-status` | `src/app/api/admin/crawler-status/route.ts` | Cron Job Status |
| `POST /api/admin/crawler-control` | `src/app/api/admin/crawler-control/route.ts` | Pause/Resume/Trigger |

### Aktionen

| Aktion | Beschreibung |
|--------|-------------|
| Pausieren | Cron Job deaktivieren (mit Grund) |
| Aktivieren | Cron Job reaktivieren |
| Manuell starten (alle Orgs) | Crawler sofort für alle Organizations triggern |
| Crawl starten (pro Org) | Crawler für einzelne Organization triggern |

### Status

✅ **Funktioniert korrekt**

⚠️ **PROBLEM: Fehlende Auth-Prüfung**

```typescript
// Alle 3 Admin-APIs haben diesen TODO:
// TODO: Implement proper auth check
function isSuperAdmin(userId: string): boolean {
  // Temporär: Alle erlaubt
  return true;  // ← SICHERHEITSPROBLEM!
}
```

**Empfehlung:** Super-Admin Berechtigung implementieren bevor Produktiv-Release.

---

## 5. Zusammenfassung aller UI-Komponenten

| Bereich | Komponente | Probleme | Refactoring-Plan |
|---------|------------|----------|------------------|
| Publication Modal | `MonitoringSection.tsx` | checkFrequency + keywords funktionslos | 01 |
| Monitoring Tabs | `MonitoringDashboard.tsx` | Keine | - |
| Monitoring Tabs | `EmailPerformanceStats.tsx` | Keine | - |
| Monitoring Tabs | `RecipientTrackingList.tsx` | Keine | - |
| Monitoring Tabs | `ClippingArchive.tsx` | Keine | - |
| Monitoring Tabs | `MonitoringSuggestionsTable.tsx` | Backend-Logik ändert sich | 02 (Backend) |
| Projekt Tab | `ProjectMonitoringTab.tsx` | Neue Control-Box nötig | 03 |
| Super-Admin | Alle Admin-Komponenten | Auth fehlt (TODO) | - (Sicherheit) |

---

## 6. Dashboard Widget - PR-Monitoring

**URL:** `/dashboard` (Haupt-Dashboard)

**Datei:** `src/app/dashboard/page.tsx` (Zeilen 763-1001)

### Funktionen

- Filter-Tabs: "Veröffentlichungen" / "Auto-Funde"
- Zeigt Clippings und Pending Suggestions organisationsweit
- Tabelle mit: Typ-Icon, Titel (Link), Medium, Status/Sentiment
- Pagination (5 pro Seite)
- "Bestätigen"-Button für Auto-Funde

### Status

✅ **Funktioniert korrekt**

Keine Änderungen nötig - zeigt nur aggregierte Daten an.

---

## 7. Projekt-Monitoring Tab

**URL:** `/dashboard/projects/[id]` → Tab "Monitoring"

**Datei:** `src/components/projects/ProjectMonitoringTab.tsx`

### Struktur

```
┌─────────────────────────────────────────────────────┐
│ ProjectMonitoringTab                                │
├─────────────────────────────────────────────────────┤
│ Views: overview | recipients | clippings            │
│                                                     │
│ [ProjectMonitoringOverview]                        │
│  - Stats: Veröffentlichungen, Zu prüfen, Ø Reach   │
│  - Charts: Status-Verteilung, Top Medien, Timeline │
│  - Pending Auto-Funde Liste                         │
│  - Letzte Veröffentlichungen                        │
│  - Empfänger-Performance                            │
├─────────────────────────────────────────────────────┤
│ [RecipientTrackingList] (wenn view='recipients')   │
│ [ClippingArchive] (wenn view='clippings')          │
└─────────────────────────────────────────────────────┘
```

### Komponenten

| Komponente | Datei | Funktion |
|------------|-------|----------|
| `ProjectMonitoringTab` | `src/components/projects/ProjectMonitoringTab.tsx` | Container mit View-Toggle |
| `ProjectMonitoringOverview` | `src/components/projects/monitoring/ProjectMonitoringOverview.tsx` | Haupt-Dashboard (577 Zeilen) |
| `MonitoringStatusWidget` | `src/components/projects/monitoring/MonitoringStatusWidget.tsx` | Status-Widget (nicht verwendet!) |

### Status

✅ **Funktioniert grundsätzlich korrekt**

⚠️ **Fehlend für Refactoring-Plan 03:**
- Keine MonitoringControlBox vorhanden
- Kein Monitoring-Zeitraum-Management (30/60/90 Tage)
- Kein On/Off Toggle für Monitoring

**Hinweis:** `MonitoringStatusWidget.tsx` existiert, wird aber **nicht verwendet**. Hat bereits Start/Pause/Stop-Buttons, aber keine Integration.

---

## 8. Zusammenfassung aller UI-Komponenten (Vollständig)

| Bereich | Komponente | Probleme | Refactoring-Plan |
|---------|------------|----------|------------------|
| Publication Modal | `MonitoringSection.tsx` | checkFrequency + keywords funktionslos | 01 |
| Monitoring Tabs | `MonitoringDashboard.tsx` | Keine | - |
| Monitoring Tabs | `EmailPerformanceStats.tsx` | Keine | - |
| Monitoring Tabs | `RecipientTrackingList.tsx` | Keine | - |
| Monitoring Tabs | `ClippingArchive.tsx` | Keine | - |
| Monitoring Tabs | `MonitoringSuggestionsTable.tsx` | Backend-Logik ändert sich | 02 (Backend) |
| Projekt Tab | `ProjectMonitoringTab.tsx` | Control-Box fehlt | 03 |
| Projekt Tab | `ProjectMonitoringOverview.tsx` | Control-Box fehlt | 03 |
| Projekt Tab | `MonitoringStatusWidget.tsx` | Existiert aber ungenutzt | 03 (evtl. nutzen) |
| Dashboard | `page.tsx` (PR-Monitoring) | Keine | - |
| Super-Admin | Alle Admin-Komponenten | Auth fehlt (TODO) | 04 (Sicherheit) |

---

*Analyse vom 25.11.2025*
*Erweitert am 25.11.2025 - Monitoring-Übersicht Tabs hinzugefügt*
*Erweitert am 25.11.2025 - Super-Admin Panel hinzugefügt*
*Erweitert am 25.11.2025 - Dashboard Widget + Projekt Tab hinzugefügt*
