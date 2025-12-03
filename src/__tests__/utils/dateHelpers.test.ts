// src/__tests__/utils/dateHelpers.test.ts
import { formatDate, formatDateShort, formatDateRelative } from '@/utils/dateHelpers';

// Mock Firebase Timestamp
const mockTimestamp = (date: Date) => ({
  toDate: () => date
});

describe('dateHelpers', () => {
  describe('formatDate', () => {
    it('formats valid timestamp correctly', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const timestamp = mockTimestamp(date);
      
      const result = formatDate(timestamp);
      expect(result).toMatch(/25\. Dezember 2023/);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('returns dash for invalid timestamp', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate({})).toBe('—');
    });
  });

  describe('formatDateShort', () => {
    it('formats valid timestamp in short format', () => {
      const date = new Date('2023-12-25T15:45:00Z');
      const timestamp = mockTimestamp(date);

      const result = formatDateShort(timestamp);
      // formatDateShort gibt numerisches Format zurück: DD.MM.YY, HH:MM
      expect(result).toMatch(/25\.12/);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('handles edge cases', () => {
      expect(formatDateShort(null)).toBe('—');
      expect(formatDateShort(undefined)).toBe('—');
    });
  });

  describe('formatDateRelative', () => {
    beforeEach(() => {
      // Mock current date to be Dec 27, 2023 12:00 PM (Mittag)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-12-27T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns "Heute" for same day', () => {
      const today = new Date('2023-12-27T08:00:00Z');
      const timestamp = mockTimestamp(today);

      expect(formatDateRelative(timestamp)).toBe('Heute');
    });

    it('returns "Gestern" for yesterday', () => {
      // 26 Stunden zurück = eindeutig gestern
      const yesterday = new Date('2023-12-26T10:00:00Z');
      const timestamp = mockTimestamp(yesterday);

      expect(formatDateRelative(timestamp)).toBe('Gestern');
    });

    it('returns relative days for recent dates', () => {
      const threeDaysAgo = new Date('2023-12-24T10:00:00Z');
      const timestamp = mockTimestamp(threeDaysAgo);

      expect(formatDateRelative(timestamp)).toBe('Vor 3 Tagen');
    });

    it('returns short format for older dates', () => {
      const twoWeeksAgo = new Date('2023-12-10T10:00:00Z');
      const timestamp = mockTimestamp(twoWeeksAgo);

      const result = formatDateRelative(timestamp);
      // formatDateShort gibt numerisches Format zurück
      expect(result).toMatch(/10\.12/);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('handles invalid timestamps', () => {
      expect(formatDateRelative(null)).toBe('—');
      expect(formatDateRelative(undefined)).toBe('—');
    });
  });
});