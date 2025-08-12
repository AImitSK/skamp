// src/app/api/v1/webhooks/[webhookId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { webhookService } from '@/lib/api/webhook-service';
import { APIWebhookUpdateRequest } from '@/types/api-webhooks';
import { APIResponse } from '@/types/api';

interface RouteParams {
  webhookId: string;
}

/**
 * GET /api/v1/webhooks/{webhookId}
 * Holt einen einzelnen Webhook
 */
export async function GET(request: NextRequest) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context, params?: RouteParams) => {
    try {
      if (!params?.webhookId) {
        throw new Error('Webhook ID erforderlich');
      }

      const webhook = await webhookService.getWebhookById(
        params.webhookId,
        context.organizationId
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

      return NextResponse.json(response);
    } catch (error) {
      return APIMiddleware.handleError(error);
    }
  },
  ['webhooks:manage']
);

/**
 * PUT /api/v1/webhooks/{webhookId}
 * Aktualisiert einen Webhook
 */
export async function PUT(request: NextRequest) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context, params?: RouteParams) => {
    try {
      if (!params?.webhookId) {
        throw new Error('Webhook ID erforderlich');
      }

      const body = await request.json() as APIWebhookUpdateRequest;

      const webhook = await webhookService.updateWebhook(
        params.webhookId,
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

      return NextResponse.json(response);
    } catch (error) {
      return APIMiddleware.handleError(error);
    }
  },
  ['webhooks:manage']
);

/**
 * DELETE /api/v1/webhooks/{webhookId}
 * Löscht einen Webhook
 */
export async function DELETE(request: NextRequest) {
  return APIMiddleware.withAuth(
  async (request: NextRequest, context, params?: RouteParams) => {
    try {
      if (!params?.webhookId) {
        throw new Error('Webhook ID erforderlich');
      }

      await webhookService.deleteWebhook(
        params.webhookId,
        context.organizationId
      );

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Webhook erfolgreich gelöscht',
          webhookId: params.webhookId
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
 * OPTIONS /api/v1/webhooks/{webhookId}
 * CORS Preflight-Handler
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}