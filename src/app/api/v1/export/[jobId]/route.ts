// src/app/api/v1/export/[jobId]/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';
import { bulkExportService } from '@/lib/api/bulk-export-service';

/**
 * GET /api/v1/export/[jobId]
 * Holt den Status eines Export-Jobs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  return APIMiddleware.withAuth(async (request, context, routeParams) => {
    const { jobId } = params;

    // Job abrufen
    const job = await bulkExportService.getJobById(jobId, context.organizationId);

    return APIMiddleware.successResponse(job);
  })(request, { params });
}

/**
 * DELETE /api/v1/export/[jobId]
 * Storniert einen laufenden Export-Job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  return APIMiddleware.withAuth(async (request, context, routeParams) => {
    const { jobId } = params;

    // Job stornieren
    await bulkExportService.cancelJob(jobId, context.organizationId);

    return APIMiddleware.successResponse({ message: 'Export-Job wurde storniert' });
  })(request, { params });
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}