// src/app/api/public/approval/[shareId]/route.ts
// Öffentliche API-Route für Kunden-Freigabe (kein Auth erforderlich)
// Nutzt Admin SDK um Firestore Security Rules zu umgehen

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import sgMail from '@sendgrid/mail';

// SendGrid konfigurieren
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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
  const approverName = body.authorName || 'Kunde';

  const updates: Record<string, any> = {
    status: 'approved',
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  const historyEntry = {
    id: nanoid(),
    timestamp: Timestamp.now(),
    action: 'approved',
    actorName: approverName,
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

  // Campaign-Status und Lock aktualisieren
  if (approvalData.campaignId) {
    try {
      await adminDb.collection('pr_campaigns').doc(approvalData.campaignId).update({
        status: 'approved',
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch {
      // Nicht kritisch
    }

    // Campaign-Daten laden (für Notification + Email)
    let campaign: FirebaseFirestore.DocumentData | undefined;
    try {
      const campaignSnap = await adminDb.collection('pr_campaigns').doc(approvalData.campaignId).get();
      campaign = campaignSnap.data();
    } catch {
      // Nicht kritisch
    }

    if (campaign) {
      // Alle aktiven Team-Mitglieder laden
      const teamMembers = await loadActiveTeamMembers(campaign.organizationId);

      // Glocken-Benachrichtigung an alle Team-Mitglieder
      try {
        await createTeamNotifications(
          teamMembers,
          campaign.organizationId,
          'APPROVAL_GRANTED',
          'Freigabe erteilt',
          `${approverName} hat die Pressemitteilung "${campaign.title || 'Unbekannt'}" freigegeben.`,
          `/dashboard/projects/${campaign.projectId || approvalData.campaignId}`,
          {
            campaignId: approvalData.campaignId,
            campaignTitle: campaign.title,
            senderName: approverName
          }
        );
      } catch {
        // Notification-Fehler nicht kritisch
      }

      // Email-Benachrichtigung an alle Team-Mitglieder
      try {
        await sendTeamApprovalEmails(
          teamMembers,
          campaign.organizationId,
          'approved',
          approverName,
          approvalData.campaignTitle || campaign.title || 'Pressemitteilung',
          approvalData.clientName || campaign.clientName || 'Unbekannt',
          approvalData.campaignId,
          approvalData.shareId,
          campaign.projectId
        );
      } catch (emailError) {
        console.error('Email-Versand fehlgeschlagen (approve):', emailError);
      }

      // Inbox-Thread aktualisieren (System-Nachricht)
      try {
        await addInboxSystemMessage(
          approvalData,
          campaign.organizationId,
          `✅ **Freigabe erhalten**\n\nDie Kampagne "${campaign.title || 'Pressemitteilung'}" wurde von ${approverName} freigegeben.\n\nDie Kampagne kann nun versendet werden.`
        );
      } catch {
        // Inbox-Fehler nicht kritisch
      }
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

  const reviewerName = body.authorName || 'Kunde';
  const feedback = body.comment.trim();

  const updates: Record<string, any> = {
    status: 'changes_requested',
    updatedAt: FieldValue.serverTimestamp()
  };

  const historyEntry = {
    id: nanoid(),
    timestamp: Timestamp.now(),
    action: 'changes_requested',
    actorName: reviewerName,
    actorEmail: body.recipientEmail || 'public-access@freigabe.system',
    details: removeUndefined({
      comment: feedback,
      previousStatus: approvalData.status,
      newStatus: 'changes_requested',
      changes: body.inlineComments
        ? { inlineComments: body.inlineComments, publicAccess: true }
        : { publicAccess: true }
    })
  };

  updates.history = FieldValue.arrayUnion(historyEntry);

  await approvalRef.update(updates);

  // Campaign laden und Lock-Status aktualisieren
  let campaign: FirebaseFirestore.DocumentData | undefined;
  try {
    const campaignSnap = await adminDb.collection('pr_campaigns').doc(approvalData.campaignId).get();
    campaign = campaignSnap.data();
  } catch {
    // Nicht kritisch
  }

  // Campaign-Lock lösen (Kampagne wird wieder bearbeitbar)
  if (approvalData.campaignId) {
    try {
      await adminDb.collection('pr_campaigns').doc(approvalData.campaignId).update({
        status: 'changes_requested',
        editLocked: false,
        editLockedReason: FieldValue.delete(),
        lockedBy: FieldValue.delete(),
        unlockedAt: FieldValue.serverTimestamp(),
        lastUnlockedBy: {
          userId: 'system',
          displayName: 'Freigabe-System',
          reason: 'Änderung angefordert'
        },
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch {
      // Nicht kritisch
    }
  }

  if (campaign) {
    // Alle aktiven Team-Mitglieder laden
    const teamMembers = await loadActiveTeamMembers(campaign.organizationId);

    // Glocken-Benachrichtigung an alle Team-Mitglieder
    try {
      await createTeamNotifications(
        teamMembers,
        campaign.organizationId,
        'CHANGES_REQUESTED',
        'Änderungen erbeten',
        `${reviewerName} hat Änderungen zur Pressemitteilung "${campaign.title || 'Unbekannt'}" angefordert.`,
        `/dashboard/projects/${campaign.projectId || approvalData.campaignId}`,
        {
          campaignId: approvalData.campaignId,
          campaignTitle: campaign.title,
          senderName: reviewerName
        }
      );
    } catch {
      // Notification-Fehler nicht kritisch
    }

    // Email-Benachrichtigung an alle Team-Mitglieder
    try {
      await sendTeamApprovalEmails(
        teamMembers,
        campaign.organizationId,
        'changes_requested',
        reviewerName,
        approvalData.campaignTitle || campaign.title || 'Pressemitteilung',
        approvalData.clientName || campaign.clientName || 'Unbekannt',
        approvalData.campaignId,
        approvalData.shareId,
        campaign.projectId,
        feedback,
        body.inlineComments
      );
    } catch (emailError) {
      console.error('Email-Versand fehlgeschlagen (requestChanges):', emailError);
    }

    // Inbox-Thread aktualisieren (System-Nachricht)
    try {
      await addInboxSystemMessage(
        approvalData,
        campaign.organizationId,
        `🔄 **Änderungen angefordert**\n\nDer Kunde ${reviewerName} hat Änderungen zur Kampagne "${campaign.title || 'Pressemitteilung'}" angefordert.\n\n**Feedback:**\n${feedback}${body.inlineComments?.length ? `\n\n**Inline-Kommentare:** ${body.inlineComments.length}` : ''}\n\nDie Kampagne kann nun bearbeitet werden.`
      );
    } catch {
      // Inbox-Fehler nicht kritisch
    }
  }

  // Inbox-Thread erstellen (Kunden-Nachricht)
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
 * Lädt alle aktiven Team-Mitglieder einer Organisation via Admin SDK
 */
async function loadActiveTeamMembers(
  organizationId: string
): Promise<Array<{ userId: string; email: string; displayName: string }>> {
  if (!organizationId) return [];

  try {
    const snap = await adminDb
      .collection('team_members')
      .where('organizationId', '==', organizationId)
      .where('status', '==', 'active')
      .get();

    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        userId: data.userId,
        email: data.email || '',
        displayName: data.displayName || ''
      };
    });
  } catch {
    return [];
  }
}

/**
 * Prüft ob eine Notification für einen User aktiviert ist (Admin SDK)
 * Lookup-Reihenfolge: org-spezifisch -> legacy -> Default (aktiviert)
 */
async function isNotificationEnabledAdmin(
  userId: string,
  type: string,
  organizationId: string
): Promise<boolean> {
  try {
    // Erst org-spezifische Settings
    let settingsDoc = await adminDb
      .collection('notification_settings')
      .doc(`${organizationId}_${userId}`)
      .get();

    // Fallback: Legacy-Settings ohne Org-Prefix
    if (!settingsDoc.exists) {
      settingsDoc = await adminDb
        .collection('notification_settings')
        .doc(userId)
        .get();
    }

    // Kein Settings-Dokument = Default: alle aktiviert
    if (!settingsDoc.exists) return true;

    const settings = settingsDoc.data();
    if (type === 'APPROVAL_GRANTED') return settings?.approvalGranted !== false;
    if (type === 'CHANGES_REQUESTED') return settings?.changesRequested !== false;
    return true;
  } catch {
    // Bei Fehler: Default aktiviert
    return true;
  }
}

/**
 * Erstellt Glocken-Benachrichtigungen für alle Team-Mitglieder via Admin SDK
 * Prüft pro User die Notification-Settings
 */
async function createTeamNotifications(
  teamMembers: Array<{ userId: string }>,
  organizationId: string,
  type: string,
  title: string,
  message: string,
  linkUrl: string,
  metadata: Record<string, any>
) {
  if (teamMembers.length === 0) return;

  const batch = adminDb.batch();
  let count = 0;

  for (const member of teamMembers) {
    const enabled = await isNotificationEnabledAdmin(member.userId, type, organizationId);
    if (!enabled) continue;

    const ref = adminDb.collection('notifications').doc();
    batch.set(ref, {
      id: ref.id,
      userId: member.userId,
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
    count++;
  }

  if (count > 0) {
    await batch.commit();
  }
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

/**
 * Lädt die Standard-Email-Adresse einer Organisation via Admin SDK
 */
async function loadOrganizationEmailAddress(
  organizationId: string
): Promise<{ email: string; id: string; localPart: string; organizationId: string } | null> {
  if (!organizationId) return null;

  try {
    const snap = await adminDb
      .collection('email_addresses')
      .where('organizationId', '==', organizationId)
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      localPart: data.localPart || data.email?.split('@')[0] || '',
      organizationId: data.organizationId
    };
  } catch {
    return null;
  }
}

/**
 * Sendet Email-Benachrichtigungen an alle Team-Mitglieder via SendGrid
 */
async function sendTeamApprovalEmails(
  teamMembers: Array<{ userId: string; email: string; displayName: string }>,
  organizationId: string,
  type: 'approved' | 'changes_requested',
  actorName: string,
  campaignTitle: string,
  clientName: string,
  campaignId: string,
  shareId: string,
  projectId?: string,
  feedback?: string,
  inlineComments?: any[]
): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY nicht konfiguriert - Email-Versand übersprungen');
    return;
  }

  // Nur Team-Mitglieder mit gültiger Email-Adresse
  const recipients = teamMembers.filter(m => m.email && m.email.includes('@'));
  if (recipients.length === 0) {
    console.warn('Keine Team-Mitglieder mit Email-Adresse gefunden');
    return;
  }

  const emailAddress = await loadOrganizationEmailAddress(organizationId);
  if (!emailAddress) {
    console.warn('Keine Standard-Email-Adresse für Organisation gefunden:', organizationId);
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.celeropress.com';
  const projectUrl = `${baseUrl}/dashboard/projects/${projectId || campaignId}`;

  let subject: string;
  let htmlContent: string;

  if (type === 'approved') {
    subject = `Freigabe erhalten: ${campaignTitle}`;
    htmlContent = `
      <h2>Freigabe erhalten</h2>
      <p><strong>Kampagne:</strong> ${campaignTitle}</p>
      <p><strong>Kunde:</strong> ${clientName}</p>
      <p><strong>Freigegeben von:</strong> ${actorName}</p>
      <p><strong>Status:</strong> Freigegeben</p>

      <p>Die Kampagne kann nun versendet werden.</p>

      <p><a href="${projectUrl}" style="display:inline-block;padding:10px 20px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;">Projekt öffnen</a></p>
    `;
  } else {
    subject = `Änderungen angefordert: ${campaignTitle}`;
    htmlContent = `
      <h2>Änderungen angefordert</h2>
      <p><strong>Kampagne:</strong> ${campaignTitle}</p>
      <p><strong>Kunde:</strong> ${clientName}</p>
      <p><strong>Änderungen von:</strong> ${actorName}</p>

      <h3>Feedback:</h3>
      <p>${feedback || 'Keine spezifischen Kommentare'}</p>

      ${inlineComments && inlineComments.length > 0 ? `<p><strong>Inline-Kommentare:</strong> ${inlineComments.length}</p>` : ''}

      <p>Die Kampagne kann nun bearbeitet werden.</p>

      <p><a href="${projectUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Projekt öffnen</a></p>
    `;
  }

  // An jeden Empfänger einzeln senden (personalisiert)
  const sendPromises = recipients.map(async (recipient) => {
    try {
      const msg = {
        to: { email: recipient.email, name: recipient.displayName || 'Team-Mitglied' },
        from: { email: emailAddress.email, name: 'CeleroPress' },
        subject,
        html: htmlContent,
        text: htmlContent.replace(/<[^>]*>/g, ''),
        customArgs: {
          type: 'approval_notification',
          approval_type: type,
          campaign_id: campaignId,
          organization_id: organizationId
        }
      };
      await sgMail.send(msg);
    } catch (err) {
      console.error(`Email-Versand an ${recipient.email} fehlgeschlagen:`, err);
    }
  });

  await Promise.all(sendPromises);
  console.log(`Approval-Emails gesendet: ${type} an ${recipients.length} Team-Mitglieder für Kampagne ${campaignId}`);
}

/**
 * Fügt eine System-Nachricht zum bestehenden Inbox-Thread hinzu
 */
async function addInboxSystemMessage(
  approvalData: FirebaseFirestore.DocumentData,
  organizationId: string,
  content: string
): Promise<void> {
  // Bestehenden Thread suchen
  const threadSnap = await adminDb
    .collection('inbox_threads')
    .where('relatedEntityId', '==', approvalData.shareId)
    .where('relatedEntityType', '==', 'approval')
    .limit(1)
    .get();

  if (threadSnap.empty) return;

  const thread = threadSnap.docs[0];

  // System-Nachricht hinzufügen
  const messageRef = adminDb.collection('inbox_messages').doc();
  await messageRef.set({
    id: messageRef.id,
    threadId: thread.id,
    organizationId,
    content,
    sender: {
      userId: 'system',
      name: 'System',
      email: 'system@celeropress.com'
    },
    type: 'status_change',
    createdAt: FieldValue.serverTimestamp()
  });

  // Thread updaten
  await thread.ref.update({
    updatedAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
    messageCount: FieldValue.increment(1),
    unreadCount: FieldValue.increment(1)
  });
}
