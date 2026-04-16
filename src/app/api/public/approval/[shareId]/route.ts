// src/app/api/public/approval/[shareId]/route.ts
// Öffentliche API-Route für Kunden-Freigabe (kein Auth erforderlich)
// Nutzt Admin SDK um Firestore Security Rules zu umgehen

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';

// ============================================
// GET: Lade alle Daten für die Freigabe-Seite
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return NextResponse.json(
        { error: 'shareId fehlt' },
        { status: 400 }
      );
    }

    // 1. Approval laden via shareId
    const approvalSnap = await adminDb
      .collection('approvals')
      .where('shareId', '==', shareId)
      .limit(1)
      .get();

    if (approvalSnap.empty) {
      return NextResponse.json(
        { error: 'Freigabe-Link nicht gefunden oder nicht mehr gültig.' },
        { status: 404 }
      );
    }

    const approvalDoc = approvalSnap.docs[0];
    const approvalData = approvalDoc.data();
    const approvalId = approvalDoc.id;

    // Daten-Normalisierung (wie im Client-Service)
    if (approvalData.history && !Array.isArray(approvalData.history)) {
      approvalData.history = [];
    }
    if (approvalData.recipients && !Array.isArray(approvalData.recipients)) {
      approvalData.recipients = Object.values(approvalData.recipients);
    } else if (!approvalData.recipients) {
      approvalData.recipients = [];
    }
    if (approvalData.attachedAssets && !Array.isArray(approvalData.attachedAssets)) {
      approvalData.attachedAssets = [];
    }

    const approval = { ...approvalData, id: approvalId };

    // 2. Campaign laden
    const campaignRef = adminDb.collection('pr_campaigns').doc(approvalData.campaignId);
    const campaignSnap = await campaignRef.get();

    if (!campaignSnap.exists) {
      return NextResponse.json(
        { error: 'Zugehörige Kampagne nicht gefunden.' },
        { status: 404 }
      );
    }

    const campaignData = { ...campaignSnap.data(), id: campaignSnap.id };

    // Prüfe ob Kampagne bereits versendet
    if ((campaignData as any).status === 'sent') {
      return NextResponse.json(
        { error: 'Diese Kampagne wurde bereits versendet. Die Freigabe-Seite ist nicht mehr verfügbar.' },
        { status: 410 }
      );
    }

    // 3. Parallel laden: PDF-Versionen, Branding, Team-Member
    const [pdfVersionsSnap, brandingResult, teamMemberResult] = await Promise.all([
      // PDF-Versionen
      adminDb
        .collection('pdf_versions')
        .where('campaignId', '==', approvalData.campaignId)
        .orderBy('version', 'desc')
        .limit(50)
        .get(),

      // Branding-Settings
      loadBrandingSettings(adminDb, (campaignData as any).organizationId),

      // Team-Member (Zuständiger Mitarbeiter)
      loadTeamMember(adminDb, (campaignData as any).organizationId, (campaignData as any).userId)
    ]);

    const pdfVersions = pdfVersionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Timestamps serialisieren für JSON
    const serialized = {
      approval: serializeFirestoreData(approval),
      campaign: serializeFirestoreData(campaignData),
      pdfVersions: pdfVersions.map(v => serializeFirestoreData(v)),
      brandingSettings: brandingResult ? serializeFirestoreData(brandingResult) : null,
      teamMember: teamMemberResult ? serializeFirestoreData(teamMemberResult) : null
    };

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error('Fehler beim Laden der Freigabe-Daten:', error);
    return NextResponse.json(
      { error: 'Die Pressemitteilung konnte nicht geladen werden.' },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Aktionen ausführen (viewed, approve, requestChanges)
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!shareId || !action) {
      return NextResponse.json(
        { error: 'shareId und action sind erforderlich' },
        { status: 400 }
      );
    }

    // Approval laden
    const approvalSnap = await adminDb
      .collection('approvals')
      .where('shareId', '==', shareId)
      .limit(1)
      .get();

    if (approvalSnap.empty) {
      return NextResponse.json(
        { error: 'Freigabe nicht gefunden' },
        { status: 404 }
      );
    }

    const approvalDoc = approvalSnap.docs[0];
    const approvalData = approvalDoc.data();
    const approvalRef = approvalDoc.ref;

    // Normalisierung
    if (approvalData.recipients && !Array.isArray(approvalData.recipients)) {
      approvalData.recipients = Object.values(approvalData.recipients);
    } else if (!approvalData.recipients) {
      approvalData.recipients = [];
    }

    switch (action) {
      case 'markAsViewed':
        await handleMarkAsViewed(approvalRef, approvalData);
        break;

      case 'approve':
        await handleApprove(approvalRef, approvalData, body);
        break;

      case 'requestChanges':
        await handleRequestChanges(approvalRef, approvalData, body);
        break;

      case 'updatePdfStatus':
        await handleUpdatePdfStatus(body);
        break;

      default:
        return NextResponse.json(
          { error: `Unbekannte Aktion: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Fehler bei Freigabe-Aktion:', error);
    return NextResponse.json(
      { error: error.message || 'Aktion konnte nicht ausgeführt werden.' },
      { status: 500 }
    );
  }
}

// ============================================
// Action Handlers
// ============================================

async function handleMarkAsViewed(
  approvalRef: FirebaseFirestore.DocumentReference,
  approvalData: FirebaseFirestore.DocumentData
) {
  const updates: Record<string, any> = {};

  // Analytics updaten
  if (!approvalData.analytics) {
    updates.analytics = {
      totalViews: 1,
      uniqueViews: 1,
      firstViewedAt: FieldValue.serverTimestamp(),
      lastViewedAt: FieldValue.serverTimestamp()
    };
  } else {
    updates['analytics.lastViewedAt'] = FieldValue.serverTimestamp();
    updates['analytics.totalViews'] = FieldValue.increment(1);

    if (!approvalData.analytics?.firstViewedAt) {
      updates['analytics.firstViewedAt'] = FieldValue.serverTimestamp();
      updates['analytics.uniqueViews'] = FieldValue.increment(1);
    }
  }

  // Recipient-Status updaten
  if (approvalData.recipients && approvalData.recipients.length > 0) {
    const recipientIndex = approvalData.recipients.findIndex(
      (r: any) => r.status === 'pending'
    );

    if (recipientIndex >= 0) {
      const recipient = { ...approvalData.recipients[recipientIndex] };
      recipient.status = 'viewed';
      recipient.viewedAt = Timestamp.now();
      updates[`recipients.${recipientIndex}`] = recipient;

      const allViewed = approvalData.recipients.every((r: any, i: number) =>
        i === recipientIndex ? true : r.status !== 'pending'
      );

      if (allViewed && approvalData.status === 'pending') {
        updates.status = 'in_review';
      }
    }
  }

  // History-Eintrag
  const historyEntry = {
    id: nanoid(),
    timestamp: Timestamp.now(),
    action: 'viewed',
    actorName: 'Anonym',
    details: {}
  };

  updates.history = FieldValue.arrayUnion(historyEntry);
  updates.updatedAt = FieldValue.serverTimestamp();

  await approvalRef.update(updates);
}

async function handleApprove(
  approvalRef: FirebaseFirestore.DocumentReference,
  approvalData: FirebaseFirestore.DocumentData,
  body: { authorName?: string; comment?: string; inlineComments?: any[] }
) {
  const updates: Record<string, any> = {
    status: 'approved',
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  const historyEntry = {
    id: nanoid(),
    timestamp: Timestamp.now(),
    action: 'approved',
    actorName: body.authorName || 'Kunde',
    actorEmail: 'public-access@freigabe.system',
    details: removeUndefined({
      previousStatus: approvalData.status,
      newStatus: 'approved',
      comment: body.comment,
      changes: body.inlineComments
        ? { inlineComments: body.inlineComments, publicAccess: true }
        : { publicAccess: true }
    })
  };

  updates.history = FieldValue.arrayUnion(historyEntry);

  await approvalRef.update(updates);

  // Campaign-Status auch aktualisieren
  if (approvalData.campaignId) {
    try {
      await adminDb.collection('pr_campaigns').doc(approvalData.campaignId).update({
        status: 'approved',
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch {
      // Nicht kritisch
    }

    // Benachrichtigung an internen User erstellen
    try {
      const campaignSnap = await adminDb.collection('pr_campaigns').doc(approvalData.campaignId).get();
      const campaign = campaignSnap.data();
      if (campaign) {
        await createNotification(
          campaign.userId,
          campaign.organizationId,
          'APPROVAL_GRANTED',
          'Freigabe erteilt',
          `${body.authorName || 'Kunde'} hat die Pressemitteilung "${campaign.title || 'Unbekannt'}" freigegeben.`,
          `/dashboard/pr-kampagnen/${approvalData.campaignId}`,
          {
            campaignId: approvalData.campaignId,
            campaignTitle: campaign.title,
            senderName: body.authorName || 'Kunde'
          }
        );
      }
    } catch {
      // Notification-Fehler nicht kritisch
    }
  }
}

async function handleRequestChanges(
  approvalRef: FirebaseFirestore.DocumentReference,
  approvalData: FirebaseFirestore.DocumentData,
  body: { comment: string; authorName?: string; recipientEmail?: string; inlineComments?: any[] }
) {
  if (!body.comment?.trim()) {
    throw new Error('Kommentar ist erforderlich');
  }

  const updates: Record<string, any> = {
    status: 'changes_requested',
    updatedAt: FieldValue.serverTimestamp()
  };

  const historyEntry = {
    id: nanoid(),
    timestamp: Timestamp.now(),
    action: 'changes_requested',
    actorName: body.authorName || 'Kunde',
    actorEmail: body.recipientEmail || 'public-access@freigabe.system',
    details: removeUndefined({
      comment: body.comment.trim(),
      previousStatus: approvalData.status,
      newStatus: 'changes_requested',
      changes: body.inlineComments
        ? { inlineComments: body.inlineComments, publicAccess: true }
        : { publicAccess: true }
    })
  };

  updates.history = FieldValue.arrayUnion(historyEntry);

  await approvalRef.update(updates);

  // Benachrichtigung an internen User erstellen
  try {
    const campaignSnap = await adminDb.collection('pr_campaigns').doc(approvalData.campaignId).get();
    const campaign = campaignSnap.data();
    if (campaign) {
      await createNotification(
        campaign.userId,
        campaign.organizationId,
        'CHANGES_REQUESTED',
        'Änderungen erbeten',
        `${body.authorName || 'Kunde'} hat Änderungen zur Pressemitteilung "${campaign.title || 'Unbekannt'}" angefordert.`,
        `/dashboard/pr-kampagnen/${approvalData.campaignId}`,
        {
          campaignId: approvalData.campaignId,
          campaignTitle: campaign.title,
          senderName: body.authorName || 'Kunde'
        }
      );
    }
  } catch {
    // Notification-Fehler nicht kritisch
  }

  // Inbox-Thread erstellen
  try {
    await createInboxThread(approvalData, body);
  } catch {
    // Inbox-Fehler nicht kritisch
  }
}

async function handleUpdatePdfStatus(
  body: { pdfVersionId: string; status: string }
) {
  if (!body.pdfVersionId || !body.status) {
    throw new Error('pdfVersionId und status sind erforderlich');
  }

  await adminDb.collection('pdf_versions').doc(body.pdfVersionId).update({
    status: body.status,
    updatedAt: FieldValue.serverTimestamp()
  });
}

// ============================================
// Helper Functions
// ============================================

async function loadBrandingSettings(
  db: FirebaseFirestore.Firestore,
  organizationId: string
): Promise<any | null> {
  if (!organizationId) return null;

  try {
    // Direkt per ID
    const docSnap = await db.collection('branding_settings').doc(organizationId).get();
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() };
    }

    // Fallback: Query
    const querySnap = await db
      .collection('branding_settings')
      .where('organizationId', '==', organizationId)
      .limit(1)
      .get();

    if (!querySnap.empty) {
      const doc = querySnap.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    return null;
  } catch {
    return null;
  }
}

async function loadTeamMember(
  db: FirebaseFirestore.Firestore,
  organizationId: string,
  userId: string
): Promise<any | null> {
  if (!organizationId || !userId) return null;

  try {
    const snap = await db
      .collection('team_members')
      .where('organizationId', '==', organizationId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch {
    return null;
  }
}

/**
 * Konvertiert Firestore Timestamps zu serialisierbaren Objekten
 */
function serializeFirestoreData(data: any): any {
  if (data === null || data === undefined) return data;

  // Firestore Timestamp (Admin SDK)
  if (data instanceof Timestamp) {
    return {
      _seconds: data.seconds,
      _nanoseconds: data.nanoseconds,
      toDate: undefined // wird client-seitig rekonstruiert
    };
  }

  // Timestamp-like Objekte (mit seconds/nanoseconds)
  if (data && typeof data === 'object' && '_seconds' in data && '_nanoseconds' in data) {
    return {
      _seconds: data._seconds,
      _nanoseconds: data._nanoseconds
    };
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeFirestoreData(value);
    }
    return result;
  }

  return data;
}

function removeUndefined(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Erstellt eine Benachrichtigung für einen internen User via Admin SDK
 */
async function createNotification(
  userId: string,
  organizationId: string,
  type: string,
  title: string,
  message: string,
  linkUrl: string,
  metadata: Record<string, any>
) {
  const notificationRef = adminDb.collection('notifications').doc();
  await notificationRef.set({
    id: notificationRef.id,
    userId,
    organizationId,
    type,
    title,
    message,
    linkUrl,
    linkType: 'campaign',
    linkId: metadata.campaignId,
    isRead: false,
    metadata,
    createdAt: FieldValue.serverTimestamp()
  });
}

/**
 * Erstellt einen Inbox-Thread für die Kommunikation via Admin SDK
 */
async function createInboxThread(
  approvalData: FirebaseFirestore.DocumentData,
  body: { comment: string; authorName?: string; recipientEmail?: string }
) {
  if (!approvalData.campaignId) return;

  const campaignSnap = await adminDb.collection('pr_campaigns').doc(approvalData.campaignId).get();
  const campaign = campaignSnap.data();
  if (!campaign) return;

  const threadRef = adminDb.collection('inbox_threads').doc();
  await threadRef.set({
    id: threadRef.id,
    organizationId: campaign.organizationId || '',
    subject: `Freigabe: ${campaign.title || 'Pressemitteilung'}`,
    participants: [
      {
        userId: 'customer',
        name: body.authorName || 'Kunde',
        email: body.recipientEmail || '',
        role: 'customer',
        joinedAt: FieldValue.serverTimestamp()
      }
    ],
    type: 'approval_feedback',
    relatedEntityType: 'approval',
    relatedEntityId: approvalData.shareId,
    status: 'active',
    priority: 'normal',
    tags: ['freigabe', 'feedback'],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
    messageCount: 1,
    unreadCount: 1
  });

  // Initiale Nachricht erstellen
  const messageRef = adminDb.collection('inbox_messages').doc();
  await messageRef.set({
    id: messageRef.id,
    threadId: threadRef.id,
    organizationId: campaign.organizationId || '',
    content: body.comment,
    sender: {
      userId: 'customer',
      name: body.authorName || 'Kunde',
      email: body.recipientEmail || ''
    },
    type: 'message',
    createdAt: FieldValue.serverTimestamp()
  });
}
