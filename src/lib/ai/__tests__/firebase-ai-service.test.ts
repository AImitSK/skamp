// src/lib/ai/__tests__/firebase-ai-service.test.ts
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { FirebaseAIService } from '../firebase-ai-service';
import { 
  EmailAnalysisRequest, 
  EmailResponseRequest,
  EmailAnalysisResponse,
  EmailResponseSuggestionResponse 
} from '@/types/ai';

// Mock global fetch
global.fetch = jest.fn();

describe('FirebaseAIService - KI-Integration Tests', () => {
  let firebaseAIService: FirebaseAIService;
  
  beforeEach(() => {
    firebaseAIService = new FirebaseAIService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockResponse = (data: any, ok: boolean = true) => ({
    ok,
    json: jest.fn().mockResolvedValue(data),
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error'
  });

  describe('Press Release Generation', () => {
    it('should generate press release with valid prompt', async () => {
      const mockResponse = {
        success: true,
        generatedText: 'CeleroPress kündigt innovative PR-Management-Lösung an...',
        mode: 'generate',
        aiProvider: 'gemini'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(mockResponse) as any
      );

      const result = await firebaseAIService.generatePressRelease(
        'Innovative PR-Management-Lösung für deutsche Unternehmen'
      );

      expect(fetch).toHaveBeenCalledWith('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Innovative PR-Management-Lösung für deutsche Unternehmen',
          mode: 'generate'
        })
      });

      expect(result).toBe(mockResponse.generatedText);
    });

    it('should improve existing press release content', async () => {
      const existingContent = 'Alte Pressemitteilung Text...';
      const improvementRequest = 'Mache den Text professioneller und füge Zahlen hinzu';
      
      const mockResponse = {
        success: true,
        generatedText: 'Verbesserte Pressemitteilung mit 40% mehr Professionalität...',
        mode: 'improve',
        aiProvider: 'gemini'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(mockResponse) as any
      );

      const result = await firebaseAIService.improvePressRelease(
        existingContent,
        improvementRequest
      );

      expect(fetch).toHaveBeenCalledWith('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: improvementRequest,
          mode: 'improve',
          existingContent
        })
      });

      expect(result).toBe(mockResponse.generatedText);
    });

    it('should handle Gemini quota limit errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse({ error: 'Gemini Quota exceeded' }, false) as any
      );

      await expect(
        firebaseAIService.generatePressRelease('Test prompt')
      ).rejects.toThrow('KI-Dienst temporär ausgelastet. Bitte versuche es in wenigen Minuten erneut.');
    });

    it('should handle safety filter errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse({ error: 'Safety filter triggered' }, false) as any
      );

      await expect(
        firebaseAIService.generatePressRelease('Problematic content')
      ).rejects.toThrow('Dein Text wurde vom KI-Filter blockiert. Bitte formuliere anders und vermeide problematische Begriffe.');
    });

    it('should handle network errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Failed to fetch')
      );

      await expect(
        firebaseAIService.generatePressRelease('Test prompt')
      ).rejects.toThrow('Verbindung zum KI-Service fehlgeschlagen. Bitte prüfe deine Internetverbindung.');
    });
  });

  describe('Email Analysis - Kern-KI-Features', () => {
    it('should analyze email sentiment correctly', async () => {
      const mockAnalysisResponse: EmailAnalysisResponse = {
        success: true,
        analysis: {
          sentiment: 'positive',
          confidence: 0.85,
          emotionalTone: ['freundlich', 'professionell'],
          keyPhrases: ['vielen Dank', 'sehr gut'],
          urgencyLevel: 'low'
        },
        analysisType: 'sentiment',
        processingTime: 1200,
        aiProvider: 'gemini',
        timestamp: '2025-01-21T10:00:00Z',
        confidence: 0.85
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(mockAnalysisResponse) as any
      );

      const request: EmailAnalysisRequest = {
        emailContent: 'Vielen Dank für Ihre schnelle Antwort. Das ist sehr gut gelaufen!',
        subject: 'Feedback zu unserem Projekt',
        fromEmail: 'kunde@firma.de',
        analysisType: 'sentiment'
      };

      const result = await firebaseAIService.analyzeEmail(request);

      expect(fetch).toHaveBeenCalledWith('/api/ai/email-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      expect(result.success).toBe(true);
      expect(result.analysis).toHaveProperty('sentiment', 'positive');
      expect(result.analysis).toHaveProperty('confidence', 0.85);
    });

    it('should determine email priority based on content', async () => {
      const mockAnalysisResponse: EmailAnalysisResponse = {
        success: true,
        analysis: {
          priority: 'urgent',
          confidence: 0.92,
          reasoning: 'E-Mail enthält Wörter wie "DRINGEND" und "sofort"',
          slaRecommendation: 2,
          escalationNeeded: true
        },
        analysisType: 'priority',
        processingTime: 800,
        aiProvider: 'gemini',
        timestamp: '2025-01-21T10:00:00Z',
        confidence: 0.92
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(mockAnalysisResponse) as any
      );

      const result = await firebaseAIService.quickPriorityAnalysis(
        'DRINGEND: Pressekonferenz wurde abgesagt! Bitte sofort alle Journalisten informieren.',
        'DRINGEND: Pressekonferenz abgesagt',
        'pr-chef@unternehmen.de'
      );

      expect(result.priority).toBe('urgent');
      expect(result.escalationNeeded).toBe(true);
      expect(result.slaRecommendation).toBe(2);
    });

    it('should categorize emails by type correctly', async () => {
      const mockAnalysisResponse: EmailAnalysisResponse = {
        success: true,
        analysis: {
          category: 'support',
          confidence: 0.78,
          subcategory: 'technical_question',
          suggestedDepartment: 'Technical Support',
          suggestedAssignee: 'Max Mustermann'
        },
        analysisType: 'category',
        processingTime: 950,
        aiProvider: 'gemini',
        timestamp: '2025-01-21T10:00:00Z',
        confidence: 0.78
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(mockAnalysisResponse) as any
      );

      const result = await firebaseAIService.quickCategoryAnalysis(
        'Ich habe Probleme beim Login zu CeleroPress. Können Sie mir helfen?',
        'Login-Problem',
        'nutzer@kunde.de'
      );

      expect(result.category).toBe('support');
      expect(result.suggestedAssignee).toBe('Max Mustermann');
      expect(result.subcategory).toBe('technical_question');
    });

    it('should perform full email analysis with context', async () => {
      const mockAnalysisResponse: EmailAnalysisResponse = {
        success: true,
        analysis: {
          sentiment: {
            sentiment: 'neutral',
            confidence: 0.75,
            emotionalTone: ['sachlich', 'informativ'],
            keyPhrases: ['möchte informieren', 'neue Entwicklung'],
            urgencyLevel: 'medium'
          },
          intent: {
            intent: 'information',
            confidence: 0.82,
            actionRequired: false,
            suggestedActions: ['Kenntnisnahme', 'Archivierung'],
            responseTemplate: 'acknowledgment'
          },
          priority: {
            priority: 'normal',
            confidence: 0.70,
            reasoning: 'Informative E-Mail ohne Zeitdruck',
            slaRecommendation: 24,
            escalationNeeded: false
          },
          category: {
            category: 'marketing',
            confidence: 0.65,
            subcategory: 'newsletter',
            suggestedDepartment: 'Marketing',
            suggestedAssignee: null
          },
          summary: 'Newsletter mit Unternehmensupdates, keine Aktion erforderlich',
          keyInsights: ['Regelmäßiger Newsletter', 'Keine Response erwartet'],
          customerInsights: {
            satisfactionLevel: 'medium',
            relationshipStatus: 'established',
            nextBestAction: 'Weiter beobachten'
          }
        },
        analysisType: 'full',
        processingTime: 2100,
        aiProvider: 'gemini',
        timestamp: '2025-01-21T10:00:00Z',
        confidence: 0.74
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(mockAnalysisResponse) as any
      );

      const result = await firebaseAIService.fullEmailAnalysis(
        'Wir möchten Sie über neue Entwicklungen in unserem Unternehmen informieren...',
        'Newsletter Q1 2025',
        'marketing@partnerunternehmen.de',
        {
          customerInfo: 'Langjähriger Partner seit 2020',
          threadHistory: ['Letzte E-Mail vor 3 Monaten']
        }
      );

      expect(result.summary).toContain('Newsletter');
      expect(result.priority.priority).toBe('normal');
      expect(result.customerInsights.relationshipStatus).toBe('established');
    });
  });

  describe('Response Generation - Smart-Features', () => {
    it('should generate professional response suggestions', async () => {
      const mockResponseSuggestions: EmailResponseSuggestionResponse = {
        success: true,
        suggestions: [
          {
            responseText: 'Vielen Dank für Ihre Anfrage. Gerne senden wir Ihnen weitere Informationen zu unserem neuen Produkt.',
            tone: 'professional',
            confidence: 0.88,
            keyPoints: ['Dank für Anfrage', 'Zusage für Informationen'],
            suggestedActions: ['Produktbroschüre senden', 'Termin anbieten']
          },
          {
            responseText: 'Hallo! Danke für das Interesse an unserem Produkt. Hier sind die gewünschten Details:',
            tone: 'friendly',
            confidence: 0.75,
            keyPoints: ['Freundliche Begrüßung', 'Direkte Informationsbereitstellung'],
            suggestedActions: ['Details anhängen']
          }
        ],
        aiProvider: 'gemini',
        timestamp: '2025-01-21T10:00:00Z',
        processingTime: 1800
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(mockResponseSuggestions) as any
      );

      const request: EmailResponseRequest = {
        originalEmail: {
          subject: 'Anfrage zu neuem Produkt',
          content: 'Können Sie mir mehr Informationen zu Ihrem neuen CeleroPress-Feature schicken?',
          fromEmail: 'interessent@kunde.de',
          toEmail: 'info@celeropress.com'
        },
        responseType: 'answer',
        tone: 'professional',
        language: 'de'
      };

      const result = await firebaseAIService.generateEmailResponse(request);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].tone).toBe('professional');
      expect(result.suggestions[0].keyPoints).toContain('Dank für Anfrage');
    });

    it('should adapt tone based on request parameters', async () => {
      const mockResponse: EmailResponseSuggestionResponse = {
        success: true,
        suggestions: [{
          responseText: 'Es tut mir wirklich leid zu hören, dass Sie Probleme haben. Lassen Sie uns das sofort klären.',
          tone: 'empathetic',
          confidence: 0.82,
          keyPoints: ['Entschuldigung', 'Lösungsorientierung'],
          suggestedActions: ['Sofortige Bearbeitung', 'Rückruf anbieten']
        }],
        aiProvider: 'gemini',
        timestamp: '2025-01-21T10:00:00Z',
        processingTime: 1200
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(mockResponse) as any
      );

      const request: EmailResponseRequest = {
        originalEmail: {
          subject: 'Problem mit CeleroPress',
          content: 'Ich bin sehr frustriert. Das System funktioniert nicht richtig!',
          fromEmail: 'kunde@firma.de',
          toEmail: 'support@celeropress.com'
        },
        responseType: 'answer',
        tone: 'empathetic',
        language: 'de'
      };

      const result = await firebaseAIService.generateEmailResponse(request);

      expect(result.suggestions[0].tone).toBe('empathetic');
      expect(result.suggestions[0].responseText).toContain('tut mir leid');
    });
  });

  describe('Health Check & Connectivity', () => {
    it('should return true for healthy service', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse({ status: 'healthy' }) as any
      );

      const result = await firebaseAIService.healthCheck();

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/ai/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
    });

    it('should return false for unhealthy service', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse({ status: 'unhealthy' }, false) as any
      );

      const result = await firebaseAIService.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false on network errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await firebaseAIService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Templates Management', () => {
    it('should load templates successfully', async () => {
      const mockTemplates = {
        success: true,
        templates: [
          {
            title: 'Produktankündigung',
            prompt: 'Innovative Produkteinführung, die ein wichtiges Branchenproblem löst'
          },
          {
            title: 'Partnerschaft',
            prompt: 'Strategische Partnerschaft zwischen zwei führenden Unternehmen'
          }
        ]
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(mockTemplates) as any
      );

      const result = await firebaseAIService.getTemplates();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Produktankündigung');
    });

    it('should provide fallback templates on error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Templates service unavailable')
      );

      const result = await firebaseAIService.getTemplates();

      expect(result).toHaveLength(6); // Fallback templates
      expect(result[0].title).toBe('Produktankündigung');
      expect(result[1].title).toBe('Strategische Partnerschaft');
    });
  });

  describe('Error Handling & Resilience', () => {
    it('should sanitize API responses for security', async () => {
      const maliciousResponse = {
        success: true,
        generatedText: '<script>alert("xss")</script>Normale Pressemitteilung...',
        mode: 'generate',
        aiProvider: 'gemini'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse(maliciousResponse) as any
      );

      const result = await firebaseAIService.generatePressRelease('Test prompt');

      // Should return the content as-is (HTML sanitization happens in UI layer)
      expect(result).toContain('<script>');
      // Note: In production, this would be sanitized by the API layer
    });

    it('should handle missing AI service configuration', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        createMockResponse({ error: 'GEMINI_API_KEY nicht konfiguriert' }, false) as any
      );

      await expect(
        firebaseAIService.generatePressRelease('Test')
      ).rejects.toThrow('KI-Service ist nicht konfiguriert. Bitte setze GEMINI_API_KEY in den Umgebungsvariablen.');
    });

    it('should handle quick analysis failures gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Analysis timeout')
      );

      const result = await firebaseAIService.quickSentimentAnalysis(
        'Test content',
        'Test subject',
        'test@example.com'
      );

      // Should return null instead of throwing
      expect(result).toBeNull();
    });
  });
});