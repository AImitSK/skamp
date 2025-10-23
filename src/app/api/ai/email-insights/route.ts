// src/app/api/ai/email-insights/route.ts
// Next.js API Route für Email Insights (Genkit-basiert)
// Ersetzt /api/ai/email-analysis mit strukturierten Genkit Flows

import { NextRequest, NextResponse } from 'next/server';
import { emailInsightsFlow } from '@/lib/ai/flows/email-insights';
import type {
  EmailInsightsInput,
  SentimentAnalysis,
  IntentAnalysis,
  PriorityAnalysis,
  CategoryAnalysis,
  FullEmailAnalysis
} from '@/lib/ai/schemas/email-insights-schemas';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface EmailInsightsRequestBody {
  emailContent: string;
  subject: string;
  fromEmail: string;
  analysisType?: 'sentiment' | 'intent' | 'priority' | 'category' | 'full';
  context?: {
    threadHistory?: string[];
    customerInfo?: string;
    campaignContext?: string;
  };
}

// ══════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════

function validateRequest(body: EmailInsightsRequestBody): { valid: boolean; error?: string } {
  if (!body.emailContent || typeof body.emailContent !== 'string') {
    return { valid: false, error: 'emailContent is required and must be a string' };
  }

  if (body.emailContent.length < 1) {
    return { valid: false, error: 'emailContent must not be empty' };
  }

  if (body.emailContent.length > 20000) {
    return { valid: false, error: 'emailContent too long (max 20000 characters)' };
  }

  if (!body.subject || typeof body.subject !== 'string') {
    return { valid: false, error: 'subject is required and must be a string' };
  }

  if (body.subject.length > 500) {
    return { valid: false, error: 'subject too long (max 500 characters)' };
  }

  if (!body.fromEmail || typeof body.fromEmail !== 'string') {
    return { valid: false, error: 'fromEmail is required and must be a string' };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.fromEmail)) {
    return { valid: false, error: 'fromEmail must be a valid email address' };
  }

  if (body.analysisType && !['sentiment', 'intent', 'priority', 'category', 'full'].includes(body.analysisType)) {
    return { valid: false, error: 'analysisType must be one of: sentiment, intent, priority, category, full' };
  }

  return { valid: true };
}

// ══════════════════════════════════════════════════════════════
// BACKWARD-COMPATIBLE RESPONSE FORMATTERS
// ══════════════════════════════════════════════════════════════

/**
 * Formatiert Sentiment-Analyse für Legacy-Clients
 */
function formatSentimentResponse(result: SentimentAnalysis) {
  return {
    sentiment: result.sentiment,
    confidence: result.confidence,
    emotionalTone: result.emotionalTone,
    keyPhrases: result.keyPhrases,
    urgencyLevel: result.urgencyLevel,
    reasoning: result.reasoning
  };
}

/**
 * Formatiert Intent-Analyse für Legacy-Clients
 */
function formatIntentResponse(result: IntentAnalysis) {
  return {
    intent: result.intent,
    confidence: result.confidence,
    actionRequired: result.actionRequired,
    suggestedActions: result.suggestedActions,
    responseTemplate: result.responseTemplate,
    reasoning: result.reasoning
  };
}

/**
 * Formatiert Priority-Analyse für Legacy-Clients
 */
function formatPriorityResponse(result: PriorityAnalysis) {
  return {
    priority: result.priority,
    confidence: result.confidence,
    slaRecommendation: result.slaRecommendation,
    escalationNeeded: result.escalationNeeded,
    urgencyFactors: result.urgencyFactors,
    reasoning: result.reasoning
  };
}

/**
 * Formatiert Category-Analyse für Legacy-Clients
 */
function formatCategoryResponse(result: CategoryAnalysis) {
  return {
    category: result.category,
    confidence: result.confidence,
    subcategory: result.subcategory,
    suggestedDepartment: result.suggestedDepartment,
    suggestedAssignee: result.suggestedAssignee,
    keywords: result.keywords,
    reasoning: result.reasoning
  };
}

/**
 * Formatiert Full-Analyse für Legacy-Clients (AIInsightsPanel.tsx Format)
 */
function formatFullAnalysisResponse(result: FullEmailAnalysis) {
  return {
    sentiment: {
      sentiment: result.sentiment.sentiment,
      confidence: result.sentiment.confidence,
      emotionalTone: result.sentiment.emotionalTone,
      keyPhrases: result.sentiment.keyPhrases,
      urgencyLevel: result.sentiment.urgencyLevel
    },
    intent: {
      intent: result.intent.intent,
      confidence: result.intent.confidence,
      actionRequired: result.intent.actionRequired,
      suggestedActions: result.intent.suggestedActions,
      responseTemplate: result.intent.responseTemplate
    },
    priority: {
      priority: result.priority.priority,
      confidence: result.priority.confidence,
      slaRecommendation: result.priority.slaRecommendation,
      escalationNeeded: result.priority.escalationNeeded,
      urgencyFactors: result.priority.urgencyFactors
    },
    category: {
      category: result.category.category,
      confidence: result.category.confidence,
      subcategory: result.category.subcategory,
      suggestedDepartment: result.category.suggestedDepartment,
      suggestedAssignee: result.category.suggestedAssignee,
      keywords: result.category.keywords
    },
    summary: result.summary,
    keyInsights: result.keyInsights,
    customerInsights: result.customerInsights,
    recommendedResponse: result.recommendedResponse,
    analysisTimestamp: result.analysisTimestamp,
    modelVersion: result.modelVersion
  };
}

// ══════════════════════════════════════════════════════════════
// POST HANDLER
// ══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  console.log('📧 Email Insights API aufgerufen');

  try {
    // Request Body parsen
    const body: EmailInsightsRequestBody = await request.json();

    // Validierung
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error
        },
        { status: 400 }
      );
    }

    // Input für Genkit Flow vorbereiten
    const flowInput: EmailInsightsInput = {
      emailContent: body.emailContent,
      subject: body.subject,
      fromEmail: body.fromEmail,
      analysisType: body.analysisType || 'full', // Default: full analysis
      context: body.context
    };

    console.log('🔍 Genkit Flow wird aufgerufen:', {
      analysisType: flowInput.analysisType,
      fromEmail: flowInput.fromEmail,
      subject: flowInput.subject.substring(0, 50),
      contentLength: flowInput.emailContent.length
    });

    // Genkit Flow ausführen
    const result = await emailInsightsFlow(flowInput);

    console.log('✅ Genkit Flow erfolgreich:', {
      analysisType: result.analysisType
    });

    // Response basierend auf Analyse-Typ formatieren
    let formattedResult: any;

    switch (result.analysisType) {
      case 'sentiment':
        formattedResult = formatSentimentResponse(result.result as SentimentAnalysis);
        break;

      case 'intent':
        formattedResult = formatIntentResponse(result.result as IntentAnalysis);
        break;

      case 'priority':
        formattedResult = formatPriorityResponse(result.result as PriorityAnalysis);
        break;

      case 'category':
        formattedResult = formatCategoryResponse(result.result as CategoryAnalysis);
        break;

      case 'full':
      default:
        formattedResult = formatFullAnalysisResponse(result.result as FullEmailAnalysis);
        break;
    }

    // Backward-compatible Response (analysis field für firebaseAIService)
    return NextResponse.json({
      success: true,
      analysisType: result.analysisType,
      analysis: formattedResult, // Kompatibel mit EmailAnalysisResponse.analysis
      aiProvider: 'genkit', // Kennzeichnung für Debugging
      modelVersion: 'genkit-gemini-2.5-flash'
    });

  } catch (error: any) {
    console.error('❌ Email Insights API Fehler:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════
// GET HANDLER (Info)
// ══════════════════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json({
    service: 'Email Insights API (Genkit)',
    version: '2.0.0',
    description: 'AI-powered email analysis with 5 analysis types',
    analysisTypes: [
      'sentiment - Emotional tone and urgency detection',
      'intent - Purpose and action requirements',
      'priority - Urgency and SLA recommendations',
      'category - Department and assignee suggestions',
      'full - Complete analysis (all above combined)'
    ],
    usage: {
      method: 'POST',
      body: {
        emailContent: 'string (required, 1-20000 chars)',
        subject: 'string (required, max 500 chars)',
        fromEmail: 'string (required, valid email)',
        analysisType: 'string (optional, default: full)',
        context: {
          threadHistory: 'string[] (optional, max 10)',
          customerInfo: 'string (optional, max 2000 chars)',
          campaignContext: 'string (optional, max 1000 chars)'
        }
      }
    },
    model: 'gemini-2.5-flash',
    framework: 'Firebase Genkit',
    backwardCompatible: true
  });
}
