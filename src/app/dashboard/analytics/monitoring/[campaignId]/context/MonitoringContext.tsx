'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCampaignMonitoringData } from '@/lib/hooks/useCampaignMonitoringData';
import { useAnalysisPDFs } from '@/lib/hooks/useAnalysisPDFs';
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
import { usePDFDeleteMutation } from '@/lib/hooks/usePDFDeleteMutation';
import { PRCampaign } from '@/types/pr';
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping, MonitoringSuggestion } from '@/types/monitoring';

interface MonitoringContextValue {
  // Data
  campaign: PRCampaign | null;
  sends: EmailCampaignSend[];
  clippings: MediaClipping[];
  suggestions: MonitoringSuggestion[];

  // Loading States
  isLoadingData: boolean;
  isLoadingPDFs: boolean;

  // Error States
  error: Error | null;

  // Actions
  reloadData: () => void;

  // PDF Export
  handlePDFExport: (userId: string) => Promise<void>;
  isPDFGenerating: boolean;

  // Analysis PDFs
  analysisPDFs: any[];
  analysenFolderLink: string | null;
  handleDeletePDF: (pdf: any) => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
  campaignId: string;
  organizationId: string;
  activeTab: string;
}

export function MonitoringProvider({ children, campaignId, organizationId, activeTab }: Props) {
  // Data Loading
  const {
    data,
    isLoading: isLoadingData,
    error,
    refetch
  } = useCampaignMonitoringData(campaignId, organizationId);

  // PDF-Liste (nur wenn Analytics Tab aktiv)
  const {
    data: pdfData,
    isLoading: isLoadingPDFs
  } = useAnalysisPDFs(
    campaignId,
    organizationId,
    data?.campaign?.projectId,
    activeTab === 'dashboard'
  );

  // PDF-Export
  const pdfGenerator = usePDFReportGenerator();

  // PDF-Delete
  const pdfDelete = usePDFDeleteMutation(
    campaignId,
    organizationId,
    data?.campaign?.projectId
  );

  const handlePDFExport = async (userId: string) => {
    if (!data?.campaign) return;

    pdfGenerator.mutate({
      campaignId,
      organizationId,
      userId,
    });
  };

  const handleDeletePDF = async (pdf: any) => {
    await pdfDelete.mutateAsync(pdf);
  };

  const value: MonitoringContextValue = {
    campaign: data?.campaign || null,
    sends: data?.sends || [],
    clippings: data?.clippings || [],
    suggestions: data?.suggestions || [],
    isLoadingData,
    isLoadingPDFs,
    error: error as Error | null,
    reloadData: refetch,
    handlePDFExport,
    isPDFGenerating: pdfGenerator.isPending,
    analysisPDFs: pdfData?.pdfs || [],
    analysenFolderLink: pdfData?.folderLink || null,
    handleDeletePDF,
  };

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within MonitoringProvider');
  }
  return context;
}
