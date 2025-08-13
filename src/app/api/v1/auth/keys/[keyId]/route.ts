// src/app/api/v1/auth/keys/[keyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { withAuth } from '@/lib/api/auth-middleware';

/**
 * API-Key Management - Einzelne Key Operationen
 * TEMPORÄR: Mock-Implementierung ohne Firebase Admin SDK
 */

// Reference zu Mock-Daten aus route.ts (vereinfacht für einzelne Keys)
function getMockAPIKey(organizationId: string, keyId: string) {
  // Für Mock: Return dummy data basierend auf keyId
  if (keyId.startsWith('key_')) {
    return {
      id: keyId,
      name: `API Key ${keyId}`,
      keyPreview: 'cp_live_mock...',
      permissions: ['contacts:read'],
      isActive: true,
      rateLimit: {
        requestsPerHour: 1000,
        requestsPerMinute: 60
      },
      usage: {
        totalRequests: Math.floor(Math.random() * 10000),
        requestsThisHour: Math.floor(Math.random() * 50),
        requestsToday: Math.floor(Math.random() * 500)
      },
      createdAt: new Date().toISOString()
    };
  }
  return null;
}

/**
 * DELETE /api/v1/auth/keys/[keyId]
 * Lösche API-Key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  return withAuth(request, async (request, context) => {
    console.log('=== API KEY DELETE - MOCK VERSION ===');
    console.log('Key ID:', params.keyId);
    console.log('Organization ID:', context.organizationId);
    
    try {
      const mockKey = getMockAPIKey(context.organizationId, params.keyId);
      
      if (!mockKey) {
        return APIMiddleware.handleError({
          name: 'APIError',
          statusCode: 404,
          errorCode: 'NOT_FOUND',
          message: 'API key not found'
        });
      }
      
      console.log('Mock API Key deleted:', params.keyId);
      
      return APIMiddleware.successResponse({
        success: true,
        message: 'API key deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting API key:', error);
      return APIMiddleware.handleError({
        name: 'APIError',
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to delete API key'
      });
    }
  });
}

/**
 * PUT /api/v1/auth/keys/[keyId]
 * Update API-Key (Status, Permissions, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  return withAuth(request, async (request, context) => {
    console.log('=== API KEY UPDATE - MOCK VERSION ===');
    console.log('Key ID:', params.keyId);
    
    try {
      const body = await request.json();
      console.log('Update request:', body);
      
      const mockKey = getMockAPIKey(context.organizationId, params.keyId);
      
      if (!mockKey) {
        return APIMiddleware.handleError({
          name: 'APIError',
          statusCode: 404,
          errorCode: 'NOT_FOUND',
          message: 'API key not found'
        });
      }
      
      // Mock Update
      const updatedKey = {
        ...mockKey,
        ...body,
        id: params.keyId, // Keep original ID
        updatedAt: new Date().toISOString()
      };
      
      console.log('Mock API Key updated:', params.keyId);
      
      return APIMiddleware.successResponse(updatedKey);
      
    } catch (error) {
      console.error('Error updating API key:', error);
      return APIMiddleware.handleError({
        name: 'APIError',
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to update API key'
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