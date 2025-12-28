// src/lib/ai/prompts/__tests__/ai-sequence.test.ts
import {
  buildAISequencePrompt,
  extractToneFromDNA,
  AISequenceContext,
} from '../ai-sequence';

describe('AI Sequence Prompts', () => {
  describe('extractToneFromDNA()', () => {
    describe('Formal tone detection', () => {
      it('should detect "formell" keyword', () => {
        const dna = 'Unsere Kommunikation ist formell und seriös.';
        expect(extractToneFromDNA(dna)).toBe('formal');
      });

      it('should detect "professionell" keyword', () => {
        const dna = 'Wir kommunizieren professionell und sachlich.';
        expect(extractToneFromDNA(dna)).toBe('formal');
      });

      it('should detect "seriös" keyword', () => {
        const dna = 'Ein seriöser Auftritt ist wichtig.';
        expect(extractToneFromDNA(dna)).toBe('formal');
      });

      it('should detect "sachlich" keyword', () => {
        const dna = 'Wir bleiben sachlich und objektiv.';
        expect(extractToneFromDNA(dna)).toBe('formal');
      });
    });

    describe('Casual tone detection', () => {
      it('should detect "casual" keyword', () => {
        const dna = 'Wir sind casual unterwegs.';
        expect(extractToneFromDNA(dna)).toBe('casual');
      });

      it('should detect "locker" keyword', () => {
        const dna = 'Unsere Sprache ist locker und entspannt.';
        expect(extractToneFromDNA(dna)).toBe('casual');
      });

      it('should detect "entspannt" keyword', () => {
        const dna = 'Wir kommunizieren entspannt.';
        expect(extractToneFromDNA(dna)).toBe('casual');
      });

      it('should detect "freundlich" keyword', () => {
        const dna = 'Ein freundlicher Ton ist uns wichtig.';
        expect(extractToneFromDNA(dna)).toBe('casual');
      });

      it('should detect "nahbar" keyword', () => {
        const dna = 'Wir sind nahbar und authentisch.';
        expect(extractToneFromDNA(dna)).toBe('casual');
      });
    });

    describe('Modern tone detection', () => {
      it('should detect "modern" keyword', () => {
        const dna = 'Unsere Sprache ist modern.';
        expect(extractToneFromDNA(dna)).toBe('modern');
      });

      it('should detect "innovativ" keyword', () => {
        const dna = 'Wir sind innovativ und zukunftsorientiert.';
        expect(extractToneFromDNA(dna)).toBe('modern');
      });

      it('should detect "frisch" keyword', () => {
        const dna = 'Eine frische Kommunikation ist unser Ziel.';
        expect(extractToneFromDNA(dna)).toBe('modern');
      });

      it('should detect "jung" keyword', () => {
        const dna = 'Wir sprechen jung und dynamisch.';
        expect(extractToneFromDNA(dna)).toBe('modern');
      });

      it('should detect "dynamisch" keyword', () => {
        const dna = 'Unsere Marke ist dynamisch.';
        expect(extractToneFromDNA(dna)).toBe('modern');
      });
    });

    describe('No tone detection', () => {
      it('should return null when no keywords found', () => {
        const dna = 'Unsere Marke steht für Qualität und Vertrauen.';
        expect(extractToneFromDNA(dna)).toBeNull();
      });

      it('should return null for empty string', () => {
        expect(extractToneFromDNA('')).toBeNull();
      });
    });

    describe('Case insensitivity', () => {
      it('should detect uppercase keywords', () => {
        const dna = 'FORMELL und PROFESSIONELL';
        expect(extractToneFromDNA(dna)).toBe('formal');
      });

      it('should detect mixed case keywords', () => {
        const dna = 'Wir sind CaSuAl unterwegs';
        expect(extractToneFromDNA(dna)).toBe('casual');
      });
    });

    describe('Priority when multiple tones found', () => {
      it('should return first matching tone (formal priority)', () => {
        const dna =
          'Wir sind formell aber auch modern und freundlich casual.';
        expect(extractToneFromDNA(dna)).toBe('formal');
      });
    });
  });

  describe('buildAISequencePrompt()', () => {
    describe('Without DNA Synthese', () => {
      it('should not include EBENE 1 when no DNA provided', () => {
        const context: AISequenceContext = {};
        const prompt = buildAISequencePrompt(context);

        expect(prompt).not.toContain('EBENE 1: MARKEN-DNA');
      });

      it('should include EBENE 2 (Score Rules)', () => {
        const context: AISequenceContext = {};
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('EBENE 2: SCORE-REGELN');
      });

      it('should include conflict resolution', () => {
        const context: AISequenceContext = {};
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('KONFLIKT-AUFLÖSUNG');
      });
    });

    describe('With DNA Synthese', () => {
      it('should include EBENE 1 when DNA provided', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Unsere Marke ist formell und professionell.',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('EBENE 1: MARKEN-DNA');
        expect(prompt).toContain('Unsere Marke ist formell und professionell.');
      });

      it('should extract and display tone from DNA', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Wir kommunizieren casual und locker.',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('EXTRAHIERTE TONALITÄT: casual');
      });

      it('should show "nicht definiert" when no tone extracted', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Unsere Marke steht für Qualität.',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('EXTRAHIERTE TONALITÄT: nicht definiert');
      });

      it('should include DNA priority note', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Test DNA',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('HARTE REGELN');
        expect(prompt).toContain('BEHAUPTUNG → BEWEIS REGEL');
      });
    });

    describe('With tone override', () => {
      it('should use toneOverride instead of extracted tone', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Wir sind casual.', // würde casual extrahieren
          toneOverride: 'formal',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('EXTRAHIERTE TONALITÄT: formal');
        expect(prompt).toContain('MANUELLER OVERRIDE AKTIV');
      });

      it('should show override warning', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Test',
          toneOverride: 'modern',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('⚠️ MANUELLER OVERRIDE AKTIV: "modern"');
      });

      it('should not show override warning when no override', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Wir sind casual.',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).not.toContain('MANUELLER OVERRIDE AKTIV');
      });

      it('should handle null toneOverride', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Wir sind formell und seriös.',
          toneOverride: null,
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('EXTRAHIERTE TONALITÄT: formal');
        expect(prompt).not.toContain('OVERRIDE');
      });
    });

    describe('With Kernbotschaft', () => {
      it('should include EBENE 3 when Kernbotschaft provided', () => {
        const context: AISequenceContext = {
          kernbotschaft: {
            occasion: 'Produktlaunch',
            goal: 'Awareness steigern',
            keyMessage: 'Innovation trifft Design',
          },
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('EBENE 3: PROJEKT-KONTEXT');
      });

      it('should include occasion', () => {
        const context: AISequenceContext = {
          kernbotschaft: {
            occasion: 'Produktlaunch Q4',
            goal: 'Test',
            keyMessage: 'Test',
          },
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('ANLASS (Warum jetzt?)');
        expect(prompt).toContain('Produktlaunch Q4');
      });

      it('should include goal', () => {
        const context: AISequenceContext = {
          kernbotschaft: {
            occasion: 'Test',
            goal: 'Leadgenerierung',
            keyMessage: 'Test',
          },
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('ZIEL (Was soll erreicht werden?)');
        expect(prompt).toContain('Leadgenerierung');
      });

      it('should include keyMessage', () => {
        const context: AISequenceContext = {
          kernbotschaft: {
            occasion: 'Test',
            goal: 'Test',
            keyMessage: 'Nachhaltigkeit als Kernwert',
          },
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('KERNBOTSCHAFT FÜR DIESES PROJEKT');
        expect(prompt).toContain('Nachhaltigkeit als Kernwert');
      });

      it('should not include EBENE 3 when no Kernbotschaft', () => {
        const context: AISequenceContext = {};
        const prompt = buildAISequencePrompt(context);

        expect(prompt).not.toContain('EBENE 3: PROJEKT-KONTEXT');
      });
    });

    describe('With industry', () => {
      it('should pass industry to score optimization prompt', () => {
        const context: AISequenceContext = {
          industry: 'tech',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('INDUSTRIE-SPEZIFISCH (TECH)');
      });

      it('should handle healthcare industry', () => {
        const context: AISequenceContext = {
          industry: 'healthcare',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('INDUSTRIE-SPEZIFISCH (HEALTHCARE)');
      });
    });

    describe('Complete context', () => {
      it('should include all 3 levels when complete context provided', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Wir sind modern und innovativ.',
          kernbotschaft: {
            occasion: 'Series A Funding',
            goal: 'Investoren gewinnen',
            keyMessage: 'Tech für eine bessere Zukunft',
          },
          industry: 'tech',
        };
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('EBENE 1: MARKEN-DNA');
        expect(prompt).toContain('EBENE 2: SCORE-REGELN');
        expect(prompt).toContain('EBENE 3: PROJEKT-KONTEXT');
        expect(prompt).toContain('KONFLIKT-AUFLÖSUNG');
      });

      it('should maintain proper separator structure', () => {
        const context: AISequenceContext = {
          dnaSynthese: 'Test DNA',
        };
        const prompt = buildAISequencePrompt(context);

        const separatorCount = (prompt.match(/═{63}/g) || []).length;
        expect(separatorCount).toBeGreaterThan(0);
      });
    });

    describe('Conflict resolution section', () => {
      it('should always include conflict resolution rules', () => {
        const context: AISequenceContext = {};
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('KONFLIKT-AUFLÖSUNG');
        expect(prompt).toContain('EBENE 1 (Marken-DNA) überschreibt ALLES');
        expect(prompt).toContain('EBENE 2 (Score-Regeln)');
        expect(prompt).toContain('EBENE 3 (Projekt-Kontext)');
      });

      it('should mention score target in conflict resolution', () => {
        const context: AISequenceContext = {};
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('85-95%');
      });

      it('should include example in conflict resolution', () => {
        const context: AISequenceContext = {};
        const prompt = buildAISequencePrompt(context);

        expect(prompt).toContain('BEISPIEL-KONFLIKT:');
        expect(prompt).toContain('casual und modern');
      });
    });
  });
});
