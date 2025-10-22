/**
 * Tests für progress-helpers.ts
 *
 * Testet getProgressColor() und getProgressStatus() Funktionen
 * mit allen Grenzwerten und Edge Cases
 */

import { getProgressColor, getProgressStatus, PROGRESS_COLORS } from '../progress-helpers';

describe('progress-helpers', () => {
  // ========================================
  // PROGRESS_COLORS KONSTANTE
  // ========================================

  describe('PROGRESS_COLORS', () => {
    it('sollte alle erwarteten Farben enthalten', () => {
      expect(PROGRESS_COLORS.high).toBe('bg-green-600');
      expect(PROGRESS_COLORS.medium).toBe('bg-blue-600');
      expect(PROGRESS_COLORS.low).toBe('bg-amber-500');
      expect(PROGRESS_COLORS.critical).toBe('bg-red-600');
    });

    it('sollte immutable sein (as const)', () => {
      // TypeScript sollte das enforced haben, aber wir testen trotzdem
      expect(Object.isFrozen(PROGRESS_COLORS)).toBe(false); // as const macht nicht frozen, aber read-only
      expect(typeof PROGRESS_COLORS.high).toBe('string');
    });
  });

  // ========================================
  // getProgressColor() TESTS
  // ========================================

  describe('getProgressColor()', () => {
    it('sollte bg-green-600 für 90% oder mehr zurückgeben', () => {
      expect(getProgressColor(90)).toBe('bg-green-600');
      expect(getProgressColor(95)).toBe('bg-green-600');
      expect(getProgressColor(100)).toBe('bg-green-600');
    });

    it('sollte bg-blue-600 für 70-89% zurückgeben', () => {
      expect(getProgressColor(70)).toBe('bg-blue-600');
      expect(getProgressColor(75)).toBe('bg-blue-600');
      expect(getProgressColor(80)).toBe('bg-blue-600');
      expect(getProgressColor(89)).toBe('bg-blue-600');
    });

    it('sollte bg-amber-500 für 50-69% zurückgeben', () => {
      expect(getProgressColor(50)).toBe('bg-amber-500');
      expect(getProgressColor(55)).toBe('bg-amber-500');
      expect(getProgressColor(60)).toBe('bg-amber-500');
      expect(getProgressColor(69)).toBe('bg-amber-500');
    });

    it('sollte bg-red-600 für unter 50% zurückgeben', () => {
      expect(getProgressColor(0)).toBe('bg-red-600');
      expect(getProgressColor(25)).toBe('bg-red-600');
      expect(getProgressColor(49)).toBe('bg-red-600');
    });

    it('sollte Grenzwerte korrekt handhaben', () => {
      expect(getProgressColor(90)).toBe('bg-green-600');  // Exakt 90%
      expect(getProgressColor(89.9)).toBe('bg-blue-600'); // Knapp unter 90%
      expect(getProgressColor(70)).toBe('bg-blue-600');   // Exakt 70%
      expect(getProgressColor(69.9)).toBe('bg-amber-500'); // Knapp unter 70%
      expect(getProgressColor(50)).toBe('bg-amber-500');  // Exakt 50%
      expect(getProgressColor(49.9)).toBe('bg-red-600');  // Knapp unter 50%
    });

    it('sollte mit extremen Werten umgehen können', () => {
      expect(getProgressColor(0)).toBe('bg-red-600');
      expect(getProgressColor(100)).toBe('bg-green-600');
      expect(getProgressColor(-10)).toBe('bg-red-600');   // Negativ
      expect(getProgressColor(150)).toBe('bg-green-600'); // Über 100%
    });

    it('sollte mit Dezimalzahlen korrekt umgehen', () => {
      expect(getProgressColor(89.5)).toBe('bg-blue-600');
      expect(getProgressColor(90.1)).toBe('bg-green-600');
      expect(getProgressColor(49.99)).toBe('bg-red-600');
    });
  });

  // ========================================
  // getProgressStatus() TESTS
  // ========================================

  describe('getProgressStatus()', () => {
    it('sollte "Sehr gut" für 90% oder mehr zurückgeben', () => {
      expect(getProgressStatus(90)).toBe('Sehr gut');
      expect(getProgressStatus(95)).toBe('Sehr gut');
      expect(getProgressStatus(100)).toBe('Sehr gut');
    });

    it('sollte "Gut" für 70-89% zurückgeben', () => {
      expect(getProgressStatus(70)).toBe('Gut');
      expect(getProgressStatus(75)).toBe('Gut');
      expect(getProgressStatus(80)).toBe('Gut');
      expect(getProgressStatus(89)).toBe('Gut');
    });

    it('sollte "Ausreichend" für 50-69% zurückgeben', () => {
      expect(getProgressStatus(50)).toBe('Ausreichend');
      expect(getProgressStatus(55)).toBe('Ausreichend');
      expect(getProgressStatus(60)).toBe('Ausreichend');
      expect(getProgressStatus(69)).toBe('Ausreichend');
    });

    it('sollte "Kritisch" für unter 50% zurückgeben', () => {
      expect(getProgressStatus(0)).toBe('Kritisch');
      expect(getProgressStatus(25)).toBe('Kritisch');
      expect(getProgressStatus(49)).toBe('Kritisch');
    });

    it('sollte Grenzwerte korrekt handhaben', () => {
      expect(getProgressStatus(90)).toBe('Sehr gut');
      expect(getProgressStatus(89.9)).toBe('Gut');
      expect(getProgressStatus(70)).toBe('Gut');
      expect(getProgressStatus(69.9)).toBe('Ausreichend');
      expect(getProgressStatus(50)).toBe('Ausreichend');
      expect(getProgressStatus(49.9)).toBe('Kritisch');
    });

    it('sollte mit extremen Werten umgehen können', () => {
      expect(getProgressStatus(0)).toBe('Kritisch');
      expect(getProgressStatus(100)).toBe('Sehr gut');
      expect(getProgressStatus(-10)).toBe('Kritisch');
      expect(getProgressStatus(150)).toBe('Sehr gut');
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Integration: getProgressColor + getProgressStatus', () => {
    it('sollte konsistente Farbe und Status für gleiche Werte zurückgeben', () => {
      const testCases = [
        { percent: 95, color: 'bg-green-600', status: 'Sehr gut' },
        { percent: 75, color: 'bg-blue-600', status: 'Gut' },
        { percent: 55, color: 'bg-amber-500', status: 'Ausreichend' },
        { percent: 25, color: 'bg-red-600', status: 'Kritisch' },
      ];

      testCases.forEach(({ percent, color, status }) => {
        expect(getProgressColor(percent)).toBe(color);
        expect(getProgressStatus(percent)).toBe(status);
      });
    });

    it('sollte für alle Stages im Dashboard konsistente Werte liefern', () => {
      // Simuliere Pipeline-Fortschritt: 0%, 20%, 40%, 60%, 80%, 100%
      const pipelineStages = [0, 20, 40, 60, 80, 100];

      pipelineStages.forEach(percent => {
        const color = getProgressColor(percent);
        const status = getProgressStatus(percent);

        expect(color).toMatch(/^bg-(green|blue|amber|red)-\d+$/);
        expect(['Sehr gut', 'Gut', 'Ausreichend', 'Kritisch']).toContain(status);
      });
    });
  });
});
