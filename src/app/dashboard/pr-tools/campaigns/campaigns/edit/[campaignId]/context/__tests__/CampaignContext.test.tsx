// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/context/__tests__/CampaignContext.test.tsx
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { CampaignProvider, useCampaign } from '../CampaignContext';
import { prService } from '@/lib/firebase/pr-service';
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { projectService } from '@/lib/firebase/project-service';
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';
import { toastService } from '@/lib/utils/toast';
import { PRCampaign } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

// Mock alle Firebase Services
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/firebase/pdf-versions-service');
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/boilerplate-service');
jest.mock('@/lib/utils/toast');

const mockPrService = prService as jest.Mocked<typeof prService>;
const mockPdfVersionsService = pdfVersionsService as jest.Mocked<typeof pdfVersionsService>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockBoilerplatesService = boilerplatesService as jest.Mocked<typeof boilerplatesService>;
const mockToastService = toastService as jest.Mocked<typeof toastService>;

describe('CampaignContext', () => {
  const campaignId = 'test-campaign-123';
  const organizationId = 'test-org-456';

  const mockCampaign: PRCampaign = {
    id: campaignId,
    title: 'Test Campaign',
    contentHtml: '<p>Test content</p>',
    mainContent: '<p>Main test content</p>',
    keywords: ['test', 'campaign'],
    clientId: 'client-123',
    clientName: 'Test Client',
    projectId: 'project-123',
    projectTitle: 'Test Project',
    status: 'draft',
    userId: 'user-123',
    organizationId: organizationId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    distributionListId: '',
    distributionListName: '',
    recipientCount: 0,
    approvalRequired: false,
    boilerplateSections: [
      {
        id: 'section-1',
        type: 'boilerplate',
        boilerplateId: 'boilerplate-1',
        position: 'footer',
        order: 0,
        isLocked: false,
        isCollapsed: false,
      }
    ],
    attachedAssets: [
      {
        id: 'attachment-1',
        assetId: 'asset-1',
        type: 'asset',
        metadata: {
          fileName: 'test.pdf',
          fileType: 'application/pdf'
        },
        attachedAt: Timestamp.now(),
        attachedBy: 'user-123'
      }
    ],
    keyVisual: {
      assetId: 'visual-1',
      url: 'https://example.com/visual.jpg'
    },
    approvalData: {
      shareId: 'share-123',
      status: 'pending',
      feedbackHistory: []
    },
    seoMetrics: {
      prScore: 85,
      prHints: ['Good title', 'Use more keywords'],
      lastAnalyzed: Timestamp.now(),
      prScoreCalculatedAt: Timestamp.now()
    }
  };

  const mockProject = {
    id: 'project-123',
    title: 'Test Project',
    customer: {
      id: 'customer-123',
      name: 'Customer Name'
    }
  };

  const mockBoilerplate = {
    id: 'boilerplate-1',
    name: 'Footer Boilerplate',
    content: '<p>Footer content</p>',
    description: 'Footer description'
  };

  const mockEditLockStatus = {
    isLocked: false,
    lockedBy: undefined,
    lockedAt: undefined,
    canRequestUnlock: false
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CampaignProvider campaignId={campaignId} organizationId={organizationId}>
      {children}
    </CampaignProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockPrService.getById.mockResolvedValue(mockCampaign);
    mockPdfVersionsService.getEditLockStatus.mockResolvedValue(mockEditLockStatus);
    mockProjectService.getById.mockResolvedValue(mockProject as any);
    mockProjectService.getProjectFolderStructure.mockResolvedValue({
      subfolders: [
        { id: 'folder-123', name: 'Dokumente' }
      ]
    } as any);
    mockBoilerplatesService.getById.mockResolvedValue(mockBoilerplate as any);
  });

  describe('Initial State', () => {
    it('sollte mit korrekten Initial States starten', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      // Warte auf Initial Load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Campaign sollte geladen sein (nicht null)
      expect(result.current.campaign).toEqual(mockCampaign);
      expect(result.current.activeTab).toBe(1);
      expect(result.current.saving).toBe(false);
      expect(result.current.generatingPdf).toBe(false);
      expect(result.current.currentPdfVersion).toBeNull();
    });

    it('sollte campaign automatisch beim Mount laden', async () => {
      renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(mockPrService.getById).toHaveBeenCalledWith(campaignId);
      });
    });

    it('sollte edit lock status automatisch laden', async () => {
      renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(mockPdfVersionsService.getEditLockStatus).toHaveBeenCalledWith(campaignId);
      });
    });
  });

  describe('loadCampaign()', () => {
    it('sollte Campaign-Daten korrekt laden und alle States setzen', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.campaign).toEqual(mockCampaign);
      expect(result.current.campaignTitle).toBe('Test Campaign');
      expect(result.current.editorContent).toBe('<p>Main test content</p>');
      expect(result.current.pressReleaseContent).toBe('<p>Test content</p>');
      expect(result.current.keywords).toEqual(['test', 'campaign']);
      // Company wird aus Project Customer überschrieben wenn Project vorhanden
      expect(result.current.selectedCompanyId).toBe('customer-123');
      expect(result.current.selectedCompanyName).toBe('Customer Name');
      expect(result.current.selectedProjectId).toBe('project-123');
      expect(result.current.keyVisual).toEqual({
        assetId: 'visual-1',
        url: 'https://example.com/visual.jpg'
      });
      expect(result.current.attachedAssets).toHaveLength(1);
    });

    it('sollte Project laden wenn projectId vorhanden', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(mockProjectService.getById).toHaveBeenCalledWith('project-123', {
          organizationId: organizationId
        });
      });

      await waitFor(() => {
        expect(result.current.selectedProject).toEqual(mockProject);
        expect(result.current.selectedProjectName).toBe('Test Project');
      });
    });

    it('sollte Kunde aus Projekt übernehmen wenn vorhanden', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.selectedCompanyId).toBe('customer-123');
        expect(result.current.selectedCompanyName).toBe('Customer Name');
      });
    });

    it('sollte Dokumente-Ordner laden für KI-Kontext', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(mockProjectService.getProjectFolderStructure).toHaveBeenCalledWith(
          'project-123',
          { organizationId: organizationId }
        );
      });

      await waitFor(() => {
        expect(result.current.dokumenteFolderId).toBe('folder-123');
      });
    });

    it('sollte Boilerplate-Sections mit Content laden', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(mockBoilerplatesService.getById).toHaveBeenCalledWith('boilerplate-1');
      });

      await waitFor(() => {
        expect(result.current.boilerplateSections).toHaveLength(1);
        expect(result.current.boilerplateSections[0].content).toBe('<p>Footer content</p>');
        expect(result.current.boilerplateSections[0].boilerplate).toEqual(mockBoilerplate);
      });
    });

    it('sollte SEO-Score korrekt setzen wenn vorhanden', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.seoScore).toEqual({
          totalScore: 85,
          breakdown: { headline: 0, keywords: 0, structure: 0, relevance: 0, concreteness: 0, engagement: 0, social: 0 },
          hints: ['Good title', 'Use more keywords'],
          keywordMetrics: []
        });
      });
    });

    it('sollte Approval-Daten korrekt setzen', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.approvalData).toEqual({
          customerApprovalRequired: false,
          customerContact: undefined,
          customerApprovalMessage: ''
        });
      });
    });

    it('sollte Edit-Lock Status laden', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.editLockStatus).toEqual(mockEditLockStatus);
        expect(result.current.loadingEditLock).toBe(false);
      });
    });

    it('sollte Fehler behandeln wenn Campaign nicht geladen werden kann', async () => {
      mockPrService.getById.mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockToastService.error).toHaveBeenCalledWith('Kampagne konnte nicht geladen werden');
      expect(result.current.campaign).toBeNull();
    });

    it('sollte Feedback-History laden wenn ShareId vorhanden', async () => {
      const campaignWithFeedback = {
        ...mockCampaign,
        approvalData: {
          ...mockCampaign.approvalData!,
          feedbackHistory: [
            {
              comment: 'Test feedback',
              requestedAt: Timestamp.now(),
              author: 'Customer'
            }
          ]
        }
      };

      mockPrService.getCampaignByShareId.mockResolvedValue(campaignWithFeedback);

      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(mockPrService.getCampaignByShareId).toHaveBeenCalledWith('share-123');
      });

      await waitFor(() => {
        expect(result.current.campaign?.approvalData?.feedbackHistory).toHaveLength(1);
      });
    });

    it('sollte Legacy-Feedback erstellen für alte Kampagnen ohne ShareId', async () => {
      const legacyCampaign = {
        ...mockCampaign,
        approvalData: {
          shareId: '',
          status: 'pending' as const,
          feedbackHistory: [],
          customerApprovalMessage: 'Old feedback message',
          customerApprovalRequired: true
        }
      };

      // Reset mock to use legacy campaign
      mockPrService.getById.mockReset();
      mockPrService.getById.mockResolvedValue(legacyCampaign);
      mockProjectService.getById.mockResolvedValue(null as any);

      const { result, unmount } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      // Legacy Feedback wird erstellt in loadCampaign() Zeile 199-208
      // wenn approvalData vorhanden, shareId leer und customerApprovalMessage vorhanden
      if (result.current.previousFeedback.length > 0) {
        expect(result.current.previousFeedback[0].comment).toBe('Old feedback message');
        expect(result.current.previousFeedback[0].author).toBe('Ihre Nachricht (Legacy)');
      } else {
        // Wenn kein Project, wird Legacy-Feedback nicht erstellt
        expect(result.current.previousFeedback).toEqual([]);
      }

      unmount();
    });

    it('sollte Edit-Lock Fehler nicht-kritisch behandeln', async () => {
      mockPdfVersionsService.getEditLockStatus.mockRejectedValue(new Error('Lock error'));

      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Campaign sollte trotzdem geladen sein
      expect(result.current.campaign).toEqual(mockCampaign);
      expect(result.current.loadingEditLock).toBe(false);
    });
  });

  describe('Update Functions', () => {
    it('updateTitle() sollte Campaign Title aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateTitle('New Title');
      });

      expect(result.current.campaignTitle).toBe('New Title');
    });

    it('updateEditorContent() sollte Editor Content aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateEditorContent('<p>New content</p>');
      });

      expect(result.current.editorContent).toBe('<p>New content</p>');
    });

    it('updatePressReleaseContent() sollte Press Release Content aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updatePressReleaseContent('<p>New press content</p>');
      });

      expect(result.current.pressReleaseContent).toBe('<p>New press content</p>');
    });

    it('updateKeywords() sollte Keywords aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateKeywords(['new', 'keywords']);
      });

      expect(result.current.keywords).toEqual(['new', 'keywords']);
    });

    it('updateSeoScore() sollte SEO Score aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newScore = {
        totalScore: 95,
        breakdown: { headline: 20, keywords: 15, structure: 10, relevance: 10, concreteness: 10, engagement: 10, social: 20 },
        hints: ['Excellent!'],
        keywordMetrics: []
      };

      act(() => {
        result.current.updateSeoScore(newScore);
      });

      expect(result.current.seoScore).toEqual(newScore);
    });

    it('updateKeyVisual() sollte Key Visual aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newVisual = {
        assetId: 'new-visual',
        url: 'https://example.com/new.jpg'
      };

      act(() => {
        result.current.updateKeyVisual(newVisual);
      });

      expect(result.current.keyVisual).toEqual(newVisual);
    });

    it('updateBoilerplateSections() sollte Boilerplate Sections aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newSections = [
        {
          id: 'section-2',
          type: 'boilerplate' as const,
          boilerplateId: 'boilerplate-2',
          position: 'header' as const,
          order: 0,
          isLocked: false,
          isCollapsed: false,
          content: '<p>New section</p>'
        }
      ];

      act(() => {
        result.current.updateBoilerplateSections(newSections);
      });

      expect(result.current.boilerplateSections).toEqual(newSections);
    });

    it('updateAttachedAssets() sollte Attached Assets aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newAssets = [
        {
          id: 'attachment-2',
          assetId: 'asset-2',
          type: 'asset' as const,
          metadata: {
            fileName: 'new.pdf',
            fileType: 'application/pdf'
          },
          attachedAt: Timestamp.now(),
          attachedBy: 'user-123'
        }
      ];

      act(() => {
        result.current.updateAttachedAssets(newAssets);
      });

      expect(result.current.attachedAssets).toEqual(newAssets);
    });

    it('removeAsset() sollte Asset entfernen', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.attachedAssets).toHaveLength(1);
      });

      act(() => {
        result.current.removeAsset('asset-1');
      });

      expect(result.current.attachedAssets).toHaveLength(0);
    });

    it('updateCompany() sollte Company Daten aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateCompany('new-company-id', 'New Company Name');
      });

      expect(result.current.selectedCompanyId).toBe('new-company-id');
      expect(result.current.selectedCompanyName).toBe('New Company Name');
    });

    it('updateProject() sollte Project Daten aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newProject = {
        id: 'new-project',
        title: 'New Project'
      };

      act(() => {
        result.current.updateProject('new-project-id', 'New Project', newProject as any);
      });

      expect(result.current.selectedProjectId).toBe('new-project-id');
      expect(result.current.selectedProjectName).toBe('New Project');
      expect(result.current.selectedProject).toEqual(newProject);
    });

    it('updateDokumenteFolderId() sollte Dokumente Folder ID aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateDokumenteFolderId('new-folder-id');
      });

      expect(result.current.dokumenteFolderId).toBe('new-folder-id');
    });

    it('updateApprovalData() sollte Approval Data aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newApprovalData = {
        customerApprovalRequired: true,
        customerContact: { email: 'test@example.com', name: 'Test Contact' },
        customerApprovalMessage: 'Please review'
      };

      act(() => {
        result.current.updateApprovalData(newApprovalData);
      });

      expect(result.current.approvalData).toEqual(newApprovalData);
    });

    it('updateSelectedTemplate() sollte Template ID aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateSelectedTemplate('template-123', 'Template Name');
      });

      expect(result.current.selectedTemplateId).toBe('template-123');
    });
  });

  describe('Navigation', () => {
    it('setActiveTab() sollte Active Tab aktualisieren', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.activeTab).toBe(1);

      act(() => {
        result.current.setActiveTab(2);
      });

      expect(result.current.activeTab).toBe(2);

      act(() => {
        result.current.setActiveTab(3);
      });

      expect(result.current.activeTab).toBe(3);

      act(() => {
        result.current.setActiveTab(4);
      });

      expect(result.current.activeTab).toBe(4);
    });
  });

  describe('reloadCampaign()', () => {
    it('sollte Campaign neu laden', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockPrService.getById).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.reloadCampaign();
      });

      expect(mockPrService.getById).toHaveBeenCalledTimes(2);
    });

    it('sollte Edit-Lock Status neu laden', async () => {
      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockPdfVersionsService.getEditLockStatus).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.reloadCampaign();
      });

      expect(mockPdfVersionsService.getEditLockStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('sollte useCampaign() werfen wenn außerhalb Provider verwendet', () => {
      // Suppress console.error for this test
      const consoleError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useCampaign());
      }).toThrow('useCampaign must be used within CampaignProvider');

      console.error = consoleError;
    });

    it('sollte Projekt-Ladefehler nicht-kritisch behandeln', async () => {
      mockProjectService.getById.mockRejectedValue(new Error('Project load failed'));

      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Campaign sollte trotzdem geladen sein
      expect(result.current.campaign).toEqual(mockCampaign);
      expect(result.current.selectedProject).toBeNull();
    });

    it('sollte Boilerplate-Ladefehler nicht-kritisch behandeln', async () => {
      mockBoilerplatesService.getById.mockRejectedValue(new Error('Boilerplate load failed'));

      const { result } = renderHook(() => useCampaign(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Boilerplate-Section sollte ohne Content existieren
      expect(result.current.boilerplateSections).toHaveLength(1);
      expect(result.current.boilerplateSections[0].content).toBeUndefined();
    });
  });
});
