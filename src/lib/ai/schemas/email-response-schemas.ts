// src/lib/ai/schemas/email-response-schemas.ts
// Zod Schemas für Email Response Suggestions Flow (Genkit Migration)

import { z } from 'genkit';

// ══════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════

export const ResponseTypeEnum = z.enum(['answer', 'acknowledge', 'escalate', 'follow_up']);
export const ToneEnum = z.enum(['formal', 'friendly', 'professional', 'empathetic']);
export const LanguageEnum = z.enum(['de', 'en']);

// ══════════════════════════════════════════════════════════════
// INPUT SCHEMA
// ══════════════════════════════════════════════════════════════

export const EmailResponseInputSchema = z.object({
  originalEmail: z.object({
    content: z.string().min(1).max(20000),
    subject: z.string().min(1).max(500),
    fromEmail: z.string().email(),
    toEmail: z.string().email()
  }),

  responseType: ResponseTypeEnum,

  tone: ToneEnum.default('professional'),

  language: LanguageEnum.default('de'),

  context: z.object({
    customerName: z.string().optional(),
    customerHistory: z.string().max(2000).optional(),
    companyInfo: z.string().max(1000).optional(),
    threadHistory: z.array(z.string()).max(5).optional()
  }).optional()
});

export type EmailResponseInput = z.infer<typeof EmailResponseInputSchema>;

// ══════════════════════════════════════════════════════════════
// OUTPUT SCHEMA
// ══════════════════════════════════════════════════════════════

export const EmailResponseSuggestionSchema = z.object({
  responseText: z.string()
    .min(50)
    .max(5000)
    .describe('Complete email response text'),

  tone: ToneEnum
    .describe('Detected or applied tone'),

  confidence: z.number()
    .min(0)
    .max(1)
    .describe('Confidence score 0-1'),

  keyPoints: z.array(z.string())
    .max(5)
    .describe('Key points addressed in response'),

  suggestedActions: z.array(z.string())
    .max(3)
    .optional()
    .describe('Recommended follow-up actions'),

  personalizations: z.object({
    customerName: z.string().optional()
  }).optional()
    .describe('Personalization hints')
});

export type EmailResponseSuggestion = z.infer<typeof EmailResponseSuggestionSchema>;

export const EmailResponseOutputSchema = z.object({
  suggestions: z.array(EmailResponseSuggestionSchema)
    .min(1)
    .max(3)
    .describe('3 response variations'),

  aiProvider: z.string()
    .default('genkit')
    .describe('AI provider identifier'),

  timestamp: z.string()
    .describe('ISO timestamp'),

  processingTime: z.number()
    .optional()
    .describe('Processing time in milliseconds')
});

export type EmailResponseOutput = z.infer<typeof EmailResponseOutputSchema>;
