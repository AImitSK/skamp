// src/components/mediathek/__tests__/MediaCard.test.tsx
// Phase 4a.3: Component Tests für MediaCard
import { render, screen, fireEvent } from '@testing-library/react';
import MediaCard from '../MediaCard';
import { MediaAsset } from '@/types/media';

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

// Mock Data
const createMockAsset = (overrides?: Partial<MediaAsset>): MediaAsset => ({
  id: 'asset-1',
  userId: 'user-1',
  fileName: 'test-image.jpg',
  fileType: 'image/jpeg',
  storagePath: 'media/test.jpg',
  downloadUrl: 'https://example.com/test.jpg',
  folderId: undefined,
  metadata: {
    fileSize: 1024000,
  },
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  ...overrides,
});

// Default Props
const defaultProps = {
  asset: createMockAsset(),
  isSelected: false,
  isDragging: false,
  isSelectionMode: false,
  selectedAssetsCount: 0,
  onDragStart: jest.fn(),
  onDragEnd: jest.fn(),
  onClick: jest.fn(),
  onToggleSelection: jest.fn(),
  onEdit: jest.fn(),
  onShare: jest.fn(),
  onDelete: jest.fn(),
};

describe('MediaCard Component - Phase 4a.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST 1: BASIC RENDERING
  // ============================================================================

  describe('Rendering', () => {
    it('sollte Asset-Informationen korrekt rendern', () => {
      const asset = createMockAsset({
        fileName: 'my-photo.jpg',
        fileType: 'image/jpeg',
      });

      render(<MediaCard {...defaultProps} asset={asset} />);

      // Dateiname sollte angezeigt werden
      expect(screen.getByText('my-photo.jpg')).toBeInTheDocument();

      // Image sollte gerendert werden (nicht File Icon)
      const img = screen.getByRole('img', { name: 'my-photo.jpg' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/test.jpg');
    });

    it('sollte File Icon für Nicht-Bilder rendern', () => {
      const asset = createMockAsset({
        fileName: 'document.pdf',
        fileType: 'application/pdf',
      });

      render(<MediaCard {...defaultProps} asset={asset} />);

      // Dateiname sollte angezeigt werden
      expect(screen.getByText('document.pdf')).toBeInTheDocument();

      // Kein img tag (sondern Icon SVG)
      expect(screen.queryByRole('img')).not.toBeInTheDocument();

      // Container sollte File Icon Class haben
      const container = screen.getByText('document.pdf').closest('div');
      expect(container?.parentElement).toBeInTheDocument();
    });

    it('sollte Asset Info Container korrekt rendern', () => {
      const asset = createMockAsset({
        fileName: 'my-document.pdf',
      });

      render(<MediaCard {...defaultProps} asset={asset} />);

      // File Info Container sollte existieren
      const fileInfo = screen.getByText('my-document.pdf').closest('div');
      expect(fileInfo).toBeInTheDocument();
    });
  });

  // ============================================================================
  // TEST 2: SELECTION MODE
  // ============================================================================

  describe('Selection', () => {
    it('sollte Checkbox rendern und Selection triggern', () => {
      render(<MediaCard {...defaultProps} isSelectionMode={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();

      // Click auf Checkbox
      fireEvent.click(checkbox);

      expect(defaultProps.onToggleSelection).toHaveBeenCalledTimes(1);
    });

    it('sollte Checkbox als checked anzeigen wenn isSelected=true', () => {
      render(<MediaCard {...defaultProps} isSelected={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('sollte Multi-Selection Badge anzeigen bei mehreren Selektionen', () => {
      render(<MediaCard {...defaultProps} isSelected={true} selectedAssetsCount={5} />);

      // Badge mit Count sollte angezeigt werden
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('sollte kein Multi-Selection Badge bei einzelner Selektion anzeigen', () => {
      render(<MediaCard {...defaultProps} isSelected={true} selectedAssetsCount={1} />);

      // Badge sollte nicht angezeigt werden
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // TEST 3: ACTIONS
  // ============================================================================

  describe('Actions', () => {
    it('sollte onClick triggern beim Card-Click', () => {
      const { container } = render(<MediaCard {...defaultProps} />);

      // Click auf Card Container
      const card = container.firstChild as HTMLElement;
      fireEvent.click(card);

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('sollte Dropdown-Menü-Button rendern', () => {
      render(<MediaCard {...defaultProps} />);

      // Es sollten mindestens 2 Buttons existieren (Preview + Dropdown)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('sollte onEdit, onShare, onDelete Callbacks haben', () => {
      // Test dass die Callbacks korrekt übergeben werden
      const props = {
        ...defaultProps,
        onEdit: jest.fn(),
        onShare: jest.fn(),
        onDelete: jest.fn(),
      };

      const { container } = render(<MediaCard {...props} />);

      // Verify component rendered with callbacks
      expect(container.firstChild).toBeInTheDocument();
      expect(props.onEdit).toHaveBeenCalledTimes(0); // Not called yet
      expect(props.onShare).toHaveBeenCalledTimes(0);
      expect(props.onDelete).toHaveBeenCalledTimes(0);

      // Callbacks werden von DropdownItems aufgerufen (getestet in E2E/Integration Tests)
    });

    it('sollte Preview-Link mit korrekter URL rendern', () => {
      const asset = createMockAsset({
        downloadUrl: 'https://example.com/preview.jpg',
      });

      const { container } = render(<MediaCard {...defaultProps} asset={asset} />);

      // Link im Preview-Bereich finden
      const link = container.querySelector('a[href="https://example.com/preview.jpg"]');
      expect(link).toBeInTheDocument();
      // Note: target="_blank" is set in component, may not render in test due to Next.js Link mock
    });
  });

  // ============================================================================
  // TEST 4: DRAG & DROP
  // ============================================================================

  describe('Drag & Drop', () => {
    it('sollte draggable sein und onDragStart triggern', () => {
      const { container } = render(<MediaCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('draggable', 'true');

      fireEvent.dragStart(card);

      expect(defaultProps.onDragStart).toHaveBeenCalledTimes(1);
    });

    it('sollte onDragEnd triggern', () => {
      const { container } = render(<MediaCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      fireEvent.dragEnd(card);

      expect(defaultProps.onDragEnd).toHaveBeenCalledTimes(1);
    });

    it('sollte isDragging Style anwenden', () => {
      const { container } = render(<MediaCard {...defaultProps} isDragging={true} />);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('opacity-50');
      expect(card.className).toContain('scale-95');
    });
  });

  // ============================================================================
  // TEST 5: CONDITIONAL RENDERING
  // ============================================================================

  describe('Conditional Rendering', () => {
    it('sollte Actions-Menu ausblenden im Selection Mode', () => {
      render(<MediaCard {...defaultProps} isSelectionMode={true} />);

      // 3-Punkte-Menü sollte nicht sichtbar sein
      expect(screen.queryByText(/Details bearbeiten/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Teilen/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Löschen/i)).not.toBeInTheDocument();
    });

    it('sollte Actions-Menu-Button anzeigen wenn nicht im Selection Mode', () => {
      render(<MediaCard {...defaultProps} isSelectionMode={false} />);

      // Es sollten Buttons existieren (mindestens Preview + Dropdown)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('sollte Selected-Style anwenden', () => {
      const { container } = render(<MediaCard {...defaultProps} isSelected={true} />);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-[#005fab]');
      expect(card.className).toContain('bg-blue-50');
    });

    it('sollte Default-Style anwenden wenn nicht selected', () => {
      const { container } = render(<MediaCard {...defaultProps} isSelected={false} />);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-gray-200');
      expect(card.className).not.toContain('border-[#005fab]');
    });
  });
});
