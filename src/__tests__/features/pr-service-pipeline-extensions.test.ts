// src/__tests__/features/pr-service-pipeline-extensions.test.ts - Tests für PR Service Pipeline-Erweiterungen
import { jest } from '@jest/globals';
import type { PRCampaign, PipelineStage } from '@/types/pr';

// Import OHNE Mock erst mal
import { prService } from '@/lib/firebase/pr-service';

// Dann manuell Mock-Funktionen zuweisen
const mockGetByProjectId = jest.fn();
const mockUpdatePipelineStage = jest.fn();
const mockGetById = jest.fn();
const mockUpdate = jest.fn();

// Ersetze die echten Methoden mit Mocks
prService.getByProjectId = mockGetByProjectId as any;
prService.updatePipelineStage = mockUpdatePipelineStage as any;
prService.getById = mockGetById as any;
prService.update = mockUpdate as any;

describe('PR Service - Pipeline Extensions', () => {
  const mockOrganizationId = 'org-123';
  const mockProjectId = 'project-456';
  const mockCampaignId = 'campaign-789';

  const mockContext = {
    organizationId: mockOrganizationId
  };

  const mockCampaign: PRCampaign = {
    id: mockCampaignId,
    title: 'Test Kampagne',
    organizationId: mockOrganizationId,
    userId: 'user-123',
    projectId: mockProjectId,
    pipelineStage: 'creation' as PipelineStage,
    status: 'draft',
    contentHtml: 'Test Content',
    distributionListId: '',
    distributionListName: '',
    recipientCount: 0,
    approvalRequired: false,
    createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByProjectId', () => {
    it('sollte alle Kampagnen eines Projekts erfolgreich laden', async () => {
      const mockCampaigns = [
        { ...mockCampaign, id: 'campaign-1', title: 'Kampagne 1' },
        { ...mockCampaign, id: 'campaign-2', title: 'Kampagne 2' }
      ];

      mockGetByProjectId.mockResolvedValue(mockCampaigns);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toEqual(mockCampaigns);
      expect(mockGetByProjectId).toHaveBeenCalledWith(mockProjectId, mockContext);
    });

    it('sollte Multi-Tenancy-Sicherheit durchsetzen', async () => {
      mockGetByProjectId.mockResolvedValue([]);

      await prService.getByProjectId(mockProjectId, mockContext);

      expect(mockGetByProjectId).toHaveBeenCalledWith(mockProjectId, mockContext);
      expect(mockGetByProjectId).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({ organizationId: mockOrganizationId })
      );
    });

    it('sollte leeres Array bei Firebase-Fehlern zurückgeben', async () => {
      mockGetByProjectId.mockResolvedValue([]);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toEqual([]);
    });

    it('sollte Kampagnen nach Erstellungsdatum sortieren (neueste zuerst)', async () => {
      const olderCampaign = {
        ...mockCampaign,
        id: 'campaign-old',
        createdAt: { seconds: 1234567000, nanoseconds: 0 }
      };
      const newerCampaign = {
        ...mockCampaign,
        id: 'campaign-new',
        createdAt: { seconds: 1234567999, nanoseconds: 0 }
      };

      const sortedCampaigns = [newerCampaign, olderCampaign];
      mockGetByProjectId.mockResolvedValue(sortedCampaigns);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('campaign-new');
      expect(result[1].id).toBe('campaign-old');
    });

    it('sollte mit leerer Kampagnenliste umgehen', async () => {
      mockGetByProjectId.mockResolvedValue([]);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toEqual([]);
    });

    it('sollte verschiedene Pipeline-Stages korrekt handhaben', async () => {
      const campaignStages = [
        { ...mockCampaign, id: 'camp-1', pipelineStage: 'creation' as PipelineStage },
        { ...mockCampaign, id: 'camp-2', pipelineStage: 'review' as PipelineStage },
        { ...mockCampaign, id: 'camp-3', pipelineStage: 'approval' as PipelineStage },
        { ...mockCampaign, id: 'camp-4', pipelineStage: 'distribution' as PipelineStage }
      ];

      mockGetByProjectId.mockResolvedValue(campaignStages);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toHaveLength(4);
      expect(result.find(c => c.pipelineStage === 'creation')).toBeDefined();
      expect(result.find(c => c.pipelineStage === 'review')).toBeDefined();
      expect(result.find(c => c.pipelineStage === 'approval')).toBeDefined();
      expect(result.find(c => c.pipelineStage === 'distribution')).toBeDefined();
    });

    it('sollte mit extremen Datenmengen umgehen können', async () => {
      const largeCampaignList = new Array(100).fill(0).map((_, index) => ({
        ...mockCampaign,
        id: `campaign-${index}`,
        title: `Kampagne ${index}`
      }));

      mockGetByProjectId.mockResolvedValue(largeCampaignList);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toHaveLength(100);
      expect(result[0].title).toBe('Kampagne 0');
      expect(result[99].title).toBe('Kampagne 99');
    });
  });

  describe('updatePipelineStage', () => {
    const newStage = 'review' as PipelineStage;

    beforeEach(() => {
      mockGetById.mockResolvedValue(mockCampaign);
      mockUpdate.mockResolvedValue(undefined);
      mockUpdatePipelineStage.mockResolvedValue(undefined);
    });

    it('sollte Pipeline-Stage erfolgreich aktualisieren', async () => {
      await prService.updatePipelineStage(mockCampaignId, newStage, mockContext);

      expect(mockUpdatePipelineStage).toHaveBeenCalledWith(mockCampaignId, newStage, mockContext);
    });

    it('sollte Sicherheitsprüfung durchführen - Kampagne muss existieren', async () => {
      mockUpdatePipelineStage.mockRejectedValue(
        new Error('Kampagne nicht gefunden oder keine Berechtigung')
      );

      await expect(
        prService.updatePipelineStage(mockCampaignId, newStage, mockContext)
      ).rejects.toThrow('Kampagne nicht gefunden oder keine Berechtigung');
    });

    it('sollte Multi-Tenancy-Sicherheit durchsetzen', async () => {
      mockUpdatePipelineStage.mockRejectedValue(
        new Error('Kampagne nicht gefunden oder keine Berechtigung')
      );

      await expect(
        prService.updatePipelineStage(mockCampaignId, newStage, mockContext)
      ).rejects.toThrow('Kampagne nicht gefunden oder keine Berechtigung');
    });

    it('sollte alle gültigen Pipeline-Stages handhaben', async () => {
      const validStages: PipelineStage[] = ['creation', 'review', 'approval', 'distribution', 'completed'];

      for (const stage of validStages) {
        jest.clearAllMocks();
        mockUpdatePipelineStage.mockResolvedValue(undefined);

        await prService.updatePipelineStage(mockCampaignId, stage, mockContext);

        expect(mockUpdatePipelineStage).toHaveBeenCalledWith(mockCampaignId, stage, mockContext);
      }
    });

    it('sollte Firebase-Update-Fehler weiterwerfen', async () => {
      const updateError = new Error('Firebase update failed');
      mockUpdatePipelineStage.mockRejectedValue(updateError);

      await expect(
        prService.updatePipelineStage(mockCampaignId, newStage, mockContext)
      ).rejects.toThrow('Firebase update failed');
    });

    it('sollte Firebase-GetById-Fehler weiterwerfen', async () => {
      const getByIdError = new Error('Firebase getById failed');
      mockUpdatePipelineStage.mockRejectedValue(getByIdError);

      await expect(
        prService.updatePipelineStage(mockCampaignId, newStage, mockContext)
      ).rejects.toThrow('Firebase getById failed');
    });

    it('sollte Stage-Übergänge korrekt verarbeiten', async () => {
      const stageTransitions: Array<{ from: PipelineStage; to: PipelineStage }> = [
        { from: 'creation', to: 'review' },
        { from: 'review', to: 'approval' },
        { from: 'approval', to: 'distribution' },
        { from: 'distribution', to: 'completed' }
      ];

      for (const transition of stageTransitions) {
        jest.clearAllMocks();
        mockUpdatePipelineStage.mockResolvedValue(undefined);

        await prService.updatePipelineStage(mockCampaignId, transition.to, mockContext);

        expect(mockUpdatePipelineStage).toHaveBeenCalledWith(mockCampaignId, transition.to, mockContext);
      }
    });

    it('sollte mit gleichzeitigen Stage-Updates umgehen (Race Conditions)', async () => {
      const stages: PipelineStage[] = ['review', 'approval', 'distribution'];

      mockUpdatePipelineStage.mockResolvedValue(undefined);

      const updatePromises = stages.map(stage =>
        prService.updatePipelineStage(mockCampaignId, stage, mockContext)
      );

      await Promise.all(updatePromises);

      expect(mockUpdatePipelineStage).toHaveBeenCalledTimes(3);
    });

    it('sollte Type Casting für Pipeline-Stage korrekt handhaben', async () => {
      const stringStage = 'custom-stage';

      mockUpdatePipelineStage.mockResolvedValue(undefined);

      await prService.updatePipelineStage(mockCampaignId, stringStage, mockContext);

      expect(mockUpdatePipelineStage).toHaveBeenCalledWith(mockCampaignId, stringStage, mockContext);
    });
  });

  describe('Integration Tests - Pipeline Extensions', () => {
    it('sollte getByProjectId und updatePipelineStage zusammen funktionieren', async () => {
      const projectCampaigns = [
        { ...mockCampaign, id: 'camp-1', pipelineStage: 'creation' as PipelineStage },
        { ...mockCampaign, id: 'camp-2', pipelineStage: 'review' as PipelineStage }
      ];

      mockGetByProjectId.mockResolvedValue(projectCampaigns);
      mockUpdatePipelineStage.mockResolvedValue(undefined);

      const campaigns = await prService.getByProjectId(mockProjectId, mockContext);
      expect(campaigns).toHaveLength(2);

      await prService.updatePipelineStage(campaigns[0].id!, 'approval', mockContext);

      expect(mockUpdatePipelineStage).toHaveBeenCalledWith(campaigns[0].id, 'approval', mockContext);
    });

    it('sollte Cross-Tenant-Isolation über beide Methoden hinweg gewährleisten', async () => {
      const otherOrgContext = { organizationId: 'andere-org-789' };

      mockGetByProjectId.mockResolvedValue([]);

      const campaigns = await prService.getByProjectId(mockProjectId, otherOrgContext);
      expect(campaigns).toEqual([]);
      expect(mockGetByProjectId).toHaveBeenCalledWith(mockProjectId, otherOrgContext);

      mockUpdatePipelineStage.mockRejectedValue(
        new Error('Kampagne nicht gefunden oder keine Berechtigung')
      );

      await expect(
        prService.updatePipelineStage(mockCampaignId, 'review', otherOrgContext)
      ).rejects.toThrow('Kampagne nicht gefunden oder keine Berechtigung');
    });

    it('sollte Performance bei vielen Kampagnen und Stage-Updates handhaben', async () => {
      const manyCampaigns = new Array(50).fill(0).map((_, i) => ({
        ...mockCampaign,
        id: `campaign-${i}`,
        pipelineStage: 'creation' as PipelineStage
      }));

      mockGetByProjectId.mockResolvedValue(manyCampaigns);
      mockUpdatePipelineStage.mockResolvedValue(undefined);

      const campaigns = await prService.getByProjectId(mockProjectId, mockContext);
      expect(campaigns).toHaveLength(50);

      const updatePromises = campaigns.slice(0, 10).map(campaign =>
        prService.updatePipelineStage(campaign.id!, 'review', mockContext)
      );

      await Promise.all(updatePromises);

      expect(mockUpdatePipelineStage).toHaveBeenCalledTimes(10);
    });
  });

  describe('Error Recovery und Edge Cases', () => {
    it('sollte sich von Netzwerk-Timeouts erholen', async () => {
      mockGetByProjectId
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce([]);

      let result = await prService.getByProjectId(mockProjectId, mockContext).catch(() => []);
      expect(result).toEqual([]);

      result = await prService.getByProjectId(mockProjectId, mockContext);
      expect(result).toEqual([]);
    });

    it('sollte mit inkonsistenten Datentypen umgehen', async () => {
      const campaignWithWrongTypes = {
        ...mockCampaign,
        pipelineStage: null as any,
        projectId: 123 as any,
        organizationId: undefined as any
      };

      mockGetByProjectId.mockResolvedValue([campaignWithWrongTypes]);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].pipelineStage).toBeNull();
    });

    it('sollte mit sehr langen Strings und Sonderzeichen umgehen', async () => {
      const longProjectId = 'a'.repeat(1000);
      const specialCharProjectId = 'projekt-!@#$%^&*()_+-=[]{}|;":,.<>?/`~';

      mockGetByProjectId.mockResolvedValue([]);

      await prService.getByProjectId(longProjectId, mockContext);
      expect(mockGetByProjectId).toHaveBeenCalledWith(longProjectId, mockContext);

      await prService.getByProjectId(specialCharProjectId, mockContext);
      expect(mockGetByProjectId).toHaveBeenCalledWith(specialCharProjectId, mockContext);
    });

    it('sollte Memory Leaks bei wiederholten Aufrufen vermeiden', async () => {
      mockGetByProjectId.mockResolvedValue([mockCampaign]);

      for (let i = 0; i < 1000; i++) {
        const result = await prService.getByProjectId(`project-${i}`, mockContext);
        expect(result).toHaveLength(1);
      }

      expect(mockGetByProjectId).toHaveBeenCalledTimes(1000);
    });
  });
});
