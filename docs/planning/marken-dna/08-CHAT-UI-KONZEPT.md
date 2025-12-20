# Chat-UI Konzept: KI-Chat mit Genkit

## Ziel

Ein modernes, ChatGPT-ähnliches Chat-Erlebnis für die Marken-DNA Erstellung mit Markdown-Rendering und intelligenten Features.

---

## Design System Referenz

> **WICHTIG:** Alle UI-Komponenten MÜSSEN dem CeleroPress Design System entsprechen!
>
> Referenz: `docs/design-system/DESIGN_SYSTEM.md`

### Wichtige Regeln für Chat-UI

- **Icons:** Ausschließlich Heroicons `/24/outline` - KEINE Emojis!
- **Farben:** Primary (#005fab), Zinc-Palette für Grautöne
- **Input-Höhe:** `h-10` für Chat-Input
- **Schatten:** Keine (außer Dropdowns)
- **Borders:** `border-zinc-300` für Inputs, `border-zinc-200` für Cards/Dividers

### Verwendete Heroicons

```typescript
import {
  // Chat-Aktionen
  PaperAirplaneIcon,      // Senden
  ArrowPathIcon,          // Regenerieren
  ClipboardDocumentIcon,  // Kopieren
  HandThumbUpIcon,        // Feedback positiv
  HandThumbDownIcon,      // Feedback negativ

  // Content
  DocumentTextIcon,       // Dokument anzeigen
  ChatBubbleLeftRightIcon, // Chat-Icon
  LightBulbIcon,          // Vorschläge
  CheckIcon,              // Speichern bestätigt

  // Navigation
  XMarkIcon,              // Modal schließen
  ChevronDownIcon,        // Collapse
  ChevronUpIcon,          // Expand
} from '@heroicons/react/24/outline';
```

---

## Design-Entscheidungen

| Entscheidung | Gewählt | Begründung |
|--------------|---------|------------|
| Layout | **Fullscreen Modal** | Fokussiertes Arbeiten, kein Split-View |
| Backend | **Genkit Flows** | Bereits im Projekt, konsistente Architektur |
| Markdown | **react-markdown** | Bewährt, leichtgewichtig |
| History | **Persistiert + Fortsetzbar** | Nachvollziehbarkeit, Weiterarbeit möglich |

---

## Tech-Stack

```
Frontend:
├── useGenkitChat Hook             # Eigener Hook für Genkit API
├── react-markdown                  # KI-Antworten formatieren
├── rehype-highlight                # Code-Syntax-Highlighting
└── Bestehende UI-Komponenten       # Button, Modal, Avatar, etc.

Backend:
├── Genkit Flows                    # markenDNAChatFlow, projectStrategyChatFlow
├── @genkit-ai/google-genai         # Gemini-Integration
└── Firestore                       # Chat-Persistenz
```

### Dependencies

```bash
npm install react-markdown rehype-highlight
# Genkit bereits vorhanden
```

---

## UI-Design

### Fullscreen Modal Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [DocumentTextIcon] Briefing-Check für IBD Wickeltechnik    [XMarkIcon] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ CeleroPress                      [ClipboardDocumentIcon][ArrowPathIcon] │
│  │                                                                 │   │
│  │ Willkommen! Ich bin dein PR-Stratege und helfe dir,            │   │
│  │ das **Briefing** für IBD Wickeltechnik zu erstellen.           │   │
│  │                                                                 │   │
│  │ Lass uns mit den Grundlagen starten.                           │   │
│  │                                                                 │   │
│  │ **In welcher Branche ist das Unternehmen tätig?**              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Maschinenbau] [IT-Dienstleister] [Produktion] [Handel]                │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                          Du     │   │
│  │                                                                 │   │
│  │ Wir sind Hersteller von Wickelmaschinen für die Industrie.     │   │
│  │ Hauptsitz ist in Stuttgart, etwa 120 Mitarbeiter.              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ CeleroPress                                                     │   │
│  │                                                                 │   │
│  │ Perfekt! Maschinenbau mit Fokus auf Wickeltechnik - das ist    │   │
│  │ ein spezialisierter B2B-Markt mit klarer Zielgruppe.           │   │
│  │                                                                 │   │
│  │ ┌─────────────────────────────────────────────────────────┐    │   │
│  │ │ [DocumentTextIcon] Dokument-Entwurf    [ChevronUpIcon]  │    │   │
│  │ ├─────────────────────────────────────────────────────────┤    │   │
│  │ │ ## Unternehmen                                          │    │   │
│  │ │ - **Branche:** Maschinenbau / Wickeltechnik             │    │   │
│  │ │ - **Standort:** Stuttgart                               │    │   │
│  │ │ - **Größe:** ~120 Mitarbeiter                           │    │   │
│  │ └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                 │   │
│  │ **Wer sind eure Hauptkunden?**                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [LightBulbIcon] Vorschläge:                                            │
│  [Automobilzulieferer] [Elektroindustrie] [Beide]                       │
│                                                                         │
│  ════════════════════════════════════════════════════════════════════  │
│  Fortschritt: ████████░░░░░░░░░░░░ 40% · 3 von 8 Bereichen             │
│  ════════════════════════════════════════════════════════════════════  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [Nachricht eingeben...]                           [PaperAirplaneIcon] │
│                                                                         │
│  [DocumentTextIcon] Dokument          [CheckIcon] Speichern & Schließen │
└─────────────────────────────────────────────────────────────────────────┘
```

**Design System Styling:**
- Header: `bg-zinc-50 border-b border-zinc-200`
- AI Message: `bg-white border border-zinc-200 rounded-lg`
- User Message: `bg-primary text-white rounded-lg`
- Suggested Prompts: `bg-white border border-zinc-200 rounded-full hover:bg-zinc-50`
- Progress Bar: `bg-primary` für Fortschritt, `bg-zinc-200` für Hintergrund
- Input: `h-10 border-zinc-300 focus:ring-primary`
- Buttons: Primary/Secondary gemäß Design System

---

## Komponenten-Architektur

```
src/components/ai-chat/
├── AIChatModal.tsx              # Fullscreen Modal Container
│
├── components/
│   ├── ChatHeader.tsx           # Titel, Dokumenttyp, Progress, Close
│   ├── MessageList.tsx          # Scroll-Container mit Auto-Scroll
│   ├── Message.tsx              # Router für User/AI Message
│   │   ├── UserMessage.tsx      # Einfache Bubble rechts
│   │   └── AIMessage.tsx        # Markdown, Actions, Document-Preview
│   ├── MessageActions.tsx       # Copy, Regenerate, Thumbs Up/Down
│   ├── DocumentPreview.tsx      # Collapsible Dokument-Card
│   ├── SuggestedPrompts.tsx     # Klickbare Vorschläge
│   ├── ProgressBar.tsx          # Fortschrittsanzeige
│   ├── ChatInput.tsx            # Textarea + Send Button
│   └── LoadingIndicator.tsx     # Lade-Animation
│
├── hooks/
│   ├── useGenkitChat.ts         # Genkit API Wrapper
│   └── useChatPersistence.ts    # Firestore Speicherung
│
└── types.ts                     # TypeScript Interfaces
```

---

## Implementierung

### 1. useGenkitChat Hook

```typescript
// src/components/ai-chat/hooks/useGenkitChat.ts
import { useLocale, useTranslations } from 'next-intl';
import { useState, useCallback, useMemo } from 'react';
import { toastService } from '@/lib/utils/toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseGenkitChatOptions {
  flowName: 'markenDNAChat' | 'projectStrategyChat';
  documentType?: MarkenDNADocumentType;
  companyId: string;
  companyName: string;
  projectId?: string;
  dnaSynthese?: string;
  existingDocument?: string;
  existingChatHistory?: ChatMessage[];
  onDocumentUpdate?: (document: string) => void;
}

interface GenkitChatResponse {
  response: string;
  document?: string;
  progress?: number;
  suggestions?: string[];
}

export function useGenkitChat(options: UseGenkitChatOptions) {
  const locale = useLocale();
  const tToast = useTranslations('toasts');

  const [messages, setMessages] = useState<ChatMessage[]>(
    options.existingChatHistory || []
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [document, setDocument] = useState<string | null>(
    options.existingDocument || null
  );
  const [progress, setProgress] = useState(0);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // API-Endpunkt basierend auf flowName
  const apiEndpoint = useMemo(() => {
    switch (options.flowName) {
      case 'markenDNAChat':
        return '/api/ai-chat/marken-dna';
      case 'projectStrategyChat':
        return '/api/ai-chat/project-strategy';
      default:
        return '/api/ai-chat/marken-dna';
    }
  }, [options.flowName]);

  // Nachricht senden
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];

    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: options.documentType,
          companyId: options.companyId,
          companyName: options.companyName,
          projectId: options.projectId,
          dnaSynthese: options.dnaSynthese,
          existingDocument: options.existingDocument,
          language: locale,
          messages: updatedMessages,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: GenkitChatResponse = await response.json();

      // AI-Antwort hinzufügen
      const aiMessage: ChatMessage = { role: 'assistant', content: data.response };
      setMessages([...updatedMessages, aiMessage]);

      // Dokument aktualisieren
      if (data.document) {
        setDocument(data.document);
        options.onDocumentUpdate?.(data.document);
      }

      // Progress aktualisieren
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }

      // Vorschläge aktualisieren
      if (data.suggestions) {
        setSuggestedPrompts(data.suggestions);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      toastService.error(tToast('markenDNA.chatError', { error: error.message }));
    } finally {
      setIsLoading(false);
    }
  }, [messages, apiEndpoint, options, locale, tToast]);

  // Vorschlag als Nachricht senden
  const sendSuggestion = useCallback((prompt: string) => {
    setInput(prompt);
    sendMessage(prompt);
  }, [sendMessage]);

  // Letzte AI-Antwort kopieren
  const copyLastResponse = useCallback(async () => {
    const lastAI = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAI) {
      await navigator.clipboard.writeText(lastAI.content);
      toastService.success(tToast('copySuccess'));
    }
  }, [messages, tToast]);

  // Letzte Nachricht neu generieren
  const regenerate = useCallback(async () => {
    // Letzte User-Message finden und nochmal senden
    const lastUserIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;

    const lastUserMessage = messages[messages.length - 1 - lastUserIndex];

    // Letzte AI-Antwort entfernen
    setMessages(prev => prev.slice(0, prev.length - 1));

    // Neu generieren
    await sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  return {
    // Chat State
    messages,
    input,
    setInput,
    isLoading,
    error,

    // Actions
    sendMessage,
    sendSuggestion,
    copyLastResponse,
    regenerate,

    // Extracted Data
    document,
    progress,
    suggestedPrompts,
  };
}
```

### 2. API-Route

> Die API-Route ruft den Genkit Flow auf. Siehe `04-PHASE-3-KI-CHAT.md` für die vollständige Flow-Implementierung.

```typescript
// src/app/api/ai-chat/marken-dna/route.ts
import { markenDNAChatFlow } from '@/lib/ai/flows/marken-dna-chat';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await markenDNAChatFlow(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Marken-DNA Chat Error:', error);
    return NextResponse.json(
      { error: 'Chat generation failed' },
      { status: 500 }
    );
  }
}
```

### 3. AIChatModal Komponente

```typescript
// src/components/ai-chat/AIChatModal.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DocumentTextIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useGenkitChat } from './hooks/useGenkitChat';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { SuggestedPrompts } from './components/SuggestedPrompts';
import { ProgressBar } from './components/ProgressBar';
import { toastService } from '@/lib/utils/toast';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: MarkenDNADocumentType;
  companyId: string;
  companyName: string;
  existingDocument?: MarkenDNADocument;
  existingChatHistory?: ChatMessage[];
  mode?: 'new' | 'continue' | 'rework';
}

export function AIChatModal({
  isOpen,
  onClose,
  documentType,
  companyId,
  companyName,
  existingDocument,
  existingChatHistory,
  mode = 'new',
}: AIChatModalProps) {
  const t = useTranslations('markenDNA.chat');
  const tToast = useTranslations('toasts');

  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    document,
    progress,
    suggestedPrompts,
    regenerate,
    copyLastResponse,
    sendSuggestion,
  } = useGenkitChat({
    flowName: 'markenDNAChat',
    documentType,
    companyId,
    companyName,
    existingDocument: mode === 'rework' ? existingDocument?.content : undefined,
    existingChatHistory: mode === 'continue' ? existingChatHistory : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleSave = async () => {
    if (!document) {
      toastService.warning(t('noDocumentToSave'));
      return;
    }

    try {
      await saveMarkenDNADocument({
        companyId,
        type: documentType,
        content: document,
        chatHistory: messages,
      });
      toastService.success(tToast('markenDNA.documentSaved'));
      onClose();
    } catch (error) {
      toastService.error(tToast('saveError'));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="fullscreen">
      <div className="flex flex-col h-full">
        {/* Header */}
        <ChatHeader
          documentType={documentType}
          companyName={companyName}
          progress={progress}
          onClose={onClose}
        />

        {/* Messages */}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onRegenerate={regenerate}
          onCopy={copyLastResponse}
        />

        {/* Suggested Prompts */}
        {suggestedPrompts.length > 0 && !isLoading && (
          <SuggestedPrompts
            prompts={suggestedPrompts}
            onSelect={sendSuggestion}
          />
        )}

        {/* Progress Bar */}
        <ProgressBar progress={progress} />

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <ChatInput
            value={input}
            onChange={setInput}
            isLoading={isLoading}
            placeholder={t('inputPlaceholder')}
          />
        </form>

        {/* Footer Actions */}
        <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => setShowDocumentModal(true)}
            disabled={!document}
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            {t('viewDocument')}
          </Button>

          <Button
            onClick={handleSave}
            disabled={!document || isLoading}
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            {t('saveAndClose')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

### 4. AIMessage Komponente

```typescript
// src/components/ai-chat/components/AIMessage.tsx
'use client';

import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { ClipboardDocumentIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { DocumentPreview } from './DocumentPreview';

interface AIMessageProps {
  content: string;
  isLoading?: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
}

export function AIMessage({
  content,
  isLoading,
  onRegenerate,
  onCopy,
}: AIMessageProps) {
  // Content ohne Meta-Tags
  const cleanContent = content
    .replace(/\[DOCUMENT\][\s\S]*?\[\/DOCUMENT\]/g, '')
    .replace(/\[PROGRESS:\d+\]/g, '')
    .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/g, '')
    .trim();

  // Dokument extrahieren
  const documentMatch = content.match(/\[DOCUMENT\]([\s\S]*?)\[\/DOCUMENT\]/);
  const document = documentMatch ? documentMatch[1].trim() : null;

  return (
    <div className="flex justify-start">
      {/* Design System: AI Message Card */}
      <div className="max-w-[85%] bg-white border border-zinc-200 rounded-lg">
        {/* Header - Design System: bg-zinc-50 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900">CeleroPress</span>
          </div>

          {!isLoading && (
            <div className="flex items-center gap-1">
              {/* Design System: Icon Button Pattern */}
              <button
                onClick={onCopy}
                className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors"
                title="Kopieren"
              >
                <ClipboardDocumentIcon className="h-4 w-4 text-zinc-700" />
              </button>
              <button
                onClick={onRegenerate}
                className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors"
                title="Neu generieren"
              >
                <ArrowPathIcon className="h-4 w-4 text-zinc-700" />
              </button>
            </div>
          )}

          {isLoading && (
            <span className="text-xs text-zinc-500 animate-pulse">
              Schreibt...
            </span>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <div className="prose prose-sm max-w-none prose-zinc">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {cleanContent}
            </ReactMarkdown>
          </div>

          {/* Document Preview */}
          {document && (
            <DocumentPreview content={document} className="mt-4" />
          )}
        </div>
      </div>
    </div>
  );
}
```

### 5. SuggestedPrompts Komponente

```typescript
// src/components/ai-chat/components/SuggestedPrompts.tsx
'use client';

import { LightBulbIcon } from '@heroicons/react/24/outline';

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ prompts, onSelect }: SuggestedPromptsProps) {
  if (prompts.length === 0) return null;

  return (
    // Design System: Subtle background für Suggestion-Bereich
    <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50">
      <div className="flex items-center gap-2 mb-2">
        {/* Design System: Heroicon statt Emoji */}
        <LightBulbIcon className="h-4 w-4 text-amber-500" />
        <span className="text-xs text-zinc-500">Vorschläge</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelect(prompt)}
            // Design System: Rounded-full Pill-Buttons
            className="px-3 py-1.5 text-sm bg-white border border-zinc-200 rounded-full
                       hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Chat-Modi

### 1. Neuer Chat
```typescript
<AIChatModal
  isOpen={isOpen}
  onClose={onClose}
  documentType="briefing"
  companyId={companyId}
  companyName={companyName}
  mode="new"
/>
```
- Leerer Chat, keine History
- KI startet mit Begrüßung und erster Frage

### 2. Chat fortsetzen
```typescript
<AIChatModal
  isOpen={isOpen}
  onClose={onClose}
  documentType="briefing"
  companyId={companyId}
  companyName={companyName}
  existingDocument={document}
  existingChatHistory={document.chatHistory}
  mode="continue"
/>
```
- Lädt vorherige Messages
- Dokument ist bereits teilweise ausgefüllt
- KI setzt dort fort, wo aufgehört wurde

### 3. Dokument überarbeiten
```typescript
<AIChatModal
  isOpen={isOpen}
  onClose={onClose}
  documentType="briefing"
  companyId={companyId}
  companyName={companyName}
  existingDocument={document}
  mode="rework"
/>
```
- Neuer Chat, aber mit Dokument als Kontext
- KI: "Ich sehe das bestehende Briefing. Was möchtest du ändern?"

---

## Persistenz

### Firestore-Struktur für Chat-History

```typescript
// companies/{companyId}/markenDNA/{documentType}
interface MarkenDNADocument {
  type: MarkenDNADocumentType;
  content: string;           // HTML/Markdown Dokument
  plainText: string;         // Für KI-Kontext
  chatHistory: ChatMessage[]; // Vollständiger Chat-Verlauf
  isComplete: boolean;
  completeness: number;      // 0-100
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  language: 'de' | 'en';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}
```

### useChatPersistence Hook

```typescript
// src/components/ai-chat/hooks/useChatPersistence.ts
export function useChatPersistence(companyId: string, documentType: MarkenDNADocumentType) {
  const saveChat = async (messages: ChatMessage[], document: string) => {
    await markenDNAService.save(companyId, documentType, {
      content: document,
      plainText: stripHtml(document),
      chatHistory: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: Timestamp.now(),
      })),
      completeness: calculateCompleteness(messages),
      isComplete: isDocumentComplete(messages),
      updatedAt: Timestamp.now(),
    });
  };

  const loadChat = async () => {
    const doc = await markenDNAService.get(companyId, documentType);
    return {
      document: doc?.content,
      chatHistory: doc?.chatHistory,
    };
  };

  return { saveChat, loadChat };
}
```

---

## i18n Keys

```json
// messages/de.json
{
  "markenDNA": {
    "chat": {
      "title": "{documentType} für {companyName}",
      "inputPlaceholder": "Nachricht eingeben...",
      "viewDocument": "Dokument anzeigen",
      "saveAndClose": "Speichern & Schließen",
      "noDocumentToSave": "Noch kein Dokument zum Speichern",
      "regenerateTooltip": "Antwort neu generieren",
      "copyTooltip": "Antwort kopieren",
      "progress": "{percent}% abgeschlossen",
      "loading": "Generiert...",
      "suggestions": "Vorschläge"
    }
  }
}
```

---

## Abhängigkeiten

- Phase 1 (Datenmodell)
- Phase 3 (Genkit Flows + System-Prompts)
- **Design System** (`docs/design-system/DESIGN_SYSTEM.md`)
- Bestehende UI-Komponenten (`src/components/ui/`)
  - Dialog, Button, Avatar
- Bestehende Genkit-Konfiguration (`src/lib/ai/genkit-config.ts`)
- `react-markdown`, `rehype-highlight`

---

## Erledigungs-Kriterien

### Phase 1: Basis-Chat (MVP)
- [ ] useGenkitChat Hook implementiert
- [ ] API-Route verbunden mit Genkit Flow
- [ ] AIChatModal Container
- [ ] MessageList + UserMessage + AIMessage
- [ ] ChatInput mit Send
- [ ] Grundlegendes Styling

### Phase 2: ChatGPT-Features
- [ ] Markdown-Rendering mit react-markdown
- [ ] Code-Highlighting mit rehype-highlight
- [ ] Copy-Button funktioniert
- [ ] Regenerate-Button funktioniert
- [ ] Suggested Prompts werden angezeigt und sind klickbar
- [ ] Document Preview Card (collapsible)
- [ ] Progress Bar

### Phase 3: Persistenz & Modi
- [ ] Chat wird in Firestore gespeichert
- [ ] "Fortsetzen"-Modus funktioniert
- [ ] "Rework"-Modus funktioniert
- [ ] History ist im Dokument einsehbar

### Phase 4: Polish
- [ ] Smooth Scroll bei neuen Messages
- [ ] Error-Handling mit Toast
- [ ] Loading States
- [ ] Responsive Design
- [ ] Tests geschrieben

---

## Dokumentation

Nach Abschluss der Implementierung → `09-DOKUMENTATION.md`

Die Chat-UI Komponenten werden dokumentiert in:
- `docs/marken-dna/components/chat-interface.md`
- `docs/marken-dna/api/hooks.md` (useGenkitChat)
