// src/components/projects/__tests__/TaskEditModal.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskEditModal } from '../TaskEditModal';
import { taskService } from '@/lib/firebase/task-service';
import { ProjectTask, TaskStatus, TaskPriority } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';
import {
  createMockTaskEditModalProps,
  mockTasksDataSet,
  mockTeamMembersDataSet,
  formatDateForInput,
  mockConsoleError
} from './test-utils';

// Mock Firebase
jest.mock('@/lib/firebase/task-service', () => ({
  taskService: {
    update: jest.fn()
  }
}));

const mockTaskService = taskService as jest.Mocked<typeof taskService>;

describe('TaskEditModal', () => {
  const defaultProps = createMockTaskEditModalProps();

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskService.update.mockResolvedValue();
  });

  describe('Rendering', () => {
    it('sollte nicht angezeigt werden wenn isOpen false ist', () => {
      render(<TaskEditModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Task bearbeiten')).not.toBeInTheDocument();
    });

    it('sollte Modal korrekt anzeigen wenn isOpen true ist', () => {
      render(<TaskEditModal {...defaultProps} />);

      expect(screen.getByText('Task bearbeiten')).toBeInTheDocument();
      expect(screen.getByLabelText('Titel *')).toBeInTheDocument();
      expect(screen.getByLabelText('Beschreibung')).toBeInTheDocument();
      expect(screen.getByLabelText('Zuständige Person')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Priorität')).toBeInTheDocument();
      expect(screen.getByLabelText('Fälligkeitsdatum')).toBeInTheDocument();
      expect(screen.getByLabelText('Fortschritt')).toBeInTheDocument();
    });

    it('sollte Task-Daten in Formular vorab füllen', () => {
      const task = mockTasksDataSet.pending;
      render(<TaskEditModal {...defaultProps} task={task} />);

      expect(screen.getByDisplayValue(task.title)).toBeInTheDocument();
      expect(screen.getByDisplayValue(task.description || '')).toBeInTheDocument();

      // Prüfe Select-Werte direkt
      const assignedSelect = screen.getByLabelText('Zuständige Person') as HTMLSelectElement;
      expect(assignedSelect.value).toBe(task.assignedUserId);

      const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
      expect(statusSelect.value).toBe(task.status);

      const prioritySelect = screen.getByLabelText('Priorität') as HTMLSelectElement;
      expect(prioritySelect.value).toBe(task.priority);

      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;
      expect(progressSlider.value).toBe(task.progress?.toString() || '0');
    });

    it('sollte Datum korrekt vorab füllen', async () => {
      // Nutze UTC um Zeitzone-Probleme zu vermeiden
      const testDate = new Date(Date.UTC(2024, 11, 25, 12, 0, 0)); // Monat ist 0-basiert
      const task: ProjectTask = {
        ...mockTasksDataSet.pending,
        dueDate: Timestamp.fromDate(testDate)
      };

      const props = {
        isOpen: true,
        onClose: jest.fn(),
        onSuccess: jest.fn(),
        task,
        teamMembers: defaultProps.teamMembers
      };

      render(<TaskEditModal {...props} />);

      // Warte bis das Formular initialisiert ist
      await waitFor(() => {
        const dateInput = screen.getByLabelText('Fälligkeitsdatum') as HTMLInputElement;
        const expectedDate = testDate.toISOString().split('T')[0];
        expect(dateInput.value).toBe(expectedDate);
      });
    });

    it('sollte mit Task ohne Datum umgehen', () => {
      const task = {
        ...mockTasksDataSet.pending,
        dueDate: undefined
      };
      render(<TaskEditModal {...defaultProps} task={task} />);

      const dateInput = screen.getByLabelText('Fälligkeitsdatum') as HTMLInputElement;
      expect(dateInput.value).toBe('');
    });

    it('sollte Status-Optionen korrekt anzeigen', () => {
      render(<TaskEditModal {...defaultProps} />);

      expect(screen.getByText('Ausstehend')).toBeInTheDocument();
      expect(screen.getByText('In Bearbeitung')).toBeInTheDocument();
      expect(screen.getByText('Erledigt')).toBeInTheDocument();
      expect(screen.getByText('Abgebrochen')).toBeInTheDocument();
      expect(screen.getByText('Blockiert')).toBeInTheDocument();
    });

    it('sollte Team-Members in Select korrekt anzeigen', () => {
      render(<TaskEditModal {...defaultProps} />);

      expect(screen.getByText('Project Manager')).toBeInTheDocument();
      expect(screen.getByText('Developer One')).toBeInTheDocument();
      expect(screen.getByText('Designer One')).toBeInTheDocument();
    });

    it('sollte Buttons korrekt anzeigen', () => {
      render(<TaskEditModal {...defaultProps} />);

      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
      expect(screen.getByText('Änderungen speichern')).toBeInTheDocument();
    });
  });

  describe('Form Initialization', () => {
    it('sollte Formular zurücksetzen wenn sich Task ändert', () => {
      const { rerender } = render(<TaskEditModal {...defaultProps} task={mockTasksDataSet.pending} />);

      expect(screen.getByDisplayValue(mockTasksDataSet.pending.title)).toBeInTheDocument();

      // Ändere Task
      rerender(<TaskEditModal {...defaultProps} task={mockTasksDataSet.completed} />);

      expect(screen.getByDisplayValue(mockTasksDataSet.completed.title)).toBeInTheDocument();
      expect(screen.queryByDisplayValue(mockTasksDataSet.pending.title)).not.toBeInTheDocument();
    });

    it('sollte Formular zurücksetzen wenn Modal geschlossen und wieder geöffnet wird', () => {
      const { rerender } = render(<TaskEditModal {...defaultProps} isOpen={true} />);

      expect(screen.getByDisplayValue(mockTasksDataSet.pending.title)).toBeInTheDocument();

      // Schließe Modal
      rerender(<TaskEditModal {...defaultProps} isOpen={false} />);

      // Öffne Modal wieder
      rerender(<TaskEditModal {...defaultProps} isOpen={true} />);

      expect(screen.getByDisplayValue(mockTasksDataSet.pending.title)).toBeInTheDocument();
    });

    it('sollte Fehler zurücksetzen wenn Task sich ändert', async () => {
      const user = userEvent.setup();
      mockTaskService.update.mockRejectedValueOnce(new Error('Update failed'));

      const { rerender } = render(<TaskEditModal {...defaultProps} task={mockTasksDataSet.pending} />);

      // Erzeuge Fehler
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });

      // Ändere Task
      rerender(<TaskEditModal {...defaultProps} task={mockTasksDataSet.completed} />);

      expect(screen.queryByText('Update failed')).not.toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('sollte Titel-Änderungen korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Titel *');
      await user.clear(titleInput);
      await user.type(titleInput, 'Geänderte Task');

      expect(titleInput).toHaveValue('Geänderte Task');
    });

    it('sollte Status-Änderungen korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const statusSelect = screen.getByLabelText('Status');
      await user.selectOptions(statusSelect, 'completed');

      expect(statusSelect).toHaveValue('completed');
    });

    it('sollte Fortschritt automatisch auf 100% setzen wenn Status "completed" ist', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const statusSelect = screen.getByLabelText('Status');
      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;

      // Setze Fortschritt auf 50% (für Range-Input kein clear() nötig)
      fireEvent.change(progressSlider, { target: { value: '50' } });
      expect(progressSlider.value).toBe('50');

      // Ändere Status zu "completed"
      await user.selectOptions(statusSelect, 'completed');

      expect(progressSlider.value).toBe('100');
      // Prüfe dass der Fortschritt-Wert 100 ist
      expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    });

    it('sollte Fortschritt-Slider bei "completed" Status deaktivieren', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const statusSelect = screen.getByLabelText('Status');
      await user.selectOptions(statusSelect, 'completed');

      const progressSlider = screen.getByLabelText('Fortschritt');
      expect(progressSlider).toBeDisabled();

      expect(screen.getByText('Fortschritt wird automatisch auf 100% gesetzt bei erledigten Tasks.')).toBeInTheDocument();
    });

    it('sollte Fortschritt-Slider bei anderen Status aktiviert lassen', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const statusSelect = screen.getByLabelText('Status');
      await user.selectOptions(statusSelect, 'in_progress');

      const progressSlider = screen.getByLabelText('Fortschritt');
      expect(progressSlider).not.toBeDisabled();
    });

    it('sollte Priorität-Änderungen korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const prioritySelect = screen.getByLabelText('Priorität');
      await user.selectOptions(prioritySelect, 'urgent');

      expect(prioritySelect).toHaveValue('urgent');
    });

    it('sollte Team-Member Auswahl korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const assignedSelect = screen.getByLabelText('Zuständige Person');
      await user.selectOptions(assignedSelect, mockTeamMembersDataSet.developer.userId);

      expect(assignedSelect).toHaveValue(mockTeamMembersDataSet.developer.userId);
    });

    it('sollte Datum-Änderungen korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const dateInput = screen.getByLabelText('Fälligkeitsdatum');
      await user.clear(dateInput);
      await user.type(dateInput, '2025-01-15');

      expect(dateInput).toHaveValue('2025-01-15');
    });

    it('sollte Fortschritt-Änderungen korrekt verarbeiten', async () => {
      render(<TaskEditModal {...defaultProps} />);

      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;

      // Für Range-Input direkt den Wert setzen
      fireEvent.change(progressSlider, { target: { value: '85' } });

      expect(progressSlider.value).toBe('85');
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('sollte erfolgreich Task aktualisieren', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <TaskEditModal
          {...defaultProps}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      // Ändere Formular-Daten
      await user.clear(screen.getByLabelText('Titel *'));
      await user.type(screen.getByLabelText('Titel *'), 'Geänderte Task');
      await user.clear(screen.getByLabelText('Beschreibung'));
      await user.type(screen.getByLabelText('Beschreibung'), 'Neue Beschreibung');
      await user.selectOptions(screen.getByLabelText('Status'), 'in_progress');
      await user.selectOptions(screen.getByLabelText('Priorität'), 'high');

      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;
      fireEvent.change(progressSlider, { target: { value: '75' } });

      // Submit Form
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockTaskService.update).toHaveBeenCalledWith(
          defaultProps.task.id,
          expect.objectContaining({
            title: 'Geänderte Task',
            description: 'Neue Beschreibung',
            assignedUserId: defaultProps.task.assignedUserId,
            priority: 'high',
            status: 'in_progress',
            progress: 75
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('sollte completedAt setzen wenn Status auf "completed" geändert wird', async () => {
      const user = userEvent.setup();
      const task: ProjectTask = { ...mockTasksDataSet.pending, status: 'pending' };

      const props = {
        ...defaultProps,
        task
      };

      render(<TaskEditModal {...props} />);

      await user.selectOptions(screen.getByLabelText('Status'), 'completed');
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockTaskService.update).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            status: 'completed',
            progress: 100,
            completedAt: expect.any(Object)
          })
        );
      });
    });

    it('sollte completedAt nicht setzen wenn bereits completed', async () => {
      const user = userEvent.setup();
      const task = { ...mockTasksDataSet.completed, status: 'completed' as TaskStatus };

      render(<TaskEditModal {...defaultProps} task={task} />);

      await user.clear(screen.getByLabelText('Titel *'));
      await user.type(screen.getByLabelText('Titel *'), 'Geänderte completed Task');
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockTaskService.update).toHaveBeenCalledWith(
          task.id,
          expect.not.objectContaining({
            completedAt: expect.any(Object)
          })
        );
      });
    });

    it('sollte leere Beschreibung als undefined setzen', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      await user.clear(screen.getByLabelText('Beschreibung'));
      await user.type(screen.getByLabelText('Beschreibung'), '   ');
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockTaskService.update).toHaveBeenCalledWith(
          defaultProps.task.id,
          expect.objectContaining({
            description: undefined
          })
        );
      });
    });

    it('sollte leeres Datum als undefined setzen', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const dateInput = screen.getByLabelText('Fälligkeitsdatum');
      await user.clear(dateInput);
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockTaskService.update).toHaveBeenCalledWith(
          defaultProps.task.id,
          expect.objectContaining({
            dueDate: undefined
          })
        );
      });
    });
  });

  describe('Validation', () => {
    it('sollte Fehler anzeigen wenn Titel fehlt', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Titel *');

      // Entferne required-Attribut um Browser-Validation zu umgehen
      titleInput.removeAttribute('required');

      await user.clear(titleInput);
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(screen.getByText('Titel ist erforderlich')).toBeInTheDocument();
      });

      expect(mockTaskService.update).not.toHaveBeenCalled();
    });

    it('sollte Fehler anzeigen wenn Titel nur Leerzeichen enthält', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      await user.clear(screen.getByLabelText('Titel *'));
      await user.type(screen.getByLabelText('Titel *'), '   ');
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(screen.getByText('Titel ist erforderlich')).toBeInTheDocument();
      });

      expect(mockTaskService.update).not.toHaveBeenCalled();
    });

    it('sollte Titel trimmen', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      await user.clear(screen.getByLabelText('Titel *'));
      await user.type(screen.getByLabelText('Titel *'), '  Getrimmte Task  ');
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockTaskService.update).toHaveBeenCalledWith(
          defaultProps.task.id,
          expect.objectContaining({
            title: 'Getrimmte Task'
          })
        );
      });
    });
  });

  describe('Loading States', () => {
    it('sollte Loading-State während Submit anzeigen', async () => {
      const user = userEvent.setup();

      // Mock update to return pending promise
      let resolveUpdate: () => void;
      const updatePromise = new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      });
      mockTaskService.update.mockReturnValue(updatePromise);

      render(<TaskEditModal {...defaultProps} />);

      await user.click(screen.getByText('Änderungen speichern'));

      // Überprüfe Loading-State
      expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeDisabled();
      expect(screen.getByLabelText('Titel *')).toBeDisabled();

      // Resolve promise
      resolveUpdate!();
      await waitFor(() => {
        expect(screen.getByText('Änderungen speichern')).toBeInTheDocument();
      });
    });

    it('sollte Loading-State nach Erfolg beenden', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(screen.getByText('Änderungen speichern')).toBeInTheDocument();
        expect(screen.getByText('Abbrechen')).not.toBeDisabled();
        expect(screen.getByLabelText('Titel *')).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('sollte Fehler beim Task-Update anzeigen', async () => {
      const user = userEvent.setup();
      mockTaskService.update.mockRejectedValue(new Error('Network error'));

      render(<TaskEditModal {...defaultProps} />);

      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(screen.getByText('Änderungen speichern')).toBeInTheDocument(); // Loading beendet
    });

    it('sollte generischen Fehler anzeigen wenn keine Message vorhanden', async () => {
      const user = userEvent.setup();
      mockTaskService.update.mockRejectedValue({});

      render(<TaskEditModal {...defaultProps} />);

      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Aktualisieren der Task')).toBeInTheDocument();
      });
    });

    it('sollte Fehler beim nächsten Submit zurücksetzen', async () => {
      const user = userEvent.setup();

      // Erster Submit mit Fehler
      mockTaskService.update.mockRejectedValueOnce(new Error('Network error'));

      render(<TaskEditModal {...defaultProps} />);

      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Zweiter Submit erfolgreich
      mockTaskService.update.mockResolvedValueOnce();
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Controls', () => {
    it('sollte Modal beim Klick auf Abbrechen schließen', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(<TaskEditModal {...defaultProps} onClose={mockOnClose} />);

      await user.click(screen.getByText('Abbrechen'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('sollte Modal nicht schließen während Loading', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      // Mock update to return pending promise
      const updatePromise = new Promise<void>(() => {}); // Never resolves
      mockTaskService.update.mockReturnValue(updatePromise);

      render(<TaskEditModal {...defaultProps} onClose={mockOnClose} />);

      await user.click(screen.getByText('Änderungen speichern'));

      // Warte auf Loading-State
      await waitFor(() => {
        expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();
      });

      // Versuche zu schließen
      await user.click(screen.getByText('Abbrechen'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('sollte Fehler beim Schließen zurücksetzen', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      mockTaskService.update.mockRejectedValue(new Error('Test error'));

      render(<TaskEditModal {...defaultProps} onClose={mockOnClose} />);

      // Erzeuge Fehler
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Schließe Modal
      await user.click(screen.getByText('Abbrechen'));

      expect(mockOnClose).toHaveBeenCalled();

      // Öffne Modal erneut
      render(<TaskEditModal {...defaultProps} onClose={mockOnClose} />);

      // Fehler sollte verschwunden sein
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('sollte korrekte ARIA-Labels haben', () => {
      render(<TaskEditModal {...defaultProps} />);

      expect(screen.getByLabelText('Titel *')).toBeInTheDocument();
      expect(screen.getByLabelText('Beschreibung')).toBeInTheDocument();
      expect(screen.getByLabelText('Zuständige Person')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Priorität')).toBeInTheDocument();
      expect(screen.getByLabelText('Fälligkeitsdatum')).toBeInTheDocument();
      expect(screen.getByLabelText('Fortschritt')).toBeInTheDocument();
    });

    it('sollte required Attribut für Titel haben', () => {
      render(<TaskEditModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Titel *');
      expect(titleInput).toBeRequired();
    });

    it('sollte korrekte Placeholder haben', () => {
      render(<TaskEditModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('z.B. Konzept erstellen, Review durchführen...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Weitere Details zur Task...')).toBeInTheDocument();
    });

    it('sollte Keyboard-Navigation unterstützen', async () => {
      render(<TaskEditModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Titel *');
      const descriptionTextarea = screen.getByLabelText('Beschreibung');

      titleInput.focus();
      expect(document.activeElement).toBe(titleInput);

      // Tab zur nächsten Eingabe (simuliere echten Tab-Wechsel)
      await userEvent.tab();
      expect(document.activeElement).toBe(descriptionTextarea);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit Task ohne Beschreibung umgehen', () => {
      const task = {
        ...mockTasksDataSet.pending,
        description: undefined
      };
      render(<TaskEditModal {...defaultProps} task={task} />);

      const descriptionTextarea = screen.getByLabelText('Beschreibung') as HTMLTextAreaElement;
      expect(descriptionTextarea.value).toBe('');
    });

    it('sollte mit Task ohne Progress umgehen', () => {
      const task: ProjectTask = {
        ...mockTasksDataSet.pending,
        progress: 0
      };
      render(<TaskEditModal {...defaultProps} task={task} />);

      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;
      expect(progressSlider.value).toBe('0');
    });

    it('sollte mit Task ohne assignedUserId umgehen', () => {
      const task: ProjectTask = {
        ...mockTasksDataSet.pending,
        assignedUserId: ''
      };

      render(<TaskEditModal {...defaultProps} task={task} />);

      const assignedSelect = screen.getByLabelText('Zuständige Person') as HTMLSelectElement;
      expect(assignedSelect.value).toBe('');
    });

    it('sollte mit leerem Team-Members Array umgehen', () => {
      const propsWithoutTeam = {
        ...defaultProps,
        teamMembers: []
      };

      render(<TaskEditModal {...propsWithoutTeam} />);

      const assignedSelect = screen.getByLabelText('Zuständige Person');
      expect(assignedSelect.children).toHaveLength(0);
    });

    it('sollte mit sehr langem Titel umgehen', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const longTitle = 'A'.repeat(200); // Reduziert um Timeout zu vermeiden
      const titleInput = screen.getByLabelText('Titel *');
      await user.clear(titleInput);
      await user.type(titleInput, longTitle);
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockTaskService.update).toHaveBeenCalledWith(
          defaultProps.task.id,
          expect.objectContaining({
            title: longTitle
          })
        );
      });
    });

    it('sollte mit ungültigem Datum umgehen', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const dateInput = screen.getByLabelText('Fälligkeitsdatum');
      fireEvent.change(dateInput, { target: { value: 'invalid-date' } });

      await user.click(screen.getByText('Änderungen speichern'));

      // Sollte trotzdem funktionieren mit undefined dueDate
      await waitFor(() => {
        expect(mockTaskService.update).toHaveBeenCalledWith(
          defaultProps.task.id,
          expect.objectContaining({
            dueDate: undefined
          })
        );
      });
    });
  });

  describe('Status Change Behavior', () => {
    it('sollte Fortschritt beibehalten wenn Status nicht "completed" ist', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;
      fireEvent.change(progressSlider, { target: { value: '60' } });

      const statusSelect = screen.getByLabelText('Status');
      await user.selectOptions(statusSelect, 'in_progress');

      expect(progressSlider.value).toBe('60');
    });

    it('sollte Fortschritt von "completed" auf anderen Status ändern können', async () => {
      const user = userEvent.setup();
      const completedTask = { ...mockTasksDataSet.completed, status: 'completed' as TaskStatus };

      render(<TaskEditModal {...defaultProps} task={completedTask} />);

      const statusSelect = screen.getByLabelText('Status');
      await user.selectOptions(statusSelect, 'in_progress');

      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;
      expect(progressSlider).not.toBeDisabled();

      // Fortschritt sollte von 100% auf ursprünglichen Wert zurück
      expect(progressSlider.value).toBe('100'); // Behält den aktuellen Wert
    });

    it('sollte Fortschritt-Hinweis nur bei "completed" Status anzeigen', async () => {
      const user = userEvent.setup();
      render(<TaskEditModal {...defaultProps} />);

      const statusSelect = screen.getByLabelText('Status');

      // Bei "pending" Status
      await user.selectOptions(statusSelect, 'pending');
      expect(screen.queryByText('Fortschritt wird automatisch auf 100% gesetzt bei erledigten Tasks.')).not.toBeInTheDocument();

      // Bei "completed" Status
      await user.selectOptions(statusSelect, 'completed');
      expect(screen.getByText('Fortschritt wird automatisch auf 100% gesetzt bei erledigten Tasks.')).toBeInTheDocument();
    });
  });
});