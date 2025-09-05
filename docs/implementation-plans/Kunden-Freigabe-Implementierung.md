# Kunden-Freigabe Implementierungsplan

## Referenz-Dokumentation
**Basis:** `docs/features/Projekt-Pipeline/Freigabeprozess-Dokumentation.md`

## Übersicht
Implementierungsplan für die Integration der Kunden-Freigabe-Phase in das **bestehende ApprovalEnhanced-System**. Erweitert das vorhandene Approval-System um Projekt-Pipeline-Integration **OHNE neue Approval-Services zu erfinden**.

---

## 🤖 AGENTEN-WORKFLOW

### SCHRITT 1: IMPLEMENTATION
- **Agent:** `general-purpose` 
- **Aufgabe:** BESTEHENDE ApprovalEnhanced-System um Projekt-Integration erweitern
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

### 1.1 ApprovalEnhanced Entity erweitern (BESTEHENDE Entity)
**Datei:** `src/types/approvals.ts` (BESTEHENDE Datei erweitern)
**Agent:** `general-purpose`
**Dauer:** 0.5 Tage

**Umsetzung:** EXAKT aus Feature-Dokumentation erweitern
```typescript
// BESTEHENDE ApprovalEnhanced Interface erweitern - NICHT neu erstellen!
interface ApprovalEnhanced {
  // ... ALLE bestehenden Felder beibehalten
  id?: string;
  title: string;
  description?: string;
  campaignId: string;
  campaignTitle?: string;
  
  // Kunden-Informationen (bestehend)
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  
  // Recipients-System (bestehend)
  recipients: ApprovalRecipient[];
  
  // Content-Management (bestehend)
  content: {
    html: string;
    plainText: string;
    subject: string;
  };
  attachedAssets?: ApprovalAsset[];
  
  // Status-System (bestehend)
  status: ApprovalStatus;
  workflow: ApprovalWorkflow;
  
  // Freigabe-Optionen (bestehend)
  requireAllApprovals: boolean;
  allowPartialApproval: boolean;
  autoSendAfterApproval: boolean;
  expiresAt?: Timestamp;
  reminderSchedule?: ReminderSchedule;
  allowComments: boolean;
  allowInlineComments: boolean;
  
  // Öffentlicher Zugriff (bestehend)
  shareId: string;
  shareSettings?: ShareSettings;
  
  // ✅ NUR DIESE FELDER für Projekt-Pipeline HINZUFÜGEN:
  projectId?: string;           // Verknüpfung zum Projekt
  projectTitle?: string;        // Denormalisiert für Performance
  pipelineStage?: PipelineStage; // Aktueller Pipeline-Status
  
  // Pipeline-spezifische Approval-Features
  pipelineApproval?: {
    isRequired: boolean;        // Ist Freigabe für Pipeline-Fortschritt erforderlich?
    blocksStageTransition: boolean; // Verhindert Weitergang zu nächster Phase?
    autoTransitionOnApproval: boolean; // Auto-Übergang zu Distribution?
    stageRequirements?: string[]; // Anforderungen vor dieser Phase
    completionActions?: PipelineCompletionAction[]; // Aktionen nach Freigabe
  };
  
  // ... alle anderen bestehenden Felder
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Zusätzliche Types für Pipeline-Integration
interface PipelineCompletionAction {
  type: 'transition_stage' | 'create_task' | 'send_notification' | 'update_project';
  target: string;
  data: Record<string, any>;
}
```

### 1.2 BESTEHENDE Campaign-Pages um Approval-Integration erweitern
**Dateien:** BESTEHENDE Campaign-Edit-Page erweitern
**Agent:** `general-purpose`
**Dauer:** 2 Tage

**Umsetzung:** Campaign-Editor um Pipeline-Approval-Features erweitern
```typescript
// BESTEHENDE EditPRCampaignPage um Pipeline-Approval erweitern
export default function EditPRCampaignPage({ params }: { params: { campaignId: string } }) {
  // ... ALLE bestehenden Hooks und State beibehalten
  
  // ✅ NUR DIESE State-Variablen HINZUFÜGEN:
  const [projectApproval, setProjectApproval] = useState<ApprovalEnhanced | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);

  // ✅ BESTEHENDE useEffect erweitern:
  useEffect(() => {
    if (campaign?.projectId) {
      loadProjectApproval();
    }
  }, [campaign?.projectId]);

  const loadProjectApproval = async () => {
    try {
      // BESTEHENDE approvalService verwenden
      const approval = await approvalService.getByProjectId(
        campaign.projectId!,
        { organizationId, userId: user.uid }
      );
      setProjectApproval(approval);
    } catch (error) {
      console.error('Error loading project approval:', error);
    }
  };

  // ✅ NUR DIESE Funktion HINZUFÜGEN:
  const handleCreateProjectApproval = async () => {
    setApprovalLoading(true);
    try {
      const approvalData: Omit<ApprovalEnhanced, 'id'> = {
        // BESTEHENDE ApprovalEnhanced-Struktur verwenden
        title: `Freigabe: ${campaign.title}`,
        description: 'Kunden-Freigabe für Projekt-Pipeline',
        campaignId: campaign.id!,
        campaignTitle: campaign.title,
        clientId: campaign.clientId!,
        clientName: campaign.clientName!,
        clientEmail: campaign.clientEmail || '',
        
        // BESTEHENDE Content-Struktur
        content: {
          html: campaign.contentHtml || '',
          plainText: stripHtml(campaign.contentHtml || ''),
          subject: `Freigabe erforderlich: ${campaign.title}`
        },
        attachedAssets: campaign.attachedAssets?.map(asset => ({
          assetId: asset.assetId,
          type: asset.type,
          metadata: asset.metadata
        })) || [],
        
        // BESTEHENDE Status-System
        status: 'draft' as ApprovalStatus,
        workflow: 'simple' as ApprovalWorkflow,
        requireAllApprovals: true,
        allowPartialApproval: false,
        autoSendAfterApproval: false,
        allowComments: true,
        allowInlineComments: true,
        
        // BESTEHENDE Recipients aus Campaign
        recipients: [], // Wird durch UI gefüllt
        shareId: generateShareId(),
        
        // ✅ NUR DIESE Pipeline-Felder HINZUFÜGEN:
        projectId: campaign.projectId!,
        projectTitle: campaign.projectTitle!,
        pipelineStage: 'customer_approval' as PipelineStage,
        
        pipelineApproval: {
          isRequired: true,
          blocksStageTransition: true,
          autoTransitionOnApproval: true,
          stageRequirements: ['internal_approval_completed'],
          completionActions: [{
            type: 'transition_stage',
            target: 'distribution',
            data: { reason: 'customer_approved' }
          }]
        },
        
        organizationId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // BESTEHENDE approvalService verwenden
      const approval = await approvalService.create(approvalData);
      setProjectApproval(approval);
      
    } catch (error) {
      console.error('Error creating project approval:', error);
    } finally {
      setApprovalLoading(false);
    }
  };

  return (
    <div>
      {/* ... ALLE bestehenden JSX-Elemente beibehalten */}
      
      {/* ✅ NUR Pipeline-Approval-Section HINZUFÜGEN wenn Projekt verknüpft: */}
      {campaign.projectId && campaign.pipelineStage === 'customer_approval' && (
        <div className="mb-6 border border-orange-200 rounded-lg bg-orange-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircleIcon className="h-5 w-5 text-orange-600" />
              <Text className="font-semibold text-orange-900">
                Kunden-Freigabe erforderlich
              </Text>
              {projectApproval && (
                <Badge color="orange">
                  {projectApproval.status === 'approved' ? 'Freigegeben' :
                   projectApproval.status === 'rejected' ? 'Abgelehnt' :
                   projectApproval.status === 'pending' ? 'Ausstehend' : 'Entwurf'}
                </Badge>
              )}
            </div>
            
            {!projectApproval ? (
              <div className="space-y-3">
                <Text className="text-sm text-orange-700">
                  Diese Kampagne ist Teil eines Projekts und benötigt eine Kunden-Freigabe 
                  bevor sie zur Distribution weitergeleitet werden kann.
                </Text>
                <Button onClick={handleCreateProjectApproval} loading={approvalLoading}>
                  Freigabe erstellen
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-sm text-orange-700">
                      Status: <strong>{getApprovalStatusText(projectApproval.status)}</strong>
                    </Text>
                    {projectApproval.recipients.length > 0 && (
                      <Text className="text-xs text-orange-600">
                        {projectApproval.recipients.filter(r => r.status === 'approved').length}/
                        {projectApproval.recipients.length} Empfänger haben freigegeben
                      </Text>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      plain 
                      onClick={() => window.open(`/dashboard/approvals/${projectApproval.id}`)}
                    >
                      Freigabe öffnen
                    </Button>
                    {projectApproval.shareId && (
                      <Button 
                        size="sm" 
                        plain 
                        onClick={() => window.open(`/freigabe/${projectApproval.shareId}`)}
                      >
                        Kunden-Link
                      </Button>
                    )}
                  </div>
                </div>
                
                {projectApproval.status === 'approved' && 
                 projectApproval.pipelineApproval?.autoTransitionOnApproval && (
                  <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded">
                    <Text className="text-xs text-green-700">
                      ✓ Freigabe erhalten. Projekt wird automatisch zur Distribution weitergeleitet.
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 1.3 BESTEHENDE approvalService erweitern (NICHT neue Services erfinden)
**Datei:** BESTEHENDE approvalService-Datei erweitern
**Agent:** `general-purpose`
**Dauer:** 2 Tage

**Umsetzung:**
```typescript
// BESTEHENDE approvalService erweitern - NICHT neu erstellen!
export const approvalService = {
  // ... ALLE bestehenden Methoden beibehalten
  
  // ✅ NUR DIESE Methoden für Pipeline-Integration HINZUFÜGEN:
  
  async getByProjectId(
    projectId: string,
    context: { organizationId: string; userId?: string }
  ): Promise<ApprovalEnhanced | null> {
    const q = query(
      collection(db, 'approvals'), // BESTEHENDE Collection verwenden
      where('projectId', '==', projectId),
      where('organizationId', '==', context.organizationId),
      where('pipelineStage', '==', 'customer_approval'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          resolve(null);
        } else {
          const doc = snapshot.docs[0];
          const approval = { id: doc.id, ...doc.data() } as ApprovalEnhanced;
          resolve(approval);
        }
        unsubscribe();
      });
    });
  },

  // Pipeline-Completion-Handler für approved Freigaben
  async handlePipelineApprovalCompletion(
    approvalId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const approval = await this.getById(approvalId, context);
    
    if (approval.status !== 'approved' || !approval.pipelineApproval) {
      return;
    }

    // Pipeline-Completion-Actions ausführen
    for (const action of approval.pipelineApproval.completionActions || []) {
      switch (action.type) {
        case 'transition_stage':
          // BESTEHENDE projectService verwenden für Stage-Transition
          await projectService.updateStage(
            approval.projectId!,
            action.target as PipelineStage,
            {
              transitionReason: action.data.reason || 'customer_approved',
              transitionBy: context.userId,
              transitionAt: Timestamp.now(),
              approvalId
            },
            context
          );
          break;
          
        case 'create_task':
          // BESTEHENDE taskService verwenden
          await taskService.create({
            title: action.data.title || 'Folge-Aufgabe nach Freigabe',
            description: action.data.description || '',
            projectId: approval.projectId!,
            pipelineStage: action.target as PipelineStage,
            priority: 'medium',
            status: 'pending',
            organizationId: context.organizationId,
            createdBy: context.userId
          });
          break;
          
        case 'send_notification':
          // BESTEHENDE notificationService verwenden
          await notificationService.create({
            userId: action.target,
            organizationId: context.organizationId,
            type: 'project_approval_completed',
            title: 'Projekt-Freigabe abgeschlossen',
            message: `Projekt "${approval.projectTitle}" wurde vom Kunden freigegeben.`,
            actionUrl: `/dashboard/projects/${approval.projectId}`,
            priority: 'normal'
          });
          break;
      }
    }
  },

  // BESTEHENDE create Methode um Pipeline-Handling erweitern
  async create(approvalData: Omit<ApprovalEnhanced, 'id'>): Promise<ApprovalEnhanced> {
    // BESTEHENDE create-Logik verwenden
    const approval = await super.create(approvalData); // Oder wie auch immer die bestehende Logik ist
    
    // ✅ NUR Pipeline-Integration HINZUFÜGEN:
    if (approvalData.projectId && approvalData.pipelineStage) {
      // Projekt-Status aktualisieren
      await projectService.update(
        approvalData.projectId,
        {
          currentStage: approvalData.pipelineStage,
          stageUpdatedAt: Timestamp.now(),
          stageUpdatedBy: approvalData.createdBy || ''
        },
        { organizationId: approvalData.organizationId, userId: approvalData.createdBy || '' }
      );
    }
    
    return approval;
  }
};
```

### 1.4 BESTEHENDE projectService um Approval-Integration erweitern
**Datei:** BESTEHENDE projectService erweitern
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Umsetzung:**
```typescript
// BESTEHENDE projectService erweitern - NICHT neu erstellen!
export const projectService = {
  // ... ALLE bestehenden Methoden beibehalten
  
  // ✅ NUR DIESE Methode für Approval-Integration HINZUFÜGEN:
  
  async getLinkedApprovals(
    projectId: string,
    context: { organizationId: string }
  ): Promise<ApprovalEnhanced[]> {
    const q = query(
      collection(db, 'approvals'),
      where('projectId', '==', projectId),
      where('organizationId', '==', context.organizationId),
      orderBy('createdAt', 'desc')
    );

    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const approvals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ApprovalEnhanced));
        unsubscribe();
        resolve(approvals);
      });
    });
  },
  
  // Stage-Transition mit Approval-Validation
  async updateStage(
    projectId: string,
    newStage: PipelineStage,
    transitionData: any,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    // BESTEHENDE updateStage-Logik beibehalten
    
    // ✅ NUR Approval-Validation HINZUFÜGEN:
    if (newStage === 'distribution') {
      // Prüfen ob Customer-Approval vorhanden und approved
      const approval = await approvalService.getByProjectId(projectId, context);
      
      if (!approval || approval.status !== 'approved') {
        throw new Error('Kunde-Freigabe erforderlich vor Distribution-Phase');
      }
    }
    
    // BESTEHENDE Update-Logik ausführen
    await super.updateStage(projectId, newStage, transitionData, context);
  }
};
```

---

## TESTING STRATEGIE

### Unit Tests
```typescript
// src/__tests__/features/customer-approval-integration.test.ts
describe('Customer Approval Integration', () => {
  it('should extend ApprovalEnhanced with pipeline fields', () => {
    const approval: ApprovalEnhanced = {
      id: 'approval_123',
      title: 'Test Approval',
      // ... alle bestehenden ApprovalEnhanced Felder
      
      // Pipeline-Integration Felder:
      projectId: 'project_123',
      projectTitle: 'Test Project',
      pipelineStage: 'customer_approval',
      pipelineApproval: {
        isRequired: true,
        blocksStageTransition: true,
        autoTransitionOnApproval: true,
        stageRequirements: ['internal_approval_completed'],
        completionActions: []
      }
    };
    
    expect(approval.pipelineApproval?.isRequired).toBe(true);
    expect(approval.pipelineStage).toBe('customer_approval');
  });

  it('should create project approval using EXISTING approvalService', async () => {
    const approval = await approvalService.create({
      // Bestehende ApprovalEnhanced-Felder
      title: 'Test Approval',
      campaignId: 'campaign_123',
      // ... weitere bestehende Felder
      
      // Neue Pipeline-Felder
      projectId: 'project_123',
      pipelineStage: 'customer_approval',
      pipelineApproval: { isRequired: true }
    });
    
    expect(approval.projectId).toBe('project_123');
    expect(projectService.update).toHaveBeenCalledWith(
      'project_123',
      expect.objectContaining({ currentStage: 'customer_approval' }),
      expect.any(Object)
    );
  });

  it('should prevent stage transition without customer approval', async () => {
    // Mock: Keine Approval vorhanden
    jest.spyOn(approvalService, 'getByProjectId').mockResolvedValue(null);
    
    await expect(
      projectService.updateStage(
        'project_123',
        'distribution',
        {},
        { organizationId: 'org_123', userId: 'user_123' }
      )
    ).rejects.toThrow('Kunde-Freigabe erforderlich vor Distribution-Phase');
  });
});
```

---

## ERFOLGSKRITERIEN

### Funktionale Anforderungen
- ✅ BESTEHENDE ApprovalEnhanced um Pipeline-Felder erweitert
- ✅ BESTEHENDE Campaign-Editor um Approval-Integration erweitert
- ✅ Projekt-Approval-Erstellung über bestehende approvalService
- ✅ Automatische Stage-Transition nach Customer-Approval

### Integration-Requirements
- ✅ BESTEHENDE approvalService erweitert (nicht neu erstellt)
- ✅ BESTEHENDE projectService um Approval-Validation erweitert  
- ✅ BESTEHENDE Approval-UI-Components unverändert nutzbar
- ✅ KEINE Breaking Changes an bestehenden Approval-Workflows

### Performance-Targets
- ✅ Approval-Erstellung Performance unverändert
- ✅ Pipeline-Approval-Abfrage in <500ms
- ✅ Stage-Transition-Validation in <300ms
- ✅ UI-Erweiterungen ohne Performance-Impact

**Die Kunden-Freigabe-Phase erweitert das BESTEHENDE ApprovalEnhanced-System minimal um Projekt-Pipeline-Funktionalitäten.**