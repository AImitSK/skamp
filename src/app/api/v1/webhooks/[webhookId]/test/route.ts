// src/app/api/v1/webhooks/[webhookId]/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { webhookService } from '@/lib/api/webhook-service';
import { APIWebhookTestRequest } from '@/types/api-webhooks';
import { APIResponse } from '@/types/api';

interface RouteParams {
  webhookId: string;
}

/**
 * POST /api/v1/webhooks/{webhookId}/test
 * Testet einen Webhook
 */
export async function POST(request: NextRequest, { params }: { params: { webhookId: string } }) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context, params?: RouteParams) => {
    try {
      if (!params?.webhookId) {
        throw new Error('Webhook ID erforderlich');
      }

      const body = await request.json() as Omit<APIWebhookTestRequest, 'webhookId'>;
      
      const testRequest: APIWebhookTestRequest = {
        ...body,
        webhookId: params.webhookId
      };

      const result = await webhookService.testWebhook(
        testRequest,
        context.organizationId
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

      return NextResponse.json(response);
    } catch (error) {
      return APIMiddleware.handleError(error);
    }
  }, ['webhooks:manage'])(request);
}

/**
 * OPTIONS /api/v1/webhooks/{webhookId}/test
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