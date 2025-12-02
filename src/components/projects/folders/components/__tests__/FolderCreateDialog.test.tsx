import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FolderCreateDialog from '../FolderCreateDialog';
import { createFolder } from '@/lib/firebase/media-folders-service';
import { useAuth } from '@/context/AuthContext';

// Mock Firebase service
jest.mock('@/lib/firebase/media-folders-service');
jest.mock('@/context/AuthContext');

const mockCreateFolder = createFolder as jest.MockedFunction<typeof createFolder>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('FolderCreateDialog Component', () => {
  const mockOnClose = jest.fn();
  const mockOnCreateSuccess = jest.fn();
  const mockUser = {
    uid: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockCreateFolder.mockResolvedValue('new-folder-id');
  });

  it('sollte nicht rendern wenn isOpen=false', () => {
    const { container } = render(
      <FolderCreateDialog
        isOpen={false}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('sollte rendern wenn isOpen=true', () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    expect(screen.getByText('Neuen Ordner erstellen')).toBeInTheDocument();
    expect(screen.getByLabelText('Ordnername')).toBeInTheDocument();
  });

  it('sollte Input-Feld anzeigen mit Placeholder', () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByPlaceholderText('Ordnername eingeben...');
    expect(input).toBeInTheDocument();
  });

  it('sollte Text in Input-Feld eingeben können', () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Neuer Ordner' } });

    expect(input.value).toBe('Neuer Ordner');
  });

  it('sollte Erstellen-Button disabled sein wenn Input leer', () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const createButton = screen.getByText('Ordner erstellen');
    expect(createButton).toBeDisabled();
  });

  it('sollte Erstellen-Button disabled sein bei nur Leerzeichen', () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername');
    fireEvent.change(input, { target: { value: '   ' } });

    const createButton = screen.getByText('Ordner erstellen');
    expect(createButton).toBeDisabled();
  });

  it('sollte Erstellen-Button enabled sein bei validem Text', () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername');
    fireEvent.change(input, { target: { value: 'Gültiger Ordner' } });

    const createButton = screen.getByText('Ordner erstellen');
    expect(createButton).not.toBeDisabled();
  });

  it('sollte createFolder mit korrekten Parametern aufrufen', async () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername');
    fireEvent.change(input, { target: { value: 'Mein Ordner' } });

    const createButton = screen.getByText('Ordner erstellen');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateFolder).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          organizationId: 'org-123',
          name: 'Mein Ordner',
          parentFolderId: 'parent-1',
          description: 'Unterordner erstellt von Test User'
        },
        { organizationId: 'org-123', userId: 'user-123' }
      );
    });
  });

  it('sollte onCreateSuccess und onClose aufrufen bei Erfolg', async () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername');
    fireEvent.change(input, { target: { value: 'Test Ordner' } });

    const createButton = screen.getByText('Ordner erstellen');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnCreateSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('sollte Error Alert anzeigen bei Fehler', async () => {
    mockCreateFolder.mockRejectedValueOnce(new Error('Firebase error'));

    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername');
    fireEvent.change(input, { target: { value: 'Test' } });

    const createButton = screen.getByText('Ordner erstellen');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Fehler beim Erstellen des Ordners. Bitte versuchen Sie es erneut.')).toBeInTheDocument();
    });

    expect(mockOnCreateSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('sollte "Wird erstellt..." anzeigen während Erstellung', async () => {
    // Mock delayed response
    mockCreateFolder.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername');
    fireEvent.change(input, { target: { value: 'Test' } });

    const createButton = screen.getByText('Ordner erstellen');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Wird erstellt...')).toBeInTheDocument();
    });
  });

  it('sollte Input und Buttons disablen während Erstellung', async () => {
    mockCreateFolder.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test' } });

    const createButton = screen.getByText('Ordner erstellen');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(screen.getByText('Abbrechen')).toBeDisabled();
    });
  });

  it('sollte Abbrechen-Button aufrufen', () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const cancelButton = screen.getByText('Abbrechen');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('sollte Input maxLength=50 haben', () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername') as HTMLInputElement;
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('sollte Leerzeichen trimmen vor dem Speichern', async () => {
    render(
      <FolderCreateDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateSuccess={mockOnCreateSuccess}
        parentFolderId="parent-1"
        organizationId="org-123"
      />
    );

    const input = screen.getByLabelText('Ordnername');
    fireEvent.change(input, { target: { value: '  Getrimmt  ' } });

    const createButton = screen.getByText('Ordner erstellen');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Getrimmt'
        }),
        expect.anything()
      );
    });
  });
});
