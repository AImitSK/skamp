// src/app/api/v1/media-kits/[mediaKitId]/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { publicationsAPIService } from '@/lib/api/publications-api-service';
import { APIMediaKitShareRequest } from '@/types/api-publications';
import { APIResponse } from '@/types/api';

interface RouteParams {
  mediaKitId: string;
}

/**
 * POST /api/v1/media-kits/{mediaKitId}/share
 * Teilt ein Media Kit mit Empfängern
 */
export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
  return APIMiddleware.withAuth(async (request: NextRequest, context) => {
    try {
      if (!params?.mediaKitId) {
        throw new Error('Media Kit ID erforderlich');
      }

      const body = await request.json() as APIMediaKitShareRequest;
      
      // Validierung
      if (!body.emails || body.emails.length === 0) {
        throw new Error('Mindestens eine E-Mail-Adresse erforderlich');
      }
      
      // E-Mail-Validierung
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = body.emails.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        throw new Error(`Ungültige E-Mail-Adressen: ${invalidEmails.join(', ')}`);
      }
      
      await publicationsAPIService.shareMediaKit(
        params.mediaKitId,
        body,
        context.organizationId,
        context.userId
      );
      
      const response: APIResponse = {
        success: true,
        data: {
          message: 'Media Kit erfolgreich geteilt',
          mediaKitId: params.mediaKitId,
          recipients: body.emails.length
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
  }, ['publications:write'])(request);
}

/**
 * OPTIONS /api/v1/media-kits/{mediaKitId}/share
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