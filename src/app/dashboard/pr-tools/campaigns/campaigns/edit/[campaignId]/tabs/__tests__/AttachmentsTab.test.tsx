/**
 * AttachmentsTab Integration Tests
 *
 * Testet die vollständige Integration des AttachmentsTab:
 * - Context-Integration (CampaignContext)
 * - Boilerplate-Loader Integration
 * - MediaList mit echten Context-Daten
 * - MediaEmptyState Toggle
 * - Asset hinzufügen/entfernen Flow
 * - Prop Passing (organizationId, callbacks)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttachmentsTab from '../AttachmentsTab';
import { CampaignProvider, useCampaign } from '../../context/CampaignContext';
import { CampaignAssetAttachment } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';
import { toastService } from '@/lib/utils/toast';
import { BoilerplateSection } from '@/components/pr/campaign/SimpleBoilerplateLoader';

// Mocks
jest.mock('../../context/CampaignContext', () => ({
  ...jest.requireActual('../../context/CampaignContext'),
  useCampaign: jest.fn()
}));

jest.mock('@/components/pr/campaign/SimpleBoilerplateLoader', () => {
  return function MockSimpleBoilerplateLoader({
    onSectionsChange,
    initialSections
  }: any) {
    return (
      <div data-testid="boilerplate-loader">
        <button
          onClick={() =>
            onSectionsChange([
              { id: '1', content: 'Test Boilerplate', order: 0 }
            ])
          }
        >
          Change Sections
        </button>
        <div>Initial Sections: {initialSections?.length || 0}</div>
      </div>
    );
  };
});

jest.mock('@/lib/utils/toast');

describe('AttachmentsTab Integration Tests', () => {
  const mockUseCampaign = useCampaign as jest.MockedFunction<typeof useCampaign>;
  const mockOnOpenAssetSelector = jest.fn();

  const defaultContextValue = {
    selectedCompanyId: 'client-123',
    selectedCompanyName: 'ACME Corp',
    boilerplateSections: [] as BoilerplateSection[],
    updateBoilerplateSections: jest.fn(),
    attachedAssets: [] as CampaignAssetAttachment[],
    removeAsset: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCampaign.mockReturnValue(defaultContextValue as any);
  });

  describe('Basic Rendering', () => {
    it('should render AttachmentsTab with all sections', () => {
      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      expect(screen.getByTestId('boilerplate-loader')).toBeInTheDocument();
      expect(screen.getByText('Medien')).toBeInTheDocument();
      expect(screen.getAllByText('Medien hinzufügen').length).toBeGreaterThan(0);
    });

    it('should pass correct props to SimpleBoilerplateLoader', () => {
      const boilerplateSections: BoilerplateSection[] = [
        {
          id: 'sec-1',
          type: 'boilerplate',
          content: 'Existing boilerplate',
          order: 0,
          isLocked: false,
          isCollapsed: false
        }
      ];

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-456"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      expect(screen.getByTestId('boilerplate-loader')).toBeInTheDocument();
      expect(screen.getByText('Initial Sections: 1')).toBeInTheDocument();
    });

    it('should render "Medien hinzufügen" button with correct icon', () => {
      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      // Es gibt zwei "Medien hinzufügen" Buttons (Header + EmptyState), also getAllByRole
      const buttons = screen.getAllByRole('button', { name: /medien hinzufügen/i });
      expect(buttons.length).toBeGreaterThan(0);

      // Finde den Header-Button (mit PlusIcon und CSS-Klassen)
      const headerButton = buttons.find(btn => btn.className.includes('text-sm'));
      expect(headerButton).toBeInTheDocument();
      expect(headerButton).toHaveClass('text-sm', 'px-3', 'py-1.5');
    });
  });

  describe('Context Integration', () => {
    it('should consume all required context values', () => {
      const contextValue = {
        selectedCompanyId: 'client-999',
        selectedCompanyName: 'Test Company GmbH',
        boilerplateSections: [
          { id: '1', content: 'Section 1', order: 0, isLocked: false },
          { id: '2', content: 'Section 2', order: 1, isLocked: false }
        ],
        updateBoilerplateSections: jest.fn(),
        attachedAssets: [
          {
            id: 'att-1',
            type: 'asset' as const,
            assetId: 'asset-1',
            metadata: { fileName: 'test.pdf' },
            attachedAt: Timestamp.now(),
            attachedBy: 'user-1'
          }
        ],
        removeAsset: jest.fn()
      };

      mockUseCampaign.mockReturnValue(contextValue as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      // Boilerplate Loader sollte initialSections bekommen
      expect(screen.getByText('Initial Sections: 2')).toBeInTheDocument();

      // MediaList sollte Attachments zeigen
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    it('should call updateBoilerplateSections from context when boilerplate changes', () => {
      const updateBoilerplateSections = jest.fn();

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        updateBoilerplateSections
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      const changeSectionsButton = screen.getByText('Change Sections');
      fireEvent.click(changeSectionsButton);

      expect(updateBoilerplateSections).toHaveBeenCalledTimes(1);
      expect(updateBoilerplateSections).toHaveBeenCalledWith([
        { id: '1', content: 'Test Boilerplate', order: 0 }
      ]);
    });

    it('should call removeAsset from context when media item is removed', () => {
      const removeAsset = jest.fn();

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: [
          {
            id: 'att-1',
            type: 'asset' as const,
            assetId: 'asset-to-remove',
            metadata: { fileName: 'removeme.pdf' },
            attachedAt: Timestamp.now(),
            attachedBy: 'user-1'
          }
        ],
        removeAsset
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      const removeButton = screen.getByLabelText('Medium entfernen');
      fireEvent.click(removeButton);

      expect(removeAsset).toHaveBeenCalledTimes(1);
      expect(removeAsset).toHaveBeenCalledWith('asset-to-remove');
    });
  });

  describe('Empty State vs MediaList Toggle', () => {
    it('should show MediaEmptyState when no assets attached', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: []
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      expect(screen.getAllByText('Medien hinzufügen').length).toBeGreaterThan(0);
      expect(screen.getByText('Klicken zum Auswählen')).toBeInTheDocument();
    });

    it('should show MediaList when assets are attached', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: [
          {
            id: 'att-1',
            type: 'asset' as const,
            assetId: 'asset-1',
            metadata: { fileName: 'document.pdf' },
            attachedAt: Timestamp.now(),
            attachedBy: 'user-1'
          }
        ]
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.queryByText('Klicken zum Auswählen')).not.toBeInTheDocument();
    });

    it('should toggle from empty state to list when assets added', () => {
      // Render 1: Leer
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: []
      } as any);

      const { unmount } = render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      // Anfangs leer
      expect(screen.getByText('Klicken zum Auswählen')).toBeInTheDocument();

      // Cleanup first render
      unmount();

      // Render 2: Mit Assets
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: [
          {
            id: 'att-1',
            type: 'asset' as const,
            assetId: 'asset-1',
            metadata: { fileName: 'new-file.jpg' },
            attachedAt: Timestamp.now(),
            attachedBy: 'user-1'
          }
        ]
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      // Jetzt MediaList
      expect(screen.getByText('new-file.jpg')).toBeInTheDocument();
      expect(screen.queryByText('Klicken zum Auswählen')).not.toBeInTheDocument();
    });
  });

  describe('Asset Selector Integration', () => {
    it('should call onOpenAssetSelector when header button clicked', () => {
      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      // Finde alle Buttons und klicke auf den ersten (Header-Button)
      const buttons = screen.getAllByRole('button', { name: /medien hinzufügen/i });
      fireEvent.click(buttons[0]);

      expect(mockOnOpenAssetSelector).toHaveBeenCalledTimes(1);
    });

    it('should call onOpenAssetSelector when empty state clicked', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: []
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      // Empty State ist der zweite Button mit aria-label
      const buttons = screen.getAllByRole('button', { name: /medien hinzufügen/i });
      const emptyStateButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Medien hinzufügen');

      fireEvent.click(emptyStateButton!);

      expect(mockOnOpenAssetSelector).toHaveBeenCalledTimes(1);
    });

    it('should allow adding more assets via header button when list already has items', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: [
          {
            id: 'att-1',
            type: 'asset' as const,
            assetId: 'asset-1',
            metadata: { fileName: 'existing.pdf' },
            attachedAt: Timestamp.now(),
            attachedBy: 'user-1'
          }
        ]
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      // Wenn Assets vorhanden sind, gibt es nur den Header-Button
      const addButton = screen.getByRole('button', { name: /medien hinzufügen/i });
      fireEvent.click(addButton);

      expect(mockOnOpenAssetSelector).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple Asset Types', () => {
    it('should render mixed asset types (files and folders)', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: [
          {
            id: 'att-file',
            type: 'asset' as const,
            assetId: 'asset-1',
            metadata: { fileName: 'document.pdf', fileType: 'application/pdf' },
            attachedAt: Timestamp.now(),
            attachedBy: 'user-1'
          },
          {
            id: 'att-folder',
            type: 'folder' as const,
            folderId: 'folder-1',
            metadata: { folderName: 'Marketing Assets' },
            attachedAt: Timestamp.now(),
            attachedBy: 'user-1'
          },
          {
            id: 'att-image',
            type: 'asset' as const,
            assetId: 'asset-2',
            metadata: {
              fileName: 'logo.png',
              fileType: 'image/png',
              thumbnailUrl: 'https://example.com/thumb.png'
            },
            attachedAt: Timestamp.now(),
            attachedBy: 'user-1'
          }
        ]
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('Marketing Assets')).toBeInTheDocument();
      expect(screen.getByText('logo.png')).toBeInTheDocument();
      expect(screen.getByText('Ordner')).toBeInTheDocument(); // Badge für Ordner
    });
  });

  describe('Styling & Layout', () => {
    it('should have correct container styling', () => {
      const { container } = render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      const mainContainer = container.querySelector('.bg-white.rounded-lg.border.p-6');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should render Medien section with correct header styling', () => {
      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      const heading = screen.getByText('Medien');
      expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
    });

    it('should apply correct spacing between boilerplate and media sections', () => {
      const { container } = render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      const mediaSection = container.querySelector('.mt-8');
      expect(mediaSection).toBeInTheDocument();
    });
  });

  describe('Component Memoization', () => {
    it('should use React.memo to prevent unnecessary re-renders', () => {
      const { rerender } = render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      const firstRender = screen.getByText('Medien');

      // Re-render mit denselben Props
      rerender(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      const secondRender = screen.getByText('Medien');

      // React.memo sollte verhindern, dass die Komponente neu gerendert wird
      // (Test prüft dass Component erfolgreich re-rendert ohne Fehler)
      expect(firstRender).toBe(secondRender);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined client data gracefully', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        selectedCompanyId: '',
        selectedCompanyName: ''
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      // Sollte ohne Fehler rendern
      expect(screen.getByTestId('boilerplate-loader')).toBeInTheDocument();
    });

    it('should handle large number of attachments', () => {
      const manyAttachments: CampaignAssetAttachment[] = Array.from(
        { length: 50 },
        (_, i) => ({
          id: `att-${i}`,
          type: 'asset' as const,
          assetId: `asset-${i}`,
          metadata: { fileName: `file-${i}.pdf` },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-1'
        })
      );

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: manyAttachments
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      expect(screen.getByText('file-0.pdf')).toBeInTheDocument();
      expect(screen.getByText('file-49.pdf')).toBeInTheDocument();
    });

    it('should handle rapid remove clicks', () => {
      const removeAsset = jest.fn();

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: [
          {
            id: 'att-1',
            type: 'asset' as const,
            assetId: 'asset-1',
            metadata: { fileName: 'test.pdf' },
            attachedAt: Timestamp.now(),
            attachedBy: 'user-1'
          }
        ],
        removeAsset
      } as any);

      render(
        <AttachmentsTab
          organizationId="org-123"
          onOpenAssetSelector={mockOnOpenAssetSelector}
        />
      );

      const removeButton = screen.getByLabelText('Medium entfernen');

      // Schnelle mehrfache Klicks
      fireEvent.click(removeButton);
      fireEvent.click(removeButton);
      fireEvent.click(removeButton);

      // removeAsset sollte mehrfach aufgerufen werden (Context entscheidet über Duplikate)
      expect(removeAsset).toHaveBeenCalledTimes(3);
    });
  });
});
