# Team Chat Service - API-Referenz

> **Service**: teamChatService
> **Datei**: `src/lib/firebase/team-chat-service.ts`
> **Version**: 2.0.0
> **Status**: ✅ Produktiv

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Klassen-Struktur](#klassen-struktur)
- [Methoden-Referenz](#methoden-referenz)
  - [getMessages](#getmessages)
  - [subscribeToMessages](#subscribetomessages)
  - [toggleReaction](#togglereaction)
  - [extractMentions](#extractmentions)
  - [searchMessages](#searchmessages)
  - [clearChatHistory](#clearchathistory)
- [Deprecated Methoden](#deprecated-methoden)
- [TypeScript-Typen](#typescript-typen)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)

---

## Übersicht

Der **TeamChatService** ist die zentrale Firebase-Service-Klasse für Team-Chat Operations. Er verwaltet:

- ✅ **Messages abrufen** (getMessages, subscribeToMessages)
- ✅ **Reactions** (toggleReaction)
- ✅ **Mentions** (extractMentions)
- ✅ **Search** (searchMessages)
- ✅ **Chat-Verlauf löschen** (clearChatHistory)

**Wichtig:** Für Create/Edit/Delete Messages nutze die **Admin SDK API Routes** via React Query Hooks (`useSendMessage`, `useEditMessage`, `useDeleteMessage`).

---

## Klassen-Struktur

```typescript
export class TeamChatService {
  // Private Helper
  private getMessagesCollection(projectId: string): CollectionReference;

  // READ Operations
  public async getMessages(projectId: string, limitCount?: number): Promise<TeamMessage[]>;
  public subscribeToMessages(projectId: string, callback: (messages: TeamMessage[]) => void, limitCount?: number): () => void;
  public async searchMessages(projectId: string, searchTerm: string): Promise<TeamMessage[]>;

  // WRITE Operations (Deprecated - nutze API Routes!)
  public async sendMessage(projectId: string, message: Omit<TeamMessage, 'id' | 'timestamp' | 'projectId'>): Promise<string>;
  public async editMessage(projectId: string, messageId: string, newContent: string): Promise<void>;
  public async deleteMessage(projectId: string, messageId: string): Promise<void>;

  // REACTIONS
  public async toggleReaction(projectId: string, messageId: string, emoji: string, userId: string, userName: string): Promise<void>;

  // UTILS
  public extractMentions(text: string): string[];
  public async clearChatHistory(projectId: string): Promise<void>;
}

// Singleton Instance
export const teamChatService = new TeamChatService();
```

---

## Methoden-Referenz

### getMessages

Lädt Team-Chat Messages aus Firestore (einmaliger Read).

#### Signatur

```typescript
async getMessages(
  projectId: string,
  limitCount: number = 50
): Promise<TeamMessage[]>
```

#### Parameter

| Name | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `projectId` | `string` | - | Firestore Project ID |
| `limitCount` | `number` | `50` | Max Anzahl Messages |

#### Return

`Promise<TeamMessage[]>` - Array von Messages (chronologisch sortiert, älteste zuerst).

#### Beispiel

```typescript
import { teamChatService } from '@/lib/firebase/team-chat-service';

// Lade letzten 50 Messages
const messages = await teamChatService.getMessages('project-123');
console.log('Messages:', messages);

// Lade nur letzten 10 Messages
const recentMessages = await teamChatService.getMessages('project-123', 10);
```

#### Implementation Details

```typescript
async getMessages(projectId: string, limitCount: number = 50): Promise<TeamMessage[]> {
  const messagesRef = this.getMessagesCollection(projectId);
  const q = query(
    messagesRef,
    orderBy('timestamp', 'desc'), // Neueste zuerst
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  const messages: TeamMessage[] = [];

  snapshot.forEach((doc) => {
    messages.push({ id: doc.id, ...doc.data() } as TeamMessage);
  });

  return messages.reverse(); // Chronologisch (älteste zuerst)
}
```

#### Error Handling

```typescript
try {
  const messages = await teamChatService.getMessages('project-123');
} catch (error) {
  console.error('Fehler beim Laden der Messages:', error);
  // Firestore-Fehler (Permission Denied, Network Error, etc.)
}
```

---

### subscribeToMessages

Abonniert Real-time Updates für Team-Chat Messages.

#### Signatur

```typescript
subscribeToMessages(
  projectId: string,
  callback: (messages: TeamMessage[]) => void,
  limitCount: number = 50
): () => void
```

#### Parameter

| Name | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `projectId` | `string` | - | Firestore Project ID |
| `callback` | `(messages: TeamMessage[]) => void` | - | Callback bei neuen Messages |
| `limitCount` | `number` | `50` | Max Anzahl Messages |

#### Return

`() => void` - Unsubscribe-Funktion (WICHTIG: Immer aufrufen in `useEffect` cleanup!)

#### Beispiel

```typescript
import { useEffect } from 'react';
import { teamChatService } from '@/lib/firebase/team-chat-service';

function ChatComponent({ projectId }) {
  useEffect(() => {
    // Subscribe
    const unsubscribe = teamChatService.subscribeToMessages(
      projectId,
      (messages) => {
        console.log('New messages:', messages);
        // State Update
        setMessages(messages);
      }
    );

    // Cleanup (WICHTIG!)
    return () => unsubscribe();
  }, [projectId]);

  return <div>...</div>;
}
```

#### React Query Integration

**Empfohlen:** Nutze `useTeamMessages` Hook für automatisches Caching.

```typescript
import { useTeamMessages } from '@/lib/hooks/useTeamMessages';

function ChatComponent({ projectId }) {
  // Real-time Updates + Caching automatisch
  const { data: messages = [], isLoading } = useTeamMessages(projectId);

  return <div>...</div>;
}
```

#### Implementation Details

```typescript
subscribeToMessages(
  projectId: string,
  callback: (messages: TeamMessage[]) => void,
  limitCount: number = 50
): () => void {
  const messagesRef = this.getMessagesCollection(projectId);
  const q = query(
    messagesRef,
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const messages: TeamMessage[] = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as TeamMessage);
      });
      callback(messages.reverse());
    },
    (error) => {
      console.error('Fehler beim Abonnieren:', error);
    }
  );

  return unsubscribe;
}
```

---

### toggleReaction

Togglet Message Reaction (User kann nur 1 Reaction haben).

#### Signatur

```typescript
async toggleReaction(
  projectId: string,
  messageId: string,
  emoji: string,
  userId: string,
  userName: string
): Promise<void>
```

#### Parameter

| Name | Typ | Beschreibung |
|------|-----|--------------|
| `projectId` | `string` | Firestore Project ID |
| `messageId` | `string` | Message ID |
| `emoji` | `string` | Emoji ('👍', '👎', '🤚') |
| `userId` | `string` | Firebase User UID |
| `userName` | `string` | User Display Name |

#### Verhalten

**Toggle-Logik:**
1. User hatte bereits diese Reaction → Entfernen
2. User hatte andere Reaction → Alte entfernen, neue setzen
3. User hatte keine Reaction → Neue setzen

**Wichtig:** User kann NUR eine Reaction pro Message haben!

#### Beispiel

```typescript
import { useMessageReaction } from '@/lib/hooks/useTeamMessages';

function MessageReactions({ projectId, messageId, userId, userName }) {
  const reactionMutation = useMessageReaction();

  const handleReact = (emoji: string) => {
    // Nutze Hook (empfohlen)
    reactionMutation.mutate({
      projectId,
      messageId,
      emoji,
      userId,
      userName,
    });

    // ODER direkt Service (nur wenn kein React Query)
    // await teamChatService.toggleReaction(
    //   projectId, messageId, emoji, userId, userName
    // );
  };

  return (
    <div>
      <button onClick={() => handleReact('👍')}>👍</button>
      <button onClick={() => handleReact('👎')}>👎</button>
      <button onClick={() => handleReact('🤚')}>🤚</button>
    </div>
  );
}
```

#### Implementation Details

```typescript
async toggleReaction(
  projectId: string,
  messageId: string,
  emoji: string,
  userId: string,
  userName: string
): Promise<void> {
  const messageRef = doc(db, 'projects', projectId, 'teamMessages', messageId);

  // Hole aktuelle Message
  const messageDoc = await getDoc(messageRef);
  const currentMessage = messageDoc.data() as TeamMessage;
  const currentReactions = currentMessage.reactions || [];

  // 1. Entferne alle existierenden Reactions des Users
  let updatedReactions = currentReactions.map(reaction => ({
    ...reaction,
    userIds: reaction.userIds.filter(id => id !== userId),
    userNames: reaction.userNames.filter((_, index) => reaction.userIds[index] !== userId),
    count: reaction.userIds.filter(id => id !== userId).length
  })).filter(reaction => reaction.count > 0);

  // 2. Prüfe ob User bereits diese Reaction hatte
  const hadThisReaction = currentReactions.some(r =>
    r.emoji === emoji && r.userIds.includes(userId)
  );

  if (!hadThisReaction) {
    // 3. Füge neue Reaction hinzu
    const existingReactionIndex = updatedReactions.findIndex(r => r.emoji === emoji);

    if (existingReactionIndex >= 0) {
      updatedReactions[existingReactionIndex].userIds.push(userId);
      updatedReactions[existingReactionIndex].userNames.push(userName);
      updatedReactions[existingReactionIndex].count++;
    } else {
      updatedReactions.push({
        emoji,
        userIds: [userId],
        userNames: [userName],
        count: 1
      });
    }
  }

  await updateDoc(messageRef, { reactions: updatedReactions });
}
```

---

### extractMentions

Extrahiert @-Mentions aus Text.

#### Signatur

```typescript
extractMentions(text: string): string[]
```

#### Parameter

| Name | Typ | Beschreibung |
|------|-----|--------------|
| `text` | `string` | Message Content |

#### Return

`string[]` - Array von erwähnten Namen (ohne '@')

#### Beispiel

```typescript
import { teamChatService } from '@/lib/firebase/team-chat-service';

const text = '@Max Mustermann @Anna Schmidt Check this out!';
const mentions = teamChatService.extractMentions(text);

console.log(mentions);
// → ['Max Mustermann', 'Anna Schmidt']
```

#### Pattern

```typescript
const mentionPattern = /@([\w\s]+?)(?=\s{2,}|$|[,.!?]|\n)/g;
```

**Matches:**
- `@Max` → 'Max'
- `@Max Mustermann` → 'Max Mustermann'
- `@Anna,` → 'Anna'
- `@John.` → 'John'

**Does NOT match:**
- `email@example.com` (nur @ am Wortanfang)

#### Implementation Details

```typescript
extractMentions(text: string): string[] {
  const mentionPattern = /@([\w\s]+?)(?=\s{2,}|$|[,.!?]|\n)/g;
  const matches = text.match(mentionPattern);
  return matches ? matches.map(m => m.substring(1).trim()) : [];
}
```

---

### searchMessages

Durchsucht Messages nach Suchbegriff (Client-Side).

#### Signatur

```typescript
async searchMessages(
  projectId: string,
  searchTerm: string
): Promise<TeamMessage[]>
```

#### Parameter

| Name | Typ | Beschreibung |
|------|-----|--------------|
| `projectId` | `string` | Firestore Project ID |
| `searchTerm` | `string` | Suchbegriff (case-insensitive) |

#### Return

`Promise<TeamMessage[]>` - Gefilterte Messages (chronologisch)

#### Beispiel

```typescript
import { teamChatService } from '@/lib/firebase/team-chat-service';

// Suche nach "Meeting"
const results = await teamChatService.searchMessages('project-123', 'Meeting');

console.log(`${results.length} Messages gefunden`);
results.forEach(msg => {
  console.log(`${msg.authorName}: ${msg.content}`);
});
```

#### Search-Felder

Durchsucht:
- ✅ `content` (Message-Text)
- ✅ `authorName` (Autor-Name)

#### Implementation Details

```typescript
async searchMessages(
  projectId: string,
  searchTerm: string
): Promise<TeamMessage[]> {
  const messagesRef = this.getMessagesCollection(projectId);
  const q = query(messagesRef, orderBy('timestamp', 'desc'));

  const snapshot = await getDocs(q);
  const messages: TeamMessage[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data() as TeamMessage;
    // Client-Side Filtering
    if (
      data.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.authorName.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      messages.push({ id: doc.id, ...data });
    }
  });

  return messages.reverse();
}
```

**Performance-Hinweis:** Client-Side Filtering ist OK für kleine Chats (<1000 Messages). Für größere Chats nutze Algolia/Elasticsearch.

---

### clearChatHistory

Löscht alle Messages eines Projekts (Admin-Funktion).

#### Signatur

```typescript
async clearChatHistory(projectId: string): Promise<void>
```

#### Parameter

| Name | Typ | Beschreibung |
|------|-----|--------------|
| `projectId` | `string` | Firestore Project ID |

#### Return

`Promise<void>`

#### Beispiel

```typescript
import { teamChatService } from '@/lib/firebase/team-chat-service';

async function handleClearChat(projectId: string) {
  if (!confirm('Chat-Verlauf wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
    return;
  }

  try {
    await teamChatService.clearChatHistory(projectId);
    alert('Chat-Verlauf erfolgreich gelöscht');
    window.location.reload();
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    alert('Fehler beim Löschen des Chat-Verlaufs');
  }
}
```

#### Verwendung in FloatingChat

```typescript
// In FloatingChat.tsx
const handleClearChat = async () => {
  try {
    await teamChatService.clearChatHistory(projectId);
    window.location.reload();
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
  }
};
```

#### Implementation Details

```typescript
async clearChatHistory(projectId: string): Promise<void> {
  const messagesRef = this.getMessagesCollection(projectId);
  const snapshot = await getDocs(messagesRef);

  // Lösche alle Messages in Batches
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  console.log(`Chat-Verlauf gelöscht: ${snapshot.docs.length} Messages`);
}
```

**Wichtig:** Nutze Firestore Batch Deletes für >500 Messages!

---

## Deprecated Methoden

### sendMessage (Deprecated)

**Status:** ❌ Deprecated seit v2.0

**Nutze stattdessen:** `useSendMessage()` Hook (Admin SDK API Route)

**Grund:** Client-Side sendMessage hat KEINE:
- Rate-Limiting
- Content-Moderation
- Server-Side Permissions
- Audit-Logs

### editMessage (Deprecated)

**Status:** ❌ Deprecated seit v2.0

**Nutze stattdessen:** `useEditMessage()` Hook (Admin SDK API Route)

### deleteMessage (Deprecated)

**Status:** ❌ Deprecated seit v2.0

**Nutze stattdessen:** `useDeleteMessage()` Hook (Admin SDK API Route)

---

## TypeScript-Typen

### TeamMessage

```typescript
interface TeamMessage {
  id?: string;                    // Firestore Document ID
  content: string;                // Message Text
  authorId: string;               // Firebase User UID
  authorName: string;             // User Display Name
  authorPhotoUrl?: string;        // Optional User Photo
  timestamp: Timestamp | Date;    // Message Timestamp
  mentions: string[];             // ['Max Mustermann', 'Anna Schmidt']
  edited?: boolean;               // Wurde bearbeitet?
  editedAt?: Timestamp;           // Wann bearbeitet?
  projectId: string;              // Firestore Project ID
  organizationId: string;         // Multi-Tenancy
  reactions?: MessageReaction[];  // Reactions
  editHistory?: EditHistoryEntry[]; // Edit-Historie
}
```

### MessageReaction

```typescript
interface MessageReaction {
  emoji: string;          // '👍', '👎', '🤚'
  userIds: string[];      // ['user1', 'user2']
  userNames: string[];    // ['Anna', 'Mike']
  count: number;          // 2
}
```

### EditHistoryEntry

```typescript
interface EditHistoryEntry {
  previousContent: string;  // Content vor Edit
  editedAt: Date;           // Zeitpunkt
  editedBy: string;         // User UID
}
```

---

## Best Practices

### 1. Nutze React Query Hooks

❌ **Nicht empfohlen:**

```typescript
// Direct Service Call
const [messages, setMessages] = useState([]);

useEffect(() => {
  const unsubscribe = teamChatService.subscribeToMessages(
    projectId,
    (msgs) => setMessages(msgs)
  );
  return () => unsubscribe();
}, [projectId]);
```

✅ **Empfohlen:**

```typescript
// React Query Hook
const { data: messages = [] } = useTeamMessages(projectId);
```

**Vorteile:**
- Automatisches Caching
- Optimistic Updates
- Error Handling
- Loading States

### 2. Cleanup Real-time Subscriptions

❌ **Nicht empfohlen:**

```typescript
useEffect(() => {
  teamChatService.subscribeToMessages(projectId, (msgs) => {
    setMessages(msgs);
  });
  // FEHLT: Cleanup!
}, [projectId]);
```

✅ **Empfohlen:**

```typescript
useEffect(() => {
  const unsubscribe = teamChatService.subscribeToMessages(projectId, (msgs) => {
    setMessages(msgs);
  });
  return () => unsubscribe(); // WICHTIG!
}, [projectId]);
```

### 3. Nutze Admin SDK für Mutations

❌ **Nicht empfohlen:**

```typescript
// Client-Side (KEINE Validierung!)
await teamChatService.sendMessage(projectId, { ... });
```

✅ **Empfohlen:**

```typescript
// Server-Side (Admin SDK)
const sendMessage = useSendMessage();
await sendMessage.mutateAsync({ ... });
```

---

## Error Handling

### Firestore Errors

```typescript
try {
  const messages = await teamChatService.getMessages('project-123');
} catch (error) {
  if (error.code === 'permission-denied') {
    console.error('Keine Berechtigung');
  } else if (error.code === 'unavailable') {
    console.error('Firestore nicht erreichbar');
  } else {
    console.error('Unbekannter Fehler:', error);
  }
}
```

### Common Error Codes

| Code | Bedeutung | Lösung |
|------|-----------|--------|
| `permission-denied` | Firestore Rules verweigern Zugriff | Prüfe Team-Membership |
| `unavailable` | Firestore offline | Retry mit Backoff |
| `not-found` | Document existiert nicht | Prüfe projectId |
| `invalid-argument` | Ungültige Parameter | Validiere Input |

---

**Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-20
