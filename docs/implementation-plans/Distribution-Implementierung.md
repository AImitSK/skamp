# Distribution Implementierungsplan

## Referenz-Dokumentation
**Basis:** `docs/features/Projekt-Pipeline/Distributionsprozess-Dokumentation.md`

## Übersicht
Implementierungsplan für die Integration der Distribution-Phase in das **bestehende E-Mail-Versand-System**. Erweitert EmailComposer und Campaign-Verwaltung um Projekt-Pipeline-Integration **OHNE neue E-Mail-Services zu erfinden**.

---

## 🤖 AGENTEN-WORKFLOW

### SCHRITT 1: IMPLEMENTATION
- **Agent:** `general-purpose` 
- **Aufgabe:** BESTEHENDE E-Mail-System um Projekt-Pipeline-Features erweitern
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

**Umsetzung:** EXAKT aus Feature-Dokumentation erweitern
```typescript
// BESTEHENDE PRCampaign Interface erweitern - NICHT neu erstellen!
interface PRCampaign {
  // ... ALLE bestehenden Felder beibehalten
  id: string;
  title: string;
  status: PRCampaignStatus;
  clientId?: string;
  clientName?: string;
  distributionListId?: string;
  distributionListName: string;
  content: {
    html: string;
    plainText?: string;
  };
  attachedAssets?: AssetInfo[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: string;

  // ✅ PIPELINE-FELDER (bereits aus Erstellung-Phase vorhanden):
  projectId?: string;
  projectTitle?: string;
  pipelineStage?: PipelineStage;
  
  // ✅ NUR DIESE DISTRIBUTION-FELDER HINZUFÜGEN:
  distributionConfig?: {
    isScheduled: boolean;           // Geplanter Versand?
    scheduledAt?: Timestamp;        // Versand-Zeitpunkt
    distributionLists: string[];    // Ausgewählte Verteilerlisten
    manualRecipients: DistributionRecipient[];  // Manuelle Empfänger
    senderConfig: SenderConfiguration;          // Absender-Konfiguration
    emailSubject: string;           // E-Mail-Betreff
    emailPreheader?: string;        // E-Mail-Vorschautext
    personalizedContent?: boolean;  // Personalisierung aktiv?
    variables: Record<string, string>;  // Template-Variablen
    testRecipients?: string[];      // Test-Empfänger
  };
  
  // Distribution-Status & Tracking
  distributionStatus?: {
    status: 'pending' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
    sentAt?: Timestamp;
    recipientCount: number;
    successCount: number;
    failureCount: number;
    openRate?: number;
    clickRate?: number;
    distributionId?: string;        // ID des Versand-Jobs
    errors?: DistributionError[];
  };
}

// Zusätzliche Types für Distribution
interface DistributionRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  notes?: string;
}

interface SenderConfiguration {
  contactId?: string;   // Aus Kontakten wählen
  email: string;
  name: string;
  replyTo?: string;
}

interface DistributionError {
  recipient: string;
  error: string;
  timestamp: Timestamp;
}
```

### 1.2 EmailComposer um Pipeline-Integration erweitern (BESTEHENDE Komponente)
**Datei:** `src/components/pr/email/EmailComposer.tsx` (BESTEHENDE Datei erweitern)
**Agent:** `general-purpose`
**Dauer:** 3 Tage

**Umsetzung:** BESTEHENDE 3-Stufen-EmailComposer erweitern
```typescript
// BESTEHENDE EmailComposer Komponente erweitern - NICHT neu schreiben!

// ✅ BESTEHENDE EmailComposerProps erweitern:
interface EmailComposerProps {
  // ... ALLE bestehenden Props beibehalten
  campaign: PRCampaign;
  onClose: () => void;
  onSent: (campaign: PRCampaign) => void;
  
  // ✅ NUR DIESE Props für Pipeline HINZUFÜGEN:
  projectMode?: boolean;        // Pipeline-Modus aktiviert?
  onPipelineComplete?: (campaignId: string) => void;  // Pipeline-Callback
}

export function EmailComposer({
  campaign,
  onClose,
  onSent,
  projectMode = false,
  onPipelineComplete
}: EmailComposerProps) {
  // ... ALLE bestehenden State-Variablen beibehalten
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<ComposerStep>>(new Set());
  const [draft, setDraft] = useState<EmailDraft>(initialDraft);
  
  // ✅ NUR DIESE State-Variablen HINZUFÜGEN für Pipeline:
  const [pipelineDistribution, setPipelineDistribution] = useState<boolean>(false);
  const [autoTransitionAfterSend, setAutoTransitionAfterSend] = useState<boolean>(false);

  // ✅ BESTEHENDE useEffect erweitern:
  useEffect(() => {
    if (projectMode && campaign.projectId && campaign.pipelineStage === 'distribution') {
      setPipelineDistribution(true);
      setAutoTransitionAfterSend(true);
      
      // Pre-populate mit Projekt-Daten wenn vorhanden
      if (campaign.distributionConfig) {
        setDraft(prev => ({
          ...prev,
          subject: campaign.distributionConfig!.emailSubject || '',
          preheader: campaign.distributionConfig!.emailPreheader || '',
          selectedDistributionLists: campaign.distributionConfig!.distributionLists || [],
          manualRecipients: campaign.distributionConfig!.manualRecipients || [],
          senderConfig: campaign.distributionConfig!.senderConfig || initialSenderConfig
        }));
      }
    }
  }, [projectMode, campaign]);

  // ✅ BESTEHENDE handleSend Funktion erweitern:
  const handleSend = async () => {
    try {
      // BESTEHENDE E-Mail-Versand-Logik beibehalten
      const distributionResult = await emailService.sendCampaign(campaign.id, {
        recipients: draft.recipients,
        subject: draft.subject,
        content: draft.content,
        senderConfig: draft.senderConfig,
        // ... alle bestehenden Parameter
      });

      // ✅ NUR Pipeline-spezifische Logik HINZUFÜGEN:
      if (projectMode && campaign.projectId) {
        // Campaign mit Distribution-Status aktualisieren
        const updatedCampaign = {
          ...campaign,
          distributionStatus: {
            status: 'sent' as const,
            sentAt: Timestamp.now(),
            recipientCount: draft.recipients.length,
            successCount: distributionResult.successCount,
            failureCount: distributionResult.failureCount,
            distributionId: distributionResult.id
          }
        };

        await prService.update(campaign.id, updatedCampaign, { 
          organizationId: campaign.organizationId, 
          userId: user.uid 
        });

        // Auto-Transition zur Monitoring-Phase wenn aktiviert
        if (autoTransitionAfterSend && distributionResult.successCount > 0) {
          await projectService.updateStage(
            campaign.projectId,
            'monitoring',
            {
              transitionReason: 'distribution_completed',
              transitionBy: user.uid,
              transitionAt: Timestamp.now(),
              distributionData: {
                recipientCount: distributionResult.successCount,
                distributionId: distributionResult.id
              }
            },
            { organizationId: campaign.organizationId, userId: user.uid }
          );

          // Pipeline-Complete Callback
          onPipelineComplete?.(campaign.id);
        }
      }

      // BESTEHENDE onSent Callback
      onSent(updatedCampaign || campaign);
      
    } catch (error) {
      console.error('Error sending campaign:', error);
      
      // Pipeline-Fehler-Handling
      if (projectMode && campaign.projectId) {
        await prService.update(campaign.id, {
          ...campaign,
          distributionStatus: {
            status: 'failed' as const,
            recipientCount: draft.recipients.length,
            successCount: 0,
            failureCount: draft.recipients.length,
            errors: [{
              recipient: 'all',
              error: error.message,
              timestamp: Timestamp.now()
            }]
          }
        }, { organizationId: campaign.organizationId, userId: user.uid });
      }
    }
  };

  return (
    <div className="email-composer">
      {/* ✅ NUR Pipeline-Status-Banner HINZUFÜGEN wenn Pipeline-Modus: */}
      {pipelineDistribution && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightIcon className="h-4 w-4 text-blue-600" />
            <Text className="font-medium text-blue-900">
              Pipeline-Distribution für Projekt "{campaign.projectTitle}"
            </Text>
          </div>
          <Text className="text-sm text-blue-700">
            Nach erfolgreichem Versand wird das Projekt automatisch zur Monitoring-Phase weitergeleitet.
          </Text>
          
          {campaign.distributionStatus && (
            <div className="mt-2 flex items-center gap-2">
              <Badge color={
                campaign.distributionStatus.status === 'sent' ? 'green' :
                campaign.distributionStatus.status === 'failed' ? 'red' :
                campaign.distributionStatus.status === 'sending' ? 'blue' : 'gray'
              }>
                {campaign.distributionStatus.status === 'sent' ? 'Versendet' :
                 campaign.distributionStatus.status === 'failed' ? 'Fehler' :
                 campaign.distributionStatus.status === 'sending' ? 'Versende...' : 'Ausstehend'}
              </Badge>
              {campaign.distributionStatus.sentAt && (
                <Text className="text-xs text-blue-600">
                  {new Date(campaign.distributionStatus.sentAt.toDate()).toLocaleString('de-DE')}
                </Text>
              )}
            </div>
          )}
        </div>
      )}

      {/* ... ALLE bestehenden EmailComposer JSX-Elemente beibehalten */}
      
      {/* BESTEHENDE Stufe 1: Anschreiben verfassen */}
      {currentStep === 1 && (
        <EmailComposerStep1 /* ... bestehende Props */ />
      )}
      
      {/* BESTEHENDE Stufe 2: Versand-Details */}
      {currentStep === 2 && (
        <EmailComposerStep2 /* ... bestehende Props */ />
      )}
      
      {/* BESTEHENDE Stufe 3: Vorschau & Versand - mit Pipeline-Erweiterung */}
      {currentStep === 3 && (
        <EmailComposerStep3 
          /* ... alle bestehenden Props */
          
          // ✅ NUR Pipeline-Props HINZUFÜGEN:
          pipelineMode={pipelineDistribution}
          autoTransitionAfterSend={autoTransitionAfterSend}
          onSend={handleSend}
        />
      )}
    </div>
  );
}
```

### 1.3 Campaign-Übersicht um Pipeline-Status erweitern (BESTEHENDE Page)
**Datei:** `src/app/dashboard/pr-tools/campaigns/page.tsx` (BESTEHENDE Datei erweitern)
**Agent:** `general-purpose`
**Dauer:** 1.5 Tage

**Umsetzung:**
```typescript
// BESTEHENDE CampaignsPage erweitern um Pipeline-Funktionen

export default function CampaignsPage() {
  // ... ALLE bestehenden State und Hooks beibehalten
  
  // ✅ NUR DIESE Funktion HINZUFÜGEN:
  const getPipelineActionButton = (campaign: PRCampaign) => {
    if (!campaign.projectId || !campaign.pipelineStage) {
      return null; // Normale Kampagne ohne Pipeline
    }

    switch (campaign.pipelineStage) {
      case 'distribution':
        if (!campaign.distributionStatus || campaign.distributionStatus.status === 'pending') {
          return (
            <Button 
              size="sm" 
              color="blue"
              onClick={() => handlePipelineDistribution(campaign)}
            >
              Distribution starten
            </Button>
          );
        }
        break;
        
      case 'monitoring':
        return (
          <Button 
            size="sm" 
            plain
            onClick={() => window.open(`/dashboard/projects/${campaign.projectId}`)}
          >
            Zum Projekt
          </Button>
        );
    }

    return null;
  };

  // ✅ NUR DIESE Funktion HINZUFÜGEN:
  const handlePipelineDistribution = (campaign: PRCampaign) => {
    setSelectedCampaign(campaign);
    setEmailModalOpen(true);
  };

  return (
    <div>
      {/* ... ALLE bestehenden JSX-Elemente beibehalten */}
      
      {/* BESTEHENDE Campaign-Liste erweitern um Pipeline-Spalte */}
      <table className="campaigns-table">
        <thead>
          {/* ... bestehende Spalten beibehalten */}
          <th>Pipeline</th> {/* ✅ NUR DIESE Spalte HINZUFÜGEN */}
          <th>Aktionen</th>
        </thead>
        <tbody>
          {campaigns.map(campaign => (
            <tr key={campaign.id}>
              {/* ... alle bestehenden Zellen beibehalten */}
              
              {/* ✅ NUR DIESE Pipeline-Spalte HINZUFÜGEN: */}
              <td>
                {campaign.projectId ? (
                  <div className="flex items-center gap-2">
                    <Badge color="blue" size="sm">
                      {campaign.pipelineStage === 'distribution' ? 'Distribution' :
                       campaign.pipelineStage === 'monitoring' ? 'Monitoring' :
                       campaign.pipelineStage}
                    </Badge>
                    {campaign.distributionStatus && (
                      <div className="text-xs text-gray-500">
                        {campaign.distributionStatus.successCount}/{campaign.distributionStatus.recipientCount} versendet
                      </div>
                    )}
                  </div>
                ) : (
                  <Text className="text-gray-400 text-sm">-</Text>
                )}
              </td>
              
              <td>
                {/* BESTEHENDE Action-Buttons beibehalten */}
                {/* ... */}
                
                {/* ✅ Pipeline-Action-Button HINZUFÜGEN: */}
                {getPipelineActionButton(campaign)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* BESTEHENDE EmailSendModal erweitern */}
      {emailModalOpen && selectedCampaign && (
        <EmailSendModal
          /* ... alle bestehenden Props beibehalten */
          campaign={selectedCampaign}
          onClose={() => setEmailModalOpen(false)}
          onSent={(updatedCampaign) => {
            // BESTEHENDE onSent-Logik beibehalten
            handleCampaignUpdate(updatedCampaign);
            setEmailModalOpen(false);
          }}
          
          {/* ✅ NUR Pipeline-Props HINZUFÜGEN: */}
          projectMode={!!selectedCampaign.projectId}
          onPipelineComplete={(campaignId) => {
            // Projekt-Dashboard öffnen oder Benachrichtigung zeigen
            toast.success('Kampagne versendet! Projekt wurde zur Monitoring-Phase weitergeleitet.');
            loadCampaigns(); // Refresh der Liste
          }}
        />
      )}
    </div>
  );
}
```

### 1.4 BESTEHENDE emailService um Pipeline-Features erweitern (NICHT neue Services erfinden)
**Datei:** BESTEHENDE emailService-Datei erweitern
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Umsetzung:**
```typescript
// BESTEHENDE emailService erweitern - NICHT neu erstellen!
export const emailService = {
  // ... ALLE bestehenden Methoden beibehalten
  
  // ✅ NUR DIESE Methoden für Pipeline-Integration HINZUFÜGEN:
  
  // BESTEHENDE sendCampaign Methode um Pipeline-Tracking erweitern
  async sendCampaign(
    campaignId: string, 
    distributionData: DistributionRequest,
    options?: { pipelineMode?: boolean; projectId?: string }
  ): Promise<DistributionResult> {
    
    // BESTEHENDE E-Mail-Versand-Logik verwenden
    const result = await super.sendCampaign(campaignId, distributionData);
    
    // ✅ NUR Pipeline-spezifisches Tracking HINZUFÜGEN:
    if (options?.pipelineMode && options.projectId) {
      // Pipeline-Event für Monitoring erstellen
      await this.createPipelineDistributionEvent({
        projectId: options.projectId,
        campaignId,
        distributionId: result.id,
        recipientCount: result.successCount,
        timestamp: Timestamp.now(),
        metadata: {
          lists: distributionData.distributionLists,
          personalizedVariables: distributionData.variables
        }
      });
    }
    
    return result;
  },

  // Pipeline-Distribution-Event für Analytics
  async createPipelineDistributionEvent(eventData: PipelineDistributionEvent): Promise<void> {
    // Event in bestehende Analytics/Events Collection speichern
    await addDoc(collection(db, 'pipeline_events'), {
      type: 'distribution',
      ...eventData,
      createdAt: Timestamp.now()
    });
  },

  // Pipeline-Distribution-Statistiken abrufen
  async getPipelineDistributionStats(
    projectId: string,
    context: { organizationId: string }
  ): Promise<PipelineDistributionStats> {
    const q = query(
      collection(db, 'pipeline_events'),
      where('projectId', '==', projectId),
      where('type', '==', 'distribution'),
      where('organizationId', '==', context.organizationId)
    );

    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(doc => doc.data());
        
        const stats: PipelineDistributionStats = {
          totalCampaigns: events.length,
          totalRecipients: events.reduce((sum, e) => sum + e.recipientCount, 0),
          distributionDates: events.map(e => e.timestamp),
          successRate: events.length > 0 ? 
            events.reduce((sum, e) => sum + e.recipientCount, 0) / events.length : 0
        };
        
        unsubscribe();
        resolve(stats);
      });
    });
  }
};

// Zusätzliche Types für Pipeline-Distribution
interface PipelineDistributionEvent {
  projectId: string;
  campaignId: string;
  distributionId: string;
  recipientCount: number;
  timestamp: Timestamp;
  metadata: Record<string, any>;
}

interface PipelineDistributionStats {
  totalCampaigns: number;
  totalRecipients: number;
  distributionDates: Timestamp[];
  successRate: number;
}
```

---

## TESTING STRATEGIE

### Unit Tests
```typescript
// src/__tests__/features/distribution-pipeline-integration.test.ts
describe('Distribution Pipeline Integration', () => {
  it('should extend PRCampaign with distribution fields', () => {
    const campaign: PRCampaign = {
      id: 'campaign_123',
      // ... alle bestehenden PRCampaign Felder
      
      // Pipeline-Distribution Felder:
      projectId: 'project_123',
      pipelineStage: 'distribution',
      distributionConfig: {
        isScheduled: false,
        distributionLists: ['list_123'],
        manualRecipients: [],
        senderConfig: { email: 'test@test.com', name: 'Test' },
        emailSubject: 'Test Subject',
        personalizedContent: true,
        variables: {}
      },
      distributionStatus: {
        status: 'pending',
        recipientCount: 0,
        successCount: 0,
        failureCount: 0
      }
    };
    
    expect(campaign.distributionConfig?.distributionLists).toContain('list_123');
    expect(campaign.distributionStatus?.status).toBe('pending');
  });

  it('should send campaign using EXISTING emailService with pipeline tracking', async () => {
    const result = await emailService.sendCampaign(
      'campaign_123',
      mockDistributionData,
      { pipelineMode: true, projectId: 'project_123' }
    );
    
    expect(result.successCount).toBeGreaterThan(0);
    expect(emailService.createPipelineDistributionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project_123',
        campaignId: 'campaign_123'
      })
    );
  });

  it('should auto-transition project to monitoring after successful distribution', async () => {
    const mockCampaign = mockPRCampaign({ 
      projectId: 'project_123',
      pipelineStage: 'distribution'
    });
    
    const composer = render(<EmailComposer 
      campaign={mockCampaign} 
      projectMode={true}
      onPipelineComplete={mockPipelineComplete}
    />);
    
    // Simulate successful send
    await composer.handleSend();
    
    expect(projectService.updateStage).toHaveBeenCalledWith(
      'project_123',
      'monitoring',
      expect.objectContaining({ transitionReason: 'distribution_completed' }),
      expect.any(Object)
    );
  });
});
```

---

## ERFOLGSKRITERIEN

### Funktionale Anforderungen
- ✅ BESTEHENDE PRCampaign um Distribution-Felder erweitert
- ✅ BESTEHENDE EmailComposer um Pipeline-Modus erweitert
- ✅ BESTEHENDE Campaign-Liste um Pipeline-Spalte erweitert
- ✅ Automatische Stage-Transition nach erfolgreichem Versand

### Integration-Requirements
- ✅ BESTEHENDE emailService erweitert (nicht neu erstellt)
- ✅ BESTEHENDE E-Mail-Versand-Logik unverändert nutzbar
- ✅ BESTEHENDE 3-Stufen-EmailComposer beibehalten
- ✅ KEINE Breaking Changes an bestehenden Distribution-Workflows

### Performance-Targets
- ✅ E-Mail-Versand Performance unverändert
- ✅ Pipeline-Tracking ohne Verzögerung
- ✅ Campaign-Liste lädt in <2 Sekunden
- ✅ EmailComposer startet in <1 Sekunde

**Die Distribution-Phase erweitert das BESTEHENDE E-Mail-Versand-System minimal um Projekt-Pipeline-Funktionalitäten.**