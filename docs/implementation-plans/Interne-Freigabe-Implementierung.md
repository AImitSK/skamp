# Interne Freigabe Implementierungsplan

## Referenz-Dokumentation
**Basis:** `docs/features/Projekt-Pipeline/Interne-Freigabe-Integration.md`

## Übersicht
Implementierungsplan für die Integration der Interne-Freigabe-Phase in das **bestehende PDF-Versionierung-System**. Erweitert PRCampaign um interne PDF-Verwaltung und Chat-Integration **OHNE neue Review-Services zu erfinden**.

---

## 🤖 AGENTEN-WORKFLOW

### SCHRITT 1: IMPLEMENTATION
- **Agent:** `general-purpose` 
- **Aufgabe:** BESTEHENDE PDF-System um interne Freigabe-Features erweitern
- **Dauer:** 4-5 Tage

### SCHRITT 2: DOKUMENTATION  
- **Agent:** `documentation-orchestrator`
- **Aufgabe:** Feature-Status aktualisieren, Masterplan synchronisieren
- **Dauer:** 0.5 Tage

### SCHRITT 3: TYPESCRIPT VALIDATION
- **Agent:** `general-purpose`
- **Aufgabe:** `npm run typecheck` + alle Fehler beheben
- **Erfolgskriterium:** ZERO TypeScript-Errors

### SCHRITT 4: TEST-COVERAGE
- **Agent:** `test-writer` 
- **Aufgabe:** Tests bis 100% Coverage implementieren
- **Erfolgskriterium:** `npm test` → ALL PASS

### SCHRITT 5: PLAN-ABSCHLUSS
- **Agent:** `documentation-orchestrator`
- **Aufgabe:** Plan als "✅ COMPLETED" markieren

---

## IMPLEMENTIERUNG DETAILS

### 1.1 PRCampaign Entity erweitern (BESTEHENDE Entity)
**Datei:** `src/types/campaigns.ts` (BESTEHENDE Datei erweitern)
**Agent:** `general-purpose`
**Dauer:** 0.5 Tage

**Umsetzung:** EXAKT aus Feature-Dokumentation (Zeile 18-39)
```typescript
// BESTEHENDE PRCampaign Interface erweitern - NICHT neu erstellen!
interface PRCampaign {
  // ... ALLE bestehenden Felder beibehalten
  id?: string;
  userId: string;
  organizationId?: string;
  title: string;
  contentHtml: string;
  status: PRCampaignStatus;
  // ... alle weiteren bestehenden Felder

  // ✅ DIESE FELDER aus Feature-Doku hinzufügen (Zeile 23-35):
  
  // NEU: Projekt-Zuordnung
  projectId?: string;           // Verknüpfung zum Projekt
  projectTitle?: string;        // Denormalisiert für Performance
  projectStage?: PipelineStage; // Aktueller Pipeline-Status
  
  // NEU: Interne PDF-Verwaltung
  internalPDFs?: {
    enabled: boolean;           // Soll interne PDF-Generierung aktiviert sein?
    autoGenerate: boolean;      // Bei Speicherung automatisch PDF erstellen?
    storageFolder: string;      // Pfad im Projekt-Ordner
    lastGenerated?: Timestamp;  // Letzte PDF-Generierung
    versionCount: number;       // Anzahl generierte Versionen
  };
}
```

### 1.2 Projekt-Selector Komponente (BESTEHENDE Pages erweitern)
**Dateien:** 
- `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx` (erweitern)
- `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx` (erweitern)
**Agent:** `general-purpose`
**Dauer:** 1.5 Tage

**Umsetzung:** EXAKT aus Feature-Dokumentation (Zeile 42-120)
```typescript
// EXAKT aus Feature-Doku: ProjectSelector Komponente
const ProjectSelector = ({
  selectedProjectId,
  onProjectSelect,
  organizationId,
  clientId
}: {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string, projectTitle: string) => void;
  organizationId: string;
  clientId?: string;
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [clientId]);

  const loadProjects = async () => {
    let projectsData;
    if (clientId) {
      // Nur Projekte für diesen Kunden - BESTEHENDE projectService verwenden!
      projectsData = await projectService.getProjectsByClient(organizationId, clientId);
    } else {
      // Alle aktiven Projekte - BESTEHENDE projectService verwenden!
      projectsData = await projectService.getActiveProjects(organizationId);
    }
    setProjects(projectsData);
  };

  return (
    <div className="project-selector">
      <label className="block text-sm font-medium mb-2">
        Projekt-Zuordnung (Optional)
      </label>
      
      <select
        value={selectedProjectId || ''}
        onChange={(e) => {
          if (e.target.value) {
            const project = projects.find(p => p.id === e.target.value);
            if (project) {
              onProjectSelect(e.target.value, project.title);
            }
          }
        }}
        className="w-full border rounded-lg px-3 py-2"
      >
        <option value="">Kein Projekt zugeordnet</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.title} - {project.clientName}
          </option>
        ))}
      </select>
      
      {/* Info-Box bei Projekt-Auswahl */}
      {selectedProjectId && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Interne PDFs aktiviert:</strong> Bei Speicherung werden automatisch 
            interne PDF-Versionen im Projekt-Ordner generiert.
          </p>
        </div>
      )}
    </div>
  );
};
```

### 1.3 BESTEHENDE PDF-Service erweitern (NICHT neue Services erfinden)
**Datei:** BESTEHENDE PDF-Service-Datei erweitern (wo auch immer sie ist)
**Agent:** `general-purpose`
**Dauer:** 2 Tage

**Umsetzung:** Basierend auf Feature-Dokumentation erweitern
```typescript
// BESTEHENDE pdfService/pdfVersionsService erweitern - NICHT neu erstellen!
export const pdfVersionsService = {
  // ... ALLE bestehenden Methoden beibehalten
  
  // ✅ NUR DIESE Methoden HINZUFÜGEN für interne PDFs:
  
  async generateInternalPDF(
    campaignId: string,
    campaignData: PRCampaign,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    // BESTEHENDE PDF-Generierung verwenden, nur Pfad anpassen
    const pdfUrl = await this.generatePDF(campaignId, campaignData, {
      ...context,
      type: 'internal', // Marker für interne Version
      folder: campaignData.internalPDFs?.storageFolder || `projects/${campaignData.projectId}/internal-pdfs`
    });
    
    // Campaign aktualisieren mit interner PDF-Info
    if (campaignData.projectId) {
      await this.updateInternalPDFStatus(campaignId, context);
    }
    
    return pdfUrl;
  },
  
  async updateInternalPDFStatus(
    campaignId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    // BESTEHENDE Campaign-Update-Logik verwenden
    const campaignRef = doc(db, 'campaigns', campaignId);
    
    await updateDoc(campaignRef, {
      'internalPDFs.lastGenerated': Timestamp.now(),
      'internalPDFs.versionCount': increment(1),
      updatedAt: Timestamp.now()
    });
  },
  
  // Auto-Generate Logic für Projekt-verknüpfte Kampagnen
  async handleCampaignSave(
    campaignId: string, 
    campaignData: PRCampaign,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    // Nur wenn Projekt verknüpft und auto-generate aktiviert
    if (campaignData.projectId && 
        campaignData.internalPDFs?.enabled && 
        campaignData.internalPDFs?.autoGenerate) {
      
      // BESTEHENDE PDF-Generierung nutzen
      await this.generateInternalPDF(campaignId, campaignData, context);
    }
  }
};
```

### 1.4 Campaign-Pages um interne PDF-Features erweitern
**Dateien:** BESTEHENDE Campaign-Pages erweitern
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Umsetzung:**
```typescript
// BESTEHENDE NewPRCampaignPage erweitern um ProjectSelector
export default function NewPRCampaignPage() {
  // ... ALLE bestehenden State-Variablen beibehalten
  
  // ✅ NUR DIESE State-Variablen HINZUFÜGEN:
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string>('');

  // BESTEHENDE handleSubmit erweitern:
  const handleSubmit = async (data: PRCampaignFormData) => {
    const campaignData: Omit<PRCampaign, 'id'> = {
      // ... ALLE bestehenden Felder beibehalten
      
      // ✅ NUR DIESE FELDER HINZUFÜGEN:
      projectId: selectedProjectId || undefined,
      projectTitle: selectedProjectTitle || undefined,
      projectStage: selectedProjectId ? 'internal_approval' : undefined,
      
      // Interne PDF-Config wenn Projekt verknüpft
      internalPDFs: selectedProjectId ? {
        enabled: true,
        autoGenerate: true,
        storageFolder: `projects/${selectedProjectId}/internal-pdfs`,
        versionCount: 0
      } : undefined
    };

    try {
      // BESTEHENDE prService verwenden
      const campaign = await prService.create(campaignData);
      
      router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  return (
    <div>
      {/* ... ALLE bestehenden Form-Elemente beibehalten */}
      
      {/* ✅ NUR ProjectSelector HINZUFÜGEN: */}
      <ProjectSelector
        selectedProjectId={selectedProjectId}
        onProjectSelect={(projectId, projectTitle) => {
          setSelectedProjectId(projectId);
          setSelectedProjectTitle(projectTitle);
        }}
        organizationId={organizationId}
        clientId={formData.clientId}
      />
    </div>
  );
}

// BESTEHENDE EditPRCampaignPage erweitern um interne PDF-Controls
export default function EditPRCampaignPage({ params }: { params: { campaignId: string } }) {
  // ... ALLE bestehenden Hooks und State beibehalten
  
  // ✅ BESTEHENDE handleSave erweitern:
  const handleSave = async () => {
    try {
      // BESTEHENDE Save-Logik
      await prService.update(campaignId, updatedData, context);
      
      // ✅ NUR DIESE Zeile HINZUFÜGEN: Interne PDF-Generierung
      await pdfVersionsService.handleCampaignSave(campaignId, updatedData, context);
      
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  return (
    <div>
      {/* ... ALLE bestehenden JSX-Elemente beibehalten */}
      
      {/* ✅ NUR interne PDF-Anzeige HINZUFÜGEN wenn Projekt verknüpft: */}
      {campaign.projectId && campaign.internalPDFs?.enabled && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <DocumentIcon className="h-4 w-4 text-green-600" />
            <Text className="text-sm text-green-900">
              Interne PDFs: {campaign.internalPDFs.versionCount} Versionen generiert
            </Text>
            {campaign.internalPDFs.lastGenerated && (
              <Text className="text-xs text-green-700">
                Zuletzt: {new Date(campaign.internalPDFs.lastGenerated.toDate()).toLocaleString('de-DE')}
              </Text>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 1.5 BESTEHENDE projectService erweitern (NICHT neu erfinden)
**Datei:** BESTEHENDE projectService-Datei erweitern
**Agent:** `general-purpose`
**Dauer:** 0.5 Tage

**Umsetzung:**
```typescript
// BESTEHENDE projectService erweitern - NICHT neu erstellen!
export const projectService = {
  // ... ALLE bestehenden Methoden beibehalten
  
  // ✅ NUR DIESE Methoden aus Feature-Doku HINZUFÜGEN:
  
  async getProjectsByClient(
    organizationId: string, 
    clientId: string
  ): Promise<Project[]> {
    const q = query(
      collection(db, 'projects'),
      where('organizationId', '==', organizationId),
      where('customer.id', '==', clientId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Project));
        unsubscribe();
        resolve(projects);
      });
    });
  },
  
  async getActiveProjects(organizationId: string): Promise<Project[]> {
    const q = query(
      collection(db, 'projects'),
      where('organizationId', '==', organizationId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Project));
        unsubscribe();
        resolve(projects);
      });
    });
  }
};
```

---

## TESTING STRATEGIE

### Unit Tests
```typescript
// src/__tests__/features/internal-approval-integration.test.ts
describe('Internal Approval Integration', () => {
  it('should extend PRCampaign with internal PDF fields', () => {
    const campaign: PRCampaign = {
      id: 'campaign_123',
      title: 'Test Campaign',
      // ... alle bestehenden Felder
      
      // Neue interne PDF-Felder:
      projectId: 'project_123',
      projectTitle: 'Test Project',
      projectStage: 'internal_approval',
      internalPDFs: {
        enabled: true,
        autoGenerate: true,
        storageFolder: 'projects/project_123/internal-pdfs',
        versionCount: 0
      }
    };
    
    expect(campaign.internalPDFs?.enabled).toBe(true);
    expect(campaign.projectStage).toBe('internal_approval');
  });

  it('should generate internal PDF using EXISTING PDF service', async () => {
    const campaignData = mockCampaign({ 
      projectId: 'project_123',
      internalPDFs: { enabled: true, autoGenerate: true }
    });
    
    const pdfUrl = await pdfVersionsService.generateInternalPDF(
      'campaign_123', 
      campaignData,
      { organizationId: 'org_123', userId: 'user_123' }
    );
    
    expect(pdfUrl).toContain('projects/project_123/internal-pdfs');
    expect(pdfVersionsService.generatePDF).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ type: 'internal' })
    );
  });

  it('should maintain multi-tenancy in project queries', async () => {
    const projects = await projectService.getProjectsByClient('org_123', 'client_123');
    
    expect(projects).toBeDefined();
    projects.forEach(project => {
      expect(project.organizationId).toBe('org_123');
    });
  });
});
```

---

## ERFOLGSKRITERIEN

### Funktionale Anforderungen
- ✅ BESTEHENDE PRCampaign um interne PDF-Felder erweitert
- ✅ BESTEHENDE PDF-Service um interne Generierung erweitert  
- ✅ Projekt-Kampagne Verknüpfung über ProjectSelector
- ✅ Automatische interne PDF-Generierung bei Campaign-Save

### Integration-Requirements
- ✅ BESTEHENDE pdfVersionsService erweitert (nicht neu erstellt)
- ✅ BESTEHENDE Campaign-Pages minimal erweitert
- ✅ BESTEHENDE projectService um Client-Filter erweitert
- ✅ KEINE Breaking Changes an bestehenden PDF-Workflows

### Performance-Targets
- ✅ PDF-Generierung Performance unverändert
- ✅ ProjectSelector lädt in <1 Sekunde
- ✅ Interne PDF-Auto-Generation in <3 Sekunden
- ✅ UI-Erweiterungen ohne Performance-Impact

**Die Interne-Freigabe-Phase erweitert das BESTEHENDE PDF-Versionierung-System minimal um Projekt-Pipeline-Funktionalitäten.**