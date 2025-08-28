// src/lib/api/api-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { apiAuthService } from './api-auth-service';
import { 
  APIRequestContext, 
  APIError, 
  API_ERROR_CODES, 
  APIPermission,
  APIResponse 
} from '@/types/api';

/**
 * API-Middleware für Authentifizierung und Authorization
 */
export class APIMiddleware {
  
  /**
   * Authentifiziert API-Request und gibt Context zurück
   */
  static async authenticate(request: NextRequest): Promise<APIRequestContext> {
    // DEBUG: Log alle eingehenden Headers
    console.log('=== API MIDDLEWARE DEBUG ===');
    console.log('Request URL:', request.url);
    console.log('Request Method:', request.method);
    
    // Extrahiere API-Key aus Headers
    const authHeader = request.headers.get('authorization');
    console.log('Authorization Header RAW:', authHeader);
    
    const apiKey = this.extractAPIKey(authHeader);
    console.log('Extracted API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NULL');
    
    if (!apiKey) {
      console.log('ERROR: No API key found in request');
      throw new APIError(
        401, 
        API_ERROR_CODES.INVALID_API_KEY, 
        'API key required. Use Authorization: Bearer <your-api-key>'
      );
    }
    
    // Client-Info für Rate-Limiting und Audit
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    console.log('Client IP:', clientIP);
    console.log('User Agent:', userAgent);
    
    // Validiere API-Key und hole Context
    console.log('Calling apiAuthService.validateAPIKey...');
    try {
      const context = await apiAuthService.validateAPIKey(apiKey, clientIP, userAgent);
      console.log('API Key validation SUCCESS');
      console.log('Context organizationId:', context.organizationId);
      console.log('Context permissions:', context.permissions);
      
      // Prüfe Rate-Limits
      const endpoint = this.getEndpointName(request);
      await apiAuthService.checkRateLimit(context, endpoint);
      
      console.log('=== API MIDDLEWARE SUCCESS ===');
      return context;
      
    } catch (validationError) {
      console.log('ERROR: API Key validation FAILED');
      console.log('Validation error:', validationError);
      throw validationError;
    }
  }
  
  /**
   * Prüft ob Request die erforderlichen Permissions hat
   */
  static authorize(context: APIRequestContext, requiredPermissions: APIPermission[]): void {
    if (!apiAuthService.hasPermission(context, requiredPermissions)) {
      throw new APIError(
        403,
        API_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        `Required permissions: ${requiredPermissions.join(', ')}`
      );
    }
  }
  
  /**
   * Wrapper-Funktion für API-Routes mit Authentication/Authorization
   */
  static withAuth(
    handler: (request: NextRequest, context: APIRequestContext, params?: any) => Promise<NextResponse>,
    requiredPermissions: APIPermission[] = []
  ) {
    return async (request: NextRequest, routeParams?: { params: any }): Promise<NextResponse> => {
      try {
        // Authentifizierung
        const context = await this.authenticate(request);
        
        // Authorization
        if (requiredPermissions.length > 0) {
          this.authorize(context, requiredPermissions);
        }
        
        // Führe Handler aus
        return await handler(request, context, routeParams?.params);
        
      } catch (error) {
        return this.handleError(error);
      }
    };
  }
  
  /**
   * Standardisierte Error-Response
   */
  static handleError(error: unknown): NextResponse {
    console.error('API Error:', error);
    
    if (error instanceof APIError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details
        },
        meta: {
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          version: 'v1'
        }
      };
      
      return NextResponse.json(response, { 
        status: error.statusCode,
        headers: this.getCORSHeaders()
      });
    }
    
    // Unbekannte Fehler
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      },
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    };
    
    return NextResponse.json(response, { 
      status: 500,
      headers: this.getCORSHeaders()
    });
  }
  
  /**
   * Standardisierte Success-Response
   */
  static successResponse<T>(
    data: T, 
    status: number = 200,
    pagination?: APIResponse<T>['pagination']
  ): NextResponse {
    const response: APIResponse<T> = {
      success: true,
      data,
      pagination,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    };
    
    return NextResponse.json(response, { 
      status,
      headers: this.getCORSHeaders()
    });
  }
  
  /**
   * CORS Headers für API-Responses
   */
  static getCORSHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': '*', // In Production: Specific domains
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Verarbeitet OPTIONS-Requests für CORS Preflight
   */
  static handlePreflight(): NextResponse {
    return new NextResponse(null, { 
      status: 200, 
      headers: this.getCORSHeaders() 
    });
  }
  
  /**
   * Private Helper Methods
   */
  
  private static extractAPIKey(authHeader: string | null): string | null {
    if (!authHeader) return null;
    
    // Unterstütze beide Formate:
    // Authorization: Bearer cp_live_abcd1234...
    // Authorization: cp_live_abcd1234...
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    if (authHeader.startsWith('cp_')) {
      return authHeader;
    }
    
    return null;
  }
  
  private static getClientIP(request: NextRequest): string {
    // Versuche verschiedene Header für echte Client-IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    
    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP;
    
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) return cfConnectingIP;
    
    // Fallback zu anderen Headers oder unknown
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;
    
    return 'unknown';
  }
  
  private static getEndpointName(request: NextRequest): string {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Extrahiere Endpoint-Name aus Path
    const parts = pathname.split('/');
    const apiIndex = parts.indexOf('api');
    
    if (apiIndex !== -1 && parts.length > apiIndex + 2) {
      return parts.slice(apiIndex + 1).join('/');
    }
    
    return pathname;
  }
  
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Helper-Funktionen für Request-Parsing
 */
export class RequestParser {
  
  /**
   * Parse JSON Body mit Validierung
   */
  static async parseJSON<T>(request: NextRequest): Promise<T> {
    try {
      const body = await request.json();
      return body as T;
    } catch (error) {
      throw new APIError(
        400,
        API_ERROR_CODES.INVALID_REQUEST_FORMAT,
        'Invalid JSON in request body'
      );
    }
  }
  
  /**
   * Parse Query Parameters mit Typ-Umwandlung
   */
  static parseQuery(request: NextRequest): Record<string, any> {
    const url = new URL(request.url);
    const params: Record<string, any> = {};
    
    url.searchParams.forEach((value, key) => {
      // Versuche automatische Typ-Erkennung
      if (value === 'true') params[key] = true;
      else if (value === 'false') params[key] = false;
      else if (/^\d+$/.test(value)) params[key] = parseInt(value);
      else if (/^\d+\.\d+$/.test(value)) params[key] = parseFloat(value);
      else params[key] = value;
    });
    
    return params;
  }
  
  /**
   * Parse Pagination Parameters
   */
  static parsePagination(request: NextRequest) {
    const query = this.parseQuery(request);
    
    return {
      page: Math.max(1, query.page || 1),
      limit: Math.min(100, Math.max(1, query.limit || 25)),
      sortBy: query.sortBy || 'createdAt',
      sortOrder: (query.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
    };
  }
  
  /**
   * Validiere erforderliche Felder
   */
  static validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missingFields.length > 0) {
      throw new APIError(
        400,
        API_ERROR_CODES.REQUIRED_FIELD_MISSING,
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }
  }
}

// Legacy validateAPIKey Export für Build-Safe Kompatibilität
let validateAPIKey: any;

try {
  // In Laufzeit verwende echte Auth
  const { apiAuthService } = require('./api-auth-service');
  validateAPIKey = async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (!apiKey) {
      return { success: false, error: 'API key required' };
    }
    
    try {
      const context = await apiAuthService.validateAPIKey(apiKey, 'unknown', 'unknown');
      return {
        success: true,
        organizationId: context.organizationId,
        userId: context.userId,
        apiKeyId: context.apiKeyId,
        error: null
      };
    } catch (error) {
      return { success: false, error: 'Invalid API key' };
    }
  };
} catch (error) {
  // Build-Zeit Mock
  const { validateAPIKey: mockValidateAPIKey } = require('./mock-services');
  validateAPIKey = mockValidateAPIKey;
}

export { validateAPIKey };