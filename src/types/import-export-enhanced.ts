// src/types/import-export-enhanced.ts

import { 
  ImportOptions,
  ExportOptions, 
  ImportResult,
  ExportResult,
  ImportProgress,
  ExportProgress,
  FieldMapping,
  ValidationResult,
  DuplicateReport,
  ParsedData,
  MappedData,
  DataSource,
  ExportFormat,
  ImportMode,
  BackupResult,
  RestoreResult
} from './import-export';

// ==========================================
// UI STATE MANAGEMENT
// ==========================================

export interface ImportWizardState {
  // Step tracking
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  isComplete: boolean;
  
  // File handling
  uploadedFile: File | null;
  fileValidation: ValidationResult | null;
  parsedData: ParsedData | null;
  
  // Configuration
  importOptions: Partial<ImportOptions>;
  fieldMapping: FieldMapping | null;
  duplicateReport: DuplicateReport | null;
  
  // Execution
  isImporting: boolean;
  importProgress: ImportProgress | null;
  importResult: ImportResult | null;
  
  // UI state
  errors: string[];
  warnings: string[];
  isLoading: boolean;
}

export interface ExportWizardState {
  // Step tracking
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  isComplete: boolean;
  
  // Configuration
  exportOptions: Partial<ExportOptions>;
  estimatedSize: number;
  estimatedDuration: number;
  
  // Preview
  previewData: any[] | null;
  recordCount: number;
  
  // Execution
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  exportResult: ExportResult | null;
  
  // UI state
  errors: string[];
  warnings: string[];
  isLoading: boolean;
}

// ==========================================
// WIZARD STEP COMPONENTS
// ==========================================

export interface WizardStepProps {
  isActive: boolean;
  isCompleted: boolean;
  canProgress: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
}

export interface ImportStepProps extends WizardStepProps {
  state: ImportWizardState;
  updateState: (updates: Partial<ImportWizardState>) => void;
}

export interface ExportStepProps extends WizardStepProps {
  state: ExportWizardState;
  updateState: (updates: Partial<ExportWizardState>) => void;
}

// ==========================================
// FILE UPLOAD COMPONENT
// ==========================================

export interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  acceptedTypes: string[];
  maxSize: number;
  currentFile?: File | null;
  isValidating?: boolean;
  validationResult?: ValidationResult | null;
  disabled?: boolean;
}

export interface FileUploadState {
  isDragOver: boolean;
  isUploading: boolean;
  uploadProgress: number;
  file: File | null;
  error: string | null;
  validation: ValidationResult | null;
}

// ==========================================
// PROGRESS TRACKING
// ==========================================

export interface ProgressTrackerProps {
  progress: ImportProgress | ExportProgress;
  canCancel?: boolean;
  onCancel?: () => void;
  onMinimize?: () => void;
  showDetails?: boolean;
}

export interface ProgressState {
  isVisible: boolean;
  isMinimized: boolean;
  canCancel: boolean;
  showDetails: boolean;
  estimatedTimeRemaining?: number;
  throughputStats?: {
    recordsPerSecond: number;
    averageRecordSize: number;
  };
}

// ==========================================
// DATA PREVIEW COMPONENTS
// ==========================================

export interface DataPreviewProps {
  data: any[];
  maxRows?: number;
  showHeaders?: boolean;
  highlightErrors?: boolean;
  errorRows?: number[];
  onRowClick?: (row: any, index: number) => void;
}

export interface DataPreviewState {
  currentPage: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  filter: string;
  selectedRows: Set<number>;
}

// ==========================================
// FIELD MAPPING INTERFACE
// ==========================================

export interface MappingInterfaceProps {
  sourceFields: string[];
  targetFields: TargetFieldDefinition[];
  currentMapping: FieldMapping;
  sampleData: Record<string, any>[];
  onMappingChange: (mapping: FieldMapping) => void;
  onValidate: () => Promise<ValidationResult>;
}

export interface TargetFieldDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'currency' | 'address';
  required: boolean;
  description?: string;
  example?: string;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface MappingRule {
  sourceField: string;
  targetField: string;
  confidence: number; // 0-1, how confident the auto-mapping is
  isAutoMapped: boolean;
  isRequired: boolean;
  hasValidation: boolean;
  sampleValues: string[];
  transformer?: FieldTransformerConfig;
}

export interface FieldTransformerConfig {
  type: string;
  options: Record<string, any>;
  preview?: string; // Preview of transformed value
}

// ==========================================
// VALIDATION RESULTS DISPLAY
// ==========================================

export interface ValidationResultsProps {
  validation: ValidationResult;
  showWarnings?: boolean;
  maxErrors?: number;
  onErrorClick?: (error: any) => void;
  onFixSuggestion?: (error: any) => void;
}

export interface ValidationDisplayState {
  showErrors: boolean;
  showWarnings: boolean;
  errorFilter: string;
  groupBy: 'field' | 'type' | 'severity';
  expandedGroups: Set<string>;
}

// ==========================================
// DUPLICATE HANDLING
// ==========================================

export interface DuplicateReviewProps {
  duplicates: DuplicateReport;
  onDecision: (duplicateId: string, action: 'skip' | 'update' | 'merge' | 'create') => void;
  onBulkDecision: (action: 'skip' | 'update' | 'merge' | 'create') => void;
  showMergeOptions?: boolean;
}

export interface DuplicateDisplayItem {
  id: string;
  importRecord: any;
  existingRecord: any;
  similarity: number;
  matchedFields: string[];
  suggestedAction: 'skip' | 'update' | 'merge' | 'create';
  userDecision?: 'skip' | 'update' | 'merge' | 'create';
  conflicts: FieldConflict[];
}

export interface FieldConflict {
  field: string;
  importValue: any;
  existingValue: any;
  canMerge: boolean;
  suggestedValue?: any;
}

// ==========================================
// RESULTS SUMMARY
// ==========================================

export interface ResultsSummaryProps {
  result: ImportResult | ExportResult;
  type: 'import' | 'export';
  onDownload?: () => void;
  onViewDetails?: () => void;
  onNewOperation?: () => void;
  onRollback?: () => void; // Only for imports
}

export interface ResultsDisplayState {
  showDetails: boolean;
  detailsTab: 'summary' | 'errors' | 'warnings' | 'log';
  canRollback: boolean;
  downloadUrl?: string;
  logContent?: string;
}

// ==========================================
// BULK OPERATIONS
// ==========================================

export interface BulkOperationConfig {
  operation: 'import' | 'export' | 'backup' | 'restore';
  sources: DataSource[];
  schedule?: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM format
    dayOfWeek?: number; // 0-6, Sunday = 0
    dayOfMonth?: number; // 1-31
  };
  notifications: {
    onSuccess: boolean;
    onError: boolean;
    email: string;
  };
}

export interface BulkOperationResult {
  id: string;
  config: BulkOperationConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: ImportResult | ExportResult;
  error?: string;
  nextRun?: Date; // For scheduled operations
}

// ==========================================
// BACKUP & RESTORE UI
// ==========================================

export interface BackupManagerProps {
  onCreateBackup: (options: any) => Promise<BackupResult>;
  onRestoreBackup: (backupId: string, options: any) => Promise<RestoreResult>;
  onDeleteBackup: (backupId: string) => Promise<void>;
  existingBackups: BackupInfo[];
}

export interface BackupInfo {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: Date;
  expiresAt: Date;
  contents: {
    dataSources: DataSource[];
    recordCounts: Record<string, number>;
  };
  canRestore: boolean;
  canDownload: boolean;
}

export interface RestoreWizardState {
  selectedBackup: BackupInfo | null;
  restoreOptions: {
    mode: 'full' | 'selective';
    dataSources: DataSource[];
    overwriteExisting: boolean;
    createBackupFirst: boolean;
  };
  isRestoring: boolean;
  restoreProgress: ImportProgress | null;
  restoreResult: RestoreResult | null;
}

// ==========================================
// HOOKS RETURN TYPES
// ==========================================

export interface UseImportWizardReturn {
  // State
  state: ImportWizardState;
  
  // Actions
  uploadFile: (file: File) => Promise<void>;
  parseFile: () => Promise<void>;
  updateMapping: (mapping: FieldMapping) => void;
  validateData: () => Promise<ValidationResult>;
  handleDuplicates: (decisions: Record<string, string>) => void;
  executeImport: () => Promise<void>;
  
  // Navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
  
  // Utils
  canProgress: boolean;
  isLoading: boolean;
  hasErrors: boolean;
}

export interface UseExportWizardReturn {
  // State
  state: ExportWizardState;
  
  // Actions
  updateOptions: (options: Partial<ExportOptions>) => void;
  estimateExport: () => Promise<void>;
  previewData: () => Promise<void>;
  executeExport: () => Promise<void>;
  
  // Navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
  
  // Utils
  canProgress: boolean;
  isLoading: boolean;
  hasErrors: boolean;
}

export interface UseFileUploadReturn {
  // State
  state: FileUploadState;
  
  // Actions
  selectFile: (file: File) => void;
  removeFile: () => void;
  validateFile: () => Promise<ValidationResult>;
  
  // Event Handlers
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  
  // Utils
  isValid: boolean;
  canUpload: boolean;
  errorMessage: string | null;
}

// ==========================================
// COMPONENT CONFIGURATIONS
// ==========================================

export interface ImportExportConfig {
  // Feature flags
  features: {
    crmImport: boolean;
    libraryImport: boolean;
    mediaImport: boolean;
    fullBackup: boolean;
    scheduledOperations: boolean;
    bulkOperations: boolean;
  };
  
  // Limits
  limits: {
    maxFileSize: number; // Bytes
    maxRecords: number;
    maxUploadsPerDay: number;
    retentionDays: number;
  };
  
  // UI Options
  ui: {
    showAdvancedOptions: boolean;
    enablePreview: boolean;
    defaultPageSize: number;
    showProgressDetails: boolean;
  };
  
  // Security
  security: {
    requireJustification: boolean;
    enableAuditLog: boolean;
    allowAnonymization: boolean;
    enforceGDPR: boolean;
  };
}

// ==========================================
// ERROR TYPES FOR UI
// ==========================================

export interface ImportExportError extends Error {
  code: string;
  severity: 'error' | 'warning';
  recoverable: boolean;
  field?: string;
  row?: number;
  suggestions?: string[];
}

export class FileValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public fileType?: string,
    public fileSize?: number
  ) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export class DataValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public row?: number,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'DataValidationError';
  }
}

export class DuplicateDetectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public duplicateCount: number
  ) {
    super(message);
    this.name = 'DuplicateDetectionError';
  }
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type WizardStepType = 'upload' | 'mapping' | 'validation' | 'preview' | 'execution' | 'results';

export interface WizardStep {
  id: WizardStepType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isOptional: boolean;
  estimatedTime?: number; // Seconds
}

export interface OperationStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  totalDataProcessed: number; // Records
  lastOperation?: Date;
}

export interface UserPreferences {
  defaultExportFormat: ExportFormat;
  defaultImportMode: ImportMode;
  enableNotifications: boolean;
  autoDeleteExports: boolean;
  retentionDays: number;
  showAdvancedOptions: boolean;
}

// ==========================================
// CONSTANTS FOR UI
// ==========================================

export const WIZARD_STEPS: Record<'import' | 'export', WizardStep[]> = {
  import: [
    {
      id: 'upload',
      title: 'Datei hochladen',
      description: 'CSV, Excel oder JSON-Datei auswählen',
      icon: () => null, // Will be replaced with actual icon
      isOptional: false,
      estimatedTime: 30
    },
    {
      id: 'mapping',
      title: 'Felder zuordnen',
      description: 'Spalten den CeleroPress-Feldern zuordnen',
      icon: () => null,
      isOptional: false,
      estimatedTime: 120
    },
    {
      id: 'validation',
      title: 'Daten validieren',
      description: 'Fehler und Duplikate prüfen',
      icon: () => null,
      isOptional: false,
      estimatedTime: 60
    },
    {
      id: 'preview',
      title: 'Vorschau',
      description: 'Import-Optionen bestätigen',
      icon: () => null,
      isOptional: true,
      estimatedTime: 30
    },
    {
      id: 'execution',
      title: 'Import ausführen',
      description: 'Daten werden importiert',
      icon: () => null,
      isOptional: false
    },
    {
      id: 'results',
      title: 'Ergebnisse',
      description: 'Import-Zusammenfassung anzeigen',
      icon: () => null,
      isOptional: false,
      estimatedTime: 30
    }
  ],
  export: [
    {
      id: 'upload', // Reusing ID for data selection
      title: 'Daten auswählen',
      description: 'Welche Daten exportiert werden sollen',
      icon: () => null,
      isOptional: false,
      estimatedTime: 60
    },
    {
      id: 'mapping', // Reusing ID for options
      title: 'Export-Optionen',
      description: 'Format, Filter und GDPR-Einstellungen',
      icon: () => null,
      isOptional: false,
      estimatedTime: 90
    },
    {
      id: 'preview',
      title: 'Vorschau',
      description: 'Export-Umfang bestätigen',
      icon: () => null,
      isOptional: true,
      estimatedTime: 30
    },
    {
      id: 'execution',
      title: 'Export erstellen',
      description: 'Daten werden exportiert',
      icon: () => null,
      isOptional: false
    },
    {
      id: 'results',
      title: 'Download',
      description: 'Export-Datei herunterladen',
      icon: () => null,
      isOptional: false,
      estimatedTime: 30
    }
  ]
};