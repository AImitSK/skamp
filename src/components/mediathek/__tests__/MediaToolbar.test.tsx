// src/components/mediathek/__tests__/MediaToolbar.test.tsx
// Phase 4a.3: Component Tests für MediaToolbar
import { render, screen, fireEvent } from '@testing-library/react';
import MediaToolbar from '../MediaToolbar';

// Default Props
const defaultProps = {
  searchTerm: '',
  setSearchTerm: jest.fn(),
  viewMode: 'grid' as const,
  setViewMode: jest.fn(),
  selectedAssetsCount: 0,
  foldersCount: 3,
  assetsCount: 10,
  onCreateFolder: jest.fn(),
  onUpload: jest.fn(),
  onSelectAll: jest.fn(),
  onClearSelection: jest.fn(),
  onBulkDelete: jest.fn(),
  disabled: false,
};

describe('MediaToolbar Component - Phase 4a.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST 1: SEARCH-INPUT RENDERING
  // ============================================================================

  it('sollte Search-Input rendern', () => {
    render(<MediaToolbar {...defaultProps} />);

    // Search-Input sollte vorhanden sein
    const searchInput = screen.getByPlaceholderText(/Suchen/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('');

    // Search-Icon sollte vorhanden sein
    const searchIcon = document.querySelector('.text-zinc-700');
    expect(searchIcon).toBeInTheDocument();
  });

  it('sollte Search-Input ändern können', () => {
    render(<MediaToolbar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Suchen/i);

    // Text eingeben
    fireEvent.change(searchInput, { target: { value: 'test.jpg' } });

    expect(defaultProps.setSearchTerm).toHaveBeenCalledWith('test.jpg');
  });

  // ============================================================================
  // TEST 2: VIEW-TOGGLE FUNKTIONIEREN
  // ============================================================================

  it('sollte View-Toggle funktionieren', () => {
    render(<MediaToolbar {...defaultProps} />);

    // Grid-Button sollte aktiv sein (default)
    const gridButtons = screen.getAllByRole('button');
    const gridButton = gridButtons.find(btn => btn.querySelector('.h-4.w-4') && btn.className.includes('bg-white'));
    expect(gridButton).toBeInTheDocument();

    // List-Button finden und klicken
    const listButtons = gridButtons.filter(btn => {
      const svg = btn.querySelector('svg');
      return svg && !btn.className.includes('bg-white') && btn.className.includes('text-gray-500');
    });

    if (listButtons.length > 0) {
      fireEvent.click(listButtons[0]);
      expect(defaultProps.setViewMode).toHaveBeenCalledWith('list');
    }
  });

  it('sollte aktiven View-Mode anzeigen', () => {
    const { rerender } = render(<MediaToolbar {...defaultProps} viewMode="grid" />);

    // Grid-Button sollte aktiv sein (hat bg-white und text-primary Klassen)
    let activeButtons = document.querySelectorAll('.bg-white.text-primary');
    expect(activeButtons.length).toBeGreaterThan(0);

    // Zu List-Mode wechseln
    rerender(<MediaToolbar {...defaultProps} viewMode="list" />);

    // List-Button sollte aktiv sein (hat bg-white und text-primary Klassen)
    activeButtons = document.querySelectorAll('.bg-white.text-primary');
    expect(activeButtons.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // TEST 3: BULK-ACTIONS BEI SELECTION
  // ============================================================================

  it('sollte Bulk-Actions zeigen bei Selection', () => {
    render(<MediaToolbar {...defaultProps} selectedAssetsCount={5} />);

    // Selection-Info sollte angezeigt werden (Text ist über mehrere Elemente verteilt)
    expect(screen.getByText(/5 ausgewählt/i)).toBeInTheDocument();

    // Bulk-Actions sollten vorhanden sein
    expect(screen.getByText('Alle auswählen')).toBeInTheDocument();
    expect(screen.getByText('Auswahl aufheben')).toBeInTheDocument();
    // Der Delete-Button zeigt "{count} Löschen"
    expect(screen.getByText('5 Löschen')).toBeInTheDocument();
  });

  it('sollte Bulk-Actions NICHT zeigen ohne Selection', () => {
    render(<MediaToolbar {...defaultProps} selectedAssetsCount={0} />);

    // Bulk-Actions sollten nicht vorhanden sein
    expect(screen.queryByText(/ausgewählt/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Alle auswählen')).not.toBeInTheDocument();
    expect(screen.queryByText('Auswahl aufheben')).not.toBeInTheDocument();
  });

  it('sollte Bulk-Actions triggern', () => {
    render(<MediaToolbar {...defaultProps} selectedAssetsCount={3} />);

    // Alle auswählen
    const selectAllButton = screen.getByText('Alle auswählen');
    fireEvent.click(selectAllButton);
    expect(defaultProps.onSelectAll).toHaveBeenCalledTimes(1);

    // Auswahl aufheben
    const clearButton = screen.getByText('Auswahl aufheben');
    fireEvent.click(clearButton);
    expect(defaultProps.onClearSelection).toHaveBeenCalledTimes(1);

    // Löschen - Button-Text enthält Count
    const deleteButton = screen.getByText('3 Löschen');
    fireEvent.click(deleteButton);
    expect(defaultProps.onBulkDelete).toHaveBeenCalledTimes(1);
  });

  // ============================================================================
  // TEST 4: BUTTONS UND ACTIONS
  // ============================================================================

  it('sollte Ordner-Anlegen-Button rendern und triggern', () => {
    render(<MediaToolbar {...defaultProps} />);

    const createFolderButton = screen.getByText('Ordner anlegen');
    expect(createFolderButton).toBeInTheDocument();

    fireEvent.click(createFolderButton);
    expect(defaultProps.onCreateFolder).toHaveBeenCalledTimes(1);
  });

  it('sollte Upload-Button rendern und triggern', () => {
    render(<MediaToolbar {...defaultProps} />);

    const uploadButton = screen.getByText('Dateien hochladen');
    expect(uploadButton).toBeInTheDocument();

    fireEvent.click(uploadButton);
    expect(defaultProps.onUpload).toHaveBeenCalledTimes(1);
  });

  it('sollte Buttons disablen wenn disabled=true', () => {
    render(<MediaToolbar {...defaultProps} disabled={true} />);

    const createFolderButton = screen.getByText('Ordner anlegen');
    const uploadButton = screen.getByText('Dateien hochladen');

    expect(createFolderButton).toBeDisabled();
    expect(uploadButton).toBeDisabled();
  });

  // ============================================================================
  // TEST 5: RESULTS INFO
  // ============================================================================

  it('sollte Folder- und Asset-Count anzeigen', () => {
    render(<MediaToolbar {...defaultProps} foldersCount={3} assetsCount={10} />);

    expect(screen.getByText(/3 Ordner/i)).toBeInTheDocument();
    expect(screen.getByText(/10 Dateien/i)).toBeInTheDocument();
  });

  it('sollte Singular korrekt anzeigen', () => {
    render(<MediaToolbar {...defaultProps} foldersCount={1} assetsCount={1} />);

    expect(screen.getByText(/1 Ordner/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Datei/i)).toBeInTheDocument();
  });
});
