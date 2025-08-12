// src/app/api/v1/export/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { bulkExportService } from '@/lib/api/bulk-export-service';
import { BulkExportRequest } from '@/types/api-advanced';

/**
 * POST /api/v1/export
 * Startet einen neuen Bulk-Export-Job
 */
export const POST = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    // Request Body parsen
    const body = await RequestParser.parseJSON<any>(request);
    const exportRequest: BulkExportRequest = {
      entities: body.entities,
      format: body.format,
      filters: body.filters,
      options: body.options,
      notificationEmail: body.notificationEmail
    };

    // Export-Job starten
    const job = await bulkExportService.startExport(
      exportRequest,
      context.organizationId,
      context.userId
    );

    return APIMiddleware.successResponse(job, 201);
  },
  ['exports:write']
);

/**
 * GET /api/v1/export
 * Listet alle Export-Jobs einer Organisation
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    const query = RequestParser.parseQuery(request);

    // Jobs abrufen
    const response = await bulkExportService.getJobs(context.organizationId, {
      page: query.page || 1,
      limit: Math.min(query.limit || 20, 100),
      status: query.status,
      type: query.type
    });

    return APIMiddleware.successResponse(response);
  },
  ['exports:read']
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}