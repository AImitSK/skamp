// src/types/unified-upload.ts
// Unified Upload API Types für Phase 4 des Media Multi-Tenancy Masterplans
// Zentrale Type-Definitionen für alle Upload-Services

import { MediaAsset } from './media';
import { Timestamp } from 'firebase/firestore';

// =====================
// CORE UNIFIED INTERFACES
// =====================

/**
 * Unified Upload Context - Zentraler Context für alle Upload-Operationen
 */
export interface UnifiedUploadContext {
  // Multi-Tenancy Core
  organizationId: string;
  userId: string;
  
  // Upload Target Context
  uploadTarget: UnifiedUploadTarget;
  targetId?: string; // projectId, campaignId, folderId, etc.
  
  // Upload Metadata
  uploadType: UnifiedUploadType;
  phase?: PipelinePhase;
  category?: string;
  
  // Client & Project Context
  clientId?: string;
  projectId?: string;
  campaignId?: string;
  folderId?: string;
  
  // Auto-Processing Options
  autoTags?: string[];
  autoDescription?: string;
  inheritClientId?: boolean;
  
  // Context Metadata
  contextSource: 'explicit' | 'inherited';
  contextTimestamp: Timestamp;
}

/**
 * Unified Upload Options - Granulare Konfiguration für Uploads
 */
export interface UnifiedUploadOptions {
  // Performance Options
  enableParallelProcessing?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  
  // Processing Options
  enableSmartRouting?: boolean;
  enableAutoTagging?: boolean;
  enableRecommendations?: boolean;
  enableBatchOptimization?: boolean;
  
  // Validation Options
  skipValidation?: boolean;
  allowLargeFiles?: boolean;
  strictContextValidation?: boolean;
  
  // Legacy Compatibility
  useLegacyFallback?: boolean;
  legacyCompatibilityMode?: boolean;
  
  // Callback Options
  onProgress?: (progress: UploadProgress) => void;
  onRecommendation?: (recommendation: UploadRecommendation) => void;
  onValidationError?: (error: ValidationError) => void;
}

/**
 * Unified Upload Result - Standardisiertes Ergebnis für alle Uploads
 */
export interface UnifiedUploadResult {
  // Upload Success Info
  success: boolean;
  uploadId: string;
  
  // Asset Information
  asset?: MediaAsset;
  assets?: MediaAsset[]; // für Batch-Uploads
  
  // Upload Metadata
  uploadMethod: UnifiedUploadMethod;
  serviceUsed: string;
  storagePath: string;
  
  // Performance Metrics
  performanceMetrics: UploadPerformanceMetrics;
  
  // Context Resolution
  resolvedContext: UnifiedUploadContext;
  contextInheritance: ContextInheritance;
  
  // Recommendations & Warnings
  recommendations: UploadRecommendation[];
  warnings: UploadWarning[];
  
  // Smart Router Info
  smartRouterUsed: boolean;
  routingDecision: RoutingDecision;
  
  // Legacy Compatibility
  legacyResult?: LegacyUploadResult;
}

// =====================
// UPLOAD TARGET & TYPE DEFINITIONS
// =====================

/**
 * Upload Ziele - Wohin wird hochgeladen
 */
export type UnifiedUploadTarget = 
  | 'media_library' 
  | 'project' 
  | 'campaign' 
  | 'branding' 
  | 'folder'
  | 'client_media'
  | 'document_generation'
  | 'temporary'
  | 'legacy';

/**
 * Upload Typen - Welche Art von Upload
 */
export type UnifiedUploadType = 
  | 'media_asset'
  | 'hero_image'
  | 'attachment'
  | 'branding_logo'
  | 'branding_asset'
  | 'generated_content'
  | 'document'
  | 'template'
  | 'backup'
  | 'import'
  | 'legacy';

/**
 * Pipeline Phasen - Context für organisierte Uploads
 */
export type PipelinePhase = 
  | 'ideas_planning'
  | 'creation'
  | 'internal_approval'
  | 'customer_approval'
  | 'distribution'
  | 'monitoring'
  | 'archived';

/**
 * Unified Upload Methods - Wie wurde hochgeladen
 */
export type UnifiedUploadMethod =
  | 'direct_service'
  | 'legacy_wrapper'
  | 'batch_optimized'
  | 'fallback';

// =====================
// PERFORMANCE & METRICS
// =====================

/**
 * Upload Performance Metriken
 */
export interface UploadPerformanceMetrics {
  // Timing Metrics
  totalDurationMs: number;
  contextResolutionMs: number;
  validationMs: number;
  uploadMs: number;
  postProcessingMs: number;
  
  // Size Metrics
  fileSizeBytes: number;
  transferredBytes: number;
  compressionRatio?: number;
  
  // Service Metrics
  serviceLatencyMs: number;
  retryCount: number;
  cacheHits: number;
  
  // Smart Router Metrics
  routingDecisionMs: number;
  contextCacheHit: boolean;
  recommendationGenerated: boolean;
}

/**
 * Upload Progress Information
 */
export interface UploadProgress {
  // Overall Progress
  phase: 'validating' | 'context_resolving' | 'uploading' | 'post_processing' | 'complete';
  overallProgress: number; // 0-100
  
  // Phase-specific Progress
  currentPhaseProgress: number; // 0-100
  phaseDescription: string;
  
  // File Information
  fileName: string;
  fileIndex?: number; // für Batch-Uploads
  totalFiles?: number;
  
  // Transfer Information
  bytesTransferred: number;
  totalBytes: number;
  transferRate: number; // bytes/second
  
  // Estimated Time
  estimatedRemainingMs: number;
  startedAt: Timestamp;
}

// =====================
// CONTEXT & VALIDATION
// =====================

/**
 * Context Inheritance Information
 */
export interface ContextInheritance {
  inheritedClientId?: string;
  inheritedTags?: string[];
  inheritedCategory?: string;
  inheritanceSource: 'folder' | 'project' | 'campaign' | 'organization' | 'none';
  inheritanceChain: string[];
}

/**
 * Validation Errors
 */
export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
  canProceed: boolean;
}

export type ValidationErrorCode = 
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_CONTEXT'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'CONTEXT_MISMATCH'
  | 'LEGACY_COMPATIBILITY'
  | 'VALIDATION_FAILED';

/**
 * Context Validation Result
 */
export interface ContextValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  canProceed: boolean;
  recommendedActions: string[];
  autoFixAvailable: boolean;
}

// =====================
// RECOMMENDATIONS & ROUTING
// =====================

/**
 * Upload Recommendations
 */
export interface UploadRecommendation {
  type: RecommendationType;
  message: string;
  confidence: number; // 0-100
  autoApplicable: boolean;
  impact: 'low' | 'medium' | 'high';
  category: 'performance' | 'organization' | 'security' | 'compliance';
}

export type RecommendationType = 
  | 'BETTER_FOLDER'
  | 'OPTIMIZE_FILE_SIZE'
  | 'ADD_TAGS'
  | 'CHANGE_CATEGORY'
  | 'USE_BATCH_UPLOAD'
  | 'ENABLE_COMPRESSION'
  | 'UPDATE_CONTEXT'
  | 'MIGRATE_TO_UNIFIED';

/**
 * Upload Warnings
 */
export interface UploadWarning {
  code: WarningCode;
  message: string;
  severity: 'low' | 'medium' | 'high';
  autoResolvable: boolean;
}

export type WarningCode =
  | 'LARGE_FILE_SIZE'
  | 'CONTEXT_INHERITANCE_FAILED'
  | 'LEGACY_SERVICE_USED'
  | 'PERFORMANCE_DEGRADED'
  | 'QUOTA_WARNING'
  | 'CONTEXT_MISMATCH';

/**
 * Smart Router Routing Entscheidung
 */
export interface RoutingDecision {
  selectedService: string;
  routingReason: string;
  confidence: number;
  alternativeOptions: Array<{
    service: string;
    confidence: number;
    reason: string;
  }>;
  routingPath: string;
  optimizations: string[];
}

// =====================
// BATCH UPLOAD SUPPORT
// =====================

/**
 * Batch Upload Context
 */
export interface BatchUploadContext extends UnifiedUploadContext {
  batchId: string;
  batchSize: number;
  parallelism: number;
  groupingStrategy: 'by_type' | 'by_size' | 'by_target' | 'optimal' | 'none';
}

/**
 * Batch Upload Result
 */
export interface BatchUploadResult {
  batchId: string;
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  skippedUploads: number;
  
  // Individual Results
  results: Array<{
    file: File;
    result?: UnifiedUploadResult;
    error?: string;
    skipped?: boolean;
    batchGroup: string;
  }>;
  
  // Batch Metrics
  batchPerformanceMetrics: BatchPerformanceMetrics;
  
  // Optimization Info
  optimizationsSaved: number;
  parallelProcessingUsed: boolean;
  contextCacheEfficiency: number;
}

/**
 * Batch Performance Metrics
 */
export interface BatchPerformanceMetrics extends UploadPerformanceMetrics {
  // Batch-specific Metrics
  batchOptimizationMs: number;
  parallelEfficiency: number; // 0-100
  contextReuseCount: number;
  averageFileProcessingMs: number;
  
  // Memory Usage
  peakMemoryUsageMB: number;
  memoryEfficiency: number;
  garbageCollectionEvents: number;
}

// =====================
// LEGACY COMPATIBILITY
// =====================

/**
 * Legacy Upload Parameter für Rückwärtskompatibilität
 */
export interface LegacyUploadParams {
  // Original Service Parameter
  originalService: 'mediaService' | 'campaignMediaService' | 'projectUploadService' | 'brandingService';
  originalMethod: string;
  originalParams: Record<string, any>;
  
  // Legacy Context
  userId?: string; // Legacy userId statt organizationId
  legacyFolderId?: string;
  legacyClientId?: string;
  
  // Compatibility Flags
  maintainLegacyStructure: boolean;
  emulateOriginalBehavior: boolean;
}

/**
 * Legacy Upload Result für Rückwärtskompatibilität
 */
export interface LegacyUploadResult {
  // Original Result Format
  originalFormat: Record<string, any>;
  serviceUsed: string;
  methodUsed: string;
  
  // Migration Info
  migrationAvailable: boolean;
  migrationBenefits: string[];
  deprecationWarning?: string;
}

// =====================
// ERROR HANDLING
// =====================

/**
 * Unified Upload Error
 */
export class UnifiedUploadError extends Error {
  constructor(
    message: string,
    public readonly code: UploadErrorCode,
    public readonly context?: UnifiedUploadContext,
    public readonly originalError?: Error,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'UnifiedUploadError';
  }
}

export type UploadErrorCode =
  | 'VALIDATION_FAILED'
  | 'CONTEXT_RESOLUTION_FAILED'
  | 'SERVICE_UNAVAILABLE'
  | 'UPLOAD_FAILED'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'LEGACY_SERVICE_ERROR';

// =====================
// PATH PREVIEW TYPES
// =====================

/**
 * Path Preview für UI
 */
export interface PathPreview {
  file: File;
  previewPath: string;
  recommendedPath: string;
  pathDiffers: boolean;
  recommendation?: UploadRecommendation;
  warnings: UploadWarning[];
}

// =====================
// UTILITY TYPES
// =====================

/**
 * Upload Context Builder Helper
 */
export interface UploadContextBuilder {
  organizationId: string;
  userId: string;
  uploadTarget: UnifiedUploadTarget;
  uploadType: UnifiedUploadType;
  additionalContext?: Partial<UnifiedUploadContext>;
}

/**
 * Service Integration Map
 */
export interface ServiceIntegrationMap {
  [key: string]: {
    serviceKey: string;
    method: string;
    parameterMapping: Record<string, string>;
    resultMapping: Record<string, string>;
    deprecated: boolean;
    migrationPath?: string;
  };
}