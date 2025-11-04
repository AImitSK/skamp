# FolderSelectorDialog - Komponenten-API-Referenz

> **Komponente**: FolderSelectorDialog
> **Datei**: `src/components/pr/campaign/shared/FolderSelectorDialog.tsx`
> **Zeilen**: 182
> **Status**: ✅ Produktiv
> **Performance**: React.memo optimiert

## Überblick

`FolderSelectorDialog` ist eine Dialog-Komponente zur Navigation und Auswahl von Media-Ordnern für PDF-Export.

### Features

- ✅ Breadcrumb-Navigation
- ✅ Hierarchische Ordner-Struktur
- ✅ Client-Filtering
- ✅ Loading-States
- ✅ Empty-States
- ✅ Performance-Optimierung (React.memo)
- ✅ 100% Test-Coverage (23 Tests)

## Import

```tsx
import FolderSelectorDialog from '@/components/pr/campaign/shared/FolderSelectorDialog';
```

## Props-Interface

```typescript
interface FolderSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelect: (folderId?: string) => void;
  organizationId: string;
  clientId?: string;
}
```

## Props-Referenz

### isOpen

```typescript
isOpen: boolean
```

**Beschreibung:** Steuert Sichtbarkeit des Dialogs.

**Beispiel:**
```tsx
const [showDialog, setShowDialog] = useState(false);

<FolderSelectorDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  // ...
/>
```

---

### onClose

```typescript
onClose: () => void
```

**Beschreibung:** Callback beim Schließen des Dialogs.

**Aufgerufen bei:**
- Klick auf "Abbrechen"
- ESC-Taste
- Klick außerhalb Dialog

**Beispiel:**
```tsx
<FolderSelectorDialog
  onClose={() => {
    setShowDialog(false);
    // Optional: Cleanup
  }}
  // ...
/>
```

---

### onFolderSelect

```typescript
onFolderSelect: (folderId?: string) => void
```

**Beschreibung:** Callback bei Ordner-Auswahl.

**Parameter:**
- `folderId`: Optional - ID des ausgewählten Ordners
  - `undefined`: Hauptordner (Mediathek)
  - `string`: Spezifischer Unterordner

**Beispiel:**
```tsx
<FolderSelectorDialog
  onFolderSelect={(folderId) => {
    console.log('Ausgewählt:', folderId || 'Hauptordner');
    // PDF-Generierung starten
    generatePdf(folderId);
  }}
  // ...
/>
```

---

### organizationId

```typescript
organizationId: string
```

**Beschreibung:** Organisation ID für Ordner-Abfrage.

**Verwendung:**
```tsx
<FolderSelectorDialog
  organizationId={organization.id}
  // ...
/>
```

---

### clientId

```typescript
clientId?: string
```

**Beschreibung:** Optional - Client ID für Ordner-Filtering.

**Filtering-Logik:**
```typescript
// Mit clientId: Zeigt nur Client-Ordner + Shared-Ordner
const filteredFolders = clientId
  ? foldersData.filter(f => f.clientId === clientId || !f.clientId)
  : foldersData;
```

**Beispiel:**
```tsx
<FolderSelectorDialog
  organizationId={org.id}
  clientId={client.id} // Optional
  // ...
/>
```

## Verwendung

### Basic Usage

```tsx
import { useState } from 'react';
import FolderSelectorDialog from '@/components/pr/campaign/shared/FolderSelectorDialog';

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);

  const handleFolderSelect = (folderId?: string) => {
    console.log('Ordner ausgewählt:', folderId);
    setShowDialog(false);
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        Ordner auswählen
      </Button>

      <FolderSelectorDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onFolderSelect={handleFolderSelect}
        organizationId="org-123"
      />
    </>
  );
}
```

### Mit PDF-Export

```tsx
import { usePDFGeneration } from '@/components/pr/campaign/hooks/usePDFGeneration';

function ExportWithFolder() {
  const {
    showFolderSelector,
    setShowFolderSelector,
    generatePdf
  } = usePDFGeneration();

  return (
    <FolderSelectorDialog
      isOpen={showFolderSelector}
      onClose={() => setShowFolderSelector(false)}
      onFolderSelect={generatePdf}
      organizationId="org-123"
    />
  );
}
```

### Mit Client-Filter

```tsx
<FolderSelectorDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onFolderSelect={handleSelect}
  organizationId={organization.id}
  clientId={client.id} // ← Filtert Ordner
/>
```

## Features

### Breadcrumb-Navigation

**Anzeige:**
```
Mediathek > Kunden > Acme Corp > Pressemitteilungen
```

**Navigation:**
```tsx
// Klick auf "Kunden" navigiert zurück
<button onClick={() => handleNavigate(crumb.id)}>
  {crumb.name}
</button>
```

**Code:**
```tsx
const breadcrumbs = [
  { name: 'Mediathek' },
  { id: 'folder-1', name: 'Kunden' },
  { id: 'folder-2', name: 'Acme Corp' },
  { id: 'folder-3', name: 'Pressemitteilungen' },
];
```

### Hierarchische Navigation

**Level 1: Hauptordner**
```
📁 Mediathek (Hauptordner)
  ├─ 📁 Kunden
  ├─ 📁 Pressemitteilungen
  └─ 📁 Bilder
```

**Level 2: Unterordner**
```
📁 Kunden
  ├─ 📁 Acme Corp
  ├─ 📁 Beta GmbH
  └─ 📁 Gamma AG
```

**Navigation:**
```tsx
// Klick auf Ordner
<button onClick={() => handleNavigate(folder.id)}>
  <FolderIcon />
  {folder.name}
  <ChevronRightIcon />
</button>
```

### Client-Filtering

**Ohne clientId:**
```tsx
// Zeigt alle Ordner der Organisation
<FolderSelectorDialog
  organizationId="org-123"
/>
```

**Mit clientId:**
```tsx
// Zeigt nur Client-Ordner + Shared-Ordner
<FolderSelectorDialog
  organizationId="org-123"
  clientId="client-456"
/>

// Filtering-Logik:
// ✅ Zeigt: folder.clientId === 'client-456'
// ✅ Zeigt: folder.clientId === undefined (Shared)
// ❌ Versteckt: folder.clientId === 'other-client'
```

### Loading-State

```tsx
{loading ? (
  <div className="text-center py-12">
    <Spinner />
    <Text>Lade Ordner...</Text>
  </div>
) : (
  // Ordner-Liste
)}
```

### Empty-State

```tsx
{folders.length === 0 && (
  <div className="text-center py-8 text-gray-500">
    <FolderIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
    <p>Keine Unterordner vorhanden</p>
  </div>
)}
```

## Beispiele

### Beispiel 1: Einfacher Dialog

```tsx
function SimpleFolderSelect() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Ordner wählen
      </Button>

      <FolderSelectorDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onFolderSelect={(id) => {
          setSelectedId(id);
          setOpen(false);
        }}
        organizationId="org-123"
      />

      {selectedId && <Text>Ausgewählt: {selectedId}</Text>}
    </>
  );
}
```

### Beispiel 2: Mit Callback-Action

```tsx
function FolderSelectWithAction() {
  const [open, setOpen] = useState(false);

  const handleSelect = async (folderId?: string) => {
    // Action ausführen (z.B. PDF speichern)
    await savePdf(folderId);
    setOpen(false);
    toastService.success('PDF gespeichert');
  };

  return (
    <FolderSelectorDialog
      isOpen={open}
      onClose={() => setOpen(false)}
      onFolderSelect={handleSelect}
      organizationId="org-123"
    />
  );
}
```

### Beispiel 3: Client-spezifisch

```tsx
function ClientFolderSelect({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);

  return (
    <FolderSelectorDialog
      isOpen={open}
      onClose={() => setOpen(false)}
      onFolderSelect={(id) => console.log('Selected:', id)}
      organizationId={client.organizationId}
      clientId={client.id} // ← Client-Filter
    />
  );
}
```

## Best Practices

### 1. Dialog-State korrekt verwalten

```tsx
// ✅ RICHTIG
const [open, setOpen] = useState(false);

<FolderSelectorDialog
  isOpen={open}
  onClose={() => setOpen(false)}
/>

// ❌ FALSCH - onClose fehlt
<FolderSelectorDialog
  isOpen={open}
/>
```

### 2. Callback-Memoization

```tsx
// ✅ RICHTIG
const handleSelect = useCallback((folderId?: string) => {
  setSelectedId(folderId);
}, []);

<FolderSelectorDialog
  onFolderSelect={handleSelect}
/>

// ❌ FALSCH
<FolderSelectorDialog
  onFolderSelect={(id) => setSelectedId(id)}
/>
```

### 3. Error-Handling

```tsx
// ✅ RICHTIG
const handleSelect = async (folderId?: string) => {
  try {
    await savePdf(folderId);
    toastService.success('Gespeichert');
  } catch (error) {
    toastService.error('Fehler');
  } finally {
    setOpen(false);
  }
};
```

## Troubleshooting

### Problem: Dialog bleibt offen

**Lösung:**
```tsx
// onClose implementieren
<FolderSelectorDialog
  onClose={() => setOpen(false)}
/>
```

### Problem: Keine Ordner sichtbar

**Ursache:** Client-Filter zu strikt

**Lösung:**
```tsx
// clientId weglassen für alle Ordner
<FolderSelectorDialog
  organizationId={orgId}
  // clientId={clientId} ← Weglassen
/>
```

---

**Dokumentation erstellt am:** 04. November 2025
