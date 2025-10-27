// src/components/projects/pressemeldungen/__tests__/PressemeldungCampaignTable.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PressemeldungCampaignTable from '../PressemeldungCampaignTable';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import { PRCampaign } from '@/types/pr';
import { TeamMember } from '@/types/international';

// Mocks
jest.mock('@/lib/firebase/team-service-enhanced');
jest.mock('../components/CampaignTableRow', () => ({
  __esModule: true,
  default: ({ campaign, onRefresh, onSend }: any) => (
    <div data-testid={`campaign-row-${campaign.id}`}>
      <div>{campaign.title}</div>
      <button onClick={onRefresh}>Refresh</button>
      <button onClick={() => onSend(campaign)}>Send</button>
    </div>
  )
}));

jest.mock('@/components/pr/EmailSendModal', () => ({
  __esModule: true,
  default: ({ campaign, onClose, onSent }: any) => (
    <div data-testid="email-send-modal">
      <div>Sending: {campaign.title}</div>
      <button onClick={onClose}>Close Modal</button>
      <button onClick={onSent}>Confirm Send</button>
    </div>
  )
}));

const mockCampaign1 = {
  id: 'campaign-1',
  title: 'Campaign 1',
  status: 'draft',
  userId: 'user-123',
  organizationId: 'org-123',
  createdAt: new Date()
} as PRCampaign;

const mockCampaign2 = {
  id: 'campaign-2',
  title: 'Campaign 2',
  status: 'sent',
  userId: 'user-456',
  organizationId: 'org-123',
  createdAt: new Date()
} as PRCampaign;

const mockTeamMembers = [
  {
    id: 'member-1',
    userId: 'user-123',
    displayName: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    photoUrl: 'https://example.com/john.jpg',
    organizationId: 'org-123'
  },
  {
    id: 'member-2',
    userId: 'user-456',
    displayName: 'Jane Smith',
    email: 'jane@example.com',
    role: 'member',
    photoUrl: 'https://example.com/jane.jpg',
    organizationId: 'org-123'
  }
] as TeamMember[];

describe('PressemeldungCampaignTable Component', () => {
  const defaultProps = {
    campaigns: [],
    organizationId: 'org-123',
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (teamMemberService.getByOrganization as jest.Mock).mockResolvedValue(mockTeamMembers);
  });

  describe('Empty State', () => {
    it('should render empty state when no campaigns', () => {
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[]} />);

      expect(screen.getByText('Keine Pressemeldungen')).toBeInTheDocument();
      expect(screen.getByText('Noch keine Pressemeldungen mit diesem Projekt verknüpft')).toBeInTheDocument();
    });

    it('should not render table when no campaigns', () => {
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[]} />);

      expect(screen.queryByText('Kampagne')).not.toBeInTheDocument();
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
    });
  });

  describe('Table Header', () => {
    it('should render table header with all columns', async () => {
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} />);

      await waitFor(() => {
        expect(screen.getByText('Kampagne')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Erstellt am')).toBeInTheDocument();
        expect(screen.getByText('Versenden')).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Rows', () => {
    it('should render single campaign row', async () => {
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
        expect(screen.getByText('Campaign 1')).toBeInTheDocument();
      });
    });

    it('should render multiple campaign rows', async () => {
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1, mockCampaign2]} />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
        expect(screen.getByTestId('campaign-row-campaign-2')).toBeInTheDocument();
        expect(screen.getByText('Campaign 1')).toBeInTheDocument();
        expect(screen.getByText('Campaign 2')).toBeInTheDocument();
      });
    });

    it('should pass team members to campaign rows', async () => {
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} />);

      await waitFor(() => {
        expect(teamMemberService.getByOrganization).toHaveBeenCalledWith('org-123');
      });
    });

    it('should handle team members loading error', async () => {
      (teamMemberService.getByOrganization as jest.Mock).mockRejectedValue(new Error('Failed to load'));

      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should call onRefresh when refresh button clicked', async () => {
      const mockRefresh = jest.fn();
      const user = userEvent.setup();

      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Email Send Modal', () => {
    it('should not render modal initially', async () => {
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('email-send-modal')).not.toBeInTheDocument();
    });

    it('should open modal when send button clicked', async () => {
      const user = userEvent.setup();
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
      });

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      expect(screen.getByTestId('email-send-modal')).toBeInTheDocument();
      expect(screen.getByText('Sending: Campaign 1')).toBeInTheDocument();
    });

    it('should close modal when close button clicked', async () => {
      const user = userEvent.setup();
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
      });

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      expect(screen.getByTestId('email-send-modal')).toBeInTheDocument();

      const closeButton = screen.getByText('Close Modal');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('email-send-modal')).not.toBeInTheDocument();
      });
    });

    it('should call onRefresh and close modal on successful send', async () => {
      const mockRefresh = jest.fn();
      const user = userEvent.setup();
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
      });

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      const confirmButton = screen.getByText('Confirm Send');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId('email-send-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Organization ID Handling', () => {
    it('should handle missing organizationId', async () => {
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} organizationId="" />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
      });
    });

    it('should not load team members when organizationId is empty', async () => {
      render(<PressemeldungCampaignTable {...defaultProps} campaigns={[mockCampaign1]} organizationId="" />);

      await waitFor(() => {
        expect(screen.getByTestId('campaign-row-campaign-1')).toBeInTheDocument();
      });

      expect(teamMemberService.getByOrganization).not.toHaveBeenCalled();
    });
  });
});
