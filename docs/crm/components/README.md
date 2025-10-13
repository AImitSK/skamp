# CRM React Components

**Version:** 2.0
**Status:** Production Ready
**Last Updated:** 2025-10-13

## Übersicht

Dieses Verzeichnis dokumentiert alle React-Komponenten des CRM-Moduls. Alle Komponenten sind vollständig TypeScript-typisiert, mit JSDoc dokumentiert und getestet.

## Component-Hierarchie

```
CRM Layout
├── Companies Page
│   ├── CompaniesTable          → Haupt-Tabelle mit Sorting/Selection
│   ├── CompanyFilters          → Filter-Panel (Type, Tags, Country)
│   └── CompanyBulkActions      → Bulk-Operationen (Import, Export, Delete)
│
├── Contacts Page
│   ├── ContactsTable           → Haupt-Tabelle mit Kontakt-Details
│   ├── ContactFilters          → Filter-Panel (Company, Tags, Journalist)
│   └── ContactBulkActions      → Bulk-Operationen (Import, Export, Delete)
│
└── Shared Components
    ├── Alert                   → Status-Meldungen (Info, Warning, Error)
    ├── FlagIcon                → Dynamische Flaggen-Icons
    ├── ConfirmDialog           → Bestätigungs-Modal
    └── EmptyState              → Leerzustands-Ansicht
```

---

## Companies Components

### CompaniesTable

**Location:** `src/app/dashboard/contacts/crm/companies/components/CompaniesTable.tsx`

Haupt-Tabelle für die Anzeige von Firmen mit Sorting, Selection und Actions.

**Props:**
```typescript
interface CompaniesTableProps {
  companies: CompanyEnhanced[];                         // Anzuzeigende Firmen
  selectedIds: Set<string>;                             // Ausgewählte IDs
  onSelectAll: (checked: boolean) => void;              // Alle auswählen
  onSelect: (id: string, checked: boolean) => void;     // Einzelauswahl
  onView: (id: string) => void;                         // Detailansicht öffnen
  onEdit: (company: CompanyEnhanced) => void;           // Bearbeiten-Modal
  onDelete: (id: string, name: string) => void;         // Lösch-Bestätigung
  tagsMap: Map<string, { name: string; color: string }>; // Tag-Daten für Anzeige
  getContactCount: (companyId: string) => number;       // Kontakt-Zählung
  getCountryName: (countryCode?: string) => string;     // Country-Name-Lookup
}
```

**Features:**
- ✅ Checkbox-basierte Multi-Selection
- ✅ Sortierung nach Name, Type, Country
- ✅ Actions-Dropdown (View, Edit, Delete)
- ✅ Tag-Badges mit Farben
- ✅ Reference-Marker für globale Firmen
- ✅ Contact-Count Badge
- ✅ Responsive Design

**Beispiel:**
```tsx
<CompaniesTable
  companies={filteredCompanies}
  selectedIds={selectedIds}
  onSelectAll={(checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredCompanies.map(c => c.id!)));
    } else {
      setSelectedIds(new Set());
    }
  }}
  onSelect={(id, checked) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedIds(newSelection);
  }}
  onView={(id) => router.push(`/dashboard/contacts/crm/companies/${id}`)}
  onEdit={setEditingCompany}
  onDelete={(id, name) => {
    setDeletingCompany({ id, name });
    setShowDeleteDialog(true);
  }}
  tagsMap={tagsMap}
  getContactCount={(companyId) => {
    return contacts.filter(c => c.companyId === companyId).length;
  }}
  getCountryName={(code) => {
    return countries.find(c => c.code === code)?.name || code || '-';
  }}
/>
```

---

### CompanyFilters

**Location:** `src/app/dashboard/contacts/crm/companies/components/CompanyFilters.tsx`

Filter-Panel für Companies mit Type-, Tag- und Country-Filtern.

**Props:**
```typescript
interface CompanyFiltersProps {
  selectedTypes: CompanyType[];                       // Aktive Type-Filter
  selectedTagIds: string[];                           // Aktive Tag-Filter
  onTypeChange: (types: CompanyType[]) => void;       // Type-Filter ändern
  onTagChange: (tagIds: string[]) => void;            // Tag-Filter ändern
  availableTags: Tag[];                               // Verfügbare Tags
  companies: CompanyEnhanced[];                       // Alle Companies (für Counts)
}
```

**Features:**
- ✅ Multi-Select Type-Filter
- ✅ Multi-Select Tag-Filter
- ✅ Active-Filter-Count Badge
- ✅ Reset-Button
- ✅ Real-Time Result Count

**Beispiel:**
```tsx
<CompanyFilters
  selectedTypes={selectedTypes}
  selectedTagIds={selectedTagIds}
  onTypeChange={setSelectedTypes}
  onTagChange={setSelectedTagIds}
  availableTags={tags}
  companies={companies}
/>
```

---

### CompanyBulkActions

**Location:** `src/app/dashboard/contacts/crm/companies/components/CompanyBulkActions.tsx`

Bulk-Actions-Menu für Companies.

**Props:**
```typescript
interface CompanyBulkActionsProps {
  selectedCount: number;                              // Anzahl ausgewählter Items
  onImport: () => void;                               // Import-Modal öffnen
  onExport: () => void;                               // CSV-Export
  onBulkDelete: () => void;                           // Bulk-Delete-Bestätigung
}
```

**Features:**
- ✅ Import-Button (immer sichtbar)
- ✅ Export-Button (immer sichtbar)
- ✅ Bulk-Delete (nur bei Selection > 0)
- ✅ Selection-Counter

**Beispiel:**
```tsx
<CompanyBulkActions
  selectedCount={selectedIds.size}
  onImport={() => setShowImportModal(true)}
  onExport={handleExportCSV}
  onBulkDelete={() => setShowBulkDeleteDialog(true)}
/>
```

---

## Contacts Components

### ContactsTable

**Location:** `src/app/dashboard/contacts/crm/contacts/components/ContactsTable.tsx`

Haupt-Tabelle für die Anzeige von Kontakten.

**Props:**
```typescript
interface ContactsTableProps {
  contacts: ContactEnhanced[];                        // Anzuzeigende Kontakte
  selectedIds: Set<string>;                           // Ausgewählte IDs
  onSelectAll: (checked: boolean) => void;            // Alle auswählen
  onSelect: (id: string, checked: boolean) => void;   // Einzelauswahl
  onView: (id: string) => void;                       // Detailansicht öffnen
  onEdit: (contact: ContactEnhanced) => void;         // Bearbeiten-Modal
  onDelete: (id: string, name: string) => void;       // Lösch-Bestätigung
  tags: Tag[];                                        // Alle Tags
  getPrimaryEmail: (emails?: Array<{ email: string; isPrimary?: boolean }>) => string;
  getPrimaryPhone: (phones?: Array<{ number: string; isPrimary?: boolean }>) => string;
}
```

**Features:**
- ✅ Name-Anzeige mit Academic Title
- ✅ Company & Position
- ✅ Clickable Phone/Email Links
- ✅ Social Media Icons (LinkedIn, Twitter, etc.)
- ✅ Journalist-Badge
- ✅ Reference-Marker für globale Journalisten
- ✅ Tag-Badges

**Beispiel:**
```tsx
<ContactsTable
  contacts={filteredContacts}
  selectedIds={selectedIds}
  onSelectAll={(checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredContacts.map(c => c.id!)));
    } else {
      setSelectedIds(new Set());
    }
  }}
  onSelect={(id, checked) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedIds(newSelection);
  }}
  onView={(id) => router.push(`/dashboard/contacts/crm/contacts/${id}`)}
  onEdit={setEditingContact}
  onDelete={(id, name) => {
    setDeletingContact({ id, name });
    setShowDeleteDialog(true);
  }}
  tags={tags}
  getPrimaryEmail={(emails) => emails?.find(e => e.isPrimary)?.email || emails?.[0]?.email || '-'}
  getPrimaryPhone={(phones) => phones?.find(p => p.isPrimary)?.number || phones?.[0]?.number || '-'}
/>
```

---

### ContactFilters

**Location:** `src/app/dashboard/contacts/crm/contacts/components/ContactFilters.tsx`

Filter-Panel für Contacts mit Company-, Tag- und Journalist-Filtern.

**Props:**
```typescript
interface ContactFiltersProps {
  selectedCompanyIds: string[];                       // Aktive Company-Filter
  selectedTagIds: string[];                           // Aktive Tag-Filter
  journalistsOnly: boolean;                           // Nur-Journalisten-Toggle
  onCompanyChange: (ids: string[]) => void;           // Company-Filter ändern
  onTagChange: (ids: string[]) => void;               // Tag-Filter ändern
  onJournalistToggle: (value: boolean) => void;       // Journalist-Filter toggle
  availableCompanies: CompanyEnhanced[];              // Verfügbare Companies
  availableTags: Tag[];                               // Verfügbare Tags
  contacts: ContactEnhanced[];                        // Alle Contacts (für Counts)
}
```

**Features:**
- ✅ Multi-Select Company-Filter
- ✅ Multi-Select Tag-Filter
- ✅ Journalist-Only-Toggle
- ✅ Active-Filter-Count Badge
- ✅ Reset-Button
- ✅ Real-Time Result Count

**Beispiel:**
```tsx
<ContactFilters
  selectedCompanyIds={selectedCompanyIds}
  selectedTagIds={selectedTagIds}
  journalistsOnly={journalistsOnly}
  onCompanyChange={setSelectedCompanyIds}
  onTagChange={setSelectedTagIds}
  onJournalistToggle={setJournalistsOnly}
  availableCompanies={companies}
  availableTags={tags}
  contacts={contacts}
/>
```

---

### ContactBulkActions

**Location:** `src/app/dashboard/contacts/crm/contacts/components/ContactBulkActions.tsx`

Bulk-Actions-Menu für Contacts.

**Props:**
```typescript
interface ContactBulkActionsProps {
  selectedCount: number;                              // Anzahl ausgewählter Items
  onImport: () => void;                               // Import-Modal öffnen
  onExport: () => void;                               // CSV-Export
  onBulkDelete: () => void;                           // Bulk-Delete-Bestätigung
}
```

**Features:**
- ✅ Import-Button (immer sichtbar)
- ✅ Export-Button (immer sichtbar)
- ✅ Bulk-Delete (nur bei Selection > 0)
- ✅ Selection-Counter

**Beispiel:**
```tsx
<ContactBulkActions
  selectedCount={selectedIds.size}
  onImport={() => setShowImportModal(true)}
  onExport={handleExportCSV}
  onBulkDelete={() => setShowBulkDeleteDialog(true)}
/>
```

---

## Shared Components

### Alert

**Location:** `src/app/dashboard/contacts/crm/components/shared/Alert.tsx`

Universelle Alert-Komponente für Status-Meldungen.

**Props:**
```typescript
interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';    // Alert-Typ
  title?: string;                                     // Optionaler Titel
  children: React.ReactNode;                          // Alert-Inhalt
  className?: string;                                 // Zusätzliche CSS-Klassen
}
```

**Features:**
- ✅ 4 Alert-Typen mit farbigen Icons
- ✅ Optional Title + Message
- ✅ Tailwind-basiertes Styling
- ✅ Accessibility (ARIA-Roles)

**Beispiel:**
```tsx
<Alert type="info" title="Information">
  Die Daten wurden erfolgreich geladen.
</Alert>

<Alert type="warning">
  Bitte überprüfen Sie die Eingaben.
</Alert>

<Alert type="error" title="Fehler">
  Die Verbindung zum Server konnte nicht hergestellt werden.
</Alert>
```

---

### FlagIcon

**Location:** `src/app/dashboard/contacts/crm/components/shared/FlagIcon.tsx`

Dynamisch geladene Flaggen-Icons für Länder.

**Props:**
```typescript
interface FlagIconProps {
  countryCode?: string;                               // ISO-3166 Country Code (z.B. "DE", "US")
  className?: string;                                 // Zusätzliche CSS-Klassen
}
```

**Features:**
- ✅ Dynamisches Icon-Loading (flag-icons package)
- ✅ Fallback für fehlende Flaggen
- ✅ Empty-State bei fehlendem Code

**Beispiel:**
```tsx
<FlagIcon countryCode="DE" className="w-5 h-5" />
<FlagIcon countryCode="US" className="w-4 h-4" />
<FlagIcon countryCode={undefined} /> {/* Zeigt "-" */}
```

---

### ConfirmDialog

**Location:** `src/app/dashboard/contacts/crm/components/shared/ConfirmDialog.tsx`

Bestätigungs-Modal für destruktive Aktionen.

**Props:**
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;                                    // Modal-Zustand
  title: string;                                      // Dialog-Titel
  message: string;                                    // Bestätigungs-Text
  confirmLabel?: string;                              // Confirm-Button-Text (default: "Bestätigen")
  cancelLabel?: string;                               // Cancel-Button-Text (default: "Abbrechen")
  onConfirm: () => void;                              // Confirm-Handler
  onCancel: () => void;                               // Cancel-Handler
  variant?: 'danger' | 'warning' | 'info';           // Visual-Variant (default: "danger")
}
```

**Features:**
- ✅ Modal-Overlay (HeadlessUI Dialog)
- ✅ Keyboard-Support (ESC = Cancel)
- ✅ 3 Variants (danger, warning, info)
- ✅ Customizable Button-Labels

**Beispiel:**
```tsx
<ConfirmDialog
  isOpen={showDeleteDialog}
  title="Firma löschen?"
  message={`Möchten Sie "${deletingCompany?.name}" wirklich löschen?`}
  confirmLabel="Löschen"
  cancelLabel="Abbrechen"
  variant="danger"
  onConfirm={async () => {
    await companiesEnhancedService.delete(deletingCompany.id, context);
    setShowDeleteDialog(false);
    toast.success('Firma gelöscht');
  }}
  onCancel={() => setShowDeleteDialog(false)}
/>
```

---

### EmptyState

**Location:** `src/app/dashboard/contacts/crm/components/shared/EmptyState.tsx`

Leerzustands-Ansicht für leere Listen.

**Props:**
```typescript
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>; // Heroicon Component
  title: string;                                      // Titel
  message: string;                                    // Beschreibung
  actionLabel?: string;                               // Button-Text (optional)
  onAction?: () => void;                              // Button-Handler (optional)
}
```

**Features:**
- ✅ Optional Icon
- ✅ Title + Message
- ✅ Optional Action-Button
- ✅ Zentriertes Layout

**Beispiel:**
```tsx
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

<EmptyState
  icon={BuildingOfficeIcon}
  title="Keine Firmen vorhanden"
  message="Erstellen Sie Ihre erste Firma oder importieren Sie Daten aus einer CSV-Datei."
  actionLabel="Firma erstellen"
  onAction={() => setShowCreateModal(true)}
/>
```

---

## Component Patterns

### 1. State Management Pattern

Alle CRM-Seiten verwenden dieses Pattern:

```tsx
'use client';

export default function CompaniesPage() {
  // Auth & Organization
  const { currentUser, currentOrganization } = useAuth();

  // Data Loading
  const [companies, setCompanies] = useState<CompanyEnhanced[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<CompanyType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Load Data
  useEffect(() => {
    if (!currentOrganization) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await companiesEnhancedService.getAll(currentOrganization.id);
        setCompanies(data);
      } catch (error) {
        console.error('Error loading companies:', error);
        toast.error('Fehler beim Laden der Firmen');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentOrganization]);

  // Client-Side Filtering
  const filteredCompanies = useMemo(() => {
    let result = companies;

    if (searchQuery) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedTypes.length > 0) {
      result = result.filter(c => selectedTypes.includes(c.type));
    }

    if (selectedTagIds.length > 0) {
      result = result.filter(c =>
        c.tagIds?.some(id => selectedTagIds.includes(id))
      );
    }

    return result;
  }, [companies, searchQuery, selectedTypes, selectedTagIds]);

  return (
    <div>
      {/* Filters */}
      <CompanyFilters
        selectedTypes={selectedTypes}
        selectedTagIds={selectedTagIds}
        onTypeChange={setSelectedTypes}
        onTagChange={setSelectedTagIds}
        availableTags={tags}
        companies={companies}
      />

      {/* Table */}
      <CompaniesTable
        companies={filteredCompanies}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelect={handleSelect}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        tagsMap={tagsMap}
        getContactCount={getContactCount}
        getCountryName={getCountryName}
      />

      {/* Bulk Actions */}
      <CompanyBulkActions
        selectedCount={selectedIds.size}
        onImport={handleImport}
        onExport={handleExport}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
```

### 2. Selection Management Pattern

```tsx
// Select All
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    // Select all filtered items
    setSelectedIds(new Set(filteredCompanies.map(c => c.id!)));
  } else {
    // Deselect all
    setSelectedIds(new Set());
  }
};

// Toggle Single Selection
const handleSelect = (id: string, checked: boolean) => {
  const newSelection = new Set(selectedIds);
  if (checked) {
    newSelection.add(id);
  } else {
    newSelection.delete(id);
  }
  setSelectedIds(newSelection);
};
```

### 3. CRUD Operations Pattern

```tsx
// Create
const handleCreate = async (data: Partial<CompanyEnhanced>) => {
  try {
    const id = await companiesEnhancedService.create(data, {
      organizationId: currentOrganization.id,
      userId: currentUser.uid
    });

    toast.success('Firma erstellt');
    setShowCreateModal(false);

    // Reload data
    loadData();
  } catch (error) {
    console.error('Error creating company:', error);
    toast.error('Fehler beim Erstellen der Firma');
  }
};

// Update
const handleUpdate = async (id: string, data: Partial<CompanyEnhanced>) => {
  try {
    await companiesEnhancedService.update(id, data, {
      organizationId: currentOrganization.id,
      userId: currentUser.uid
    });

    toast.success('Firma aktualisiert');
    setShowEditModal(false);
    loadData();
  } catch (error) {
    console.error('Error updating company:', error);
    toast.error('Fehler beim Aktualisieren der Firma');
  }
};

// Delete
const handleDelete = async (id: string) => {
  try {
    await companiesEnhancedService.delete(id, {
      organizationId: currentOrganization.id,
      userId: currentUser.uid
    });

    toast.success('Firma gelöscht');
    setShowDeleteDialog(false);
    loadData();
  } catch (error) {
    console.error('Error deleting company:', error);
    toast.error('Fehler beim Löschen der Firma');
  }
};
```

---

## Styling Guide

### Tailwind Classes

Alle Components verwenden diese Tailwind-Patterns:

**Buttons:**
```tsx
// Primary Button
className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"

// Secondary Button
className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"

// Danger Button
className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
```

**Tables:**
```tsx
// Table Container
className="overflow-x-auto"

// Table
className="min-w-full divide-y divide-gray-200"

// Table Header
className="bg-gray-50"

// Table Header Cell
className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"

// Table Body
className="bg-white divide-y divide-gray-200"

// Table Cell
className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
```

**Badges:**
```tsx
// Tag Badge
className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"

// Status Badge (Active)
className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"

// Status Badge (Inactive)
className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
```

---

## Testing

Alle Components haben entsprechende Unit-Tests:

```bash
# Companies Components
src/app/dashboard/contacts/crm/companies/components/__tests__/
├── CompaniesTable.test.tsx
├── CompanyFilters.test.tsx
└── CompanyBulkActions.test.tsx

# Contacts Components
src/app/dashboard/contacts/crm/contacts/components/__tests__/
├── ContactsTable.test.tsx
├── ContactFilters.test.tsx
└── ContactBulkActions.test.tsx

# Shared Components
src/app/dashboard/contacts/crm/components/shared/__tests__/
├── Alert.test.tsx
├── FlagIcon.test.tsx
└── ConfirmDialog.test.tsx
```

**Test-Beispiel:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import CompaniesTable from '../CompaniesTable';

describe('CompaniesTable', () => {
  it('renders companies correctly', () => {
    render(
      <CompaniesTable
        companies={mockCompanies}
        selectedIds={new Set()}
        onSelectAll={jest.fn()}
        onSelect={jest.fn()}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        tagsMap={new Map()}
        getContactCount={jest.fn()}
        getCountryName={jest.fn()}
      />
    );

    expect(screen.getByText('ACME GmbH')).toBeInTheDocument();
  });

  it('handles selection correctly', () => {
    const onSelect = jest.fn();
    render(<CompaniesTable {...props} onSelect={onSelect} />);

    const checkbox = screen.getAllByRole('checkbox')[1];
    fireEvent.click(checkbox);

    expect(onSelect).toHaveBeenCalledWith('company_123', true);
  });
});
```

---

## Siehe auch

- **API Documentation:**
  - [Companies API](../api/companies.md)
  - [Contacts API](../api/contacts.md)
  - [Tags API](../api/tags.md)

- **Architecture:**
  - [ADR-0001: Testing Strategy](../adr/ADR-0001-crm-module-testing-strategy.md)
  - [ADR-0002: Route-Based Navigation](../adr/ADR-0002-route-based-navigation.md)

- **Implementation:**
  - [`src/app/dashboard/contacts/crm/`](../../../src/app/dashboard/contacts/crm/) - CRM Pages
  - [`src/types/crm-enhanced.ts`](../../../src/types/crm-enhanced.ts) - TypeScript Types

---

**Maintainer:** SKAMP Development Team
**Contact:** dev@skamp.de
**Last Review:** 2025-10-13
**Next Review:** Q2 2026
