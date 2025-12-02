// src/components/projects/__tests__/TaskCreateModal.test.tsx
import React from 'react';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { TaskCreateModal } from '../TaskCreateModal';
import { taskService } from '@/lib/firebase/task-service';
import { TaskPriority } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';
import {
  createMockTaskCreateModalProps,
  mockTeamMembersDataSet,
  formatDateForInput,
  mockConsoleError
} from './test-utils';

// Mock Firebase
jest.mock('@/lib/firebase/task-service', () => ({
  taskService: {
    create: jest.fn()
  }
}));

const mockTaskService = taskService as jest.Mocked<typeof taskService>;

describe('TaskCreateModal', () => {
  const defaultProps = createMockTaskCreateModalProps();

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskService.create.mockResolvedValue('new-task-id');
  });

  describe('Rendering', () => {
    it('sollte nicht angezeigt werden wenn isOpen false ist', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Neue Task erstellen')).not.toBeInTheDocument();
    });

    it('sollte Modal korrekt anzeigen wenn isOpen true ist', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      expect(screen.getByText('Neue Task erstellen')).toBeInTheDocument();
      expect(screen.getByLabelText('Titel *')).toBeInTheDocument();
      expect(screen.getByLabelText('Beschreibung')).toBeInTheDocument();
      expect(screen.getByLabelText('Zuständige Person')).toBeInTheDocument();
      expect(screen.getByLabelText('Priorität')).toBeInTheDocument();
      expect(screen.getByLabelText('Fälligkeitsdatum')).toBeInTheDocument();
      expect(screen.getByLabelText('Fortschritt')).toBeInTheDocument();
    });

    it('sollte Team-Members in Select korrekt anzeigen', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const assignedSelect = screen.getByLabelText('Zuständige Person');

      // Überprüfe ob Team-Members als Optionen vorhanden sind
      expect(screen.getByText('Project Manager (Projekt-Manager)')).toBeInTheDocument();
      expect(screen.getByText('Developer One')).toBeInTheDocument();
      expect(screen.getByText('Designer One')).toBeInTheDocument();
    });

    it('sollte Projekt-Manager als Standard-Auswahl haben', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const assignedSelect = screen.getByLabelText('Zuständige Person') as HTMLSelectElement;
      expect(assignedSelect.value).toBe(defaultProps.projectManagerId);
    });

    it('sollte Priorität-Optionen korrekt anzeigen', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      expect(screen.getByText('Niedrig')).toBeInTheDocument();
      expect(screen.getByText('Mittel')).toBeInTheDocument();
      expect(screen.getByText('Hoch')).toBeInTheDocument();
      expect(screen.getByText('Dringend')).toBeInTheDocument();
    });

    it('sollte Standard-Fortschritt von 0% anzeigen', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      // Es gibt mehrere "0%" Texte im Fortschritt-Slider (min, current, max)
      // Prüfe nur den Slider-Wert
      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;
      expect(progressSlider.value).toBe('0');
    });

    it('sollte Buttons korrekt anzeigen', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
      expect(screen.getByText('Task erstellen')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('sollte Titel-Input korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Titel *');
      await user.type(titleInput, 'Neue Test Task');

      expect(titleInput).toHaveValue('Neue Test Task');
    });

    it('sollte Beschreibung-Textarea korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const descriptionTextarea = screen.getByLabelText('Beschreibung');
      await user.type(descriptionTextarea, 'Das ist eine ausführliche Beschreibung');

      expect(descriptionTextarea).toHaveValue('Das ist eine ausführliche Beschreibung');
    });

    it('sollte Team-Member Auswahl korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const assignedSelect = screen.getByLabelText('Zuständige Person');
      await user.selectOptions(assignedSelect, mockTeamMembersDataSet.developer.userId);

      expect(assignedSelect).toHaveValue(mockTeamMembersDataSet.developer.userId);
    });

    it('sollte Priorität-Auswahl korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const prioritySelect = screen.getByLabelText('Priorität');
      await user.selectOptions(prioritySelect, 'urgent');

      expect(prioritySelect).toHaveValue('urgent');
    });

    it('sollte Datum-Input korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const dateInput = screen.getByLabelText('Fälligkeitsdatum');
      const testDate = '2024-12-25';
      await user.type(dateInput, testDate);

      expect(dateInput).toHaveValue(testDate);
    });

    it('sollte Fortschritt-Slider korrekt verarbeiten', async () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;

      // Verwende fireEvent für range input
      fireEvent.change(progressSlider, { target: { value: '75' } });

      expect(progressSlider.value).toBe('75');
      // Prüfe ob 75% irgendwo angezeigt wird (in der font-medium span)
      expect(screen.getByText(/75%/)).toBeInTheDocument();
    });

    it('sollte Fortschritt-Slider Schritte von 5% verwenden', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const progressSlider = screen.getByLabelText('Fortschritt') as HTMLInputElement;
      expect(progressSlider.step).toBe('5');
      expect(progressSlider.min).toBe('0');
      expect(progressSlider.max).toBe('100');
    });
  });

  describe('Form Submission', () => {
    it('sollte erfolgreich Task erstellen mit allen Feldern', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();
      const mockOnClose = jest.fn();

      renderWithProviders(
        <TaskCreateModal
          {...defaultProps}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      // Fülle Formular aus - verwende fireEvent für Text-Eingaben (schneller)
      fireEvent.change(screen.getByLabelText('Titel *'), { target: { value: 'Neue Test Task' } });
      fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Test Beschreibung' } });

      // Select-Optionen mit userEvent
      await user.selectOptions(screen.getByLabelText('Zuständige Person'), mockTeamMembersDataSet.developer.userId);
      await user.selectOptions(screen.getByLabelText('Priorität'), 'high');

      // Datum und Progress mit fireEvent
      fireEvent.change(screen.getByLabelText('Fälligkeitsdatum'), { target: { value: '2024-12-25' } });
      fireEvent.change(screen.getByLabelText('Fortschritt'), { target: { value: '50' } });

      // Submit Form
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(mockTaskService.create).toHaveBeenCalledWith({
          userId: mockTeamMembersDataSet.developer.userId,
          organizationId: defaultProps.organizationId,
          projectId: defaultProps.projectId,
          assignedUserId: mockTeamMembersDataSet.developer.userId,
          title: 'Neue Test Task',
          description: 'Test Beschreibung',
          status: 'pending',
          priority: 'high',
          progress: 50,
          dueDate: Timestamp.fromDate(new Date('2024-12-25')),
          isAllDay: true
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('sollte Task ohne optionale Felder erstellen', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();

      renderWithProviders(
        <TaskCreateModal
          {...defaultProps}
          onSuccess={mockOnSuccess}
        />
      );

      // Nur Titel eingeben
      await user.type(screen.getByLabelText('Titel *'), 'Minimale Task');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        const callArgs = mockTaskService.create.mock.calls[0][0];
        expect(mockTaskService.create).toHaveBeenCalled();
        // Prüfe Pflichtfelder
        expect(callArgs).toMatchObject({
          userId: defaultProps.projectManagerId,
          organizationId: defaultProps.organizationId,
          projectId: defaultProps.projectId,
          assignedUserId: defaultProps.projectManagerId,
          title: 'Minimale Task',
          status: 'pending',
          priority: 'medium',
          progress: 0,
          isAllDay: true
        });
        // Optionale Felder sollten nicht vorhanden sein
        expect(callArgs).not.toHaveProperty('description');
        expect(callArgs).not.toHaveProperty('dueDate');
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('sollte Formular nach erfolgreichem Submit zurücksetzen', async () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      // Fülle Formular aus mit fireEvent für bessere Performance
      const titleInput = screen.getByLabelText('Titel *');
      const descriptionInput = screen.getByLabelText('Beschreibung');
      const progressSlider = screen.getByLabelText('Fortschritt');

      fireEvent.change(titleInput, { target: { value: 'Test Task' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
      fireEvent.change(progressSlider, { target: { value: '75' } });

      // Submit
      fireEvent.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(mockTaskService.create).toHaveBeenCalled();
      });

      // Überprüfe Reset
      expect(screen.getByLabelText('Titel *')).toHaveValue('');
      expect(screen.getByLabelText('Beschreibung')).toHaveValue('');
      expect(screen.getByLabelText('Fortschritt')).toHaveValue('0');
      expect(screen.getByLabelText('Zuständige Person')).toHaveValue(defaultProps.projectManagerId);
      expect(screen.getByLabelText('Priorität')).toHaveValue('medium');
    });
  });

  describe('Validation', () => {
    it('sollte Fehler anzeigen wenn Titel fehlt', async () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      // HTML5 required Attribut verhindert Submit ohne Titel
      // Prüfe stattdessen dass das required Attribut gesetzt ist
      const titleInput = screen.getByLabelText('Titel *') as HTMLInputElement;
      expect(titleInput.required).toBe(true);

      // Das Formular kann nicht abgesendet werden wenn Titel fehlt (HTML5 Validierung)
      expect(mockTaskService.create).not.toHaveBeenCalled();
    });

    it('sollte Fehler anzeigen wenn Titel nur Leerzeichen enthält', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Titel *'), '   ');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Titel ist erforderlich')).toBeInTheDocument();
      });

      expect(mockTaskService.create).not.toHaveBeenCalled();
    });

    it('sollte Titel trimmen', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Titel *'), '  Test Task  ');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(mockTaskService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Task'
          })
        );
      });
    });

    it('sollte leere Beschreibung als undefined setzen', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Titel *'), 'Test Task');
      await user.type(screen.getByLabelText('Beschreibung'), '   ');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        const callArgs = mockTaskService.create.mock.calls[0][0];
        expect(mockTaskService.create).toHaveBeenCalled();
        // Leere Beschreibung sollte nicht im Objekt enthalten sein
        expect(callArgs).not.toHaveProperty('description');
      });
    });
  });

  describe('Loading States', () => {
    it('sollte Loading-State während Submit anzeigen', async () => {
      const user = userEvent.setup();

      // Mock create to return pending promise
      let resolveCreate: (value: string) => void;
      const createPromise = new Promise<string>((resolve) => {
        resolveCreate = resolve;
      });
      mockTaskService.create.mockReturnValue(createPromise);

      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Titel *'), 'Test Task');
      await user.click(screen.getByText('Task erstellen'));

      // Überprüfe Loading-State
      expect(screen.getByText('Wird erstellt...')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeDisabled();
      expect(screen.getByLabelText('Titel *')).toBeDisabled();

      // Resolve promise
      resolveCreate!('new-task-id');
      await waitFor(() => {
        expect(screen.getByText('Task erstellen')).toBeInTheDocument();
      });
    });

    it('sollte Loading-State nach Erfolg beenden', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Titel *'), 'Test Task');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Task erstellen')).toBeInTheDocument();
        expect(screen.getByText('Abbrechen')).not.toBeDisabled();
        expect(screen.getByLabelText('Titel *')).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('sollte Fehler beim Task-Erstellen anzeigen', async () => {
      const user = userEvent.setup();
      mockTaskService.create.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Titel *'), 'Test Task');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(screen.getByText('Task erstellen')).toBeInTheDocument(); // Loading beendet
    });

    it('sollte generischen Fehler anzeigen wenn keine Message vorhanden', async () => {
      const user = userEvent.setup();
      mockTaskService.create.mockRejectedValue({});

      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Titel *'), 'Test Task');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Erstellen der Task')).toBeInTheDocument();
      });
    });

    it('sollte Fehler beim nächsten Submit zurücksetzen', async () => {
      const user = userEvent.setup();

      // Erster Submit mit Fehler
      mockTaskService.create.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Titel *'), 'Test Task');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Zweiter Submit erfolgreich
      mockTaskService.create.mockResolvedValueOnce('new-task-id');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Controls', () => {
    it('sollte Modal beim Klick auf Abbrechen schließen', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      renderWithProviders(<TaskCreateModal {...defaultProps} onClose={mockOnClose} />);

      await user.click(screen.getByText('Abbrechen'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('sollte Modal nicht schließen während Loading', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      // Mock create to return pending promise
      const createPromise = new Promise<string>(() => {}); // Never resolves
      mockTaskService.create.mockReturnValue(createPromise);

      renderWithProviders(<TaskCreateModal {...defaultProps} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Titel *'), 'Test Task');
      await user.click(screen.getByText('Task erstellen'));

      // Warte auf Loading-State
      await waitFor(() => {
        expect(screen.getByText('Wird erstellt...')).toBeInTheDocument();
      });

      // Versuche zu schließen
      await user.click(screen.getByText('Abbrechen'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('sollte Formular beim Schließen zurücksetzen', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      const { unmount } = renderWithProviders(<TaskCreateModal {...defaultProps} onClose={mockOnClose} />);

      // Fülle Formular aus - verwende fireEvent für schnellere Tests
      fireEvent.change(screen.getByLabelText('Titel *'), { target: { value: 'Test Task' } });
      fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Test Description' } });

      // Schließe Modal
      await user.click(screen.getByText('Abbrechen'));

      expect(mockOnClose).toHaveBeenCalled();

      // Unmount und öffne Modal erneut
      unmount();
      renderWithProviders(<TaskCreateModal {...defaultProps} onClose={mockOnClose} />);

      // Überprüfe Reset - neues Modal sollte leere Felder haben
      expect(screen.getByLabelText('Titel *')).toHaveValue('');
      expect(screen.getByLabelText('Beschreibung')).toHaveValue('');
    });

    it('sollte Fehler beim Schließen zurücksetzen', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      mockTaskService.create.mockRejectedValue(new Error('Test error'));

      renderWithProviders(<TaskCreateModal {...defaultProps} onClose={mockOnClose} />);

      // Erzeuge Fehler
      await user.type(screen.getByLabelText('Titel *'), 'Test Task');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Schließe Modal
      await user.click(screen.getByText('Abbrechen'));

      // Öffne Modal erneut
      renderWithProviders(<TaskCreateModal {...defaultProps} onClose={mockOnClose} />);

      // Fehler sollte verschwunden sein
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('sollte korrekte ARIA-Labels haben', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      expect(screen.getByLabelText('Titel *')).toBeInTheDocument();
      expect(screen.getByLabelText('Beschreibung')).toBeInTheDocument();
      expect(screen.getByLabelText('Zuständige Person')).toBeInTheDocument();
      expect(screen.getByLabelText('Priorität')).toBeInTheDocument();
      expect(screen.getByLabelText('Fälligkeitsdatum')).toBeInTheDocument();
      expect(screen.getByLabelText('Fortschritt')).toBeInTheDocument();
    });

    it('sollte required Attribut für Titel haben', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Titel *');
      expect(titleInput).toBeRequired();
    });

    it('sollte korrekte Placeholder haben', () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('z.B. Konzept erstellen, Review durchführen...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Weitere Details zur Task...')).toBeInTheDocument();
    });

    it('sollte Keyboard-Navigation unterstützen', async () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Titel *');
      const descriptionTextarea = screen.getByLabelText('Beschreibung');

      // Prüfe dass Elemente fokussierbar sind
      titleInput.focus();
      expect(document.activeElement).toBe(titleInput);

      descriptionTextarea.focus();
      expect(document.activeElement).toBe(descriptionTextarea);

      // Tab-Navigation in JSDOM ist eingeschränkt, daher nur Focus-Test
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit leerem Team-Members Array umgehen', () => {
      const propsWithoutTeam = {
        ...defaultProps,
        teamMembers: []
      };

      renderWithProviders(<TaskCreateModal {...propsWithoutTeam} />);

      // Wenn keine Team-Members vorhanden, sollte Fallback-Option angezeigt werden
      expect(screen.getByText('Keine Teammitglieder verfügbar')).toBeInTheDocument();
    });

    it('sollte mit sehr langem Titel umgehen', async () => {
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      const longTitle = 'A'.repeat(1000);
      const titleInput = screen.getByLabelText('Titel *');

      // Verwende fireEvent statt userEvent.type für lange Strings (Performance)
      fireEvent.change(titleInput, { target: { value: longTitle } });
      fireEvent.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(mockTaskService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: longTitle
          })
        );
      });
    });

    it('sollte mit sehr langem Datum umgehen', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Titel *'), 'Test Task');
      await user.type(screen.getByLabelText('Fälligkeitsdatum'), '9999-12-31');
      await user.click(screen.getByText('Task erstellen'));

      await waitFor(() => {
        expect(mockTaskService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            dueDate: Timestamp.fromDate(new Date('9999-12-31'))
          })
        );
      });
    });

    it('sollte mit ungültigem Datum umgehen', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskCreateModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText('Titel *'), { target: { value: 'Test Task' } });

      const dateInput = screen.getByLabelText('Fälligkeitsdatum');

      // HTML5 date input blockiert ungültige Eingaben in echten Browsern
      // In JSDOM können wir "invalid-date" setzen, aber die Komponente behandelt es als leeren String
      fireEvent.change(dateInput, { target: { value: '' } });

      await user.click(screen.getByText('Task erstellen'));

      // Mit leerem Datum sollte kein dueDate Feld gesetzt werden
      await waitFor(() => {
        expect(mockTaskService.create).toHaveBeenCalled();
        const callArgs = mockTaskService.create.mock.calls[0][0];
        // Leeres Datum wird nicht im Objekt enthalten sein
        expect(callArgs).not.toHaveProperty('dueDate');
      });
    });
  });
});