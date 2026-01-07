// src/app/api/ai/pm-vorlage/apply/route.ts
// API Route zum Übertragen der PM-Vorlage in den Campaign Editor
// Phase 7 des Pressemeldungs-Refactorings

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { getPMVorlage } from '@/lib/firebase-admin/pm-vorlage-admin-service';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/ai/pm-vorlage/apply
 *
 * Überträgt die PM-Vorlage in die Campaign des Projekts.
 *
 * Request Body:
 * - projectId: string (required)
 * - organizationId: string (required)
 * - includeTitle: boolean (optional, default: true) - Headline als Titel übernehmen
 *
 * Response:
 * - success: boolean
 * - campaignId: string
 * - message: string
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body = await req.json();

      // Pflichtfelder validieren
      if (!body.projectId || !body.organizationId) {
        return NextResponse.json(
          { error: 'Fehlende Parameter: projectId oder organizationId' },
          { status: 400 }
        );
      }

      const { projectId, organizationId, includeTitle = true } = body;

      console.log('[PM-Vorlage Apply] Request:', { projectId, organizationId, includeTitle });

      // 1. PM-Vorlage laden
      const pmVorlage = await getPMVorlage(projectId);
      if (!pmVorlage) {
        return NextResponse.json(
          { error: 'Keine PM-Vorlage gefunden. Bitte zuerst generieren.' },
          { status: 404 }
        );
      }

      if (!pmVorlage.htmlContent) {
        return NextResponse.json(
          { error: 'PM-Vorlage hat keinen HTML-Content.' },
          { status: 400 }
        );
      }

      // 2. Campaign für dieses Projekt finden
      // Zwei Ansätze: 1) projectId auf Campaign, 2) linkedCampaigns im Project
      let campaignId: string | null = null;

      // Ansatz 1: Suche Campaign mit projectId Field
      const campaignsSnapshot = await adminDb
        .collection('campaigns')
        .where('projectId', '==', projectId)
        .where('organizationId', '==', organizationId)
        .limit(1)
        .get();

      if (!campaignsSnapshot.empty) {
        campaignId = campaignsSnapshot.docs[0].id;
        console.log('[PM-Vorlage Apply] Found via projectId field:', campaignId);
      }

      // Ansatz 2: Fallback über linkedCampaigns im Project
      if (!campaignId) {
        const projectDoc = await adminDb
          .collection('projects')
          .doc(projectId)
          .get();

        if (projectDoc.exists) {
          const projectData = projectDoc.data();
          const linkedCampaigns = projectData?.linkedCampaigns as string[] | undefined;

          if (linkedCampaigns && linkedCampaigns.length > 0) {
            campaignId = linkedCampaigns[0]; // Erste verknüpfte Campaign
            console.log('[PM-Vorlage Apply] Found via linkedCampaigns:', campaignId);
          }
        }
      }

      if (!campaignId) {
        return NextResponse.json(
          { error: 'Keine Pressemeldung für dieses Projekt gefunden. Bitte zuerst im Pressemeldungen-Tab erstellen.' },
          { status: 404 }
        );
      }

      // 3. Campaign-Content aktualisieren
      const updateData: Record<string, any> = {
        mainContent: pmVorlage.htmlContent,
        updatedAt: FieldValue.serverTimestamp(),
        // Metadata für Tracking
        pmVorlageAppliedAt: FieldValue.serverTimestamp(),
        pmVorlageTargetGroup: pmVorlage.targetGroup,
      };

      // Optional: Headline als Title übernehmen
      if (includeTitle && pmVorlage.headline) {
        updateData.title = pmVorlage.headline;
      }

      await adminDb.collection('campaigns').doc(campaignId).update(updateData);

      console.log(`[PM-Vorlage Apply] Content übertragen in Campaign ${campaignId}`);

      return NextResponse.json({
        success: true,
        campaignId,
        message: 'PM-Vorlage erfolgreich in Editor übertragen',
      });
    } catch (error: unknown) {
      console.error('PM-Vorlage Apply Fehler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      return NextResponse.json(
        { error: `PM-Vorlage übertragen fehlgeschlagen: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

// OPTIONS für CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
