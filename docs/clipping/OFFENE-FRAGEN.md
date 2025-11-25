# Clipping-System - Offene Fragen (KORRIGIERT)

**Datum:** 25.11.2025
**Status:** Die meisten Fragen sind GEKLÄRT!

---

## Bereits geklärt (aus Code-Analyse)

### ✅ Nach welchen Kriterien wird gesucht?

**Keyword-Matching** mit Score-Berechnung:

```typescript
// Aus route.ts:353-374
function calculateMatchScore(title, content, keywords) {
  for (keyword of keywords) {
    if (title.includes(keyword)) matchedCount += 2;  // Titel: DOPPELT
    else if (content.includes(keyword)) matchedCount += 1;
  }
  return (matchedCount / (keywords.length * 2)) * 100;
}
```

**Keywords kommen aus:** `campaign.monitoringConfig.keywords`

---

### ✅ Wann ist ein Fund "sehr eindeutig"?

**Auto-Confirm Logik:**
- 2+ Quellen → immer Auto-Confirm
- 1 Quelle mit Score >= 85 → Auto-Confirm
- Sonst → MonitoringSuggestion (pending)

---

### ✅ Confidence-Berechnung

| Level | Bedingung |
|-------|-----------|
| `very_high` | 3+ Quellen UND avgScore >= 80 |
| `high` | 2+ Quellen UND avgScore >= 70 |
| `medium` | 2+ Quellen ODER avgScore >= 80 |
| `low` | Alles andere |

---

### ✅ Mindest-Scores

| Quelle | Mindest-Score |
|--------|---------------|
| RSS Feed | 50 |
| Google News | 80 |

---

### ✅ Crawling-Frequenz

**Täglich 06:00 Uhr** via Vercel Cron Job

```json
{
  "path": "/api/cron/monitoring-crawler",
  "schedule": "0 6 * * *"
}
```

---

### ✅ Monitoring-Zeitraum

**Konfigurierbar pro Kampagne:**
- `CampaignMonitoringTracker.startDate`
- `CampaignMonitoringTracker.endDate`
- Optionen: 30/90/365 Tage

---

### ✅ Spam-Filtering

**Pattern-basiert:**
- Typen: `url_domain`, `keyword_title`, `outlet_name`
- Scope: `global` oder `campaign`
- RegEx oder Simple String Match

---

### ✅ Duplicate-Detection

**URL-Normalisierung:**
- `normalizeUrl()` Funktion
- Gespeichert als `normalizedUrl` in MonitoringSuggestion
- Prüfung via `findExistingSuggestion(campaignId, normalizedUrl)`

---

### ✅ Tab-Struktur

**5 Tabs vorhanden:**
1. Analytics
2. E-Mail Performance
3. **Empfänger & Veröffentlichungen** ← Wie gewünscht
4. Clipping-Archiv
5. **Auto-Funde** ← Wie gewünscht

---

## Noch offene Fragen

### 1. Keyword-Eingabe

**Aktueller Stand:** Keywords kommen aus `campaign.monitoringConfig.keywords`

**Offene Fragen:**
- [ ] Werden Keywords beim Kampagnen-Erstellen manuell eingegeben?
- [ ] Gibt es ein UI dafür im Kampagnen-Editor?
- [ ] Oder werden Keywords automatisch aus der Pressemeldung extrahiert?

**Wo prüfen:**
- Kampagnen-Erstellungs-Modal
- `src/app/dashboard/pr/` Bereich

---

### 2. Tracker-Erstellung

**Aktueller Stand:** Der Crawler erwartet `CampaignMonitoringTracker` Einträge

**Offene Fragen:**
- [ ] Wann wird ein Tracker erstellt?
- [ ] Beim Kampagnen-Versand automatisch?
- [ ] Oder manuell aktivieren?

**Wo prüfen:**
- Kampagnen-Versand-Logic
- `campaign-monitoring-service.ts`

---

### 3. Channel-Erstellung

**Aktueller Stand:** Tracker hat `channels: MonitoringChannel[]`

**Offene Fragen:**
- [ ] Woher kommen die RSS-Feed-URLs für die Channels?
- [ ] Aus den Publikationen der Empfänger-Journalisten?
- [ ] Aus `PublicationMonitoringConfig.rssFeedUrls`?

**Wo prüfen:**
- `createTrackerForCampaign()` in campaign-monitoring-service.ts
- `buildChannelsFromRecipients()` Funktion

---

### 4. Google News Integration

**Aktueller Stand:** Der Crawler unterstützt Google News RSS

```typescript
if (channel.type === 'google_news') {
  sources = await crawlGoogleNews(channel, keywords);
}
```

**Offene Fragen:**
- [ ] Wird Google News RSS verwendet oder nur Publikations-RSS?
- [ ] Wie wird die Google News URL generiert?
- [ ] Mit welchen Keywords?

---

## Nächste Schritte

1. **Prüfen:** Kampagnen-Editor für Keyword-Eingabe
2. **Prüfen:** Tracker-Erstellung bei Kampagnen-Versand
3. **Prüfen:** Channel-Erstellung aus Empfänger-Publikationen
4. **Testen:** Manuell Crawler triggern und Logs prüfen

---

*Korrigiert am 25.11.2025*
