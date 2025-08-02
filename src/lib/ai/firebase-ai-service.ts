// src/lib/ai/firebase-ai-service.ts - ERWEITERT um Email Analysis

import { 
  EmailAnalysisRequest,
  EmailAnalysisResponse,
  EmailResponseRequest,
  EmailResponseSuggestionResponse
} from '@/types/ai';

interface GenerateRequest {
  prompt: string;
  mode: 'generate' | 'improve';
  existingContent?: string;
}

interface GenerateResponse {
  success: boolean;
  generatedText: string;
  mode: string;
  aiProvider: string;
}

interface Template {
  title: string;
  prompt: string;
}

interface TemplateResponse {
  success: boolean;
  templates: Template[];
}

/**
 * Firebase AI Service - Direkte API-Kommunikation
 */
export class FirebaseAIService {
  private readonly generateUrl = '/api/ai/generate';
  private readonly templatesUrl = '/api/ai/templates';
  private readonly healthUrl = '/api/ai/health';
  private readonly emailAnalysisUrl = '/api/ai/email-analysis';
  private readonly emailResponseUrl = '/api/ai/email-response';
  
  async generatePressRelease(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          mode: 'generate'
        } as GenerateRequest)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: GenerateResponse = await response.json();

      if (!result.success) {
        throw new Error('Fehler bei der Generierung');
      }

      return result.generatedText;
      
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      
      const message = error.message || 'Unbekannter Fehler';
      if (message.includes('Gemini Quota')) {
        throw new Error('KI-Dienst temporär ausgelastet. Bitte versuche es in wenigen Minuten erneut.');
      } else if (message.includes('Safety')) {
        throw new Error('Dein Text wurde vom KI-Filter blockiert. Bitte formuliere anders und vermeide problematische Begriffe.');
      } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        throw new Error('Verbindung zum KI-Service fehlgeschlagen. Bitte prüfe deine Internetverbindung.');
      } else if (message.includes('nicht konfiguriert')) {
        throw new Error('KI-Service ist nicht konfiguriert. Bitte setze GEMINI_API_KEY in den Umgebungsvariablen.');
      }
      
      throw new Error(`KI-Fehler: ${message}`);
    }
  }

  async improvePressRelease(existingContent: string, improvementRequest: string): Promise<string> {
    try {
      const response = await fetch(this.generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: improvementRequest,
          mode: 'improve',
          existingContent: existingContent
        } as GenerateRequest)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: GenerateResponse = await response.json();

      if (!result.success) {
        throw new Error('Fehler bei der Verbesserung');
      }

      return result.generatedText;
      
    } catch (error: any) {
      console.error('AI Improvement Error:', error);
      
      const message = error.message || 'Unbekannter Fehler';
      throw new Error(`KI-Fehler: ${message}`);
    }
  }

  async getTemplates(): Promise<Template[]> {
    try {
      const response = await fetch(this.templatesUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: TemplateResponse = await response.json();

      if (!result.success) {
        throw new Error('Fehler beim Laden der Templates');
      }

      return result.templates;
      
    } catch (error: any) {
      console.error('Templates Error:', error);
      
      // Fallback Templates bei Fehlern
      return [
        {
          title: 'Produktankündigung',
          prompt: 'Innovative Produkteinführung, die ein wichtiges Branchenproblem löst und den Markt revolutioniert'
        },
        {
          title: 'Strategische Partnerschaft',
          prompt: 'Strategische Partnerschaft zwischen zwei führenden Unternehmen mit erheblichen Synergien'
        },
        {
          title: 'Unternehmensmeilenstein',
          prompt: 'Wichtiger Unternehmensmeilenstein wie Wachstum, Expansion oder Jubiläum'
        },
        {
          title: 'Auszeichnung',
          prompt: 'Erhaltene Branchenauszeichnung oder Award, der Expertise unterstreicht'
        },
        {
          title: 'Führungswechsel',
          prompt: 'Wichtige Personalentscheidung oder Ernennung neuer Führungskraft'
        },
        {
          title: 'Forschungsergebnisse',
          prompt: 'Neue Forschungsergebnisse oder Studie mit wichtigen Branchenerkenntnissen'
        }
      ];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.warn('Health check failed with status:', response.status);
        return false;
      }

      const result = await response.json();
      return result.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // ===============================================
  // EMAIL AI METHODS - Phase 4: KI Integration
  // ===============================================

  /**
   * Analysiere Email (Sentiment, Intent, Priority, Category oder Full)
   */
  async analyzeEmail(request: EmailAnalysisRequest): Promise<EmailAnalysisResponse> {
    try {
      const response = await fetch(this.emailAnalysisUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: EmailAnalysisResponse = await response.json();

      if (!result.success) {
        throw new Error('Fehler bei der Email-Analyse');
      }

      return result;
      
    } catch (error: any) {
      console.error('Email Analysis Error:', error);
      
      const message = error.message || 'Unbekannter Fehler';
      if (message.includes('Gemini Quota')) {
        throw new Error('KI-Dienst temporär ausgelastet. Bitte versuche es in wenigen Minuten erneut.');
      } else if (message.includes('Safety')) {
        throw new Error('Email-Inhalt wurde vom KI-Filter blockiert.');
      } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        throw new Error('Verbindung zum KI-Service fehlgeschlagen. Bitte prüfe deine Internetverbindung.');
      }
      
      throw new Error(`Email-Analyse Fehler: ${message}`);
    }
  }

  /**
   * Generiere Antwort-Vorschläge für Email
   */
  async generateEmailResponse(request: EmailResponseRequest): Promise<EmailResponseSuggestionResponse> {
    try {
      const response = await fetch(this.emailResponseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: EmailResponseSuggestionResponse = await response.json();

      if (!result.success) {
        throw new Error('Fehler bei der Response-Generierung');
      }

      return result;
      
    } catch (error: any) {
      console.error('Email Response Generation Error:', error);
      
      const message = error.message || 'Unbekannter Fehler';
      throw new Error(`Response-Generierung Fehler: ${message}`);
    }
  }

  /**
   * Schnelle Sentiment-Analyse für Email
   */
  async quickSentimentAnalysis(emailContent: string, subject: string, fromEmail: string): Promise<any> {
    try {
      const result = await this.analyzeEmail({
        emailContent,
        subject,
        fromEmail,
        analysisType: 'sentiment'
      });
      
      return result.analysis;
    } catch (error) {
      console.error('Quick sentiment analysis failed:', error);
      return null;
    }
  }

  /**
   * Schnelle Prioritäts-Analyse für Email  
   */
  async quickPriorityAnalysis(emailContent: string, subject: string, fromEmail: string): Promise<any> {
    try {
      const result = await this.analyzeEmail({
        emailContent,
        subject,
        fromEmail,
        analysisType: 'priority'
      });
      
      return result.analysis;
    } catch (error) {
      console.error('Quick priority analysis failed:', error);
      return null;
    }
  }

  /**
   * Schnelle Kategorisierung für Email
   */
  async quickCategoryAnalysis(emailContent: string, subject: string, fromEmail: string): Promise<any> {
    try {
      const result = await this.analyzeEmail({
        emailContent,
        subject,
        fromEmail,
        analysisType: 'category'
      });
      
      return result.analysis;
    } catch (error) {
      console.error('Quick category analysis failed:', error);
      return null;
    }
  }

  /**
   * Vollständige Email-Analyse (alle Features)
   */
  async fullEmailAnalysis(
    emailContent: string, 
    subject: string, 
    fromEmail: string,
    context?: {
      threadHistory?: string[];
      customerInfo?: string;
      campaignContext?: string;
    }
  ): Promise<any> {
    try {
      const result = await this.analyzeEmail({
        emailContent,
        subject,
        fromEmail,
        analysisType: 'full',
        context
      });
      
      return result.analysis;
    } catch (error) {
      console.error('Full email analysis failed:', error);
      return null;
    }
  }
}

// Singleton Instance
export const firebaseAIService = new FirebaseAIService();