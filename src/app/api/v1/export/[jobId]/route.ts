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

    // Job abrufen
    const job = await bulkExportService.getJobById(jobId, context.organizationId);

    return APIMiddleware.successResponse(job);
  },
  []
);

/**
 * DELETE /api/v1/export/[jobId]
 * Storniert einen laufenden Export-Job
 */
export const DELETE = APIMiddleware.withAuth(
  async (request: NextRequest, context, { params }: { params: { jobId: string } }) => {
    const { jobId } = params;

    // Job stornieren
    await bulkExportService.cancelJob(jobId, context.organizationId);

    return APIMiddleware.successResponse({ message: 'Export-Job wurde storniert' });
  },
  []
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}