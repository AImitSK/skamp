// src/app/api/v1/import/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { bulkImportService } from '@/lib/api/bulk-import-service';
import { BulkImportRequest } from '@/types/api-advanced';

/**
 * POST /api/v1/import
 * Startet einen neuen Bulk-Import-Job
 */
export const POST = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {

    // Request Body parsen
    const body = await RequestParser.parseJSON<any>(request);
    const importRequest: BulkImportRequest = {
      format: body.format,
      entity: body.entity,
      fileUrl: body.fileUrl,
      fileContent: body.fileContent,
      options: body.options,
      notificationEmail: body.notificationEmail
    };

    // Validiere Request
    if (!importRequest.fileUrl && !importRequest.fileContent) {
      return APIMiddleware.handleError({
        name: 'APIError',
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'fileUrl oder fileContent ist erforderlich'
      });
    }

    // Import-Job starten
    const job = await bulkImportService.startImport(
      importRequest,
      context.organizationId,
      context.userId
    );

    return APIMiddleware.successResponse(job, 201);
  },
  ['companies:read', 'contacts:read']
);

/**
 * GET /api/v1/import
 * Listet alle Import-Jobs einer Organisation
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    const query = RequestParser.parseQuery(request);

    // Query Parameters
    const page = parseInt(query.page as string || '1');
    const limit = parseInt(query.limit as string || '20');
    const status = query.status as any;
    const type = 'import' as const;

    // Jobs abrufen - verwende den BulkImportService 
    const response = await bulkImportService.getJobs(context.organizationId, {
      page,
      limit,
      status,
      type
    });

    return APIMiddleware.successResponse(response);
  },
  ['companies:read', 'contacts:read']
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}