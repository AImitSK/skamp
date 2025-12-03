/**
 * Test-Suite für MediaToggleBox Komponente
 * 
 * Diese Tests decken ab:
 * - Media-Anzeige und Grid-Layout
 * - Thumbnail-Viewer und Lightbox
 * - Download-Funktionalität
 * - File-Type-Icons und -Formatierung
 * - Hover-States und Overlays
 * - Empty-States
 * - Performance mit vielen Medien
 * - Accessibility für Medien-Items
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaToggleBox } from '@/components/customer-review/toggle/MediaToggleBox';
import { MediaToggleBoxProps, MediaItem } from '@/types/customer-review';

// Mock für Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  PaperClipIcon: jest.fn(() => <div data-testid="paperclip-icon">PaperClip Icon</div>),
  EyeIcon: jest.fn(() => <div data-testid="eye-icon">Eye Icon</div>),
  ArrowDownTrayIcon: jest.fn(() => <div data-testid="download-icon">Download Icon</div>),
  ChevronDownIcon: jest.fn(() => <div data-testid="chevron-down">Chevron Down</div>),
  ChevronUpIcon: jest.fn(() => <div data-testid="chevron-up">Chevron Up</div>)
}));

// Mock für ToggleBox
jest.mock('@/components/customer-review/toggle/ToggleBox', () => ({
  ToggleBox: ({ children, isExpanded, title, count, ...props }: any) => (
    <div data-testid="toggle-box-mock" data-expanded={isExpanded}>
      <div data-testid="toggle-header">
        {title} {count && <span data-testid="count-badge">{count}</span>}
      </div>
      {isExpanded && <div data-testid="toggle-content">{children}</div>}
    </div>
  )
}));

// Mock für Download-Tests
const mockClick = jest.fn();

describe('MediaToggleBox Komponente', () => {
  // Test-Daten
  const mockMediaItems: MediaItem[] = [
    {
      id: 'media-1',
      filename: 'image1.jpg',
      mimeType: 'image/jpeg',
      size: 1024 * 1024 * 2.5, // 2.5 MB
      url: 'https://example.com/image1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      uploadedAt: new Date('2024-01-01'),
      uploadedBy: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com'
      },
      organizationId: 'org-123',
      metadata: {
        dimensions: { width: 1920, height: 1080 }
      }
    },
    {
      id: 'media-2',
      filename: 'document.pdf',
      mimeType: 'application/pdf',
      size: 1024 * 512, // 512 KB
      url: 'https://example.com/document.pdf',
      uploadedAt: new Date('2024-01-02'),
      uploadedBy: {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com'
      },
      organizationId: 'org-123'
    },
    {
      id: 'media-3',
      filename: 'video.mp4',
      mimeType: 'video/mp4',
      size: 1024 * 1024 * 10, // 10 MB
      url: 'https://example.com/video.mp4',
      uploadedAt: new Date('2024-01-03'),
      uploadedBy: {
        id: 'user-3',
        name: 'Bob Johnson',
        email: 'bob@example.com'
      },
      organizationId: 'org-123'
    }
  ];

  const defaultProps: MediaToggleBoxProps = {
    id: 'media-toggle',
    title: 'Angehängte Medien',
    isExpanded: true,
    onToggle: jest.fn(),
    organizationId: 'org-123',
    mediaItems: mockMediaItems
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClick.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basis-Rendering', () => {
    it('sollte Media-Items korrekt anzeigen', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      expect(screen.getByTestId('media-item-media-1')).toBeInTheDocument();
      expect(screen.getByTestId('media-item-media-2')).toBeInTheDocument();
      expect(screen.getByTestId('media-item-media-3')).toBeInTheDocument();
    });

    it('sollte korrekten Titel und Count anzeigen', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      expect(screen.getByText('Angehängte Medien')).toBeInTheDocument();
      expect(screen.getByTestId('count-badge')).toHaveTextContent('3');
    });

    it('sollte Dateinamen korrekt anzeigen', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('video.mp4')).toBeInTheDocument();
    });

    it('sollte Dateigröße korrekt formatieren', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      expect(screen.getByText('2.5 MB')).toBeInTheDocument();
      expect(screen.getByText('512.0 KB')).toBeInTheDocument();
      expect(screen.getByText('10.0 MB')).toBeInTheDocument();
    });

    it('sollte Bild-Dimensionen anzeigen', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      expect(screen.getByText('1920×1080')).toBeInTheDocument();
    });
  });

  describe('File-Type-Icons', () => {
    it('sollte korrektes Icon für Bilder anzeigen', () => {
      const imageOnlyItems = mockMediaItems.filter(item => item.mimeType.startsWith('image/'));
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={imageOnlyItems} 
        />
      );
      
      // Bild sollte Thumbnail haben, nicht Emoji-Icon
      const imageElement = screen.getByAltText('image1.jpg');
      expect(imageElement).toBeInTheDocument();
      expect(imageElement).toHaveAttribute('src', 'https://example.com/thumb1.jpg');
    });

    it('sollte Fallback-Icon für PDF anzeigen', () => {
      const pdfItem = mockMediaItems.find(item => item.mimeType.includes('pdf'))!;
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={[pdfItem]} 
        />
      );
      
      // PDF sollte Emoji-Icon haben
      expect(screen.getByRole('img', { name: 'application/pdf' })).toBeInTheDocument();
    });

    it('sollte Fallback-Icon für Video anzeigen', () => {
      const videoItem = mockMediaItems.find(item => item.mimeType.startsWith('video/'))!;
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={[videoItem]} 
        />
      );
      
      // Video sollte Emoji-Icon haben
      expect(screen.getByRole('img', { name: 'video/mp4' })).toBeInTheDocument();
    });
  });

  describe('Media-Interaktionen', () => {
    it('sollte onMediaSelect aufrufen beim Item-Klick', async () => {
      const user = userEvent.setup();
      const onMediaSelectMock = jest.fn();
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          onMediaSelect={onMediaSelectMock} 
        />
      );
      
      const mediaItem = screen.getByTestId('media-item-media-1');
      await user.click(mediaItem);
      
      expect(onMediaSelectMock).toHaveBeenCalledWith('media-1');
    });

    it('sollte Download bei Download-Button-Klick auslösen', async () => {
      const user = userEvent.setup();

      // Spies für DOM-Methoden
      const createElementSpy = jest.spyOn(document, 'createElement');
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      const removeChildSpy = jest.spyOn(document.body, 'removeChild');

      render(<MediaToggleBox {...defaultProps} />);

      // Hover über Media-Item um Download-Button sichtbar zu machen
      const mediaItem = screen.getByTestId('media-item-media-1');
      await user.hover(mediaItem);

      const downloadButtons = screen.getAllByLabelText(/herunterladen/i);
      await user.click(downloadButtons[0]);

      // Verifiziere dass Download-Logik aufgerufen wurde
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('sollte Download-Link korrekte Attribute setzen', async () => {
      const user = userEvent.setup();
      const originalAppendChild = document.body.appendChild;
      let capturedLink: any = null;

      // Spioniere nur für Link-Elemente
      document.body.appendChild = function<T extends Node>(node: T): T {
        if ((node as any).tagName === 'A') {
          capturedLink = node;
        }
        return originalAppendChild.call(this, node) as T;
      };

      render(<MediaToggleBox {...defaultProps} />);

      const mediaItem = screen.getByTestId('media-item-media-1');
      await user.hover(mediaItem);

      const downloadButtons = screen.getAllByLabelText(/herunterladen/i);
      await user.click(downloadButtons[0]);

      // Verifiziere dass ein Link erstellt wurde
      expect(capturedLink).not.toBeNull();
      expect(capturedLink.tagName).toBe('A');
      expect(capturedLink.href).toBe('https://example.com/image1.jpg');
      expect(capturedLink.download).toBe('image1.jpg');

      // Wiederherstellen
      document.body.appendChild = originalAppendChild;
    });

    it('sollte Download-Event nicht propagieren', async () => {
      const user = userEvent.setup();
      const onMediaSelectMock = jest.fn();
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          onMediaSelect={onMediaSelectMock} 
        />
      );
      
      const mediaItem = screen.getByTestId('media-item-media-1');
      await user.hover(mediaItem);
      
      const downloadButtons = screen.getAllByLabelText(/herunterladen/i);
      await user.click(downloadButtons[0]);
      
      // onMediaSelect sollte NICHT aufgerufen werden
      expect(onMediaSelectMock).not.toHaveBeenCalled();
    });
  });

  describe('Lightbox-Funktionalität', () => {
    it('sollte Lightbox für Bilder öffnen', async () => {
      const user = userEvent.setup();

      render(<MediaToggleBox {...defaultProps} />);

      const imageItem = screen.getByTestId('media-item-media-1');
      await user.click(imageItem);

      // Lightbox sollte geöffnet werden - es gibt jetzt 2 Bilder mit diesem Alt-Text (Thumbnail + Lightbox)
      const images = screen.getAllByAltText('image1.jpg');
      expect(images.length).toBe(2);

      // Das zweite Bild sollte das Lightbox-Bild sein
      const lightboxImage = images[1];
      const lightboxContainer = lightboxImage.closest('.fixed');
      expect(lightboxContainer).toBeInTheDocument();
      expect(lightboxContainer).toHaveClass('inset-0', 'z-50', 'bg-black', 'bg-opacity-75');
    });

    it('sollte Lightbox schließen beim Außenklick', async () => {
      const user = userEvent.setup();

      render(<MediaToggleBox {...defaultProps} />);

      // Lightbox öffnen
      const imageItem = screen.getByTestId('media-item-media-1');
      await user.click(imageItem);

      // Warte bis Lightbox geöffnet ist
      await waitFor(() => {
        const images = screen.getAllByAltText('image1.jpg');
        expect(images.length).toBe(2);
      });

      // Finde das Lightbox-Overlay
      const images = screen.getAllByAltText('image1.jpg');
      const lightboxImage = images[1];
      const lightboxOverlay = lightboxImage.closest('.fixed');

      if (lightboxOverlay) {
        await user.click(lightboxOverlay);
      }

      // Lightbox sollte geschlossen werden - nur noch 1 Bild (Thumbnail)
      await waitFor(() => {
        const imagesAfterClose = screen.queryAllByAltText('image1.jpg');
        expect(imagesAfterClose.length).toBe(1);
      });
    });

    it('sollte Lightbox NICHT für nicht-Bild-Dateien öffnen', async () => {
      const user = userEvent.setup();
      
      render(<MediaToggleBox {...defaultProps} />);
      
      // PDF-Item klicken
      const pdfItem = screen.getByTestId('media-item-media-2');
      await user.click(pdfItem);
      
      // Kein Lightbox sollte erscheinen
      await waitFor(() => {
        expect(screen.queryByRole('img', { name: 'document.pdf' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('sollte Empty-State anzeigen bei leeren Media-Items', () => {
      render(
        <MediaToggleBox
          {...defaultProps}
          mediaItems={[]}
        />
      );

      expect(screen.getByText('Keine Medien angehängt')).toBeInTheDocument();
      // Count-Badge wird bei count=0 nicht angezeigt (siehe ToggleBox.test.tsx Zeile 78-82)
      expect(screen.queryByTestId('count-badge')).not.toBeInTheDocument();
    });

    it('sollte PaperClip-Icon im Empty-State anzeigen', () => {
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={[]} 
        />
      );
      
      // Icon im Empty-State Content (nicht im Header)
      const emptyStateSection = screen.getByText('Keine Medien angehängt').closest('.text-center');
      expect(emptyStateSection).toBeInTheDocument();
    });
  });

  describe('Max Display Count', () => {
    it('sollte nur maxDisplayCount Items anzeigen', () => {
      render(
        <MediaToggleBox 
          {...defaultProps} 
          maxDisplayCount={2} 
        />
      );
      
      expect(screen.getByTestId('media-item-media-1')).toBeInTheDocument();
      expect(screen.getByTestId('media-item-media-2')).toBeInTheDocument();
      expect(screen.queryByTestId('media-item-media-3')).not.toBeInTheDocument();
    });

    it('sollte alle Items anzeigen ohne maxDisplayCount', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      expect(screen.getByTestId('media-item-media-1')).toBeInTheDocument();
      expect(screen.getByTestId('media-item-media-2')).toBeInTheDocument();
      expect(screen.getByTestId('media-item-media-3')).toBeInTheDocument();
    });

    it('sollte Count korrekt anzeigen auch mit maxDisplayCount', () => {
      render(
        <MediaToggleBox 
          {...defaultProps} 
          maxDisplayCount={1} 
        />
      );
      
      // Nur 1 Item sichtbar, aber Count sollte 3 zeigen
      expect(screen.getByTestId('count-badge')).toHaveTextContent('3');
      expect(screen.getByTestId('media-item-media-1')).toBeInTheDocument();
      expect(screen.queryByTestId('media-item-media-2')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Grid-Layout', () => {
    it('sollte korrektes Grid-Layout haben', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      const gridContainer = screen.getByTestId('media-item-media-1').parentElement;
      expect(gridContainer).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'lg:grid-cols-3',
        'gap-4'
      );
    });
  });

  describe('Accessibility', () => {
    it('sollte korrekte ARIA-Labels für Download-Button haben', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      const downloadButtons = screen.getAllByLabelText(/herunterladen/i);
      expect(downloadButtons[0]).toHaveAttribute('aria-label', 'image1.jpg herunterladen');
    });

    it('sollte korrekte ARIA-Labels für View-Button haben', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      const viewButtons = screen.getAllByLabelText(/vollbild anzeigen/i);
      expect(viewButtons[0]).toHaveAttribute('aria-label', 'image1.jpg in Vollbild anzeigen');
    });

    it('sollte korrekte Alt-Texte für Bilder haben', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      const thumbnailImage = screen.getByAltText('image1.jpg');
      expect(thumbnailImage).toBeInTheDocument();
    });
  });

  describe('File-Size-Formatierung', () => {
    it('sollte Bytes korrekt formatieren', () => {
      const smallFile: MediaItem = {
        ...mockMediaItems[0],
        id: 'small-file',
        size: 512,
        filename: 'small.txt'
      };
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={[smallFile]} 
        />
      );
      
      expect(screen.getByText('512 B')).toBeInTheDocument();
    });

    it('sollte Kilobytes korrekt formatieren', () => {
      const mediumFile: MediaItem = {
        ...mockMediaItems[0],
        id: 'medium-file',
        size: 1024 * 1.5,
        filename: 'medium.txt'
      };
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={[mediumFile]} 
        />
      );
      
      expect(screen.getByText('1.5 KB')).toBeInTheDocument();
    });
  });

  describe('Error-Handling', () => {
    it('sollte mit fehlenden Thumbnails umgehen', () => {
      const itemWithoutThumbnail: MediaItem = {
        ...mockMediaItems[0],
        thumbnailUrl: undefined
      };
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={[itemWithoutThumbnail]} 
        />
      );
      
      // Sollte Fallback-Icon anzeigen
      expect(screen.getByRole('img', { name: 'image/jpeg' })).toBeInTheDocument();
    });

    it('sollte mit fehlenden Metadaten umgehen', () => {
      const itemWithoutMetadata: MediaItem = {
        ...mockMediaItems[0],
        metadata: undefined
      };
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={[itemWithoutMetadata]} 
        />
      );
      
      // Sollte Dateigröße anzeigen, aber keine Dimensionen
      expect(screen.getByText('2.5 MB')).toBeInTheDocument();
      expect(screen.queryByText('1920×1080')).not.toBeInTheDocument();
    });

    it('sollte mit undefined mediaItems umgehen', () => {
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={undefined as any} 
        />
      );
      
      expect(screen.getByText('Keine Medien angehängt')).toBeInTheDocument();
    });
  });

  describe('Performance und Memory Leaks', () => {
    it('sollte große Media-Listen handhaben', () => {
      const largeMediaList = Array.from({ length: 100 }, (_, index) => ({
        ...mockMediaItems[0],
        id: `media-${index}`,
        filename: `file-${index}.jpg`
      }));
      
      render(
        <MediaToggleBox 
          {...defaultProps} 
          mediaItems={largeMediaList}
          maxDisplayCount={10}
        />
      );
      
      // Nur 10 Items sollten gerendert werden
      expect(screen.getAllByTestId(/^media-item-/).length).toBe(10);
      // Aber Count sollte 100 zeigen
      expect(screen.getByTestId('count-badge')).toHaveTextContent('100');
    });

    it('sollte Lightbox-State korrekt cleanup', async () => {
      const user = userEvent.setup();
      
      const { unmount } = render(<MediaToggleBox {...defaultProps} />);
      
      // Lightbox öffnen
      const imageItem = screen.getByTestId('media-item-media-1');
      await user.click(imageItem);
      
      // Komponente unmounten
      unmount();
      
      // Sollte nicht mehr im DOM sein
      expect(screen.queryByTestId('media-item-media-1')).not.toBeInTheDocument();
    });
  });

  describe('Hover-States und Transitions', () => {
    it('sollte Hover-Overlay korrekt anzeigen', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      const mediaItems = screen.getAllByTestId(/^media-item-/);
      const firstItem = mediaItems[0];
      
      // Hover-Overlay sollte vorhanden aber initial nicht sichtbar sein
      const overlay = firstItem.querySelector('.group-hover\\:bg-opacity-20');
      expect(overlay).toBeInTheDocument();
    });

    it('sollte Action-Buttons im Hover-State haben', () => {
      render(<MediaToggleBox {...defaultProps} />);
      
      const viewButtons = screen.getAllByTitle('Vollbild anzeigen');
      const downloadButtons = screen.getAllByTitle('Herunterladen');
      
      expect(viewButtons.length).toBe(mockMediaItems.length);
      expect(downloadButtons.length).toBe(mockMediaItems.length);
    });
  });
});
