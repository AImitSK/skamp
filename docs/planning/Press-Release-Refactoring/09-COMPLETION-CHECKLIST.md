# PM-Refactoring Completion Checklist

**Ziel:** Verbleibende Arbeiten für vollständige Produktionsreife
**Status:** 5/6 Phasen abgeschlossen, UI-Integration & Testing ausstehend

---

## Kritischer Pfad (Blocker für MVP)

### 1. ❌ usePMVorlage Hook erstellen
**Datei:** `src/lib/hooks/usePMVorlage.ts`
**Aufwand:** 2-3 Stunden
**Priorität:** 🔴 KRITISCH

**Implementierung:**

```typescript
// src/lib/hooks/usePMVorlage.ts
import { useState, useEffect } from 'react';
import type { PMVorlage } from '@/types/pm-vorlage';
import type { FaktenMatrix } from '@/types/fakten-matrix';

export function usePMVorlage(projectId: string, companyId: string, companyName: string) {
  const [vorlage, setVorlage] = useState<PMVorlage | null>(null);
  const [faktenMatrix, setFaktenMatrix] = useState<FaktenMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOutdated, setIsOutdated] = useState(false);

  // Load PM-Vorlage on mount
  useEffect(() => {
    loadVorlage();
  }, [projectId]);

  const loadVorlage = async () => {
    try {
      const response = await fetch(`/api/ai/pm-vorlage?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setVorlage(data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der PM-Vorlage:', err);
    }
  };

  const generate = async (
    targetGroup: 'ZG1' | 'ZG2' | 'ZG3',
    dnaContacts: Array<{ id: string; name: string; position: string }>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/pm-vorlage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          companyId,
          companyName,
          targetGroup,
          dnaContacts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generierung fehlgeschlagen');
      }

      const data = await response.json();
      setVorlage(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteVorlage = async () => {
    setIsLoading(true);
    try {
      await fetch(`/api/ai/pm-vorlage?projectId=${projectId}`, {
        method: 'DELETE',
      });
      setVorlage(null);
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToEditor = async () => {
    if (!vorlage) return;
    // TODO: TipTap Editor Integration
    console.log('Copy to Editor:', vorlage.htmlContent);
  };

  return {
    vorlage,
    faktenMatrix,
    isLoading,
    error,
    isOutdated,
    generate,
    deleteVorlage,
    copyToEditor,
    reload: loadVorlage,
  };
}
```

**Akzeptanzkriterien:**
- ✅ Hook lädt bestehende PM-Vorlage beim Mount
- ✅ `generate()` ruft API auf und aktualisiert State
- ✅ `deleteVorlage()` löscht und updated State
- ✅ Loading & Error States korrekt
- ✅ TypeScript ohne Fehler

---

### 2. ❌ Strategie-Tab Integration
**Datei:** `src/app/dashboard/projects/[projectId]/components/tab-content/StrategieTabContent.tsx`
**Aufwand:** 1-2 Stunden
**Priorität:** 🔴 KRITISCH

**Änderungen:**

```tsx
// In StrategieTabContent.tsx
import { PMVorlageSection } from '@/components/projects/strategy/PMVorlageSection';
import { usePMVorlage } from '@/lib/hooks/usePMVorlage';

export function StrategieTabContent({ projectId, companyId, companyName }: Props) {
  // Bestehende Hooks...
  const { dnaSynthese, hasDNASynthese } = useDNASynthese(companyId);
  const { faktenMatrix, hasFaktenMatrix } = useFaktenMatrix(projectId);

  // NEU: PM-Vorlage Hook
  const {
    vorlage,
    isLoading: pmLoading,
    generate: generatePM,
    deleteVorlage: deletePM,
    copyToEditor,
  } = usePMVorlage(projectId, companyId, companyName);

  // DNA-Kontakte aus MarkenDNA laden (für Speaker-Lookup)
  const dnaContacts = dnaSynthese?.contacts || [];

  return (
    <div className="space-y-6">
      {/* Bestehende Sections */}
      <MarkenDNASection companyId={companyId} />
      <KernbotschaftSection projectId={projectId} />

      {/* NEU: PM-Vorlage Section */}
      <PMVorlageSection
        projectId={projectId}
        companyId={companyId}
        companyName={companyName}
        pmVorlage={vorlage}
        faktenMatrix={faktenMatrix}
        hasDNASynthese={hasDNASynthese}
        hasFaktenMatrix={hasFaktenMatrix}
        dnaContacts={dnaContacts}
        onGenerate={generatePM}
        onDelete={deletePM}
        onCopyToEditor={copyToEditor}
        isLoading={pmLoading}
      />
    </div>
  );
}
```

**Akzeptanzkriterien:**
- ✅ PMVorlageSection ist sichtbar im Strategie-Tab
- ✅ Generierung funktioniert (Button → Flow → Anzeige)
- ✅ Löschen funktioniert
- ✅ "Copy to Editor" funktioniert (mind. in Clipboard)
- ✅ Loading States korrekt
- ✅ Keine Console-Errors

---

### 3. ❌ E2E-Test ausführen & validieren
**Skript:** `scripts/test-pm-vorlage-e2e.ts`
**Aufwand:** 1 Stunde (inkl. Bugfixes)
**Priorität:** 🔴 KRITISCH

**Schritte:**

1. **Firestore Emulator starten**
   ```bash
   npm run firebase:emulators
   ```

2. **Test ausführen**
   ```bash
   npx tsx scripts/test-pm-vorlage-e2e.ts
   ```

3. **Fehler beheben**
   - Fehlende Imports
   - Firestore-Connection-Probleme
   - Genkit-API-Änderungen

4. **Ziel: 6/6 Tests bestanden**

**Akzeptanzkriterien:**
- ✅ Test 1: Fakten-Matrix Service ✅
- ✅ Test 2: PM-Vorlage Flow ✅
- ✅ Test 3: Parsing-Validierung ✅
- ✅ Test 4: DNA-Compliance ✅
- ✅ Test 5: SEO-Score ≥85% ✅
- ✅ Test 6: Firestore-Integration ✅

---

## Wichtig (für vollständige Features)

### 4. ❌ Wizard-Integration (saveFaktenMatrix Tool)
**Datei:** `src/lib/ai/agentic/skills/skill-sidebar.ts`
**Aufwand:** 2-3 Stunden
**Priorität:** 🟡 WICHTIG

**Implementierung:**

```typescript
// In skill-sidebar.ts
import { faktenMatrixService } from '@/lib/firebase/fakten-matrix-service';
import { FaktenMatrixSchema } from '@/lib/ai/schemas/fakten-matrix-schemas';

// NEU: Tool für Fakten-Matrix speichern
const saveFaktenMatrixTool = ai.defineTool({
  name: 'saveFaktenMatrix',
  description: `Speichert die gesammelten Fakten strukturiert für die Pressemeldungs-Generierung.

Rufe dieses Tool auf, wenn alle W-Fragen beantwortet sind:
- Was passiert genau? (event)
- Wo findet es statt? (location)
- Wann findet es statt? (date)
- Was ist neu/anders? (delta)
- Welche Beweise gibt es? (evidence)
- Wer wird zitiert? (speakerId aus DNA-Kontakten)
- Was sagt die Person? (rawStatement)
`,
  inputSchema: FaktenMatrixSchema,
}, async (data, context) => {
  try {
    const projectId = context.projectId; // Aus Flow-Context
    await faktenMatrixService.save(projectId, data);
    return {
      success: true,
      message: 'Fakten-Matrix erfolgreich gespeichert! Du kannst jetzt im Strategie-Tab eine PM-Vorlage generieren.',
    };
  } catch (error) {
    return {
      success: false,
      message: `Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannt'}`,
    };
  }
});

// Wizard-Prompt erweitern
const WIZARD_SYSTEM_PROMPT = `
... bestehender Prompt ...

**ABSCHLUSS:**
Wenn du alle W-Fragen beantwortet hast, rufe das Tool "saveFaktenMatrix" auf:
{
  "hook": {
    "event": "Was genau passiert",
    "location": "Ort",
    "date": "Zeitpunkt"
  },
  "details": {
    "delta": "Neuigkeitswert",
    "evidence": "Harte Beweise"
  },
  "quote": {
    "speakerId": "ID aus DNA-Kontakten",
    "rawStatement": "Kernaussage des Sprechers"
  }
}
`;
```

**Akzeptanzkriterien:**
- ✅ Tool ist in Wizard registriert
- ✅ Wizard-Prompt enthält Anweisung zum Tool-Call
- ✅ Bei Tool-Call: Fakten-Matrix wird in Firestore gespeichert
- ✅ User bekommt Feedback über Erfolg
- ✅ TypeScript ohne Fehler

---

### 5. ❌ useFaktenMatrix Hook erstellen (optional, für UI)
**Datei:** `src/lib/hooks/useFaktenMatrix.ts`
**Aufwand:** 1 Stunde
**Priorität:** 🟡 WICHTIG

**Implementierung:**

```typescript
// src/lib/hooks/useFaktenMatrix.ts
import { useState, useEffect } from 'react';
import { faktenMatrixService } from '@/lib/firebase/fakten-matrix-service';
import type { FaktenMatrix } from '@/types/fakten-matrix';

export function useFaktenMatrix(projectId: string) {
  const [faktenMatrix, setFaktenMatrix] = useState<FaktenMatrix | null>(null);
  const [hasFaktenMatrix, setHasFaktenMatrix] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFaktenMatrix();
  }, [projectId]);

  const loadFaktenMatrix = async () => {
    setIsLoading(true);
    try {
      const data = await faktenMatrixService.get(projectId);
      setFaktenMatrix(data);
      setHasFaktenMatrix(!!data);
    } catch (error) {
      console.error('Fehler beim Laden der Fakten-Matrix:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    faktenMatrix,
    hasFaktenMatrix,
    isLoading,
    reload: loadFaktenMatrix,
  };
}
```

**Akzeptanzkriterien:**
- ✅ Hook lädt Fakten-Matrix aus Firestore
- ✅ `hasFaktenMatrix` boolean für Conditional Rendering
- ✅ Loading State
- ✅ Kann in StrategieTabContent verwendet werden

---

## Nice-to-Have (kann später)

### 6. ❌ Phase 6: Profi-Modus UI Cleanup
**Dateien:**
- `src/components/pr/ai/StructuredGenerationModal.tsx`
- `src/components/pr/ai/structured-generation/hooks/useStructuredGeneration.ts`

**Aufwand:** 2-3 Stunden
**Priorität:** 🟢 NIEDRIG

**Änderungen:**

1. **StructuredGenerationModal.tsx**
   - Mode-Toggle (`standard` / `profi`) entfernen
   - Hinweis-Box hinzufügen:
     ```tsx
     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
       <p className="text-sm text-blue-800">
         <strong>Tipp:</strong> Für DNA-basierte Pressemeldungs-Vorlagen nutze den
         <a href="/projects/{projectId}/strategy" className="underline">Strategie-Tab</a>.
       </p>
     </div>
     ```

2. **useStructuredGeneration.ts**
   - `mode` State entfernen
   - Logik auf Standard-Modus vereinfachen
   - DNA-Prompts entfernen (sind jetzt in PM-Vorlage Flow)

**Akzeptanzkriterien:**
- ✅ Kein Mode-Toggle mehr sichtbar
- ✅ Hinweis-Box zeigt Link zum Strategie-Tab
- ✅ Standard-Modus funktioniert weiterhin
- ✅ Keine Console-Errors

---

### 7. ❌ SEO-Validator als eigenständiges Tool
**Datei:** `src/lib/ai/validators/seo-validator.ts`
**Aufwand:** 3-4 Stunden
**Priorität:** 🟢 NIEDRIG

**Features:**
- Keyword-Dichte Analyse
- Lesbarkeit-Score (Flesch-Reading-Ease)
- Headline-Optimierung
- Meta-Description Vorschläge
- Strukturanalyse (H1, Absätze, Zitate)

**Aktuell:** Heuristische Schätzung im E2E-Test reicht aus.

---

### 8. ❌ UI-Tests mit React Testing Library
**Dateien:**
- `src/components/projects/strategy/__tests__/PMVorlageSection.test.tsx`
- `src/components/projects/strategy/__tests__/PMVorlagePreview.test.tsx`

**Aufwand:** 4-5 Stunden
**Priorität:** 🟢 NIEDRIG

**Test-Szenarien:**
- Komponente rendert mit fehlender DNA/Fakten
- Generierung-Button funktioniert
- Delete Confirmation Dialog
- History Dialog
- Copy to Editor

**Aktuell:** E2E-Test deckt Hauptfunktionalität ab.

---

## Zeitplan

### Sprint 1 (Kritischer Pfad) - 4-6 Stunden
**Ziel:** MVP produktionsreif

| Tag | Aufgabe | Dauer | Verantwortlich |
|-----|---------|-------|----------------|
| Mo | usePMVorlage Hook | 2-3h | Frontend-Dev |
| Di | Strategie-Tab Integration | 1-2h | Frontend-Dev |
| Di | E2E-Test ausführen | 1h | QA |

**Deliverable:** Voll funktionsfähiges PM-Vorlage System im Strategie-Tab

---

### Sprint 2 (Vollständigkeit) - 3-4 Stunden
**Ziel:** Wizard-Integration

| Tag | Aufgabe | Dauer | Verantwortlich |
|-----|---------|-------|----------------|
| Mi | saveFaktenMatrix Tool | 2-3h | Backend-Dev |
| Mi | useFaktenMatrix Hook | 1h | Frontend-Dev |

**Deliverable:** Wizard kann Fakten-Matrix direkt speichern

---

### Sprint 3 (Polish) - 5-6 Stunden
**Ziel:** UI Cleanup & Testing

| Tag | Aufgabe | Dauer | Verantwortlich |
|-----|---------|-------|----------------|
| Do | Phase 6 Cleanup | 2-3h | Frontend-Dev |
| Fr | UI-Tests | 3h | QA |

**Deliverable:** Profi-Modus entfernt, Tests vorhanden

---

## Definition of Done

### MVP (Sprint 1)
```
✅ usePMVorlage Hook existiert und funktioniert
✅ PMVorlageSection ist im Strategie-Tab sichtbar
✅ User kann PM-Vorlage generieren (Button → API → Anzeige)
✅ User kann PM-Vorlage löschen
✅ User kann PM-Vorlage in Editor kopieren
✅ E2E-Test läuft durch (6/6 bestanden)
✅ Keine TypeScript-Fehler im PM-Refactoring Code
✅ Keine Console-Errors in Browser
```

### Full Release (Sprint 2 + 3)
```
✅ Wizard kann Fakten-Matrix via Tool-Call speichern
✅ useFaktenMatrix Hook vorhanden
✅ Profi-Modus aus KI-Assistent entfernt
✅ UI-Tests für PMVorlageSection vorhanden
✅ Dokumentation vollständig
✅ Code-Review durchgeführt
```

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Genkit-API-Änderungen | Niedrig | Hoch | E2E-Test frühzeitig ausführen |
| Firestore-Connection-Probleme | Mittel | Mittel | Emulator für Tests nutzen |
| TipTap-Editor-Inkompatibilität | Mittel | Niedrig | Fallback: Clipboard-Copy |
| DNA-Kontakte fehlen | Mittel | Hoch | Validierung in API + User-Feedback |
| TypeScript-Fehler in Integration | Niedrig | Mittel | Schrittweise Integration mit tsc --watch |

---

## Kontakte & Verantwortlichkeiten

| Rolle | Verantwortlich für | Kontakt |
|-------|-------------------|---------|
| Frontend-Dev | Hooks, UI-Integration, Phase 6 | TBD |
| Backend-Dev | Wizard-Integration, API-Fixes | TBD |
| QA | E2E-Tests, UI-Tests | TBD |
| PM | Priorisierung, Abnahme | TBD |

---

## Nächster Schritt

**SOFORT:**
1. ✅ E2E-Test-Skript ausführen: `npx tsx scripts/test-pm-vorlage-e2e.ts`
2. ❌ Bugs beheben falls Tests fehlschlagen
3. ❌ usePMVorlage Hook implementieren
4. ❌ Strategie-Tab Integration durchführen

**Frage an Team:**
Wer übernimmt Sprint 1 (kritischer Pfad)? Zeitfenster: 4-6 Stunden diese Woche.

---

**Erstellt:** 2026-01-07
**Letzte Aktualisierung:** 2026-01-07
**Status:** Bereit für Sprint 1 Start
