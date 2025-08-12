// src/app/api/v1/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { webhookService } from '@/lib/api/webhook-service';
import { 
  APIWebhookCreateRequest,
  WebhookEvent 
} from '@/types/api-webhooks';
import { APIResponse } from '@/types/api';

/**
 * GET /api/v1/webhooks
 * Holt Liste aller Webhooks mit Filtern
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    try {
      // Parse Query-Parameter
      const { searchParams } = new URL(request.url);
      
      const params = {
        page: searchParams.get('page') 
          ? parseInt(searchParams.get('page')!) 
          : 1,
        limit: searchParams.get('limit')
          ? Math.min(parseInt(searchParams.get('limit')!), 100)
          : 50,
        isActive: searchParams.get('isActive') !== null
          ? searchParams.get('isActive') === 'true'
          : undefined,
        events: searchParams.getAll('events[]') as WebhookEvent[]
      };

      // Hole Webhooks
      const result = await webhookService.getWebhooks(
        context.organizationId,
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
  ['webhooks:manage']
);

/**
 * POST /api/v1/webhooks
 * Erstellt einen neuen Webhook
 */
export const POST = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json() as APIWebhookCreateRequest;
      
      const webhook = await webhookService.createWebhook(
        body,
        context.organizationId,
        context.userId
      );
      
      const response: APIResponse = {
        success: true,
        data: webhook,
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
  ['webhooks:manage']
);

/**
 * OPTIONS /api/v1/webhooks
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