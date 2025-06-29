// src/lib/ai/firebase-ai-service.ts - KORRIGIERT (ohne Enhanced Service)

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
}

// Singleton Instance
export const firebaseAIService = new FirebaseAIService();