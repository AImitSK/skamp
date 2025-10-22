/**
 * API Route: Import einzelner Matching-Kandidat mit Genkit AI-Merge
 *
 * Diese Route läuft SERVER-SIDE und kann Genkit verwenden
 * - Genkit läuft nur auf dem Server (Node.js)
 * - Client-Komponenten rufen diese API auf
 */

import { NextRequest, NextResponse } from 'next/server';
import { importCandidateWithAutoMatching } from '@/lib/firebase/matching-service';

/**
 * POST /api/matching/import-candidate
 *
 * Importiert einen einzelnen Kandidaten mit Auto-Matching und optionalem AI-Merge
 *
 * Request Body:
 * {
 *   candidateId: string;
 *   selectedVariantIndex: number;
 *   userId: string;
 *   userEmail: string;
 *   organizationId: string;
 *   useAiMerge?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      candidateId,
      selectedVariantIndex,
      userId,
      userEmail,
      organizationId,
      useAiMerge = false
    } = body;

    // Validierung
    if (!candidateId || selectedVariantIndex === undefined || !userId || !userEmail || !organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: candidateId, selectedVariantIndex, userId, userEmail, organizationId'
        },
        { status: 400 }
      );
    }

    console.log('🔄 API Route: Starting candidate import', {
      candidateId,
      selectedVariantIndex,
      userId,
      useAiMerge,
      timestamp: new Date().toISOString()
    });

    // Führe Import aus (server-side, kann Genkit verwenden!)
    const result = await importCandidateWithAutoMatching({
      candidateId,
      selectedVariantIndex,
      userId,
      userEmail,
      organizationId,
      useAiMerge
    });

    if (result.success) {
      console.log('✅ API Route: Import erfolgreich', {
        contactId: result.contactId,
        companyId: result.companyMatch?.companyId,
        publicationCount: result.publicationMatches?.length || 0
      });

      return NextResponse.json({
        success: true,
        contactId: result.contactId,
        companyMatch: result.companyMatch,
        publicationMatches: result.publicationMatches
      });
    } else {
      console.error('❌ API Route: Import fehlgeschlagen', result.error);

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Import failed'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ API Route: Import exception', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
