// src/app/api/v1/auth/test/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';

/**
 * Test-Endpoint für API-Authentifizierung
 * GET /api/v1/auth/test
 * 
 * Testet ob API-Key korrekt validiert wird und gibt Context-Info zurück
 */
export async function GET(request: NextRequest) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    // Return API-Context für Debugging/Testing
    const responseData = {
      message: 'API Authentication successful!',
      context: {
        organizationId: context.organizationId,
        userId: context.userId,
        apiKeyId: context.apiKeyId,
        permissions: context.permissions,
        clientIP: context.clientIP,
        userAgent: context.userAgent,
        rateLimit: {
          requestsPerHour: context.rateLimit.requestsPerHour,
          requestsPerMinute: context.rateLimit.requestsPerMinute,
          burstLimit: context.rateLimit.burstLimit
        }
      },
      requestInfo: {
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString()
      }
    };
    
    return APIMiddleware.successResponse(responseData);
    
  })(request);
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}