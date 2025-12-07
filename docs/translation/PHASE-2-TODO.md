# Phase 2: KI-Übersetzung - ToDo-Liste

**Status:** Ausstehend
**Ziel:** KI-gestützte Übersetzung für Pressemitteilungen mit Glossar-Unterstützung
**Voraussetzung:** Phase 1 abgeschlossen ✅

---

## 1. Datenmodell erweitern ✅ ABGESCHLOSSEN

### 1.1 ProjectTranslation Type ✅
- [x] `src/types/translation.ts` erstellt
- [x] `ProjectTranslation` Interface definiert (inkl. organizationId, reviewedBy/At)
- [x] `TranslationStatus` Type erstellt
- [x] `CreateTranslationInput` Type erstellt
- [x] `UpdateTranslationInput` Type erstellt
- [x] `TranslationFilterOptions` Type erstellt
- [x] `TranslationSummary` Type erstellt (für Projekt-Übersicht)

### 1.2 Firestore Collection ✅
- [x] Collection-Pfad: `organizations/{orgId}/projects/{projectId}/translations`
- [ ] Index für `language` + `projectId` anlegen (bei Bedarf)
- [x] Security Rules in `firestore.rules` hinzugefügt (Zeile 520-538)

---

## 2. Translation Service ✅ ABGESCHLOSSEN

### 2.1 Firebase Service ✅
- [x] `src/lib/services/translation-service.ts` erstellt
- [x] `getByProject(orgId, projectId)` - Alle Übersetzungen eines Projekts
- [x] `getByLanguage(orgId, projectId, language)` - Spezifische Übersetzung
- [x] `getById(orgId, projectId, translationId)` - Nach ID
- [x] `create(translation)` - Neue Übersetzung speichern
- [x] `update(id, translation)` - Übersetzung aktualisieren
- [x] `delete(id)` - Übersetzung löschen
- [x] `markAsOutdated(projectId)` - Alle als veraltet markieren (Batch)
- [x] `markAsCurrent(translationId)` - Als aktuell markieren
- [x] `getSummary(projectId)` - Zusammenfassung
- [x] `exists(projectId, language)` - Prüfen ob vorhanden
- [x] `getAvailableLanguages(projectId)` - Verfügbare Sprachen

### 2.2 React Query Hooks ✅
- [x] `src/lib/hooks/useTranslations.ts` erstellt
- [x] `useProjectTranslations(orgId, projectId)` - Liste Query
- [x] `useTranslationByLanguage(orgId, projectId, language)` - Nach Sprache
- [x] `useProjectTranslation(orgId, projectId, translationId)` - Nach ID
- [x] `useTranslationSummary(orgId, projectId)` - Zusammenfassung
- [x] `useAvailableLanguages(orgId, projectId)` - Sprachen-Liste
- [x] `useCreateTranslation()` - Mutation
- [x] `useUpdateTranslation()` - Mutation
- [x] `useDeleteTranslation()` - Mutation
- [x] `useMarkTranslationsOutdated()` - Batch-Mutation
- [x] `useMarkTranslationCurrent()` - Mutation
- [x] Query Key Factory `translationKeys`

---

## 3. Genkit Translation Flow

> **Hinweis:** Nutzt bestehende Genkit-Infrastruktur in `src/lib/ai/`
> - Konfiguration: `src/lib/ai/genkit-config.ts`
> - Modelle: `gemini25FlashModel` (Google AI Plugin)
> - Pattern: Wie `text-transform.ts` Flow

### 3.1 Schema Definition
- [ ] `src/lib/ai/schemas/translate-press-release-schemas.ts` erstellen
- [ ] Input Schema mit Zod definieren:
  ```typescript
  import { z } from 'genkit';

  export const TranslatePressReleaseInputSchema = z.object({
    content: z.string(),              // HTML Content
    title: z.string(),
    sourceLanguage: z.string(),       // 'de'
    targetLanguage: z.string(),       // 'en', 'fr', etc.
    glossaryEntries: z.array(z.object({
      source: z.string(),
      target: z.string(),
      context: z.string().optional()
    })).optional(),
    preserveFormatting: z.boolean().default(true)
  });
  ```
- [ ] Output Schema definieren:
  ```typescript
  export const TranslatePressReleaseOutputSchema = z.object({
    translatedContent: z.string(),
    translatedTitle: z.string(),
    glossaryUsed: z.array(z.string()),
    confidence: z.number(),
    timestamp: z.string()
  });
  ```

### 3.2 Flow Definition
- [ ] `src/lib/ai/flows/translate-press-release.ts` erstellen
- [ ] Import: `ai`, `gemini25FlashModel` aus `../genkit-config`
- [ ] `ai.defineFlow()` mit Input/Output Schemas
- [ ] `ai.generate()` mit `gemini25FlashModel`

### 3.3 Prompt Engineering
- [ ] System-Prompt für Pressemitteilungs-Übersetzung
- [ ] Glossar-Integration in Prompt (wie `text-transform.ts` Pattern)
- [ ] HTML-Formatierungs-Anweisungen (EXAKT beibehalten)
- [ ] Tone-of-Voice Anweisungen (formell/geschäftlich)

### 3.4 Flow Logik
- [ ] Glossar für Kunde laden (aus Phase 1 `glossary-service.ts`)
- [ ] KI-Übersetzung durchführen (`ai.generate()`)
- [ ] HTML-Validierung nach Übersetzung
- [ ] Verwendete Glossar-Einträge tracken
- [ ] Fehlerbehandlung & Retry-Logik

### 3.5 Evaluator (optional)
- [ ] `src/lib/ai/evaluators/translate-press-release-evaluators.ts`
- [ ] Qualitäts-Metriken für Übersetzungen
- [ ] Test-Dataset in `src/lib/ai/test-data/`

---

## 4. API Route

### 4.1 Translation Endpoint
- [ ] `src/app/api/translate/route.ts` erstellen
- [ ] POST: Übersetzung starten (async)
- [ ] Auth-Check (User muss Org-Mitglied sein)
- [ ] Input-Validierung
- [ ] Genkit Flow aufrufen
- [ ] Ergebnis in Firestore speichern
- [ ] Response mit Translation-ID

### 4.2 Status Endpoint (optional)
- [ ] GET: Status einer laufenden Übersetzung prüfen
- [ ] Für lange Übersetzungen mit Polling

---

## 5. UI-Komponenten

### 5.1 Übersetzungs-Button
- [ ] `src/components/campaigns/TranslationButton.tsx`
- [ ] Anzeige verfügbarer Übersetzungen (Flaggen)
- [ ] Status-Badges (generiert, veraltet, etc.)
- [ ] "Neue Übersetzung" Button
- [ ] Integration in Kampagnen-Ansicht

### 5.2 Übersetzungs-Modal
- [ ] `src/components/campaigns/TranslationModal.tsx`
- [ ] Zielsprache-Dropdown (basierend auf contentLanguages)
- [ ] Glossar-Checkbox (Anzahl Einträge anzeigen)
- [ ] Loading-State während Generierung
- [ ] Erfolgs-/Fehler-Feedback
- [ ] Vorschau der Übersetzung (optional)

### 5.3 Outdated-Warning
- [ ] `src/components/campaigns/TranslationOutdatedBanner.tsx`
- [ ] Warnung wenn Original geändert wurde
- [ ] "Neu übersetzen" Button
- [ ] "Als aktuell markieren" Button

---

## 6. Versand-Modal Erweiterung

### 6.1 Sprach-Auswahl
- [ ] Checkboxen für verfügbare Sprachen
- [ ] Original (DE) immer vorausgewählt
- [ ] Nicht verfügbare Sprachen grau/disabled
- [ ] Status-Info (generiert am, von wem)

### 6.2 PDF-Format Optionen
- [ ] Radio-Buttons: Separate PDFs / Kombiniertes PDF
- [ ] Vorschau-Info was generiert wird

---

## 7. PDF-Generierung erweitern

### 7.1 Separate PDFs
- [ ] Bestehenden PDF-Service nutzen
- [ ] Pro Sprache ein PDF generieren
- [ ] Alle PDFs als Attachments anhängen

### 7.2 Kombiniertes PDF (optional)
- [ ] PDF-Service erweitern für Multi-Language
- [ ] Sprachtrennseite einfügen
- [ ] Header pro Sprachsektion

---

## 8. Outdated-Erkennung

### 8.1 Trigger bei Original-Änderung
- [ ] Hook in Campaign-Update einbauen
- [ ] Bei Content-Änderung: `markAsOutdated(projectId)` aufrufen
- [ ] Version-Counter für Original-PM

### 8.2 UI-Feedback
- [ ] Badge "Veraltet" an betroffenen Übersetzungen
- [ ] Toast bei Änderung: "X Übersetzungen veraltet"

---

## 9. Testing & Qualitätssicherung

### 9.1 TypeScript
- [ ] `npm run type-check` erfolgreich
- [ ] Alle neuen Types korrekt exportiert

### 9.2 Genkit Flow Tests
- [ ] Unit Tests für translatePressRelease Flow
- [ ] Test mit Glossar-Einträgen
- [ ] Test HTML-Formatierung bleibt erhalten
- [ ] Test Fehlerbehandlung

### 9.3 Integration Tests
- [ ] API-Route Tests
- [ ] E2E Test: Übersetzung erstellen + abrufen

### 9.4 Build
- [ ] `npm run build` erfolgreich
- [ ] Keine Console-Errors im Browser

---

## 10. Abschluss Phase 2

- [ ] Alle obigen Punkte abgehakt
- [ ] Code-Review durchgeführt
- [ ] Dokumentation aktualisiert
- [ ] Demo/Test mit echten Pressemitteilungen
- [ ] Phase 3 Planung starten

---

## Notizen

_Hier können während der Implementierung Notizen, Probleme oder Entscheidungen dokumentiert werden._

---

## Abhängigkeiten

| Von Phase 1 benötigt | Status |
|----------------------|--------|
| Glossar-Service (`glossary-service.ts`) | ✅ |
| Glossar-Types (`glossary.ts`) | ✅ |
| Content-Languages in Organization | ✅ |
| React Query Hooks (`useGlossary.ts`) | ✅ |

---

## Bestehende Genkit-Infrastruktur

| Datei | Beschreibung | Nutzung für Phase 2 |
|-------|--------------|---------------------|
| `src/lib/ai/genkit-config.ts` | Zentrale Konfiguration | ✅ Import `ai`, `gemini25FlashModel` |
| `src/lib/ai/flows/*.ts` | Bestehende Flows | 📖 Pattern-Referenz |
| `src/lib/ai/schemas/*.ts` | Zod Schemas | 📖 Pattern-Referenz |
| `src/lib/ai/evaluators/*.ts` | Qualitäts-Evaluatoren | 📖 Optional für Tests |
| `src/lib/ai/test-data/*.json` | Test-Datasets | 📖 Optional für Tests |

### Modell-Empfehlung
- **Übersetzung**: `gemini25FlashModel` (beste Qualität, wie `text-transform.ts`)
- **Evaluator/Judge**: `gemini25FlashModel` (aus `genkit-config.ts`)

---

## Geschätzte Komponenten-Anzahl

| Kategorie | Anzahl | Pfad |
|-----------|--------|------|
| Types/Interfaces | 3-4 | `src/types/translation.ts` |
| Services | 1 | `src/lib/services/translation-service.ts` |
| React Query Hooks | 5-6 | `src/lib/hooks/useTranslations.ts` |
| Genkit Schemas | 1 | `src/lib/ai/schemas/translate-press-release-schemas.ts` |
| Genkit Flows | 1 | `src/lib/ai/flows/translate-press-release.ts` |
| API Routes | 1-2 | `src/app/api/translate/route.ts` |
| UI Komponenten | 4-5 | `src/components/campaigns/Translation*.tsx` |
| Tests | 5-10 | Jest + Genkit Evaluators |

---

**Letzte Aktualisierung:** 2025-12-07 (Genkit-Infrastruktur angepasst)
