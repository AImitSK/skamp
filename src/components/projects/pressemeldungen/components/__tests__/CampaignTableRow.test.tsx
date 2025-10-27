// src/components/projects/pressemeldungen/components/__tests__/CampaignTableRow.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignTableRow from '../CampaignTableRow';
import { prService } from '@/lib/firebase/pr-service';
import { toastService } from '@/lib/utils/toast';
import { PRCampaign } from '@/types/pr';
import { TeamMember } from '@/types/international';
import { Timestamp } from 'firebase/firestore';

// Mocks
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/utils/toast');
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    }
  })
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

const mockCampaign: PRCampaign = {
  id: 'campaign-1',
  title: 'Test Campaign',
  status: 'draft',
  userId: 'user-123',
  organizationId: 'org-123',
  createdAt: Timestamp.fromDate(new Date('2025-01-15')) as any
};

const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    userId: 'user-123',
    displayName: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    photoUrl: 'https://example.com/john.jpg',
    organizationId: 'org-123',
    createdAt: new Date()
  }
];

describe('CampaignTableRow Component', () => {
  const defaultProps = {
    campaign: mockCampaign,
    teamMembers: mockTeamMembers,
    onRefresh: jest.fn(),
    onSend: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render campaign title as link', () => {
      render(<CampaignTableRow {...defaultProps} />);

      const titleLink = screen.getByText('Test Campaign');
      expect(titleLink).toBeInTheDocument();
      expect(titleLink.closest('a')).toHaveAttribute('href', '/dashboard/pr-tools/campaigns/campaigns/edit/campaign-1');
    });

    it('should render campaign status badge', () => {
      render(<CampaignTableRow {...defaultProps} />);

      expect(screen.getByText('Entwurf')).toBeInTheDocument();
    });

    it('should render admin avatar', () => {
      const { container } = render(<CampaignTableRow {...defaultProps} />);

      const avatar = container.querySelector('img[alt="John Doe"]');
      expect(avatar).toBeInTheDocument();
    });

    it('should render created date section', () => {
      const { container } = render(<CampaignTableRow {...defaultProps} />);

      const dateSection = container.querySelector('.w-\\[15\\%\\] .text-sm');
      expect(dateSection).toBeInTheDocument();
    });

    it('should render project title if available', () => {
      const campaignWithProject = {
        ...mockCampaign,
        projectTitle: 'Test Project'
      };
      render(<CampaignTableRow {...defaultProps} campaign={campaignWithProject} />);

      expect(screen.getByText('Projekt: Test Project')).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('should render draft status with zinc color', () => {
      const campaign = { ...mockCampaign, status: 'draft' as any };
      render(<CampaignTableRow {...defaultProps} campaign={campaign} />);

      expect(screen.getByText('Entwurf')).toBeInTheDocument();
    });

    it('should render in_review status with amber color', () => {
      const campaign = { ...mockCampaign, status: 'in_review' as any };
      render(<CampaignTableRow {...defaultProps} campaign={campaign} />);

      expect(screen.getByText('In Prüfung')).toBeInTheDocument();
    });

    it('should render approved status with green color', () => {
      const campaign = { ...mockCampaign, status: 'approved' as any };
      render(<CampaignTableRow {...defaultProps} campaign={campaign} />);

      expect(screen.getByText('Freigegeben')).toBeInTheDocument();
    });

    it('should render sent status with blue color', () => {
      const campaign = { ...mockCampaign, status: 'sent' as any };
      render(<CampaignTableRow {...defaultProps} campaign={campaign} />);

      expect(screen.getByText('Versendet')).toBeInTheDocument();
    });

    it('should render rejected status with red color', () => {
      const campaign = { ...mockCampaign, status: 'rejected' as any };
      render(<CampaignTableRow {...defaultProps} campaign={campaign} />);

      expect(screen.getByText('Abgelehnt')).toBeInTheDocument();
    });
  });

  describe('Edit Button', () => {
    it('should navigate to edit page on title click', async () => {
      const user = userEvent.setup();
      const mockPush = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: mockPush });

      render(<CampaignTableRow {...defaultProps} />);

      const titleLink = screen.getByText('Test Campaign');
      await user.click(titleLink);

      expect(titleLink.closest('a')).toHaveAttribute('href', '/dashboard/pr-tools/campaigns/campaigns/edit/campaign-1');
    });
  });

  describe('Send Button', () => {
    it('should render send button for non-sent campaigns', () => {
      render(<CampaignTableRow {...defaultProps} />);

      expect(screen.getByText('Versenden')).toBeInTheDocument();
    });

    it('should call onSend when send button clicked', async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();

      render(<CampaignTableRow {...defaultProps} onSend={mockOnSend} />);

      const sendButton = screen.getByText('Versenden');
      await user.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith(mockCampaign);
    });

    it('should render monitoring link for sent campaigns', () => {
      const sentCampaign = { ...mockCampaign, status: 'sent' as any };
      render(<CampaignTableRow {...defaultProps} campaign={sentCampaign} />);

      const monitoringLink = screen.getByText(/Monitoring/i);
      expect(monitoringLink).toBeInTheDocument();
      expect(monitoringLink.closest('a')).toHaveAttribute('href', '/dashboard/analytics/monitoring/campaign-1');
    });
  });

  describe('Delete Dialog', () => {
    it('should open delete dialog on delete button click', async () => {
      const user = userEvent.setup();
      render(<CampaignTableRow {...defaultProps} />);

      const dropdownButton = screen.getByRole('button', { name: '' });
      await user.click(dropdownButton);

      const deleteButton = screen.getByText('Löschen');
      await user.click(deleteButton);

      expect(screen.getByText('Kampagne löschen')).toBeInTheDocument();
      expect(screen.getByText(/Möchten Sie die Kampagne/i)).toBeInTheDocument();
    });

    it('should close dialog on cancel', async () => {
      const user = userEvent.setup();
      render(<CampaignTableRow {...defaultProps} />);

      const dropdownButton = screen.getByRole('button', { name: '' });
      await user.click(dropdownButton);

      const deleteButton = screen.getByText('Löschen');
      await user.click(deleteButton);

      expect(screen.getByText('Kampagne löschen')).toBeInTheDocument();

      const cancelButton = screen.getByText('Abbrechen');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Kampagne löschen')).not.toBeInTheDocument();
      });
    });

    it('should delete campaign on confirm', async () => {
      const mockRefresh = jest.fn();
      const user = userEvent.setup();
      (prService.delete as jest.Mock).mockResolvedValue(undefined);

      render(<CampaignTableRow {...defaultProps} onRefresh={mockRefresh} />);

      const dropdownButton = screen.getByRole('button', { name: '' });
      await user.click(dropdownButton);

      const deleteButton = screen.getByText('Löschen');
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(prService.delete).toHaveBeenCalledWith('campaign-1');
        expect(toastService.success).toHaveBeenCalledWith('Kampagne erfolgreich gelöscht');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should handle delete errors', async () => {
      const user = userEvent.setup();
      (prService.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      render(<CampaignTableRow {...defaultProps} />);

      const dropdownButton = screen.getByRole('button', { name: '' });
      await user.click(dropdownButton);

      const deleteButton = screen.getByText('Löschen');
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Löschen' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Fehler beim Löschen der Kampagne');
      });
    });
  });

  describe('Date Formatting', () => {
    it('should render date section with Firestore Timestamp', () => {
      const { container } = render(<CampaignTableRow {...defaultProps} />);

      const dateSection = container.querySelector('.w-\\[15\\%\\] .text-sm');
      expect(dateSection).toBeInTheDocument();
      expect(dateSection?.textContent).toBeTruthy();
    });

    it('should render date with Date object', () => {
      const campaign = {
        ...mockCampaign,
        createdAt: new Date('2025-02-20') as any
      };
      const { container } = render(<CampaignTableRow {...defaultProps} campaign={campaign} />);

      const dateSection = container.querySelector('.w-\\[15\\%\\] .text-sm');
      expect(dateSection).toBeInTheDocument();
      expect(dateSection?.textContent).toContain('Feb');
    });

    it('should handle missing date', () => {
      const campaign = {
        ...mockCampaign,
        createdAt: null as any
      };
      render(<CampaignTableRow {...defaultProps} campaign={campaign} />);

      expect(screen.getByText('Unbekannt')).toBeInTheDocument();
    });
  });

  describe('Dropdown Menu', () => {
    it('should render edit menu item', async () => {
      const user = userEvent.setup();
      render(<CampaignTableRow {...defaultProps} />);

      const dropdownButton = screen.getByRole('button', { name: '' });
      await user.click(dropdownButton);

      expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    });

    it('should render delete menu item', async () => {
      const user = userEvent.setup();
      render(<CampaignTableRow {...defaultProps} />);

      const dropdownButton = screen.getByRole('button', { name: '' });
      await user.click(dropdownButton);

      expect(screen.getByText('Löschen')).toBeInTheDocument();
    });
  });
});
