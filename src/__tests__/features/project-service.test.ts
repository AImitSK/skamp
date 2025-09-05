// src/__tests__/features/project-service.test.ts - Umfassende Tests für Project Service
import { jest } from '@jest/globals';

// Firebase Mocks - Direkte Mock-Implementierung
const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockServerTimestamp = jest.fn();
const mockTimestamp = {
  now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
};

// Vollständiger Firebase Mock ohne zirkuläre Dependencies
jest.doMock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  addDoc: mockAddDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  serverTimestamp: mockServerTimestamp,
  Timestamp: mockTimestamp,
  limit: mockLimit
}));

jest.doMock('@/lib/firebase/client-init', () => ({
  db: { mockDb: true }
}));

// PR Service Mock für getLinkedCampaigns Test
const mockPrService = {
  getById: jest.fn()
};

jest.mock('@/lib/firebase/pr-service', () => ({
  prService: mockPrService
}));

// Types
import { Project, ProjectStatus, PipelineStage } from '@/types/project';
import { projectService } from '@/lib/firebase/project-service';

describe('ProjectService', () => {
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockProjectId = 'project-789';
  
  const mockContext = {
    organizationId: mockOrganizationId,
    userId: mockUserId
  };

  const mockProjectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
    title: 'Test Projekt',
    description: 'Ein Test-Projekt für die Pipeline',
    organizationId: mockOrganizationId,
    userId: mockUserId,
    status: 'active' as ProjectStatus,
    currentStage: 'creation' as PipelineStage,
    customer: {
      name: 'Test Kunde GmbH',
      contactPerson: 'Max Mustermann',
      email: 'max@testkunde.de'
    },
    budget: {
      allocated: 10000,
      spent: 2500,
      currency: 'EUR'
    },
    timeline: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      milestones: []
    },
    linkedCampaigns: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Standard Mock-Setups
    mockCollection.mockReturnValue({ collection: 'projects' });
    mockDoc.mockReturnValue({ id: mockProjectId });
    mockQuery.mockImplementation((...args) => ({ query: args }));
    mockWhere.mockImplementation((field, op, value) => ({ where: [field, op, value] }));
    mockOrderBy.mockImplementation((field, direction) => ({ orderBy: [field, direction] }));
    mockLimit.mockImplementation((n) => ({ limit: n }));
    mockServerTimestamp.mockReturnValue({ serverTimestamp: true });
  });

  describe('create', () => {
    it('sollte ein neues Projekt erfolgreich erstellen', async () => {
      const mockDocRef = { id: mockProjectId };
      mockAddDoc.mockResolvedValue(mockDocRef);

      const result = await projectService.create(mockProjectData);

      expect(result).toBe(mockProjectId);
      expect(mockAddDoc).toHaveBeenCalledWith(
        { collection: 'projects' },
        {
          ...mockProjectData,
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
          updatedAt: { seconds: 1234567890, nanoseconds: 0 }
        }
      );
    });

    it('sollte Fehler beim Erstellen weiterwerfen', async () => {
      const error = new Error('Firebase Fehler');
      mockAddDoc.mockRejectedValue(error);

      await expect(projectService.create(mockProjectData)).rejects.toThrow('Firebase Fehler');
    });

    it('sollte alle erforderlichen Felder mit Timestamps ergänzen', async () => {
      const mockDocRef = { id: mockProjectId };
      mockAddDoc.mockResolvedValue(mockDocRef);

      await projectService.create(mockProjectData);

      const savedData = mockAddDoc.mock.calls[0][1];
      expect(savedData).toHaveProperty('createdAt');
      expect(savedData).toHaveProperty('updatedAt');
      expect(savedData.title).toBe(mockProjectData.title);
      expect(savedData.organizationId).toBe(mockOrganizationId);
    });
  });

  describe('getById', () => {
    it('sollte ein Projekt erfolgreich laden wenn es existiert und zur Organisation gehört', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProjectData,
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
          updatedAt: { seconds: 1234567890, nanoseconds: 0 }
        })
      };
      mockGetDoc.mockResolvedValue(mockDocSnap);

      const result = await projectService.getById(mockProjectId, mockContext);

      expect(result).toEqual({
        id: mockProjectId,
        ...mockProjectData,
        createdAt: { seconds: 1234567890, nanoseconds: 0 },
        updatedAt: { seconds: 1234567890, nanoseconds: 0 }
      });
      expect(mockDoc).toHaveBeenCalledWith({ mockDb: true }, 'projects', mockProjectId);
    });

    it('sollte null zurückgeben wenn Projekt nicht existiert', async () => {
      const mockDocSnap = { exists: () => false };
      mockGetDoc.mockResolvedValue(mockDocSnap);

      const result = await projectService.getById(mockProjectId, mockContext);

      expect(result).toBeNull();
    });

    it('sollte Multi-Tenancy-Sicherheit durchsetzen', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProjectData,
          organizationId: 'andere-org-123' // Andere Organisation!
        })
      };
      mockGetDoc.mockResolvedValue(mockDocSnap);

      const result = await projectService.getById(mockProjectId, mockContext);

      expect(result).toBeNull(); // Zugriff verweigert
    });

    it('sollte null zurückgeben bei Firebase-Fehlern', async () => {
      mockGetDoc.mockRejectedValue(new Error('Network error'));

      const result = await projectService.getById(mockProjectId, mockContext);

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    const mockProjects = [
      { id: 'proj-1', ...mockProjectData, title: 'Projekt 1' },
      { id: 'proj-2', ...mockProjectData, title: 'Projekt 2' }
    ];

    it('sollte alle Projekte einer Organisation laden', async () => {
      const mockSnapshot = {
        docs: mockProjects.map(proj => ({
          id: proj.id,
          data: () => ({ ...proj, id: undefined })
        }))
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await projectService.getAll(mockContext);

      expect(result).toEqual(mockProjects);
      expect(mockQuery).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
      expect(mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('sollte Projekte nach Status filtern können', async () => {
      const mockSnapshot = { docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      await projectService.getAll({
        organizationId: mockOrganizationId,
        filters: { status: 'active' }
      });

      // Überprüfe ob Status-Filter angewendet wurde
      const whereCall = mockWhere.mock.calls.find(call => call[0] === 'status');
      expect(whereCall).toEqual(['status', '==', 'active']);
    });

    it('sollte Projekte nach currentStage filtern können', async () => {
      const mockSnapshot = { docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      await projectService.getAll({
        organizationId: mockOrganizationId,
        filters: { currentStage: 'creation' }
      });

      const whereCall = mockWhere.mock.calls.find(call => call[0] === 'currentStage');
      expect(whereCall).toEqual(['currentStage', '==', 'creation']);
    });

    it('sollte leeres Array bei Fehlern zurückgeben', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network error'));

      const result = await projectService.getAll(mockContext);

      expect(result).toEqual([]);
    });

    it('sollte mehrere Filter gleichzeitig anwenden können', async () => {
      const mockSnapshot = { docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      await projectService.getAll({
        organizationId: mockOrganizationId,
        filters: { 
          status: 'active',
          currentStage: 'review'
        }
      });

      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active');
      expect(mockWhere).toHaveBeenCalledWith('currentStage', '==', 'review');
    });
  });

  describe('update', () => {
    it('sollte ein Projekt erfolgreich aktualisieren', async () => {
      // Mock getById für Sicherheitsprüfung
      const mockExistingProject = { id: mockProjectId, ...mockProjectData };
      jest.spyOn(projectService, 'getById').mockResolvedValue(mockExistingProject);

      const updateData = { title: 'Neuer Titel', status: 'completed' as ProjectStatus };

      await projectService.update(mockProjectId, updateData, mockContext);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { id: mockProjectId },
        {
          ...updateData,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 }
        }
      );
    });

    it('sollte Fehler werfen wenn Projekt nicht existiert', async () => {
      jest.spyOn(projectService, 'getById').mockResolvedValue(null);

      const updateData = { title: 'Neuer Titel' };

      await expect(
        projectService.update(mockProjectId, updateData, mockContext)
      ).rejects.toThrow('Projekt nicht gefunden oder keine Berechtigung');

      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('sollte Firebase-Fehler weiterwerfen', async () => {
      const mockExistingProject = { id: mockProjectId, ...mockProjectData };
      jest.spyOn(projectService, 'getById').mockResolvedValue(mockExistingProject);
      
      mockUpdateDoc.mockRejectedValue(new Error('Firebase Update Fehler'));

      const updateData = { title: 'Neuer Titel' };

      await expect(
        projectService.update(mockProjectId, updateData, mockContext)
      ).rejects.toThrow('Firebase Update Fehler');
    });

    it('sollte organizationId und userId nicht überschreibbar machen', async () => {
      const mockExistingProject = { id: mockProjectId, ...mockProjectData };
      jest.spyOn(projectService, 'getById').mockResolvedValue(mockExistingProject);

      // Versuche organizationId und userId zu ändern (sollte ignoriert werden)
      const updateData = { 
        title: 'Neuer Titel',
        organizationId: 'hacker-org', // Sollte ignoriert werden
        userId: 'hacker-user' // Sollte ignoriert werden
      } as any;

      await projectService.update(mockProjectId, updateData, mockContext);

      const savedData = mockUpdateDoc.mock.calls[0][1];
      expect(savedData).not.toHaveProperty('organizationId');
      expect(savedData).not.toHaveProperty('userId');
      expect(savedData.title).toBe('Neuer Titel');
    });
  });

  describe('addLinkedCampaign', () => {
    const mockCampaignId = 'campaign-123';

    it('sollte Kampagne erfolgreich zu Projekt hinzufügen', async () => {
      const mockExistingProject = { 
        id: mockProjectId, 
        ...mockProjectData,
        linkedCampaigns: ['existing-campaign'] 
      };
      
      jest.spyOn(projectService, 'getById').mockResolvedValue(mockExistingProject);
      jest.spyOn(projectService, 'update').mockResolvedValue();

      await projectService.addLinkedCampaign(mockProjectId, mockCampaignId, mockContext);

      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        {
          linkedCampaigns: ['existing-campaign', mockCampaignId]
        },
        mockContext
      );
    });

    it('sollte leeres linkedCampaigns Array handhaben', async () => {
      const mockExistingProject = { 
        id: mockProjectId, 
        ...mockProjectData,
        linkedCampaigns: undefined // Kein Array vorhanden
      };
      
      jest.spyOn(projectService, 'getById').mockResolvedValue(mockExistingProject);
      jest.spyOn(projectService, 'update').mockResolvedValue();

      await projectService.addLinkedCampaign(mockProjectId, mockCampaignId, mockContext);

      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        {
          linkedCampaigns: [mockCampaignId]
        },
        mockContext
      );
    });

    it('sollte Fehler werfen wenn Projekt nicht gefunden', async () => {
      jest.spyOn(projectService, 'getById').mockResolvedValue(null);

      await expect(
        projectService.addLinkedCampaign(mockProjectId, mockCampaignId, mockContext)
      ).rejects.toThrow('Projekt nicht gefunden');
    });

    it('sollte Update-Fehler weiterwerfen', async () => {
      const mockExistingProject = { id: mockProjectId, ...mockProjectData, linkedCampaigns: [] };
      
      jest.spyOn(projectService, 'getById').mockResolvedValue(mockExistingProject);
      jest.spyOn(projectService, 'update').mockRejectedValue(new Error('Update Fehler'));

      await expect(
        projectService.addLinkedCampaign(mockProjectId, mockCampaignId, mockContext)
      ).rejects.toThrow('Update Fehler');
    });
  });

  describe('getLinkedCampaigns', () => {
    it('sollte verknüpfte Kampagnen erfolgreich laden', async () => {
      const mockProject = {
        id: mockProjectId,
        ...mockProjectData,
        linkedCampaigns: ['campaign-1', 'campaign-2']
      };
      
      const mockCampaigns = [
        { id: 'campaign-1', organizationId: mockOrganizationId, title: 'Kampagne 1' },
        { id: 'campaign-2', organizationId: mockOrganizationId, title: 'Kampagne 2' }
      ];

      jest.spyOn(projectService, 'getById').mockResolvedValue(mockProject);
      mockPrService.getById
        .mockResolvedValueOnce(mockCampaigns[0])
        .mockResolvedValueOnce(mockCampaigns[1]);

      const result = await projectService.getLinkedCampaigns(mockProjectId, { organizationId: mockOrganizationId });

      expect(result).toEqual(mockCampaigns);
      expect(mockPrService.getById).toHaveBeenCalledTimes(2);
      expect(mockPrService.getById).toHaveBeenCalledWith('campaign-1');
      expect(mockPrService.getById).toHaveBeenCalledWith('campaign-2');
    });

    it('sollte leeres Array zurückgeben wenn Projekt keine verknüpften Kampagnen hat', async () => {
      const mockProject = {
        id: mockProjectId,
        ...mockProjectData,
        linkedCampaigns: []
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(mockProject);

      const result = await projectService.getLinkedCampaigns(mockProjectId, { organizationId: mockOrganizationId });

      expect(result).toEqual([]);
      expect(mockPrService.getById).not.toHaveBeenCalled();
    });

    it('sollte leeres Array zurückgeben wenn linkedCampaigns undefined ist', async () => {
      const mockProject = {
        id: mockProjectId,
        ...mockProjectData,
        linkedCampaigns: undefined
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(mockProject);

      const result = await projectService.getLinkedCampaigns(mockProjectId, { organizationId: mockOrganizationId });

      expect(result).toEqual([]);
    });

    it('sollte Multi-Tenancy für Kampagnen durchsetzen', async () => {
      const mockProject = {
        id: mockProjectId,
        ...mockProjectData,
        linkedCampaigns: ['campaign-1', 'campaign-2']
      };
      
      // Kampagne 2 gehört zu anderer Organisation
      const mockCampaigns = [
        { id: 'campaign-1', organizationId: mockOrganizationId, title: 'Kampagne 1' },
        { id: 'campaign-2', organizationId: 'andere-org', title: 'Kampagne 2' }
      ];

      jest.spyOn(projectService, 'getById').mockResolvedValue(mockProject);
      mockPrService.getById
        .mockResolvedValueOnce(mockCampaigns[0])
        .mockResolvedValueOnce(mockCampaigns[1]);

      const result = await projectService.getLinkedCampaigns(mockProjectId, { organizationId: mockOrganizationId });

      // Sollte nur Kampagne 1 zurückgeben (richtige Organisation)
      expect(result).toEqual([mockCampaigns[0]]);
    });

    it('sollte null/undefined Kampagnen herausfiltern', async () => {
      const mockProject = {
        id: mockProjectId,
        ...mockProjectData,
        linkedCampaigns: ['campaign-1', 'campaign-2', 'campaign-3']
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(mockProject);
      mockPrService.getById
        .mockResolvedValueOnce({ id: 'campaign-1', organizationId: mockOrganizationId, title: 'Kampagne 1' })
        .mockResolvedValueOnce(null) // Nicht gefunden
        .mockResolvedValueOnce({ id: 'campaign-3', organizationId: mockOrganizationId, title: 'Kampagne 3' });

      const result = await projectService.getLinkedCampaigns(mockProjectId, { organizationId: mockOrganizationId });

      expect(result).toHaveLength(2);
      expect(result.find(c => c.id === 'campaign-1')).toBeDefined();
      expect(result.find(c => c.id === 'campaign-3')).toBeDefined();
    });

    it('sollte leeres Array bei Fehlern zurückgeben', async () => {
      jest.spyOn(projectService, 'getById').mockRejectedValue(new Error('Network error'));

      const result = await projectService.getLinkedCampaigns(mockProjectId, { organizationId: mockOrganizationId });

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('sollte Projekt erfolgreich löschen', async () => {
      const mockExistingProject = { id: mockProjectId, ...mockProjectData };
      jest.spyOn(projectService, 'getById').mockResolvedValue(mockExistingProject);

      await projectService.delete(mockProjectId, { organizationId: mockOrganizationId });

      expect(mockDeleteDoc).toHaveBeenCalledWith({ id: mockProjectId });
    });

    it('sollte Fehler werfen wenn Projekt nicht existiert oder keine Berechtigung', async () => {
      jest.spyOn(projectService, 'getById').mockResolvedValue(null);

      await expect(
        projectService.delete(mockProjectId, { organizationId: mockOrganizationId })
      ).rejects.toThrow('Projekt nicht gefunden oder keine Berechtigung');

      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('sollte Firebase-Lösch-Fehler weiterwerfen', async () => {
      const mockExistingProject = { id: mockProjectId, ...mockProjectData };
      jest.spyOn(projectService, 'getById').mockResolvedValue(mockExistingProject);
      
      mockDeleteDoc.mockRejectedValue(new Error('Firebase Delete Fehler'));

      await expect(
        projectService.delete(mockProjectId, { organizationId: mockOrganizationId })
      ).rejects.toThrow('Firebase Delete Fehler');
    });
  });

  // Edge Cases und Performance Tests
  describe('Edge Cases', () => {
    it('sollte mit extremen Datenmengen umgehen können', async () => {
      const mockProject = {
        id: mockProjectId,
        ...mockProjectData,
        linkedCampaigns: new Array(100).fill(0).map((_, i) => `campaign-${i}`)
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(mockProject);
      
      // Mock alle Kampagnen-Aufrufe
      mockPrService.getById.mockImplementation((id: string) =>
        Promise.resolve({ id, organizationId: mockOrganizationId, title: `Campaign ${id}` })
      );

      const result = await projectService.getLinkedCampaigns(mockProjectId, { organizationId: mockOrganizationId });

      expect(result).toHaveLength(100);
      expect(mockPrService.getById).toHaveBeenCalledTimes(100);
    });

    it('sollte mit leeren Strings und null Werten umgehen', async () => {
      const projectDataWithNulls = {
        ...mockProjectData,
        title: '',
        description: null as any,
        customer: null as any
      };

      const mockDocRef = { id: mockProjectId };
      mockAddDoc.mockResolvedValue(mockDocRef);

      const result = await projectService.create(projectDataWithNulls);

      expect(result).toBe(mockProjectId);
    });

    it('sollte Race Conditions bei gleichzeitigen Updates handhaben', async () => {
      const mockExistingProject = { id: mockProjectId, ...mockProjectData };
      jest.spyOn(projectService, 'getById').mockResolvedValue(mockExistingProject);

      const updates = [
        { title: 'Update 1' },
        { title: 'Update 2' },
        { title: 'Update 3' }
      ];

      // Simuliere gleichzeitige Updates
      const promises = updates.map(update =>
        projectService.update(mockProjectId, update, mockContext)
      );

      await Promise.all(promises);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
    });
  });

  // Multi-Tenancy Isolation Tests
  describe('Multi-Tenancy Isolation', () => {
    it('sollte Cross-Tenant-Zugriff bei getById verhindern', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProjectData,
          organizationId: 'andere-organisation-123'
        })
      };
      mockGetDoc.mkResolvedValue(mockDocSnap);

      const result = await projectService.getById(mockProjectId, {
        organizationId: 'meine-organisation-123'
      });

      expect(result).toBeNull();
    });

    it('sollte nur Projekte der eigenen Organisation in getAll zurückgeben', async () => {
      await projectService.getAll({ organizationId: mockOrganizationId });

      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
    });

    it('sollte organizationId-Filter in allen Query-Methoden durchsetzen', async () => {
      const filters = { status: 'active' as ProjectStatus };
      await projectService.getAll({ organizationId: mockOrganizationId, filters });

      // OrganizationId sollte IMMER der erste Where-Filter sein
      const organizationFilter = mockWhere.mock.calls.find(call => 
        call[0] === 'organizationId' && call[1] === '==' && call[2] === mockOrganizationId
      );
      expect(organizationFilter).toBeDefined();
    });
  });
});