// src/app/api/v1/import/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAPIKey } from '@/lib/api/api-middleware';
import { bulkImportService } from '@/lib/api/bulk-import-service';
import { APIError } from '@/lib/api/api-errors';

/**
 * GET /api/v1/import/[jobId]
 * Holt den Status eines Import-Jobs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
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
    const { jobId } = params;

    // Job abrufen
    const job = await bulkImportService.getJobById(jobId, organizationId);

    return NextResponse.json(job);

  } catch (error) {
    console.error('Import job status API error:', error);
    
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
    case 'JOB_NOT_FOUND':
      return 404;
    case 'INTERNAL_SERVER_ERROR':
    default:
      return 500;
  }
}