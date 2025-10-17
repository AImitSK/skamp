// src/components/projects/kanban/card/__tests__/types.test.ts
import { ProjectCardProps } from '../types';
import { Project, PipelineStage } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

describe('ProjectCard Types', () => {
  const mockProject: Project = {
    id: 'test-id',
    title: 'Test Project',
    description: 'Test Description',
    status: 'active',
    currentStage: 'briefing',
    organizationId: 'org-1',
    userId: 'user-1',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const mockUseDraggableProject = jest.fn();

  describe('ProjectCardProps Interface', () => {
    it('should accept valid ProjectCardProps with required fields only', () => {
      const validProps: ProjectCardProps = {
        project: mockProject,
        useDraggableProject: mockUseDraggableProject,
      };

      expect(validProps.project).toBeDefined();
      expect(validProps.useDraggableProject).toBeDefined();
    });

    it('should accept valid ProjectCardProps with all optional fields', () => {
      const onSelect = jest.fn();
      const onProjectMove = jest.fn();
      const onProjectAdded = jest.fn();
      const onProjectDeleted = jest.fn();
      const onProjectArchived = jest.fn();
      const onProjectUpdated = jest.fn();

      const validProps: ProjectCardProps = {
        project: mockProject,
        useDraggableProject: mockUseDraggableProject,
        onSelect,
        onProjectMove,
        onProjectAdded,
        onProjectDeleted,
        onProjectArchived,
        onProjectUpdated,
      };

      expect(validProps.onSelect).toBeDefined();
      expect(validProps.onProjectMove).toBeDefined();
      expect(validProps.onProjectAdded).toBeDefined();
      expect(validProps.onProjectDeleted).toBeDefined();
      expect(validProps.onProjectArchived).toBeDefined();
      expect(validProps.onProjectUpdated).toBeDefined();
    });

    it('should accept onSelect callback with correct signature', () => {
      const onSelect = jest.fn((projectId: string) => {
        expect(typeof projectId).toBe('string');
      });

      const props: ProjectCardProps = {
        project: mockProject,
        useDraggableProject: mockUseDraggableProject,
        onSelect,
      };

      if (props.onSelect) {
        props.onSelect('test-id');
        expect(onSelect).toHaveBeenCalledWith('test-id');
      }
    });

    it('should accept onProjectMove callback with correct signature', async () => {
      const onProjectMove = jest.fn(
        async (projectId: string, targetStage: PipelineStage) => {
          expect(typeof projectId).toBe('string');
          expect(typeof targetStage).toBe('string');
        }
      );

      const props: ProjectCardProps = {
        project: mockProject,
        useDraggableProject: mockUseDraggableProject,
        onProjectMove,
      };

      if (props.onProjectMove) {
        await props.onProjectMove('test-id', 'concept');
        expect(onProjectMove).toHaveBeenCalledWith('test-id', 'concept');
      }
    });

    it('should accept lifecycle callbacks with no parameters', () => {
      const onProjectAdded = jest.fn();
      const onProjectDeleted = jest.fn();
      const onProjectArchived = jest.fn();
      const onProjectUpdated = jest.fn();

      const props: ProjectCardProps = {
        project: mockProject,
        useDraggableProject: mockUseDraggableProject,
        onProjectAdded,
        onProjectDeleted,
        onProjectArchived,
        onProjectUpdated,
      };

      if (props.onProjectAdded) props.onProjectAdded();
      if (props.onProjectDeleted) props.onProjectDeleted();
      if (props.onProjectArchived) props.onProjectArchived();
      if (props.onProjectUpdated) props.onProjectUpdated();

      expect(onProjectAdded).toHaveBeenCalled();
      expect(onProjectDeleted).toHaveBeenCalled();
      expect(onProjectArchived).toHaveBeenCalled();
      expect(onProjectUpdated).toHaveBeenCalled();
    });

    it('should accept useDraggableProject hook with any return type', () => {
      const mockReturn = {
        isDragging: false,
        drag: jest.fn(),
      };

      const hook = jest.fn(() => mockReturn);

      const props: ProjectCardProps = {
        project: mockProject,
        useDraggableProject: hook,
      };

      const result = props.useDraggableProject(mockProject);
      expect(result).toEqual(mockReturn);
      expect(hook).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('Type Safety', () => {
    it('should enforce project to be of type Project', () => {
      // This test verifies TypeScript compilation
      // If the type is wrong, TypeScript compilation will fail
      const props: ProjectCardProps = {
        project: mockProject,
        useDraggableProject: mockUseDraggableProject,
      };

      // Verify project has required Project properties
      expect(props.project.id).toBeDefined();
      expect(props.project.title).toBeDefined();
      expect(props.project.organizationId).toBeDefined();
    });

    it('should allow optional callbacks to be undefined', () => {
      const props: ProjectCardProps = {
        project: mockProject,
        useDraggableProject: mockUseDraggableProject,
        // All other callbacks are intentionally undefined
      };

      expect(props.onSelect).toBeUndefined();
      expect(props.onProjectMove).toBeUndefined();
      expect(props.onProjectAdded).toBeUndefined();
      expect(props.onProjectDeleted).toBeUndefined();
      expect(props.onProjectArchived).toBeUndefined();
      expect(props.onProjectUpdated).toBeUndefined();
    });
  });
});
