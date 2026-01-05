# Agentic Chat System - Architektur

## Überblick

Das Agentic Chat System basiert auf Genkit und ermöglicht strukturierte Multi-Turn-Konversationen mit Tool-Nutzung. Jeder Spezialist hat Zugriff auf definierte Skills (Tools), die er zur Interaktion mit dem Frontend nutzt.

## Kernkomponenten

```
src/lib/ai/agentic/
├── flows/
│   └── agentic-chat-flow.ts    # Haupt-Flow
├── skills/
│   ├── index.ts                # Skill-Registry
│   ├── skill-roadmap.ts        # Phasen-Anzeige
│   ├── skill-todos.ts          # Checkliste
│   ├── skill-suggestions.ts    # Quick-Replies
│   ├── skill-confirm.ts        # Bestätigungs-Box
│   ├── skill-sidebar.ts        # Dokument-Editor
│   ├── skill-url-crawler.ts    # Webseiten-Analyse
│   └── skill-dna-lookup.ts     # DNA-Kontext laden
├── prompts/
│   ├── prompt-loader.ts        # Prompt-Registry
│   └── [specialist].ts         # Pro Spezialist
├── types.ts                    # Type-Definitionen
└── test-data/                  # Test-Infrastruktur
```

## Flow-Architektur

### 1. Eingabe-Schema

```typescript
const AgenticChatInputSchema = z.object({
  specialistType: z.enum([
    'orchestrator',
    'briefing_specialist',
    'swot_specialist',
    'audience_specialist',
    'positioning_specialist',
    'goals_specialist',
    'messages_specialist',
    'project_wizard',
  ]),
  companyId: z.string(),
  companyName: z.string(),
  language: z.enum(['de', 'en']).default('de'),
  messages: z.array(ChatMessageSchema),
});
```

### 2. Ausgabe-Schema

```typescript
const AgenticChatOutputSchema = z.object({
  response: z.string(),           // Text-Antwort
  toolCalls: z.array(ToolCallSchema), // Ausgeführte Tools
  nextAgent: z.string().optional(),   // Handoff zu anderem Agenten
});
```

## Tool-Forcing Strategie

### Problem
LLMs nutzen Tools nicht zuverlässig, selbst wenn der Prompt es vorgibt.

### Lösung: Drei-Stufen-Ansatz

```typescript
const response = await ai.generate({
  model: gemini25FlashModel,
  system: systemPrompt,
  messages: formattedMessages,
  tools: tools,

  // 1. returnToolRequests stoppt nach Tool-Requests
  returnToolRequests: true,

  config: {
    temperature: 0.7,
    // 2. mode='ANY' erzwingt Tool-Nutzung
    functionCallingConfig: {
      mode: 'ANY',
    },
  },
});

// 3. Manuelle Tool-Ausführung
if (response.toolRequests.length > 0) {
  for (const request of response.toolRequests) {
    const tool = tools.find(t => t.__action?.name === request.toolRequest.name);
    const result = await tool(request.toolRequest.input);
    // ...
  }
}

// 4. Follow-up Generate für Text-Response
const followUpResponse = await ai.generate({
  model: gemini25FlashModel,
  messages: [...originalMessages, toolRequestMessage, toolResponseMessage],
  // KEIN mode='ANY' hier - wir wollen Text
});
```

### Konfigurationsoptionen

| Option | Wert | Effekt |
|--------|------|--------|
| `functionCallingConfig.mode` | `'AUTO'` | Model entscheidet (Standard) |
| `functionCallingConfig.mode` | `'ANY'` | Erzwingt Tool-Nutzung |
| `functionCallingConfig.mode` | `'NONE'` | Verbietet Tool-Nutzung |
| `returnToolRequests` | `true` | Stoppt nach Tool-Requests |
| `maxTurns` | `number` | Begrenzt Tool-Iterationen |

## Skill-Berechtigungen

Jeder Spezialist hat nur Zugriff auf definierte Skills:

```typescript
const AGENT_SKILLS: Record<SpecialistType, SkillName[]> = {
  orchestrator: ['skill_dna_lookup', 'skill_roadmap', 'skill_suggestions'],
  briefing_specialist: [
    'skill_url_crawler',
    'skill_roadmap',
    'skill_todos',
    'skill_confirm',
    'skill_sidebar',
    'skill_suggestions'
  ],
  swot_specialist: [
    'skill_dna_lookup',
    'skill_roadmap',
    'skill_todos',
    'skill_confirm',
    'skill_sidebar',
    'skill_suggestions'
  ],
  // ... weitere Spezialisten
};
```

## Message-Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User-Nachricht empfangen                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. System-Prompt laden (loadSpecialistPrompt)                    │
│    - Spezialist-spezifischer Prompt                              │
│    - Kontext (Firmenname, Sprache)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Tools laden (getSkillsForAgent)                               │
│    - Nur erlaubte Skills für diesen Agenten                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ai.generate() mit mode='ANY' + returnToolRequests=true        │
│    → Stoppt mit Tool-Requests                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Tools manuell ausführen                                       │
│    - Für jeden toolRequest: tool(input)                          │
│    - Ergebnisse sammeln                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Follow-up Generate (ohne mode='ANY')                          │
│    - Mit Tool-Responses in Messages                              │
│    → Text-Antwort erhalten                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Response zurückgeben                                          │
│    { response, toolCalls, nextAgent }                            │
└─────────────────────────────────────────────────────────────────┘
```

## Wichtige Erkenntnisse

### 1. Tool-Ausführung in Genkit

```typescript
// Genkit Tools sind direkt aufrufbar
const result = await tool(input);

// NICHT so:
// tool.__action.fn(input) // Funktioniert nicht!
```

### 2. Tool-Name Lookup

```typescript
// Tools finden über __action.name
const tool = tools.find(t => {
  const name = t.__action?.name || t.name || t.__name;
  return name === toolName;
});
```

### 3. Follow-up Message Format

```typescript
// Tool-Request Message (vom Model)
{
  role: 'model',
  content: [{ toolRequest: { name, input, ref } }]
}

// Tool-Response Message (von uns)
{
  role: 'tool',
  content: [{ toolResponse: { name, ref, output } }]
}
```

## Siehe auch

- [SKILLS-GUIDE.md](./SKILLS-GUIDE.md) - Wie man Skills erstellt
- [TESTING.md](./TESTING.md) - Test-Infrastruktur
- [test-results/](./test-results/) - Ergebnisprotokolle
