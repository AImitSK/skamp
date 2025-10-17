// src/components/projects/kanban/card/__tests__/helpers.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { getPriorityColor, getPriorityIcon, getStatusColor } from '../helpers';
import { ProjectPriority } from '@/types/project';

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ExclamationTriangleIcon: ({ className }: any) => (
    <div data-testid="warning-icon" className={className} />
  ),
}));

describe('Card Helpers', () => {
  describe('getPriorityColor', () => {
    it('should return red classes for urgent priority', () => {
      const result = getPriorityColor('urgent' as ProjectPriority);
      expect(result).toBe('bg-red-100 text-red-800');
    });

    it('should return orange classes for high priority', () => {
      const result = getPriorityColor('high' as ProjectPriority);
      expect(result).toBe('bg-orange-100 text-orange-800');
    });

    it('should return yellow classes for medium priority', () => {
      const result = getPriorityColor('medium' as ProjectPriority);
      expect(result).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return green classes for low priority', () => {
      const result = getPriorityColor('low' as ProjectPriority);
      expect(result).toBe('bg-green-100 text-green-800');
    });

    it('should return gray classes for undefined priority', () => {
      const result = getPriorityColor(undefined);
      expect(result).toBe('bg-gray-100 text-gray-800');
    });

    it('should return gray classes for unknown priority', () => {
      const result = getPriorityColor('unknown' as any);
      expect(result).toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('getPriorityIcon', () => {
    it('should return warning icon for urgent priority', () => {
      const icon = getPriorityIcon('urgent' as ProjectPriority);
      const { container } = render(<>{icon}</>);

      expect(container.querySelector('[data-testid="warning-icon"]')).toBeInTheDocument();
    });

    it('should return warning icon for high priority', () => {
      const icon = getPriorityIcon('high' as ProjectPriority);
      const { container } = render(<>{icon}</>);

      expect(container.querySelector('[data-testid="warning-icon"]')).toBeInTheDocument();
    });

    it('should return null for medium priority', () => {
      const icon = getPriorityIcon('medium' as ProjectPriority);
      expect(icon).toBeNull();
    });

    it('should return null for low priority', () => {
      const icon = getPriorityIcon('low' as ProjectPriority);
      expect(icon).toBeNull();
    });

    it('should return null for undefined priority', () => {
      const icon = getPriorityIcon(undefined);
      expect(icon).toBeNull();
    });

    it('should have correct className for icon', () => {
      const icon = getPriorityIcon('urgent' as ProjectPriority);
      const { container } = render(<>{icon}</>);

      const iconElement = container.querySelector('[data-testid="warning-icon"]');
      expect(iconElement).toHaveClass('h-3', 'w-3');
    });
  });

  describe('getStatusColor', () => {
    it('should return green classes for active status', () => {
      const result = getStatusColor('active');
      expect(result).toBe('bg-green-100 text-green-800');
    });

    it('should return yellow classes for on_hold status', () => {
      const result = getStatusColor('on_hold');
      expect(result).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return gray classes for completed status', () => {
      const result = getStatusColor('completed');
      expect(result).toBe('bg-gray-100 text-gray-800');
    });

    it('should return red classes for cancelled status', () => {
      const result = getStatusColor('cancelled');
      expect(result).toBe('bg-red-100 text-red-800');
    });

    it('should return blue classes for unknown status', () => {
      const result = getStatusColor('unknown');
      expect(result).toBe('bg-blue-100 text-blue-800');
    });

    it('should return blue classes for empty string', () => {
      const result = getStatusColor('');
      expect(result).toBe('bg-blue-100 text-blue-800');
    });
  });

  describe('Comprehensive Status Coverage', () => {
    const statusTests = [
      { status: 'active', expected: 'bg-green-100 text-green-800' },
      { status: 'on_hold', expected: 'bg-yellow-100 text-yellow-800' },
      { status: 'completed', expected: 'bg-gray-100 text-gray-800' },
      { status: 'cancelled', expected: 'bg-red-100 text-red-800' },
      { status: 'draft', expected: 'bg-blue-100 text-blue-800' },
      { status: 'archived', expected: 'bg-blue-100 text-blue-800' },
    ];

    statusTests.forEach(({ status, expected }) => {
      it(`should return correct classes for status: ${status}`, () => {
        const result = getStatusColor(status);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Comprehensive Priority Coverage', () => {
    const priorityTests = [
      { priority: 'urgent', expected: 'bg-red-100 text-red-800' },
      { priority: 'high', expected: 'bg-orange-100 text-orange-800' },
      { priority: 'medium', expected: 'bg-yellow-100 text-yellow-800' },
      { priority: 'low', expected: 'bg-green-100 text-green-800' },
    ];

    priorityTests.forEach(({ priority, expected }) => {
      it(`should return correct classes for priority: ${priority}`, () => {
        const result = getPriorityColor(priority as ProjectPriority);
        expect(result).toBe(expected);
      });
    });
  });
});
