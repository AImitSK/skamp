// src/app/api/v1/media-assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { publicationsAPIService } from '@/lib/api/publications-api-service';
import { 
  APIMediaAssetSearchParams,
  APIMediaAssetCreateRequest 
} from '@/types/api-publications';
import { APIResponse } from '@/types/api';

/**
 * GET /api/v1/media-assets
 * Holt Liste aller Media Assets (Werbemittel) mit Filtern
 */
export async function GET(request: NextRequest) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    try {
      // Parse Query-Parameter
      const { searchParams } = new URL(request.url);
      
      const params: APIMediaAssetSearchParams = {
        // Textsuche
        search: searchParams.get('search') || undefined,
        
        // Filter
        publicationIds: searchParams.getAll('publicationIds[]'),
        types: searchParams.getAll('types[]') as any,
        categories: searchParams.getAll('categories[]'),
        tags: searchParams.getAll('tags[]'),
        
        // Preis-Filter
        minPrice: searchParams.get('minPrice')
          ? parseFloat(searchParams.get('minPrice')!)
          : undefined,
        maxPrice: searchParams.get('maxPrice')
          ? parseFloat(searchParams.get('maxPrice')!)
          : undefined,
        currency: searchParams.get('currency') as any,
        priceModels: searchParams.getAll('priceModels[]') as any,
        
        // Status
        status: searchParams.getAll('status[]') as any,
        
        // Pagination
        page: searchParams.get('page')
          ? parseInt(searchParams.get('page')!)
          : 1,
        limit: searchParams.get('limit')
          ? Math.min(parseInt(searchParams.get('limit')!), 100)
          : 50,
        
        // Sortierung
        sortBy: searchParams.get('sortBy') as any || 'createdAt',
        sortOrder: searchParams.get('sortOrder') as any || 'desc'
      };

      // Hole Media Assets
      const result = await publicationsAPIService.getMediaAssets(
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
  },
  ['advertisements:read']
);

/**
 * POST /api/v1/media-assets
 * Erstellt ein neues Media Asset (Werbemittel)
 */
export async function POST(request: NextRequest) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json() as APIMediaAssetCreateRequest;
      
      const asset = await publicationsAPIService.createMediaAsset(
        body,
        context.organizationId,
        context.userId
      );
      
      const response: APIResponse = {
        success: true,
        data: asset,
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
  ['advertisements:write']
);

/**
 * OPTIONS /api/v1/media-assets
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