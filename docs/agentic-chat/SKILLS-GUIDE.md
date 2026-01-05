# Skills (Tools) Guide

## Überblick

Skills sind Genkit Tools, die dem LLM ermöglichen, mit dem Frontend zu interagieren. Jeder Skill hat ein definiertes Input/Output-Schema und eine Ausführungslogik.

## Skill-Anatomie

### Minimaler Skill

```typescript
// src/lib/ai/agentic/skills/skill-example.ts
import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';

export const skillExample = ai.defineTool(
  {
    name: 'skill_example',           // Eindeutiger Name (snake_case)
    description: `Kurze Beschreibung was der Skill macht.

Das LLM nutzt diese Beschreibung um zu entscheiden wann der Skill aufgerufen wird!
Schreibe klar und präzise was der Skill tut und wann er genutzt werden soll.`,
    inputSchema: z.object({
      action: z.enum(['doSomething', 'doSomethingElse']),
      data: z.string().describe('Beschreibung für das LLM'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      result: z.string().optional(),
    }),
  },
  async (input) => {
    // Ausführungslogik
    return {
      success: true,
      result: `Processed: ${input.data}`,
    };
  }
);
```

## Vorhandene Skills

### skill_roadmap

Steuert die horizontale Phasen-Anzeige im Chat.

```typescript
// Input
{
  action: 'showRoadmap' | 'completePhase',
  phases?: string[],           // Bei showRoadmap
  currentPhaseIndex?: number,  // Bei showRoadmap
  phaseIndex?: number,         // Bei completePhase
}

// Output
{
  success: boolean,
  action: string,
  phases?: string[],
  currentPhaseIndex?: number,
  completedPhaseIndex?: number,
}
```

**Verwendung im Prompt:**
```
PFLICHT: Rufe skill_roadmap mit action="showRoadmap" zu Beginn auf!
```

### skill_todos

Verwaltet die vertikale Checkliste.

```typescript
// Input
{
  items: Array<{
    id: string,
    label: string,
    status: 'open' | 'partial' | 'done',
    value?: string,  // Zusammenfassung der User-Antwort
  }>
}

// Output
{
  success: boolean,
  items: TodoItem[],
  allDone: boolean,  // true wenn alle Items "done"
}
```

**Status-Icons im Frontend:**
- `open`: ○ (leer)
- `partial`: ◐ (halb gefüllt)
- `done`: ● (voll)

### skill_suggestions

Bietet Quick-Reply-Buttons an.

```typescript
// Input
{
  prompts: string[]  // Max 3-4 Vorschläge
}

// Output
{
  success: boolean,
  prompts: string[],
}
```

### skill_confirm

Zeigt eine Bestätigungs-Box mit Zusammenfassung.

```typescript
// Input
{
  title: string,
  summaryItems: Array<{
    key: string,    // z.B. "Unternehmen"
    value: string,  // z.B. "TechStart GmbH"
  }>
}

// Output
{
  success: boolean,
  title: string,
  summaryItems: ConfirmSummaryItem[],
  awaitingConfirmation: boolean,
}
```

### skill_sidebar

Erstellt/aktualisiert das Dokument in der Seitenleiste.

```typescript
// Input
{
  action: 'updateDraft' | 'finalizeDocument',
  content: string,  // Markdown-Inhalt
}

// Output
{
  success: boolean,
  action: string,
  content: string,
  status: 'draft' | 'final',
}
```

### skill_url_crawler

Analysiert eine Webseite und extrahiert Inhalte.

```typescript
// Input
{
  url: string  // Vollständige URL mit https://
}

// Output
{
  success: boolean,
  url: string,
  title?: string,
  content?: string,  // Markdown-Inhalt
  error?: string,
}
```

### skill_dna_lookup

Lädt vorhandene Marken-DNA Dokumente.

```typescript
// Input
{
  companyId: string,
  docType?: 'briefing' | 'swot' | 'audience' | 'positioning' |
            'goals' | 'messages' | 'synthesis' | 'all',
}

// Output
{
  success: boolean,
  companyId: string,
  documents: Record<string, any>,
}
```

## Neuen Skill erstellen

### 1. Datei anlegen

```typescript
// src/lib/ai/agentic/skills/skill-new-feature.ts
import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';

// Input-Schema definieren (wiederverwendbar)
export const NewFeatureInputSchema = z.object({
  // ...
});

export const skillNewFeature = ai.defineTool(
  {
    name: 'skill_new_feature',
    description: `Beschreibung für das LLM...`,
    inputSchema: NewFeatureInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      // ...
    }),
  },
  async (input) => {
    // Logik hier
    return { success: true };
  }
);
```

### 2. In Registry eintragen

```typescript
// src/lib/ai/agentic/skills/index.ts
export { skillNewFeature } from './skill-new-feature';

import { skillNewFeature } from './skill-new-feature';

export const ALL_SKILLS = [
  // ... bestehende Skills
  skillNewFeature,
];

const skillMap: Record<SkillName, any> = {
  // ... bestehende Mappings
  skill_new_feature: skillNewFeature,
};
```

### 3. Type hinzufügen

```typescript
// src/lib/ai/agentic/types.ts
export type SkillName =
  | 'skill_roadmap'
  | 'skill_todos'
  // ...
  | 'skill_new_feature';  // Neu hinzufügen
```

### 4. Agenten-Berechtigung

```typescript
// src/lib/ai/agentic/types.ts
export const AGENT_SKILLS: Record<SpecialistType, SkillName[]> = {
  briefing_specialist: [
    // ... bestehende Skills
    'skill_new_feature',  // Hinzufügen wo benötigt
  ],
  // ...
};
```

### 5. Prompt aktualisieren

```typescript
// src/lib/ai/agentic/prompts/briefing-specialist.ts
export const briefingSpecialistPrompt = {
  de: `...

VERFÜGBARE TOOLS:
- skill_new_feature: Beschreibung was es tut
...`,
};
```

## Best Practices

### Beschreibungen

Die `description` ist entscheidend! Das LLM nutzt sie um zu entscheiden, wann der Skill aufgerufen wird.

**Gut:**
```typescript
description: `Verwaltet die vertikale Checkliste mit Aufgaben/Fragen.

Nutze dieses Tool nach JEDER User-Antwort um den Fortschritt zu visualisieren!

Status-Werte:
- "open": Noch nicht bearbeitet (○)
- "partial": Teilweise bearbeitet (◐)
- "done": Vollständig erledigt (●)

WICHTIG: Wenn ALLE Items auf "done" stehen, rufe danach skill_confirm auf!`
```

**Schlecht:**
```typescript
description: `Aktualisiert die Todo-Liste.`
```

### Input-Schemas

Nutze `.describe()` für jedes Feld:

```typescript
inputSchema: z.object({
  action: z.enum(['showRoadmap', 'completePhase'])
    .describe('Die auszuführende Aktion'),
  phases: z.array(z.string())
    .describe('Liste der Phasen-Namen für showRoadmap')
    .optional(),
})
```

### Fehlerbehandlung

Skills sollten immer ein `success`-Feld zurückgeben:

```typescript
async (input) => {
  try {
    // Logik
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Debugging

### Logs im Flow

Der Flow loggt Tool-Aufrufe:
```
[AgenticFlow] Tool requests: 3
[AgenticFlow] Executing tool: skill_roadmap {...}
[AgenticFlow] Tool result: { success: true, ... }
```

### Genkit Dev UI

```bash
npm run genkit:dev
```

Öffne http://localhost:4002 um:
- Flows interaktiv zu testen
- Tool-Aufrufe zu inspizieren
- Traces zu analysieren

## Siehe auch

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System-Architektur
- [TESTING.md](./TESTING.md) - Test-Infrastruktur
