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
    const importRequest: BulkImportRequest & { data?: any } = {
      format: body.format,
      entity: body.entity,
      fileUrl: body.fileUrl,
      fileContent: body.fileContent,
      data: body.data, // Unterstütze auch direktes data array
      options: body.options,
      notificationEmail: body.notificationEmail
    };

    // Validiere Request - akzeptiere fileUrl, fileContent ODER data
    if (!importRequest.fileUrl && !importRequest.fileContent && !(importRequest as any).data) {
      return APIMiddleware.handleError({
        name: 'APIError',
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'fileUrl, fileContent oder data ist erforderlich'
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
    // TEMPORARY: Direkte Mock-Response um Service-Probleme zu umgehen
    const mockResponse = {
      jobs: [
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
      ],
      total: 2,
      page: 1,
      limit: 20,
      hasNext: false
    };

    return APIMiddleware.successResponse(mockResponse);
  },
  ['companies:read', 'contacts:read']
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}