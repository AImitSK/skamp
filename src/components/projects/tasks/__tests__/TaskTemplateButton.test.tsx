// src/components/projects/tasks/__tests__/TaskTemplateButton.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskTemplateButton } from '../TaskTemplateButton';
import { taskService } from '@/lib/firebase/task-service';
import { toastService } from '@/lib/utils/toast';

// Mock taskService
jest.mock('@/lib/firebase/task-service', () => ({
  taskService: {
    create: jest.fn()
  }
}));

// Mock toastService
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const mockTaskService = taskService as jest.Mocked<typeof taskService>;
const mockToastService = toastService as jest.Mocked<typeof toastService>;

describe('TaskTemplateButton Component', () => {
  const defaultProps = {
    projectId: 'project-123',
    organizationId: 'org-123',
    userId: 'user-123',
    disabled: false,
    onSuccess: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskService.create.mockResolvedValue({} as any);
  });

  describe('Rendering', () => {
    it('should render button with correct text', () => {
      render(<TaskTemplateButton {...defaultProps} />);
      expect(screen.getByText('Task Vorlage verwenden')).toBeInTheDocument();
    });

    it('should render button with icon', () => {
      render(<TaskTemplateButton {...defaultProps} />);
      const button = screen.getByText('Task Vorlage verwenden').parentElement;
      expect(button?.querySelector('svg')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<TaskTemplateButton {...defaultProps} disabled={true} />);
      const button = screen.getByText('Task Vorlage verwenden');
      expect(button).toBeDisabled();
    });

    it('should not be disabled when disabled prop is false', () => {
      render(<TaskTemplateButton {...defaultProps} disabled={false} />);
      const button = screen.getByText('Task Vorlage verwenden');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Template Creation', () => {
    it('should create 9 standard tasks when clicked', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateButton {...defaultProps} />);

      const button = screen.getByText('Task Vorlage verwenden');
      await user.click(button);

      await waitFor(() => {
        expect(mockTaskService.create).toHaveBeenCalledTimes(9);
      });
    });

    it('should create tasks with correct project data', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateButton {...defaultProps} />);

      const button = screen.getByText('Task Vorlage verwenden');
      await user.click(button);

      await waitFor(() => {
        expect(mockTaskService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 'project-123',
            organizationId: 'org-123',
            userId: 'user-123',
            assignedUserId: 'user-123'
          })
        );
      });
    });

    it('should call onSuccess after all tasks are created', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateButton {...defaultProps} />);

      const button = screen.getByText('Task Vorlage verwenden');
      await user.click(button);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('should show success toast after creation', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateButton {...defaultProps} />);

      const button = screen.getByText('Task Vorlage verwenden');
      await user.click(button);

      await waitFor(() => {
        expect(mockToastService.success).toHaveBeenCalledWith(
          '9 Standard-Tasks erfolgreich erstellt'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when userId is missing', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateButton {...defaultProps} userId="" />);

      const button = screen.getByText('Task Vorlage verwenden');
      await user.click(button);

      await waitFor(() => {
        expect(mockToastService.error).toHaveBeenCalledWith('Benutzer nicht gefunden');
      });
    });

    it('should show error toast when task creation fails', async () => {
      mockTaskService.create.mockRejectedValue(new Error('Creation failed'));
      const user = userEvent.setup();
      render(<TaskTemplateButton {...defaultProps} />);

      const button = screen.getByText('Task Vorlage verwenden');
      await user.click(button);

      await waitFor(() => {
        expect(mockToastService.error).toHaveBeenCalledWith(
          'Fehler beim Erstellen der Vorlagen-Tasks'
        );
      });
    });

    it('should not call onSuccess when error occurs', async () => {
      mockTaskService.create.mockRejectedValue(new Error('Creation failed'));
      const user = userEvent.setup();
      render(<TaskTemplateButton {...defaultProps} />);

      const button = screen.getByText('Task Vorlage verwenden');
      await user.click(button);

      await waitFor(() => {
        expect(mockToastService.error).toHaveBeenCalled();
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });
  });
});
