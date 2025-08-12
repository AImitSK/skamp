// src/app/api/v1/publications/[publicationId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { publicationsAPIService } from '@/lib/api/publications-api-service';
import { APIPublicationUpdateRequest } from '@/types/api-publications';
import { APIResponse } from '@/types/api';

interface RouteParams {
  publicationId: string;
}

/**
 * GET /api/v1/publications/{publicationId}
 * Holt eine einzelne Publikation
 */
export async function GET(request: NextRequest) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context, params?: RouteParams) => {
    try {
      if (!params?.publicationId) {
        throw new Error('Publication ID erforderlich');
      }

      // Parse Query-Parameter für Expansion
      const { searchParams } = new URL(request.url);
      const expand = searchParams.getAll('expand[]');

      const publication = await publicationsAPIService.getPublicationById(
        params.publicationId,
        context.organizationId,
        context.userId,
        expand.length > 0 ? expand : undefined
      );

      const response: APIResponse = {
        success: true,
        data: publication,
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
 * PUT /api/v1/publications/{publicationId}
 * Aktualisiert eine Publikation
 */
export async function PUT(request: NextRequest) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context, params?: RouteParams) => {
    try {
      if (!params?.publicationId) {
        throw new Error('Publication ID erforderlich');
      }

      const body = await request.json() as APIPublicationUpdateRequest;

      const publication = await publicationsAPIService.updatePublication(
        params.publicationId,
        body,
        context.organizationId,
        context.userId
      );

      const response: APIResponse = {
        success: true,
        data: publication,
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
  ['publications:write']
);

/**
 * DELETE /api/v1/publications/{publicationId}
 * Löscht eine Publikation (Soft Delete)
 */
export async function DELETE(request: NextRequest) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context, params?: RouteParams) => {
    try {
      if (!params?.publicationId) {
        throw new Error('Publication ID erforderlich');
      }

      await publicationsAPIService.deletePublication(
        params.publicationId,
        context.organizationId,
        context.userId
      );

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Publikation erfolgreich gelöscht',
          publicationId: params.publicationId
        },
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
  ['publications:delete']
);

/**
 * PATCH /api/v1/publications/{publicationId}
 * Partial Update einer Publikation
 */
export async function PATCH(request: NextRequest) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context, params?: RouteParams) => {
    try {
      if (!params?.publicationId) {
        throw new Error('Publication ID erforderlich');
      }

      const body = await request.json() as Partial<APIPublicationUpdateRequest>;

      const publication = await publicationsAPIService.updatePublication(
        params.publicationId,
        body,
        context.organizationId,
        context.userId
      );

      const response: APIResponse = {
        success: true,
        data: publication,
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
  ['publications:write']
);

/**
 * OPTIONS /api/v1/publications/{publicationId}
 * CORS Preflight-Handler
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}