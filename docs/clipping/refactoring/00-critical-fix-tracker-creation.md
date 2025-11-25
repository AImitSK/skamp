# Refactoring-Plan 00: CRITICAL FIX - Tracker-Erstellung

**Datum:** 25.11.2025
**Status:** KRITISCH - Muss ZUERST implementiert werden
**Priorität:** BLOCKER
**Abhängigkeit:** Keine (ist die Basis für alle anderen Pläne)

> ⚠️ **WICHTIG:** Dieser Plan muss VOR allen anderen Plänen implementiert werden!
> Ohne diesen Fix funktioniert das gesamte Monitoring-System nicht.

---

## Problem

Der komplette Monitoring-Flow ist **BLOCKIERT** weil der Tracker nie erstellt wird!

### Root Cause

```typescript
// src/app/api/pr/email/send/route.ts (Zeile 94)
if (campaign.monitoringConfig?.isEnabled) {  // ← IMMER false/undefined!
  const trackerId = await campaignMonitoringService.createTrackerForCampaign(...)
}
```

**Problem:** `campaign.monitoringConfig.isEnabled` ist IMMER `undefined` weil:
1. Es gibt KEIN UI zum Setzen dieses Wertes
2. Die Kampagnen-Erstellung speichert dieses Feld nicht

---

## Lösung

**Monitoring IMMER aktivieren wenn Projekt-Kampagne versendet wird.**

Keine Checkbox, keine Einstellungen - einfach automatisch ON.

### Warum?

1. **Jede PR-Kampagne sollte gemonitort werden** - das ist der Sinn der Software
2. **Kein zusätzlicher Setup-Aufwand** für User
3. **Plan 03** gibt später die Kontrolle (On/Off, Verlängern)

---

## Änderungen

### 1. E-Mail-Send Route anpassen

**Datei:** `src/app/api/pr/email/send/route.ts`

```typescript
// VORHER (Zeile 91-105):
// 5. MONITORING: Erstelle Campaign-Monitoring-Tracker (falls aktiviert)
try {
  const campaign = preparedData.campaign;
  if (campaign.monitoringConfig?.isEnabled) {  // ← PROBLEM!
    const { campaignMonitoringService } = await import('@/lib/firebase/campaign-monitoring-service');
    const trackerId = await campaignMonitoringService.createTrackerForCampaign(
      campaignId,
      organizationId
    );
    console.log(`✅ Monitoring Tracker created: ${trackerId}`);
  }
} catch (monitoringError) {
  console.error('⚠️ Fehler beim Erstellen des Monitoring Trackers:', monitoringError);
}

// NACHHER:
// 5. MONITORING: Erstelle Campaign-Monitoring-Tracker (IMMER für Projekt-Kampagnen)
try {
  const campaign = preparedData.campaign;

  // 🆕 Prüfe ob Kampagne zu einem Projekt gehört ODER Monitoring explizit aktiviert
  const shouldCreateTracker =
    campaign.projectId ||                          // Projekt-Kampagne → immer monitoren
    campaign.monitoringConfig?.isEnabled === true; // Oder explizit aktiviert

  if (shouldCreateTracker) {
    const { campaignMonitoringService } = await import('@/lib/firebase/campaign-monitoring-service');

    // 🆕 Setze monitoringConfig falls nicht vorhanden (für Projekt-Kampagnen)
    if (!campaign.monitoringConfig?.isEnabled && campaign.projectId) {
      await prService.update(campaignId, {
        monitoringConfig: {
          isEnabled: true,
          monitoringPeriod: 30,
          keywords: [],  // Werden später aus Company extrahiert (Plan 02)
          sources: { googleNews: true, rssFeeds: [] },
          minMatchScore: 70
        }
      });
    }

    const trackerId = await campaignMonitoringService.createTrackerForCampaign(
      campaignId,
      organizationId
    );
    console.log(`✅ Monitoring Tracker created: ${trackerId}`);
  }
} catch (monitoringError) {
  console.error('⚠️ Fehler beim Erstellen des Monitoring Trackers:', monitoringError);
  // Nicht blockierend - Email wurde bereits erfolgreich versendet
}
```

### 2. Cron-Route anpassen (gleiche Logik)

**Datei:** `src/app/api/pr/email/cron/route.ts`

```typescript
// VORHER (ca. Zeile 152):
if (campaign.monitoringConfig?.isEnabled) {
  // ...
}

// NACHHER:
const shouldCreateTracker =
  campaign.projectId ||
  campaign.monitoringConfig?.isEnabled === true;

if (shouldCreateTracker) {
  // 🆕 Setze monitoringConfig falls nicht vorhanden
  if (!campaign.monitoringConfig?.isEnabled && campaign.projectId) {
    await prService.update(campaignId, {
      monitoringConfig: {
        isEnabled: true,
        monitoringPeriod: 30,
        keywords: [],
        sources: { googleNews: true, rssFeeds: [] },
        minMatchScore: 70
      }
    });
  }

  // Erstelle Tracker...
}
```

### 3. campaign-monitoring-service.ts anpassen

**Datei:** `src/lib/firebase/campaign-monitoring-service.ts`

```typescript
// VORHER (Zeile 58):
if (!campaign.monitoringConfig?.isEnabled) {
  throw new Error('Monitoring not enabled for campaign');
}

// NACHHER:
// 🆕 Erlaube Tracker-Erstellung auch ohne explizites isEnabled (für Projekt-Kampagnen)
if (!campaign.monitoringConfig?.isEnabled && !campaign.projectId) {
  throw new Error('Monitoring not enabled for campaign');
}

// 🆕 Fallback-Config wenn keine vorhanden
const monitoringConfig = campaign.monitoringConfig || {
  isEnabled: true,
  monitoringPeriod: 30,
  keywords: [],
  sources: { googleNews: true, rssFeeds: [] },
  minMatchScore: 70
};
```

### 4. Keywords aus Company extrahieren (Vorbereitung für Plan 02)

**Datei:** `src/lib/firebase/campaign-monitoring-service.ts`

```typescript
// In buildGoogleNewsChannel() - VORHER:
private buildGoogleNewsChannel(campaign: PRCampaign): MonitoringChannel | null {
  if (!campaign.monitoringConfig?.isEnabled) return null;

  const keywords = campaign.monitoringConfig.keywords || [];
  if (keywords.length === 0) return null;
  // ...
}

// NACHHER:
private async buildGoogleNewsChannel(
  campaign: PRCampaign,
  organizationId: string
): Promise<MonitoringChannel | null> {
  // 🆕 Keywords-Fallback: Aus Company extrahieren wenn keine vorhanden
  let keywords = campaign.monitoringConfig?.keywords || [];

  if (keywords.length === 0 && campaign.clientId) {
    // Lade Company und extrahiere Keywords
    const company = await this.getCompany(campaign.clientId, organizationId);
    if (company) {
      keywords = this.extractKeywordsFromCompany(company);
      console.log(`📝 Extracted ${keywords.length} keywords from company: ${keywords.join(', ')}`);
    }
  }

  if (keywords.length === 0) {
    console.log('⚠️ No keywords available for Google News channel');
    return null;
  }

  // Baue Google News RSS URL
  const query = keywords.join(' OR ');  // 🆕 OR statt Leerzeichen für bessere Ergebnisse
  const encodedQuery = encodeURIComponent(query);
  const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=de&gl=DE&ceid=DE:de`;

  return {
    id: `google_news_${campaign.id}`,
    type: 'google_news',
    publicationId: undefined,
    publicationName: 'Google News',
    url: googleNewsUrl,
    isActive: true,
    wasFound: false,
    articlesFound: 0,
    errorCount: 0
  };
}

// 🆕 NEU: Company laden
private async getCompany(
  companyId: string,
  organizationId: string
): Promise<Company | null> {
  try {
    const companyDoc = await getDoc(
      doc(db, 'companies', companyId)
    );

    if (!companyDoc.exists()) return null;

    const data = companyDoc.data();
    if (data.organizationId !== organizationId) return null;

    return data as Company;
  } catch (error) {
    console.error('Error loading company:', error);
    return null;
  }
}

// 🆕 NEU: Keywords aus Company extrahieren
private extractKeywordsFromCompany(company: Company): string[] {
  const keywords: string[] = [];
  const legalForms = ['GmbH', 'AG', 'KG', 'OHG', 'GbR', 'UG', 'e.V.', 'eG', 'Ltd.', 'Inc.', 'LLC', 'Corp.', 'SE', 'S.A.', 'B.V.', 'PLC'];

  const removeLegalForm = (name: string): string => {
    let cleaned = name;
    for (const form of legalForms) {
      cleaned = cleaned.replace(new RegExp(`\\s*${form}\\.?\\s*$`, 'i'), '').trim();
    }
    return cleaned;
  };

  // 1. name (Pflicht)
  if (company.name) {
    keywords.push(company.name);
    const withoutLegal = removeLegalForm(company.name);
    if (withoutLegal !== company.name) {
      keywords.push(withoutLegal);
    }
  }

  // 2. officialName (falls vorhanden und anders als name)
  if (company.officialName && company.officialName !== company.name) {
    keywords.push(company.officialName);
    const withoutLegal = removeLegalForm(company.officialName);
    if (withoutLegal !== company.officialName && !keywords.includes(withoutLegal)) {
      keywords.push(withoutLegal);
    }
  }

  // 3. tradingName (falls vorhanden)
  if (company.tradingName && !keywords.includes(company.tradingName)) {
    keywords.push(company.tradingName);
  }

  // Deduplizieren
  return [...new Set(keywords)];
}
```

---

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/app/api/pr/email/send/route.ts` | Tracker erstellen wenn `projectId` vorhanden |
| `src/app/api/pr/email/cron/route.ts` | Gleiche Logik wie send/route.ts |
| `src/lib/firebase/campaign-monitoring-service.ts` | Fallback für monitoringConfig + Keywords aus Company |

---

## Ablauf nach dem Fix

```
Kampagne wird versendet (hat projectId)
         │
         ▼
┌────────────────────────────────────────────┐
│ Email-Send Route prüft:                    │
│ campaign.projectId? → JA                   │
│                                            │
│ → Setze monitoringConfig automatisch       │
│ → Erstelle Tracker                         │
│ → Extrahiere Keywords aus Company          │
│ → Erstelle RSS + Google News Channels      │
└────────────────────────────────────────────┘
         │
         ▼
Crawler findet aktiven Tracker (06:00 Uhr)
         │
         ▼
Artikel werden gefunden und als Auto-Funde gespeichert
         │
         ▼
UI zeigt Auto-Funde + Clippings
```

---

## Checkliste

- [ ] `send/route.ts`: Tracker-Erstellung für Projekt-Kampagnen
- [ ] `cron/route.ts`: Gleiche Logik
- [ ] `campaign-monitoring-service.ts`: Fallback für monitoringConfig
- [ ] `campaign-monitoring-service.ts`: Keywords aus Company extrahieren
- [ ] Testen: Kampagne versenden → Tracker prüfen
- [ ] Testen: Crawler manuell triggern → Artikel prüfen
- [ ] Testen: UI zeigt Auto-Funde

---

## Risiko-Bewertung

| Risiko | Bewertung | Grund |
|--------|-----------|-------|
| Breaking Changes | Niedrig | Erweitert nur bestehende Logik |
| Unerwünschtes Monitoring | Niedrig | Nur für Projekt-Kampagnen |
| Performance | Niedrig | Ein zusätzlicher Company-Lookup |

---

## Beziehung zu anderen Plänen

| Plan | Status nach diesem Fix |
|------|------------------------|
| 01 - Publikations-Modal | Unverändert (unabhängig) |
| 02 - Automatische Keywords | **Wird danach implementiert** (Crawler-Logik) |
| 03 - MonitoringControlBox | **Kann jetzt funktionieren** (Tracker existiert) |
| 04 - Super-Admin Auth | Unverändert (unabhängig) |
| 05 - Test-Tools | Unverändert (unabhängig) |

---

## Wichtig: Reihenfolge

```
1. Plan 00 (dieser) ← ZUERST!
2. Plan 02 (Keyword-Extraktion + Crawler-Logik)
3. Plan 03 (MonitoringControlBox)
4. Plan 01 (UI Cleanup - Publikations-Modal)
5. Plan 04 (Security - Super-Admin Auth)
6. Plan 05 (Test-Tools)
```

**Ohne Plan 00 funktioniert NICHTS!**

---

*Erstellt am 25.11.2025*
