// src/lib/hooks/__tests__/useProjectData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useProjects,
  useProject,
  useProjectsByStage,
  useMoveProject,
  useDeleteProject,
  useArchiveProject,
  useUpdateProject,
} from '../useProjectData';
import { projectService } from '@/lib/firebase/project-service';
import { kanbanBoardService } from '@/lib/kanban/kanban-board-service';
import { Project, PipelineStage } from '@/types/project';

// Mock Firebase services
jest.mock('@/lib/firebase/project-service', () => ({
  projectService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    archive: jest.fn(),
  },
}));

jest.mock('@/lib/kanban/kanban-board-service', () => ({
  kanbanBoardService: {
    moveProject: jest.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { Wrapper, queryClient };
}

const mockProject: Project = {
  id: 'project-1',
  title: 'Test Project',
  description: 'Test Description',
  status: 'active',
  currentStage: 'ideas_planning',
  organizationId: 'test-org-id',
  userId: 'user-1',
  createdAt: {
    seconds: Date.now() / 1000,
    nanoseconds: 0,
    toDate: () => new Date(),
    toMillis: () => Date.now(),
    isEqual: () => false,
    toJSON: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  } as any,
  updatedAt: {
    seconds: Date.now() / 1000,
    nanoseconds: 0,
    toDate: () => new Date(),
    toMillis: () => Date.now(),
    isEqual: () => false,
    toJSON: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  } as any,
};

describe('useProjectData Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useProjects', () => {
    it('fetches all projects for an organization', async () => {
      const mockProjects = [
        mockProject,
        { ...mockProject, id: 'project-2', title: 'Project 2' },
      ];

      (projectService.getAll as jest.Mock).mockResolvedValue(mockProjects);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProjects('test-org-id'), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProjects);
      expect(projectService.getAll).toHaveBeenCalledWith({ organizationId: 'test-org-id' });
    });

    it('does not fetch when organizationId is undefined', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProjects(undefined), {
        wrapper: Wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(projectService.getAll).not.toHaveBeenCalled();
    });

    it('throws error when organizationId is missing in queryFn', async () => {
      (projectService.getAll as jest.Mock).mockRejectedValue(new Error('No organization'));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProjects(undefined), {
        wrapper: Wrapper,
      });

      // Query should be disabled, so no error
      expect(result.current.isError).toBe(false);
    });
  });

  describe('useProject', () => {
    it('fetches a single project by ID', async () => {
      (projectService.getById as jest.Mock).mockResolvedValue(mockProject);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProject('project-1'), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProject);
      expect(projectService.getById).toHaveBeenCalledWith('project-1', { organizationId: 'default' });
    });

    it('does not fetch when projectId is undefined', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProject(undefined), {
        wrapper: Wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(projectService.getById).not.toHaveBeenCalled();
    });
  });

  describe('useProjectsByStage', () => {
    it('fetches and filters projects by stage', async () => {
      const mockProjects = [
        { ...mockProject, id: 'project-1', currentStage: 'ideas_planning' as PipelineStage },
        { ...mockProject, id: 'project-2', currentStage: 'creation' as PipelineStage },
        { ...mockProject, id: 'project-3', currentStage: 'ideas_planning' as PipelineStage },
      ];

      (projectService.getAll as jest.Mock).mockResolvedValue(mockProjects);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProjectsByStage('test-org-id', 'ideas_planning'), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].currentStage).toBe('ideas_planning');
      expect(result.current.data?.[1].currentStage).toBe('ideas_planning');
      expect(projectService.getAll).toHaveBeenCalledWith({ organizationId: 'test-org-id' });
    });

    it('does not fetch when organizationId is undefined', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProjectsByStage(undefined, 'ideas_planning'), {
        wrapper: Wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(projectService.getAll).not.toHaveBeenCalled();
    });
  });

  describe('useMoveProject', () => {
    it('moves a project between stages and invalidates cache', async () => {
      const moveResult = {
        success: true,
        project: { ...mockProject, currentStage: 'creation' as PipelineStage },
      };

      (kanbanBoardService.moveProject as jest.Mock).mockResolvedValue(moveResult);

      const { Wrapper, queryClient } = createWrapper();

      // Pre-populate cache
      queryClient.setQueryData(['projects', 'test-org-id'], [mockProject]);

      const { result } = renderHook(() => useMoveProject(), {
        wrapper: Wrapper,
      });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        projectId: 'project-1',
        currentStage: 'ideas_planning',
        targetStage: 'creation',
        userId: 'user-1',
        organizationId: 'test-org-id',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(kanbanBoardService.moveProject).toHaveBeenCalledWith(
        'project-1',
        'ideas_planning',
        'creation',
        'user-1',
        'test-org-id'
      );

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['projects', 'test-org-id'],
      });
    });
  });

  describe('useDeleteProject', () => {
    it('deletes a project with optimistic update', async () => {
      (projectService.delete as jest.Mock).mockResolvedValue(undefined);

      const { Wrapper, queryClient } = createWrapper();

      // Pre-populate cache with multiple projects
      const mockProjects = [
        mockProject,
        { ...mockProject, id: 'project-2', title: 'Project 2' },
      ];
      queryClient.setQueryData(['projects', 'test-org-id'], mockProjects);

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        projectId: 'project-1',
        organizationId: 'test-org-id',
      });

      // Optimistic update should remove project immediately
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(['projects', 'test-org-id']) as Project[];
        expect(cachedData).toHaveLength(1);
        expect(cachedData[0].id).toBe('project-2');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(projectService.delete).toHaveBeenCalledWith('project-1', {
        organizationId: 'test-org-id',
      });
    });

    it('rolls back optimistic update on error', async () => {
      (projectService.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const { Wrapper, queryClient } = createWrapper();

      // Pre-populate cache
      const mockProjects = [
        mockProject,
        { ...mockProject, id: 'project-2', title: 'Project 2' },
      ];
      queryClient.setQueryData(['projects', 'test-org-id'], mockProjects);

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        projectId: 'project-1',
        organizationId: 'test-org-id',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Cache should be rolled back to original state
      const cachedData = queryClient.getQueryData(['projects', 'test-org-id']) as Project[];
      expect(cachedData).toHaveLength(2);
      expect(cachedData.find(p => p.id === 'project-1')).toBeDefined();
    });
  });

  describe('useArchiveProject', () => {
    it('archives a project with optimistic update', async () => {
      (projectService.archive as jest.Mock).mockResolvedValue(undefined);

      const { Wrapper, queryClient } = createWrapper();

      // Pre-populate cache
      const mockProjects = [mockProject];
      queryClient.setQueryData(['projects', 'test-org-id'], mockProjects);

      const { result } = renderHook(() => useArchiveProject(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        projectId: 'project-1',
        organizationId: 'test-org-id',
        userId: 'user-1',
      });

      // Optimistic update should set status to archived
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(['projects', 'test-org-id']) as Project[];
        expect(cachedData[0].status).toBe('archived');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(projectService.archive).toHaveBeenCalledWith('project-1', {
        organizationId: 'test-org-id',
        userId: 'user-1',
      });
    });

    it('rolls back optimistic update on error', async () => {
      (projectService.archive as jest.Mock).mockRejectedValue(new Error('Archive failed'));

      const { Wrapper, queryClient } = createWrapper();

      // Pre-populate cache
      const mockProjects = [mockProject];
      queryClient.setQueryData(['projects', 'test-org-id'], mockProjects);

      const { result } = renderHook(() => useArchiveProject(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        projectId: 'project-1',
        organizationId: 'test-org-id',
        userId: 'user-1',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Cache should be rolled back
      const cachedData = queryClient.getQueryData(['projects', 'test-org-id']) as Project[];
      expect(cachedData[0].status).toBe('active'); // Original status
    });
  });

  describe('useUpdateProject', () => {
    it('updates a project and invalidates cache', async () => {
      (projectService.update as jest.Mock).mockResolvedValue(undefined);

      const { Wrapper, queryClient } = createWrapper();

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: Wrapper,
      });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        projectId: 'project-1',
        projectData: { title: 'Updated Title' },
        organizationId: 'test-org-id',
        userId: 'user-1',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(projectService.update).toHaveBeenCalledWith(
        'project-1',
        { title: 'Updated Title' },
        { organizationId: 'test-org-id', userId: 'user-1' }
      );

      // Should invalidate both projects list and single project query
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['projects', 'test-org-id'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['project', 'project-1'],
      });
    });
  });
});
