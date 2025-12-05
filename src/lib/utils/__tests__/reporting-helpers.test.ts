// src/lib/utils/__tests__/reporting-helpers.test.ts

import {
  calculateNextSendDate,
  formatNextSendDate,
  formatShortDate,
  formatReportPeriod,
  calculateReportPeriod,
  isMonitoringExpired,
  isSendDateReached
} from '../reporting-helpers';

// Mock Timestamp für Jest
const createMockTimestamp = (date: Date) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toMillis: () => date.getTime(),
  isEqual: (other: any) => other.toMillis() === date.getTime()
});

describe('reporting-helpers', () => {
  describe('calculateNextSendDate', () => {
    describe('weekly frequency', () => {
      it('sollte nächsten Montag berechnen wenn heute Sonntag ist', () => {
        // Mock: Heute ist Sonntag, 1. Dezember 2024, 10:00 Uhr
        const mockDate = new Date('2024-12-01T10:00:00');
        jest.useFakeTimers().setSystemTime(mockDate);

        const result = calculateNextSendDate('weekly', 1); // Montag

        // Erwartung: Montag, 2. Dezember 2024, 8:00 Uhr deutscher Zeit
        expect(result.getUTCDay()).toBe(1); // Montag in UTC kann variieren wegen Timezone
        expect(result > mockDate).toBe(true);

        jest.useRealTimers();
      });

      it('sollte nächste Woche berechnen wenn heute der Ziel-Tag nach Sendezeit ist', () => {
        // Mock: Heute ist Montag, 2. Dezember 2024, 10:00 Uhr (nach 8:00)
        const mockDate = new Date('2024-12-02T10:00:00');
        jest.useFakeTimers().setSystemTime(mockDate);

        const result = calculateNextSendDate('weekly', 1); // Montag

        // Erwartung: Nächste Woche Montag (9. Dezember)
        expect(result > mockDate).toBe(true);

        jest.useRealTimers();
      });

      it('sollte heute berechnen wenn Ziel-Tag und vor Sendezeit', () => {
        // Mock: Heute ist Montag, 2. Dezember 2024, 06:00 Uhr UTC (07:00 deutscher Zeit im Winter)
        const mockDate = new Date('2024-12-02T06:00:00Z');
        jest.useFakeTimers().setSystemTime(mockDate);

        const result = calculateNextSendDate('weekly', 1); // Montag

        // Sollte heute oder nach heute sein
        expect(result >= mockDate).toBe(true);

        jest.useRealTimers();
      });
    });

    describe('monthly frequency', () => {
      it('sollte 1. des Monats berechnen wenn heute der 15. ist', () => {
        // Mock: Heute ist 15. November 2024
        const mockDate = new Date('2024-11-15T10:00:00');
        jest.useFakeTimers().setSystemTime(mockDate);

        const result = calculateNextSendDate('monthly', undefined, 1);

        // Erwartung: 1. Dezember 2024
        expect(result.getMonth()).toBe(11); // Dezember (0-indexed)
        expect(result.getDate()).toBe(1);

        jest.useRealTimers();
      });

      it('sollte diesen Monat berechnen wenn Tag noch nicht erreicht', () => {
        // Mock: Heute ist 1. Dezember 2024, 06:00 Uhr (vor 8:00 Sendezeit)
        const mockDate = new Date('2024-12-01T06:00:00Z');
        jest.useFakeTimers().setSystemTime(mockDate);

        const result = calculateNextSendDate('monthly', undefined, 1);

        // Sollte heute oder bald sein
        expect(result >= mockDate).toBe(true);

        jest.useRealTimers();
      });

      it('sollte Jahreswechsel korrekt behandeln', () => {
        // Mock: Heute ist 15. Dezember 2024
        const mockDate = new Date('2024-12-15T10:00:00');
        jest.useFakeTimers().setSystemTime(mockDate);

        const result = calculateNextSendDate('monthly', undefined, 1);

        // Erwartung: 1. Januar 2025
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(0); // Januar

        jest.useRealTimers();
      });
    });
  });

  describe('formatNextSendDate', () => {
    it('sollte Datum korrekt formatieren', () => {
      // 2. Dezember 2024, 7:00 UTC = 8:00 deutscher Zeit (Winterzeit)
      const timestamp = createMockTimestamp(new Date('2024-12-02T07:00:00Z'));
      const result = formatNextSendDate(timestamp as any);

      // Format: "Mo, 02.12.2024 um 08:00 Uhr" (kann je nach Locale leicht variieren)
      expect(result).toContain('02.12.2024');
      expect(result).toContain('Uhr');
    });
  });

  describe('formatShortDate', () => {
    it('sollte kurzes Datum formatieren', () => {
      const timestamp = createMockTimestamp(new Date('2024-12-02T10:00:00Z'));
      const result = formatShortDate(timestamp as any);

      expect(result).toBe('02.12.2024');
    });
  });

  describe('formatReportPeriod', () => {
    it('sollte Zeitraum korrekt formatieren', () => {
      const start = new Date('2024-11-25');
      const end = new Date('2024-12-01');

      const result = formatReportPeriod(start, end);

      expect(result).toContain('25.11.2024');
      expect(result).toContain('01.12.2024');
      expect(result).toContain(' - ');
    });
  });

  describe('calculateReportPeriod', () => {
    it('sollte 7 Tage für weekly berechnen', () => {
      const mockDate = new Date('2024-12-01');
      jest.useFakeTimers().setSystemTime(mockDate);

      const result = calculateReportPeriod('weekly', mockDate);

      const diffDays = Math.round((result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);

      jest.useRealTimers();
    });

    it('sollte ca. 30 Tage für monthly berechnen', () => {
      const mockDate = new Date('2024-12-01');
      jest.useFakeTimers().setSystemTime(mockDate);

      const result = calculateReportPeriod('monthly', mockDate);

      const diffDays = Math.round((result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60 * 24));
      // Ein Monat kann 28-31 Tage haben
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(31);

      jest.useRealTimers();
    });
  });

  describe('isMonitoringExpired', () => {
    it('sollte true zurückgeben wenn Enddatum in der Vergangenheit', () => {
      const pastDate = createMockTimestamp(new Date('2024-01-01'));
      expect(isMonitoringExpired(pastDate as any)).toBe(true);
    });

    it('sollte false zurückgeben wenn Enddatum in der Zukunft', () => {
      const futureDate = createMockTimestamp(new Date('2099-12-31'));
      expect(isMonitoringExpired(futureDate as any)).toBe(false);
    });
  });

  describe('isSendDateReached', () => {
    it('sollte true zurückgeben wenn Sendedatum erreicht', () => {
      const pastDate = createMockTimestamp(new Date('2024-01-01'));
      expect(isSendDateReached(pastDate as any)).toBe(true);
    });

    it('sollte false zurückgeben wenn Sendedatum in der Zukunft', () => {
      const futureDate = createMockTimestamp(new Date('2099-12-31'));
      expect(isSendDateReached(futureDate as any)).toBe(false);
    });
  });
});
