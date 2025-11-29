# Publications-Tabelle: Metriken-Anzeige Optimierung

**Datum:** 2025-01-29
**Status:** 🟡 Planung
**Bereich:** Publications Library, Tabellen-Ansicht
**Bezug:** `publication-type-format-metrics-konzept.md`

---

## 🎯 Zielsetzung

Die Metriken-Spalte in der Publications-Tabelle (`/dashboard/library/publications`) soll **alle AVE-relevanten Reichweite-Werte** anzeigen, die für eine Publication hinterlegt sind.

---

## ❌ Aktuelles Problem

### IST-Zustand (`src/app/dashboard/library/publications/page.tsx:239-247`)

```typescript
const formatMetric = (pub: Publication): string => {
  if (pub.metrics?.print?.circulation) {
    return `${pub.metrics.print.circulation.toLocaleString('de-DE')} Auflage`;
  }
  if (pub.metrics?.online?.monthlyUniqueVisitors) {
    return `${pub.metrics.online.monthlyUniqueVisitors.toLocaleString('de-DE')} UV/Monat`;
  }
  return "";
};
```

### Probleme:

1. ❌ **Zeigt nur EINEN Wert** - entweder Print ODER Online
2. ❌ **Verwendet falsche Online-Metrik**: `monthlyUniqueVisitors` statt `monthlyPageViews`
3. ❌ **Keine Broadcast-Metriken**: TV/Radio `viewership` wird nicht angezeigt
4. ❌ **Keine Audio-Metriken**: Podcast `monthlyDownloads` wird nicht angezeigt
5. ❌ **Bei Format "both"**: Nur Print wird gezeigt, Online-Wert fehlt

### Beispiel-Szenarien:

| Format | Hinterlegte Metriken | Aktuell angezeigt | Sollte angezeigt werden |
|--------|---------------------|-------------------|------------------------|
| `print` | circulation: 50.000 | ✅ "50.000 Auflage" | ✅ "50.000 Auflage" |
| `online` | monthlyPageViews: 1.500.000<br>monthlyUniqueVisitors: 250.000 | ❌ "250.000 UV/Monat" | ✅ "1.500.000 Page Views" |
| `both` | circulation: 50.000<br>monthlyPageViews: 1.500.000 | ❌ "50.000 Auflage" | ✅ "50.000 Auflage<br>1.500.000 Page Views" |
| `broadcast` | viewership: 800.000 | ❌ "" (leer) | ✅ "800.000 Zuschauer" |
| `audio` | monthlyDownloads: 120.000 | ❌ "" (leer) | ✅ "120.000 Downloads" |

---

## 💡 Lösungskonzept

### 1. Neue `formatMetric` Funktion

**Prinzip:** Zeige alle AVE-relevanten Pflichtfelder, die Werte haben

```typescript
const formatMetric = (pub: Publication): string | JSX.Element => {
  const metrics: string[] = [];

  // Print: Auflage (AVE-relevant)
  if (pub.metrics?.print?.circulation) {
    metrics.push(`${pub.metrics.print.circulation.toLocaleString('de-DE')} Auflage`);
  }

  // Online: Page Views (AVE-relevant - Primär)
  if (pub.metrics?.online?.monthlyPageViews) {
    metrics.push(`${pub.metrics.online.monthlyPageViews.toLocaleString('de-DE')} Page Views`);
  }
  // Online: Unique Visitors (AVE-relevant - Fallback)
  else if (pub.metrics?.online?.monthlyUniqueVisitors) {
    metrics.push(`${pub.metrics.online.monthlyUniqueVisitors.toLocaleString('de-DE')} Unique Visitors`);
  }

  // Broadcast: Zuschauer/Hörer (AVE-relevant)
  if (pub.metrics?.broadcast?.viewership) {
    metrics.push(`${pub.metrics.broadcast.viewership.toLocaleString('de-DE')} Zuschauer`);
  }

  // Audio: Downloads (AVE-relevant - Primär)
  if (pub.metrics?.audio?.monthlyDownloads) {
    metrics.push(`${pub.metrics.audio.monthlyDownloads.toLocaleString('de-DE')} Downloads`);
  }
  // Audio: Listeners (AVE-relevant - Fallback)
  else if (pub.metrics?.audio?.monthlyListeners) {
    metrics.push(`${pub.metrics.audio.monthlyListeners.toLocaleString('de-DE')} Hörer`);
  }

  // Wenn keine Metriken vorhanden
  if (metrics.length === 0) {
    return (
      <span className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1">
        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
        Keine Reichweite
      </span>
    );
  }

  // Ein Wert: Einfache Text-Anzeige
  if (metrics.length === 1) {
    return metrics[0];
  }

  // Mehrere Werte: Mehrzeilige Anzeige
  return (
    <div className="space-y-0.5">
      {metrics.map((metric, idx) => (
        <div key={idx} className="text-sm text-zinc-600 dark:text-zinc-400">
          {metric}
        </div>
      ))}
    </div>
  );
};
```

### 2. Visuelle Darstellung

#### Single Metric (1 Wert)
```
┌──────────────────┐
│ 📰 50.000        │
└──────────────────┘
```

#### Multiple Metrics (2 Werte - Format "both")
```
┌──────────────────┐
│ 📰 50.000        │
│ 🌐 1.500.000     │
└──────────────────┘
```

#### No Metrics (⚠️ Warnung)
```
┌──────────────────────────┐
│ ⚠️ Keine Reichweite      │
└──────────────────────────┘
```

**Design-Regeln:**
- ✅ Icon + Zahl (formatiert mit `.toLocaleString('de-DE')`)
- ✅ Keine Labels wie "Auflage" oder "Page Views"
- ✅ Maximal 2 Zeilen
- ✅ Gleicher vertikaler Abstand zwischen Zeilen

---

### 3. Icon-Mapping für Metriken

**Heroicons 24/outline - Konsistente Icons:**

| Metrik | Icon | Heroicon Component | Anzeige |
|--------|------|-------------------|---------|
| `circulation` | 📰 | `NewspaperIcon` | 📰 50.000 |
| `monthlyPageViews` | 🌐 | `GlobeAltIcon` | 🌐 1.500.000 |
| `monthlyUniqueVisitors` | 🌐 | `GlobeAltIcon` | 🌐 250.000 |
| `viewership` | 📺 | `TvIcon` | 📺 800.000 |
| `monthlyDownloads` | 🎧 | `SignalIcon` (Podcast) | 🎧 120.000 |
| `monthlyListeners` | 🎧 | `SignalIcon` (Podcast) | 🎧 50.000 |

**Alternative Icons:**
- Radio: `RadioIcon` (falls verfügbar) oder `SignalIcon`
- Podcast: `SignalIcon` oder `SpeakerWaveIcon`

**Tooltip für Icon-Erklärung:**

Da keine Labels angezeigt werden, könnte ein Tooltip helfen:

```tsx
<div className="flex items-center gap-1.5" title="Auflage (Print)">
  <NewspaperIcon className="h-4 w-4 text-zinc-400" />
  <span>50.000</span>
</div>
```

**Entscheidung:**
- ✅ Tooltip auf dem Icon für Accessibility

---

### 4. Warnung bei fehlenden Metriken

**Wenn KEINE AVE-relevante Metrik vorhanden:**

```tsx
<span className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1">
  <ExclamationTriangleIcon className="h-3.5 w-3.5" />
  Keine Reichweite
</span>
```

**Zweck:**
- ✅ Macht fehlende Pflichtfelder visuell erkennbar
- ✅ Motiviert User, Reichweite-Daten zu ergänzen
- ✅ Verhindert "leere" Zellen in der Tabelle

---

### 5. Responsive Verhalten

**Desktop (> 1024px):**
- Volle Anzeige aller Metriken

**Tablet (768px - 1024px):**
- Spalte bleibt sichtbar (aktuell `hidden lg:block`)
- Mehrzeilige Darstellung funktioniert

**Mobile (< 768px):**
- Spalte ausgeblendet (Platzgründe)
- Metriken könnten in Detailansicht oder als Badge unter dem Titel erscheinen

---

## 🔄 Migration / Backward Compatibility

### Bestehende Publications

**Szenario 1: Publications mit `monthlyUniqueVisitors` statt `monthlyPageViews`**
- Die neue Funktion zeigt Unique Visitors als Fallback
- Keine Daten gehen verloren
- ✅ Kompatibel

**Szenario 2: Publications ohne jegliche Reichweite-Metriken**
- Zeigt Warnung "⚠️ Keine Reichweite"
- User kann Daten ergänzen
- ✅ Kompatibel

**Szenario 3: Format "both" mit Print + Online**
- Zeigt beide Werte
- Neue Funktionalität, besser als vorher
- ✅ Kompatibel

---

## 📊 Beispiele nach Format

### Format: Print
```
Daten:
- circulation: 50.000

Anzeige:
📰 50.000
```

### Format: Online
```
Daten:
- monthlyPageViews: 1.500.000
- monthlyUniqueVisitors: 250.000 (wird ignoriert, da PageViews vorhanden)

Anzeige:
🌐 1.500.000
```

### Format: Online (ohne PageViews)
```
Daten:
- monthlyUniqueVisitors: 250.000

Anzeige:
🌐 250.000
```

### Format: Both (2 Zeilen!)
```
Daten:
- circulation: 50.000
- monthlyPageViews: 1.500.000

Anzeige:
📰 50.000
🌐 1.500.000
```

### Format: Broadcast
```
Daten:
- viewership: 800.000

Anzeige:
📺 800.000
```

### Format: Audio (Podcast)
```
Daten:
- monthlyDownloads: 120.000

Anzeige:
🎧 120.000
```

### Keine Metriken
```
Daten:
- (nichts)

Anzeige:
⚠️ Keine Reichweite
```

## 🎯 Implementierungs-Schritte

### Phase 1: Kern-Funktion
- [ ] `formatMetric()` Funktion überarbeiten
- [ ] Alle AVE-relevanten Metriken einbauen (print, online, broadcast, audio)
- [ ] Fallback-Logik für Unique Visitors / Listeners

### Phase 2: Fehlende Metriken
- [ ] Warnung "⚠️ Keine Reichweite" implementieren
- [ ] Icon + Styling für Warnung

### Phase 3: Mehrzeilige Darstellung
- [ ] JSX-Return für multiple Metriken
- [ ] Spacing/Layout testen
- [ ] Dark Mode prüfen

### Phase 4: Testing
- [ ] Test-Publications für alle Formate anlegen
- [ ] Edge Cases testen (keine Metriken, nur Fallback-Werte)
- [ ] Responsive Verhalten prüfen

### Phase 5: Feinschliff (Optional)
- [ ] Tooltip hinzufügen (falls gewünscht)
- [ ] Icons hinzufügen (falls gewünscht)
- [ ] Labels anpassen ("/Monat"-Suffix?)

---

## ✅ Entscheidungen

1. **Zeitraum-Suffix "/Monat"**:
   - ✅ **OHNE Suffix** - nur die Zahl anzeigen

2. **Icons vor Metrik-Werten**:
   - ✅ **JA** - Icon für jeden Metrik-Typ

3. **Labels (Auflage, Page Views, etc.)**:
   - ✅ **KEINE Labels** - nur Icon + Zahl

4. **Tooltip bei mehreren Werten**:
   - ❌ **NEIN** - nicht nötig

5. **Warnung bei fehlenden Metriken**:
   - ✅ **JA** - "⚠️ Keine Reichweite" anzeigen

6. **Max. Anzahl Werte**:
   - ✅ **Maximal 2 Werte** gleichzeitig (bei Format "both")

7. **Format pro Zeile**:
   - ✅ **Icon + Zahl** in einer Zeile
   - ✅ **Keine zusätzlichen Texte**

---

## 📝 Code-Beispiel (Vollständig)

```typescript
import {
  NewspaperIcon,
  GlobeAltIcon,
  TvIcon,
  SignalIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface MetricDisplay {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  tooltip: string;
}

const formatMetric = (pub: Publication): JSX.Element => {
  const metrics: MetricDisplay[] = [];

  // Print: Auflage
  if (pub.metrics?.print?.circulation) {
    metrics.push({
      icon: NewspaperIcon,
      value: pub.metrics.print.circulation,
      tooltip: 'Auflage (Print)'
    });
  }

  // Online: Page Views (Primär)
  if (pub.metrics?.online?.monthlyPageViews) {
    metrics.push({
      icon: GlobeAltIcon,
      value: pub.metrics.online.monthlyPageViews,
      tooltip: 'Monatliche Page Views'
    });
  }
  // Online: Unique Visitors (Fallback)
  else if (pub.metrics?.online?.monthlyUniqueVisitors) {
    metrics.push({
      icon: GlobeAltIcon,
      value: pub.metrics.online.monthlyUniqueVisitors,
      tooltip: 'Monatliche Unique Visitors'
    });
  }

  // Broadcast: Zuschauer/Hörer
  if (pub.metrics?.broadcast?.viewership) {
    metrics.push({
      icon: TvIcon,
      value: pub.metrics.broadcast.viewership,
      tooltip: 'Zuschauer/Hörer (Broadcast)'
    });
  }

  // Audio: Downloads (Primär)
  if (pub.metrics?.audio?.monthlyDownloads) {
    metrics.push({
      icon: SignalIcon,
      value: pub.metrics.audio.monthlyDownloads,
      tooltip: 'Monatliche Downloads (Podcast)'
    });
  }
  // Audio: Listeners (Fallback)
  else if (pub.metrics?.audio?.monthlyListeners) {
    metrics.push({
      icon: SignalIcon,
      value: pub.metrics.audio.monthlyListeners,
      tooltip: 'Monatliche Hörer (Podcast)'
    });
  }

  // Keine Metriken vorhanden
  if (metrics.length === 0) {
    return (
      <span className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1">
        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
        Keine Reichweite
      </span>
    );
  }

  // Ein oder mehrere Werte (max. 2)
  return (
    <div className="space-y-1">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        return (
          <div
            key={idx}
            className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400"
            title={metric.tooltip}
          >
            <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
            <span>{metric.value.toLocaleString('de-DE')}</span>
          </div>
        );
      })}
    </div>
  );
};
```

---

## 🔗 Verwandte Dokumente

- `publication-type-format-metrics-konzept.md` - Hauptkonzept für Type/Format/Metriken
- `src/app/dashboard/library/publications/page.tsx:239-247` - Aktuelle Implementierung
- `src/types/library.ts` - Metriken-Datenstruktur

---

**Erstellt von:** Claude
**Review:** Ausstehend
**Freigabe:** Ausstehend
