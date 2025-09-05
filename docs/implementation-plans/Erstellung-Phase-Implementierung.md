# Erstellung-Phase Implementierungsplan

## Referenz-Dokumentation
**Basis:** `docs/features/Projekt-Pipeline/Erstellungsprozess-Dokumentation.md`

## Übersicht
Implementierungsplan für die Integration der Erstellung-Phase in das **bestehende Kampagnen-System**. Erweitert die vorhandenen Campaign-Editors um Projekt-Verknüpfung und Pipeline-Funktionalitäten **OHNE neue Services zu erfinden**.

---

## 🤖 AGENTEN-WORKFLOW

### SCHRITT 1: IMPLEMENTATION
- **Agent:** `general-purpose` 
- **Aufgabe:** BESTEHENDE Campaign-Pages um Projekt-Integration erweitern
- **Dauer:** 3-4 Tage

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

**Umsetzung:**
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
  templateId?: string;
  templateName?: string;
  keyVisual?: KeyVisualData;
  content?: {
    editorContent?: string;
    boilerplateSections?: CampaignBoilerplateSection[];
    structuredElements?: any[];
  };
  attachedAssets?: CampaignAssetAttachment[];
  clientId?: string;
  clientName?: string;
  distributionListIds?: string[];
  distributionListNames?: string[];
  manualRecipients?: ManualRecipient[];
  approvalData?: SimplifiedApprovalData;
  editLock?: EditLockData;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;

  // ✅ NUR DIESE FELDER HINZUFÜGEN für Projekt-Pipeline:
  projectId?: string;           // Verknüpfung zum Projekt  
  projectTitle?: string;        // Denormalisiert für Performance
  pipelineStage?: PipelineStage; // Aktueller Pipeline-Status
  
  // Fehlende Features aus Doku (Zeile 528-539):
  taskDependencies?: string[];  // Abhängigkeiten zu anderen Tasks
  timeTracking?: {              // Zeiterfassung pro Phase
    startedAt?: Timestamp;
    totalMinutes?: number;
    sessions?: TimeSession[];
  };
  budgetTracking?: {            // Budget-Verwendung  
    allocated?: number;
    spent?: number;
    currency?: string;
  };
  milestones?: ProjectMilestone[]; // Meilenstein-Tracking
  deliverables?: CampaignDeliverable[]; // Liefergegenstände
}

// Zusätzliche Types für neue Felder
interface TimeSession {
  startedAt: Timestamp;
  endedAt: Timestamp;
  userId: string;
  activity: string;
}

interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: Timestamp;
  completed: boolean;
  completedAt?: Timestamp;
}

interface CampaignDeliverable {
  id: string;
  type: 'press_release' | 'media_kit' | 'asset_pack' | 'distribution_report';
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  url?: string;
  createdAt: Timestamp;
}
```

### 1.2 Campaign-Erstellung erweitern (BESTEHENDE Page)
**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx` (BESTEHENDE Datei erweitern)
**Agent:** `general-purpose`
**Dauer:** 2 Tage

**Umsetzung:**
```typescript
// BESTEHENDE NewPRCampaignPage Komponente erweitern - NICHT neu schreiben!

// ✅ NUR DIESE KOMPONENTE HINZUFÜGEN:
const ProjectSelector = ({ 
  selectedProjectId, 
  onProjectSelect, 
  organizationId 
}: {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string, projectData: Project) => void;
  organizationId: string;
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveProjects();
  }, [organizationId]);

  const loadActiveProjects = async () => {
    try {
      // BESTEHENDE projectService verwenden
      const activeProjects = await projectService.getAll({ 
        organizationId,
        filters: { 
          currentStage: 'creation' // Nur Projekte in Erstellung-Phase
        }
      });
      setProjects(activeProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Text className="font-medium">Projekt-Verknüpfung (optional)</Text>
      <Select
        value={selectedProjectId || ''}
        onChange={(value) => {
          if (value) {
            const project = projects.find(p => p.id === value);
            if (project) {
              onProjectSelect(value, project);
            }
          }
        }}
      >
        <Select.Option value="">Kein Projekt zuordnen</Select.Option>
        {projects.map(project => (
          <Select.Option key={project.id} value={project.id}>
            {project.title} ({project.customer?.name})
          </Select.Option>
        ))}
      </Select>
      
      {selectedProjectId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Text className="text-sm text-blue-700">
            Diese Kampagne wird dem ausgewählten Projekt zugeordnet und automatisch 
            in der Pipeline-Phase "Erstellung" verwaltet.
          </Text>
        </div>
      )}
    </div>
  );
};

// ✅ BESTEHENDE NewPRCampaignPage erweitern:
export default function NewPRCampaignPage() {
  // ... ALLE bestehenden State-Variablen beibehalten
  
  // ✅ NUR DIESE State-Variablen HINZUFÜGEN:
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // ✅ BESTEHENDE handleSubmit Funktion erweitern:
  const handleSubmit = async (data: PRCampaignFormData) => {
    const campaignData: Omit<PRCampaign, 'id'> = {
      // ... ALLE bestehenden Felder beibehalten
      title: data.title,
      clientId: data.clientId,
      clientName: data.clientName,
      organizationId,
      userId: user.uid,
      status: 'draft',
      contentHtml: '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      
      // ✅ NUR DIESE FELDER HINZUFÜGEN:
      projectId: selectedProjectId || undefined,
      projectTitle: selectedProject?.title || undefined,
      pipelineStage: selectedProject ? 'creation' : undefined,
      
      // Auto-populated aus Projekt wenn vorhanden:
      ...(selectedProject && {
        // Projekt-Daten in Kampagne übernehmen
        budgetTracking: {
          allocated: selectedProject.budget,
          spent: 0,
          currency: 'EUR'
        },
        milestones: selectedProject.milestones?.map(m => ({
          id: m.id,
          title: m.title,
          dueDate: m.dueDate,
          completed: false
        })) || []
      })
    };

    try {
      // BESTEHENDE prService verwenden - NICHT neu erfinden!
      const campaign = await prService.create(campaignData);
      
      // Optional: Projekt-Status aktualisieren
      if (selectedProjectId && selectedProject) {
        await projectService.addLinkedCampaign(
          selectedProjectId,
          campaign.id!,
          { organizationId, userId: user.uid }
        );
      }
      
      router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  return (
    <div>
      {/* ... ALLE bestehenden JSX-Elemente beibehalten */}
      
      {/* ✅ NUR DIESE Sektion HINZUFÜGEN in bestehenden Form: */}
      <div className="space-y-6">
        <ProjectSelector
          selectedProjectId={selectedProjectId}
          onProjectSelect={(projectId, project) => {
            setSelectedProjectId(projectId);
            setSelectedProject(project);
            
            // Auto-populate Kampagnen-Felder mit Projekt-Daten
            if (project.customer) {
              setFormData(prev => ({
                ...prev,
                clientId: project.customer.id,
                clientName: project.customer.name
              }));
            }
          }}
          organizationId={organizationId}
        />
        
        {/* ... Rest der bestehenden Form */}
      </div>
    </div>
  );
}
```

### 1.3 Campaign-Bearbeitung erweitern (BESTEHENDE Page)
**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx` (BESTEHENDE Datei erweitern)
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Umsetzung:**
```typescript
// BESTEHENDE EditPRCampaignPage Komponente erweitern

// ✅ NUR DIESE Komponente HINZUFÜGEN:
const ProjectLinkBanner = ({ 
  campaign, 
  onProjectUpdate 
}: { 
  campaign: PRCampaign;
  onProjectUpdate: () => void;
}) => {
  if (!campaign.projectId) return null;

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-blue-600" />
          <Text className="text-sm text-blue-900">
            Verknüpft mit Projekt: <strong>{campaign.projectTitle}</strong>
          </Text>
          {campaign.pipelineStage && (
            <Badge color="blue">
              {campaign.pipelineStage === 'creation' ? 'Erstellung' : campaign.pipelineStage}
            </Badge>
          )}
        </div>
        <Button plain size="sm" onClick={() => window.open(`/dashboard/projects/${campaign.projectId}`)}>
          Projekt öffnen
        </Button>
      </div>
    </div>
  );
};

// BESTEHENDE EditPRCampaignPage erweitern - NICHT neu schreiben!
export default function EditPRCampaignPage({ params }: { params: { campaignId: string } }) {
  // ... ALLE bestehenden Hooks und State beibehalten
  
  return (
    <div>
      {/* ✅ NUR DIESE Komponente HINZUFÜGEN: */}
      <ProjectLinkBanner 
        campaign={campaign} 
        onProjectUpdate={() => {
          // Projekt-Status refresh wenn nötig
        }} 
      />
      
      {/* ... ALLE bestehenden JSX-Elemente beibehalten */}
    </div>
  );
}
```

### 1.4 BESTEHENDE Services erweitern (NICHT neue erfinden)
**Dateien:** BESTEHENDE Service-Dateien erweitern
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Umsetzung:**
```typescript
// 1. BESTEHENDE projectService erweitern (nicht neu erstellen!)
// src/lib/firebase/project-service.ts - BESTEHENDE Datei erweitern

export const projectService = {
  // ... ALLE bestehenden Methoden beibehalten
  
  // ✅ NUR DIESE Methode HINZUFÜGEN:
  async addLinkedCampaign(
    projectId: string,
    campaignId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const projectRef = doc(db, 'projects', projectId);
    const project = await this.getById(projectId, context);
    
    const updatedCampaigns = [...(project.linkedCampaigns || []), campaignId];
    
    await updateDoc(projectRef, {
      linkedCampaigns: updatedCampaigns,
      updatedAt: Timestamp.now(),
      updatedBy: context.userId
    });
  },

  // ✅ Bestehende Methoden um Campaign-Support erweitern
  async getLinkedCampaigns(
    projectId: string,
    context: { organizationId: string }
  ): Promise<PRCampaign[]> {
    const project = await this.getById(projectId, context);
    
    if (!project.linkedCampaigns || project.linkedCampaigns.length === 0) {
      return [];
    }
    
    // BESTEHENDE prService verwenden
    const campaigns = await Promise.all(
      project.linkedCampaigns.map(campaignId => 
        prService.getById(campaignId, context)
      )
    );
    
    return campaigns.filter(Boolean);
  }
};

// 2. BESTEHENDE prService erweitern (nicht neu erstellen!)
// Wo auch immer der bestehende prService definiert ist

export const prService = {
  // ... ALLE bestehenden Methoden beibehalten
  
  // ✅ NUR DIESE Methoden HINZUFÜGEN:
  async getByProjectId(
    projectId: string,
    context: { organizationId: string }
  ): Promise<PRCampaign[]> {
    const q = query(
      collection(db, 'campaigns'), // BESTEHENDE Collection verwenden
      where('projectId', '==', projectId),
      where('organizationId', '==', context.organizationId),
      orderBy('createdAt', 'desc')
    );
    
    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const campaigns = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PRCampaign));
        unsubscribe();
        resolve(campaigns);
      });
    });
  }
};
```

---

## TESTING STRATEGIE

### Unit Tests
```typescript
// src/__tests__/features/campaign-project-integration.test.ts
describe('Campaign-Project Integration', () => {
  it('should extend PRCampaign with project fields', () => {
    const campaign: PRCampaign = {
      id: 'campaign_123',
      title: 'Test Campaign',
      // ... alle bestehenden Felder
      
      // Neue Projekt-Felder:
      projectId: 'project_123',
      projectTitle: 'Test Project',
      pipelineStage: 'creation'
    };
    
    expect(campaign.projectId).toBe('project_123');
    expect(campaign.pipelineStage).toBe('creation');
  });

  it('should link campaign to project using EXISTING services', async () => {
    await projectService.addLinkedCampaign(
      'project_123',
      'campaign_123', 
      { organizationId: 'org_123', userId: 'user_123' }
    );
    
    const campaigns = await prService.getByProjectId(
      'project_123',
      { organizationId: 'org_123' }
    );
    
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].projectId).toBe('project_123');
  });

  it('should maintain multi-tenancy in all operations', async () => {
    await expect(
      prService.getByProjectId('project_123', { organizationId: 'wrong_org' })
    ).resolves.toEqual([]); // Sollte leer sein wegen organizationId Filter
  });
});
```

---

## ERFOLGSKRITERIEN

### Funktionale Anforderungen
- ✅ BESTEHENDE Campaign-System erweitert (nicht neu erstellt)
- ✅ Projekt-Kampagne Verknüpfung über bestehende Interfaces
- ✅ Campaign-Erstellung aus Projekt-Kontext heraus möglich
- ✅ ALLE bestehenden Campaign-Features bleiben unverändert

### Integration-Requirements  
- ✅ Nahtlose Navigation zwischen Projekt und Campaign
- ✅ BESTEHENDE prService und projectService erweitert
- ✅ Multi-Tenancy-Sicherheit in allen erweiterten Operationen
- ✅ KEINE Breaking Changes an bestehenden Campaign-Workflows

### Performance-Targets
- ✅ Campaign-Erstellung Performance unverändert
- ✅ Projekt-Campaign-Verknüpfung in <500ms
- ✅ Project-Selector lädt in <1 Sekunde
- ✅ UI-Erweiterungen ohne Performance-Impact

**Die Erstellung-Phase erweitert das BESTEHENDE Kampagnen-System minimal um Projekt-Pipeline-Funktionalitäten.**