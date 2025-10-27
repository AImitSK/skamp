// src/components/projects/pressemeldungen/__tests__/PressemeldungApprovalTable.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PressemeldungApprovalTable from '../PressemeldungApprovalTable';
import { ApprovalEnhanced } from '@/types/approvals';
import { Timestamp } from 'firebase/firestore';

// Mocks
jest.mock('../components/ApprovalTableRow', () => ({
  __esModule: true,
  default: ({ approval, onRefresh }: any) => (
    <div data-testid={`approval-row-${approval.id}`}>
      <div>{approval.campaignTitle}</div>
      <div>{approval.status}</div>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  )
}));

const createMockApproval = (overrides: Partial<ApprovalEnhanced> = {}): ApprovalEnhanced => ({
  id: 'approval-1',
  campaignId: 'campaign-1',
  campaignTitle: 'Test Campaign',
  projectId: 'project-123',
  status: 'pending',
  clientName: 'Test Client',
  clientEmail: 'client@example.com',
  organizationId: 'org-123',
  createdAt: Timestamp.fromDate(new Date()) as any,
  updatedAt: Timestamp.fromDate(new Date()) as any,
  recipients: [],
  ...overrides
});

describe('PressemeldungApprovalTable Component', () => {
  const defaultProps = {
    approvals: [],
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should render empty state when no approvals', () => {
      render(<PressemeldungApprovalTable {...defaultProps} approvals={[]} />);

      expect(screen.getByText('Keine Freigaben')).toBeInTheDocument();
      expect(screen.getByText('Keine Freigaben für dieses Projekt gefunden')).toBeInTheDocument();
    });

    it('should not render table when no approvals', () => {
      render(<PressemeldungApprovalTable {...defaultProps} approvals={[]} />);

      expect(screen.queryByText('Kampagne')).not.toBeInTheDocument();
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
      expect(screen.queryByText('Kunde & Kontakt')).not.toBeInTheDocument();
    });
  });

  describe('Table Header', () => {
    it('should render table header with all columns', () => {
      const approvals = [createMockApproval()];
      render(<PressemeldungApprovalTable {...defaultProps} approvals={approvals} />);

      expect(screen.getByText('Kampagne')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Kunde & Kontakt')).toBeInTheDocument();
      expect(screen.getByText('Letzte Aktivität')).toBeInTheDocument();
    });
  });

  describe('Approval Rows', () => {
    it('should render single approval row', () => {
      const approvals = [createMockApproval({ id: 'approval-1', campaignTitle: 'Campaign 1' })];
      render(<PressemeldungApprovalTable {...defaultProps} approvals={approvals} />);

      expect(screen.getByTestId('approval-row-approval-1')).toBeInTheDocument();
      expect(screen.getByText('Campaign 1')).toBeInTheDocument();
    });

    it('should render multiple approval rows', () => {
      const approvals = [
        createMockApproval({ id: 'approval-1', campaignTitle: 'Campaign 1' }),
        createMockApproval({ id: 'approval-2', campaignTitle: 'Campaign 2' }),
        createMockApproval({ id: 'approval-3', campaignTitle: 'Campaign 3' })
      ];
      render(<PressemeldungApprovalTable {...defaultProps} approvals={approvals} />);

      expect(screen.getByTestId('approval-row-approval-1')).toBeInTheDocument();
      expect(screen.getByTestId('approval-row-approval-2')).toBeInTheDocument();
      expect(screen.getByTestId('approval-row-approval-3')).toBeInTheDocument();
      expect(screen.getByText('Campaign 1')).toBeInTheDocument();
      expect(screen.getByText('Campaign 2')).toBeInTheDocument();
      expect(screen.getByText('Campaign 3')).toBeInTheDocument();
    });

    it('should render approvals with different statuses', () => {
      const approvals = [
        createMockApproval({ id: 'approval-1', status: 'pending' }),
        createMockApproval({ id: 'approval-2', status: 'approved' }),
        createMockApproval({ id: 'approval-3', status: 'rejected' })
      ];
      render(<PressemeldungApprovalTable {...defaultProps} approvals={approvals} />);

      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('approved')).toBeInTheDocument();
      expect(screen.getByText('rejected')).toBeInTheDocument();
    });

    it('should pass onRefresh to approval rows', async () => {
      const mockRefresh = jest.fn();
      const approvals = [createMockApproval()];
      const user = userEvent.setup();

      render(<PressemeldungApprovalTable {...defaultProps} approvals={approvals} onRefresh={mockRefresh} />);

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Table Structure', () => {
    it('should render table with shadow and rounded corners', () => {
      const approvals = [createMockApproval()];
      const { container } = render(<PressemeldungApprovalTable {...defaultProps} approvals={approvals} />);

      const table = container.querySelector('.bg-white.rounded-lg.shadow-sm');
      expect(table).toBeInTheDocument();
    });

    it('should render header with gray background', () => {
      const approvals = [createMockApproval()];
      const { container } = render(<PressemeldungApprovalTable {...defaultProps} approvals={approvals} />);

      const header = container.querySelector('.bg-gray-50');
      expect(header).toBeInTheDocument();
    });

    it('should render rows with dividers', () => {
      const approvals = [createMockApproval(), createMockApproval({ id: 'approval-2' })];
      const { container } = render(<PressemeldungApprovalTable {...defaultProps} approvals={approvals} />);

      const rowContainer = container.querySelector('.divide-y.divide-gray-200');
      expect(rowContainer).toBeInTheDocument();
    });
  });

  describe('Props Propagation', () => {
    it('should pass all approval data to rows', () => {
      const approval = createMockApproval({
        id: 'approval-1',
        campaignTitle: 'Full Campaign Title',
        status: 'in_review'
      });
      render(<PressemeldungApprovalTable {...defaultProps} approvals={[approval]} />);

      expect(screen.getByText('Full Campaign Title')).toBeInTheDocument();
      expect(screen.getByText('in_review')).toBeInTheDocument();
    });

    it('should handle approvals with minimal data', () => {
      const approval = createMockApproval({
        id: 'approval-minimal',
        campaignTitle: '',
        clientName: undefined,
        clientEmail: undefined
      });
      render(<PressemeldungApprovalTable {...defaultProps} approvals={[approval]} />);

      expect(screen.getByTestId('approval-row-approval-minimal')).toBeInTheDocument();
    });
  });
});
