# Phase 4: Strategie-Tab Umbau

## Ziel
Den Strategie-Tab im Projekt komplett umbauen: Weg von Templates, hin zum Chat-basierten Ansatz mit Marken-DNA Integration.

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
Strategie-Tab (NEU)
├── MarkenDNA Toggle + Status
├── Projekt-Kernbotschaft Chat
├── Generiertes Dokument (Ansicht/Editor)
└── Aktionen (Bearbeiten, Mit KI umarbeiten)
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
  const { customerId } = project;
  const { data: markenDNAStatus } = useMarkenDNAStatus(customerId);
  const { data: projectStrategy } = useProjectStrategy(project.id);

  const [useMarkenDNA, setUseMarkenDNA] = useState(project.useMarkenDNA ?? false);
  const canUseMarkenDNA = markenDNAStatus?.isComplete ?? false;

  return (
    <div className="space-y-6">
      {/* Marken-DNA Toggle */}
      <MarkenDNAToggle
        enabled={useMarkenDNA}
        canEnable={canUseMarkenDNA}
        customerName={project.customerName}
        onToggle={setUseMarkenDNA}
        onCompleteClick={() => router.push(`/dashboard/library/marken-dna?customer=${customerId}`)}
      />

      {/* Chat-Bereich für Projekt-Kernbotschaft */}
      <ProjectStrategyChat
        projectId={project.id}
        customerId={customerId}
        useMarkenDNA={useMarkenDNA}
        existingStrategy={projectStrategy}
      />

      {/* Generiertes Dokument */}
      {projectStrategy && (
        <GeneratedStrategyDocument
          strategy={projectStrategy}
          onEdit={() => setEditing(true)}
          onRework={() => setReworking(true)}
        />
      )}
    </div>
  );
}
```

---

### 4.3 MarkenDNA Toggle Komponente

**Datei:** `src/components/projects/strategy/MarkenDNAToggle.tsx`

```tsx
interface MarkenDNAToggleProps {
  enabled: boolean;
  canEnable: boolean;
  customerName: string;
  onToggle: (enabled: boolean) => void;
  onCompleteClick: () => void;
}

export function MarkenDNAToggle({
  enabled,
  canEnable,
  customerName,
  onToggle,
  onCompleteClick,
}: MarkenDNAToggleProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Marken-DNA verwenden</h3>
          <p className="text-sm text-gray-500">
            {canEnable
              ? `Die Marken-DNA von ${customerName} wird bei der Texterstellung verwendet.`
              : `Die Marken-DNA von ${customerName} ist noch nicht vollständig.`
            }
          </p>
        </div>

        {canEnable ? (
          <Switch
            checked={enabled}
            onChange={onToggle}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onCompleteClick}
          >
            Vervollständigen
          </Button>
        )}
      </div>

      {/* Status-Anzeige wenn nicht vollständig */}
      {!canEnable && (
        <div className="mt-3 pt-3 border-t">
          <StatusCircles
            documents={markenDNAStatus.documents}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}
```

---

### 4.4 Projekt-Strategie Chat Komponente

**Datei:** `src/components/projects/strategy/ProjectStrategyChat.tsx`

```tsx
interface ProjectStrategyChatProps {
  projectId: string;
  customerId: string;
  useMarkenDNA: boolean;
  existingStrategy?: ProjectStrategy;
}

export function ProjectStrategyChat({
  projectId,
  customerId,
  useMarkenDNA,
  existingStrategy,
}: ProjectStrategyChatProps) {
  const {
    messages,
    document,
    isLoading,
    sendMessage,
  } = useProjectStrategyChat(projectId, customerId, useMarkenDNA);

  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <ChatBubbleLeftIcon className="h-5 w-5" />
          Projekt-Kernbotschaft erarbeiten
        </h3>
      </div>

      {/* Chat-Nachrichten */}
      <div className="p-4 h-96 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Starten Sie den Dialog mit der KI, um die Kernbotschaft</p>
            <p>für dieses Projekt zu erarbeiten.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {isLoading && <LoadingIndicator />}
      </div>

      {/* Eingabe */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Beschreiben Sie den Anlass, Ihre Ziele..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button onClick={handleSubmit} disabled={isLoading}>
            Senden
          </Button>
        </div>
      </div>

      {/* Strategie erzeugen Button */}
      {document && (
        <div className="p-4 border-t bg-gray-50">
          <Button onClick={() => saveStrategy(document)}>
            <DocumentIcon className="h-4 w-4 mr-2" />
            Strategie erzeugen
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

### 4.6 "Mit KI umarbeiten" Modal

**Datei:** `src/components/projects/strategy/ReworkStrategyModal.tsx`

Öffnet einen neuen Chat-Dialog mit dem bestehenden Dokument als Kontext:

```tsx
export function ReworkStrategyModal({
  strategy,
  onClose,
  onSave,
}: Props) {
  // Chat der das bestehende Dokument als Kontext hat
  // User kann sagen: "Mach es kürzer", "Ändere den Ton", etc.
}
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

## Abhängigkeiten

- Phase 1 (Datenmodell)
- Phase 2 (Marken-DNA Bibliothek - für StatusCircles, etc.)
- Phase 3 (KI-Chat-Wizard - für useProjectStrategyChat)

---

## Erledigungs-Kriterien

- [ ] Alte Template-Grid entfernt
- [ ] Marken-DNA Toggle funktioniert
- [ ] Toggle nur aktivierbar wenn DNA vollständig
- [ ] Chat-Interface implementiert
- [ ] Dokument wird generiert und gespeichert
- [ ] Bearbeiten funktioniert (TipTap)
- [ ] "Mit KI umarbeiten" funktioniert
- [ ] useMarkenDNA Flag wird im Projekt gespeichert
- [ ] Tests geschrieben
