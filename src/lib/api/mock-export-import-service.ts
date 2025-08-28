// src/lib/api/mock-export-import-service.ts
/**
 * Mock Export/Import Service
 * Simuliert Export/Import-Funktionalität ohne DB-Abhängigkeiten
 */

import {
  BulkExportRequest,
  BulkImportRequest,
  APIBulkJobResponse,
  APIBulkJobListResponse,
  ExportFormat
} from '@/types/api-advanced';

// Define JobStatus locally since it's not exported
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

class MockBulkExportService {
  /**
   * Startet einen Mock-Export-Job
   */
  async startExport(
    request: BulkExportRequest,
    organizationId: string,
    userId: string
  ): Promise<any> {
    const jobId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: jobId,
      type: 'export',
      entities: request.entities,
      status: 'completed',
      progress: {
        current: 100,
        total: 100,
        percentage: 100,
        currentStep: 'Export abgeschlossen (Mock)'
      },
      downloadUrl: `https://www.celeropress.com/api/v1/export/${jobId}/download`,
      fileSize: 1024 * 50, // 50KB Mock
      recordCount: 42,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Holt Mock-Export-Jobs
   */
  async getJobs(
    organizationId: string,
    params: any
  ): Promise<any> {
    const mockJobs: any[] = [
      {
        id: 'exp_mock_1',
        type: 'export',
        entities: ['contacts'],
        status: 'completed',
        progress: {
          current: 500,
          total: 500,
          percentage: 100,
          currentStep: 'Abgeschlossen'
        },
        downloadUrl: 'https://www.celeropress.com/api/v1/export/exp_mock_1/download',
        fileSize: 1024 * 120,
        recordCount: 500,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        completedAt: new Date(Date.now() - 1800000).toISOString(),
        expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'exp_mock_2',
        type: 'export',
        entities: ['companies', 'contacts'],
        status: 'processing',
        progress: {
          current: 250,
          total: 1000,
          percentage: 25,
          currentStep: 'Exportiere Kontakte...'
        },
        createdAt: new Date(Date.now() - 600000).toISOString(),
        updatedAt: new Date(Date.now() - 60000).toISOString()
      }
    ];

    return {
      jobs: mockJobs,
      total: 2,
      page: params.page || 1,
      limit: params.limit || 20,
      hasNext: false
    };
  }

  /**
   * Holt einen Mock-Job nach ID
   */
  async getJobById(jobId: string, organizationId: string): Promise<any> {
    return {
      id: jobId,
      type: 'export',
      entities: ['contacts', 'companies'],
      status: 'completed',
      progress: {
        current: 1500,
        total: 1500,
        percentage: 100,
        currentStep: 'Export abgeschlossen'
      },
      downloadUrl: `https://www.celeropress.com/api/v1/export/${jobId}/download`,
      fileSize: 1024 * 250,
      recordCount: 1500,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString()
    };
  }
}

class MockBulkImportService {
  /**
   * Startet einen Mock-Import-Job
   */
  async startImport(
    request: BulkImportRequest,
    organizationId: string,
    userId: string
  ): Promise<any> {
    const jobId = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: jobId,
      type: 'import',
      entities: [request.entity],
      status: 'processing',
      progress: {
        current: 0,
        total: 100,
        percentage: 0,
        currentStep: 'Import gestartet (Mock)'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Holt Mock-Import-Jobs
   */
  async getJobs(
    organizationId: string,
    params: any
  ): Promise<any> {
    const mockJobs: any[] = [
      {
        id: 'imp_mock_1',
        type: 'import',
        entities: ['contacts'],
        status: 'completed',
        progress: {
          current: 250,
          total: 250,
          percentage: 100,
          currentStep: 'Import abgeschlossen'
        },
        recordCount: 250,
        results: {
          successful: 245,
          failed: 5,
          skipped: 0,
          errors: [
            {
              row: 42,
              field: 'email',
              message: 'Ungültiges E-Mail-Format',
              value: 'not-an-email'
            }
          ]
        },
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 6000000).toISOString(),
        completedAt: new Date(Date.now() - 6000000).toISOString()
      },
      {
        id: 'imp_mock_2',
        type: 'import',
        entities: ['companies'],
        status: 'failed',
        progress: {
          current: 50,
          total: 500,
          percentage: 10,
          currentStep: 'Import fehlgeschlagen'
        },
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Die Datei überschreitet die maximale Größe von 10MB'
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3000000).toISOString()
      }
    ];

    return {
      jobs: mockJobs,
      total: 2,
      page: params.page || 1,
      limit: params.limit || 20,
      hasNext: false
    };
  }

  /**
   * Holt einen Mock-Job nach ID
   */
  async getJobById(jobId: string, organizationId: string): Promise<any> {
    return {
      id: jobId,
      type: 'import',
      entities: ['contacts'],
      status: 'completed',
      progress: {
        current: 100,
        total: 100,
        percentage: 100,
        currentStep: 'Import erfolgreich abgeschlossen'
      },
      recordCount: 100,
      results: {
        successful: 98,
        failed: 2,
        skipped: 0,
        errors: []
      },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 900000).toISOString(),
      completedAt: new Date(Date.now() - 900000).toISOString()
    };
  }
}

// Export Singleton-Instanzen
export const mockBulkExportService = new MockBulkExportService();
export const mockBulkImportService = new MockBulkImportService();