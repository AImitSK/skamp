// src/app/api/v1/webhooks/[webhookId]/deliveries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { 
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase/build-safe-init';
import { WebhookDelivery, APIWebhookDelivery } from '@/types/api-webhooks';
import { APIResponse } from '@/types/api';

interface RouteParams {
  webhookId: string;
}

/**
 * GET /api/v1/webhooks/{webhookId}/deliveries
 * Holt Delivery-History eines Webhooks
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context, params?: RouteParams) => {
    try {
      if (!params?.webhookId) {
        throw new Error('Webhook ID erforderlich');
      }

      // Parse Query-Parameter
      const { searchParams } = new URL(request.url);
      
      const page = searchParams.get('page') 
        ? parseInt(searchParams.get('page')!) 
        : 1;
      const pageLimit = searchParams.get('limit')
        ? Math.min(parseInt(searchParams.get('limit')!), 100)
        : 50;
      const status = searchParams.get('status');

      // Build Query
      const constraints = [
        where('webhookId', '==', params.webhookId),
        where('organizationId', '==', context.organizationId),
        orderBy('scheduledAt', 'desc')
      ];

      if (status) {
        constraints.push(where('status', '==', status));
      }

      // Hole Deliveries
      const deliveriesQuery = query(
        collection(db, 'webhook_deliveries'),
        ...constraints,
        limit(pageLimit * page) // Hole mehr für Pagination
      );

      const snapshot = await getDocs(deliveriesQuery);
      let deliveries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WebhookDelivery));

      // Manual Pagination (da Firestore offset nicht gut unterstützt)
      const startIndex = (page - 1) * pageLimit;
      const paginatedDeliveries = deliveries.slice(startIndex, startIndex + pageLimit);

      // Transform zu API-Format
      const apiDeliveries: APIWebhookDelivery[] = paginatedDeliveries.map(d => ({
        id: d.id!,
        webhookId: d.webhookId,
        event: d.event,
        eventId: d.eventId,
        status: d.status,
        attempt: d.attempt,
        response: d.response ? {
          statusCode: d.response.statusCode,
          duration: d.response.duration
        } : undefined,
        error: d.error,
        scheduledAt: d.scheduledAt.toDate().toISOString(),
        deliveredAt: d.deliveredAt?.toDate().toISOString(),
        nextRetryAt: d.nextRetryAt?.toDate().toISOString()
      }));

      const response: APIResponse = {
        success: true,
        data: {
          deliveries: apiDeliveries,
          total: deliveries.length,
          page,
          limit: pageLimit,
          hasNext: startIndex + pageLimit < deliveries.length
        },
        pagination: {
          page,
          limit: pageLimit,
          total: deliveries.length,
          hasNext: startIndex + pageLimit < deliveries.length,
          hasPrevious: page > 1
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
 * OPTIONS /api/v1/webhooks/{webhookId}/deliveries
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