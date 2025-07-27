// src/app/api/email/addresses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { emailAddressService } from '@/lib/email/email-address-service';
import { EmailAddressFormData } from '@/types/email-enhanced';
import { z } from 'zod';

// Teste die Imports
console.log('Route loaded, emailAddressService:', emailAddressService);

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
 * HINWEIS: In diesem Projekt werden Daten direkt vom Client aus Firestore geladen
 */
export async function GET(request: NextRequest) {
  console.log('GET /api/email/addresses called');
  
  return NextResponse.json({
    message: 'Use client-side Firebase for listing email addresses',
    info: 'This endpoint is deprecated. Fetch email addresses directly from Firebase on the client.',
    instructions: 'Import emailAddressService in your React component and use it directly.'
  }, { status: 200 });
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
      console.log('POST body received:', body);
      
      const validatedData = createEmailAddressSchema.parse(body);
      console.log('Validated data:', validatedData);
      
      // Create email address direkt mit dem Service
      console.log('Creating email address with service...');
      const emailAddress = await emailAddressService.create(
        validatedData as EmailAddressFormData,
        context.organizationId,
        context.userId
      );
      
      console.log('Email address created:', emailAddress);
      
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
        if (error.message.includes('nicht verifiziert') || error.message.includes('nicht gefunden')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        
        // Return the actual error message for debugging
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Fehler beim Erstellen der E-Mail-Adresse' },
        { status: 500 }
      );
    }
  });
}