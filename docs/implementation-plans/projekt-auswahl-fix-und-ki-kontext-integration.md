# 📋 Implementierungsplan: Projekt-Auswahl Fix & KI-Kontext Integration

**Erstellt:** 10. September 2025  
**Status:** In Planung  
**Priorität:** Hoch (ProjectSelector ist kritisch defekt)

## 🎯 Übersicht

Dieser Plan behandelt zwei zusammenhängende Features:
1. **Reparatur des defekten ProjectSelector Moduls** in Step 1 der Campaign-Erstellung
2. **Integration von Kontext-Dokumenten** in den KI-Assistenten für bessere Pressemitteilungen

## 🔍 Phase 1: Problem-Analyse Projekt-Auswahl

### 1.1 Betroffene Dateien analysieren

**Haupt-Komponenten:**
- `src/components/projects/ProjectSelector.tsx` - Die Projekt-Auswahl Komponente
- `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx` (Zeile 1037-1056) - Integration in New Page
- `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx` - Edit Page (vermutlich ähnlich)

**Services & Types:**
- `src/lib/firebase/project-service.ts` - Projekt CRUD Operationen
- `src/types/project.ts` - Project TypeScript Definitionen
- `src/context/OrganizationContext.tsx` - Organisation State Management

### 1.2 Aktuelle Integration prüfen (New Page)

```typescript
// Zeile 1040-1055 in new/page.tsx
<ProjectSelector
  selectedProjectId={selectedProjectId}
  onProjectSelect={(projectId, project) => {
    setSelectedProjectId(projectId);
    setSelectedProject(project);
    
    // Auto-populate Kampagnen-Felder mit Projekt-Daten
    if (project.customer && project.customer.id) {
      setSelectedCompanyId(project.customer.id);
      setSelectedCompanyName(project.customer.name);
    }
  }}
  organizationId={currentOrganization!.id}
  clientId={selectedCompanyId}
/>
```

### 1.3 Mögliche Fehlerquellen identifizieren

1. **ProjectSelector Props Interface** - Falsche oder fehlende Props
2. **Project Service** - API Calls funktionieren nicht
3. **Organization Context** - currentOrganization ist undefined/null
4. **Firebase Permissions** - Keine Berechtigung zum Lesen der Projekte
5. **Project Type Definitions** - TypeScript Fehler
6. **State Management** - selectedProjectId/setSelectedProjectId State Issues

---

## 🛠️ Phase 2: ProjectSelector Komponente analysieren & reparieren

### 2.1 ProjectSelector.tsx vollständige Analyse

**Zu prüfen:**
```typescript
interface ProjectSelectorProps {
  selectedProjectId: string;
  onProjectSelect: (projectId: string, project: Project | null) => void;
  organizationId: string;
  clientId?: string; // Optional filter
}
```

### 2.2 Project Service Funktionalität prüfen

**Kritische Methoden:**
```typescript
// src/lib/firebase/project-service.ts
class ProjectService {
  // Diese Methoden müssen funktionieren:
  async getAll(organizationId: string, userId: string): Promise<Project[]>
  async getById(projectId: string, organizationId: string): Promise<Project | null>
  async getByClientId(clientId: string, organizationId: string): Promise<Project[]>
}
```

### 2.3 Firebase Collection Struktur

**Collection:** `projects`
**Document Structure:**
```typescript
{
  id: string;
  title: string;
  description?: string;
  organizationId: string; // CRITICAL: Must match currentOrganization.id
  customer: {
    id: string;
    name: string;
  };
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: Timestamp;
  // ... weitere Felder
}
```

### 2.4 Permissions & Security Rules

**Firestore Rules prüfen:**
```javascript
// Projekte müssen lesbar sein für organizationId Match
match /projects/{projectId} {
  allow read: if resource.data.organizationId == request.auth.token.organizationId;
}
```

---

## 🔧 Phase 3: Konkrete Reparatur-Steps

### 3.1 ProjectSelector Debug-Integration

**Schritt 1:** Debug-Logging hinzufügen
```typescript
// In ProjectSelector.tsx
useEffect(() => {
  console.log('ProjectSelector Props:', {
    selectedProjectId,
    organizationId,
    clientId,
    onProjectSelect: !!onProjectSelect
  });
  
  if (organizationId) {
    loadProjects();
  } else {
    console.error('ProjectSelector: organizationId ist undefined');
  }
}, [organizationId, clientId]);

const loadProjects = async () => {
  try {
    console.log('Loading projects for org:', organizationId);
    const projects = await projectService.getAll(organizationId, userId);
    console.log('Loaded projects:', projects);
    setProjects(projects);
  } catch (error) {
    console.error('ProjectSelector loadProjects error:', error);
    setError(error.message);
  }
};
```

### 3.2 Error Handling & Loading States

**Schritt 2:** Robuste Fehlerbehandlung
```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [projects, setProjects] = useState<Project[]>([]);

// Loading State UI
if (loading) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      Projekte werden geladen...
    </div>
  );
}

// Error State UI
if (error) {
  return (
    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
      <p className="text-red-600">Fehler beim Laden der Projekte: {error}</p>
      <button onClick={loadProjects}>Erneut versuchen</button>
    </div>
  );
}
```

### 3.3 Integration Testing

**Schritt 3:** New Page Integration testen
```typescript
// In new/page.tsx - Enhanced Debugging
useEffect(() => {
  console.log('New Page - Organization Context:', {
    currentOrganization,
    user,
    selectedProjectId,
    selectedProject
  });
}, [currentOrganization, user, selectedProjectId, selectedProject]);

const handleProjectSelect = (projectId: string, project: Project | null) => {
  console.log('Project selected:', { projectId, project });
  
  setSelectedProjectId(projectId);
  setSelectedProject(project);
  
  // Auto-populate nur wenn project exists und customer hat
  if (project?.customer?.id) {
    console.log('Auto-populating customer:', project.customer);
    setSelectedCompanyId(project.customer.id);
    setSelectedCompanyName(project.customer.name);
  }
};
```

---

## 🎯 Phase 4: KI-Kontext Integration (nach Projekt-Fix)

### 4.1 StructuredGenerationModal erweitern

**Props Interface erweitern:**
```typescript
// src/components/pr/ai/StructuredGenerationModal.tsx
interface Props {
  onClose: () => void;
  onGenerate: (result: GenerationResult) => void;
  existingContent?: {
    title?: string;
    content?: string;
  };
  // NEU: Kontext-Integration
  projectId?: string;
  organizationId?: string;
}
```

### 4.2 Kontext-Dokumente Service

**Neuer Service:** `src/lib/firebase/context-documents-service.ts`
```typescript
export class ContextDocumentsService {
  async getProjectDocuments(
    projectId: string, 
    organizationId: string
  ): Promise<InternalDocument[]> {
    // 1. Lade alle media_assets für Projekt
    // 2. Filtere nur fileType: 'celero-doc'
    // 3. Filtere nur folderId im Projekt-Dokumentenordner
    // 4. Sortiere nach updatedAt DESC
  }
  
  async loadDocumentContent(
    document: InternalDocument
  ): Promise<string> {
    // 1. Lade via documentContentService.loadDocument()
    // 2. Extrahiere plainText aus HTML
    // 3. Return clean text für AI
  }
}
```

### 4.3 ContentInputStep erweitern

**UI Integration:**
```typescript
// In ContentInputStep Komponente
<div className="space-y-6">
  {/* Bestehende Template Dropdown */}
  <TemplateDropdown
    templates={templates}
    onSelect={onTemplateSelect}
    loading={loadingTemplates}
    selectedTemplate={selectedTemplate}
  />

  {/* NEU: Kontext-Dokumente Picker */}
  {projectId && (
    <ContextDocumentsPicker
      projectId={projectId}
      organizationId={organizationId}
      selectedDocuments={selectedContextDocs}
      onDocumentsChange={setSelectedContextDocs}
    />
  )}

  {/* Bestehende Prompt Textarea */}
  <Field>
    <Label>Beschreibe deine Pressemitteilung *</Label>
    <Textarea value={prompt} onChange={onChange} />
  </Field>
</div>
```

### 4.4 ContextDocumentsPicker Komponente

**Neue Komponente:** `src/components/pr/ai/ContextDocumentsPicker.tsx`
```typescript
interface ContextDocumentsPickerProps {
  projectId: string;
  organizationId: string;
  selectedDocuments: InternalDocument[];
  onDocumentsChange: (docs: InternalDocument[]) => void;
}

export default function ContextDocumentsPicker({
  projectId,
  organizationId, 
  selectedDocuments,
  onDocumentsChange
}: ContextDocumentsPickerProps) {
  const [availableDocs, setAvailableDocs] = useState<InternalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI ähnlich wie Template Dropdown:
  // - Dropdown mit verfügbaren Celero-Dokumenten
  // - Multi-Select mit Checkboxes
  // - Preview vom Document-Content
  // - Zeige nur Dokumente aus Projekt-Ordner
}
```

### 4.5 AI-Prompt Enhancement

**AI-Service erweitern:**
```typescript
// In /api/ai/generate-structured
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { prompt, context, contextDocuments } = req.body;
  
  // Neue Logik:
  let enhancedPrompt = prompt;
  
  if (contextDocuments && contextDocuments.length > 0) {
    const contextContent = contextDocuments
      .map((doc: any) => `=== ${doc.fileName} ===\n${doc.content}`)
      .join('\n\n');
    
    enhancedPrompt = `
KONTEXT-MATERIALIEN:
${contextContent}

AUFGABE:
Basierend auf den obigen Kontext-Materialien, erstelle eine Pressemitteilung zu: ${prompt}

Berücksichtige die Informationen aus den Kontext-Dokumenten für:
- Unternehmensdaten und Hintergrund
- Strategische Ausrichtung  
- Bereits kommunizierte Botschaften
- Konsistente Terminologie und Messaging
`;
  }
  
  // Rest der AI Generation...
}
```

---

## 📁 Phase 5: File-Integration Schema

### 5.1 Projekt-Ordner Struktur

**Media Assets Collection Filter:**
```typescript
// Nur Dokumente aus diesen Ordner-Pfaden:
const projectDocumentPaths = [
  `projects/${projectId}/documents`,
  `projects/${projectId}/documents/*`, // Unterordner
  `projects/${projectId}/strategy`,
  `projects/${projectId}/briefings`
];

// Firebase Query:
const query = query(
  collection(db, 'media_assets'),
  where('organizationId', '==', organizationId),
  where('projectId', '==', projectId), // Falls verfügbar
  where('fileType', '==', 'celero-doc'),
  where('folderId', 'in', projectDocumentFolderIds),
  orderBy('updatedAt', 'desc')
);
```

### 5.2 Document Content Loading

**Bulk-Loading für Performance:**
```typescript
async loadContextDocumentsContent(
  documents: InternalDocument[]
): Promise<ContextDocument[]> {
  const contentPromises = documents.map(async (doc) => {
    try {
      const content = await documentContentService.loadDocument(doc.contentRef);
      return {
        document: doc,
        content: content?.content || '',
        plainText: this.htmlToPlainText(content?.content || ''),
        wordCount: content?.content?.split(' ').length || 0
      };
    } catch (error) {
      console.warn(`Failed to load content for ${doc.fileName}:`, error);
      return null;
    }
  });
  
  const results = await Promise.all(contentPromises);
  return results.filter(Boolean) as ContextDocument[];
}
```

---

## 🎯 Phase 6: Implementation Priority

### Reihenfolge der Umsetzung:

1. **🚨 KRITISCH: ProjectSelector reparieren**
   - Debug-Logging hinzufügen
   - Error Handling verbessern  
   - Loading States implementieren
   - Integration in New/Edit Pages testen

2. **📋 Basis-Services aufbauen**
   - ContextDocumentsService erstellen
   - Document Loading Logic implementieren
   - HTML-zu-Text Konverter

3. **🎨 UI-Komponenten entwickeln**
   - ContextDocumentsPicker Komponente
   - Integration in StructuredGenerationModal
   - Props-Erweiterungen

4. **🤖 AI-Integration erweitern**
   - API Route anpassen für Kontext-Dokumente
   - Prompt-Enhancement Logik
   - Testing der AI-Generierung

5. **✅ Testing & Optimierung**
   - End-to-End Workflow testen
   - Performance Optimierungen
   - Error Handling verfeinern

---

## 📋 Betroffene Dateien Checkliste

### Zu modifizieren:
- [ ] `src/components/projects/ProjectSelector.tsx`
- [ ] `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx`
- [ ] `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`
- [ ] `src/components/pr/ai/StructuredGenerationModal.tsx`
- [ ] `src/pages/api/ai/generate-structured.ts`

### Neu zu erstellen:
- [ ] `src/lib/firebase/context-documents-service.ts`
- [ ] `src/components/pr/ai/ContextDocumentsPicker.tsx`
- [ ] `src/types/context-documents.ts`

### Zu prüfen:
- [ ] `src/lib/firebase/project-service.ts`
- [ ] `src/types/project.ts`
- [ ] `src/context/OrganizationContext.tsx`

---

## ⚠️ Kritische Anforderungen

### ProjectSelector Fix:
1. **MUSS funktionieren** - Ohne Projekt-Auswahl ist Kontext-Feature unmöglich
2. **Robuste Error-Behandlung** - Clear error messages für debugging
3. **Loading States** - User Feedback während API Calls
4. **Multi-tenancy sicher** - organizationId filtering muss korrekt sein

### KI-Kontext Integration:
1. **Nur Celero-Dokumente** - Andere Formate werden ignoriert
2. **Projekt-basierte Filterung** - Nur Dokumente aus gewähltem Projekt
3. **Performance optimiert** - Bulk-loading von Document Content
4. **Fallback-fähig** - Funktioniert auch ohne Kontext-Dokumente

---

## 🎯 Erfolgskriterien

### Phase 1-3 (ProjectSelector Fix):
- [ ] ProjectSelector lädt Projekte korrekt
- [ ] Auto-populate von Customer funktioniert
- [ ] Error States werden korrekt angezeigt
- [ ] Debug-Logging ist implementiert

### Phase 4-5 (KI-Kontext):
- [ ] Kontext-Dokumente werden korrekt geladen
- [ ] AI verwendet Kontext für bessere Pressemitteilungen
- [ ] UI ist intuitiv und responsive
- [ ] Performance ist akzeptabel (< 3s für Document Loading)

### Gesamt:
- [ ] End-to-End Workflow: Projekt auswählen → Kontext-Docs auswählen → AI generiert mit Kontext
- [ ] Alle TypeScript Errors behoben
- [ ] Produktions-ready Code Quality