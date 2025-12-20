# Entwicklungsrichtlinien für Marken-DNA

Dieses Dokument beschreibt die projektweiten Patterns und Standards, die bei der Implementierung der Marken-DNA Features eingehalten werden müssen.

---

## Workflow-Agent

> **WICHTIG:** Für die Implementierung aller Phasen den `marken-dna-impl` Agent verwenden!
>
> Siehe `10-WORKFLOW-AGENT.md` für:
> - Pflichtlektüre pro Phase (nicht nur Masterplan!)
> - Schrittweises Arbeiten mit User-Zustimmung
> - Qualitätsprüfungen (Linter, TypeScript, Tests)
> - Commit-Strategie

### Agent-Aufruf

```
Starte den marken-dna-impl Agent für Phase X
```

### Kernprinzipien

1. **Niemals blind arbeiten** - Immer erst alle relevanten Dokumente lesen
2. **Schrittweise Umsetzung** - Keine kompletten Phasen auf einmal
3. **User-Zustimmung** - Vor jedem Implementierungsschritt Bestätigung holen
4. **Todo-Listen** - Immer sichtbar für den User
5. **Qualität vor Geschwindigkeit** - `npm run lint`, `npm run type-check`, `npm test` vor jedem Commit

---

## Design System

> **WICHTIG:** Alle Marken-DNA Komponenten MÜSSEN dem CeleroPress Design System entsprechen!
>
> Referenz: `docs/design-system/DESIGN_SYSTEM.md`
> Vorbildseite: `src/app/dashboard/contacts/crm/`

### Wichtigste Regeln

| Regel | Pattern | Verboten |
|-------|---------|----------|
| **Icons** | Heroicons `/24/outline` | Emojis, Font Awesome, /20/solid |
| **Farben** | Primary (#005fab), Zinc-Palette | Gray/Slate, eigene Farben |
| **Buttons** | `h-10`, Primary/Secondary Pattern | Eigene Button-Styles |
| **Inputs** | `h-10`, `border-zinc-300` | Andere Border-Farben |
| **Tabellen** | `border-zinc-200`, CRM Pattern | Andere Designs |
| **Schatten** | Keine (nur Dropdowns) | box-shadow |

### Typografie

```typescript
// Überschriften
<h1 className="text-3xl font-semibold text-zinc-900">Seitentitel</h1>
<h2 className="text-2xl font-semibold text-zinc-900">Sektion</h2>
<h3 className="text-base font-semibold text-zinc-900">Card-Header</h3>

// Text
<p className="text-sm text-zinc-700">Haupttext</p>
<span className="text-xs text-zinc-500">Sekundärtext</span>
```

### Heroicons für Marken-DNA

```typescript
import {
  // Navigation
  SparklesIcon,           // Marken-DNA Menü
  MagnifyingGlassIcon,    // Suche
  FunnelIcon,             // Filter

  // Aktionen
  EllipsisVerticalIcon,   // 3-Punkte (stroke-[2.5])
  PlusIcon,               // Hinzufügen
  PencilIcon,             // Bearbeiten
  TrashIcon,              // Löschen
  EyeIcon,                // Anzeigen

  // Content
  DocumentTextIcon,       // Dokument
  ChatBubbleLeftRightIcon, // Chat
  CheckCircleIcon,        // Vollständig
  LightBulbIcon,          // Vorschläge

  // Chat
  PaperAirplaneIcon,      // Senden
  ArrowPathIcon,          // Regenerieren
  ClipboardDocumentIcon,  // Kopieren
} from '@heroicons/react/24/outline';
```

---

## 1. Toast-Benachrichtigungen

### Zentraler Toast-Service

Alle Benutzer-Benachrichtigungen erfolgen über den zentralen `toastService`:

```typescript
import { toastService } from '@/lib/utils/toast';
```

### Verfügbare Methoden

| Methode | Verwendung | Dauer |
|---------|------------|-------|
| `toastService.success(message)` | Erfolgreiche Aktionen | 3s |
| `toastService.error(message)` | Fehlermeldungen | 5s |
| `toastService.info(message)` | Informationen | 4s |
| `toastService.warning(message)` | Warnungen | 4s |
| `toastService.loading(message)` | Ladezustand | bis dismiss |
| `toastService.promise(promise, messages)` | Async-Operationen | automatisch |

### Pattern für Mutations

```typescript
// ✅ RICHTIG: Mit toastService
const { mutate: synthesize } = useSynthesizeDNA({
  onSuccess: () => {
    toastService.success('DNA Synthese erfolgreich erstellt');
  },
  onError: (error) => {
    toastService.error(`Fehler bei DNA Synthese: ${error.message}`);
  },
});

// ✅ RICHTIG: Mit promise für automatisches Loading/Success/Error
const handleSave = async () => {
  await toastService.promise(
    saveDocument(data),
    {
      loading: 'Dokument wird gespeichert...',
      success: 'Dokument gespeichert',
      error: 'Fehler beim Speichern',
    }
  );
};

// ❌ FALSCH: Keine Benachrichtigung
const { mutate: delete } = useDeleteDocument();
// User bekommt kein Feedback!
```

### Toast-Texte für Marken-DNA (mit i18n-Keys)

| Aktion | i18n-Key (Success) | i18n-Key (Error) |
|--------|-------------------|------------------|
| DNA Synthese erstellen | `markenDNA.synthesisSaved` | `markenDNA.synthesisError` |
| DNA Synthese löschen | `markenDNA.synthesisDeleted` | `deleteError` |
| DNA Synthese aktualisieren | `markenDNA.synthesisUpdated` | `saveError` |
| Marken-DNA Dokument speichern | `markenDNA.documentSaved` | `saveError` |
| Marken-DNA Dokument löschen | `markenDNA.documentDeleted` | `deleteError` |
| Alle Dokumente löschen | `markenDNA.allDocumentsDeleted` | `deleteError` |
| Kernbotschaft speichern | `markenDNA.kernbotschaftSaved` | `saveError` |
| Text-Matrix generieren | `markenDNA.textMatrixGenerated` | `markenDNA.generationError` |
| In Zwischenablage kopieren | `copySuccess` | `copyError` |
| Chat-Fehler | - | `markenDNA.chatError` |
| Dokument vollständig | `markenDNA.documentComplete` | - |

**Verwendung:**
```typescript
const tToast = useTranslations('toasts');

// Success
toastService.success(tToast('markenDNA.synthesisSaved'));

// Error mit Variable
toastService.error(tToast('markenDNA.synthesisError', { error: error.message }));

// Allgemeine Keys (bereits vorhanden)
toastService.success(tToast('copySuccess'));
```

### Regeln

1. **Immer Feedback geben** - Jede Benutzeraktion braucht eine Rückmeldung
2. **Konsistente Texte** - Verwende die definierten Texte aus der Tabelle
3. **Fehler mit Details** - Bei Fehlern wenn möglich die Ursache angeben
4. **Keine doppelten Toasts** - Prüfen ob bereits ein Toast angezeigt wird

---

## 2. Internationalisierung (i18n)

Die gesamte UI ist mehrsprachig über **next-intl**. Alle hardcodierten Texte müssen durch Übersetzungsaufrufe ersetzt werden.

> **Vollständige Dokumentation:** `docs/translation/`

### Grundlegendes Pattern

```typescript
import { useTranslations } from 'next-intl';

function MarkenDNAComponent() {
  const t = useTranslations('markenDNA');       // Für UI-Texte
  const tToast = useTranslations('toasts');     // Für Toast-Meldungen
  const tCommon = useTranslations('common');    // Für gemeinsame Texte

  return (
    <div>
      <h1>{t('title')}</h1>
      <Button onClick={handleSave}>
        {tCommon('save')}
      </Button>
    </div>
  );
}
```

### Toast-Aufrufe mit i18n

```typescript
// ✅ RICHTIG: Mit Übersetzung
const tToast = useTranslations('toasts');

toastService.success(tToast('markenDNA.synthesisSaved'));
toastService.error(tToast('markenDNA.synthesisError', { error: error.message }));

// ❌ FALSCH: Hardcodierte Texte
toastService.success('DNA Synthese erfolgreich erstellt');
```

### Marken-DNA Namespace

Neue Keys werden in `/messages/de.json` und `/messages/en.json` unter dem Namespace `markenDNA` angelegt:

```json
// messages/de.json
{
  "markenDNA": {
    "title": "Marken-DNA",
    "synthesis": {
      "title": "DNA Synthese",
      "create": "DNA synthetisieren",
      "resynthesize": "Neu synthetisieren",
      "edit": "Bearbeiten",
      "delete": "Löschen",
      "active": "DNA Synthese aktiv",
      "incomplete": "Die Marken-DNA von {companyName} ist noch nicht vollständig.",
      "createHint": "Erstelle eine KI-optimierte Kurzform der Marken-DNA für {companyName}."
    },
    "kernbotschaft": {
      "title": "Kernbotschaft erarbeiten",
      "placeholder": "Beschreiben Sie den Anlass, Ihre Ziele...",
      "contextHint": "DNA Synthese wird als Kontext verwendet"
    },
    "textMatrix": {
      "title": "Text-Matrix",
      "generate": "Text-Matrix generieren",
      "rework": "Mit KI umarbeiten"
    },
    "documents": {
      "briefing": "Briefing-Check",
      "swot": "SWOT-Analyse",
      "audience": "Zielgruppen-Radar",
      "positioning": "Positionierungs-Designer",
      "goals": "Ziele-Setzer",
      "messages": "Botschaften-Baukasten"
    },
    "status": {
      "complete": "Vollständig",
      "incomplete": "Unvollständig"
    }
  },
  "toasts": {
    "markenDNA": {
      "synthesisSaved": "DNA Synthese erfolgreich erstellt",
      "synthesisDeleted": "DNA Synthese gelöscht",
      "synthesisUpdated": "Änderungen gespeichert",
      "synthesisError": "Fehler bei DNA Synthese: {error}",
      "documentSaved": "Dokument gespeichert",
      "documentDeleted": "Dokument gelöscht",
      "allDocumentsDeleted": "Alle Marken-DNA Dokumente gelöscht",
      "kernbotschaftSaved": "Kernbotschaft gespeichert",
      "textMatrixGenerated": "Text-Matrix erfolgreich generiert",
      "generationError": "Fehler bei Generierung: {error}",
      "chatError": "Chat-Fehler: {error}",
      "documentComplete": "Dokument ist vollständig - bereit zum Speichern"
    }
  }
}
```

### Regeln für i18n

1. **Keine hardcodierten deutschen Texte** - Alles über `t()` Aufrufe
2. **Konsistente Namespaces** - `markenDNA` für UI, `toasts.markenDNA` für Toasts
3. **Variablen verwenden** - `{companyName}`, `{error}` statt String-Konkatenation
4. **Beide Sprachen pflegen** - de.json UND en.json immer synchron halten
5. **Type-Safety** - TypeScript validiert die Keys automatisch

---

## 3. Mehrsprachige KI-Ausgaben

Wenn ein Benutzer die UI auf Englisch eingestellt hat, sollen auch die KI-Chats und deren Ausgaben auf Englisch sein.

### Sprach-Ermittlung

Die UI-Sprache wird aus dem Cookie `NEXT_LOCALE` gelesen:

```typescript
import { getLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { UILanguage } from '@/config/i18n';

// In Server Components / API Routes
const locale = await getLocale(); // 'de' oder 'en'

// Alternativ direkt aus Cookie
const cookieStore = await cookies();
const locale = cookieStore.get('NEXT_LOCALE')?.value || 'de';
```

### Genkit Flow mit Sprach-Parameter

Alle KI-Flows müssen einen `language` Parameter akzeptieren:

```typescript
// src/lib/ai/flows/marken-dna-chat.ts
import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getSystemPrompt } from '@/lib/ai/prompts/marken-dna-prompts';

const MarkenDNAChatInputSchema = z.object({
  documentType: z.enum(['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages']),
  companyId: z.string(),
  companyName: z.string(),
  language: z.enum(['de', 'en']).default('de'),  // ← UI-Sprache für KI-Ausgabe
  messages: z.array(ChatMessageSchema),
});

export const markenDNAChatFlow = ai.defineFlow(
  {
    name: 'markenDNAChatFlow',
    inputSchema: MarkenDNAChatInputSchema,
    outputSchema: MarkenDNAChatOutputSchema,
  },
  async (input) => {
    // System-Prompt basierend auf Sprache wählen
    const systemPrompt = getSystemPrompt(input.documentType, input.language, input.companyName);

    // Generieren mit Genkit
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
      system: systemPrompt,
      messages: input.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        content: [{ text: msg.content }],
      })),
      config: { temperature: 0.7 },
    });

    return { response: response.text, ... };
  }
);
```

### Mehrsprachige System-Prompts

```typescript
// src/lib/ai/prompts/marken-dna.ts

type PromptLanguage = 'de' | 'en';

const PROMPTS: Record<MarkenDNADocumentType, Record<PromptLanguage, string>> = {
  briefing: {
    de: `Du bist ein erfahrener PR-Stratege, der ein Briefing-Check durchführt.

DEIN ZIEL:
Erarbeite mit dem User die Faktenbasis des Unternehmens...`,

    en: `You are an experienced PR strategist conducting a briefing check.

YOUR GOAL:
Work with the user to establish the company's factual foundation...`,
  },
  // ... weitere Dokumenttypen (vollständig in 04-PHASE-3-KI-CHAT.md)
};

export function getSystemPrompt(
  documentType: MarkenDNADocumentType,
  language: PromptLanguage = 'de',
  companyName: string
): string {
  const basePrompt = PROMPTS[documentType][language] || PROMPTS[documentType]['de'];
  return basePrompt.replace('{companyName}', companyName);
}
```

> **Hinweis:** Die vollständigen System-Prompts für alle 6 Dokumenttypen befinden sich in `04-PHASE-3-KI-CHAT.md`.

### API-Route mit Sprach-Übergabe

```typescript
// src/app/api/ai-chat/marken-dna/route.ts
import { markenDNAChatFlow } from '@/lib/ai/flows/marken-dna-chat';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    // Flow aufrufen - language wird aus body übergeben
    const result = await markenDNAChatFlow(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat Error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
```

### Frontend: Sprache via useGenkitChat Hook übergeben

```typescript
import { useLocale } from 'next-intl';
import { useState, useCallback } from 'react';

export function useGenkitChat(options: UseGenkitChatOptions) {
  const locale = useLocale();  // 'de' oder 'en'
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (userMessage: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-chat/marken-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...options,
          language: locale,  // ← Sprache wird bei jedem Request mitgesendet
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      const result = await response.json();
      // Messages aktualisieren, document/progress/suggestions extrahieren...
    } finally {
      setIsLoading(false);
    }
  }, [options, locale, messages]);

  return { messages, sendMessage, isLoading, ... };
}
```

> **Hinweis:** Die vollständige Hook-Definition mit Dokument-Extraktion etc. befindet sich in `08-CHAT-UI-KONZEPT.md`.

### Regeln für KI-Sprache

1. **Immer Sprache übergeben** - Alle Genkit Flows müssen `language` Parameter im Input-Schema haben
2. **Fallback auf Deutsch** - Wenn Sprache nicht bekannt, deutsch verwenden
3. **Konsistente Ausgabe** - Die KI antwortet in der übergebenen Sprache
4. **Fachbegriffe** - Glossar-Einträge werden sprachspezifisch angewendet
5. **Dokument-Sprache** - Generierte Dokumente folgen der UI-Sprache

### Sonderfall: Marken-DNA Dokumente

Die Marken-DNA eines Kunden wird **immer in der Sprache erstellt, die der Benutzer bei der Erstellung verwendet**. Diese Sprache wird im Dokument gespeichert:

```typescript
interface MarkenDNADocument {
  // ...
  language: 'de' | 'en';  // Sprache des Dokuments
  // ...
}
```

**Wichtig:** Die DNA Synthese und Text-Matrix werden in der gleichen Sprache wie die Marken-DNA erstellt, um Konsistenz zu gewährleisten.

---

## 4. Test-Strategie

> **Referenz:** Bestehende Tests in `src/__tests__/` und `src/**/components/**/__tests__/`

### Test-Struktur

```
src/
├── __tests__/                              # Globale Tests
│   ├── features/                           # Feature-Tests (übergreifend)
│   └── api/                                # API-Tests
│
├── lib/
│   ├── firebase/__tests__/                 # Service-Tests
│   └── hooks/__tests__/                    # Hook-Tests
│
└── app/dashboard/library/marken-dna/
    └── __tests__/
        ├── integration/                    # Integration Tests (CRUD-Flows)
        │   └── marken-dna-flow.test.tsx
        └── unit/                           # Unit Tests (Komponenten)
            ├── StatusCircles.test.tsx
            └── CompanyActionsDropdown.test.tsx
```

### Test-Kategorien

| Kategorie | Beschreibung | Beispiel |
|-----------|--------------|----------|
| **Integration** | Vollständige User-Flows | CRUD, Seite laden → Aktion → Ergebnis |
| **Unit** | Einzelne Komponenten | StatusCircles rendert korrekt |
| **Service** | Firebase Services | markenDNAService.getAll() |
| **Hook** | React Query Hooks | useMarkenDNA(), useSynthesizeDNA() |
| **Flow** | Genkit AI Flows | markenDNAChatFlow mit Mock-Response |

---

### Standard Test-Setup

#### QueryClient Wrapper (für React Query)

```typescript
// test-utils/queryClientWrapper.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};
```

#### Standard Mocks (für jeden Test)

```typescript
// __tests__/marken-dna-flow.test.tsx

// 1. Firebase Service Mocks
jest.mock('@/lib/firebase/marken-dna-service', () => ({
  markenDNAService: {
    getAll: jest.fn(),
    get: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    deleteAll: jest.fn(),
    getCompanyStatus: jest.fn(),
  },
}));

// 2. Context Mocks (IMMER benötigt!)
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id', email: 'test@example.com' },
  }),
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'test-org-id', name: 'Test Org' },
  }),
}));

// 3. next-intl Mocks
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'de',
}));

// 4. Toast Service Mock
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));
```

---

### Integration Test Pattern

```typescript
// __tests__/integration/marken-dna-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MarkenDNAPage from '../../page';
import { markenDNAService } from '@/lib/firebase/marken-dna-service';

// Mock Daten
const mockCustomers = [
  {
    id: 'company-1',
    name: 'IBD Wickeltechnik GmbH',
    type: 'customer',
    markenDNAStatus: {
      briefing: true,
      swot: true,
      audience: false,
      positioning: false,
      goals: false,
      messages: false,
    },
  },
];

describe('Marken-DNA CRUD Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    (markenDNAService.getAll as jest.Mock).mockResolvedValue(mockCustomers);
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('lädt Kunden und zeigt Status-Kreise an', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MarkenDNAPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
    });

    // Status-Kreise: 2 von 6 = 33%
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('öffnet Editor-Modal bei Klick auf Dokument erstellen', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MarkenDNAPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
    });

    // 3-Punkte-Menü öffnen
    const menuButton = screen.getByRole('button', { name: /aktionen/i });
    fireEvent.click(menuButton);

    // "Zielgruppen-Radar" sollte "Erstellen" zeigen (noch nicht vorhanden)
    const createButton = screen.getByText('Zielgruppen-Radar');
    fireEvent.click(createButton);

    // Modal sollte sich öffnen
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
```

---

### Hook Test Pattern

```typescript
// lib/hooks/__tests__/useMarkenDNAData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useMarkenDNA, useSynthesizeDNA } from '../useMarkenDNAData';
import { markenDNAService } from '@/lib/firebase/marken-dna-service';
import { createWrapper } from '@/test-utils/queryClientWrapper';

jest.mock('@/lib/firebase/marken-dna-service');

describe('useMarkenDNAData Hooks', () => {
  const mockCompanyId = 'company-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useMarkenDNA', () => {
    it('sollte Marken-DNA Dokumente laden', async () => {
      const mockDocuments = {
        briefing: { content: 'Briefing Inhalt', isComplete: true },
        swot: null,
      };
      (markenDNAService.getAll as jest.Mock).mockResolvedValue(mockDocuments);

      const { result } = renderHook(
        () => useMarkenDNA(mockCompanyId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDocuments);
      expect(markenDNAService.getAll).toHaveBeenCalledWith(mockCompanyId);
    });
  });

  describe('useSynthesizeDNA', () => {
    it('sollte DNA Synthese erstellen', async () => {
      const mockSynthesis = { content: 'Synthese...' };
      (markenDNAService.synthesize as jest.Mock).mockResolvedValue(mockSynthesis);

      const { result } = renderHook(
        () => useSynthesizeDNA(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({ companyId: mockCompanyId });

      expect(markenDNAService.synthesize).toHaveBeenCalledWith(mockCompanyId);
    });
  });
});
```

---

### Genkit Flow Test Pattern

```typescript
// lib/ai/flows/__tests__/marken-dna-chat.test.ts
import { markenDNAChatFlow } from '../marken-dna-chat';

// Genkit/AI Mocks
jest.mock('@/lib/ai/genkit-config', () => ({
  ai: {
    generate: jest.fn(),
    defineFlow: jest.fn((config, handler) => handler),
  },
}));

jest.mock('@genkit-ai/google-genai', () => ({
  googleAI: {
    model: jest.fn(() => 'mock-model'),
  },
}));

describe('markenDNAChatFlow', () => {
  const { ai } = require('@/lib/ai/genkit-config');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte KI-Antwort mit Dokument-Markup generieren', async () => {
    const mockResponse = {
      text: `Gut! Hier ist der Entwurf:

[DOCUMENT]
## Briefing-Check
- Branche: Maschinenbau
[/DOCUMENT]

[PROGRESS:25]

Was möchtest du als nächstes besprechen?

[SUGGESTIONS]
Zielgruppen definieren
Wettbewerber analysieren
[/SUGGESTIONS]`,
    };

    ai.generate.mockResolvedValue(mockResponse);

    const result = await markenDNAChatFlow({
      documentType: 'briefing',
      companyId: 'company-123',
      companyName: 'Test GmbH',
      language: 'de',
      messages: [{ role: 'user', content: 'Wir sind ein Maschinenbauer' }],
    });

    expect(result.response).toContain('Gut! Hier ist der Entwurf');
    expect(result.document).toContain('## Briefing-Check');
    expect(result.progress).toBe(25);
    expect(result.suggestions).toContain('Zielgruppen definieren');
  });

  it('sollte auf Englisch antworten wenn language=en', async () => {
    ai.generate.mockResolvedValue({ text: 'Here is the draft...' });

    await markenDNAChatFlow({
      documentType: 'briefing',
      companyId: 'company-123',
      companyName: 'Test GmbH',
      language: 'en',
      messages: [{ role: 'user', content: 'We are a machine manufacturer' }],
    });

    // Prüfen dass englischer System-Prompt verwendet wurde
    expect(ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('You are an experienced PR strategist'),
      })
    );
  });
});
```

---

### Komponenten Test Pattern

```typescript
// __tests__/unit/StatusCircles.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusCircles } from '../../components/StatusCircles';

describe('StatusCircles', () => {
  const mockDocuments = {
    briefing: true,
    swot: true,
    audience: false,
    positioning: false,
    goals: false,
    messages: false,
  };

  it('rendert 6 Kreise mit korrekten Farben', () => {
    render(<StatusCircles documents={mockDocuments} />);

    const circles = screen.getAllByRole('button');
    expect(circles).toHaveLength(6);

    // 2 grün, 4 grau
    expect(circles[0]).toHaveClass('bg-green-500');
    expect(circles[1]).toHaveClass('bg-green-500');
    expect(circles[2]).toHaveClass('bg-zinc-300');
  });

  it('zeigt korrekten Prozentsatz', () => {
    render(<StatusCircles documents={mockDocuments} />);
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('ruft onCircleClick bei Klick auf', () => {
    const handleClick = jest.fn();
    render(
      <StatusCircles
        documents={mockDocuments}
        clickable
        onCircleClick={handleClick}
      />
    );

    fireEvent.click(screen.getAllByRole('button')[2]); // audience
    expect(handleClick).toHaveBeenCalledWith('audience');
  });

  it('zeigt Tooltips mit Dokumentnamen', () => {
    render(<StatusCircles documents={mockDocuments} />);

    const firstCircle = screen.getAllByRole('button')[0];
    expect(firstCircle).toHaveAttribute('title', 'Briefing-Check');
  });
});
```

---

### Test-Befehle

```bash
# Alle Tests
npm test

# Nur Marken-DNA Tests
npm test -- --testPathPattern="marken-dna"

# Mit Coverage
npm run test:coverage -- --testPathPattern="marken-dna"

# Watch Mode (Entwicklung)
npm test -- --watch --testPathPattern="marken-dna"

# Einzelne Datei
npm test -- src/app/dashboard/library/marken-dna/__tests__/integration/marken-dna-flow.test.tsx
```

---

### Test-Checkliste für Marken-DNA

#### Services (`lib/firebase/`)
- [ ] `markenDNAService.getAll(companyId)`
- [ ] `markenDNAService.get(companyId, docType)`
- [ ] `markenDNAService.save(companyId, docType, data)`
- [ ] `markenDNAService.delete(companyId, docType)`
- [ ] `markenDNAService.deleteAll(companyId)`
- [ ] `markenDNAService.getCompanyStatus(companyId)`
- [ ] `dnaSyntheseService.synthesize(companyId)`

#### Hooks (`lib/hooks/`)
- [ ] `useMarkenDNA(companyId)` - Lädt alle Dokumente
- [ ] `useSaveMarkenDNA()` - Mutation zum Speichern
- [ ] `useDeleteMarkenDNA()` - Mutation zum Löschen
- [ ] `useSynthesizeDNA()` - Mutation für Synthese
- [ ] `useMarkenDNAStatus(companyId)` - Status-Berechnung

#### Genkit Flows (`lib/ai/flows/`)
- [ ] `markenDNAChatFlow` - Chat-Antworten mit Dokument-Markup
- [ ] `dnaSyntheseFlow` - Synthese-Generierung
- [ ] Sprach-Switching (de/en)
- [ ] Error-Handling

#### Komponenten (`components/marken-dna/`)
- [ ] `StatusCircles` - Rendering, Klick, Tooltips
- [ ] `CompanyActionsDropdown` - Menü-Items, Aktionen
- [ ] `MarkenDNAEditorModal` - Split-View, Chat, Speichern
- [ ] `ChatInterface` - Messages, Input, Loading

#### Integration (`__tests__/integration/`)
- [ ] Seite laden → Kunden anzeigen
- [ ] Suche und Filter funktionieren
- [ ] Dokument erstellen Flow
- [ ] Dokument bearbeiten Flow
- [ ] Alle Dokumente löschen

---

## Checkliste für neue Features

### Design System
- [ ] Heroicons `/24/outline` statt Emojis oder andere Icons
- [ ] Zinc-Palette für Grautöne (nicht gray/slate)
- [ ] Primary-Farbe (#005fab) für Aktionen
- [ ] `h-10` für alle interaktiven Elemente
- [ ] CRM-Seiten als Referenz geprüft

### Funktionalität
- [ ] Toast-Benachrichtigungen für alle Benutzeraktionen
- [ ] Alle UI-Texte über i18n
- [ ] KI-Ausgaben in Benutzersprache
- [ ] Error-Handling mit aussagekräftigen Meldungen
- [ ] Loading-States während async Operationen

### Qualität
- [ ] Tests geschrieben
- [ ] TypeScript-Fehler behoben
- [ ] Code-Review angefragt

### Dokumentation (siehe `09-DOKUMENTATION.md`)
- [ ] JSDoc für öffentliche Funktionen
- [ ] README für neue Module
- [ ] API-Dokumentation für Services/Hooks
- [ ] ADR für Architektur-Entscheidungen
