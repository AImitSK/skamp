import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadZone from '../UploadZone';
import { uploadMedia } from '@/lib/firebase/media-assets-service';
import { useAuth } from '@/context/AuthContext';

// Mock Firebase service
jest.mock('@/lib/firebase/media-assets-service');
jest.mock('@/context/AuthContext');

const mockUploadMedia = uploadMedia as jest.MockedFunction<typeof uploadMedia>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('UploadZone Component', () => {
  const mockOnClose = jest.fn();
  const mockOnUploadSuccess = jest.fn();
  const mockUser = {
    uid: 'user-123',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockUploadMedia.mockResolvedValue({
      id: 'asset-123',
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      downloadUrl: 'https://example.com/test.pdf'
    } as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('sollte nicht rendern wenn isOpen=false', () => {
    const { container } = render(
      <UploadZone
        isOpen={false}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('sollte rendern wenn isOpen=true', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    expect(screen.getByText('Dateien hochladen')).toBeInTheDocument();
    expect(screen.getByText(/Dateien hier ablegen oder/)).toBeInTheDocument();
  });

  it('sollte Folder-Badge anzeigen wenn folderName gegeben', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        folderName="Medien"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    expect(screen.getByText('Medien')).toBeInTheDocument();
  });

  it('sollte Datei via Input auswählen', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Ausgewählte Dateien \(1\)/)).toBeInTheDocument();
  });

  it('sollte mehrere Dateien via Input auswählen', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file1, file2] } });

    expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    expect(screen.getByText('test2.jpg')).toBeInTheDocument();
    expect(screen.getByText(/Ausgewählte Dateien \(2\)/)).toBeInTheDocument();
  });

  it('sollte Datei via Drag & Drop hinzufügen', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' });
    const dropZone = screen.getByText(/Dateien hier ablegen oder/).closest('div')!;

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file]
      }
    });

    expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
  });

  it('sollte Datei entfernen können', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('test.pdf')).toBeInTheDocument();

    // Find the remove button (XMarkIcon button)
    const removeButtons = screen.getAllByRole('button');
    const removeButton = removeButtons.find(btn => btn.querySelector('svg'));
    if (removeButton) {
      fireEvent.click(removeButton);
    }

    expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
  });

  it('sollte Dateigrößen korrekt formatieren', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['a'.repeat(1024)], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('1 KB')).toBeInTheDocument();
  });

  it('sollte Upload-Button disabled sein wenn keine Dateien ausgewählt', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const uploadButtons = screen.getAllByRole('button');
    const uploadButton = uploadButtons.find(btn => btn.textContent?.includes('hochladen'));

    expect(uploadButton).toBeDisabled();
  });

  it('sollte Upload-Button enabled sein wenn Dateien ausgewählt', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByText('1 Datei hochladen');
    expect(uploadButton).not.toBeDisabled();
  });

  it('sollte korrekten Button-Text für eine Datei anzeigen', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('1 Datei hochladen')).toBeInTheDocument();
  });

  it('sollte korrekten Button-Text für mehrere Dateien anzeigen', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file1, file2] } });

    expect(screen.getByText('2 Dateien hochladen')).toBeInTheDocument();
  });

  it('sollte uploadMedia für jede Datei aufrufen', async () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file1, file2] } });

    const uploadButton = screen.getByText('2 Dateien hochladen');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockUploadMedia).toHaveBeenCalledTimes(2);
    });

    expect(mockUploadMedia).toHaveBeenCalledWith(
      file1,
      'org-123',
      'folder-1',
      expect.any(Function),
      3,
      { userId: 'user-123' }
    );

    expect(mockUploadMedia).toHaveBeenCalledWith(
      file2,
      'org-123',
      'folder-1',
      expect.any(Function),
      3,
      { userId: 'user-123' }
    );
  });

  it('sollte Success-Message nach Upload anzeigen', async () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByText('1 Datei hochladen');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('1 Datei wurde erfolgreich hochgeladen.')).toBeInTheDocument();
    });
  });

  it('sollte Error-Message bei Upload-Fehler anzeigen', async () => {
    mockUploadMedia.mockRejectedValueOnce(new Error('Upload failed'));

    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByText('1 Datei hochladen');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Fehler beim Hochladen der Dateien. Bitte versuchen Sie es erneut.')).toBeInTheDocument();
    });
  });

  it('sollte onUploadSuccess und onClose nach erfolgreichem Upload aufrufen', async () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByText('1 Datei hochladen');
    fireEvent.click(uploadButton);

    // Wait for upload to complete
    await waitFor(() => {
      expect(mockUploadMedia).toHaveBeenCalled();
    });

    // Fast-forward timers to trigger onClose
    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('sollte "Wird hochgeladen..." während Upload anzeigen', async () => {
    mockUploadMedia.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByText('durchsuchen').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByText('1 Datei hochladen');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Wird hochgeladen...')).toBeInTheDocument();
    });
  });

  it('sollte Abbrechen-Button aufrufen', () => {
    render(
      <UploadZone
        isOpen={true}
        onClose={mockOnClose}
        onUploadSuccess={mockOnUploadSuccess}
        currentFolderId="folder-1"
        organizationId="org-123"
        projectId="project-1"
      />
    );

    const cancelButton = screen.getByText('Abbrechen');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
