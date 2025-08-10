// src/types/api.ts
import { Timestamp } from 'firebase/firestore';

// ========================================
// API Key Management Types
// ========================================

export interface APIKey {
  id?: string;
  name: string;
  keyHash: string; // SHA-256 Hash des tatsächlichen Keys
  keyPreview: string; // Erste 8 Zeichen für UI-Anzeige
  organizationId: string;
  userId: string; // Creator
  permissions: APIPermission[];
  isActive: boolean;
  
  // Rate Limiting
  rateLimit: {
    requestsPerHour: number;
    requestsPerMinute: number;
    burstLimit: number;
  };
  
  // Usage Tracking
  usage: {
    totalRequests: number;
    lastUsedAt?: Timestamp;
    requestsThisHour: number;
    requestsToday: number;
  };
  
  // Security
  allowedIPs?: string[]; // Optional IP-Whitelist
  expiresAt?: Timestamp; // Optional Ablaufzeit
  
  // Audit Trail
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export type APIPermission = 
  | 'contacts:read' 
  | 'contacts:write' 
  | 'contacts:delete'
  | 'companies:read' 
  | 'companies:write' 
  | 'companies:delete'
  | 'publications:read' 
  | 'publications:write' 
  | 'publications:delete'
  | 'advertisements:read' 
  | 'advertisements:write' 
  | 'advertisements:delete'
  | 'webhooks:manage'
  | 'analytics:read';

export interface APIKeyCreateRequest {
  name: string;
  permissions: APIPermission[];
  rateLimit?: {
    requestsPerHour?: number;
    requestsPerMinute?: number;
  };
  expiresInDays?: number; // Optional: 30, 90, 365 oder null für permanent
  allowedIPs?: string[];
}

export interface APIKeyResponse {
  id: string;
  name: string;
  key: string; // Nur bei Erstellung zurückgegeben
  keyPreview: string;
  permissions: APIPermission[];
  isActive: boolean;
  rateLimit: APIKey['rateLimit'];
  usage: APIKey['usage'];
  createdAt: string;
  expiresAt?: string;
}

// ========================================
// API Request/Response Types
// ========================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

export interface APIRequestContext {
  organizationId: string;
  userId: string;
  apiKeyId: string;
  permissions: APIPermission[];
  rateLimit: APIKey['rateLimit'];
  clientIP: string;
  userAgent: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

// ========================================
// API Error Types
// ========================================

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const API_ERROR_CODES = {
  // Authentication & Authorization
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_API_KEY: 'EXPIRED_API_KEY',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  IP_NOT_ALLOWED: 'IP_NOT_ALLOWED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  BURST_LIMIT_EXCEEDED: 'BURST_LIMIT_EXCEEDED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST_FORMAT: 'INVALID_REQUEST_FORMAT',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  
  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_DELETED: 'RESOURCE_DELETED',
  
  // System
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR'
} as const;

export type APIErrorCode = keyof typeof API_ERROR_CODES;

// ========================================
// Webhook Types
// ========================================

export interface Webhook {
  id?: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  organizationId: string;
  
  // Configuration
  retryAttempts: number;
  timeoutMs: number;
  
  // Statistics
  stats: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    lastDeliveryAt?: Timestamp;
    lastDeliveryStatus: 'success' | 'failed';
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export type WebhookEvent = 
  | 'contact.created'
  | 'contact.updated' 
  | 'contact.deleted'
  | 'company.created'
  | 'company.updated'
  | 'company.deleted'
  | 'publication.created'
  | 'publication.updated'
  | 'publication.deleted';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: {
    id: string;
    organizationId: string;
    [key: string]: any;
  };
  webhook: {
    id: string;
    attempt: number;
  };
}