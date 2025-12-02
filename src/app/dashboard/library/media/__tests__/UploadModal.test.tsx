// src/app/dashboard/library/media/__tests__/UploadModal.test.tsx
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/test-utils';
import UploadModal from '../UploadModal';
import { useUploadMediaAsset } from '@/lib/hooks/useMediaData';
import { toastService } from '@/lib/utils/toast';

// Mock dependencies
jest.mock('@/lib/hooks/useMediaData');
jest.mock('@/lib/utils/toast');

const mockUseUploadMediaAsset = useUploadMediaAsset as jest.MockedFunction<typeof useUploadMediaAsset>;
const mockToastSuccess = toastService.success as jest.MockedFunction<typeof toastService.success>;
const mockToastError = toastService.error as jest.MockedFunction<typeof toastService.error>;
const mockToastWarning = toastService.warning as jest.MockedFunction<typeof toastService.warning>;

describe('UploadModal', () => {
  const mockOnClose = jest.fn();
  const mockOnUploadSuccess = jest.fn();
  const mockMutateAsync = jest.fn();

  const defaultProps = {
    onClose: mockOnClose,
    onUploadSuccess: mockOnUploadSuccess,
    organizationId: 'test-org-123',
    userId: 'test-user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup upload mutation mock
    mockUseUploadMediaAsset.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      data: undefined,
      error: null,
      reset: jest.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    } as any);

    mockMutateAsync.mockResolvedValue({
      id: 'mock-asset-id',
      fileName: 'test.jpg',
    });

    mockOnUploadSuccess.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('sollte Modal mit Titel rendern', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      expect(screen.getByText('Medien hochladen')).toBeInTheDocument();
    });

    it('sollte Datei-Auswahl-Bereich anzeigen', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      // Verwende getAllByText da "Dateien auswählen" mehrfach vorkommt (Label + Span)
      expect(screen.getAllByText('Dateien auswählen').length).toBeGreaterThan(0);
      expect(screen.getByText(/Unterstützte Formate/)).toBeInTheDocument();
      // Verwende file-upload ID statt Label-Text
      expect(screen.getByLabelText('Dateien auswählen')).toBeInTheDocument();
    });

    it('sollte Upload-Button initial disabled sein', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const uploadButton = screen.getByRole('button', { name: /hochladen/i });
      expect(uploadButton).toBeDisabled();
    });

    it('sollte Abbrechen-Button anzeigen', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).not.toBeDisabled();
    });

    it('sollte Zielordner-Info anzeigen wenn currentFolderId vorhanden', () => {
      renderWithProviders(
        <UploadModal
          {...defaultProps}
          currentFolderId="folder-123"
          folderName="Test Ordner"
        />
      );

      expect(screen.getByText(/Dateien werden hochgeladen nach:/)).toBeInTheDocument();
      expect(screen.getByText('Test Ordner')).toBeInTheDocument();
    });
  });

  describe('Datei-Auswahl', () => {
    it('sollte Dateien über File Input auswählen können', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText(/Ausgewählte Dateien \(1\)/)).toBeInTheDocument();
    });

    it('sollte mehrere Dateien auswählen können', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.png', { type: 'image/png' }),
        new File(['test3'], 'test3.pdf', { type: 'application/pdf' }),
      ];

      fireEvent.change(fileInput, { target: { files } });

      expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      expect(screen.getByText('test2.png')).toBeInTheDocument();
      expect(screen.getByText('test3.pdf')).toBeInTheDocument();
      expect(screen.getByText(/Ausgewählte Dateien \(3\)/)).toBeInTheDocument();
    });

    it('sollte Datei-Größe korrekt anzeigen', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['a'.repeat(1024)], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Datei-Größe wird mehrfach angezeigt (Datei-Liste + Summary)
      const sizeElements = screen.getAllByText(/1 KB/);
      expect(sizeElements.length).toBeGreaterThan(0);
      expect(sizeElements[0]).toBeInTheDocument();
    });

    it('sollte Upload-Summary anzeigen nach Datei-Auswahl', () => {
      renderWithProviders(<UploadModal {...defaultProps} folderName="Test Ordner" />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('Upload-Zusammenfassung:')).toBeInTheDocument();
      expect(screen.getByText(/Dateien:/)).toBeInTheDocument();
      expect(screen.getByText(/Zielordner:/)).toBeInTheDocument();
      expect(screen.getByText(/Gesamtgröße:/)).toBeInTheDocument();
    });
  });

  describe('Drag & Drop', () => {
    it('sollte Dateien per Drag & Drop akzeptieren', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      // Finde Drop-Zone über "oder per Drag & Drop" Text
      const dropZone = screen.getByText(/oder per Drag & Drop/).closest('div')?.parentElement?.parentElement;
      expect(dropZone).toBeInTheDocument();

      const file = new File(['test'], 'dropped.jpg', { type: 'image/jpeg' });
      const dataTransfer = {
        files: [file],
      };

      fireEvent.drop(dropZone!, { dataTransfer });

      expect(screen.getByText('dropped.jpg')).toBeInTheDocument();
    });

    it('sollte dragOver Event behandeln', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      // Finde Drop-Zone über "oder per Drag & Drop" Text
      const dropZone = screen.getByText(/oder per Drag & Drop/).closest('div')?.parentElement?.parentElement;
      expect(dropZone).toBeInTheDocument();

      // Simuliere dragOver Event
      fireEvent.dragOver(dropZone!, {
        dataTransfer: { files: [] }
      });

      // Kein Error sollte geworfen werden
      expect(true).toBe(true);
    });
  });

  describe('Datei-Verwaltung', () => {
    it('sollte Datei entfernen können', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      fireEvent.change(fileInput, { target: { files } });

      expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      expect(screen.getByText('test2.jpg')).toBeInTheDocument();

      // Finde alle Remove-Buttons
      const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
        btn => btn.querySelector('svg')
      );

      // Klicke ersten Remove-Button
      fireEvent.click(removeButtons[0]);

      expect(screen.queryByText('test1.jpg')).not.toBeInTheDocument();
      expect(screen.getByText('test2.jpg')).toBeInTheDocument();
      expect(screen.getByText(/Ausgewählte Dateien \(1\)/)).toBeInTheDocument();
    });

    it('sollte Upload-Button enablen wenn Dateien ausgewählt', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /1 Datei\(en\) hochladen/i });
      expect(uploadButton).not.toBeDisabled();
    });
  });

  describe('Upload-Funktionalität', () => {
    it('sollte einzelne Datei erfolgreich hochladen', async () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /1 Datei\(en\) hochladen/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          file,
          organizationId: 'test-org-123',
          folderId: undefined,
          onProgress: expect.any(Function),
          context: { userId: 'test-user-123' },
        });
      });

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('1 Datei erfolgreich hochgeladen');
        expect(mockOnUploadSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('sollte mehrere Dateien in Batches hochladen', async () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const files = Array.from({ length: 7 }, (_, i) =>
        new File([`test${i}`], `test${i}.jpg`, { type: 'image/jpeg' })
      );

      fireEvent.change(fileInput, { target: { files } });

      const uploadButton = screen.getByRole('button', { name: /7 Datei\(en\) hochladen/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(7);
      });

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('7 Dateien erfolgreich hochgeladen');
      });
    });

    it('sollte Upload mit currentFolderId durchführen', async () => {
      renderWithProviders(
        <UploadModal
          {...defaultProps}
          currentFolderId="folder-123"
          folderName="Test Ordner"
        />
      );

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /1 Datei\(en\) hochladen/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          file,
          organizationId: 'test-org-123',
          folderId: 'folder-123',
          onProgress: expect.any(Function),
          context: { userId: 'test-user-123' },
        });
      });
    });

    it('sollte Upload-Progress anzeigen während Upload', async () => {
      let progressCallback: ((progress: number) => void) | undefined;

      mockMutateAsync.mockImplementation(async ({ onProgress }) => {
        progressCallback = onProgress;
        // Simuliere langsamen Upload
        await new Promise(resolve => setTimeout(resolve, 100));
        return { id: 'mock-id', fileName: 'test.jpg' };
      });

      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /1 Datei\(en\) hochladen/i });
      fireEvent.click(uploadButton);

      // Simuliere Progress-Update
      await waitFor(() => expect(progressCallback).toBeDefined());

      if (progressCallback) {
        progressCallback(50);
      }

      await waitFor(() => {
        expect(screen.getByText('50% hochgeladen')).toBeInTheDocument();
      });
    });

    it('sollte Buttons während Upload disablen', async () => {
      mockMutateAsync.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { id: 'mock-id', fileName: 'test.jpg' };
      });

      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /1 Datei\(en\) hochladen/i });
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });

      fireEvent.click(uploadButton);

      // Während Upload sollten Buttons disabled sein
      await waitFor(() => {
        expect(uploadButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte Fehler beim Upload behandeln', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Upload failed'));

      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /1 Datei\(en\) hochladen/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        // Promise.allSettled fängt Fehler ab - zeigt "Alle Uploads fehlgeschlagen"
        expect(mockToastError).toHaveBeenCalledWith(
          'Alle Uploads fehlgeschlagen (1 Dateien)'
        );
      }, { timeout: 3000 });

      // Warte einen Moment um sicherzustellen dass alle Callbacks abgeschlossen sind
      await waitFor(() => {
        // Modal sollte offen bleiben (Upload-Button sollte wieder enabled sein nach Fehler)
        const uploadButtonAfter = screen.getByRole('button', { name: /1 Datei\(en\) hochladen/i });
        expect(uploadButtonAfter).not.toBeDisabled();
      });
    });

    it('sollte teilweise erfolgreiche Uploads behandeln', async () => {
      let callCount = 0;
      mockMutateAsync.mockImplementation(async ({ file }) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Upload failed');
        }
        return { id: `mock-id-${callCount}`, fileName: file.name };
      });

      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
        new File(['test3'], 'test3.jpg', { type: 'image/jpeg' }),
      ];

      fireEvent.change(fileInput, { target: { files } });

      const uploadButton = screen.getByRole('button', { name: /3 Datei\(en\) hochladen/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockToastWarning).toHaveBeenCalledWith(
          '2 Dateien hochgeladen, 1 fehlgeschlagen'
        );
      });

      // onUploadSuccess sollte trotzdem aufgerufen werden
      expect(mockOnUploadSuccess).toHaveBeenCalled();
    });

    it('sollte nichts tun wenn keine Dateien ausgewählt', async () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const uploadButton = screen.getByRole('button', { name: /hochladen/i });

      // Button sollte disabled sein
      expect(uploadButton).toBeDisabled();
    });
  });

  describe('Modal-Interaktion', () => {
    it('sollte Modal schließen bei Klick auf Abbrechen', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('sollte Modal nach erfolgreichem Upload schließen', async () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /1 Datei\(en\) hochladen/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Datei-Größen-Formatierung', () => {
    it('sollte Bytes korrekt formatieren', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['a'.repeat(2048)], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Datei-Größe wird mehrfach angezeigt (Datei-Liste + Summary)
      const sizeElements = screen.getAllByText(/2 KB/);
      expect(sizeElements.length).toBeGreaterThan(0);
      expect(sizeElements[0]).toBeInTheDocument();
    });

    it('sollte MB korrekt anzeigen', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File(['a'.repeat(1024 * 1024 * 2)], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Datei-Größe wird mehrfach angezeigt (Datei-Liste + Summary)
      const sizeElements = screen.getAllByText(/2 MB/);
      expect(sizeElements.length).toBeGreaterThan(0);
      expect(sizeElements[0]).toBeInTheDocument();
    });

    it('sollte 0 Bytes behandeln', () => {
      renderWithProviders(<UploadModal {...defaultProps} />);

      const fileInput = screen.getByLabelText('Dateien auswählen') as HTMLInputElement;
      const file = new File([], 'empty.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Datei-Größe wird mehrfach angezeigt (Datei-Liste + Summary)
      const sizeElements = screen.getAllByText(/0 Bytes/);
      expect(sizeElements.length).toBeGreaterThan(0);
      expect(sizeElements[0]).toBeInTheDocument();
    });
  });
});
