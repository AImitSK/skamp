import { render, screen, fireEvent } from '@testing-library/react';
import { MonitoringHeader } from '../MonitoringHeader';
import { useMonitoring } from '../../context/MonitoringContext';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';

jest.mock('../../context/MonitoringContext');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseMonitoring = useMonitoring as jest.MockedFunction<typeof useMonitoring>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('MonitoringHeader', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  describe('rendering', () => {
    it('should render campaign title', () => {
      mockUseMonitoring.mockReturnValue({
        campaign: {
          id: 'campaign-1',
          userId: 'test-user-id',
          title: 'Test Campaign',
          contentHtml: '<p>Test content</p>',
          status: 'draft' as const,
          distributionListId: 'list-1',
          distributionListName: 'Test List',
          recipientCount: 10,
          approvalRequired: false,
          sentAt: Timestamp.fromDate(new Date('2024-01-15')),
        } as any,
        isPDFGenerating: false,
      } as any);

      render(<MonitoringHeader />);

      expect(screen.getByText('Monitoring: Test Campaign')).toBeInTheDocument();
    });

    it('should render sent date section when campaign has sentAt', () => {
      const testDate = new Date('2024-01-15T10:00:00Z');
      const mockTimestamp = {
        toDate: () => testDate,
        seconds: Math.floor(testDate.getTime() / 1000),
        nanoseconds: 0,
      };

      mockUseMonitoring.mockReturnValue({
        campaign: {
          id: 'campaign-1',
          userId: 'test-user-id',
          title: 'Test Campaign',
          contentHtml: '<p>Test content</p>',
          status: 'draft' as const,
          distributionListId: 'list-1',
          distributionListName: 'Test List',
          recipientCount: 10,
          approvalRequired: false,
          sentAt: mockTimestamp,
        } as any,
        isPDFGenerating: false,
      } as any);

      render(<MonitoringHeader />);

      expect(screen.getByText(/Versendet am/)).toBeInTheDocument();
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('should render N/A when sentAt is missing', () => {
      mockUseMonitoring.mockReturnValue({
        campaign: {
          id: 'campaign-1',
          userId: 'test-user-id',
          title: 'Test Campaign',
          contentHtml: '<p>Test content</p>',
          status: 'draft' as const,
          distributionListId: 'list-1',
          distributionListName: 'Test List',
          recipientCount: 10,
          approvalRequired: false,
          sentAt: null,
        } as any,
        isPDFGenerating: false,
      } as any);

      render(<MonitoringHeader />);

      expect(screen.getByText(/N\/A/)).toBeInTheDocument();
    });

    it('should render back button', () => {
      mockUseMonitoring.mockReturnValue({
        campaign: {
          id: 'campaign-1',
          userId: 'test-user-id',
          title: 'Test Campaign',
          contentHtml: '<p>Test content</p>',
          status: 'draft' as const,
          distributionListId: 'list-1',
          distributionListName: 'Test List',
          recipientCount: 10,
          approvalRequired: false,
          sentAt: Timestamp.fromDate(new Date()),
        } as any,
        isPDFGenerating: false,
      } as any);

      render(<MonitoringHeader />);

      const backButton = screen.getByRole('button');
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('back button functionality', () => {
    it('should navigate to monitoring overview on back button click', () => {
      mockUseMonitoring.mockReturnValue({
        campaign: {
          id: 'campaign-1',
          userId: 'test-user-id',
          title: 'Test Campaign',
          contentHtml: '<p>Test content</p>',
          status: 'draft' as const,
          distributionListId: 'list-1',
          distributionListName: 'Test List',
          recipientCount: 10,
          approvalRequired: false,
          sentAt: Timestamp.fromDate(new Date()),
        } as any,
        isPDFGenerating: false,
      } as any);

      render(<MonitoringHeader />);

      const backButton = screen.getByRole('button');
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/analytics/monitoring');
    });
  });

  describe('null campaign handling', () => {
    it('should render null when campaign is not loaded', () => {
      mockUseMonitoring.mockReturnValue({
        campaign: null,
        isPDFGenerating: false,
      } as any);

      const { container } = render(<MonitoringHeader />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('memoization', () => {
    it('should be a memoized component', () => {
      mockUseMonitoring.mockReturnValue({
        campaign: {
          id: 'campaign-1',
          userId: 'test-user-id',
          title: 'Test Campaign',
          contentHtml: '<p>Test content</p>',
          status: 'draft' as const,
          distributionListId: 'list-1',
          distributionListName: 'Test List',
          recipientCount: 10,
          approvalRequired: false,
          sentAt: Timestamp.fromDate(new Date()),
        } as any,
        isPDFGenerating: false,
      } as any);

      const { rerender } = render(<MonitoringHeader />);
      const firstRender = screen.getByText('Monitoring: Test Campaign');

      rerender(<MonitoringHeader />);
      const secondRender = screen.getByText('Monitoring: Test Campaign');

      expect(firstRender).toBe(secondRender);
    });
  });
});
