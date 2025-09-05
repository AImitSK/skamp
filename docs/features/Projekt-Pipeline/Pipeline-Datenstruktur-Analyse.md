# Projekt-Pipeline Datenstruktur-Analyse

## Übersicht
Analyse der benötigten Datenstrukturen, Services und Collections für die Implementierung der Projekt-Pipeline als Kanban-Board in CeleroPress.

## 1. NEUE HAUPT-ENTITY: Project

### Project Entity (Kern-Datenstruktur)
```typescript
interface Project extends BaseEntity {
  // Basis-Informationen
  title: string;
  description?: string;
  status: ProjectStatus; // Kanban-Column
  
  // Kunde & Team
  clientId?: string;
  clientName: string;
  assignedTeamMembers: string[]; // User IDs
  
  // Pipeline-Position
  stage: PipelineStage;
  stageUpdatedAt: Timestamp;
  stageHistory: StageHistoryEntry[];
  
  // Verknüpfte Elemente
  linkedElements: ProjectLinkedElements;
  
  // Deadlines & Termine
  deadlines: ProjectDeadline[];
  
  // Aufgaben & Checklisten
  tasks: ProjectTask[];
  
  // Status & Fortschritt
  progress: ProjectProgress;
  
  // Kommunikation
  communicationFeed: CommunicationEntry[];
  
  // Analytics (für Monitoring-Phase)
  analytics?: ProjectAnalytics;
  
  // Metadaten
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  color?: string; // Karten-Farbe
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedAt?: Timestamp;
  organizationId: string;
}
```

### Pipeline-Stages (Kanban-Spalten)
```typescript
type PipelineStage = 
  | 'ideas_planning'      // Idee/Planung
  | 'creation'           // Erstellung  
  | 'internal_approval'  // Interne Freigabe
  | 'customer_approval'  // Kunden-Freigabe
  | 'distribution'       // Distribution
  | 'monitoring'         // Monitoring/Analyse
  | 'completed';         // Abgeschlossen

interface StageHistoryEntry {
  stage: PipelineStage;
  enteredAt: Timestamp;
  exitedAt?: Timestamp;
  userId: string;
  notes?: string;
}
```

### Verknüpfte Elemente
```typescript
interface ProjectLinkedElements {
  // PR-Kampagne (bereits vorhanden)
  campaignId?: string;
  campaignTitle?: string;
  campaignStatus?: PRCampaignStatus;
  
  // Freigaben (bereits vorhanden)
  approvalIds?: string[];
  currentApprovalStatus?: 'pending' | 'approved' | 'rejected';
  
  // Kontakte & Verteiler (bereits vorhanden)
  distributionListIds?: string[];
  distributionListNames?: string[];
  contactIds?: string[];
  
  // Medien-Assets (bereits vorhanden - besondere Struktur!)
  attachedAssets?: CampaignAssetAttachment[];
  assetCount?: number;
  mediaTypes?: string[];
  
  // Textbausteine (bereits vorhanden)
  boilerplateIds?: string[];
  
  // E-Mail-Kampagnen (bereits vorhanden)
  emailCampaignIds?: string[];
}
```

### Aufgaben & Checklisten
```typescript
interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
  assignedTo?: string;
  dueDate?: Timestamp;
  priority: 'low' | 'medium' | 'high';
  category: TaskCategory;
  dependencies?: string[]; // Task IDs
}

type TaskCategory = 
  | 'content_creation'
  | 'media_selection' 
  | 'approval_process'
  | 'distribution'
  | 'monitoring'
  | 'administrative';
```

### Fortschritt & Status
```typescript
interface ProjectProgress {
  overallPercent: number; // 0-100
  stageProgress: Record<PipelineStage, number>;
  
  // Automatisch berechnet basierend auf:
  taskCompletion: number;        // % abgeschlossene Aufgaben
  campaignStatus: number;        // Status der PR-Kampagne
  approvalStatus: number;        // Freigabe-Fortschritt
  distributionStatus: number;    // Versand-Fortschritt
  
  lastUpdated: Timestamp;
}
```

## 2. NEUE COLLECTIONS

### 2.1 projects Collection
```
/projects
  /{projectId}
    - Project Entity
    - organizationId (Multi-Tenancy)
    - Indices: organizationId, stage, clientId, assignedTeamMembers
```

### 2.2 project_templates Collection (Optional)
```
/project_templates
  /{templateId}
    - name: string
    - description: string
    - defaultTasks: ProjectTask[]
    - defaultDeadlines: ProjectDeadline[]
    - organizationId: string
```

## 3. NEUE SERVICES

### 3.1 ProjectService
```typescript
class ProjectService extends BaseService<Project> {
  // CRUD Operations
  async createProject(data: CreateProjectData, context: ServiceContext): Promise<string>
  async updateProject(id: string, updates: Partial<Project>, context: ServiceContext): Promise<void>
  async getProjectById(id: string, organizationId: string): Promise<Project | null>
  
  // Pipeline-spezifisch
  async getProjectsByStage(organizationId: string, stage: PipelineStage): Promise<Project[]>
  async moveProjectToStage(projectId: string, stage: PipelineStage, context: ServiceContext): Promise<void>
  async getProjectsByAssignee(organizationId: string, userId: string): Promise<Project[]>
  
  // Board-Ansichten
  async getKanbanBoard(organizationId: string, filters?: ProjectFilters): Promise<KanbanBoard>
  async getProjectsList(organizationId: string, filters?: ProjectFilters): Promise<Project[]>
  
  // Integration mit bestehenden Services
  async linkCampaign(projectId: string, campaignId: string): Promise<void>
  async linkApproval(projectId: string, approvalId: string): Promise<void>
  async syncProjectProgress(projectId: string): Promise<void>
}
```

### 3.2 ProjectIntegrationService
```typescript
class ProjectIntegrationService {
  // Automatische Verknüpfungen
  async autoLinkCampaignAssets(projectId: string, campaignId: string): Promise<void>
  async syncApprovalStatus(projectId: string): Promise<void>
  async updateDistributionStatus(projectId: string): Promise<void>
  
  // Daten-Aggregation
  async aggregateProjectData(projectId: string): Promise<ProjectDataSummary>
  async calculateProjectProgress(projectId: string): Promise<ProjectProgress>
}
```

## 4. BESTEHENDE SERVICES ERWEITERN

### 4.1 PRService Erweiterung
```typescript
// Neue Methoden hinzufügen:
async linkToProject(campaignId: string, projectId: string): Promise<void>
async getProjectLinkedCampaigns(projectId: string): Promise<PRCampaign[]>
```

### 4.2 ApprovalService Erweiterung
```typescript
// Neue Methoden hinzufügen:
async linkToProject(approvalId: string, projectId: string): Promise<void>
async getProjectApprovals(projectId: string): Promise<ApprovalEnhanced[]>
async getProjectApprovalSummary(projectId: string): Promise<ApprovalSummary>
```

## 5. DATENABFRAGE-REQUIREMENTS

### 5.1 Für Kanban-Board Darstellung
```typescript
interface KanbanBoardData {
  // Alle Projekte nach Stages gruppiert
  stages: Record<PipelineStage, Project[]>;
  
  // Zusätzliche Metadaten
  totalProjects: number;
  projectsPerStage: Record<PipelineStage, number>;
  overdueTasks: number;
  pendingApprovals: number;
}

// Abfrage:
const boardData = await Promise.all([
  projectService.getProjectsByStage(orgId, 'ideas_planning'),
  projectService.getProjectsByStage(orgId, 'creation'),
  projectService.getProjectsByStage(orgId, 'internal_approval'),
  projectService.getProjectsByStage(orgId, 'customer_approval'),
  projectService.getProjectsByStage(orgId, 'distribution'),
  projectService.getProjectsByStage(orgId, 'monitoring'),
  projectService.getProjectsByStage(orgId, 'completed')
]);
```

### 5.2 Für Projekt-Karten Detail-Ansicht
```typescript
interface ProjectDetailData {
  // Basis-Projekt
  project: Project;
  
  // Verknüpfte Daten (parallel laden)
  linkedCampaign?: PRCampaign;
  approvals?: ApprovalEnhanced[];
  distributionLists?: DistributionList[];
  contacts?: ContactEnhanced[];
  resolvedAssets?: MediaAsset[];
  boilerplates?: Boilerplate[];
  emailCampaigns?: EmailCampaign[];
  
  // Team-Daten
  teamMembers?: TeamMember[];
  client?: CompanyEnhanced;
}

// Abfrage-Strategie (parallel):
const [
  project,
  campaign,
  approvals,
  lists,
  assets,
  teamMembers
] = await Promise.all([
  projectService.getProjectById(projectId, orgId),
  project.linkedElements.campaignId ? prService.getById(project.linkedElements.campaignId) : null,
  project.linkedElements.approvalIds?.length ? approvalService.getMultiple(project.linkedElements.approvalIds) : [],
  // ... weitere parallele Abfragen
]);
```

### 5.3 Dashboard & Analytics Abfragen
```typescript
interface ProjectDashboardData {
  // Übersicht
  totalProjects: number;
  activeProjects: number;
  completedThisMonth: number;
  overdueTasks: number;
  
  // Verteilung
  projectsByStage: Record<PipelineStage, number>;
  projectsByClient: Array<{ clientId: string; clientName: string; count: number }>;
  projectsByAssignee: Array<{ userId: string; userName: string; count: number }>;
  
  // Performance
  avgProjectDuration: number;
  avgTimePerStage: Record<PipelineStage, number>;
  
  // Trends
  projectsCreatedTrend: TimeSeriesData[];
  completionRateTrend: TimeSeriesData[];
}
```

## 6. FIRESTORE INDICES (benötigt)

### Erforderliche Indices:
```javascript
// projects Collection
{ organizationId: 'asc', stage: 'asc', updatedAt: 'desc' }
{ organizationId: 'asc', clientId: 'asc', stage: 'asc' }
{ organizationId: 'asc', assignedTeamMembers: 'array-contains', updatedAt: 'desc' }
{ organizationId: 'asc', 'deadlines.dueDate': 'asc' }
{ organizationId: 'asc', priority: 'asc', stage: 'asc' }
```

## 7. INTEGRATION MIT BESTEHENDEN SYSTEMEN

### 7.1 Automatische Projekt-Erstellung
```typescript
// Bei Kampagnen-Erstellung automatisch Projekt anlegen?
const autoCreateProject = async (campaign: PRCampaign): Promise<string> => {
  const project: Partial<Project> = {
    title: campaign.title,
    clientId: campaign.clientId,
    clientName: campaign.clientName,
    stage: 'creation', // Startet in Erstellung
    linkedElements: {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignStatus: campaign.status
    }
  };
  
  return await projectService.createProject(project, { organizationId, userId });
};
```

### 7.2 Status-Synchronisation
```typescript
// Bei Kampagnen-Status-Änderung Projekt-Stage aktualisieren
const syncCampaignStatus = async (campaignId: string, newStatus: PRCampaignStatus) => {
  const project = await projectService.getByCampaignId(campaignId);
  if (project) {
    const newStage = mapCampaignStatusToStage(newStatus);
    if (newStage !== project.stage) {
      await projectService.moveProjectToStage(project.id, newStage, context);
    }
  }
};
```

## 8. PERFORMANCE-OPTIMIERUNGEN

### 8.1 Denormalisierung
- Projekt-Karten speichern **Snapshots** wichtiger Daten (ähnlich wie Assets)
- `campaignTitle`, `clientName`, `assetCount` direkt im Projekt
- Reduziert Abfragen für Board-Darstellung

### 8.2 Caching-Strategie
- Kanban-Board Daten cachen (5 Minuten)
- Projekt-Details cachen bei häufigem Zugriff
- Real-time Updates über Firestore Listeners

## 9. MIGRATION & ROLLOUT

### Phase 1: Basis-Struktur
1. Project Entity & Service erstellen
2. Grundlegendes Kanban-Board
3. Manuelle Projekt-Erstellung

### Phase 2: Integration
1. Automatische Kampagnen-Verknüpfung
2. Asset-Integration
3. Freigabe-Integration

### Phase 3: Erweiterte Features
1. Automatisierung & Workflows
2. Analytics & Reporting
3. Templates & Bulk-Operations

## ZUSAMMENFASSUNG: BENÖTIGTE DATENABFRAGEN

### Neue Collections:
- `projects` (Haupt-Collection)
- `project_templates` (Optional)

### Neue Services:
- `ProjectService`
- `ProjectIntegrationService`

### Service-Erweiterungen:
- `PRService.linkToProject()`
- `ApprovalService.getProjectApprovals()`
- `MediaService.getProjectAssets()`

### Kritische Abfragen:
1. **Kanban-Board**: Projekte nach Stage gruppiert
2. **Projekt-Detail**: Parallel-Loading aller verknüpften Daten
3. **Dashboard**: Aggregierte Statistiken
4. **Real-time Updates**: Firestore Listeners für Board-Updates

### Integration-Points:
- Kampagnen → Projekte (automatische Verknüpfung)
- Assets → Projekte (Snapshot-basiert)
- Freigaben → Projekte (Status-Synchronisation)
- Kontakte → Projekte (über Kampagnen-Verknüpfung)