// src/app/share/[shareId]/__tests__/share-page.test.tsx
// Phase 4a.5: Public Share Page Tests
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SharePage from '../page';
import { useParams } from 'next/navigation';
import { useShareLink, useCampaignMediaAssets } from '@/lib/hooks/useMediaData';
import { mediaService } from '@/lib/firebase/media-service';
import { brandingService } from '@/lib/firebase/branding-service';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock hooks
jest.mock('@/lib/hooks/useMediaData', () => ({
  useShareLink: jest.fn(),
  useCampaignMediaAssets: jest.fn(),
}));

// Mock services
jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    getCampaignMediaAssets: jest.fn(),
    getFolder: jest.fn(),
    getMediaAssetsInFolder: jest.fn(),
    getMediaAssetById: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/branding-service', () => ({
  brandingService: {
    getBrandingSettings: jest.fn(),
  },
}));

// Mock Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

// Mock Data
const mockShareLink = {
  id: 'share-1',
  shareId: 'abc123',
  userId: 'user-1',
  title: 'Test Share',
  description: 'Test Description',
  type: 'file' as const,
  targetId: 'asset-1',
  settings: {
    downloadAllowed: true,
    passwordRequired: null,
    showFileList: false,
    expiresAt: null,
    watermarkEnabled: false,
  },
  active: true,
  accessCount: 0,
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
};

const mockAsset = {
  id: 'asset-1',
  fileName: 'test-image.jpg',
  fileType: 'image/jpeg',
  downloadUrl: 'https://example.com/test.jpg',
  storagePath: 'media/test.jpg',
  userId: 'user-1',
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
};

const mockBranding = {
  userId: 'user-1',
  companyName: 'Test Company',
  logoUrl: 'https://example.com/logo.png',
  phone: '+49 123 456789',
  email: 'test@example.com',
  website: 'https://example.com',
  address: {
    street: 'Test Street 123',
    postalCode: '12345',
    city: 'Test City',
  },
  showCopyright: true,
};

describe('Public Share Page - Phase 4a.5', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (useParams as jest.Mock).mockReturnValue({ shareId: 'abc123' });
    (useShareLink as jest.Mock).mockReturnValue({
      data: mockShareLink,
      isLoading: false,
      error: null,
    });
    (useCampaignMediaAssets as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    (mediaService.getMediaAssetById as jest.Mock).mockResolvedValue(mockAsset);
    (brandingService.getBrandingSettings as jest.Mock).mockResolvedValue(mockBranding);
  });

  // ============================================================================
  // TEST 1: SHARE-LINK LADEN
  // ============================================================================

  it('sollte Share-Link laden', async () => {
    render(<SharePage />);

    // Titel sollte angezeigt werden
    await waitFor(() => {
      expect(screen.getByText('Test Share')).toBeInTheDocument();
    });

    // Beschreibung sollte angezeigt werden
    expect(screen.getByText('Test Description')).toBeInTheDocument();

    // Content-Typ sollte angezeigt werden
    expect(screen.getByText(/Datei/i)).toBeInTheDocument();
  });

  it('sollte Loading-State anzeigen', () => {
    (useShareLink as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<SharePage />);

    expect(screen.getByText('Lade geteilten Inhalt...')).toBeInTheDocument();
  });

  it('sollte Error-State anzeigen bei ungültigem Share', () => {
    (useShareLink as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Not found'),
    });

    render(<SharePage />);

    expect(screen.getByText('Fehler')).toBeInTheDocument();
    expect(screen.getByText(/Share-Link nicht gefunden/i)).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  // ============================================================================
  // TEST 2: PASSWORT-PROMPT BEI GESCHÜTZTEM SHARE
  // ============================================================================

  it('sollte Passwort-Prompt zeigen bei geschütztem Share', async () => {
    const protectedShareLink = {
      ...mockShareLink,
      settings: {
        ...mockShareLink.settings,
        requirePassword: true, // Boolean Flag in aktueller Komponente
      },
    };

    (useShareLink as jest.Mock).mockReturnValue({
      data: protectedShareLink,
      isLoading: false,
      error: null,
    });

    render(<SharePage />);

    // Warte auf Passwort-Prompt
    await waitFor(() => {
      expect(screen.getByText('Passwort erforderlich')).toBeInTheDocument();
    });

    expect(screen.getByText(/Dieser Inhalt ist passwortgeschützt/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Passwort eingeben/i)).toBeInTheDocument();
    expect(screen.getByText('Zugriff freischalten')).toBeInTheDocument();
  });

  it('sollte falsches Passwort ablehnen', async () => {
    const protectedShareLink = {
      ...mockShareLink,
      settings: {
        ...mockShareLink.settings,
        requirePassword: true, // Boolean Flag in aktueller Komponente
      },
    };

    (useShareLink as jest.Mock).mockReturnValue({
      data: protectedShareLink,
      isLoading: false,
      error: null,
    });

    // Mock fetch für Passwort-Validierung - falsches Passwort
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ valid: false }),
    } as Response);

    render(<SharePage />);

    // Warte auf Passwort-Prompt
    await waitFor(() => {
      expect(screen.getByText('Passwort erforderlich')).toBeInTheDocument();
    });

    // Falsches Passwort eingeben
    const passwordInput = screen.getByPlaceholderText(/Passwort eingeben/i);
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });

    const submitButton = screen.getByText('Zugriff freischalten');
    fireEvent.click(submitButton);

    // Nach falschem Passwort sollte Fehlermeldung erscheinen
    await waitFor(() => {
      expect(screen.getByText(/Falsches Passwort/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // TEST 3: CAMPAIGN-ASSETS ANZEIGEN
  // ============================================================================

  it('sollte Campaign-Assets anzeigen', async () => {
    const campaignShareLink = {
      ...mockShareLink,
      type: 'campaign' as const,
      settings: {
        ...mockShareLink.settings,
        requirePassword: false,
      },
    };

    const campaignAssets = [
      { ...mockAsset, id: 'asset-1', fileName: 'image1.jpg' },
      { ...mockAsset, id: 'asset-2', fileName: 'image2.jpg' },
      { ...mockAsset, id: 'asset-3', fileName: 'image3.jpg' },
    ];

    (useShareLink as jest.Mock).mockReturnValue({
      data: campaignShareLink,
      isLoading: false,
      error: null,
    });

    // Mock fetch für Campaign-Assets
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assets: campaignAssets }),
    } as Response);

    render(<SharePage />);

    // Warte auf Campaign-Assets
    await waitFor(() => {
      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
    });

    expect(screen.getByText('image2.jpg')).toBeInTheDocument();
    expect(screen.getByText('image3.jpg')).toBeInTheDocument();
    expect(screen.getByText(/Kampagnen-Medien/i)).toBeInTheDocument();
    expect(screen.getByText(/3 Elemente/i)).toBeInTheDocument();
  });

  it('sollte "Keine Inhalte" bei leerer Campaign', async () => {
    const campaignShareLink = {
      ...mockShareLink,
      type: 'campaign' as const,
      settings: {
        ...mockShareLink.settings,
        requirePassword: false,
      },
    };

    (useShareLink as jest.Mock).mockReturnValue({
      data: campaignShareLink,
      isLoading: false,
      error: null,
    });

    // Mock fetch - leeres Asset-Array
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assets: [] }),
    } as Response);

    render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText('Keine Inhalte')).toBeInTheDocument();
    });

    expect(screen.getByText(/Diese Kampagne enthält keine Medien/i)).toBeInTheDocument();
  });

  // ============================================================================
  // TEST 4: DOWNLOAD-BUTTON RENDERN
  // ============================================================================

  it('sollte Download-Button rendern wenn erlaubt', async () => {
    // Mock fetch für File-Share
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assets: [mockAsset] }),
    } as Response);

    render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });

    // Download-Button sollte vorhanden sein
    const downloadButtons = screen.getAllByText('Download');
    expect(downloadButtons.length).toBeGreaterThan(0);
  });

  it('sollte Download-Button NICHT rendern wenn nicht erlaubt', async () => {
    const noDownloadShareLink = {
      ...mockShareLink,
      settings: {
        ...mockShareLink.settings,
        downloadAllowed: false,
      },
    };

    (useShareLink as jest.Mock).mockReturnValue({
      data: noDownloadShareLink,
      isLoading: false,
      error: null,
    });

    // Mock fetch für File-Share
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assets: [mockAsset] }),
    } as Response);

    render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    });

    // Download-Button sollte NICHT vorhanden sein
    expect(screen.queryByText('Download')).not.toBeInTheDocument();

    // Aber Ansehen-Button sollte vorhanden sein
    expect(screen.getByText('Ansehen')).toBeInTheDocument();
  });

  // ============================================================================
  // TEST 5: LOGO UND FOOTER ANZEIGEN
  // ============================================================================

  it('sollte CeleroPress Logo und Footer anzeigen', async () => {
    // Mock fetch für File-Share
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assets: [mockAsset] }),
    } as Response);

    render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Share')).toBeInTheDocument();
    });

    // CeleroPress Logo sollte vorhanden sein
    const logos = screen.getAllByAltText('CeleroPress');
    expect(logos.length).toBeGreaterThan(0);

    // Footer mit Copyright sollte vorhanden sein
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} CeleroPress`))).toBeInTheDocument();
  });

  it('sollte "Medien-Freigabe" Label anzeigen', async () => {
    // Mock fetch für File-Share
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assets: [mockAsset] }),
    } as Response);

    render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Share')).toBeInTheDocument();
    });

    // Label sollte vorhanden sein
    expect(screen.getByText('Medien-Freigabe')).toBeInTheDocument();
  });

  it('sollte Element-Count korrekt anzeigen', async () => {
    const campaignShareLink = {
      ...mockShareLink,
      type: 'campaign' as const,
      settings: {
        ...mockShareLink.settings,
        requirePassword: false,
      },
    };

    const campaignAssets = [
      { ...mockAsset, id: 'asset-1', fileName: 'image1.jpg' },
      { ...mockAsset, id: 'asset-2', fileName: 'image2.jpg' },
    ];

    (useShareLink as jest.Mock).mockReturnValue({
      data: campaignShareLink,
      isLoading: false,
      error: null,
    });

    // Mock fetch für Campaign-Assets
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assets: campaignAssets }),
    } as Response);

    render(<SharePage />);

    await waitFor(() => {
      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
    });

    // Element-Count sollte korrekt sein
    expect(screen.getByText(/2 Elemente/i)).toBeInTheDocument();
  });
});
