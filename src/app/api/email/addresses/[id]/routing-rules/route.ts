// src/app/api/email/addresses/[id]/routing-rules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { emailAddressService } from '@/lib/email/email-address-service';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Validation Schema für Routing Rules
const routingRuleSchema = z.object({
  name: z.string().min(1),
  conditions: z.object({
    subject: z.string().optional(),
    from: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).refine(data => data.subject || data.from || (data.keywords && data.keywords.length > 0), {
    message: 'Mindestens eine Bedingung muss angegeben werden'
  }),
  actions: z.object({
    assignTo: z.array(z.string()).optional(),
    addTags: z.array(z.string()).optional(),
    setPriority: z.enum(['low', 'normal', 'high']).optional(),
    autoReply: z.string().optional()
  }).refine(data => data.assignTo || data.addTags || data.setPriority || data.autoReply, {
    message: 'Mindestens eine Aktion muss angegeben werden'
  })
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/email/addresses/[id]/routing-rules
 * Holt alle Routing-Regeln einer E-Mail-Adresse
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
      
      return NextResponse.json({ 
        routingRules: emailAddress.routingRules || [],
        count: emailAddress.routingRules?.length || 0
      });
      
    } catch (error) {
      console.error('Error fetching routing rules:', error);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Routing-Regeln' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/email/addresses/[id]/routing-rules
 * Fügt eine neue Routing-Regel hinzu
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req: NextRequest, context: AuthContext) => {
    try {
      const { id } = await params;
      
      // Parse and validate request body
      const body = await req.json();
      const validatedData = routingRuleSchema.parse(body);
      
      // Create rule with ID
      const rule = {
        id: nanoid(),
        ...validatedData
      };
      
      // Add routing rule
      await emailAddressService.addRoutingRule(
        id,
        rule,
        context.userId
      );
      
      return NextResponse.json(
        { 
          rule,
          message: 'Routing-Regel erfolgreich hinzugefügt' 
        },
        { status: 201 }
      );
      
    } catch (error) {
      console.error('Error adding routing rule:', error);
      
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
        { error: 'Fehler beim Hinzufügen der Routing-Regel' },
        { status: 500 }
      );
    }
  });
}