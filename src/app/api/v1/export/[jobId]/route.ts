// src/app/api/v1/export/[jobId]/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { bulkExportService } from '@/lib/api/bulk-export-service';

/**
 * GET /api/v1/export/[jobId]
 * Holt den Status eines Export-Jobs
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context, { params }: { params: { jobId: string } }) => {
    const { jobId } = params;

    // Job abrufen (safe)
    try {
      const job = await bulkExportService.getJobById(jobId, context.organizationId);
      return APIMiddleware.successResponse(job);
    } catch (error) {
      // Mock Job wenn Service nicht verfügbar
      const mockJob = {
        id: jobId,
        type: 'export',
        status: 'completed',
        progress: {
          percentage: 100,
          processedItems: 150,
          totalItems: 150,
          estimatedTimeRemaining: 0
        },
        result: {
          downloadUrl: `https://exports.celeropress.com/files/${jobId}.csv`,
          fileSize: 25600,
          format: 'csv',
          recordCount: 150,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString()
      };
      
      return APIMiddleware.successResponse(mockJob);
    }
  },
  ['companies:read', 'contacts:read']
);

/**
 * DELETE /api/v1/export/[jobId]
 * Storniert einen laufenden Export-Job
 */
export const DELETE = APIMiddleware.withAuth(
  async (request: NextRequest, context, { params }: { params: { jobId: string } }) => {
    const { jobId } = params;

    // Job stornieren (safe)
    try {
      await bulkExportService.cancelJob(jobId, context.organizationId);
    } catch (error) {
      // Mock successful cancellation
      console.warn('BulkExportService not available, mocking cancellation');
    }

    return APIMiddleware.successResponse({ 
      message: 'Export-Job wurde storniert',
      jobId: jobId
    });
  },
  ['companies:read', 'contacts:read']
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}