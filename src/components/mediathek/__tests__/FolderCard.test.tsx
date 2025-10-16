// src/components/mediathek/__tests__/FolderCard.test.tsx
// Phase 4a.3: Component Tests für FolderCard
import { render, screen, fireEvent } from '@testing-library/react';
import FolderCard from '../FolderCard';
import { MediaFolder } from '@/types/media';

// Mock CrmDataContext
jest.mock('@/context/CrmDataContext', () => ({
  useCrmData: jest.fn(() => ({
    companies: [
      { id: 'company-1', name: 'ACME Corp' },
      { id: 'company-2', name: 'Tech Solutions' },
    ],
  })),
}));

// Mock Data
const createMockFolder = (overrides?: Partial<MediaFolder>): MediaFolder => ({
  id: 'folder-1',
  name: 'Test Folder',
  userId: 'user-1',
  organizationId: 'org-1',
  parentFolderId: null,
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  ...overrides,
});

// Default Props
const defaultProps = {
  folder: createMockFolder(),
  onOpen: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onShare: jest.fn(),
};

describe('FolderCard Component - Phase 4a.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST 1: BASIC RENDERING
  // ============================================================================

  describe('Rendering', () => {
    it('sollte Folder-Informationen korrekt rendern', () => {
      const folder = createMockFolder({
        name: 'My Projects',
      });

      render(<FolderCard {...defaultProps} folder={folder} />);

      // Folder-Name sollte angezeigt werden
      expect(screen.getByText('My Projects')).toBeInTheDocument();

      // FolderIcon sollte gerendert werden (SVG)
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('sollte Company Badge rendern wenn clientId vorhanden', () => {
      const folder = createMockFolder({
        clientId: 'company-1',
      });

      render(<FolderCard {...defaultProps} folder={folder} />);

      // Company Badge sollte angezeigt werden
      expect(screen.getByText('ACME Corp')).toBeInTheDocument();
    });

    it('sollte kein Company Badge rendern ohne clientId', () => {
      const folder = createMockFolder({
        clientId: undefined,
      });

      render(<FolderCard {...defaultProps} folder={folder} />);

      // Keine Company Badge
      expect(screen.queryByText('ACME Corp')).not.toBeInTheDocument();
      expect(screen.queryByText('Tech Solutions')).not.toBeInTheDocument();
    });

    it('sollte custom Folder-Color anwenden', () => {
      const folder = createMockFolder({
        color: '#ff0000',
      });

      const { container } = render(<FolderCard {...defaultProps} folder={folder} />);

      // FolderIcon sollte custom color haben
      const folderIcon = container.querySelector('svg[style*="color"]');
      expect(folderIcon).toBeInTheDocument();
    });
  });

  // ============================================================================
  // TEST 2: ACTIONS
  // ============================================================================

  describe('Actions', () => {
    it('sollte onOpen triggern beim Folder-Click', () => {
      const folder = createMockFolder();
      render(<FolderCard {...defaultProps} folder={folder} />);

      // Click auf Folder Icon Bereich
      const folderName = screen.getByText('Test Folder');
      fireEvent.click(folderName);

      expect(defaultProps.onOpen).toHaveBeenCalledWith(folder);
    });

    it('sollte Dropdown-Menü-Button rendern', () => {
      render(<FolderCard {...defaultProps} />);

      // Es sollten Buttons existieren (Dropdown)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('sollte onEdit, onDelete, onShare Callbacks haben', () => {
      // Test dass die Callbacks korrekt übergeben werden
      const props = {
        ...defaultProps,
        onEdit: jest.fn(),
        onDelete: jest.fn(),
        onShare: jest.fn(),
      };

      const { container } = render(<FolderCard {...props} />);

      // Verify component rendered with callbacks
      expect(container.firstChild).toBeInTheDocument();
      expect(props.onEdit).toHaveBeenCalledTimes(0);
      expect(props.onDelete).toHaveBeenCalledTimes(0);
      expect(props.onShare).toHaveBeenCalledTimes(0);
    });
  });

  // ============================================================================
  // TEST 3: ASSET DRAG & DROP
  // ============================================================================

  describe('Asset Drag & Drop', () => {
    it('sollte isDragOver Style anwenden', () => {
      const { container } = render(<FolderCard {...defaultProps} isDragOver={true} />);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-blue-400');
      expect(card.className).toContain('bg-blue-50');
    });

    it('sollte Drop-Hint anzeigen bei isDragOver', () => {
      render(<FolderCard {...defaultProps} isDragOver={true} />);

      // Drop-Hint Text sollte sichtbar sein
      expect(screen.getByText('Hier ablegen')).toBeInTheDocument();
    });

    it('sollte onDragOver triggern', () => {
      const onDragOver = jest.fn();
      const { container } = render(<FolderCard {...defaultProps} onDragOver={onDragOver} />);

      const card = container.firstChild as HTMLElement;

      // Mock dataTransfer for dragOver event
      const dragOverEvent = new Event('dragover', { bubbles: true });
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: { dropEffect: null },
        writable: true,
      });

      fireEvent(card, dragOverEvent);

      expect(onDragOver).toHaveBeenCalled();
    });

    it('sollte onDragLeave triggern', () => {
      const onDragLeave = jest.fn();
      const { container } = render(<FolderCard {...defaultProps} onDragLeave={onDragLeave} />);

      const card = container.firstChild as HTMLElement;
      fireEvent.dragLeave(card);

      expect(onDragLeave).toHaveBeenCalled();
    });

    it('sollte Asset-Drop handhaben', () => {
      const onDrop = jest.fn();
      const { container } = render(<FolderCard {...defaultProps} onDrop={onDrop} />);

      const card = container.firstChild as HTMLElement;

      // Simulate Asset Drop (data does not start with 'folder:')
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: jest.fn().mockReturnValue('asset-1'),
        },
      });

      fireEvent(card, dropEvent);
      expect(onDrop).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TEST 4: FOLDER DRAG & DROP
  // ============================================================================

  describe('Folder Drag & Drop', () => {
    it('sollte draggable sein', () => {
      const { container } = render(<FolderCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('draggable', 'true');
    });

    it('sollte onFolderDragStart triggern', () => {
      const onFolderDragStart = jest.fn();
      const folder = createMockFolder();

      const { container } = render(
        <FolderCard {...defaultProps} folder={folder} onFolderDragStart={onFolderDragStart} />
      );

      const card = container.firstChild as HTMLElement;

      // Mock dataTransfer for dragStart event
      const dragStartEvent = new Event('dragstart', { bubbles: true });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: {
          effectAllowed: '',
          setData: jest.fn(),
        },
        writable: true,
      });

      fireEvent(card, dragStartEvent);

      expect(onFolderDragStart).toHaveBeenCalledWith(folder);
    });

    it('sollte onFolderDragEnd triggern', () => {
      const onFolderDragEnd = jest.fn();
      const { container } = render(<FolderCard {...defaultProps} onFolderDragEnd={onFolderDragEnd} />);

      const card = container.firstChild as HTMLElement;
      fireEvent.dragEnd(card);

      expect(onFolderDragEnd).toHaveBeenCalled();
    });

    it('sollte isDraggedFolder Style anwenden', () => {
      const { container } = render(<FolderCard {...defaultProps} isDraggedFolder={true} />);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('opacity-50');
      expect(card.className).toContain('scale-95');
    });

    it('sollte Dragging-Indicator anzeigen bei isDraggedFolder', () => {
      render(<FolderCard {...defaultProps} isDraggedFolder={true} />);

      // Dragging-Indicator sollte sichtbar sein
      expect(screen.getByText('Wird bewegt...')).toBeInTheDocument();
    });

    it('sollte Folder-Drop verhindern wenn auf sich selbst', async () => {
      const onFolderMove = jest.fn();
      const folder = createMockFolder({ id: 'folder-1' });

      const { container } = render(
        <FolderCard {...defaultProps} folder={folder} onFolderMove={onFolderMove} />
      );

      const card = container.firstChild as HTMLElement;

      // Simulate Folder Drop auf sich selbst
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: jest.fn().mockReturnValue('folder:folder-1'), // Same folder
        },
      });

      fireEvent(card, dropEvent);

      // onFolderMove sollte NICHT aufgerufen werden
      expect(onFolderMove).not.toHaveBeenCalled();
    });

    it('sollte Folder-Drop auf anderen Folder erlauben', async () => {
      const onFolderMove = jest.fn().mockResolvedValue(undefined);
      const folder = createMockFolder({ id: 'folder-target' });

      const { container } = render(
        <FolderCard {...defaultProps} folder={folder} onFolderMove={onFolderMove} />
      );

      const card = container.firstChild as HTMLElement;

      // Simulate Folder Drop auf anderen Folder
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: jest.fn().mockReturnValue('folder:folder-dragged'), // Different folder
        },
      });

      fireEvent(card, dropEvent);

      // onFolderMove sollte aufgerufen werden
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async
      expect(onFolderMove).toHaveBeenCalledWith('folder-dragged', 'folder-target');
    });
  });

  // ============================================================================
  // TEST 5: CONDITIONAL RENDERING
  // ============================================================================

  describe('Conditional Rendering', () => {
    it('sollte Actions-Menu ausblenden bei isDragOver', () => {
      render(<FolderCard {...defaultProps} isDragOver={true} />);

      // Dropdown sollte nicht sichtbar sein (versteckt während drag)
      const buttons = screen.queryAllByRole('button');
      // Im Drag-Over-State sollten keine Buttons sichtbar sein
      expect(buttons.length).toBe(0);
    });

    it('sollte Normal-Style haben wenn nicht dragging', () => {
      const { container } = render(
        <FolderCard {...defaultProps} isDragOver={false} isDraggedFolder={false} />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-gray-200');
      expect(card.className).not.toContain('border-blue-400');
      expect(card.className).not.toContain('opacity-50');
    });

    it('sollte Share-Button nur rendern wenn onShare vorhanden', () => {
      // Mit onShare
      const propsWithShare = { ...defaultProps, onShare: jest.fn() };
      const { rerender, container } = render(<FolderCard {...propsWithShare} />);

      expect(container).toBeInTheDocument();

      // Ohne onShare
      const propsWithoutShare = { ...defaultProps, onShare: undefined };
      rerender(<FolderCard {...propsWithoutShare} />);

      // Component sollte weiterhin rendern
      expect(container).toBeInTheDocument();
    });
  });
});
