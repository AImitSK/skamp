# Monitoring Settings: AVE-Faktoren Umbau

**Datum:** 2025-01-29
**Status:** 🔴 Bereit zur Implementierung
**Bereich:** Settings, AVE-Berechnung
**Bezug:** `publication-type-format-metrics-konzept.md`

---

## 🎯 Zielsetzung

Die AVE-Faktoren auf der Settings-Seite (`/dashboard/settings/monitoring`) konsistent zu den Publication-Formaten machen:

- ❌ **Blog-Faktor entfernen** (ist Type, kein Format)
- ✅ **Audio-Faktor hinzufügen** (für Podcasts)
- ✅ Konsistenz: Faktoren = Formate (`print`, `online`, `broadcast`, `audio`)

---

## ❌ Aktueller Zustand

### Settings-Seite (`src/app/dashboard/settings/monitoring/page.tsx`)

**AVE-Faktoren (Zeile 148-196):**

```typescript
factors: {
  print: number,      // ✅ OK
  online: number,     // ✅ OK
  broadcast: number,  // ✅ OK
  blog: number        // ❌ FALSCH - ist Type, kein Format!
}
```

**Problem:**
- `blog` ist ein **Publication Type**, NICHT ein Format
- Type `blog` verwendet Format `online`
- Kein Faktor für Format `audio` (Podcasts)

---

## ✅ Neuer Zustand

### AVE-Faktoren nach Umbau

```typescript
factors: {
  print: number,      // Print-Medien
  online: number,     // Online-Medien (inkl. Blogs!)
  broadcast: number,  // TV/Radio
  audio: number       // 🆕 NEU: Podcasts
}
```

**Mapping Format → Faktor:**

| Publication Format | AVE-Faktor | Beschreibung |
|-------------------|------------|--------------|
| `print` | `factors.print` | Zeitungen, Magazine, Fachzeitschriften |
| `online` | `factors.online` | Websites, Blogs, Newsletter, Social Media |
| `broadcast` | `factors.broadcast` | TV, Radio (Live) |
| `audio` | `factors.audio` | Podcasts (On-Demand) |
| `both` | `MAX(factors.print, factors.online)` | Hybrid, höherer Faktor wird verwendet |

---

## 🔧 Änderungen im Detail

### 1. TypeScript Interface (`src/types/monitoring.ts`)

**Vorher:**
```typescript
export interface AVESettings {
  factors: {
    print: number;
    online: number;
    broadcast: number;
    blog: number;        // ❌ Entfernen
  };
  // ...
}
```

**Nachher:**
```typescript
export interface AVESettings {
  factors: {
    print: number;
    online: number;
    broadcast: number;
    audio: number;       // ✅ Neu
  };
  // ...
}
```

---

### 2. Default Settings (`src/types/monitoring.ts`)

**Vorher:**
```typescript
export const DEFAULT_AVE_SETTINGS: AVESettings = {
  factors: {
    print: 0.003,      // 3€ pro 1000
    online: 0.001,     // 1€ pro 1000
    broadcast: 0.005,  // 5€ pro 1000
    blog: 0.0005       // ❌ Entfernen
  },
  // ...
}
```

**Nachher:**
```typescript
export const DEFAULT_AVE_SETTINGS: AVESettings = {
  factors: {
    print: 0.003,      // 3€ pro 1000 Reichweite
    online: 0.001,     // 1€ pro 1000 Reichweite
    broadcast: 0.005,  // 5€ pro 1000 Reichweite
    audio: 0.002       // ✅ NEU: 2€ pro 1000 Reichweite
  },
  // ...
}
```

**Begründung Audio-Faktor (0.002):**
- Zwischen `online` (0.001) und `broadcast` (0.005)
- Podcasts haben höhere Engagement als Standard-Online, aber niedriger als TV/Radio
- User kann anpassen falls nötig

---

### 3. Settings-Page UI (`src/app/dashboard/settings/monitoring/page.tsx`)

#### 3.1 Form State (Zeile 23-31)

**Vorher:**
```typescript
const [formData, setFormData] = useState({
  printFactor: DEFAULT_AVE_SETTINGS.factors.print,
  onlineFactor: DEFAULT_AVE_SETTINGS.factors.online,
  broadcastFactor: DEFAULT_AVE_SETTINGS.factors.broadcast,
  blogFactor: DEFAULT_AVE_SETTINGS.factors.blog,  // ❌ Entfernen
  // ...
});
```

**Nachher:**
```typescript
const [formData, setFormData] = useState({
  printFactor: DEFAULT_AVE_SETTINGS.factors.print,
  onlineFactor: DEFAULT_AVE_SETTINGS.factors.online,
  broadcastFactor: DEFAULT_AVE_SETTINGS.factors.broadcast,
  audioFactor: DEFAULT_AVE_SETTINGS.factors.audio,  // ✅ Neu
  // ...
});
```

#### 3.2 Load Settings (Zeile 44-52)

**Vorher:**
```typescript
setFormData({
  printFactor: data.factors.print,
  onlineFactor: data.factors.online,
  broadcastFactor: data.factors.broadcast,
  blogFactor: data.factors.blog,  // ❌ Entfernen
  // ...
});
```

**Nachher:**
```typescript
setFormData({
  printFactor: data.factors.print,
  onlineFactor: data.factors.online,
  broadcastFactor: data.factors.broadcast,
  audioFactor: data.factors.audio,  // ✅ Neu
  // ...
});
```

#### 3.3 Save Settings (Zeile 70-75)

**Vorher:**
```typescript
factors: {
  print: formData.printFactor,
  online: formData.onlineFactor,
  broadcast: formData.broadcastFactor,
  blog: formData.blogFactor,  // ❌ Entfernen
}
```

**Nachher:**
```typescript
factors: {
  print: formData.printFactor,
  online: formData.onlineFactor,
  broadcast: formData.broadcastFactor,
  audio: formData.audioFactor,  // ✅ Neu
}
```

#### 3.4 Reset Function (Zeile 94-99)

**Vorher:**
```typescript
setFormData({
  printFactor: DEFAULT_AVE_SETTINGS.factors.print,
  onlineFactor: DEFAULT_AVE_SETTINGS.factors.online,
  broadcastFactor: DEFAULT_AVE_SETTINGS.factors.broadcast,
  blogFactor: DEFAULT_AVE_SETTINGS.factors.blog,  // ❌ Entfernen
  // ...
});
```

**Nachher:**
```typescript
setFormData({
  printFactor: DEFAULT_AVE_SETTINGS.factors.print,
  onlineFactor: DEFAULT_AVE_SETTINGS.factors.online,
  broadcastFactor: DEFAULT_AVE_SETTINGS.factors.broadcast,
  audioFactor: DEFAULT_AVE_SETTINGS.factors.audio,  // ✅ Neu
  // ...
});
```

#### 3.5 UI Felder (Zeile 148-196)

**Vorher: 4 Felder (Print, Online, Broadcast, Blog)**

**Nachher: 4 Felder (Print, Online, Broadcast, Audio)**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Print */}
  <Field>
    <Label>Print (€ pro 1.000 Reichweite)</Label>
    <Description>Zeitungen, Magazine, Fachzeitschriften (gedruckt)</Description>
    <Input
      type="number"
      step="0.001"
      min="0"
      value={formData.printFactor}
      onChange={(e) => setFormData({ ...formData, printFactor: parseFloat(e.target.value) || 0 })}
    />
  </Field>

  {/* Online */}
  <Field>
    <Label>Online (€ pro 1.000 Reichweite)</Label>
    <Description>Websites, Blogs, Newsletter, Social Media</Description>
    <Input
      type="number"
      step="0.001"
      min="0"
      value={formData.onlineFactor}
      onChange={(e) => setFormData({ ...formData, onlineFactor: parseFloat(e.target.value) || 0 })}
    />
  </Field>

  {/* Broadcast */}
  <Field>
    <Label>Broadcast (€ pro 1.000 Reichweite)</Label>
    <Description>TV und Radio (Live-Übertragung)</Description>
    <Input
      type="number"
      step="0.001"
      min="0"
      value={formData.broadcastFactor}
      onChange={(e) => setFormData({ ...formData, broadcastFactor: parseFloat(e.target.value) || 0 })}
    />
  </Field>

  {/* Audio - NEU! */}
  <Field>
    <Label>Audio (€ pro 1.000 Reichweite)</Label>
    <Description>Podcasts, Audio-Streaming (On-Demand)</Description>
    <Input
      type="number"
      step="0.001"
      min="0"
      value={formData.audioFactor}
      onChange={(e) => setFormData({ ...formData, audioFactor: parseFloat(e.target.value) || 0 })}
    />
  </Field>
</div>
```

**Wichtig:**
- ✅ Label: "€ pro 1.000 Reichweite" (klarer als "€ pro Reichweite")
- ✅ Description bei Online: "Websites, **Blogs**, Newsletter..." → macht klar dass Blogs hier drunter fallen
- ✅ step="0.001" → ermöglicht präzise Eingabe (0.003 = 3€ pro 1000)

---

### 4. Berechnungsbeispiel (Zeile 247-257)

**Aktualisieren auf dynamische Beispiele:**

**Vorher: Nur Online-Beispiel**

**Nachher: Mehrere Beispiele**

```tsx
<div className="border-t border-gray-200 pt-6">
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
    <h4 className="text-sm font-semibold text-blue-900 mb-2">Berechnungsbeispiele</h4>

    {/* Beispiel 1: Online */}
    <div className="text-sm text-blue-800">
      <strong>Online-Artikel</strong> (positiv, 1.000.000 Page Views):<br />
      <code className="bg-white px-2 py-1 rounded mt-1 inline-block">
        1.000.000 × {formData.onlineFactor} × {formData.positiveMultiplier} = {(1000000 * formData.onlineFactor * formData.positiveMultiplier).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
      </code>
    </div>

    {/* Beispiel 2: Print */}
    <div className="text-sm text-blue-800">
      <strong>Print-Artikel</strong> (positiv, 50.000 Auflage):<br />
      <code className="bg-white px-2 py-1 rounded mt-1 inline-block">
        50.000 × {formData.printFactor} × {formData.positiveMultiplier} = {(50000 * formData.printFactor * formData.positiveMultiplier).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
      </code>
    </div>

    {/* Beispiel 3: Podcast */}
    <div className="text-sm text-blue-800">
      <strong>Podcast-Erwähnung</strong> (positiv, 120.000 Downloads):<br />
      <code className="bg-white px-2 py-1 rounded mt-1 inline-block">
        120.000 × {formData.audioFactor} × {formData.positiveMultiplier} = {(120000 * formData.audioFactor * formData.positiveMultiplier).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
      </code>
    </div>
  </div>
</div>
```

---

### 5. AVE-Berechnung Service (`src/lib/firebase/ave-settings-service.ts`)

**calculateAVE Funktion aktualisieren:**

```typescript
calculateAVE(clipping: MediaClipping, settings: AVESettings): number {
  if (!clipping.reach) return 0;

  // Format zu Faktor Mapping
  let factor = 0;
  switch (clipping.outletType) {
    case 'print':
      factor = settings.factors.print;
      break;
    case 'online':
      factor = settings.factors.online;
      break;
    case 'broadcast':
      factor = settings.factors.broadcast;
      break;
    case 'blog':
      // ⚠️ MIGRATION: blog verwendet jetzt online-Faktor
      factor = settings.factors.online;
      break;
    // ✅ NEU: audio
    // (wird automatisch funktionieren wenn Format audio existiert)
    default:
      factor = 0;
  }

  // Sentiment-Multiplikator
  const sentimentMultiplier = settings.sentimentMultipliers[clipping.sentiment] || 1.0;

  // Berechnung
  return Math.round(clipping.reach * factor * sentimentMultiplier);
}
```

**WICHTIG:**
- `clipping.outletType` kann noch `'blog'` sein (Legacy)
- Fallback: `blog` → `online` Faktor verwenden

---

## 🎯 Implementierungs-Checkliste

### Phase 1: Types & Defaults
- [ ] `src/types/monitoring.ts`: `blog` aus `AVESettings.factors` entfernen
- [ ] `src/types/monitoring.ts`: `audio` zu `AVESettings.factors` hinzufügen
- [ ] `src/types/monitoring.ts`: `DEFAULT_AVE_SETTINGS.factors.blog` entfernen
- [ ] `src/types/monitoring.ts`: `DEFAULT_AVE_SETTINGS.factors.audio = 0.002` hinzufügen

### Phase 2: Settings Page UI
- [ ] `src/app/dashboard/settings/monitoring/page.tsx`: FormData State anpassen
  - [ ] `blogFactor` entfernen
  - [ ] `audioFactor` hinzufügen
- [ ] `loadSettings()`: Mapping anpassen
- [ ] `handleSubmit()`: Mapping anpassen
- [ ] `handleReset()`: Mapping anpassen
- [ ] UI: Blog-Feld entfernen, Audio-Feld hinzufügen
- [ ] Labels aktualisieren: "€ pro 1.000 Reichweite"
- [ ] Description bei Online: "Websites, Blogs, Newsletter..." (Blogs erwähnen!)
- [ ] Berechnungsbeispiele erweitern (3 Beispiele statt 1)

### Phase 3: AVE-Berechnung
- [ ] `src/lib/firebase/ave-settings-service.ts`: `calculateAVE()` anpassen
  - [ ] Legacy-Support: `blog` → `online` Faktor
  - [ ] Neue Formate funktionieren automatisch

### Phase 4: Testing
- [ ] Settings-Seite öffnen → Default-Werte prüfen
- [ ] Werte ändern und speichern
- [ ] Berechnungsbeispiele prüfen (Zahlen korrekt?)
- [ ] Neues Clipping mit Format `audio` erstellen → AVE korrekt?
- [ ] Altes Clipping mit `outletType: 'blog'` → AVE funktioniert noch?

---

## 📊 Vorher/Nachher Vergleich

### AVE-Faktoren

| | Vorher | Nachher | Änderung |
|---|--------|---------|----------|
| Print | ✅ 0.003 | ✅ 0.003 | Unverändert |
| Online | ✅ 0.001 | ✅ 0.001 | Unverändert |
| Broadcast | ✅ 0.005 | ✅ 0.005 | Unverändert |
| Blog | ❌ 0.0005 | ❌ Entfernt | - |
| Audio | ❌ - | ✅ 0.002 | **NEU** |

### Mapping Publication → Faktor

| Publication Type/Format | Vorher | Nachher |
|------------------------|--------|---------|
| Magazine (print) | `factors.print` | `factors.print` ✅ |
| Website (online) | `factors.online` | `factors.online` ✅ |
| Blog (online) | `factors.blog` ❌ | `factors.online` ✅ |
| Podcast (audio) | - ❌ | `factors.audio` ✅ |
| TV (broadcast) | `factors.broadcast` | `factors.broadcast` ✅ |

---

## ⚠️ Breaking Changes

### Firestore AVESettings Dokumente

**Alte Struktur:**
```json
{
  "factors": {
    "print": 0.003,
    "online": 0.001,
    "broadcast": 0.005,
    "blog": 0.0005
  }
}
```

**Neue Struktur:**
```json
{
  "factors": {
    "print": 0.003,
    "online": 0.001,
    "broadcast": 0.005,
    "audio": 0.002
  }
}
```

**Migration:** KEINE!
- User-Entscheidung: "Bestehende Einstellungen egal, keine Migration"
- Beim ersten Laden: `getOrCreate()` erstellt neue Defaults
- Alte `blog`-Werte werden ignoriert

---

## 🔗 Verwandte Dokumente

- `publication-type-format-metrics-konzept.md` - Haupt-Konzept
- `src/app/dashboard/settings/monitoring/page.tsx` - Settings Page
- `src/types/monitoring.ts` - AVESettings Interface
- `src/lib/firebase/ave-settings-service.ts` - AVE-Berechnung

---

**Erstellt von:** Claude
**Bereit zur Implementierung:** ✅ JA
