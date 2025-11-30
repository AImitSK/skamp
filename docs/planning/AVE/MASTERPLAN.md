# AVE-System Refactoring - Masterplan

**Datum:** 2025-01-29
**Status:** 🟡 Planung
**Autor:** Claude
**Review:** Ausstehend

---

## 📋 Executive Summary

### Zielsetzung
Komplettes Refactoring des AVE (Advertising Value Equivalent) Systems zur Herstellung von Konsistenz zwischen:
- **Publication Types** (magazine, newspaper, blog, podcast, etc.)
- **Publication Formats** (print, online, broadcast, audio)
- **Metriken** (circulation, monthlyPageViews, viewership, downloads)
- **AVE-Berechnung** (Reichweite × Faktor × Sentiment)

### Hauptprobleme (IST-Zustand)
1. ❌ **`blog` als Format** - Blog ist ein Type, kein Format → sollte `online` Format nutzen
2. ❌ **Fehlendes `audio` Format** - Podcasts haben kein eigenes Format
3. ❌ **Inkonsistente Labels** - UI zeigt rohe Werte (`blog`, `broadcast`) statt benutzerfreundliche Labels
4. ❌ **Fehlende Validierung** - AVE-relevante Felder sind nicht Pflichtfelder
5. ❌ **Veraltete Defaults** - Neue Organisationen bekommen veraltete `blog`-Faktoren

### Umfang
- **8 Planungsdateien**
- **~15 Dateien** zu ändern
- **3 Core-Bereiche:** Type Definitions, Services, UI Components
- **Keine Daten-Migration** (User-Entscheidung: "Bestehende Einstellungen sind mir egal")

### Geschätzte Komplexität
🔴 **Hoch** - Breaking Changes in Type-Definitionen, mehrere abhängige Services, UI-Updates in 6+ Components

---

## 🎯 Überblick aller Planungsdateien

| # | Planungsdatei | Bereich | Priorität | Abhängig von |
|---|---------------|---------|-----------|--------------|
| **1** | `publication-type-format-metrics-konzept.md` | Type Definitions | 🔴 Sehr hoch | - |
| **2** | `monitoring-types-refactoring.md` | Type Definitions | 🔴 Sehr hoch | #1 |
| **3** | `monitoring-settings-page-refactoring.md` | UI + Service | 🟠 Hoch | #2 |
| **4** | `publications-table-metrics-display.md` | UI | 🟠 Hoch | #1 |
| **5** | `monitoring-modals-refactoring.md` | UI | 🟡 Mittel | #2 |
| **6** | `monitoring-suggestions-outlettype-detection.md` | Service Logic | 🟡 Mittel | #2 |
| **7** | `analytics-media-distribution-labels.md` | UI | 🟢 Niedrig | #2 |
| **8** | `pdf-report-outlet-type-labels.md` | PDF Generation | 🟢 Niedrig | #2 |

---

## 🔄 Abhängigkeiten & Implementierungs-Reihenfolge

```
Phase 1: Fundament (Type Definitions)
├── #1 publication-type-format-metrics-konzept.md
└── #2 monitoring-types-refactoring.md
         │
         ├── Phase 2: Core Services
         │   └── #6 monitoring-suggestions-outlettype-detection.md
         │
         └── Phase 3: UI Components
             ├── #3 monitoring-settings-page-refactoring.md
             ├── #4 publications-table-metrics-display.md
             ├── #5 monitoring-modals-refactoring.md
             ├── #7 analytics-media-distribution-labels.md
             └── #8 pdf-report-outlet-type-labels.md
```

**Regel:** Phase 1 muss komplett abgeschlossen sein, bevor Phase 2/3 starten können!

---

## 📅 Detaillierte Implementierungs-Phasen

### **Phase 1: Type Definitions (Fundament)** 🔴 KRITISCH

**Ziel:** Alle TypeScript-Typen anpassen, sodass `blog` → `audio` ersetzt wird

| Task | Datei | Zeilen | Plan |
|------|-------|--------|------|
| Library Types anpassen | `src/types/library.ts` | 50-80 | #1 |
| `MediaClipping.outletType` anpassen | `src/types/monitoring.ts` | 19 | #2 |
| `AVESettings.factors` anpassen | `src/types/monitoring.ts` | 215-220 | #2 |
| `DEFAULT_AVE_SETTINGS` anpassen | `src/types/monitoring.ts` | 233-239 | #2 |
| `ClippingStats.byOutletType` anpassen | `src/types/monitoring.ts` | 186-191 | #2 |

**Erwartete Errors nach Phase 1:**
- TypeScript wird an ~10-15 Stellen Fehler werfen
- Das ist **erwünscht** - zeigt uns alle Stellen, die angepasst werden müssen

**Test nach Phase 1:**
```bash
npm run type-check
```
Erwartung: Errors an allen Stellen, die in Phase 2/3 gefixt werden

---

### **Phase 2: Core Services & Logic** 🟠

**Ziel:** Services anpassen, sodass sie mit neuen Types arbeiten

| Task | Datei | Plan |
|------|-------|------|
| `detectOutletType()` Helper erstellen | `src/lib/utils/outlet-type-detector.ts` | #6 |
| Auto-Funde Service anpassen | `src/lib/firebase/monitoring-suggestion-service.ts` | #6 |
| AVE Settings Service prüfen | `src/lib/firebase/ave-settings-service.ts` | #2 |
| Stats Calculator prüfen | `src/lib/monitoring-report/core/stats-calculator.ts` | #7, #8 |

**Test nach Phase 2:**
```bash
npm run type-check
```
Erwartung: ~50% weniger Errors als nach Phase 1

---

### **Phase 3: UI Components** 🟡

**Ziel:** UI aktualisieren, Labels statt rohe Werte anzeigen

#### **3.1. Settings Page** (Priorität 1)
| Task | Datei | Plan |
|------|-------|------|
| Form State anpassen | `src/app/dashboard/settings/monitoring/page.tsx` | #3 |
| `blog` → `audio` im UI | `src/app/dashboard/settings/monitoring/page.tsx` | #3 |
| Default-Wert `0.002` | `src/app/dashboard/settings/monitoring/page.tsx` | #3 |

#### **3.2. Publications Table** (Priorität 1)
| Task | Datei | Plan |
|------|-------|------|
| `formatMetric()` Funktion anpassen | `src/app/dashboard/library/publications/page.tsx` | #4 |
| Audio-Metriken hinzufügen | `src/app/dashboard/library/publications/page.tsx` | #4 |
| Icons für alle Formate | `src/app/dashboard/library/publications/page.tsx` | #4 |

#### **3.3. Monitoring Modals** (Priorität 2)
| Task | Datei | Plan |
|------|-------|------|
| MarkPublishedModal Dropdown | `src/components/monitoring/MarkPublishedModal.tsx` | #5 |
| EditClippingModal Dropdown | `src/components/monitoring/EditClippingModal.tsx` | #5 |

#### **3.4. Analytics Dashboard** (Priorität 3)
| Task | Datei | Plan |
|------|-------|------|
| `getOutletTypeLabel()` erstellen | `src/components/monitoring/analytics/MediaDistributionChart.tsx` | #7 |
| Labels im Chart | `src/components/monitoring/analytics/MediaDistributionChart.tsx` | #7 |

#### **3.5. PDF Reports** (Priorität 3)
| Task | Datei | Plan |
|------|-------|------|
| `getOutletTypeLabel()` in Template | `src/lib/monitoring-report/templates/report-template.ts` | #8 |
| Labels statt rohe Werte | `src/lib/monitoring-report/templates/report-template.ts` | #8 |

**Test nach Phase 3:**
```bash
npm run type-check
npm run build
```
Erwartung: 0 Errors, Clean Build

---

### **Phase 4: Testing & Validation** 🧪

**Ziel:** Sicherstellen, dass alle Änderungen korrekt funktionieren

Siehe [Test-Konzept](#-test-konzept) unten.

---

## ✅ Master-Checkliste

### **Phase 1: Type Definitions** ✅ KRITISCH
- [ ] #1: `src/types/library.ts` - Publication Types & Formats anpassen
- [ ] #1: `src/types/library.ts` - Audio Metrics hinzufügen
- [ ] #1: `src/types/library.ts` - Validation Logic aktualisieren
- [ ] #2: `src/types/monitoring.ts` - `MediaClipping.outletType`: `'blog'` → `'audio'`
- [ ] #2: `src/types/monitoring.ts` - `AVESettings.factors`: `blog` → `audio`
- [ ] #2: `src/types/monitoring.ts` - `DEFAULT_AVE_SETTINGS`: `blog: 0.5` → `audio: 0.002`
- [ ] #2: `src/types/monitoring.ts` - `ClippingStats.byOutletType`: `blog` → `audio`
- [ ] **TypeScript Check:** `npm run type-check` (Errors erwartet)

---

### **Phase 2: Core Services** 🟠
- [ ] #6: `src/lib/utils/outlet-type-detector.ts` - `detectOutletType()` Helper erstellen
- [ ] #6: `src/lib/firebase/monitoring-suggestion-service.ts` - Hardcoded `'online'` ersetzen
- [ ] #6: `src/lib/firebase/monitoring-suggestion-service.ts` - `detectOutletType()` integrieren
- [ ] #2: `src/lib/firebase/ave-settings-service.ts` - `calculateAVE()` prüfen
- [ ] #2: `src/lib/firebase/ave-settings-service.ts` - `getOrCreate()` prüfen (DEFAULT_AVE_SETTINGS)
- [ ] #7/#8: `src/lib/monitoring-report/core/stats-calculator.ts` - Statistiken prüfen
- [ ] **TypeScript Check:** `npm run type-check` (~50% Errors behoben)

---

### **Phase 3: UI Components** 🟡

#### **3.1. Settings Page**
- [ ] #3: `src/app/dashboard/settings/monitoring/page.tsx` - Form State: `blog` → `audio`
- [ ] #3: `src/app/dashboard/settings/monitoring/page.tsx` - Input-Feld für `audio` (Default: 0.002)
- [ ] #3: `src/app/dashboard/settings/monitoring/page.tsx` - Label: "Audio/Podcast"
- [ ] #3: `src/app/dashboard/settings/monitoring/page.tsx` - `blog`-Feld entfernen

#### **3.2. Publications Table**
- [ ] #4: `src/app/dashboard/library/publications/page.tsx` - `formatMetric()` anpassen
- [ ] #4: `src/app/dashboard/library/publications/page.tsx` - Audio-Icons (HeadphonesIcon)
- [ ] #4: `src/app/dashboard/library/publications/page.tsx` - Multi-Wert-Display (Icon + Zahl)

#### **3.3. Monitoring Modals**
- [ ] #5: `src/components/monitoring/MarkPublishedModal.tsx` - Dropdown: `blog` → `audio`
- [ ] #5: `src/components/monitoring/MarkPublishedModal.tsx` - Label: "Podcast"
- [ ] #5: `src/components/monitoring/EditClippingModal.tsx` - Dropdown: `blog` → `audio`
- [ ] #5: `src/components/monitoring/EditClippingModal.tsx` - Label: "Podcast"

#### **3.4. Analytics Dashboard**
- [ ] #7: `src/components/monitoring/analytics/MediaDistributionChart.tsx` - `getOutletTypeLabel()` erstellen
- [ ] #7: `src/components/monitoring/analytics/MediaDistributionChart.tsx` - Labels: `audio` → "Podcast"

#### **3.5. PDF Reports**
- [ ] #8: `src/lib/monitoring-report/templates/report-template.ts` - `getOutletTypeLabel()` erstellen
- [ ] #8: `src/lib/monitoring-report/templates/report-template.ts` - Labels: `audio` → "Podcast"

---

### **Phase 4: Testing** 🧪
- [ ] **TypeScript:** `npm run type-check` (0 Errors)
- [ ] **Build:** `npm run build` (Clean Build)
- [ ] **Unit Tests:** Siehe [Test-Konzept](#unit-tests)
- [ ] **Integration Tests:** Siehe [Test-Konzept](#integration-tests)
- [ ] **E2E Tests:** Siehe [Test-Konzept](#manuelle-e2e-test-szenarien)

---

## 🧪 Test-Konzept

### **Unit Tests**

#### **Test 1: Type Definitions**
```typescript
// Test-Datei: src/types/__tests__/monitoring.test.ts
describe('MediaClipping.outletType', () => {
  it('sollte audio akzeptieren', () => {
    const clipping: MediaClipping = {
      outletType: 'audio',
      // ...
    };
    expect(clipping.outletType).toBe('audio');
  });

  it('sollte blog NICHT akzeptieren', () => {
    // @ts-expect-error - blog sollte nicht mehr erlaubt sein
    const clipping: MediaClipping = {
      outletType: 'blog',
    };
  });
});

describe('AVESettings.factors', () => {
  it('sollte audio-Faktor haben', () => {
    const settings = DEFAULT_AVE_SETTINGS;
    expect(settings.factors.audio).toBe(0.002);
  });

  it('sollte KEINEN blog-Faktor haben', () => {
    const settings = DEFAULT_AVE_SETTINGS;
    expect((settings.factors as any).blog).toBeUndefined();
  });
});
```

#### **Test 2: Outlet Type Detector**
```typescript
// Test-Datei: src/lib/utils/__tests__/outlet-type-detector.test.ts
import { detectOutletType } from '../outlet-type-detector';

describe('detectOutletType()', () => {
  it('Podcast → audio', () => {
    const pub: LibraryPublication = {
      type: 'podcast',
      format: 'online',
    };
    expect(detectOutletType(pub)).toBe('audio');
  });

  it('Website → online', () => {
    const pub: LibraryPublication = {
      type: 'website',
      format: 'online',
    };
    expect(detectOutletType(pub)).toBe('online');
  });

  it('Blog → online', () => {
    const pub: LibraryPublication = {
      type: 'blog',
      format: 'online',
    };
    expect(detectOutletType(pub)).toBe('online');
  });

  it('Magazine (print) → print', () => {
    const pub: LibraryPublication = {
      type: 'magazine',
      format: 'print',
    };
    expect(detectOutletType(pub)).toBe('print');
  });

  it('Radio → broadcast', () => {
    const pub: LibraryPublication = {
      type: 'radio',
      format: 'online',
    };
    expect(detectOutletType(pub)).toBe('broadcast');
  });
});
```

#### **Test 3: AVE Calculation**
```typescript
// Test-Datei: src/lib/firebase/__tests__/ave-settings-service.test.ts
describe('calculateAVE()', () => {
  const settings: AVESettings = {
    factors: {
      print: 0.003,      // 3€ pro 1000 Reichweite
      online: 0.001,     // 1€ pro 1000 Reichweite
      broadcast: 0.005,  // 5€ pro 1000 Reichweite
      audio: 0.002,      // 2€ pro 1000 Reichweite
    },
    sentimentMultipliers: {
      positive: 1.0,
      neutral: 0.8,
      negative: 0.5,
    },
  };

  it('Podcast: 120.000 Downloads → 240 € AVE', () => {
    const clipping: MediaClipping = {
      outletType: 'audio',
      reach: 120000,
      sentiment: 'positive',
    };
    const ave = aveSettingsService.calculateAVE(clipping, settings);
    expect(ave).toBe(240); // 120.000 × 0.002 × 1.0 = 240
  });

  it('Online: 50.000 PageViews → 50 € AVE', () => {
    const clipping: MediaClipping = {
      outletType: 'online',
      reach: 50000,
      sentiment: 'positive',
    };
    const ave = aveSettingsService.calculateAVE(clipping, settings);
    expect(ave).toBe(50); // 50.000 × 0.001 × 1.0 = 50
  });

  it('Print: 100.000 Auflage → 300 € AVE', () => {
    const clipping: MediaClipping = {
      outletType: 'print',
      reach: 100000,
      sentiment: 'positive',
    };
    const ave = aveSettingsService.calculateAVE(clipping, settings);
    expect(ave).toBe(300); // 100.000 × 0.003 × 1.0 = 300
  });

  it('Broadcast: 500.000 Zuschauer → 2.500 € AVE', () => {
    const clipping: MediaClipping = {
      outletType: 'broadcast',
      reach: 500000,
      sentiment: 'positive',
    };
    const ave = aveSettingsService.calculateAVE(clipping, settings);
    expect(ave).toBe(2500); // 500.000 × 0.005 × 1.0 = 2.500
  });
});
```

---

### **Integration Tests**

#### **Test 4: Auto-Funde mit Podcast**
```typescript
// Test-Datei: src/lib/firebase/__tests__/monitoring-suggestion-service.integration.test.ts
describe('Auto-Funde: Podcast-Detection', () => {
  it('sollte Podcast als audio klassifizieren', async () => {
    // Mock: Library Publication (Podcast)
    const publication: LibraryPublication = {
      id: 'test-podcast',
      name: 'Tech Podcast',
      type: 'podcast',
      format: 'online',
      metrics: {
        audio: {
          monthlyDownloads: 120000,
        },
      },
    };

    // Mock: RSS-Feed mit Erwähnung
    const mention = {
      title: 'Interview über KI',
      description: '...',
      link: 'https://tech-podcast.de/episode-42',
    };

    // Service ausführen
    const suggestion = await monitoringSuggestionService.create({
      organizationId: 'test-org',
      projectId: 'test-project',
      mention,
      publication,
    });

    // Assertions
    expect(suggestion.outletType).toBe('audio'); // ✅ Nicht 'online'!
    expect(suggestion.reach).toBe(120000);
  });
});
```

---

### **Manuelle E2E Test-Szenarien**

#### **Szenario 1: Neue Organisation erstellen**
1. Neue Organisation in Firebase erstellen
2. `/dashboard/settings/monitoring` aufrufen
3. **Erwartung:**
   - ✅ Formular zeigt `audio`-Faktor (Default: 0.002)
   - ❌ Kein `blog`-Faktor sichtbar

#### **Szenario 2: Publication mit Podcast erstellen**
1. `/dashboard/library/publications` → "Neue Publikation"
2. Type: "Podcast" auswählen
3. Audio-Metriken: `monthlyDownloads: 120000` eingeben
4. Speichern
5. **Erwartung:**
   - ✅ In Tabelle: HeadphonesIcon + "120.000" angezeigt
   - ✅ Format wird als `online` gespeichert (intern)

#### **Szenario 3: Clipping mit Podcast erstellen**
1. `/dashboard/analytics/monitoring/[id]?tab=suggestions` → Auto-Funde
2. Podcast-Erwähnung markieren als "Veröffentlicht"
3. Modal öffnet sich → Dropdown "Medium-Typ"
4. **Erwartung:**
   - ✅ Dropdown zeigt "Podcast" (nicht "Blog")
   - ✅ `outletType` wird als `'audio'` gespeichert

#### **Szenario 4: AVE-Berechnung prüfen**
1. Clipping erstellen:
   - `outletType: 'audio'`
   - `reach: 120000`
   - `sentiment: 'positive'`
2. **Erwartung:**
   - ✅ AVE = 240 € (120.000 × 0.002 × 1.0)

#### **Szenario 5: Analytics Dashboard**
1. `/dashboard/analytics/monitoring/[id]` → Tab "Clipping-Archiv"
2. Medium-Verteilung Chart anschauen
3. **Erwartung:**
   - ✅ Label: "Podcast" (nicht "audio")
   - ✅ Kein Label "Blog" vorhanden

#### **Szenario 6: PDF Report**
1. `/dashboard/analytics/monitoring/[id]` → "PDF Report" Button
2. PDF wird generiert
3. PDF öffnen und "Medium-Verteilung" Sektion prüfen
4. **Erwartung:**
   - ✅ Label: "Podcast" (nicht "audio")
   - ✅ Kein Label "Blog" vorhanden

---

## 📊 Betroffene Dateien (Gesamt)

### **Type Definitions** (2 Dateien)
| Datei | Änderungen |
|-------|-----------|
| `src/types/library.ts` | Publication Types, Formats, Metrics, Validation |
| `src/types/monitoring.ts` | MediaClipping, AVESettings, ClippingStats, DEFAULT_AVE_SETTINGS |

### **Services** (4 Dateien)
| Datei | Änderungen |
|-------|-----------|
| `src/lib/utils/outlet-type-detector.ts` | **NEU:** `detectOutletType()` Helper |
| `src/lib/firebase/monitoring-suggestion-service.ts` | Auto-Funde: Hardcoded `'online'` ersetzen |
| `src/lib/firebase/ave-settings-service.ts` | Prüfen: `calculateAVE()`, `getOrCreate()` |
| `src/lib/monitoring-report/core/stats-calculator.ts` | Statistiken: `blog` → `audio` |

### **UI Components** (6 Dateien)
| Datei | Änderungen |
|-------|-----------|
| `src/app/dashboard/settings/monitoring/page.tsx` | Settings-Page: `blog` → `audio` |
| `src/app/dashboard/library/publications/page.tsx` | Publications Table: `formatMetric()` |
| `src/components/monitoring/MarkPublishedModal.tsx` | Modal: Dropdown `blog` → `audio` |
| `src/components/monitoring/EditClippingModal.tsx` | Modal: Dropdown `blog` → `audio` |
| `src/components/monitoring/analytics/MediaDistributionChart.tsx` | Analytics: `getOutletTypeLabel()` |
| `src/lib/monitoring-report/templates/report-template.ts` | PDF: `getOutletTypeLabel()` |

### **Tests** (3 neue Dateien)
| Datei | Typ |
|-------|-----|
| `src/types/__tests__/monitoring.test.ts` | Unit Tests |
| `src/lib/utils/__tests__/outlet-type-detector.test.ts` | Unit Tests |
| `src/lib/firebase/__tests__/ave-settings-service.test.ts` | Unit Tests |

**Gesamt:** 15 Dateien (12 zu ändern, 3 neue Test-Dateien)

---

## 🔗 Verwandte Planungsdateien

1. `publication-type-format-metrics-konzept.md` - Hauptkonzept, Type/Format/Metrics
2. `monitoring-types-refactoring.md` - Type Definitions (`blog` → `audio`)
3. `monitoring-settings-page-refactoring.md` - Settings-Page UI
4. `publications-table-metrics-display.md` - Publications Table Metriken
5. `monitoring-modals-refactoring.md` - MarkPublishedModal, EditClippingModal
6. `monitoring-suggestions-outlettype-detection.md` - Auto-Funde Detection
7. `analytics-media-distribution-labels.md` - Analytics Dashboard Labels
8. `pdf-report-outlet-type-labels.md` - PDF Report Labels

---

## 🎯 Nächste Schritte

1. ✅ **Masterplan Review** - Dieses Dokument vom Team reviewen lassen
2. ⏳ **Phase 1 starten** - Type Definitions anpassen
3. ⏳ **TypeScript Errors sammeln** - Liste aller Stellen, die gefixt werden müssen
4. ⏳ **Phase 2 durchführen** - Services anpassen
5. ⏳ **Phase 3 durchführen** - UI Components anpassen
6. ⏳ **Phase 4 durchführen** - Testing & Validation

---

**Erstellt von:** Claude
**Review:** Ausstehend
**Freigabe:** Ausstehend
**Version:** 1.0
