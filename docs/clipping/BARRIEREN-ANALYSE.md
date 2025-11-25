# Barrieren-Analyse: Monitoring End-to-End Flow

**Datum:** 25.11.2025
**Status:** Kritisch

---

## Kompletter Flow durchgespielt

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Kampagne erstellen                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ URL: /dashboard/pr-tools/campaigns/campaigns/new                            │
│                                                                             │
│ ❌ BARRIERE 1: Kein UI zum Aktivieren von Monitoring!                       │
│                                                                             │
│ Die Kampagne hat das Feld `monitoringConfig.isEnabled`, aber:               │
│ - Es gibt KEINE Checkbox/Toggle im Kampagnen-Formular                       │
│ - Es gibt KEINE Keyword-Eingabe für Kampagnen                               │
│ - Es gibt KEINE Monitoring-Period Auswahl (30/90/365 Tage)                  │
│                                                                             │
│ → Monitoring kann NIEMALS aktiviert werden!                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: E-Mail versenden                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ API: /api/pr/email/send                                                     │
│                                                                             │
│ Code (Zeile 94-101):                                                        │
│   if (campaign.monitoringConfig?.isEnabled) {                               │
│     const trackerId = await campaignMonitoringService.createTrackerForCampaign()│
│   }                                                                         │
│                                                                             │
│ ❌ BARRIERE 2: Tracker wird nie erstellt!                                   │
│                                                                             │
│ Da monitoringConfig.isEnabled IMMER undefined/false ist,                    │
│ wird der Tracker NIEMALS erstellt.                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Crawler läuft                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Cron: /api/cron/monitoring-crawler (täglich 06:00)                          │
│                                                                             │
│ Code:                                                                       │
│   const trackers = await getActiveTrackers(); // → []                       │
│                                                                             │
│ ❌ BARRIERE 3: Keine aktiven Tracker!                                       │
│                                                                             │
│ Da nie ein Tracker erstellt wurde, findet der Crawler:                      │
│ - 0 aktive Tracker                                                          │
│ - 0 RSS Feeds zum Crawlen                                                   │
│ - 0 Artikel                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4-6: Rest des Flows                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ❌ BARRIERE 4: Kompletter Flow ist blockiert!                               │
│                                                                             │
│ Da keine Artikel gefunden werden:                                           │
│ - Keine MonitoringSuggestions werden erstellt                               │
│ - Keine Auto-Funde erscheinen                                               │
│ - Keine Clippings werden generiert                                          │
│ - Dashboard + Projekt-Tab bleiben leer                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Zusammenfassung der Barrieren

| Nr | Barriere | Schwere | Beschreibung |
|----|----------|---------|--------------|
| **1** | **Kein Monitoring-UI in Kampagne** | 🔴 KRITISCH | Monitoring kann nicht aktiviert werden |
| **2** | **Tracker wird nie erstellt** | 🔴 KRITISCH | Folge von Barriere 1 |
| **3** | **Crawler findet nichts** | 🔴 KRITISCH | Folge von Barriere 2 |
| **4** | **Gesamter Flow blockiert** | 🔴 KRITISCH | Folge von Barriere 3 |

---

## Root Cause

**Die Kampagnen-Erstellung hat KEIN UI für Monitoring-Einstellungen!**

### Was existiert (aber nicht genutzt wird):

```typescript
// src/types/pr.ts - PRCampaign Interface
monitoringConfig?: {
  isEnabled: boolean;              // ← Kein UI!
  monitoringPeriod: 30 | 90 | 365; // ← Kein UI!
  keywords: string[];              // ← Kein UI!
  sources: {
    googleNews: boolean;           // ← Kein UI!
    rssFeeds: string[];            // ← Kein UI!
  };
  minMatchScore: number;           // ← Kein UI!
};
```

### Was im Kampagnen-Formular fehlt:

1. **Toggle:** "Monitoring aktivieren" ☐
2. **Select:** "Monitoring-Zeitraum" (30/90/365 Tage)
3. **Keywords:** Multi-Input für Suchbegriffe
4. **Sources:** Google News + RSS Feeds Checkboxen
5. **Score:** Min Match Score Slider

---

## Weitere Probleme

### Problem 5: Keywords kommen von KAMPAGNE, nicht von COMPANY

```typescript
// monitoring-crawler/route.ts:112
const keywords = campaign.monitoringConfig?.keywords || [];
```

**Laut Plan 02** sollten Keywords automatisch aus Company extrahiert werden:
- `company.name`
- `company.officialName`
- `company.tradingName`

**Aktuell:** Keywords müssen manuell bei der Kampagne eingegeben werden (was nicht möglich ist, siehe Barriere 1).

---

### Problem 6: Publication-Keywords werden ignoriert

```typescript
// Publications haben eigene Keywords:
publication.monitoringConfig.keywords // ← WIRD IGNORIERT!

// Nur Kampagnen-Keywords werden verwendet:
campaign.monitoringConfig?.keywords   // ← DIESE werden genutzt
```

---

## Lösung: Refactoring-Reihenfolge

### Schritt 1: Plan 03 - MonitoringControlBox

Aktiviert Monitoring auf **Projekt-Ebene** (nicht Kampagnen-Ebene):
- Default ON nach Kampagnen-Versand
- Zeitraum: 30/60/90 Tage
- Einfacher On/Off Toggle

### Schritt 2: Plan 02 - Automatische Keywords

Keywords werden automatisch aus Company extrahiert:
- Keine manuelle Eingabe nötig
- Firmenname als Pflicht-Kriterium

### Schritt 3: Crawler anpassen

Crawler nutzt:
- Projekt-Level Monitoring statt Kampagnen-Level
- Company-Keywords statt Kampagnen-Keywords
- Neue Auto-Confirm Logik

---

## Sofort-Fix (Workaround)

Falls schnell getestet werden soll:

```typescript
// Manuell in Firestore setzen:
// Collection: pr_campaigns
// Document: [campaign-id]

{
  "monitoringConfig": {
    "isEnabled": true,
    "monitoringPeriod": 30,
    "keywords": ["Firmenname", "Produktname"],
    "sources": {
      "googleNews": true,
      "rssFeeds": []
    },
    "minMatchScore": 70
  }
}
```

**ACHTUNG:** Das ist nur ein Workaround für Testing! Die UI muss implementiert werden.

---

## Fazit

**Das Monitoring-System ist technisch vollständig implementiert, aber NICHT NUTZBAR!**

Der Blocker ist das fehlende UI in der Kampagnen-Erstellung. Plan 03 (MonitoringControlBox auf Projekt-Ebene) löst dieses Problem elegant, indem Monitoring automatisch nach Kampagnen-Versand aktiviert wird.

---

*Erstellt am 25.11.2025*
