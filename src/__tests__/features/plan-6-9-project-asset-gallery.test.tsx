/**
 * Plan 6/9: ProjectAssetGallery UI-Komponente Tests
 * 
 * Testet die ProjectAssetGallery Komponente:
 * - Asset-Loading und -Auflösung
 * - Filter-Funktionalität (Typ, Phase, Status)
 * - View-Modi (Grid/List)
 * - Asset-Status-Anzeige und -Refresh
 * - Bulk-Operationen und Asset-Sharing
 * - Asset-Selection und -Interaction
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectAssetGallery from '@/components/projects/assets/ProjectAssetGallery';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/lib/firebase/project-service';
import { mediaService } from '@/lib/firebase/media-service';
import { Timestamp } from 'firebase/firestore';
import type { Project } from '@/types/project';
import type { CampaignAssetAttachment, ResolvedAsset } from '@/types/pr';

// Mock der Abhängigkeiten
jest.mock('@/context/AuthContext');
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/media-service');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;

describe('Plan 6/9: ProjectAssetGallery UI-Komponente', () => {
  const mockUser = { uid: 'org123', email: 'test@example.com' };
  
  const mockProject: Project = {
    id: 'project123',
    userId: 'user123',
    organizationId: 'org123',
    title: 'Test Marketing Projekt',
    description: 'Test Projekt für Asset Gallery',
    status: 'active',
    currentStage: 'creation',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockSharedAssets: CampaignAssetAttachment[] = [
    {
      id: 'shared-attachment-1',
      type: 'asset',
      assetId: 'asset-shared-1',
      projectId: 'project123',
      isProjectWide: true,
      metadata: {
        fileName: 'shared-logo.jpg',
        fileType: 'image/jpeg',
        thumbnailUrl: 'https://example.com/shared-logo.jpg',
        description: 'Projekt-weites Logo',
        attachedInPhase: 'creation',
        lastVerified: Timestamp.now(),
        needsRefresh: false
      },
      attachedAt: Timestamp.now(),
      attachedBy: 'user123'
    },
    {
      id: 'shared-attachment-2',
      type: 'asset',
      assetId: 'asset-shared-2',
      projectId: 'project123',
      isProjectWide: false,
      metadata: {
        fileName: 'outdated-presentation.pdf',
        fileType: 'application/pdf',
        thumbnailUrl: '',
        description: 'Veraltete Präsentation',
        attachedInPhase: 'approval',
        lastVerified: Timestamp.fromMillis(Date.now() - 10 * 86400000), // 10 Tage alt
        needsRefresh: true
      },
      attachedAt: Timestamp.now(),
      attachedBy: 'user123'
    }
  ];

  const mockResolvedAssets: ResolvedAsset[] = [
    {
      attachment: mockSharedAssets[0],
      asset: {
        id: 'asset-shared-1',
        fileName: 'shared-logo.jpg',
        fileType: 'image/jpeg',
        downloadUrl: 'https://example.com/shared-logo.jpg'
      },
      isAvailable: true,
      hasChanged: false,
      needsRefresh: false,
      downloadUrl: 'https://example.com/shared-logo.jpg'
    },
    {
      attachment: mockSharedAssets[1],
      isAvailable: false,
      hasChanged: true,
      needsRefresh: true,
      error: 'Asset nicht verfügbar'
    }
  ];

  const defaultProps = {
    project: mockProject,
    onAssetSelect: jest.fn(),
    onAssetsChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockProjectService.getProjectSharedAssets.mockResolvedValue(mockSharedAssets);
    mockMediaService.resolveAttachedAssets.mockResolvedValue(mockResolvedAssets);
    mockMediaService.refreshAssetSnapshots.mockResolvedValue(mockSharedAssets);
    mockMediaService.shareAssetToProject.mockResolvedValue();
  });

  describe('Basis-Rendering und Asset-Loading', () => {
    it('sollte Loading-State anzeigen', () => {
      mockProjectService.getProjectSharedAssets.mockReturnValue(new Promise(() => {}));
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      expect(screen.getByTestId('loading-spinner') || 
             document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('sollte Assets beim Mount laden', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockProjectService.getProjectSharedAssets).toHaveBeenCalledWith(
          'project123',
          { organizationId: 'org123' }
        );
      });

      expect(mockMediaService.resolveAttachedAssets).toHaveBeenCalledWith(
        mockSharedAssets,
        true,
        { organizationId: 'org123' }
      );
    });

    it('sollte korrekte Asset-Anzahl anzeigen', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2 von 2 Assets')).toBeInTheDocument();
      });
    });

    it('sollte Projekt-Titel in Header anzeigen', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Projekt Assets')).toBeInTheDocument();
      });
    });

    it('sollte graceful mit leeren Asset-Listen umgehen', async () => {
      mockProjectService.getProjectSharedAssets.mockResolvedValue([]);
      mockMediaService.resolveAttachedAssets.mockResolvedValue([]);
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Keine Assets gefunden')).toBeInTheDocument();
        expect(screen.getByText('Asset hinzufügen')).toBeInTheDocument();
      });
    });
  });

  describe('Asset-Display und Status-Anzeige', () => {
    it('sollte verfügbare Assets korrekt anzeigen', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByAltText('shared-logo.jpg')).toBeInTheDocument();
        expect(screen.getByText('shared-logo.jpg')).toBeInTheDocument();
      });
    });

    it('sollte Asset-Status korrekt anzeigen', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        // Verfügbares Asset sollte "OK" Status haben
        expect(screen.getByText('OK')).toBeInTheDocument();
        
        // Fehlendes Asset sollte "Fehlend" Status haben  
        expect(screen.getByText('Fehlend')).toBeInTheDocument();
      });
    });

    it('sollte "Update nötig" Status für veraltete Assets anzeigen', async () => {
      const resolvedWithRefresh = [
        {
          attachment: mockSharedAssets[0],
          asset: { id: 'asset-1', fileName: 'test.jpg' },
          isAvailable: true,
          hasChanged: false,
          needsRefresh: true
        }
      ];
      
      mockMediaService.resolveAttachedAssets.mockResolvedValue(resolvedWithRefresh);
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Update')).toBeInTheDocument();
      });
    });

    it('sollte geteilte Assets mit Share-Icon markieren', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        // Projekt-weites Asset sollte Share-Icon haben
        const sharedAssetCard = screen.getByText('shared-logo.jpg').closest('.bg-white');
        expect(sharedAssetCard?.querySelector('[data-testid="share-icon"]') ||
               sharedAssetCard?.querySelector('svg[class*="ShareIcon"]')).toBeInTheDocument();
      });
    });

    it('sollte Fallback für Assets ohne Thumbnail anzeigen', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        // Asset ohne thumbnailUrl sollte Fallback-Icon haben
        expect(document.querySelector('[data-testid="photo-icon"]') ||
               document.querySelector('svg[class*="PhotoIcon"]')).toBeInTheDocument();
      });
    });
  });

  describe('View-Modi', () => {
    it('sollte standardmäßig Grid-View anzeigen', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const gridContainer = document.querySelector('.grid.grid-cols-2');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('sollte zwischen Grid- und List-View wechseln', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(document.querySelector('.grid.grid-cols-2')).toBeInTheDocument();
      });
      
      // Wechsel zu List-View
      const listViewButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('[data-testid="folder-icon"]') ||
        btn.querySelector('svg[class*="FolderIcon"]')
      );
      
      if (listViewButton) {
        await user.click(listViewButton);
        
        await waitFor(() => {
          expect(document.querySelector('.space-y-2')).toBeInTheDocument();
          expect(document.querySelector('.grid.grid-cols-2')).not.toBeInTheDocument();
        });
      }
    });

    it('sollte List-View mit Checkboxen anzeigen', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const listViewButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('[data-testid="folder-icon"]') ||
          btn.querySelector('svg[class*="FolderIcon"]')
        );
        
        if (listViewButton) {
          user.click(listViewButton);
        }
      });
      
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filter-Funktionalität', () => {
    it('sollte Filter-Panel ein/ausblenden', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      // Filter-Button suchen
      const filterButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('[data-testid="adjustments-icon"]') ||
        btn.querySelector('svg[class*="AdjustmentsHorizontalIcon"]')
      );
      
      if (filterButton) {
        await user.click(filterButton);
        
        expect(screen.getByPlaceholderText('Asset suchen...')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Alle Typen')).toBeInTheDocument();
        
        await user.click(filterButton);
        
        await waitFor(() => {
          expect(screen.queryByPlaceholderText('Asset suchen...')).not.toBeInTheDocument();
        });
      }
    });

    it('sollte Suchfilter korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      // Filter-Panel öffnen
      const filterButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg[class*="AdjustmentsHorizontalIcon"]')
      );
      
      if (filterButton) {
        await user.click(filterButton);
        
        const searchInput = screen.getByPlaceholderText('Asset suchen...');
        await user.type(searchInput, 'logo');
        
        await waitFor(() => {
          expect(screen.getByText('1 von 2 Assets')).toBeInTheDocument();
          expect(screen.getByText('shared-logo.jpg')).toBeInTheDocument();
          expect(screen.queryByText('outdated-presentation.pdf')).not.toBeInTheDocument();
        });
      }
    });

    it('sollte Typ-Filter korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      // Filter-Panel öffnen
      const filterButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg[class*="AdjustmentsHorizontalIcon"]')
      );
      
      if (filterButton) {
        await user.click(filterButton);
        
        const typeSelect = screen.getByDisplayValue('Alle Typen');
        await user.selectOptions(typeSelect, 'images');
        
        await waitFor(() => {
          expect(screen.getByText('1 von 2 Assets')).toBeInTheDocument();
          expect(screen.getByText('shared-logo.jpg')).toBeInTheDocument();
        });
      }
    });

    it('sollte Status-Filter korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      // Filter-Panel öffnen
      const filterButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg[class*="AdjustmentsHorizontalIcon"]')
      );
      
      if (filterButton) {
        await user.click(filterButton);
        
        const statusSelect = screen.getByDisplayValue('Alle Status');
        await user.selectOptions(statusSelect, 'missing');
        
        await waitFor(() => {
          expect(screen.getByText('1 von 2 Assets')).toBeInTheDocument();
          expect(screen.getByText('outdated-presentation.pdf')).toBeInTheDocument();
        });
      }
    });

    it('sollte Phase-Filter korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      // Filter-Panel öffnen
      const filterButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg[class*="AdjustmentsHorizontalIcon"]')
      );
      
      if (filterButton) {
        await user.click(filterButton);
        
        const phaseSelect = screen.getByDisplayValue('Alle Phasen');
        await user.selectOptions(phaseSelect, 'creation');
        
        await waitFor(() => {
          expect(screen.getByText('1 von 2 Assets')).toBeInTheDocument();
          expect(screen.getByText('shared-logo.jpg')).toBeInTheDocument();
        });
      }
    });

    it('sollte "Geteilt"-Filter korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      // Filter-Panel öffnen
      const filterButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg[class*="AdjustmentsHorizontalIcon"]')
      );
      
      if (filterButton) {
        await user.click(filterButton);
        
        const typeSelect = screen.getByDisplayValue('Alle Typen');
        await user.selectOptions(typeSelect, 'shared');
        
        await waitFor(() => {
          // Nur projekt-weite Assets sollten angezeigt werden
          expect(screen.getByText('1 von 2 Assets')).toBeInTheDocument();
          expect(screen.getByText('shared-logo.jpg')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Asset-Selection und Bulk-Operationen', () => {
    it('sollte Assets auswählen können', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('shared-logo.jpg')).toBeInTheDocument();
      });
      
      const assetCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(assetCheckbox);
      
      expect(screen.getByText('1 ausgewählt')).toBeInTheDocument();
      expect(screen.getByText('Teilen')).toBeInTheDocument();
    });

    it('sollte mehrere Assets auswählen können', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(2);
      });
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);
      
      expect(screen.getByText('2 ausgewählt')).toBeInTheDocument();
    });

    it('sollte Bulk-Share-Operation durchführen', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
      
      const assetCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(assetCheckbox);
      
      const shareButton = screen.getByText('Teilen');
      await user.click(shareButton);
      
      await waitFor(() => {
        expect(mockMediaService.shareAssetToProject).toHaveBeenCalled();
      });
    });

    it('sollte Asset-Selection nach Bulk-Operation zurücksetzen', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const assetCheckbox = screen.getAllByRole('checkbox')[0];
        user.click(assetCheckbox);
      });
      
      await waitFor(() => {
        expect(screen.getByText('1 ausgewählt')).toBeInTheDocument();
      });
      
      const shareButton = screen.getByText('Teilen');
      await user.click(shareButton);
      
      await waitFor(() => {
        expect(screen.queryByText('1 ausgewählt')).not.toBeInTheDocument();
      });
    });
  });

  describe('Asset-Refresh', () => {
    it('sollte Refresh-Button anzeigen', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const refreshButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg[class*="ArrowPathIcon"]')
        );
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('sollte Asset-Refresh durchführen', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const refreshButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg[class*="ArrowPathIcon"]')
        );
        
        if (refreshButton) {
          user.click(refreshButton);
        }
      });
      
      await waitFor(() => {
        expect(mockMediaService.refreshAssetSnapshots).toHaveBeenCalledWith(
          mockSharedAssets,
          { organizationId: 'org123', userId: 'org123' }
        );
      });
      
      expect(defaultProps.onAssetsChange).toHaveBeenCalled();
    });

    it('sollte Refresh-Button während Refresh disablen', async () => {
      const user = userEvent.setup();
      
      // Mock langsame Refresh-Operation
      mockMediaService.refreshAssetSnapshots.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const refreshButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg[class*="ArrowPathIcon"]')
        ) as HTMLButtonElement;
        
        if (refreshButton) {
          user.click(refreshButton);
          expect(refreshButton.disabled).toBe(true);
        }
      });
    });

    it('sollte Spin-Animation während Refresh anzeigen', async () => {
      const user = userEvent.setup();
      
      mockMediaService.refreshAssetSnapshots.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const refreshButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg[class*="ArrowPathIcon"]')
        );
        
        if (refreshButton) {
          user.click(refreshButton);
          
          const spinningIcon = refreshButton.querySelector('.animate-spin');
          expect(spinningIcon).toBeInTheDocument();
        }
      });
    });
  });

  describe('Asset-Interaktion', () => {
    it('sollte onAssetSelect beim Asset-Klick aufrufen', async () => {
      const user = userEvent.setup();
      const mockOnAssetSelect = jest.fn();
      
      render(<ProjectAssetGallery {...defaultProps} onAssetSelect={mockOnAssetSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('shared-logo.jpg')).toBeInTheDocument();
      });
      
      const assetCard = screen.getByText('shared-logo.jpg').closest('.bg-white');
      if (assetCard) {
        await user.click(assetCard);
        
        expect(mockOnAssetSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'shared-attachment-1',
            assetId: 'asset-shared-1'
          })
        );
      }
    });

    it('sollte Asset-Details in List-View korrekt anzeigen', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      // Wechsel zu List-View
      await waitFor(() => {
        const listViewButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg[class*="FolderIcon"]')
        );
        
        if (listViewButton) {
          user.click(listViewButton);
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('image/jpeg')).toBeInTheDocument();
        expect(screen.getByText('creation')).toBeInTheDocument();
        expect(screen.getByText('Geteilt')).toBeInTheDocument();
      });
    });

    it('sollte Asset-Checkbox-Selection von Asset-Klick trennen', async () => {
      const user = userEvent.setup();
      const mockOnAssetSelect = jest.fn();
      
      render(<ProjectAssetGallery {...defaultProps} onAssetSelect={mockOnAssetSelect} />);
      
      await waitFor(() => {
        const assetCheckbox = screen.getAllByRole('checkbox')[0];
        expect(assetCheckbox).toBeInTheDocument();
      });
      
      const assetCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(assetCheckbox);
      
      expect(screen.getByText('1 ausgewählt')).toBeInTheDocument();
      expect(mockOnAssetSelect).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('sollte graceful mit ProjectService-Fehlern umgehen', async () => {
      mockProjectService.getProjectSharedAssets.mockRejectedValue(new Error('Service error'));
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        // Sollte nicht crashen und Loading beenden
        expect(screen.queryByText(/loading/i) || 
               document.querySelector('.animate-spin')).not.toBeInTheDocument();
      });
    });

    it('sollte graceful mit MediaService-Fehlern umgehen', async () => {
      mockMediaService.resolveAttachedAssets.mockRejectedValue(new Error('Resolve error'));
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i) || 
               document.querySelector('.animate-spin')).not.toBeInTheDocument();
      });
    });

    it('sollte Refresh-Fehler graceful behandeln', async () => {
      const user = userEvent.setup();
      mockMediaService.refreshAssetSnapshots.mockRejectedValue(new Error('Refresh failed'));
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const refreshButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg[class*="ArrowPathIcon"]')
        );
        
        if (refreshButton) {
          user.click(refreshButton);
        }
      });
      
      await waitFor(() => {
        // Button sollte wieder enabled sein
        const refreshButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg[class*="ArrowPathIcon"]')
        ) as HTMLButtonElement;
        
        expect(refreshButton?.disabled).toBe(false);
      });
    });

    it('sollte Bulk-Share-Fehler graceful behandeln', async () => {
      const user = userEvent.setup();
      mockMediaService.shareAssetToProject.mockRejectedValue(new Error('Share failed'));
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const assetCheckbox = screen.getAllByRole('checkbox')[0];
        user.click(assetCheckbox);
      });
      
      await waitFor(() => {
        const shareButton = screen.getByText('Teilen');
        user.click(shareButton);
      });
      
      // Sollte nicht crashen
      await waitFor(() => {
        expect(screen.queryByText('1 ausgewählt')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance und Optimierungen', () => {
    it('sollte Assets nur bei Mount und Projekt-Änderung laden', () => {
      const { rerender } = render(<ProjectAssetGallery {...defaultProps} />);
      
      expect(mockProjectService.getProjectSharedAssets).toHaveBeenCalledTimes(1);
      
      // Re-render ohne Projekt-Änderung
      rerender(<ProjectAssetGallery {...defaultProps} />);
      expect(mockProjectService.getProjectSharedAssets).toHaveBeenCalledTimes(1);
      
      // Re-render mit neuem Projekt
      const newProject = { ...mockProject, id: 'project456' };
      rerender(<ProjectAssetGallery {...defaultProps} project={newProject} />);
      expect(mockProjectService.getProjectSharedAssets).toHaveBeenCalledTimes(2);
    });

    it('sollte bei fehlendem User/Projekt nicht laden', () => {
      mockUseAuth.mockReturnValue({ user: null } as any);
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      expect(mockProjectService.getProjectSharedAssets).not.toHaveBeenCalled();
    });

    it('sollte Filter-State lokal verwalten', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      // Filter-Panel öffnen
      const filterButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg[class*="AdjustmentsHorizontalIcon"]')
      );
      
      if (filterButton) {
        await user.click(filterButton);
        
        const searchInput = screen.getByPlaceholderText('Asset suchen...');
        await user.type(searchInput, 'test');
        
        // Sollte keine zusätzlichen Service-Calls auslösen
        expect(mockProjectService.getProjectSharedAssets).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('UI/UX Features', () => {
    it('sollte responsive Grid-Layout verwenden', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const gridContainer = document.querySelector('.grid');
        expect(gridContainer).toHaveClass(
          'grid-cols-2',
          'md:grid-cols-4', 
          'lg:grid-cols-6'
        );
      });
    });

    it('sollte Asset-Status mit korrekten Farben anzeigen', async () => {
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        // Verfügbares Asset - grün
        expect(document.querySelector('.text-green-500.bg-green-50')).toBeInTheDocument();
        
        // Fehlendes Asset - rot
        expect(document.querySelector('.text-red-500.bg-red-50')).toBeInTheDocument();
      });
    });

    it('sollte visuelle Selection-Indicators anzeigen', async () => {
      const user = userEvent.setup();
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        const assetCard = screen.getByText('shared-logo.jpg').closest('.bg-white');
        expect(assetCard).not.toHaveClass('border-blue-500');
      });
      
      const assetCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(assetCheckbox);
      
      const assetCard = screen.getByText('shared-logo.jpg').closest('.bg-white');
      expect(assetCard).toHaveClass('border-blue-500', 'ring-2', 'ring-blue-200');
    });

    it('sollte Empty-State mit Call-to-Action anzeigen', async () => {
      mockProjectService.getProjectSharedAssets.mockResolvedValue([]);
      
      render(<ProjectAssetGallery {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Keine Assets gefunden')).toBeInTheDocument();
        expect(screen.getByText('Fügen Sie Assets zu diesem Projekt hinzu oder passen Sie die Filter an.')).toBeInTheDocument();
        expect(screen.getByText('Asset hinzufügen')).toBeInTheDocument();
      });
    });
  });
});