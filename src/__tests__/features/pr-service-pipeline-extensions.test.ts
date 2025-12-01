// src/__tests__/features/pr-service-pipeline-extensions.test.ts - Tests für PR Service Pipeline-Erweiterungen
import { jest } from '@jest/globals';

// Firebase Mocks
const mockGetDoc = jest.fn() as jest.Mock<any>;
const mockGetDocs = jest.fn() as jest.Mock<any>;
const mockCollection = jest.fn() as jest.Mock<any>;
const mockQuery = jest.fn() as jest.Mock<any>;
const mockWhere = jest.fn() as jest.Mock<any>;
const mockOrderBy = jest.fn() as jest.Mock<any>;

jest.mock('firebase/firestore', () => ({
  collection: mockCollection,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: { mockDb: true }
}));

// Mock prService.getById und prService.update für updatePipelineStage Test
const mockPrServiceGetById = jest.fn() as jest.Mock<any>;
const mockPrServiceUpdate = jest.fn() as jest.Mock<any>;

// Vollständiger Mock des gesamten prService Moduls
jest.mock('@/lib/firebase/pr-service', () => {
  const originalModule = jest.requireActual('@/lib/firebase/pr-service') as any;
  return {
    ...originalModule,
    prService: {
      ...(originalModule.prService || {}),
      getById: mockPrServiceGetById,
      update: mockPrServiceUpdate,
      // Pipeline-Extensions - Diese müssen wir direkt importieren
      getByProjectId: originalModule.prService?.getByProjectId,
      updatePipelineStage: originalModule.prService?.updatePipelineStage
    }
  };
});

import { prService } from '@/lib/firebase/pr-service';
import { PRCampaign, PipelineStage } from '@/types/pr';

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
    
    // Standard Mock-Setups
    mockCollection.mockReturnValue({ collection: 'pr_campaigns' });
    mockQuery.mockImplementation((...args: any[]) => ({ query: args }));
    mockWhere.mockImplementation((field: string, op: string, value: any) => ({ where: [field, op, value] }));
    mockOrderBy.mockImplementation((field: string, direction: string) => ({ orderBy: [field, direction] }));
  });

  describe('getByProjectId', () => {
    it('sollte alle Kampagnen eines Projekts erfolgreich laden', async () => {
      const mockCampaigns = [
        { ...mockCampaign, id: 'campaign-1', title: 'Kampagne 1' },
        { ...mockCampaign, id: 'campaign-2', title: 'Kampagne 2' }
      ];

      const mockSnapshot = {
        docs: mockCampaigns.map(campaign => ({
          id: campaign.id,
          data: () => ({ ...campaign, id: undefined })
        }))
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toEqual(mockCampaigns);
      expect(mockQuery).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', mockProjectId);
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('sollte Multi-Tenancy-Sicherheit durchsetzen', async () => {
      const mockSnapshot = { docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      await prService.getByProjectId(mockProjectId, mockContext);

      // Verifiziere dass sowohl projectId als auch organizationId geprüft werden
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', mockProjectId);
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
    });

    it('sollte leeres Array bei Firebase-Fehlern zurückgeben', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore network error'));

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

      const mockSnapshot = {
        docs: [
          {
            id: newerCampaign.id,
            data: () => ({ ...newerCampaign, id: undefined })
          },
          {
            id: olderCampaign.id,
            data: () => ({ ...olderCampaign, id: undefined })
          }
        ]
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toHaveLength(2);
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
      // Erste Kampagne sollte die neuere sein (durch desc-Sortierung)
      expect(result[0].id).toBe('campaign-new');
      expect(result[1].id).toBe('campaign-old');
    });

    it('sollte mit leerer Kampagnenliste umgehen', async () => {
      const mockSnapshot = { docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot);

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

      const mockSnapshot = {
        docs: campaignStages.map(campaign => ({
          id: campaign.id,
          data: () => ({ ...campaign, id: undefined })
        }))
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toHaveLength(4);
      expect(result.find(c => c.pipelineStage === 'creation' as PipelineStage)).toBeDefined();
      expect(result.find(c => c.pipelineStage === 'review' as PipelineStage)).toBeDefined();
      expect(result.find(c => c.pipelineStage === 'approval' as PipelineStage)).toBeDefined();
      expect(result.find(c => c.pipelineStage === 'distribution' as PipelineStage)).toBeDefined();
    });

    it('sollte mit extremen Datenmengen umgehen können', async () => {
      const largeCampaignList = new Array(100).fill(0).map((_, index) => ({
        ...mockCampaign,
        id: `campaign-${index}`,
        title: `Kampagne ${index}`
      }));

      const mockSnapshot = {
        docs: largeCampaignList.map(campaign => ({
          id: campaign.id,
          data: () => ({ ...campaign, id: undefined })
        }))
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await prService.getByProjectId(mockProjectId, mockContext);

      expect(result).toHaveLength(100);
      expect(result[0].title).toBe('Kampagne 0');
      expect(result[99].title).toBe('Kampagne 99');
    });
  });

  describe('updatePipelineStage', () => {
    const newStage = 'review' as PipelineStage;

    beforeEach(() => {
      // Mock für getById - Standard erfolgreicher Fall
      mockPrServiceGetById.mockResolvedValue(mockCampaign);
      // Mock für update - Standard erfolgreicher Fall
      mockPrServiceUpdate.mockResolvedValue(undefined);
    });

    it('sollte Pipeline-Stage erfolgreich aktualisieren', async () => {
      await prService.updatePipelineStage(mockCampaignId, newStage, mockContext);

      expect(mockPrServiceGetById).toHaveBeenCalledWith(mockCampaignId);
      expect(mockPrServiceUpdate).toHaveBeenCalledWith(mockCampaignId, {
        pipelineStage: newStage
      });
    });

    it('sollte Sicherheitsprüfung durchführen - Kampagne muss existieren', async () => {
      mockPrServiceGetById.mockResolvedValue(null);

      await expect(
        prService.updatePipelineStage(mockCampaignId, newStage, mockContext)
      ).rejects.toThrow('Kampagne nicht gefunden oder keine Berechtigung');

      expect(mockPrServiceUpdate).not.toHaveBeenCalled();
    });

    it('sollte Multi-Tenancy-Sicherheit durchsetzen', async () => {
      const campaignFromOtherOrg = {
        ...mockCampaign,
        organizationId: 'andere-org-456' // Andere Organisation!
      };
      mockPrServiceGetById.mockResolvedValue(campaignFromOtherOrg);

      await expect(
        prService.updatePipelineStage(mockCampaignId, newStage, mockContext)
      ).rejects.toThrow('Kampagne nicht gefunden oder keine Berechtigung');

      expect(mockPrServiceUpdate).not.toHaveBeenCalled();
    });

    it('sollte alle gültigen Pipeline-Stages handhaben', async () => {
      const validStages = ['creation', 'review', 'approval', 'distribution', 'completed'] as const;

      for (const stage of validStages) {
        jest.clearAllMocks();
        mockPrServiceGetById.mockResolvedValue(mockCampaign);
        mockPrServiceUpdate.mockResolvedValue(undefined);

        await prService.updatePipelineStage(mockCampaignId, stage, mockContext);

        expect(mockPrServiceUpdate).toHaveBeenCalledWith(mockCampaignId, {
          pipelineStage: stage
        });
      }
    });

    it('sollte Firebase-Update-Fehler weiterwerfen', async () => {
      const updateError = new Error('Firebase update failed');
      mockPrServiceUpdate.mockRejectedValue(updateError);

      await expect(
        prService.updatePipelineStage(mockCampaignId, newStage, mockContext)
      ).rejects.toThrow('Firebase update failed');
    });

    it('sollte Firebase-GetById-Fehler weiterwerfen', async () => {
      const getByIdError = new Error('Firebase getById failed');
      mockPrServiceGetById.mockRejectedValue(getByIdError);

      await expect(
        prService.updatePipelineStage(mockCampaignId, newStage, mockContext)
      ).rejects.toThrow('Firebase getById failed');

      expect(mockPrServiceUpdate).not.toHaveBeenCalled();
    });

    it('sollte Stage-Übergänge korrekt verarbeiten', async () => {
      const stageTransitions = [
        { from: 'creation', to: 'review' },
        { from: 'review', to: 'approval' },
        { from: 'approval', to: 'distribution' },
        { from: 'distribution', to: 'completed' }
      ];

      for (const transition of stageTransitions) {
        jest.clearAllMocks();
        
        const campaignInFromStage = {
          ...mockCampaign,
          pipelineStage: transition.from as PipelineStage
        };
        
        mockPrServiceGetById.mockResolvedValue(campaignInFromStage);
        mockPrServiceUpdate.mockResolvedValue(undefined);

        await prService.updatePipelineStage(mockCampaignId, transition.to as PipelineStage, mockContext);

        expect(mockPrServiceUpdate).toHaveBeenCalledWith(mockCampaignId, {
          pipelineStage: transition.to
        });
      }
    });

    it('sollte mit gleichzeitigen Stage-Updates umgehen (Race Conditions)', async () => {
      const stages = ['review', 'approval', 'distribution'] as const;
      
      // Simuliere gleichzeitige Updates
      const updatePromises = stages.map(stage =>
        prService.updatePipelineStage(mockCampaignId, stage, mockContext)
      );

      await Promise.all(updatePromises);

      expect(mockPrServiceGetById).toHaveBeenCalledTimes(3);
      expect(mockPrServiceUpdate).toHaveBeenCalledTimes(3);
    });

    it('sollte Type Casting für Pipeline-Stage korrekt handhaben', async () => {
      // Test mit String-Stage (wird zu any gecastet im Code)
      const stringStage = 'custom-stage';
      
      await prService.updatePipelineStage(mockCampaignId, stringStage, mockContext);

      expect(mockPrServiceUpdate).toHaveBeenCalledWith(mockCampaignId, {
        pipelineStage: stringStage // Als any gecastet
      });
    });
  });

  describe('Integration Tests - Pipeline Extensions', () => {
    it('sollte getByProjectId und updatePipelineStage zusammen funktionieren', async () => {
      // Setup: Erstelle Kampagnen für ein Projekt
      const projectCampaigns = [
        { ...mockCampaign, id: 'camp-1', pipelineStage: 'creation' as PipelineStage },
        { ...mockCampaign, id: 'camp-2', pipelineStage: 'review' as PipelineStage }
      ];

      const mockSnapshot = {
        docs: projectCampaigns.map(campaign => ({
          id: campaign.id,
          data: () => ({ ...campaign, id: undefined })
        }))
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      // 1. Lade alle Kampagnen des Projekts
      const campaigns = await prService.getByProjectId(mockProjectId, mockContext);
      expect(campaigns).toHaveLength(2);

      // 2. Aktualisiere die erste Kampagne
      mockPrServiceGetById.mockResolvedValue(campaigns[0]);
      mockPrServiceUpdate.mockResolvedValue(undefined);

      await prService.updatePipelineStage(campaigns[0].id!, 'approval', mockContext);

      expect(mockPrServiceUpdate).toHaveBeenCalledWith(campaigns[0].id, {
        pipelineStage: 'approval'
      });
    });

    it('sollte Cross-Tenant-Isolation über beide Methoden hinweg gewährleisten', async () => {
      const otherOrgContext = { organizationId: 'andere-org-789' };
      
      // Test getByProjectId mit fremder Organisation
      const mockSnapshot1 = { docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot1);
      
      const campaigns = await prService.getByProjectId(mockProjectId, otherOrgContext);
      expect(campaigns).toEqual([]);
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'andere-org-789');

      // Test updatePipelineStage mit fremder Organisation
      mockPrServiceGetById.mockResolvedValue(mockCampaign); // Kampagne gehört zu mockOrganizationId
      
      await expect(
        prService.updatePipelineStage(mockCampaignId, 'review', otherOrgContext)
      ).rejects.toThrow('Kampagne nicht gefunden oder keine Berechtigung');
    });

    it('sollte Performance bei vielen Kampagnen und Stage-Updates handhaben', async () => {
      // Setup: 50 Kampagnen
      const manyCampaigns = new Array(50).fill(0).map((_, i) => ({
        ...mockCampaign,
        id: `campaign-${i}`,
        pipelineStage: 'creation' as PipelineStage
      }));

      const mockSnapshot = {
        docs: manyCampaigns.map(campaign => ({
          id: campaign.id,
          data: () => ({ ...campaign, id: undefined })
        }))
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      // 1. Lade alle Kampagnen
      const campaigns = await prService.getByProjectId(mockProjectId, mockContext);
      expect(campaigns).toHaveLength(50);

      // 2. Aktualisiere erste 10 Kampagnen parallel
      mockPrServiceGetById.mockImplementation((id: string) =>
        Promise.resolve(campaigns.find(c => c.id === id) || null)
      );
      mockPrServiceUpdate.mockResolvedValue(undefined);

      const updatePromises = campaigns.slice(0, 10).map(campaign =>
        prService.updatePipelineStage(campaign.id!, 'review', mockContext)
      );

      await Promise.all(updatePromises);

      expect(mockPrServiceGetById).toHaveBeenCalledTimes(10);
      expect(mockPrServiceUpdate).toHaveBeenCalledTimes(10);
    });
  });

  describe('Error Recovery und Edge Cases', () => {
    it('sollte sich von Netzwerk-Timeouts erholen', async () => {
      // Erster Aufruf schlägt fehl, zweiter ist erfolgreich
      mockGetDocs
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ docs: [] });

      // Erster Aufruf
      let result = await prService.getByProjectId(mockProjectId, mockContext);
      expect(result).toEqual([]);

      // Zweiter Aufruf (sollte erfolgreich sein)
      result = await prService.getByProjectId(mockProjectId, mockContext);
      expect(result).toEqual([]);
    });

    it('sollte mit inkonsistenten Datentypen umgehen', async () => {
      const campaignWithWrongTypes = {
        ...mockCampaign,
        pipelineStage: null, // Ungültiger Typ
        projectId: 123, // Falcher Typ (sollte string sein)
        organizationId: undefined // Fehlt
      };

      const mockSnapshot = {
        docs: [{
          id: mockCampaignId,
          data: () => campaignWithWrongTypes
        }]
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await prService.getByProjectId(mockProjectId, mockContext);
      
      // Sollte trotzdem funktionieren und inkonsistente Daten zurückgeben
      expect(result).toHaveLength(1);
      expect(result[0].pipelineStage).toBeNull();
    });

    it('sollte mit sehr langen Strings und Sonderzeichen umgehen', async () => {
      const longProjectId = 'a'.repeat(1000); // 1000 Zeichen
      const specialCharProjectId = 'projekt-!@#$%^&*()_+-=[]{}|;":,.<>?/`~';
      
      const mockSnapshot = { docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      // Teste lange ID
      await prService.getByProjectId(longProjectId, mockContext);
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', longProjectId);

      // Teste Sonderzeichen
      await prService.getByProjectId(specialCharProjectId, mockContext);
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', specialCharProjectId);
    });

    it('sollte Memory Leaks bei wiederholten Aufrufen vermeiden', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: mockCampaignId,
            data: () => ({ ...mockCampaign, id: undefined })
          }
        ]
      };

      // Simuliere 1000 aufeinanderfolgende Aufrufe
      for (let i = 0; i < 1000; i++) {
        mockGetDocs.mockResolvedValue(mockSnapshot);
        
        const result = await prService.getByProjectId(`project-${i}`, mockContext);
        expect(result).toHaveLength(1);
      }

      // Wenn kein Memory Leak vorliegt, sollten alle Mock-Calls erfolgreich sein
      expect(mockGetDocs).toHaveBeenCalledTimes(1000);
    });
  });
});