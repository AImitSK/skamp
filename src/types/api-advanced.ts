// src/types/api-advanced.ts
import { Timestamp } from 'firebase/firestore';

// ========================================
// Bulk Export/Import Types
// ========================================

export type ExportFormat = 'csv' | 'json' | 'excel' | 'xml';
export type ImportFormat = 'csv' | 'json' | 'excel';

export type ExportableEntity = 'contacts' | 'companies' | 'publications' | 'media_assets' | 'campaigns' | 'webhooks';

export interface BulkExportRequest {
  entities: ExportableEntity[];
  format: ExportFormat;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    tags?: string[];
    status?: string[];
    [key: string]: any;
  };
  options?: {
    includeDeleted?: boolean;
    includePrivateData?: boolean;
    compression?: 'none' | 'zip' | 'gzip';
    splitByEntity?: boolean; // Separate files for each entity
    maxRecordsPerFile?: number;
  };
  notificationEmail?: string;
}

export interface BulkImportRequest {
  format: ImportFormat;
  entity: ExportableEntity;
  fileUrl?: string; // URL to uploaded file
  fileContent?: string; // Direct content for small imports
  options?: {
    mode: 'create' | 'update' | 'upsert' | 'replace';
    duplicateHandling: 'skip' | 'update' | 'error';
    validateOnly?: boolean; // Dry run
    batchSize?: number;
    mapping?: Record<string, string>; // Field mapping
  };
  notificationEmail?: string;
}

export interface BulkJob {
  id?: string;
  type: 'export' | 'import';
  entity?: ExportableEntity;
  entities?: ExportableEntity[];
  
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
    currentStep?: string;
  };
  
  request: BulkExportRequest | BulkImportRequest;
  
  result?: {
    // Export results
    downloadUrl?: string;
    fileSize?: number;
    recordCount?: number;
    files?: {
      entity: ExportableEntity;
      url: string;
      recordCount: number;
      fileSize: number;
    }[];
    
    // Import results
    imported?: {
      created: number;
      updated: number;
      skipped: number;
      errors: number;
    };
    errors?: {
      row: number;
      field?: string;
      message: string;
      data?: any;
    }[];
    
    // Common
    duration?: number; // milliseconds
    completedAt?: Timestamp;
  };
  
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  
  // Metadata
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  expiresAt?: Timestamp; // Auto-cleanup
}

export interface APIBulkJobResponse {
  id: string;
  type: 'export' | 'import';
  status: BulkJob['status'];
  progress: BulkJob['progress'];
  result?: {
    downloadUrl?: string;
    fileSize?: number;
    recordCount?: number;
    files?: {
      entity: ExportableEntity;
      url: string;
      recordCount: number;
      fileSize: number;
    }[];
    imported?: {
      created: number;
      updated: number;
      skipped: number;
      errors: number;
    };
    errors?: {
      row: number;
      field?: string;
      message: string;
      data?: any;
    }[];
    duration?: number;
    completedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface APIBulkJobListResponse {
  jobs: APIBulkJobResponse[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

// ========================================
// GraphQL Types
// ========================================

export interface GraphQLQueryRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLResponse {
  data?: any;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
    extensions?: Record<string, any>;
  }>;
  extensions?: Record<string, any>;
}

export interface GraphQLSchema {
  types: GraphQLTypeDefinition[];
  queries: GraphQLQueryDefinition[];
  mutations?: GraphQLMutationDefinition[];
  subscriptions?: GraphQLSubscriptionDefinition[];
}

export interface GraphQLTypeDefinition {
  name: string;
  kind: 'object' | 'interface' | 'union' | 'enum' | 'input' | 'scalar';
  description?: string;
  fields?: GraphQLFieldDefinition[];
  values?: GraphQLEnumValue[]; // For enums
}

export interface GraphQLFieldDefinition {
  name: string;
  type: string;
  description?: string;
  args?: GraphQLArgumentDefinition[];
  nullable?: boolean;
  list?: boolean;
}

export interface GraphQLArgumentDefinition {
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
  nullable?: boolean;
}

export interface GraphQLQueryDefinition {
  name: string;
  type: string;
  description?: string;
  args?: GraphQLArgumentDefinition[];
  resolver: string; // Function name
}

export interface GraphQLMutationDefinition extends GraphQLQueryDefinition {
  // Same as query for now
}

export interface GraphQLSubscriptionDefinition extends GraphQLQueryDefinition {
  trigger: string; // Event that triggers this subscription
}

export interface GraphQLEnumValue {
  name: string;
  value: any;
  description?: string;
  deprecated?: boolean;
}

// ========================================
// WebSocket Types
// ========================================

export interface WebSocketConnection {
  id?: string;
  userId: string;
  organizationId: string;
  connectionId: string;
  
  // Subscription filters
  subscriptions: WebSocketSubscription[];
  
  // Connection metadata
  connectedAt: Timestamp;
  lastPingAt?: Timestamp;
  userAgent?: string;
  ipAddress?: string;
  
  // Status
  status: 'connected' | 'disconnected' | 'error';
  
  // Rate limiting
  messageCount: number;
  lastMessageAt?: Timestamp;
}

export interface WebSocketSubscription {
  id: string;
  type: WebSocketSubscriptionType;
  filters?: {
    entities?: string[]; // Specific entity IDs
    events?: string[]; // Specific event types
    tags?: string[];
  };
  createdAt: Timestamp;
}

export type WebSocketSubscriptionType = 
  | 'contacts'
  | 'companies' 
  | 'publications'
  | 'campaigns'
  | 'bulk_jobs'
  | 'notifications'
  | 'system_status';

export interface WebSocketMessage {
  id: string;
  type: 'event' | 'subscription' | 'ping' | 'pong' | 'error' | 'notification';
  
  // Event data
  event?: {
    type: string;
    entity: string;
    action: string;
    data: any;
    timestamp: string;
  };
  
  // Subscription management
  subscription?: {
    action: 'subscribe' | 'unsubscribe';
    type: WebSocketSubscriptionType;
    filters?: WebSocketSubscription['filters'];
  };
  
  // System messages
  notification?: {
    level: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    data?: any;
  };
  
  // Error handling
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  
  // Metadata
  timestamp: string;
  subscriptionId?: string;
}

export interface WebSocketEventPayload {
  subscriptionType: WebSocketSubscriptionType;
  event: {
    type: string;
    entity: string;
    entityId: string;
    action: string;
    data: any;
    timestamp: string;
    organizationId: string;
  };
  recipients: {
    userId: string;
    organizationId: string;
    connectionId?: string;
  }[];
}

// ========================================
// File Processing Types
// ========================================

export interface FileProcessingJob {
  id?: string;
  type: 'parse' | 'validate' | 'transform' | 'upload';
  
  input: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    encoding?: string;
  };
  
  processing: {
    format: ImportFormat;
    options?: {
      delimiter?: string; // For CSV
      hasHeader?: boolean;
      encoding?: string;
      skipRows?: number;
      maxRows?: number;
    };
  };
  
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  
  result?: {
    records: any[];
    headers?: string[];
    validation?: {
      valid: number;
      invalid: number;
      warnings: number;
      errors: Array<{
        row: number;
        field?: string;
        message: string;
        severity: 'error' | 'warning';
      }>;
    };
  };
  
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// ========================================
// Analytics & Reporting Types
// ========================================

export interface AnalyticsRequest {
  metrics: AnalyticsMetric[];
  dimensions?: AnalyticsDimension[];
  filters?: AnalyticsFilter[];
  dateRange: {
    start: string;
    end: string;
  };
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  limit?: number;
}

export interface AnalyticsMetric {
  name: string;
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct';
  field?: string;
}

export interface AnalyticsDimension {
  name: string;
  field: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
}

export interface AnalyticsFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface AnalyticsResponse {
  data: Array<{
    dimensions?: Record<string, any>;
    metrics: Record<string, number>;
    timestamp?: string;
  }>;
  summary: {
    totalRecords: number;
    dateRange: {
      start: string;
      end: string;
    };
    metrics: Record<string, {
      total: number;
      average?: number;
      min?: number;
      max?: number;
    }>;
  };
}

// ========================================
// API Rate Limiting & Quotas
// ========================================

export interface APIQuota {
  organizationId: string;
  limits: {
    requestsPerHour: number;
    requestsPerDay: number;
    requestsPerMonth: number;
    bulkOperationsPerDay: number;
    exportSizeLimit: number; // MB
    importSizeLimit: number; // MB
    webhookDeliveries: number;
    graphqlComplexity: number;
    websocketConnections: number;
  };
  usage: {
    requestsThisHour: number;
    requestsToday: number;
    requestsThisMonth: number;
    bulkOperationsToday: number;
    exportSizeUsed: number;
    importSizeUsed: number;
    webhookDeliveriesUsed: number;
    activeWebsocketConnections: number;
  };
  resetTimes: {
    hourly: Timestamp;
    daily: Timestamp;
    monthly: Timestamp;
  };
}

// ========================================
// Error Types
// ========================================

export interface APIAdvancedError {
  code: 'EXPORT_FAILED' | 'IMPORT_FAILED' | 'FILE_TOO_LARGE' | 'INVALID_FORMAT' | 'QUOTA_EXCEEDED' | 'WEBSOCKET_ERROR' | 'GRAPHQL_ERROR';
  message: string;
  details?: any;
}