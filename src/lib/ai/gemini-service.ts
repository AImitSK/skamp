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

// ============================================
// PLAN 7/9: PROJEKT-ERKENNUNGS-INTERFACES
// ============================================

export interface ProjectAnalysisResult {
  projectId: string | null;
  projectTitle: string | null;
  confidence: number;
  reasoning: string;
  keywords: string[];
  contextType: 'campaign' | 'approval' | 'media' | 'general';
  alternativeMatches: Array<{
    projectId: string;
    confidence: number;
    reason: string;
  }>;
}

export interface ActionSuggestion {
  type: 'immediate' | 'pipeline' | 'followup';
  action: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface ProjectForAnalysis {
  id: string;
  title: string;
  clientName?: string;
  stage: string;
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
  },

  // ============================================
  // PLAN 7/9: KI-BASIERTE PROJEKT-ERKENNUNG
  // ============================================

  /**
   * Analysiert E-Mail-Content und ordnet wahrscheinlichstes Projekt zu
   */
  async analyzeEmailForProject(data: {
    subject: string;
    content?: string;
    fromEmail: string;
    organizationId: string;
    activeProjects: ProjectForAnalysis[];
  }): Promise<ProjectAnalysisResult> {
    
    try {
      console.log('🤖 Analyzing email for project assignment with Gemini AI');
      
      const prompt = `
      Analysiere diese E-Mail und bestimme das wahrscheinlichste zugehörige Projekt:
      
      E-MAIL DATEN:
      Von: ${data.fromEmail}
      Betreff: ${data.subject}
      Inhalt: ${data.content?.substring(0, 800) || 'Kein Text-Inhalt'}
      
      VERFÜGBARE PROJEKTE:
      ${data.activeProjects.map(p => 
        `- ID: ${p.id}, Titel: "${p.title}", Kunde: ${p.clientName || 'Unbekannt'}, Status: ${p.stage}`
      ).join('\n')}
      
      AUFGABE:
      1. Identifiziere Schlüsselwörter und Kontext-Hinweise
      2. Ordne der E-Mail das passendste Projekt zu (falls möglich)
      3. Gib eine Konfidenz zwischen 0.0 und 1.0 an
      4. Erkläre die Begründung
      
      ANTWORT im JSON-Format:
      {
        "projectId": "best-match-project-id-or-null",
        "projectTitle": "project-title-or-null", 
        "confidence": 0.0-1.0,
        "reasoning": "Detaillierte Begründung der Zuordnung",
        "keywords": ["keyword1", "keyword2"],
        "contextType": "campaign|approval|media|general",
        "alternativeMatches": [
          {"projectId": "id", "confidence": 0.0-1.0, "reason": "text"}
        ]
      }
      
      WICHTIG: Nur Projekte aus der Liste verwenden. Bei Unsicherheit confidence < 0.6 setzen.
      `;
      
      const response = await fetch('/api/ai/analyze-email-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          organizationId: data.organizationId
        }),
      });

      if (!response.ok) {
        throw new Error(`AI project analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validiere dass die Antwort gültiges JSON ist
      if (!result || typeof result !== 'object') {
        throw new Error('Ungültige KI-Antwort: Kein gültiges JSON');
      }
      
      console.log('✅ Email project analysis successful:', result);
      
      return {
        projectId: result.projectId || null,
        projectTitle: result.projectTitle || null,
        confidence: result.confidence || 0,
        reasoning: result.reasoning || 'Keine Begründung verfügbar',
        keywords: result.keywords || [],
        contextType: result.contextType || 'general',
        alternativeMatches: result.alternativeMatches || []
      } as ProjectAnalysisResult;
      
    } catch (error) {
      console.error('❌ Error analyzing email for project:', error);
      
      // Fallback: Null-Ergebnis zurückgeben
      return {
        projectId: null,
        projectTitle: null,
        confidence: 0,
        reasoning: 'KI-Analyse fehlgeschlagen: ' + (error as Error).message,
        keywords: [],
        contextType: 'general',
        alternativeMatches: []
      };
    }
  },

  /**
   * Schlägt passende Aktionen für E-Mail-Kontext vor
   */
  async suggestEmailActions(data: {
    emailContent: string;
    projectContext?: {
      stage: string;
      clientName?: string;
      title: string;
    };
  }): Promise<ActionSuggestion[]> {
    
    try {
      console.log('🤖 Generating email action suggestions with Gemini AI');
      
      const prompt = `
      Analysiere diese E-Mail und schlage angemessene Aktionen vor:
      
      E-MAIL INHALT:
      ${data.emailContent}
      
      PROJEKT KONTEXT:
      ${data.projectContext ? `
      - Phase: ${data.projectContext.stage}
      - Kunde: ${data.projectContext.clientName || 'Unbekannt'}
      - Projekt: ${data.projectContext.title}
      ` : 'Kein Projekt-Kontext verfügbar'}
      
      SCHLAGE VOR:
      - Sofortige Aktionen (Antworten, Weiterleiten, Flaggen)
      - Pipeline-Aktionen (Status ändern, Freigabe starten)
      - Follow-up Aktionen (Termine, Erinnerungen)
      
      ANTWORT als JSON-Array:
      [
        {
          "type": "immediate|pipeline|followup",
          "action": "reply|forward|flag|status_change|approval|reminder|meeting",
          "title": "Kurze Beschreibung",
          "priority": "low|medium|high",
          "confidence": 0.0-1.0
        }
      ]
      `;
      
      const response = await fetch('/api/ai/suggest-email-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`AI action suggestions failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validiere dass die Antwort ein Array ist
      if (!Array.isArray(result)) {
        throw new Error('Ungültige KI-Antwort: Kein Array');
      }
      
      console.log('✅ Email action suggestions successful');
      
      return result as ActionSuggestion[];
      
    } catch (error) {
      console.error('❌ Error generating email action suggestions:', error);
      
      // Fallback: Leeres Array
      return [];
    }
  }
};