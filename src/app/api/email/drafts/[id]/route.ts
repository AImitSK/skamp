// src/app/api/email/drafts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { emailComposerService } from '@/lib/email/email-composer-service';
import { EmailDraft } from '@/types/email-composer';
import { db } from '@/lib/firebase/client-init';
import { doc, getDoc } from 'firebase/firestore';

interface RouteParams {
  params: {
    id: string; // Campaign ID
  };
}

// GET - Draft laden
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const campaignId = params.id;
      
      console.log('📄 Loading draft for campaign:', campaignId);

      // Kampagnen-Berechtigung prüfen
      const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
      
      if (!campaignDoc.exists()) {
        return NextResponse.json(
          { error: 'Kampagne nicht gefunden' },
          { status: 404 }
        );
      }

      const campaignData = campaignDoc.data();
      
      // Prüfe ob User zur gleichen Organization gehört
      // Für jetzt: userId muss übereinstimmen
      // Später: organizationId muss übereinstimmen
      const campaignOrgId = campaignData.organizationId || campaignData.userId;
      if (campaignData.userId !== auth.userId && campaignOrgId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Kampagne' },
          { status: 403 }
        );
      }

      // Draft laden
      const draft = await emailComposerService.loadDraft(campaignId);

      if (!draft) {
        return NextResponse.json({
          success: true,
          draft: null,
          message: 'Kein gespeicherter Entwurf gefunden'
        });
      }

      // Validierung durchführen
      const validation = emailComposerService.validateDraft(draft.content);

      return NextResponse.json({
        success: true,
        draft: draft.content,
        version: draft.version,
        lastSaved: draft.lastSaved.toDate(),
        validation
      });

    } catch (error: any) {
      console.error('❌ Load draft error:', error);
      
      return NextResponse.json(
        { 
          error: error.message || 'Draft konnte nicht geladen werden' 
        },
        { status: 500 }
      );
    }
  });
}

// PUT - Draft speichern
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const campaignId = params.id;
      const draft: EmailDraft = await req.json();
      
      console.log('💾 Saving draft for campaign:', campaignId);

      // Validierung
      if (!draft.content || !draft.recipients || !draft.sender || !draft.metadata) {
        return NextResponse.json(
          { error: 'Unvollständige Draft-Daten' },
          { status: 400 }
        );
      }

      // Kampagnen-Berechtigung prüfen
      const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
      
      if (!campaignDoc.exists()) {
        return NextResponse.json(
          { error: 'Kampagne nicht gefunden' },
          { status: 404 }
        );
      }

      const campaignData = campaignDoc.data();
      
      const campaignOrgId = campaignData.organizationId || campaignData.userId;
      if (campaignData.userId !== auth.userId && campaignOrgId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Kampagne' },
          { status: 403 }
        );
      }

      // Draft speichern mit Auth Context
      const result = await emailComposerService.saveDraft(
        campaignId,
        draft,
        auth.userId,
        auth.organizationId // Für Multi-Tenancy vorbereitet
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Speichern fehlgeschlagen' },
          { status: 500 }
        );
      }

      console.log('✅ Draft saved successfully');

      return NextResponse.json({
        success: true,
        draftId: result.draftId,
        lastSaved: result.lastSaved
      });

    } catch (error: any) {
      console.error('❌ Save draft error:', error);
      
      return NextResponse.json(
        { 
          error: error.message || 'Draft konnte nicht gespeichert werden' 
        },
        { status: 500 }
      );
    }
  });
}

// DELETE - Draft löschen
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const campaignId = params.id;
      
      // Draft ID aus Query-Parametern
      const { searchParams } = new URL(req.url);
      const draftId = searchParams.get('draftId');

      if (!draftId) {
        return NextResponse.json(
          { error: 'Draft ID fehlt' },
          { status: 400 }
        );
      }

      console.log('🗑️ Deleting draft:', draftId);

      // Kampagnen-Berechtigung prüfen
      const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
      
      if (!campaignDoc.exists()) {
        return NextResponse.json(
          { error: 'Kampagne nicht gefunden' },
          { status: 404 }
        );
      }

      const campaignData = campaignDoc.data();
      
      if (campaignData.userId !== auth.userId && 
          campaignData.organizationId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Kampagne' },
          { status: 403 }
        );
      }

      // Draft löschen
      const success = await emailComposerService.deleteDraft(draftId);

      if (!success) {
        return NextResponse.json(
          { error: 'Löschen fehlgeschlagen' },
          { status: 500 }
        );
      }

      console.log('✅ Draft deleted successfully');

      return NextResponse.json({
        success: true,
        message: 'Draft wurde gelöscht'
      });

    } catch (error: any) {
      console.error('❌ Delete draft error:', error);
      
      return NextResponse.json(
        { 
          error: error.message || 'Draft konnte nicht gelöscht werden' 
        },
        { status: 500 }
      );
    }
  });
}

// POST - Draft-Historie abrufen
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const campaignId = params.id;
      const { limit = 10 } = await req.json();
      
      console.log('📚 Loading draft history for campaign:', campaignId);

      // Kampagnen-Berechtigung prüfen
      const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
      
      if (!campaignDoc.exists()) {
        return NextResponse.json(
          { error: 'Kampagne nicht gefunden' },
          { status: 404 }
        );
      }

      const campaignData = campaignDoc.data();
      
      if (campaignData.userId !== auth.userId && 
          campaignData.organizationId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Kampagne' },
          { status: 403 }
        );
      }

      // Draft-Historie laden
      const history = await emailComposerService.getDraftHistory(campaignId, limit);

      return NextResponse.json({
        success: true,
        history: history.map(draft => ({
          id: draft.id,
          version: draft.version,
          lastSaved: draft.lastSaved.toDate(),
          createdAt: draft.createdAt.toDate(),
          updatedAt: draft.updatedAt.toDate()
        })),
        count: history.length
      });

    } catch (error: any) {
      console.error('❌ Load draft history error:', error);
      
      return NextResponse.json(
        { 
          error: error.message || 'Historie konnte nicht geladen werden' 
        },
        { status: 500 }
      );
    }
  });
}