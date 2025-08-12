// src/app/api/v1/publications/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { publicationsAPIService } from '@/lib/api/publications-api-service';
import { APIResponse } from '@/types/api';

/**
 * GET /api/v1/publications/statistics
 * Holt Statistiken über alle Publikationen
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    try {
      const statistics = await publicationsAPIService.getPublicationsStatistics(
        context.organizationId,
        context.userId
      );

      const response: APIResponse = {
        success: true,
        data: statistics,
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      return NextResponse.json(response);
    } catch (error) {
      return APIMiddleware.handleError(error);
    }
  },
  ['publications:read']
);

/**
 * OPTIONS /api/v1/publications/statistics
 * CORS Preflight-Handler
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}