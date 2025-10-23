// src/app/api/ai/email-response-suggestions/route.ts
// Next.js API Route für Email Response Suggestions (Genkit-basiert)
// Ersetzt /api/ai/email-response

import { NextRequest, NextResponse } from 'next/server';
import { emailResponseFlow } from '@/lib/ai/flows/email-response';
import type { EmailResponseInput } from '@/lib/ai/schemas/email-response-schemas';

export async function POST(request: NextRequest) {
  console.log('📧 Email Response Suggestions API called');

  try {
    const body = await request.json();
    const { originalEmail, responseType, context, tone = 'professional', language = 'de' } = body;

    // Validation
    if (!originalEmail?.content || !originalEmail?.subject || !responseType) {
      return NextResponse.json(
        { error: 'OriginalEmail (content, subject) and ResponseType are required' },
        { status: 400 }
      );
    }

    // Prepare input for Genkit Flow
    const flowInput: EmailResponseInput = {
      originalEmail: {
        content: originalEmail.content,
        subject: originalEmail.subject,
        fromEmail: originalEmail.fromEmail || 'unknown@example.com',
        toEmail: originalEmail.toEmail || 'support@example.com'
      },
      responseType,
      tone,
      language,
      context
    };

    console.log('🔍 Calling Genkit Flow:', {
      responseType,
      tone,
      language,
      hasContext: !!context
    });

    // Call Genkit Flow
    const result = await emailResponseFlow(flowInput);

    console.log('✅ Genkit Flow successful:', {
      suggestionsCount: result.suggestions.length,
      processingTime: result.processingTime
    });

    // Return backward-compatible response
    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      aiProvider: result.aiProvider,
      timestamp: result.timestamp,
      processingTime: result.processingTime
    });

  } catch (error: any) {
    console.error('❌ Email Response Suggestions API Error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Email Response Suggestions API (Genkit)',
    version: '2.0.0',
    description: 'AI-powered email response generation with 4 response types',
    responseTypes: [
      'answer - Complete answers to questions',
      'acknowledge - Receipt acknowledgments',
      'escalate - Escalation messages',
      'follow_up - Follow-up reminders'
    ],
    tones: ['formal', 'friendly', 'professional', 'empathetic'],
    languages: ['de', 'en'],
    model: 'gemini-2.5-flash',
    framework: 'Firebase Genkit'
  });
}
