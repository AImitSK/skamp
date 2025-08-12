// src/app/api/v1/publications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { publicationsAPIService } from '@/lib/api/publications-api-service';
import { 
  APIPublicationSearchParams,
  APIPublicationCreateRequest,
  APIPublicationBulkCreateRequest 
} from '@/types/api-publications';
import { APIResponse } from '@/types/api';

/**
 * GET /api/v1/publications
 * Holt Liste aller Publikationen mit Filtern
 */
export async function GET(request: NextRequest) {
  return APIMiddleware.withAuth(async (request: NextRequest, context) => {
    try {
      // Parse Query-Parameter
      const { searchParams } = new URL(request.url);
      
      const params: APIPublicationSearchParams = {
        // Textsuche
        search: searchParams.get('search') || undefined,
        
        // Filter
        types: searchParams.getAll('types[]') as any,
        formats: searchParams.getAll('formats[]') as any,
        frequencies: searchParams.getAll('frequencies[]') as any,
        languages: searchParams.getAll('languages[]') as any,
        countries: searchParams.getAll('countries[]') as any,
        publisherIds: searchParams.getAll('publisherIds[]'),
        focusAreas: searchParams.getAll('focusAreas[]'),
        targetIndustries: searchParams.getAll('targetIndustries[]'),
        
        // Metriken-Filter
        minCirculation: searchParams.get('minCirculation') 
          ? parseInt(searchParams.get('minCirculation')!) 
          : undefined,
        maxCirculation: searchParams.get('maxCirculation')
          ? parseInt(searchParams.get('maxCirculation')!)
          : undefined,
        minMonthlyVisitors: searchParams.get('minMonthlyVisitors')
          ? parseInt(searchParams.get('minMonthlyVisitors')!)
          : undefined,
        maxMonthlyVisitors: searchParams.get('maxMonthlyVisitors')
          ? parseInt(searchParams.get('maxMonthlyVisitors')!)
          : undefined,
        
        // Status
        status: searchParams.getAll('status[]') as any,
        onlyVerified: searchParams.get('onlyVerified') === 'true',
        
        // Pagination
        page: searchParams.get('page') 
          ? parseInt(searchParams.get('page')!) 
          : 1,
        limit: searchParams.get('limit')
          ? Math.min(parseInt(searchParams.get('limit')!), 100)
          : 50,
        
        // Sortierung
        sortBy: searchParams.get('sortBy') as any || 'createdAt',
        sortOrder: searchParams.get('sortOrder') as any || 'desc',
        
        // Expansion
        expand: searchParams.getAll('expand[]') as any
      };

      // Hole Publikationen
      const result = await publicationsAPIService.getPublications(
        context.organizationId,
        context.userId,
        params
      );

      const response: APIResponse = {
        success: true,
        data: result,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasNext: result.hasNext,
          hasPrevious: result.page > 1
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
  }, ['publications:read'])(request);
}

/**
 * POST /api/v1/publications
 * Erstellt neue Publikation oder Bulk-Import
 */
export async function POST(request: NextRequest) {
  return APIMiddleware.withAuth(async (request: NextRequest, context) => {
    try {
      const body = await request.json();
      
      // Prüfe ob es ein Bulk-Request ist
      const isBulkRequest = Array.isArray(body.publications);
      
      if (isBulkRequest) {
        // Bulk-Import
        const bulkRequest = body as APIPublicationBulkCreateRequest;
        
        // Validierung
        if (!bulkRequest.publications || bulkRequest.publications.length === 0) {
          throw new Error('Keine Publikationen zum Importieren');
        }
        
        if (bulkRequest.publications.length > 100) {
          throw new Error('Maximal 100 Publikationen pro Bulk-Import erlaubt');
        }
        
        const result = await publicationsAPIService.bulkCreatePublications(
          bulkRequest,
          context.organizationId,
          context.userId
        );
        
        const response: APIResponse = {
          success: true,
          data: result,
          meta: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        
        return NextResponse.json(response, { status: 201 });
      } else {
        // Einzelne Publikation erstellen
        const createRequest = body as APIPublicationCreateRequest;
        
        const publication = await publicationsAPIService.createPublication(
          createRequest,
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
        
        return NextResponse.json(response, { status: 201 });
      }
    } catch (error) {
      return APIMiddleware.handleError(error);
    }
  }, ['publications:write'])(request);
}

/**
 * OPTIONS /api/v1/publications
 * CORS Preflight-Handler
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}