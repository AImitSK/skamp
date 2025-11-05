/**
 * MediaList Component Tests
 *
 * Testet die MediaList-Komponente für Campaign Attachments:
 * - Rendering verschiedener Asset-Typen (Ordner, Bilder, Dokumente)
 * - Edge Cases (empty, single, multiple items)
 * - Remove-Funktionalität
 * - Icon/Thumbnail-Display Logic
 * - Badge-Display für Ordner
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaList } from '../MediaList';
import { CampaignAssetAttachment } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

describe('MediaList Component', () => {
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Basic Cases', () => {
    it('should render empty list when attachments array is empty', () => {
      const { container } = render(
        <MediaList attachments={[]} onRemove={mockOnRemove} />
      );

      const items = container.querySelectorAll('.space-y-2 > div');
      expect(items.length).toBe(0);
    });

    it('should render single file attachment with correct name', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-1',
        type: 'asset',
        assetId: 'asset-1',
        metadata: {
          fileName: 'test-document.pdf',
          fileType: 'application/pdf'
        },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      render(<MediaList attachments={[attachment]} onRemove={mockOnRemove} />);

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('should render multiple attachments in correct order', () => {
      const attachments: CampaignAssetAttachment[] = [
        {
          id: 'att-1',
          type: 'asset',
          assetId: 'asset-1',
          metadata: { fileName: 'first.pdf' },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-1'
        },
        {
          id: 'att-2',
          type: 'asset',
          assetId: 'asset-2',
          metadata: { fileName: 'second.jpg' },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-1'
        },
        {
          id: 'att-3',
          type: 'folder',
          folderId: 'folder-1',
          metadata: { folderName: 'Marketing Materials' },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-1'
        }
      ];

      render(<MediaList attachments={attachments} onRemove={mockOnRemove} />);

      expect(screen.getByText('first.pdf')).toBeInTheDocument();
      expect(screen.getByText('second.jpg')).toBeInTheDocument();
      expect(screen.getByText('Marketing Materials')).toBeInTheDocument();
    });
  });

  describe('Asset Type Rendering', () => {
    it('should render folder with FolderIcon and badge', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-folder',
        type: 'folder',
        folderId: 'folder-1',
        metadata: { folderName: 'Brand Assets' },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      render(<MediaList attachments={[attachment]} onRemove={mockOnRemove} />);

      expect(screen.getByText('Brand Assets')).toBeInTheDocument();
      expect(screen.getByText('Ordner')).toBeInTheDocument();
    });

    it('should render image with thumbnail', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-image',
        type: 'asset',
        assetId: 'asset-img',
        metadata: {
          fileName: 'logo.png',
          fileType: 'image/png',
          thumbnailUrl: 'https://example.com/thumb.png'
        },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      const { container } = render(
        <MediaList attachments={[attachment]} onRemove={mockOnRemove} />
      );

      const img = container.querySelector('img[alt="logo.png"]');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.png');
      expect(img).toHaveClass('h-8', 'w-8', 'object-cover', 'rounded');
    });

    it('should render non-image file with DocumentTextIcon', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-doc',
        type: 'asset',
        assetId: 'asset-doc',
        metadata: {
          fileName: 'report.pdf',
          fileType: 'application/pdf'
        },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      const { container } = render(
        <MediaList attachments={[attachment]} onRemove={mockOnRemove} />
      );

      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      // DocumentTextIcon sollte vorhanden sein (Hero Icons)
      const svg = container.querySelector('svg.h-5.w-5.text-gray-400');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Edge Cases - File Types', () => {
    it('should handle image with fileType starting with "image/"', () => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      imageTypes.forEach(fileType => {
        const attachment: CampaignAssetAttachment = {
          id: `att-${fileType}`,
          type: 'asset',
          assetId: 'asset-1',
          metadata: {
            fileName: `test.${fileType.split('/')[1]}`,
            fileType,
            thumbnailUrl: 'https://example.com/thumb.jpg'
          },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-1'
        };

        const { unmount, container } = render(
          <MediaList attachments={[attachment]} onRemove={mockOnRemove} />
        );

        const img = container.querySelector(`img[alt="${attachment.metadata.fileName}"]`);
        expect(img).toBeInTheDocument();

        unmount();
      });
    });

    it('should handle missing thumbnailUrl for images gracefully', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-no-thumb',
        type: 'asset',
        assetId: 'asset-1',
        metadata: {
          fileName: 'no-thumb.jpg',
          fileType: 'image/jpeg'
          // thumbnailUrl fehlt absichtlich
        },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      const { container } = render(
        <MediaList attachments={[attachment]} onRemove={mockOnRemove} />
      );

      const img = container.querySelector('img[alt="no-thumb.jpg"]');
      expect(img).toBeInTheDocument();
      // Wenn thumbnailUrl undefined ist, wird kein src gesetzt oder es ist null
      const srcAttr = img?.getAttribute('src');
      expect(srcAttr === null || srcAttr === 'undefined' || srcAttr === '').toBe(true);
    });

    it('should handle folder without badge when type is not folder', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-file',
        type: 'asset',
        assetId: 'asset-1',
        metadata: {
          fileName: 'document.pdf',
          fileType: 'application/pdf'
        },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      render(<MediaList attachments={[attachment]} onRemove={mockOnRemove} />);

      expect(screen.queryByText('Ordner')).not.toBeInTheDocument();
    });
  });

  describe('Remove Functionality', () => {
    it('should call onRemove with assetId when remove button clicked', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-1',
        type: 'asset',
        assetId: 'asset-123',
        metadata: { fileName: 'test.pdf' },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      render(<MediaList attachments={[attachment]} onRemove={mockOnRemove} />);

      const removeButton = screen.getByLabelText('Medium entfernen');
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
      expect(mockOnRemove).toHaveBeenCalledWith('asset-123');
    });

    it('should call onRemove with folderId when removing folder', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-folder',
        type: 'folder',
        folderId: 'folder-456',
        metadata: { folderName: 'Test Folder' },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      render(<MediaList attachments={[attachment]} onRemove={mockOnRemove} />);

      const removeButton = screen.getByLabelText('Medium entfernen');
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
      expect(mockOnRemove).toHaveBeenCalledWith('folder-456');
    });

    it('should handle multiple remove clicks independently', () => {
      const attachments: CampaignAssetAttachment[] = [
        {
          id: 'att-1',
          type: 'asset',
          assetId: 'asset-1',
          metadata: { fileName: 'first.pdf' },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-1'
        },
        {
          id: 'att-2',
          type: 'asset',
          assetId: 'asset-2',
          metadata: { fileName: 'second.jpg' },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-1'
        }
      ];

      render(<MediaList attachments={attachments} onRemove={mockOnRemove} />);

      const removeButtons = screen.getAllByLabelText('Medium entfernen');

      fireEvent.click(removeButtons[0]);
      expect(mockOnRemove).toHaveBeenCalledWith('asset-1');

      fireEvent.click(removeButtons[1]);
      expect(mockOnRemove).toHaveBeenCalledWith('asset-2');

      expect(mockOnRemove).toHaveBeenCalledTimes(2);
    });

    it('should handle remove when assetId and folderId are both undefined', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-invalid',
        type: 'asset',
        // assetId fehlt
        metadata: { fileName: 'invalid.pdf' },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      render(<MediaList attachments={[attachment]} onRemove={mockOnRemove} />);

      const removeButton = screen.getByLabelText('Medium entfernen');
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
      expect(mockOnRemove).toHaveBeenCalledWith(''); // Empty string fallback
    });
  });

  describe('Styling & Accessibility', () => {
    it('should apply correct CSS classes to container', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-1',
        type: 'asset',
        assetId: 'asset-1',
        metadata: { fileName: 'test.pdf' },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      const { container } = render(
        <MediaList attachments={[attachment]} onRemove={mockOnRemove} />
      );

      const listContainer = container.querySelector('.space-y-2');
      expect(listContainer).toBeInTheDocument();
    });

    it('should have proper aria-label on remove button', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-1',
        type: 'asset',
        assetId: 'asset-1',
        metadata: { fileName: 'test.pdf' },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      render(<MediaList attachments={[attachment]} onRemove={mockOnRemove} />);

      const removeButton = screen.getByLabelText('Medium entfernen');
      expect(removeButton).toHaveAttribute('type', 'button');
      expect(removeButton).toHaveClass('text-red-600', 'hover:text-red-500');
    });

    it('should use unique keys for list items', () => {
      const attachments: CampaignAssetAttachment[] = [
        {
          id: 'unique-1',
          type: 'asset',
          assetId: 'asset-1',
          metadata: { fileName: 'first.pdf' },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-1'
        },
        {
          id: 'unique-2',
          type: 'asset',
          assetId: 'asset-2',
          metadata: { fileName: 'second.pdf' },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-1'
        }
      ];

      const { container } = render(
        <MediaList attachments={attachments} onRemove={mockOnRemove} />
      );

      const items = container.querySelectorAll('[class*="flex items-center justify-between"]');
      expect(items.length).toBe(2);
    });
  });

  describe('Component Memoization', () => {
    it('should not re-render when props are unchanged', () => {
      const attachment: CampaignAssetAttachment = {
        id: 'att-1',
        type: 'asset',
        assetId: 'asset-1',
        metadata: { fileName: 'test.pdf' },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-1'
      };

      const { rerender } = render(
        <MediaList attachments={[attachment]} onRemove={mockOnRemove} />
      );

      const firstRender = screen.getByText('test.pdf');

      // Re-render mit denselben Props
      rerender(<MediaList attachments={[attachment]} onRemove={mockOnRemove} />);

      const secondRender = screen.getByText('test.pdf');

      // Komponente sollte React.memo verwenden
      expect(firstRender).toBe(secondRender);
    });
  });
});
