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

## 3. Genkit Translation Flow ✅ ABGESCHLOSSEN

> **Hinweis:** Nutzt bestehende Genkit-Infrastruktur in `src/lib/ai/`

### 3.1 Schema Definition ✅
- [x] `src/lib/ai/schemas/translate-press-release-schemas.ts` erstellt
- [x] `GlossaryEntrySchema` - Glossar-Eintrag mit source, target, context, id
- [x] `TranslatePressReleaseInputSchema` - Input mit content, title, languages, glossary, tone
- [x] `TranslatePressReleaseOutputSchema` - Output mit translatedContent/Title, stats, confidence
- [x] `LANGUAGE_NAMES` Mapping + `getLanguageName()` Helper

### 3.2 Flow Definition ✅
- [x] `src/lib/ai/flows/translate-press-release.ts` erstellt
- [x] Import: `ai`, `gemini25FlashModel` aus `../genkit-config`
- [x] `translatePressReleaseFlow` mit `ai.defineFlow()`
- [x] `ai.generate()` mit `gemini25FlashModel`, temperature 0.3

### 3.3 Prompt Engineering ✅
- [x] System-Prompt für Pressemitteilungs-Übersetzung
- [x] Glossar-Integration (Fachbegriffe MÜSSEN exakt übersetzt werden)
- [x] HTML-Formatierungs-Anweisungen (Tags beibehalten, nur Text übersetzen)
- [x] Eigennamen-Regeln (Firmen, Produkte, Personen unverändert)
- [x] Tone-of-Voice: formal, professional, neutral

### 3.4 Flow Logik ✅
- [x] `buildGlossarySection()` - Glossar für Prompt aufbereiten
- [x] `buildSystemPrompt()` - Dynamischer Prompt-Builder
- [x] `findUsedGlossaryEntries()` - Tracking verwendeter Glossar-Einträge
- [x] `calculateConfidence()` - Qualitäts-Score berechnen
- [x] `cleanTranslation()` - Post-Processing der Übersetzung
- [x] Titel + Inhalt Extraktion aus KI-Response
- [x] Fehlerbehandlung mit detailliertem Logging

### 3.5 Evaluator (optional)
- [ ] `src/lib/ai/evaluators/translate-press-release-evaluators.ts` (später)
- [ ] Test-Dataset in `src/lib/ai/test-data/` (später)

---

## 4. API Route ✅ ABGESCHLOSSEN

### 4.1 Translation Endpoint ✅
- [x] `src/app/api/ai/translate/route.ts` erstellt
- [x] POST: Übersetzung starten
- [x] Auth-Check (withAuth Middleware)
- [x] Input-Validierung (projectId, title, content, languages)
- [x] Genkit Flow aufrufen (translatePressReleaseFlow)
- [x] Glossar-Einträge laden (glossaryService)
- [x] Ergebnis in Firestore speichern (translationService)
- [x] AI-Limit prüfen + Usage tracken
- [x] Response mit Translation-ID und Stats

### 4.2 Status Endpoint (optional)
- [ ] GET: Status einer laufenden Übersetzung prüfen (später bei Bedarf)
- [ ] Für lange Übersetzungen mit Polling (später bei Bedarf)

---

## 5. UI-Komponenten ✅ ABGESCHLOSSEN

### 5.1 Übersetzungs-Button ✅
- [x] `src/components/campaigns/TranslationButton.tsx` erstellt
- [x] Anzeige verfügbarer Übersetzungen (Flaggen mit Unicode Emoji)
- [x] Status-Badges (generiert, geprüft, freigegeben, veraltet)
- [x] "Neue Übersetzung" Button
- [x] Hover-Tooltip mit Übersetzungs-Details
- [x] Kompakte und vollständige Ansicht

### 5.2 Übersetzungs-Modal ✅
- [x] `src/components/campaigns/TranslationModal.tsx` erstellt
- [x] Zielsprache-Dropdown (basierend auf contentLanguages)
- [x] Glossar-Checkbox (Anzahl relevanter Einträge anzeigen)
- [x] Loading-State während Generierung
- [x] Erfolgs-/Fehler-Feedback
- [x] Tonalität-Auswahl (formal, professional, neutral)
- [x] KI-Hinweis mit Gemini-Info

### 5.3 Outdated-Warning ✅
- [x] `src/components/campaigns/TranslationOutdatedBanner.tsx` erstellt
- [x] Warnung wenn Original geändert wurde
- [x] "Neu übersetzen" Button pro Sprache
- [x] "Alle aktualisieren" Button
- [x] Dismissible-Option

---

## 6. Versand-Modal Erweiterung ✅ ABGESCHLOSSEN

### 6.1 Sprach-Auswahl ✅
- [x] `TranslationLanguageSelector` Komponente erstellt
- [x] Checkboxen für verfügbare Sprachen
- [x] Original (DE) immer vorausgewählt und nicht abwählbar
- [x] Status-Info (generiert am, aktuell/veraltet)
- [x] "Alle auswählen / abwählen" Button

### 6.2 PDF-Format Optionen ✅
- [x] Radio-Buttons: Separate PDFs / Kombiniertes PDF
- [x] Vorschau-Info was generiert wird (Anzahl Sprachen)

### 6.3 Integration ✅
- [x] In `Step3Preview.tsx` integriert
- [x] State für `selectedLanguages` und `pdfFormat`
- [x] TypeScript-Check erfolgreich

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
