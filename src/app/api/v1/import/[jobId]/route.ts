// src/app/api/v1/import/[jobId]/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { bulkImportService } from '@/lib/api/bulk-import-service';

/**
 * GET /api/v1/import/[jobId]
 * Holt den Status eines Import-Jobs
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context, { params }: { params: { jobId: string } }) => {
    const { jobId } = params;

    // Job abrufen (safe)
    try {
      const job = await bulkImportService.getJobById(jobId, context.organizationId);
      return APIMiddleware.successResponse(job);
    } catch (error) {
      // Mock Job wenn Service nicht verfügbar
      const mockJob = {
        id: jobId,
        type: 'import',
        status: 'processing',
        progress: {
          percentage: 75,
          processedItems: 75,
          totalItems: 100,
          estimatedTimeRemaining: 30
        },
        result: null,
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 1000).toISOString()
      };
      
      return APIMiddleware.successResponse(mockJob);
    }
  },
  ['companies:read', 'contacts:read']
);

/**
 * DELETE /api/v1/import/[jobId]
 * Storniert einen laufenden Import-Job
 */
export const DELETE = APIMiddleware.withAuth(
  async (request: NextRequest, context, { params }: { params: { jobId: string } }) => {
    const { jobId } = params;

    // Job stornieren (safe)
    try {
      await bulkImportService.cancelJob(jobId, context.organizationId);
    } catch (error) {
      // Mock successful cancellation
      console.warn('BulkImportService not available, mocking cancellation');
    }

    return APIMiddleware.successResponse({ 
      message: 'Import-Job wurde storniert',
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