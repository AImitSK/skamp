// src/app/api/email/addresses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { emailAddressService } from '@/lib/email/email-address-service';
import { EmailAddressFormData } from '@/types/email-enhanced';
import { z } from 'zod';

// Validation Schema
const createEmailAddressSchema = z.object({
  localPart: z.string().min(1),
  domainId: z.string().min(1),
  displayName: z.string().min(1),
  aliasType: z.enum(['specific', 'catch-all', 'pattern']).optional(),
  isActive: z.boolean().optional(),
  inboxEnabled: z.boolean().optional(),
  assignedUserIds: z.array(z.string()).optional(),
  clientName: z.string().optional(),
  aiEnabled: z.boolean().optional(),
  autoSuggest: z.boolean().optional(),
  autoCategorize: z.boolean().optional(),
  preferredTone: z.enum(['formal', 'modern', 'technical', 'startup']).optional()
});

/**
 * GET /api/email/addresses
 * Holt alle E-Mail-Adressen der Organisation
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      const emailAddresses = await emailAddressService.getByOrganization(
        context.organizationId,
        context.userId
      );
      
      return NextResponse.json({ emailAddresses });
      
    } catch (error) {
      console.error('Error fetching email addresses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch email addresses' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/email/addresses
 * Erstellt eine neue E-Mail-Adresse
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = createEmailAddressSchema.parse(body);
      
      // Create email address
      const emailAddress = await emailAddressService.create(
        validatedData as EmailAddressFormData,
        context.organizationId,
        context.userId
      );
      
      return NextResponse.json(
        { 
          emailAddress,
          message: 'E-Mail-Adresse erfolgreich erstellt' 
        },
        { status: 201 }
      );
      
    } catch (error) {
      console.error('Error creating email address:', error);
      
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
        if (error.message.includes('existiert bereits')) {
          return NextResponse.json(
            { error: error.message },
            { status: 409 }
          );
        }
        if (error.message.includes('nicht verifiziert')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Fehler beim Erstellen der E-Mail-Adresse' },
        { status: 500 }
      );
    }
  });
}