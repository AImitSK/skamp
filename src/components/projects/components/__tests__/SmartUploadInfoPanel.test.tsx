/**
 * Smart Upload Panel Tests
 * Test-Suite für Pipeline-Phase-spezifische Tip-Anzeige und Real-time Empfehlungen
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      organizationId: 'org-789',
    },
  }),
}));

jest.mock('@/lib/firebase/project-upload-service', () => ({
  ProjectUploadService: jest.fn(() => ({
    generateUploadPreview: jest.fn(),
    getUploadRecommendations: jest.fn(),
  })),
}));

jest.mock('@/components/projects/config/project-folder-feature-flags', () => ({
  ProjectFolderFeatureFlags: jest.fn(() => ({
    isFeatureEnabled: jest.fn(),
    getSmartUploadConfig: jest.fn(),
  })),
}));

import { SmartUploadInfoPanel } from '../SmartUploadInfoPanel';
import { ProjectUploadService } from '@/lib/firebase/project-upload-service';
import { ProjectFolderFeatureFlags } from '@/components/projects/config/project-folder-feature-flags';
import type { Project, PipelinePhase, UploadRecommendation } from '@/types';

describe('SmartUploadInfoPanel', () => {
  let mockProject: Project;
  let mockUploadService: any;
  let mockFeatureFlags: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    mockProject = {
      id: 'proj-123',
      title: 'Test Kampagne',
      company: 'ACME Corp',
      clientId: 'client-456',
      organizationId: 'org-789',
      stage: 'creation',
      pipelinePhase: 'creation' as PipelinePhase,
      createdAt: new Date(),
    };

    mockUploadService = {
      generateUploadPreview: jest.fn(),
      getUploadRecommendations: jest.fn(),
    };

    mockFeatureFlags = {
      isFeatureEnabled: jest.fn(),
      getSmartUploadConfig: jest.fn(),
    };

    (ProjectUploadService as jest.Mock).mockReturnValue(mockUploadService);
    (ProjectFolderFeatureFlags as jest.Mock).mockReturnValue(mockFeatureFlags);

    // Default mocks
    mockFeatureFlags.isFeatureEnabled.mockResolvedValue(true);
    mockFeatureFlags.getSmartUploadConfig.mockResolvedValue({
      enabled: true,
      showTips: true,
      showRecommendations: true,
      realTimeUpdates: true,
    });

    jest.clearAllMocks();
  });

  describe('Pipeline-Phase-spezifische Tip-Anzeige', () => {
    it('sollte Ideas Planning Phase Tips korrekt anzeigen', async () => {
      mockProject.pipelinePhase = 'ideas_planning';

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/ideen & planung/i)).toBeInTheDocument();
      });

      // Phase-spezifische Tips
      expect(screen.getByText(/brainstorming-dokumente/i)).toBeInTheDocument();
      expect(screen.getByText(/konzept-entwürfe/i)).toBeInTheDocument();
      expect(screen.getByText(/research-materialien/i)).toBeInTheDocument();

      // Empfohlene Dateitypen
      expect(screen.getByText(/word, powerpoint, pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/dokumente-ordner bevorzugt/i)).toBeInTheDocument();

      // Warnung vor Medien-Uploads
      expect(screen.getByText(/medien-uploads weniger relevant/i)).toBeInTheDocument();
    });

    it('sollte Creation Phase Tips für Kreativ-Assets anzeigen', async () => {
      mockProject.pipelinePhase = 'creation';

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/kreativphase/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/key visuals/i)).toBeInTheDocument();
      expect(screen.getByText(/logos & grafiken/i)).toBeInTheDocument();
      expect(screen.getByText(/video-assets/i)).toBeInTheDocument();
      expect(screen.getByText(/foto-material/i)).toBeInTheDocument();

      // Medien-Ordner Empfehlung
      expect(screen.getByText(/medien-ordner optimal/i)).toBeInTheDocument();
      
      // Qualitäts-Hinweise
      expect(screen.getByText(/hohe auflösung empfohlen/i)).toBeInTheDocument();
      expect(screen.getByText(/original-formate beibehalten/i)).toBeInTheDocument();
    });

    it('sollte Internal Approval Phase Review-Hinweise anzeigen', async () => {
      mockProject.pipelinePhase = 'internal_approval';

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/interne genehmigung/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/review-dokumente/i)).toBeInTheDocument();
      expect(screen.getByText(/feedback-protokolle/i)).toBeInTheDocument();
      expect(screen.getByText(/korrektur-anmerkungen/i)).toBeInTheDocument();

      // Versionierung-Hinweise
      expect(screen.getByText(/versionsnummer hinzufügen/i)).toBeInTheDocument();
      expect(screen.getByText(/v1.0, v1.1 etc/i)).toBeInTheDocument();
    });

    it('sollte Customer Approval Phase Presentation-Tips zeigen', async () => {
      mockProject.pipelinePhase = 'customer_approval';

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/kundenpräsentation/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/finale kampagne/i)).toBeInTheDocument();
      expect(screen.getByText(/präsentations-materialien/i)).toBeInTheDocument();
      expect(screen.getByText(/kunde-ready assets/i)).toBeInTheDocument();

      // Pressemeldungen-Fokus
      expect(screen.getByText(/pressemeldungen-ordner/i)).toBeInTheDocument();
      expect(screen.getByText(/pm_-prefix verwenden/i)).toBeInTheDocument();
    });

    it('sollte Distribution Phase Launch-Hinweise anzeigen', async () => {
      mockProject.pipelinePhase = 'distribution';

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/distribution/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/finale pressemeldung/i)).toBeInTheDocument();
      expect(screen.getByText(/distribution-listen/i)).toBeInTheDocument();
      expect(screen.getByText(/veröffentlichungs-assets/i)).toBeInTheDocument();

      // Upload-Beschränkung
      expect(screen.getByText(/nur finale materialien/i)).toBeInTheDocument();
      expect(screen.getByText(/keine test-dateien/i)).toBeInTheDocument();
    });

    it('sollte Monitoring Phase Analytics-Fokus zeigen', async () => {
      mockProject.pipelinePhase = 'monitoring';

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/monitoring & analyse/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/performance-berichte/i)).toBeInTheDocument();
      expect(screen.getByText(/analytics-daten/i)).toBeInTheDocument();
      expect(screen.getByText(/feedback-sammlung/i)).toBeInTheDocument();

      // Dokumente-Ordner für Reports
      expect(screen.getByText(/dokumente für berichte/i)).toBeInTheDocument();
      expect(screen.getByText(/excel, pdf reports/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Empfehlungs-Display', () => {
    it('sollte Live-Empfehlungen bei Datei-Auswahl anzeigen', async () => {
      const mockFiles = [
        { name: 'keyvisual.jpg', type: 'image/jpeg', size: 2048000 },
        { name: 'document.pdf', type: 'application/pdf', size: 1024000 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'keyvisual.jpg',
            targetFolder: 'Medien',
            targetFolderId: 'folder-media',
            confidence: 92,
            reason: 'Bild passt perfekt zu Kreativphase',
            icon: 'photo'
          },
          {
            fileName: 'document.pdf',
            targetFolder: 'Dokumente',
            targetFolderId: 'folder-docs',
            confidence: 78,
            reason: 'PDF für Dokumentation',
            icon: 'document'
          }
        ]
      });

      const onRecommendationSelect = jest.fn();

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={mockFiles}
          onRecommendationSelect={onRecommendationSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/2 dateien analysiert/i)).toBeInTheDocument();
      });

      // Erste Empfehlung
      const firstRecommendation = screen.getByTestId('recommendation-keyvisual.jpg');
      expect(within(firstRecommendation).getByText('keyvisual.jpg')).toBeInTheDocument();
      expect(within(firstRecommendation).getByText('92%')).toBeInTheDocument();
      expect(within(firstRecommendation).getByText(/medien/i)).toBeInTheDocument();

      // Empfehlung auswählen
      const selectButton = within(firstRecommendation).getByRole('button', { name: /auswählen/i });
      await user.click(selectButton);

      expect(onRecommendationSelect).toHaveBeenCalledWith({
        fileName: 'keyvisual.jpg',
        targetFolderId: 'folder-media',
        confidence: 92
      });
    });

    it('sollte Konfidenz-basierte Visual Indicators anzeigen', async () => {
      const mockFiles = [
        { name: 'high_conf.jpg', type: 'image/jpeg', size: 1024 },
        { name: 'medium_conf.txt', type: 'text/plain', size: 512 },
        { name: 'low_conf.xyz', type: 'application/octet-stream', size: 256 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          { fileName: 'high_conf.jpg', confidence: 95, confidenceLevel: 'high' },
          { fileName: 'medium_conf.txt', confidence: 65, confidenceLevel: 'medium' },
          { fileName: 'low_conf.xyz', confidence: 35, confidenceLevel: 'low' }
        ]
      });

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={mockFiles}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        // Hohe Konfidenz - Grün
        const highConfidenceItem = screen.getByTestId('recommendation-high_conf.jpg');
        expect(highConfidenceItem).toHaveClass('confidence-high');
        expect(within(highConfidenceItem).getByTestId('confidence-indicator')).toHaveClass('bg-green-500');

        // Mittlere Konfidenz - Gelb
        const mediumConfidenceItem = screen.getByTestId('recommendation-medium_conf.txt');
        expect(mediumConfidenceItem).toHaveClass('confidence-medium');
        expect(within(mediumConfidenceItem).getByTestId('confidence-indicator')).toHaveClass('bg-yellow-500');

        // Niedrige Konfidenz - Rot
        const lowConfidenceItem = screen.getByTestId('recommendation-low_conf.xyz');
        expect(lowConfidenceItem).toHaveClass('confidence-low');
        expect(within(lowConfidenceItem).getByTestId('confidence-indicator')).toHaveClass('bg-red-500');
      });
    });

    it('sollte Alternative Ordner-Empfehlungen anzeigen', async () => {
      const mockFiles = [
        { name: 'ambiguous.doc', type: 'application/msword', size: 1024 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'ambiguous.doc',
            targetFolder: 'Dokumente',
            confidence: 68,
            alternatives: [
              { folder: 'Pressemeldungen', confidence: 45, reason: 'Könnte PM-Entwurf sein' },
              { folder: 'Medien', confidence: 25, reason: 'Unwahrscheinlich aber möglich' }
            ]
          }
        ]
      });

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={mockFiles}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/alternative ordner/i)).toBeInTheDocument();
      });

      const alternativesSection = screen.getByTestId('alternatives-section');
      expect(within(alternativesSection).getByText('Pressemeldungen (45%)')).toBeInTheDocument();
      expect(within(alternativesSection).getByText('Medien (25%)')).toBeInTheDocument();

      // Alternative auswählen
      const altButton = within(alternativesSection).getByRole('button', { name: /pressemeldungen/i });
      await user.click(altButton);

      expect(screen.getByText(/pressemeldungen ausgewählt/i)).toBeInTheDocument();
    });

    it('sollte Real-time Updates bei Datei-Änderungen verarbeiten', async () => {
      const onRecommendationSelect = jest.fn();
      let mockFiles = [
        { name: 'file1.jpg', type: 'image/jpeg', size: 1024 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          { fileName: 'file1.jpg', targetFolder: 'Medien', confidence: 88 }
        ]
      });

      const { rerender } = render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={mockFiles}
          onRecommendationSelect={onRecommendationSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('file1.jpg')).toBeInTheDocument();
      });

      // Datei hinzufügen
      mockFiles = [
        ...mockFiles,
        { name: 'file2.pdf', type: 'application/pdf', size: 2048 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          { fileName: 'file1.jpg', targetFolder: 'Medien', confidence: 88 },
          { fileName: 'file2.pdf', targetFolder: 'Dokumente', confidence: 82 }
        ]
      });

      rerender(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={mockFiles}
          onRecommendationSelect={onRecommendationSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('file2.pdf')).toBeInTheDocument();
        expect(screen.getByText(/2 dateien analysiert/i)).toBeInTheDocument();
      });
    });
  });

  describe('Drag & Drop Status-Indikatoren', () => {
    it('sollte Drag Enter State korrekt anzeigen', async () => {
      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
          dragState="drag-enter"
        />
      );

      expect(screen.getByTestId('drag-status-indicator')).toHaveClass('drag-active');
      expect(screen.getByText(/dateien hier ablegen/i)).toBeInTheDocument();
      expect(screen.getByTestId('drop-zone-highlight')).toBeInTheDocument();
    });

    it('sollte Drag Over mit File-Preview anzeigen', async () => {
      const draggedFiles = [
        { name: 'image.jpg', type: 'image/jpeg', size: 1024 },
        { name: 'doc.pdf', type: 'application/pdf', size: 2048 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          { fileName: 'image.jpg', targetFolder: 'Medien', confidence: 90 },
          { fileName: 'doc.pdf', targetFolder: 'Dokumente', confidence: 85 }
        ]
      });

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
          dragState="drag-over"
          draggedFiles={draggedFiles}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/2 dateien erkannt/i)).toBeInTheDocument();
        expect(screen.getByText(/smart routing preview/i)).toBeInTheDocument();
      });

      // Preview-Empfehlungen
      expect(screen.getByText('image.jpg → Medien (90%)')).toBeInTheDocument();
      expect(screen.getByText('doc.pdf → Dokumente (85%)')).toBeInTheDocument();
    });

    it('sollte Invalid Drop State mit Fehlern anzeigen', async () => {
      const invalidFiles = [
        { name: 'malware.exe', type: 'application/x-executable', size: 1024 }
      ];

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
          dragState="invalid-drop"
          draggedFiles={invalidFiles}
          dragErrors={[
            { file: 'malware.exe', reason: 'Dateityp nicht erlaubt', code: 'INVALID_FILE_TYPE' }
          ]}
        />
      );

      expect(screen.getByTestId('drag-error-indicator')).toHaveClass('drag-invalid');
      expect(screen.getByText(/dateityp nicht erlaubt/i)).toBeInTheDocument();
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    });

    it('sollte Multiple Target Folders bei Drag Over hervorheben', async () => {
      const mixedFiles = [
        { name: 'img.jpg', type: 'image/jpeg', size: 1024 },
        { name: 'doc.pdf', type: 'application/pdf', size: 1024 },
        { name: 'PM_press.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          { fileName: 'img.jpg', targetFolderId: 'folder-media', confidence: 92 },
          { fileName: 'doc.pdf', targetFolderId: 'folder-docs', confidence: 88 },
          { fileName: 'PM_press.docx', targetFolderId: 'folder-pr', confidence: 95 }
        ],
        affectedFolders: ['folder-media', 'folder-docs', 'folder-pr']
      });

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
          dragState="drag-over"
          draggedFiles={mixedFiles}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/3 ordner betroffen/i)).toBeInTheDocument();
      });

      // Ordner-Highlights
      expect(screen.getByTestId('folder-highlight-media')).toHaveClass('target-highlight');
      expect(screen.getByTestId('folder-highlight-docs')).toHaveClass('target-highlight');
      expect(screen.getByTestId('folder-highlight-pr')).toHaveClass('target-highlight');
    });
  });

  describe('Pipeline-Lock-Awareness Warnungen', () => {
    it('sollte Pipeline-Lock-Warnung bei gesperrter Phase anzeigen', async () => {
      const lockedProject = {
        ...mockProject,
        pipelinePhase: 'customer_approval' as PipelinePhase,
        pipelineLocked: true,
        lockReason: 'Kunde-Review aktiv',
        lockedBy: 'user-456',
        lockedAt: new Date()
      };

      render(
        <SmartUploadInfoPanel
          project={lockedProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      expect(screen.getByTestId('pipeline-lock-warning')).toBeInTheDocument();
      expect(screen.getByText(/pipeline gesperrt/i)).toBeInTheDocument();
      expect(screen.getByText(/kunde-review aktiv/i)).toBeInTheDocument();
      expect(screen.getByText(/uploads nicht möglich/i)).toBeInTheDocument();
    });

    it('sollte Phase-Transition-Warnungen bei kritischen Uploads anzeigen', async () => {
      const criticalFiles = [
        { name: 'final_campaign.pdf', type: 'application/pdf', size: 5242880 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'final_campaign.pdf',
            targetFolder: 'Pressemeldungen',
            confidence: 94,
            pipelineImpact: {
              mayTriggerTransition: true,
              nextPhase: 'customer_approval',
              warning: 'Upload kann automatische Phasen-Transition auslösen'
            }
          }
        ]
      });

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={criticalFiles}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('phase-transition-warning')).toBeInTheDocument();
        expect(screen.getByText(/phasen-transition möglich/i)).toBeInTheDocument();
        expect(screen.getByText(/kunde-genehmigung/i)).toBeInTheDocument();
      });

      // Warnung bestätigen
      const confirmButton = screen.getByRole('button', { name: /verstanden/i });
      await user.click(confirmButton);

      expect(screen.queryByTestId('phase-transition-warning')).not.toBeInTheDocument();
    });

    it('sollte Team-Member-Lock-Status anzeigen', async () => {
      const teamLockedProject = {
        ...mockProject,
        teamLocks: [
          {
            userId: 'user-456',
            userName: 'Max Mustermann',
            lockType: 'editing',
            lockedFolders: ['folder-media'],
            since: new Date(Date.now() - 1800000) // 30 min ago
          }
        ]
      };

      render(
        <SmartUploadInfoPanel
          project={teamLockedProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      expect(screen.getByTestId('team-lock-info')).toBeInTheDocument();
      expect(screen.getByText(/max mustermann/i)).toBeInTheDocument();
      expect(screen.getByText(/bearbeitet medien-ordner/i)).toBeInTheDocument();
      expect(screen.getByText(/seit 30 minuten/i)).toBeInTheDocument();
    });

    it('sollte Upload-Quota-Status mit Warnung anzeigen', async () => {
      const quotaProject = {
        ...mockProject,
        quotaStatus: {
          used: 850 * 1024 * 1024, // 850MB
          limit: 1024 * 1024 * 1024, // 1GB
          percentage: 83,
          warningThreshold: 80
        }
      };

      render(
        <SmartUploadInfoPanel
          project={quotaProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      expect(screen.getByTestId('quota-warning')).toBeInTheDocument();
      expect(screen.getByText(/83% speicher verwendet/i)).toBeInTheDocument();
      expect(screen.getByText(/174 mb verfügbar/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '83');
    });
  });

  describe('Accessibility und Keyboard Navigation', () => {
    it('sollte Keyboard-Navigation für Empfehlungen unterstützen', async () => {
      const mockFiles = [
        { name: 'file1.jpg', type: 'image/jpeg', size: 1024 },
        { name: 'file2.pdf', type: 'application/pdf', size: 2048 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          { fileName: 'file1.jpg', targetFolder: 'Medien', confidence: 88 },
          { fileName: 'file2.pdf', targetFolder: 'Dokumente', confidence: 82 }
        ]
      });

      const onRecommendationSelect = jest.fn();

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={mockFiles}
          onRecommendationSelect={onRecommendationSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('recommendations-list')).toBeInTheDocument();
      });

      const firstRecommendation = screen.getByTestId('recommendation-file1.jpg');
      
      // Tab-Navigation
      firstRecommendation.focus();
      expect(firstRecommendation).toHaveFocus();

      // Enter zum Auswählen
      fireEvent.keyDown(firstRecommendation, { key: 'Enter', code: 'Enter' });
      
      expect(onRecommendationSelect).toHaveBeenCalledWith({
        fileName: 'file1.jpg',
        targetFolderId: expect.any(String),
        confidence: 88
      });
    });

    it('sollte Screen Reader Support für Empfehlungen bieten', async () => {
      const mockFiles = [
        { name: 'important.pdf', type: 'application/pdf', size: 1024 }
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'important.pdf',
            targetFolder: 'Dokumente',
            confidence: 89,
            reason: 'PDF-Dokument für Dokumentation',
            ariaLabel: 'important.pdf, Empfehlung: Dokumente-Ordner, 89% Konfidenz'
          }
        ]
      });

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={mockFiles}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        const recommendation = screen.getByTestId('recommendation-important.pdf');
        expect(recommendation).toHaveAttribute(
          'aria-label',
          'important.pdf, Empfehlung: Dokumente-Ordner, 89% Konfidenz'
        );
        expect(recommendation).toHaveAttribute('role', 'option');
        expect(recommendation).toHaveAttribute('tabindex', '0');
      });
    });

    it('sollte High Contrast Mode unterstützen', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[]}
          onRecommendationSelect={jest.fn()}
        />
      );

      const panel = screen.getByTestId('smart-upload-panel');
      expect(panel).toHaveClass('high-contrast');
      
      // Kontrast-optimierte Farben
      expect(panel).toHaveStyle({
        '--confidence-high': '#000000',
        '--confidence-medium': '#666666',
        '--confidence-low': '#999999'
      });
    });
  });

  describe('Error States und Fallbacks', () => {
    it('sollte graceful degradation bei Smart Router Fehlern zeigen', async () => {
      mockUploadService.generateUploadPreview.mockRejectedValue(
        new Error('Smart Router nicht verfügbar')
      );

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[{ name: 'test.jpg', type: 'image/jpeg', size: 1024 }]}
          onRecommendationSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback-mode-notice')).toBeInTheDocument();
        expect(screen.getByText(/smart router nicht verfügbar/i)).toBeInTheDocument();
        expect(screen.getByText(/standard-modus aktiv/i)).toBeInTheDocument();
      });

      // Standard Phase-Tips sollten noch funktionieren
      expect(screen.getByText(/kreativphase/i)).toBeInTheDocument();
      expect(screen.getByText(/medien-ordner empfohlen/i)).toBeInTheDocument();
    });

    it('sollte Loading States für langsame Empfehlungen anzeigen', async () => {
      // Lange Promise für Loading State
      mockUploadService.generateUploadPreview.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ recommendations: [] }), 2000)
        )
      );

      render(
        <SmartUploadInfoPanel
          project={mockProject}
          selectedFiles={[{ name: 'test.jpg', type: 'image/jpeg', size: 1024 }]}
          onRecommendationSelect={jest.fn()}
        />
      );

      // Loading State
      expect(screen.getByTestId('recommendations-loading')).toBeInTheDocument();
      expect(screen.getByText(/empfehlungen werden generiert/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});

// Test Helper Functions
const createMockFile = (name: string, type: string, size: number = 1024): File => {
  return new File([new ArrayBuffer(size)], name, { type });
};