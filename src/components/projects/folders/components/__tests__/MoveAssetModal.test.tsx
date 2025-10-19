import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MoveAssetModal from '../MoveAssetModal';
import { getFolders } from '@/lib/firebase/media-folders-service';
import { updateAsset } from '@/lib/firebase/media-assets-service';

// Mock Firebase services
jest.mock('@/lib/firebase/media-folders-service');
jest.mock('@/lib/firebase/media-assets-service');

const mockGetFolders = getFolders as jest.MockedFunction<typeof getFolders>;
const mockUpdateAsset = updateAsset as jest.MockedFunction<typeof updateAsset>;

describe('MoveAssetModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnMoveSuccess = jest.fn();
  const mockAsset = {
    id: 'asset-123',
    fileName: 'test-document.pdf',
    fileType: 'application/pdf'
  };
  const mockAvailableFolders = [
    { id: 'folder-1', name: 'Medien' },
    { id: 'folder-2', name: 'Dokumente' },
    { id: 'folder-3', name: 'Pressemeldungen' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetFolders.mockResolvedValue([]);
    mockUpdateAsset.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('sollte nicht rendern wenn isOpen=false', () => {
    const { container } = render(
      <MoveAssetModal
        isOpen={false}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('sollte rendern wenn isOpen=true', () => {
    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    expect(screen.getByText('Datei verschieben')).toBeInTheDocument();
  });

  it('sollte Asset-Namen anzeigen', () => {
    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
  });

  it('sollte aktuellen Pfad anzeigen', () => {
    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    expect(screen.getByText('Aktueller Pfad:')).toBeInTheDocument();
    expect(screen.getByText('Projekt-Ordner')).toBeInTheDocument();
  });

  it('sollte verfügbare Ordner anzeigen', () => {
    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    expect(screen.getByText('Medien')).toBeInTheDocument();
    expect(screen.getByText('Dokumente')).toBeInTheDocument();
    expect(screen.getByText('Pressemeldungen')).toBeInTheDocument();
  });

  it('sollte in Ordner navigieren können', async () => {
    const mockSubfolders = [
      { id: 'sub-1', name: 'Unterordner 1' },
      { id: 'sub-2', name: 'Unterordner 2' }
    ] as any[];
    mockGetFolders.mockResolvedValueOnce(mockSubfolders);

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    const medienFolder = screen.getByText('Medien');
    fireEvent.click(medienFolder);

    await waitFor(() => {
      expect(mockGetFolders).toHaveBeenCalledWith('org-123', 'folder-1');
    });

    await waitFor(() => {
      expect(screen.getByText('Unterordner 1')).toBeInTheDocument();
      expect(screen.getByText('Unterordner 2')).toBeInTheDocument();
    });

    // Check path updated
    expect(screen.getByText('Projekt-Ordner > Medien')).toBeInTheDocument();
  });

  it('sollte Zurück-Button anzeigen nach Navigation', async () => {
    mockGetFolders.mockResolvedValueOnce([]);

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    const medienFolder = screen.getByText('Medien');
    fireEvent.click(medienFolder);

    await waitFor(() => {
      expect(screen.getByText('..')).toBeInTheDocument();
    });
  });

  it('sollte zurück navigieren mit .. Button', async () => {
    mockGetFolders.mockResolvedValueOnce([]);

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    // Navigate forward
    const medienFolder = screen.getByText('Medien');
    fireEvent.click(medienFolder);

    await waitFor(() => {
      expect(screen.getByText('..')).toBeInTheDocument();
    });

    // Navigate back
    const backButton = screen.getByText('..');
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Projekt-Ordner')).toBeInTheDocument();
      expect(screen.queryByText('..')).not.toBeInTheDocument();
    });
  });

  it('sollte selectedFolderId setzen beim Navigieren', async () => {
    mockGetFolders.mockResolvedValueOnce([]);

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    const medienFolder = screen.getByText('Medien');
    fireEvent.click(medienFolder);

    await waitFor(() => {
      expect(screen.getByText(/Verschieben nach: Projekt-Ordner > Medien/)).toBeInTheDocument();
    });
  });

  it('sollte updateAsset aufrufen beim Verschieben', async () => {
    mockGetFolders.mockResolvedValueOnce([]);

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    // Navigate to folder
    const medienFolder = screen.getByText('Medien');
    fireEvent.click(medienFolder);

    // Wait for navigation to complete and button to be enabled
    await waitFor(() => {
      const moveButton = screen.getByText('Hier verschieben');
      expect(moveButton).not.toBeDisabled();
    });

    // Click move button
    const moveButton = screen.getByText('Hier verschieben');
    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith('asset-123', {
        folderId: 'folder-1'
      });
    });
  });

  it('sollte onMoveSuccess und onClose aufrufen nach erfolgreichem Verschieben', async () => {
    mockGetFolders.mockResolvedValueOnce([]);

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    // Navigate to folder
    const medienFolder = screen.getByText('Medien');
    fireEvent.click(medienFolder);

    // Wait for navigation to complete and button to be enabled
    await waitFor(() => {
      const moveButton = screen.getByText('Hier verschieben');
      expect(moveButton).not.toBeDisabled();
    });

    // Click move button
    const moveButton = screen.getByText('Hier verschieben');
    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(mockOnMoveSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('sollte Error-Alert bei Fehler anzeigen', async () => {
    mockGetFolders.mockResolvedValueOnce([]);
    mockUpdateAsset.mockRejectedValueOnce(new Error('Update failed'));

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    // Navigate to folder
    const medienFolder = screen.getByText('Medien');
    fireEvent.click(medienFolder);

    // Wait for navigation to complete and button to be enabled
    await waitFor(() => {
      const moveButton = screen.getByText('Hier verschieben');
      expect(moveButton).not.toBeDisabled();
    });

    // Click move button
    const moveButton = screen.getByText('Hier verschieben');
    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(screen.getByText('Fehler beim Verschieben der Datei. Bitte versuchen Sie es erneut.')).toBeInTheDocument();
    });

    expect(mockOnMoveSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('sollte "Wird verschoben..." während Verschieben anzeigen', async () => {
    mockGetFolders.mockResolvedValueOnce([]);
    mockUpdateAsset.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    // Navigate to folder
    const medienFolder = screen.getByText('Medien');
    fireEvent.click(medienFolder);

    // Wait for navigation to complete and button to be enabled
    await waitFor(() => {
      const moveButton = screen.getByText('Hier verschieben');
      expect(moveButton).not.toBeDisabled();
    });

    // Click move button
    const moveButton = screen.getByText('Hier verschieben');
    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(screen.getByText('Wird verschoben...')).toBeInTheDocument();
    });
  });

  it('sollte Abbrechen-Button aufrufen', () => {
    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    const cancelButton = screen.getByText('Abbrechen');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('sollte "Keine Unterordner vorhanden" anzeigen wenn Ordner leer', async () => {
    mockGetFolders.mockResolvedValueOnce([]);

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    const medienFolder = screen.getByText('Medien');
    fireEvent.click(medienFolder);

    await waitFor(() => {
      expect(screen.getByText('Keine Unterordner vorhanden')).toBeInTheDocument();
    });
  });

  it('sollte mit rootFolder prop korrekt initialisieren', () => {
    const rootFolder = { id: 'doc-folder', name: 'Dokumente' };

    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
        rootFolder={rootFolder}
      />
    );

    // Should show root folder in path
    expect(screen.getByText('Projekt-Ordner > Dokumente')).toBeInTheDocument();
  });

  it('sollte Verschieben-Button disabled sein wenn kein Ordner ausgewählt', () => {
    render(
      <MoveAssetModal
        isOpen={true}
        onClose={mockOnClose}
        onMoveSuccess={mockOnMoveSuccess}
        asset={mockAsset}
        availableFolders={mockAvailableFolders}
        organizationId="org-123"
      />
    );

    const moveButton = screen.getByText('Hier verschieben');
    expect(moveButton).toBeDisabled();
  });
});
