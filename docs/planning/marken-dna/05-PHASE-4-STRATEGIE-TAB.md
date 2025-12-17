# Phase 4: Strategie-Tab Umbau

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
  const { customerId } = project;
  const { data: markenDNAStatus } = useMarkenDNAStatus(customerId);
  const { data: dnaSynthese } = useDNASynthese(project.id);
  const { data: kernbotschaft } = useKernbotschaft(project.id);
  const { data: textMatrix } = useTextMatrix(project.id);

  const canSynthesize = markenDNAStatus?.isComplete ?? false;

  return (
    <div className="space-y-6">
      {/* 🧪 DNA Synthese */}
      <DNASyntheseSection
        projectId={project.id}
        customerId={customerId}
        customerName={project.customerName}
        dnaSynthese={dnaSynthese}
        canSynthesize={canSynthesize}
        markenDNAStatus={markenDNAStatus}
      />

      {/* 💬 Kernbotschaft Chat */}
      <KernbotschaftChat
        projectId={project.id}
        customerId={customerId}
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
  customerId: string;
  customerName: string;
  dnaSynthese?: DNASynthese;
  canSynthesize: boolean;
  markenDNAStatus?: CustomerMarkenDNAStatus;
}

export function DNASyntheseSection({
  projectId,
  customerId,
  customerName,
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
            <DropdownMenuItem onClick={() => synthesize({ projectId, customerId })}>
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
                  Erstelle eine KI-optimierte Kurzform der Marken-DNA für {customerName}.
                </p>
                <Button onClick={() => synthesize({ projectId, customerId })} disabled={isLoading}>
                  <BeakerIcon className="h-4 w-4 mr-2" />
                  DNA synthetisieren
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-500 mb-4">
                  Die Marken-DNA von {customerName} ist noch nicht vollständig.
                </p>
                <StatusCircles documents={markenDNAStatus?.documents} size="sm" />
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/dashboard/library/marken-dna?customer=${customerId}`)}
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

### 4.4 Projekt-Kernbotschaft Chat Komponente

**Datei:** `src/components/projects/strategy/ProjektKernbotschaftChat.tsx`

```tsx
interface ProjektKernbotschaftChatProps {
  projectId: string;
  customerId: string;
  markenSynthese?: MarkenSynthese;  // 🧪 Wird als Kontext übergeben
  existingKernbotschaft?: ProjektKernbotschaft;
}

export function ProjektKernbotschaftChat({
  projectId,
  customerId,
  markenSynthese,
  existingKernbotschaft,
}: ProjektKernbotschaftChatProps) {
  const {
    messages,
    document,
    isLoading,
    sendMessage,
  } = useKernbotschaftChat(projectId, customerId, markenSynthese?.plainText);

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

      {/* 🧪 Marken-Synthese Hinweis */}
      {markenSynthese && (
        <div className="px-4 py-2 bg-purple-50 border-b flex items-center gap-2 text-sm text-purple-700">
          <BeakerIcon className="h-4 w-4" />
          Marken-Synthese wird als Kontext verwendet
        </div>
      )}

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
