# Analytics: Medium-Verteilung Label-Verbesserung

**Datum:** 2025-01-29
**Status:** 🟡 Planung
**Bereich:** Monitoring Analytics, Dashboard Charts
**Bezug:** `monitoring-types-refactoring.md`, `publication-type-format-metrics-konzept.md`

---

## 🎯 Zielsetzung

Die **Medium-Verteilung** im Analytics-Dashboard soll **benutzerfreundliche Labels** mit Icons anzeigen statt rohe `outletType`-Werte.

**Ziel:**
- ✅ `'print'` → `📰 Print`
- ✅ `'online'` → `💻 Online`
- ✅ `'broadcast'` → `📺 Broadcast`
- ✅ `'audio'` → `🎧 Audio`
- ⚠️ `'blog'` → `💻 Blog (veraltet)` (temporär für Migration)

---

## 📍 Wo wird die Medium-Verteilung angezeigt?

**Route:** `/dashboard/analytics/monitoring/[campaignId]?tab=dashboard`

**Komponenten-Hierarchie:**
1. `MonitoringDashboard.tsx` (Main Dashboard)
2. → `useClippingStats()` Hook (Daten-Aggregation)
3. → `MediaDistributionChart.tsx` (Chart-Komponente)

---

## ❌ Aktuelles Problem

### **Problem 1: Rohe outletType-Werte in Chart-Legende**

**Datei:** `src/components/monitoring/analytics/MediaDistributionChart.tsx`
**Zeile:** 65-66

**IST:**
```typescript
<Text className="text-sm text-gray-600">
  {item.name}: {item.count}
</Text>
```

**Ausgabe:**
```
🔵 print: 5
🔵 online: 12
🔵 blog: 2
🔵 broadcast: 1
```

**Probleme:**
- ❌ Keine Icons
- ❌ Englische Keys statt deutsche Labels
- ❌ `blog` wird angezeigt (sollte `audio` sein)
- ❌ Nicht benutzerfreundlich

---

### **Problem 2: Tooltip zeigt ebenfalls rohe Werte**

**Datei:** `src/components/monitoring/analytics/MediaDistributionChart.tsx`
**Zeile:** 49-55

**IST:**
```typescript
<Tooltip
  contentStyle={{
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  }}
/>
```

**Ausgabe (beim Hover):**
```
print
5
```

**Problem:** Zeigt ebenfalls den rohen Key `print` statt `📰 Print`

---

## ✅ SOLL-Zustand

### **Chart-Legende:**
```
🔵 📰 Print: 5
🔵 💻 Online: 12
🔵 🎧 Audio: 2
🔵 📺 Broadcast: 1
```

### **Tooltip:**
```
📰 Print
5
```

---

## 💡 Lösungsansatz

### **Zentrale Label-Mapping-Funktion**

**Prinzip:** Eine Helper-Funktion mappt `outletType` zu lesbarem Label mit Icon

```typescript
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
      return '💻 Blog (veraltet)'; // Temporär für Migration
    default:
      return outletType; // Fallback: Original-Wert
  }
}
```

**Vorteile:**
- ✅ Zentral wartbar
- ✅ Konsistent mit anderen UI-Komponenten
- ✅ Icons + deutsche Labels
- ✅ Fallback für unbekannte Types

---

## 🔧 Implementierungsplan

### **Phase 1: Label-Mapping-Funktion hinzufügen**

**Datei:** `src/components/monitoring/analytics/MediaDistributionChart.tsx`

**VOR der Component-Definition (nach Imports, vor `export const MediaDistributionChart`):**

```typescript
/**
 * Mappt outletType zu lesbarem Label mit Icon
 *
 * @param outletType - Der rohe outletType aus MediaClipping ('print', 'online', etc.)
 * @returns Formatiertes Label mit Icon (z.B. '📰 Print')
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
```

**Position:** Nach Zeile 17 (nach `const CHART_COLORS`), vor Zeile 19 (`export const MediaDistributionChart`)

---

### **Phase 2: Chart-Legende anpassen**

**Datei:** `src/components/monitoring/analytics/MediaDistributionChart.tsx`
**Zeile:** 58-70

**VORHER:**
```typescript
<div className="grid grid-cols-2 gap-2 mt-4">
  {data.map((item, idx) => (
    <div key={idx} className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-sm"
        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
      />
      <Text className="text-sm text-gray-600">
        {item.name}: {item.count}
      </Text>
    </div>
  ))}
</div>
```

**NACHHER:**
```typescript
<div className="grid grid-cols-2 gap-2 mt-4">
  {data.map((item, idx) => (
    <div key={idx} className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-sm"
        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
      />
      <Text className="text-sm text-gray-600">
        {getOutletTypeLabel(item.name)}: {item.count}
      </Text>
    </div>
  ))}
</div>
```

**Änderung:** Zeile 65: `{item.name}` → `{getOutletTypeLabel(item.name)}`

---

### **Phase 3: Tooltip anpassen**

**Datei:** `src/components/monitoring/analytics/MediaDistributionChart.tsx`
**Zeile:** 49-55

**VORHER:**
```typescript
<Tooltip
  contentStyle={{
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  }}
/>
```

**NACHHER:**
```typescript
<Tooltip
  contentStyle={{
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  }}
  formatter={(value, name) => [value, getOutletTypeLabel(name as string)]}
/>
```

**Änderung:** `formatter` Prop hinzufügen

**Erklärung:**
- `formatter` nimmt `(value, name)` entgegen
- `value` = Count (z.B. 5)
- `name` = outletType (z.B. 'print')
- Return-Array: `[value, formattedName]` → `[5, '📰 Print']`

---

## 📊 Code-Beispiel (Vollständig)

### **Komplette Datei nach Änderungen:**

```typescript
import React from 'react';
import { Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { NewspaperIcon } from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface OutletDistribution {
  name: string;
  count: number;
  reach: number;
}

interface MediaDistributionChartProps {
  data: OutletDistribution[];
}

const CHART_COLORS = ['#005fab', '#3397d7', '#add8f0', '#DEDC00', '#10b981'];

/**
 * Mappt outletType zu lesbarem Label mit Icon
 *
 * @param outletType - Der rohe outletType aus MediaClipping ('print', 'online', etc.)
 * @returns Formatiertes Label mit Icon (z.B. '📰 Print')
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

export const MediaDistributionChart = React.memo(function MediaDistributionChart({
  data,
}: MediaDistributionChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <NewspaperIcon className="h-5 w-5 text-[#005fab]" />
        <Subheading>Medium-Verteilung</Subheading>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [value, getOutletTypeLabel(name as string)]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
            />
            <Text className="text-sm text-gray-600">
              {getOutletTypeLabel(item.name)}: {item.count}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
});
```

---

## 📊 Betroffene Dateien

| Datei | Änderungen | Zeilen | Aufwand |
|-------|-----------|--------|---------|
| `src/components/monitoring/analytics/MediaDistributionChart.tsx` | Helper-Funktion + 2 Anpassungen | Neu (18-38), 65, 55 | 10 Min |

**Gesamt:** ~10 Minuten

---

## 🎯 Implementierungs-Schritte

### **Phase 1: Helper-Funktion** ✅ Priorität 1
- [ ] `getOutletTypeLabel()` Funktion hinzufügen (nach Zeile 17)
- [ ] JSDoc-Kommentar hinzufügen
- [ ] Alle 5 outletTypes mappen (print, online, broadcast, audio, blog)
- [ ] Fallback für unbekannte Types implementieren

### **Phase 2: Chart-Legende anpassen** ✅ Priorität 1
- [ ] Zeile 65: `{item.name}` → `{getOutletTypeLabel(item.name)}`

### **Phase 3: Tooltip anpassen** ✅ Priorität 1
- [ ] Zeile 55: `formatter` Prop hinzufügen
- [ ] Tooltip-Formatter-Funktion implementieren

### **Phase 4: Testing** ✅ Priorität 2
- [ ] Test: Chart anzeigen und Labels prüfen
- [ ] Test: Tooltip beim Hover prüfen
- [ ] Test: Alle outletTypes vorhanden (print, online, broadcast, audio)
- [ ] Test: Fallback für "blog" prüfen (zeigt "Blog (veraltet)")

---

## 🔄 Visuelle Vorher/Nachher-Beispiele

### **VORHER (Legende):**
```
Medium-Verteilung
━━━━━━━━━━━━━━━━
🔵 print: 5
🔵 online: 12
🔵 blog: 2
🔵 broadcast: 1
```

### **NACHHER (Legende):**
```
Medium-Verteilung
━━━━━━━━━━━━━━━━
🔵 📰 Print: 5
🔵 💻 Online: 12
🔵 🎧 Audio: 2
🔵 📺 Broadcast: 1
```

---

### **VORHER (Tooltip beim Hover):**
```
┌─────────────┐
│ print       │
│ 5           │
└─────────────┘
```

### **NACHHER (Tooltip beim Hover):**
```
┌─────────────┐
│ 📰 Print    │
│ 5           │
└─────────────┘
```

---

## 🔗 Verwandte Dokumente

- `monitoring-types-refactoring.md` - Type-Definitionen Anpassung
- `publication-type-format-metrics-konzept.md` - Type/Format-Hauptkonzept
- `monitoring-modals-refactoring.md` - Modal Label-Mapping (ähnliche Logik)

---

## ✅ Entscheidungen

1. **Icon-Wahl:**
   - ✅ Print: 📰 (Zeitung)
   - ✅ Online: 💻 (Computer)
   - ✅ Broadcast: 📺 (Fernseher)
   - ✅ Audio: 🎧 (Kopfhörer/Podcast)
   - ⚠️ Blog: 💻 (Computer) + "(veraltet)" Label

2. **Blog-Handling:**
   - ✅ Temporär "Blog (veraltet)" anzeigen
   - ✅ Nach Migration (siehe `monitoring-types-refactoring.md`) verschwindet dieser Wert

3. **Fallback für unbekannte Types:**
   - ✅ Original-Wert anzeigen (ohne Icon)
   - ✅ Kein Error werfen

4. **Case-Insensitive Matching:**
   - ✅ `.toLowerCase()` verwenden für robustes Matching

---

## 📝 Alternative Ansätze (verworfen)

### **Alternative 1: Shared Helper-Funktion**

**Idee:** Label-Mapping in shared Utils verschieben

```typescript
// src/lib/utils/outlet-type-labels.ts
export function getOutletTypeLabel(type: string): string { ... }
```

**Vorteile:**
- Wiederverwendbar in anderen Komponenten

**Nachteile:**
- Overhead für eine simple Mapping-Funktion
- Nicht nötig, da aktuell nur hier verwendet

**Entscheidung:** ❌ Verworfen - Aktuell nicht nötig, kann später refactored werden

---

### **Alternative 2: Label-Mapping im Hook**

**Idee:** Bereits in `useClippingStats()` die Labels mappen

**Vorteile:**
- Daten kommen bereits formatiert an

**Nachteile:**
- Hook wäre für Presentation-Logik verantwortlich (Separation of Concerns)
- Chart könnte keine rohen Daten mehr verwenden

**Entscheidung:** ❌ Verworfen - Besser in Presentation-Komponente

---

### **Alternative 3: Heroicons statt Emojis**

**Idee:** Icons aus Heroicons verwenden statt Emojis

```typescript
case 'print':
  return <><NewspaperIcon className="h-4 w-4" /> Print</>;
```

**Vorteile:**
- Konsistent mit Design System

**Nachteile:**
- Komplexer (JSX statt String)
- Emojis funktionieren überall (Tooltip, etc.)

**Entscheidung:** ❌ Verworfen - Emojis sind einfacher und ausreichend

---

## 🧪 Test-Szenarien

### **Szenario 1: Standard-Verteilung**
```typescript
data = [
  { name: 'print', count: 5, reach: 50000 },
  { name: 'online', count: 12, reach: 1500000 },
  { name: 'audio', count: 2, reach: 120000 }
]
```

**Erwartete Ausgabe:**
- Legende: "📰 Print: 5", "💻 Online: 12", "🎧 Audio: 2"
- Tooltip: Bei Hover auf Print → "📰 Print"

---

### **Szenario 2: Legacy-Daten mit 'blog'**
```typescript
data = [
  { name: 'online', count: 10, reach: 1000000 },
  { name: 'blog', count: 3, reach: 50000 }
]
```

**Erwartete Ausgabe:**
- Legende: "💻 Online: 10", "💻 Blog (veraltet): 3"
- Tooltip: Bei Hover auf Blog → "💻 Blog (veraltet)"

---

### **Szenario 3: Unbekannter Type**
```typescript
data = [
  { name: 'print', count: 5, reach: 50000 },
  { name: 'social_media', count: 1, reach: 10000 }
]
```

**Erwartete Ausgabe:**
- Legende: "📰 Print: 5", "social_media: 1"
- Tooltip: Bei Hover auf social_media → "social_media"

---

### **Szenario 4: Case-Insensitive**
```typescript
data = [
  { name: 'PRINT', count: 5, reach: 50000 },
  { name: 'Online', count: 10, reach: 1000000 }
]
```

**Erwartete Ausgabe:**
- Legende: "📰 Print: 5", "💻 Online: 10"
- (Funktioniert dank `.toLowerCase()`)

---

**Erstellt von:** Claude
**Review:** Ausstehend
**Freigabe:** Ausstehend
