# Publication Type, Format & Metriken - Konzeptionelle Planung

**Datum:** 2025-01-29
**Aktualisiert:** 2025-01-29
**Status:** 🟡 Planung
**Bereich:** AVE-Berechnung, Publications Library

---

## 📋 Änderungshistorie

**Version 1.1** (2025-01-29):
- ✅ Info-Icon + Tooltip für AVE-relevante Felder hinzugefügt
- ✅ Reichweite-Felder als Pflichtfelder definiert
- ✅ Validierungs-Logik dokumentiert
- ✅ `press_agency` Type entfernt (zu verwirrend)

**Version 1.0** (2025-01-29):
- Initiale Konzeption erstellt

---

## 🎯 Zielsetzung

Ein konsistentes System für Publication-Types, Formate und deren Metriken schaffen, das sicherstellt:

1. ✅ Jeder Type hat passende Format-Optionen
2. ✅ Jedes Format hat die richtigen Metriken-Felder
3. ✅ Alle Metriken haben ein "Reichweite"-Feld für die AVE-Berechnung
4. ✅ Die UI zeigt nur relevante Metriken-Sektionen an
5. ✅ Reichweite-Felder sind Pflichtfelder mit Info-Icon
6. ✅ Validierung verhindert Speichern ohne AVE-relevante Werte

---

## ❌ Aktuelles Problem

### IST-Zustand im UI (`PublicationModal/MetricsSection.tsx`)

**Angezeigte Metriken-Sektionen:**

1. **Print-Metriken** (Zeile 77):
   - Bedingung: `formData.format === 'print' || formData.format === 'both'`
   - Felder: Auflage (circulation), Auflagentyp, Preis, Format, Seitenanzahl
   - ✅ Reichweite vorhanden: `circulation`

2. **Online-Metriken** (Zeile 176):
   - Bedingung: `formData.format === 'online' || formData.format === 'both'`
   - Felder: Monthly Page Views, Unique Visitors, Session Duration, Bounce Rate, etc.
   - ✅ Reichweite vorhanden: `monthlyPageViews`

### ❌ Fehlende Metriken-Sektionen

- **Broadcast** (TV/Radio): Keine UI-Felder vorhanden
  - `viewership` wird nicht abgefragt
  - Type `tv`, `radio` haben keine Reichweite-Erfassung

- **Audio/Podcast**: Überhaupt keine Metriken-Sektion
  - Type `podcast` hat NULL Metriken-Felder
  - Keine Downloads, Listeners, etc.

### Konkrete Probleme

| Type | Format | UI-Metriken-Sektion | Reichweite-Feld | Status |
|------|--------|-------------------|----------------|--------|
| `magazine` | print/online/both | Print/Online | circulation/monthlyPageViews | ✅ OK |
| `newspaper` | print/online/both | Print/Online | circulation/monthlyPageViews | ✅ OK |
| `website` | online | Online | monthlyPageViews | ✅ OK |
| `blog` | online | Online | monthlyPageViews | ✅ OK |
| `podcast` | broadcast? | ❌ KEINE | ❌ KEINE | 🔴 FEHLT |
| `tv` | broadcast? | ❌ KEINE | ❌ KEINE | 🔴 FEHLT |
| `radio` | broadcast? | ❌ KEINE | ❌ KEINE | 🔴 FEHLT |

---

## 💡 Lösungskonzept

### 1. Format-Types klar definieren

```typescript
export type PublicationFormat =
  | 'print'      // Physisch gedruckt (Zeitung, Magazin)
  | 'online'     // Digital (Website, Blog, Newsletter, Social Media)
  | 'broadcast'  // TV, Radio (Live-Übertragung)
  | 'audio'      // Podcast, Audio-Streaming (On-Demand)
  | 'both';      // Hybrid Print + Online
```

**Änderungen:**
- ✅ Behält bestehende Werte: `print`, `online`, `both`
- 🆕 Fügt hinzu: `audio` (für Podcasts)
- ✅ Behält bei: `broadcast` (für TV/Radio)

---

### 2. Type → Format Mapping

**Regeln: Welche Formate sind für welchen Type erlaubt?**

```typescript
const TYPE_TO_ALLOWED_FORMATS: Record<PublicationType, PublicationFormat[]> = {
  // Klassische Print-Medien mit Online-Option
  magazine: ['print', 'online', 'both'],
  newspaper: ['print', 'online', 'both'],
  trade_journal: ['print', 'online', 'both'],

  // Rein digital
  website: ['online'],
  blog: ['online'],
  newsletter: ['online'],
  social_media: ['online'],

  // Audio
  podcast: ['audio'],

  // Broadcast
  tv: ['broadcast'],
  radio: ['broadcast']
};
```

**UI-Konsequenz:**
- Bei Type "podcast" → Format-Feld zeigt nur "Audio" (oder ist versteckt)
- Bei Type "tv" → Format-Feld zeigt nur "Broadcast" (oder ist versteckt)
- Bei Type "magazine" → Format-Feld zeigt "Print", "Online", "Both" zur Auswahl

---

### 3. Metriken-Struktur erweitern

**Neue Audio-Metriken hinzufügen** (`src/types/library.ts`):

```typescript
export interface Publication extends BaseEntity {
  metrics: {
    frequency: PublicationFrequency;
    targetAudience?: string;
    targetAgeGroup?: string;
    targetGender?: 'all' | 'predominantly_male' | 'predominantly_female';

    // Bestehend: Print
    print?: {
      circulation: number;                    // ← REICHWEITE für Print
      circulationType: 'printed' | 'sold' | 'distributed' | 'subscribers' | 'audited_ivw';
      // ... weitere Print-Felder
    };

    // Bestehend: Online
    online?: {
      monthlyPageViews?: number;              // ← REICHWEITE für Online (Primär)
      monthlyUniqueVisitors?: number;         // Fallback
      monthlyVisits?: number;
      // ... weitere Online-Felder
    };

    // Bestehend: Broadcast (TV/Radio)
    broadcast?: {
      viewership?: number;                    // ← REICHWEITE für Broadcast
      marketShare?: number;
      broadcastArea?: string;
      // ... weitere Broadcast-Felder
    };

    // 🆕 NEU: Audio (Podcast)
    audio?: {
      monthlyDownloads?: number;              // ← REICHWEITE für Podcast (Primär)
      monthlyListeners?: number;              // Alternative/Fallback
      episodeCount?: number;
      avgEpisodeDuration?: number;            // Minuten
      platforms?: string[];                   // ["Spotify", "Apple Podcasts", ...]
    };
  };
}
```

---

### 4. UI-Metriken-Sektionen (Erweiterung)

**Aktuelle Sektionen:**
- ✅ Print-Metriken (bereits vorhanden)
- ✅ Online-Metriken (bereits vorhanden)

**Neu hinzuzufügen:**

#### 🎯 Wichtig: Reichweite-Felder als Pflichtfelder

**Alle Felder, die für die AVE-Berechnung verwendet werden, müssen:**

1. ✅ **Info-Icon** mit Tooltip anzeigen:
   - Tooltip-Text: *"Dieses Feld wird für die AVE-Berechnung verwendet"*
   - Icon: `<InfoTooltip />` Komponente

2. ✅ **Pflichtfeld-Kennzeichnung** (`*`):
   - Visuell mit rotem Stern markiert
   - HTML `required` Attribut
   - Validierung beim Speichern

3. ✅ **Validierungs-Regel**:
   - Formular kann nicht gespeichert werden ohne Reichweite-Wert
   - Fehlermeldung: *"[Feldname] ist erforderlich für die AVE-Berechnung"*

**Betroffene Felder pro Format:**

| Format | Reichweite-Feld | Label im UI |
|--------|----------------|-------------|
| `print` | `circulation` | **Auflage *** + ℹ️ |
| `online` | `monthlyPageViews` | **Monatliche Page Views *** + ℹ️ |
| `broadcast` | `viewership` | **Zuschauer/Hörer *** + ℹ️ |
| `audio` | `monthlyDownloads` | **Monatliche Downloads *** + ℹ️ |

---

#### 4.1 Broadcast-Metriken Sektion

```tsx
{/* Broadcast Metriken (TV/Radio) */}
{formData.format === 'broadcast' && (
  <div className="border rounded-lg p-4 space-y-4">
    <h4 className="font-medium text-zinc-900">Broadcast-Metriken (TV/Radio)</h4>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
          Zuschauer/Hörer (Durchschnitt)
          <span className="text-red-500">*</span>
          <InfoTooltip content="Dieses Feld wird für die AVE-Berechnung verwendet" />
        </label>
        <Input
          type="number"
          value={metrics.broadcast.viewership}
          onChange={(e) => setMetrics({
            ...metrics,
            broadcast: { ...metrics.broadcast, viewership: e.target.value }
          })}
          placeholder="500000"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Marktanteil (%)
        </label>
        <Input
          type="number"
          step="0.1"
          value={metrics.broadcast.marketShare}
          onChange={(e) => setMetrics({
            ...metrics,
            broadcast: { ...metrics.broadcast, marketShare: e.target.value }
          })}
          placeholder="15.5"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Sendegebiet
        </label>
        <Input
          type="text"
          value={metrics.broadcast.broadcastArea}
          onChange={(e) => setMetrics({
            ...metrics,
            broadcast: { ...metrics.broadcast, broadcastArea: e.target.value }
          })}
          placeholder="z.B. National, Regional Bayern"
        />
      </div>
    </div>
  </div>
)}
```

#### 4.2 Audio-Metriken Sektion (Podcast)

```tsx
{/* Audio Metriken (Podcast) */}
{formData.format === 'audio' && (
  <div className="border rounded-lg p-4 space-y-4">
    <h4 className="font-medium text-zinc-900">Audio-Metriken (Podcast)</h4>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
          Monatliche Downloads
          <span className="text-red-500">*</span>
          <InfoTooltip content="Dieses Feld wird für die AVE-Berechnung verwendet" />
        </label>
        <Input
          type="number"
          value={metrics.audio.monthlyDownloads}
          onChange={(e) => setMetrics({
            ...metrics,
            audio: { ...metrics.audio, monthlyDownloads: e.target.value }
          })}
          placeholder="50000"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Monatliche Hörer (optional)
        </label>
        <Input
          type="number"
          value={metrics.audio.monthlyListeners}
          onChange={(e) => setMetrics({
            ...metrics,
            audio: { ...metrics.audio, monthlyListeners: e.target.value }
          })}
          placeholder="25000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Anzahl Episoden
        </label>
        <Input
          type="number"
          value={metrics.audio.episodeCount}
          onChange={(e) => setMetrics({
            ...metrics,
            audio: { ...metrics.audio, episodeCount: e.target.value }
          })}
          placeholder="120"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Ø Episode-Länge (Minuten)
        </label>
        <Input
          type="number"
          step="0.1"
          value={metrics.audio.avgEpisodeDuration}
          onChange={(e) => setMetrics({
            ...metrics,
            audio: { ...metrics.audio, avgEpisodeDuration: e.target.value }
          })}
          placeholder="45.0"
        />
      </div>
    </div>
  </div>
)}
```

---

### 5. Validierungs-Logik für Reichweite-Pflichtfelder

**Formular-Validierung beim Speichern:**

```typescript
function validatePublicationMetrics(formData: PublicationFormData, metrics: MetricsState): string[] {
  const errors: string[] = [];

  // Format-basierte Validierung
  switch (formData.format) {
    case 'print':
      if (!metrics.print?.circulation || metrics.print.circulation <= 0) {
        errors.push('Auflage ist erforderlich für die AVE-Berechnung');
      }
      break;

    case 'online':
      if (!metrics.online?.monthlyPageViews || metrics.online.monthlyPageViews <= 0) {
        errors.push('Monatliche Page Views sind erforderlich für die AVE-Berechnung');
      }
      break;

    case 'broadcast':
      if (!metrics.broadcast?.viewership || metrics.broadcast.viewership <= 0) {
        errors.push('Zuschauer/Hörer sind erforderlich für die AVE-Berechnung');
      }
      break;

    case 'audio':
      if (!metrics.audio?.monthlyDownloads || metrics.audio.monthlyDownloads <= 0) {
        errors.push('Monatliche Downloads sind erforderlich für die AVE-Berechnung');
      }
      break;

    case 'both':
      // Mindestens eins muss vorhanden sein
      const hasCirculation = metrics.print?.circulation && metrics.print.circulation > 0;
      const hasPageViews = metrics.online?.monthlyPageViews && metrics.online.monthlyPageViews > 0;

      if (!hasCirculation && !hasPageViews) {
        errors.push('Entweder Auflage oder Monatliche Page Views sind erforderlich für die AVE-Berechnung');
      }
      break;
  }

  return errors;
}
```

**UI-Fehlerdarstellung:**

```tsx
{validationErrors.length > 0 && (
  <div className="rounded-md bg-red-50 p-4 mb-4">
    <div className="flex">
      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">
          Bitte korrigieren Sie folgende Fehler:
        </h3>
        <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
          {validationErrors.map((error, idx) => (
            <li key={idx}>{error}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
)}
```

---

### 6. Format → Metriken → Reichweite Mapping

**Klare Zuordnung: Welches Feld wird für AVE-Berechnung verwendet?**

| Format | Metriken-Sektion | Reichweite-Feld (Primär) | Fallback | Hinweis |
|--------|-----------------|------------------------|----------|---------|
| `print` | Print | `metrics.print.circulation` | - | Auflage |
| `online` | Online | `metrics.online.monthlyPageViews` | `monthlyUniqueVisitors` | **Von Verlagen kommuniziert** |
| `broadcast` | Broadcast | `metrics.broadcast.viewership` | - | Zuschauer/Hörer |
| `audio` | Audio | `metrics.audio.monthlyDownloads` | `monthlyListeners` | Podcast Downloads |
| `both` | Print + Online | `MAX(circulation, monthlyPageViews)` | - | Größerer Wert |

---

### 6. AVE-Berechnung - Reichweite-Extraktion

**Aktualisierte Funktion** (`src/lib/utils/publication-matcher.ts`):

```typescript
/**
 * Extrahiert die Reichweite aus einer Library-Publication
 * basierend auf dem Format
 */
export function getReachFromLibraryPublication(pub: LibraryPublication): number {
  switch (pub.format) {
    case 'print':
      return pub.metrics?.print?.circulation ?? 0;

    case 'online':
      // Primär: Page Views (von Verlagen kommuniziert)
      return pub.metrics?.online?.monthlyPageViews
          ?? pub.metrics?.online?.monthlyUniqueVisitors
          ?? 0;

    case 'broadcast':
      return pub.metrics?.broadcast?.viewership ?? 0;

    case 'audio':
      // Primär: Downloads, Fallback: Listeners
      return pub.metrics?.audio?.monthlyDownloads
          ?? pub.metrics?.audio?.monthlyListeners
          ?? 0;

    case 'both':
      // Hybrid: Nimm den größeren Wert
      const printReach = pub.metrics?.print?.circulation ?? 0;
      const onlineReach = pub.metrics?.online?.monthlyPageViews ?? 0;
      return Math.max(printReach, onlineReach);

    default:
      return 0;
  }
}
```

---

### 7. AVE-Faktoren pro Format

**Bestehende AVE-Settings** (`src/types/monitoring.ts`):

```typescript
export interface AVESettings {
  factors: {
    print: number;      // Standard: 3
    online: number;     // Standard: 1
    broadcast: number;  // Standard: 5
    blog: number;       // Standard: 0.5
  };

  sentimentMultipliers: {
    positive: number;   // Standard: 1.0
    neutral: number;    // Standard: 0.8
    negative: number;   // Standard: 0.5
  };
}
```

**Zu klären:**
- 🤔 Brauchen wir einen separaten Faktor für `audio` (Podcast)?
- Oder verwenden Podcasts den `online`-Faktor?
- Oder den `broadcast`-Faktor?

**Vorschlag:**
```typescript
factors: {
  print: number;      // 3
  online: number;     // 1
  broadcast: number;  // 5 (TV/Radio)
  audio: number;      // 2 (Podcast - zwischen online und broadcast)
  blog: number;       // 0.5
}
```

**AVE-Formel bleibt:**
```
AVE = Reichweite × Faktor × Sentiment-Multiplikator
```

---

## 🎯 Implementierungs-Reihenfolge

### Phase 1: Datenstruktur
- [ ] `PublicationType` - `press_agency` entfernen
- [ ] `PublicationFormat` um `'audio'` erweitern
- [ ] `Publication.metrics.audio` Interface hinzufügen
- [ ] `AVESettings.factors.audio` hinzufügen

### Phase 2: Backend-Logik
- [ ] `getReachFromLibraryPublication()` erweitern um audio + broadcast
- [ ] `mapPublicationTypeToMonitoring()` aktualisieren
- [ ] `validatePublicationMetrics()` Funktion erstellen
- [ ] AVE-Berechnung testen mit neuen Formaten

### Phase 3: UI - MetricsSection (Bestehende Felder aktualisieren)
- [ ] Print: `circulation` mit Info-Icon + Pflichtfeld markieren
- [ ] Online: `monthlyPageViews` mit Info-Icon + Pflichtfeld markieren
- [ ] Form-Validierung integrieren

### Phase 4: UI - MetricsSection (Neue Sektionen)
- [ ] Broadcast-Metriken-Sektion hinzufügen (mit Info-Icon + Pflichtfeld)
- [ ] Audio-Metriken-Sektion hinzufügen (mit Info-Icon + Pflichtfeld)
- [ ] Form-State für neue Metriken erweitern
- [ ] InfoTooltip Komponente überprüfen/erstellen

### Phase 5: UI - Type/Format Auswahl
- [ ] Type-Dropdown: `press_agency` entfernen
- [ ] Format-Dropdown basierend auf Type einschränken
- [ ] Ggf. Format auto-select bei eindeutigen Types (podcast → audio)
- [ ] Validierungs-Fehlermeldungen anzeigen

### Phase 6: Migration & Testing
- [ ] Bestehende Publications prüfen (keine press_agency vorhanden?)
- [ ] Test-Publications für alle Formate anlegen
- [ ] Reichweite-Pflichtfeld-Validierung testen
- [ ] AVE-Berechnung End-to-End testen
- [ ] Monitoring-Detailseite testen

---

## ❓ Offene Fragen & Entscheidungen

1. **Podcast-Reichweite**: Downloads oder Listeners als Primär-Metrik?
   - ✅ **Entschieden:** `monthlyDownloads` (Primär), `monthlyListeners` (Fallback)

2. **Press Agency (Nachrichtenagentur)**:
   - ✅ **Entschieden:** Type wird entfernt (verwirrend, kein klarer Use Case)

3. **Reichweite-Felder als Pflichtfelder**:
   - ✅ **Entschieden:** Ja, mit Info-Icon + Tooltip + Validierung

4. **Audio AVE-Faktor**: Welcher Wert?
   - Option A: Wie `online` (Faktor 1)
   - Option B: Wie `broadcast` (Faktor 5)
   - Option C: Eigener Wert zwischen beiden (Faktor 2-3)
   - ⚠️ **Zu klären**

5. **Format-Feld im UI**:
   - Weiterhin manuell wählbar?
   - Oder auto-select basierend auf Type?
   - Oder komplett verstecken bei eindeutigen Types?
   - ⚠️ **Zu klären**

6. **Social Media als Publication-Type**:
   - Macht das Sinn?
   - Oder sollten Social Media Accounts zu Identifiers gehören?
   - ⚠️ **Zu klären**

---

## 📝 Nächste Schritte

1. ✅ Konzept dokumentiert
2. ⏭️ Offene Fragen mit Team klären
3. ⏭️ Weitere Planungsdateien für Detailbereiche erstellen
4. ⏭️ Implementierung starten nach Freigabe

---

**Erstellt von:** Claude
**Review:** Ausstehend
**Freigabe:** Ausstehend
