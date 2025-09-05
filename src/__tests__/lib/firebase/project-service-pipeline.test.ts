// src/__tests__/lib/firebase/project-service-pipeline.test.ts - ✅ Plan 2/9: Project-Service Pipeline Tests
import { projectService } from '@/lib/firebase/project-service';
import { prService } from '@/lib/firebase/pr-service';
import { Project } from '@/types/project';
import { PRCampaign } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

// Firebase Firestore Mocks
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _type: 'timestamp' })),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000 })),
    fromDate: jest.fn((date) => ({ toDate: () => date, seconds: date.getTime() / 1000 }))
  }
}));

// Firebase Client Init Mock
jest.mock('@/lib/firebase/client-init', () => ({
  db: { _type: 'firestore' }
}));

// PR-Service Mock (für circular dependency test)
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getById: jest.fn()
  }
}));

// Cast Mocks
const mockFirestore = require('firebase/firestore');
const mockPRService = prService as jest.Mocked<typeof prService>;

describe('ProjectService - Plan 2/9: Pipeline Project-Service Tests', () => {
  const mockOrganizationId = 'org-123';
  const mockClientId = 'client-456';
  const mockUserId = 'user-789';

  const mockProject1: Project = {
    id: 'project-1',
    title: 'Projekt Alpha',
    organizationId: mockOrganizationId,
    userId: 'creator-1',
    status: 'active',
    currentStage: 'creation',
    customer: {
      id: mockClientId,
      name: 'Alpha Client GmbH',
      email: 'contact@alpha-client.de'
    },
    linkedCampaigns: ['campaign-1', 'campaign-2'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockProject2: Project = {
    id: 'project-2',
    title: 'Projekt Beta',
    organizationId: mockOrganizationId,
    userId: 'creator-2',
    status: 'active',
    currentStage: 'review',
    customer: {
      id: mockClientId,
      name: 'Alpha Client GmbH', // Gleicher Kunde
      email: 'contact@alpha-client.de'
    },
    linkedCampaigns: ['campaign-3'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockProject3: Project = {
    id: 'project-3',
    title: 'Projekt Gamma',
    organizationId: mockOrganizationId,
    userId: 'creator-1',
    status: 'active',
    currentStage: 'approval',
    customer: {
      id: 'different-client-789',
      name: 'Beta Client AG',
      email: 'info@beta-client.com'
    },
    linkedCampaigns: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockInactiveProject: Project = {
    id: 'project-inactive',
    title: 'Inaktives Projekt',
    organizationId: mockOrganizationId,
    userId: 'creator-1',
    status: 'completed',
    currentStage: 'approval',
    customer: {
      id: mockClientId,
      name: 'Alpha Client GmbH',
      email: 'contact@alpha-client.de'
    },
    linkedCampaigns: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockCrossOrgProject: Project = {
    id: 'project-cross-org',
    title: 'Cross-Org Projekt',
    organizationId: 'different-org-999', // Andere Organisation
    userId: 'creator-1',
    status: 'active',
    currentStage: 'creation',
    customer: {
      id: mockClientId,
      name: 'Alpha Client GmbH',
      email: 'contact@alpha-client.de'
    },
    linkedCampaigns: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default Mock Query Setup
    const mockQuery = { _type: 'query' };
    mockFirestore.collection.mockReturnValue({ _type: 'collection' });
    mockFirestore.query.mockReturnValue(mockQuery);
    mockFirestore.where.mockReturnValue(mockQuery);
    mockFirestore.orderBy.mockReturnValue(mockQuery);
    mockFirestore.limit.mockReturnValue(mockQuery);
  });

  describe('✅ Plan 2/9: getProjectsByClient()', () => {
    it('sollte Projekte für spezifischen Kunden laden', async () => {
      // Mock Firestore Query Response
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-1', data: () => mockProject1 },
          { id: 'project-2', data: () => mockProject2 }
        ]
      });

      const result = await projectService.getProjectsByClient(mockOrganizationId, mockClientId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockProject1);
      expect(result[1]).toEqual(mockProject2);

      // Query sollte korrekte Filter verwenden
      expect(mockFirestore.query).toHaveBeenCalledWith(
        { _type: 'collection' },
        mockFirestore.where('organizationId', '==', mockOrganizationId),
        mockFirestore.where('customer.id', '==', mockClientId),
        mockFirestore.where('status', '==', 'active'),
        mockFirestore.orderBy('createdAt', 'desc')
      );
    });

    it('sollte leeres Array zurückgeben wenn keine Projekte gefunden', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: []
      });

      const result = await projectService.getProjectsByClient(mockOrganizationId, 'nonexistent-client');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('sollte nur aktive Projekte zurückgeben', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-1', data: () => mockProject1 },
          { id: 'project-inactive', data: () => mockInactiveProject } // Status: completed
        ]
      });

      const result = await projectService.getProjectsByClient(mockOrganizationId, mockClientId);

      // Query sollte status = 'active' Filter haben
      expect(mockFirestore.where).toHaveBeenCalledWith('status', '==', 'active');
    });

    it('sollte Multi-Tenancy durch organizationId sicherstellen', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-1', data: () => mockProject1 },
          { id: 'project-cross-org', data: () => mockCrossOrgProject } // Andere Org
        ]
      });

      const result = await projectService.getProjectsByClient(mockOrganizationId, mockClientId);

      // Query sollte organizationId Filter verwenden
      expect(mockFirestore.where).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
    });

    it('sollte Projekte nach Erstellungsdatum sortieren (neueste zuerst)', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-1', data: () => mockProject1 },
          { id: 'project-2', data: () => mockProject2 }
        ]
      });

      await projectService.getProjectsByClient(mockOrganizationId, mockClientId);

      expect(mockFirestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('sollte Firestore-Fehler graceful behandeln', async () => {
      mockFirestore.getDocs.mockRejectedValue(new Error('Firestore connection failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await projectService.getProjectsByClient(mockOrganizationId, mockClientId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler beim Laden der Projekte nach Kunde:',
        expect.any(Error)
      );
    });

    it('sollte verschiedene Client-IDs korrekt filtern', async () => {
      const differentClientId = 'different-client-999';
      
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-3', data: () => mockProject3 }
        ]
      });

      await projectService.getProjectsByClient(mockOrganizationId, differentClientId);

      expect(mockFirestore.where).toHaveBeenCalledWith('customer.id', '==', differentClientId);
    });

    it('sollte Projekte mit korrekter ID-Struktur zurückgeben', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { 
            id: 'project-doc-id', 
            data: () => ({ ...mockProject1, id: undefined }) // Simulate Firestore doc ohne ID
          }
        ]
      });

      const result = await projectService.getProjectsByClient(mockOrganizationId, mockClientId);

      expect(result[0]).toEqual({
        ...mockProject1,
        id: 'project-doc-id' // ID sollte vom Firestore doc kommen
      });
    });
  });

  describe('✅ Plan 2/9: getActiveProjects()', () => {
    it('sollte alle aktiven Projekte einer Organisation laden', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-1', data: () => mockProject1 },
          { id: 'project-2', data: () => mockProject2 },
          { id: 'project-3', data: () => mockProject3 }
        ]
      });

      const result = await projectService.getActiveProjects(mockOrganizationId);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(mockProject1);
      expect(result).toContainEqual(mockProject2);
      expect(result).toContainEqual(mockProject3);

      // Query sollte korrekte Filter verwenden (ohne customer.id Filter)
      expect(mockFirestore.query).toHaveBeenCalledWith(
        { _type: 'collection' },
        mockFirestore.where('organizationId', '==', mockOrganizationId),
        mockFirestore.where('status', '==', 'active'),
        mockFirestore.orderBy('createdAt', 'desc')
      );
    });

    it('sollte nur aktive Projekte zurückgeben (nicht completed/archived)', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-1', data: () => mockProject1 }, // active
          { id: 'project-inactive', data: () => mockInactiveProject } // completed
        ]
      });

      const result = await projectService.getActiveProjects(mockOrganizationId);

      // Inaktive Projekte sollten herausgefiltert werden durch Query
      expect(mockFirestore.where).toHaveBeenCalledWith('status', '==', 'active');
    });

    it('sollte Multi-Tenancy-Isolation durch organizationId gewährleisten', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-1', data: () => mockProject1 },
          { id: 'project-cross-org', data: () => mockCrossOrgProject } // Andere Org
        ]
      });

      await projectService.getActiveProjects(mockOrganizationId);

      expect(mockFirestore.where).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
    });

    it('sollte verschiedene Pipeline-Stages einschließen', async () => {
      const projectsWithDifferentStages = [
        { ...mockProject1, currentStage: 'creation' as const },
        { ...mockProject2, currentStage: 'review' as const },
        { ...mockProject3, currentStage: 'approval' as const }
      ];

      mockFirestore.getDocs.mockResolvedValue({
        docs: projectsWithDifferentStages.map((project, i) => ({
          id: `project-${i + 1}`,
          data: () => project
        }))
      });

      const result = await projectService.getActiveProjects(mockOrganizationId);

      expect(result).toHaveLength(3);
      expect(result.map(p => p.currentStage)).toEqual(['creation', 'review', 'approval']);
    });

    it('sollte Projekte nach Erstellungsdatum sortieren (neueste zuerst)', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: []
      });

      await projectService.getActiveProjects(mockOrganizationId);

      expect(mockFirestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('sollte leeres Array bei keine Projekte zurückgeben', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: []
      });

      const result = await projectService.getActiveProjects(mockOrganizationId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('sollte Firestore-Fehler mit leerem Array und Logging behandeln', async () => {
      mockFirestore.getDocs.mockRejectedValue(new Error('Network timeout'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await projectService.getActiveProjects(mockOrganizationId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler beim Laden der aktiven Projekte:',
        expect.any(Error)
      );
    });

    it('sollte große Anzahl von Projekten effizient handhaben', async () => {
      const manyProjects = Array.from({ length: 100 }, (_, i) => ({
        id: `project-${i}`,
        data: () => ({ ...mockProject1, id: `project-${i}`, title: `Projekt ${i}` })
      }));

      mockFirestore.getDocs.mockResolvedValue({
        docs: manyProjects
      });

      const startTime = Date.now();
      const result = await projectService.getActiveProjects(mockOrganizationId);
      const endTime = Date.now();

      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Unter 1 Sekunde
    });

    it('sollte korrekte Collection und Query-Pfad verwenden', async () => {
      mockFirestore.getDocs.mockResolvedValue({ docs: [] });

      await projectService.getActiveProjects(mockOrganizationId);

      expect(mockFirestore.collection).toHaveBeenCalledWith(
        expect.any(Object), // db
        'projects'
      );
    });
  });

  describe('Pipeline-Service Integration Tests', () => {
    it('sollte getProjectsByClient mit getActiveProjects Ergebnisse validieren', async () => {
      // Mock für beide Methoden
      mockFirestore.getDocs
        .mockResolvedValueOnce({
          // getProjectsByClient Response
          docs: [
            { id: 'project-1', data: () => mockProject1 },
            { id: 'project-2', data: () => mockProject2 }
          ]
        })
        .mockResolvedValueOnce({
          // getActiveProjects Response
          docs: [
            { id: 'project-1', data: () => mockProject1 },
            { id: 'project-2', data: () => mockProject2 },
            { id: 'project-3', data: () => mockProject3 }
          ]
        });

      const clientProjects = await projectService.getProjectsByClient(mockOrganizationId, mockClientId);
      const allActiveProjects = await projectService.getActiveProjects(mockOrganizationId);

      // Alle Client-Projekte sollten in aktiven Projekten enthalten sein
      clientProjects.forEach(clientProject => {
        const found = allActiveProjects.find(p => p.id === clientProject.id);
        expect(found).toBeDefined();
        expect(found?.customer?.id).toBe(mockClientId);
      });

      expect(clientProjects).toHaveLength(2);
      expect(allActiveProjects).toHaveLength(3);
    });

    it('sollte Cross-Validation zwischen beiden Methoden durchführen', async () => {
      const testOrgId = 'test-org-validation';
      
      mockFirestore.getDocs
        .mockResolvedValueOnce({
          docs: [{ id: 'project-1', data: () => ({ ...mockProject1, organizationId: testOrgId }) }]
        })
        .mockResolvedValueOnce({
          docs: [{ id: 'project-1', data: () => ({ ...mockProject1, organizationId: testOrgId }) }]
        });

      const [clientProjects, allProjects] = await Promise.all([
        projectService.getProjectsByClient(testOrgId, mockClientId),
        projectService.getActiveProjects(testOrgId)
      ]);

      // Beide sollten gleiche organizationId verwenden
      clientProjects.forEach(project => {
        expect(project.organizationId).toBe(testOrgId);
      });
      allProjects.forEach(project => {
        expect(project.organizationId).toBe(testOrgId);
      });
    });

    it('sollte Pipeline-Stage-Filter mit beiden Methoden testen', async () => {
      const stagesTestData = [
        { ...mockProject1, currentStage: 'creation' as const },
        { ...mockProject2, currentStage: 'review' as const },
        { ...mockProject3, currentStage: 'approval' as const }
      ];

      mockFirestore.getDocs.mockResolvedValue({
        docs: stagesTestData.map((project, i) => ({
          id: `project-${i + 1}`,
          data: () => project
        }))
      });

      const allActiveProjects = await projectService.getActiveProjects(mockOrganizationId);
      
      // Alle Pipeline-Stages sollten vertreten sein
      const stages = allActiveProjects.map(p => p.currentStage);
      expect(stages).toContain('creation');
      expect(stages).toContain('review');
      expect(stages).toContain('approval');
    });
  });

  describe('Edge Cases & Error Recovery', () => {
    it('sollte malformed Project-Daten tolerieren', async () => {
      const malformedProject = {
        id: 'malformed-project',
        title: 'Malformed Project',
        organizationId: mockOrganizationId,
        status: 'active',
        // Fehlende erforderliche Felder
        customer: { id: mockClientId, name: 'Client' }, // email fehlt
        // currentStage fehlt
        // userId fehlt
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-1', data: () => mockProject1 },
          { id: 'malformed-project', data: () => malformedProject }
        ]
      });

      const result = await projectService.getActiveProjects(mockOrganizationId);

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        ...malformedProject,
        id: 'malformed-project'
      });
    });

    it('sollte Query-Timeout robust handhaben', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      mockFirestore.getDocs.mockRejectedValue(timeoutError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await projectService.getProjectsByClient(mockOrganizationId, mockClientId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler beim Laden der Projekte nach Kunde:',
        expect.objectContaining({ name: 'TimeoutError' })
      );
    });

    it('sollte Permission-Denied-Fehler handhaben', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'PermissionError';
      
      mockFirestore.getDocs.mockRejectedValue(permissionError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await projectService.getActiveProjects(mockOrganizationId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler beim Laden der aktiven Projekte:',
        expect.objectContaining({ name: 'PermissionError' })
      );
    });

    it('sollte leere/ungültige organizationId handhaben', async () => {
      mockFirestore.getDocs.mockResolvedValue({ docs: [] });

      const results = await Promise.all([
        projectService.getActiveProjects(''),
        projectService.getActiveProjects(null as any),
        projectService.getActiveProjects(undefined as any)
      ]);

      results.forEach(result => {
        expect(result).toEqual([]);
      });

      // Query sollte trotzdem versucht werden (Firebase wirft Fehler bei ungültigen Werten)
      expect(mockFirestore.where).toHaveBeenCalledWith('organizationId', '==', '');
    });

    it('sollte sehr lange Client-IDs handhaben', async () => {
      const veryLongClientId = 'client-' + 'x'.repeat(1000);
      
      mockFirestore.getDocs.mockResolvedValue({ docs: [] });

      const result = await projectService.getProjectsByClient(mockOrganizationId, veryLongClientId);

      expect(result).toEqual([]);
      expect(mockFirestore.where).toHaveBeenCalledWith('customer.id', '==', veryLongClientId);
    });

    it('sollte Unicode/Sonderzeichen in IDs handhaben', async () => {
      const unicodeOrgId = 'org-🚀-äöü-测试';
      const unicodeClientId = 'client-émile-café';
      
      mockFirestore.getDocs.mockResolvedValue({ docs: [] });

      await Promise.all([
        projectService.getActiveProjects(unicodeOrgId),
        projectService.getProjectsByClient(unicodeOrgId, unicodeClientId)
      ]);

      expect(mockFirestore.where).toHaveBeenCalledWith('organizationId', '==', unicodeOrgId);
      expect(mockFirestore.where).toHaveBeenCalledWith('customer.id', '==', unicodeClientId);
    });
  });

  describe('Performance & Scalability Tests', () => {
    it('sollte concurrent Queries effizient handhaben', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'project-1', data: () => mockProject1 }
        ]
      });

      const promises = Array.from({ length: 10 }, () => 
        Promise.all([
          projectService.getActiveProjects(mockOrganizationId),
          projectService.getProjectsByClient(mockOrganizationId, mockClientId)
        ])
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(2000); // Unter 2 Sekunden für 20 Queries
    });

    it('sollte Memory-effiziente Verarbeitung großer Resultsets', async () => {
      const largeProjectSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `project-${i}`,
        data: () => ({ ...mockProject1, id: `project-${i}`, title: `Large Project ${i}` })
      }));

      mockFirestore.getDocs.mockResolvedValue({
        docs: largeProjectSet
      });

      const startTime = Date.now();
      const result = await projectService.getActiveProjects(mockOrganizationId);
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Unter 5 Sekunden für 1000 Projekte
      
      // Memory-Footprint sollte reasonable bleiben
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Unter 100MB
    });
  });
});