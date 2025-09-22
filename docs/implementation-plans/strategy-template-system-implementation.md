# Strategie-Tab Template System Implementierung

## Überblick
Implementierung eines Google Docs-ähnlichen Template-Systems für den Strategie-Tab im Projekt-Bereich. Wiederverwendung bestehender Komponenten aus dem Daten-Tab.

## Analysierte Bestehende Komponenten

### 1. DocumentEditorModal (`src/components/projects/DocumentEditorModal.tsx`)
**Funktionalität:**
- TipTap Rich-Text Editor mit StarterKit, Link, TextAlign, Underline
- Auto-Save Funktionalität mit debounce
- Vollständige Toolbar (Bold, Italic, Underline, Lists, Code, etc.)
- Loading/Saving States
- Document-Locking für Collaborative Editing

**Wiederverwendung:**
- ✅ Komplett wiederverwendbar
- ✅ Bereits projektId, organizationId, folderId Parameter
- ✅ Unterstützt Titel-Eingabe und Content-Editing

### 2. StrategyDocumentService (`src/lib/firebase/strategy-document-service.ts`)
**Funktionalität:**
- CRUD Operationen für Strategiedokumente
- Template-Support (templateId, templateName)
- Versionierung (version, previousVersionId)
- Status-Management (draft, review, approved, archived)
- Typen: 'briefing' | 'strategy' | 'analysis' | 'notes'

**Wiederverwendung:**
- ✅ Bereits Template-Support eingebaut
- ✅ Typ-System passt zu unseren Vorlagen
- ✅ Vollständige CRUD-Funktionalität

### 3. ProjectFoldersView Komponenten
**Funktionalität:**
- Modal-Management (useState für verschiedene Modals)
- Grid-Layout für Aktionen
- Button-Komponenten mit Icons
- Tabellen-Ansicht für Dokumente

**Wiederverwendung:**
- ✅ Grid-Layout Pattern für Template-Kacheln
- ✅ Modal-Management Pattern
- ✅ UI-Komponenten (Button, Badge, etc.)

## Implementierungsplan

### Phase 1: Template-Kacheln Komponente erstellen

#### 1.1 Neue Komponente: `StrategyTemplateGrid.tsx`
```typescript
interface TemplateCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType;
  onClick: () => void;
}

interface StrategyTemplateGridProps {
  onTemplateSelect: (templateType: TemplateType, content?: string) => void;
}

type TemplateType = 'blank' | 'table' | 'company-profile' | 'situation-analysis' | 'audience-analysis' | 'core-messages';
```

**Kacheln-Layout:**
- 3x2 Grid (Desktop) / 2x3 Grid (Mobile)
- Jede Kachel: Icon + Titel + Beschreibung
- Hover-Effekte und Click-Handler

#### 1.2 Template-Inhalte als Konstanten
```typescript
// src/constants/strategy-templates.ts
export const STRATEGY_TEMPLATES = {
  'blank': {
    title: 'Neues Dokument erstellen',
    description: 'Beginnen Sie mit einem leeren Blatt für Ihre Notizen und Ideen.',
    content: ''
  },
  'table': {
    title: 'Leere Tabelle erstellen',
    description: 'Strukturieren Sie Ihre Daten in einer einfachen Tabelle.',
    content: `# Neue Tabelle

| Spalte 1 | Spalte 2 | Spalte 3 |
|----------|----------|----------|
|          |          |          |
|          |          |          |
|          |          |          |`
  },
  'company-profile': {
    title: 'Unternehmensprofil & Senderanalyse',
    description: 'Erfassen Sie die Kernfakten des Absenders, die als Grundlage für die gesamte Kommunikation dienen.',
    content: `# Unternehmensprofil & Senderanalyse

## Firmenprofil
### Mission & Vision
*Hier Mission und Vision des Unternehmens eintragen.*

### Werte
*Welche Werte leiten das Handeln des Unternehmens?*

### Alleinstellungsmerkmale (USPs)
*Was macht das Unternehmen und seine Produkte/Dienstleistungen einzigartig?*

## Hintergrundinformationen
- **Gründungsjahr:**
- **Gründer/CEO:**
- **Unternehmensgröße & Standort:**
- **Primäre Produkte/Dienstleistungen:**`
  },
  'situation-analysis': {
    title: 'Situationsanalyse',
    description: 'Eine fundierte Analyse der aktuellen Marktposition, des Wettbewerbsumfelds sowie der internen Stärken und Schwächen.',
    content: `# Situationsanalyse

## Ist-Zustand & Marktposition
### Aktuelle Marktsituation
*Wie ist die aktuelle Lage in Ihrer Branche? Trends, Entwicklungen.*

### Wichtigste Stärken (Strengths)
*Was sind die internen Stärken Ihres Unternehmens?*

### Größte Schwächen (Weaknesses)
*Wo gibt es interne Verbesserungspotenziale?*

### Chancen (Opportunities)
*Welche externen Chancen ergeben sich aus dem Markt?*

### Risiken (Risks)
*Welche externen Risiken könnten das Geschäft beeinträchtigen?*

## Wettbewerbsanalyse
### Hauptkonkurrenten
*Listen Sie Ihre 3-5 wichtigsten Wettbewerber auf.*

### PR-Aktivitäten der Konkurrenz
*Welche PR-Maßnahmen setzen Ihre Wettbewerber um?*

### Unterschiede zur Konkurrenz
*Wie heben Sie sich von der Konkurrenz ab?*`
  },
  'audience-analysis': {
    title: 'Zielgruppenanalyse',
    description: 'Erstellen Sie detaillierte Profile Ihrer Zielgruppen, um die Kommunikation präzise auf ihre Bedürfnisse abzustimmen.',
    content: `# Zielgruppenanalyse

## Primäre Zielgruppe
- **Demografische Merkmale:** (Alter, Geschlecht, Wohnort, Beruf, Einkommen...)
- **Psychografische Merkmale:** (Werte, Interessen, Lebensstil, Meinungen...)
- **Mediennutzung:** (Welche Kanäle, soziale Netzwerke, Publikationen werden genutzt?)
- **Probleme & Bedürfnisse (Pain Points):** (Welche Probleme löst Ihr Angebot für diese Gruppe?)
- **Gewünschte Reaktion (Call to Action):** (Was soll die Zielgruppe nach dem Kontakt mit Ihrer Botschaft tun?)

## Sekundäre Zielgruppe
- **Demografische Merkmale:**
- **Psychografische Merkmale:**
- **Mediennutzung:**
- **Probleme & Bedürfnisse (Pain Points):**
- **Gewünschte Reaktion (Call to Action):**`
  },
  'core-messages': {
    title: 'Kernbotschaften & Kommunikationsziele',
    description: 'Definieren Sie die zentralen Aussagen und die übergeordneten Ziele, die durch die PR-Aktivität erreicht werden sollen.',
    content: `# Kernbotschaften & Kommunikationsziele

## Kommunikationsziele
*Definieren Sie mindestens 3 klar messbare Ziele.*
1. **Ziel 1:** (z.B. Steigerung der Markenbekanntheit in der Zielgruppe X um 15% bis Q4 2025)
2. **Ziel 2:**
3. **Ziel 3:**

## Kernbotschaften
*Formulieren Sie mindestens 3 zentrale Aussagen, die konsistent in der Kommunikation verwendet werden.*
1. **Botschaft 1:**
2. **Botschaft 2:**
3. **Botschaft 3:**`
  }
};
```

### Phase 2: Dokumente-Tabelle Komponente

#### 2.1 Neue Komponente: `StrategyDocumentsTable.tsx`
```typescript
interface StrategyDocumentsTableProps {
  documents: StrategyDocument[];
  onEdit: (document: StrategyDocument) => void;
  onDelete: (documentId: string) => void;
  loading: boolean;
}
```

**Tabellen-Spalten:**
- Titel
- Typ (Badge)
- Status (Badge)
- Erstellt am
- Aktionen (Bearbeiten, Löschen)

### Phase 3: Haupt-Strategie-Tab Komponente

#### 3.1 Neue Komponente: `ProjectStrategyTab.tsx`
```typescript
interface ProjectStrategyTabProps {
  projectId: string;
  organizationId: string;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│         Template-Kacheln        │
│    (StrategyTemplateGrid)       │
├─────────────────────────────────┤
│                                 │
│      Bestehende Dokumente       │
│   (StrategyDocumentsTable)      │
│                                 │
└─────────────────────────────────┘
```

**States:**
- `documents: StrategyDocument[]`
- `loading: boolean`
- `showEditor: boolean`
- `selectedDocument: StrategyDocument | null`
- `templateContent: string | null`

### Phase 4: Integration in ProjectDetailPage

#### 4.1 Tab-Content Update
```typescript
// In src/app/dashboard/projects/[projectId]/page.tsx
{activeTab === 'strategie' && (
  <ProjectStrategyTab
    projectId={project.id!}
    organizationId={currentOrganization.id}
  />
)}
```

## Kritische Analyse: Projektspezifische Ordner-Zuordnung

### Problem: Wie findet das System den richtigen Dokumente-Ordner?

Das war das komplexeste Problem bei der Implementierung. Hier die detaillierte Analyse:

#### 1. Projekt → Ordner-Struktur Mapping

**Projekt-Datenstruktur (`src/types/project.ts`):**
```typescript
interface Project {
  assetFolders?: Array<{
    folderId: string;      // Firebase-Ordner-ID
    folderName: string;    // z.B. "Medien", "Dokumente", "Pressemeldungen"
    assetCount: number;
    lastModified: Timestamp;
  }>;
}
```

**Automatische Ordner-Erstellung:**
- Bei Projekt-Erstellung werden automatisch 3 Hauptordner angelegt:
  - "Medien" (für Assets)
  - "Dokumente" (für Text-Dokumente)
  - "Pressemeldungen" (für PR-Inhalte)

#### 2. Ordner-Struktur Laden (`src/lib/firebase/project-service.ts`)

```typescript
async getProjectFolderStructure(projectId: string, context: { organizationId: string }) {
  // 1. Projekt laden
  const project = await this.getById(projectId, context);

  // 2. assetFolders Array durchgehen
  const folders = await Promise.all(
    project.assetFolders.map(async (folderInfo) => {
      return await mediaService.getFolder(folderInfo.folderId);
    })
  );

  // 3. Struktur zurückgeben
  return {
    mainFolder: validFolders[0],
    subfolders: validFolders.slice(1),
    statistics: { /* ... */ }
  };
}
```

#### 3. Ordner-Navigation im ProjectFoldersView

**State-Management:**
```typescript
const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
const [projectFolders, setProjectFolders] = useState<any>(null);
```

**Kritischer Erkennungs-Mechanismus:**
```typescript
// Prüfung ob wir im "Dokumente" Ordner sind
const isInDocumentsFolder = () => {
  return breadcrumbs.some(b => b.name === 'Dokumente') ||
         currentFolders.some(f => f.name === 'Dokumente');
};
```

**UI-Conditional Rendering:**
```typescript
{/* Document Editor Buttons - nur im Dokumente-Ordner UND nicht im Root sichtbar */}
{selectedFolderId && isInDocumentsFolder() && (
  <div className="flex items-center space-x-2">
    <Button onClick={handleCreateDocument}>
      <DocumentPlusIcon className="w-5 h-5" />
    </Button>
  </div>
)}
```

#### 4. DocumentEditorModal - Ordner-Zuordnung

**Kritische folderId-Übergabe:**
```typescript
<DocumentEditorModal
  isOpen={showDocumentEditor}
  onClose={() => setShowDocumentEditor(false)}
  onSave={handleDocumentSave}
  document={editingDocument}
  folderId={selectedFolderId || projectFolders?.id} // ← HIER!
  organizationId={organizationId}
  projectId={projectId}
/>
```

**Fallback-Logik:**
- `selectedFolderId`: Wenn Benutzer in Unterordner ist
- `projectFolders?.id`: Fallback auf Haupt-Projekt-Ordner

#### 5. Document-Content-Service Integration

Das DocumentEditorModal verwendet `documentContentService` um Dokumente zu speichern:

```typescript
// In DocumentEditorModal
const documentData = {
  folderId: folderId,        // ← Projektspezifischer Ordner
  organizationId: organizationId,
  projectId: projectId,
  title: title,
  content: editor?.getHTML(),
  // ...
};

await documentContentService.create(documentData);
```

### Lösung für Strategie-Tab

**Problem:** Strategiedokumente müssen projektspezifisch gespeichert werden, aber nicht in Media-Ordnern.

**Lösung 1: Strategie-Ordner in assetFolders**
```typescript
// Bei Projekt-Erstellung zusätzlichen "Strategie" Ordner anlegen
project.assetFolders = [
  { folderId: 'xxx', folderName: 'Medien', /* ... */ },
  { folderId: 'yyy', folderName: 'Dokumente', /* ... */ },
  { folderId: 'zzz', folderName: 'Pressemeldungen', /* ... */ },
  { folderId: 'aaa', folderName: 'Strategie', /* ... */ }  // ← NEU
];
```

**Lösung 2: Strategie-Service Direktzuordnung (EMPFOHLEN)**
```typescript
// StrategyDocumentService nutzt projektId direkt
const strategyDoc = {
  projectId: projectId,           // ← Direkter Projekt-Bezug
  organizationId: organizationId,
  folderId: 'strategy',          // ← Virtueller Ordner-Name
  title: title,
  content: content
};

await strategyDocumentService.create(strategyDoc);
```

### Warum ist das so komplex?

1. **Multi-Tenancy:** Jedes Dokument muss organizationId haben
2. **Projekt-Zuordnung:** Dokumente müssen projektspezifisch sein
3. **Ordner-Hierarchie:** Media-Service erwartet folderId
4. **Berechtigung:** Nur Projekt-Mitglieder dürfen zugreifen
5. **UI-Navigation:** Breadcrumbs und Ordner-Navigation muss funktionieren

### Implementierungs-Empfehlung für Strategie-Tab

**Vereinfachter Ansatz:**
```typescript
// In ProjectStrategyTab.tsx
const handleTemplateSelect = async (templateType: TemplateType, content?: string) => {
  // DIREKT strategyDocumentService verwenden - KEIN folderId
  const newDoc = await strategyDocumentService.create({
    projectId: projectId,         // ← Eindeutige Zuordnung
    organizationId: organizationId,
    title: `${STRATEGY_TEMPLATES[templateType].title} - ${new Date().toLocaleDateString()}`,
    type: 'strategy',
    content: content || '',
    status: 'draft',
    templateId: templateType,
    templateName: STRATEGY_TEMPLATES[templateType].title
  });

  // Modal öffnen für Bearbeitung
  setSelectedDocument(newDoc);
  setShowEditor(true);
};
```

**DocumentEditorModal Anpassung für Strategie:**
```typescript
// Neue Prop: useStrategyService
interface DocumentEditorModalProps {
  // ... existing props
  useStrategyService?: boolean;
  strategyDocumentType?: 'strategy' | 'briefing' | 'analysis';
}

// Im Modal:
if (useStrategyService) {
  await strategyDocumentService.update(document.id, {
    content: editor?.getHTML(),
    title: title
  });
} else {
  // Bestehende documentContentService Logik
}
```

## Technische Details

### Wiederverwendung DocumentEditorModal
```typescript
const handleTemplateSelect = (templateType: TemplateType, content?: string) => {
  setTemplateContent(content || '');
  setSelectedDocument(null); // Neues Dokument
  setShowEditor(true);
};

const handleDocumentEdit = (document: StrategyDocument) => {
  setSelectedDocument(document);
  setTemplateContent(null);
  setShowEditor(true);
};

// Im Modal:
<DocumentEditorModal
  isOpen={showEditor}
  onClose={() => setShowEditor(false)}
  onSave={loadDocuments}
  document={selectedDocument}
  folderId="strategy" // Fester Ordner für Strategiedokumente
  organizationId={organizationId}
  projectId={projectId}
  initialContent={templateContent} // Neue Prop für Template-Content
/>
```

### Erweiterte Modal-Props
```typescript
// DocumentEditorModal erweitern:
interface DocumentEditorModalProps {
  // ... bestehende Props
  initialContent?: string; // Für Template-Inhalte
  documentType?: 'strategy' | 'briefing' | 'analysis' | 'notes';
  templateId?: string;
  templateName?: string;
}
```

### Service-Integration
```typescript
// Neue Dokumente mit Template-Info erstellen:
const createDocument = async (title: string, content: string, templateInfo?: {id: string, name: string}) => {
  await strategyDocumentService.create({
    projectId,
    title,
    type: 'strategy', // Basierend auf Template
    content,
    status: 'draft',
    templateId: templateInfo?.id,
    templateName: templateInfo?.name,
    // ... weitere Felder
  }, { organizationId, userId: user.uid });
};
```

## UI/UX Spezifikationen

### Template-Kacheln Design
```css
.template-card {
  @apply bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all;
}

.template-card-icon {
  @apply w-12 h-12 text-primary mb-4;
}

.template-card-title {
  @apply text-lg font-semibold text-gray-900 mb-2;
}

.template-card-description {
  @apply text-sm text-gray-600 leading-relaxed;
}
```

### Responsive Grid
```typescript
const gridClasses = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8";
```

## Dateien-Struktur

```
src/
├── components/
│   └── projects/
│       ├── strategy/
│       │   ├── ProjectStrategyTab.tsx          # Haupt-Tab Komponente
│       │   ├── StrategyTemplateGrid.tsx        # Template-Kacheln
│       │   └── StrategyDocumentsTable.tsx      # Dokumente-Tabelle
│       └── DocumentEditorModal.tsx             # Erweitert um Template-Support
├── constants/
│   └── strategy-templates.ts                   # Template-Inhalte
└── types/
    └── strategy-templates.ts                   # Template-Types
```

## Implementation Steps

### Step 1: Template-Konstanten erstellen
- [ ] `src/constants/strategy-templates.ts` mit allen 6 Vorlagen
- [ ] `src/types/strategy-templates.ts` mit TypeScript-Definitionen

### Step 2: Template-Grid Komponente
- [ ] `StrategyTemplateGrid.tsx` mit 6 Kacheln
- [ ] Icons aus HeroIcons verwenden
- [ ] Responsive Grid-Layout
- [ ] Click-Handler für Template-Auswahl

### Step 3: Dokumente-Tabelle
- [ ] `StrategyDocumentsTable.tsx` basierend auf bestehenden Tabellen
- [ ] CRUD-Aktionen (Bearbeiten, Löschen)
- [ ] Status- und Typ-Badges
- [ ] Loading-States

### Step 4: Haupt-Tab Komponente
- [ ] `ProjectStrategyTab.tsx` mit beiden Sektionen
- [ ] State-Management für Modal und Dokumente
- [ ] Integration mit strategyDocumentService
- [ ] Error-Handling

### Step 5: DocumentEditorModal erweitern
- [ ] `initialContent` Prop hinzufügen
- [ ] Template-Metadaten Support
- [ ] Automatische Titel-Generierung basierend auf Template

### Step 6: Integration in ProjectDetailPage
- [ ] Import und Rendering im strategie-Tab
- [ ] Testing der kompletten Funktionalität

## Testing

### Unit Tests
- [ ] Template-Grid Komponente
- [ ] Dokumente-Tabelle Komponente
- [ ] Template-Konstanten Validierung

### Integration Tests
- [ ] Modal-Integration mit Templates
- [ ] Service-Calls für CRUD-Operationen
- [ ] State-Management zwischen Komponenten

### E2E Tests
- [ ] Template auswählen → Modal öffnet mit Inhalt
- [ ] Dokument speichern → Erscheint in Tabelle
- [ ] Dokument bearbeiten → Modal öffnet mit Inhalt
- [ ] Dokument löschen → Verschwindet aus Tabelle

## Zeitschätzung
- **Step 1-2:** 4 Stunden (Template-System)
- **Step 3:** 3 Stunden (Dokumente-Tabelle)
- **Step 4:** 3 Stunden (Haupt-Komponente)
- **Step 5:** 2 Stunden (Modal-Erweiterung)
- **Step 6:** 1 Stunde (Integration)
- **Testing:** 2 Stunden

**Gesamt:** ~15 Stunden

## Vorteile der Wiederverwendung
1. **DocumentEditorModal:** Vollständig getesteter Rich-Text Editor
2. **StrategyDocumentService:** Bereits implementierte CRUD-Operationen
3. **UI-Komponenten:** Konsistente Design-Sprache
4. **Modal-Pattern:** Bewährtes UX-Pattern aus Daten-Tab
5. **Template-Support:** Bereits in Service eingebaut

## Risiken & Mitigation
1. **Modal-Performance:** Lazy Loading bereits implementiert
2. **Template-Größe:** Markdown-Format hält Größe gering
3. **Service-Kompatibilität:** Bestehender Service bereits Template-ready
4. **UI-Konsistenz:** Verwendung bestehender UI-Komponenten sichert Konsistenz