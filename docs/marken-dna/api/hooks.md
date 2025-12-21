# React Query Hooks - Marken-DNA API

Dokumentation aller React Query Hooks für die Marken-DNA Integration.

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Marken-DNA Dokumente](#marken-dna-dokumente)
- [DNA Synthese](#dna-synthese)
- [Kernbotschaft](#kernbotschaft)
- [Text-Matrix](#text-matrix)
- [KI-Chat](#ki-chat)
- [Experten-Assistent](#experten-assistent)
- [React Query Patterns](#react-query-patterns)
- [Best Practices](#best-practices)

---

## Übersicht

Alle Hooks verwenden React Query (`@tanstack/react-query`) für State Management, Caching und automatische Refetching.

### Kategorien

| Kategorie | Hooks | Zweck |
|-----------|-------|-------|
| **Marken-DNA** | `useMarkenDNA*` | CRUD für die 6 Basisdokumente |
| **DNA Synthese** | `useDNASynthese*` | CRUD für verdichtete DNA (~500 Tokens) |
| **Kernbotschaft** | `useKernbotschaft*` | CRUD für projektspezifische Kernbotschaften |
| **Text-Matrix** | `useTextMatrix*` | CRUD für KI-generierte Text-Matrices |
| **KI-Chat** | `useGenkitChat` | Chat-Interface für Dokument-Erstellung |
| **Experten-Modus** | `useExpertAssistant` | Markenbasierte KI-Generierung |

---

## Marken-DNA Dokumente

Quelle: `src/lib/hooks/useMarkenDNA.ts`

### useMarkenDNADocument

Lädt ein einzelnes Marken-DNA Dokument.

**Import:**
```tsx
import { useMarkenDNADocument } from '@/lib/hooks/useMarkenDNA';
```

**Parameter:**
- `companyId: string | undefined` - ID des Kunden (Company mit type: 'customer')
- `type: MarkenDNADocumentType` - Dokumenttyp (`briefing`, `swot`, `audience`, `positioning`, `goals`, `messages`)
- `options?` - Optionale React Query Optionen

**Rückgabe:**
```tsx
{
  data: MarkenDNADocument | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  // ... weitere React Query Properties
}
```

**Beispiel:**
```tsx
const BriefingView = ({ companyId }: { companyId: string }) => {
  const { data: briefing, isLoading, error } = useMarkenDNADocument(
    companyId,
    'briefing'
  );

  if (isLoading) return <div>Lädt...</div>;
  if (error) return <div>Fehler: {error.message}</div>;
  if (!briefing) return <div>Kein Briefing vorhanden</div>;

  return <div dangerouslySetInnerHTML={{ __html: briefing.content }} />;
};
```

---

### useMarkenDNADocuments

Lädt alle Marken-DNA Dokumente eines Kunden.

**Import:**
```tsx
import { useMarkenDNADocuments } from '@/lib/hooks/useMarkenDNA';
```

**Parameter:**
- `companyId: string | undefined` - ID des Kunden
- `options?` - Optionale React Query Optionen

**Rückgabe:**
```tsx
{
  data: MarkenDNADocument[];
  isLoading: boolean;
  error: Error | null;
  // ...
}
```

**Beispiel:**
```tsx
const { data: documents = [] } = useMarkenDNADocuments(companyId);

const completedDocs = documents.filter(d => d.status === 'completed');
console.log(`${completedDocs.length} / ${documents.length} Dokumente fertig`);
```

---

### useMarkenDNAStatus

Lädt den Marken-DNA Status eines Kunden (Fortschritt, Vollständigkeit).

**Import:**
```tsx
import { useMarkenDNAStatus } from '@/lib/hooks/useMarkenDNA';
```

**Parameter:**
- `companyId: string | undefined` - ID des Kunden
- `options?` - Optionale React Query Optionen

**Rückgabe:**
```tsx
{
  data: CompanyMarkenDNAStatus;
  // CompanyMarkenDNAStatus: {
  //   companyId: string;
  //   companyName: string;
  //   documents: Record<MarkenDNADocumentType, boolean>;
  //   completeness: number; // 0-100
  //   isComplete: boolean; // alle 6 Dokumente vorhanden
  //   hasDNASynthese: boolean;
  // }
}
```

**Beispiel:**
```tsx
const StatusBadge = ({ companyId }: { companyId: string }) => {
  const { data: status } = useMarkenDNAStatus(companyId);

  if (!status) return null;

  return (
    <div>
      <progress value={status.completeness} max={100} />
      <span>{status.completeness}% vollständig</span>
      {status.isComplete && <CheckIcon />}
    </div>
  );
};
```

---

### useAllCustomersMarkenDNAStatus

Lädt den Marken-DNA Status **aller** Kunden einer Organisation.

**Import:**
```tsx
import { useAllCustomersMarkenDNAStatus } from '@/lib/hooks/useMarkenDNA';
```

**Parameter:**
- `organizationId: string | undefined` - ID der Organisation
- `options?` - Optionale React Query Optionen

**Rückgabe:**
```tsx
{
  data: CompanyMarkenDNAStatus[];
}
```

**Beispiel:**
```tsx
const CustomerOverview = ({ organizationId }: Props) => {
  const { data: customersStatus = [] } = useAllCustomersMarkenDNAStatus(organizationId);

  const completeCount = customersStatus.filter(c => c.isComplete).length;

  return (
    <div>
      <h2>{completeCount} / {customersStatus.length} Kunden mit vollständiger DNA</h2>
      <ul>
        {customersStatus.map(status => (
          <li key={status.companyId}>
            {status.companyName}: {status.completeness}%
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

### useMarkenDNAHash

Berechnet einen Hash aller Marken-DNA Dokumente für Aktualitäts-Checks.

**Import:**
```tsx
import { useMarkenDNAHash } from '@/lib/hooks/useMarkenDNA';
```

**Parameter:**
- `companyId: string | undefined` - ID des Kunden
- `options?` - Optionale React Query Optionen

**Rückgabe:**
```tsx
{
  data: string; // SHA-256 Hash
}
```

**Beispiel:**
```tsx
const { data: currentHash } = useMarkenDNAHash(companyId);
const { data: synthese } = useDNASynthese(companyId);

const isOutdated = synthese && synthese.sourceHash !== currentHash;

if (isOutdated) {
  console.warn('DNA Synthese ist veraltet und sollte neu generiert werden!');
}
```

---

### useCreateMarkenDNADocument

Mutation zum Erstellen eines Marken-DNA Dokuments.

**Import:**
```tsx
import { useCreateMarkenDNADocument } from '@/lib/hooks/useMarkenDNA';
```

**Rückgabe:**
```tsx
{
  mutate: (variables: {
    data: MarkenDNACreateData;
    organizationId: string;
    userId: string;
  }) => void;
  isPending: boolean;
  error: Error | null;
}
```

**Beispiel:**
```tsx
const CreateBriefingButton = ({ companyId, companyName }: Props) => {
  const { mutate: createDocument, isPending } = useCreateMarkenDNADocument();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const handleCreate = () => {
    if (!user || !currentOrganization) return;

    createDocument({
      data: {
        companyId,
        companyName,
        type: 'briefing',
        content: '<h1>Briefing</h1><p>...</p>',
        plainText: 'Briefing...',
        status: 'draft',
      },
      organizationId: currentOrganization.id,
      userId: user.uid,
    });
  };

  return (
    <button onClick={handleCreate} disabled={isPending}>
      {isPending ? 'Erstelle...' : 'Briefing erstellen'}
    </button>
  );
};
```

---

### useUpdateMarkenDNADocument

Mutation zum Aktualisieren eines Marken-DNA Dokuments.

**Import:**
```tsx
import { useUpdateMarkenDNADocument } from '@/lib/hooks/useMarkenDNA';
```

**Rückgabe:**
```tsx
{
  mutate: (variables: {
    companyId: string;
    type: MarkenDNADocumentType;
    data: MarkenDNAUpdateData;
    organizationId: string;
    userId: string;
  }) => void;
  isPending: boolean;
}
```

**Beispiel:**
```tsx
const { mutate: updateDocument } = useUpdateMarkenDNADocument();

const handleSave = (content: string) => {
  updateDocument({
    companyId: 'comp-123',
    type: 'briefing',
    data: {
      content,
      plainText: stripHtml(content),
      status: 'completed'
    },
    organizationId: org.id,
    userId: user.uid,
  });
};
```

---

### useDeleteMarkenDNADocument

Mutation zum Löschen eines Marken-DNA Dokuments.

**Import:**
```tsx
import { useDeleteMarkenDNADocument } from '@/lib/hooks/useMarkenDNA';
```

**Rückgabe:**
```tsx
{
  mutate: (variables: {
    companyId: string;
    type: MarkenDNADocumentType;
    organizationId: string;
  }) => void;
  isPending: boolean;
}
```

**Beispiel:**
```tsx
const { mutate: deleteDocument } = useDeleteMarkenDNADocument();

const handleDelete = () => {
  if (confirm('Wirklich löschen?')) {
    deleteDocument({
      companyId: 'comp-123',
      type: 'briefing',
      organizationId: org.id,
    });
  }
};
```

---

### useDeleteAllMarkenDNADocuments

Mutation zum Löschen **aller** Marken-DNA Dokumente eines Kunden.

**Import:**
```tsx
import { useDeleteAllMarkenDNADocuments } from '@/lib/hooks/useMarkenDNA';
```

**Rückgabe:**
```tsx
{
  mutate: (variables: {
    companyId: string;
    organizationId: string;
  }) => void;
  isPending: boolean;
}
```

**Beispiel:**
```tsx
const { mutate: deleteAllDocuments } = useDeleteAllMarkenDNADocuments();

const handleReset = () => {
  if (confirm('ALLE Dokumente löschen?')) {
    deleteAllDocuments({
      companyId: 'comp-123',
      organizationId: org.id,
    });
  }
};
```

---

## DNA Synthese

Quelle: `src/lib/hooks/useDNASynthese.ts`

Die DNA Synthese ist eine verdichtete Version aller 6 Basisdokumente (~500 Tokens). Sie wird für KI-Assistenten und die Kernbotschaft verwendet.

### useDNASynthese

Lädt die DNA Synthese eines Kunden.

**Import:**
```tsx
import { useDNASynthese } from '@/lib/hooks/useDNASynthese';
```

**Parameter:**
- `companyId: string | undefined` - ID des Kunden
- `options?` - Optionale React Query Optionen

**Rückgabe:**
```tsx
{
  data: DNASynthese | null;
  // DNASynthese: {
  //   id: string;
  //   companyId: string;
  //   content: string; // HTML
  //   plainText: string; // ~500 Tokens
  //   tokenCount: number;
  //   sourceHash: string; // Hash der Basis-Dokumente
  //   manuallyEdited: boolean;
  //   createdAt: Timestamp;
  //   updatedAt: Timestamp;
  //   createdBy: string;
  //   updatedBy: string;
  // }
}
```

**Beispiel:**
```tsx
const DNASyntheseView = ({ companyId }: { companyId: string }) => {
  const { data: synthese, isLoading } = useDNASynthese(companyId);
  const { data: currentHash } = useMarkenDNAHash(companyId);

  if (isLoading) return <Spinner />;
  if (!synthese) return <div>Keine DNA Synthese vorhanden</div>;

  const isOutdated = synthese.sourceHash !== currentHash;

  return (
    <div>
      {isOutdated && (
        <Alert variant="warning">
          DNA Synthese ist veraltet. Bitte neu generieren!
        </Alert>
      )}
      <div>{synthese.tokenCount} Tokens</div>
      <div dangerouslySetInnerHTML={{ __html: synthese.content }} />
    </div>
  );
};
```

---

### useCreateDNASynthese

Mutation zum Erstellen einer DNA Synthese.

**Import:**
```tsx
import { useCreateDNASynthese } from '@/lib/hooks/useDNASynthese';
```

**Rückgabe:**
```tsx
{
  mutate: (variables: {
    data: DNASyntheseCreateData;
    organizationId: string;
    userId: string;
  }) => void;
  isPending: boolean;
}
```

**Beispiel:**
```tsx
const { mutate: createSynthese, isPending } = useCreateDNASynthese();

const handleGenerate = async () => {
  // 1. KI-Generierung
  const response = await fetch('/api/ai/generate-dna-synthese', {
    method: 'POST',
    body: JSON.stringify({ companyId }),
  });
  const { content, plainText, tokenCount, sourceHash } = await response.json();

  // 2. Speichern
  createSynthese({
    data: {
      companyId,
      content,
      plainText,
      tokenCount,
      sourceHash,
      manuallyEdited: false,
    },
    organizationId: org.id,
    userId: user.uid,
  });
};
```

---

### useUpdateDNASynthese

Mutation zum Aktualisieren einer DNA Synthese.

**Import:**
```tsx
import { useUpdateDNASynthese } from '@/lib/hooks/useDNASynthese';
```

**Beispiel:**
```tsx
const { mutate: updateSynthese } = useUpdateDNASynthese();

const handleManualEdit = (content: string) => {
  updateSynthese({
    companyId: 'comp-123',
    data: {
      content,
      plainText: stripHtml(content),
      manuallyEdited: true, // Markieren als manuell bearbeitet
    },
    organizationId: org.id,
    userId: user.uid,
  });
};
```

---

### useDeleteDNASynthese

Mutation zum Löschen einer DNA Synthese.

**Import:**
```tsx
import { useDeleteDNASynthese } from '@/lib/hooks/useDNASynthese';
```

**Beispiel:**
```tsx
const { mutate: deleteSynthese } = useDeleteDNASynthese();

const handleDelete = () => {
  deleteSynthese({ companyId: 'comp-123' });
};
```

---

## Kernbotschaft

Quelle: `src/lib/hooks/useKernbotschaft.ts`

Die Kernbotschaft ist die strategische Basis für ein Projekt. Sie wird aus der DNA Synthese + Projektkontext generiert.

### useKernbotschaft

Lädt die Kernbotschaft eines Projekts.

**Import:**
```tsx
import { useKernbotschaft } from '@/lib/hooks/useKernbotschaft';
```

**Parameter:**
- `projectId: string | undefined` - ID des Projekts
- `options?` - Optionale React Query Optionen

**Rückgabe:**
```tsx
{
  data: Kernbotschaft | null;
  // Kernbotschaft: {
  //   id: string;
  //   projectId: string;
  //   companyId: string;
  //   occasion: string;
  //   goal: string;
  //   coreMessage: string;
  //   targetAudience: string;
  //   tone: string;
  //   content: string; // HTML
  //   plainText: string;
  //   status: 'draft' | 'completed';
  //   createdAt: Timestamp;
  //   updatedAt: Timestamp;
  //   createdBy: string;
  //   updatedBy: string;
  // }
}
```

**Beispiel:**
```tsx
const KernbotschaftView = ({ projectId }: { projectId: string }) => {
  const { data: kernbotschaft, isLoading } = useKernbotschaft(projectId);

  if (isLoading) return <Spinner />;
  if (!kernbotschaft) return <div>Keine Kernbotschaft vorhanden</div>;

  return (
    <div>
      <h2>Kernbotschaft</h2>
      <dl>
        <dt>Anlass:</dt>
        <dd>{kernbotschaft.occasion}</dd>
        <dt>Ziel:</dt>
        <dd>{kernbotschaft.goal}</dd>
        <dt>Kernbotschaft:</dt>
        <dd>{kernbotschaft.coreMessage}</dd>
        <dt>Zielgruppe:</dt>
        <dd>{kernbotschaft.targetAudience}</dd>
        <dt>Tonalität:</dt>
        <dd>{kernbotschaft.tone}</dd>
      </dl>
      <div dangerouslySetInnerHTML={{ __html: kernbotschaft.content }} />
    </div>
  );
};
```

---

### useCreateKernbotschaft

Mutation zum Erstellen einer Kernbotschaft.

**Import:**
```tsx
import { useCreateKernbotschaft } from '@/lib/hooks/useKernbotschaft';
```

**Beispiel:**
```tsx
const { mutate: createKernbotschaft } = useCreateKernbotschaft();

const handleCreate = (chatResult: KernbotschaftChatResult) => {
  createKernbotschaft({
    data: {
      projectId: 'proj-123',
      companyId: 'comp-456',
      occasion: chatResult.occasion,
      goal: chatResult.goal,
      coreMessage: chatResult.coreMessage,
      targetAudience: chatResult.targetAudience,
      tone: chatResult.tone,
      content: chatResult.content,
      plainText: chatResult.plainText,
      status: 'draft',
    },
    organizationId: org.id,
    userId: user.uid,
  });
};
```

---

### useUpdateKernbotschaft

Mutation zum Aktualisieren einer Kernbotschaft.

**Import:**
```tsx
import { useUpdateKernbotschaft } from '@/lib/hooks/useKernbotschaft';
```

**Beispiel:**
```tsx
const { mutate: updateKernbotschaft } = useUpdateKernbotschaft();

const handleFinalize = (id: string, projectId: string) => {
  updateKernbotschaft({
    projectId,
    id,
    data: { status: 'completed' },
    organizationId: org.id,
    userId: user.uid,
  });
};
```

---

### useDeleteKernbotschaft

Mutation zum Löschen einer Kernbotschaft.

**Import:**
```tsx
import { useDeleteKernbotschaft } from '@/lib/hooks/useKernbotschaft';
```

**Beispiel:**
```tsx
const { mutate: deleteKernbotschaft } = useDeleteKernbotschaft();

const handleDelete = (id: string, projectId: string) => {
  deleteKernbotschaft({ projectId, id });
};
```

---

## Text-Matrix

Quelle: `src/lib/hooks/useTextMatrix.ts`

Die Text-Matrix ist das finale KI-generierte Textpaket für ein Projekt.

### useTextMatrix

Lädt die Text-Matrix eines Projekts.

**Import:**
```tsx
import { useTextMatrix } from '@/lib/hooks/useTextMatrix';
```

**Parameter:**
- `projectId: string | undefined` - ID des Projekts
- `options?` - Optionale React Query Optionen

**Rückgabe:**
```tsx
{
  data: TextMatrix | null;
  // TextMatrix: {
  //   id: string;
  //   projectId: string;
  //   companyId: string;
  //   organizationId: string;
  //   content: string; // HTML
  //   plainText: string;
  //   finalized: boolean;
  //   finalizedAt?: Timestamp;
  //   finalizedBy?: string;
  //   createdAt: Timestamp;
  //   updatedAt: Timestamp;
  //   createdBy: string;
  //   updatedBy: string;
  // }
}
```

**Beispiel:**
```tsx
const TextMatrixView = ({ projectId }: { projectId: string }) => {
  const { data: textMatrix, isLoading } = useTextMatrix(projectId);

  if (isLoading) return <Spinner />;
  if (!textMatrix) return <div>Keine Text-Matrix vorhanden</div>;

  return (
    <div>
      <h2>Text-Matrix</h2>
      {textMatrix.finalized && (
        <Badge variant="success">Finalisiert</Badge>
      )}
      <div dangerouslySetInnerHTML={{ __html: textMatrix.content }} />
    </div>
  );
};
```

---

### useCreateTextMatrix

Mutation zum Erstellen einer Text-Matrix.

**Import:**
```tsx
import { useCreateTextMatrix } from '@/lib/hooks/useTextMatrix';
```

**Beispiel:**
```tsx
const { mutate: createTextMatrix } = useCreateTextMatrix({
  onSuccess: () => toast.success('Text-Matrix erstellt'),
});

const handleCreate = (content: string) => {
  createTextMatrix({
    projectId: 'proj-123',
    companyId: 'comp-456',
    data: {
      content,
      plainText: stripHtml(content),
    },
  });
};
```

**Hinweis:** `organizationId` und `userId` werden automatisch aus den Contexts gelesen.

---

### useUpdateTextMatrix

Mutation zum Aktualisieren einer Text-Matrix.

**Import:**
```tsx
import { useUpdateTextMatrix } from '@/lib/hooks/useTextMatrix';
```

**Beispiel:**
```tsx
const { mutate: updateTextMatrix } = useUpdateTextMatrix({
  onSuccess: () => toast.success('Text-Matrix aktualisiert'),
});

const handleUpdate = (id: string, content: string) => {
  updateTextMatrix({
    id,
    projectId: 'proj-123',
    data: {
      content,
      plainText: stripHtml(content),
    },
  });
};
```

---

### useFinalizeTextMatrix

Mutation zum Finalisieren einer Text-Matrix (Human Sign-off).

**Import:**
```tsx
import { useFinalizeTextMatrix } from '@/lib/hooks/useTextMatrix';
```

**Beispiel:**
```tsx
const { mutate: finalizeTextMatrix } = useFinalizeTextMatrix({
  onSuccess: () => toast.success('Text-Matrix finalisiert'),
});

const handleFinalize = (id: string, projectId: string) => {
  finalizeTextMatrix({ id, projectId });
};
```

---

### useDeleteTextMatrix

Mutation zum Löschen einer Text-Matrix.

**Import:**
```tsx
import { useDeleteTextMatrix } from '@/lib/hooks/useTextMatrix';
```

**Beispiel:**
```tsx
const { mutate: deleteTextMatrix } = useDeleteTextMatrix({
  onSuccess: () => toast.success('Text-Matrix gelöscht'),
});

const handleDelete = (id: string, projectId: string) => {
  deleteTextMatrix({ id, projectId });
};
```

---

### useTextMatricesByCompany

Lädt **alle** Text-Matrices eines Kunden.

**Import:**
```tsx
import { useTextMatricesByCompany } from '@/lib/hooks/useTextMatrix';
```

**Parameter:**
- `companyId: string | undefined` - ID des Kunden
- `options?` - Optionale React Query Optionen

**Rückgabe:**
```tsx
{
  data: TextMatrix[];
}
```

**Beispiel:**
```tsx
const CompanyTextMatrices = ({ companyId }: Props) => {
  const { data: textMatrices = [] } = useTextMatricesByCompany(companyId);

  return (
    <ul>
      {textMatrices.map(tm => (
        <li key={tm.id}>
          Projekt {tm.projectId} - {tm.finalized ? 'Finalisiert' : 'Draft'}
        </li>
      ))}
    </ul>
  );
};
```

---

## KI-Chat

Quelle: `src/lib/hooks/useGenkitChat.ts`

Hook für das Chat-Interface zur Erstellung von Marken-DNA Dokumenten und Kernbotschaften.

### useGenkitChat

Verwaltet den Chat-State und die Kommunikation mit Genkit Flows.

**Import:**
```tsx
import { useGenkitChat } from '@/lib/hooks/useGenkitChat';
```

**Parameter:**
```tsx
interface UseGenkitChatOptions {
  flowName: 'markenDNAChat' | 'projectStrategyChat';
  documentType?: MarkenDNADocumentType; // für markenDNAChat
  companyId: string;
  companyName: string;
  projectId?: string; // für projectStrategyChat
  dnaSynthese?: string; // für projectStrategyChat
  existingDocument?: string; // für fortgesetzte Bearbeitung
  existingChatHistory?: ChatMessage[]; // für fortgesetzte Bearbeitung
  onDocumentUpdate?: (document: string) => void; // Callback bei Dokument-Update
}
```

**Rückgabe:**
```tsx
{
  // Chat State
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  error: Error | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  sendSuggestion: (prompt: string) => void;
  copyLastResponse: () => Promise<void>;
  regenerate: () => Promise<void>;

  // Extracted Data
  document: string | null; // Aktuelles Dokument (HTML)
  progress: number; // 0-100
  suggestedPrompts: string[]; // KI-Vorschläge für nächste Fragen
}
```

**Beispiel: Marken-DNA Chat**
```tsx
const BriefingChat = ({ companyId, companyName }: Props) => {
  const [savedDocument, setSavedDocument] = useState<string | null>(null);

  const {
    messages,
    input,
    setInput,
    sendMessage,
    suggestedPrompts,
    document,
    progress,
    isLoading,
  } = useGenkitChat({
    flowName: 'markenDNAChat',
    documentType: 'briefing',
    companyId,
    companyName,
    existingDocument: savedDocument,
    onDocumentUpdate: (doc) => setSavedDocument(doc),
  });

  return (
    <div>
      <ChatMessages messages={messages} />
      <ProgressBar value={progress} max={100} />

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => sendMessage(input)}
        disabled={isLoading}
      />

      <div>
        {suggestedPrompts.map(prompt => (
          <button
            key={prompt}
            onClick={() => sendMessage(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      {document && (
        <DocumentPreview content={document} />
      )}
    </div>
  );
};
```

**Beispiel: Kernbotschaft Chat**
```tsx
const KernbotschaftChat = ({ projectId, companyId, companyName }: Props) => {
  const { data: dnaSynthese } = useDNASynthese(companyId);

  const {
    messages,
    sendMessage,
    document,
    suggestedPrompts,
  } = useGenkitChat({
    flowName: 'projectStrategyChat',
    companyId,
    companyName,
    projectId,
    dnaSynthese: dnaSynthese?.plainText,
    onDocumentUpdate: (doc) => {
      // Dokument speichern
      console.log('Kernbotschaft aktualisiert:', doc);
    },
  });

  return (
    <div>
      <ChatMessages messages={messages} />
      <SuggestedPrompts prompts={suggestedPrompts} onSelect={sendMessage} />
      {document && <KernbotschaftPreview content={document} />}
    </div>
  );
};
```

---

## Experten-Assistent

Quelle: `src/lib/hooks/useExpertAssistant.ts`

Hook für markenbasierte KI-Generierung im Experten-Modus.

### useExpertAssistant

Generiert Texte basierend auf DNA Synthese und Kernbotschaft.

**Import:**
```tsx
import { useExpertAssistant } from '@/lib/hooks/useExpertAssistant';
```

**Parameter:**
- `projectId: string` - ID des Projekts

**Rückgabe:**
```tsx
{
  // Funktionen
  generate: (
    prompt: string,
    outputFormat?: 'pressrelease' | 'social' | 'blog' | 'email' | 'custom'
  ) => Promise<ExpertAssistantResult>;
  copyToClipboard: () => Promise<void>;

  // State
  result: ExpertAssistantResult | null;
  isLoading: boolean;
  error: Error | null;

  // Flags
  usedDNASynthese: boolean;
  usedKernbotschaft: boolean;
}

interface ExpertAssistantResult {
  content: string;
  usedDNASynthese: boolean;
  usedKernbotschaft: boolean;
  suggestions?: string[];
}
```

**Beispiel:**
```tsx
const ExpertMode = ({ projectId }: { projectId: string }) => {
  const [prompt, setPrompt] = useState('');

  const {
    generate,
    result,
    isLoading,
    usedDNASynthese,
    usedKernbotschaft,
    copyToClipboard,
  } = useExpertAssistant(projectId);

  const handleGenerate = async () => {
    await generate(prompt, 'pressrelease');
  };

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Beschreibe was du generieren möchtest..."
      />

      <button onClick={handleGenerate} disabled={isLoading}>
        {isLoading ? 'Generiere...' : 'Generieren'}
      </button>

      {result && (
        <div>
          <div className="badges">
            {usedDNASynthese && <Badge>DNA Synthese verwendet</Badge>}
            {usedKernbotschaft && <Badge>Kernbotschaft verwendet</Badge>}
          </div>

          <div className="content">
            {result.content}
          </div>

          <button onClick={copyToClipboard}>
            In Zwischenablage kopieren
          </button>

          {result.suggestions && (
            <div className="suggestions">
              <h4>Vorschläge:</h4>
              <ul>
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

**Beispiel: Integration in Formular**
```tsx
const PressReleaseForm = ({ projectId }: Props) => {
  const [content, setContent] = useState('');
  const { generate, isLoading } = useExpertAssistant(projectId);

  const handleQuickFill = async () => {
    const result = await generate(
      'Erstelle eine Pressemitteilung über unsere neue Produktlinie',
      'pressrelease'
    );
    setContent(result.content);
  };

  return (
    <div>
      <button onClick={handleQuickFill} disabled={isLoading}>
        Mit KI vorausfüllen
      </button>
      <RichTextEditor value={content} onChange={setContent} />
    </div>
  );
};
```

---

## React Query Patterns

### Cache-Konfiguration

Alle Hooks verwenden konsistente Cache-Zeiten:

```tsx
{
  staleTime: 5 * 60 * 1000, // 5 Minuten - Daten gelten als "fresh"
  gcTime: 10 * 60 * 1000,   // 10 Minuten - Garbage Collection Time
}
```

**Was bedeutet das?**
- Daten werden 5 Minuten gecacht, bevor ein Refetch getriggert wird
- Ungenutzte Daten werden nach 10 Minuten aus dem Cache entfernt

### Query Keys

Query Keys folgen einem konsistenten Pattern:

```tsx
// Marken-DNA
['markenDNA', 'document', companyId, type]
['markenDNA', 'documents', companyId]
['markenDNA', 'status', companyId]
['markenDNA', 'allCustomersStatus', organizationId]
['markenDNA', 'hash', companyId]

// DNA Synthese
['dnaSynthese', companyId]

// Kernbotschaft
['kernbotschaft', projectId]

// Text-Matrix
['textMatrix', projectId]
['textMatricesByCompany', companyId, organizationId]
```

### Cache Invalidierung

Mutations invalidieren automatisch die relevanten Queries:

```tsx
const { mutate: updateDocument } = useUpdateMarkenDNADocument();

// Bei onSuccess werden folgende Queries invalidiert:
onSuccess: (_, { companyId, type, organizationId }) => {
  queryClient.invalidateQueries({ queryKey: ['markenDNA', 'document', companyId, type] });
  queryClient.invalidateQueries({ queryKey: ['markenDNA', 'documents', companyId] });
  queryClient.invalidateQueries({ queryKey: ['markenDNA', 'status', companyId] });
  queryClient.invalidateQueries({ queryKey: ['markenDNA', 'allCustomersStatus', organizationId] });
  queryClient.invalidateQueries({ queryKey: ['markenDNA', 'hash', companyId] });
}
```

### Optimistic Updates

Für bessere UX können Optimistic Updates implementiert werden:

```tsx
const { mutate: updateDocument } = useUpdateMarkenDNADocument();
const queryClient = useQueryClient();

const handleUpdate = (companyId: string, type: MarkenDNADocumentType, content: string) => {
  // Optimistic Update
  queryClient.setQueryData(
    ['markenDNA', 'document', companyId, type],
    (old: MarkenDNADocument | null) => old ? { ...old, content } : null
  );

  // Mutation
  updateDocument({
    companyId,
    type,
    data: { content },
    organizationId: org.id,
    userId: user.uid,
  }, {
    onError: () => {
      // Bei Fehler: Rollback
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'document', companyId, type]
      });
    },
  });
};
```

### Prefetching

Für bessere Performance können Daten vorgeladen werden:

```tsx
const queryClient = useQueryClient();

// Beim Hover über einen Kunden: DNA vorladen
const handleMouseEnter = (companyId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['dnaSynthese', companyId],
    queryFn: () => dnaSyntheseService.getSynthese(companyId),
  });
};
```

---

## Best Practices

### 1. Enabled-Parameter nutzen

Queries nur ausführen, wenn Parameter vorhanden sind:

```tsx
const { data } = useMarkenDNADocument(companyId, 'briefing', {
  enabled: !!companyId, // Nur ausführen wenn companyId vorhanden
});
```

### 2. Error Handling

Immer Fehler behandeln:

```tsx
const { data, error, isError } = useMarkenDNADocument(companyId, 'briefing');

if (isError) {
  return <ErrorAlert message={error.message} />;
}
```

### 3. Loading States

Loading States klar kommunizieren:

```tsx
const { data, isLoading, isFetching } = useMarkenDNADocuments(companyId);

if (isLoading) return <Spinner />; // Initial Load
if (isFetching) return <div className="opacity-50">Updating...</div>; // Refetch
```

### 4. Mutation Callbacks

Callbacks für User-Feedback:

```tsx
const { mutate } = useCreateMarkenDNADocument();

mutate(variables, {
  onSuccess: () => {
    toast.success('Dokument erstellt');
    router.push(`/companies/${companyId}`);
  },
  onError: (error) => {
    toast.error(`Fehler: ${error.message}`);
  },
});
```

### 5. Dependent Queries

Queries, die voneinander abhängen:

```tsx
// 1. DNA Synthese laden
const { data: synthese } = useDNASynthese(companyId);

// 2. Nur wenn Synthese vorhanden: Kernbotschaft laden
const { data: kernbotschaft } = useKernbotschaft(projectId, {
  enabled: !!synthese, // Nur ausführen wenn Synthese vorhanden
});
```

### 6. Multi-Tenancy beachten

Immer `organizationId` übergeben:

```tsx
const { currentOrganization } = useOrganization();

const { mutate } = useCreateMarkenDNADocument();

mutate({
  data: { ... },
  organizationId: currentOrganization.id, // WICHTIG!
  userId: user.uid,
});
```

### 7. Type Safety

TypeScript-Typen verwenden:

```tsx
import type {
  MarkenDNADocument,
  MarkenDNADocumentType
} from '@/types/marken-dna';

const MyComponent = ({ type }: { type: MarkenDNADocumentType }) => {
  const { data } = useMarkenDNADocument(companyId, type);
  // data ist typsicher: MarkenDNADocument | null
};
```

### 8. Custom Options

React Query Options erweitern wenn nötig:

```tsx
const { data } = useMarkenDNADocument(companyId, 'briefing', {
  staleTime: 0, // Immer refetchen
  retry: 3, // 3x Retry bei Fehler
  onSuccess: (data) => {
    console.log('Dokument geladen:', data);
  },
});
```

### 9. Suspense Mode

Für Next.js mit Suspense:

```tsx
const { data } = useMarkenDNADocument(companyId, 'briefing', {
  suspense: true, // Wirft Promise für Suspense
});

// In Parent Component:
<Suspense fallback={<Spinner />}>
  <BriefingView companyId={companyId} />
</Suspense>
```

### 10. Selective Invalidation

Nur relevante Queries invalidieren:

```tsx
// Schlecht: Alles invalidieren
queryClient.invalidateQueries();

// Gut: Nur betroffene Queries
queryClient.invalidateQueries({
  queryKey: ['markenDNA', 'document', companyId, 'briefing']
});
```

---

## Zusammenfassung

Die Hooks folgen konsistenten Patterns:

1. **Query Hooks**: `use<Entity>()` - Laden von Daten
2. **Mutation Hooks**: `useCreate<Entity>()`, `useUpdate<Entity>()`, `useDelete<Entity>()` - Ändern von Daten
3. **Cache-Zeiten**: 5 Min staleTime, 10 Min gcTime
4. **Automatische Invalidierung**: Mutations invalidieren relevante Queries
5. **Type Safety**: Alle Hooks sind vollständig typisiert
6. **Multi-Tenancy**: `organizationId` wird überall berücksichtigt

**Weitere Ressourcen:**
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Services Dokumentation](./services.md)
- [Datenmodell Dokumentation](./models.md)
