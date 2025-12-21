# Marken-DNA Komponenten

**Version:** 1.0
**Letzte Aktualisierung:** 2025-12-21

Übersicht aller React-Komponenten des Marken-DNA Moduls mit Props, Verwendung und Design System Konformität.

---

## Inhaltsverzeichnis

1. [Bibliothek-Seite Komponenten](#bibliothek-seite-komponenten)
2. [Editor/Chat Komponenten](#editorchat-komponenten)
3. [Strategie-Tab Komponenten](#strategie-tab-komponenten)
4. [Experten-Modus Komponenten](#experten-modus-komponenten)
5. [Design System Konformität](#design-system-konformität)

---

## Bibliothek-Seite Komponenten

### CompanyTable

**Pfad:** `src/app/dashboard/library/marken-dna/components/CompanyTable.tsx`

Tabelle zur Anzeige aller Kunden mit Marken-DNA Status.

#### Props Interface

```typescript
interface CompanyTableProps {
  companies: CompanyEnhanced[];
  onAction: (companyId: string, action: CompanyAction) => void;
  selectedCompanies?: string[];
  onSelectionChange?: (selected: string[]) => void;
}

type CompanyAction =
  | { type: 'view', documentType: MarkenDNADocumentType }
  | { type: 'create', documentType: MarkenDNADocumentType }
  | { type: 'delete', documentType: MarkenDNADocumentType }
  | { type: 'deleteAll' };

interface CompanyEnhanced extends Company {
  markenDNAStatus?: CompanyMarkenDNAStatus;
}
```

#### Beschreibung

- Zeigt alle Kunden (Companies mit `type: 'customer'`) in einer Tabelle
- Status-Anzeige mit 6 Kreisen für alle Dokumenttypen
- 3-Punkte-Menü für Aktionen pro Kunde
- Sortierbar nach Name, Status, letzte Aktualisierung
- Mehrfach-Auswahl mit Checkboxen

#### Features

- **Suche:** Filtert nach Kundenname
- **Sortierung:** Klick auf Spalten-Header
- **Bulk-Actions:** "X Löschen"-Link bei Mehrfachauswahl
- **Status-Kreise:** Klickbar für direkten Sprung zum Dokument

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Table Header | `bg-zinc-50 border-b border-zinc-200` | ✅ |
| Table Row | `hover:bg-zinc-50` | ✅ |
| Row Dividers | `divide-y divide-zinc-200` | ✅ |
| Icons | `h-4 w-4 text-zinc-700` | ✅ |
| Search Input | `h-10 border-zinc-300` | ✅ |
| Action Button (3-Punkte) | `p-1.5 hover:bg-zinc-200` | ✅ |

**Verwendete Heroicons:**
- `MagnifyingGlassIcon` (Suche)
- `FunnelIcon` (Filter)
- `EllipsisVerticalIcon` (3-Punkte-Menü, stroke-[2.5])

---

### StatusCircles

**Pfad:** `src/components/marken-dna/StatusCircles.tsx`

Visualisierung des Dokumentstatus mit 6 farbigen Kreisen.

#### Props Interface

```typescript
interface StatusCirclesProps {
  documents: {
    briefing: DocumentStatus;
    swot: DocumentStatus;
    audience: DocumentStatus;
    positioning: DocumentStatus;
    goals: DocumentStatus;
    messages: DocumentStatus;
  };
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onCircleClick?: (type: MarkenDNADocumentType) => void;
  showPercentage?: boolean;
}

type DocumentStatus = 'missing' | 'draft' | 'completed';
```

#### Beschreibung

Zeigt den Status der 6 Marken-DNA Dokumente als farbige Kreise:

- **Missing (Grau):** Dokument noch nicht erstellt - `bg-zinc-300`
- **Draft (Gelb):** Dokument in Bearbeitung - `bg-yellow-500`
- **Completed (Grün):** Dokument fertig - `bg-green-500`

Optional: Prozentanzeige (% vollständiger Dokumente)

#### Size-Varianten

```typescript
sm: 'h-2 w-2'   // Kleine Kreise (in Listen)
md: 'h-3 w-3'   // Standard (Tabellen)
lg: 'h-4 w-4'   // Große Kreise (Detail-Seiten)
```

#### Features

- **Hover:** `hover:ring-2 hover:ring-primary` wenn `clickable={true}`
- **Tooltip:** Zeigt Dokumenttyp-Namen
- **Prozent:** Optionale Anzeige der Vollständigkeit

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Missing | `bg-zinc-300` | ✅ |
| Draft | `bg-yellow-500` | ✅ |
| Completed | `bg-green-500` | ✅ |
| Hover Ring | `hover:ring-primary` | ✅ |
| Spacing | `gap-1` zwischen Kreisen | ✅ |

**Verwendete Heroicons:**
- `CheckCircleIcon` (optional für Prozent-Anzeige)

---

### CompanyActionsDropdown

**Pfad:** `src/components/marken-dna/CompanyActionsDropdown.tsx`

3-Punkte-Dropdown-Menü mit allen Aktionen für einen Kunden.

#### Props Interface

```typescript
interface CompanyActionsDropdownProps {
  company: CompanyEnhanced;
  documents: Record<MarkenDNADocumentType, boolean>;
  onView: (type: MarkenDNADocumentType) => void;
  onEdit: (type: MarkenDNADocumentType) => void;
  onCreate: (type: MarkenDNADocumentType) => void;
  onDelete: (type: MarkenDNADocumentType) => void;
  onDeleteAll: () => void;
}
```

#### Beschreibung

Dropdown-Menü für Kunden-Aktionen in der Tabelle:

- **6 Dokumenttypen:** Anzeigen/Bearbeiten oder Neu erstellen
- **Status-Indikator:** Grüner/Grauer Punkt pro Dokument
- **Delete All:** Rote Option zum Löschen aller Dokumente

#### Menu-Struktur

```
┌─────────────────────────────────┐
│ [Kundenname]                    │
├─────────────────────────────────┤
│ ● Briefing-Check      [Bearbeiten] │
│ ○ SWOT-Analyse        [+]       │
│ ● Zielgruppen-Radar   [Bearbeiten] │
│ ...                              │
├─────────────────────────────────┤
│ 🗑 Alle Dokumente löschen       │
└─────────────────────────────────┘
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Dropdown Button | `p-1.5 hover:bg-zinc-200 rounded-md` | ✅ |
| Menu Container | `shadow-lg ring-1 ring-black/5` | ✅ (Ausnahme) |
| Menu Width | `w-72` | ✅ |
| Header | `px-3 py-2 border-b border-zinc-200` | ✅ |
| Item Hover | `hover:bg-zinc-50` | ✅ |
| Delete Text | `text-red-600` | ✅ |
| Status Dot | `h-2 w-2 rounded-full` | ✅ |

**Verwendete Heroicons:**
- `EllipsisVerticalIcon` (Button, stroke-[2.5])
- `PlusIcon` (Neu erstellen)
- `PencilIcon` (Bearbeiten)
- `TrashIcon` (Löschen)

---

## Editor/Chat Komponenten

### MarkenDNAEditorModal

**Pfad:** `src/components/marken-dna/MarkenDNAEditorModal.tsx`

Split-View Modal für Dokumenterstellung mit KI-Chat und Live-Vorschau.

#### Props Interface

```typescript
interface MarkenDNAEditorModalProps {
  open: boolean;
  onClose: () => void;
  company: CompanyEnhanced;
  documentType: MarkenDNADocumentType;
  existingDocument?: MarkenDNADocument;
  mode?: 'new' | 'continue' | 'rework';
  onSave: (content: string, chatHistory: ChatMessage[]) => Promise<void>;
}
```

#### Beschreibung

Fullscreen-Modal mit Split-View:

- **Links:** KI-Chat Interface (50%)
- **Rechts:** Live-Dokument-Vorschau (50%)
- **Footer:** Speichern & Schließen Buttons

#### Modi

1. **New:** Neuer Chat, leere History
2. **Continue:** Vorhandenen Chat fortsetzen
3. **Rework:** Bestehende Dokument umarbeiten

#### Layout

```tsx
<Dialog size="5xl">
  <DialogTitle>
    <DocumentTextIcon className="h-5 w-5 text-primary" />
    {documentType} für {company.name}
  </DialogTitle>

  <DialogBody className="h-[600px]">
    <div className="flex h-full divide-x divide-zinc-200">
      {/* Left: Chat */}
      <ChatInterface />

      {/* Right: Preview */}
      <DocumentPreview />
    </div>
  </DialogBody>

  <DialogActions>
    <Button variant="secondary">Abbrechen</Button>
    <Button>Speichern & Schließen</Button>
  </DialogActions>
</Dialog>
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Modal Size | `size="5xl"` | ✅ |
| Split Divider | `divide-x divide-zinc-200` | ✅ |
| Body Height | `h-[600px]` | ✅ |
| Section Headers | `bg-zinc-50 border-b border-zinc-200` | ✅ |

**Verwendete Heroicons:**
- `DocumentTextIcon` (Title)
- `ChatBubbleLeftRightIcon` (Chat-Header)
- `PencilIcon` (Bearbeiten)
- `CheckIcon` (Speichern)

---

### AIChatInterface

**Pfad:** `src/components/ai-chat/AIChatModal.tsx`

Hauptkomponente für KI-Chat mit Genkit Flows.

#### Props Interface

```typescript
interface AIChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  documentType?: MarkenDNADocumentType;
  projectId?: string;
  companyId: string;
  companyName: string;
  existingDocument?: string;
  existingChatHistory?: ChatMessage[];
  dnaSynthese?: string;
  mode?: 'markenDNA' | 'projectStrategy';
}
```

#### Beschreibung

Chat-Interface mit Genkit-Integration:

- **Streaming:** Live-Antworten vom KI-Modell
- **Markdown:** Formatierte Ausgabe mit react-markdown
- **Suggested Prompts:** Klickbare Vorschläge
- **Progress Bar:** Fortschrittsanzeige (0-100%)
- **Document Extraction:** Automatisches Extrahieren von [DOCUMENT]-Tags

#### Features

- Auto-Scroll zu neuen Nachrichten
- Copy/Regenerate für AI-Antworten
- Document Preview (collapsible)
- Loading-Indikatoren

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Input | `h-10 border-zinc-300` | ✅ |
| AI Message | `bg-white border border-zinc-200` | ✅ |
| User Message | `bg-primary text-white` | ✅ |
| Suggested Prompts | `bg-white border border-zinc-200 rounded-full` | ✅ |
| Progress Bar | `bg-primary` (fill), `bg-zinc-200` (track) | ✅ |

**Verwendete Heroicons:**
- `PaperAirplaneIcon` (Senden)
- `LightBulbIcon` (Vorschläge)
- `CheckIcon` (Speichern)
- `XMarkIcon` (Schließen)

---

### MessageList

**Pfad:** `src/components/ai-chat/components/MessageList.tsx`

Scrollbarer Container für Chat-Nachrichten.

#### Props Interface

```typescript
interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}
```

#### Beschreibung

- Rendert User- und AI-Messages
- Auto-Scroll zu neuesten Nachrichten
- Loading-Indikator während Generierung
- Copy/Regenerate-Actions für AI-Messages

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Container | `overflow-y-auto space-y-4` | ✅ |
| Padding | `p-4` | ✅ |

---

### AIMessage

**Pfad:** `src/components/ai-chat/components/AIMessage.tsx`

KI-Nachricht mit Markdown-Rendering und Action-Buttons.

#### Props Interface

```typescript
interface AIMessageProps {
  content: string;
  isLoading?: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
}
```

#### Beschreibung

- **Markdown:** Formatierung mit react-markdown
- **Code-Highlighting:** Syntax-Highlighting mit rehype-highlight
- **Document Preview:** Collapsible Card für extrahierte Dokumente
- **Action-Buttons:** Copy & Regenerate

#### Rendering

```tsx
<div className="bg-white border border-zinc-200 rounded-lg">
  <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50">
    <span className="font-medium">CeleroPress</span>
    <div className="flex gap-1">
      <button onClick={onCopy}>
        <ClipboardDocumentIcon className="h-4 w-4" />
      </button>
      <button onClick={onRegenerate}>
        <ArrowPathIcon className="h-4 w-4" />
      </button>
    </div>
  </div>

  <div className="px-4 py-3 prose prose-sm">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
</div>
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Message Card | `bg-white border border-zinc-200` | ✅ |
| Header | `bg-zinc-50 border-b border-zinc-200` | ✅ |
| Icon Buttons | `p-1.5 hover:bg-zinc-200` | ✅ |
| Prose | `prose-zinc` | ✅ |

**Verwendete Heroicons:**
- `ClipboardDocumentIcon` (Kopieren)
- `ArrowPathIcon` (Regenerieren)

---

### UserMessage

**Pfad:** `src/components/ai-chat/components/UserMessage.tsx`

Benutzer-Nachricht (simple Bubble).

#### Props Interface

```typescript
interface UserMessageProps {
  content: string;
}
```

#### Beschreibung

Einfache Chat-Bubble rechts ausgerichtet.

```tsx
<div className="flex justify-end">
  <div className="max-w-[85%] bg-primary text-white rounded-lg px-4 py-2">
    {content}
  </div>
</div>
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Bubble | `bg-primary text-white rounded-lg` | ✅ |
| Max Width | `max-w-[85%]` | ✅ |
| Padding | `px-4 py-2` | ✅ |

---

### SuggestedPrompts

**Pfad:** `src/components/ai-chat/components/SuggestedPrompts.tsx`

Klickbare Vorschläge für nächste Benutzer-Eingaben.

#### Props Interface

```typescript
interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}
```

#### Beschreibung

Pill-Buttons für vorgeschlagene Antworten:

```tsx
<div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50">
  <div className="flex items-center gap-2 mb-2">
    <LightBulbIcon className="h-4 w-4 text-amber-500" />
    <span className="text-xs text-zinc-500">Vorschläge</span>
  </div>

  <div className="flex flex-wrap gap-2">
    {prompts.map(prompt => (
      <button
        onClick={() => onSelect(prompt)}
        className="px-3 py-1.5 text-sm bg-white border border-zinc-200
                   rounded-full hover:bg-zinc-50"
      >
        {prompt}
      </button>
    ))}
  </div>
</div>
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Container | `bg-zinc-50 border-t border-zinc-200` | ✅ |
| Pill Button | `bg-white border border-zinc-200 rounded-full` | ✅ |
| Hover | `hover:bg-zinc-50` | ✅ |
| Icon | `h-4 w-4 text-amber-500` | ✅ |

**Verwendete Heroicons:**
- `LightBulbIcon` (amber-500)

---

### ProgressIndicator

**Pfad:** `src/components/ai-chat/components/ProgressBar.tsx`

Fortschrittsbalken (0-100%) während Dokumenterstellung.

#### Props Interface

```typescript
interface ProgressBarProps {
  progress: number; // 0-100
}
```

#### Beschreibung

```tsx
<div className="px-4 py-3 border-t border-zinc-200">
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs text-zinc-500">Fortschritt</span>
    <span className="text-xs font-medium text-zinc-700">{progress}%</span>
  </div>

  <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
    <div
      className="h-full bg-primary transition-all duration-300"
      style={{ width: `${progress}%` }}
    />
  </div>

  <p className="mt-2 text-xs text-zinc-500">
    {progress < 100 ? '3 von 8 Bereichen' : 'Dokument vollständig'}
  </p>
</div>
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Track | `bg-zinc-200 rounded-full h-2` | ✅ |
| Fill | `bg-primary` | ✅ |
| Text | `text-xs text-zinc-500` | ✅ |
| Transition | `transition-all duration-300` | ✅ |

---

### ChatInput

**Pfad:** `src/components/ai-chat/components/ChatInput.tsx`

Eingabefeld mit Send-Button.

#### Props Interface

```typescript
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  placeholder?: string;
}
```

#### Beschreibung

```tsx
<form onSubmit={onSubmit} className="p-4 border-t border-zinc-200">
  <div className="flex gap-2">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 h-10 rounded-lg border border-zinc-300 px-3
                 focus:border-primary focus:ring-2 focus:ring-primary/20"
      disabled={isLoading}
    />
    <button
      type="submit"
      disabled={isLoading || !value.trim()}
      className="h-10 w-10 rounded-lg bg-primary hover:bg-primary-hover
                 text-white flex items-center justify-center"
    >
      <PaperAirplaneIcon className="h-5 w-5" />
    </button>
  </div>
</form>
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Input | `h-10 border-zinc-300` | ✅ |
| Button | `h-10 w-10 bg-primary` | ✅ |
| Focus Ring | `focus:ring-primary/20` | ✅ |
| Gap | `gap-2` | ✅ |

**Verwendete Heroicons:**
- `PaperAirplaneIcon` (Senden)

---

## Strategie-Tab Komponenten

### DNASyntheseSection

**Pfad:** `src/components/projects/strategy/DNASyntheseSection.tsx`

DNA Synthese Verwaltung im Strategie-Tab.

#### Props Interface

```typescript
interface DNASyntheseSectionProps {
  projectId: string;
  companyId: string;
  companyName: string;
  dnaSynthese?: DNASynthese;
  canSynthesize: boolean;
  markenDNAStatus?: CompanyMarkenDNAStatus;
}
```

#### Beschreibung

Zeigt DNA Synthese an und ermöglicht:

- **Erstellen:** Button wenn alle 6 Dokumente vollständig
- **Anzeigen:** Formatierter Inhalt
- **Bearbeiten:** TipTap Editor
- **Löschen:** Via Dropdown
- **Neu synthetisieren:** Bei Änderungen der Marken-DNA

#### States

1. **Nicht erstellt, kann erstellen:**
   - Button "DNA synthetisieren"

2. **Nicht erstellt, kann nicht (unvollständig):**
   - Status-Kreise
   - Link zur Marken-DNA Bibliothek

3. **Vorhanden:**
   - Inhalt anzeigen
   - Bearbeiten/Löschen via Dropdown

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Container | `bg-white rounded-lg border` | ✅ |
| Header | `p-4 border-b bg-zinc-50` | ✅ |
| Content | `p-4` | ✅ |
| Success Badge | `text-green-600` | ✅ |

**Verwendete Heroicons:**
- `BeakerIcon` (DNA Synthese, purple-600)
- `CheckCircleIcon` (Erfolg)
- `PencilIcon` (Bearbeiten)
- `TrashIcon` (Löschen)

---

### ProjektKernbotschaftChat

**Pfad:** `src/components/projects/strategy/ProjektKernbotschaftChat.tsx`

Chat für Projekt-Kernbotschaft mit DNA Synthese als Kontext.

#### Props Interface

```typescript
interface ProjektKernbotschaftChatProps {
  projectId: string;
  companyId: string;
  companyName: string;
  dnaSynthese?: DNASynthese;
  existingKernbotschaft?: Kernbotschaft;
}
```

#### Beschreibung

- **DNA Kontext:** Synthese wird an KI übergeben (~500 Tokens)
- **Chat:** Interaktive Erarbeitung der Kernbotschaft
- **Felder:** Anlass, Ziel, Teilbotschaft, Material
- **Genkit Flow:** `projectStrategyChatFlow`

#### Features

- DNA Synthese Badge (zeigt wenn aktiv)
- Vorgeschlagene Prompts
- Progress-Anzeige
- Speichern-Button nach Fertigstellung

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Container | `bg-white rounded-lg border` | ✅ |
| DNA Badge | `bg-purple-50 border-purple-200` | ✅ |
| Chat Messages | siehe AIChatInterface | ✅ |

**Verwendete Heroicons:**
- `ChatBubbleLeftIcon` (Chat)
- `BeakerIcon` (DNA Kontext)
- `DocumentIcon` (Speichern)

---

### AISequenzButton

**Pfad:** `src/components/projects/strategy/AISequenzButton.tsx`

Startet AI Sequenz zur Generierung der Strategischen Text-Matrix.

#### Props Interface

```typescript
interface AISequenzButtonProps {
  projectId: string;
  dnaSynthese: DNASynthese;
  kernbotschaft: Kernbotschaft;
  onComplete?: (textMatrix: TextMatrix) => void;
}
```

#### Beschreibung

Button erscheint nur wenn:
- ✅ DNA Synthese vorhanden
- ✅ Kernbotschaft vorhanden
- ❌ Text-Matrix noch nicht erstellt

Startet die 3-Schichten-Architektur:
1. EBENE 1: Marken-DNA (~500 Tokens)
2. EBENE 2: Score-Regeln (Shared Prompt Library)
3. EBENE 3: Projekt-Kontext (Kernbotschaft)

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Button | `bg-primary hover:bg-primary-hover` | ✅ |
| Icon | `h-5 w-5 mr-2` | ✅ |
| Loading | `animate-spin` | ✅ |

**Verwendete Heroicons:**
- `SparklesIcon` (AI Sequenz)
- `ArrowPathIcon` (Loading)

---

### TextMatrixSection

**Pfad:** `src/components/projects/strategy/TextMatrixSection.tsx`

Anzeige und Verwaltung der generierten Strategischen Text-Matrix.

#### Props Interface

```typescript
interface TextMatrixSectionProps {
  textMatrix: TextMatrix;
  onEdit: () => void;
  onRework: () => void;
  onFinalize: () => void;
}

interface TextMatrix {
  id: string;
  projectId: string;
  content: string;           // Roh-Skelett (HTML)
  status: 'draft' | 'approved';
  generatedAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}
```

#### Beschreibung

Zeigt die generierte Text-Matrix mit:

- **Roh-Skelett:** Warnung dass es geprüft werden muss
- **Bearbeiten:** TipTap Editor öffnen
- **Mit AI Sequenz umarbeiten:** Neuer Chat
- **Human Sign-off:** Button zur Freigabe als finale Pressemeldung

#### States

1. **Draft:**
   - Gelber Hintergrund (`bg-amber-50`)
   - Warnung sichtbar
   - "Human Sign-off"-Button aktiv

2. **Approved:**
   - Weißer Hintergrund
   - Grüner Badge "Freigegeben"
   - Button deaktiviert

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Container | `bg-white rounded-lg border` | ✅ |
| Warning | `bg-blue-50 border-blue-200` | ✅ |
| Matrix Content | `bg-amber-50 border-amber-200` | ✅ |
| Footer | `bg-gray-50 border-t` | ✅ |

**Verwendete Heroicons:**
- `DocumentTextIcon` (Text-Matrix)
- `PencilIcon` (Bearbeiten)
- `SparklesIcon` (Umarbeiten)
- `CheckCircleIcon` (Sign-off)

---

## Experten-Modus Komponenten

### ExpertModeToggle

**Pfad:** `src/components/assistant/ExpertModeToggle.tsx`

Toggle zwischen Standard- und Experten-Modus.

#### Props Interface

```typescript
interface ExpertModeToggleProps {
  mode: 'standard' | 'expert';
  onChange: (mode: 'standard' | 'expert') => void;
  hasDNASynthese: boolean;
  hasKernbotschaft: boolean;
}
```

#### Beschreibung

```tsx
<div className="flex gap-2">
  <Button
    variant={mode === 'standard' ? 'primary' : 'outline'}
    onClick={() => onChange('standard')}
  >
    Standard
  </Button>

  <Button
    variant={mode === 'expert' ? 'primary' : 'outline'}
    onClick={() => onChange('expert')}
    disabled={!hasDNASynthese}
    title={!hasDNASynthese ? 'DNA Synthese erforderlich' : ''}
  >
    <BeakerIcon className="h-4 w-4 mr-1" />
    Experte
  </Button>
</div>
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Button | `h-10 px-6` | ✅ |
| Gap | `gap-2` | ✅ |
| Icon | `h-4 w-4 mr-1` | ✅ |

**Verwendete Heroicons:**
- `BeakerIcon` (Experte)

---

### ExpertModeIndicator

**Pfad:** `src/components/assistant/ExpertModeIndicator.tsx`

Zeigt an welche Daten im Experten-Modus verwendet werden.

#### Props Interface

```typescript
interface ExpertModeIndicatorProps {
  usedDNASynthese: boolean;
  usedKernbotschaft: boolean;
}
```

#### Beschreibung

```tsx
<div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
  <div className="flex items-center gap-2 text-purple-700 font-medium">
    <BeakerIcon className="h-4 w-4" />
    Experten-Modus aktiv
  </div>

  <ul className="mt-2 space-y-1 text-purple-600 text-sm">
    {usedDNASynthese && (
      <li className="flex items-center gap-1">
        <CheckIcon className="h-3 w-3" />
        DNA Synthese wird verwendet
      </li>
    )}
    {usedKernbotschaft && (
      <li className="flex items-center gap-1">
        <CheckIcon className="h-3 w-3" />
        Kernbotschaft wird verwendet
      </li>
    )}
  </ul>
</div>
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Container | `bg-purple-50 border-purple-200` | ✅ |
| Text | `text-purple-700` | ✅ |
| Check Icon | `h-3 w-3` | ✅ |

**Verwendete Heroicons:**
- `BeakerIcon` (Experte)
- `CheckIcon` (Aktiv)

---

### ToneOverrideSelect

**Pfad:** `src/components/assistant/ToneOverrideSelect.tsx`

Dropdown zur Tonalitäts-Überschreibung mit Warnung.

#### Props Interface

```typescript
interface ToneOverrideSelectProps {
  defaultTone: string | null;
  onToneChange: (tone: 'formal' | 'casual' | 'modern' | null) => void;
}
```

#### Beschreibung

Ermöglicht Überschreiben der DNA-Tonalität:

- Zeigt Standard-Tonalität aus DNA
- Warnung bei Abweichung (gelber Alert)
- Optionen: Formal, Casual, Modern

#### Warning

```tsx
{showWarning && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
    <div className="flex items-start gap-2">
      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
      <div className="text-sm text-yellow-800">
        <strong>Achtung:</strong> Du überschreibst die Tonalität aus der
        Marken-DNA. Dies kann zu Inkonsistenzen führen.
      </div>
    </div>
  </div>
)}
```

#### Design System Konformität

| Element | Klasse | Konform |
|---------|--------|---------|
| Select | `h-10 border-zinc-300` | ✅ |
| Warning | `bg-yellow-50 border-yellow-200` | ✅ |
| Warning Icon | `h-5 w-5 text-yellow-600` | ✅ |

**Verwendete Heroicons:**
- `ExclamationTriangleIcon` (Warnung)

---

## Design System Konformität

Alle Marken-DNA Komponenten folgen strikt dem CeleroPress Design System.

### Farben

| Verwendung | Farbe | Variable |
|------------|-------|----------|
| Primary Actions | `#005fab` | `bg-primary` |
| Accent (Checkboxen) | `#dedc00` | `bg-[#dedc00]` |
| Text (Haupt) | `zinc-700` | `text-zinc-700` |
| Text (Sekundär) | `zinc-500` | `text-zinc-500` |
| Borders (stark) | `zinc-300` | `border-zinc-300` |
| Borders (subtil) | `zinc-200` | `border-zinc-200` |
| Hintergrund (Cards) | `zinc-50` | `bg-zinc-50` |
| Erfolg | `green-500` | `bg-green-500` |
| Warnung | `yellow-500` | `bg-yellow-500` |
| Fehler | `red-600` | `text-red-600` |
| DNA (Accent) | `purple-600` | `text-purple-600` |

### Icons

**✅ AUSSCHLIESSLICH: Heroicons /24/outline**

Verwendete Icons:

| Icon | Verwendung | Stroke |
|------|------------|--------|
| `BeakerIcon` | DNA Synthese | Standard |
| `DocumentTextIcon` | Dokumente | Standard |
| `ChatBubbleLeftRightIcon` | Chat | Standard |
| `MagnifyingGlassIcon` | Suche | Standard |
| `FunnelIcon` | Filter | `stroke-2` |
| `EllipsisVerticalIcon` | 3-Punkte | `stroke-[2.5]` |
| `PlusIcon` | Hinzufügen | Standard |
| `PencilIcon` | Bearbeiten | Standard |
| `TrashIcon` | Löschen | Standard |
| `CheckCircleIcon` | Erfolg | Standard |
| `XMarkIcon` | Schließen | Standard |
| `PaperAirplaneIcon` | Senden | Standard |
| `LightBulbIcon` | Vorschläge | Standard |
| `SparklesIcon` | AI Sequenz | Standard |
| `ClipboardDocumentIcon` | Kopieren | Standard |
| `ArrowPathIcon` | Regenerieren | Standard |

### Höhen

| Element | Höhe | Klasse |
|---------|------|--------|
| Inputs | 40px | `h-10` |
| Buttons | 40px | `h-10` |
| Icon Buttons | 40px | `h-10 w-10` |
| Small Buttons | 32px | `h-8` |
| Icons (Standard) | 20px | `h-5 w-5` |
| Icons (Tabelle) | 16px | `h-4 w-4` |
| Icons (Groß) | 24px | `h-6 w-6` |

### Spacing

| Verwendung | Spacing | Klasse |
|------------|---------|--------|
| Toolbar Gap | 8px | `gap-2` |
| Form Gap | 16px | `gap-4` |
| Section Margin | 24px | `mb-6` |
| Card Padding | 16px | `p-4` |
| Table Cell Padding | `px-6 py-4` | Standard |
| Icon + Text | 8px | `mr-2` / `ml-2` |

### Borders & Dividers

| Element | Border | Klasse |
|---------|--------|--------|
| Inputs | `zinc-300` | `border-zinc-300` |
| Buttons | `zinc-300` | `border-zinc-300` |
| Tabellen | `zinc-200` | `border-zinc-200` |
| Cards | `zinc-200` | `border-zinc-200` |
| Dividers | `zinc-200` | `divide-zinc-200` |

### Transitions

| Element | Transition | Klasse |
|---------|-----------|--------|
| Buttons | Colors | `transition-colors` |
| Hovers | All | `transition-all duration-200` |
| Transforms | Transform | `transition-transform` |

---

## Komponenten-Hierarchie

```
Marken-DNA Module
│
├── Bibliothek (Library)
│   ├── CompanyTable
│   │   ├── StatusCircles
│   │   └── CompanyActionsDropdown
│   │
│   └── MarkenDNAEditorModal
│       ├── AIChatInterface
│       │   ├── MessageList
│       │   │   ├── AIMessage
│       │   │   └── UserMessage
│       │   ├── SuggestedPrompts
│       │   ├── ProgressBar
│       │   └── ChatInput
│       │
│       └── DocumentPreview
│
├── Strategie-Tab (Projects)
│   ├── DNASyntheseSection
│   ├── ProjektKernbotschaftChat
│   │   └── AIChatInterface (wiederverwendet)
│   ├── AISequenzButton
│   └── TextMatrixSection
│
└── Experten-Modus (Assistants)
    ├── ExpertModeToggle
    ├── ExpertModeIndicator
    └── ToneOverrideSelect
```

---

**Maintainer:** CeleroPress Development Team
**Version:** 1.0
**Letzte Aktualisierung:** 2025-12-21
