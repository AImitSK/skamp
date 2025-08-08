// src/lib/ai/gemini-service.ts - Gemini AI Service für PR-Kampagnen
import { apiClient } from '@/lib/api/api-client';

export interface StructuredPressReleaseInput {
  prompt: string;
  template?: 'announcement' | 'product' | 'event' | 'achievement' | 'partnership' | 'general';
  companyName?: string;
  targetAudience?: string;
}

export interface StructuredPressReleaseOutput {
  structured: {
    headline: string;
    leadParagraph: string;
    bodyParagraphs: string[];
    quote?: {
      text: string;
      person: string;
      role: string;
      company: string;
    };
    callToAction?: string;
    contactInfo?: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  metadata: {
    wordCount: number;
    readingTime: number;
    generatedAt: string;
  };
}

export const geminiService = {
  /**
   * Generiert eine strukturierte Pressemitteilung mit Google Gemini AI
   */
  async generateStructuredPressRelease(
    input: StructuredPressReleaseInput
  ): Promise<StructuredPressReleaseOutput> {
    try {
      console.log('🤖 Generating structured press release with Gemini AI:', input);
      
      const response = await fetch('/api/ai/generate-structured', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ AI generation successful');
      
      return result;
    } catch (error) {
      console.error('❌ Error generating structured press release:', error);
      throw error;
    }
  },

  /**
   * Testet die AI-Verbindung
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/ai/health');
      return response.ok;
    } catch (error) {
      console.error('AI health check failed:', error);
      return false;
    }
  }
};