// src/app/api/v1/websocket/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAPIKey } from '@/lib/api/api-middleware';
import { webSocketService } from '@/lib/api/websocket-service';
import { APIError } from '@/lib/api/api-errors';
import { WebSocketSubscriptionType } from '@/types/api-advanced';

/**
 * GET /api/v1/websocket/subscriptions
 * Holt aktive Subscriptions für eine Connection
 */
export async function GET(request: NextRequest) {
  try {
    // API-Key Validierung
    const authResult = await validateAPIKey(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { organizationId } = authResult;
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'connectionId is required' } },
        { status: 400 }
      );
    }

    // Hole aktive Connections und finde die angeforderte
    const connections = await webSocketService.getActiveConnections(organizationId);
    const connection = connections.find(c => c.connectionId === connectionId);

    if (!connection) {
      return NextResponse.json(
        { error: { code: 'CONNECTION_NOT_FOUND', message: 'WebSocket connection not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      connectionId,
      subscriptions: connection.subscriptions.map(s => ({
        id: s.id,
        type: s.type,
        filters: s.filters,
        createdAt: s.createdAt.toDate().toISOString()
      })),
      total: connection.subscriptions.length,
      availableTypes: [
        'contacts',
        'companies', 
        'publications',
        'campaigns',
        'bulk_jobs',
        'notifications',
        'system_status'
      ]
    });

  } catch (error) {
    console.error('WebSocket subscriptions GET error:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: {
            code: (error as any).code || 'UNKNOWN_ERROR',
            message: error.message
          }
        },
        { status: getStatusCodeForError((error as any).code || 'UNKNOWN_ERROR') }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Serverfehler' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/websocket/subscriptions
 * Erstellt eine neue Subscription
 */
export async function POST(request: NextRequest) {
  try {
    // API-Key Validierung
    const authResult = await validateAPIKey(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { organizationId } = authResult;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'connectionId is required' } },
        { status: 400 }
      );
    }

    if (!body.type) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'subscription type is required' } },
        { status: 400 }
      );
    }

    // Validiere Subscription Type
    const validTypes: WebSocketSubscriptionType[] = [
      'contacts',
      'companies', 
      'publications',
      'campaigns',
      'bulk_jobs',
      'notifications',
      'system_status'
    ];

    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_SUBSCRIPTION_TYPE', 
            message: `Invalid subscription type. Valid types: ${validTypes.join(', ')}`
          } 
        },
        { status: 400 }
      );
    }

    // Erstelle Subscription
    const subscriptionId = await webSocketService.addSubscription(
      connectionId,
      body.type,
      body.filters
    );

    return NextResponse.json({
      subscriptionId,
      type: body.type,
      filters: body.filters,
      connectionId,
      message: 'Subscription created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('WebSocket subscription POST error:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: {
            code: (error as any).code || 'UNKNOWN_ERROR',
            message: error.message
          }
        },
        { status: getStatusCodeForError((error as any).code || 'UNKNOWN_ERROR') }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Subscription creation failed' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/websocket/subscriptions
 * Entfernt eine Subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    // API-Key Validierung
    const authResult = await validateAPIKey(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const subscriptionId = searchParams.get('subscriptionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'connectionId is required' } },
        { status: 400 }
      );
    }

    if (!subscriptionId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'subscriptionId is required' } },
        { status: 400 }
      );
    }

    // Entferne Subscription
    await webSocketService.removeSubscription(connectionId, subscriptionId);

    return NextResponse.json({
      message: 'Subscription removed successfully',
      subscriptionId,
      connectionId
    });

  } catch (error) {
    console.error('WebSocket subscription DELETE error:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: {
            code: (error as any).code || 'UNKNOWN_ERROR',
            message: error.message
          }
        },
        { status: getStatusCodeForError((error as any).code || 'UNKNOWN_ERROR') }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Subscription removal failed' } },
      { status: 500 }
    );
  }
}

/**
 * Mappt Error-Codes zu HTTP-Status-Codes
 */
function getStatusCodeForError(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
    case 'INVALID_SUBSCRIPTION_TYPE':
      return 400;
    case 'CONNECTION_NOT_FOUND':
      return 404;
    case 'CONNECTION_LIMIT_EXCEEDED':
      return 429;
    case 'INTERNAL_SERVER_ERROR':
    default:
      return 500;
  }
}