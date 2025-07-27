// src/app/api/email/addresses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { emailAddressService } from '@/lib/email/email-address-service';
import { EmailAddressFormData } from '@/types/email-enhanced';
import { z } from 'zod';

// Validation Schema für PUT
const updateEmailAddressSchema = z.object({
  displayName: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  inboxEnabled: z.boolean().optional(),
  assignedUserIds: z.array(z.string()).optional(),
  clientName: z.string().nullable().optional(),
  aiEnabled: z.boolean().optional(),
  autoSuggest: z.boolean().optional(),
  autoCategorize: z.boolean().optional(),
  preferredTone: z.enum(['formal', 'modern', 'technical', 'startup']).optional()
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/email/addresses/[id]
 * Holt eine einzelne E-Mail-Adresse
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
      
      // Prüfe Leseberechtigung
      if (!emailAddress.permissions.read.includes(context.userId)) {
        return NextResponse.json(
          { error: 'Keine Berechtigung' },
          { status: 403 }
        );
      }
      
      return NextResponse.json({ emailAddress });
      
    } catch (error) {
      console.error('Error fetching email address:', error);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der E-Mail-Adresse' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/email/addresses/[id]
 * Aktualisiert eine E-Mail-Adresse
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      const { id } = await params;
      
      // Parse and validate request body
      const body = await req.json();
      const validatedData = updateEmailAddressSchema.parse(body);
      
      // Update email address
      await emailAddressService.update(
        id,
        validatedData as Partial<EmailAddressFormData>,
        context.userId
      );
      
      // Get updated email address
      const updatedEmailAddress = await emailAddressService.get(id);
      
      return NextResponse.json({ 
        emailAddress: updatedEmailAddress,
        message: 'E-Mail-Adresse erfolgreich aktualisiert' 
      });
      
    } catch (error) {
      console.error('Error updating email address:', error);
      
      // Handle validation errors
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validierungsfehler',
            details: error.issues 
          },
          { status: 400 }
        );
      }
      
      // Handle business logic errors
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
        { error: 'Fehler beim Aktualisieren der E-Mail-Adresse' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/email/addresses/[id]
 * Löscht eine E-Mail-Adresse
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      const { id } = await params;
      await emailAddressService.delete(id, context.userId);
      
      return NextResponse.json({ 
        message: 'E-Mail-Adresse erfolgreich gelöscht' 
      });
      
    } catch (error) {
      console.error('Error deleting email address:', error);
      
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
        if (error.message.includes('Standard')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Fehler beim Löschen der E-Mail-Adresse' },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/email/addresses/[id]
 * Spezielle Aktionen (z.B. als Standard setzen)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      const { id } = await params;
      const body = await req.json();
      
      // Handle set as default
      if (body.action === 'setDefault') {
        await emailAddressService.setAsDefault(id, context.organizationId);
        
        return NextResponse.json({ 
          message: 'E-Mail-Adresse als Standard gesetzt' 
        });
      }
      
      return NextResponse.json(
        { error: 'Unbekannte Aktion' },
        { status: 400 }
      );
      
    } catch (error) {
      console.error('Error in PATCH operation:', error);
      return NextResponse.json(
        { error: 'Fehler bei der Operation' },
        { status: 500 }
      );
    }
  });
}