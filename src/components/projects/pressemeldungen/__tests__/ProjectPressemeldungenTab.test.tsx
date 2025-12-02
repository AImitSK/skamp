// src/components/projects/pressemeldungen/__tests__/ProjectPressemeldungenTab.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectPressemeldungenTab from '../ProjectPressemeldungenTab';
import { useProjectPressData } from '@/lib/hooks/useCampaignData';
import { projectService } from '@/lib/firebase/project-service';
import { toastService } from '@/lib/utils/toast';

// Mocks
jest.mock('@/lib/hooks/useCampaignData');
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/utils/toast');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  })
}));

jest.mock('../PressemeldungCampaignTable', () => ({
  __esModule: true,
  default: ({ campaigns, approvals, onRefresh }: any) => (
    <div data-testid="campaign-table">
      <div>Campaigns: {campaigns.length}</div>
      <div>Approvals: {approvals.length}</div>
      <button onClick={onRefresh}>Refresh Table</button>
    </div>
  )
}));

const mockCampaign = {
  id: 'campaign-1',
  title: 'Test Campaign',
  status: 'draft',
  userId: 'user-123',
  organizationId: 'org-123',
  createdAt: new Date()
};

const mockApproval = {
  id: 'approval-1',
  campaignId: 'campaign-1',
  campaignTitle: 'Test Campaign',
  projectId: 'project-123',
  status: 'pending',
  clientName: 'Test Client',
  organizationId: 'org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  recipients: []
};

describe('ProjectPressemeldungenTab Component', () => {
  const defaultProps = {
    projectId: 'project-123',
    organizationId: 'org-123'
  };

  const mockUseProjectPressData = useProjectPressData as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectPressData.mockReturnValue({
      campaigns: [],
      approvals: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton', () => {
      mockUseProjectPressData.mockReturnValue({
        campaigns: [],
        approvals: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn()
      });

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should not render content while loading', () => {
      mockUseProjectPressData.mockReturnValue({
        campaigns: [],
        approvals: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn()
      });

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      expect(screen.queryByText('Pressemeldung')).not.toBeInTheDocument();
      expect(screen.queryByTestId('campaign-table')).not.toBeInTheDocument();
    });
  });

  describe('Header and Actions', () => {
    it('should render header with title', () => {
      render(<ProjectPressemeldungenTab {...defaultProps} />);

      expect(screen.getByText('Pressemeldung')).toBeInTheDocument();
    });

    it('should render create campaign button', () => {
      render(<ProjectPressemeldungenTab {...defaultProps} />);

      expect(screen.getByText('Meldung Erstellen')).toBeInTheDocument();
    });

    it('should disable create button when campaign exists', () => {
      mockUseProjectPressData.mockReturnValue({
        campaigns: [mockCampaign],
        approvals: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn()
      });

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const createButton = screen.getByText('Meldung Erstellen');
      expect(createButton).toBeDisabled();
    });

    it('should enable create button when no campaigns', () => {
      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const createButton = screen.getByText('Meldung Erstellen');
      expect(createButton).not.toBeDisabled();
    });

    it('should render actions menu', () => {
      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const menuButtons = screen.getAllByRole('button');
      const actionsButton = menuButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg !== null;
      });

      expect(actionsButton).toBeDefined();
    });
  });

  describe('Campaign Creation Flow', () => {
    it('should open confirmation dialog on create button click', async () => {
      const user = userEvent.setup();
      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const createButton = screen.getByText('Meldung Erstellen');
      await user.click(createButton);

      expect(screen.getByText('Neue Pressemeldung erstellen')).toBeInTheDocument();
      expect(screen.getByText(/Wollen Sie wirklich eine neue Pressemeldung erstellen/i)).toBeInTheDocument();
    });

    it('should close dialog on cancel', async () => {
      const user = userEvent.setup();
      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const createButton = screen.getByText('Meldung Erstellen');
      await user.click(createButton);

      expect(screen.getByText('Neue Pressemeldung erstellen')).toBeInTheDocument();

      const cancelButton = screen.getByText('Abbrechen');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Neue Pressemeldung erstellen')).not.toBeInTheDocument();
      });
    });

    it('should create campaign on confirm', async () => {
      const user = userEvent.setup();
      const mockProject = {
        id: 'project-123',
        title: 'Test Project',
        organizationId: 'org-123'
      };

      (projectService.getById as jest.Mock).mockResolvedValue(mockProject);
      (projectService.initializeProjectResources as jest.Mock).mockResolvedValue({
        campaignCreated: true,
        campaignId: 'new-campaign-id'
      });

      const mockPush = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: mockPush
      });

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const createButton = screen.getByText('Meldung Erstellen');
      await user.click(createButton);

      const confirmButton = screen.getByText('Ja, erstellen');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(projectService.initializeProjectResources).toHaveBeenCalledWith(
          'project-123',
          expect.objectContaining({
            createCampaign: true,
            campaignTitle: 'Test Project - PR-Kampagne',
            createTasks: false,
            notifyTeam: false
          }),
          'org-123'
        );
      });

      await waitFor(() => {
        expect(toastService.success).toHaveBeenCalledWith('Pressemeldung erfolgreich erstellt');
      });
    });

    it('should navigate to edit page after creation', async () => {
      const user = userEvent.setup();
      const mockProject = {
        id: 'project-123',
        title: 'Test Project',
        organizationId: 'org-123'
      };

      (projectService.getById as jest.Mock).mockResolvedValue(mockProject);
      (projectService.initializeProjectResources as jest.Mock).mockResolvedValue({
        campaignCreated: true,
        campaignId: 'new-campaign-id'
      });

      const mockPush = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: mockPush
      });

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const createButton = screen.getByText('Meldung Erstellen');
      await user.click(createButton);

      const confirmButton = screen.getByText('Ja, erstellen');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/pr-tools/campaigns/campaigns/edit/new-campaign-id');
      });
    });

    it('should handle creation errors', async () => {
      const user = userEvent.setup();

      (projectService.getById as jest.Mock).mockRejectedValue(new Error('Project not found'));

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const createButton = screen.getByText('Meldung Erstellen');
      await user.click(createButton);

      const confirmButton = screen.getByText('Ja, erstellen');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Fehler beim Erstellen der Pressemeldung');
      });
    });

    it('should show loading state during creation', async () => {
      const user = userEvent.setup();
      const mockProject = {
        id: 'project-123',
        title: 'Test Project',
        organizationId: 'org-123'
      };

      (projectService.getById as jest.Mock).mockResolvedValue(mockProject);
      (projectService.initializeProjectResources as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ campaignCreated: true, campaignId: 'new-id' }), 100))
      );

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const createButton = screen.getByText('Meldung Erstellen');
      await user.click(createButton);

      const confirmButton = screen.getByText('Ja, erstellen');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Wird erstellt...')).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Table Rendering', () => {
    it('should render campaign table with campaigns', () => {
      mockUseProjectPressData.mockReturnValue({
        campaigns: [mockCampaign],
        approvals: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn()
      });

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      expect(screen.getByTestId('campaign-table')).toBeInTheDocument();
      expect(screen.getByText('Campaigns: 1')).toBeInTheDocument();
    });

    it('should render campaign table with empty state', () => {
      render(<ProjectPressemeldungenTab {...defaultProps} />);

      expect(screen.getByTestId('campaign-table')).toBeInTheDocument();
      expect(screen.getByText('Campaigns: 0')).toBeInTheDocument();
    });

    it('should pass refetch to campaign table', async () => {
      const mockRefetch = jest.fn();
      mockUseProjectPressData.mockReturnValue({
        campaigns: [mockCampaign],
        approvals: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch
      });

      const user = userEvent.setup();
      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const refreshButton = screen.getByText('Refresh Table');
      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Campaign Table with Approvals', () => {
    it('should pass approvals to campaign table', () => {
      mockUseProjectPressData.mockReturnValue({
        campaigns: [mockCampaign],
        approvals: [mockApproval],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn()
      });

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      expect(screen.getByTestId('campaign-table')).toBeInTheDocument();
      expect(screen.getByText('Campaigns: 1')).toBeInTheDocument();
      expect(screen.getByText('Approvals: 1')).toBeInTheDocument();
    });

    it('should render table with multiple approvals', () => {
      const mockApproval2 = {
        ...mockApproval,
        id: 'approval-2'
      };

      mockUseProjectPressData.mockReturnValue({
        campaigns: [mockCampaign],
        approvals: [mockApproval, mockApproval2],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn()
      });

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      expect(screen.getByText('Approvals: 2')).toBeInTheDocument();
    });

    it('should render table with no approvals', () => {
      mockUseProjectPressData.mockReturnValue({
        campaigns: [mockCampaign],
        approvals: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn()
      });

      render(<ProjectPressemeldungenTab {...defaultProps} />);

      expect(screen.getByText('Approvals: 0')).toBeInTheDocument();
    });

    it('should pass refetch callback to table', async () => {
      const mockRefetch = jest.fn();
      mockUseProjectPressData.mockReturnValue({
        campaigns: [mockCampaign],
        approvals: [mockApproval],
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch
      });

      const user = userEvent.setup();
      render(<ProjectPressemeldungenTab {...defaultProps} />);

      const refreshButton = screen.getByText('Refresh Table');
      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
