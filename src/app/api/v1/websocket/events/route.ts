// src/app/api/v1/websocket/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAPIKey } from '@/lib/api/api-middleware';
import { webSocketService } from '@/lib/api/websocket-service';
import { APIError } from '@/lib/api/api-errors';

/**
 * GET /api/v1/websocket/events
 * Server-Sent Events (SSE) Endpoint als WebSocket-Alternative
 * 
 * Bietet unidirektionale Real-time Updates über HTTP
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

    const { organizationId, userId } = authResult;
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'connectionId is required' } },
        { status: 400 }
      );
    }

    // Registriere Connection
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                     request.headers.get('x-real-ip') || undefined;

    await webSocketService.registerConnection(
      connectionId,
      userId,
      organizationId,
      userAgent,
      ipAddress
    );

    // Setup Server-Sent Events
    const encoder = new TextEncoder();
    let isAlive = true;

    const stream = new ReadableStream({
      start(controller) {
        // Sende initiale Connection-Message
        const initialMessage = {
          type: 'connection',
          data: {
            connectionId,
            timestamp: new Date().toISOString(),
            message: 'Connected to CeleroPress real-time events'
          }
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
        );

        // Ping Interval
        const pingInterval = setInterval(() => {
          if (!isAlive) {
            clearInterval(pingInterval);
            return;
          }

          const pingMessage = {
            type: 'ping',
            timestamp: new Date().toISOString()
          };

          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(pingMessage)}\n\n`)
            );
          } catch (error) {
            console.error('SSE ping error:', error);
            isAlive = false;
            clearInterval(pingInterval);
          }
        }, 30000); // 30 Sekunden

        // Cleanup when connection closes
        request.signal?.addEventListener('abort', async () => {
          isAlive = false;
          clearInterval(pingInterval);
          await webSocketService.unregisterConnection(connectionId);
          try {
            controller.close();
          } catch (error) {
            // Controller already closed
          }
        });
      },

      cancel() {
        isAlive = false;
      }
    });

    // Return SSE Response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Credentials': 'true'
      }
    });

  } catch (error) {
    console.error('SSE events error:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: getStatusCodeForError(error.code) }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'SSE setup failed' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/websocket/events
 * Trigger Events für SSE-Clients
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

    if (!body.event) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'event is required' } },
        { status: 400 }
      );
    }

    // Broadcast Event
    await webSocketService.broadcastEvent({
      subscriptionType: body.subscriptionType || 'notifications',
      event: {
        type: body.event.type,
        entity: body.event.entity || 'system',
        entityId: body.event.entityId || 'system',
        action: body.event.action || 'notification',
        data: body.event.data || {},
        timestamp: new Date().toISOString(),
        organizationId
      },
      recipients: body.recipients || []
    });

    return NextResponse.json({
      message: 'Event triggered successfully',
      event: body.event
    });

  } catch (error) {
    console.error('SSE trigger error:', error);
    
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Event trigger failed' } },
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