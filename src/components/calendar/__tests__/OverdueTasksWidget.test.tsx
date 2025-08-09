// src/components/calendar/__tests__/OverdueTasksWidget.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OverdueTasksWidget } from '../OverdueTasksWidget';
import { taskService } from '@/lib/firebase/task-service';
import { Task } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

const mockTimestamp = {
  fromDate: (date: Date) => ({
    toDate: () => date,
    toMillis: () => date.getTime()
  })
};

// Mock Firebase Timestamp
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      toMillis: () => date.getTime()
    }))
  }
}));

// Mock taskService
jest.mock('@/lib/firebase/task-service', () => ({
  taskService: {
    getAll: jest.fn(),
    markAsCompleted: jest.fn()
  }
}));

const mockTaskService = taskService as jest.Mocked<typeof taskService>;

describe('OverdueTasksWidget', () => {
  const defaultProps = {
    organizationId: 'org-123',
    userId: 'user-123',
    onTaskClick: jest.fn(),
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Loading-State anzeigen', () => {
    mockTaskService.getAll.mockImplementation(() => new Promise(() => {}));

    render(<OverdueTasksWidget {...defaultProps} />);

    expect(screen.getByText('Lade Kalender...')).toBeInTheDocument();
  });

  it('sollte nichts anzeigen, wenn keine überfälligen Tasks vorhanden sind', async () => {
    mockTaskService.getAll.mockResolvedValue([]);

    const { container } = render(<OverdueTasksWidget {...defaultProps} />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('sollte überfällige Tasks anzeigen', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueTasks: Task[] = [
      {
        id: 'task-1',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Überfällige Task 1',
        description: 'Beschreibung der Task',
        status: 'pending',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      },
      {
        id: 'task-2',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Überfällige Task 2',
        status: 'pending',
        priority: 'medium',
        dueDate: mockTimestamp.fromDate(yesterday)
      }
    ];

    mockTaskService.getAll.mockResolvedValue(overdueTasks);

    render(<OverdueTasksWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('2 überfällige Aufgaben')).toBeInTheDocument();
      expect(screen.getByText('Bitte kümmern Sie sich um diese ausstehenden Aufgaben')).toBeInTheDocument();
    });
  });

  it('sollte Widget erweitern, wenn auf "Anzeigen" geklickt wird', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueTasks: Task[] = [
      {
        id: 'task-1',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Überfällige Task',
        status: 'pending',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      }
    ];

    mockTaskService.getAll.mockResolvedValue(overdueTasks);

    render(<OverdueTasksWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Anzeigen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Anzeigen'));

    await waitFor(() => {
      expect(screen.getByText('Überfällige Aufgaben (1)')).toBeInTheDocument();
      expect(screen.getByText('Überfällige Task')).toBeInTheDocument();
    });
  });

  it('sollte Task als erledigt markieren können', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueTasks: Task[] = [
      {
        id: 'task-1',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Überfällige Task',
        status: 'pending',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      }
    ];

    mockTaskService.getAll.mockResolvedValue(overdueTasks);
    mockTaskService.markAsCompleted.mockResolvedValue(undefined);

    render(<OverdueTasksWidget {...defaultProps} />);

    // Erweitere das Widget
    await waitFor(() => {
      fireEvent.click(screen.getByText('Anzeigen'));
    });

    await waitFor(() => {
      const completeButton = screen.getByRole('button', { name: /checkCircleIcon/i });
      expect(completeButton).toBeInTheDocument();
    });

    // Klicke auf "Erledigt" Button
    const completeButton = screen.getAllByRole('button')[3]; // CheckCircleIcon button
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockTaskService.markAsCompleted).toHaveBeenCalledWith('task-1');
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  it('sollte onTaskClick aufrufen, wenn auf Task geklickt wird', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueTasks: Task[] = [
      {
        id: 'task-1',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Überfällige Task',
        status: 'pending',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      }
    ];

    mockTaskService.getAll.mockResolvedValue(overdueTasks);

    render(<OverdueTasksWidget {...defaultProps} />);

    // Erweitere das Widget
    await waitFor(() => {
      fireEvent.click(screen.getByText('Anzeigen'));
    });

    await waitFor(() => {
      expect(screen.getByText('Überfällige Task')).toBeInTheDocument();
    });

    // Klicke auf die Task
    fireEvent.click(screen.getByText('Überfällige Task'));

    expect(defaultProps.onTaskClick).toHaveBeenCalledWith(overdueTasks[0]);
  });

  it('sollte Widget minimieren können', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueTasks: Task[] = [
      {
        id: 'task-1',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Überfällige Task',
        status: 'pending',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      }
    ];

    mockTaskService.getAll.mockResolvedValue(overdueTasks);

    render(<OverdueTasksWidget {...defaultProps} />);

    // Erweitere das Widget
    await waitFor(() => {
      fireEvent.click(screen.getByText('Anzeigen'));
    });

    await waitFor(() => {
      expect(screen.getByText('Minimieren')).toBeInTheDocument();
    });

    // Minimiere das Widget
    fireEvent.click(screen.getByText('Minimieren'));

    await waitFor(() => {
      expect(screen.getByText('Anzeigen')).toBeInTheDocument();
      expect(screen.queryByText('Minimieren')).not.toBeInTheDocument();
    });
  });

  it('sollte Tasks aktualisieren können', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueTasks: Task[] = [
      {
        id: 'task-1',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Überfällige Task',
        status: 'pending',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      }
    ];

    mockTaskService.getAll.mockResolvedValue(overdueTasks);

    render(<OverdueTasksWidget {...defaultProps} />);

    // Erweitere das Widget
    await waitFor(() => {
      fireEvent.click(screen.getByText('Anzeigen'));
    });

    await waitFor(() => {
      expect(screen.getByText('Aktualisieren')).toBeInTheDocument();
    });

    // Klicke auf Aktualisieren
    fireEvent.click(screen.getByText('Aktualisieren'));

    await waitFor(() => {
      expect(mockTaskService.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('sollte Tage überfällig korrekt berechnen', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const overdueTasks: Task[] = [
      {
        id: 'task-1',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Überfällige Task',
        status: 'pending',
        priority: 'high',
        dueDate: Timestamp.fromDate(twoDaysAgo)
      }
    ];

    mockTaskService.getAll.mockResolvedValue(overdueTasks);

    render(<OverdueTasksWidget {...defaultProps} />);

    // Erweitere das Widget
    await waitFor(() => {
      fireEvent.click(screen.getByText('Anzeigen'));
    });

    await waitFor(() => {
      expect(screen.getByText(/2 Tage überfällig/)).toBeInTheDocument();
    });
  });

  it('sollte Prioritäts-Badges korrekt anzeigen', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueTasks: Task[] = [
      {
        id: 'task-urgent',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Dringende Task',
        status: 'pending',
        priority: 'urgent',
        dueDate: mockTimestamp.fromDate(yesterday)
      },
      {
        id: 'task-high',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Hohe Priorität Task',
        status: 'pending',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      },
      {
        id: 'task-medium',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Mittlere Priorität Task',
        status: 'pending',
        priority: 'medium',
        dueDate: mockTimestamp.fromDate(yesterday)
      },
      {
        id: 'task-low',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Niedrige Priorität Task',
        status: 'pending',
        priority: 'low',
        dueDate: mockTimestamp.fromDate(yesterday)
      }
    ];

    mockTaskService.getAll.mockResolvedValue(overdueTasks);

    render(<OverdueTasksWidget {...defaultProps} />);

    // Erweitere das Widget
    await waitFor(() => {
      fireEvent.click(screen.getByText('Anzeigen'));
    });

    await waitFor(() => {
      expect(screen.getByText('Dringend')).toBeInTheDocument();
      expect(screen.getByText('Hoch')).toBeInTheDocument();
      expect(screen.getByText('Mittel')).toBeInTheDocument();
      expect(screen.getByText('Niedrig')).toBeInTheDocument();
    });
  });

  it('sollte erledigte Tasks nicht anzeigen', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tasks: Task[] = [
      {
        id: 'task-pending',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Überfällige Task',
        status: 'pending',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      },
      {
        id: 'task-completed',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Erledigte Task',
        status: 'completed',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      }
    ];

    mockTaskService.getAll.mockResolvedValue(tasks);

    render(<OverdueTasksWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1 überfällige Aufgabe')).toBeInTheDocument();
    });
  });

  it('sollte Tasks ohne Fälligkeitsdatum nicht anzeigen', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tasks: Task[] = [
      {
        id: 'task-with-date',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Task mit Datum',
        status: 'pending',
        priority: 'high',
        dueDate: mockTimestamp.fromDate(yesterday)
      },
      {
        id: 'task-without-date',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Task ohne Datum',
        status: 'pending',
        priority: 'high'
      }
    ];

    mockTaskService.getAll.mockResolvedValue(tasks);

    render(<OverdueTasksWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1 überfällige Aufgabe')).toBeInTheDocument();
    });
  });
});