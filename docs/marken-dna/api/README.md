# Marken-DNA API-Dokumentation

Übersicht aller Services, Hooks und Flows für das Marken-DNA Modul.

---

## Services

Firebase Services für Datenzugriff und Persistierung.

| Service | Beschreibung | Pfad | Dokumentation |
|---------|--------------|------|---------------|
| **markenDNAService** | CRUD für Marken-DNA Dokumente (6 Typen) | `src/lib/firebase/marken-dna-service.ts` | [→ Docs](./marken-dna-service.md) |
| **dnaSyntheseService** | DNA Synthese Generierung und Verwaltung | `src/lib/firebase/dna-synthese-service.ts` | [→ Docs](./dna-synthese-service.md) |
| **kernbotschaftService** | Projekt-Kernbotschaft CRUD | `src/lib/firebase/kernbotschaft-service.ts` | [→ Docs](./kernbotschaft-service.md) |

### Service-Methoden Überblick

#### markenDNAService
```typescript
// Dokumente lesen
getDocument(companyId: string, type: MarkenDNADocumentType): Promise<MarkenDNADocument | null>
getDocuments(companyId: string): Promise<MarkenDNADocument[]>
getAllDocumentsMap(companyId: string): Promise<Record<MarkenDNADocumentType, MarkenDNADocument | null>>

// Dokumente schreiben
createDocument(data: MarkenDNACreateData, context: ServiceContext): Promise<string>
updateDocument(companyId: string, type: MarkenDNADocumentType, data: MarkenDNAUpdateData, context: ServiceContext): Promise<void>
deleteDocument(companyId: string, type: MarkenDNADocumentType): Promise<void>
deleteAllForCompany(companyId: string): Promise<void>

// Status & Analyse
getCompanyStatus(companyId: string): Promise<CompanyMarkenDNAStatus>
getAllCustomersStatus(organizationId: string): Promise<CompanyMarkenDNAStatus[]>
isComplete(companyId: string): Promise<boolean>

// KI-Export & Hash
exportForAI(companyId: string): Promise<string>
computeMarkenDNAHash(companyId: string): Promise<string>
```

#### dnaSyntheseService
```typescript
// CRUD
getSynthese(companyId: string): Promise<DNASynthese | null>
createSynthese(data: DNASyntheseCreateData, context: ServiceContext): Promise<string>
updateSynthese(companyId: string, data: DNASyntheseUpdateData, context: ServiceContext): Promise<void>
deleteSynthese(companyId: string): Promise<void>

// Synthese-Generierung
synthesize(companyId: string, language: 'de' | 'en', context: ServiceContext): Promise<DNASynthese>
```

#### kernbotschaftService
```typescript
// CRUD
getKernbotschaft(projectId: string): Promise<Kernbotschaft | null>
createKernbotschaft(data: KernbotschaftCreateData, context: ServiceContext): Promise<string>
updateKernbotschaft(projectId: string, data: KernbotschaftUpdateData, context: ServiceContext): Promise<void>
deleteKernbotschaft(projectId: string): Promise<void>
```

---

## React Query Hooks

Hooks für State Management und Server-Synchronisation.

| Hook | Beschreibung | Datei | Dokumentation |
|------|--------------|-------|---------------|
| **useMarkenDNA** | Lädt alle Dokumente einer Company | `src/lib/hooks/useMarkenDNA.ts` | [→ Docs](./hooks.md#usemarken-dna) |
| **useMarkenDNADocument** | Lädt ein einzelnes Dokument | `src/lib/hooks/useMarkenDNA.ts` | [→ Docs](./hooks.md#usemarken-dna-document) |
| **useMarkenDNAStatus** | Lädt Status aller Dokumente | `src/lib/hooks/useMarkenDNA.ts` | [→ Docs](./hooks.md#usemarken-dna-status) |
| **useAllCustomersMarkenDNAStatus** | Lädt Status aller Kunden | `src/lib/hooks/useMarkenDNA.ts` | [→ Docs](./hooks.md#useall-customers-marken-dna-status) |
| **useMarkenDNAHash** | Lädt Hash für Aktualitäts-Check | `src/lib/hooks/useMarkenDNA.ts` | [→ Docs](./hooks.md#usemarken-dna-hash) |
| **useCreateMarkenDNADocument** | Erstellt ein Dokument | `src/lib/hooks/useMarkenDNA.ts` | [→ Docs](./hooks.md#usecreate-marken-dna-document) |
| **useUpdateMarkenDNADocument** | Aktualisiert ein Dokument | `src/lib/hooks/useMarkenDNA.ts` | [→ Docs](./hooks.md#useupdate-marken-dna-document) |
| **useDeleteMarkenDNADocument** | Löscht ein Dokument | `src/lib/hooks/useMarkenDNA.ts` | [→ Docs](./hooks.md#usedelete-marken-dna-document) |
| **useDeleteAllMarkenDNA** | Löscht alle Dokumente | `src/lib/hooks/useMarkenDNA.ts` | [→ Docs](./hooks.md#usedelete-all-marken-dna) |

### DNA Synthese Hooks

| Hook | Beschreibung | Datei | Dokumentation |
|------|--------------|-------|---------------|
| **useDNASynthese** | Lädt DNA Synthese | `src/lib/hooks/useDNASynthese.ts` | [→ Docs](./hooks.md#usedna-synthese) |
| **useCreateDNASynthese** | Erstellt DNA Synthese | `src/lib/hooks/useDNASynthese.ts` | [→ Docs](./hooks.md#usecreate-dna-synthese) |
| **useUpdateDNASynthese** | Aktualisiert DNA Synthese | `src/lib/hooks/useDNASynthese.ts` | [→ Docs](./hooks.md#useupdate-dna-synthese) |
| **useSynthesizeDNA** | Generiert DNA Synthese via KI | `src/lib/hooks/useDNASynthese.ts` | [→ Docs](./hooks.md#usesynthesize-dna) |
| **useDeleteDNASynthese** | Löscht DNA Synthese | `src/lib/hooks/useDNASynthese.ts` | [→ Docs](./hooks.md#usedelete-dna-synthese) |

### Kernbotschaft Hooks

| Hook | Beschreibung | Datei | Dokumentation |
|------|--------------|-------|---------------|
| **useKernbotschaft** | Lädt Kernbotschaft | `src/lib/hooks/useKernbotschaft.ts` | [→ Docs](./hooks.md#usekernbotschaft) |
| **useCreateKernbotschaft** | Erstellt Kernbotschaft | `src/lib/hooks/useKernbotschaft.ts` | [→ Docs](./hooks.md#usecreate-kernbotschaft) |
| **useUpdateKernbotschaft** | Aktualisiert Kernbotschaft | `src/lib/hooks/useKernbotschaft.ts` | [→ Docs](./hooks.md#useupdate-kernbotschaft) |
| **useDeleteKernbotschaft** | Löscht Kernbotschaft | `src/lib/hooks/useKernbotschaft.ts` | [→ Docs](./hooks.md#usedelete-kernbotschaft) |

---

## Genkit Flows

KI-Flows für Chat-basierte Dokumenterstellung und Synthese-Generierung.

| Flow | Beschreibung | Datei | Dokumentation |
|------|--------------|-------|---------------|
| **markenDNAChatFlow** | KI-Chat für Dokumenterstellung (6 Typen) | `src/lib/ai/flows/marken-dna-chat.ts` | [→ Docs](./genkit-flows.md#marken-dna-chat-flow) |
| **dnaSyntheseFlow** | Synthese-Generierung aus 6 Dokumenten | `src/lib/ai/flows/marken-dna-chat.ts` | [→ Docs](./genkit-flows.md#dna-synthese-flow) |
| **projectStrategyChatFlow** | Kernbotschaft/Text-Matrix Chat | `src/lib/ai/flows/project-strategy-chat.ts` | [→ Docs](./genkit-flows.md#project-strategy-chat-flow) |

### Flow Input/Output Schemas

#### markenDNAChatFlow
```typescript
// Input
{
  documentType: 'briefing' | 'swot' | 'audience' | 'positioning' | 'goals' | 'messages';
  companyId: string;
  companyName: string;
  language: 'de' | 'en';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  existingDocument?: string;
}

// Output
{
  response: string;           // Bereinigte KI-Antwort
  document?: string;          // Extrahiert aus [DOCUMENT]...[/DOCUMENT]
  progress?: number;          // Extrahiert aus [PROGRESS:XX]
  suggestions?: string[];     // Extrahiert aus [SUGGESTIONS]...[/SUGGESTIONS]
}
```

#### dnaSyntheseFlow
```typescript
// Input
{
  companyId: string;
  companyName: string;
  documents: Record<MarkenDNADocumentType, string | null>;
  language: 'de' | 'en';
}

// Output
{
  synthesis: string;          // Generierte Synthese (~500 Tokens)
  hash: string;               // Hash der Quelldokumente
}
```

#### projectStrategyChatFlow
```typescript
// Input
{
  projectId: string;
  companyId: string;
  companyName: string;
  language: 'de' | 'en';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  dnaSynthese?: string;       // DNA Synthese als Kontext
}

// Output
{
  response: string;
  document?: string;
  progress?: number;
  suggestions?: string[];
}
```

---

## API-Endpoints

REST-Endpoints für KI-Chat Funktionalität.

| Endpoint | Methode | Beschreibung | Flow |
|----------|---------|--------------|------|
| `/api/ai-chat/marken-dna` | POST | Marken-DNA Chat (6 Dokumenttypen) | markenDNAChatFlow |
| `/api/ai-chat/project-strategy` | POST | Projekt-Kernbotschaft Chat | projectStrategyChatFlow |

### Request/Response Format

Alle Endpoints verwenden JSON und erfordern Authentifizierung (Firebase Auth).

**Request Body:**
```json
{
  "documentType": "briefing",
  "companyId": "company-123",
  "companyName": "IBD Wickeltechnik GmbH",
  "language": "de",
  "messages": [
    { "role": "user", "content": "Wir sind ein Maschinenbauer aus Stuttgart." }
  ]
}
```

**Response:**
```json
{
  "response": "Perfekt! Maschinenbau aus Stuttgart...",
  "document": "## Briefing-Check\n- Branche: Maschinenbau...",
  "progress": 25,
  "suggestions": ["Zielgruppen definieren", "Wettbewerber benennen"]
}
```

**Error Response:**
```json
{
  "error": "Chat generation failed",
  "message": "Detailed error message"
}
```

---

## Typen & Interfaces

Alle TypeScript-Typen sind zentral definiert.

| Typ | Beschreibung | Datei |
|-----|--------------|-------|
| `MarkenDNADocument` | Haupt-Interface für Dokumente | `src/types/marken-dna.ts` |
| `MarkenDNADocumentType` | Union-Type der 6 Dokumenttypen | `src/types/marken-dna.ts` |
| `MarkenDNACreateData` | Create-DTO | `src/types/marken-dna.ts` |
| `MarkenDNAUpdateData` | Update-DTO | `src/types/marken-dna.ts` |
| `CompanyMarkenDNAStatus` | Status-Interface | `src/types/marken-dna.ts` |
| `ChatMessage` | Chat-Nachricht Interface | `src/types/marken-dna.ts` |
| `DNASynthese` | DNA Synthese Interface | `src/types/dna-synthese.ts` |
| `DNASyntheseCreateData` | Synthese Create-DTO | `src/types/dna-synthese.ts` |
| `Kernbotschaft` | Kernbotschaft Interface | `src/types/kernbotschaft.ts` |
| `KernbotschaftCreateData` | Kernbotschaft Create-DTO | `src/types/kernbotschaft.ts` |

---

## Firestore-Struktur

```
companies/{companyId}/
└── markenDNA/
    ├── briefing/          # Briefing-Check Dokument
    ├── swot/              # SWOT-Analyse
    ├── audience/          # Zielgruppen-Radar
    ├── positioning/       # Positionierungs-Designer
    ├── goals/             # Ziele-Setzer
    ├── messages/          # Botschaften-Baukasten
    └── synthesis/         # DNA Synthese (KI-generiert)

projects/{projectId}/
├── kernbotschaft/         # Kernbotschaft (projektspezifisch)
└── textMatrix/            # Text-Matrix (projektspezifisch)
```

---

## Verwendete Modelle

| Zweck | Modell | Provider |
|-------|--------|----------|
| Chat (6 Dokumenttypen) | Gemini 2.0 Flash | Google AI |
| DNA Synthese | Gemini 2.0 Flash | Google AI |
| Projekt-Strategie Chat | Gemini 2.0 Flash | Google AI |

Konfiguration: `src/lib/ai/genkit-config.ts`

---

## Fehlerbehandlung

Alle Services und Hooks verwenden standardisierte Fehlerbehandlung:

```typescript
import { toastService } from '@/lib/utils/toast';
import { useTranslations } from 'next-intl';

// Im Hook
const mutation = useMutation({
  mutationFn: async (data) => {
    await markenDNAService.createDocument(data, context);
  },
  onSuccess: () => {
    toastService.success(tToast('markenDNA.documentSaved'));
  },
  onError: (error) => {
    toastService.error(tToast('saveError', { message: error.message }));
  },
});
```

---

## Beispiele

### Dokument erstellen

```typescript
import { useCreateMarkenDNADocument } from '@/lib/hooks/useMarkenDNA';

function MyComponent() {
  const createDocument = useCreateMarkenDNADocument();

  const handleCreate = async () => {
    await createDocument.mutateAsync({
      companyId: 'company-123',
      companyName: 'IBD Wickeltechnik GmbH',
      type: 'briefing',
      content: '<h1>Briefing</h1>...',
      plainText: 'Briefing...',
      status: 'draft',
      completeness: 50,
    });
  };

  return <button onClick={handleCreate}>Erstellen</button>;
}
```

### DNA Synthese generieren

```typescript
import { useSynthesizeDNA } from '@/lib/hooks/useDNASynthese';

function SynthesizeButton({ companyId }) {
  const synthesize = useSynthesizeDNA();

  const handleSynthesize = async () => {
    const synthese = await synthesize.mutateAsync({
      companyId,
      language: 'de',
    });

    console.log('Synthese generiert:', synthese.plainText);
  };

  return (
    <button onClick={handleSynthesize} disabled={synthesize.isPending}>
      {synthesize.isPending ? 'Generiere...' : 'DNA synthetisieren'}
    </button>
  );
}
```

### KI-Chat verwenden

```typescript
import { useGenkitChat } from '@/lib/hooks/useGenkitChat';

function ChatComponent({ companyId, documentType }) {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    document,
    progress,
    suggestedPrompts,
  } = useGenkitChat({
    flowName: 'markenDNAChat',
    documentType,
    companyId,
    companyName: 'IBD Wickeltechnik GmbH',
  });

  return (
    <div>
      <MessageList messages={messages} />
      <ProgressBar progress={progress} />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        disabled={isLoading}
      />
      <SuggestedPrompts
        prompts={suggestedPrompts}
        onSelect={(prompt) => {
          setInput(prompt);
          sendMessage(prompt);
        }}
      />
    </div>
  );
}
```

---

## Performance & Caching

### React Query Cache-Konfiguration

```typescript
// Query-Keys Pattern
['marken-dna', companyId]                    // Alle Dokumente
['marken-dna', companyId, documentType]       // Einzelnes Dokument
['marken-dna-status', companyId]              // Status
['marken-dna-hash', companyId]                // Hash
['dna-synthese', companyId]                   // Synthese
['kernbotschaft', projectId]                  // Kernbotschaft
```

### Invalidierung

Nach Mutationen werden die entsprechenden Queries automatisch invalidiert:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['marken-dna', companyId] });
  queryClient.invalidateQueries({ queryKey: ['marken-dna-status', companyId] });
}
```

---

## Weiterführende Dokumentation

- [markenDNAService Details](./marken-dna-service.md)
- [dnaSyntheseService Details](./dna-synthese-service.md)
- [kernbotschaftService Details](./kernbotschaft-service.md)
- [React Query Hooks Details](./hooks.md)
- [Genkit Flows Details](./genkit-flows.md)

---

**Version:** 1.0
**Letzte Aktualisierung:** 2025-12-21
**Maintainer:** CeleroPress Development Team
