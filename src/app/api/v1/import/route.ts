// src/app/api/v1/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAPIKey } from '@/lib/api/api-middleware';
import { bulkImportService } from '@/lib/api/bulk-import-service';
import { APIError } from '@/lib/api/api-errors';
import { BulkImportRequest } from '@/types/api-advanced';

/**
 * POST /api/v1/import
 * Startet einen neuen Bulk-Import-Job
 */
export async function POST(request: NextRequest) {
  try {
    // API-Key Validierung
    const authResult = await validateAPIKey(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { organizationId, userId } = authResult;

    // Request Body parsen
    const body = await request.json();
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
      return NextResponse.json(
        { 
          error: {
            code: 'VALIDATION_ERROR',
            message: 'fileUrl oder fileContent ist erforderlich'
          }
        },
        { status: 400 }
      );
    }

    // Import-Job starten
    const job = await bulkImportService.startImport(
      importRequest,
      organizationId,
      userId
    );

    return NextResponse.json(job, { status: 201 });

  } catch (error) {
    console.error('Import API error:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        },
        { status: getStatusCodeForError(error.code) }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Serverfehler' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/import
 * Listet alle Import-Jobs einer Organisation
 */
export async function GET(request: NextRequest) {
  try {
    // API-Key Validierung
    const authResult = await validateAPIKey(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { organizationId } = authResult;
    const { searchParams } = new URL(request.url);

    // Query Parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as any;
    const type = 'import' as const;

    // Jobs abrufen - verwende den BulkExportService da beide Services ähnliche Job-Verwaltung haben
    // In Realität würde man einen gemeinsamen JobService haben
    const response = await bulkImportService.getJobs(organizationId, {
      page,
      limit,
      status,
      type
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Import list API error:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: getStatusCodeForError(error.code) }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Serverfehler' } },
      { status: 500 }
    );
  }
}

/**
 * Mappt Error-Codes zu HTTP-Status-Codes
 */
function getStatusCodeForError(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
    case 'INVALID_FORMAT':
    case 'FILE_TOO_LARGE':
      return 400;
    case 'JOB_NOT_FOUND':
      return 404;
    case 'QUOTA_EXCEEDED':
      return 429;
    case 'IMPORT_FAILED':
    case 'INTERNAL_SERVER_ERROR':
    default:
      return 500;
  }
}