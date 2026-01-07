// src/app/api/ai/pm-vorlage/route.ts
// API Route fuer PM-Vorlage Generierung (Experten-Modus)
// Phase 4 des Pressemeldungs-Refactorings

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import {
  generatePMVorlageFlow,
  type GeneratePMVorlageInput,
} from '@/lib/ai/flows/generate-pm-vorlage';
import { pmVorlageService } from '@/lib/firebase/pm-vorlage-service';
import { faktenMatrixService } from '@/lib/firebase/fakten-matrix-service';
import { dnaSyntheseService } from '@/lib/firebase/dna-synthese-service';

/**
 * POST /api/ai/pm-vorlage
 *
 * Generiert eine PM-Vorlage aus DNA-Synthese und Fakten-Matrix.
 *
 * Request Body:
 * - projectId: string (required)
 * - companyId: string (required)
 * - companyName: string (required)
 * - targetGroup?: 'ZG1' | 'ZG2' | 'ZG3' (optional, default: 'ZG1')
 * - dnaSynthese: string (optional - wird aus DB geladen wenn nicht angegeben)
 * - faktenMatrix: object (optional - wird aus DB geladen wenn nicht angegeben)
 * - dnaContacts: array (required)
 * - saveToFirestore?: boolean (optional, default: true)
 *
 * Response:
 * - headline, leadParagraph, bodyParagraphs, quote, cta, hashtags, htmlContent
 * - targetGroup
 * - markenDNAHash, faktenMatrixHash (wenn gespeichert)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body = await req.json();

      // Pflichtfelder validieren
      if (!body.projectId || !body.companyId || !body.companyName) {
        return NextResponse.json(
          { error: 'Fehlende Parameter: projectId, companyId oder companyName' },
          { status: 400 }
        );
      }

      // dnaContacts ist optional - wenn nicht vorhanden, verwenden wir Speaker-Info aus Fakten-Matrix
      const dnaContacts = body.dnaContacts || [];

      // DNA-Synthese laden falls nicht angegeben
      let dnaSynthese = body.dnaSynthese;
      let dnaHash = '';
      if (!dnaSynthese) {
        const dnaData = await dnaSyntheseService.getSynthese(body.companyId);
        if (!dnaData || !dnaData.plainText) {
          return NextResponse.json(
            { error: 'Keine DNA-Synthese gefunden. Bitte zuerst Marken-DNA erstellen.' },
            { status: 400 }
          );
        }
        dnaSynthese = dnaData.plainText;
        // Hash berechnen (einfacher String-Hash)
        dnaHash = hashString(dnaSynthese);
      } else {
        dnaHash = hashString(dnaSynthese);
      }

      // Fakten-Matrix laden falls nicht angegeben
      let faktenMatrix = body.faktenMatrix;
      let faktenMatrixHash = '';
      if (!faktenMatrix) {
        const fmData = await faktenMatrixService.getWithHash(body.projectId);
        if (!fmData) {
          return NextResponse.json(
            { error: 'Keine Fakten-Matrix gefunden. Bitte zuerst Project-Wizard durchlaufen.' },
            { status: 400 }
          );
        }
        faktenMatrix = fmData.data;
        faktenMatrixHash = fmData.hash;
      } else {
        faktenMatrixHash = faktenMatrixService.calculateHash(faktenMatrix);
      }

      // Flow-Input vorbereiten
      const flowInput: GeneratePMVorlageInput = {
        projectId: body.projectId,
        companyId: body.companyId,
        companyName: body.companyName,
        language: body.language || 'de',
        dnaSynthese,
        faktenMatrix,
        dnaContacts,
        targetGroup: body.targetGroup || 'ZG1',
      };

      // Flow aufrufen
      const result = await generatePMVorlageFlow(flowInput);

      // In Firestore speichern (default: true)
      const saveToFirestore = body.saveToFirestore !== false;
      if (saveToFirestore) {
        await pmVorlageService.save(body.projectId, {
          headline: result.headline,
          leadParagraph: result.leadParagraph,
          bodyParagraphs: result.bodyParagraphs,
          quote: result.quote,
          cta: result.cta,
          hashtags: result.hashtags,
          htmlContent: result.htmlContent,
          targetGroup: result.targetGroup,
          markenDNAHash: dnaHash,
          faktenMatrixHash: faktenMatrixHash,
        });
      }

      return NextResponse.json({
        ...result,
        markenDNAHash: dnaHash,
        faktenMatrixHash: faktenMatrixHash,
        savedToFirestore: saveToFirestore,
      });
    } catch (error: unknown) {
      console.error('PM-Vorlage Generierung Fehler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      return NextResponse.json(
        { error: `PM-Vorlage Generierung fehlgeschlagen: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/ai/pm-vorlage?projectId=xxx
 *
 * Laedt eine existierende PM-Vorlage aus Firestore.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const projectId = searchParams.get('projectId');

      if (!projectId) {
        return NextResponse.json(
          { error: 'projectId Parameter erforderlich' },
          { status: 400 }
        );
      }

      const vorlage = await pmVorlageService.get(projectId);

      if (!vorlage) {
        return NextResponse.json(
          { error: 'Keine PM-Vorlage gefunden' },
          { status: 404 }
        );
      }

      return NextResponse.json(vorlage);
    } catch (error: unknown) {
      console.error('PM-Vorlage Laden Fehler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      return NextResponse.json(
        { error: `PM-Vorlage laden fehlgeschlagen: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/ai/pm-vorlage?projectId=xxx
 *
 * Loescht eine PM-Vorlage.
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const projectId = searchParams.get('projectId');

      if (!projectId) {
        return NextResponse.json(
          { error: 'projectId Parameter erforderlich' },
          { status: 400 }
        );
      }

      await pmVorlageService.delete(projectId);

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      console.error('PM-Vorlage Loeschen Fehler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      return NextResponse.json(
        { error: `PM-Vorlage loeschen fehlgeschlagen: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

// OPTIONS fuer CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}

/**
 * Einfacher String-Hash (fuer Browser-Kompatibilitaet)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
