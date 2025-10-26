// src/components/projects/distribution/helpers/__tests__/list-helpers.test.ts

import {
  getCategoryColor,
  formatDate,
  categoryOptions,
  projectListTypeOptions,
  masterListTypeOptions
} from '../list-helpers';

describe('list-helpers', () => {
  describe('getCategoryColor', () => {
    it('should return purple for press category', () => {
      expect(getCategoryColor('press')).toBe('purple');
    });

    it('should return blue for customers category', () => {
      expect(getCategoryColor('customers')).toBe('blue');
    });

    it('should return green for partners category', () => {
      expect(getCategoryColor('partners')).toBe('green');
    });

    it('should return amber for leads category', () => {
      expect(getCategoryColor('leads')).toBe('amber');
    });

    it('should return zinc for custom or unknown category', () => {
      expect(getCategoryColor('custom')).toBe('zinc');
      expect(getCategoryColor('unknown')).toBe('zinc');
    });

    it('should return zinc for undefined category', () => {
      expect(getCategoryColor(undefined)).toBe('zinc');
      expect(getCategoryColor()).toBe('zinc');
    });
  });

  describe('formatDate', () => {
    it('should format Firestore Timestamp correctly', () => {
      const mockTimestamp = {
        toDate: () => new Date('2024-10-26T10:00:00Z')
      };
      const result = formatDate(mockTimestamp);
      // Format: "26. Okt. 2024" in deutscher Locale
      expect(result).toMatch(/26.*Okt.*2024/);
    });

    it('should return "Unbekannt" for null timestamp', () => {
      expect(formatDate(null)).toBe('Unbekannt');
    });

    it('should return "Unbekannt" for undefined timestamp', () => {
      expect(formatDate(undefined)).toBe('Unbekannt');
    });

    it('should return "Unbekannt" for timestamp without toDate method', () => {
      expect(formatDate({})).toBe('Unbekannt');
      expect(formatDate({ someOtherProp: 'value' })).toBe('Unbekannt');
    });
  });

  describe('categoryOptions', () => {
    it('should contain 5 category options', () => {
      expect(categoryOptions).toHaveLength(5);
    });

    it('should have correct structure for each option', () => {
      categoryOptions.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
      });
    });

    it('should contain all expected categories', () => {
      const values = categoryOptions.map(opt => opt.value);
      expect(values).toContain('press');
      expect(values).toContain('customers');
      expect(values).toContain('partners');
      expect(values).toContain('leads');
      expect(values).toContain('custom');
    });
  });

  describe('projectListTypeOptions', () => {
    it('should contain 3 project list type options', () => {
      expect(projectListTypeOptions).toHaveLength(3);
    });

    it('should contain linked, custom, and combined types', () => {
      const values = projectListTypeOptions.map(opt => opt.value);
      expect(values).toContain('linked');
      expect(values).toContain('custom');
      expect(values).toContain('combined');
    });
  });

  describe('masterListTypeOptions', () => {
    it('should contain 2 master list type options', () => {
      expect(masterListTypeOptions).toHaveLength(2);
    });

    it('should contain dynamic and static types', () => {
      const values = masterListTypeOptions.map(opt => opt.value);
      expect(values).toContain('dynamic');
      expect(values).toContain('static');
    });
  });
});
