/**
 * DELETE/PATCH /api/v1/messages/[messageId] - Message Management API Routes
 *
 * DELETE Features:
 * - Permission Check (nur eigene Messages)
 * - Time-Limit (15min nach Erstellung)
 * - Soft-Delete für Audit
 * - Audit-Logs
 *
 * PATCH Features:
 * - Permission Check (nur eigene Messages)
 * - Time-Limit (15min nach Erstellung)
 * - Edit-History speichern
 * - Content-Moderation
 * - Audit-Logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin-init';

// Time-Limit für Edits/Deletes (15 Minuten)
const EDIT_DELETE_TIME_LIMIT = 15 * 60 * 1000; // 15min in ms

// Profanity Filter (gleich wie in POST route)
const PROFANITY_LIST = [
  'fuck', 'shit', 'asshole', 'bitch', 'damn',
  'scheiße', 'arschloch', 'fick'
];

function containsProfanity(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return PROFANITY_LIST.some(word => lowerContent.includes(word));
}

async function createAuditLog(data: {
  userId: string;
  action: string;
  projectId: string;
  messageId: string;
  details: any;
}) {
  await adminDb.collection('audit-logs').add({
    ...data,
    timestamp: new Date(),
    type: 'team-chat'
  });
}

/**
 * DELETE /api/v1/messages/[messageId]
 * Löscht eine Message (mit Permission-Check + Time-Limit)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    // 1. Authentifizierung (Firebase ID Token)
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
    const { messageId } = params;

    // 2. Query-Parameter für projectId
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId query parameter' },
        { status: 400 }
      );
    }

    // 3. Message laden
    const messageRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('teamMessages')
      .doc(messageId);

    const messageDoc = await messageRef.get();

    if (!messageDoc.exists) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const message = messageDoc.data();

    // 4. Permission-Check (nur eigene Messages)
    if (message?.authorId !== userId) {
      await createAuditLog({
        userId,
        action: 'message_delete_unauthorized',
        projectId,
        messageId,
        details: { reason: 'Not message author' }
      });

      return NextResponse.json(
        { error: 'Forbidden. You can only delete your own messages.' },
        { status: 403 }
      );
    }

    // 5. Time-Limit Check (15min)
    const messageAge = Date.now() - message.timestamp.toDate().getTime();
    if (messageAge > EDIT_DELETE_TIME_LIMIT) {
      return NextResponse.json(
        { error: 'Time limit exceeded. Messages can only be deleted within 15 minutes.' },
        { status: 403 }
      );
    }

    // 6. Soft-Delete (für Audit)
    await messageRef.update({
      deleted: true,
      deletedAt: new Date(),
      deletedBy: userId
    });

    // Alternative: Hard-Delete
    // await messageRef.delete();

    // 7. Audit-Log
    await createAuditLog({
      userId,
      action: 'message_deleted',
      projectId,
      messageId,
      details: {
        content: message.content?.substring(0, 100),
        messageAge: Math.floor(messageAge / 1000) // in Sekunden
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/v1/messages/[messageId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/messages/[messageId]
 * Bearbeitet eine Message (mit Permission-Check + Time-Limit + Edit-History)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    // 1. Authentifizierung (Firebase ID Token)
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
    const { messageId } = params;

    // 2. Request Body
    const body = await request.json();
    const { projectId, newContent } = body;

    if (!projectId || !newContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 3. Content-Moderation
    if (containsProfanity(newContent)) {
      await createAuditLog({
        userId,
        action: 'message_edit_profanity_blocked',
        projectId,
        messageId,
        details: { content: newContent.substring(0, 100) }
      });

      return NextResponse.json(
        { error: 'Message contains inappropriate content' },
        { status: 400 }
      );
    }

    // 4. Message laden
    const messageRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('teamMessages')
      .doc(messageId);

    const messageDoc = await messageRef.get();

    if (!messageDoc.exists) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const message = messageDoc.data();

    // 5. Permission-Check (nur eigene Messages)
    if (message?.authorId !== userId) {
      await createAuditLog({
        userId,
        action: 'message_edit_unauthorized',
        projectId,
        messageId,
        details: { reason: 'Not message author' }
      });

      return NextResponse.json(
        { error: 'Forbidden. You can only edit your own messages.' },
        { status: 403 }
      );
    }

    // 6. Time-Limit Check (15min)
    const messageAge = Date.now() - message.timestamp.toDate().getTime();
    if (messageAge > EDIT_DELETE_TIME_LIMIT) {
      return NextResponse.json(
        { error: 'Time limit exceeded. Messages can only be edited within 15 minutes.' },
        { status: 403 }
      );
    }

    // 7. Edit-History aufbauen
    const editHistory = message.editHistory || [];
    editHistory.push({
      previousContent: message.content,
      editedAt: new Date(),
      editedBy: userId
    });

    // 8. Message aktualisieren
    await messageRef.update({
      content: newContent,
      edited: true,
      editedAt: new Date(),
      editHistory
    });

    // 9. Audit-Log
    await createAuditLog({
      userId,
      action: 'message_edited',
      projectId,
      messageId,
      details: {
        previousContent: message.content?.substring(0, 100),
        newContent: newContent.substring(0, 100),
        messageAge: Math.floor(messageAge / 1000)
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in PATCH /api/v1/messages/[messageId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
