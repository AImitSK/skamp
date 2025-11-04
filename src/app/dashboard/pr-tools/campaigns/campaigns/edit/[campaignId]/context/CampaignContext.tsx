// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/context/CampaignContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PRCampaign, EditLockData } from '@/types/pr';
import { prService } from '@/lib/firebase/pr-service';
import { pdfVersionsService, PDFVersion } from '@/lib/firebase/pdf-versions-service';
import { toastService } from '@/lib/utils/toast';

/**
 * Campaign Context für zentrales State Management der Campaign Edit Page
 *
 * Verwaltet:
 * - Campaign Daten
 * - Loading/Saving States
 * - Active Tab
 * - PDF Generation
 * - Approval Workflow
 */

interface CampaignContextValue {
  // Core Campaign State
  campaign: PRCampaign | null;
  loading: boolean;
  saving: boolean;

  // Navigation
  activeTab: 1 | 2 | 3 | 4;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;

  // Campaign Actions
  setCampaign: (campaign: PRCampaign | null) => void;
  updateField: (field: keyof PRCampaign, value: any) => void;
  saveCampaign: () => Promise<void>;
  reloadCampaign: () => Promise<void>;

  // PDF Generation
  generatingPdf: boolean;
  currentPdfVersion: PDFVersion | null;
  generatePdf: (folderId?: string) => Promise<void>;

  // Edit Lock
  editLockStatus: EditLockData;
  loadingEditLock: boolean;

  // Approval Workflow
  approvalLoading: boolean;
  submitForApproval: () => Promise<void>;
  approveCampaign: (approved: boolean, note?: string) => Promise<void>;
}

const CampaignContext = createContext<CampaignContextValue | undefined>(undefined);

interface CampaignProviderProps {
  children: React.ReactNode;
  campaignId: string;
  organizationId: string;
}

export function CampaignProvider({
  children,
  campaignId,
  organizationId
}: CampaignProviderProps) {
  // Core Campaign State
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);

  // PDF Generation
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [currentPdfVersion, setCurrentPdfVersion] = useState<PDFVersion | null>(null);

  // Edit Lock
  const [editLockStatus, setEditLockStatus] = useState<EditLockData>({
    isLocked: false,
    lockedBy: undefined,
    lockedAt: undefined,
  });
  const [loadingEditLock, setLoadingEditLock] = useState(true);

  // Approval
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Load Campaign Data
  const loadCampaign = useCallback(async () => {
    setLoading(true);
    try {
      const campaign = await prService.getById(campaignId);
      if (campaign) {
        setCampaign(campaign);

        // Lade erweiterte Approval-Daten mit feedbackHistory wenn ShareId vorhanden
        if (campaign.approvalData?.shareId && campaign.approvalData.shareId !== '') {
          try {
            const campaignWithFeedback = await prService.getCampaignByShareId(campaign.approvalData.shareId);
            if (campaignWithFeedback?.approvalData?.feedbackHistory) {
              campaign.approvalData.feedbackHistory = campaignWithFeedback.approvalData.feedbackHistory;
              setCampaign({ ...campaign });
            }
          } catch (error) {
            // Fehler beim Laden der Feedback-History - nicht kritisch
          }
        }
      }

      // Lade Edit-Lock Status
      try {
        setLoadingEditLock(true);
        const lockStatus = await pdfVersionsService.getEditLockStatus(campaignId);
        setEditLockStatus(lockStatus);
      } catch (error) {
        // Edit-Lock Fehler nicht kritisch
      } finally {
        setLoadingEditLock(false);
      }

    } catch (error) {
      toastService.error('Kampagne konnte nicht geladen werden');
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // Load campaign on mount
  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Actions (Placeholder - werden in nächsten Tasks implementiert)
  const updateField = (field: keyof PRCampaign, value: any) => {
    setCampaign(prev => prev ? { ...prev, [field]: value } : null);
  };

  const saveCampaign = async () => {
    // Wird in Task 6 implementiert
  };

  const reloadCampaign = async () => {
    await loadCampaign();
  };

  const generatePdf = async (folderId?: string) => {
    // Wird in Task 7 implementiert
  };

  const submitForApproval = async () => {
    // Wird in Task 8 implementiert
  };

  const approveCampaign = async (approved: boolean, note?: string) => {
    // Wird in Task 9 implementiert
  };

  const value: CampaignContextValue = {
    // Core State
    campaign,
    loading,
    saving,

    // Navigation
    activeTab,
    setActiveTab,

    // Campaign Actions
    setCampaign,
    updateField,
    saveCampaign,
    reloadCampaign,

    // PDF
    generatingPdf,
    currentPdfVersion,
    generatePdf,

    // Edit Lock
    editLockStatus,
    loadingEditLock,

    // Approval
    approvalLoading,
    submitForApproval,
    approveCampaign,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign(): CampaignContextValue {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within CampaignProvider');
  }
  return context;
}
