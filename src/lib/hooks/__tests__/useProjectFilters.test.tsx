import { renderHook, act } from '@testing-library/react';
import { useProjectFilters } from '../useProjectFilters';
import { Project } from '@/types/project';

// Mock-Projekte für Tests
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Active Project 1',
    status: 'active',
    customer: { id: 'c1', name: 'Customer A' },
    organizationId: 'org1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Active Project 2',
    status: 'in_progress',
    customer: { id: 'c2', name: 'Customer B' },
    organizationId: 'org1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Archived Project',
    status: 'archived',
    customer: { id: 'c3', name: 'Customer C' },
    organizationId: 'org1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Another Active',
    status: 'active',
    customer: { id: 'c4', name: 'Special Customer' },
    organizationId: 'org1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('useProjectFilters', () => {
  describe('Initial State', () => {
    it('should initialize with showActive=true and showArchived=false', () => {
      const { result } = renderHook(() => useProjectFilters(mockProjects));

      expect(result.current.showActive).toBe(true);
      expect(result.current.showArchived).toBe(false);
    });

    it('should show only active projects by default', () => {
      const { result } = renderHook(() => useProjectFilters(mockProjects));

      expect(result.current.filteredProjects).toHaveLength(3);
      expect(result.current.filteredProjects.every(p => p.status !== 'archived')).toBe(true);
    });
  });

  describe('Status Filtering', () => {
    it('should filter only active projects when showActive=true, showArchived=false', () => {
      const { result } = renderHook(() => useProjectFilters(mockProjects));

      expect(result.current.filteredProjects).toHaveLength(3);
      expect(result.current.filteredProjects.find(p => p.id === '1')).toBeDefined();
      expect(result.current.filteredProjects.find(p => p.id === '2')).toBeDefined();
      expect(result.current.filteredProjects.find(p => p.id === '4')).toBeDefined();
      expect(result.current.filteredProjects.find(p => p.id === '3')).toBeUndefined();
    });

    it('should filter only archived projects when showActive=false, showArchived=true', () => {
      const { result } = renderHook(() => useProjectFilters(mockProjects));

      act(() => {
        result.current.toggleActive(false);
        result.current.toggleArchived(true);
      });

      expect(result.current.filteredProjects).toHaveLength(1);
      expect(result.current.filteredProjects[0].id).toBe('3');
      expect(result.current.filteredProjects[0].status).toBe('archived');
    });

    it('should show all projects when showActive=true, showArchived=true', () => {
      const { result } = renderHook(() => useProjectFilters(mockProjects));

      act(() => {
        result.current.toggleArchived(true);
      });

      expect(result.current.filteredProjects).toHaveLength(4);
    });

    it('should return empty array when showActive=false, showArchived=false', () => {
      const { result } = renderHook(() => useProjectFilters(mockProjects));

      act(() => {
        result.current.toggleActive(false);
      });

      expect(result.current.filteredProjects).toHaveLength(0);
    });
  });

  describe('Search Filtering', () => {
    it('should filter by project title (case-insensitive)', () => {
      const { result } = renderHook(() =>
        useProjectFilters(mockProjects, 'active project 1')
      );

      expect(result.current.filteredProjects).toHaveLength(1);
      expect(result.current.filteredProjects[0].title).toBe('Active Project 1');
    });

    it('should filter by customer name (case-insensitive)', () => {
      const { result } = renderHook(() =>
        useProjectFilters(mockProjects, 'customer b')
      );

      expect(result.current.filteredProjects).toHaveLength(1);
      expect(result.current.filteredProjects[0].customer?.name).toBe('Customer B');
    });

    it('should filter by partial match in title', () => {
      const { result } = renderHook(() =>
        useProjectFilters(mockProjects, 'Another')
      );

      expect(result.current.filteredProjects).toHaveLength(1);
      expect(result.current.filteredProjects[0].title).toBe('Another Active');
    });

    it('should return empty array when search term does not match', () => {
      const { result } = renderHook(() =>
        useProjectFilters(mockProjects, 'Nonexistent Project')
      );

      expect(result.current.filteredProjects).toHaveLength(0);
    });

    it('should handle empty search term', () => {
      const { result } = renderHook(() =>
        useProjectFilters(mockProjects, '')
      );

      expect(result.current.filteredProjects).toHaveLength(3); // Active projects only
    });
  });

  describe('Combined Filtering', () => {
    it('should apply both status and search filters', () => {
      const { result } = renderHook(() =>
        useProjectFilters(mockProjects, 'Customer')
      );

      // Should find "Active Project 1" (Customer A), "Active Project 2" (Customer B),
      // "Another Active" (Special Customer), but NOT "Archived Project" (Customer C)
      expect(result.current.filteredProjects).toHaveLength(3);
      expect(result.current.filteredProjects.every(p => p.status !== 'archived')).toBe(true);
    });

    it('should find archived project when both filters enabled and search matches', () => {
      const { result } = renderHook(() =>
        useProjectFilters(mockProjects, 'Archived')
      );

      act(() => {
        result.current.toggleArchived(true);
      });

      expect(result.current.filteredProjects).toHaveLength(1);
      expect(result.current.filteredProjects[0].title).toBe('Archived Project');
    });
  });

  describe('Toggle Functions', () => {
    it('should toggle showActive state', () => {
      const { result } = renderHook(() => useProjectFilters(mockProjects));

      expect(result.current.showActive).toBe(true);

      act(() => {
        result.current.toggleActive(false);
      });

      expect(result.current.showActive).toBe(false);

      act(() => {
        result.current.toggleActive(true);
      });

      expect(result.current.showActive).toBe(true);
    });

    it('should toggle showArchived state', () => {
      const { result } = renderHook(() => useProjectFilters(mockProjects));

      expect(result.current.showArchived).toBe(false);

      act(() => {
        result.current.toggleArchived(true);
      });

      expect(result.current.showArchived).toBe(true);

      act(() => {
        result.current.toggleArchived(false);
      });

      expect(result.current.showArchived).toBe(false);
    });
  });

  describe('Reset Filters', () => {
    it('should reset filters to default state', () => {
      const { result } = renderHook(() => useProjectFilters(mockProjects));

      // Change state
      act(() => {
        result.current.toggleActive(false);
        result.current.toggleArchived(true);
      });

      expect(result.current.showActive).toBe(false);
      expect(result.current.showArchived).toBe(true);

      // Reset
      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.showActive).toBe(true);
      expect(result.current.showArchived).toBe(false);
    });
  });

  describe('Callback Stability', () => {
    it('should maintain stable callback references (useCallback)', () => {
      const { result, rerender } = renderHook(() => useProjectFilters(mockProjects));

      const toggleActiveRef = result.current.toggleActive;
      const toggleArchivedRef = result.current.toggleArchived;
      const resetFiltersRef = result.current.resetFilters;

      rerender();

      expect(result.current.toggleActive).toBe(toggleActiveRef);
      expect(result.current.toggleArchived).toBe(toggleArchivedRef);
      expect(result.current.resetFilters).toBe(resetFiltersRef);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty projects array', () => {
      const { result } = renderHook(() => useProjectFilters([]));

      expect(result.current.filteredProjects).toHaveLength(0);
    });

    it('should handle projects without customer', () => {
      const projectsWithoutCustomer: Project[] = [
        {
          id: '1',
          title: 'Simple Project',
          status: 'active',
          organizationId: 'org1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() =>
        useProjectFilters(projectsWithoutCustomer, 'Acme Corp')
      );

      expect(result.current.filteredProjects).toHaveLength(0);
    });

    it('should handle projects with customer but no name', () => {
      const projectsWithEmptyCustomer: Project[] = [
        {
          id: '1',
          title: 'Simple Project',
          status: 'active',
          customer: { id: 'c1' },
          organizationId: 'org1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() =>
        useProjectFilters(projectsWithEmptyCustomer, 'Acme Corp')
      );

      expect(result.current.filteredProjects).toHaveLength(0);
    });
  });

  describe('Performance (useMemo)', () => {
    it('should memoize filteredProjects when dependencies do not change', () => {
      const { result, rerender } = renderHook(() => useProjectFilters(mockProjects));

      const firstFilteredRef = result.current.filteredProjects;

      rerender();

      expect(result.current.filteredProjects).toBe(firstFilteredRef);
    });

    it('should recalculate filteredProjects when projects change', () => {
      const { result, rerender } = renderHook(
        ({ projects }) => useProjectFilters(projects),
        { initialProps: { projects: mockProjects } }
      );

      const firstFilteredRef = result.current.filteredProjects;

      const newProjects = [...mockProjects, {
        id: '5',
        title: 'New Project',
        status: 'active',
        organizationId: 'org1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }] as Project[];

      rerender({ projects: newProjects });

      expect(result.current.filteredProjects).not.toBe(firstFilteredRef);
      expect(result.current.filteredProjects).toHaveLength(4); // 3 old + 1 new
    });

    it('should recalculate filteredProjects when searchTerm changes', () => {
      const { result, rerender } = renderHook(
        ({ searchTerm }) => useProjectFilters(mockProjects, searchTerm),
        { initialProps: { searchTerm: '' } }
      );

      const firstFilteredRef = result.current.filteredProjects;

      rerender({ searchTerm: 'Active Project 1' });

      expect(result.current.filteredProjects).not.toBe(firstFilteredRef);
      expect(result.current.filteredProjects).toHaveLength(1);
    });
  });
});
