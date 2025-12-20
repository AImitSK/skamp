# Phase 4: Strategie-Tab Umbau

> **Workflow-Agent:** Für die Implementierung dieser Phase den `marken-dna-impl` Agent verwenden.
> Siehe `10-WORKFLOW-AGENT.md` für Details zum schrittweisen Workflow.

## Ziel
Den Strategie-Tab im Projekt komplett umbauen: Weg von Templates, hin zur CeleroPress Formel mit 🧪 DNA Synthese, 🧬 AI Sequenz und 📋 Text-Matrix.

---

## Aktueller Zustand

```
Strategie-Tab (ALT)
├── StrategyTemplateGrid (6 Vorlagen)
├── StrategyDocumentsTable (Dokumente)
├── ProjectFoldersView (Datei-Upload)
└── "Als Boilerplate speichern"
```

## Neuer Zustand

```
Strategie-Tab (NEU) - Die CeleroPress Formel
├── 🧪 DNA Synthese (Synthetisieren / Anzeige / Bearbeiten)
├── 💬 Kernbotschaft Chat
├── 🧬 AI Sequenz (KI-Prozess)
├── 📋 Text-Matrix (Output / Vorlage)
└── 📰 Pressemeldung (nach Feinschliff + Freigabe)
```

---

## Aufgaben

### 4.1 Alte Komponenten entfernen/deaktivieren

**Zu entfernen aus Strategie-Tab:**
- `StrategyTemplateGrid` - Keine Vorlagen mehr
- `ProjectFoldersView` (für Strategie) - Kein Upload mehr
- "Als Boilerplate speichern" Button

**Behalten:**
- `StrategyDocumentEditor` - Für Bearbeitung des generierten Dokuments

---

### 4.2 Neue StrategieTabContent erstellen

**Datei:** `src/app/dashboard/projects/[projectId]/components/tab-content/StrategieTabContent.tsx`

```tsx
export function StrategieTabContent({ project }: Props) {
  // project.customer.id referenziert eine Company mit type: 'customer'
  const companyId = project.customer?.id;
  const { data: markenDNAStatus } = useMarkenDNAStatus(companyId);
  const { data: dnaSynthese } = useDNASynthese(project.id);
  const { data: kernbotschaft } = useKernbotschaft(project.id);
  const { data: textMatrix } = useTextMatrix(project.id);

  const canSynthesize = markenDNAStatus?.isComplete ?? false;

  return (
    <div className="space-y-6">
      {/* 🧪 DNA Synthese */}
      <DNASyntheseSection
        projectId={project.id}
        companyId={companyId}
        companyName={project.customer?.name}
        dnaSynthese={dnaSynthese}
        canSynthesize={canSynthesize}
        markenDNAStatus={markenDNAStatus}
      />

      {/* 💬 Kernbotschaft Chat */}
      <KernbotschaftChat
        projectId={project.id}
        companyId={companyId}
        dnaSynthese={dnaSynthese}
        existingKernbotschaft={kernbotschaft}
      />

      {/* 🧬 AI Sequenz Button */}
      {kernbotschaft && dnaSynthese && !textMatrix && (
        <AISequenzButton
          projectId={project.id}
          dnaSynthese={dnaSynthese}
          kernbotschaft={kernbotschaft}
        />
      )}

      {/* 📋 Text-Matrix */}
      {textMatrix && (
        <TextMatrixSection
          textMatrix={textMatrix}
          onEdit={() => setEditing(true)}
          onRework={() => setReworking(true)}
        />
      )}
    </div>
  );
}
```

---

### 4.3 🧪 DNA Synthese Komponente

**Datei:** `src/components/projects/strategy/DNASyntheseSection.tsx`

**Icon:** `BeakerIcon` aus `@heroicons/react/24/outline`

```tsx
interface DNASyntheseSectionProps {
  projectId: string;
  companyId: string;         // Referenz auf Company (type: 'customer')
  companyName: string;
  dnaSynthese?: DNASynthese;
  canSynthesize: boolean;
  markenDNAStatus?: CompanyMarkenDNAStatus;
}

export function DNASyntheseSection({
  projectId,
  companyId,
  companyName,
  dnaSynthese,
  canSynthesize,
  markenDNAStatus,
}: DNASyntheseSectionProps) {
  const { mutate: synthesize, isLoading } = useSynthesizeDNA();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BeakerIcon className="h-5 w-5 text-purple-600" />
          <h3 className="font-medium">DNA Synthese</h3>
        </div>

        {dnaSynthese && (
          <DropdownMenu>
            <DropdownMenuItem onClick={() => synthesize({ projectId, companyId })}>
              <BeakerIcon className="h-4 w-4 mr-2" />
              Neu synthetisieren
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteDNASynthese(projectId)}>
              <TrashIcon className="h-4 w-4 mr-2" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </div>

      <div className="p-4">
        {!dnaSynthese ? (
          /* Noch nicht erstellt */
          <div className="text-center py-6">
            {canSynthesize ? (
              <>
                <p className="text-gray-500 mb-4">
                  Erstelle eine KI-optimierte Kurzform der Marken-DNA für {companyName}.
                </p>
                <Button onClick={() => synthesize({ projectId, companyId })} disabled={isLoading}>
                  <BeakerIcon className="h-4 w-4 mr-2" />
                  DNA synthetisieren
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-500 mb-4">
                  Die Marken-DNA von {companyName} ist noch nicht vollständig.
                </p>
                <StatusCircles documents={markenDNAStatus?.documents} size="sm" />
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/dashboard/library/marken-dna?company=${companyId}`)}
                >
                  Marken-DNA vervollständigen
                </Button>
              </>
            )}
          </div>
        ) : (
          /* Synthese vorhanden */
          <>
            <div className="flex items-center gap-2 text-green-600 mb-3">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="text-sm font-medium">DNA Synthese aktiv</span>
            </div>

            {isEditing ? (
              <TipTapEditor
                content={dnaSynthese.content}
                onSave={(content) => updateDNASynthese(projectId, content)}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <div
                  className="prose prose-sm max-w-none bg-gray-50 rounded p-4"
                  dangerouslySetInnerHTML={{ __html: dnaSynthese.content }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setIsEditing(true)}
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

---

### 4.4 Projekt-Kernbotschaft Chat Komponente (Genkit)

**Datei:** `src/components/projects/strategy/ProjektKernbotschaftChat.tsx`

> **Hinweis:** Diese Komponente nutzt den `useGenkitChat` Hook aus Phase 8 (`08-CHAT-UI-KONZEPT.md`).

```tsx
import { useLocale, useTranslations } from 'next-intl';
import { useGenkitChat } from '@/lib/hooks/useGenkitChat';

interface ProjektKernbotschaftChatProps {
  projectId: string;
  companyId: string;         // Referenz auf Company (type: 'customer')
  companyName: string;
  markenSynthese?: MarkenSynthese;  // 🧪 Wird als Kontext übergeben
  existingKernbotschaft?: ProjektKernbotschaft;
}

export function ProjektKernbotschaftChat({
  projectId,
  companyId,
  companyName,
  markenSynthese,
  existingKernbotschaft,
}: ProjektKernbotschaftChatProps) {
  const locale = useLocale();
  const t = useTranslations('markenDNA');

  // Genkit Chat Hook
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
    flowName: 'projectStrategyChat',
    projectId,
    companyId,
    companyName,
    dnaSynthese: markenSynthese?.plainText, // 🧪 DNA Synthese als Kontext
    existingChatHistory: existingKernbotschaft?.chatHistory,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <ChatBubbleLeftIcon className="h-5 w-5" />
          {t('kernbotschaft.title')}
        </h3>
      </div>

      {/* 🧪 DNA Synthese Hinweis */}
      {markenSynthese && (
        <div className="px-4 py-2 bg-purple-50 border-b flex items-center gap-2 text-sm text-purple-700">
          <BeakerIcon className="h-4 w-4" />
          {t('kernbotschaft.contextHint')}
        </div>
      )}

      {/* Chat-Nachrichten */}
      <div className="p-4 h-96 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>{t('kernbotschaft.emptyState')}</p>
            {/* Vorgeschlagene Prompts */}
            {suggestedPrompts.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {isLoading && <LoadingIndicator />}
      </div>

      {/* Eingabe */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('kernbotschaft.placeholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {t('send')}
          </Button>
        </div>
      </form>

      {/* Fortschrittsanzeige */}
      {progress > 0 && progress < 100 && (
        <div className="px-4 py-2 border-t">
          <ProgressBar value={progress} />
        </div>
      )}

      {/* Kernbotschaft speichern Button */}
      {document && (
        <div className="p-4 border-t bg-gray-50">
          <Button onClick={() => saveKernbotschaft(document)}>
            <DocumentIcon className="h-4 w-4 mr-2" />
            {t('kernbotschaft.save')}
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

### 4.5 Generiertes Dokument Komponente

**Datei:** `src/components/projects/strategy/GeneratedStrategyDocument.tsx`

```tsx
export function GeneratedStrategyDocument({
  strategy,
  onEdit,
  onRework,
}: Props) {
  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-medium">Projekt-Strategie</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <PencilIcon className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
          <Button variant="outline" size="sm" onClick={onRework}>
            <SparklesIcon className="h-4 w-4 mr-1" />
            Mit KI umarbeiten
          </Button>
        </div>
      </div>

      <div className="p-4">
        {/* Dokument-Inhalt */}
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: strategy.content }}
        />
      </div>

      <div className="p-4 border-t text-sm text-gray-500">
        Zuletzt aktualisiert: {formatDate(strategy.updatedAt)}
      </div>
    </div>
  );
}
```

---

### 4.6 "Mit KI umarbeiten" Modal (Genkit)

**Datei:** `src/components/projects/strategy/ReworkStrategyModal.tsx`

Öffnet einen neuen Chat-Dialog mit dem bestehenden Dokument als Kontext.
Der Flow erhält das bestehende Dokument im `existingDocument` Parameter.

```tsx
import { useTranslations } from 'next-intl';
import { useGenkitChat } from '@/lib/hooks/useGenkitChat';

export function ReworkStrategyModal({
  strategy,
  projectId,
  companyId,
  companyName,
  onClose,
  onSave,
}: Props) {
  const t = useTranslations('markenDNA');

  // Genkit Chat mit bestehendem Dokument als Kontext
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    document,
  } = useGenkitChat({
    flowName: 'projectStrategyChat',
    projectId,
    companyId,
    companyName,
    existingDocument: strategy.content, // Für Umarbeiten-Modus
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <Modal open onClose={onClose}>
      <ModalHeader>{t('textMatrix.rework')}</ModalHeader>
      <ModalBody>
        {/* Chat zum Umarbeiten */}
        <div className="h-96 overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('rework.placeholder')}
          />
          <Button type="submit" disabled={isLoading}>
            {t('send')}
          </Button>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button onClick={() => onSave(document)} disabled={!document}>
          {t('save')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
```

---

### 4.6.1 Kernbotschaft mit useGenkitChat Hook

> **Hinweis:** Die Kernbotschaft nutzt den `projectStrategyChatFlow` aus Phase 3.
> Die vollständige Hook-Definition befindet sich in `08-CHAT-UI-KONZEPT.md`.

**API-Route:** `src/app/api/ai-chat/project-strategy/route.ts`

```typescript
import { projectStrategyChatFlow } from '@/lib/ai/flows/project-strategy-chat';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await projectStrategyChatFlow(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Project Strategy Chat Error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
```

**Verwendung in der Komponente:**
```typescript
// Siehe 4.4 für die vollständige Komponente
const { messages, input, sendMessage, isLoading, document } = useGenkitChat({
  flowName: 'projectStrategyChat',
  projectId,
  companyId,
  companyName,
  dnaSynthese: markenSynthese?.plainText,
});
```

---

### 4.7 Projekt-Service erweitern

**Datei:** `src/lib/firebase/project-service.ts` (erweitern)

```typescript
// Neue Methoden:
updateMarkenDNASetting(projectId: string, useMarkenDNA: boolean): Promise<void>
```

**Datei:** `src/lib/firebase/project-strategy-service.ts` (neu)

```typescript
// CRUD für Projekt-Strategie
getProjectStrategy(projectId: string): Promise<ProjectStrategy | null>
saveProjectStrategy(projectId: string, data: ProjectStrategyData): Promise<string>
updateProjectStrategy(strategyId: string, data: Partial<ProjectStrategyData>): Promise<void>
deleteProjectStrategy(strategyId: string): Promise<void>
```

---

## UI-Flow

```
1. User öffnet Projekt → Strategie-Tab
           ↓
2. Sieht Toggle "Marken DNA verwenden"
   - Wenn Marken DNA vollständig → Toggle aktivierbar
   - Wenn nicht → Button "Vervollständigen" → führt zur Marken-DNA Seite
           ↓
3. User aktiviert Toggle (optional)
           ↓
4. User startet Chat
   - KI fragt nach Anlass, Ziel, Teilbotschaft
   - User antwortet (Text oder Copy/Paste)
           ↓
5. KI generiert Live-Vorschau
           ↓
6. User klickt "Strategie erzeugen"
   - Dokument wird gespeichert
           ↓
7. Dokument wird angezeigt mit Optionen:
   - [Bearbeiten] → Öffnet TipTap Editor
   - [Mit KI umarbeiten] → Öffnet neuen Chat
```

---

## Migration bestehender Daten

```typescript
// Bestehende StrategyDocuments können als Referenz behalten werden
// Aber sie werden nicht mehr im neuen UI angezeigt
// Optional: Migration-Script das alte Dokumente konvertiert
```

---

## Toast-Benachrichtigungen & i18n

Alle Aktionen im Strategie-Tab mit **next-intl** Übersetzungen:

```typescript
import { useTranslations } from 'next-intl';
import { toastService } from '@/lib/utils/toast';

function StrategieTabContent({ project }: Props) {
  const t = useTranslations('markenDNA');
  const tToast = useTranslations('toasts');

  // 🧪 DNA Synthese erstellen
  const { mutate: synthesize } = useSynthesizeDNA({
    onSuccess: () => {
      toastService.success(tToast('markenDNA.synthesisSaved'));
    },
    onError: (error) => {
      toastService.error(tToast('markenDNA.synthesisError', { error: error.message }));
    },
  });

  // 🧪 DNA Synthese löschen
  const handleDeleteSynthese = async () => {
    if (!confirm(t('synthesis.confirmDelete'))) return;

    try {
      await deleteDNASynthese(projectId);
      toastService.success(tToast('markenDNA.synthesisDeleted'));
    } catch (error) {
      toastService.error(tToast('deleteError', { message: error.message }));
    }
  };

  // 🧪 DNA Synthese aktualisieren (nach TipTap-Bearbeitung)
  const handleSaveSynthese = async (content: string) => {
    try {
      await updateDNASynthese(projectId, { content, manuallyEdited: true });
      toastService.success(tToast('markenDNA.synthesisUpdated'));
      setIsEditing(false);
    } catch (error) {
      toastService.error(tToast('saveError', { message: error.message }));
    }
  };

  // 💬 Kernbotschaft speichern
  const handleSaveKernbotschaft = async () => {
    try {
      await saveKernbotschaft(projectId, kernbotschaftData);
      toastService.success(tToast('markenDNA.kernbotschaftSaved'));
    } catch (error) {
      toastService.error(tToast('saveError', { message: error.message }));
    }
  };

  // 🧬 AI Sequenz → 📋 Text-Matrix generieren
  const handleGenerateTextMatrix = async () => {
    const loadingToast = toastService.loading(t('textMatrix.generating'));

    try {
      await generateTextMatrix(projectId, { dnaSynthese, kernbotschaft });
      toastService.dismiss(loadingToast);
      toastService.success(tToast('markenDNA.textMatrixGenerated'));
    } catch (error) {
      toastService.dismiss(loadingToast);
      toastService.error(tToast('markenDNA.generationError', { error: error.message }));
    }
  };

  // In Zwischenablage kopieren
  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toastService.success(tToast('copySuccess'));
    } catch (error) {
      toastService.error(tToast('copyError'));
    }
  };

  // ...
}
```

> Siehe `07-ENTWICKLUNGSRICHTLINIEN.md` für vollständige Toast- und i18n-Dokumentation.

---

## Abhängigkeiten

- Phase 1 (Datenmodell)
- Phase 2 (Marken-DNA Bibliothek - für StatusCircles, etc.)
- Phase 3 (KI-Chat mit Genkit Flows)
- Phase 8 (Chat-UI Konzept - für `useGenkitChat` Hook)
- Bestehende Genkit-Konfiguration (`src/lib/ai/genkit-config.ts`)
- **Zentraler Toast-Service** (`src/lib/utils/toast.ts`)

---

## Erledigungs-Kriterien

- [ ] Alte Template-Grid entfernt
- [ ] 🧪 DNA Synthese Section implementiert
- [ ] "DNA synthetisieren" Button funktioniert
- [ ] "Neu synthetisieren" im Dropdown funktioniert
- [ ] Synthese nur möglich wenn Marken-DNA vollständig
- [ ] Synthese ist editierbar (TipTap)
- [ ] 💬 Kernbotschaft Chat implementiert
- [ ] Chat nutzt DNA Synthese als Kontext
- [ ] 🧬 AI Sequenz Button implementiert
- [ ] 📋 Text-Matrix wird generiert und gespeichert
- [ ] "Mit AI Sequenz umarbeiten" funktioniert
- [ ] BeakerIcon (🧪) für DNA Synthese konsistent verwendet
- [ ] Tests geschrieben

---

## Nächste Schritte

- **Weiter:** `06-PHASE-5-KI-ASSISTENTEN.md` (KI-Assistenten Integration)
- **Dokumentation:** Nach Abschluss aller Phasen → `09-DOKUMENTATION.md`
