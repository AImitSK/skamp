// src/components/mediathek/__tests__/ShareModal.test.tsx
// Phase 4a.3: Component Tests für ShareModal
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareModal from '../ShareModal';
import { MediaAsset, MediaFolder } from '@/types/media';
import { mediaService } from '@/lib/firebase/media-service';

// Mock mediaService
jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    createShareLink: jest.fn(),
  },
}));

// Mock toast service
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock Data
const createMockAsset = (): MediaAsset => ({
  id: 'asset-1',
  fileName: 'test-image.jpg',
  fileType: 'image/jpeg',
  downloadUrl: 'https://example.com/test.jpg',
  storagePath: 'media/test.jpg',
  userId: 'user-1',
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
});

const createMockFolder = (): MediaFolder => ({
  id: 'folder-1',
  name: 'Test Folder',
  userId: 'user-1',
  organizationId: 'org-1',
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
});

// Default Props
const defaultProps = {
  target: createMockAsset(),
  type: 'file' as const,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
  organizationId: 'org-1',
  userId: 'user-1',
};

describe('ShareModal Component - Phase 4a.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST 1: BASIC SETTINGS RENDERING
  // ============================================================================

  it('sollte Basic-Settings rendern', () => {
    render(<ShareModal {...defaultProps} />);

    // Dialog-Titel
    expect(screen.getByRole('heading', { name: 'Share-Link erstellen' })).toBeInTheDocument();

    // Titel-Input mit Standardwert (Dateiname)
    const titleInput = screen.getByPlaceholderText(/z.B. Produktfotos/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue('test-image.jpg');

    // Beschreibungs-Textarea
    expect(screen.getByPlaceholderText(/Zusätzliche Informationen/i)).toBeInTheDocument();

    // Download-Checkbox
    expect(screen.getByText('Download erlauben')).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share-Link erstellen' })).toBeInTheDocument();
  });

  // ============================================================================
  // TEST 2: EINSTELLUNGEN ANZEIGEN
  // ============================================================================

  it('sollte Einstellungen und Info-Box anzeigen', () => {
    render(<ShareModal {...defaultProps} />);

    // Einstellungen-Section
    expect(screen.getByText('Einstellungen')).toBeInTheDocument();
    expect(screen.getByText('Download erlauben')).toBeInTheDocument();

    // Passwort-Feld
    expect(screen.getByText('Passwort-Schutz (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Leer lassen für öffentlichen Zugang/i)).toBeInTheDocument();

    // Info-Box
    expect(screen.getByText('Share-Link Info')).toBeInTheDocument();
    expect(screen.getByText(/Links sind standardmäßig unbegrenzt gültig/i)).toBeInTheDocument();
    expect(screen.getByText(/Sie können Links jederzeit deaktivieren/i)).toBeInTheDocument();
  });

  // ============================================================================
  // TEST 3: PASSWORD-PROTECTION AKTIVIEREN
  // ============================================================================

  it('sollte Password-Protection aktivieren', () => {
    render(<ShareModal {...defaultProps} />);

    // Passwort-Feld finden
    const passwordInput = screen.getByPlaceholderText(/Leer lassen für öffentlichen Zugang/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Passwort eingeben
    fireEvent.change(passwordInput, { target: { value: 'test123' } });
    expect(passwordInput).toHaveValue('test123');
  });

  // ============================================================================
  // TEST 4: SHARE-LINK GENERIEREN
  // ============================================================================

  it('sollte Share-Link generieren', async () => {
    // Mock createShareLink response
    const mockShareLink = {
      id: 'share-1',
      userId: 'user-1',
      shareId: 'abc123',
      title: 'test-image.jpg',
      type: 'file' as const,
      targetId: 'asset-1',
      active: true,
      accessCount: 0,
      settings: {
        expiresAt: null,
        downloadAllowed: true,
        passwordRequired: null,
        watermarkEnabled: false,
      },
    };

    (mediaService.createShareLink as jest.Mock).mockResolvedValue(mockShareLink);

    render(<ShareModal {...defaultProps} />);

    // Titel ändern
    const titleInput = screen.getByPlaceholderText(/z.B. Produktfotos/i);
    fireEvent.change(titleInput, { target: { value: 'Mein Test Bild' } });

    // Beschreibung hinzufügen
    const descriptionInput = screen.getByPlaceholderText(/Zusätzliche Informationen/i);
    fireEvent.change(descriptionInput, { target: { value: 'Test Beschreibung' } });

    // Passwort setzen
    const passwordInput = screen.getByPlaceholderText(/Leer lassen für öffentlichen Zugang/i);
    fireEvent.change(passwordInput, { target: { value: 'secure123' } });

    // Submit Button klicken
    const submitButton = screen.getByRole('button', { name: 'Share-Link erstellen' });
    fireEvent.click(submitButton);

    // Warte auf API-Call
    await waitFor(() => {
      expect(mediaService.createShareLink).toHaveBeenCalledWith({
        organizationId: 'org-1',
        createdBy: 'user-1',
        type: 'file',
        targetId: 'asset-1',
        title: 'Mein Test Bild',
        settings: {
          downloadAllowed: true,
          expiresAt: null,
          passwordRequired: 'secure123',
          watermarkEnabled: false,
        },
        description: 'Test Beschreibung',
      });
    });

    // Erfolgsansicht sollte angezeigt werden
    await waitFor(() => {
      expect(screen.getByText('Link erfolgreich erstellt!')).toBeInTheDocument();
    });

    // Share-URL sollte angezeigt werden
    expect(screen.getByText(/\/share\/abc123/)).toBeInTheDocument();

    // Link-Details sollten angezeigt werden
    expect(screen.getByText('Link-Details:')).toBeInTheDocument();
    expect(screen.getByText(/Titel:/)).toBeInTheDocument();
    expect(screen.getByText('Mein Test Bild')).toBeInTheDocument();
    expect(screen.getByText(/Passwort:/)).toBeInTheDocument();
    expect(screen.getByText('Erforderlich')).toBeInTheDocument();
  });

  // ============================================================================
  // BONUS TESTS
  // ============================================================================

  it('sollte Abbrechen-Button triggern', () => {
    render(<ShareModal {...defaultProps} />);

    const cancelButton = screen.getByText('Abbrechen');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('sollte Submit-Button disablen wenn Titel leer', () => {
    render(<ShareModal {...defaultProps} />);

    const titleInput = screen.getByPlaceholderText(/z.B. Produktfotos/i);
    fireEvent.change(titleInput, { target: { value: '' } });

    const submitButton = screen.getByRole('button', { name: 'Share-Link erstellen' });
    expect(submitButton).toBeDisabled();
  });

  it('sollte Download-Checkbox togglen', () => {
    render(<ShareModal {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked(); // Standardmäßig aktiviert

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('sollte Link kopieren', async () => {
    // Mock createShareLink response
    const mockShareLink = {
      id: 'share-1',
      userId: 'user-1',
      shareId: 'abc123',
      title: 'test-image.jpg',
      type: 'file' as const,
      targetId: 'asset-1',
      active: true,
      accessCount: 0,
      settings: {
        expiresAt: null,
        downloadAllowed: true,
        passwordRequired: null,
        watermarkEnabled: false,
      },
    };

    (mediaService.createShareLink as jest.Mock).mockResolvedValue(mockShareLink);

    render(<ShareModal {...defaultProps} />);

    // Link erstellen
    const submitButton = screen.getByRole('button', { name: 'Share-Link erstellen' });
    fireEvent.click(submitButton);

    // Warte auf Erfolgsansicht
    await waitFor(() => {
      expect(screen.getByText('Link erfolgreich erstellt!')).toBeInTheDocument();
    });

    // Kopieren-Button klicken
    const copyButton = screen.getByText('Kopieren');
    fireEvent.click(copyButton);

    // Clipboard sollte aufgerufen werden
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/share/abc123')
      );
    });

    // "Kopiert!"-Text sollte angezeigt werden
    expect(screen.getByText('Kopiert!')).toBeInTheDocument();
  });
});
