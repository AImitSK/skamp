// src/types/project.ts - Basis-Projekt-Types für Pipeline-Integration
import { Timestamp } from 'firebase/firestore';
import type { ProjectMilestone } from './pr';

// ✅ Pipeline-Stage direkt hier definieren für bessere Type-Sicherheit
export type PipelineStage = 
  | 'ideas_planning'      // Ideen & Planung
  | 'creation'           // Erstellung-Phase
  | 'internal_approval'  // Interne Freigabe
  | 'customer_approval'  // Kunden-Freigabe
  | 'distribution'       // Verteilung-Phase
  | 'monitoring'         // Monitoring-Phase
  | 'completed';         // Abgeschlossen

// Legacy Stage-Namen für Rückwärtskompatibilität in Tests
export type LegacyPipelineStage = 
  | 'planning'           // Legacy: maps to 'ideas_planning'
  | 'review'             // Legacy: maps to 'internal_approval'  
  | 'approval'           // Legacy: maps to 'customer_approval'

export interface Project {
  id?: string;
  userId: string;
  organizationId: string;
  
  // Projekt-Details
  title: string;
  description?: string;
  status: ProjectStatus;
  currentStage: PipelineStage;
  
  // Kunde/Auftraggeber
  customer?: {
    id: string;
    name: string;
  };
  
  // Budget
  budget?: number;
  currency?: string;
  
  // Verknüpfte Kampagnen
  linkedCampaigns?: string[];
  
  // Meilensteine
  milestones?: ProjectMilestone[];
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  
  // Team
  assignedTo?: string[];
  
  // ========================================
  // PLAN 6/9: MEDIA-ASSETS-INTEGRATION
  // ========================================
  
  // Projekt-weite Asset-Integration
  mediaConfig?: {
    allowAssetSharing: boolean; // Assets zwischen Kampagnen teilen
    assetLibraryId?: string;    // Projekt-spezifische Asset-Library
    defaultFolder?: string;     // Standard-Ordner für neue Assets
    assetNamingPattern?: string; // Naming-Convention
    assetRetentionDays?: number; // Asset-Aufbewahrung
  };
  
  // Aggregierte Asset-Daten (Performance-Optimierung)
  assetSummary?: {
    totalAssets: number;
    assetsByType: Record<string, number>; // {'image': 15, 'pdf': 3}
    lastAssetAdded?: Timestamp;
    storageUsed: number; // in Bytes
    topAssets: Array<{ assetId: string; fileName: string; usage: number }>;
  };
  
  // Asset-Library Verknüpfung
  sharedAssets?: any[]; // CampaignAssetAttachment[]
  assetFolders?: Array<{
    folderId: string;
    folderName: string;
    assetCount: number;
    lastModified: Timestamp;
  }>;
  
  // ========================================
  // PLAN 8/9: PIPELINE-TASK-INTEGRATION
  // ========================================
  
  // Pipeline-Workflow-Konfiguration
  workflowConfig?: {
    autoStageTransition: boolean;       // Automatische Stage-Übergänge
    requireAllCriticalTasks: boolean;   // Alle kritischen Tasks für Übergang erforderlich
    enableTaskDependencies: boolean;   // Task-Abhängigkeiten aktiviert
    notifyOnStageTransition: boolean;   // Benachrichtigungen bei Übergängen
    
    // Custom Workflow Rules
    customTransitionRules?: Array<{
      fromStage: PipelineStage;
      toStage: PipelineStage;
      requiresApproval: boolean;
      approvers: string[];
      customChecks?: string[];          // Custom validation functions
    }>;
  };
  
  // Fortschritts-Tracking
  progress?: {
    overallPercent: number;
    stageProgress: Record<PipelineStage, number>;
    taskCompletion: number;             // % abgeschlossene Tasks
    criticalTasksRemaining: number;
    lastUpdated: Timestamp;
    
    // Milestone Tracking
    milestones: Array<{
      percent: number;
      achievedAt?: Timestamp;
      notificationSent: boolean;
    }>;
  };
  
  // Workflow-Status
  workflowState?: {
    currentTransition?: {
      fromStage: PipelineStage;
      toStage: PipelineStage;
      startedAt: Timestamp;
      blockedBy: string[];              // Task IDs die Übergang blockieren
      status: 'in_progress' | 'blocked' | 'waiting_approval';
    };
    
    stageHistory: Array<{
      stage: PipelineStage;
      enteredAt: Timestamp;
      completedAt?: Timestamp;
      triggeredBy: 'manual' | 'automatic' | 'task_completion';
      triggerUser?: string;
    }>;
    
    lastIntegrityCheck?: Timestamp;
    integrityIssues?: string[];         // Aktuelle Integritäts-Probleme
  };
  
  // ========================================
  // PLAN 9/9: PROJEKT-ANLAGE-WIZARD
  // ========================================
  
  // Creation-Kontext für Wizard-erstellte Projekte
  creationContext?: {
    createdViaWizard: boolean;
    templateId?: string;
    templateName?: string;
    wizardVersion: string;
    stepsCompleted: string[];
    initialConfiguration: {
      autoCreateCampaign: boolean;
      autoAssignAssets: boolean;
      autoCreateTasks: boolean;
      selectedTemplate?: string;
    };
  };
  
  // Setup-Status für Wizard-Nachverfolgung
  setupStatus?: {
    campaignLinked: boolean;
    assetsAttached: boolean;
    tasksCreated: boolean;
    teamNotified: boolean;
    initialReviewComplete: boolean;
  };
  
  // Template-basierte Konfiguration
  templateConfig?: {
    appliedTemplateId: string;
    templateVersion: string;
    customizations: Record<string, any>;
    inheritedTasks: string[];
    inheritedDeadlines: string[];
  };

  // ========================================
  // PLAN 7/9: KOMMUNIKATIONS-FEATURES
  // ========================================
  
  // Kommunikations-Konfiguration
  communicationConfig?: {
    enableAutoProjectDetection: boolean;
    confidenceThreshold: number; // Min. Konfidenz für automatische Zuordnung
    notificationSettings: {
      newEmailAlert: boolean;
      urgentEmailAlert: boolean;
      customerResponseAlert: boolean;
    };
    autoResponseRules: Array<{
      trigger: string; // E-Mail-Typ der Rule triggert
      template: string;
      enabled: boolean;
    }>;
  };
  
  // Aggregierte Kommunikations-Daten (Performance-Optimierung)
  communicationSummary?: {
    totalEmails: number;
    unreadEmails: number;
    pendingApprovals: number;
    lastActivity?: Timestamp;
    mostActiveContact?: {
      email: string;
      name?: string;
    };
    avgResponseTime?: number; // in Stunden
  };
}

export type ProjectStatus = 
  | 'active'
  | 'on_hold' 
  | 'completed'
  | 'cancelled';

export interface ProjectFilters {
  status?: ProjectStatus;
  currentStage?: PipelineStage;
  customerId?: string;
  monitoringStatus?: 'not_started' | 'active' | 'completed' | 'paused';
}

// ========================================
// PLAN 5/9: MONITORING-IMPLEMENTIERUNG
// ========================================

// Erweiterte Project Interface für Monitoring
export interface ProjectWithMonitoring extends Project {
  // Monitoring-Phase Konfiguration
  monitoringConfig?: {
    isEnabled: boolean;
    monitoringPeriod: 30 | 90 | 365; // Tage
    autoTransition: boolean;
    providers: MonitoringProvider[];
    alertThresholds: {
      minReach: number;
      sentimentAlert: number; // -1 bis 1, bei unterschreitung Alert
      competitorMentions: number;
    };
    reportSchedule: 'daily' | 'weekly' | 'monthly';
  };
  
  // Analytics Daten
  analytics?: ProjectAnalytics;
  
  // Monitoring Status
  monitoringStatus?: 'not_started' | 'active' | 'completed' | 'paused';
  monitoringStartedAt?: Timestamp;
  monitoringCompletedAt?: Timestamp;
}

export interface ProjectAnalytics {
  projectId: string;
  organizationId: string;
  
  // Core-KPIs
  totalReach: number;
  mediaValue: number; // Berechneter Medienwert in EUR
  clippingCount: number;
  sentimentScore: number; // -1 bis 1
  
  // Outlet-Analyse
  topOutlets: MediaOutlet[];
  
  // Timeline-Daten
  timelineData: AnalyticsTimeline[];
  
  // Wettbewerbs-Benchmarks (optional)
  competitorBenchmarks?: BenchmarkData;
  
  // Performance Metriken
  shareOfVoice?: number; // 0-100 Prozent
  earnedMediaValue?: number; // Berechneter EMV
  engagementRate?: number; // Social Media Engagement
  messagePullThrough?: number; // Wie oft Key-Messages erwähnt wurden (0-100)
  
  // Zeitstempel
  lastUpdated: Timestamp;
  dataCollectionStarted: Timestamp;
  dataCollectionEnded?: Timestamp;
}

export interface AnalyticsTimeline {
  date: Timestamp;
  dailyReach: number;
  dailyClippings: number;
  dailySentiment: number; // Durchschnitt für den Tag
  cumulativeReach: number;
  cumulativeMediaValue: number;
}

export interface MediaOutlet {
  name: string;
  clippingCount: number;
  totalReach: number;
  averageSentiment: number;
  mediaValue: number;
  tier: 'tier1' | 'tier2' | 'tier3' | 'niche';
  
  // Outlet-Details
  type?: 'print' | 'online' | 'tv' | 'radio' | 'podcast' | 'social';
  country?: string;
  language?: string;
}

export interface BenchmarkData {
  industryAverage?: {
    reachPerCampaign: number;
    sentimentScore: number;
    clippingsPerCampaign: number;
    mediaValuePerCampaign: number;
  };
  
  competitorData?: Array<{
    competitorName?: string; // Optional anonymisiert
    reach: number;
    sentiment: number;
    clippings: number;
    mediaValue: number;
    period: { from: Timestamp; to: Timestamp };
  }>;
  
  historicalComparison?: {
    previousCampaigns: Array<{
      campaignId?: string;
      campaignName?: string;
      reach: number;
      sentiment: number;
      clippings: number;
      mediaValue: number;
      period: { from: Timestamp; to: Timestamp };
    }>;
  };
}

export interface MonitoringProvider {
  name: 'landau' | 'pmg' | 'custom';
  apiEndpoint: string;
  isEnabled: boolean;
  lastSync?: Timestamp;
  supportedMetrics: Array<'reach' | 'sentiment' | 'mentions' | 'social'>;
  
  // Authentifizierung
  auth?: {
    type: 'api_key' | 'oauth' | 'basic';
    credentials?: Record<string, string>; // Encrypted storage
  };
  
  // Rate Limiting
  rateLimits?: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

// Analytics Dashboard Konfiguration
export interface AnalyticsDashboard {
  projectId: string;
  organizationId: string;
  
  // Dashboard-Layout
  layout: {
    widgets: Array<{
      id: string;
      type: 'kpi_card' | 'timeline_chart' | 'outlet_ranking' | 'sentiment_distribution' | 'competitor_comparison';
      position: { x: number; y: number; w: number; h: number };
      config?: Record<string, any>;
    }>;
  };
  
  // Filter-Einstellungen
  defaultFilters: {
    dateRange: { from: Timestamp; to: Timestamp };
    outlets?: string[];
    sentimentRange?: { min: number; max: number };
    mediaTypes?: Array<'print' | 'online' | 'tv' | 'radio' | 'social'>;
  };
  
  // Export-Konfiguration
  exportConfig: {
    formats: Array<'pdf' | 'excel' | 'powerpoint'>;
    includeCharts: boolean;
    includeClippings: boolean;
    branding: {
      logo?: string;
      colors?: { primary: string; secondary: string };
      companyName?: string;
    };
  };
  
  // Automatische Reports
  scheduledReports?: Array<{
    id: string;
    name: string;
    schedule: 'daily' | 'weekly' | 'monthly';
    recipients: string[]; // E-Mail-Adressen
    format: 'pdf' | 'excel';
    lastSent?: Timestamp;
    isActive: boolean;
  }>;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// PLAN 6/9: MEDIA-ASSETS-INTEGRATION
// ========================================

// Project Asset Validation für Asset-Management
export interface ProjectAssetValidation {
  projectId: string;
  totalAssets: number;
  validAssets: number;
  missingAssets: number;
  outdatedAssets: number;
  validationDetails: Array<{
    campaignId: string;
    campaignTitle: string;
    assetIssues: any; // AssetValidationResult from pr.ts
  }>;
}

// ========================================
// PLAN 9/9: WIZARD-SPECIFIC INTERFACES
// ========================================

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Wizard Data Interface
export interface ProjectCreationWizardData {
  // Step 1: Basis-Informationen
  title: string;
  description?: string;
  clientId: string;
  priority: ProjectPriority;
  color?: string;
  tags: string[];
  
  // Step 2: Team & Verantwortung
  assignedTeamMembers: string[];
  projectManager?: string;
  
  // Step 3: Template & Setup
  templateId?: string;
  customTasks?: Omit<ProjectTask, 'id'>[];
  startDate?: Date;
  
  // Step 4: Sofortige Aktionen
  createCampaignImmediately: boolean;
  campaignTitle?: string;
  initialAssets: string[];
  distributionLists: string[];
  
  // Wizard-Meta
  completedSteps: number[];
  currentStep: number;
}

// Project Creation Result
export interface ProjectCreationResult {
  success: boolean;
  projectId: string;
  project: Project;
  
  // Optional erstellte Ressourcen
  campaignId?: string;
  campaign?: any; // PRCampaign
  tasksCreated: string[];
  assetsAttached: number;
  
  // Feedback
  warnings: string[];
  infos: string[];
  nextSteps: string[];
}

// Project Creation Options für Wizard
export interface ProjectCreationOptions {
  availableClients: Array<{
    id: string;
    name: string;
    type: string;
    contactCount: number;
  }>;
  
  availableTeamMembers: Array<{
    id: string;
    displayName: string;
    email: string;
    role: string;
    avatar?: string;
  }>;
  
  availableTemplates: Array<{
    id: string;
    name: string;
    description: string;
    taskCount: number;
    category: string;
  }>;
  
  availableDistributionLists: Array<{
    id: string;
    name: string;
    contactCount: number;
  }>;
}

// Validation Result
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Resource Initialization
export interface ResourceInitializationOptions {
  createCampaign: boolean;
  campaignTitle?: string;
  attachAssets: string[];
  linkDistributionLists: string[];
  createTasks: boolean;
  notifyTeam: boolean;
}

export interface ResourceInitializationResult {
  campaignCreated: boolean;
  campaignId?: string;
  assetsAttached: number;
  listsLinked: number;
  tasksGenerated: number;
  teamNotified: boolean;
  errors?: string[];
}

// Project Task Interface für Template System
export interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  stage: PipelineStage;
  priority: TaskPriority;
  assignedTo?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  requiredForStageCompletion: boolean;
  dependencies?: string[]; // Task IDs
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Project Template Interface
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'standard' | 'custom' | 'industry';
  
  // Template-Konfiguration
  defaultTasks: Array<{
    title: string;
    category: string;
    stage: PipelineStage;
    priority: TaskPriority;
    daysAfterStart: number;
    assignmentRule?: 'project_manager' | 'team_lead' | 'auto';
    requiredForStageCompletion: boolean;
  }>;
  
  defaultDeadlines: Array<{
    title: string;
    stage: PipelineStage;
    daysAfterStart: number;
    type: 'milestone' | 'deadline' | 'reminder';
  }>;
  
  defaultConfiguration: {
    autoCreateCampaign: boolean;
    defaultPriority: ProjectPriority;
    recommendedTeamSize: number;
    estimatedDuration: number; // in days
  };
  
  // Metadaten
  usageCount: number;
  organizationId?: string; // null für Standard-Templates
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Template Application Result
export interface TemplateApplicationResult {
  success: boolean;
  tasksCreated: string[];
  deadlinesCreated: string[];
  configurationApplied: Record<string, any>;
  errors?: string[];
}

// Template Creation Data
export interface CreateTemplateData {
  name: string;
  description: string;
  category: 'custom' | 'industry';
  defaultTasks: ProjectTemplate['defaultTasks'];
  defaultDeadlines: ProjectTemplate['defaultDeadlines'];
  defaultConfiguration: ProjectTemplate['defaultConfiguration'];
}