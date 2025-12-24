// Tests für Marken-DNA Chat Flow
// Phase 3: KI-Chat Backend

import { markenDNAChatFlow } from '../marken-dna-chat';
import type { MarkenDNAChatInput } from '../marken-dna-chat';

// ============================================================================
// MOCKS
// ============================================================================

// Genkit/AI Mocks
jest.mock('@/lib/ai/genkit-config', () => ({
  ai: {
    generate: jest.fn(),
    defineFlow: jest.fn((config, handler) => handler),
  },
}));

jest.mock('@genkit-ai/google-genai', () => ({
  googleAI: {
    model: jest.fn(() => 'mock-model'),
  },
}));

// ============================================================================
// TESTS
// ============================================================================

describe('markenDNAChatFlow', () => {
  const { ai } = require('@/lib/ai/genkit-config');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Schema Validation', () => {
    it('sollte gültigen Input akzeptieren', async () => {
      const mockResponse = {
        text: 'Test Response',
      };
      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Hallo' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result).toBeDefined();
      expect(result.response).toBe('Test Response');
    });

    it('sollte Standard-Sprache "de" verwenden wenn nicht angegeben', async () => {
      const mockResponse = {
        text: 'Test Response',
      };
      ai.generate.mockResolvedValue(mockResponse);

      const input = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        messages: [{ role: 'user', content: 'Hallo' }],
      } as MarkenDNAChatInput;

      await markenDNAChatFlow(input);

      expect(ai.generate).toHaveBeenCalled();
    });

    it('sollte existingDocument als optional akzeptieren', async () => {
      const mockResponse = {
        text: 'Test Response',
      };
      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Hallo' }],
        existingDocument: '## Bestehendes Dokument\n- Punkt 1',
      };

      const result = await markenDNAChatFlow(input);

      expect(result).toBeDefined();
      // Prüfen dass System-Prompt das Dokument enthält
      expect(ai.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Bestehendes Dokument'),
        })
      );
    });
  });

  describe('Document Extraction', () => {
    it('sollte [DOCUMENT]...[/DOCUMENT] korrekt extrahieren', async () => {
      const mockResponse = {
        text: `Hier ist der Entwurf:

[DOCUMENT]
## Briefing-Check
- Branche: Maschinenbau
- Mitarbeiter: 50
[/DOCUMENT]

Was möchtest du als nächstes besprechen?`,
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Wir sind ein Maschinenbauer' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.document).toBeDefined();
      expect(result.document).toContain('## Briefing-Check');
      expect(result.document).toContain('- Branche: Maschinenbau');
    });

    it('sollte undefined zurückgeben wenn kein [DOCUMENT] vorhanden', async () => {
      const mockResponse = {
        text: 'Nur eine normale Antwort ohne Dokument-Tags',
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Hallo' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.document).toBeUndefined();
    });
  });

  describe('Progress Extraction', () => {
    it('sollte [PROGRESS:XX] korrekt extrahieren', async () => {
      const mockResponse = {
        text: `Gut! Ich habe das notiert.

[PROGRESS:25]

Was möchtest du als nächstes besprechen?`,
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.progress).toBe(25);
    });

    it('sollte verschiedene Progress-Werte korrekt parsen', async () => {
      const testCases = [
        { text: '[PROGRESS:0]', expected: 0 },
        { text: '[PROGRESS:50]', expected: 50 },
        { text: '[PROGRESS:100]', expected: 100 },
      ];

      for (const testCase of testCases) {
        ai.generate.mockResolvedValue({ text: testCase.text });

        const input: MarkenDNAChatInput = {
          documentType: 'briefing',
          companyId: 'company-123',
          companyName: 'Test GmbH',
          language: 'de',
          messages: [{ role: 'user', content: 'Test' }],
        };

        const result = await markenDNAChatFlow(input);

        expect(result.progress).toBe(testCase.expected);
      }
    });

    it('sollte undefined zurückgeben wenn kein [PROGRESS] vorhanden', async () => {
      const mockResponse = {
        text: 'Antwort ohne Progress-Tag',
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.progress).toBeUndefined();
    });
  });

  describe('Status Extraction', () => {
    it('sollte [STATUS:completed] korrekt extrahieren', async () => {
      const mockResponse = {
        text: `Perfekt! Das Briefing ist vollständig.

[PROGRESS:100]
[STATUS:completed]

Alle Informationen wurden erfasst.`,
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Ja, das ist korrekt.' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.status).toBe('completed');
    });

    it('sollte [STATUS:draft] korrekt extrahieren', async () => {
      const mockResponse = {
        text: `Ich habe das notiert.

[PROGRESS:50]
[STATUS:draft]

Was möchtest du als nächstes besprechen?`,
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.status).toBe('draft');
    });

    it('sollte undefined zurückgeben wenn kein [STATUS] vorhanden', async () => {
      const mockResponse = {
        text: 'Antwort ohne Status-Tag',
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.status).toBeUndefined();
    });

    it('sollte case-insensitive [STATUS:COMPLETED] erkennen', async () => {
      const mockResponse = {
        text: '[STATUS:COMPLETED]',
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.status).toBe('completed');
    });
  });

  describe('Suggestions Extraction', () => {
    it('sollte [SUGGESTIONS]...[/SUGGESTIONS] korrekt extrahieren', async () => {
      const mockResponse = {
        text: `Was möchtest du als nächstes besprechen?

[SUGGESTIONS]
Zielgruppen definieren
Wettbewerber analysieren
Kernprodukte beschreiben
[/SUGGESTIONS]`,
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions).toContain('Zielgruppen definieren');
      expect(result.suggestions).toContain('Wettbewerber analysieren');
      expect(result.suggestions).toContain('Kernprodukte beschreiben');
    });

    it('sollte leere Zeilen in Suggestions filtern', async () => {
      const mockResponse = {
        text: `[SUGGESTIONS]
Vorschlag 1

Vorschlag 2


Vorschlag 3
[/SUGGESTIONS]`,
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions).toEqual([
        'Vorschlag 1',
        'Vorschlag 2',
        'Vorschlag 3',
      ]);
    });

    it('sollte undefined zurückgeben wenn keine [SUGGESTIONS] vorhanden', async () => {
      const mockResponse = {
        text: 'Antwort ohne Suggestions',
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result.suggestions).toBeUndefined();
    });
  });

  describe('Sprach-Handling', () => {
    it('sollte deutschen System-Prompt verwenden bei language=de', async () => {
      ai.generate.mockResolvedValue({ text: 'Test' });

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      await markenDNAChatFlow(input);

      expect(ai.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('PR-Stratege'),
        })
      );
    });

    it('sollte englischen System-Prompt verwenden bei language=en', async () => {
      ai.generate.mockResolvedValue({ text: 'Test' });

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'en',
        messages: [{ role: 'user', content: 'Test' }],
      };

      await markenDNAChatFlow(input);

      expect(ai.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('PR strategist'),
        })
      );
    });
  });

  describe('Message Formatting', () => {
    it('sollte User-Messages korrekt formatieren', async () => {
      ai.generate.mockResolvedValue({ text: 'Test' });

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [
          { role: 'user', content: 'Nachricht 1' },
          { role: 'assistant', content: 'Antwort 1' },
          { role: 'user', content: 'Nachricht 2' },
        ],
      };

      await markenDNAChatFlow(input);

      expect(ai.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: [{ text: 'Nachricht 1' }] },
            { role: 'model', content: [{ text: 'Antwort 1' }] },
            { role: 'user', content: [{ text: 'Nachricht 2' }] },
          ],
        })
      );
    });
  });

  describe('Komplette Response mit allen Markups', () => {
    it('sollte alle Komponenten gleichzeitig extrahieren', async () => {
      const mockResponse = {
        text: `Gut! Hier ist der aktuelle Stand:

[DOCUMENT]
## Briefing-Check

### Unternehmen
- Branche: Maschinenbau
- Mitarbeiter: 50
- Standort: München

### Kernprodukte
- Hochpräzise Wickelmaschinen
- Automatisierungslösungen
[/DOCUMENT]

[PROGRESS:40]

Sehr gut! Als nächstes könnten wir folgendes besprechen:

[SUGGESTIONS]
Den Wettbewerb analysieren
Die Zielgruppen definieren
Die Alleinstellungsmerkmale herausarbeiten
[/SUGGESTIONS]`,
      };

      ai.generate.mockResolvedValue(mockResponse);

      const input: MarkenDNAChatInput = {
        documentType: 'briefing',
        companyId: 'company-123',
        companyName: 'IBD Wickeltechnik GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Wir sind ein Maschinenbauer...' }],
      };

      const result = await markenDNAChatFlow(input);

      // Response
      expect(result.response).toContain('Gut! Hier ist der aktuelle Stand');

      // Document
      expect(result.document).toBeDefined();
      expect(result.document).toContain('## Briefing-Check');
      expect(result.document).toContain('- Branche: Maschinenbau');

      // Progress
      expect(result.progress).toBe(40);

      // Suggestions
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions).toContain('Den Wettbewerb analysieren');
    });
  });

  describe('Alle Dokumenttypen', () => {
    const documentTypes = [
      'briefing',
      'swot',
      'audience',
      'positioning',
      'goals',
      'messages',
    ] as const;

    it.each(documentTypes)('sollte %s Dokument-Typ verarbeiten', async (docType) => {
      ai.generate.mockResolvedValue({ text: 'Test Response' });

      const input: MarkenDNAChatInput = {
        documentType: docType,
        companyId: 'company-123',
        companyName: 'Test GmbH',
        language: 'de',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await markenDNAChatFlow(input);

      expect(result).toBeDefined();
      expect(ai.generate).toHaveBeenCalled();
    });
  });
});
