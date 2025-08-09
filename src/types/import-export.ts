// src/types/import-export.ts

import { Timestamp } from 'firebase/firestore';
import { Company, Contact, Tag } from './crm';
import { Publication, Advertisement, MediaKit } from './library';
import { MediaAsset, MediaFolder, ShareLink } from './media';
import { CountryCode, CurrencyCode, MoneyAmount } from './international';

// ==========================================
// CORE TYPES
// ==========================================

export type DataSource = 'crm' | 'library' | 'media';
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'backup';
export type ImportMode = 'create' | 'update' | 'upsert' | 'merge';

export type ImportPhase = 'validating' | 'parsing' | 'processing' | 'saving' | 'completed';
export type ExportPhase = 'gathering' | 'processing' | 'formatting' | 'uploading' | 'completed';

// ==========================================
// EXPORT SYSTEM
// ==========================================

export interface ExportOptions {
  // Data selection
  dataSources: DataSource[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  
  // CRM-specific options
  crmOptions?: {
    includeCompanies: boolean;
    includeContacts: boolean;
    includeCommunicationHistory: boolean;
    includeTags: boolean;
    companyTypes?: string[]; // Filter by company types
    tagFilters?: string[]; // Only specific tags
  };
  
  // Library-specific options  
  libraryOptions?: {
    includePublications: boolean;
    includeAdvertisements: boolean;
    includeMediaKits: boolean;
    publicationTypes?: string[]; // Filter by publication types
  };
  
  // Media-specific options
  mediaOptions?: {
    includeMetadataOnly: boolean; // Only metadata, no binary files
    includeFiles: boolean; // ZIP with actual files (Premium Feature)
    includeFolderStructure: boolean;
    includeShareLinks: boolean;
    fileSizeLimit?: number; // MB limit for file export
  };
  
  // Format & Encoding
  format: ExportFormat;
  encoding?: 'utf-8' | 'latin1'; // For CSV compatibility
  delimiter?: ',' | ';' | '\t'; // CSV delimiter
  
  // Output options  
  splitLargeFiles: boolean; // Split when >50MB
  includeSystemFields: boolean; // createdAt, updatedAt, etc.
  anonymizeData: boolean; // GDPR-compliant export without PII
  
  // Delivery options
  delivery: {
    method: 'download' | 'email' | 'cloud_storage';
    email?: string;
    storageLocation?: string;
  };
  
  // GDPR & Security
  gdpr: GDPROptions;
}

export interface ExportResult {
  success: boolean;
  fileUrl?: string;
  fileName: string;
  fileSize: number;
  recordCount: number;
  duration: number; // Milliseconds
  expiresAt: Date; // Automatic cleanup
  summary: ExportSummary;
  errors: ExportError[];
  warnings: ExportWarning[];
}

export interface ExportSummary {
  totalRecords: number;
  crmRecords?: {
    companies: number;
    contacts: number;
    tags: number;
  };
  libraryRecords?: {
    publications: number;
    advertisements: number;
    mediaKits: number;
  };
  mediaRecords?: {
    assets: number;
    folders: number;
    shareLinks: number;
  };
}

export interface ExportProgress {
  phase: ExportPhase;
  progress: number; // 0-100
  currentSource: string;
  processedRecords: number;
  totalRecords: number;
  message: string;
  estimatedTimeRemaining?: number; // Seconds
}

export interface ExportEstimate {
  estimatedSize: number; // Bytes
  estimatedDuration: number; // Seconds
  recordCount: number;
  warnings: string[];
}

// ==========================================
// IMPORT SYSTEM
// ==========================================

export interface ImportOptions {
  mode: ImportMode;
  duplicateDetection: DuplicateDetectionConfig;
  validation: {
    strict: boolean;
    stopOnError: boolean;
    maxErrors: number;
  };
  backup: {
    createBackup: boolean;
    backupName?: string;
  };
  mapping?: FieldMapping;
  dataSource: DataSource;
}

export interface ImportResult {
  success: boolean;
  summary: ImportSummary;
  details: {
    createdIds: string[];
    updatedIds: string[];
    errors: ImportError[];
    warnings: ImportWarning[];
    duplicates: DuplicateInfo[];
  };
  backupId?: string; // For rollback
  duration: number; // Milliseconds
}

export interface ImportSummary {
  processed: number;
  created: number; 
  updated: number;
  skipped: number;
  errors: number;
  warnings: number;
  duplicates: number;
}

export interface ImportProgress {
  phase: ImportPhase;
  progress: number; // 0-100
  currentRecord: number;
  totalRecords: number;
  message: string;
  errors: ImportError[];
  estimatedTimeRemaining?: number; // Seconds
}

// ==========================================
// DUPLICATE DETECTION
// ==========================================

export interface DuplicateDetectionConfig {
  enabled: boolean;
  strategy: 'strict' | 'fuzzy' | 'custom';
  
  // CRM Duplicate Detection
  contactFields: {
    email: { weight: number; required: boolean };
    phone: { weight: number; normalizeFormat: boolean };
    name: { weight: number; fuzzyMatch: boolean };
  };
  
  companyFields: {
    name: { weight: number; fuzzyMatch: boolean };
    website: { weight: number; normalizeDomain: boolean };
    vatNumber: { weight: number; required: boolean };
  };
  
  // Similarity Thresholds
  thresholds: {
    exactMatch: number;
    likelyDuplicate: number;
    possibleDuplicate: number;
    different: number;
  };
  
  // Actions
  onDuplicate: 'skip' | 'update' | 'merge' | 'ask_user';
}

export interface DuplicateInfo {
  importRecord: any;
  existingRecord: any;
  similarity: number;
  matchedFields: string[];
  action: 'skip' | 'update' | 'merge' | 'create';
  userDecision?: boolean;
}

export interface DuplicateReport {
  totalDuplicates: number;
  exactMatches: DuplicateInfo[];
  likelyDuplicates: DuplicateInfo[];
  possibleDuplicates: DuplicateInfo[];
  recommendations: {
    skip: number;
    update: number;
    merge: number;
    create: number;
  };
}

// ==========================================
// FIELD MAPPING
// ==========================================

export interface FieldMapping {
  sourceFields: string[]; // CSV headers or JSON keys
  mappings: FieldMappingRule[];
  ignored: string[]; // Fields to ignore
}

export interface FieldMappingRule {
  sourceField: string;
  targetField: string;
  transformer?: FieldTransformer;
  required: boolean;
  defaultValue?: any;
}

export interface FieldTransformer {
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'currency' | 'address';
  options?: {
    dateFormat?: string;
    currency?: CurrencyCode;
    countryCode?: CountryCode;
    phoneFormat?: 'international' | 'national';
    addressComponents?: boolean;
  };
}

// ==========================================
// VALIDATION
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    warningRecords: number;
  };
}

export interface ValidationError {
  row?: number;
  field: string;
  value: any;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  row?: number;
  field: string;
  value: any;
  message: string;
  code: string;
}

export interface ImportError {
  row?: number;
  record?: any;
  message: string;
  code: string;
  field?: string;
  recoverable: boolean;
}

export interface ImportWarning {
  row?: number;
  record?: any;
  message: string;
  code: string;
  field?: string;
}

export interface ExportError {
  source: string;
  message: string;
  code: string;
  recoverable: boolean;
}

export interface ExportWarning {
  source: string;
  message: string;
  code: string;
}

// ==========================================
// FILE HANDLING
// ==========================================

export interface FileValidationConfig {
  // Allowed file types
  allowedTypes: Record<string, { maxSize: number }>;
  
  // Security checks
  virusScanning: boolean; // Via Cloud Functions
  contentValidation: boolean; // Ensure file contains expected data
  headerValidation: boolean; // CSV headers match expected format
  
  // Rate limiting
  maxUploadsPerHour: number;
  maxUploadsPerDay: number;
  
  // Data validation
  maxRecordsPerImport: number; // Prevents memory issues
  requiredFields: string[]; // Must be present
  forbiddenFields: string[]; // Sensitive data not allowed
}

export interface ParsedData {
  type: DataSource;
  format: string;
  records: Record<string, any>[];
  headers?: string[];
  metadata: {
    fileName: string;
    fileSize: number;
    recordCount: number;
    encoding?: string;
    delimiter?: string;
  };
}

export interface MappedData {
  type: DataSource;
  records: any[];
  mapping: FieldMapping;
  validation: ValidationResult;
}

// ==========================================
// GDPR & SECURITY
// ==========================================

export interface GDPROptions {
  // Data minimization
  anonymizePersonalData: boolean;
  excludePersonalIdentifiers: boolean;
  
  // Audit trail
  logDataAccess: boolean;
  requireJustification: boolean;
  justification?: string;
  
  // Export controls
  personalDataWarning: boolean; // Warn when exporting PII
  consentRequired: boolean; // Require explicit consent checkbox
  
  // Retention
  autoDeleteExports: boolean; // Delete after 30 days
  maxRetentionDays: number;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string;
  action: 'import' | 'export' | 'backup' | 'restore';
  dataSource: DataSource;
  recordCount: number;
  timestamp: Timestamp;
  details: {
    fileName?: string;
    fileSize?: number;
    format?: string;
    gdprOptions?: GDPROptions;
    success: boolean;
    duration: number;
  };
  justification?: string;
}

// ==========================================
// BACKUP & RESTORE
// ==========================================

export interface BackupOptions {
  includeAllData: boolean;
  dataSources: DataSource[];
  includeSystemData: boolean; // Settings, configs, etc.
  compression: boolean;
  encryption: boolean;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  fileName: string;
  fileSize: number;
  createdAt: Date;
  expiresAt: Date;
  checksum: string;
  contents: BackupContents;
}

export interface BackupContents {
  organizationId: string;
  createdAt: Date;
  version: string; // App version
  dataSources: DataSource[];
  recordCounts: {
    companies?: number;
    contacts?: number;
    publications?: number;
    mediaAssets?: number;
  };
}

export interface RestoreOptions {
  backupId: string;
  mode: 'full' | 'selective';
  dataSources?: DataSource[];
  overwriteExisting: boolean;
  createBackupBeforeRestore: boolean;
}

export interface RestoreResult {
  success: boolean;
  summary: ImportSummary;
  backupCreated?: string; // Backup ID created before restore
  duration: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

// ==========================================
// CONSTANTS & ENUMS
// ==========================================

export const EXPORT_FORMATS = {
  csv: {
    label: 'CSV (Comma Separated)',
    extension: '.csv',
    mimeType: 'text/csv',
    description: 'Kompatibel mit Excel, Google Sheets',
    supports: ['crm', 'library'] as DataSource[]
  },
  xlsx: {
    label: 'Excel Arbeitsmappe',
    extension: '.xlsx', 
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    description: 'Multi-Sheet Excel mit Formatierung',
    supports: ['crm', 'library', 'media'] as DataSource[]
  },
  json: {
    label: 'JSON (Structured Data)',
    extension: '.json',
    mimeType: 'application/json', 
    description: 'Vollständige Datenstruktur für APIs',
    supports: ['crm', 'library', 'media'] as DataSource[]
  },
  backup: {
    label: 'CeleroPress Vollbackup',
    extension: '.celero',
    mimeType: 'application/json',
    description: 'Kompletter Organization-Export für Migration',
    supports: ['crm', 'library', 'media'] as DataSource[]
  }
} as const;

export const IMPORT_MODES = {
  create: {
    label: 'Nur neue Einträge erstellen',
    description: 'Existierende Daten werden nicht verändert, Duplikate übersprungen',
    riskLevel: 'low'
  },
  update: {
    label: 'Nur bestehende Einträge aktualisieren', 
    description: 'Neue Einträge werden ignoriert, nur bekannte IDs werden aktualisiert',
    riskLevel: 'medium'
  },
  upsert: {
    label: 'Erstellen oder aktualisieren',
    description: 'Neue Einträge werden erstellt, bestehende aktualisiert (Standard)',
    riskLevel: 'medium'
  },
  merge: {
    label: 'Intelligente Zusammenführung',
    description: 'Duplikat-Erkennung anhand Name/E-Mail mit Merge-Optionen',
    riskLevel: 'high'
  }
} as const;

export const DEFAULT_VALIDATION_CONFIG: FileValidationConfig = {
  allowedTypes: {
    'text/csv': { maxSize: 50 * 1024 * 1024 }, // 50MB
    'application/json': { maxSize: 20 * 1024 * 1024 }, // 20MB  
    'application/vnd.ms-excel': { maxSize: 100 * 1024 * 1024 }, // 100MB
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { maxSize: 100 * 1024 * 1024 }
  },
  virusScanning: false, // Enable in production
  contentValidation: true,
  headerValidation: true,
  maxUploadsPerHour: 10,
  maxUploadsPerDay: 50,
  maxRecordsPerImport: 10000,
  requiredFields: [],
  forbiddenFields: ['password', 'creditCard', 'ssn']
};

export const DEFAULT_DUPLICATE_CONFIG: DuplicateDetectionConfig = {
  enabled: true,
  strategy: 'fuzzy',
  contactFields: {
    email: { weight: 1.0, required: true },
    phone: { weight: 0.7, normalizeFormat: true },
    name: { weight: 0.5, fuzzyMatch: true }
  },
  companyFields: {
    name: { weight: 0.9, fuzzyMatch: true },
    website: { weight: 0.8, normalizeDomain: true },
    vatNumber: { weight: 1.0, required: false }
  },
  thresholds: {
    exactMatch: 1.0,
    likelyDuplicate: 0.85,
    possibleDuplicate: 0.7,
    different: 0.5
  },
  onDuplicate: 'ask_user'
};

export const DEFAULT_GDPR_OPTIONS: GDPROptions = {
  anonymizePersonalData: false,
  excludePersonalIdentifiers: false,
  logDataAccess: true,
  requireJustification: false,
  personalDataWarning: true,
  consentRequired: false,
  autoDeleteExports: true,
  maxRetentionDays: 30
};