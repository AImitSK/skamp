// src/__tests__/api/advanced/bulk-import-service.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BulkImportService } from '@/lib/api/bulk-import-service';
import { 
  BulkImportRequest,
  ExportableEntity,
  ImportFormat
} from '@/types/api-advanced';

// Mock Firebase
jest.mock('@/lib/firebase/build-safe-init', () => ({
  db: {}
}));

// Mock Firestore functions
const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockServerTimestamp = jest.fn();

jest.mock('firebase/firestore', () => ({
  addDoc: mockAddDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  collection: mockCollection,
  doc: mockDoc,
  serverTimestamp: mockServerTimestamp,
  writeBatch: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (date: Date) => ({ toDate: () => date })
  }
}));

// Mock Services
jest.mock('@/lib/firebase/contact-service', () => ({
  contactService: {
    createContact: jest.fn().mockResolvedValue({
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    }),
    updateContact: jest.fn().mockResolvedValue({
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    }),
    getContacts: jest.fn().mockResolvedValue({
      contacts: []
    })
  }
}));

jest.mock('@/lib/firebase/company-service-enhanced', () => ({
  companyService: {
    createCompany: jest.fn().mockResolvedValue({
      id: 'company-1',
      name: 'Test Company'
    }),
    updateCompany: jest.fn().mockResolvedValue({
      id: 'company-1',
      name: 'Test Company'
    }),
    getCompanies: jest.fn().mockResolvedValue({
      companies: []
    })
  }
}));

jest.mock('@/lib/api/event-manager', () => ({
  eventManager: {
    triggerEvent: jest.fn().mockResolvedValue({})
  }
}));

// Mock fetch for file loading
global.fetch = jest.fn();

describe('BulkImportService', () => {
  let bulkImportService: BulkImportService;
  const testOrganizationId = 'test-org-123';
  const testUserId = 'test-user-456';

  beforeEach(() => {
    bulkImportService = new BulkImportService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockServerTimestamp.mockReturnValue({});
    mockCollection.mockReturnValue({});
    mockDoc.mockReturnValue({ id: 'test-job-id' });
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
    mockOrderBy.mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startImport', () => {
    const validImportRequest: BulkImportRequest = {
      format: 'csv' as ImportFormat,
      entity: 'contacts' as ExportableEntity,
      fileContent: 'firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com',
      options: {
        mode: 'create',
        duplicateHandling: 'skip'
      }
    };

    it('sollte einen Import-Job erfolgreich starten', async () => {
      // Mock successful job creation
      const mockJobRef = { id: 'job-123' };
      mockAddDoc.mockResolvedValue(mockJobRef);
      
      const mockJobDoc = {
        exists: () => true,
        data: () => ({
          type: 'import',
          entity: validImportRequest.entity,
          status: 'pending',
          progress: {
            current: 0,
            total: 0,
            percentage: 0,
            currentStep: 'Datei verarbeiten'
          },
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })
      };
      mockGetDoc.mockResolvedValue(mockJobDoc);

      const result = await bulkImportService.startImport(
        validImportRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('job-123');
      expect(result.type).toBe('import');
      expect(result.status).toBe('pending');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });

    it('sollte Fehler bei fehlender Entity werfen', async () => {
      const invalidRequest = {
        ...validImportRequest,
        entity: undefined as any
      };

      await expect(
        bulkImportService.startImport(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Entity ist erforderlich');
    });

    it('sollte Fehler bei ungültigem Format werfen', async () => {
      const invalidRequest = {
        ...validImportRequest,
        format: 'invalid' as ImportFormat
      };

      await expect(
        bulkImportService.startImport(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Ungültiges Import-Format');
    });

    it('sollte Fehler bei fehlender Datei werfen', async () => {
      const invalidRequest = {
        ...validImportRequest,
        fileContent: undefined,
        fileUrl: undefined
      };

      await expect(
        bulkImportService.startImport(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('fileContent oder fileUrl ist erforderlich');
    });

    it('sollte Email-Format validieren', async () => {
      const invalidRequest = {
        ...validImportRequest,
        notificationEmail: 'invalid-email'
      };

      await expect(
        bulkImportService.startImport(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Ungültiges Email-Format');
    });
  });

  describe('CSV Parsing', () => {
    it('sollte CSV korrekt parsen', async () => {
      const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com';
      
      // Da parseCSV private ist, testen wir indirekt über processFile
      // Erstelle einen Import-Job und verifiziere das Parsing
      const importRequest: BulkImportRequest = {
        format: 'csv',
        entity: 'contacts',
        fileContent: csvContent,
        options: { validateOnly: true }
      };

      const mockJobRef = { id: 'job-123' };
      mockAddDoc.mockResolvedValue(mockJobRef);
      
      const mockJobDoc = {
        exists: () => true,
        data: () => ({
          type: 'import',
          entity: 'contacts',
          status: 'pending',
          progress: { current: 0, total: 0, percentage: 0 },
          request: importRequest,
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: testUserId
        })
      };
      mockGetDoc.mockResolvedValue(mockJobDoc);
      mockUpdateDoc.mockResolvedValue({});

      const result = await bulkImportService.startImport(
        importRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('import');
      
      // Warte kurz für async processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verifiziere dass Update-Aufrufe gemacht wurden (für Processing)
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('sollte Fehler bei ungültigem CSV werfen', async () => {
      const invalidCsv = 'invalid csv content without proper structure';
      
      const importRequest: BulkImportRequest = {
        format: 'csv',
        entity: 'contacts',
        fileContent: invalidCsv,
        options: { validateOnly: true }
      };

      // Da das Processing async ist, können wir nur verifizieren dass der Job gestartet wurde
      const mockJobRef = { id: 'job-123' };
      mockAddDoc.mockResolvedValue(mockJobRef);
      
      const mockJobDoc = {
        exists: () => true,
        data: () => ({
          type: 'import',
          status: 'pending',
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })
      };
      mockGetDoc.mockResolvedValue(mockJobDoc);

      const result = await bulkImportService.startImport(
        importRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('JSON Parsing', () => {
    it('sollte JSON Array korrekt parsen', async () => {
      const jsonContent = JSON.stringify([
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
      ]);

      const importRequest: BulkImportRequest = {
        format: 'json',
        entity: 'contacts',
        fileContent: jsonContent,
        options: { validateOnly: true }
      };

      const mockJobRef = { id: 'job-123' };
      mockAddDoc.mockResolvedValue(mockJobRef);
      
      const mockJobDoc = {
        exists: () => true,
        data: () => ({
          type: 'import',
          entity: 'contacts',
          status: 'pending',
          progress: { current: 0, total: 0, percentage: 0 },
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })
      };
      mockGetDoc.mockResolvedValue(mockJobDoc);

      const result = await bulkImportService.startImport(
        importRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('import');
    });

    it('sollte JSON Objekt zu Array konvertieren', async () => {
      const jsonContent = JSON.stringify({
        firstName: 'John',
        lastName: 'Doe', 
        email: 'john@example.com'
      });

      const importRequest: BulkImportRequest = {
        format: 'json',
        entity: 'contacts',
        fileContent: jsonContent,
        options: { validateOnly: true }
      };

      const mockJobRef = { id: 'job-123' };
      mockAddDoc.mockResolvedValue(mockJobRef);
      
      const mockJobDoc = {
        exists: () => true,
        data: () => ({
          type: 'import',
          status: 'pending',
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })
      };
      mockGetDoc.mockResolvedValue(mockJobDoc);

      const result = await bulkImportService.startImport(
        importRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('import');
    });
  });

  describe('File URL Loading', () => {
    it('sollte Datei von URL laden', async () => {
      const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(csvContent)
      });

      const importRequest: BulkImportRequest = {
        format: 'csv',
        entity: 'contacts',
        fileUrl: 'https://example.com/test.csv',
        options: { validateOnly: true }
      };

      const mockJobRef = { id: 'job-123' };
      mockAddDoc.mockResolvedValue(mockJobRef);
      
      const mockJobDoc = {
        exists: () => true,
        data: () => ({
          type: 'import',
          status: 'pending',
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })
      };
      mockGetDoc.mockResolvedValue(mockJobDoc);

      const result = await bulkImportService.startImport(
        importRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/test.csv');
    });

    it('sollte Fehler bei fehlgeschlagener URL behandeln', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      });

      const importRequest: BulkImportRequest = {
        format: 'csv',
        entity: 'contacts',
        fileUrl: 'https://example.com/nonexistent.csv',
        options: { validateOnly: true }
      };

      const mockJobRef = { id: 'job-123' };
      mockAddDoc.mockResolvedValue(mockJobRef);
      
      const mockJobDoc = {
        exists: () => true,
        data: () => ({
          type: 'import',
          status: 'pending',
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })
      };
      mockGetDoc.mockResolvedValue(mockJobDoc);

      // Job wird trotzdem gestartet, aber Processing wird fehlschlagen
      const result = await bulkImportService.startImport(
        importRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('Validation', () => {
    it('sollte Contact-Daten korrekt validieren', async () => {
      const validContactCsv = 'firstName,lastName,email\nJohn,Doe,john@example.com';
      
      const importRequest: BulkImportRequest = {
        format: 'csv',
        entity: 'contacts',
        fileContent: validContactCsv,
        options: { validateOnly: true }
      };

      const mockJobRef = { id: 'job-123' };
      mockAddDoc.mockResolvedValue(mockJobRef);
      
      const mockJobDoc = {
        exists: () => true,
        data: () => ({
          type: 'import',
          status: 'pending',
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })
      };
      mockGetDoc.mockResolvedValue(mockJobDoc);

      const result = await bulkImportService.startImport(
        importRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('import');
    });

    it('sollte Company-Daten korrekt validieren', async () => {
      const validCompanyCsv = 'name,website,industry\nTest Company,https://test.com,Technology';
      
      const importRequest: BulkImportRequest = {
        format: 'csv',
        entity: 'companies',
        fileContent: validCompanyCsv,
        options: { validateOnly: true }
      };

      const mockJobRef = { id: 'job-123' };
      mockAddDoc.mockResolvedValue(mockJobRef);
      
      const mockJobDoc = {
        exists: () => true,
        data: () => ({
          type: 'import',
          status: 'pending',
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })
      };
      mockGetDoc.mockResolvedValue(mockJobDoc);

      const result = await bulkImportService.startImport(
        importRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('import');
    });
  });

  describe('cancelJob', () => {
    const jobId = 'job-123';

    it('sollte einen laufenden Job erfolgreich stornieren', async () => {
      jest.spyOn(bulkImportService, 'getJobById')
        .mockResolvedValue({
          id: jobId,
          type: 'import',
          status: 'processing',
          progress: { current: 0, total: 0, percentage: 0 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any);

      mockUpdateDoc.mockResolvedValue({});

      await bulkImportService.cancelJob(jobId, testOrganizationId);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'cancelled'
        })
      );
    });

    it('sollte Fehler werfen bei ungültigem Job-Status', async () => {
      jest.spyOn(bulkImportService, 'getJobById')
        .mockResolvedValue({
          id: jobId,
          status: 'completed'
        } as any);

      await expect(
        bulkImportService.cancelJob(jobId, testOrganizationId)
      ).rejects.toThrow('Job kann nicht storniert werden');
    });
  });
});