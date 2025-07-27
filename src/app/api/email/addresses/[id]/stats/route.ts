// src/app/api/email/addresses/[id]/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { emailAddressService } from '@/lib/email/email-address-service';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/email/addresses/[id]/stats
 * Aktualisiert die Statistiken einer E-Mail-Adresse
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { type } = body;
      
      // Validate type
      if (!['sent', 'received'].includes(type)) {
        return NextResponse.json(
          { error: 'Ungültiger Statistik-Typ. Erlaubt: sent, received' },
          { status: 400 }
        );
      }
      
      // Update stats
      await emailAddressService.updateStats(id, type);
      
      return NextResponse.json({ 
        message: `Statistiken erfolgreich aktualisiert (${type})` 
      });
      
    } catch (error) {
      console.error('Error updating email stats:', error);
      return NextResponse.json(
        { error: 'Fehler beim Aktualisieren der Statistiken' },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/email/addresses/[id]/stats
 * Holt die Statistiken einer E-Mail-Adresse
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      const { id } = await params;
      const emailAddress = await emailAddressService.get(id);
      
      if (!emailAddress) {
        return NextResponse.json(
          { error: 'E-Mail-Adresse nicht gefunden' },
          { status: 404 }
        );
      }
      
      // Check permission
      if (!emailAddress.permissions.read.includes(context.userId)) {
        return NextResponse.json(
          { error: 'Keine Berechtigung' },
          { status: 403 }
        );
      }
      
      // Return stats
      return NextResponse.json({ 
        stats: {
          emailsSent: emailAddress.emailsSent || 0,
          emailsReceived: emailAddress.emailsReceived || 0,
          lastUsedAt: emailAddress.lastUsedAt || null,
          isActive: emailAddress.isActive,
          createdAt: emailAddress.createdAt
        }
      });
      
    } catch (error) {
      console.error('Error fetching email stats:', error);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Statistiken' },
        { status: 500 }
      );
    }
  });
}