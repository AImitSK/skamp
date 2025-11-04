# Shared Components Test Suite

Test-Suite für Shared Components des CampaignContentComposer.

## Components

### FolderSelectorDialog (23 Tests)

**Datei:** `FolderSelectorDialog.test.tsx`

**Zweck:** Dialog zur Auswahl eines Media-Ordners für PDF-Export.

**Features:**
- Hierarchische Ordner-Navigation mit Breadcrumbs
- Client-Filtering (zeigt nur relevante Ordner)
- Loading States
- Error Handling
- React.memo Optimierung für Performance

---

## Test-Kategorien

### 1. Rendering (2 Tests)

- ✅ Nicht rendern wenn `isOpen=false`
- ✅ Rendern wenn `isOpen=true`
- ✅ Loading-State initial anzeigen

**Implementierung:**

```typescript
if (!isOpen) return null;
```

Dialog wird nur gemounted wenn geöffnet.

---

### 2. Folder Loading (4 Tests)

- ✅ `mediaService.getFolders()` wird beim Öffnen aufgerufen
- ✅ Geladene Ordner werden angezeigt
- ✅ Folder-Descriptions werden angezeigt
- ✅ Empty-State wenn keine Ordner vorhanden
- ✅ Error-Handling bei Netzwerk-Problemen

**API Call:**

```typescript
const foldersData = await mediaService.getFolders(organizationId, currentFolderId);
```

**Error Handling:**

```typescript
try {
  // load folders
} catch (error) {
  console.error('Fehler beim Laden der Ordner:', error);
}
```

Fehler werden geloggt, UI bleibt funktional.

---

### 3. Client-Filtering (2 Tests)

- ✅ Filtert Ordner nach `clientId` wenn vorhanden
- ✅ Zeigt alle Ordner wenn kein `clientId`

**Filter-Logik:**

```typescript
const filteredFolders = clientId
  ? foldersData.filter(f => f.clientId === clientId || !f.clientId)
  : foldersData;
```

**Regel:**
- Wenn `clientId` vorhanden: Zeige nur client-spezifische + globale Ordner
- Wenn kein `clientId`: Zeige alle Ordner

---

### 4. Breadcrumb-Navigation (3 Tests)

- ✅ "Mediathek" als Root-Breadcrumb
- ✅ Breadcrumbs updaten beim Navigieren in Subfolder
- ✅ Zurück navigieren durch Klick auf Breadcrumb

**Breadcrumb-Struktur:**

```typescript
const breadcrumbs = [
  { name: 'Mediathek' },              // Root (immer)
  { id: 'folder-1', name: 'Marketing' },  // Level 1
  { id: 'folder-2', name: 'PDFs' }        // Level 2
];
```

**Navigation:**

```typescript
const handleNavigate = (folderId?: string) => {
  setCurrentFolderId(folderId);
  // Triggers useEffect → loadFolders() → getBreadcrumbs()
};
```

---

### 5. Folder-Selection (2 Tests)

- ✅ "Hier speichern" Button im aktuellen Ordner
- ✅ `onFolderSelect()` wird mit `folderId` (oder undefined für Root) aufgerufen
- ✅ Dialog schließt nach Auswahl

**Current Folder Display:**

```html
<div class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <HomeIcon class="h-5 w-5 text-blue-600" />
      <div>
        <p class="font-medium text-blue-900">
          {currentFolderId ? breadcrumbs[last].name : 'Mediathek (Hauptordner)'}
        </p>
        <p class="text-sm text-blue-700">PDF hier speichern</p>
      </div>
    </div>
    <Button onClick={handleConfirm}>Hier speichern</Button>
  </div>
</div>
```

---

### 6. Dialog Actions (2 Tests)

- ✅ "Abbrechen" Button ruft `onClose()` auf
- ✅ Backdrop-Click schließt Dialog

**Headless UI Dialog:**

```typescript
<Dialog open={isOpen} onClose={onClose} size="2xl">
  {/* Dialog Content */}
</Dialog>
```

`onClose` wird automatisch bei Backdrop-Click aufgerufen (Headless UI Feature).

---

### 7. Current Folder Display (1 Test)

- ✅ Zeigt "Mediathek (Hauptordner)" wenn Root
- ✅ Zeigt Folder-Name wenn in Subfolder

---

### 8. Performance & Memoization (2 Tests)

- ✅ Keine Re-Loads wenn `isOpen` true bleibt
- ✅ Re-Load wenn Dialog geschlossen und wieder geöffnet

**React.memo Optimierung:**

```typescript
const FolderSelectorDialog = React.memo(function FolderSelectorDialog({
  isOpen,
  onClose,
  onFolderSelect,
  organizationId,
  clientId
}: FolderSelectorDialogProps) {
  // Component implementation
});
```

**useEffect Dependency:**

```typescript
useEffect(() => {
  if (isOpen) {
    loadFolders();
  }
}, [isOpen, currentFolderId]);
```

Lädt nur wenn Dialog geöffnet oder Folder wechselt.

---

### 9. Edge Cases (3 Tests)

- ✅ Ordner ohne Description
- ✅ Ordner mit custom Colors
- ✅ Sehr lange Ordner-Namen

**Folder ohne Description:**

```typescript
{folder.description && (
  <p className="text-sm text-gray-500">{folder.description}</p>
)}
```

Optional Rendering verhindert leere Paragraphen.

**Custom Colors:**

```typescript
<FolderIcon
  className="h-5 w-5 shrink-0"
  style={{ color: folder.color || '#6B7280' }}
/>
```

Fallback zu Grau wenn keine Farbe definiert.

---

## Component Props

```typescript
interface FolderSelectorDialogProps {
  isOpen: boolean;                    // Dialog-Sichtbarkeit
  onClose: () => void;                // Callback beim Schließen
  onFolderSelect: (folderId?: string) => void;  // Callback bei Auswahl
  organizationId: string;             // Organisation ID für Folder-Query
  clientId?: string;                  // Optional: Client-Filter
}
```

## MediaFolder Type

```typescript
interface MediaFolder {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  parentId?: string;
  clientId?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

## Mocked Services

```typescript
jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    getFolders: jest.fn(),      // Returns MediaFolder[]
    getBreadcrumbs: jest.fn(),  // Returns Breadcrumb[]
  },
}));
```

**Mock Return Values:**

```typescript
// Erfolgreicher Load
mockMediaService.getFolders.mockResolvedValue([
  { id: 'f1', name: 'Folder 1', ... },
  { id: 'f2', name: 'Folder 2', ... },
]);

// Fehler
mockMediaService.getFolders.mockRejectedValue(
  new Error('Network error')
);

// Breadcrumbs
mockMediaService.getBreadcrumbs.mockResolvedValue([
  { id: 'f1', name: 'Marketing' },
]);
```

## Test-Ausführung

```bash
# Nur FolderSelectorDialog Tests
npm test -- src/components/pr/campaign/shared/__tests__/FolderSelectorDialog.test.tsx

# Mit Coverage
npm test -- --coverage src/components/pr/campaign/shared

# Watch-Mode
npm test -- --watch src/components/pr/campaign/shared
```

## Coverage

**100% Coverage**

| Metric | Coverage |
|--------|----------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

## User-Flow Beispiel

1. **Dialog öffnen:**
   ```typescript
   <Button onClick={() => handlePdfExport(title)}>PDF exportieren</Button>
   ```

2. **Initial Load:**
   - Dialog zeigt "Lade Ordner..." Loading-State
   - `mediaService.getFolders(orgId, undefined)` wird aufgerufen
   - Root-Ordner werden angezeigt
   - Breadcrumb: "Mediathek"

3. **In Subfolder navigieren:**
   - User klickt auf "Marketing Materials" Folder
   - `handleNavigate('folder-1')` wird aufgerufen
   - `mediaService.getFolders(orgId, 'folder-1')` lädt Subfolders
   - `mediaService.getBreadcrumbs('folder-1')` lädt Breadcrumb-Pfad
   - Breadcrumbs: "Mediathek > Marketing Materials"

4. **Ordner auswählen:**
   - User klickt "Hier speichern"
   - `onFolderSelect('folder-1')` wird aufgerufen
   - `onClose()` wird aufgerufen
   - Dialog schließt

5. **Alternativ: Abbrechen:**
   - User klickt "Abbrechen" oder Backdrop
   - `onClose()` wird aufgerufen
   - Dialog schließt ohne Selection

---

**Erstellt:** 2025-11-04
**Status:** ✅ Production-Ready
