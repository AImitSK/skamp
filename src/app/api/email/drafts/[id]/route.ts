// src/app/api/email/drafts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { EmailDraft } from '@/types/email-composer';

interface RouteParams {
  params: {
    id: string; // Campaign ID
  };
}

// Firestore REST API Helper
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function firestoreRequest(
  path: string,
  method: string = 'GET',
  body?: any,
  token?: string
) {
  const url = `${FIRESTORE_BASE_URL}/${path}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firestore request failed: ${error}`);
  }
  
  return response.json();
}

// Separate function for Firestore queries
async function firestoreQuery(body: any, token?: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firestore query failed: ${error}`);
  }
  
  return response.json();
}

// Convert Firestore document to JS object
function convertFirestoreDocument(doc: any): any {
  if (!doc.fields) return null;
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = convertFirestoreValue(value);
  }
  
  return result;
}

function convertFirestoreValue(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.arrayValue !== undefined) {
    return value.arrayValue.values?.map((v: any) => convertFirestoreValue(v)) || [];
  }
  if (value.mapValue !== undefined) {
    const result: any = {};
    if (value.mapValue.fields) {
      for (const [k, v] of Object.entries(value.mapValue.fields)) {
        result[k] = convertFirestoreValue(v);
      }
    }
    return result;
  }
  return null;
}

// Convert JS object to Firestore document
function convertToFirestoreDocument(data: any): any {
  const fields: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    fields[key] = convertToFirestoreValue(value);
  }
  
  return { fields };
}

function convertToFirestoreValue(value: any): any {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: value.toString() };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(v => convertToFirestoreValue(v))
      }
    };
  }
  if (typeof value === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = convertToFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

// GET - Draft laden
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const campaignId = params.id;
      
      console.log('📄 Loading draft for campaign:', campaignId);

      // Get user token for Firestore requests
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split('Bearer ')[1];

      // Kampagnen-Berechtigung prüfen
      const campaignDoc = await firestoreRequest(
        `pr_campaigns/${campaignId}`,
        'GET',
        undefined,
        token
      );
      
      if (!campaignDoc.fields) {
        return NextResponse.json(
          { error: 'Kampagne nicht gefunden' },
          { status: 404 }
        );
      }

      const campaignData = convertFirestoreDocument(campaignDoc);
      
      // Prüfe ob User zur gleichen Organization gehört
      const campaignOrgId = campaignData.organizationId || campaignData.userId;
      if (campaignData.userId !== auth.userId && campaignOrgId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Kampagne' },
          { status: 403 }
        );
      }

      // Draft laden - Query über REST API
      const queryResponse = await firestoreQuery(
        {
          structuredQuery: {
            from: [{ collectionId: 'email_drafts' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'campaignId' },
                op: 'EQUAL',
                value: { stringValue: campaignId }
              }
            },
            orderBy: [{
              field: { fieldPath: 'version' },
              direction: 'DESCENDING'
            }],
            limit: 1
          }
        },
        token
      );

      if (!queryResponse[0]?.document) {
        return NextResponse.json({
          success: true,
          draft: null,
          message: 'Kein gespeicherter Entwurf gefunden'
        });
      }

      const draftData = convertFirestoreDocument(queryResponse[0].document);

      // Validierung durchführen
      const validation = validateDraft(draftData.content);

      return NextResponse.json({
        success: true,
        draft: draftData.content,
        version: draftData.version,
        lastSaved: draftData.lastSaved,
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

      // Get user token
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split('Bearer ')[1];

      // Validierung
      if (!draft.content || !draft.recipients || !draft.sender || !draft.metadata) {
        return NextResponse.json(
          { error: 'Unvollständige Draft-Daten' },
          { status: 400 }
        );
      }

      // Kampagnen-Berechtigung prüfen
      const campaignDoc = await firestoreRequest(
        `pr_campaigns/${campaignId}`,
        'GET',
        undefined,
        token
      );
      
      if (!campaignDoc.fields) {
        return NextResponse.json(
          { error: 'Kampagne nicht gefunden' },
          { status: 404 }
        );
      }

      const campaignData = convertFirestoreDocument(campaignDoc);
      
      const campaignOrgId = campaignData.organizationId || campaignData.userId;
      if (campaignData.userId !== auth.userId && campaignOrgId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Kampagne' },
          { status: 403 }
        );
      }

      // Check for existing draft
      const queryResponse = await firestoreQuery(
        {
          structuredQuery: {
            from: [{ collectionId: 'email_drafts' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'campaignId' },
                op: 'EQUAL',
                value: { stringValue: campaignId }
              }
            },
            orderBy: [{
              field: { fieldPath: 'version' },
              direction: 'DESCENDING'
            }],
            limit: 1
          }
        },
        token
      );

      let draftId: string;
      let version: number = 1;
      let createdAt = new Date();

      if (queryResponse[0]?.document) {
        // Update existing draft
        const existingDoc = queryResponse[0].document;
        draftId = existingDoc.name.split('/').pop();
        const existingData = convertFirestoreDocument(existingDoc);
        version = (existingData.version || 0) + 1;
        createdAt = existingData.createdAt || new Date();
      } else {
        // Create new draft
        draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Save draft
      const draftDocument = convertToFirestoreDocument({
        campaignId,
        userId: auth.userId,
        organizationId: auth.organizationId,
        content: draft,
        version,
        createdAt,
        updatedAt: new Date(),
        lastSaved: new Date()
      });

      await firestoreRequest(
        `email_drafts/${draftId}`,
        'PATCH',
        draftDocument,
        token
      );

      console.log('✅ Draft saved successfully');

      return NextResponse.json({
        success: true,
        draftId,
        lastSaved: new Date()
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

      // Get user token
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split('Bearer ')[1];

      // Kampagnen-Berechtigung prüfen
      const campaignDoc = await firestoreRequest(
        `pr_campaigns/${campaignId}`,
        'GET',
        undefined,
        token
      );
      
      if (!campaignDoc.fields) {
        return NextResponse.json(
          { error: 'Kampagne nicht gefunden' },
          { status: 404 }
        );
      }

      const campaignData = convertFirestoreDocument(campaignDoc);
      
      if (campaignData.userId !== auth.userId && 
          campaignData.organizationId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Kampagne' },
          { status: 403 }
        );
      }

      // Soft delete - update with deletedAt
      const updateDoc = convertToFirestoreDocument({
        deletedAt: new Date(),
        updatedAt: new Date()
      });

      await firestoreRequest(
        `email_drafts/${draftId}`,
        'PATCH',
        updateDoc,
        token
      );

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

// Helper function for validation
function validateDraft(draft: EmailDraft): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!draft?.content?.body || draft.content.body.trim().length < 50) {
    missingFields.push('E-Mail-Inhalt (mindestens 50 Zeichen)');
  }

  if ((!draft?.recipients?.listIds || draft.recipients.listIds.length === 0) && 
      (!draft?.recipients?.manual || draft.recipients.manual.length === 0)) {
    missingFields.push('Empfänger');
  }

  if (draft?.sender?.type === 'contact' && !draft.sender.contactId) {
    missingFields.push('Absender-Kontakt');
  } else if (draft?.sender?.type === 'manual' && (!draft.sender.manual?.name || !draft.sender.manual?.email)) {
    missingFields.push('Absender-Informationen');
  }

  if (!draft?.metadata?.subject || draft.metadata.subject.trim().length < 5) {
    missingFields.push('Betreff');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
}