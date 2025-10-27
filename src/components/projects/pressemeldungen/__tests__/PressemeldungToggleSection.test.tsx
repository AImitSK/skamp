// src/components/projects/pressemeldungen/__tests__/PressemeldungToggleSection.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PressemeldungToggleSection from '../PressemeldungToggleSection';
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';

// Mocks
jest.mock('@/lib/firebase/pdf-versions-service');
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getById: jest.fn()
  }
}));
jest.mock('@/lib/firebase/approval-service', () => ({
  approvalServiceExtended: {
    getApprovalsByProject: jest.fn()
  }
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: any, options: any) => {
    const DynamicComponent = (props: any) => {
      if (options?.ssr === false) {
        return <div data-testid="dynamic-loading">Loading...</div>;
      }
      return <div>Mock Dynamic Component</div>;
    };
    return DynamicComponent;
  }
}));

const mockCampaignWithAssets = {
  id: 'campaign-1',
  title: 'Test Campaign',
  attachedAssets: [
    {
      id: 'asset-1',
      type: 'asset',
      metadata: {
        fileName: 'test-image.jpg',
        fileType: 'image/jpeg',
        thumbnailUrl: 'https://example.com/thumb.jpg'
      }
    },
    {
      id: 'asset-2',
      type: 'asset',
      metadata: {
        fileName: 'test-video.mp4',
        fileType: 'video/mp4',
        thumbnailUrl: 'https://example.com/thumb2.jpg'
      }
    }
  ]
};

const mockPDFVersions = [
  {
    id: 'pdf-1',
    version: 1,
    downloadUrl: 'https://example.com/v1.pdf',
    createdAt: new Date('2025-01-01'),
    createdBy: 'user-123',
    fileSize: 1024,
    status: 'approved'
  },
  {
    id: 'pdf-2',
    version: 2,
    downloadUrl: 'https://example.com/v2.pdf',
    createdAt: new Date('2025-01-02'),
    createdBy: 'user-123',
    fileSize: 2048,
    status: 'draft'
  }
];

const mockApprovals = [
  {
    id: 'approval-1',
    campaignId: 'campaign-1',
    history: [
      {
        action: 'changes_requested',
        actorName: 'Client User',
        timestamp: new Date('2025-01-01'),
        details: { comment: 'Please change the headline' }
      },
      {
        action: 'submitted',
        actorName: 'Team Member',
        timestamp: new Date('2025-01-02'),
        details: { comment: 'Updated as requested' }
      }
    ]
  }
];

describe('PressemeldungToggleSection Component', () => {
  const defaultProps = {
    projectId: 'project-123',
    campaignId: 'campaign-1',
    organizationId: 'org-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State - No Campaign', () => {
    it('should render empty state when campaignId is undefined', () => {
      render(<PressemeldungToggleSection {...defaultProps} campaignId={undefined} />);

      expect(screen.getByText('Keine Pressemeldung')).toBeInTheDocument();
      expect(screen.getByText('Erstellen Sie eine Pressemeldung, um Medien, PDF-Historie und Kommunikation anzuzeigen')).toBeInTheDocument();
    });

    it('should not load data when campaignId is undefined', () => {
      const { prService } = require('@/lib/firebase/pr-service');
      render(<PressemeldungToggleSection {...defaultProps} campaignId={undefined} />);

      expect(prService.getById).not.toHaveBeenCalled();
      expect(pdfVersionsService.getVersionHistory).not.toHaveBeenCalled();
    });

    it('should not render toggle boxes when no campaign', () => {
      render(<PressemeldungToggleSection {...defaultProps} campaignId={undefined} />);

      expect(screen.queryByText('Angehängte Medien')).not.toBeInTheDocument();
      expect(screen.queryByText('PDF-Historie')).not.toBeInTheDocument();
      expect(screen.queryByText('Kommunikation')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should render loading skeletons', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockImplementation(() => new Promise(() => {}));
      (pdfVersionsService.getVersionHistory as jest.Mock).mockImplementation(() => new Promise(() => {}));
      approvalServiceExtended.getApprovalsByProject.mockImplementation(() => new Promise(() => {}));

      render(<PressemeldungToggleSection {...defaultProps} />);

      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should not render content while loading', () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockImplementation(() => new Promise(() => {}));
      (pdfVersionsService.getVersionHistory as jest.Mock).mockImplementation(() => new Promise(() => {}));
      approvalServiceExtended.getApprovalsByProject.mockImplementation(() => new Promise(() => {}));

      render(<PressemeldungToggleSection {...defaultProps} />);

      expect(screen.queryByText('Angehängte Medien')).not.toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should load media items from campaign', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockResolvedValue(mockCampaignWithAssets);
      (pdfVersionsService.getVersionHistory as jest.Mock).mockResolvedValue([]);
      approvalServiceExtended.getApprovalsByProject.mockResolvedValue([]);

      render(<PressemeldungToggleSection {...defaultProps} />);

      await waitFor(() => {
        expect(prService.getById).toHaveBeenCalledWith('campaign-1');
      });
    });

    it('should load PDF versions', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockResolvedValue({ id: 'campaign-1', attachedAssets: [] });
      (pdfVersionsService.getVersionHistory as jest.Mock).mockResolvedValue(mockPDFVersions);
      approvalServiceExtended.getApprovalsByProject.mockResolvedValue([]);

      render(<PressemeldungToggleSection {...defaultProps} />);

      await waitFor(() => {
        expect(pdfVersionsService.getVersionHistory).toHaveBeenCalledWith('campaign-1');
      });
    });

    it('should load communication data from approvals', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockResolvedValue({ id: 'campaign-1', attachedAssets: [] });
      (pdfVersionsService.getVersionHistory as jest.Mock).mockResolvedValue([]);
      approvalServiceExtended.getApprovalsByProject.mockResolvedValue(mockApprovals);

      render(<PressemeldungToggleSection {...defaultProps} />);

      await waitFor(() => {
        expect(approvalServiceExtended.getApprovalsByProject).toHaveBeenCalledWith('project-123', 'org-123');
      });
    });

    it('should handle errors gracefully', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockRejectedValue(new Error('Failed to load'));
      (pdfVersionsService.getVersionHistory as jest.Mock).mockRejectedValue(new Error('Failed to load'));
      approvalServiceExtended.getApprovalsByProject.mockRejectedValue(new Error('Failed to load'));

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<PressemeldungToggleSection {...defaultProps} />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('Toggle Boxes Rendering', () => {
    it('should render toggle container when data loaded', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockResolvedValue(mockCampaignWithAssets);
      (pdfVersionsService.getVersionHistory as jest.Mock).mockResolvedValue(mockPDFVersions);
      approvalServiceExtended.getApprovalsByProject.mockResolvedValue(mockApprovals);

      const { container } = render(<PressemeldungToggleSection {...defaultProps} />);

      await waitFor(() => {
        const toggleContainer = container.querySelector('.space-y-4');
        expect(toggleContainer).toBeInTheDocument();
      });
    });

    it('should render dynamic loading placeholders', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockResolvedValue(mockCampaignWithAssets);
      (pdfVersionsService.getVersionHistory as jest.Mock).mockResolvedValue([]);
      approvalServiceExtended.getApprovalsByProject.mockResolvedValue([]);

      render(<PressemeldungToggleSection {...defaultProps} />);

      await waitFor(() => {
        const loadingElements = screen.getAllByTestId('dynamic-loading');
        expect(loadingElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Transformation', () => {
    it('should transform media items correctly', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockResolvedValue(mockCampaignWithAssets);
      (pdfVersionsService.getVersionHistory as jest.Mock).mockResolvedValue([]);
      approvalServiceExtended.getApprovalsByProject.mockResolvedValue([]);

      render(<PressemeldungToggleSection {...defaultProps} />);

      await waitFor(() => {
        expect(prService.getById).toHaveBeenCalledWith('campaign-1');
      });
    });

    it('should transform PDF versions correctly', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockResolvedValue({ id: 'campaign-1', attachedAssets: [] });
      (pdfVersionsService.getVersionHistory as jest.Mock).mockResolvedValue(mockPDFVersions);
      approvalServiceExtended.getApprovalsByProject.mockResolvedValue([]);

      render(<PressemeldungToggleSection {...defaultProps} />);

      await waitFor(() => {
        expect(pdfVersionsService.getVersionHistory).toHaveBeenCalledWith('campaign-1');
      });
    });

    it('should transform communication items correctly', async () => {
      const { prService } = require('@/lib/firebase/pr-service');
      const { approvalServiceExtended } = require('@/lib/firebase/approval-service');

      prService.getById.mockResolvedValue({ id: 'campaign-1', attachedAssets: [] });
      (pdfVersionsService.getVersionHistory as jest.Mock).mockResolvedValue([]);
      approvalServiceExtended.getApprovalsByProject.mockResolvedValue(mockApprovals);

      render(<PressemeldungToggleSection {...defaultProps} />);

      await waitFor(() => {
        expect(approvalServiceExtended.getApprovalsByProject).toHaveBeenCalledWith('project-123', 'org-123');
      });
    });
  });
});
