// src/app/api/v1/developer/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { withAuth } from '@/lib/api/auth-middleware';

/**
 * Developer Portal Stats Endpoint
 * TEMPORÄR: Mock-Implementierung ohne Firebase Admin SDK
 * TODO: Später auf echte Firestore-Implementierung umstellen
 */

/**
 * GET /api/v1/developer/stats
 * Hole Developer Portal Statistiken
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (request, context) => {
    console.log('=== DEVELOPER STATS - MOCK VERSION ===');
    console.log('Organization ID:', context.organizationId);
    console.log('User ID:', context.userId);
    
    try {
      // Mock-Statistiken basierend auf aktuellen Zahlen
      const mockStats = {
        requests_today: Math.floor(Math.random() * 100) + 50,
        requests_month: Math.floor(Math.random() * 2000) + 1000,
        rate_limit: '1000/hour',
        last_request: new Date().toISOString(),
        active_keys: 5, // Passend zu Admin API
        error_rate: parseFloat((Math.random() * 2).toFixed(2)),
        avg_latency: Math.floor(Math.random() * 50) + 30,
        top_endpoints: [
          { endpoint: '/api/v1/contacts', requests: Math.floor(Math.random() * 500) + 200 },
          { endpoint: '/api/v1/companies', requests: Math.floor(Math.random() * 300) + 150 },
          { endpoint: '/api/v1/search', requests: Math.floor(Math.random() * 200) + 100 },
        ]
      };
      
      console.log('Mock Developer Stats:', mockStats);
      return APIMiddleware.successResponse(mockStats);
      
    } catch (error) {
      console.error('Error getting developer stats:', error);
      return APIMiddleware.handleError({
        name: 'APIError',
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to load developer stats'
      });
    }
  });
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}