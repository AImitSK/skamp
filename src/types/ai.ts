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
  boilerplate: string;
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