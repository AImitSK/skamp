# Phase 2: Marken-DNA Bibliothek (UI)

> **Workflow-Agent:** Für die Implementierung dieser Phase den `marken-dna-impl` Agent verwenden.
> Siehe `10-WORKFLOW-AGENT.md` für Details zum schrittweisen Workflow.

## Ziel
Neuer Menüpunkt "Marken DNA" unter Bibliothek mit Kundenübersicht und Status-Anzeige.

---

## Design System Referenz

> **WICHTIG:** Alle UI-Komponenten MÜSSEN dem CeleroPress Design System entsprechen!
>
> Referenz: `docs/design-system/DESIGN_SYSTEM.md`
> Vorbildseite: `src/app/dashboard/contacts/crm/companies/`

### Wichtige Regeln

- **Icons:** Ausschließlich Heroicons `/24/outline` - KEINE Emojis!
- **Farben:** Primary (#005fab), Zinc-Palette für Grautöne
- **Höhen:** `h-10` für alle interaktiven Elemente (Buttons, Inputs)
- **Schatten:** Keine (außer Dropdowns)
- **Borders:** `border-zinc-300` für Inputs/Buttons, `border-zinc-200` für Tabellen

---

## Aufgaben

### 2.1 Navigation erweitern

**Datei:** `src/components/layout/Sidebar.tsx` (oder entsprechend)

```typescript
import { SparklesIcon } from '@heroicons/react/24/outline';

// Unter "Bibliothek" hinzufügen:
{
  name: 'Marken DNA',
  href: '/dashboard/library/marken-dna',
  icon: SparklesIcon,
}
```

---

### 2.2 Hauptseite erstellen

**Datei:** `src/app/dashboard/library/marken-dna/page.tsx`

**Layout-Struktur (Design System Pattern):**

```tsx
<div className="space-y-6">
  {/* 1. Page Header */}
  <div>
    <h1 className="text-3xl font-semibold text-zinc-900">Marken DNA</h1>
    <p className="mt-1 text-sm text-zinc-500">Strategische Positionierung Ihrer Kunden</p>
  </div>

  {/* 2. Toolbar (wie CRM) */}
  <div className="flex items-center gap-2">
    {/* Search Input */}
    <div className="flex-1 relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700" />
      </div>
      <input
        type="search"
        placeholder="Kunden durchsuchen..."
        className="block w-full rounded-lg border border-zinc-300 bg-white
                   py-2 pl-10 pr-3 text-sm placeholder:text-zinc-300
                   focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                   h-10"
      />
    </div>

    {/* Filter Dropdown */}
    <Popover>
      <PopoverButton className="h-10 w-10 border border-zinc-300 bg-white rounded-lg...">
        <FunnelIcon className="h-5 w-5 stroke-2" />
      </PopoverButton>
      {/* Filter-Panel */}
    </Popover>
  </div>

  {/* 3. Results Info */}
  <div className="flex items-center justify-between">
    <span className="text-sm text-zinc-600">4 Kunden gefunden</span>
  </div>

  {/* 4. Table */}
  <CompanyTable companies={customers} ... />
</div>
```

**Features:**
- Nur Companies mit `type: 'customer'` anzeigen (Kunden = Companies mit type 'customer')
- Sortierbar nach Name, Status, letzte Aktualisierung
- Suchfunktion mit `MagnifyingGlassIcon`
- Filter mit `FunnelIcon`: Alle / Vollständig / Unvollständig

> **Hinweis:** Es gibt keine separate `customers`-Collection. Kunden sind `Company`-Dokumente mit `type: 'customer'`.

---

### 2.3 Status-Kreise Komponente

**Datei:** `src/components/marken-dna/StatusCircles.tsx`

```typescript
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface StatusCirclesProps {
  documents: {
    briefing: boolean;
    swot: boolean;
    audience: boolean;
    positioning: boolean;
    goals: boolean;
    messages: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onCircleClick?: (type: MarkenDNADocumentType) => void;
}

// Design System Farben:
// Vorhanden: bg-green-500 (success)
// Fehlt: bg-zinc-300

export function StatusCircles({ documents, size = 'md', clickable, onCircleClick }: StatusCirclesProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const docTypes = ['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages'] as const;
  const docLabels = {
    briefing: 'Briefing-Check',
    swot: 'SWOT-Analyse',
    audience: 'Zielgruppen-Radar',
    positioning: 'Positionierungs-Diamant',
    goals: 'Ziele-Setzer',
    messages: 'Botschaften-Baukasten',
  };

  return (
    <div className="flex items-center gap-1">
      {docTypes.map((type) => (
        <button
          key={type}
          onClick={() => clickable && onCircleClick?.(type)}
          disabled={!clickable}
          className={clsx(
            'rounded-full transition-colors',
            sizeClasses[size],
            documents[type] ? 'bg-green-500' : 'bg-zinc-300',
            clickable && 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1'
          )}
          title={docLabels[type]}
        />
      ))}
      <span className="ml-2 text-xs text-zinc-500">
        {Math.round((Object.values(documents).filter(Boolean).length / 6) * 100)}%
      </span>
    </div>
  );
}
```

---

### 2.4 Dropdown-Menü Komponente

**Datei:** `src/components/marken-dna/CompanyActionsDropdown.tsx`

**Orientierung:** `src/app/dashboard/contacts/crm/companies/components/CompaniesTable.tsx`

```tsx
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from '@/components/ui/dropdown';

interface CompanyActionsDropdownProps {
  company: CompanyEnhanced;
  documents: MarkenDNAStatus;
  onView: (type: MarkenDNADocumentType) => void;
  onEdit: (type: MarkenDNADocumentType) => void;
  onCreate: (type: MarkenDNADocumentType) => void;
  onDelete: (type: MarkenDNADocumentType) => void;
  onDeleteAll: () => void;
}

export function CompanyActionsDropdown({
  company,
  documents,
  onView,
  onEdit,
  onCreate,
  onDelete,
  onDeleteAll,
}: CompanyActionsDropdownProps) {
  const docTypes = [
    { key: 'briefing', label: 'Briefing-Check' },
    { key: 'swot', label: 'SWOT-Analyse' },
    { key: 'audience', label: 'Zielgruppen-Radar' },
    { key: 'positioning', label: 'Positionierungs-Diamant' },
    { key: 'goals', label: 'Ziele-Setzer' },
    { key: 'messages', label: 'Botschaften-Baukasten' },
  ] as const;

  return (
    <Dropdown>
      {/* 3-Punkte Button (Design System Pattern) */}
      <DropdownButton
        plain
        className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 stroke-[2.5]" />
      </DropdownButton>

      <DropdownMenu anchor="bottom end" className="w-72">
        {/* Company Header */}
        <div className="px-3 py-2 border-b border-zinc-200">
          <span className="text-sm font-medium text-zinc-900">{company.name}</span>
        </div>

        {/* Document Items */}
        {docTypes.map(({ key, label }) => {
          const exists = documents[key];
          return (
            <DropdownItem
              key={key}
              onClick={() => (exists ? onEdit(key) : onCreate(key))}
            >
              <div className={clsx(
                'h-2 w-2 rounded-full mr-2',
                exists ? 'bg-green-500' : 'bg-zinc-300'
              )} />
              <span className="flex-1">{label}</span>
              {exists ? (
                <span className="text-xs text-zinc-500">Bearbeiten</span>
              ) : (
                <PlusIcon className="h-4 w-4 text-zinc-400" />
              )}
            </DropdownItem>
          );
        })}

        <DropdownDivider />

        {/* Delete All Action */}
        <DropdownItem onClick={onDeleteAll}>
          <TrashIcon className="h-4 w-4" />
          <span className="text-red-600">Alle Dokumente löschen</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
```

---

### 2.5 Dokument-Editor Modal

**Datei:** `src/components/marken-dna/MarkenDNAEditorModal.tsx`

**Design System Pattern:** Modal mit Split-View

```tsx
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { XMarkIcon, ChatBubbleLeftRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface MarkenDNAEditorModalProps {
  open: boolean;
  onClose: () => void;
  company: CompanyEnhanced;
  documentType: MarkenDNADocumentType;
  onSave: (content: string) => Promise<void>;
}

export function MarkenDNAEditorModal({
  open,
  onClose,
  company,
  documentType,
  onSave,
}: MarkenDNAEditorModalProps) {
  const documentLabels = {
    briefing: 'Briefing-Check',
    swot: 'SWOT-Analyse',
    audience: 'Zielgruppen-Radar',
    positioning: 'Positionierungs-Diamant',
    goals: 'Ziele-Setzer',
    messages: 'Botschaften-Baukasten',
  };

  return (
    <Dialog open={open} onClose={onClose} size="5xl">
      {/* Title */}
      <DialogTitle>
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-primary" />
          <span>{documentLabels[documentType]}</span>
          <span className="text-zinc-500">für {company.name}</span>
        </div>
      </DialogTitle>

      {/* Split-View Body */}
      <DialogBody className="p-0 h-[600px] overflow-hidden">
        <div className="flex h-full divide-x divide-zinc-200">
          {/* Left: Chat Interface */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-zinc-700" />
                <span className="text-sm font-medium text-zinc-900">KI-Assistent</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Chat Messages */}
              <ChatInterface ... />
            </div>
            <div className="p-4 border-t border-zinc-200">
              {/* Chat Input */}
              <input
                type="text"
                placeholder="Nachricht eingeben..."
                className="block w-full rounded-lg border border-zinc-300 bg-white
                           px-3 py-2 text-sm placeholder:text-zinc-300
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                           h-10"
              />
            </div>
          </div>

          {/* Right: Document Preview */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-zinc-700" />
                  <span className="text-sm font-medium text-zinc-900">Dokument</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Document Preview */}
              <DocumentPreview ... />
            </div>
          </div>
        </div>
      </DialogBody>

      {/* Actions */}
      <DialogActions>
        <Button variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
        <Button onClick={handleSave}>
          Speichern & Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## Komponenten-Struktur

```
src/app/dashboard/library/marken-dna/
├── page.tsx                          # Hauptseite
├── components/
│   ├── CompanyTable.tsx              # Tabelle (Pattern: CRM CompaniesTable)
│   ├── StatusCircles.tsx             # Status-Anzeige
│   └── CompanyActionsDropdown.tsx    # Dropdown-Menü
└── __tests__/

src/components/marken-dna/
├── MarkenDNAEditorModal.tsx          # Editor mit Chat
├── ChatInterface.tsx                 # Chat-Komponente (wiederverwendbar)
├── DocumentPreview.tsx               # Live-Vorschau
└── __tests__/
```

---

## State Management

```typescript
// Zustand für die Seite
interface MarkenDNAPageState {
  selectedCompanyId: string | null;  // Company ID (type: 'customer')
  editingDocument: MarkenDNADocumentType | null;
  workshopActive: boolean;
  searchQuery: string;
  filter: 'all' | 'complete' | 'incomplete';
}
```

---

## Toast-Benachrichtigungen & i18n

Alle UI-Texte werden über **next-intl** übersetzt. Toast-Meldungen verwenden den `toasts.markenDNA` Namespace:

```typescript
import { useTranslations } from 'next-intl';
import { toastService } from '@/lib/utils/toast';

function MarkenDNALibrary() {
  const t = useTranslations('markenDNA');           // UI-Texte
  const tToast = useTranslations('toasts');         // Toast-Meldungen
  const tCommon = useTranslations('common');        // Gemeinsame Texte

  // Beispiel: Dokument speichern
  const handleSave = async () => {
    try {
      await saveMarkenDNADocument(companyId, documentType, content);
      toastService.success(tToast('markenDNA.documentSaved'));
      onClose();
    } catch (error) {
      toastService.error(tToast('saveError', { message: error.message }));
    }
  };

  // Beispiel: Dokument löschen mit Bestätigung
  const handleDelete = async () => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      await deleteMarkenDNADocument(companyId, documentType);
      toastService.success(tToast('markenDNA.documentDeleted'));
    } catch (error) {
      toastService.error(tToast('deleteError', { message: error.message }));
    }
  };

  // Beispiel: Alle Dokumente löschen
  const handleDeleteAll = async () => {
    if (!confirm(t('confirmDeleteAll', { companyName }))) return;

    try {
      await deleteAllMarkenDNA(companyId);
      toastService.success(tToast('markenDNA.allDocumentsDeleted'));
    } catch (error) {
      toastService.error(tToast('deleteError', { message: error.message }));
    }
  };

  return (
    <div>
      <h1>{t('title')}</h1>
      <Button>{tCommon('save')}</Button>
    </div>
  );
}
```

> Siehe `07-ENTWICKLUNGSRICHTLINIEN.md` für vollständige Toast- und i18n-Dokumentation.

---

## Verwendete Heroicons

```typescript
import {
  // Navigation & Suche
  MagnifyingGlassIcon,    // Suche
  FunnelIcon,             // Filter

  // Aktionen
  EllipsisVerticalIcon,   // 3-Punkte-Menü (stroke-[2.5])
  EyeIcon,                // Anzeigen
  PencilIcon,             // Bearbeiten
  PlusIcon,               // Erstellen/Hinzufügen
  TrashIcon,              // Löschen
  XMarkIcon,              // Schließen

  // Content
  DocumentTextIcon,       // Dokument
  ChatBubbleLeftRightIcon, // Chat
  SparklesIcon,           // Marken DNA (Navigation)
  CheckCircleIcon,        // Status vollständig
} from '@heroicons/react/24/outline';
```

---

## Abhängigkeiten

- Phase 1 (Datenmodell & Services)
- **Design System** (`docs/design-system/DESIGN_SYSTEM.md`)
- Bestehende UI-Komponenten (`src/components/ui/`)
  - Dialog, Button, Badge, Checkbox, Dropdown
- Bestehender TipTap Editor (für Dokumentbearbeitung)
- **Zentraler Toast-Service** (`src/lib/utils/toast.ts`)
- **CRM Referenz-Pattern** (`src/app/dashboard/contacts/crm/`)

---

## Erledigungs-Kriterien

- [ ] Navigation erweitert (mit `SparklesIcon`)
- [ ] Hauptseite mit Kundentabelle (Design System Pattern)
- [ ] Status-Kreise funktional und klickbar
- [ ] Dropdown-Menü mit allen Aktionen (3-Punkte-Menü Pattern)
- [ ] Editor-Modal mit Split-View (Dialog size="5xl")
- [ ] Löschen mit Bestätigungsdialog (ConfirmDialog Pattern)
- [ ] Suche und Filter funktionieren
- [ ] Responsive Design
- [ ] Alle Heroicons statt Emojis
- [ ] Design System Farben und Abstände
- [ ] Tests geschrieben

---

## Nächste Schritte

- **Weiter:** `04-PHASE-3-KI-CHAT.md` (KI-Chat mit Genkit)
- **Dokumentation:** Nach Abschluss aller Phasen → `09-DOKUMENTATION.md`
