# Projekt-Anlage: Datenabfrage-Requirements

## Übersicht
Strukturierte Auflistung aller Informationen, die beim Anlegen eines neuen Projekts in der Pipeline abgefragt oder automatisch zugeordnet werden müssen.

## 1. PFLICHTFELDER (MUSS ABGEFRAGT WERDEN)

### 1.1 Basis-Informationen
| Feld | Typ | Beschreibung | Validierung |
|------|-----|-------------|-------------|
| **title** | string | Projekttitel | Min. 3 Zeichen, Max. 100 Zeichen |
| **clientId** | string | Kunden-Auswahl | Muss in Companies existieren |
| **stage** | PipelineStage | Start-Phase | Default: 'ideas_planning' |

### 1.2 Team-Zuordnung
| Feld | Typ | Beschreibung | Quelle |
|------|-----|-------------|---------|
| **assignedTeamMembers** | string[] | Verantwortliche Team-Mitglieder | Aus Organization Team Members |
| **createdBy** | string | Ersteller (automatisch) | Aktueller User |

### 1.3 Automatisch zugeordnet
| Feld | Typ | Beschreibung | Quelle |
|------|-----|-------------|---------|
| **organizationId** | string | Organisation | Aktueller User Context |
| **createdAt** | Timestamp | Erstellzeit | serverTimestamp() |
| **updatedAt** | Timestamp | Letzte Änderung | serverTimestamp() |

## 2. OPTIONALE FELDER (KANN ABGEFRAGT WERDEN)

### 2.1 Projekt-Details
| Feld | Typ | Beschreibung | Default |
|------|-----|-------------|---------|
| **description** | string | Kurzbeschreibung | null |
| **priority** | 'low' \| 'medium' \| 'high' \| 'urgent' | Priorität | 'medium' |
| **color** | string | Karten-Farbe | Auto-generiert |
| **tags** | string[] | Tags für Kategorisierung | [] |

### 2.2 Template-basierte Erstellung
| Feld | Typ | Beschreibung | Abhängigkeit |
|------|-----|-------------|-------------|
| **templateId** | string | Projekt-Vorlage | Optional, wenn Templates vorhanden |
| **tasks** | ProjectTask[] | Vordefinierte Aufgaben | Aus Template oder leer |
| **deadlines** | ProjectDeadline[] | Standard-Deadlines | Aus Template oder leer |

## 3. ABFRAGE-DATEN FÜR UI-KOMPONENTEN

### 3.1 Kunden-Auswahl (ModernCustomerSelector)
```typescript
// Benötigte Abfrage:
const clients = await companiesEnhancedService.getAll(organizationId);

// Datenstruktur für UI:
interface ClientOption {
  id: string;
  name: string;
  type: 'agency' | 'brand' | 'media' | 'other';
  contactCount?: number;
  lastActivity?: Timestamp;
}
```

### 3.2 Team-Mitglieder Auswahl
```typescript
// Benötigte Abfrage:
const teamMembers = await teamMemberService.getByOrganization(organizationId);

// Datenstruktur für UI:
interface TeamMemberOption {
  id: string;
  displayName: string;
  email: string;
  role: string;
  avatar?: string;
  isActive: boolean;
}
```

### 3.3 Projekt-Templates (falls vorhanden)
```typescript
// Benötigte Abfrage:
const templates = await projectTemplateService.getAll(organizationId);

// Datenstruktur für UI:
interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  defaultTasks: ProjectTask[];
  defaultDeadlines: ProjectDeadline[];
  category: string;
  usageCount: number;
}
```

## 4. STANDARD-WERTE UND AUTOMATISIERUNGEN

### 4.1 Automatisch generierte Werte
```typescript
// Bei Projekt-Erstellung automatisch setzen:
const defaultValues = {
  // Eindeutige ID
  id: nanoid(),
  
  // Standard-Stage
  stage: 'ideas_planning' as PipelineStage,
  
  // Farbe basierend auf Kunde oder zufällig
  color: generateProjectColor(clientId),
  
  // Leere Arrays für spätere Verknüpfungen
  tasks: [],
  deadlines: [],
  linkedElements: {
    approvalIds: [],
    distributionListIds: [],
    contactIds: [],
    boilerplateIds: [],
    emailCampaignIds: [],
    attachedAssets: []
  },
  
  // Standard-Fortschritt
  progress: {
    overallPercent: 0,
    stageProgress: {
      'ideas_planning': 0,
      'creation': 0,
      'internal_approval': 0,
      'customer_approval': 0,
      'distribution': 0,
      'monitoring': 0,
      'completed': 0
    },
    taskCompletion: 0,
    campaignStatus: 0,
    approvalStatus: 0,
    distributionStatus: 0,
    lastUpdated: serverTimestamp()
  },
  
  // Leere Kommunikation
  communicationFeed: [],
  
  // Stage-Historie
  stageHistory: [{
    stage: 'ideas_planning',
    enteredAt: serverTimestamp(),
    userId: currentUserId,
    notes: 'Projekt erstellt'
  }]
};
```

### 4.2 Client-Name Auflösung
```typescript
// Bei Client-Auswahl automatisch Name setzen:
const resolveClientName = async (clientId: string): Promise<string> => {
  const client = await companiesEnhancedService.getById(clientId, organizationId);
  return client?.name || 'Unbekannter Kunde';
};
```

### 4.3 Template-Anwendung
```typescript
// Falls Template gewählt wird:
const applyTemplate = (template: ProjectTemplate): Partial<Project> => ({
  tasks: template.defaultTasks.map(task => ({
    ...task,
    id: nanoid(),
    completed: false,
    assignedTo: null // Muss später zugeordnet werden
  })),
  
  deadlines: template.defaultDeadlines.map(deadline => ({
    ...deadline,
    id: nanoid(),
    // Relative Termine basierend auf Erstelldatum berechnen
    dueDate: calculateRelativeDate(deadline.daysFromStart)
  }))
});
```

## 5. FORMULAR-STRUKTUR

### 5.1 Schritt 1: Basis-Informationen
```typescript
interface Step1Data {
  title: string;           // PFLICHT
  description?: string;    // OPTIONAL
  clientId: string;        // PFLICHT - Dropdown-Auswahl
  priority: ProjectPriority; // OPTIONAL - Radio/Select
  color?: string;          // OPTIONAL - Color-Picker
  tags?: string[];         // OPTIONAL - Tag-Input
}
```

### 5.2 Schritt 2: Team & Verantwortung
```typescript
interface Step2Data {
  assignedTeamMembers: string[]; // PFLICHT - Multi-Select
  // Optional: Rollen-spezifische Zuordnung
  projectManager?: string;
  contentCreator?: string;
  designer?: string;
}
```

### 5.3 Schritt 3: Projekt-Setup (Optional)
```typescript
interface Step3Data {
  templateId?: string;        // OPTIONAL - Template-Auswahl
  customTasks?: ProjectTask[]; // OPTIONAL - Eigene Aufgaben
  initialDeadlines?: ProjectDeadline[]; // OPTIONAL
  startDate?: Date;           // OPTIONAL - Default: heute
}
```

### 5.4 Schritt 4: Sofortige Verknüpfungen (Optional)
```typescript
interface Step4Data {
  // Optional: Direkt Kampagne erstellen
  createCampaignImmediately?: boolean;
  campaignTitle?: string;
  
  // Optional: Assets direkt anhängen
  initialAssets?: string[]; // Asset-IDs
  
  // Optional: Verteiler direkt zuordnen
  distributionLists?: string[]; // List-IDs
}
```

## 6. VALIDIERUNGSREGELN

### 6.1 Client-seitige Validierung
```typescript
const validateProjectData = (data: CreateProjectData): ValidationResult => {
  const errors: string[] = [];
  
  // Titel
  if (!data.title || data.title.trim().length < 3) {
    errors.push('Titel muss mindestens 3 Zeichen lang sein');
  }
  if (data.title && data.title.length > 100) {
    errors.push('Titel darf maximal 100 Zeichen lang sein');
  }
  
  // Kunde
  if (!data.clientId) {
    errors.push('Kunde muss ausgewählt werden');
  }
  
  // Team
  if (!data.assignedTeamMembers || data.assignedTeamMembers.length === 0) {
    errors.push('Mindestens ein Team-Mitglied muss zugeordnet werden');
  }
  
  return { isValid: errors.length === 0, errors };
};
```

### 6.2 Server-seitige Validierung
```typescript
const validateProjectCreation = async (data: CreateProjectData, context: ServiceContext): Promise<void> => {
  // Kunde existiert?
  const client = await companiesEnhancedService.getById(data.clientId, context.organizationId);
  if (!client) {
    throw new Error('Ausgewählter Kunde existiert nicht');
  }
  
  // Team-Mitglieder existieren?
  const teamMembers = await teamMemberService.getMultiple(data.assignedTeamMembers);
  if (teamMembers.length !== data.assignedTeamMembers.length) {
    throw new Error('Ein oder mehrere Team-Mitglieder existieren nicht');
  }
  
  // Template existiert? (falls angegeben)
  if (data.templateId) {
    const template = await projectTemplateService.getById(data.templateId, context.organizationId);
    if (!template) {
      throw new Error('Ausgewählte Vorlage existiert nicht');
    }
  }
};
```

## 7. API-STRUKTUR FÜR PROJEKT-ERSTELLUNG

### 7.1 Request-Interface
```typescript
interface CreateProjectRequest {
  // Schritt 1: Basis
  title: string;
  description?: string;
  clientId: string;
  priority?: ProjectPriority;
  color?: string;
  tags?: string[];
  
  // Schritt 2: Team
  assignedTeamMembers: string[];
  
  // Schritt 3: Setup
  templateId?: string;
  customTasks?: Omit<ProjectTask, 'id'>[];
  initialDeadlines?: Omit<ProjectDeadline, 'id'>[];
  startDate?: Date;
  
  // Schritt 4: Verknüpfungen
  createCampaignImmediately?: boolean;
  campaignTitle?: string;
  initialAssets?: string[];
  distributionLists?: string[];
}
```

### 7.2 Response-Interface
```typescript
interface CreateProjectResponse {
  projectId: string;
  project: Project;
  
  // Falls Kampagne erstellt wurde
  campaignId?: string;
  campaign?: PRCampaign;
  
  // Warnings/Infos
  warnings?: string[];
  info?: string[];
}
```

## 8. BENÖTIGTE UI-KOMPONENTEN

### 8.1 Neue Komponenten
- `ProjectCreationWizard` (mehrstufiges Formular)
- `ClientSelector` (erweiterte Kunden-Auswahl)
- `TeamMemberMultiSelect` (Team-Zuordnung)
- `ProjectTemplateSelector` (Template-Auswahl)
- `ProjectColorPicker` (Farb-Auswahl)
- `ProjectTagInput` (Tag-Management)

### 8.2 Wiederverwendbare Komponenten
- `ModernCustomerSelector` (bereits vorhanden)
- `AssetSelectorModal` (bereits vorhanden)
- `SearchInput` (bereits vorhanden)
- `Button`, `Dialog`, `Field` etc. (bereits vorhanden)

## ZUSAMMENFASSUNG: MINIMALE DATENABFRAGE

### Absolut erforderlich:
1. **title** (string) - Projekttitel
2. **clientId** (string) - Kunde auswählen
3. **assignedTeamMembers** (string[]) - Team zuordnen

### Automatisch zugeordnet:
4. **organizationId** - aus User-Context
5. **createdBy** - aktueller User
6. **stage** - 'ideas_planning'
7. **createdAt/updatedAt** - serverTimestamp()

### Optional erweitert:
8. **description** - Beschreibung
9. **priority** - Priorität
10. **templateId** - Vorlage verwenden
11. **tags** - Kategorisierung
12. **color** - Karten-Farbe

**Minimaler Aufwand**: 3 Pflichtfelder + automatische Zuordnung
**Erweitert**: + 5 optionale Felder für bessere Organisation