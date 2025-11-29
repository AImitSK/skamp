# PDF-Report: Medientyp-Verteilung Label-Verbesserung

**Datum:** 2025-01-29
**Status:** 🟡 Planung
**Bereich:** Monitoring PDF-Report, Report-Templates
**Bezug:** `analytics-media-distribution-labels.md`, `monitoring-types-refactoring.md`

---

## 🎯 Zielsetzung

Die **Medientyp-Verteilung** im PDF-Report soll **benutzerfreundliche Labels** mit Emojis anzeigen statt rohe `outletType`-Werte.

**Ziel:**
- ✅ `'print'` → `📰 Print`
- ✅ `'online'` → `💻 Online`
- ✅ `'broadcast'` → `📺 Broadcast`
- ✅ `'audio'` → `🎧 Audio`
- ⚠️ `'blog'` → `💻 Blog (veraltet)` (temporär für Migration)

---

## 📍 Wo wird der PDF-Report generiert?

**User Flow:**
1. User öffnet Monitoring-Detailseite: `/dashboard/analytics/monitoring/[campaignId]`
2. User klickt Button "PDF-Report"
3. Service sammelt Clipping-Daten
4. HTML-Template wird generiert
5. PDF wird via Puppeteer erstellt
6. PDF wird hochgeladen und im Browser geöffnet

**Komponenten-Hierarchie:**
1. `PDFExportButton.tsx` → Trigger
2. `useMonitoringReport.ts` → React Query Hook
3. `monitoring-report-service.ts` → Service-Wrapper
4. `stats-calculator.ts` → Statistiken berechnen
5. `report-template.ts` → **HTML generieren (HIER ist das Problem)**
6. `pdf-generator.ts` → PDF erstellen

---

## ❌ Aktuelles Problem

### **Problem: Rohe outletType-Werte in PDF-Tabelle**

**Datei:** `src/lib/monitoring-report/templates/report-template.ts`
**Funktion:** `generateOutletTypeDistribution()`
**Zeile:** 254-285

**IST:**
```typescript
function generateOutletTypeDistribution(reportData: MonitoringReportData): string {
  if (reportData.clippingStats.outletTypeDistribution.length === 0) {
    return '';
  }

  return `
  <!-- MEDIENTYP-VERTEILUNG -->
  <div class="section">
    <h2 class="section-title">Medientyp-Verteilung</h2>
    <table>
      <thead>
        <tr>
          <th>Medientyp</th>
          <th>Anzahl</th>
          <th>Reichweite</th>
          <th>Anteil</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.clippingStats.outletTypeDistribution.map(type => `
        <tr>
          <td><strong>${type.type}</strong></td>  <!-- ❌ PROBLEM -->
          <td>${type.count}</td>
          <td>${type.reach.toLocaleString('de-DE')}</td>
          <td>${type.percentage}%</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  `;
}
```

**Ausgabe im PDF:**
```
┌──────────────┬────────┬──────────────┬────────┐
│ Medientyp    │ Anzahl │ Reichweite   │ Anteil │
├──────────────┼────────┼──────────────┼────────┤
│ print        │ 5      │ 250.000      │ 25%    │
│ online       │ 12     │ 1.800.000    │ 60%    │
│ blog         │ 2      │ 50.000       │ 10%    │
│ broadcast    │ 1      │ 800.000      │ 5%     │
└──────────────┴────────┴──────────────┴────────┘
```

**Probleme:**
- ❌ Keine Emojis/Icons
- ❌ Englische Keys statt deutsche Labels
- ❌ `blog` wird angezeigt (sollte `audio` sein)
- ❌ Nicht benutzerfreundlich

---

## ✅ SOLL-Zustand

### **PDF-Tabelle:**
```
┌──────────────────┬────────┬──────────────┬────────┐
│ Medientyp        │ Anzahl │ Reichweite   │ Anteil │
├──────────────────┼────────┼──────────────┼────────┤
│ 📰 Print         │ 5      │ 250.000      │ 25%    │
│ 💻 Online        │ 12     │ 1.800.000    │ 60%    │
│ 🎧 Audio         │ 2      │ 50.000       │ 10%    │
│ 📺 Broadcast     │ 1      │ 800.000      │ 5%     │
└──────────────────┴────────┴──────────────┴────────┘
```

---

## 💡 Lösungsansatz

### **Helper-Funktion im Template**

**Prinzip:** Eine kleine Mapping-Funktion am Anfang der Template-Datei

```typescript
/**
 * Mappt outletType zu lesbarem Label mit Emoji
 */
function getOutletTypeLabel(outletType: string): string {
  switch (outletType.toLowerCase()) {
    case 'print':
      return '📰 Print';
    case 'online':
      return '💻 Online';
    case 'broadcast':
      return '📺 Broadcast';
    case 'audio':
      return '🎧 Audio';
    case 'blog':
      // Temporär für Migration
      return '💻 Blog (veraltet)';
    default:
      // Fallback: Unbekannte Types anzeigen wie sie sind
      return outletType;
  }
}
```

**Vorteile:**
- ✅ Einfach zu implementieren (1 Funktion + 1 Zeile ändern)
- ✅ Konsistent mit Analytics-Dashboard
- ✅ Emojis funktionieren in PDF (UTF-8 Support)
- ✅ Fallback für unbekannte Types

---

## 🔧 Implementierungsplan

### **Phase 1: Helper-Funktion hinzufügen**

**Datei:** `src/lib/monitoring-report/templates/report-template.ts`

**Position:** Am Anfang der Datei, NACH den Imports, VOR `generateReportHTML()`

**Zeile:** Nach Zeile 2 (nach Imports)

**Code:**
```typescript
import type { MonitoringReportData } from '../types';
import { generateCSS } from './styles';

/**
 * Mappt outletType zu lesbarem Label mit Emoji
 *
 * @param outletType - Der rohe outletType aus MediaClipping ('print', 'online', etc.)
 * @returns Formatiertes Label mit Emoji (z.B. '📰 Print')
 */
function getOutletTypeLabel(outletType: string): string {
  switch (outletType.toLowerCase()) {
    case 'print':
      return '📰 Print';
    case 'online':
      return '💻 Online';
    case 'broadcast':
      return '📺 Broadcast';
    case 'audio':
      return '🎧 Audio';
    case 'blog':
      // Temporär für Migration - blog-Clippings sollten zu 'online' migriert werden
      return '💻 Blog (veraltet)';
    default:
      // Fallback: Unbekannte Types anzeigen wie sie sind
      return outletType;
  }
}

/**
 * Generiert vollständiges HTML für PDF-Report
 * ...
 */
export function generateReportHTML(reportData: MonitoringReportData): string {
  // ...
}
```

---

### **Phase 2: Template anpassen**

**Datei:** `src/lib/monitoring-report/templates/report-template.ts`
**Funktion:** `generateOutletTypeDistribution()`
**Zeile:** 275

**VORHER:**
```typescript
${reportData.clippingStats.outletTypeDistribution.map(type => `
<tr>
  <td><strong>${type.type}</strong></td>
  <td>${type.count}</td>
  <td>${type.reach.toLocaleString('de-DE')}</td>
  <td>${type.percentage}%</td>
</tr>
`).join('')}
```

**NACHHER:**
```typescript
${reportData.clippingStats.outletTypeDistribution.map(type => `
<tr>
  <td><strong>${getOutletTypeLabel(type.type)}</strong></td>
  <td>${type.count}</td>
  <td>${type.reach.toLocaleString('de-DE')}</td>
  <td>${type.percentage}%</td>
</tr>
`).join('')}
```

**Änderung:** Zeile 275: `${type.type}` → `${getOutletTypeLabel(type.type)}`

---

## 📊 Code-Beispiel (Vollständig)

### **Komplette Funktion nach Änderung:**

```typescript
/**
 * Generiert Medientyp-Verteilung Tabelle
 */
function generateOutletTypeDistribution(reportData: MonitoringReportData): string {
  if (reportData.clippingStats.outletTypeDistribution.length === 0) {
    return '';
  }

  return `
  <!-- MEDIENTYP-VERTEILUNG -->
  <div class="section">
    <h2 class="section-title">Medientyp-Verteilung</h2>
    <table>
      <thead>
        <tr>
          <th>Medientyp</th>
          <th>Anzahl</th>
          <th>Reichweite</th>
          <th>Anteil</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.clippingStats.outletTypeDistribution.map(type => `
        <tr>
          <td><strong>${getOutletTypeLabel(type.type)}</strong></td>
          <td>${type.count}</td>
          <td>${type.reach.toLocaleString('de-DE')}</td>
          <td>${type.percentage}%</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  `;
}
```

---

## 📊 Betroffene Dateien

| Datei | Änderungen | Zeilen | Aufwand |
|-------|-----------|--------|---------|
| `src/lib/monitoring-report/templates/report-template.ts` | Helper-Funktion + Template-Anpassung | Neu (4-30), 275 | 5 Min |

**Gesamt:** ~5 Minuten

---

## 🎯 Implementierungs-Schritte

### **Phase 1: Helper-Funktion** ✅ Priorität 1
- [ ] `getOutletTypeLabel()` Funktion hinzufügen (nach Zeile 2)
- [ ] JSDoc-Kommentar hinzufügen
- [ ] Alle 5 outletTypes mappen (print, online, broadcast, audio, blog)
- [ ] Fallback für unbekannte Types implementieren

### **Phase 2: Template anpassen** ✅ Priorität 1
- [ ] Zeile 275: `${type.type}` → `${getOutletTypeLabel(type.type)}`

### **Phase 3: Testing** ✅ Priorität 2
- [ ] Test: PDF-Report generieren
- [ ] Test: Medientyp-Verteilung Tabelle im PDF prüfen
- [ ] Test: Labels mit Emojis korrekt angezeigt
- [ ] Test: Alle outletTypes vorhanden (print, online, broadcast, audio)
- [ ] Test: Fallback für "blog" prüfen (zeigt "Blog (veraltet)")

### **Phase 4: UTF-8 Encoding prüfen** ✅ Priorität 3
- [ ] Prüfen ob Emojis in PDF korrekt angezeigt werden
- [ ] Falls Probleme: CSS `font-family` mit Emoji-Support ergänzen

---

## 🔄 Visuelle Vorher/Nachher-Beispiele

### **VORHER (PDF-Tabelle):**
```
┌──────────────┬────────┬──────────────┬────────┐
│ Medientyp    │ Anzahl │ Reichweite   │ Anteil │
├──────────────┼────────┼──────────────┼────────┤
│ print        │ 5      │ 250.000      │ 25%    │
│ online       │ 12     │ 1.800.000    │ 60%    │
│ blog         │ 2      │ 50.000       │ 10%    │
│ broadcast    │ 1      │ 800.000      │ 5%     │
└──────────────┴────────┴──────────────┴────────┘
```

### **NACHHER (PDF-Tabelle):**
```
┌──────────────────┬────────┬──────────────┬────────┐
│ Medientyp        │ Anzahl │ Reichweite   │ Anteil │
├──────────────────┼────────┼──────────────┼────────┤
│ 📰 Print         │ 5      │ 250.000      │ 25%    │
│ 💻 Online        │ 12     │ 1.800.000    │ 60%    │
│ 🎧 Audio         │ 2      │ 50.000       │ 10%    │
│ 📺 Broadcast     │ 1      │ 800.000      │ 5%     │
└──────────────────┴────────┴──────────────┴────────┘
```

---

## 🔗 Verwandte Dokumente

- `analytics-media-distribution-labels.md` - Gleiche Logik für Analytics-Dashboard
- `monitoring-types-refactoring.md` - Type-Definitionen Anpassung
- `publication-type-format-metrics-konzept.md` - Type/Format-Hauptkonzept

---

## ✅ Entscheidungen

1. **Emoji-Wahl:**
   - ✅ Print: 📰 (Zeitung)
   - ✅ Online: 💻 (Computer)
   - ✅ Broadcast: 📺 (Fernseher)
   - ✅ Audio: 🎧 (Kopfhörer/Podcast)
   - ⚠️ Blog: 💻 (Computer) + "(veraltet)" Label

2. **Blog-Handling:**
   - ✅ Temporär "Blog (veraltet)" anzeigen
   - ✅ Nach Migration (siehe `monitoring-types-refactoring.md`) verschwindet dieser Wert

3. **Fallback für unbekannte Types:**
   - ✅ Original-Wert anzeigen (ohne Emoji)
   - ✅ Kein Error werfen

4. **Case-Insensitive Matching:**
   - ✅ `.toLowerCase()` verwenden für robustes Matching

5. **Helper-Funktion Position:**
   - ✅ Direkt im Template (nicht in separater Utility-Datei)
   - **Begründung:** Aktuell nur hier verwendet, kann später refactored werden

---

## 📝 Zusätzliche Überlegungen

### **1. Emoji-Support in PDF**

**Puppeteer/Chrome unterstützt Emojis nativ**, aber wir sollten sicherstellen dass die Font-Family Emojis unterstützt.

**CSS-Ergänzung (falls nötig):**
```css
/* In styles.ts */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
               sans-serif;
}
```

**Entscheidung:** Nur wenn Emojis im PDF nicht angezeigt werden.

---

### **2. Shared Utility für Label-Mapping (Zukunft)**

**Falls wir diese Funktion an mehreren Stellen brauchen:**

**Datei:** `src/lib/utils/outlet-type-labels.ts` (NEU)

```typescript
/**
 * Shared Utility für outletType Label-Mapping
 */
export function getOutletTypeLabel(outletType: string): string {
  switch (outletType.toLowerCase()) {
    case 'print': return '📰 Print';
    case 'online': return '💻 Online';
    case 'broadcast': return '📺 Broadcast';
    case 'audio': return '🎧 Audio';
    case 'blog': return '💻 Blog (veraltet)';
    default: return outletType;
  }
}
```

**Verwendung dann in:**
- `src/components/monitoring/analytics/MediaDistributionChart.tsx`
- `src/lib/monitoring-report/templates/report-template.ts`

**Entscheidung:** ❌ Noch nicht nötig (aktuell nur 2 Stellen)

---

### **3. Konsistenz mit anderen Report-Teilen**

**Prüfen ob andere Stellen im PDF ebenfalls `outletType` verwenden:**

**Ergebnis:**
- ✅ `generateAllClippings()`: Verwendet `outletName` (nicht `outletType`) → OK
- ✅ `generateTopOutlets()`: Verwendet `outlet.name` → OK
- ✅ `generateTimeline()`: Zeigt nur Datum + Reichweite → OK
- ⚠️ **Nur `generateOutletTypeDistribution()`** zeigt `outletType` → Muss angepasst werden

---

## 🧪 Test-Szenarien

### **Szenario 1: Standard-Verteilung**
```typescript
outletTypeDistribution = [
  { type: 'print', count: 5, reach: 250000, percentage: 25 },
  { type: 'online', count: 12, reach: 1800000, percentage: 60 },
  { type: 'audio', count: 2, reach: 50000, percentage: 10 },
  { type: 'broadcast', count: 1, reach: 800000, percentage: 5 }
]
```

**Erwartete PDF-Ausgabe:**
```
Medientyp        Anzahl  Reichweite    Anteil
📰 Print         5       250.000       25%
💻 Online        12      1.800.000     60%
🎧 Audio         2       50.000        10%
📺 Broadcast     1       800.000       5%
```

---

### **Szenario 2: Legacy-Daten mit 'blog'**
```typescript
outletTypeDistribution = [
  { type: 'online', count: 10, reach: 1000000, percentage: 67 },
  { type: 'blog', count: 3, reach: 50000, percentage: 20 },
  { type: 'print', count: 2, reach: 100000, percentage: 13 }
]
```

**Erwartete PDF-Ausgabe:**
```
Medientyp              Anzahl  Reichweite  Anteil
💻 Online              10      1.000.000   67%
💻 Blog (veraltet)     3       50.000      20%
📰 Print               2       100.000     13%
```

---

### **Szenario 3: Unbekannter Type**
```typescript
outletTypeDistribution = [
  { type: 'print', count: 5, reach: 250000, percentage: 83 },
  { type: 'social_media', count: 1, reach: 10000, percentage: 17 }
]
```

**Erwartete PDF-Ausgabe:**
```
Medientyp        Anzahl  Reichweite  Anteil
📰 Print         5       250.000     83%
social_media     1       10.000      17%
```
(Fallback funktioniert)

---

### **Szenario 4: Case-Insensitive**
```typescript
outletTypeDistribution = [
  { type: 'PRINT', count: 3, reach: 150000, percentage: 50 },
  { type: 'Online', count: 3, reach: 150000, percentage: 50 }
]
```

**Erwartete PDF-Ausgabe:**
```
Medientyp    Anzahl  Reichweite  Anteil
📰 Print     3       150.000     50%
💻 Online    3       150.000     50%
```
(Case-Insensitive funktioniert dank `.toLowerCase()`)

---

## 🚨 Wichtige Hinweise

### **1. PDF-Generierung erfolgt Server-Side**

Der PDF-Report wird **nicht im Browser** generiert, sondern:
- Client sendet Request an Firebase Function
- Firebase Function verwendet Puppeteer (Headless Chrome)
- HTML → PDF Konvertierung erfolgt Server-Side
- PDF wird zu Firebase Storage hochgeladen

**Konsequenz:** Emojis müssen von Puppeteer/Chrome unterstützt werden → ✅ Funktioniert nativ

---

### **2. Keine React-Komponenten im Template**

Das Template ist **reines HTML als String**, keine React-Komponenten.

**Deswegen:**
- ❌ Kein JSX
- ❌ Keine React-Icons
- ✅ Emojis als Unicode-Zeichen
- ✅ Pure JavaScript String-Funktionen

---

### **3. Konsistenz zu Analytics-Dashboard**

**Wichtig:** Die gleiche Mapping-Logik wie in `MediaDistributionChart.tsx` verwenden!

**Gleiche Emojis:**
- 📰 Print
- 💻 Online
- 📺 Broadcast
- 🎧 Audio

**Gleiches Fallback:**
- Blog (veraltet)
- Original-Wert bei unbekannten Types

---

**Erstellt von:** Claude
**Review:** Ausstehend
**Freigabe:** Ausstehend
