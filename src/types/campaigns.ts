// src/types/campaigns.ts

export type ViewMode = 'grid' | 'list';

export interface EmailActivity {
  id: string;
  type: 'sent' | 'opened' | 'clicked' | 'bounced';
  recipientEmail: string;
  recipientName?: string;
  timestamp: any; // Firebase Timestamp
  metadata?: {
    linkClicked?: string;
    bounceReason?: string;
  };
}

export interface CampaignFilters {
  searchTerm: string;
  selectedStatus: string;
  selectedCustomerId: string;
}

export interface CampaignListProps {
  campaigns: any[]; // PRCampaign[]
  loading: boolean;
  viewMode: ViewMode;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onCampaignAction: (action: string, campaignId: string) => void;
}

export interface BulkActionsProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkExport: () => void;
}