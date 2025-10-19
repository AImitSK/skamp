# API-Referenz - Projekt-Erstellung

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [ProjectService Methods](#projectservice-methods)
3. [Type Interfaces](#type-interfaces)
4. [Error Handling](#error-handling)
5. [Multi-Tenancy](#multi-tenancy)
6. [Best Practices](#best-practices)
7. [Beispiele](#beispiele)

---

## Überblick

Die Projekt-Erstellungs-API ist Teil des `projectService` und bietet spezialisierte Methoden für die Wizard-basierte Projekt-Erstellung. Die API ist vollständig Multi-Tenancy-fähig und bietet umfassendes Error Handling.

### Core Methods

| Methode | Beschreibung | Status |
|---------|--------------|--------|
| `createProjectFromWizard()` | Erstellt Projekt aus Wizard-Daten | ✅ Produktiv |
| `getProjectCreationOptions()` | Lädt alle verfügbaren Optionen | ✅ Produktiv |
| `validateProjectData()` | Validiert Wizard-Daten | ✅ Produktiv |

---

## ProjectService Methods

### createProjectFromWizard()

Erstellt ein vollständiges Projekt aus Wizard-Daten mit automatischer Ressourcen-Initialisierung.

#### Signatur

```typescript
async createProjectFromWizard(
  wizardData: ProjectCreationWizardData,
  userId: string,
  organizationId: string
): Promise<ProjectCreationResult>
```

#### Parameter

**wizardData: ProjectCreationWizardData**

```typescript
interface ProjectCreationWizardData {
  // Basis-Informationen (Step 1)
  title: string;                          // Min 3 Zeichen
  description: string;
  priority: ProjectPriority;              // 'low' | 'medium' | 'high' | 'urgent'
  color: string;                          // Hex-Color, default: '#005fab'
  tags: string[];                         // Tag-IDs

  // Kunde (Step 2)
  clientId: string;                       // Required

  // Team (Step 3)
  assignedTeamMembers: string[];          // Team-Member-IDs
  projectManager?: string;                // Optional PM-ID

  // Optional: Template & Tasks
  templateId?: string;
  customTasks: ProjectTask[];

  // Optional: Ressourcen-Erstellung
  createCampaignImmediately: boolean;     // PR-Kampagne erstellen?
  campaignTitle?: string;
  initialAssets: string[];                // Asset-IDs
  distributionLists: string[];            // Verteiler-IDs

  // Wizard State (intern)
  completedSteps: number[];
  currentStep: number;
  startDate?: Date;
}
```

**userId: string**
- Aktueller Benutzer (aus Auth Context)
- Wird als `project.userId` gespeichert

**organizationId: string**
- Multi-Tenancy Context
- Wird als `project.organizationId` gespeichert

#### Returns

```typescript
interface ProjectCreationResult {
  success: boolean;                       // true bei Erfolg
  projectId: string;                      // Neue Projekt-ID
  project: Project;                       // Vollständiges Projekt-Objekt

  // Optional: Erstellte Ressourcen
  campaignId?: string;                    // PR-Kampagne-ID (falls erstellt)
  taskIds?: string[];                     // Erstellte Task-IDs
  folderId?: string;                      // Projekt-Ordner-ID

  // Optional: Fehler
  errors?: string[];                      // Teil-Fehler (nicht kritisch)
  error?: string;                         // Kritischer Fehler
}
```

#### Implementierung

```typescript
async createProjectFromWizard(
  wizardData: ProjectCreationWizardData,
  userId: string,
  organizationId: string
): Promise<ProjectCreationResult> {
  try {
    const projectId = nanoid();

    // 1. Projekt-Basis-Daten erstellen
    const projectData: Omit<Project, 'id'> = {
      userId,
      organizationId,
      title: wizardData.title,
      description: wizardData.description,
      status: 'active',
      currentStage: 'ideas_planning',
      assignedTo: wizardData.assignedTeamMembers,
      projectManager: wizardData.projectManager,
      tags: wizardData.tags || [],
      priority: wizardData.priority,
      color: wizardData.color,
      // ... weitere Felder
    };

    // 2. Projekt speichern
    const docRef = await addDoc(collection(db, 'projects'), {
      ...projectData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // 3. PR-Kampagne erstellen (optional)
    let campaignId: string | undefined;
    if (wizardData.createCampaignImmediately && wizardData.campaignTitle) {
      const { prService } = await import('./pr-service');
      campaignId = await prService.create({
        title: wizardData.campaignTitle,
        projectId: docRef.id,
        organizationId,
        userId,
        status: 'planning',
        // ... weitere Felder
      });
    }

    // 4. Projekt-Ordner erstellen
    try {
      await this.createProjectFolderStructure(docRef.id, organizationId, {
        organizationId,
        userId
      });
    } catch (folderError) {
      console.error('Fehler bei Ordner-Erstellung:', folderError);
      // Nicht kritisch, Projekt-Erstellung fortsetzen
    }

    // 5. Success Result zurückgeben
    return {
      success: true,
      projectId: docRef.id,
      project: { id: docRef.id, ...projectData },
      campaignId,
      errors: []
    };

  } catch (error: any) {
    console.error('Fehler bei Projekt-Erstellung:', error);
    return {
      success: false,
      projectId: '',
      project: {} as Project,
      error: error.message || 'Unbekannter Fehler bei Projekt-Erstellung'
    };
  }
}
```

#### Beispiel

```typescript
// Wizard-Daten vorbereiten
const wizardData: ProjectCreationWizardData = {
  // Step 1: Projekt
  title: 'Produktlaunch Q2 2024',
  description: 'Launch unserer neuen Produktlinie',
  priority: 'high',
  color: '#005fab',
  tags: ['tag-1', 'tag-2'],
  createCampaignImmediately: true,
  campaignTitle: 'Produktlaunch Q2 2024 - PR-Kampagne',

  // Step 2: Kunde
  clientId: 'client-abc-123',

  // Step 3: Team
  assignedTeamMembers: ['user-1', 'user-2'],
  projectManager: 'user-1',

  // Optional
  templateId: undefined,
  customTasks: [],
  initialAssets: [],
  distributionLists: [],
  completedSteps: [1, 2, 3],
  currentStep: 3
};

// Projekt erstellen
const result = await projectService.createProjectFromWizard(
  wizardData,
  currentUser.uid,
  currentOrganization.id
);

if (result.success) {
  console.log('Projekt erstellt:', result.projectId);
  console.log('Kampagne erstellt:', result.campaignId);

  // Navigation zum neuen Projekt
  router.push(`/dashboard/projects/${result.projectId}`);
} else {
  console.error('Fehler:', result.error);
  alert(`Projekt konnte nicht erstellt werden: ${result.error}`);
}
```

---

### getProjectCreationOptions()

Lädt alle verfügbaren Optionen für die Projekt-Erstellung (Clients, Team-Members, Templates, etc.).

#### Signatur

```typescript
async getProjectCreationOptions(
  organizationId: string
): Promise<ProjectCreationOptions>
```

#### Parameter

**organizationId: string**
- Multi-Tenancy Context
- Nur Daten dieser Organisation werden geladen

#### Returns

```typescript
interface ProjectCreationOptions {
  availableClients: Client[];
  availableTeamMembers: TeamMember[];
  availableTemplates: ProjectTemplate[];
  availableDistributionLists: DistributionList[];
  defaultSettings: {
    defaultPriority: ProjectPriority;
    defaultColor: string;
    autoCreateCampaign: boolean;
  };
}

interface Client {
  id: string;
  name: string;
  type: string;                           // 'customer', 'partner', etc.
  contactCount: number;
}

interface TeamMember {
  id: string;
  displayName: string;
  email: string;
  role: string;                           // 'Admin', 'Editor', 'Viewer'
  avatar?: string;
  userId?: string;                        // Firebase Auth UID
}
```

#### Implementierung

```typescript
async getProjectCreationOptions(
  organizationId: string
): Promise<ProjectCreationOptions> {
  try {
    // 1. Clients laden
    const { companyServiceEnhanced } = await import('./company-service-enhanced');
    const companies = await companyServiceEnhanced.getAll(organizationId);

    // 2. Kontakte laden (für contactCount)
    const { contactsEnhancedService } = await import('./crm-service-enhanced');
    const allContacts = await contactsEnhancedService.getAll(organizationId);

    const availableClients = companies.map(company => ({
      id: company.id!,
      name: company.name,
      type: company.type || 'company',
      contactCount: allContacts.filter(contact => contact.companyId === company.id).length
    }));

    // 3. Team-Members laden
    const { teamMemberEnhancedService } = await import('./team-service-enhanced');
    const members = await teamMemberEnhancedService.getAll(organizationId);

    const availableTeamMembers = members.map(member => ({
      id: member.id!,
      displayName: member.displayName,
      email: member.email,
      role: member.role,
      avatar: member.avatar,
      userId: member.userId
    }));

    // 4. Templates laden (aktuell leer)
    const availableTemplates: ProjectTemplate[] = [];

    // 5. Distribution Lists laden (aktuell leer)
    const availableDistributionLists: any[] = [];

    // 6. Default Settings
    const defaultSettings = {
      defaultPriority: 'medium' as ProjectPriority,
      defaultColor: '#005fab',
      autoCreateCampaign: true
    };

    return {
      availableClients,
      availableTeamMembers,
      availableTemplates,
      availableDistributionLists,
      defaultSettings
    };
  } catch (error) {
    console.error('Fehler beim Laden der Creation Options:', error);
    throw error;
  }
}
```

#### Beispiel

```typescript
// Options beim Wizard-Start laden
useEffect(() => {
  if (isOpen) {
    loadCreationOptions();
  }
}, [isOpen]);

const loadCreationOptions = async () => {
  try {
    setIsLoading(true);
    const options = await projectService.getProjectCreationOptions(organizationId);

    console.log('Verfügbare Clients:', options.availableClients.length);
    console.log('Verfügbare Team-Members:', options.availableTeamMembers.length);

    setCreationOptions(options);
  } catch (error) {
    console.error('Failed to load creation options:', error);
    setError('Optionen konnten nicht geladen werden');
  } finally {
    setIsLoading(false);
  }
};
```

---

### validateProjectData()

Validiert Wizard-Daten für einen bestimmten Step.

#### Signatur

```typescript
async validateProjectData(
  data: ProjectCreationWizardData,
  step: number
): Promise<ValidationResult>
```

#### Parameter

**data: ProjectCreationWizardData**
- Vollständige Wizard-Daten

**step: number**
- Step-Nummer (1-3)
- 1: Projekt-Basis
- 2: Kunde
- 3: Team

#### Returns

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
```

#### Implementierung

```typescript
async validateProjectData(
  data: ProjectCreationWizardData,
  step: number
): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  try {
    switch (step) {
      case 1: // Basis-Informationen
        if (!data.title || data.title.trim().length < 3) {
          errors.title = 'Titel muss mindestens 3 Zeichen lang sein';
        }

        if (!data.clientId) {
          errors.clientId = 'Bitte wählen Sie einen Kunden aus';
        }

        if (!['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
          errors.priority = 'Ungültige Priorität';
        }
        break;

      case 2: // Kunde
        if (!data.clientId) {
          errors.clientId = 'Bitte wählen Sie einen Kunden aus';
        }
        break;

      case 3: // Team (optional, immer valid)
        // Keine Validation erforderlich
        break;

      default:
        errors.step = 'Ungültiger Step';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: { general: error.message || 'Validierung fehlgeschlagen' }
    };
  }
}
```

#### Beispiel

```typescript
// Validation vor Submit
const handleCreateProject = async () => {
  // Validate alle Steps
  for (let step = 1; step <= 3; step++) {
    const validation = await projectService.validateProjectData(wizardData, step);
    if (!validation.isValid) {
      console.error(`Step ${step} Validation Failed:`, validation.errors);
      setError(`Validierung fehlgeschlagen: ${Object.values(validation.errors).join(', ')}`);
      return;
    }
  }

  // Proceed with creation
  const result = await projectService.createProjectFromWizard(wizardData, userId, organizationId);
  // ...
};
```

---

## Type Interfaces

### ProjectCreationWizardData

Vollständige Wizard-Daten für alle 3 Steps.

```typescript
interface ProjectCreationWizardData {
  // Step 1: Projekt-Basis
  title: string;
  description: string;
  priority: ProjectPriority;              // 'low' | 'medium' | 'high' | 'urgent'
  color: string;
  tags: string[];

  // Step 2: Kunde
  clientId: string;

  // Step 3: Team
  assignedTeamMembers: string[];
  projectManager?: string;

  // Optional: Template
  templateId?: string;
  customTasks: ProjectTask[];

  // Optional: Ressourcen
  createCampaignImmediately: boolean;
  campaignTitle?: string;
  initialAssets: string[];
  distributionLists: string[];

  // Wizard State
  completedSteps: number[];
  currentStep: number;
  startDate?: Date;
}
```

### ProjectCreationResult

Ergebnis der Projekt-Erstellung.

```typescript
interface ProjectCreationResult {
  success: boolean;
  projectId: string;
  project: Project;

  // Optional: Erstellte Ressourcen
  campaignId?: string;
  taskIds?: string[];
  folderId?: string;

  // Optional: Fehler
  errors?: string[];                      // Teil-Fehler (nicht kritisch)
  error?: string;                         // Kritischer Fehler
}
```

### ProjectCreationOptions

Verfügbare Optionen für die Projekt-Erstellung.

```typescript
interface ProjectCreationOptions {
  availableClients: Client[];
  availableTeamMembers: TeamMember[];
  availableTemplates: ProjectTemplate[];
  availableDistributionLists: DistributionList[];
  defaultSettings: {
    defaultPriority: ProjectPriority;
    defaultColor: string;
    autoCreateCampaign: boolean;
  };
}
```

### ValidationResult

Ergebnis der Daten-Validierung.

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
```

---

## Error Handling

### Standard Error Response

```typescript
// Bei kritischem Fehler
{
  success: false,
  projectId: '',
  project: {} as Project,
  error: 'Fehler-Beschreibung'
}

// Bei Teil-Fehlern
{
  success: true,
  projectId: 'abc-123',
  project: { /* ... */ },
  campaignId: undefined,  // Kampagne konnte nicht erstellt werden
  errors: ['PR-Kampagne konnte nicht erstellt werden']
}
```

### Error Types

| Error Type | Ursache | Handling |
|------------|---------|----------|
| Validation Error | Ungültige Eingabedaten | Fehler-Message an User |
| Permission Error | Fehlende Berechtigungen | Alert + Redirect |
| Network Error | Firestore nicht erreichbar | Retry + Error Alert |
| Multi-Tenancy Error | OrganizationId fehlt | Critical Error |

### Best Practices

```typescript
// ✅ DO: Comprehensive Error Handling
try {
  const result = await projectService.createProjectFromWizard(wizardData, userId, organizationId);

  if (result.success) {
    // Success Path
    if (result.errors && result.errors.length > 0) {
      // Teil-Fehler loggen (nicht kritisch)
      console.warn('Nicht alle Ressourcen konnten erstellt werden:', result.errors);
    }
    onSuccess(result);
  } else {
    // Error Path
    setError(result.error || 'Unbekannter Fehler');
  }
} catch (error: any) {
  // Exception Path
  setError(error.message || 'Ein unerwarteter Fehler ist aufgetreten.');
} finally {
  setIsLoading(false);
}
```

```typescript
// ❌ DON'T: Unhandled Errors
const result = await projectService.createProjectFromWizard(wizardData, userId, organizationId);
if (result.success) {
  onSuccess(result);
}
// Fehler wird ignoriert!
```

---

## Multi-Tenancy

### Sicherheits-Konzept

Alle API-Methoden sind Multi-Tenancy-fähig und prüfen die OrganizationId:

```typescript
// ✅ Korrekte Multi-Tenancy-Implementierung
async createProjectFromWizard(
  wizardData: ProjectCreationWizardData,
  userId: string,
  organizationId: string  // ← Required Parameter
): Promise<ProjectCreationResult> {
  // OrganizationId wird in ALLE Firestore-Queries eingebunden
  const projectData = {
    ...wizardData,
    organizationId,  // ← Gespeichert im Projekt
    userId
  };

  await addDoc(collection(db, 'projects'), projectData);

  // OrganizationId wird an alle Sub-Services weitergegeben
  if (wizardData.createCampaignImmediately) {
    await prService.create({
      ...campaignData,
      organizationId  // ← Auch in Kampagne
    });
  }
}
```

### Query-Sicherheit

```typescript
// ✅ Sichere Query mit OrganizationId
const q = query(
  collection(db, 'projects'),
  where('organizationId', '==', organizationId),
  where('userId', '==', userId)
);

// ❌ UNSICHER: Keine OrganizationId-Filter
const q = query(
  collection(db, 'projects'),
  where('userId', '==', userId)
);
// ← Nutzer könnte Projekte anderer Organisationen sehen!
```

### Best Practices

1. **Immer OrganizationId übergeben**
   ```typescript
   await projectService.createProjectFromWizard(wizardData, userId, organizationId);
   ```

2. **OrganizationId aus Auth Context holen**
   ```typescript
   const { user, currentOrganization } = useAuth();
   const organizationId = currentOrganization?.id;

   if (!organizationId) {
     throw new Error('Keine Organisation ausgewählt');
   }
   ```

3. **OrganizationId in allen Sub-Calls weitergeben**
   ```typescript
   const options = await projectService.getProjectCreationOptions(organizationId);
   const result = await projectService.createProjectFromWizard(wizardData, userId, organizationId);
   ```

---

## Best Practices

### 1. Daten-Vorbereitung

```typescript
// ✅ DO: Daten vor API-Call validieren
const wizardData: ProjectCreationWizardData = {
  title: formData.title.trim(),           // Trim whitespace
  description: formData.description.trim(),
  priority: formData.priority || 'medium', // Default-Wert
  color: formData.color || '#005fab',
  tags: formData.tags.filter(Boolean),     // Leere Tags filtern
  clientId: formData.clientId,
  assignedTeamMembers: formData.assignedTeamMembers.filter(Boolean),
  projectManager: formData.projectManager || undefined,
  // ...
};

// ❌ DON'T: Rohdaten direkt übergeben
const result = await projectService.createProjectFromWizard(formData, userId, organizationId);
```

### 2. Loading States

```typescript
// ✅ DO: Loading States korrekt verwalten
const [isLoading, setIsLoading] = useState(false);

const handleCreateProject = async () => {
  setIsLoading(true);
  try {
    const result = await projectService.createProjectFromWizard(wizardData, userId, organizationId);
    // ...
  } finally {
    setIsLoading(false);  // ← Immer im finally
  }
};
```

### 3. Optimistic Updates

```typescript
// ✅ DO: Optimistic UI Updates
const handleCreateProject = async () => {
  // 1. Optimistic Update
  const tempProject = {
    id: 'temp-' + Date.now(),
    ...wizardData,
    status: 'creating'
  };
  onOptimisticCreate(tempProject);

  try {
    // 2. Actual API Call
    const result = await projectService.createProjectFromWizard(wizardData, userId, organizationId);

    // 3. Replace mit echtem Projekt
    onReplaceOptimistic(tempProject.id, result.project);
  } catch (error) {
    // 4. Rollback bei Fehler
    onRemoveOptimistic(tempProject.id);
    setError(error.message);
  }
};
```

### 4. Ressourcen-Cleanup

```typescript
// ✅ DO: Cleanup bei Component Unmount
useEffect(() => {
  return () => {
    // Cleanup bei Unmount
    setFormData({ /* reset */ });
    setError(null);
    setCreationResult(null);
  };
}, []);
```

---

## Beispiele

### Beispiel 1: Minimales Projekt (nur Pflichtfelder)

```typescript
const wizardData: ProjectCreationWizardData = {
  // Step 1: Projekt
  title: 'Test Projekt',
  description: '',
  priority: 'medium',
  color: '#005fab',
  tags: [],
  createCampaignImmediately: false,

  // Step 2: Kunde
  clientId: 'client-abc-123',

  // Step 3: Team
  assignedTeamMembers: [],
  projectManager: undefined,

  // Optional
  templateId: undefined,
  customTasks: [],
  initialAssets: [],
  distributionLists: [],
  completedSteps: [1, 2, 3],
  currentStep: 3
};

const result = await projectService.createProjectFromWizard(
  wizardData,
  currentUser.uid,
  currentOrganization.id
);

if (result.success) {
  console.log('Minimales Projekt erstellt:', result.projectId);
}
```

### Beispiel 2: Vollständiges Projekt mit PR-Kampagne

```typescript
const wizardData: ProjectCreationWizardData = {
  // Step 1: Projekt
  title: 'Produktlaunch Q2 2024',
  description: 'Launch unserer neuen Produktlinie mit umfassender PR-Strategie',
  priority: 'high',
  color: '#005fab',
  tags: ['produktlaunch', 'q2-2024'],
  createCampaignImmediately: true,
  campaignTitle: 'Produktlaunch Q2 2024 - PR-Kampagne',

  // Step 2: Kunde
  clientId: 'client-xyz-789',

  // Step 3: Team
  assignedTeamMembers: ['user-1', 'user-2', 'user-3'],
  projectManager: 'user-1',

  // Optional
  templateId: undefined,
  customTasks: [],
  initialAssets: ['asset-1', 'asset-2'],
  distributionLists: ['dist-list-1'],
  completedSteps: [1, 2, 3],
  currentStep: 3
};

const result = await projectService.createProjectFromWizard(
  wizardData,
  currentUser.uid,
  currentOrganization.id
);

if (result.success) {
  console.log('Projekt erstellt:', result.projectId);
  console.log('PR-Kampagne erstellt:', result.campaignId);
  console.log('Projekt-Ordner erstellt:', result.folderId);

  // Navigation zum Projekt
  router.push(`/dashboard/projects/${result.projectId}`);
} else {
  console.error('Fehler:', result.error);
}
```

### Beispiel 3: Options laden und verwenden

```typescript
// 1. Options beim Wizard-Start laden
const [creationOptions, setCreationOptions] = useState<ProjectCreationOptions | null>(null);

useEffect(() => {
  if (isOpen) {
    loadCreationOptions();
  }
}, [isOpen]);

const loadCreationOptions = async () => {
  try {
    setIsLoading(true);
    const options = await projectService.getProjectCreationOptions(organizationId);
    setCreationOptions(options);

    // Auto-select Current User als PM
    if (user?.uid && options.availableTeamMembers.length > 0) {
      const userMember = options.availableTeamMembers.find(
        member => member.userId === user.uid
      );
      if (userMember) {
        setFormData(prev => ({
          ...prev,
          assignedTeamMembers: [userMember.id],
          projectManager: userMember.id
        }));
      }
    }
  } catch (error) {
    console.error('Failed to load creation options:', error);
  } finally {
    setIsLoading(false);
  }
};

// 2. Options in Komponenten verwenden
<ClientSelector
  clients={creationOptions?.availableClients || []}
  selectedClientId={formData.clientId}
  onSelect={(clientId) => setFormData({ ...formData, clientId })}
/>

<TeamMemberMultiSelect
  teamMembers={creationOptions?.availableTeamMembers || []}
  selectedMembers={formData.assignedTeamMembers}
  onSelectionChange={(members) => setFormData({ ...formData, assignedTeamMembers: members })}
/>
```

### Beispiel 4: Validation vor Submit

```typescript
const handleCreateProject = async () => {
  if (!user) {
    setError('Kein Benutzer angemeldet');
    return;
  }

  // 1. Validate alle Steps
  for (let step = 1; step <= 3; step++) {
    const validation = await projectService.validateProjectData(wizardData, step);
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).join(', ');
      setError(`Validierung fehlgeschlagen (Step ${step}): ${errorMessages}`);
      setCurrentStep(step);  // Zurück zum fehlerhaften Step
      return;
    }
  }

  // 2. Create Project
  try {
    setIsLoading(true);
    setError(null);

    const result = await projectService.createProjectFromWizard(
      wizardData,
      user.uid,
      organizationId
    );

    if (result.success) {
      // Success
      setCreationResult(result);
      onSuccess(result);
    } else {
      // Error
      setError(result.error || 'Unbekannter Fehler');
    }
  } catch (error: any) {
    setError(error.message || 'Ein unerwarteter Fehler ist aufgetreten.');
  } finally {
    setIsLoading(false);
  }
};
```

---

## Siehe auch

- [project-creation-service.md](./project-creation-service.md) - Detaillierte Service-Dokumentation
- [../README.md](../README.md) - Modul-Übersicht
- [../components/README.md](../components/README.md) - Komponenten-Dokumentation

---

**Version:** 1.0.0
**Letzte Aktualisierung:** 2025-10-19
**Status:** ✅ Produktionsreif
**Maintainer:** Stefan Kühne
