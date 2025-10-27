// src/components/projects/pressemeldungen/components/__tests__/ApprovalTableRow.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApprovalTableRow, { getStatusColor, getStatusLabel, formatDate, getTimeSinceLastActivity } from '../ApprovalTableRow';
import { ApprovalEnhanced } from '@/types/approvals';
import { Timestamp } from 'firebase/firestore';

const createMockApproval = (overrides: Partial<ApprovalEnhanced> = {}): ApprovalEnhanced => ({
  id: 'approval-1',
  campaignId: 'campaign-1',
  campaignTitle: 'Test Campaign',
  projectId: 'project-123',
  status: 'pending',
  clientName: 'Test Client',
  clientEmail: 'client@example.com',
  shareId: 'share-123',
  organizationId: 'org-123',
  createdAt: Timestamp.fromDate(new Date('2025-01-01')),
  updatedAt: Timestamp.fromDate(new Date('2025-01-15')),
  recipients: [
    {
      email: 'contact@example.com',
      name: 'Contact Person',
      id: 'contact-1',
      role: 'primary',
      status: 'pending',
      isRequired: true,
      notificationsSent: 0
    } as any
  ],
  ...overrides
} as ApprovalEnhanced);

describe('ApprovalTableRow Component', () => {
  const defaultProps = {
    approval: createMockApproval(),
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render campaign title', () => {
      render(<ApprovalTableRow {...defaultProps} />);

      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(<ApprovalTableRow {...defaultProps} />);

      expect(screen.getByText('Ausstehend')).toBeInTheDocument();
    });

    it('should render client name', () => {
      render(<ApprovalTableRow {...defaultProps} />);

      expect(screen.getByText('Test Client')).toBeInTheDocument();
    });

    it('should render contact email', () => {
      render(<ApprovalTableRow {...defaultProps} />);

      expect(screen.getByText('Contact Person')).toBeInTheDocument();
    });

    it('should render fallback when no campaign title', () => {
      const approval = createMockApproval({ campaignTitle: undefined });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('Unbekannte Kampagne')).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('should render pending status', () => {
      const approval = createMockApproval({ status: 'pending' });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('Ausstehend')).toBeInTheDocument();
    });

    it('should render in_review status', () => {
      const approval = createMockApproval({ status: 'in_review' });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('In Prüfung')).toBeInTheDocument();
    });

    it('should render approved status', () => {
      const approval = createMockApproval({ status: 'approved' });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('Freigegeben')).toBeInTheDocument();
    });

    it('should render rejected status', () => {
      const approval = createMockApproval({ status: 'rejected' });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('Abgelehnt')).toBeInTheDocument();
    });

    it('should render changes_requested status', () => {
      const approval = createMockApproval({ status: 'changes_requested' });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('Änderungen Angefordert')).toBeInTheDocument();
    });

    it('should render expired status', () => {
      const approval = createMockApproval({ status: 'expired' });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('Abgelaufen')).toBeInTheDocument();
    });
  });

  describe('Client & Contact Display', () => {
    it('should render client name and contact', () => {
      render(<ApprovalTableRow {...defaultProps} />);

      expect(screen.getByText('Test Client')).toBeInTheDocument();
      expect(screen.getByText('Contact Person')).toBeInTheDocument();
    });

    it('should render contact email when no name provided', () => {
      const approval = createMockApproval({
        recipients: [
          {
            email: 'contact@example.com',
            name: undefined,
            id: 'contact-1'
          }
        ]
      });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('contact@example.com')).toBeInTheDocument();
    });

    it('should render clientEmail when no recipients', () => {
      const approval = createMockApproval({
        recipients: [],
        clientEmail: 'fallback@example.com'
      });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('fallback@example.com')).toBeInTheDocument();
    });

    it('should render "Nicht zugewiesen" when no client info', () => {
      const approval = createMockApproval({
        clientName: undefined,
        recipients: [],
        clientEmail: undefined
      });
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      expect(screen.getByText('Nicht zugewiesen')).toBeInTheDocument();
    });
  });

  describe('Last Activity', () => {
    it('should render last activity date', () => {
      const { container } = render(<ApprovalTableRow {...defaultProps} />);

      const activitySection = container.querySelector('.flex-1 .text-sm');
      expect(activitySection).toBeInTheDocument();
    });

    it('should render time since last activity', () => {
      const { container } = render(<ApprovalTableRow {...defaultProps} />);

      const timeText = container.querySelector('.text-xs.text-gray-500');
      expect(timeText).toBeInTheDocument();
    });
  });

  describe('Actions Menu', () => {
    it('should render actions dropdown', async () => {
      const user = userEvent.setup();
      render(<ApprovalTableRow {...defaultProps} />);

      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      expect(screen.getByText('Freigabe öffnen')).toBeInTheDocument();
    });

    it('should have correct link to approval page', async () => {
      const user = userEvent.setup();
      render(<ApprovalTableRow {...defaultProps} />);

      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      const link = screen.getByText('Freigabe öffnen').closest('a');
      expect(link).toHaveAttribute('href', '/freigabe/share-123');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should have fallback link when no shareId', async () => {
      const approval = createMockApproval({ shareId: undefined });
      const user = userEvent.setup();
      render(<ApprovalTableRow {...defaultProps} approval={approval} />);

      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      const link = screen.getByText('Freigabe öffnen').closest('a');
      expect(link).toHaveAttribute('href', '#');
    });
  });
});

describe('Helper Functions', () => {
  describe('getStatusColor', () => {
    it('should return amber for pending', () => {
      expect(getStatusColor('pending')).toBe('amber');
    });

    it('should return amber for in_review', () => {
      expect(getStatusColor('in_review')).toBe('amber');
    });

    it('should return green for approved', () => {
      expect(getStatusColor('approved')).toBe('green');
    });

    it('should return red for rejected', () => {
      expect(getStatusColor('rejected')).toBe('red');
    });

    it('should return orange for changes_requested', () => {
      expect(getStatusColor('changes_requested')).toBe('orange');
    });

    it('should return zinc for expired', () => {
      expect(getStatusColor('expired')).toBe('zinc');
    });

    it('should return zinc for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('zinc');
    });
  });

  describe('getStatusLabel', () => {
    it('should return German label for pending', () => {
      expect(getStatusLabel('pending')).toBe('Ausstehend');
    });

    it('should return German label for in_review', () => {
      expect(getStatusLabel('in_review')).toBe('In Prüfung');
    });

    it('should return German label for approved', () => {
      expect(getStatusLabel('approved')).toBe('Freigegeben');
    });

    it('should return German label for rejected', () => {
      expect(getStatusLabel('rejected')).toBe('Abgelehnt');
    });

    it('should return German label for changes_requested', () => {
      expect(getStatusLabel('changes_requested')).toBe('Änderungen Angefordert');
    });

    it('should return German label for expired', () => {
      expect(getStatusLabel('expired')).toBe('Abgelaufen');
    });

    it('should return original status for unknown', () => {
      expect(getStatusLabel('unknown')).toBe('unknown');
    });
  });

  describe('formatDate', () => {
    it('should return "Unbekannt" for null', () => {
      expect(formatDate(null)).toBe('Unbekannt');
    });

    it('should return "Unbekannt" for undefined', () => {
      expect(formatDate(undefined)).toBe('Unbekannt');
    });

    it('should return "Unbekannt" for invalid timestamp', () => {
      expect(formatDate({ invalid: 'timestamp' })).toBe('Unbekannt');
    });
  });

  describe('getTimeSinceLastActivity', () => {
    it('should return "Unbekannt" for null', () => {
      expect(getTimeSinceLastActivity(null)).toBe('Unbekannt');
    });

    it('should return "Unbekannt" for undefined', () => {
      expect(getTimeSinceLastActivity(undefined)).toBe('Unbekannt');
    });

    it('should return "Unbekannt" for invalid timestamp', () => {
      expect(getTimeSinceLastActivity({ invalid: 'timestamp' })).toBe('Unbekannt');
    });
  });
});
