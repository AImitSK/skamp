/**
 * Tests für die /api/ai/translate API-Route
 *
 * @module translate-api.test
 */

import { NextRequest } from 'next/server';

// Mock Auth Middleware
jest.mock('@/lib/api/auth-middleware', () => ({
  withAuth: jest.fn((req, handler) =>
    handler(req, {
      userId: 'test-user-123',
      organizationId: 'test-org-456',
    })
  ),
}));

// Mock Genkit Flow
jest.mock('@/lib/ai/flows/translate-press-release', () => ({
  translatePressReleaseFlow: jest.fn(),
}));

// Mock Services
jest.mock('@/lib/services/glossary-service', () => ({
  glossaryService: {
    getByCustomer: jest.fn(),
  },
}));

jest.mock('@/lib/services/translation-service', () => ({
  translationService: {
    create: jest.fn(),
  },
}));

// Mock Usage Tracker
jest.mock('@/lib/usage/usage-tracker', () => ({
  checkAILimit: jest.fn(),
}));

jest.mock('@/lib/ai/helpers/usage-tracker', () => ({
  estimateAIWords: jest.fn(() => 500),
  trackAIUsage: jest.fn(),
}));

import { POST } from '@/app/api/ai/translate/route';
import { translatePressReleaseFlow } from '@/lib/ai/flows/translate-press-release';
import { glossaryService } from '@/lib/services/glossary-service';
import { translationService } from '@/lib/services/translation-service';
import { checkAILimit } from '@/lib/usage/usage-tracker';

describe('/api/ai/translate API Route', () => {
  const mockTranslateFlow = translatePressReleaseFlow as unknown as jest.Mock;
  const mockGlossaryService = glossaryService.getByCustomer as jest.Mock;
  const mockTranslationService = translationService.create as jest.Mock;
  const mockCheckAILimit = checkAILimit as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: AI-Limit erlaubt
    mockCheckAILimit.mockResolvedValue({
      allowed: true,
      current: 1000,
      limit: 10000,
      remaining: 9000,
      wouldExceed: false,
    });

    // Default: Leeres Glossar
    mockGlossaryService.mockResolvedValue([]);

    // Default: Translation Service speichert erfolgreich
    mockTranslationService.mockResolvedValue({
      id: 'trans-new-123',
      projectId: 'proj-123',
      language: 'en',
      title: 'Translated Title',
      content: '<p>Translated content</p>',
      status: 'generated',
      isOutdated: false,
    });

    // Default: Flow gibt erfolgreiche Übersetzung zurück
    mockTranslateFlow.mockResolvedValue({
      translatedTitle: 'Translated Title',
      translatedContent: '<p>Translated content</p>',
      glossaryUsed: [],
      confidence: 0.92,
      sourceLanguage: 'de',
      targetLanguage: 'en',
      stats: {
        originalCharCount: 100,
        translatedCharCount: 95,
        glossaryMatchCount: 0,
      },
      timestamp: new Date().toISOString(),
      modelUsed: 'gemini-2.5-flash',
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Request erstellen
  // ═══════════════════════════════════════════════════════════════

  function createRequest(body: object): NextRequest {
    return new NextRequest('http://localhost:3000/api/ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(body),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST: Erfolgreiche Übersetzung
  // ═══════════════════════════════════════════════════════════════

  describe('Erfolgreiche Übersetzung', () => {
    it('sollte deutsche Pressemitteilung nach Englisch übersetzen', async () => {
      const request = createRequest({
        projectId: 'proj-123',
        title: 'Pressemitteilung Titel',
        content: '<p>Deutsche Pressemitteilung</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.translation).toBeDefined();
      expect(data.translation.id).toBe('trans-new-123');
      expect(data.translation.language).toBe('en');
      expect(data.stats).toBeDefined();
      expect(data.meta.model).toBe('gemini-2.5-flash');
    });

    it('sollte mit Glossar übersetzen', async () => {
      // Setup: Glossar mit Einträgen
      mockGlossaryService.mockResolvedValue([
        {
          id: 'g1',
          sourceTerm: 'Pressemitteilung',
          isApproved: true,
          translations: {
            de: 'Pressemitteilung',
            en: 'Press Release',
          },
          context: 'PR',
        },
      ]);

      mockTranslateFlow.mockResolvedValue({
        translatedTitle: 'Press Release Title',
        translatedContent: '<p>Press Release content</p>',
        glossaryUsed: ['g1'],
        confidence: 0.95,
        sourceLanguage: 'de',
        targetLanguage: 'en',
        stats: {
          originalCharCount: 100,
          translatedCharCount: 95,
          glossaryMatchCount: 1,
        },
        timestamp: new Date().toISOString(),
        modelUsed: 'gemini-2.5-flash',
      });

      const request = createRequest({
        projectId: 'proj-123',
        title: 'Pressemitteilung',
        content: '<p>Text mit Pressemitteilung</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        customerId: 'customer-123',
        useGlossary: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.glossaryMatchCount).toBe(1);
      expect(data.meta.glossaryUsed).toContain('g1');
      expect(mockGlossaryService).toHaveBeenCalledWith('test-org-456', 'customer-123');
    });

    it('sollte verschiedene Tonalitäten unterstützen', async () => {
      const request = createRequest({
        projectId: 'proj-123',
        title: 'Formelle Mitteilung',
        content: '<p>Formeller Inhalt</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'formal',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockTranslateFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'formal',
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Input-Validierung
  // ═══════════════════════════════════════════════════════════════

  describe('Input-Validierung', () => {
    it('sollte 400 bei fehlendem projectId', async () => {
      const request = createRequest({
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('projectId');
    });

    it('sollte 400 bei fehlendem title', async () => {
      const request = createRequest({
        projectId: 'proj-123',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('title');
    });

    it('sollte 400 bei fehlendem content', async () => {
      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        sourceLanguage: 'de',
        targetLanguage: 'en',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('content');
    });

    it('sollte 400 bei leerem title', async () => {
      const request = createRequest({
        projectId: 'proj-123',
        title: '   ',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('title');
    });

    it('sollte 400 bei fehlenden Sprachen', async () => {
      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('sourceLanguage');
    });

    it('sollte 400 bei identischen Sprachen', async () => {
      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'de',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('identisch');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: AI-Limit
  // ═══════════════════════════════════════════════════════════════

  describe('AI-Limit Prüfung', () => {
    it('sollte 429 bei überschrittenem AI-Limit', async () => {
      mockCheckAILimit.mockResolvedValue({
        allowed: false,
        current: 10000,
        limit: 10000,
        remaining: 0,
        wouldExceed: true,
      });

      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('AI-Limit');
      expect(data.limitInfo).toBeDefined();
      expect(data.limitInfo.remaining).toBe(0);
    });

    it('sollte 500 bei Limit-Prüfungs-Fehler', async () => {
      mockCheckAILimit.mockRejectedValue(new Error('Database error'));

      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('AI-Limits');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Fehlerbehandlung
  // ═══════════════════════════════════════════════════════════════

  describe('Fehlerbehandlung', () => {
    it('sollte 500 bei Flow-Fehler', async () => {
      mockTranslateFlow.mockRejectedValue(new Error('Gemini API unavailable'));

      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Gemini API unavailable');
    });

    it('sollte bei Glossar-Fehler ohne Glossar weitermachen', async () => {
      mockGlossaryService.mockRejectedValue(new Error('Glossar nicht erreichbar'));

      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        customerId: 'customer-123',
        useGlossary: true,
      });

      const response = await POST(request);
      const data = await response.json();

      // Sollte trotzdem erfolgreich sein
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Speichern in Firestore
  // ═══════════════════════════════════════════════════════════════

  describe('Speichern in Firestore', () => {
    it('sollte Übersetzung in Firestore speichern', async () => {
      const request = createRequest({
        projectId: 'proj-123',
        campaignId: 'camp-456',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        sourceVersion: 2,
      });

      await POST(request);

      expect(mockTranslationService).toHaveBeenCalledWith(
        'test-org-456',
        expect.objectContaining({
          projectId: 'proj-123',
          campaignId: 'camp-456',
          language: 'en',
          sourceVersion: 2,
        })
      );
    });

    it('sollte modelUsed und glossaryEntriesUsed speichern', async () => {
      mockTranslateFlow.mockResolvedValue({
        translatedTitle: 'Title',
        translatedContent: '<p>Content</p>',
        glossaryUsed: ['g1', 'g2'],
        confidence: 0.9,
        sourceLanguage: 'de',
        targetLanguage: 'en',
        stats: { originalCharCount: 50, translatedCharCount: 45, glossaryMatchCount: 2 },
        timestamp: new Date().toISOString(),
        modelUsed: 'gemini-2.5-flash',
      });

      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
      });

      await POST(request);

      expect(mockTranslationService).toHaveBeenCalledWith(
        'test-org-456',
        expect.objectContaining({
          modelUsed: 'gemini-2.5-flash',
          glossaryEntriesUsed: ['g1', 'g2'],
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Glossar-Filterung
  // ═══════════════════════════════════════════════════════════════

  describe('Glossar-Filterung', () => {
    it('sollte nur freigegebene Glossar-Einträge verwenden', async () => {
      mockGlossaryService.mockResolvedValue([
        {
          id: 'g1',
          sourceTerm: 'Term1',
          isApproved: true,
          translations: { de: 'Begriff1', en: 'Term1' },
        },
        {
          id: 'g2',
          sourceTerm: 'Term2',
          isApproved: false, // Nicht freigegeben
          translations: { de: 'Begriff2', en: 'Term2' },
        },
      ]);

      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        customerId: 'customer-123',
        useGlossary: true,
      });

      await POST(request);

      // Nur freigegebene Einträge sollten übergeben werden
      const flowCall = mockTranslateFlow.mock.calls[0][0];
      expect(flowCall.glossaryEntries).toHaveLength(1);
      expect(flowCall.glossaryEntries[0].id).toBe('g1');
    });

    it('sollte nur Einträge mit beiden Sprachen verwenden', async () => {
      mockGlossaryService.mockResolvedValue([
        {
          id: 'g1',
          sourceTerm: 'Complete',
          isApproved: true,
          translations: { de: 'Vollständig', en: 'Complete' },
        },
        {
          id: 'g2',
          sourceTerm: 'Incomplete',
          isApproved: true,
          translations: { de: 'Unvollständig' }, // Fehlt EN
        },
      ]);

      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        customerId: 'customer-123',
        useGlossary: true,
      });

      await POST(request);

      const flowCall = mockTranslateFlow.mock.calls[0][0];
      expect(flowCall.glossaryEntries).toHaveLength(1);
      expect(flowCall.glossaryEntries[0].id).toBe('g1');
    });

    it('sollte kein Glossar laden wenn useGlossary=false', async () => {
      const request = createRequest({
        projectId: 'proj-123',
        title: 'Titel',
        content: '<p>Content</p>',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        customerId: 'customer-123',
        useGlossary: false,
      });

      await POST(request);

      expect(mockGlossaryService).not.toHaveBeenCalled();
    });
  });
});
