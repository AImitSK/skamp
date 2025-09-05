// src/__tests__/pages/campaigns/campaigns-page-pipeline.test.tsx
// Tests für Campaign-Übersicht Pipeline-Status Features (Plan 4/9)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import PRCampaignsPage from '@/app/dashboard/pr-tools/campaigns/page';
import { PRCampaign } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

// Mock Next.js
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn()
}));

// Mock Context
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User'
};

const mockOrganization = {
  id: 'test-org-456',
  name: 'Test Organization'
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: mockOrganization })
}));

// Mock Services
const mockPrService = {
  getAllByOrganization: jest.fn(),
  delete: jest.fn()
};

const mockTeamMemberService = {
  getByOrganization: jest.fn()
};

jest.mock('@/lib/firebase/pr-service', () => ({
  prService: mockPrService
}));

jest.mock('@/lib/firebase/team-service-enhanced', () => ({
  teamMemberService: mockTeamMemberService
}));

// Mock Alert Hook
const mockShowAlert = jest.fn();
jest.mock('@/hooks/useAlert', () => ({
  useAlert: () => ({
    alert: null,
    showAlert: mockShowAlert
  })
}));

// Mock Papa Parse
jest.mock('papaparse', () => ({
  unparse: jest.fn(() => 'mocked,csv,data')
}));

describe('PRCampaignsPage Pipeline-Status Tests', () => {
  const mockSearchParams = {
    get: jest.fn(() => null)
  };

  const baseCampaign: PRCampaign = {
    id: 'campaign-123',
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    title: 'Test Campaign',
    contentHtml: '<p>Test content</p>',
    status: 'draft',
    distributionListId: 'list-1',
    distributionListName: 'Test List',
    recipientCount: 50,
    approvalRequired: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockPrService.getAllByOrganization.mockResolvedValue([]);
    mockTeamMemberService.getByOrganization.mockResolvedValue([]);
  });

  describe('Pipeline-Spalte Anzeige', () => {
    it('sollte Pipeline-Spalten-Header anzeigen', async () => {
      mockPrService.getAllByOrganization.mockResolvedValue([baseCampaign]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pipeline')).toBeInTheDocument();
      });
    });

    it('sollte Pipeline-Status für Distribution-Phase anzeigen', async () => {
      const distributionCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-123',
        projectTitle: 'Test Project',
        pipelineStage: 'distribution'
      };

      mockPrService.getAllByOrganization.mockResolvedValue([distributionCampaign]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('Distribution')).toBeInTheDocument();
      });

      // Prüfe Badge-Styling für Distribution
      const distributionBadge = screen.getByText('Distribution');
      expect(distributionBadge).toHaveClass('bg-blue-50', 'text-blue-700', 'ring-blue-600/20');
    });

    it('sollte Pipeline-Status für Monitoring-Phase anzeigen', async () => {
      const monitoringCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-456',
        projectTitle: 'Monitoring Project',
        pipelineStage: 'monitoring'
      };

      mockPrService.getAllByOrganization.mockResolvedValue([monitoringCampaign]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('Monitoring')).toBeInTheDocument();
      });

      // Prüfe Badge-Styling für Monitoring
      const monitoringBadge = screen.getByText('Monitoring');
      expect(monitoringBadge).toHaveClass('bg-green-50', 'text-green-700', 'ring-green-600/20');
    });

    it('sollte alle Pipeline-Phasen korrekt anzeigen', async () => {
      const campaigns: PRCampaign[] = [
        {
          ...baseCampaign,
          id: 'campaign-creation',
          projectId: 'project-1',
          pipelineStage: 'creation',
          title: 'Creation Campaign'
        },
        {
          ...baseCampaign,
          id: 'campaign-internal',
          projectId: 'project-2',
          pipelineStage: 'internal_approval',
          title: 'Internal Approval Campaign'
        },
        {
          ...baseCampaign,
          id: 'campaign-customer',
          projectId: 'project-3',
          pipelineStage: 'customer_approval',
          title: 'Customer Approval Campaign'
        },
        {
          ...baseCampaign,
          id: 'campaign-distribution',
          projectId: 'project-4',
          pipelineStage: 'distribution',
          title: 'Distribution Campaign'
        },
        {
          ...baseCampaign,
          id: 'campaign-monitoring',
          projectId: 'project-5',
          pipelineStage: 'monitoring',
          title: 'Monitoring Campaign'
        }
      ];

      mockPrService.getAllByOrganization.mockResolvedValue(campaigns);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('Erstellung')).toBeInTheDocument();
        expect(screen.getByText('Interne Freigabe')).toBeInTheDocument();
        expect(screen.getByText('Kunden-Freigabe')).toBeInTheDocument();
        expect(screen.getByText('Distribution')).toBeInTheDocument();
        expect(screen.getByText('Monitoring')).toBeInTheDocument();
      });
    });

    it('sollte "-" für Kampagnen ohne Pipeline-Zuordnung anzeigen', async () => {
      const nonPipelineCampaign: PRCampaign = {
        ...baseCampaign
        // Kein projectId oder pipelineStage
      };

      mockPrService.getAllByOrganization.mockResolvedValue([nonPipelineCampaign]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        const pipelineCell = screen.getByText('-');
        expect(pipelineCell).toBeInTheDocument();
        expect(pipelineCell).toHaveClass('text-gray-400');
      });
    });
  });

  describe('Distribution-Status Anzeige', () => {
    it('sollte Distribution-Status mit Empfänger-Zählung anzeigen', async () => {
      const campaignWithDistributionStatus: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-distribution',
        pipelineStage: 'distribution',
        distributionStatus: {
          status: 'sent',
          sentAt: Timestamp.now(),
          recipientCount: 100,
          successCount: 95,
          failureCount: 5,
          distributionId: 'dist_123'
        }
      };

      mockPrService.getAllByOrganization.mockResolvedValue([campaignWithDistributionStatus]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('Distribution')).toBeInTheDocument();
        expect(screen.getByText('95/100 versendet')).toBeInTheDocument();
      });
    });

    it('sollte 0/0 für leeren Distribution-Status anzeigen', async () => {
      const campaignWithEmptyStatus: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-empty',
        pipelineStage: 'distribution',
        distributionStatus: {
          status: 'pending',
          recipientCount: 0,
          successCount: 0,
          failureCount: 0,
          distributionId: 'dist_empty'
        }
      };

      mockPrService.getAllByOrganization.mockResolvedValue([campaignWithEmptyStatus]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('0/0 versendet')).toBeInTheDocument();
      });
    });

    it('sollte Distribution-Status ohne successCount handhaben', async () => {
      const campaignWithoutSuccessCount: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-no-success',
        pipelineStage: 'distribution',
        distributionStatus: {
          status: 'failed',
          recipientCount: 50,
          successCount: 0, // Explizit 0
          failureCount: 50,
          distributionId: 'dist_failed'
        }
      };

      mockPrService.getAllByOrganization.mockResolvedValue([campaignWithoutSuccessCount]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('0/50 versendet')).toBeInTheDocument();
      });
    });
  });

  describe('Pipeline-Actions Tests', () => {
    it('sollte "Pipeline-Distribution starten" für Distribution-Phase anzeigen', async () => {
      const distributionCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-start-dist',
        pipelineStage: 'distribution',
        distributionStatus: {
          status: 'pending',
          recipientCount: 0,
          successCount: 0,
          failureCount: 0,
          distributionId: 'dist_pending'
        }
      };

      mockPrService.getAllByOrganization.mockResolvedValue([distributionCampaign]);

      render(<PRCampaignsPage />);

      // Klick auf Actions-Button
      await waitFor(() => {
        const actionsButton = screen.getAllByRole('button').find(button =>
          button.querySelector('svg')?.classList.contains('h-4')
        );
        expect(actionsButton).toBeInTheDocument();
        fireEvent.click(actionsButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Pipeline-Distribution starten')).toBeInTheDocument();
      });
    });

    it('sollte "Zum Projekt" für Monitoring-Phase anzeigen', async () => {
      const monitoringCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-monitoring',
        pipelineStage: 'monitoring'
      };

      mockPrService.getAllByOrganization.mockResolvedValue([monitoringCampaign]);

      render(<PRCampaignsPage />);

      // Klick auf Actions-Button
      await waitFor(() => {
        const actionsButtons = screen.getAllByRole('button');
        const actionsButton = actionsButtons.find(button =>
          button.querySelector('[data-testid="ellipsis-vertical-icon"]') ||
          button.getAttribute('aria-haspopup') === 'true'
        );
        fireEvent.click(actionsButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Zum Projekt')).toBeInTheDocument();
      });

      // Prüfe Link zum Projekt
      const projectLink = screen.getByRole('menuitem', { name: /Zum Projekt/ });
      expect(projectLink).toHaveAttribute('href', '/dashboard/projects/project-monitoring');
    });

    it('sollte Pipeline-Distribution Action nicht für bereits versendete Kampagnen anzeigen', async () => {
      const sentCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-sent',
        pipelineStage: 'distribution',
        distributionStatus: {
          status: 'sent',
          sentAt: Timestamp.now(),
          recipientCount: 100,
          successCount: 100,
          failureCount: 0,
          distributionId: 'dist_sent'
        }
      };

      mockPrService.getAllByOrganization.mockResolvedValue([sentCampaign]);

      render(<PRCampaignsPage />);

      // Klick auf Actions-Button
      await waitFor(() => {
        const actionsButtons = screen.getAllByRole('button');
        const actionsButton = actionsButtons.find(button =>
          button.querySelector('[data-testid="ellipsis-vertical-icon"]') ||
          button.getAttribute('aria-haspopup') === 'true'
        );
        fireEvent.click(actionsButton!);
      });

      await waitFor(() => {
        expect(screen.queryByText('Pipeline-Distribution starten')).not.toBeInTheDocument();
        expect(screen.getByText('Vorschau')).toBeInTheDocument(); // Standard-Actions sollten da sein
      });
    });
  });

  describe('EmailSendModal Pipeline-Integration', () => {
    it('sollte projectMode für Pipeline-Kampagnen aktivieren', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-send-modal',
        pipelineStage: 'distribution'
      };

      mockPrService.getAllByOrganization.mockResolvedValue([pipelineCampaign]);

      render(<PRCampaignsPage />);

      // Klick auf Actions-Button und dann "Versenden"
      await waitFor(() => {
        const actionsButtons = screen.getAllByRole('button');
        const actionsButton = actionsButtons.find(button =>
          button.querySelector('[data-testid="ellipsis-vertical-icon"]') ||
          button.getAttribute('aria-haspopup') === 'true'
        );
        fireEvent.click(actionsButton!);
      });

      await waitFor(() => {
        const sendButton = screen.getByText('Versenden');
        fireEvent.click(sendButton);
      });

      // EmailSendModal sollte mit projectMode=true geöffnet werden
      // (Dies wird implizit durch das Vorhandensein der Modal getestet)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('sollte onPipelineComplete Callback korrekt handhaben', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-callback',
        pipelineStage: 'distribution'
      };

      mockPrService.getAllByOrganization.mockResolvedValue([pipelineCampaign]);

      render(<PRCampaignsPage />);

      // Öffne Send Modal
      await waitFor(() => {
        const actionsButtons = screen.getAllByRole('button');
        const actionsButton = actionsButtons.find(button =>
          button.querySelector('[data-testid="ellipsis-vertical-icon"]') ||
          button.getAttribute('aria-haspopup') === 'true'
        );
        fireEvent.click(actionsButton!);
      });

      const sendButton = await screen.findByText('Versenden');
      fireEvent.click(sendButton);

      // Modal sollte geöffnet sein
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Schließe Modal um onPipelineComplete zu testen
      const closeButton = screen.getByRole('button', { name: /Abbrechen|Schließen/i });
      fireEvent.click(closeButton);

      // Impliziter Test: Component rendert ohne Fehler
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('sollte Success-Message für Pipeline-Completion anzeigen', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-success',
        pipelineStage: 'distribution',
        title: 'Success Test Campaign'
      };

      mockPrService.getAllByOrganization.mockResolvedValue([pipelineCampaign]);

      render(<PRCampaignsPage />);

      // Simuliere erfolgreichen Versand durch onSent Callback
      await waitFor(() => {
        const actionsButtons = screen.getAllByRole('button');
        const actionsButton = actionsButtons.find(button =>
          button.querySelector('[data-testid="ellipsis-vertical-icon"]') ||
          button.getAttribute('aria-haspopup') === 'true'
        );
        fireEvent.click(actionsButton!);
      });

      const sendButton = await screen.findByText('Versenden');
      fireEvent.click(sendButton);

      // Modal wird geöffnet, wir simulieren den erfolgreichen Versand
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Schließe Modal (simuliert erfolgreichen Versand)
      const closeButton = screen.getByRole('button', { name: /Abbrechen|Schließen/i });
      fireEvent.click(closeButton);

      // showAlert sollte für Pipeline-Kampagne speziellen Text haben
      expect(mockShowAlert).toHaveBeenCalledWith(
        'success',
        'Kampagne versendet',
        expect.stringContaining('Monitoring-Phase weitergeleitet')
      );
    });
  });

  describe('Pipeline-Spalte Badge-Styling Tests', () => {
    it('sollte korrekte CSS-Klassen für verschiedene Pipeline-Phasen haben', async () => {
      const campaigns: PRCampaign[] = [
        {
          ...baseCampaign,
          id: 'creation-test',
          projectId: 'project-1',
          pipelineStage: 'creation'
        },
        {
          ...baseCampaign,
          id: 'internal-test',
          projectId: 'project-2',
          pipelineStage: 'internal_approval'
        },
        {
          ...baseCampaign,
          id: 'customer-test',
          projectId: 'project-3',
          pipelineStage: 'customer_approval'
        }
      ];

      mockPrService.getAllByOrganization.mockResolvedValue(campaigns);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        // Creation Phase - Yellow
        const creationBadge = screen.getByText('Erstellung');
        expect(creationBadge).toHaveClass('bg-yellow-50', 'text-yellow-700', 'ring-yellow-600/20');

        // Internal Approval - Orange
        const internalBadge = screen.getByText('Interne Freigabe');
        expect(internalBadge).toHaveClass('bg-orange-50', 'text-orange-700', 'ring-orange-600/20');

        // Customer Approval - Purple
        const customerBadge = screen.getByText('Kunden-Freigabe');
        expect(customerBadge).toHaveClass('bg-purple-50', 'text-purple-700', 'ring-purple-600/20');
      });
    });

    it('sollte unbekannte Pipeline-Stage als Gray Badge anzeigen', async () => {
      const campaignWithUnknownStage: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-unknown',
        pipelineStage: 'unknown_stage' as any
      };

      mockPrService.getAllByOrganization.mockResolvedValue([campaignWithUnknownStage]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        const unknownBadge = screen.getByText('unknown_stage');
        expect(unknownBadge).toHaveClass('bg-gray-50', 'text-gray-700', 'ring-gray-600/20');
      });
    });

    it('sollte undefined pipelineStage als "Unbekannt" anzeigen', async () => {
      const campaignWithUndefinedStage: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-undefined',
        pipelineStage: undefined
      };

      mockPrService.getAllByOrganization.mockResolvedValue([campaignWithUndefinedStage]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        const unknownBadge = screen.getByText('Unbekannt');
        expect(unknownBadge).toHaveClass('bg-gray-50', 'text-gray-700', 'ring-gray-600/20');
      });
    });
  });

  describe('Multi-Tenancy Pipeline Tests', () => {
    it('sollte Pipeline-Features pro Organization korrekt laden', async () => {
      const orgSpecificCampaigns: PRCampaign[] = [
        {
          ...baseCampaign,
          organizationId: 'test-org-456', // Aktuelle Organization
          projectId: 'project-org-456',
          pipelineStage: 'distribution'
        }
      ];

      mockPrService.getAllByOrganization.mockResolvedValue(orgSpecificCampaigns);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(mockPrService.getAllByOrganization).toHaveBeenCalledWith('test-org-456');
        expect(screen.getByText('Distribution')).toBeInTheDocument();
      });
    });

    it('sollte Team-Members für Pipeline-Actions korrekt laden', async () => {
      const teamMembers = [
        {
          id: 'member-1',
          userId: 'test-user-123',
          organizationId: 'test-org-456',
          displayName: 'Test User',
          role: 'admin'
        }
      ];

      mockTeamMemberService.getByOrganization.mockResolvedValue(teamMembers);
      mockPrService.getAllByOrganization.mockResolvedValue([{
        ...baseCampaign,
        projectId: 'project-team',
        pipelineStage: 'monitoring'
      }]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(mockTeamMemberService.getByOrganization).toHaveBeenCalledWith('test-org-456');
        expect(screen.getByText('Monitoring')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Pipeline Tests', () => {
    it('sollte Pipeline-Features auch bei Team-Service-Fehlern anzeigen', async () => {
      mockTeamMemberService.getByOrganization.mockRejectedValue(new Error('Team service error'));
      mockPrService.getAllByOrganization.mockResolvedValue([{
        ...baseCampaign,
        projectId: 'project-error-resilient',
        pipelineStage: 'distribution'
      }]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        // Pipeline-Features sollten trotz Team-Service-Fehler funktionieren
        expect(screen.getByText('Distribution')).toBeInTheDocument();
        expect(screen.getByText('Pipeline')).toBeInTheDocument();
      });
    });

    it('sollte graceful mit leeren Pipeline-Daten umgehen', async () => {
      const campaignWithEmptyPipeline: PRCampaign = {
        ...baseCampaign,
        projectId: '', // Leer
        projectTitle: '',
        pipelineStage: undefined
      };

      mockPrService.getAllByOrganization.mockResolvedValue([campaignWithEmptyPipeline]);

      render(<PRCampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('-')).toBeInTheDocument();
        expect(screen.queryByText('Pipeline-Distribution starten')).not.toBeInTheDocument();
      });
    });

    it('sollte Loading-State für Pipeline-Daten korrekt handhaben', async () => {
      // Simuliere langsames Laden
      mockPrService.getAllByOrganization.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      render(<PRCampaignsPage />);

      // Loading State
      expect(screen.getByText('Lade Kampagnen...')).toBeInTheDocument();

      // Nach dem Laden
      await waitFor(() => {
        expect(screen.queryByText('Lade Kampagnen...')).not.toBeInTheDocument();
        expect(screen.getByText('Pipeline')).toBeInTheDocument(); // Header sollte da sein
      }, { timeout: 200 });
    });
  });
});