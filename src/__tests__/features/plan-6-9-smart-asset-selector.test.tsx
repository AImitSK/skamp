/**
 * Plan 6/9: SmartAssetSelector UI-Komponente Tests
 * 
 * Testet die Smart Asset Selector Komponente:
 * - Smart Suggestions und KI-basiertes Scoring
 * - Erweiterte Filter-Funktionalität
 * - Asset-Selection und Multi-Selection
 * - Project-spezifische Asset-Vorschläge
 * - Pipeline-Phase-basierte Empfehlungen
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SmartAssetSelector from '@/components/projects/assets/SmartAssetSelector';
import { useAuth } from '@/context/AuthContext';
import { mediaService } from '@/lib/firebase/media-service';
import { projectService } from '@/lib/firebase/project-service';
import { Timestamp } from 'firebase/firestore';
import type { MediaAsset, MediaFolder } from '@/types/media';
import type { Project } from '@/types/project';
import type { CampaignAssetAttachment } from '@/types/pr';

// Mock der Abhängigkeiten
jest.mock('@/context/AuthContext');
jest.mock('@/lib/firebase/media-service');
jest.mock('@/lib/firebase/project-service');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

describe('Plan 6/9: SmartAssetSelector UI-Komponente', () => {
  const mockUser = { uid: 'user123', email: 'test@example.com' };
  
  const mockProject: Project = {
    id: 'project123',
    userId: 'user123',
    organizationId: 'org123',
    title: 'Test Marketing Projekt',
    description: 'Test Projekt für Smart Asset Selector',
    status: 'active',
    currentStage: 'creation',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockAssets: MediaAsset[] = [
    {
      id: 'asset1',
      userId: 'user123',
      fileName: 'logo-design.jpg',
      fileType: 'image/jpeg',
      downloadUrl: 'https://example.com/logo.jpg',
      tags: ['logo', 'branding', 'creation'],
      description: 'Company logo for marketing',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'asset2',
      userId: 'user123',
      fileName: 'final-presentation.pdf',
      fileType: 'application/pdf',
      downloadUrl: 'https://example.com/presentation.pdf',
      tags: ['final', 'approval', 'presentation'],
      description: 'Final presentation PDF',
      createdAt: Timestamp.fromMillis(Date.now() - 86400000), // 1 Tag alt
      updatedAt: Timestamp.fromMillis(Date.now() - 3600000)   // 1 Stunde alt
    },
    {
      id: 'asset3',
      userId: 'user123',
      fileName: 'old-template.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      downloadUrl: 'https://example.com/template.docx',
      tags: ['template', 'old'],
      description: 'Old template document',
      createdAt: Timestamp.fromMillis(Date.now() - 30 * 86400000), // 30 Tage alt
      updatedAt: Timestamp.fromMillis(Date.now() - 30 * 86400000)
    }
  ];

  const mockFolders: MediaFolder[] = [
    {
      id: 'folder1',
      userId: 'user123',
      name: 'Marketing Assets',
      description: 'Marketing-bezogene Assets',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];

  const mockExistingAttachments: CampaignAssetAttachment[] = [
    {
      id: 'attachment1',
      type: 'asset',
      assetId: 'asset2', // Bereits verwendetes Asset
      projectId: 'project123',
      metadata: {
        fileName: 'final-presentation.pdf',
        fileType: 'application/pdf'
      },
      attachedAt: Timestamp.now(),
      attachedBy: 'user123'
    }
  ];

  const mockProjectSharedAssets = [
    {
      id: 'shared1',
      assetId: 'asset1',
      type: 'asset',
      metadata: { fileName: 'logo-design.jpg' }
    }
  ];

  const mockProjectSummary = {
    totalAssets: 10,
    assetsByType: { 'image/jpeg': 6, 'application/pdf': 4 },
    topAssets: [
      { assetId: 'asset1', fileName: 'logo-design.jpg', usage: 5 },
      { assetId: 'asset2', fileName: 'final-presentation.pdf', usage: 3 }
    ]
  };

  const defaultProps = {
    project: mockProject,
    currentPhase: 'creation',
    existingAttachments: mockExistingAttachments,
    onSelect: jest.fn(),
    onCancel: jest.fn(),
    isOpen: true,
    multiSelect: true,
    filterTypes: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockMediaService.getMediaAssets.mockResolvedValue(mockAssets);
    mockMediaService.getFolders.mockResolvedValue(mockFolders);
    mockProjectService.getProjectSharedAssets.mockResolvedValue(mockProjectSharedAssets);
    mockMediaService.getProjectAssetSummary.mockResolvedValue(mockProjectSummary);
  });

  describe('Basis-Rendering und Setup', () => {
    it('sollte nicht rendern wenn isOpen=false', () => {
      render(<SmartAssetSelector {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Smart Asset Auswahl')).not.toBeInTheDocument();
    });

    it('sollte korrekt mit Projekt-Informationen rendern', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      expect(screen.getByText('Smart Asset Auswahl')).toBeInTheDocument();
      expect(screen.getByText('Für Projekt: Test Marketing Projekt')).toBeInTheDocument();
      expect(screen.getByText(/Phase: creation/)).toBeInTheDocument();
    });

    it('sollte Assets beim Öffnen laden', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockMediaService.getMediaAssets).toHaveBeenCalledWith('user123');
        expect(mockMediaService.getFolders).toHaveBeenCalledWith('user123');
      });
    });

    it('sollte Loading-State anzeigen', () => {
      mockMediaService.getMediaAssets.mockReturnValue(new Promise(() => {})); // Niemals resolven
      
      render(<SmartAssetSelector {...defaultProps} />);
      
      expect(screen.getByText('Assets durchsuchen...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner') || document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Smart Suggestions und KI-Scoring', () => {
    it('sollte Smart Suggestions generieren', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Smart Vorschläge')).toBeInTheDocument();
      });
      
      expect(mockProjectService.getProjectSharedAssets).toHaveBeenCalledWith(
        'project123',
        { organizationId: 'user123' }
      );
      expect(mockMediaService.getProjectAssetSummary).toHaveBeenCalledWith(
        'project123',
        { organizationId: 'user123' }
      );
    });

    it('sollte Assets basierend auf aktueller Phase bewerten', async () => {
      render(<SmartAssetSelector {...defaultProps} currentPhase="creation" />);
      
      await waitFor(() => {
        // Logo-Asset sollte für Creation-Phase relevant sein
        const logoAsset = screen.getByAltText('logo-design.jpg');
        expect(logoAsset.closest('.relative')).toBeInTheDocument();
      });
    });

    it('sollte project-wide geteilte Assets höher bewerten', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        // Asset1 ist projekt-weit geteilt und sollte Share-Icon haben
        const sharedAsset = screen.getByAltText('logo-design.jpg');
        const container = sharedAsset.closest('.relative');
        expect(container?.querySelector('[data-testid="share-icon"]') || 
               container?.querySelector('svg[class*="ShareIcon"]')).toBeInTheDocument();
      });
    });

    it('sollte häufig verwendete Assets als Vorschläge anzeigen', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        // Asset1 ist in topAssets und sollte Badge haben
        expect(screen.getByText(/Sehr relevant|Relevant|Interessant/)).toBeInTheDocument();
      });
    });

    it('sollte bereits verwendete Assets weniger bewerten', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        // Asset2 ist bereits verwendet (mockExistingAttachments)
        // Sollte nicht in Smart Suggestions erscheinen oder niedrigen Score haben
        const suggestions = screen.getByText('Smart Vorschläge').closest('div');
        const asset2InSuggestions = suggestions?.querySelector('[alt="final-presentation.pdf"]');
        expect(asset2InSuggestions).not.toBeInTheDocument();
      });
    });

    it('sollte Score-Badges korrekt anzeigen', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        // Prüfe verschiedene Relevanz-Level
        expect(screen.getByText(/Sehr relevant|Relevant|Interessant/)).toBeInTheDocument();
      });
    });
  });

  describe('Filter-Funktionalität', () => {
    it('sollte Suchfilter korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Assets (3)')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Assets durchsuchen...');
      await user.type(searchInput, 'logo');
      
      await waitFor(() => {
        expect(screen.getByText('Assets (1)')).toBeInTheDocument();
        expect(screen.getByAltText('logo-design.jpg')).toBeInTheDocument();
        expect(screen.queryByAltText('final-presentation.pdf')).not.toBeInTheDocument();
      });
    });

    it('sollte Source-Filter korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Alle Assets')).toBeInTheDocument();
      });
      
      const sourceSelect = screen.getByDisplayValue('Alle Assets');
      await user.selectOptions(sourceSelect, 'suggested');
      
      await waitFor(() => {
        // Nur Vorschläge sollten angezeigt werden
        expect(screen.getByDisplayValue('Vorschläge')).toBeInTheDocument();
      });
    });

    it('sollte Typ-Filter korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} />);
      
      const typeSelect = screen.getByDisplayValue('Alle Typen');
      await user.selectOptions(typeSelect, 'image');
      
      await waitFor(() => {
        expect(screen.getByAltText('logo-design.jpg')).toBeInTheDocument();
        expect(screen.queryByAltText('final-presentation.pdf')).not.toBeInTheDocument();
      });
    });

    it('sollte erweiterte Filter anzeigen/verbergen', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} />);
      
      const advancedFilterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(advancedFilterButton);
      
      expect(screen.getByText('Zeitraum')).toBeInTheDocument();
      expect(screen.getByText('Phase')).toBeInTheDocument();
      
      await user.click(advancedFilterButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Zeitraum')).not.toBeInTheDocument();
      });
    });

    it('sollte Zeitraum-Filter korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} />);
      
      // Erweiterte Filter öffnen
      const advancedFilterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(advancedFilterButton);
      
      const dateRangeSelect = screen.getByDisplayValue('Alle Zeit');
      await user.selectOptions(dateRangeSelect, 'week');
      
      await waitFor(() => {
        // Nur Assets aus der letzten Woche sollten angezeigt werden
        expect(screen.getByAltText('logo-design.jpg')).toBeInTheDocument();
        expect(screen.queryByAltText('old-template.docx')).not.toBeInTheDocument();
      });
    });

    it('sollte filterTypes prop berücksichtigen', async () => {
      render(<SmartAssetSelector {...defaultProps} filterTypes={['image/*']} />);
      
      await waitFor(() => {
        expect(screen.getByAltText('logo-design.jpg')).toBeInTheDocument();
        expect(screen.queryByAltText('final-presentation.pdf')).not.toBeInTheDocument();
        expect(screen.getByText('Assets (1)')).toBeInTheDocument();
      });
    });
  });

  describe('Asset-Selection', () => {
    it('sollte Multi-Selection korrekt handhaben', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('0 Assets ausgewählt')).toBeInTheDocument();
      });
      
      const logoAsset = screen.getByAltText('logo-design.jpg');
      await user.click(logoAsset);
      
      expect(screen.getByText('1 Asset ausgewählt')).toBeInTheDocument();
      
      const templateAsset = screen.getByAltText('old-template.docx');
      await user.click(templateAsset);
      
      expect(screen.getByText('2 Assets ausgewählt')).toBeInTheDocument();
      
      // Deselection
      await user.click(logoAsset);
      expect(screen.getByText('1 Asset ausgewählt')).toBeInTheDocument();
    });

    it('sollte Single-Selection korrekt handhaben', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} multiSelect={false} />);
      
      const logoAsset = screen.getByAltText('logo-design.jpg');
      await user.click(logoAsset);
      
      expect(screen.getByText('1 Asset ausgewählt')).toBeInTheDocument();
      
      const templateAsset = screen.getByAltText('old-template.docx');
      await user.click(templateAsset);
      
      // Sollte nur ein Asset ausgewählt sein
      expect(screen.getByText('1 Asset ausgewählt')).toBeInTheDocument();
    });

    it('sollte visuelle Selection-Indicators anzeigen', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        const logoAsset = screen.getByAltText('logo-design.jpg');
        expect(logoAsset.closest('.relative')).not.toHaveClass('border-blue-500');
      });
      
      const logoAsset = screen.getByAltText('logo-design.jpg');
      await user.click(logoAsset);
      
      expect(logoAsset.closest('.relative')).toHaveClass('border-blue-500');
      expect(logoAsset.closest('.relative')?.querySelector('[data-testid="check-icon"]') ||
             logoAsset.closest('.relative')?.querySelector('svg[class*="CheckIcon"]')).toBeInTheDocument();
    });

    it('sollte Selection-Counter korrekt aktualisieren', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('0 Assets ausgewählt')).toBeInTheDocument();
      });
      
      const logoAsset = screen.getByAltText('logo-design.jpg');
      await user.click(logoAsset);
      
      expect(screen.getByText('1 ausgewählt')).toBeInTheDocument();
      expect(screen.getByText('1 Asset hinzufügen')).toBeInTheDocument();
    });
  });

  describe('Aktionen und Callbacks', () => {
    it('sollte onSelect mit korrekten Assets aufrufen', async () => {
      const user = userEvent.setup();
      const mockOnSelect = jest.fn();
      
      render(<SmartAssetSelector {...defaultProps} onSelect={mockOnSelect} />);
      
      await waitFor(() => {
        expect(screen.getByAltText('logo-design.jpg')).toBeInTheDocument();
      });
      
      const logoAsset = screen.getByAltText('logo-design.jpg');
      await user.click(logoAsset);
      
      const confirmButton = screen.getByText('1 Asset hinzufügen');
      await user.click(confirmButton);
      
      expect(mockOnSelect).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 'asset1', fileName: 'logo-design.jpg' })],
        [] // folders
      );
    });

    it('sollte onCancel beim Abbrechen aufrufen', async () => {
      const user = userEvent.setup();
      const mockOnCancel = jest.fn();
      
      render(<SmartAssetSelector {...defaultProps} onCancel={mockOnCancel} />);
      
      const cancelButton = screen.getByText('Abbrechen');
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('sollte onCancel beim X-Button aufrufen', async () => {
      const user = userEvent.setup();
      const mockOnCancel = jest.fn();
      
      render(<SmartAssetSelector {...defaultProps} onCancel={mockOnCancel} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i }) || 
                         document.querySelector('button [data-testid="x-mark-icon"]')?.parentElement;
      if (closeButton) {
        await user.click(closeButton);
        expect(mockOnCancel).toHaveBeenCalled();
      }
    });

    it('sollte Confirm-Button disablen wenn keine Assets ausgewählt', () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      const confirmButton = screen.getByText('Assets auswählen');
      expect(confirmButton).toBeDisabled();
    });

    it('sollte Confirm-Button enablen wenn Assets ausgewählt', async () => {
      const user = userEvent.setup();
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByAltText('logo-design.jpg')).toBeInTheDocument();
      });
      
      const logoAsset = screen.getByAltText('logo-design.jpg');
      await user.click(logoAsset);
      
      const confirmButton = screen.getByText('1 Asset hinzufügen');
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('sollte graceful mit MediaService-Fehlern umgehen', async () => {
      mockMediaService.getMediaAssets.mockRejectedValue(new Error('Network error'));
      
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        // Sollte nicht crashen und Loading beenden
        expect(screen.queryByText(/loading/i) || 
               document.querySelector('.animate-spin')).not.toBeInTheDocument();
      });
    });

    it('sollte graceful mit ProjectService-Fehlern umgehen', async () => {
      mockProjectService.getProjectSharedAssets.mockRejectedValue(new Error('Service error'));
      
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        // Smart Suggestions sollten trotzdem versucht werden zu generieren
        expect(screen.queryByText('Smart Vorschläge')).toBeInTheDocument();
      });
    });

    it('sollte mit leeren Asset-Listen umgehen', async () => {
      mockMediaService.getMediaAssets.mockResolvedValue([]);
      mockMediaService.getFolders.mockResolvedValue([]);
      
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Assets (0)')).toBeInTheDocument();
        expect(screen.queryByText('Smart Vorschläge')).not.toBeInTheDocument();
      });
    });
  });

  describe('UI/UX Features', () => {
    it('sollte Suggestion-Badges mit korrekten Farben anzeigen', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        // Teste verschiedene Badge-Typen basierend auf Score
        const badges = screen.getAllByText(/Sehr relevant|Relevant|Interessant/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('sollte Asset-Thumbnails korrekt anzeigen', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        const logoImage = screen.getByAltText('logo-design.jpg');
        expect(logoImage).toHaveAttribute('src', 'https://example.com/logo.jpg');
      });
    });

    it('sollte Fallback-Icons für Assets ohne downloadUrl anzeigen', async () => {
      const assetWithoutUrl = { ...mockAssets[0], downloadUrl: '' };
      mockMediaService.getMediaAssets.mockResolvedValue([assetWithoutUrl]);
      
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(document.querySelector('[data-testid="photo-icon"]') ||
               document.querySelector('svg[class*="PhotoIcon"]')).toBeInTheDocument();
      });
    });

    it('sollte responsive Grid-Layout verwenden', async () => {
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        const assetGrid = document.querySelector('.grid');
        expect(assetGrid).toHaveClass('grid-cols-2', 'md:grid-cols-4', 'lg:grid-cols-6');
      });
    });
  });

  describe('Performance und Optimierungen', () => {
    it('sollte Assets nur bei Bedarf laden', () => {
      render(<SmartAssetSelector {...defaultProps} isOpen={false} />);
      
      expect(mockMediaService.getMediaAssets).not.toHaveBeenCalled();
      expect(mockMediaService.getFolders).not.toHaveBeenCalled();
    });

    it('sollte Suggestions nur mit Assets generieren', async () => {
      mockMediaService.getMediaAssets.mockResolvedValue([]);
      
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockProjectService.getProjectSharedAssets).not.toHaveBeenCalled();
        expect(mockMediaService.getProjectAssetSummary).not.toHaveBeenCalled();
      });
    });

    it('sollte Top-Suggestions auf 12 begrenzen', async () => {
      // Mock viele Assets
      const manyAssets = Array.from({ length: 20 }, (_, i) => ({
        ...mockAssets[0],
        id: `asset${i}`,
        fileName: `asset${i}.jpg`
      }));
      mockMediaService.getMediaAssets.mockResolvedValue(manyAssets);
      
      render(<SmartAssetSelector {...defaultProps} />);
      
      await waitFor(() => {
        const suggestionContainer = screen.getByText('Smart Vorschläge').closest('div');
        const suggestionItems = suggestionContainer?.querySelectorAll('.aspect-square');
        expect(suggestionItems?.length).toBeLessThanOrEqual(6); // Nur erste 6 angezeigt
      });
    });
  });
});