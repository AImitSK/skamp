/**
 * POST /api/v1/messages - Message Sending API Route
 *
 * Features:
 * - Server-Side Validation
 * - Rate-Limiting (10 messages/minute)
 * - Content-Moderation (Profanity Filter)
 * - Mention-Validation (nur Team-Members)
 * - Audit-Logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin-init';

// Rate-Limiting Cache (In-Memory für jetzt, später Redis)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

// Profanity Filter - Einfache Liste (später erweitern)
const PROFANITY_LIST = [
  'fuck', 'shit', 'asshole', 'bitch', 'damn',
  // Deutsche Wörter
  'scheiße', 'arschloch', 'fick'
];

/**
 * Rate-Limiting Check
 * Limit: 10 Messages pro Minute pro User/Project
 */
function checkRateLimit(userId: string, projectId: string): boolean {
  const key = `${userId}:${projectId}`;
  const now = Date.now();
  const limit = rateLimitCache.get(key);

  if (!limit || now > limit.resetAt) {
    // Neues Limit-Window
    rateLimitCache.set(key, {
      count: 1,
      resetAt: now + 60000 // 1 Minute
    });
    return true;
  }

  if (limit.count >= 10) {
    return false; // Rate-Limit erreicht
  }

  // Inkrementiere Counter
  limit.count++;
  return true;
}

/**
 * Content-Moderation (Profanity Filter)
 */
function containsProfanity(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return PROFANITY_LIST.some(word => lowerContent.includes(word));
}

/**
 * Audit-Log erstellen
 */
async function createAuditLog(data: {
  userId: string;
  action: string;
  projectId: string;
  details: any;
}) {
  await adminDb.collection('audit-logs').add({
    ...data,
    timestamp: new Date(),
    type: 'team-chat'
  });
}

/**
 * POST /api/v1/messages
 * Sendet eine neue Team-Chat Message
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentifizierung prüfen (Firebase ID Token)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // 2. Request Body parsen
    const body = await request.json();
    const {
      projectId,
      content,
      authorId,
      authorName,
      authorPhotoUrl,
      organizationId,
      mentions = []
    } = body;

    // 3. Validierung
    if (!projectId || !content || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prüfe User-ID Übereinstimmung
    if (authorId !== userId) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    // 4. Rate-Limiting
    if (!checkRateLimit(userId, projectId)) {
      await createAuditLog({
        userId,
        action: 'message_rate_limited',
        projectId,
        details: { content: content.substring(0, 100) }
      });

      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 messages per minute.' },
        { status: 429 }
      );
    }

    // 5. Content-Moderation
    if (containsProfanity(content)) {
      await createAuditLog({
        userId,
        action: 'message_profanity_blocked',
        projectId,
        details: { content: content.substring(0, 100) }
      });

      return NextResponse.json(
        { error: 'Message contains inappropriate content' },
        { status: 400 }
      );
    }

    // 6. Team-Membership prüfen
    const projectDoc = await adminDb
      .collection('projects')
      .doc(projectId)
      .get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = projectDoc.data();

    // Hole TeamMember-Eintrag des Users um die Document ID zu ermitteln
    // HINTERGRUND: project.assignedTo kann sowohl Firebase Auth UIDs als auch
    // TeamMember Document IDs enthalten (Inkonsistenz im System)
    let teamMemberDocId: string | null = null;
    try {
      const teamMemberSnapshot = await adminDb
        .collection('team_members')
        .where('organizationId', '==', organizationId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!teamMemberSnapshot.empty) {
        teamMemberDocId = teamMemberSnapshot.docs[0].id;
      }
    } catch (error) {
      console.warn('Could not fetch team member:', error);
    }

    // Prüfe Team-Membership mit allen möglichen ID-Varianten
    const assignedTo = project?.assignedTo || [];
    const isTeamMember =
      // Check mit Firebase Auth UID
      assignedTo.includes(userId) ||
      // Check mit TeamMember Document ID (falls vorhanden)
      (teamMemberDocId && assignedTo.includes(teamMemberDocId)) ||
      // Check ob User der Projekt-Ersteller ist
      project?.userId === userId ||
      (teamMemberDocId && project?.userId === teamMemberDocId) ||
      // Check ob User der Projekt-Manager ist
      project?.projectManager === userId ||
      (teamMemberDocId && project?.projectManager === teamMemberDocId);

    if (!isTeamMember) {
      await createAuditLog({
        userId,
        action: 'message_unauthorized_team',
        projectId,
        details: { reason: 'Not a team member' }
      });

      return NextResponse.json(
        { error: 'Not authorized. User is not a team member.' },
        { status: 403 }
      );
    }

    // 7. Mention-Validation (optional)
    if (mentions.length > 0) {
      const teamMembers = await adminDb
        .collection('team-members')
        .where('organizationId', '==', organizationId)
        .get();

      const memberNames = teamMembers.docs.map(doc => doc.data().displayName);
      const invalidMentions = mentions.filter(
        (mention: string) => !memberNames.includes(mention)
      );

      if (invalidMentions.length > 0) {
        console.warn('Invalid mentions detected:', invalidMentions);
        // Warnung, aber nicht blockieren
      }
    }

    // 8. Message in Firestore speichern
    const messageRef = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('teamMessages')
      .add({
        content,
        authorId,
        authorName,
        authorPhotoUrl,
        organizationId,
        mentions,
        timestamp: new Date(),
        edited: false,
        reactions: []
      });

    // 9. Audit-Log
    await createAuditLog({
      userId,
      action: 'message_created',
      projectId,
      details: {
        messageId: messageRef.id,
        mentionsCount: mentions.length
      }
    });

    // 10. Erfolgreich
    return NextResponse.json({
      success: true,
      messageId: messageRef.id
    });

  } catch (error) {
    console.error('Error in POST /api/v1/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
