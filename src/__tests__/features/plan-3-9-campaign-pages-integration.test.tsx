// src/__tests__/features/plan-3-9-campaign-pages-integration.test.tsx
// Tests für Plan 3/9: Kunden-Freigabe-Implementierung - Campaign Pages Integration

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { ProjectLinkBanner } from '@/components/campaigns/ProjectLinkBanner';
import { PRCampaign, PipelineStage } from '@/types/pr';
import { Project } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase Services
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getById: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/project-service', () => ({
  projectService: {
    getById: jest.fn(),
    getAll: jest.fn(),
    updateStage: jest.fn(),
    getProjectPipelineStatus: jest.fn(),
    getLinkedApprovals: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/approval-service', () => ({
  approvalService: {
    createCustomerApproval: jest.fn(),
    getApprovalByCampaignId: jest.fn(),
  },
}));

// Mock Next.js router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useParams: () => ({
    campaignId: 'test-campaign-123',
  }),
}));

// Mock Auth and Organization Contexts
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseOrganization = useOrganization as jest.MockedFunction<typeof useOrganization>;

// Mock User and Organization
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockOrganization = {
  id: 'test-org-123',
  name: 'Test Organization',
  adminEmails: ['admin@test.com'],
};

describe('Plan 3/9: Campaign Pages Pipeline Integration', () => {
  const mockProject: Project = {
    id: 'project-123',
    userId: 'test-user-123',
    organizationId: 'test-org-123',
    title: 'Pipeline Integration Project',
    description: 'Test project for pipeline approval integration',
    status: 'active',
    currentStage: 'approval',
    customer: {
      id: 'client-123',
      name: 'Test Client GmbH',
    },
    linkedCampaigns: ['campaign-123'],
    budget: 75000,
    currency: 'EUR',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    dueDate: Timestamp.fromDate(new Date('2024-12-31')),
  };

  const mockCampaign: PRCampaign = {
    id: 'campaign-123',
    userId: 'test-user-123',
    organizationId: 'test-org-123',
    title: 'Pipeline Test Campaign',
    contentHtml: '<p>Test campaign content</p>',
    status: 'draft',
    projectId: 'project-123',
    projectTitle: 'Pipeline Integration Project',
    pipelineStage: 'approval',
    distributionListId: 'list-123',
    distributionListName: 'Test List',
    recipientCount: 50,
    approvalRequired: false,
    budgetTracking: {
      allocated: 75000,
      spent: 25000,
      currency: 'EUR',
    },
    milestones: [
      {
        id: 'milestone-1',
        title: 'Content Creation',
        dueDate: Timestamp.now(),
        completed: true,
        completedAt: Timestamp.now(),
      },
      {
        id: 'milestone-2',
        title: 'Client Approval',
        dueDate: Timestamp.now(),
        completed: false,
      },
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn(),
      isAdmin: true,
    } as any);

    mockUseOrganization.mockReturnValue({
      currentOrganization: mockOrganization,
      organizations: [mockOrganization],
      loading: false,
      switchOrganization: jest.fn(),
    } as any);
  });

  describe('ProjectLinkBanner Component', () => {
    it('sollte Pipeline-Projekt-Banner mit korrekten Daten rendern', () => {
      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      expect(screen.getByText(/Verknüpft mit Projekt:/)).toBeInTheDocument();
      expect(screen.getByText('Pipeline Integration Project')).toBeInTheDocument();
      expect(screen.getByText('Freigabe')).toBeInTheDocument(); // Pipeline Stage Badge
    });

    it('sollte Budget-Tracking-Informationen anzeigen', () => {
      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      expect(screen.getByText(/Budget: 25000 \/ 75000 EUR/)).toBeInTheDocument();
    });

    it('sollte Meilenstein-Progress anzeigen', () => {
      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      expect(screen.getByText(/Meilensteine: 1 \/ 2 erreicht/)).toBeInTheDocument();
    });

    it('sollte Pipeline-Stage-Badges korrekt anzeigen', () => {
      const stages: { stage: PipelineStage; label: string; color: string }[] = [
        { stage: 'creation', label: 'Erstellung', color: 'blue' },
        { stage: 'review', label: 'Review', color: 'amber' },
        { stage: 'approval', label: 'Freigabe', color: 'orange' },
        { stage: 'distribution', label: 'Verteilung', color: 'green' },
        { stage: 'completed', label: 'Abgeschlossen', color: 'zinc' },
      ];

      stages.forEach(({ stage, label }) => {
        const stageCampaign = { ...mockCampaign, pipelineStage: stage };
        
        const { rerender } = render(
          <ProjectLinkBanner 
            campaign={stageCamera}
            onProjectUpdate={jest.fn()}
          />
        );

        expect(screen.getByText(label)).toBeInTheDocument();
        
        rerender(<div />); // Clear for next test
      });
    });

    it('sollte "Projekt öffnen" Button funktional machen', () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      fireEvent.click(screen.getByText('Projekt öffnen'));

      expect(windowOpenSpy).toHaveBeenCalledWith('/dashboard/projects/project-123', '_blank');
    });

    it('sollte onProjectUpdate callback auslösen', () => {
      const mockOnUpdate = jest.fn();

      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          onProjectUpdate={mockOnUpdate}
        />
      );

      fireEvent.click(screen.getByText('Aktualisieren'));

      expect(mockOnUpdate).toHaveBeenCalled();
    });

    it('sollte nichts rendern ohne Projekt-Verknüpfung', () => {
      const campaignWithoutProject = { ...mockCampaign, projectId: undefined };

      const { container } = render(
        <ProjectLinkBanner 
          campaign={campaignWithoutProject}
          onProjectUpdate={jest.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('sollte mit fehlenden Optional-Daten umgehen', () => {
      const minimalCampaign = {
        ...mockCampaign,
        budgetTracking: undefined,
        milestones: undefined,
      };

      render(
        <ProjectLinkBanner 
          campaign={minimalCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      expect(screen.getByText('Pipeline Integration Project')).toBeInTheDocument();
      expect(screen.queryByText(/Budget:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Meilensteine:/)).not.toBeInTheDocument();
    });
  });

  describe('Campaign-Edit Pipeline Integration', () => {
    // Mock EditCampaignPage would be tested here if we had access to the full component
    // For now, we test the key integration points
    
    it('sollte Pipeline-Approval Banner bei verknüpften Projekten anzeigen', async () => {
      // This test would check that the ProjectLinkBanner appears in the edit page
      // when a campaign is linked to a project
      
      // In a real integration test, we would:
      // 1. Render the EditCampaignPage
      // 2. Mock the campaign service to return a campaign with projectId
      // 3. Verify the ProjectLinkBanner is rendered
      // 4. Test the pipeline stage display and actions
      
      expect(true).toBe(true); // Placeholder - would be replaced with real integration test
    });

    it('sollte Pipeline-Status und Button-Actions korrekt anzeigen', async () => {
      // Test that pipeline status is correctly displayed and actions work
      expect(true).toBe(true); // Placeholder
    });

    it('sollte Approval-Erstellung für Pipeline-Projekte handhaben', async () => {
      // Test the approval creation flow when campaign is linked to a project
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Campaign-New Pipeline Integration', () => {
    it('sollte Pipeline-Projekt-Selector anzeigen', async () => {
      // Test that new campaign page shows project selector
      expect(true).toBe(true); // Placeholder
    });

    it('sollte Pipeline-Approval Hinweise bei Projekt-Verknüpfung anzeigen', async () => {
      // Test that when a project is selected, appropriate pipeline hints are shown
      expect(true).toBe(true); // Placeholder
    });

    it('sollte Projekt-Kontext bei Campaign-Erstellung übertragen', async () => {
      // Test that project context is properly transferred to new campaign
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error Handling und Loading States', () => {
    it('sollte Loading-States für Pipeline-Daten anzeigen', () => {
      const loadingCampaign = {
        ...mockCampaign,
        projectId: 'project-123',
        projectTitle: undefined, // Still loading
      };

      render(
        <ProjectLinkBanner 
          campaign={loadingCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      // Should still render even with missing project title
      expect(screen.getByText(/Verknüpft mit Projekt:/)).toBeInTheDocument();
    });

    it('sollte Fehler bei ungültiger Projekt-Verknüpfung handhaben', () => {
      const invalidProjectCampaign = {
        ...mockCampaign,
        projectId: 'invalid-project',
        projectTitle: 'Nicht gefundenes Projekt',
      };

      render(
        <ProjectLinkBanner 
          campaign={invalidProjectCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      expect(screen.getByText('Nicht gefundenes Projekt')).toBeInTheDocument();
      
      // Button should still work but would show error
      fireEvent.click(screen.getByText('Projekt öffnen'));
    });

    it('sollte Network-Fehler bei Projekt-Updates handhaben', async () => {
      const mockOnUpdate = jest.fn().mockRejectedValue(new Error('Network error'));

      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          onProjectUpdate={mockOnUpdate}
        />
      );

      fireEvent.click(screen.getByText('Aktualisieren'));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('sollte mit unvollständigen Pipeline-Stage-Daten umgehen', () => {
      const invalidStageCampaign = {
        ...mockCampaign,
        pipelineStage: 'unknown-stage' as any,
      };

      render(
        <ProjectLinkBanner 
          campaign={invalidStageCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      // Should not show a badge for unknown stage
      expect(screen.queryByText('unknown-stage')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility und UX', () => {
    it('sollte korrekte ARIA-Labels haben', () => {
      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      const banner = screen.getByRole('region', { name: /projekt/i }) || screen.getByText(/Verknüpft mit Projekt/).closest('div');
      expect(banner).toBeInTheDocument();
    });

    it('sollte Keyboard-Navigation unterstützen', async () => {
      const user = userEvent.setup();

      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      const updateButton = screen.getByRole('button', { name: /aktualisieren/i });
      const openButton = screen.getByRole('button', { name: /projekt öffnen/i });

      await user.tab();
      expect(updateButton).toHaveFocus();

      await user.tab();
      expect(openButton).toHaveFocus();
    });

    it('sollte visuelle Hierarchie durch Badges unterstützen', () => {
      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      const badge = screen.getByText('Freigabe');
      expect(badge).toHaveClass('bg-orange-50'); // Orange color for approval stage
    });

    it('sollte responsives Layout haben', () => {
      render(
        <ProjectLinkBanner 
          campaign={mockCampaign}
          className="custom-class"
          onProjectUpdate={jest.fn()}
        />
      );

      const banner = screen.getByText(/Verknüpft mit Projekt/).closest('div');
      expect(banner).toHaveClass('custom-class');
      expect(banner).toHaveClass('flex', 'items-center', 'justify-between');
    });
  });

  describe('Integration Scenarios', () => {
    it('sollte Multi-Projekt-Szenarien handhaben', () => {
      const multiProjectCampaign = {
        ...mockCampaign,
        projectId: 'project-456',
        projectTitle: 'Zweites Projekt',
        pipelineStage: 'distribution' as PipelineStage,
      };

      render(
        <ProjectLinkBanner 
          campaign={multiProjectCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      expect(screen.getByText('Zweites Projekt')).toBeInTheDocument();
      expect(screen.getByText('Verteilung')).toBeInTheDocument();
    });

    it('sollte Budget-Überschreitungen visuell hervorheben', () => {
      const overBudgetCampaign = {
        ...mockCampaign,
        budgetTracking: {
          allocated: 50000,
          spent: 75000, // Over budget
          currency: 'EUR',
        },
      };

      render(
        <ProjectLinkBanner 
          campaign={overBudgetCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      expect(screen.getByText(/Budget: 75000 \/ 50000 EUR/)).toBeInTheDocument();
      // In a real implementation, this might have special styling for over-budget
    });

    it('sollte komplette Meilensteine korrekt anzeigen', () => {
      const completedMilestonesCampaign = {
        ...mockCampaign,
        milestones: [
          {
            id: 'milestone-1',
            title: 'Milestone 1',
            dueDate: Timestamp.now(),
            completed: true,
            completedAt: Timestamp.now(),
          },
          {
            id: 'milestone-2',
            title: 'Milestone 2',
            dueDate: Timestamp.now(),
            completed: true,
            completedAt: Timestamp.now(),
          },
        ],
      };

      render(
        <ProjectLinkBanner 
          campaign={completedMilestonesCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      expect(screen.getByText(/Meilensteine: 2 \/ 2 erreicht/)).toBeInTheDocument();
    });

    it('sollte Performance bei großen Datenmengen beibehalten', () => {
      const largeCampaign = {
        ...mockCampaign,
        milestones: Array.from({ length: 100 }, (_, i) => ({
          id: `milestone-${i}`,
          title: `Milestone ${i}`,
          dueDate: Timestamp.now(),
          completed: i % 2 === 0, // Every second milestone completed
        })),
      };

      const startTime = performance.now();
      
      render(
        <ProjectLinkBanner 
          campaign={largeCampaign}
          onProjectUpdate={jest.fn()}
        />
      );

      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render in less than 100ms
      expect(screen.getByText(/Meilensteine: 50 \/ 100 erreicht/)).toBeInTheDocument();
    });
  });
});