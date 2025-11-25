# Clipping-System - Soll-Ist-Vergleich (KORRIGIERT)

**Datum:** 25.11.2025
**Status:** System ist weitgehend implementiert!

---

## Soll-Zustand (Gewünschte Funktionalität)

```
1. Publikationen mit RSS-Feeds hinterlegen
2. Journalisten den Publikationen zuordnen
3. Massen-Mail an Journalisten versenden
4. Tab "Empfänger & Veröffentlichungen" zeigt Monitoring-Liste
5. RSS-Feeds crawlen für bestimmten Zeitraum
6. Sehr eindeutige Funde → Automatisch eingepflegt
7. Unsichere Funde → Tab "Auto-Funde" zur manuellen Überprüfung
```

---

## Detailvergleich (KORRIGIERT)

### 1. Publikationen mit RSS-Feeds

| Soll | Ist | Status |
|------|-----|--------|
| RSS-Feeds hinterlegen | `PublicationMonitoringConfig.rssFeedUrls[]` | ✅ **VORHANDEN** |

**Dateien:**
- `src/types/library.ts` - PublicationMonitoringConfig
- `src/app/dashboard/library/publications/` - UI zum Bearbeiten

---

### 2. Journalisten → Publikationen Zuordnung

| Soll | Ist | Status |
|------|-----|--------|
| Journalisten Publikationen zuordnen | `publication-matcher.ts` mit `handleRecipientLookup()` | ✅ **VORHANDEN** |

**Dateien:**
- `src/lib/firebase/publication-matcher.ts`
- `src/app/dashboard/contacts/crm/contacts/`

---

### 3. Massen-Mail Versand

| Soll | Ist | Status |
|------|-----|--------|
| Massen-Mail an Journalisten | PR-Kampagnen-System mit Email-Sends | ✅ **VORHANDEN** |

---

### 4. Tab "Empfänger & Veröffentlichungen"

| Soll | Ist | Status |
|------|-----|--------|
| Tab mit Monitoring-Liste | Tab `recipients` mit Label "Empfänger & Veröffentlichungen" | ✅ **VORHANDEN** |

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/components/TabNavigation.tsx`

```typescript
const tabs: Tab[] = [
  { id: 'dashboard', label: 'Analytics', ... },
  { id: 'performance', label: 'E-Mail Performance', ... },
  { id: 'recipients', label: 'Empfänger & Veröffentlichungen', ... },  // ← HIER
  { id: 'clippings', label: 'Clipping-Archiv', ... },
  { id: 'suggestions', label: 'Auto-Funde', ... },
];
```

---

### 5. RSS-Crawler

| Soll | Ist | Status |
|------|-----|--------|
| RSS-Feeds crawlen | Vercel Cron Job täglich 06:00 Uhr | ✅ **VORHANDEN** |
| Für bestimmten Zeitraum | `CampaignMonitoringTracker.endDate` (30/90/365 Tage) | ✅ **VORHANDEN** |
| Nur Magazine mit RSS-Feed | `channel.type === 'rss_feed'` Filter | ✅ **VORHANDEN** |

**Dateien:**
- `vercel.json` - Cron-Konfiguration (Zeile 32-34)
- `src/app/api/cron/monitoring-crawler/route.ts` - Crawler-Logik (404 Zeilen!)
- `src/lib/firebase-admin/monitoring-crawler-service.ts` - Admin SDK Service (507 Zeilen!)

**Vercel Cron Config:**
```json
{
  "path": "/api/cron/monitoring-crawler",
  "schedule": "0 6 * * *"
}
```

**Crawler nutzt:**
- `rss-parser` Bibliothek zum Parsen
- Keywords aus `campaign.monitoringConfig.keywords`
- Match-Score Berechnung (Titel zählt doppelt)

---

### 6. Auto-Confirm (Eindeutiger Fund)

| Soll | Ist | Status |
|------|-----|--------|
| Sehr eindeutig → automatisch eingepflegt | `shouldAutoConfirmSuggestion()` | ✅ **VORHANDEN** |

**Auto-Confirm Logik** (monitoring-crawler-service.ts:491-506):
```typescript
function shouldAutoConfirmSuggestion(
  sourceCount: number,
  avgScore: number,
  highestScore: number,
  minMatchScore: number
): boolean {
  // 2+ Quellen = Auto-Confirm
  if (sourceCount >= 2) return true;

  // 1 Quelle aber sehr hoher Score (>=85)
  if (sourceCount === 1 && highestScore >= 85 && highestScore >= minMatchScore) {
    return true;
  }

  return false;
}
```

**Confidence-Levels:**
- `very_high`: 3+ Quellen UND avgScore >= 80
- `high`: 2+ Quellen UND avgScore >= 70
- `medium`: 2+ Quellen ODER avgScore >= 80
- `low`: Alles andere

---

### 7. Tab "Auto-Funde"

| Soll | Ist | Status |
|------|-----|--------|
| Tab für unsichere Treffer | Tab `suggestions` mit Label "Auto-Funde" | ✅ **VORHANDEN** |
| Manuelle Überprüfung | `MonitoringSuggestionsTable` mit Confirm/Reject | ✅ **VORHANDEN** |

**Datei:** `src/components/monitoring/MonitoringSuggestionsTable.tsx`

---

## Suchkriterien (DEFINIERT!)

Die Suchkriterien sind implementiert:

### Keyword-Matching (route.ts:353-374)

```typescript
function calculateMatchScore(title: string, content: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;

  let matchedCount = 0;

  for (const keyword of keywords) {
    if (titleLower.includes(keywordLower)) {
      matchedCount += 2; // Titel-Match zählt DOPPELT
    } else if (contentLower.includes(keywordLower)) {
      matchedCount += 1;
    }
  }

  // Score: (matched / total) * 100
  const score = (matchedCount / (keywords.length * 2)) * 100;
  return Math.min(score, 100);
}
```

### Mindest-Scores

| Quelle | Mindest-Score |
|--------|---------------|
| RSS Feed | 50 |
| Google News | 80 |

### Keywords kommen aus

```typescript
const keywords = campaign.monitoringConfig?.keywords || [];
const minMatchScore = campaign.monitoringConfig?.minMatchScore || 70;
```

---

## Zusammenfassung (KORRIGIERT)

| Bereich | Soll | Ist | Status |
|---------|------|-----|--------|
| RSS-Feeds in Publikationen | ✅ | ✅ | **OK** |
| Journalisten-Zuordnung | ✅ | ✅ | **OK** |
| Massen-Mail | ✅ | ✅ | **OK** |
| Tab "Empfänger & Veröffentlichungen" | ✅ | ✅ | **OK** |
| RSS-Crawler | ✅ | ✅ | **OK** |
| Auto-Confirm (eindeutiger Fund) | ✅ | ✅ | **OK** |
| Tab "Auto-Funde" | ✅ | ✅ | **OK** |
| Suchkriterien definiert | ✅ | ✅ | **OK** |

---

## Offene Frage

Die einzige wirklich offene Frage ist:

**Woher kommen die Keywords für das Matching?**

Aktuell: `campaign.monitoringConfig.keywords`

Das bedeutet:
- Keywords müssen pro Kampagne manuell definiert werden
- ODER automatisch aus der Pressemeldung extrahiert werden (nicht implementiert)

**Mögliche Verbesserung:**
- Keywords automatisch aus Pressemeldungs-Titel/Text extrahieren
- Firmenname aus Organisation automatisch hinzufügen
- NLP/AI für bessere Keyword-Extraktion

---

## Crawler-Ablauf (Zusammenfassung)

```
06:00 Uhr Vercel Cron Job startet
           │
           ▼
    ┌──────────────────┐
    │ Feature Flag     │
    │ Check (enabled?) │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Abgelaufene      │
    │ Tracker          │
    │ deaktivieren     │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Aktive Tracker   │
    │ laden            │
    └────────┬─────────┘
             │
             ▼
    Für jeden Tracker:
    ┌──────────────────┐
    │ Kampagne laden   │
    │ → Keywords       │
    └────────┬─────────┘
             │
             ▼
    Für jeden aktiven Channel:
    ┌──────────────────┐
    │ RSS/Google News  │
    │ Feed parsen      │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Keyword-Matching │
    │ Score berechnen  │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Spam-Check       │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Duplicate-Check  │
    │ (normalizedUrl)  │
    └────────┬─────────┘
             │
       Score >= 50?
       ┌─────┴─────┐
       │           │
       ▼           ▼
    ┌──────┐   ┌──────────────┐
    │ NEIN │   │ JA           │
    │ Skip │   │ Suggestion   │
    └──────┘   │ erstellen    │
               └──────┬───────┘
                      │
              Auto-Confirm?
              (2+ Quellen ODER
               Score >= 85)
              ┌─────┴─────┐
              │           │
              ▼           ▼
    ┌──────────────┐   ┌──────────────┐
    │ JA           │   │ NEIN         │
    │ → Clipping   │   │ → Suggestion │
    │ erstellen    │   │ (pending)    │
    │ → Channel    │   └──────────────┘
    │ deaktivieren │
    └──────────────┘
```

---

*Korrigiert am 25.11.2025 - System ist weitgehend implementiert!*
