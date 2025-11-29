# Monitoring Types: Refactoring von `blog` zu `audio`

**Datum:** 2025-01-29
**Status:** 🟡 Planung
**Bereich:** Monitoring, AVE-Berechnung, Type Definitions
**Bezug:** `monitoring-settings-page-refactoring.md`, `publication-type-format-metrics-konzept.md`

---

## 🎯 Zielsetzung

Die Monitoring-Typen (`MediaClipping.outletType`, `AVESettings.factors`) müssen an unser neues **Type/Format-Konzept** angepasst werden:

- ❌ **Entfernen:** `blog` (ist ein **Type**, kein **Format**)
- ✅ **Hinzufügen:** `audio` (neues Format für Podcasts)

---

## ❌ Aktuelles Problem

### IST-Zustand

**1. `MediaClipping.outletType` (`src/types/monitoring.ts:19`)**
```typescript
outletType: 'print' | 'online' | 'broadcast' | 'blog';
```

**Problem:**
- `blog` ist ein **Publication Type** (wie newspaper, magazine, podcast)
- `blog` ist KEIN **Publication Format**
- Blogs sollten als `'online'` Format klassifiziert werden
- **Fehlende:** `'audio'` für Podcasts

---

**2. `AVESettings.factors` (`src/types/monitoring.ts:215-220`)**
```typescript
factors: {
  print: number;
  online: number;
  broadcast: number;
  blog: number;  // ❌ FALSCH
};
```

**Problem:**
- AVE-Faktoren sollten **Formaten** entsprechen, nicht Types
- `blog` gehört hier nicht rein
- `audio` fehlt für Podcasts

---

**3. `DEFAULT_AVE_SETTINGS` (`src/types/monitoring.ts:233-239`)**
```typescript
factors: {
  print: 3,
  online: 1,
  broadcast: 5,
  blog: 0.5  // ❌ FALSCH
}
```

**Problem:**
- Default-Werte für neue Organisationen sind veraltet
- Neue Organisationen sollten direkt mit `audio`-Faktor starten

---

**4. `ClippingStats.byOutletType` (`src/types/monitoring.ts:186-191`)**
```typescript
byOutletType: {
  print: number;
  online: number;
  broadcast: number;
  blog: number;  // ❌ FALSCH
}
```

**Problem:**
- Statistiken gruppieren nach `blog` statt `audio`

---

## ✅ SOLL-Zustand

### Neue Struktur

**1. `MediaClipping.outletType`**
```typescript
outletType: 'print' | 'online' | 'broadcast' | 'audio';
```

**Mapping:**
- Newspaper (Format: print) → `'print'`
- Newspaper (Format: online) → `'online'`
- Magazine (Format: print) → `'print'`
- Magazine (Format: online) → `'online'`
- Website → `'online'`
- **Blog → `'online'`** (NEU)
- Newsletter → `'online'`
- TV → `'broadcast'`
- Radio → `'broadcast'`
- **Podcast → `'audio'`** (NEU)

---

**2. `AVESettings.factors`**
```typescript
factors: {
  print: number;      // Zeitungen, Magazine (Print-Ausgabe)
  online: number;     // Websites, Blogs, Newsletter, Online-Ausgaben
  broadcast: number;  // TV, Radio
  audio: number;      // Podcasts
};
```

---

**3. `DEFAULT_AVE_SETTINGS`**
```typescript
factors: {
  print: 3,           // Print bleibt unverändert
  online: 1,          // Online bleibt unverändert
  broadcast: 5,       // Broadcast bleibt unverändert
  audio: 0.002        // ✅ NEU - Faktor für Podcasts
},
sentimentMultipliers: {
  positive: 1.0,
  neutral: 0.8,
  negative: 0.5
}
```

**Begründung `audio: 0.002`:**
- Podcast-Downloads: z.B. 120.000 Downloads
- AVE-Berechnung: `120.000 × 0.002 = 240 €`
- Passt zur Wertigkeit von Audio-Content (zwischen Blog und Online)

---

**4. `ClippingStats.byOutletType`**
```typescript
byOutletType: {
  print: number;
  online: number;
  broadcast: number;
  audio: number;  // ✅ NEU
}
```

---

## 🔄 Migrationsplan

### Phase 1: Type-Definitionen anpassen

**Datei:** `src/types/monitoring.ts`

#### **1.1. `MediaClipping.outletType` (Zeile 19)**

**VORHER:**
```typescript
outletType: 'print' | 'online' | 'broadcast' | 'blog';
```

**NACHHER:**
```typescript
outletType: 'print' | 'online' | 'broadcast' | 'audio';
```

---

#### **1.2. `AVESettings.factors` (Zeile 215-220)**

**VORHER:**
```typescript
factors: {
  print: number;
  online: number;
  broadcast: number;
  blog: number;
};
```

**NACHHER:**
```typescript
factors: {
  print: number;
  online: number;
  broadcast: number;
  audio: number;
};
```

---

#### **1.3. `DEFAULT_AVE_SETTINGS` (Zeile 233-239)**

**VORHER:**
```typescript
export const DEFAULT_AVE_SETTINGS: Omit<AVESettings, 'id' | 'organizationId' | 'updatedBy' | 'updatedAt' | 'createdAt'> = {
  factors: {
    print: 3,
    online: 1,
    broadcast: 5,
    blog: 0.5
  },
  sentimentMultipliers: {
    positive: 1.0,
    neutral: 0.8,
    negative: 0.5
  }
};
```

**NACHHER:**
```typescript
export const DEFAULT_AVE_SETTINGS: Omit<AVESettings, 'id' | 'organizationId' | 'updatedBy' | 'updatedAt' | 'createdAt'> = {
  factors: {
    print: 3,
    online: 1,
    broadcast: 5,
    audio: 0.002
  },
  sentimentMultipliers: {
    positive: 1.0,
    neutral: 0.8,
    negative: 0.5
  }
};
```

---

#### **1.4. `ClippingStats.byOutletType` (Zeile 186-191)**

**VORHER:**
```typescript
byOutletType: {
  print: number;
  online: number;
  broadcast: number;
  blog: number;
}
```

**NACHHER:**
```typescript
byOutletType: {
  print: number;
  online: number;
  broadcast: number;
  audio: number;
}
```

---

### Phase 2: AVE Settings Service anpassen

**Datei:** `src/lib/firebase/ave-settings-service.ts`

**Keine Code-Änderungen nötig**, da der Service bereits mit den Types arbeitet.

**Aber prüfen:**
- Verwendet `DEFAULT_AVE_SETTINGS` korrekt für neue Organisationen
- `calculateAVE()` Funktion verwendet `settings.factors[clipping.outletType]`

**Expected behavior:**
```typescript
// Beispiel: Podcast-Clipping
const clipping: MediaClipping = {
  outletType: 'audio',
  reach: 120000,
  sentiment: 'positive'
};

// AVE-Berechnung:
// reach × factor × sentimentMultiplier
// 120000 × 0.002 × 1.0 = 240 €
```

---

### Phase 3: Migration bestehender Daten (OPTIONAL)

**Entscheidung:** User sagte "Bestehende Einstellungen sind mir egal. Keine Migration nötig."

#### **Option A: Keine Migration (empfohlen)**
- Bestehende `AVESettings` in Firestore bleiben unverändert
- User müssen manuell auf `/dashboard/settings/monitoring` gehen
- Dort `audio`-Faktor hinzufügen (sobald UI angepasst ist)

#### **Option B: Einmalige Migration (falls gewünscht)**

**Script:** `scripts/migrate-ave-settings.ts`

```typescript
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function migrateAVESettings() {
  const settingsRef = collection(db, 'aveSettings');
  const snapshot = await getDocs(settingsRef);

  let migratedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    // Prüfen ob alte Struktur (mit 'blog')
    if (data.factors?.blog !== undefined) {
      const newFactors = {
        print: data.factors.print || 3,
        online: data.factors.online || 1,
        broadcast: data.factors.broadcast || 5,
        audio: 0.002  // Default für audio
      };

      // 'blog' entfernen, 'audio' hinzufügen
      await updateDoc(doc(db, 'aveSettings', docSnap.id), {
        factors: newFactors,
        updatedAt: new Date()
      });

      migratedCount++;
      console.log(`✅ Migriert: ${docSnap.id}`);
    }
  }

  console.log(`\n✅ Migration abgeschlossen: ${migratedCount} Settings migriert`);
}

migrateAVESettings();
```

**Ausführung:**
```bash
npx tsx scripts/migrate-ave-settings.ts
```

---

#### **Option C: Hybrid-Ansatz (Graceful Degradation)**

**AVE Settings Service** könnte beim Laden alte Settings automatisch ergänzen:

```typescript
async get(organizationId: string): Promise<AVESettings | null> {
  const docRef = doc(db, 'aveSettings', organizationId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data() as AVESettings;

  // ✅ Automatische Ergänzung fehlender Faktoren
  if (!data.factors.audio) {
    data.factors.audio = 0.002;  // Default für audio
  }

  // ❌ Entfernen veralteter Faktoren
  if ('blog' in data.factors) {
    delete (data.factors as any).blog;
  }

  return data;
}
```

**Vorteil:** Keine manuelle Migration nötig, funktioniert automatisch beim Laden

---

### Phase 4: ClippingArchive Component prüfen

**Datei:** `src/components/monitoring/ClippingArchive.tsx`

**Keine Änderungen nötig**, Component verwendet bereits:
```typescript
const calculateAVE = (clipping: MediaClipping): number => {
  if (clipping.ave) return clipping.ave;
  if (!aveSettings) return 0;
  return aveSettingsService.calculateAVE(clipping, aveSettings);
};
```

**Aber prüfen:**
- Badge für `outletType` zeigt korrekt `audio` statt `blog` an (Zeile 162-164)
- Statistiken (`ClippingStats`) verwenden neue Struktur

---

### Phase 5: UI-Anpassungen

**Dateien zu prüfen:**

#### **5.1. Outlet-Type Badge in ClippingArchive**
```typescript
// src/components/monitoring/ClippingArchive.tsx:162-164
<Badge color="zinc" className="mt-1">
  {clipping.outletType}
</Badge>
```

**Mapping für deutsche Labels:**
```typescript
const getOutletTypeLabel = (type: MediaClipping['outletType']): string => {
  switch (type) {
    case 'print': return 'Print';
    case 'online': return 'Online';
    case 'broadcast': return 'Broadcast';
    case 'audio': return 'Podcast';  // ✅ NEU
  }
};
```

#### **5.2. Settings-Page**
Bereits geplant in: `monitoring-settings-page-refactoring.md`

---

## 📊 Betroffene Dateien

| Datei | Änderungen | Status |
|-------|-----------|--------|
| `src/types/monitoring.ts` | `MediaClipping.outletType`, `AVESettings.factors`, `DEFAULT_AVE_SETTINGS`, `ClippingStats.byOutletType` | ⏳ TODO |
| `src/lib/firebase/ave-settings-service.ts` | Prüfen, ob Migration/Fallback nötig | ⏳ TODO |
| `src/components/monitoring/ClippingArchive.tsx` | Label-Mapping für `audio` | ⏳ TODO |
| `src/app/dashboard/settings/monitoring/page.tsx` | UI anpassen (siehe `monitoring-settings-page-refactoring.md`) | ⏳ TODO |
| `scripts/migrate-ave-settings.ts` | (Optional) Einmalige Migration | ⏳ Optional |

---

## 🎯 Implementierungs-Schritte

### **Phase 1: Type-Definitionen** ✅ Priorität 1
- [ ] `MediaClipping.outletType`: `'blog'` → `'audio'`
- [ ] `AVESettings.factors`: `blog` → `audio`
- [ ] `DEFAULT_AVE_SETTINGS`: `blog: 0.5` → `audio: 0.002`
- [ ] `ClippingStats.byOutletType`: `blog` → `audio`

### **Phase 2: Service-Prüfung** ✅ Priorität 2
- [ ] `ave-settings-service.ts`: `calculateAVE()` prüfen
- [ ] `ave-settings-service.ts`: `getOrCreate()` prüfen (verwendet DEFAULT_AVE_SETTINGS)
- [ ] Optional: Graceful Degradation implementieren (Hybrid-Ansatz)

### **Phase 3: Migration (OPTIONAL)** ⏸️ Optional
- [ ] Entscheiden: Keine Migration / Script / Hybrid
- [ ] Falls Script: `scripts/migrate-ave-settings.ts` erstellen
- [ ] Falls Script: Ausführen und verifizieren

### **Phase 4: UI-Anpassungen** ✅ Priorität 3
- [ ] `ClippingArchive.tsx`: `getOutletTypeLabel()` Funktion hinzufügen
- [ ] `ClippingArchive.tsx`: Badge-Text für `audio` = "Podcast"
- [ ] Settings-Page: siehe `monitoring-settings-page-refactoring.md`

### **Phase 5: Testing** ✅ Priorität 4
- [ ] Test: Neues Clipping mit `outletType: 'audio'` erstellen
- [ ] Test: AVE-Berechnung für Podcast prüfen
- [ ] Test: Statistiken (`ClippingStats`) prüfen
- [ ] Test: Settings-Page speichern/laden prüfen

---

## 🔗 Verwandte Dokumente

- `monitoring-settings-page-refactoring.md` - Settings-Page Umbau
- `publication-type-format-metrics-konzept.md` - Type/Format-Hauptkonzept
- `publications-table-metrics-display.md` - Metriken-Anzeige

---

## ✅ Entscheidungen

1. **Migration bestehender Settings:**
   - ❌ **Keine manuelle Migration** (User-Entscheidung: "Bestehende Einstellungen sind mir egal")
   - ✅ **Empfehlung:** Hybrid-Ansatz (Graceful Degradation im Service)

2. **Default-Wert für `audio`:**
   - ✅ **0.002** (120.000 Downloads → 240 € AVE)

3. **Blog-Mapping:**
   - ✅ Blogs werden als `'online'` klassifiziert
   - ✅ `blog` wird komplett aus `outletType` entfernt

4. **Podcast-Label in UI:**
   - ✅ `outletType: 'audio'` → Badge-Text: "Podcast"

---

**Erstellt von:** Claude
**Review:** Ausstehend
**Freigabe:** Ausstehend
