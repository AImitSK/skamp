// src/lib/ai/schemas/email-insights-schemas.ts
// Zod Schemas für Email Insights Flow (Genkit Migration)

import { z } from 'genkit';

// ══════════════════════════════════════════════════════════════
// ENUMS & BASE TYPES
// ══════════════════════════════════════════════════════════════

export const SentimentEnum = z.enum(['positive', 'neutral', 'negative', 'urgent']);
export const UrgencyLevelEnum = z.enum(['low', 'medium', 'high', 'urgent']);

export const IntentEnum = z.enum([
  'question',
  'complaint',
  'request',
  'information',
  'compliment',
  'other'
]);

export const PriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
export const SLAEnum = z.enum(['48h', '24h', '4h', '1h']);

export const CategoryEnum = z.enum([
  'sales',
  'support',
  'billing',
  'partnership',
  'hr',
  'marketing',
  'legal',
  'other'
]);

export const AnalysisTypeEnum = z.enum([
  'sentiment',
  'intent',
  'priority',
  'category',
  'full'
]);

// ══════════════════════════════════════════════════════════════
// INPUT SCHEMA
// ══════════════════════════════════════════════════════════════

export const EmailInsightsInputSchema = z.object({
  emailContent: z.string()
    .min(1, 'Email content must not be empty')
    .max(20000, 'Email content too long (max 20000 chars)'),

  subject: z.string()
    .min(1, 'Subject must not be empty')
    .max(500, 'Subject too long'),

  fromEmail: z.string()
    .email('Invalid email address'),

  analysisType: AnalysisTypeEnum
    .default('full')
    .describe('Type of analysis to perform'),

  context: z.object({
    threadHistory: z.array(z.string())
      .max(10)
      .optional()
      .describe('Previous emails in thread'),

    customerInfo: z.string()
      .max(2000)
      .optional()
      .describe('Additional customer information'),

    campaignContext: z.string()
      .max(1000)
      .optional()
      .describe('Related campaign context')
  }).optional()
});

export type EmailInsightsInput = z.infer<typeof EmailInsightsInputSchema>;

// ══════════════════════════════════════════════════════════════
// SENTIMENT ANALYSIS OUTPUT
// ══════════════════════════════════════════════════════════════

export const SentimentAnalysisSchema = z.object({
  sentiment: SentimentEnum,

  confidence: z.number()
    .min(0)
    .max(1)
    .describe('Confidence score 0-1'),

  emotionalTone: z.array(z.string())
    .max(5)
    .describe('Detected emotional tones'),

  keyPhrases: z.array(z.string())
    .max(5)
    .describe('Key phrases indicating sentiment'),

  urgencyLevel: UrgencyLevelEnum,

  reasoning: z.string()
    .optional()
    .describe('Explanation of sentiment classification')
});

export type SentimentAnalysis = z.infer<typeof SentimentAnalysisSchema>;

// ══════════════════════════════════════════════════════════════
// INTENT ANALYSIS OUTPUT
// ══════════════════════════════════════════════════════════════

export const IntentAnalysisSchema = z.object({
  intent: IntentEnum,

  confidence: z.number()
    .min(0)
    .max(1)
    .describe('Confidence score 0-1'),

  actionRequired: z.boolean()
    .describe('Whether immediate action is needed'),

  suggestedActions: z.array(z.string())
    .max(3)
    .describe('Recommended actions to take'),

  responseTemplate: z.string()
    .optional()
    .describe('Suggested response template'),

  reasoning: z.string()
    .optional()
    .describe('Explanation of intent classification')
});

export type IntentAnalysis = z.infer<typeof IntentAnalysisSchema>;

// ══════════════════════════════════════════════════════════════
// PRIORITY ANALYSIS OUTPUT
// ══════════════════════════════════════════════════════════════

export const PriorityAnalysisSchema = z.object({
  priority: PriorityEnum,

  confidence: z.number()
    .min(0)
    .max(1)
    .describe('Confidence score 0-1'),

  slaRecommendation: SLAEnum
    .describe('Recommended SLA timeframe'),

  escalationNeeded: z.boolean()
    .describe('Whether escalation is recommended'),

  urgencyFactors: z.array(z.string())
    .max(5)
    .describe('Factors contributing to priority'),

  reasoning: z.string()
    .optional()
    .describe('Explanation of priority classification')
});

export type PriorityAnalysis = z.infer<typeof PriorityAnalysisSchema>;

// ══════════════════════════════════════════════════════════════
// CATEGORY ANALYSIS OUTPUT
// ══════════════════════════════════════════════════════════════

export const CategoryAnalysisSchema = z.object({
  category: CategoryEnum,

  confidence: z.number()
    .min(0)
    .max(1)
    .describe('Confidence score 0-1'),

  subcategory: z.string()
    .optional()
    .describe('More specific subcategory'),

  suggestedDepartment: z.string()
    .optional()
    .describe('Department that should handle this'),

  suggestedAssignee: z.string()
    .optional()
    .describe('Specific person who should handle this'),

  keywords: z.array(z.string())
    .max(5)
    .describe('Keywords that led to categorization'),

  reasoning: z.string()
    .optional()
    .describe('Explanation of category classification')
});

export type CategoryAnalysis = z.infer<typeof CategoryAnalysisSchema>;

// ══════════════════════════════════════════════════════════════
// FULL ANALYSIS OUTPUT (Combines All)
// ══════════════════════════════════════════════════════════════

export const FullEmailAnalysisSchema = z.object({
  // Combined analyses
  sentiment: SentimentAnalysisSchema,
  intent: IntentAnalysisSchema,
  priority: PriorityAnalysisSchema,
  category: CategoryAnalysisSchema,

  // Additional full analysis fields
  summary: z.string()
    .max(500)
    .describe('Brief summary of email content'),

  keyInsights: z.array(z.string())
    .max(5)
    .describe('Key insights from the email'),

  customerInsights: z.object({
    mood: z.string().optional(),
    relationship: z.string().optional(),
    history: z.string().optional()
  }).optional(),

  recommendedResponse: z.string()
    .optional()
    .describe('Suggested response text'),

  analysisTimestamp: z.string()
    .describe('ISO timestamp of analysis'),

  modelVersion: z.string()
    .default('genkit-gemini-2.5-flash')
    .describe('Model used for analysis')
});

export type FullEmailAnalysis = z.infer<typeof FullEmailAnalysisSchema>;

// ══════════════════════════════════════════════════════════════
// UNIFIED OUTPUT SCHEMA (Discriminated Union)
// ══════════════════════════════════════════════════════════════

export const EmailInsightsOutputSchema = z.discriminatedUnion('analysisType', [
  z.object({
    analysisType: z.literal('sentiment'),
    result: SentimentAnalysisSchema
  }),
  z.object({
    analysisType: z.literal('intent'),
    result: IntentAnalysisSchema
  }),
  z.object({
    analysisType: z.literal('priority'),
    result: PriorityAnalysisSchema
  }),
  z.object({
    analysisType: z.literal('category'),
    result: CategoryAnalysisSchema
  }),
  z.object({
    analysisType: z.literal('full'),
    result: FullEmailAnalysisSchema
  })
]);

export type EmailInsightsOutput = z.infer<typeof EmailInsightsOutputSchema>;

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Berechnet Overall Confidence für Full Analysis
 */
export function calculateOverallConfidence(analysis: FullEmailAnalysis): number {
  const confidences = [
    analysis.sentiment.confidence,
    analysis.intent.confidence,
    analysis.priority.confidence,
    analysis.category.confidence
  ];

  return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
}

/**
 * Prüft ob High-Confidence für Auto-Apply
 */
export function isHighConfidence(confidence: number): boolean {
  return confidence >= 0.8;
}

/**
 * Prüft ob Very-High-Confidence für Auto-Apply ohne Rückfrage
 */
export function isVeryHighConfidence(confidence: number): boolean {
  return confidence >= 0.9;
}

/**
 * Konvertiert Priority zu Urgency Level
 */
export function priorityToUrgency(priority: z.infer<typeof PriorityEnum>): z.infer<typeof UrgencyLevelEnum> {
  const mapping: Record<string, string> = {
    'low': 'low',
    'normal': 'medium',
    'high': 'high',
    'urgent': 'urgent'
  };
  return mapping[priority] as z.infer<typeof UrgencyLevelEnum>;
}

/**
 * Bestimmt ob Eskalation nötig basierend auf Analyse
 */
export function shouldEscalate(analysis: FullEmailAnalysis): boolean {
  return (
    analysis.priority.escalationNeeded ||
    analysis.priority.priority === 'urgent' ||
    analysis.sentiment.sentiment === 'urgent' ||
    (analysis.intent.actionRequired && analysis.priority.confidence > 0.8)
  );
}
