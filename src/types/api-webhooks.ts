// src/types/api-webhooks.ts
import { Timestamp } from 'firebase/firestore';

// ========================================
// Webhook Event Types
// ========================================

export type WebhookEvent = 
  // Contacts
  | 'contact.created'
  | 'contact.updated' 
  | 'contact.deleted'
  // Companies
  | 'company.created'
  | 'company.updated'
  | 'company.deleted'
  // Publications
  | 'publication.created'
  | 'publication.updated'
  | 'publication.deleted'
  | 'publication.verified'
  // Media Assets
  | 'media_asset.created'
  | 'media_asset.updated'
  | 'media_asset.deleted'
  // Media Kits
  | 'media_kit.created'
  | 'media_kit.shared'
  // Campaigns
  | 'campaign.created'
  | 'campaign.sent'
  | 'campaign.completed';

export const WEBHOOK_EVENT_CATEGORIES = {
  contacts: ['contact.created', 'contact.updated', 'contact.deleted'],
  companies: ['company.created', 'company.updated', 'company.deleted'],
  publications: ['publication.created', 'publication.updated', 'publication.deleted', 'publication.verified'],
  media_assets: ['media_asset.created', 'media_asset.updated', 'media_asset.deleted'],
  media_kits: ['media_kit.created', 'media_kit.shared'],
  campaigns: ['campaign.created', 'campaign.sent', 'campaign.completed']
} as const;

// ========================================
// Webhook Configuration
// ========================================

export interface WebhookConfig {
  id?: string;
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  
  // Security
  secret?: string; // Für Signature-Verification
  headers?: Record<string, string>; // Custom Headers
  
  // Configuration
  isActive: boolean;
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  timeoutMs: number;
  
  // Filtering
  filters?: {
    // Nur Events für bestimmte Entitäten
    entityIds?: string[];
    // Nur Events mit bestimmten Tags
    tags?: string[];
    // Custom Filter-Expression
    customFilter?: string;
  };
  
  // Metadata
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

// ========================================
// Webhook Delivery
// ========================================

export interface WebhookDelivery {
  id?: string;
  webhookId: string;
  webhookUrl: string;
  
  // Event Information
  event: WebhookEvent;
  eventId: string; // Unique Event ID für Idempotenz
  
  // Payload
  payload: WebhookPayload;
  
  // Delivery Status
  status: 'pending' | 'delivering' | 'success' | 'failed';
  attempt: number;
  
  // Response
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body?: string;
    duration: number; // Milliseconds
  };
  
  // Error Information
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  
  // Timestamps
  scheduledAt: Timestamp;
  deliveredAt?: Timestamp;
  nextRetryAt?: Timestamp;
  
  organizationId: string;
}

export interface WebhookPayload {
  webhookId: string;
  eventId: string;
  event: WebhookEvent;
  timestamp: string;
  organizationId: string;
  
  // Event-spezifische Daten
  data: {
    id: string;
    type: string;
    action: 'created' | 'updated' | 'deleted' | 'verified' | 'shared' | 'sent' | 'completed';
    
    // Entity-Details (variiert je nach Event-Typ)
    entity: any;
    
    // Bei Updates: Was hat sich geändert
    changes?: {
      field: string;
      oldValue: any;
      newValue: any;
    }[];
    
    // Zusätzliche Metadaten
    metadata?: {
      userId?: string;
      userEmail?: string;
      ipAddress?: string;
      userAgent?: string;
      source?: string;
    };
  };
  
  // Webhook-Metadaten
  webhook: {
    id: string;
    version: '1.0';
    attempt: number;
    maxAttempts: number;
  };
}

// ========================================
// Webhook Statistics
// ========================================

export interface WebhookStatistics {
  webhookId: string;
  
  // Delivery Stats
  deliveries: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
  };
  
  // Performance Stats
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
  };
  
  // Event Stats
  eventBreakdown: {
    event: WebhookEvent;
    count: number;
    successCount: number;
    failureCount: number;
  }[];
  
  // Error Stats
  errors: {
    type: string;
    count: number;
    lastOccurrence: Timestamp;
  }[];
  
  // Time-based Stats
  timeline: {
    date: string;
    deliveries: number;
    successes: number;
    failures: number;
    avgResponseTime: number;
  }[];
  
  // Last Activity
  lastDeliveryAt?: Timestamp;
  lastSuccessAt?: Timestamp;
  lastFailureAt?: Timestamp;
  
  // Period
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

// ========================================
// API Request/Response Types
// ========================================

export interface APIWebhookCreateRequest {
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  
  secret?: string;
  headers?: Record<string, string>;
  
  retryPolicy?: {
    maxAttempts?: number;
    backoffMultiplier?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  };
  timeoutMs?: number;
  
  filters?: {
    entityIds?: string[];
    tags?: string[];
    customFilter?: string;
  };
  
  isActive?: boolean;
}

export interface APIWebhookUpdateRequest extends Partial<APIWebhookCreateRequest> {
  // Alle Felder optional für Partial Update
}

export interface APIWebhook {
  id: string;
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  
  isActive: boolean;
  
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  timeoutMs: number;
  
  filters?: {
    entityIds?: string[];
    tags?: string[];
    customFilter?: string;
  };
  
  statistics: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    avgResponseTime?: number;
    lastDeliveryAt?: string;
    lastSuccessAt?: string;
    lastFailureAt?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface APIWebhookListResponse {
  webhooks: APIWebhook[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface APIWebhookDeliveryListResponse {
  deliveries: APIWebhookDelivery[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface APIWebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  eventId: string;
  
  status: 'pending' | 'delivering' | 'success' | 'failed';
  attempt: number;
  
  response?: {
    statusCode: number;
    duration: number;
  };
  
  error?: {
    message: string;
    code?: string;
  };
  
  scheduledAt: string;
  deliveredAt?: string;
  nextRetryAt?: string;
}

export interface APIWebhookTestRequest {
  webhookId?: string; // Test existing webhook
  url?: string; // Test arbitrary URL
  event: WebhookEvent;
  sampleData?: any; // Custom sample data
}

export interface APIWebhookTestResponse {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  headers?: Record<string, string>;
  body?: string;
  error?: {
    message: string;
    code?: string;
  };
  signatureValid?: boolean;
}

// ========================================
// Webhook Signature
// ========================================

export interface WebhookSignature {
  algorithm: 'sha256' | 'sha512';
  header: string; // Header name, e.g., 'X-Webhook-Signature'
  format: 'hex' | 'base64';
}

// ========================================
// Error Types
// ========================================

export interface APIWebhookError {
  code: 'WEBHOOK_NOT_FOUND' | 'INVALID_URL' | 'INVALID_EVENTS' | 'DUPLICATE_WEBHOOK' | 'DELIVERY_FAILED' | 'SIGNATURE_MISMATCH';
  message: string;
  details?: any;
}