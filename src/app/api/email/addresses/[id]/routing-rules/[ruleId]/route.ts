// src/app/api/email/addresses/[id]/routing-rules/[ruleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { emailAddressService } from '@/lib/email/email-address-service';

interface RouteParams {
  params: Promise<{
    id: string;
    ruleId: string;
  }>;
}

/**
 * DELETE /api/email/addresses/[id]/routing-rules/[ruleId]
 * Löscht eine Routing-Regel
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      const { id, ruleId } = await params;
      await emailAddressService.removeRoutingRule(
        id,
        ruleId,
        context.userId
      );
      
      return NextResponse.json({ 
        message: 'Routing-Regel erfolgreich gelöscht' 
      });
      
    } catch (error) {
      console.error('Error deleting routing rule:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('nicht gefunden')) {
          return NextResponse.json(
            { error: error.message },
            { status: 404 }
          );
        }
        if (error.message.includes('Keine Berechtigung')) {
          return NextResponse.json(
            { error: error.message },
            { status: 403 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Fehler beim Löschen der Routing-Regel' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/email/addresses/[id]/routing-rules/[ruleId]
 * Aktualisiert eine Routing-Regel
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      const { id, ruleId } = await params;
      
      // Get current email address
      const emailAddress = await emailAddressService.get(id);
      
      if (!emailAddress) {
        return NextResponse.json(
          { error: 'E-Mail-Adresse nicht gefunden' },
          { status: 404 }
        );
      }
      
      // Check permission
      if (!emailAddress.permissions.manage.includes(context.userId)) {
        return NextResponse.json(
          { error: 'Keine Berechtigung zum Bearbeiten von Routing-Regeln' },
          { status: 403 }
        );
      }
      
      // Parse request body
      const body = await req.json();
      
      // Find and update rule
      const updatedRules = (emailAddress.routingRules || []).map(rule => {
        if (rule.id === ruleId) {
          return {
            ...rule,
            ...body,
            id: rule.id // Preserve ID
          };
        }
        return rule;
      });
      
      // Check if rule was found
      const ruleFound = updatedRules.some(rule => rule.id === ruleId);
      if (!ruleFound) {
        return NextResponse.json(
          { error: 'Routing-Regel nicht gefunden' },
          { status: 404 }
        );
      }
      
      // Update in database
      await emailAddressService.update(
        id,
        { routingRules: updatedRules } as any,
        context.userId
      );
      
      const updatedRule = updatedRules.find(rule => rule.id === ruleId);
      
      return NextResponse.json({ 
        rule: updatedRule,
        message: 'Routing-Regel erfolgreich aktualisiert' 
      });
      
    } catch (error) {
      console.error('Error updating routing rule:', error);
      return NextResponse.json(
        { error: 'Fehler beim Aktualisieren der Routing-Regel' },
        { status: 500 }
      );
    }
  });
}