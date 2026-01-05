# Agentic Chat Testing - Infrastruktur

## Überblick

Das Test-System ermöglicht iteratives Testen und Verbessern der Agentic Chat Spezialisten.

## Workflow

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌─────────┐    ┌─────────────┐    ┌────────────────┐  │
│  │  Test   │ → │  Protokoll  │ → │  Analyse       │  │
│  │ starten │    │  anschauen  │    │  + Vorschläge │  │
│  └─────────┘    └─────────────┘    └───────┬────────┘  │
│       ▲                                     │           │
│       │         ┌─────────────┐             │           │
│       └─────────│ Anpassungen │ ◄───────────┘           │
│                 │ umsetzen    │                         │
│                 └─────────────┘                         │
│                                                         │
│              Wiederholen bis happy ✓                    │
└─────────────────────────────────────────────────────────┘
```

## Test starten

### Via Genkit MCP Tool

```bash
# Einzelnen Test ausführen
mcp__genkit__run_flow
  flowName: "runAgenticTestScenario"
  input: <scenario-json>
```

### Via Genkit Dev UI

```bash
npm run genkit:dev
# Öffne http://localhost:4002
# Wähle "runAgenticTestScenario" Flow
```

### Via Script

```bash
npx tsx src/lib/ai/agentic/test-data/run-test.ts briefing_specialist_quick
```

## Test-Szenarien

### Verfügbare Datasets

| Spezialist | Dataset-ID | Turns | Beschreibung |
|------------|-----------|-------|--------------|
| briefing_specialist | briefing_specialist_quick | 3 | Schnelltest mit Basis-Flow |
| briefing_specialist | briefing_specialist_full | 5+ | Vollständiger Workflow |
| swot_specialist | swot_specialist_quick | 3 | SWOT-Analyse Quick |
| audience_specialist | audience_specialist_quick | 3 | Zielgruppen Quick |
| positioning_specialist | positioning_specialist_quick | 3 | Positionierung Quick |
| goals_specialist | goals_specialist_quick | 3 | Ziele Quick |
| messages_specialist | messages_specialist_quick | 3 | Kernbotschaften Quick |
| project_wizard | project_wizard_quick | 3 | Projekt-Wizard Quick |

### Szenario-Struktur

```typescript
{
  id: "briefing_specialist_quick",
  description: "Schnelltest für Briefing-Spezialisten",
  specialistType: "briefing_specialist",
  company: {
    id: "test-company-1",
    name: "TechStart GmbH"
  },
  language: "de",
  turns: [
    {
      userMessage: "Hallo, ich möchte ein Briefing erstellen",
      expectedTools: ["skill_roadmap", "skill_todos"],
      forbiddenTools: [],
      responseValidation: {
        mustNotContain: ["[DOCUMENT]", "[PROGRESS]"],
        minLength: 50
      }
    },
    // ... weitere Turns
  ],
  expectations: {
    minTotalToolCalls: 5,
    requiredTools: ["skill_roadmap", "skill_todos", "skill_confirm"],
    shouldEndWithConfirm: true,
    shouldProduceFinalDocument: false
  }
}
```

## Ergebnis-Protokoll

### Protokoll-Dateien

Nach jedem Test wird ein Protokoll gespeichert:

```
docs/agentic-chat/test-results/
├── briefing_specialist_quick_2024-01-15_14-30-25.json
├── briefing_specialist_quick_2024-01-15_15-45-12.json
└── ...
```

### Protokoll-Format

```typescript
{
  // Metadata
  scenarioId: "briefing_specialist_quick",
  specialistType: "briefing_specialist",
  timestamp: "2024-01-15T14:30:25.123Z",
  totalDurationMs: 12345,

  // Turns (jeder Konversations-Schritt)
  turns: [
    {
      turnIndex: 0,
      userMessage: "Hallo...",
      assistantResponse: "Willkommen bei...",
      toolCalls: [
        {
          name: "skill_roadmap",
          args: { action: "showRoadmap", phases: [...] },
          result: { success: true, ... }
        },
        {
          name: "skill_todos",
          args: { items: [...] },
          result: { success: true, ... }
        }
      ],
      validation: {
        expectedToolsFound: true,
        forbiddenToolsAbsent: true,
        responseValid: true,
        errors: []
      },
      durationMs: 3456
    },
    // ... weitere Turns
  ],

  // Zusammenfassung
  allToolCalls: [...],  // Alle Tool-Calls über alle Turns

  validation: {
    passed: true,
    totalToolCalls: 9,
    requiredToolsPresent: true,
    endedWithConfirm: true,
    producedFinalDocument: false,
    errors: []
  }
}
```

## Validierungen

### Turn-Level

- **expectedToolsFound**: Wurden die erwarteten Tools aufgerufen?
- **forbiddenToolsAbsent**: Wurden verbotene Tools vermieden?
- **responseValid**: Erfüllt die Antwort die Kriterien?

### Szenario-Level

- **totalToolCalls**: Mindestanzahl Tool-Aufrufe erreicht?
- **requiredToolsPresent**: Alle Pflicht-Tools verwendet?
- **endedWithConfirm**: Letzter Turn mit Confirm-Box?
- **producedFinalDocument**: Finales Dokument erstellt?

## Metriken (Evaluation)

### Scores (0-1)

| Metrik | Gewichtung | Beschreibung |
|--------|-----------|--------------|
| toolUsageScore | 30% | Richtige Tools aufgerufen? |
| responseQualityScore | 30% | Antwort-Qualität |
| adherenceScore | 20% | Hält sich an Prompt? |
| legacyFreeScore | 20% | Keine alten Tags? |

### Legacy-Tags (verboten)

```
[DOCUMENT], [/DOCUMENT], [PROGRESS], [SUGGESTIONS],
[/SUGGESTIONS], [CONFIRM], [/CONFIRM]
```

## Verbesserungen umsetzen

### 1. Prompt anpassen

```typescript
// src/lib/ai/agentic/prompts/briefing-specialist.ts
export const briefingSpecialistPrompt = {
  de: `...

  // Mehr Emphasis auf Tool-Nutzung
  KRITISCHE TOOL-NUTZUNG:
  Du MUSST bei JEDER Antwort mindestens ein Tool aufrufen!
  ...`
};
```

### 2. Skill-Beschreibung verbessern

```typescript
// src/lib/ai/agentic/skills/skill-roadmap.ts
description: `Zeigt die Phasen-Übersicht an.

WICHTIG: Rufe dieses Tool IMMER am Anfang auf!
Das LLM nutzt diese Beschreibung zur Entscheidung.`
```

### 3. Schema anpassen

```typescript
inputSchema: z.object({
  action: z.enum(['showRoadmap', 'completePhase'])
    .describe('Die auszuführende Aktion - showRoadmap für neue Anzeige'),
})
```

## Häufige Probleme

### Agent ruft keine Tools auf

1. Prüfe `functionCallingConfig.mode: 'ANY'` im Flow
2. Prüfe ob Tools korrekt geladen werden
3. Verstärke Tool-Nutzung im Prompt

### Legacy-Tags in Antwort

1. Füge `mustNotContain` in responseValidation hinzu
2. Aktualisiere Prompt: "Nutze NUR Tools, keine Tags"

### Zu wenige Tool-Calls

1. Erhöhe Emphasis im Prompt
2. Prüfe ob alle Skills registriert sind
3. Verbessere Skill-Beschreibungen

## Siehe auch

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System-Architektur
- [SKILLS-GUIDE.md](./SKILLS-GUIDE.md) - Skill-Erstellung
- [test-results/](./test-results/) - Protokoll-Dateien
