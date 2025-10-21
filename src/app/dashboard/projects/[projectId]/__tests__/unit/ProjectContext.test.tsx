// src/app/dashboard/projects/[projectId]/__tests__/unit/ProjectContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { ProjectProvider, useProject } from '../../context/ProjectContext';
import { Project } from '@/types/project';
import { createMockTimestamp } from '../helpers/mock-data';

const mockProject: Project = {
  id: 'project-123',
  userId: 'user-123',
  title: 'Test Project',
  description: 'Test Description',
  status: 'active',
  currentStage: 'ideas_planning',
  priority: 'high',
  organizationId: 'org-123',
  createdAt: createMockTimestamp(new Date()) as any,
  updatedAt: createMockTimestamp(new Date()) as any,
  assignedTo: ['user-123'],
};

describe('ProjectContext', () => {
  describe('useProject Hook', () => {
    it('should throw error when used outside of ProjectProvider', () => {
      // Suppress console.error for this test as we expect an error
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useProject());
      }).toThrow('useProject must be used within a ProjectProvider');

      console.error = originalError;
    });

    it('should provide context values correctly', () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
          >
            {children}
          </ProjectProvider>
        ),
      });

      expect(result.current.project).toEqual(mockProject);
      expect(result.current.projectId).toBe('project-123');
      expect(result.current.organizationId).toBe('org-123');
      expect(result.current.activeTab).toBe('overview');
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should allow changing active tab', () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
          >
            {children}
          </ProjectProvider>
        ),
      });

      expect(result.current.activeTab).toBe('overview');

      act(() => {
        result.current.setActiveTab('tasks');
      });

      expect(result.current.activeTab).toBe('tasks');

      act(() => {
        result.current.setActiveTab('strategie');
      });

      expect(result.current.activeTab).toBe('strategie');
    });

    it('should manage project state correctly', () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={null}
          >
            {children}
          </ProjectProvider>
        ),
      });

      expect(result.current.project).toBe(null);

      act(() => {
        result.current.setProject(mockProject);
      });

      expect(result.current.project).toEqual(mockProject);

      const updatedProject = { ...mockProject, title: 'Updated Title' };
      act(() => {
        result.current.setProject(updatedProject);
      });

      expect(result.current.project?.title).toBe('Updated Title');
    });

    it('should manage loading and error states', () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
          >
            {children}
          </ProjectProvider>
        ),
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.error).toBe('Test error message');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('ProjectProvider', () => {
    it('should call onReload when reloadProject is invoked', async () => {
      const mockOnReload = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
            onReload={mockOnReload}
          >
            {children}
          </ProjectProvider>
        ),
      });

      await act(async () => {
        await result.current.reloadProject();
      });

      expect(mockOnReload).toHaveBeenCalledTimes(1);
    });
  });
});
