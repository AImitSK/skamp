# Implementierungsplan: Inline Document Editor für Projekt-Ordner

## Übersicht
Integration von Tiptap-basierten Editoren direkt in die Projekt-Ordnerstruktur, um Dokumente und Tabellen inline zu erstellen und zu bearbeiten - alles ohne Admin SDK, nur mit Client SDK.

## Ziel-Architektur

### User Flow
1. User navigiert zu `Projekt > Dokumente` Ordner
2. Sieht zwei neue Buttons: `📝 Text erstellen` und `📊 Tabelle erstellen`
3. Klick öffnet Modal mit entsprechendem Editor
4. Speichern legt Datei direkt im aktuellen Ordner ab
5. Bestehende Dateien (.docx, .xlsx) öffnen sich ebenfalls im Editor

### Technische Architektur
```
Firebase Storage (Ordnerstruktur)
    └── Projekte/P-20250110-Company-Project/
        └── Dokumente/
            ├── brief.celero-doc (Metadaten + Referenz)
            └── tabelle.celero-sheet (Metadaten + Referenz)

Firestore (Dokumentinhalt)
    └── documentContent/
        ├── {documentId}: { content: HTML, updatedAt, version }
        └── {sheetId}: { data: JSON, formulas, updatedAt }
```

## Implementierungsschritte

### Phase 1: Datenmodell erweitern

#### 1.1 Neue Datei-Typen definieren
```typescript
// src/types/media.ts
export interface InternalDocument {
  id: string;
  fileName: string;
  fileType: 'celero-doc' | 'celero-sheet' | 'imported-doc';
  folderId: string;
  organizationId: string;
  
  // Referenz zum Firestore-Dokument
  contentRef: string; // documentContent/{id}
  
  // Metadaten
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  
  // Optional für importierte Dateien
  originalFormat?: 'docx' | 'xlsx' | 'pdf';
  originalUrl?: string;
}
```

#### 1.2 Content-Struktur in Firestore
```typescript
// src/types/document-content.ts
export interface DocumentContent {
  id: string;
  content: string; // HTML from Tiptap
  plainText?: string;
  organizationId: string;
  projectId: string;
  folderId: string;
  
  // Versionierung
  version: number;
  versionHistory?: {
    version: number;
    content: string;
    updatedBy: string;
    updatedAt: Timestamp;
  }[];
  
  // Kollaboration
  currentEditor?: string;
  lastEditedBy: string;
  lastEditedAt: Timestamp;
}
```

### Phase 2: Services erweitern

#### 2.1 Document Content Service (KEIN Admin SDK!)
```typescript
// src/lib/firebase/document-content-service.ts
class DocumentContentService {
  // Nutzt CLIENT SDK
  async createDocument(
    content: string,
    metadata: {
      fileName: string;
      folderId: string;
      organizationId: string;
      userId: string;
    }
  ) {
    // 1. Content in Firestore speichern
    const contentRef = await addDoc(collection(db, 'documentContent'), {
      content,
      organizationId: metadata.organizationId,
      version: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // 2. Metadaten als "Datei" in Storage-Struktur
    const fileMetadata = {
      fileName: metadata.fileName,
      fileType: 'celero-doc',
      contentRef: contentRef.id,
      folderId: metadata.folderId,
      // ...
    };
    
    // 3. In mediaAssets Collection für Ordner-Anzeige
    await mediaService.createInternalDocument(fileMetadata);
    
    return contentRef.id;
  }
  
  async updateDocument(documentId: string, content: string) {
    // Auto-Save mit Throttling
    await updateDoc(doc(db, 'documentContent', documentId), {
      content,
      updatedAt: serverTimestamp(),
      version: increment(1)
    });
  }
  
  async loadDocument(documentId: string) {
    const docSnap = await getDoc(doc(db, 'documentContent', documentId));
    return docSnap.data();
  }
}
```

#### 2.2 Media Service Erweiterungen
```typescript
// Erweitere src/lib/firebase/media-service.ts
async createInternalDocument(metadata: InternalDocument) {
  // Speichere als mediaAsset mit speziellem Typ
  const asset = {
    ...metadata,
    isInternalDocument: true,
    downloadUrl: null, // Kein direkter Download
    fileSize: 0, // Wird aus Content berechnet
  };
  
  return await this.createMediaAsset(asset);
}
```

### Phase 3: UI-Komponenten

#### 3.1 Document Editor Modal
```typescript
// src/components/projects/DocumentEditorModal.tsx
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function DocumentEditorModal({
  isOpen,
  onClose,
  document, // Falls bestehendes Dokument
  folderId,
  organizationId,
  onSave
}) {
  const [title, setTitle] = useState(document?.fileName || 'Neues Dokument');
  const [saving, setSaving] = useState(false);
  
  const editor = useEditor({
    extensions: [StarterKit],
    content: document?.content || '<p>Dokument beginnen...</p>',
    onUpdate: debounce(({ editor }) => {
      // Auto-Save alle 2 Sekunden
      if (document?.id) {
        documentContentService.updateDocument(
          document.contentRef,
          editor.getHTML()
        );
      }
    }, 2000)
  });
  
  const handleSave = async () => {
    setSaving(true);
    const content = editor.getHTML();
    
    if (document?.id) {
      // Update existing
      await documentContentService.updateDocument(document.contentRef, content);
    } else {
      // Create new
      await documentContentService.createDocument(content, {
        fileName: `${title}.celero-doc`,
        folderId,
        organizationId,
        userId: user.uid
      });
    }
    
    onSave();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>
        <input 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-bold"
        />
      </DialogTitle>
      
      <DialogBody>
        {/* Toolbar */}
        <EditorToolbar editor={editor} />
        
        {/* Editor */}
        <EditorContent 
          editor={editor} 
          className="prose max-w-none min-h-[400px]"
        />
      </DialogBody>
      
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

#### 3.2 ProjectFoldersView Erweiterungen
```typescript
// In src/components/projects/ProjectFoldersView.tsx

// Neue State
const [showDocumentEditor, setShowDocumentEditor] = useState(false);
const [editingDocument, setEditingDocument] = useState(null);

// Neue Buttons (nur im Dokumente-Ordner sichtbar)
const isDocumentsFolder = breadcrumbs.some(b => b.name === 'Dokumente');

{isDocumentsFolder && (
  <div className="flex space-x-2">
    <Button
      onClick={() => setShowDocumentEditor(true)}
      title="Neues Textdokument"
    >
      <DocumentTextIcon className="w-4 h-4" />
    </Button>
    <Button
      onClick={() => setShowSpreadsheetEditor(true)}
      title="Neue Tabelle"
    >
      <TableCellsIcon className="w-4 h-4" />
    </Button>
  </div>
)}

// Asset-Klick Handler erweitern
const handleAssetClick = async (asset) => {
  if (asset.fileType === 'celero-doc' || asset.fileName.endsWith('.docx')) {
    // Lade Content und öffne im Editor
    const content = await documentContentService.loadDocument(asset.contentRef);
    setEditingDocument({ ...asset, content });
    setShowDocumentEditor(true);
  } else if (asset.fileType === 'celero-sheet') {
    // Öffne Tabellen-Editor
    setShowSpreadsheetEditor(true);
  } else {
    // Normal öffnen
    window.open(asset.downloadUrl, '_blank');
  }
};
```

### Phase 4: Import/Export für externe Dateien

#### 4.1 Word-Import
```typescript
// src/lib/converters/docx-converter.ts
import mammoth from 'mammoth';

export async function convertDocxToHtml(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value; // HTML
}

// Bei Upload einer .docx
if (file.name.endsWith('.docx')) {
  const html = await convertDocxToHtml(file);
  await documentContentService.createDocument(html, {
    fileName: file.name.replace('.docx', ''),
    originalFormat: 'docx',
    // ...
  });
}
```

#### 4.2 Export zu Word
```typescript
// src/lib/converters/html-to-docx.ts
import { Document, Packer, Paragraph } from 'docx';

export async function exportToWord(html: string, fileName: string) {
  // HTML zu Word konvertieren
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // HTML parsen und zu Word-Elementen konvertieren
      ]
    }]
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
}
```

### Phase 5: Tabellen-Editor (Später)

#### 5.1 Integration von Luckysheet oder Handsontable
```typescript
// src/components/projects/SpreadsheetEditorModal.tsx
import Handsontable from 'handsontable';

export function SpreadsheetEditorModal({
  // ähnlich wie DocumentEditorModal
}) {
  // Tabellen-Daten in Firestore als JSON
  const data = {
    cells: [[...]],
    formulas: {},
    styles: {}
  };
}
```

## Kritische Punkte (KEIN Admin SDK!)

### 1. Alles läuft über Client SDK
- Firestore Security Rules müssen korrekt sein
- User kann nur eigene Org-Daten bearbeiten
- Keine Server-seitigen Operationen

### 2. Performance
- Auto-Save mit Debouncing (nicht bei jedem Tastendruck)
- Content-Lazy-Loading (nicht alle Versionen laden)
- Pagination für große Dokumente

### 3. Konflikt-Behandlung
```typescript
// Einfache Lösung: Last-Write-Wins
// Bessere Lösung: Operational Transform (später)
onSnapshot(doc(db, 'documentContent', id), (snapshot) => {
  // Andere User bearbeitet? → Warnung anzeigen
});
```

### 4. Sicherheit
```javascript
// Firestore Rules
match /documentContent/{docId} {
  allow read: if resource.data.organizationId == request.auth.token.organizationId;
  allow write: if request.auth.token.organizationId == resource.data.organizationId
    && request.auth.uid != null;
}
```

## Migration der bestehenden Strategiedokumente

```typescript
// Einmalige Migration
async function migrateStrategyDocuments() {
  const oldDocs = await strategyDocumentService.getAll();
  
  for (const doc of oldDocs) {
    // 1. Content nach documentContent verschieben
    const contentRef = await createDocument(doc.content, {...});
    
    // 2. Als Datei in Dokumente-Ordner anlegen
    await mediaService.createInternalDocument({
      fileName: doc.title,
      fileType: 'celero-doc',
      contentRef: contentRef.id,
      folderId: findDocumentsFolderId(doc.projectId)
    });
  }
}
```

## Reihenfolge der Implementierung

1. **Phase 1**: Datenmodell (2h)
2. **Phase 2**: Document Content Service (3h)
3. **Phase 3**: Editor Modal + Integration (4h)
4. **Phase 4**: Import/Export für .docx (3h)
5. **Testing & Bugfixing** (2h)
6. **Phase 5**: Tabellen-Editor (später, ~6h)

**Geschätzte Zeit für Basis-Implementierung: ~14 Stunden**

## Offene Fragen

1. Sollen alte Strategiedokumente migriert werden?
2. Maximale Dokumentgröße festlegen?
3. Versionierung: Wie viele alte Versionen behalten?
4. Offline-Support gewünscht?
5. Kollaboratives Editing (mehrere User gleichzeitig)?

## Nächste Schritte

1. Diesen Plan reviewen und absegnen
2. Mit Phase 1 (Datenmodell) beginnen
3. Schrittweise implementieren mit Tests nach jeder Phase
4. User-Feedback nach Basis-Implementation einholen