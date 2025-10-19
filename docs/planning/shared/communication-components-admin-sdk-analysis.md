# Admin SDK Analyse: Communication Components Refactoring

**Datum:** 2025-10-19
**Kontext:** Erste Implementierung ohne Admin SDK - jetzt Refactoring-Chance
**Status:** 🔍 Analyse

---

## 🎯 Executive Summary

**Empfehlung:** ✅ **Admin SDK sollte für 6 kritische Operationen verwendet werden**

**Priorisierung:**
1. 🔴 **KRITISCH:** Message Deletion & Editing (Security + Audit)
2. 🔴 **KRITISCH:** Message Sending Validation (Spam + Rate-Limiting)
3. 🟡 **HOCH:** Multi-Tenancy Permission Checks (Security)
4. 🟡 **HOCH:** Attachment Validation (Security)
5. 🟢 **MITTEL:** Mention Validation (User-Experience)
6. 🟢 **MITTEL:** Bulk Message Operations (Performance)

**Impact:**
- **Sicherheit:** ↑↑↑ (Massive Verbesserung)
- **Spam-Prevention:** ↑↑↑ (Rate-Limiting + Content-Moderation)
- **Compliance:** ↑↑↑ (Audit-Logs, GDPR-Ready)
- **Performance:** ↑↑ (Bei Bulk-Operations)
- **Code Quality:** ↑↑ (Server-Side Validation)
- **Complexity:** ↓ (Weniger Client-Side Logic)

---

## 📊 Aktuelle Architektur (ohne Admin SDK)

### Problematische Client-Side Operationen

#### ❌ PROBLEM 1: Client-Side Message Deletion

```typescript
// src/lib/firebase/team-chat-service.ts
async deleteMessage(
  projectId: string,
  messageId: string
): Promise<void> {
  try {
    // ⚠️ Client-Side Firestore-Delete - KEINE VALIDIERUNG!
    const messageRef = doc(db, 'projects', projectId, 'teamMessages', messageId);
    await deleteDoc(messageRef);

    console.log('Nachricht gelöscht:', messageId);
  } catch (error) {
    console.error('Fehler beim Löschen der Nachricht:', error);
    throw error;
  }
}
```

**Sicherheitsrisiken:**
- ❌ User könnte `messageId` manipulieren → fremde Messages löschen
- ❌ Keine Validierung ob Message zu User gehört
- ❌ Keine Validierung ob User Delete-Permission hat (Admin-Only?)
- ❌ Kein Audit-Log (wer hat was wann gelöscht?)
- ❌ Keine Retention-Policy (Messages sollten vielleicht nur "archived" werden)

#### ❌ PROBLEM 2: Client-Side Message Editing

```typescript
// src/lib/firebase/team-chat-service.ts
async editMessage(
  projectId: string,
  messageId: string,
  newContent: string
): Promise<void> {
  try {
    // ⚠️ Client-Side Update - KEINE VALIDIERUNG!
    const messageRef = doc(db, 'projects', projectId, 'teamMessages', messageId);
    await updateDoc(messageRef, {
      content: newContent,
      edited: true,
      editedAt: serverTimestamp()
    });

    console.log('Nachricht bearbeitet:', messageId);
  } catch (error) {
    console.error('Fehler beim Bearbeiten der Nachricht:', error);
    throw error;
  }
}
```

**Sicherheitsrisiken:**
- ❌ User könnte fremde Messages bearbeiten
- ❌ Keine Validierung ob Message zu User gehört
- ❌ Kein Edit-History (für Compliance/Audit)
- ❌ Keine Content-Moderation (Beleidigungen, Spam)
- ❌ Kein Time-Limit (Message sollte nur X Minuten nach Senden editierbar sein)

#### ❌ PROBLEM 3: Client-Side Message Sending (ohne Validation)

```typescript
// src/lib/firebase/team-chat-service.ts
async sendMessage(
  projectId: string,
  message: Omit<TeamMessage, 'id' | 'timestamp' | 'projectId'>
): Promise<string> {
  try {
    const messagesRef = this.getMessagesCollection(projectId);

    // ⚠️ KEINE VALIDIERUNG:
    // - Ist User Team-Member?
    // - Rate-Limiting (Spam-Prevention)?
    // - Content-Moderation?
    // - Attachment-Validation?
    // - Mention-Validation?

    const docRef = await addDoc(messagesRef, {
      ...message,
      projectId,
      timestamp: serverTimestamp(),
      edited: false
    });

    console.log('Team-Chat Nachricht gesendet:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
    throw error;
  }
}
```

**Sicherheitsrisiken:**
- ❌ **Spam-Risk:** Keine Rate-Limiting (User könnte 1000 Messages/Sekunde senden)
- ❌ **Team-Check:** Keine Validierung ob User zu Projekt gehört
- ❌ **Content-Moderation:** Keine Filterung von beleidigenden Inhalten
- ❌ **Attachment-Validation:** Keine Prüfung ob Attachments zu Organization gehören
- ❌ **Mention-Validation:** Keine Prüfung ob mentionierte User Team-Mitglieder sind
- ❌ **Quota-Management:** Keine Message-Limits pro Organization

#### ❌ PROBLEM 4: Multi-Tenancy ohne Server-Side Validation

```typescript
// src/components/projects/communication/TeamChat.tsx
useEffect(() => {
  const checkTeamMembership = async () => {
    if (!projectId || !userId || !organizationId) return;

    try {
      // ⚠️ Client-Side Team-Check (kann umgangen werden!)
      const [project, members] = await Promise.all([
        projectService.getById(projectId, { organizationId }),
        teamMemberService.getByOrganization(organizationId)
      ]);

      setTeamMembers(members);

      // Client-Side Validation...
      const currentMember = members.find(m => m.userId === userId);
      if (currentMember) {
        setIsTeamMember(true);
      }
    } catch (error) {
      console.error('Team-Check error:', error);
    }
  };

  checkTeamMembership();
}, [projectId, userId, organizationId]);
```

**Sicherheitsrisiken:**
- ❌ User könnte `organizationId` manipulieren → fremde Chats lesen
- ❌ Client-Side Team-Check kann umgangen werden (DevTools)
- ❌ Keine Server-Side Validierung bei Message-Fetch
- ❌ Firestore Security Rules allein reichen nicht (komplex, fehleranfällig)

#### ❌ PROBLEM 5: Reaction Toggle (komplex, client-side)

```typescript
// src/lib/firebase/team-chat-service.ts
async toggleReaction(
  projectId: string,
  messageId: string,
  emoji: string,
  userId: string,
  userName: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'projects', projectId, 'teamMessages', messageId);

    // ⚠️ Komplexe Client-Side Logik (Race Conditions!)
    const messageDoc = await getDocs(query(...));
    const currentMessage = messageDoc.docs[0].data() as TeamMessage;
    const currentReactions = currentMessage.reactions || [];

    // Komplexe Array-Manipulationen...
    let updatedReactions = currentReactions.map(reaction => ({
      ...reaction,
      userIds: reaction.userIds.filter(id => id !== userId),
      // ... mehr Logik
    }));

    // ⚠️ Race Condition: Was wenn 2 User gleichzeitig reagieren?
    await updateDoc(messageRef, {
      reactions: updatedReactions
    });
  } catch (error) {
    console.error('Fehler beim Toggle der Reaction:', error);
    throw error;
  }
}
```

**Probleme:**
- ❌ **Race Conditions:** 2 User gleichzeitig → Daten-Verlust
- ❌ **Komplexität:** Komplexe Client-Side Logik (schwer zu debuggen)
- ❌ **No Validation:** User könnte unbegrenzt viele Reactions hinzufügen
- ❌ **Performance:** Read-Then-Write Pattern ineffizient

---

## ✅ Empfohlene Admin SDK Integration

### 1. 🔴 KRITISCH: Message Deletion & Editing (API Route)

**Warum Admin SDK?**
- ✅ Server-Side Permission-Checks (nur eigene Messages editieren/löschen)
- ✅ Audit-Log für Compliance (wer hat was wann gelöscht/editiert)
- ✅ Edit-History (für Transparency)
- ✅ Time-Limits (Messages nur X Minuten nach Senden editierbar)
- ✅ Soft-Delete statt Hard-Delete (für Compliance)

#### API Route: `/api/v1/messages/[messageId]` (DELETE)

```typescript
// src/app/api/v1/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminDb } from '@/lib/firebase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    // 1. Authentifizierung
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { messageId } = params;
    const { projectId, organizationId } = await request.json();

    // 2. User's Organization validieren
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userOrganizationId = userDoc.data()?.organizationId;

    if (organizationId !== userOrganizationId) {
      return NextResponse.json(
        { error: 'Forbidden: Organization mismatch' },
        { status: 403 }
      );
    }

    // 3. Message abrufen
    const messageRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('teamMessages')
      .doc(messageId);

    const messageDoc = await messageRef.get();

    if (!messageDoc.exists) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const messageData = messageDoc.data();

    // 4. Permission-Check: Nur eigene Messages löschen (oder Admin)
    const userRole = userDoc.data()?.role || 'member';
    const isOwnMessage = messageData?.authorId === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwnMessage && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Can only delete own messages' },
        { status: 403 }
      );
    }

    // 5. Time-Limit Check (Optional: nur innerhalb 15 Minuten löschen)
    const messageTimestamp = messageData?.timestamp?.toDate();
    const now = new Date();
    const minutesSinceMessage = (now.getTime() - messageTimestamp.getTime()) / 1000 / 60;

    if (minutesSinceMessage > 15 && !isAdmin) {
      return NextResponse.json(
        { error: 'Cannot delete messages older than 15 minutes' },
        { status: 400 }
      );
    }

    // 6. Soft-Delete (für Compliance/Audit)
    await messageRef.update({
      deleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      // Optionally: Keep original content for audit
      _originalContent: messageData?.content,
      content: '[Nachricht gelöscht]'
    });

    // Alternative: Hard-Delete
    // await messageRef.delete();

    // 7. Audit-Log erstellen
    await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('audit_logs')
      .add({
        action: 'message_deleted',
        userId,
        messageId,
        messageContent: messageData?.content,
        timestamp: new Date(),
        projectId,
        organizationId,
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### API Route: `/api/v1/messages/[messageId]` (PATCH)

```typescript
// src/app/api/v1/messages/[messageId]/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    // ... Authentifizierung & Validation (wie oben)

    const { newContent, projectId, organizationId } = await request.json();

    // Content-Validation
    if (!newContent || newContent.trim().length === 0) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
    }

    if (newContent.length > 5000) {
      return NextResponse.json({ error: 'Content too long (max 5000 chars)' }, { status: 400 });
    }

    // Message abrufen
    const messageRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('teamMessages')
      .doc(messageId);

    const messageDoc = await messageRef.get();
    const messageData = messageDoc.data();

    // Permission-Check (nur eigene Messages)
    if (messageData?.authorId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Can only edit own messages' },
        { status: 403 }
      );
    }

    // Time-Limit (nur innerhalb 15 Minuten editierbar)
    const messageTimestamp = messageData?.timestamp?.toDate();
    const now = new Date();
    const minutesSinceMessage = (now.getTime() - messageTimestamp.getTime()) / 1000 / 60;

    if (minutesSinceMessage > 15) {
      return NextResponse.json(
        { error: 'Cannot edit messages older than 15 minutes' },
        { status: 400 }
      );
    }

    // Edit-History erstellen (für Audit)
    const editHistory = messageData?.editHistory || [];
    editHistory.push({
      previousContent: messageData?.content,
      editedAt: new Date(),
      editedBy: userId,
    });

    // Message aktualisieren
    await messageRef.update({
      content: newContent,
      edited: true,
      editedAt: new Date(),
      editHistory,
    });

    // Audit-Log
    await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('audit_logs')
      .add({
        action: 'message_edited',
        userId,
        messageId,
        previousContent: messageData?.content,
        newContent,
        timestamp: new Date(),
        projectId,
        organizationId,
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message edit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Vorteile:**
- ✅ **Sicherheit:** Nur eigene Messages editieren/löschen
- ✅ **Time-Limits:** Messages nur 15min editierbar
- ✅ **Audit:** Vollständige Edit-History
- ✅ **Compliance:** Soft-Delete für GDPR
- ✅ **Transparent:** Edit-History sichtbar

---

### 2. 🔴 KRITISCH: Message Sending Validation (API Route)

**Warum Admin SDK?**
- ✅ **Rate-Limiting:** Spam-Prevention (max X Messages/Minute)
- ✅ **Team-Validation:** Nur Team-Members können senden
- ✅ **Content-Moderation:** Profanity-Filter
- ✅ **Attachment-Validation:** Assets gehören zu Organization
- ✅ **Mention-Validation:** Nur Team-Members mentionieren
- ✅ **Quota-Management:** Message-Limits pro Organization

#### API Route: `/api/v1/messages` (POST)

```typescript
// src/app/api/v1/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminDb } from '@/lib/firebase/admin';

// Rate-Limiting (in-memory für Beispiel, besser: Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const MAX_MESSAGES_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute

export async function POST(request: NextRequest) {
  try {
    // 1. Authentifizierung
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const {
      projectId,
      organizationId,
      content,
      mentions,
      attachments,
    } = await request.json();

    // 2. Rate-Limiting Check
    const now = Date.now();
    const rateLimitKey = `${userId}:${projectId}`;
    const rateLimitData = rateLimitMap.get(rateLimitKey);

    if (rateLimitData) {
      if (now < rateLimitData.resetAt) {
        if (rateLimitData.count >= MAX_MESSAGES_PER_MINUTE) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Try again in a minute.' },
            { status: 429 }
          );
        }
        rateLimitData.count++;
      } else {
        // Reset
        rateLimitMap.set(rateLimitKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      }
    } else {
      rateLimitMap.set(rateLimitKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }

    // 3. User's Organization validieren
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Forbidden: Organization mismatch' },
        { status: 403 }
      );
    }

    // 4. Project-Permission Check (Team-Member?)
    const projectDoc = await adminDb
      .collection('projects')
      .doc(projectId)
      .get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Prüfe ob User Team-Member ist
    const isTeamMember = projectData?.teamMembers?.includes(userId);
    const isAdmin = userData.role === 'admin';

    if (!isTeamMember && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Not a team member' },
        { status: 403 }
      );
    }

    // 5. Content-Validation
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Content too long (max 5000 chars)' },
        { status: 400 }
      );
    }

    // 6. Content-Moderation (Profanity-Filter - Beispiel)
    const profanityWords = ['badword1', 'badword2']; // In Praxis: externe Library
    const hasProfanity = profanityWords.some(word =>
      content.toLowerCase().includes(word)
    );

    if (hasProfanity) {
      return NextResponse.json(
        { error: 'Message contains inappropriate content' },
        { status: 400 }
      );
    }

    // 7. Mention-Validation (nur Team-Members mentionieren)
    if (mentions && mentions.length > 0) {
      const teamMembersSnapshot = await adminDb
        .collection('organizations')
        .doc(organizationId)
        .collection('team_members')
        .where('userId', 'in', mentions)
        .get();

      const validMentions = teamMembersSnapshot.docs.map(doc => doc.data().userId);
      const invalidMentions = mentions.filter((m: string) => !validMentions.includes(m));

      if (invalidMentions.length > 0) {
        return NextResponse.json(
          { error: `Invalid mentions: ${invalidMentions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // 8. Attachment-Validation (Assets gehören zu Organization)
    if (attachments && attachments.length > 0) {
      const assetIds = attachments.map((a: any) => a.id);

      const assetsSnapshot = await adminDb
        .collection('organizations')
        .doc(organizationId)
        .collection('media_assets')
        .where('__name__', 'in', assetIds)
        .get();

      if (assetsSnapshot.size !== assetIds.length) {
        return NextResponse.json(
          { error: 'Some attachments are invalid or not accessible' },
          { status: 400 }
        );
      }
    }

    // 9. Quota-Check (Optional: max X Messages pro Organization/Day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessagesSnapshot = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('teamMessages')
      .where('organizationId', '==', organizationId)
      .where('timestamp', '>=', today)
      .get();

    const MAX_MESSAGES_PER_DAY = 1000;
    if (todayMessagesSnapshot.size >= MAX_MESSAGES_PER_DAY) {
      return NextResponse.json(
        { error: 'Daily message quota exceeded' },
        { status: 402 } // Payment Required
      );
    }

    // 10. Message erstellen (Admin SDK)
    const messageRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('teamMessages')
      .doc();

    await messageRef.set({
      id: messageRef.id,
      content,
      authorId: userId,
      authorName: userData.displayName || 'Unknown',
      authorPhotoUrl: userData.photoURL,
      mentions: mentions || [],
      attachments: attachments || [],
      reactions: [],
      timestamp: new Date(),
      edited: false,
      deleted: false,
      projectId,
      organizationId,
    });

    // 11. Notifications erstellen (für Mentions)
    if (mentions && mentions.length > 0) {
      const batch = adminDb.batch();

      mentions.forEach((mentionedUserId: string) => {
        const notificationRef = adminDb
          .collection('users')
          .doc(mentionedUserId)
          .collection('notifications')
          .doc();

        batch.set(notificationRef, {
          type: 'mention',
          projectId,
          messageId: messageRef.id,
          from: userId,
          fromName: userData.displayName,
          content: content.substring(0, 100), // Preview
          timestamp: new Date(),
          read: false,
        });
      });

      await batch.commit();
    }

    // 12. Audit-Log
    await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('audit_logs')
      .add({
        action: 'message_sent',
        userId,
        messageId: messageRef.id,
        timestamp: new Date(),
        projectId,
        organizationId,
      });

    return NextResponse.json({
      success: true,
      messageId: messageRef.id,
    });
  } catch (error) {
    console.error('Message send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Vorteile:**
- ✅ **Spam-Prevention:** Rate-Limiting (10 Messages/Minute)
- ✅ **Team-Validation:** Nur Team-Members können senden
- ✅ **Content-Moderation:** Profanity-Filter
- ✅ **Attachment-Validation:** Assets gehören zu Org
- ✅ **Mention-Validation:** Nur Team-Members
- ✅ **Quota-Management:** Message-Limits
- ✅ **Notifications:** Auto-Benachrichtigungen bei Mentions

---

### 3. 🟡 HOCH: Reaction Management (API Route)

**Warum Admin SDK?**
- ✅ **Atomic Operations:** Keine Race Conditions
- ✅ **Server-Side Logic:** Komplexe Reaction-Logik server-side
- ✅ **Validation:** User kann nur 1 Reaction haben
- ✅ **Performance:** Firestore Transactions

#### API Route: `/api/v1/messages/[messageId]/reactions` (POST)

```typescript
// src/app/api/v1/messages/[messageId]/reactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    // ... Authentifizierung (wie oben)

    const { emoji, projectId, organizationId } = await request.json();

    // Firestore Transaction (Atomic!)
    await adminDb.runTransaction(async (transaction) => {
      const messageRef = adminDb
        .collection('projects')
        .doc(projectId)
        .collection('teamMessages')
        .doc(params.messageId);

      const messageDoc = await transaction.get(messageRef);

      if (!messageDoc.exists) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      const currentReactions = messageData?.reactions || [];

      // Remove all existing reactions from this user
      let updatedReactions = currentReactions
        .map((reaction: any) => ({
          ...reaction,
          userIds: reaction.userIds.filter((id: string) => id !== userId),
          userNames: reaction.userNames.filter((_: string, index: number) =>
            reaction.userIds[index] !== userId
          ),
          count: reaction.userIds.filter((id: string) => id !== userId).length,
        }))
        .filter((reaction: any) => reaction.count > 0);

      // Check if user already had this reaction
      const hadThisReaction = currentReactions.some(
        (r: any) => r.emoji === emoji && r.userIds.includes(userId)
      );

      if (!hadThisReaction) {
        // Add new reaction
        const existingReactionIndex = updatedReactions.findIndex(
          (r: any) => r.emoji === emoji
        );

        if (existingReactionIndex >= 0) {
          updatedReactions[existingReactionIndex].userIds.push(userId);
          updatedReactions[existingReactionIndex].userNames.push(userData.displayName);
          updatedReactions[existingReactionIndex].count++;
        } else {
          updatedReactions.push({
            emoji,
            userIds: [userId],
            userNames: [userData.displayName],
            count: 1,
          });
        }
      }

      // Update (Atomic via Transaction!)
      transaction.update(messageRef, {
        reactions: updatedReactions,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reaction toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Vorteile:**
- ✅ **Atomic:** Firestore Transactions → keine Race Conditions
- ✅ **Server-Side:** Komplexe Logik server-side
- ✅ **Validation:** User kann nur 1 Reaction haben
- ✅ **Performance:** Effizienter als Client-Side

---

### 4. 🟡 HOCH: Multi-Tenancy Message Fetch (API Route)

**Warum Admin SDK?**
- ✅ **Server-Side Team-Check:** User muss Team-Member sein
- ✅ **RBAC:** Role-Based Access Control
- ✅ **Audit:** Server-Side Access-Logs
- ✅ **Performance:** Admin SDK = keine Security Rules overhead

#### API Route: `/api/v1/messages` (GET)

```typescript
// src/app/api/v1/messages/route.ts
export async function GET(request: NextRequest) {
  try {
    // ... Authentifizierung

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const organizationId = searchParams.get('organizationId');
    const limitCount = parseInt(searchParams.get('limit') || '50');

    // User's Organization validieren
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Forbidden: Organization mismatch' },
        { status: 403 }
      );
    }

    // Project-Permission Check
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    const projectData = projectDoc.data();

    const isTeamMember = projectData?.teamMembers?.includes(userId);
    const isAdmin = userData.role === 'admin';

    if (!isTeamMember && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Not a team member' },
        { status: 403 }
      );
    }

    // Messages abrufen (Admin SDK)
    const messagesSnapshot = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('teamMessages')
      .where('deleted', '==', false) // Filter deleted messages
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Audit-Log (Optional)
    await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('audit_logs')
      .add({
        action: 'messages_fetched',
        userId,
        timestamp: new Date(),
        messageCount: messages.length,
      });

    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Vorteile:**
- ✅ **Sicherheit:** Server-Side Team-Check
- ✅ **RBAC:** Role-Based Access Control
- ✅ **Audit:** Access-Logs
- ✅ **Filter:** Deleted Messages automatisch gefiltert

---

### 5. 🟢 MITTEL: Bulk Message Operations

**Warum Admin SDK?**
- ✅ **Batch-Writes:** Performance bei vielen Messages
- ✅ **Atomic:** Alles-oder-Nichts Garantie
- ✅ **Admin-Only:** z.B. Chat-Archivierung

#### API Route: `/api/v1/messages/bulk-delete` (POST)

```typescript
// src/app/api/v1/messages/bulk-delete/route.ts
export async function POST(request: NextRequest) {
  try {
    // ... Authentifizierung & Admin-Check

    const { messageIds, projectId, organizationId } = await request.json();

    // Admin-Check (nur Admins dürfen Bulk-Delete)
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userRole = userDoc.data()?.role;

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Batch-Delete (bis zu 500 Messages)
    const batch = adminDb.batch();

    messageIds.forEach((messageId: string) => {
      const messageRef = adminDb
        .collection('projects')
        .doc(projectId)
        .collection('teamMessages')
        .doc(messageId);

      // Soft-Delete
      batch.update(messageRef, {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      });
    });

    await batch.commit();

    // Audit-Log
    await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('audit_logs')
      .add({
        action: 'bulk_delete_messages',
        userId,
        messageCount: messageIds.length,
        timestamp: new Date(),
      });

    return NextResponse.json({
      success: true,
      deletedCount: messageIds.length,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Vorteile:**
- ✅ **Performance:** Batch-Writes statt einzelne Deletes
- ✅ **Atomic:** Alles-oder-Nichts
- ✅ **Admin-Only:** Zusätzliche Sicherheit

---

## 📊 Migrations-Strategie

### Phase-Ansatz (empfohlen)

**Phase 1: Message Deletion & Editing (KRITISCH)**
- [ ] API Route: `/api/v1/messages/[messageId]` (DELETE)
- [ ] API Route: `/api/v1/messages/[messageId]` (PATCH)
- [ ] Client-Side Hooks anpassen (useDeleteMessage, useEditMessage)
- [ ] Edit-History UI hinzufügen
- [ ] Tests schreiben
- [ ] **Dauer:** 2-3 Tage

**Phase 2: Message Sending Validation (KRITISCH)**
- [ ] API Route: `/api/v1/messages` (POST)
- [ ] Rate-Limiting implementieren
- [ ] Content-Moderation (Profanity-Filter)
- [ ] Mention & Attachment Validation
- [ ] Quota-Management
- [ ] Client-Side Hook anpassen (useSendMessage)
- [ ] **Dauer:** 3-4 Tage

**Phase 3: Reaction Management (HOCH)**
- [ ] API Route: `/api/v1/messages/[messageId]/reactions` (POST)
- [ ] Firestore Transactions
- [ ] Client-Side Hook anpassen (useMessageReaction)
- [ ] **Dauer:** 1-2 Tage

**Phase 4: Multi-Tenancy Permissions (HOCH)**
- [ ] API Route: `/api/v1/messages` (GET)
- [ ] Server-Side Team-Checks
- [ ] RBAC-Logic
- [ ] Client-Side Hook anpassen (useTeamMessages)
- [ ] **Dauer:** 1-2 Tage

**Phase 5: Bulk Operations (MITTEL)**
- [ ] API Route: `/api/v1/messages/bulk-delete` (POST)
- [ ] Admin-Only Features
- [ ] **Dauer:** 1 Tag

**Gesamt-Dauer:** ~8-12 Tage (parallel zu Refactoring-Phasen möglich!)

---

## 🎯 Empfehlung & Priorisierung

### Soll es jetzt gemacht werden?

**✅ JA - Empfehlung: Phase 1 + 2 JETZT (während Refactoring)**

**Begründung:**
1. **Perfect Timing:** Refactoring ist die beste Zeit für solche Änderungen
2. **Security-Gap:** Aktuelle Architektur hat kritische Sicherheitslücken
3. **Spam-Risk:** Kein Rate-Limiting = Spam-Anfällig
4. **Compliance:** Audit-Logs für GDPR/ISO-Compliance essentiell
5. **Clean Architecture:** Admin SDK = saubere Trennung Client/Server
6. **Future-Proof:** Erweiterungen (Content-Moderation, etc.) einfacher

### Was sollte JETZT gemacht werden?

**JETZT (in Refactoring-Phase 1):**
- ✅ Message Deletion & Editing (Phase 1) - **KRITISCH**
- ✅ Message Sending Validation (Phase 2) - **KRITISCH**

**Später (nach Refactoring):**
- 🟡 Reaction Management (Phase 3) - **HOCH** (kann nachgeliefert werden)
- 🟡 Multi-Tenancy Permissions (Phase 4) - **HOCH** (kann nachgeliefert werden)
- 🟢 Bulk Operations (Phase 5) - **MITTEL** (Nice-to-have)

### Integration in Refactoring-Plan

**Vorschlag: Nach Phase 1 (React Query Integration)**

```
Phase 1: React Query Integration ✅
↓
Phase 1.5: Admin SDK Migration (DELETE + EDIT + SEND) ← NEU
↓
Phase 2: Code-Separation & Modularisierung
↓
Phase 3: Performance-Optimierung
↓
...
```

**Vorteile:**
- React Query Hooks sind bereits erstellt
- API-Routes können parallel getestet werden
- Migrations-Aufwand: +5-7 Tage
- Sicherheit massiv verbessert
- Spam-Prevention von Anfang an
- Saubere Architektur

---

## 📝 Code-Beispiele: Vorher/Nachher

### Message Deletion: Vorher (Client-Side)

```typescript
// ❌ UNSICHER: Client-Side Delete
export function useDeleteMessage() {
  return useMutation({
    mutationFn: async (data) => {
      // Kein Permission-Check!
      // Kein Time-Limit!
      // Keine Audit-Logs!
      await teamChatService.deleteMessage(data.projectId, data.messageId);
    },
  });
}
```

### Message Deletion: Nachher (Server-Side mit Admin SDK)

```typescript
// ✅ SICHER: API Route mit Validation
export function useDeleteMessage() {
  return useMutation({
    mutationFn: async (data) => {
      // Server-Side Validation:
      // - Nur eigene Messages löschen
      // - Time-Limit (15min)
      // - Audit-Log
      // - Soft-Delete
      const response = await fetch(`/api/v1/messages/${data.messageId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          projectId: data.projectId,
          organizationId: data.organizationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    },
  });
}
```

---

## ✅ Checkliste: Admin SDK Ready?

**Voraussetzungen:**
- [ ] Firebase Admin SDK installiert (`npm install firebase-admin`)
- [ ] Service Account Key erstellt (Firebase Console)
- [ ] Environment Variables konfiguriert
  ```env
  FIREBASE_ADMIN_PROJECT_ID=...
  FIREBASE_ADMIN_CLIENT_EMAIL=...
  FIREBASE_ADMIN_PRIVATE_KEY=...
  ```
- [ ] Admin SDK initialisiert (`src/lib/firebase/admin.ts`)
- [ ] Next.js API Routes Setup (App Router)

**Admin SDK Init:**
```typescript
// src/lib/firebase/admin.ts
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
```

---

## 🎯 FINALE EMPFEHLUNG

**✅ Admin SDK sollte JETZT integriert werden**

**Begründung:**
1. **Kritische Sicherheitslücken** in aktueller Architektur
2. **Spam-Risk** ohne Rate-Limiting
3. **Perfect Timing** während Refactoring
4. **Clean Architecture** von Anfang an
5. **Geringer Aufwand** (+5-7 Tage bei 33-43 Tage Refactoring)
6. **Massive Sicherheits-Verbesserung**
7. **Compliance-Ready** (Audit-Logs, GDPR)

**Empfohlener Plan:**
1. ✅ Phase 1 (React Query) durchführen
2. ✅ **Phase 1.5 (Admin SDK - Delete + Edit + Send)** einfügen ← NEU
3. ✅ Phase 2-7 wie geplant

**Erwartete Verbesserungen:**
- **Sicherheit:** ↑↑↑ (von 3/10 auf 9/10)
- **Spam-Prevention:** ↑↑↑ (von 0/10 auf 9/10)
- **Code Quality:** ↑↑ (Server-Side Validation)
- **Compliance:** ↑↑↑ (Audit-Logs ready)
- **User-Experience:** ↑↑ (Edit-History, Time-Limits)

---

## 🔍 Vergleich: Communication vs. ProjectFolders

| Aspekt | ProjectFolders | Communication |
|--------|----------------|---------------|
| **Kritikalität** | 🟡 Mittel (Daten-Management) | 🔴 Hoch (User-Generated Content) |
| **Spam-Risk** | 🟢 Niedrig | 🔴 Sehr Hoch |
| **Compliance** | 🟡 Mittel (File-Audit) | 🔴 Kritisch (Message-Audit) |
| **Rate-Limiting** | 🟢 Nicht nötig | 🔴 Essentiell |
| **Content-Moderation** | 🟢 Nicht nötig | 🔴 Essentiell |
| **Edit-History** | 🟢 Nicht nötig | 🟡 Wichtig |
| **Empfohlene Prio** | Phase 1 + 2 JETZT | **Phase 1 + 2 JETZT** |

**Fazit:** Communication Components haben **HÖHERE Priorität** für Admin SDK als ProjectFolders!

---

**Erstellt:** 2025-10-19
**Maintainer:** CeleroPress Team
**Status:** 📋 Empfehlung für Stakeholder
