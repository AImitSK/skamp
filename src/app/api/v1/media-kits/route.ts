// src/app/api/v1/media-kits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { publicationsAPIService } from '@/lib/api/publications-api-service';
import { APIMediaKitGenerateRequest } from '@/types/api-publications';
import { APIResponse } from '@/types/api';

/**
 * POST /api/v1/media-kits
 * Generiert ein neues Media Kit
 */
export const POST = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json() as APIMediaKitGenerateRequest;
      
      // Validierung
      if (!body.companyId) {
        throw new Error('Company ID ist erforderlich');
      }
      
      const mediaKit = await publicationsAPIService.generateMediaKit(
        body,
        context.organizationId,
        context.userId
      );
      
      const response: APIResponse = {
        success: true,
        data: mediaKit,
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      return APIMiddleware.handleError(error);
    }
  },
  ['publications:write', 'advertisements:read']
);

/**
 * OPTIONS /api/v1/media-kits
 * CORS Preflight-Handler
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}