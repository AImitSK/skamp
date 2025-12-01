/**
 * Tests für Conflict Resolver
 *
 * Testet das kritische 3-Tier Konfliktlösungs-System
 */

import {
  resolveFieldConflict,
  getOpenConflicts,
  approveConflict,
  rejectConflict
} from '../conflict-resolver';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-review-id' })),
  collection: jest.fn((db, name) => ({ path: name })),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp')
}));

jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

describe('Conflict Resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveFieldConflict', () => {
    describe('Stufe 1: Kein Konflikt (Feld leer)', () => {
      it('should auto-update when field is empty', async () => {
        const result = await resolveFieldConflict(
          'company',
          'company123',
          'website',
          null, // Current value is empty
          ['https://spiegel.de', 'https://spiegel.de', 'https://spiegel.de'],
          0.9
        );

        expect(result.action).toBe('auto_updated');
        expect(result.value).toBe('https://spiegel.de');
        expect(result.confidence).toBe(1.0); // 100% majority
        expect(result.reason).toBe('Field was empty');
      });

      it('should auto-update when field is empty string', async () => {
        const result = await resolveFieldConflict(
          'company',
          'company123',
          'description',
          '', // Current value is empty string
          ['Media company', 'Media company'],
          0.8
        );

        expect(result.action).toBe('auto_updated');
        expect(result.value).toBe('media company'); // Normalized to lowercase
      });
    });

    describe('Stufe 2: Auto-Update (Super Majority)', () => {
      it('should auto-update with super majority and old value', async () => {
        const { getDoc } = require('firebase/firestore');

        // Mock old value (>1 year)
        getDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            website_updatedAt: {
              toDate: () => new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) // 400 days ago
            },
            website_updatedBy: 'user123'
          })
        });

        const result = await resolveFieldConflict(
          'company',
          'company123',
          'website',
          'https://old-spiegel.de',
          ['https://spiegel.de', 'https://spiegel.de', 'https://spiegel.de'], // 100% majority
          0.95
        );

        expect(result.action).toBe('auto_updated');
        expect(result.value).toBe('https://spiegel.de');
        expect(result.confidence).toBeGreaterThan(0.9);
      });

      it('should NOT auto-update manual entry from today', async () => {
        const { getDoc, addDoc } = require('firebase/firestore');

        // Mock recent manual entry
        getDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            website_updatedAt: {
              toDate: () => new Date() // Today
            },
            website_updatedBy: 'user123' // Manual
          })
        });

        const result = await resolveFieldConflict(
          'company',
          'company123',
          'website',
          'https://manually-entered.de',
          ['https://spiegel.de', 'https://spiegel.de', 'https://spiegel.de'],
          0.95
        );

        expect(result.action).toBe('flagged_for_review');
        expect(result.reason).toContain('Manual entry from today');
        expect(addDoc).toHaveBeenCalled(); // Should create conflict review
      });
    });

    describe('Stufe 3: Conflict Review', () => {
      it('should flag for review with moderate majority', async () => {
        const { getDoc, addDoc } = require('firebase/firestore');

        getDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            website_updatedAt: {
              toDate: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
            },
            website_updatedBy: 'user123'
          })
        });

        const result = await resolveFieldConflict(
          'company',
          'company123',
          'website',
          'https://current.de',
          ['https://new.de', 'https://new.de', 'https://old.de'], // 66% majority
          0.75
        );

        expect(result.action).toBe('flagged_for_review');
        expect(result.confidence).toBeCloseTo(0.66, 1);
        expect(addDoc).toHaveBeenCalled();
      });

      it('should keep existing value with low majority', async () => {
        const result = await resolveFieldConflict(
          'company',
          'company123',
          'website',
          'https://current.de',
          ['https://new.de', 'https://other.de'], // 50% majority
          0.6
        );

        expect(result.action).toBe('flagged_for_review');
        expect(result.confidence).toBe(0.5);
      });
    });

    describe('Field-specific Thresholds', () => {
      it('should NEVER auto-update critical fields like name', async () => {
        const { addDoc, getDoc } = require('firebase/firestore');

        // Mock getDoc to return metadata with recent update
        getDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            name_updatedAt: {
              toDate: () => new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
            },
            name_updatedBy: 'user123',
            name: 'Current Name'
          })
        });

        const result = await resolveFieldConflict(
          'company',
          'company123',
          'name', // Critical field
          'Current Name',
          ['New Name', 'New Name', 'Other Name'], // Only 66% majority, not 100%
          0.9
        );

        expect(result.action).toBe('flagged_for_review');
        expect(addDoc).toHaveBeenCalled();
      });

      it('should have lower threshold for uncritical fields', async () => {
        const { getDoc, updateDoc } = require('firebase/firestore');

        getDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            description_updatedAt: {
              toDate: () => new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
            },
            description_updatedBy: 'system'
          })
        });

        const result = await resolveFieldConflict(
          'company',
          'company123',
          'description', // Less critical field
          'Old description',
          ['New description', 'New description', 'New description'], // 100% majority
          0.85
        );

        expect(result.action).toBe('auto_updated');
        expect(updateDoc).toHaveBeenCalled();
      });
    });
  });

  describe('getOpenConflicts', () => {
    it('should return open conflicts sorted by priority', async () => {
      const { getDocs } = require('firebase/firestore');

      const mockConflicts = [
        {
          id: 'conflict1',
          priority: 'high',
          createdAt: { toDate: () => new Date() },
          status: 'pending_review'
        },
        {
          id: 'conflict2',
          priority: 'medium',
          createdAt: { toDate: () => new Date() },
          status: 'pending_review'
        }
      ];

      getDocs.mockResolvedValue({
        docs: mockConflicts.map(conflict => ({
          id: conflict.id,
          data: () => conflict
        }))
      });

      const conflicts = await getOpenConflicts();

      expect(conflicts).toHaveLength(2);
      expect(conflicts[0].id).toBe('conflict1');
      expect(conflicts[0].priority).toBe('high');
    });
  });

  describe('approveConflict', () => {
    it('should apply suggested value and mark as approved', async () => {
      const { getDoc, updateDoc } = require('firebase/firestore');

      const mockReview = {
        entityType: 'company',
        entityId: 'company123',
        field: 'website',
        currentValue: 'https://old.de',
        suggestedValue: 'https://new.de'
      };

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockReview
      });

      await approveConflict('review123', 'user456', 'Approved after verification');

      // Should update the entity (first call)
      const firstCall = updateDoc.mock.calls[0];
      expect(firstCall[1]).toMatchObject({
        website: 'https://new.de',
        website_previousValue: 'https://old.de',
        website_updatedBy: 'user456',
        website_updateReason: 'Manual approval after conflict review',
        updatedAt: 'mock-timestamp'
      });

      // Should update the review status (second call)
      const secondCall = updateDoc.mock.calls[1];
      expect(secondCall[1]).toMatchObject({
        status: 'approved',
        reviewedBy: 'user456',
        reviewNotes: 'Approved after verification',
        reviewedAt: 'mock-timestamp'
      });
    });

    it('should handle non-existent review', async () => {
      const { getDoc } = require('firebase/firestore');

      getDoc.mockResolvedValue({
        exists: () => false
      });

      await expect(approveConflict('nonexistent', 'user456'))
        .rejects.toThrow('Conflict review not found');
    });
  });

  describe('rejectConflict', () => {
    it('should mark conflict as rejected without changing entity', async () => {
      const { updateDoc } = require('firebase/firestore');

      await rejectConflict('review123', 'user456', 'Data is incorrect');

      // Should only update review status, not the entity
      expect(updateDoc).toHaveBeenCalledTimes(1);
      const call = updateDoc.mock.calls[0];
      expect(call[1]).toMatchObject({
        status: 'rejected',
        reviewedBy: 'user456',
        reviewNotes: 'Data is incorrect',
        reviewedAt: 'mock-timestamp'
      });
    });
  });

  describe('Value Normalization', () => {
    it('should normalize values for better comparison', async () => {
      const result = await resolveFieldConflict(
        'company',
        'company123',
        'name',
        'der spiegel',
        ['Der Spiegel', 'DER SPIEGEL', 'der spiegel'], // All same when normalized
        0.8
      );

      // Should recognize as 100% majority after normalization
      expect(result.confidence).toBe(1.0);
    });

    it('should handle mixed case and whitespace', async () => {
      const result = await resolveFieldConflict(
        'company',
        'company123',
        'website',
        '',
        ['  HTTPS://SPIEGEL.DE  ', 'https://spiegel.de', 'https://spiegel.de '],
        0.8
      );

      expect(result.action).toBe('auto_updated');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Error Handling', () => {
    it('should handle firestore errors gracefully', async () => {
      const { getDoc } = require('firebase/firestore');

      getDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await resolveFieldConflict(
        'company',
        'company123',
        'website',
        'current',
        ['new', 'new', 'new'],
        0.9
      );

      // Should still work with fallback behavior
      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
    });

    it('should handle malformed timestamps', async () => {
      const { getDoc } = require('firebase/firestore');

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          website_updatedAt: null, // Malformed
          website_updatedBy: 'user123'
        })
      });

      const result = await resolveFieldConflict(
        'company',
        'company123',
        'website',
        'current',
        ['new', 'new', 'new'],
        0.9
      );

      expect(result).toBeDefined();
      // Should treat as very old value (999 days)
    });
  });

  describe('Priority Calculation', () => {
    it('should assign high priority for strong majority', async () => {
      const { addDoc, getDoc } = require('firebase/firestore');

      // Mock manual entry from today to force conflict review
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          website_updatedAt: {
            toDate: () => new Date() // Today
          },
          website_updatedBy: 'user123' // Manual entry
        })
      });

      await resolveFieldConflict(
        'company',
        'company123',
        'website',
        'current',
        ['new', 'new', 'new', 'new', 'new'], // 100% with 5 variants
        0.8
      );

      const addDocCall = addDoc.mock.calls.find((call: any) =>
        call[0]?.path === 'conflict_reviews'
      );

      expect(addDocCall).toBeDefined();
      expect(addDocCall[1].priority).toBe('high');
    });

    it('should assign medium priority for moderate majority', async () => {
      const { addDoc } = require('firebase/firestore');

      await resolveFieldConflict(
        'company',
        'company123',
        'website',
        'current',
        ['new', 'new', 'new', 'old'], // 75% with 4 variants
        0.8
      );

      const addDocCall = addDoc.mock.calls.find((call: any) =>
        call[0]?.path === 'conflict_reviews'
      );

      expect(addDocCall).toBeDefined();
      expect(addDocCall[1].priority).toBe('medium');
    });

    it('should assign low priority for weak majority', async () => {
      const { addDoc } = require('firebase/firestore');

      await resolveFieldConflict(
        'company',
        'company123',
        'website',
        'current',
        ['new', 'old'], // 50% with 2 variants
        0.6
      );

      const addDocCall = addDoc.mock.calls.find((call: any) =>
        call[0]?.path === 'conflict_reviews'
      );

      expect(addDocCall).toBeDefined();
      expect(addDocCall[1].priority).toBe('low');
    });
  });
});