# Boilerplates Komponenten-Dokumentation

**Version:** 1.0
**Letzte Aktualisierung:** 16. Oktober 2025

---

## 📋 Übersicht

Diese Dokumentation beschreibt die Komponenten des Boilerplates-Moduls. Das Modul besteht aus zwei Hauptkomponenten:

1. **page.tsx** - Hauptkomponente (Liste/Übersicht)
2. **BoilerplateModal.tsx** - Create/Edit Modal

---

## 📁 Komponenten-Struktur

```
src/app/dashboard/library/boilerplates/
├── page.tsx                    # Hauptkomponente (662 Zeilen)
└── BoilerplateModal.tsx        # Create/Edit Modal (408 Zeilen)
```

---

## 1. page.tsx (Hauptkomponente)

### Zweck

Die Hauptkomponente zeigt eine Liste aller Boilerplates mit Filtermöglichkeiten, Suche, Pagination und CRUD-Operationen.

### Features

- **Liste:** Tabellenansicht aller Boilerplates
- **Filter:** Kategorie, Sprache, Scope (Global/Kundenspezifisch)
- **Suche:** Textsuche mit Debouncing (300ms)
- **Pagination:** 10/25/50/100 Einträge pro Seite
- **Aktionen:** Erstellen, Bearbeiten, Löschen, Favorit-Toggle

### Props

```typescript
// Keine Props - Server Component
export default function BoilerplatesPage() {
  // ...
}
```

### State Management

**React Query Hooks:**
```typescript
const { data: boilerplates = [], isLoading } = useBoilerplates(organizationId);
const createBoilerplate = useCreateBoilerplate();
const updateBoilerplate = useUpdateBoilerplate();
const deleteBoilerplate = useDeleteBoilerplate();
const toggleFavorite = useToggleFavoriteBoilerplate();
```

**Local State:**
```typescript
const [showModal, setShowModal] = useState(false);
const [editingBoilerplate, setEditingBoilerplate] = useState<Boilerplate | null>(null);
const [searchTerm, setSearchTerm] = useState('');
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
const [selectedScope, setSelectedScope] = useState<string[]>([]);
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(25);
const [confirmDialog, setConfirmDialog] = useState({...});
```

### Performance-Optimierungen

**1. Debouncing:**
```typescript
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const debouncedSearchTerm = useDebounce(searchTerm, 300);
```

**2. useCallback für Handler:**
```typescript
const handleEdit = useCallback((boilerplate: Boilerplate) => {
  setEditingBoilerplate(boilerplate);
  setShowModal(true);
}, []);

const handleDelete = useCallback(async (id: string, name: string) => {
  // Confirmation Dialog + Delete
}, [deleteBoilerplateMutation, organizationId]);

const handleToggleFavorite = useCallback(async (id: string) => {
  // Toggle Favorit
}, [toggleFavoriteMutation, organizationId, user]);
```

**3. useMemo für Computed Values:**
```typescript
const totalPages = useMemo(
  () => Math.ceil(filteredBoilerplates.length / itemsPerPage),
  [filteredBoilerplates.length, itemsPerPage]
);

const activeFiltersCount = useMemo(
  () => selectedCategories.length + selectedLanguages.length + selectedScope.length,
  [selectedCategories.length, selectedLanguages.length, selectedScope.length]
);
```

### Filter-Logik

```typescript
const filteredBoilerplates = useMemo(() => {
  let filtered = boilerplates;

  // Textsuche (debounced)
  if (debouncedSearchTerm) {
    const term = debouncedSearchTerm.toLowerCase();
    filtered = filtered.filter(
      bp =>
        bp.name.toLowerCase().includes(term) ||
        bp.content.toLowerCase().includes(term) ||
        bp.description?.toLowerCase().includes(term)
    );
  }

  // Kategorie-Filter
  if (selectedCategories.length > 0) {
    filtered = filtered.filter(bp => selectedCategories.includes(bp.category));
  }

  // Sprachen-Filter
  if (selectedLanguages.length > 0) {
    filtered = filtered.filter(bp =>
      selectedLanguages.includes((bp as any).language || 'de')
    );
  }

  // Scope-Filter
  if (selectedScope.length > 0) {
    filtered = filtered.filter(bp => {
      if (selectedScope.includes('global') && bp.isGlobal) return true;
      if (selectedScope.includes('client') && !bp.isGlobal) return true;
      return false;
    });
  }

  return filtered;
}, [boilerplates, debouncedSearchTerm, selectedCategories, selectedLanguages, selectedScope]);
```

### UI-Struktur

```tsx
<div className="container mx-auto px-4 py-6">
  {/* Header */}
  <div className="flex justify-between items-center mb-6">
    <h1>Textbausteine</h1>
    <Button onClick={() => setShowModal(true)}>Neu erstellen</Button>
  </div>

  {/* Search & Filter */}
  <div className="mb-6">
    {/* Textsuche */}
    <Input
      type="search"
      placeholder="Suchen..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />

    {/* Filter-Chips */}
    <div className="flex gap-2 mt-3">
      <CategoryFilter />
      <LanguageFilter />
      <ScopeFilter />
    </div>
  </div>

  {/* Tabelle */}
  <Table>
    {/* Header */}
    <TableHead>
      <TableRow>
        <TableHeaderCell>Name</TableHeaderCell>
        <TableHeaderCell>Kategorie</TableHeaderCell>
        <TableHeaderCell>Sprache</TableHeaderCell>
        <TableHeaderCell>Scope</TableHeaderCell>
        <TableHeaderCell>Aktionen</TableHeaderCell>
      </TableRow>
    </TableHead>

    {/* Body */}
    <TableBody>
      {paginatedBoilerplates.map(bp => (
        <TableRow key={bp.id}>
          <TableCell>
            <button onClick={() => handleToggleFavorite(bp.id)}>
              <StarIcon className={bp.isFavorite ? 'text-[#dedc00]' : ''} />
            </button>
            {bp.name}
          </TableCell>
          <TableCell>{CATEGORY_LABELS[bp.category]}</TableCell>
          <TableCell>
            <FlagIcon countryCode={...} />
          </TableCell>
          <TableCell>
            <Badge>{bp.isGlobal ? 'Global' : 'Kundenspezifisch'}</Badge>
          </TableCell>
          <TableCell>
            <Button onClick={() => handleEdit(bp)}>Bearbeiten</Button>
            <Button onClick={() => handleDelete(bp.id, bp.name)}>Löschen</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>

  {/* Pagination */}
  <div className="flex justify-between items-center mt-6">
    <div>
      Seite {currentPage} von {totalPages}
    </div>
    <div className="flex gap-2">
      <Button onClick={goToFirstPage}>Erste</Button>
      <Button onClick={goToPreviousPage}>Zurück</Button>
      <Button onClick={goToNextPage}>Weiter</Button>
      <Button onClick={goToLastPage}>Letzte</Button>
    </div>
  </div>

  {/* Modal */}
  {showModal && (
    <BoilerplateModal
      boilerplate={editingBoilerplate}
      onClose={() => {
        setShowModal(false);
        setEditingBoilerplate(null);
      }}
      onSave={() => {
        setShowModal(false);
        setEditingBoilerplate(null);
        // React Query invalidiert automatisch den Cache
      }}
      organizationId={organizationId}
      userId={user.uid}
    />
  )}

  {/* Confirmation Dialog */}
  {confirmDialog.isOpen && (
    <ConfirmDialog {...confirmDialog} />
  )}
</div>
```

### Verwendungsbeispiel

```typescript
// In einer Route
import BoilerplatesPage from '@/app/dashboard/library/boilerplates/page';

// Wird automatisch gerendert unter /dashboard/library/boilerplates
```

---

## 2. BoilerplateModal.tsx

### Zweck

Das Modal zum Erstellen und Bearbeiten von Boilerplates mit Rich-Text-Editor.

### Props

```typescript
interface BoilerplateModalProps {
  boilerplate: Boilerplate | null;   // null = Create, Boilerplate = Edit
  onClose: () => void;                // Modal schließen
  onSave: () => void;                 // Nach erfolgreichem Speichern
  organizationId: string;             // Aktuelle Organisation
  userId: string;                     // Aktueller Benutzer
}
```

### Features

- **Rich-Text-Editor:** Tiptap mit Formatierungsoptionen
- **Kategorieauswahl:** Dropdown mit 5 Kategorien
- **Sprachauswahl:** Dropdown mit 10 Sprachen + Flaggen-Icons
- **Kundenauswahl:** Dropdown mit Kunden (optional, global sonst)
- **Validierung:** Name und Inhalt erforderlich
- **Toast-Feedback:** Success/Error Nachrichten

### State Management

**Tiptap Editor:**
```typescript
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 underline'
      }
    })
  ],
  content: '<p>Geben Sie hier Ihren Textbaustein ein...</p>',
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-3 py-2'
    }
  },
  onUpdate: ({ editor }) => {
    const content = editor.getHTML();
    setFormData(prev => ({ ...prev, content }));
  }
});
```

**Form Data:**
```typescript
const [formData, setFormData] = useState<BoilerplateCreateData & { language?: LanguageCode }>({
  name: '',
  content: '',
  category: 'custom',
  description: '',
  isGlobal: true,
  clientId: undefined,
  clientName: undefined,
  language: 'de' as LanguageCode
});
```

### Editor-Toolbar

```tsx
{editor && (
  <div className="border border-gray-300 rounded-t-md p-2 bg-gray-50 flex items-center gap-1">
    {/* Fett */}
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleBold().run()}
      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
    >
      <BoldIcon className="h-4 w-4" />
    </button>

    {/* Kursiv */}
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleItalic().run()}
      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
    >
      <ItalicIcon className="h-4 w-4" />
    </button>

    {/* Unterstrichen */}
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleUnderline().run()}
      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
    >
      <UnderlineIcon className="h-4 w-4" />
    </button>

    {/* Divider */}
    <div className="w-px h-6 bg-gray-300 mx-1" />

    {/* Bullet List */}
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
    >
      <ListBulletIcon className="h-4 w-4" />
    </button>

    {/* Ordered List */}
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
    >
      <ListOrderedIcon className="h-4 w-4" />
    </button>
  </div>
)}
```

### Validierung & Speichern

```typescript
const handleSubmit = async () => {
  const content = editor?.getHTML() || '';

  // Validierung
  if (!formData.name.trim() || !content.trim()) {
    toastService.warning('Bitte füllen Sie Name und Inhalt aus.');
    return;
  }

  setSaving(true);

  try {
    const boilerplateData: BoilerplateCreateData = {
      name: formData.name,
      content: content,
      category: formData.category,
      description: formData.description,
      isGlobal: formData.isGlobal,
      clientId: formData.clientId,
      clientName: formData.clientName
    };

    if (boilerplate && boilerplate.id) {
      // Update
      await boilerplatesService.update(
        boilerplate.id,
        boilerplateData,
        { organizationId, userId }
      );
      toastService.success(`"${formData.name}" erfolgreich aktualisiert`);
    } else {
      // Create
      await boilerplatesService.create(
        boilerplateData,
        { organizationId, userId }
      );
      toastService.success(`"${formData.name}" erfolgreich erstellt`);
    }

    onSave();
    onClose();
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    toastService.error(
      error instanceof Error
        ? `Fehler beim Speichern: ${error.message}`
        : 'Fehler beim Speichern des Textbausteins'
    );
  } finally {
    setSaving(false);
  }
};
```

### UI-Struktur

```tsx
<Dialog open={true} onClose={onClose} className="sm:max-w-4xl">
  <DialogTitle>
    {boilerplate ? 'Textbaustein bearbeiten' : 'Neuer Textbaustein'}
  </DialogTitle>

  <DialogBody>
    <Fieldset className="space-y-6">
      {/* Name und Kategorie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="z.B. Unternehmensprofil kurz"
          />
        </Field>

        <Field>
          <Label>Kategorie</Label>
          <Select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
          >
            {CATEGORY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Editor */}
      <Field>
        <Label>Inhalt</Label>
        {/* Toolbar */}
        <div className="mt-2">
          {/* ... Toolbar Buttons ... */}
        </div>
        {/* Editor */}
        <EditorContent editor={editor} />
      </Field>

      {/* Kunde und Sprache */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Kunde</Label>
          <Select
            value={formData.clientId || ''}
            onChange={(e) => handleClientChange(e.target.value)}
          >
            <option value="">Global (für alle Kunden)</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label>Sprache</Label>
          <Select
            value={formData.language || 'de'}
            onChange={(e) => setFormData({ ...formData, language: e.target.value as LanguageCode })}
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
            {/* ... weitere Sprachen ... */}
          </Select>
        </Field>
      </div>

      {/* Beschreibung */}
      <Field>
        <Label>Beschreibung (optional)</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Kurze Beschreibung des Verwendungszwecks..."
        />
      </Field>
    </Fieldset>
  </DialogBody>

  <DialogActions>
    <Button plain onClick={onClose}>
      Abbrechen
    </Button>
    <Button
      onClick={handleSubmit}
      disabled={saving}
      className="bg-[#005fab] hover:bg-[#004a8c] text-white"
    >
      {saving ? 'Speichern...' : 'Speichern'}
    </Button>
  </DialogActions>
</Dialog>
```

### Verwendungsbeispiel

```typescript
import BoilerplateModal from './BoilerplateModal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const [editingBoilerplate, setEditingBoilerplate] = useState<Boilerplate | null>(null);

  return (
    <>
      {/* Trigger */}
      <Button onClick={() => setShowModal(true)}>
        Neu erstellen
      </Button>

      {/* Modal */}
      {showModal && (
        <BoilerplateModal
          boilerplate={editingBoilerplate}
          onClose={() => {
            setShowModal(false);
            setEditingBoilerplate(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingBoilerplate(null);
            // React Query invalidiert automatisch Cache
          }}
          organizationId="org-123"
          userId="user-456"
        />
      )}
    </>
  );
}
```

---

## 🎨 Design System

### Farben

```typescript
// Primary Action
className="bg-[#005fab] hover:bg-[#004a8c] text-white"

// Favoriten-Stern
className="text-[#dedc00] fill-[#dedc00]"

// Borders
className="border-zinc-300"

// Backgrounds
className="bg-zinc-50"
```

### Icons

```typescript
import {
  StarIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Nur /24/outline Icons verwenden!
```

### Spacing

```typescript
// Container
className="container mx-auto px-4 py-6"

// Gaps
className="gap-2"  // Kleinere Abstände
className="gap-4"  // Mittlere Abstände
className="gap-6"  // Größere Abstände

// Margin/Padding
className="mb-6"   // Margin Bottom
className="p-4"    // Padding alle Seiten
```

---

## 🧪 Testing

### Component Tests

```typescript
// src/app/dashboard/library/boilerplates/__tests__/BoilerplateModal.test.tsx

describe('BoilerplateModal Logic', () => {
  test('sollte boilerplatesService.create mit korrekten Parametern aufrufen', async () => {
    const createData = {
      name: 'Test Boilerplate',
      content: '<p>Test content</p>',
      category: 'company' as const,
      description: 'Test description',
      isGlobal: true,
    };

    (boilerplatesService.create as jest.Mock).mockResolvedValue('new-bp-123');

    const result = await boilerplatesService.create(createData, {
      organizationId: 'org-123',
      userId: 'user-456',
    });

    expect(boilerplatesService.create).toHaveBeenCalledWith(createData, {
      organizationId: 'org-123',
      userId: 'user-456',
    });
    expect(result).toBe('new-bp-123');
  });
});
```

---

## 📖 Weitere Dokumentation

- **API-Dokumentation:** [../api/README.md](../api/README.md)
- **Haupt-Dokumentation:** [../README.md](../README.md)
- **ADRs:** [../adr/README.md](../adr/README.md)

---

**Maintainer:** CeleroPress Development Team
**Erstellt:** 16. Oktober 2025
**Letzte Aktualisierung:** 16. Oktober 2025
