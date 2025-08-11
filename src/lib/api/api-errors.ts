// src/lib/api/api-errors.ts

/**
 * Benutzerdefinierte API-Fehlerklasse für konsistente Fehlerbehandlung
 */
export class APIError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(
    errorCode: string,
    message: string,
    details?: any,
    statusCode?: number
  ) {
    super(message);
    this.name = 'APIError';
    this.errorCode = errorCode;
    this.details = details;
    
    // Bestimme Status Code basierend auf Error Code
    this.statusCode = statusCode || this.getStatusCodeForError(errorCode);
  }

  private getStatusCodeForError(errorCode: string): number {
    const errorCodeMap: Record<string, number> = {
      // 400 Bad Request
      'VALIDATION_ERROR': 400,
      'INVALID_REQUEST': 400,
      'MISSING_REQUIRED_FIELDS': 400,
      'INVALID_PUBLISHER': 400,
      'INVALID_METRICS': 400,
      
      // 401 Unauthorized
      'UNAUTHORIZED': 401,
      'INVALID_API_KEY': 401,
      'EXPIRED_API_KEY': 401,
      
      // 403 Forbidden
      'FORBIDDEN': 403,
      'INSUFFICIENT_PERMISSIONS': 403,
      'IP_NOT_ALLOWED': 403,
      
      // 404 Not Found
      'NOT_FOUND': 404,
      'PUBLICATION_NOT_FOUND': 404,
      'ASSET_NOT_FOUND': 404,
      'RESOURCE_NOT_FOUND': 404,
      
      // 409 Conflict
      'CONFLICT': 409,
      'DUPLICATE_TITLE': 409,
      'RESOURCE_CONFLICT': 409,
      
      // 429 Too Many Requests
      'RATE_LIMIT_EXCEEDED': 429,
      'BURST_LIMIT_EXCEEDED': 429,
      
      // 500 Internal Server Error
      'INTERNAL_SERVER_ERROR': 500,
      'DATABASE_ERROR': 500,
      
      // 503 Service Unavailable
      'SERVICE_UNAVAILABLE': 503
    };

    return errorCodeMap[errorCode] || 500;
  }

  toJSON() {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        details: this.details
      }
    };
  }
}

/**
 * Standard API Error Codes
 */
export const API_ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_API_KEY: 'EXPIRED_API_KEY',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  IP_NOT_ALLOWED: 'IP_NOT_ALLOWED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  BURST_LIMIT_EXCEEDED: 'BURST_LIMIT_EXCEEDED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_PUBLISHER: 'INVALID_PUBLISHER',
  INVALID_METRICS: 'INVALID_METRICS',
  DUPLICATE_TITLE: 'DUPLICATE_TITLE',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  PUBLICATION_NOT_FOUND: 'PUBLICATION_NOT_FOUND',
  ASSET_NOT_FOUND: 'ASSET_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // System
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

export type APIErrorCode = keyof typeof API_ERROR_CODES;