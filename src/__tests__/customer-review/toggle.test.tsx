/**
 * Test-Suite für das Customer-Freigabe-Toggle-System
 * 
 * Testet alle Toggle-Komponenten und deren Interaktionen
 * mit korrekten Mocks für Firebase und externe Dependencies.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Mocks müssen vor den Imports stehen
jest.mock('@/lib/firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn()
}));

jest.mock('@/lib/firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn()
}));

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: { campaignId: 'test-campaign-id' },
    pathname: '/customer-review'
  })
}));

// Komponenten-Imports (werden später implementiert)
import {
  ToggleBox as BaseToggleBox,
  MediaToggleBox,
  PDFHistoryToggleBox,
  CommunicationToggleBox,
  DecisionToggleBox,
  CustomerReviewToggleContainer,
  useCustomerReviewToggle,
  TOGGLE_IDS,
  DEFAULT_CONFIG
} from '@/components/customer-review/toggle';

import type {
  MediaItem,
  PDFVersion,
  CommunicationItem,
  CustomerDecision,
  ToggleState
} from '@/types/customer-review';

// Test-Daten und Mocks
const mockOrganizationId = 'test-org-123';
const mockCampaignId = 'test-campaign-456';
const mockCustomerId = 'test-customer-789';

const mockMediaItems: MediaItem[] = [
  {
    id: 'media-1',
    filename: 'logo.png',
    mimeType: 'image/png',
    size: 1024000,
    url: 'https://example.com/media/logo.png',
    thumbnailUrl: 'https://example.com/media/logo-thumb.png',
    uploadedAt: new Date('2024-01-01T10:00:00Z'),
    uploadedBy: {
      id: 'user-1',
      name: 'Max Mustermann',
      email: 'max@example.com'
    },
    organizationId: mockOrganizationId,
    metadata: { width: 800, height: 600 }
  },
  {
    id: 'media-2',
    filename: 'hero-image.jpg',
    mimeType: 'image/jpeg',
    size: 2048000,
    url: 'https://example.com/media/hero.jpg',
    uploadedAt: new Date('2024-01-02T14:30:00Z'),
    uploadedBy: {
      id: 'user-2',
      name: 'Anna Schmidt',
      email: 'anna@example.com'
    },
    organizationId: mockOrganizationId
  }
];

const mockPDFVersions: PDFVersion[] = [
  {
    id: 'pdf-v1',
    version: 'v1.0',
    pdfUrl: 'https://example.com/pdfs/campaign-v1.pdf',
    createdAt: new Date('2024-01-01T09:00:00Z'),
    createdBy: {
      id: 'user-1',
      name: 'Max Mustermann',
      email: 'max@example.com'
    },
    fileSize: 5120000,
    changeComment: 'Erste Version',
    isCurrent: false,
    campaignId: mockCampaignId,
    organizationId: mockOrganizationId
  },
  {
    id: 'pdf-v2',
    version: 'v2.0',
    pdfUrl: 'https://example.com/pdfs/campaign-v2.pdf',
    createdAt: new Date('2024-01-05T16:45:00Z'),
    createdBy: {
      id: 'user-2',
      name: 'Anna Schmidt',
      email: 'anna@example.com'
    },
    fileSize: 4890000,
    changeComment: 'Layout-Anpassungen und Korrekturen',
    isCurrent: true,
    campaignId: mockCampaignId,
    organizationId: mockOrganizationId
  }
];

const mockCommunications: CommunicationItem[] = [
  {
    id: 'comm-1',
    type: 'comment',
    content: 'Das Logo sollte etwas größer sein.',
    sender: {
      id: mockCustomerId,
      name: 'Kunde GmbH',
      email: 'kunde@example.com',
      role: 'customer'
    },
    createdAt: new Date('2024-01-03T11:15:00Z'),
    isRead: true,
    campaignId: mockCampaignId,
    organizationId: mockOrganizationId
  },
  {
    id: 'comm-2',
    type: 'feedback',
    content: 'Vielen Dank für die schnelle Umsetzung!',
    sender: {
      id: mockCustomerId,
      name: 'Kunde GmbH',
      email: 'kunde@example.com',
      role: 'customer'
    },
    createdAt: new Date('2024-01-06T08:30:00Z'),
    isRead: false,
    campaignId: mockCampaignId,
    organizationId: mockOrganizationId
  }
];

const mockCustomerDecision: CustomerDecision = {
  id: 'decision-1',
  type: 'content_approval',
  status: 'pending',
  comment: 'Noch zu prüfen',
  customer: {
    id: mockCustomerId,
    name: 'Kunde GmbH',
    email: 'kunde@example.com'
  },
  campaignId: mockCampaignId,
  organizationId: mockOrganizationId,
  deadline: new Date('2024-01-10T23:59:59Z')
};

// Helper für Komponenten-Wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  );
};

describe('Customer-Freigabe Toggle-System', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // LocalStorage Mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
  });

  describe('BaseToggleBox', () => {
    it('sollte korrekt rendern mit allen Props', () => {
      const onToggleMock = jest.fn();
      
      render(
        <TestWrapper>
          <BaseToggleBox
            id={TOGGLE_IDS.MEDIA}
            title="Test Toggle"
            subtitle="Test Beschreibung"
            isExpanded={false}
            onToggle={onToggleMock}
            organizationId={mockOrganizationId}
            count={5}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Test Toggle')).toBeInTheDocument();
      expect(screen.getByText('Test Beschreibung')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Badge
    });

    it('sollte Toggle-Funktion korrekt ausführen', async () => {
      const onToggleMock = jest.fn();
      
      render(
        <TestWrapper>
          <BaseToggleBox
            id={TOGGLE_IDS.MEDIA}
            title="Test Toggle"
            isExpanded={false}
            onToggle={onToggleMock}
            organizationId={mockOrganizationId}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByRole('button');
      await user.click(toggleButton);

      expect(onToggleMock).toHaveBeenCalledWith(TOGGLE_IDS.MEDIA);
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });

    it('sollte im deaktivierten Zustand nicht klickbar sein', async () => {
      const onToggleMock = jest.fn();
      
      render(
        <TestWrapper>
          <BaseToggleBox
            id={TOGGLE_IDS.MEDIA}
            title="Test Toggle"
            isExpanded={false}
            onToggle={onToggleMock}
            organizationId={mockOrganizationId}
            disabled={true}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeDisabled();
      
      await user.click(toggleButton);
      expect(onToggleMock).not.toHaveBeenCalled();
    });
  });

  describe('MediaToggleBox', () => {
    it('sollte Medien-Items korrekt anzeigen', () => {
      render(
        <TestWrapper>
          <MediaToggleBox
            id={TOGGLE_IDS.MEDIA}
            title="Medien"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            mediaItems={mockMediaItems}
          />
        </TestWrapper>
      );

      expect(screen.getByText('logo.png')).toBeInTheDocument();
      expect(screen.getByText('hero-image.jpg')).toBeInTheDocument();
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
    });

    it('sollte Medien-Auswahl korrekt verarbeiten', async () => {
      const onMediaSelectMock = jest.fn();
      
      render(
        <TestWrapper>
          <MediaToggleBox
            id={TOGGLE_IDS.MEDIA}
            title="Medien"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            mediaItems={mockMediaItems}
            onMediaSelect={onMediaSelectMock}
          />
        </TestWrapper>
      );

      const firstMediaItem = screen.getByTestId('media-item-media-1');
      await user.click(firstMediaItem);

      expect(onMediaSelectMock).toHaveBeenCalledWith('media-1');
    });

    it('sollte maximale Anzahl von Medien respektieren', () => {
      render(
        <TestWrapper>
          <MediaToggleBox
            id={TOGGLE_IDS.MEDIA}
            title="Medien"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            mediaItems={mockMediaItems}
            maxDisplayCount={1}
          />
        </TestWrapper>
      );

      expect(screen.getByText('logo.png')).toBeInTheDocument();
      expect(screen.queryByText('hero-image.jpg')).not.toBeInTheDocument();
      expect(screen.getByText('+ 1 weitere')).toBeInTheDocument();
    });
  });

  describe('PDFHistoryToggleBox', () => {
    it('sollte PDF-Versionen korrekt anzeigen', () => {
      render(
        <TestWrapper>
          <PDFHistoryToggleBox
            id={TOGGLE_IDS.PDF_HISTORY}
            title="PDF-Historie"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            pdfVersions={mockPDFVersions}
            currentVersionId="pdf-v2"
          />
        </TestWrapper>
      );

      expect(screen.getByText('v1.0')).toBeInTheDocument();
      expect(screen.getByText('v2.0')).toBeInTheDocument();
      expect(screen.getByText('Erste Version')).toBeInTheDocument();
      expect(screen.getByText('Layout-Anpassungen und Korrekturen')).toBeInTheDocument();
      expect(screen.getByText('Aktuelle Version')).toBeInTheDocument();
    });

    it('sollte Download-Buttons anzeigen wenn aktiviert', () => {
      render(
        <TestWrapper>
          <PDFHistoryToggleBox
            id={TOGGLE_IDS.PDF_HISTORY}
            title="PDF-Historie"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            pdfVersions={mockPDFVersions}
            showDownloadButtons={true}
          />
        </TestWrapper>
      );

      const downloadButtons = screen.getAllByText('Download');
      expect(downloadButtons).toHaveLength(mockPDFVersions.length);
    });

    it('sollte Versions-Auswahl korrekt verarbeiten', async () => {
      const onVersionSelectMock = jest.fn();
      
      render(
        <TestWrapper>
          <PDFHistoryToggleBox
            id={TOGGLE_IDS.PDF_HISTORY}
            title="PDF-Historie"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            pdfVersions={mockPDFVersions}
            onVersionSelect={onVersionSelectMock}
          />
        </TestWrapper>
      );

      const versionItem = screen.getByTestId('pdf-version-pdf-v1');
      await user.click(versionItem);

      expect(onVersionSelectMock).toHaveBeenCalledWith('pdf-v1');
    });
  });

  describe('CommunicationToggleBox', () => {
    it('sollte Kommunikation korrekt anzeigen', () => {
      render(
        <TestWrapper>
          <CommunicationToggleBox
            id={TOGGLE_IDS.COMMUNICATION}
            title="Kommunikation"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            communications={mockCommunications}
            unreadCount={1}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Das Logo sollte etwas größer sein.')).toBeInTheDocument();
      expect(screen.getByText('Vielen Dank für die schnelle Umsetzung!')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Unread count
    });

    it('sollte neue Nachricht senden können', async () => {
      const onNewMessageMock = jest.fn();
      
      render(
        <TestWrapper>
          <CommunicationToggleBox
            id={TOGGLE_IDS.COMMUNICATION}
            title="Kommunikation"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            communications={mockCommunications}
            onNewMessage={onNewMessageMock}
            allowNewMessages={true}
          />
        </TestWrapper>
      );

      const newMessageButton = screen.getByText('Neue Nachricht');
      await user.click(newMessageButton);

      expect(onNewMessageMock).toHaveBeenCalled();
    });
  });

  describe('DecisionToggleBox', () => {
    it('sollte Entscheidungs-Interface korrekt anzeigen', () => {
      render(
        <TestWrapper>
          <DecisionToggleBox
            id={TOGGLE_IDS.DECISION}
            title="Freigabe-Entscheidung"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            decision={mockCustomerDecision}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Freigabe-Entscheidung')).toBeInTheDocument();
      expect(screen.getByText('Noch zu prüfen')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('sollte Entscheidungsänderung verarbeiten', async () => {
      const onDecisionChangeMock = jest.fn();
      
      render(
        <TestWrapper>
          <DecisionToggleBox
            id={TOGGLE_IDS.DECISION}
            title="Freigabe-Entscheidung"
            isExpanded={true}
            onToggle={jest.fn()}
            organizationId={mockOrganizationId}
            decision={mockCustomerDecision}
            onDecisionChange={onDecisionChangeMock}
            availableDecisions={['final_approval', 'reject_with_changes']}
          />
        </TestWrapper>
      );

      const approveButton = screen.getByText('Genehmigen');
      await user.click(approveButton);

      expect(onDecisionChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'final_approval',
          status: 'approved'
        })
      );
    });
  });

  describe('CustomerReviewToggleContainer', () => {
    it('sollte alle Toggle-Boxen korrekt rendern', () => {
      render(
        <TestWrapper>
          <CustomerReviewToggleContainer
            context={{
              campaignId: mockCampaignId,
              customerId: mockCustomerId,
              organizationId: mockOrganizationId,
              userRole: "customer" as const,
              canEdit: true,
              canApprove: true,
              toggleState: {
                expandedToggles: {},
                isLoading: false
              },
              toggleActions: {
                toggleBox: jest.fn(),
                expandAll: jest.fn(),
                collapseAll: jest.fn(),
                resetToggleState: jest.fn(),
                setActiveToggle: jest.fn()
              }
            }}
          >
            <div>Mock Children</div>
          </CustomerReviewToggleContainer>
        </TestWrapper>
      );

      expect(screen.getByText('Medien')).toBeInTheDocument();
      expect(screen.getByText('PDF-Historie')).toBeInTheDocument();
      expect(screen.getByText('Kommunikation')).toBeInTheDocument();
      expect(screen.getByText('Freigabe-Entscheidung')).toBeInTheDocument();
    });

    it('sollte maximal erlaubte erweiterte Boxen respektieren', async () => {
      render(
        <TestWrapper>
          <CustomerReviewToggleContainer
            context={{
              campaignId: mockCampaignId,
              customerId: mockCustomerId,
              organizationId: mockOrganizationId,
              userRole: "customer" as const,
              canEdit: true,
              canApprove: true,
              toggleState: {
                expandedToggles: {},
                isLoading: false
              },
              toggleActions: {
                toggleBox: jest.fn(),
                expandAll: jest.fn(),
                collapseAll: jest.fn(),
                resetToggleState: jest.fn(),
                setActiveToggle: jest.fn()
              }
            }}
          >
            <div>Mock Children with Config</div>
          </CustomerReviewToggleContainer>
        </TestWrapper>
      );

      // Erste Box erweitern
      const mediaToggle = screen.getByTestId(`toggle-${TOGGLE_IDS.MEDIA}`);
      await user.click(mediaToggle);

      // Zweite Box erweitern sollte erste schließen
      const historyToggle = screen.getByTestId(`toggle-${TOGGLE_IDS.PDF_HISTORY}`);
      await user.click(historyToggle);

      await waitFor(() => {
        expect(screen.getByTestId(`toggle-content-${TOGGLE_IDS.MEDIA}`)).toHaveClass('hidden');
        expect(screen.getByTestId(`toggle-content-${TOGGLE_IDS.PDF_HISTORY}`)).not.toHaveClass('hidden');
      });
    });
  });

  describe('useCustomerReviewToggle Hook', () => {
    it('sollte korrekten initialen Zustand zurückgeben', () => {
      const TestComponent = () => {
        const { toggleState, actions } = useCustomerReviewToggle(
          mockCampaignId,
          mockCustomerId,
          mockOrganizationId
        );

        return (
          <div>
            <div data-testid="loading">{toggleState.isLoading.toString()}</div>
            <div data-testid="expanded-count">{Object.keys(toggleState.expandedToggles).length}</div>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('expanded-count')).toHaveTextContent('1'); // Default expanded
    });
  });

  describe('Tastatur-Navigation', () => {
    it('sollte mit Pfeiltasten navigierbar sein', async () => {
      render(
        <TestWrapper>
          <CustomerReviewToggleContainer
            context={{
              campaignId: mockCampaignId,
              customerId: mockCustomerId,
              organizationId: mockOrganizationId,
              userRole: "customer" as const,
              canEdit: true,
              canApprove: true,
              toggleState: {
                expandedToggles: {},
                isLoading: false
              },
              toggleActions: {
                toggleBox: jest.fn(),
                expandAll: jest.fn(),
                collapseAll: jest.fn(),
                resetToggleState: jest.fn(),
                setActiveToggle: jest.fn()
              }
            }}
          >
            <div>Mock Children with Keyboard Nav</div>
          </CustomerReviewToggleContainer>
        </TestWrapper>
      );

      const firstToggle = screen.getByTestId(`toggle-${TOGGLE_IDS.MEDIA}`);
      firstToggle.focus();

      // Pfeil nach unten sollte zum nächsten Toggle navigieren
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId(`toggle-${TOGGLE_IDS.PDF_HISTORY}`)).toHaveFocus();

      // Enter sollte Toggle aktivieren
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByTestId(`toggle-content-${TOGGLE_IDS.PDF_HISTORY}`)).toBeVisible();
      });
    });
  });

  describe('Persistierung', () => {
    it('sollte Toggle-Status im LocalStorage speichern', async () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      
      render(
        <TestWrapper>
          <CustomerReviewToggleContainer
            context={{
              campaignId: mockCampaignId,
              customerId: mockCustomerId,
              organizationId: mockOrganizationId,
              userRole: "customer" as const,
              canEdit: true,
              canApprove: true,
              toggleState: {
                expandedToggles: {},
                isLoading: false
              },
              toggleActions: {
                toggleBox: jest.fn(),
                expandAll: jest.fn(),
                collapseAll: jest.fn(),
                resetToggleState: jest.fn(),
                setActiveToggle: jest.fn()
              }
            }}
          >
            <div>Mock Children with Persist</div>
          </CustomerReviewToggleContainer>
        </TestWrapper>
      );

      const mediaToggle = screen.getByTestId(`toggle-${TOGGLE_IDS.MEDIA}`);
      await user.click(mediaToggle);

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith(
          expect.stringContaining('toggle-state'),
          expect.any(String)
        );
      });
    });

    it('sollte gespeicherten Toggle-Status laden', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
        JSON.stringify({ [TOGGLE_IDS.MEDIA]: true })
      );

      render(
        <TestWrapper>
          <CustomerReviewToggleContainer
            context={{
              campaignId: mockCampaignId,
              customerId: mockCustomerId,
              organizationId: mockOrganizationId,
              userRole: "customer" as const,
              canEdit: true,
              canApprove: true,
              toggleState: {
                expandedToggles: { [TOGGLE_IDS.MEDIA]: true },
                isLoading: false
              },
              toggleActions: {
                toggleBox: jest.fn(),
                expandAll: jest.fn(),
                collapseAll: jest.fn(),
                resetToggleState: jest.fn(),
                setActiveToggle: jest.fn()
              }
            }}
          >
            <div>Mock Children with Persist Loaded</div>
          </CustomerReviewToggleContainer>
        </TestWrapper>
      );

      expect(getItemSpy).toHaveBeenCalledWith(
        expect.stringContaining('toggle-state')
      );
      expect(screen.getByTestId(`toggle-content-${TOGGLE_IDS.MEDIA}`)).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('sollte Fehler beim Laden von Daten korrekt behandeln', async () => {
      // Mock für fehlgeschlagene Datenladung
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <TestWrapper>
          <CustomerReviewToggleContainer
            context={{
              campaignId: "invalid-campaign",
              customerId: mockCustomerId,
              organizationId: mockOrganizationId,
              userRole: "customer" as const,
              canEdit: true,
              canApprove: true,
              toggleState: {
                expandedToggles: {},
                isLoading: false,
                error: "Fehler beim Laden der Daten"
              },
              toggleActions: {
                toggleBox: jest.fn(),
                expandAll: jest.fn(),
                collapseAll: jest.fn(),
                resetToggleState: jest.fn(),
                setActiveToggle: jest.fn()
              }
            }}
          >
            <div>Fehler beim Laden der Daten</div>
          </CustomerReviewToggleContainer>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden/)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('sollte Netzwerk-Fehler abfangen', async () => {
      // Mock für Netzwerk-Fehler
      global.fetch = jest.fn(() => Promise.reject(new Error('Network Error'))) as any;

      render(
        <TestWrapper>
          <CustomerReviewToggleContainer
            context={{
              campaignId: mockCampaignId,
              customerId: mockCustomerId,
              organizationId: mockOrganizationId,
              userRole: "customer" as const,
              canEdit: true,
              canApprove: true,
              toggleState: {
                expandedToggles: {},
                isLoading: false,
                error: "Verbindungsfehler"
              },
              toggleActions: {
                toggleBox: jest.fn(),
                expandAll: jest.fn(),
                collapseAll: jest.fn(),
                resetToggleState: jest.fn(),
                setActiveToggle: jest.fn()
              }
            }}
          >
            <div>Verbindungsfehler</div>
          </CustomerReviewToggleContainer>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Verbindungsfehler/)).toBeInTheDocument();
      });
    });
  });
});

describe('Toggle-System Performance', () => {
  it('sollte große Datenmengen performant verarbeiten', () => {
    const largeMockMediaItems = Array.from({ length: 1000 }, (_, i) => ({
      ...mockMediaItems[0],
      id: `media-${i}`,
      filename: `file-${i}.png`
    }));

    const startTime = performance.now();
    
    render(
      <TestWrapper>
        <MediaToggleBox
          id={TOGGLE_IDS.MEDIA}
          title="Viele Medien"
          isExpanded={true}
          onToggle={jest.fn()}
          organizationId={mockOrganizationId}
          mediaItems={largeMockMediaItems}
          maxDisplayCount={10}
        />
      </TestWrapper>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100); // Sollte unter 100ms rendern
    expect(screen.getByText('+ 990 weitere')).toBeInTheDocument();
  });
});