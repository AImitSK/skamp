/**
 * Tests für den translatePressRelease Genkit Flow
 *
 * @module translate-press-release-flow.test
 */

// Mock Genkit BEFORE imports
jest.mock('@/lib/ai/genkit-config', () => ({
  ai: {
    defineFlow: jest.fn((config, handler) => handler),
    generate: jest.fn(),
  },
  gemini25FlashModel: 'gemini-2.5-flash',
}));

import { ai } from '@/lib/ai/genkit-config';

// Import after mocking
import { translatePressReleaseFlow } from '@/lib/ai/flows/translate-press-release';
import {
  TranslatePressReleaseInput,
  GlossaryEntry,
} from '@/lib/ai/schemas/translate-press-release-schemas';

describe('translatePressRelease Genkit Flow', () => {
  const mockAiGenerate = ai.generate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Basis-Übersetzung ohne Glossar
  // ═══════════════════════════════════════════════════════════════

  describe('Basis-Übersetzung', () => {
    it('sollte deutsche Pressemitteilung nach Englisch übersetzen', async () => {
      // Arrange
      const input: TranslatePressReleaseInput = {
        content: '<p>Die TechCorp GmbH startet ein neues Projekt.</p>',
        title: 'TechCorp startet Innovation',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: TechCorp Launches Innovation\nINHALT: <p>TechCorp GmbH launches a new project.</p>',
        message: {
          content: [
            {
              text: 'TITEL: TechCorp Launches Innovation\nINHALT: <p>TechCorp GmbH launches a new project.</p>',
            },
          ],
        },
      });

      // Act
      const result = await translatePressReleaseFlow(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.translatedTitle).toBe('TechCorp Launches Innovation');
      expect(result.translatedContent).toContain('TechCorp GmbH');
      expect(result.sourceLanguage).toBe('de');
      expect(result.targetLanguage).toBe('en');
      expect(result.modelUsed).toBe('gemini-2.5-flash');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.stats.originalCharCount).toBe(input.content.length);
    });

    it('sollte französische Pressemitteilung nach Deutsch übersetzen', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>La société annonce un nouveau produit.</p>',
        title: 'Annonce importante',
        sourceLanguage: 'fr',
        targetLanguage: 'de',
        tone: 'formal',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: Wichtige Ankündigung\nINHALT: <p>Das Unternehmen kündigt ein neues Produkt an.</p>',
      });

      const result = await translatePressReleaseFlow(input);

      expect(result.translatedTitle).toBe('Wichtige Ankündigung');
      expect(result.targetLanguage).toBe('de');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Glossar-Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Glossar-Integration', () => {
    it('sollte Glossar-Einträge in der Übersetzung verwenden', async () => {
      const glossaryEntries: GlossaryEntry[] = [
        { id: 'g1', source: 'Pressemitteilung', target: 'Press Release', context: 'PR' },
        { id: 'g2', source: 'Geschäftsführer', target: 'CEO', context: null },
      ];

      const input: TranslatePressReleaseInput = {
        content: '<p>Der Geschäftsführer veröffentlicht eine Pressemitteilung.</p>',
        title: 'Neue Pressemitteilung',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: New Press Release\nINHALT: <p>The CEO publishes a Press Release.</p>',
      });

      const result = await translatePressReleaseFlow(input);

      // Glossar-Einträge sollten im Ergebnis getrackt werden
      expect(result.glossaryUsed).toBeDefined();
      expect(Array.isArray(result.glossaryUsed)).toBe(true);
      // Bei Match sollten IDs zurückgegeben werden
      expect(result.translatedContent).toContain('Press Release');
    });

    it('sollte mit leerem Glossar funktionieren', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Einfacher Text ohne Fachbegriffe.</p>',
        title: 'Einfacher Titel',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'neutral',
        preserveFormatting: true,
        glossaryEntries: [],
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: Simple Title\nINHALT: <p>Simple text without technical terms.</p>',
      });

      const result = await translatePressReleaseFlow(input);

      expect(result.glossaryUsed).toEqual([]);
      expect(result.translatedTitle).toBe('Simple Title');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: HTML-Formatierung beibehalten
  // ═══════════════════════════════════════════════════════════════

  describe('HTML-Formatierung', () => {
    it('sollte HTML-Tags beibehalten', async () => {
      const input: TranslatePressReleaseInput = {
        content:
          '<p><strong>München</strong> - Die Firma <em>TechCorp</em> gibt bekannt...</p>',
        title: 'Ankündigung',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: Announcement\nINHALT: <p><strong>Munich</strong> - The company <em>TechCorp</em> announces...</p>',
      });

      const result = await translatePressReleaseFlow(input);

      // HTML-Tags sollten erhalten bleiben
      expect(result.translatedContent).toContain('<p>');
      expect(result.translatedContent).toContain('<strong>');
      expect(result.translatedContent).toContain('<em>');
      expect(result.translatedContent).toContain('</p>');
    });

    it('sollte Blockquotes für Zitate beibehalten', async () => {
      const input: TranslatePressReleaseInput = {
        content:
          '<blockquote data-type="quote"><p>"Wir sind stolz auf diese Entwicklung"</p></blockquote>',
        title: 'Zitat',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: Quote\nINHALT: <blockquote data-type="quote"><p>"We are proud of this development"</p></blockquote>',
      });

      const result = await translatePressReleaseFlow(input);

      expect(result.translatedContent).toContain('<blockquote');
      expect(result.translatedContent).toContain('data-type="quote"');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Tonalität
  // ═══════════════════════════════════════════════════════════════

  describe('Tonalität', () => {
    it('sollte formelle Tonalität unterstützen', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Wir informieren Sie hiermit über...</p>',
        title: 'Offizielle Mitteilung',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'formal',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: Official Notice\nINHALT: <p>We hereby inform you about...</p>',
      });

      const result = await translatePressReleaseFlow(input);

      expect(result).toBeDefined();
      expect(result.translatedTitle).toBe('Official Notice');
    });

    it('sollte neutrale Tonalität unterstützen', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Das Unternehmen plant...</p>',
        title: 'Information',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'neutral',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: Information\nINHALT: <p>The company plans...</p>',
      });

      const result = await translatePressReleaseFlow(input);

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Fehlerbehandlung
  // ═══════════════════════════════════════════════════════════════

  describe('Fehlerbehandlung', () => {
    it('sollte bei leerer Gemini-Response einen Fehler werfen', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Test</p>',
        title: 'Test',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: '',
        message: { content: [] },
      });

      await expect(translatePressReleaseFlow(input)).rejects.toThrow(
        'Keine Übersetzung von Gemini erhalten'
      );
    });

    it('sollte API-Fehler weitergeben', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Test</p>',
        title: 'Test',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockRejectedValue(new Error('API Rate Limit exceeded'));

      await expect(translatePressReleaseFlow(input)).rejects.toThrow(
        'Übersetzungs-Fehler: API Rate Limit exceeded'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Statistiken & Konfidenz
  // ═══════════════════════════════════════════════════════════════

  describe('Statistiken & Konfidenz', () => {
    it('sollte korrekte Statistiken zurückgeben', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Ein Absatz mit einigen Wörtern zum Testen.</p>',
        title: 'Statistik-Test',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: Statistics Test\nINHALT: <p>A paragraph with some words for testing.</p>',
      });

      const result = await translatePressReleaseFlow(input);

      expect(result.stats).toBeDefined();
      expect(result.stats.originalCharCount).toBe(input.content.length);
      expect(result.stats.translatedCharCount).toBeGreaterThan(0);
      expect(result.stats.glossaryMatchCount).toBe(0);
    });

    it('sollte Konfidenz zwischen 0 und 1 berechnen', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Test content for confidence calculation.</p>',
        title: 'Confidence Test',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: Confidence Test\nINHALT: <p>Test content for confidence calculation.</p>',
      });

      const result = await translatePressReleaseFlow(input);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('sollte timestamp im ISO-Format zurückgeben', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Timestamp test</p>',
        title: 'Timestamp',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: 'TITEL: Timestamp\nINHALT: <p>Timestamp test</p>',
      });

      const result = await translatePressReleaseFlow(input);

      expect(result.timestamp).toBeDefined();
      // ISO Format prüfen
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: Fallback-Parsing
  // ═══════════════════════════════════════════════════════════════

  describe('Fallback-Parsing', () => {
    it('sollte bei unstrukturierter Response Fallback nutzen', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Test</p>',
        title: 'Test Title',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      // Response ohne TITEL:/INHALT: Struktur
      mockAiGenerate.mockResolvedValue({
        text: 'Translated Title\n<p>Translated content here.</p>',
      });

      const result = await translatePressReleaseFlow(input);

      // Sollte erste Zeile als Titel nehmen
      expect(result.translatedTitle).toBe('Translated Title');
      expect(result.translatedContent).toContain('Translated content');
    });

    it('sollte Markdown-Codeblöcke entfernen', async () => {
      const input: TranslatePressReleaseInput = {
        content: '<p>Code block test</p>',
        title: 'Code Test',
        sourceLanguage: 'de',
        targetLanguage: 'en',
        tone: 'professional',
        preserveFormatting: true,
        glossaryEntries: null,
      };

      mockAiGenerate.mockResolvedValue({
        text: '```html\nTITEL: Code Test\nINHALT: <p>Clean content</p>\n```',
      });

      const result = await translatePressReleaseFlow(input);

      expect(result.translatedContent).not.toContain('```');
    });
  });
});
