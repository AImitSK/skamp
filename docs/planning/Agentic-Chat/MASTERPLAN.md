# Agentic Chat - Implementierungs-Masterplan

**Branch:** `feature/agentic-chat`
**Start:** 2025-01-04
**Status:** 🚧 In Arbeit

---

## Übersicht

Migration der Marken-DNA Chats von Tag-basiertem Parsing (`[DOCUMENT]`, `[PROGRESS]`) zu einer modularen Agentic-Architektur mit Genkit Tools.

```
VORHER                              NACHHER
──────────────────────────          ──────────────────────────
AI generiert Text-Tags              AI ruft Tools auf
[DOCUMENT]...[/DOCUMENT]     →      skill_sidebar.updateDraft()
[PROGRESS:40]                →      skill_todos.updateTodoStatus()
[SUGGESTIONS]...[/SUGG...]   →      skill_suggestions.updateSuggestions()
```

---

## Phase 0: Vorbereitung
> Grundlagen schaffen, bevor wir Code schreiben

- [x] **0.1** Feature-Branch erstellen (`feature/agentic-chat`)
- [x] **0.2** Masterplan erstellen (dieses Dokument)
- [ ] **0.3** Bestehende Implementierung dokumentieren (IST-Zustand)
- [ ] **0.4** Skill-Definitionen finalisieren (`03-Skill-Definitionen.md`)
- [ ] **0.5** Orchestrator-Prompt finalisieren (`04-Orchestrator-Agent.md`)

**Exit-Kriterium:** Alle Planungsdokumente vollständig, Team aligned

---

## Phase 1: Genkit Tools (Backend)
> Skills als Genkit Tools definieren

### 1.1 Basis-Infrastruktur
- [x] **1.1.1** Neuen Flow erstellen: `src/lib/ai/agentic/flows/agentic-chat-flow.ts`
- [x] **1.1.2** Tool-Registry Pattern einführen: `src/lib/ai/agentic/skills/index.ts`
- [x] **1.1.3** API-Route erstellen: `/api/ai-chat/agentic/route.ts`

### 1.2 UI & Prozess-Skills
- [x] **1.2.1** `skill_roadmap` - Phasen-Anzeige
  - `showRoadmap(phases: string[])`
  - `completePhase(phaseIndex: number)`
- [x] **1.2.2** `skill_todos` - Checkliste
  - `updateTodoStatus(items: TodoItem[])`
- [x] **1.2.3** `skill_suggestions` - Quick-Replies
  - `updateSuggestions(prompts: string[])`
- [x] **1.2.4** `skill_confirm` - Bestätigungs-Box
  - `requestApproval(title: string, summary: Record<string, string>)`

### 1.3 Recherche & Daten-Skills
- [x] **1.3.1** `skill_url_crawler` - Webseiten analysieren
  - `analyzeUrl(url: string)` via Jina AI Reader
- [x] **1.3.2** `skill_dna_lookup` - DNA-Kontext laden
  - `fetchDnaContext(companyId: string, docType?: string)`

### 1.4 Sidebar & Dokumenten-Skills
- [x] **1.4.1** `skill_sidebar` - Live-Dokument-Updates
  - `updateDraft(content: string)`
  - `finalizeDocument(content: string)`

### 1.5 Tests
- [ ] **1.5.1** Unit-Tests für jeden Skill
- [ ] **1.5.2** Integration-Test: Tool-Calls in Flow

**Exit-Kriterium:** Alle 7 Skills als Genkit Tools definiert ✅, Tests ausstehend

---

## Phase 2: Frontend Toolbox-Renderer
> UI-Komponenten für Tool-Call Rendering

### 2.1 Toolbox-Infrastruktur
- [x] **2.1.1** `ToolboxRenderer.tsx` - Parst `toolCalls[]` aus Response
  - Implementiert als `toolboxReducer` in `types.ts`
- [x] **2.1.2** Tool-Call Type Definitionen
  - `ToolboxState`, `ToolboxAction` in `src/components/agentic-chat/toolbox/types.ts`
- [x] **2.1.3** Toolbox-Context für State-Management
  - Via `useReducer` in `useAgenticChat.ts`

### 2.2 UI-Komponenten
- [x] **2.2.1** `RoadmapBox.tsx` - Horizontale Phasen-Anzeige
  - Rendert `skill_roadmap` Calls
  - Zeigt aktive Phase, erledigte Phasen
- [x] **2.2.2** `TodoList.tsx` - Vertikale Checkliste
  - Rendert `skill_todos` Calls
  - Status-Icons: ○ (open), ◐ (partial), ● (done)
- [x] **2.2.3** `SuggestionBubbles.tsx` - Quick-Reply Buttons
  - Rendert `skill_suggestions` Calls
  - Klickbar → sendet als User-Message
- [x] **2.2.4** `ConfirmBox.tsx` - Bestätigungs-Dialog
  - Rendert `skill_confirm` Calls
  - Buttons: [Ja, abschließen] / [Anpassen]
- [x] **2.2.5** `DocumentSidebar.tsx` anpassen
  - In `AgenticChatModal.tsx` integriert (Split-View rechts)
  - Live-Updates während Chat

### 2.3 Integration in Chat-Modal
- [x] **2.3.1** `useAgenticChat.ts` Hook (ersetzt `useGenkitChat.ts`)
  - `src/hooks/agentic-chat/useAgenticChat.ts`
- [x] **2.3.2** `AgenticChatModal.tsx` (neues Modal)
  - `src/components/agentic-chat/AgenticChatModal.tsx`
- [x] **2.3.3** `AgenticChatInterface.tsx` für Tool-Rendering
  - `src/components/agentic-chat/AgenticChatInterface.tsx`

### 2.4 Tests
- [ ] **2.4.1** Unit-Tests für Toolbox-Komponenten
- [ ] **2.4.2** Snapshot-Tests für UI-States

**Exit-Kriterium:** Frontend rendert alle Tool-Calls korrekt ✅ (Tests ausstehend)

---

## Phase 3: Spezialisten-Agenten
> Prompts und Agent-Logik

### 3.1 Prompt-Dateien erstellen
> ✅ **Inline implementiert** in `src/lib/ai/agentic/prompts/prompt-loader.ts`
> Entscheidung: Inline statt .md-Dateien für bessere Typsicherheit und einfacheres Deployment

- [x] **3.1.1** `briefing_specialist` Prompt (DE + EN)
- [x] **3.1.2** `swot_specialist` Prompt (DE + EN)
- [x] **3.1.3** `audience_specialist` Prompt (DE + EN)
- [x] **3.1.4** `positioning_specialist` Prompt (DE + EN)
- [x] **3.1.5** `goals_specialist` Prompt (DE + EN)
- [x] **3.1.6** `messages_specialist` Prompt (DE + EN)
- [x] **3.1.7** `project_wizard` Prompt (DE + EN)
- [x] **3.1.8** `orchestrator` Prompt (DE + EN)

### 3.2 Prompt-Loader
- [x] **3.2.1** `loadSpecialistPrompt(type, language, companyName)` Funktion
  - Implementiert in `prompt-loader.ts`
- [x] **3.2.2** Skill-Mapping pro Spezialist (`AGENT_SKILLS` in `types.ts`)
  - Orchestrator: dna_lookup, roadmap, suggestions
  - Briefing: url_crawler, roadmap, todos, confirm, sidebar, suggestions
  - Alle anderen: dna_lookup, roadmap, todos, confirm, sidebar, suggestions
- [x] **3.2.3** `canAgentUseSkill(agentType, skillName)` Helper

### 3.3 Tests
- [ ] **3.3.1** Prompt-Validierung (keine alten Tags erlaubt)
- [ ] **3.3.2** Skill-Permission Tests

**Exit-Kriterium:** Alle 7 Spezialisten mit korrekten Prompts und Skill-Zuweisungen ✅

---

## Phase 4: Orchestrator
> CSO-Agent für Routing und State-Management

### 4.1 Orchestrator-Flow
- [ ] **4.1.1** `orchestratorFlow.ts` erstellen
- [ ] **4.1.2** `skill_handoff` implementieren
  - Agent-Wechsel mit Kontext-Übergabe
- [ ] **4.1.3** Master-Roadmap (alle 6 Dokumente)
- [ ] **4.1.4** Completeness-Score Tracking

### 4.2 State-Management
- [ ] **4.2.1** Session-State Design (Firestore oder Memory)
- [ ] **4.2.2** Agent-History für Kontext-Erhalt
- [ ] **4.2.3** Document-Status Sync mit Firestore

### 4.3 DNA-Synthese Trigger
- [ ] **4.3.1** Auto-Erkennung: Alle 6 Docs `completed`
- [ ] **4.3.2** Synthese-Button via `skill_suggestions`

### 4.4 Tests
- [ ] **4.4.1** Orchestrator Routing Tests
- [ ] **4.4.2** Handoff Tests (Kontext-Übergabe)

**Exit-Kriterium:** Orchestrator routet korrekt zwischen Spezialisten

---

## Phase 5: Integration & Migration
> Altes System durch neues ersetzen

### 5.1 Feature-Flag
- [ ] **5.1.1** `FEATURE_AGENTIC_CHAT` Flag einführen
- [ ] **5.1.2** Parallelbetrieb: Alt + Neu

### 5.2 UI-Migration
- [ ] **5.2.1** `MarkenDNAChatModal` → `AgenticChatModal` wechseln
- [ ] **5.2.2** Alte Toolbox-Komponenten entfernen
- [ ] **5.2.3** Navigation/Routing anpassen

### 5.3 API-Migration
- [ ] **5.3.1** `/api/ai-chat/marken-dna` deprecaten
- [ ] **5.3.2** `/api/ai-chat/agentic` als Standard

### 5.4 Cleanup
- [ ] **5.4.1** Alte `useGenkitChat.ts` entfernen
- [ ] **5.4.2** Alte Tag-Parsing Funktionen entfernen
- [ ] **5.4.3** Feature-Flag entfernen

**Exit-Kriterium:** Neues System produktiv, altes entfernt

---

## Phase 6: Testing & QA
> Qualitätssicherung vor Merge

### 6.1 Automatisierte Tests
- [ ] **6.1.1** Alle Unit-Tests grün
- [ ] **6.1.2** Integration-Tests grün
- [ ] **6.1.3** E2E-Test: Kompletter Briefing-Flow

### 6.2 Manuelle Tests
- [ ] **6.2.1** Alle 6 Dokumenttypen durchspielen
- [ ] **6.2.2** Orchestrator-Wechsel testen
- [ ] **6.2.3** Edge-Cases (Abbruch, Neustart, etc.)

### 6.3 Performance
- [ ] **6.3.1** Response-Zeit < 3s
- [ ] **6.3.2** Keine Memory-Leaks

### 6.4 Code-Review
- [ ] **6.4.1** PR erstellen
- [ ] **6.4.2** Review abgeschlossen
- [ ] **6.4.3** Feedback eingearbeitet

**Exit-Kriterium:** Alle Tests bestanden, PR approved

---

## Phase 7: Deployment
> Go-Live

- [ ] **7.1** Merge nach `main`
- [ ] **7.2** Vercel Deployment verifizieren
- [ ] **7.3** Monitoring einrichten
- [ ] **7.4** Dokumentation aktualisieren (`docs/marken-dna/`)

**Exit-Kriterium:** Feature live und stabil

---

## Abhängigkeiten

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6 ──→ Phase 7
   │           │           │           │           │
   │           │           │           │           └── braucht: Spezialisten
   │           │           │           └── braucht: Frontend-Komponenten
   │           │           └── braucht: Genkit Tools
   │           └── braucht: Finalisierte Skill-Definitionen
   └── Planungsdokumente
```

**Parallel möglich:**
- Phase 1 (Backend) + Phase 2 (Frontend) können teilweise parallel laufen
- Phase 3 (Prompts) kann parallel zu Phase 2 beginnen

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Genkit Tool-Use Bugs | Mittel | Hoch | Früh testen, Fallback zu altem System |
| Streaming mit Tools | Mittel | Mittel | Genkit Docs prüfen, ggf. ohne Streaming |
| Prompt-Instabilität | Niedrig | Mittel | Prompt-Tests, klare Skill-Regeln |
| Performance-Einbußen | Niedrig | Niedrig | Caching, Tool-Batching |

---

## Tracking

| Phase | Status | Beginn | Ende | Notizen |
|-------|--------|--------|------|---------|
| 0 | ✅ Abgeschlossen | 2025-01-04 | 2025-01-04 | Branch + Masterplan erstellt |
| 1 | ✅ Abgeschlossen | 2025-01-04 | 2025-01-04 | 7 Skills + Flow + API-Route + Prompts |
| 2 | ✅ Abgeschlossen | 2025-01-04 | 2025-01-04 | Toolbox-Komponenten + Hook + Modal |
| 3 | ✅ Abgeschlossen | 2025-01-04 | 2025-01-04 | Prompts inline in prompt-loader.ts |
| 4 | ⏳ Ausstehend | - | - | |
| 5 | ⏳ Ausstehend | - | - | |
| 6 | ⏳ Ausstehend | - | - | |
| 7 | ⏳ Ausstehend | - | - | |

---

**Nächster Schritt:** Phase 4 (Orchestrator) - Agent-Routing und Handoff-Logik implementieren
