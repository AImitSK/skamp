// src/lib/ai/prompts/__tests__/score-optimization.test.ts
import {
  getScoreOptimizationPrompt,
  SCORE_PROMPTS,
} from '../score-optimization';

describe('Score Optimization Prompts', () => {
  describe('SCORE_PROMPTS structure', () => {
    it('should have headline rules', () => {
      expect(SCORE_PROMPTS.headline.rules).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.headline.rules.length).toBeGreaterThan(0);
    });

    it('should have headline examples', () => {
      expect(SCORE_PROMPTS.headline.examples.good).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.headline.examples.bad).toBeInstanceOf(Array);
    });

    it('should have lead rules', () => {
      expect(SCORE_PROMPTS.lead.rules).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.lead.rules.length).toBeGreaterThan(0);
    });

    it('should have structure rules', () => {
      expect(SCORE_PROMPTS.structure.rules).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.structure.rules.length).toBeGreaterThan(0);
    });

    it('should have quote rules', () => {
      expect(SCORE_PROMPTS.quote.rules).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.quote.examples.good).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.quote.examples.bad).toBeInstanceOf(Array);
    });

    it('should have cta rules', () => {
      expect(SCORE_PROMPTS.cta.rules).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.cta.examples.good).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.cta.examples.bad).toBeInstanceOf(Array);
    });

    it('should have industry specific rules', () => {
      expect(SCORE_PROMPTS.industry.tech).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.industry.healthcare).toBeInstanceOf(Array);
      expect(SCORE_PROMPTS.industry.finance).toBeInstanceOf(Array);
    });
  });

  describe('getScoreOptimizationPrompt()', () => {
    describe('Without industry', () => {
      it('should generate prompt without industry section', () => {
        const prompt = getScoreOptimizationPrompt();

        expect(prompt).toContain('EBENE 2: SCORE-REGELN');
        expect(prompt).toContain('HEADLINE');
        expect(prompt).toContain('LEAD');
        expect(prompt).toContain('STRUKTUR');
        expect(prompt).toContain('ZITAT');
        expect(prompt).toContain('CTA & HASHTAGS');
        expect(prompt).not.toContain('INDUSTRIE-SPEZIFISCH');
      });

      it('should include all headline rules', () => {
        const prompt = getScoreOptimizationPrompt();

        SCORE_PROMPTS.headline.rules.forEach((rule) => {
          expect(prompt).toContain(rule);
        });
      });

      it('should include all lead rules', () => {
        const prompt = getScoreOptimizationPrompt();

        SCORE_PROMPTS.lead.rules.forEach((rule) => {
          expect(prompt).toContain(rule);
        });
      });

      it('should include all structure rules', () => {
        const prompt = getScoreOptimizationPrompt();

        SCORE_PROMPTS.structure.rules.forEach((rule) => {
          expect(prompt).toContain(rule);
        });
      });

      it('should include all quote rules', () => {
        const prompt = getScoreOptimizationPrompt();

        SCORE_PROMPTS.quote.rules.forEach((rule) => {
          expect(prompt).toContain(rule);
        });
      });

      it('should include all cta rules', () => {
        const prompt = getScoreOptimizationPrompt();

        SCORE_PROMPTS.cta.rules.forEach((rule) => {
          expect(prompt).toContain(rule);
        });
      });

      it('should mention score target', () => {
        const prompt = getScoreOptimizationPrompt();

        expect(prompt).toContain('85-95%');
      });
    });

    describe('With tech industry', () => {
      it('should include tech industry section', () => {
        const prompt = getScoreOptimizationPrompt('tech');

        expect(prompt).toContain('INDUSTRIE-SPEZIFISCH (TECH)');
      });

      it('should include all tech industry rules', () => {
        const prompt = getScoreOptimizationPrompt('tech');

        SCORE_PROMPTS.industry.tech.forEach((rule) => {
          expect(prompt).toContain(rule);
        });
      });

      it('should not include healthcare rules', () => {
        const prompt = getScoreOptimizationPrompt('tech');

        SCORE_PROMPTS.industry.healthcare.forEach((rule) => {
          expect(prompt).not.toContain(rule);
        });
      });
    });

    describe('With healthcare industry', () => {
      it('should include healthcare industry section', () => {
        const prompt = getScoreOptimizationPrompt('healthcare');

        expect(prompt).toContain('INDUSTRIE-SPEZIFISCH (HEALTHCARE)');
      });

      it('should include all healthcare industry rules', () => {
        const prompt = getScoreOptimizationPrompt('healthcare');

        SCORE_PROMPTS.industry.healthcare.forEach((rule) => {
          expect(prompt).toContain(rule);
        });
      });

      it('should not include finance rules', () => {
        const prompt = getScoreOptimizationPrompt('healthcare');

        SCORE_PROMPTS.industry.finance.forEach((rule) => {
          expect(prompt).not.toContain(rule);
        });
      });
    });

    describe('With finance industry', () => {
      it('should include finance industry section', () => {
        const prompt = getScoreOptimizationPrompt('finance');

        expect(prompt).toContain('INDUSTRIE-SPEZIFISCH (FINANCE)');
      });

      it('should include all finance industry rules', () => {
        const prompt = getScoreOptimizationPrompt('finance');

        SCORE_PROMPTS.industry.finance.forEach((rule) => {
          expect(prompt).toContain(rule);
        });
      });

      it('should not include tech rules', () => {
        const prompt = getScoreOptimizationPrompt('finance');

        SCORE_PROMPTS.industry.tech.forEach((rule) => {
          expect(prompt).not.toContain(rule);
        });
      });
    });

    describe('With unknown industry', () => {
      it('should not include industry section for unknown industry', () => {
        const prompt = getScoreOptimizationPrompt('unknown');

        expect(prompt).not.toContain('INDUSTRIE-SPEZIFISCH');
      });

      it('should still include all base rules', () => {
        const prompt = getScoreOptimizationPrompt('unknown');

        expect(prompt).toContain('HEADLINE');
        expect(prompt).toContain('LEAD');
        expect(prompt).toContain('STRUKTUR');
      });
    });

    describe('Conflict resolution note', () => {
      it('should include important note about DNA priority', () => {
        const prompt = getScoreOptimizationPrompt();

        expect(prompt).toContain('WICHTIG:');
        expect(prompt).toContain('Marken-DNA');
        expect(prompt).toContain('Ebene 1');
      });
    });
  });
});
