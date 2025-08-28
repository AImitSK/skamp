// src/app/api/v1/websocket/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAPIKey } from '@/lib/api/api-middleware';
import { webSocketService } from '@/lib/api/websocket-service';
import { APIError } from '@/lib/api/api-errors';

/**
 * GET /api/v1/websocket
 * WebSocket Connection Status und Management
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
    const action = searchParams.get('action');

    switch (action) {
      case 'connections':
        // Hole aktive Verbindungen
        const connections = await webSocketService.getActiveConnections(organizationId);
        return NextResponse.json({
          connections: connections.map(c => ({
            id: c.id,
            userId: c.userId,
            connectionId: c.connectionId,
            connectedAt: c.connectedAt.toDate().toISOString(),
            lastPingAt: c.lastPingAt?.toDate().toISOString(),
            status: c.status,
            messageCount: c.messageCount,
            subscriptions: c.subscriptions.length
          })),
          total: connections.length
        });

      case 'cleanup':
        // Bereinige inaktive Verbindungen (nur für Debugging/Admin)
        await webSocketService.cleanupInactiveConnections();
        await webSocketService.cleanupOldMessages();
        return NextResponse.json({
          message: 'Cleanup completed'
        });

      default:
        return NextResponse.json({
          websocket: {
            endpoint: `wss://${request.headers.get('host')}/api/v1/websocket/connect`,
            protocols: ['celeropress-v1'],
            authentication: 'API Key in Authorization header',
            subscriptionTypes: [
              'contacts',
              'companies',
              'publications',
              'campaigns',
              'bulk_jobs',
              'notifications',
              'system_status'
            ]
          }
        });
    }

  } catch (error) {
    console.error('WebSocket API error:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: {
            code: (error as any).errorCode,
            message: error.message
          }
        },
        { status: getStatusCodeForError((error as any).errorCode) }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Serverfehler' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/websocket
 * WebSocket-bezogene Aktionen (Notifications, Broadcasting)
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

    const { organizationId, userId } = authResult;
    const body = await request.json();

    switch (body.action) {
      case 'broadcast_notification':
        // Sende Notification an alle Verbindungen der Organisation
        if (!body.notification) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'notification is required' } },
            { status: 400 }
          );
        }

        await webSocketService.sendNotification(organizationId, {
          level: body.notification.level || 'info',
          title: body.notification.title,
          message: body.notification.message,
          data: body.notification.data
        });

        return NextResponse.json({
          message: 'Notification sent successfully'
        });

      case 'broadcast_event':
        // Sende Event an passende Subscriptions
        if (!body.event) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'event is required' } },
            { status: 400 }
          );
        }

        await webSocketService.broadcastEvent({
          subscriptionType: body.subscriptionType,
          event: {
            type: body.event.type,
            entity: body.event.entity,
            entityId: body.event.entityId,
            action: body.event.action,
            data: body.event.data,
            timestamp: new Date().toISOString(),
            organizationId
          },
          recipients: body.recipients || []
        });

        return NextResponse.json({
          message: 'Event broadcast successfully'
        });

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: 'Unknown action' } },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('WebSocket POST error:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: {
            code: (error as any).errorCode,
            message: error.message
          }
        },
        { status: getStatusCodeForError((error as any).errorCode) }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Serverfehler' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/websocket
 * Schließt WebSocket-Verbindungen
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

    const { organizationId } = authResult;
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'connectionId is required' } },
        { status: 400 }
      );
    }

    // Prüfe ob Connection zur Organisation gehört
    const connections = await webSocketService.getActiveConnections(organizationId);
    const connection = connections.find(c => c.connectionId === connectionId);

    if (!connection) {
      return NextResponse.json(
        { error: { code: 'CONNECTION_NOT_FOUND', message: 'WebSocket connection not found' } },
        { status: 404 }
      );
    }

    // Schließe Verbindung
    await webSocketService.unregisterConnection(connectionId);

    return NextResponse.json({
      message: 'WebSocket connection closed successfully'
    });

  } catch (error) {
    console.error('WebSocket DELETE error:', error);
    
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Serverfehler' } },
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
    case 'INVALID_ACTION':
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