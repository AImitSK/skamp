# Komponenten-Referenz - Projekt-Erstellung

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Main Wizard](#main-wizard)
3. [Step Components](#step-components)
4. [Navigation Components](#navigation-components)
5. [Shared Components](#shared-components)
6. [Success Dashboard](#success-dashboard)
7. [Props-Referenz](#props-referenz)
8. [Styling Guide](#styling-guide)
9. [Accessibility](#accessibility)

---

## Überblick

Das Projekt-Erstellungs-Modul besteht aus mehreren spezialisierten Komponenten, die zusammen einen vollständigen 3-Step-Wizard bilden.

### Komponenten-Hierarchie

```
ProjectCreationWizard (Main)
├── StepTabs (Navigation)
├── Alert (Error/Warning/Info)
├── ProjectStep (Step 1)
│   ├── Input (Titel)
│   ├── Textarea (Beschreibung)
│   ├── Select (Priorität)
│   ├── TagInput (Tags)
│   └── SimpleSwitch (PR-Kampagne)
├── ClientStep (Step 2)
│   └── ClientSelector
│       ├── SearchInput
│       └── ClientList
├── TeamStep (Step 3)
│   ├── TeamMemberMultiSelect
│   │   ├── SearchInput
│   │   ├── RoleFilter
│   │   └── MemberList
│   └── Select (Projekt-Manager)
├── StepActions (Footer)
│   ├── Button (Zurück)
│   ├── Button (Weiter)
│   ├── Button (Abbrechen)
│   └── Button (Projekt erstellen)
└── CreationSuccessDashboard (Success)
    ├── SuccessAnimation
    ├── ResourcesSummary
    └── QuickActions
```

---

## Main Wizard

### ProjectCreationWizard

**Datei:** `ProjectCreationWizard.tsx` (417 Zeilen)

Der Haupt-Wizard orchestriert alle Steps und verwaltet den gesamten State.

#### Props

```typescript
interface ProjectCreationWizardProps {
  isOpen: boolean;                    // Modal-Sichtbarkeit
  onClose: () => void;                // Modal schließen
  onSuccess: (result: ProjectCreationResult) => void; // Success Callback
  organizationId: string;             // Multi-Tenancy Context
}
```

#### State

```typescript
// Multi-Step State
const [currentStep, setCurrentStep] = useState<WizardStep>(1); // 1 | 2 | 3
const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);

// Form Data State (alle Steps)
const [formData, setFormData] = useState<ProjectCreationFormData>({
  // Step 1: Projekt
  title: '',
  description: '',
  priority: 'medium',
  tags: [],
  createCampaignImmediately: true,

  // Step 2: Kunde
  clientId: '',

  // Step 3: Team
  assignedTeamMembers: [],
  projectManager: ''
});

// API State
const [isLoading, setIsLoading] = useState(false);
const [creationOptions, setCreationOptions] = useState<ProjectCreationOptions | null>(null);
const [creationResult, setCreationResult] = useState<ProjectCreationResult | null>(null);
const [error, setError] = useState<string | null>(null);
const [tags, setTags] = useState<Tag[]>([]);
```

#### Lifecycle Hooks

**1. Modal öffnet → Reset + Load**

```typescript
useEffect(() => {
  if (isOpen) {
    // Reset state when opening
    setCreationResult(null);
    setError(null);
    setCurrentStep(1);
    setCompletedSteps([]);

    // Reset form data
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      tags: [],
      createCampaignImmediately: true,
      clientId: '',
      assignedTeamMembers: [],
      projectManager: ''
    });

    // Load options
    if (!creationOptions) {
      loadCreationOptions();
    }

    if (user?.uid) {
      loadTags();
    }
  }
}, [isOpen, user?.uid]);
```

**2. Options geladen → Auto-select Current User**

```typescript
useEffect(() => {
  if (isOpen && user?.uid && creationOptions?.availableTeamMembers && creationOptions.availableTeamMembers.length > 0) {
    const userMember = creationOptions.availableTeamMembers.find(member =>
      (member as any).userId === user.uid
    );

    if (userMember) {
      setFormData(prev => {
        // Only set if not already set (to avoid infinite loop)
        if (prev.projectManager === '' && prev.assignedTeamMembers.length === 0) {
          return {
            ...prev,
            assignedTeamMembers: [userMember.id],
            projectManager: userMember.id
          };
        }
        return prev;
      });
    }
  }
}, [isOpen, user?.uid, creationOptions]);
```

#### Methods

**loadCreationOptions()**

```typescript
const loadCreationOptions = async () => {
  try {
    setIsLoading(true);
    const options = await projectService.getProjectCreationOptions(organizationId);
    setCreationOptions(options);
  } catch (error) {
    console.error('Failed to load creation options:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**updateFormData()**

```typescript
const updateFormData = (updates: Partial<ProjectCreationFormData>) => {
  setFormData(prev => ({
    ...prev,
    ...updates
  }));
};
```

**Validation**

```typescript
const isStepValid = useMemo(() => {
  switch (currentStep) {
    case 1:
      return formData.title.trim().length >= 3;
    case 2:
      return !!formData.clientId;
    case 3:
      return true; // Team optional
    default:
      return false;
  }
}, [currentStep, formData]);
```

**Navigation**

```typescript
const handleNext = () => {
  if (!isStepValid) return;
  setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
  setCurrentStep((prev) => Math.min(3, prev + 1) as WizardStep);
};

const handlePrevious = () => {
  setCurrentStep((prev) => Math.max(1, prev - 1) as WizardStep);
};

const handleStepChange = (step: WizardStep) => {
  if (completedSteps.includes(step) || step <= currentStep) {
    setCurrentStep(step);
  }
};
```

**Project Creation**

```typescript
const handleCreateProject = async () => {
  if (!user || !isStepValid) return;

  try {
    setIsLoading(true);
    setError(null);

    const wizardData: ProjectCreationWizardData = {
      title: formData.title,
      description: formData.description,
      clientId: formData.clientId,
      priority: formData.priority,
      color: '#005fab',
      tags: formData.tags,
      assignedTeamMembers: formData.assignedTeamMembers,
      projectManager: formData.projectManager || undefined,
      templateId: undefined,
      customTasks: [],
      startDate: undefined,
      createCampaignImmediately: formData.createCampaignImmediately,
      campaignTitle: formData.createCampaignImmediately
        ? `${formData.title} - PR-Kampagne`
        : '',
      initialAssets: [],
      distributionLists: [],
      completedSteps: [1, 2, 3],
      currentStep: 3
    };

    const result = await projectService.createProjectFromWizard(
      wizardData,
      user.uid,
      organizationId
    );

    if (result.success) {
      setCreationResult(result);
      onSuccess(result);
    } else {
      setError(`Projekt konnte nicht erstellt werden: ${result.error}`);
    }
  } catch (error: any) {
    setError(error.message || 'Ein unerwarteter Fehler ist aufgetreten.');
  } finally {
    setIsLoading(false);
  }
};
```

#### Render Structure

```typescript
return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2>Neues Projekt erstellen</h2>
        <button onClick={onClose}>×</button>
      </div>

      {/* Tab Navigation */}
      <StepTabs
        currentStep={currentStep}
        onStepChange={handleStepChange}
        completedSteps={completedSteps}
      />

      {/* Error Alert */}
      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Step Content */}
      <div className="px-6 py-6 h-[500px] overflow-y-auto">
        {currentStep === 1 && <ProjectStep {...} />}
        {currentStep === 2 && <ClientStep {...} />}
        {currentStep === 3 && <TeamStep {...} />}
      </div>

      {/* Actions */}
      <StepActions
        currentStep={currentStep}
        isLoading={isLoading}
        isStepValid={isStepValid}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onCancel={onClose}
        onSubmit={handleCreateProject}
      />
    </div>
  </div>
);
```

---

## Step Components

### ProjectStep (Step 1: Projekt-Basis)

**Datei:** `steps/ProjectStep.tsx` (94 Zeilen)

Sammelt grundlegende Projekt-Informationen.

#### Props

```typescript
interface ProjectStepProps extends BaseStepProps {
  tags: Tag[];
  onCreateTag: (name: string, color: TagColor) => Promise<string>;
}

interface BaseStepProps {
  formData: ProjectCreationFormData;
  onUpdate: (updates: Partial<ProjectCreationFormData>) => void;
  creationOptions: ProjectCreationOptions | null;
}
```

#### Fields

| Feld | Type | Required | Validation | Default |
|------|------|----------|------------|---------|
| title | Input | ✅ Ja | Min 3 Zeichen | '' |
| description | Textarea | ❌ Nein | - | '' |
| priority | Select | ❌ Nein | Enum | 'medium' |
| tags | TagInput | ❌ Nein | - | [] |
| createCampaignImmediately | SimpleSwitch | ❌ Nein | - | true |

#### Render

```typescript
export default function ProjectStep({
  formData,
  onUpdate,
  tags,
  onCreateTag
}: ProjectStepProps) {
  return (
    <FieldGroup>
      {/* Projekt-Titel */}
      <Field>
        <Label>Projekt-Titel *</Label>
        <Input
          type="text"
          required
          value={formData.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="z.B. Produktlaunch Q2 2024"
          autoFocus
        />
        {formData.title.length > 0 && formData.title.length < 3 && (
          <Text className="text-sm text-red-600 mt-1">
            Mindestens 3 Zeichen erforderlich
          </Text>
        )}
      </Field>

      {/* Beschreibung */}
      <Field>
        <Label>Beschreibung</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          placeholder="Kurze Beschreibung des Projekts..."
        />
      </Field>

      {/* Priorität */}
      <Field>
        <Label>Priorität</Label>
        <Select
          value={formData.priority}
          onChange={(e) => onUpdate({ priority: e.target.value as any })}
        >
          <option value="low">Niedrig</option>
          <option value="medium">Mittel</option>
          <option value="high">Hoch</option>
          <option value="urgent">Dringend</option>
        </Select>
      </Field>

      {/* Tags */}
      <Field>
        <Label>Tags</Label>
        <TagInput
          selectedTagIds={formData.tags}
          availableTags={tags}
          onChange={(tagIds) => onUpdate({ tags: tagIds })}
          onCreateTag={onCreateTag}
        />
      </Field>

      {/* PR-Kampagne erstellen */}
      <Field>
        <div className="flex items-center justify-between py-2">
          <div className="flex-1 pr-4">
            <Label>PR-Kampagne erstellen</Label>
            <Text className="text-sm text-gray-600 mt-1">
              Erstellt automatisch eine verknüpfte PR-Kampagne für dieses Projekt.
            </Text>
          </div>
          <SimpleSwitch
            checked={formData.createCampaignImmediately}
            onChange={(checked) => onUpdate({ createCampaignImmediately: checked })}
          />
        </div>
      </Field>
    </FieldGroup>
  );
}
```

---

### ClientStep (Step 2: Kunde-Auswahl)

**Datei:** `steps/ClientStep.tsx` (27 Zeilen)

Wählt den zugeordneten Kunden aus.

#### Props

```typescript
interface BaseStepProps {
  formData: ProjectCreationFormData;
  onUpdate: (updates: Partial<ProjectCreationFormData>) => void;
  creationOptions: ProjectCreationOptions | null;
}
```

#### Render

```typescript
export default function ClientStep({
  formData,
  onUpdate,
  creationOptions
}: BaseStepProps) {
  return (
    <FieldGroup>
      <Field>
        <Label>Kunde auswählen *</Label>
        <ClientSelector
          clients={creationOptions?.availableClients || []}
          selectedClientId={formData.clientId}
          onSelect={(clientId) => onUpdate({ clientId })}
        />
      </Field>
    </FieldGroup>
  );
}
```

---

### TeamStep (Step 3: Team-Zuordnung)

**Datei:** `steps/TeamStep.tsx` (70 Zeilen)

Ordnet Team-Mitglieder und Projekt-Manager zu.

#### Props

```typescript
interface BaseStepProps {
  formData: ProjectCreationFormData;
  onUpdate: (updates: Partial<ProjectCreationFormData>) => void;
  creationOptions: ProjectCreationOptions | null;
}
```

#### Auto-Logic

```typescript
const handleTeamMemberChange = (members: string[]) => {
  onUpdate({ assignedTeamMembers: members });

  // Auto-select current user as project manager if they are in the team
  if (user?.uid && members.includes(user.uid) && !formData.projectManager) {
    const userMember = creationOptions?.availableTeamMembers?.find(member =>
      member.id.includes(user.uid)
    );
    if (userMember) {
      onUpdate({ projectManager: userMember.id });
    }
  }

  // Clear project manager if they are no longer in the team
  if (formData.projectManager && !members.some(selectedId =>
    formData.projectManager === selectedId || formData.projectManager.includes(selectedId)
  )) {
    onUpdate({ projectManager: '' });
  }
};
```

#### Render

```typescript
export default function TeamStep({
  formData,
  onUpdate,
  creationOptions
}: BaseStepProps) {
  const { user } = useAuth();

  return (
    <FieldGroup>
      {/* Team-Mitglieder */}
      <Field>
        <Label>Team-Mitglieder</Label>
        <TeamMemberMultiSelect
          teamMembers={creationOptions?.availableTeamMembers || []}
          selectedMembers={formData.assignedTeamMembers}
          onSelectionChange={handleTeamMemberChange}
        />
      </Field>

      {/* Projekt-Manager / Besitzer */}
      <Field>
        <Label>Projekt-Manager / Besitzer</Label>
        <Select
          value={formData.projectManager}
          onChange={(e) => onUpdate({ projectManager: e.target.value })}
        >
          <option value="">-- Bitte wählen --</option>
          {creationOptions?.availableTeamMembers?.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName} ({member.role})
              {user?.uid && member.id.includes(user.uid) ? ' (Sie)' : ''}
            </option>
          ))}
        </Select>
      </Field>
    </FieldGroup>
  );
}
```

---

## Navigation Components

### StepTabs

**Datei:** `components/StepTabs.tsx` (87 Zeilen)

Tab-Navigation für die 3 Wizard-Steps.

#### Props

```typescript
interface StepTabsProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  completedSteps: number[];
  stepLabels?: string[];         // Optional custom labels
  allowAllSteps?: boolean;       // Edit-Modus: Alle Steps klickbar
}
```

#### Step Configs

```typescript
const DEFAULT_STEP_CONFIGS: StepConfig[] = [
  { id: 1, label: 'Projekt', icon: RocketLaunchIcon },
  { id: 2, label: 'Kunde', icon: BuildingOfficeIcon },
  { id: 3, label: 'Team', icon: UserGroupIcon }
];
```

#### Render

```typescript
export function StepTabs({
  currentStep,
  onStepChange,
  completedSteps,
  stepLabels,
  allowAllSteps = false
}: StepTabsProps) {
  const stepConfigs = stepLabels
    ? stepLabels.map((label, index) => ({
        id: index + 1,
        label,
        icon: DEFAULT_STEP_ICONS[index] || RocketLaunchIcon
      }))
    : DEFAULT_STEP_CONFIGS;

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
        {stepConfigs.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          const isClickable = allowAllSteps || isCompleted || step.id <= currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => isClickable && onStepChange(step.id)}
              disabled={!isClickable}
              className={clsx(
                'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium',
                isActive
                  ? 'border-[#005fab] text-[#005fab]'
                  : isClickable
                  ? 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
                  : 'border-transparent text-gray-400 cursor-not-allowed'
              )}
            >
              <Icon className={clsx('mr-2 h-5 w-5', /* ... */)} />
              {step.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

---

### StepActions

**Datei:** `components/StepActions.tsx` (119 Zeilen)

Footer-Actions für Navigation und Submission.

#### Props

```typescript
interface StepActionsProps {
  currentStep: number;
  totalSteps?: number;              // Default: 3
  isLoading: boolean;
  isStepValid: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;             // Default: 'Projekt erstellen'
  showSubmitOnAllSteps?: boolean;   // Edit-Modus
}
```

#### Render

```typescript
export function StepActions({
  currentStep,
  totalSteps = 3,
  isLoading,
  isStepValid,
  onPrevious,
  onNext,
  onCancel,
  onSubmit,
  submitLabel = 'Projekt erstellen',
  showSubmitOnAllSteps = false
}: StepActionsProps) {
  const isLastStep = currentStep === totalSteps;
  const showSubmitButton = showSubmitOnAllSteps || isLastStep;

  return (
    <div className="flex justify-between px-6 py-4 border-t border-gray-200">
      {/* Zurück Button (nur ab Step 2) */}
      {currentStep > 1 && (
        <Button
          type="button"
          color="secondary"
          onClick={onPrevious}
          disabled={isLoading}
        >
          Zurück
        </Button>
      )}

      {/* Right Actions */}
      <div className={clsx('flex gap-3', currentStep === 1 && 'ml-auto')}>
        <Button
          type="button"
          color="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Abbrechen
        </Button>

        {/* Weiter / Projekt erstellen */}
        {currentStep < totalSteps ? (
          <Button
            type="button"
            onClick={onNext}
            disabled={!isStepValid || isLoading}
          >
            Weiter
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? `${submitLabel}...` : submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## Shared Components

### ClientSelector

**Datei:** `ClientSelector.tsx`

Kunde-Auswahl mit Suche und Filterung.

#### Props

```typescript
interface ClientSelectorProps {
  clients: Client[];
  selectedClientId: string;
  onSelect: (clientId: string) => void;
}

interface Client {
  id: string;
  name: string;
  type: string;          // 'customer', 'partner', etc.
  contactCount: number;
}
```

#### Features

- Suchfunktion (Name + Typ)
- Sortierung nach Recent (contactCount)
- Visuelle Hervorhebung der Auswahl
- Empty State
- Company Type Translation (Deutsch)

#### Type Translation

```typescript
function getCompanyTypeLabel(type: string): string {
  const translations: Record<string, string> = {
    'customer': 'Kunde',
    'supplier': 'Lieferant',
    'partner': 'Partner',
    'publisher': 'Verlag',
    'media_house': 'Medienhaus',
    'agency': 'Agentur',
    'enterprise': 'Unternehmen',
    'startup': 'Start-up',
    'other': 'Sonstiges'
  };
  return translations[type] || type;
}
```

---

### TeamMemberMultiSelect

**Datei:** `TeamMemberMultiSelect.tsx`

Team-Mitglieder Multi-Select mit Gruppen und Suche.

#### Props

```typescript
interface TeamMemberMultiSelectProps {
  teamMembers: TeamMember[];
  selectedMembers: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

interface TeamMember {
  id: string;
  displayName: string;
  email: string;
  role: string;          // 'Admin', 'Editor', 'Viewer'
  avatar?: string;
}
```

#### Features

- Multi-Select mit Checkboxen
- Gruppierung nach Rolle
- Suchfunktion (Name, Email, Rolle)
- Filter nach Rolle
- Avatar-Anzeige
- Empty State

---

### Alert Component

**Datei:** Inline in `ProjectCreationWizard.tsx`

Wiederverwendbare Alert-Komponente.

#### Props

```typescript
interface AlertProps {
  type?: 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onDismiss?: () => void;
}
```

#### Styles

```typescript
const styles = {
  error: 'bg-red-50 text-red-700',
  warning: 'bg-yellow-50 text-yellow-700',
  info: 'bg-blue-50 text-blue-700'
};

const icons = {
  error: ExclamationTriangleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon
};
```

---

## Success Dashboard

### CreationSuccessDashboard

**Datei:** `CreationSuccessDashboard.tsx`

Success-Ansicht nach erfolgreicher Projekt-Erstellung.

#### Props

```typescript
interface CreationSuccessDashboardProps {
  result: ProjectCreationResult;
  onClose: () => void;
  onGoToProject: (projectId: string) => void;
}
```

#### Features

- Animated Success Icon mit Sparkles
- Übersicht über erstellte Ressourcen
- Quick Actions (Zum Projekt, Modal schließen)
- Visuelle Darstellung aller Ressourcen

#### Render Structure

```typescript
return (
  <div className="max-w-4xl mx-auto">
    {/* Success Animation Header */}
    <div className="text-center py-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
        <CheckCircleIcon className="w-12 h-12 text-white" />
      </div>
      <h2>Projekt erfolgreich erstellt! 🎉</h2>
      <p>Ihr Projekt "{result.project.title}" ist bereit</p>
    </div>

    {/* Created Resources Summary */}
    <div className="p-6 bg-white">
      <h3>Erstellte Ressourcen</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Projekt */}
        <ResourceCard icon={RocketLaunchIcon} title="Projekt erstellt" {...} />

        {/* Kampagne */}
        {result.campaignId && (
          <ResourceCard icon={SpeakerWaveIcon} title="PR-Kampagne erstellt" {...} />
        )}

        {/* Team */}
        {result.project.assignedTo && result.project.assignedTo.length > 0 && (
          <ResourceCard icon={UserGroupIcon} title="Team zugeordnet" {...} />
        )}

        {/* Ordner */}
        <ResourceCard icon={FolderIcon} title="Projekt-Ordner erstellt" {...} />
      </div>
    </div>

    {/* Quick Actions */}
    <div className="flex justify-end gap-3 p-6 bg-gray-50 rounded-b-lg">
      <Button color="secondary" onClick={onClose}>
        Schließen
      </Button>
      <Button onClick={handleGoToProject}>
        Zum Projekt
      </Button>
    </div>
  </div>
);
```

---

## Props-Referenz

### ProjectCreationFormData

Zentrale Form-Daten für alle Steps.

```typescript
interface ProjectCreationFormData {
  // Step 1: Projekt
  title: string;
  description: string;
  priority: ProjectPriority;              // 'low' | 'medium' | 'high' | 'urgent'
  tags: string[];
  createCampaignImmediately: boolean;

  // Step 2: Kunde
  clientId: string;

  // Step 3: Team
  assignedTeamMembers: string[];
  projectManager: string;
}
```

### WizardStep

Step-Typisierung.

```typescript
type WizardStep = 1 | 2 | 3;
```

### StepConfig

Step-Konfiguration für Tabs.

```typescript
interface StepConfig {
  id: WizardStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
```

---

## Styling Guide

### CeleroPress Design System

Alle Komponenten folgen dem CeleroPress Design System:

**Farben:**
- Primary: `#005fab` (CeleroPress Blau)
- Success: `bg-green-500`
- Error: `bg-red-50 text-red-700`
- Warning: `bg-yellow-50 text-yellow-700`
- Info: `bg-blue-50 text-blue-700`

**Icons:**
- Nur Heroicons `/24/outline`
- Konsistente Icon-Größen: `w-5 h-5` (Standard), `w-6 h-6` (Header)

**Spacing:**
- Container-Padding: `px-6 py-4`
- Gap zwischen Elementen: `gap-3` oder `gap-4`
- Step-Content-Height: `h-[500px]`

**Buttons:**
```typescript
<Button color="primary">Primary Action</Button>
<Button color="secondary">Secondary Action</Button>
<Button disabled={isLoading}>Loading...</Button>
```

---

## Accessibility

### ARIA-Labels

```typescript
// Tab Navigation
<nav aria-label="Tabs">
  <button aria-current={isActive ? 'page' : undefined}>
    Step 1
  </button>
</nav>

// Form Fields
<Label>Projekt-Titel *</Label>
<Input
  type="text"
  required
  aria-required="true"
  aria-invalid={hasError}
/>

// Loading States
<Button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? 'Lädt...' : 'Speichern'}
</Button>
```

### Keyboard Navigation

- **Tab**: Fokus auf nächstes Feld
- **Shift+Tab**: Fokus auf vorheriges Feld
- **Enter**: Submit/Weiter (wenn valid)
- **Escape**: Modal schließen

### Screen Reader Support

```typescript
// SR-Only Text
<span className="sr-only">Schließen</span>

// Icon-Only Buttons
<button aria-label="Schließen">
  <XMarkIcon className="w-5 h-5" />
</button>
```

---

## Siehe auch

- [../README.md](../README.md) - Modul-Übersicht
- [../api/README.md](../api/README.md) - API-Referenz
- [../adr/README.md](../adr/README.md) - Architektur-Entscheidungen
- [CeleroPress Design System](../../../../design-system/DESIGN_SYSTEM.md)

---

**Version:** 1.0.0
**Letzte Aktualisierung:** 2025-10-19
**Status:** ✅ Produktionsreif
**Maintainer:** Stefan Kühne
