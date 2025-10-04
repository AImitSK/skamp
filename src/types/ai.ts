// src/types/ai.ts - KORRIGIERT
export interface StructuredPressRelease {
  headline: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quote: {
    text: string;
    person: string;
    role: string;
    company: string;
  };
  cta?: string; // Call-to-Action statt Boilerplate
  boilerplate?: string; // Optional für Backwards Compatibility
  hashtags: string[]; // NEU - Array von Hashtags
  socialOptimized: boolean; // NEU - Flag für Social-Media-Optimierung
}

export interface GenerationRequest {
  prompt: string;
  mode: 'generate' | 'improve' | 'structured';
  existingContent?: string;
  context?: GenerationContext;
}

export interface GenerationContext {
  industry?: string;
  tone?: 'formal' | 'modern' | 'technical' | 'startup';
  audience?: 'b2b' | 'consumer' | 'media';
  companyName?: string;
  brandVoice?: 'professional' | 'innovative' | 'trustworthy';
}

export interface GenerationResult {
  headline: string;
  content: string;
  structured?: StructuredPressRelease;
  metadata?: {
    generatedBy?: string;    // ✅ Das brauchen die Campaign Pages
    timestamp?: string;      // ✅ OK
    context?: GenerationContext; // ✅ Das brauchen die Campaign Pages
  };
}

export interface AITemplate {
  id: string;
  title: string;
  category: 'product' | 'corporate' | 'partnership' | 'research' | 'event' | 'finance';
  industry?: string[];
  prompt: string;
  description?: string;
  tone?: GenerationContext['tone'];
}

// Response Types für API
export interface StructuredGenerateResponse {
  success: boolean;
  structured: StructuredPressRelease;
  headline: string;
  htmlContent: string;
  rawText: string;
  aiProvider: string;
  timestamp: string;
}

export interface StandardGenerateResponse {
  success: boolean;
  generatedText: string;
  mode: string;
  aiProvider: string;
  timestamp: string;
  postProcessed?: boolean;
}

// ===============================================
// EMAIL ANALYSIS TYPES - Phase 4: KI Integration
// ===============================================

export interface EmailAnalysisRequest {
  emailContent: string;
  htmlContent?: string;
  subject: string;
  fromEmail: string;
  analysisType: 'sentiment' | 'intent' | 'priority' | 'category' | 'full';
  context?: {
    threadHistory?: string[];
    customerInfo?: string;
    campaignContext?: string;
  };
}

export interface EmailSentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  confidence: number; // 0-1
  emotionalTone: string[];
  keyPhrases: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'urgent';
}

export interface EmailIntentAnalysis {
  intent: 'question' | 'complaint' | 'request' | 'information' | 'compliment' | 'other';
  confidence: number;
  actionRequired: boolean;
  suggestedActions: string[];
  responseTemplate?: string;
}

export interface EmailPriorityAnalysis {
  priority: 'low' | 'normal' | 'high' | 'urgent';
  confidence: number;
  reasoning: string;
  slaRecommendation: number; // hours
  escalationNeeded: boolean;
}

export interface EmailCategoryAnalysis {
  category: 'sales' | 'support' | 'billing' | 'partnership' | 'hr' | 'marketing' | 'legal' | 'other';
  confidence: number;
  subcategory?: string;
  suggestedDepartment?: string;
  suggestedAssignee?: string;
}

export interface EmailFullAnalysis {
  sentiment: EmailSentimentAnalysis;
  intent: EmailIntentAnalysis;
  priority: EmailPriorityAnalysis;
  category: EmailCategoryAnalysis;
  summary: string;
  keyInsights: string[];
  suggestedResponse?: {
    tone: 'formal' | 'friendly' | 'professional' | 'empathetic';
    template: string;
    keyPoints: string[];
  };
  customerInsights?: {
    satisfactionLevel: 'low' | 'medium' | 'high';
    relationshipStatus: 'new' | 'established' | 'at_risk' | 'loyal';
    nextBestAction: string;
  };
}

export interface EmailAnalysisResponse {
  success: boolean;
  analysis: EmailSentimentAnalysis | EmailIntentAnalysis | EmailPriorityAnalysis | EmailCategoryAnalysis | EmailFullAnalysis;
  analysisType: string;
  processingTime: number;
  aiProvider: string;
  timestamp: string;
  confidence: number;
}

export interface EmailResponseSuggestion {
  responseText: string;
  tone: 'formal' | 'friendly' | 'professional' | 'empathetic';
  confidence: number;
  keyPoints: string[];
  suggestedActions: string[];
  personalizations?: Record<string, string>;
}

export interface EmailResponseRequest {
  originalEmail: {
    subject: string;
    content: string;
    fromEmail: string;
    toEmail: string;
  };
  responseType: 'answer' | 'acknowledge' | 'escalate' | 'follow_up';
  context?: {
    customerName?: string;
    customerHistory?: string;
    companyInfo?: string;
    threadHistory?: string[];
  };
  tone?: 'formal' | 'friendly' | 'professional' | 'empathetic';
  language?: 'de' | 'en';
}

export interface EmailResponseSuggestionResponse {
  success: boolean;
  suggestions: EmailResponseSuggestion[];
  aiProvider: string;
  timestamp: string;
  processingTime: number;
}

// ===============================================
// PLANUNGSDOKUMENTE TYPES - KI-Assistent Kontext
// ===============================================

export interface DocumentContext {
  id: string;
  fileName: string;
  plainText: string;
  excerpt: string;
  wordCount: number;
  createdAt: Date;
}

export interface EnrichedGenerationContext extends GenerationContext {
  // Aus Dokumenten extrahiert
  keyMessages?: string[];
  targetGroups?: string[];
  usp?: string;

  // Dokumente-Referenz
  documentContext?: {
    documents: DocumentContext[];
    documentSummary?: string;
  };
}

export interface EnhancedGenerationRequest {
  prompt: string;
  context: EnrichedGenerationContext;
  documentContext?: {
    documents: DocumentContext[];
  };
}