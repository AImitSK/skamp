// src/lib/ai/__tests__/firebase-ai-service-simple.test.ts
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { FirebaseAIService } from '../firebase-ai-service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FirebaseAIService - KI Tests (100% Pass Required)', () => {
  let firebaseAIService: FirebaseAIService;
  
  beforeEach(() => {
    firebaseAIService = new FirebaseAIService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockResponse = (data: any, ok: boolean = true, status: number = 200) => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: jest.fn().mockResolvedValue(data)
  });

  describe('Press Release Generation', () => {
    it('should generate press release successfully', async () => {
      const mockResponse = {
        success: true,
        generatedText: 'CeleroPress kündigt innovative PR-Management-Lösung an. Die neue Plattform revolutioniert die Medienarbeit...',
        mode: 'generate',
        aiProvider: 'gemini'
      };

      mockFetch.mockResolvedValue(createMockResponse(mockResponse) as any);

      const result = await firebaseAIService.generatePressRelease(
        'Innovative PR-Management-Lösung für deutsche Unternehmen'
      );

      expect(mockFetch).toHaveBeenCalledWith('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Innovative PR-Management-Lösung für deutsche Unternehmen',
          mode: 'generate'
        })
      });

      expect(result).toBe(mockResponse.generatedText);
    });

    it('should improve existing content', async () => {
      const existingContent = 'Alte Pressemitteilung...';
      const improvementRequest = 'Mache professioneller';
      
      const mockResponse = {
        success: true,
        generatedText: 'Verbesserte professionelle Pressemitteilung...',
        mode: 'improve',
        aiProvider: 'gemini'
      };

      mockFetch.mockResolvedValue(createMockResponse(mockResponse) as any);

      const result = await firebaseAIService.improvePressRelease(
        existingContent,
        improvementRequest
      );

      expect(result).toBe(mockResponse.generatedText);
    });
  });

  describe('Error Handling - Production Ready', () => {
    it('should handle quota limit errors with user-friendly messages', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ error: 'Gemini Quota exceeded' }, false, 429) as any
      );

      await expect(
        firebaseAIService.generatePressRelease('Test')
      ).rejects.toThrow('KI-Dienst temporär ausgelastet. Bitte versuche es in wenigen Minuten erneut.');
    });

    it('should handle safety filter errors', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ error: 'Safety filter triggered' }, false, 400) as any
      );

      await expect(
        firebaseAIService.generatePressRelease('Problematic content')
      ).rejects.toThrow('Dein Text wurde vom KI-Filter blockiert. Bitte formuliere anders und vermeide problematische Begriffe.');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      await expect(
        firebaseAIService.generatePressRelease('Test')
      ).rejects.toThrow('Verbindung zum KI-Service fehlgeschlagen. Bitte prüfe deine Internetverbindung.');
    });

    it('should handle missing configuration', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ error: 'GEMINI_API_KEY nicht konfiguriert' }, false, 500) as any
      );

      await expect(
        firebaseAIService.generatePressRelease('Test')
      ).rejects.toThrow('KI-Service ist nicht konfiguriert. Bitte setze GEMINI_API_KEY in den Umgebungsvariablen.');
    });
  });

  describe('Email Analysis - Core AI Features', () => {
    it('should analyze email sentiment correctly', async () => {
      const mockAnalysisResponse = {
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

      mockFetch.mockResolvedValue(createMockResponse(mockAnalysisResponse) as any);

      const result = await firebaseAIService.analyzeEmail({
        emailContent: 'Vielen Dank für Ihre schnelle Antwort. Das ist sehr gut gelaufen!',
        subject: 'Feedback zu unserem Projekt',
        fromEmail: 'kunde@firma.de',
        analysisType: 'sentiment'
      });

      expect(result.success).toBe(true);
      expect(result.analysis).toHaveProperty('sentiment', 'positive');
      expect(result.analysis).toHaveProperty('confidence', 0.85);
    });

    it('should determine email priority', async () => {
      const mockAnalysisResponse = {
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

      mockFetch.mockResolvedValue(createMockResponse(mockAnalysisResponse) as any);

      const result = await firebaseAIService.quickPriorityAnalysis(
        'DRINGEND: Pressekonferenz wurde abgesagt!',
        'DRINGEND: Pressekonferenz abgesagt',
        'pr-chef@unternehmen.de'
      );

      expect(result.priority).toBe('urgent');
      expect(result.escalationNeeded).toBe(true);
    });

    it('should categorize emails by type', async () => {
      const mockAnalysisResponse = {
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

      mockFetch.mockResolvedValue(createMockResponse(mockAnalysisResponse) as any);

      const result = await firebaseAIService.quickCategoryAnalysis(
        'Ich habe Probleme beim Login zu CeleroPress.',
        'Login-Problem',
        'nutzer@kunde.de'
      );

      expect(result.category).toBe('support');
      expect(result.suggestedAssignee).toBe('Max Mustermann');
    });
  });

  describe('Response Generation - Smart Features', () => {
    it('should generate professional response suggestions', async () => {
      const mockResponseSuggestions = {
        success: true,
        suggestions: [
          {
            responseText: 'Vielen Dank für Ihre Anfrage. Gerne senden wir Ihnen weitere Informationen.',
            tone: 'professional',
            confidence: 0.88,
            keyPoints: ['Dank für Anfrage', 'Zusage für Informationen'],
            suggestedActions: ['Produktbroschüre senden', 'Termin anbieten']
          }
        ],
        aiProvider: 'gemini',
        timestamp: '2025-01-21T10:00:00Z',
        processingTime: 1800
      };

      mockFetch.mockResolvedValue(createMockResponse(mockResponseSuggestions) as any);

      const result = await firebaseAIService.generateEmailResponse({
        originalEmail: {
          subject: 'Anfrage zu neuem Produkt',
          content: 'Können Sie mir mehr Informationen schicken?',
          fromEmail: 'interessent@kunde.de',
          toEmail: 'info@celeropress.com'
        },
        responseType: 'answer',
        tone: 'professional',
        language: 'de'
      });

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].tone).toBe('professional');
    });

    it('should adapt tone for empathetic responses', async () => {
      const mockResponse = {
        success: true,
        suggestions: [{
          responseText: 'Es tut mir leid zu hören, dass Sie Probleme haben.',
          tone: 'empathetic',
          confidence: 0.82,
          keyPoints: ['Entschuldigung', 'Lösungsorientierung'],
          suggestedActions: ['Sofortige Bearbeitung']
        }],
        aiProvider: 'gemini',
        timestamp: '2025-01-21T10:00:00Z',
        processingTime: 1200
      };

      mockFetch.mockResolvedValue(createMockResponse(mockResponse) as any);

      const result = await firebaseAIService.generateEmailResponse({
        originalEmail: {
          subject: 'Problem mit CeleroPress',
          content: 'Das System funktioniert nicht richtig!',
          fromEmail: 'kunde@firma.de',
          toEmail: 'support@celeropress.com'
        },
        responseType: 'answer',
        tone: 'empathetic',
        language: 'de'
      });

      expect(result.suggestions[0].tone).toBe('empathetic');
      expect(result.suggestions[0].responseText).toContain('tut mir leid');
    });
  });

  describe('Health Check & Connectivity', () => {
    it('should return true for healthy service', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ status: 'healthy' }) as any
      );

      const result = await firebaseAIService.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false for unhealthy service', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ status: 'unhealthy' }, false) as any
      );

      const result = await firebaseAIService.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false on network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await firebaseAIService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Template Management', () => {
    it('should load templates successfully', async () => {
      const mockTemplates = {
        success: true,
        templates: [
          {
            title: 'Produktankündigung',
            prompt: 'Innovative Produkteinführung'
          },
          {
            title: 'Partnerschaft',
            prompt: 'Strategische Partnerschaft'
          }
        ]
      };

      mockFetch.mockResolvedValue(createMockResponse(mockTemplates) as any);

      const result = await firebaseAIService.getTemplates();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Produktankündigung');
    });

    it('should provide fallback templates on error', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const result = await firebaseAIService.getTemplates();

      // Should provide fallback templates
      expect(result).toHaveLength(6); // Fallback templates
      expect(result[0].title).toBe('Produktankündigung');
    });
  });

  describe('Edge Cases & Resilience', () => {
    it('should handle API success flag false', async () => {
      const mockResponse = {
        success: false,
        generatedText: '',
        mode: 'generate',
        aiProvider: 'gemini'
      };

      mockFetch.mockResolvedValue(createMockResponse(mockResponse) as any);

      await expect(
        firebaseAIService.generatePressRelease('Test')
      ).rejects.toThrow('Fehler bei der Generierung');
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(null) as any
      );

      await expect(
        firebaseAIService.generatePressRelease('Test')
      ).rejects.toThrow();
    });

    it('should handle quick analysis failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Analysis timeout'));

      const result = await firebaseAIService.quickSentimentAnalysis(
        'Test content',
        'Test subject', 
        'test@example.com'
      );

      // Should return null instead of throwing
      expect(result).toBeNull();
    });

    it('should handle full analysis failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Full analysis timeout'));

      const result = await firebaseAIService.fullEmailAnalysis(
        'Test content',
        'Test subject',
        'test@example.com'
      );

      expect(result).toBeNull();
    });
  });

  describe('Real Business Scenarios', () => {
    it('should handle complete PR workflow', async () => {
      // Press release generation
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        generatedText: 'CeleroPress announces new features...',
        mode: 'generate'
      }) as any);

      const pressRelease = await firebaseAIService.generatePressRelease(
        'New AI features in CeleroPress for better PR management'
      );

      expect(pressRelease).toContain('CeleroPress');

      // Email analysis
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        analysis: {
          sentiment: 'neutral',
          priority: 'normal',
          category: 'information'
        },
        analysisType: 'full'
      }) as any);

      const analysis = await firebaseAIService.fullEmailAnalysis(
        'Thanks for the press release. When will this be published?',
        'Re: Press Release',
        'journalist@newspaper.com'
      );

      expect(analysis).toBeTruthy();
      expect(analysis.sentiment).toBe('neutral');
    });

    it('should handle urgent customer support scenario', async () => {
      // Priority analysis
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        analysis: {
          priority: 'urgent',
          escalationNeeded: true,
          slaRecommendation: 1
        }
      }) as any);

      const priority = await firebaseAIService.quickPriorityAnalysis(
        'CRITICAL: Our press release contained wrong information!',
        'CRITICAL: Wrong information',
        'customer@client.com'
      );

      expect(priority.priority).toBe('urgent');
      expect(priority.escalationNeeded).toBe(true);

      // Response generation
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        suggestions: [{
          responseText: 'We sincerely apologize for this error...',
          tone: 'empathetic',
          suggestedActions: ['Immediate correction', 'Follow-up call']
        }]
      }) as any);

      const response = await firebaseAIService.generateEmailResponse({
        originalEmail: {
          subject: 'CRITICAL: Wrong information',
          content: 'CRITICAL: Our press release contained wrong information!',
          fromEmail: 'customer@client.com',
          toEmail: 'support@celeropress.com'
        },
        responseType: 'escalate',
        tone: 'empathetic'
      });

      expect(response.suggestions[0].suggestedActions).toContain('Immediate correction');
    });
  });
});