# Communication Components - API-Übersicht

> **Modul**: Communication Components API
> **Version**: 2.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-10-20

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Services](#services)
- [Hooks](#hooks)
- [API Routes (Admin SDK)](#api-routes-admin-sdk)
- [TypeScript-Typen](#typescript-typen)
- [Error Handling](#error-handling)
- [Verwendungsbeispiele](#verwendungsbeispiele)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Die Communication Components API besteht aus drei Schichten:

```
┌─────────────────────────────────────────────┐
│           React Komponenten                 │
│   (TeamChat, CommunicationModal, etc.)      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           React Query Hooks                 │
│   (useTeamMessages, useSendMessage, etc.)   │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐  ┌─────────▼────────────┐
│ Firebase       │  │ Admin SDK API Routes │
│ Services       │  │ (Server-Side)        │
│ (Client-Side)  │  │                      │
└────────────────┘  └──────────────────────┘
```

### Kategorisierung

| Kategorie | Komponenten | Zweck |
|-----------|-------------|-------|
| **Hooks** | `useTeamMessages`, `useSendMessage`, etc. | React Query State Management |
| **Services** | `teamChatService`, `projectCommunicationService` | Firebase CRUD Operations |
| **API Routes** | `POST /api/v1/messages`, etc. | Server-Side Validation |
| **Utils** | `authenticatedFetch` | Helper-Funktionen |

---

## Services

### teamChatService

**Datei:** `src/lib/firebase/team-chat-service.ts`

Firebase Service für Team-Chat Messages (Client-Side).

#### Methoden-Übersicht

| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| `sendMessage` | `projectId`, `message` | `Promise<string>` | Sendet Nachricht (deprecated, nutze API Route) |
| `getMessages` | `projectId`, `limitCount?` | `Promise<TeamMessage[]>` | Lädt Messages |
| `subscribeToMessages` | `projectId`, `callback`, `limitCount?` | `() => void` | Real-time Subscription |
| `editMessage` | `projectId`, `messageId`, `newContent` | `Promise<void>` | Bearbeitet Nachricht (deprecated) |
| `deleteMessage` | `projectId`, `messageId` | `Promise<void>` | Löscht Nachricht (deprecated) |
| `toggleReaction` | `projectId`, `messageId`, `emoji`, `userId`, `userName` | `Promise<void>` | Toggle Reaction |
| `extractMentions` | `text` | `string[]` | Extrahiert @-Mentions |
| `searchMessages` | `projectId`, `searchTerm` | `Promise<TeamMessage[]>` | Durchsucht Messages |
| `clearChatHistory` | `projectId` | `Promise<void>` | Löscht alle Messages |

**Wichtig:** `sendMessage`, `editMessage`, `deleteMessage` sind deprecated! Nutze stattdessen die Admin SDK API Routes via `useSendMessage`, `useEditMessage`, `useDeleteMessage` Hooks.

#### Schnellreferenz

```typescript
// Messages laden
const messages = await teamChatService.getMessages('project-123');

// Real-time Subscription
const unsubscribe = teamChatService.subscribeToMessages(
  'project-123',
  (messages) => console.log('New messages:', messages)
);

// Reaction togglen
await teamChatService.toggleReaction(
  'project-123',
  'msg-456',
  '👍',
  'user-789',
  'Max Mustermann'
);

// Mentions extrahieren
const mentions = teamChatService.extractMentions('@Max @Anna Check this out!');
// → ['Max', 'Anna']
```

---

### projectCommunicationService

**Datei:** `src/lib/firebase/project-communication-service.ts`

Firebase Service für Projekt-Kommunikations-Feed (E-Mails, Notizen, etc.).

#### Methoden-Übersicht

| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| `getProjectCommunicationFeed` | `projectId`, `organizationId`, `options?` | `Promise<ProjectCommunicationFeed>` | Lädt Communication Feed |
| `createInternalNote` | `projectId`, `content`, `authorId`, `authorName`, `organizationId`, `mentions?`, `attachments?` | `Promise<string>` | Erstellt interne Notiz |
| `linkEmailToProject` | `projectId`, `emailThreadId`, `organizationId` | `Promise<void>` | Verknüpft E-Mail mit Projekt |

#### Schnellreferenz

```typescript
// Communication Feed laden
const feed = await projectCommunicationService.getProjectCommunicationFeed(
  'project-123',
  'org-456',
  { limit: 25, types: ['email-thread', 'internal-note'] }
);

// Interne Notiz erstellen
await projectCommunicationService.createInternalNote(
  'project-123',
  'Important update for the team',
  'user-789',
  'Max Mustermann',
  'org-456',
  ['@Anna'],
  []
);
```

---

## Hooks

### useTeamMessages

**Datei:** `src/lib/hooks/useTeamMessages.ts`

React Query Hook für Team-Messages mit Real-time Updates.

#### Signatur

```typescript
function useTeamMessages(
  projectId: string | undefined
): UseQueryResult<TeamMessage[], Error>
```

#### Features

- ✅ Automatisches Caching (React Query)
- ✅ Real-time Firestore Subscription
- ✅ Auto-Invalidierung bei neuen Messages
- ✅ Stale-While-Revalidate
- ✅ Error Handling

#### Beispiel

```typescript
import { useTeamMessages } from '@/lib/hooks/useTeamMessages';

function ChatComponent({ projectId }) {
  const {
    data: messages = [],
    isLoading,
    error,
    refetch
  } = useTeamMessages(projectId);

  if (isLoading) return <div>Lädt Messages...</div>;
  if (error) return <div>Fehler: {error.message}</div>;

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

**Test-Coverage:** 96%

---

### useSendMessage

**Datei:** `src/lib/hooks/useTeamMessages.ts`

React Query Mutation Hook für Message Sending (via Admin SDK API Route).

#### Signatur

```typescript
function useSendMessage(): UseMutationResult<
  { success: boolean; messageId: string },
  Error,
  {
    projectId: string;
    content: string;
    authorId: string;
    authorName: string;
    authorPhotoUrl?: string;
    organizationId: string;
    mentions?: string[];
  }
>
```

#### Features

- ✅ Server-Side Validation (Admin SDK)
- ✅ Rate-Limiting (10 msg/min)
- ✅ Content-Moderation (Profanity-Filter)
- ✅ Permissions (Team-Membership)
- ✅ Audit-Logs
- ✅ Auto-Invalidierung (React Query Cache)

#### Beispiel

```typescript
import { useSendMessage } from '@/lib/hooks/useTeamMessages';

function MessageInput({ projectId, organizationId, userId, userName }) {
  const [content, setContent] = useState('');
  const sendMessage = useSendMessage();

  const handleSend = async () => {
    try {
      await sendMessage.mutateAsync({
        projectId,
        content,
        authorId: userId,
        authorName: userName,
        organizationId,
        mentions: teamChatService.extractMentions(content),
      });
      setContent('');
    } catch (error) {
      console.error('Send failed:', error);
    }
  };

  return (
    <div>
      <input value={content} onChange={(e) => setContent(e.target.value)} />
      <button
        onClick={handleSend}
        disabled={!content.trim() || sendMessage.isPending}
      >
        {sendMessage.isPending ? 'Sendet...' : 'Senden'}
      </button>
      {sendMessage.error && (
        <div className="error">{sendMessage.error.message}</div>
      )}
    </div>
  );
}
```

---

### useMessageReaction

**Datei:** `src/lib/hooks/useTeamMessages.ts`

React Query Mutation Hook für Message Reactions (Toggle).

#### Signatur

```typescript
function useMessageReaction(): UseMutationResult<
  void,
  Error,
  {
    projectId: string;
    messageId: string;
    emoji: string;
    userId: string;
    userName: string;
  }
>
```

#### Features

- ✅ Toggle-Mechanik (User kann nur 1 Reaction haben)
- ✅ Real-time Updates
- ✅ Auto-Invalidierung

#### Beispiel

```typescript
import { useMessageReaction } from '@/lib/hooks/useTeamMessages';

function MessageReactions({ projectId, messageId, userId, userName, reactions }) {
  const reactionMutation = useMessageReaction();

  const handleReact = (emoji: string) => {
    reactionMutation.mutate({
      projectId,
      messageId,
      emoji,
      userId,
      userName,
    });
  };

  return (
    <div className="reactions">
      {['👍', '👎', '🤚'].map(emoji => {
        const reaction = reactions?.find(r => r.emoji === emoji);
        const hasReacted = reaction?.userIds.includes(userId);

        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            className={hasReacted ? 'active' : ''}
          >
            {emoji} {reaction?.count || 0}
          </button>
        );
      })}
    </div>
  );
}
```

---

### useEditMessage

**Datei:** `src/lib/hooks/useTeamMessages.ts`

React Query Mutation Hook für Message Edit (via Admin SDK API Route).

#### Signatur

```typescript
function useEditMessage(): UseMutationResult<
  { success: boolean },
  Error,
  {
    projectId: string;
    messageId: string;
    newContent: string;
  }
>
```

#### Features

- ✅ Server-Side Permission-Check (nur eigene Messages)
- ✅ Time-Limit (15min)
- ✅ Edit-History
- ✅ Content-Moderation
- ✅ Audit-Logs

#### Beispiel

```typescript
import { useEditMessage } from '@/lib/hooks/useTeamMessages';

function EditMessageDialog({ projectId, messageId, currentContent, onClose }) {
  const [newContent, setNewContent] = useState(currentContent);
  const editMessage = useEditMessage();

  const handleEdit = async () => {
    try {
      await editMessage.mutateAsync({
        projectId,
        messageId,
        newContent,
      });
      onClose();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} />
      <button onClick={handleEdit} disabled={editMessage.isPending}>
        Speichern
      </button>
    </div>
  );
}
```

---

### useDeleteMessage

**Datei:** `src/lib/hooks/useTeamMessages.ts`

React Query Mutation Hook für Message Delete (via Admin SDK API Route).

#### Signatur

```typescript
function useDeleteMessage(): UseMutationResult<
  { success: boolean },
  Error,
  {
    projectId: string;
    messageId: string;
  }
>
```

#### Features

- ✅ Server-Side Permission-Check (nur eigene Messages)
- ✅ Time-Limit (15min)
- ✅ Soft-Delete (für Audit)
- ✅ Audit-Logs

#### Beispiel

```typescript
import { useDeleteMessage } from '@/lib/hooks/useTeamMessages';

function DeleteMessageButton({ projectId, messageId }) {
  const deleteMessage = useDeleteMessage();

  const handleDelete = async () => {
    if (!confirm('Nachricht wirklich löschen?')) return;

    try {
      await deleteMessage.mutateAsync({ projectId, messageId });
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <button onClick={handleDelete} disabled={deleteMessage.isPending}>
      Löschen
    </button>
  );
}
```

---

### useCommunicationFeed

**Datei:** `src/lib/hooks/useCommunicationMessages.ts`

React Query Hook für Project Communication Feed.

#### Signatur

```typescript
function useCommunicationFeed(
  projectId: string | undefined,
  options?: { limitCount?: number }
): UseQueryResult<ProjectCommunicationFeed, Error>
```

#### Features

- ✅ Lädt E-Mails, Notizen, Status-Updates
- ✅ Automatisches Caching (staleTime: 2min)
- ✅ Filteroptions

#### Beispiel

```typescript
import { useCommunicationFeed } from '@/lib/hooks/useCommunicationMessages';

function CommunicationFeed({ projectId }) {
  const { data: feed, isLoading } = useCommunicationFeed(projectId, {
    limitCount: 25
  });

  if (isLoading) return <div>Lädt...</div>;

  return (
    <div>
      {feed?.entries.map(entry => (
        <div key={entry.id}>
          <h4>{entry.title}</h4>
          <p>{entry.preview}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### useFloatingChatState

**Datei:** `src/lib/hooks/useFloatingChatState.ts`

Custom Hook für FloatingChat State (LocalStorage).

#### Signatur

```typescript
function useFloatingChatState(
  projectId: string
): {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}
```

#### Features

- ✅ Persistent State (localStorage)
- ✅ Auto-Open beim ersten Projekt-Besuch
- ✅ Globaler Key: `chat-open-state`

#### Beispiel

```typescript
import { useFloatingChatState } from '@/lib/hooks/useFloatingChatState';

function FloatingChat({ projectId }) {
  const { isOpen, setIsOpen } = useFloatingChatState(projectId);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Minimieren' : 'Öffnen'}
      </button>
      {isOpen && <TeamChat />}
    </div>
  );
}
```

**Test-Coverage:** 90%

---

## API Routes (Admin SDK)

Siehe detaillierte Dokumentation: [Admin SDK Routes](./admin-sdk-routes.md)

### Übersicht

| Endpoint | Methode | Auth | Beschreibung |
|----------|---------|------|--------------|
| `/api/v1/messages` | POST | ✅ | Message erstellen |
| `/api/v1/messages/[messageId]` | PATCH | ✅ | Message bearbeiten |
| `/api/v1/messages/[messageId]` | DELETE | ✅ | Message löschen |

**Authentifizierung:** Firebase ID Token im `Authorization` Header.

```typescript
Authorization: Bearer <firebase-id-token>
```

### POST /api/v1/messages

**Request:**

```json
{
  "projectId": "project-123",
  "content": "Hello World!",
  "authorId": "user-789",
  "authorName": "Max Mustermann",
  "authorPhotoUrl": "https://...",
  "organizationId": "org-456",
  "mentions": ["@Anna"]
}
```

**Response (Success):**

```json
{
  "success": true,
  "messageId": "msg-abc123"
}
```

**Response (Error):**

```json
{
  "error": "Rate limit exceeded. Max 10 messages per minute.",
  "status": 429
}
```

---

## TypeScript-Typen

### TeamMessage

```typescript
interface TeamMessage {
  id?: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  timestamp: Timestamp | Date;
  mentions: string[];
  edited?: boolean;
  editedAt?: Timestamp;
  projectId: string;
  organizationId: string;
  reactions?: MessageReaction[];
  editHistory?: EditHistoryEntry[];
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
  previousContent: string;
  editedAt: Date;
  editedBy: string;
}
```

### ProjectCommunicationFeed

```typescript
interface ProjectCommunicationFeed {
  projectId: string;
  entries: CommunicationEntry[];
  totalCount: number;
}

interface CommunicationEntry {
  id: string;
  type: 'email-thread' | 'internal-note' | 'status-update' | 'approval';
  title: string;
  preview: string;
  timestamp: Timestamp;
  emailData?: EmailThreadData;
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Bedeutung | Aktion |
|------|-----------|--------|
| 200 | Success | - |
| 400 | Bad Request | Validierung fehlgeschlagen |
| 401 | Unauthorized | Auth Token fehlt/ungültig |
| 403 | Forbidden | Keine Permissions |
| 404 | Not Found | Resource existiert nicht |
| 429 | Rate Limited | 10 msg/min überschritten |
| 500 | Server Error | Interner Fehler |

### Error Messages

#### Rate-Limiting

```json
{
  "error": "Rate limit exceeded. Max 10 messages per minute.",
  "status": 429
}
```

**Handling:**

```typescript
if (error.message.includes('Rate limit')) {
  toast.error('Bitte warten Sie eine Minute.');
  setRateLimited(true);
  setTimeout(() => setRateLimited(false), 60000);
}
```

#### Profanity-Filter

```json
{
  "error": "Message contains inappropriate content",
  "status": 400
}
```

**Handling:**

```typescript
if (error.message.includes('inappropriate content')) {
  toast.error('Nachricht enthält unangemessene Inhalte.');
  setContent(''); // Content löschen
}
```

#### Permission Errors

```json
{
  "error": "Forbidden. You can only edit your own messages.",
  "status": 403
}
```

**Handling:**

```typescript
if (error.message.includes('Forbidden')) {
  toast.error('Sie haben keine Berechtigung für diese Aktion.');
}
```

#### Time-Limit

```json
{
  "error": "Time limit exceeded. Messages can only be edited within 15 minutes.",
  "status": 403
}
```

**Handling:**

```typescript
if (error.message.includes('Time limit')) {
  toast.error('Nachricht kann nur innerhalb von 15 Minuten bearbeitet werden.');
}
```

---

## Verwendungsbeispiele

### Komplettes Chat-Feature

```typescript
import { useTeamMessages, useSendMessage, useMessageReaction } from '@/lib/hooks/useTeamMessages';
import { teamChatService } from '@/lib/firebase/team-chat-service';

function CompleteChat({ projectId, organizationId, userId, userName }) {
  const [newMessage, setNewMessage] = useState('');

  // Hooks
  const { data: messages = [], isLoading } = useTeamMessages(projectId);
  const sendMessage = useSendMessage();
  const reactionMutation = useMessageReaction();

  // Send Message
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    await sendMessage.mutateAsync({
      projectId,
      content: newMessage,
      authorId: userId,
      authorName: userName,
      organizationId,
      mentions: teamChatService.extractMentions(newMessage),
    });

    setNewMessage('');
  };

  // React to Message
  const handleReact = (messageId: string, emoji: string) => {
    reactionMutation.mutate({
      projectId,
      messageId,
      emoji,
      userId,
      userName,
    });
  };

  if (isLoading) return <div>Lädt Messages...</div>;

  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className="message">
            <p>{msg.content}</p>
            <div className="reactions">
              {['👍', '👎', '🤚'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReact(msg.id!, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="input-area">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Nachricht schreiben..."
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sendMessage.isPending}
        >
          Senden
        </button>
      </div>
    </div>
  );
}
```

---

## Siehe auch

- [Team Chat Service - Detaillierte API](./team-chat-service.md)
- [Admin SDK Routes - Server-Side Endpoints](./admin-sdk-routes.md)
- [Hauptdokumentation](../README.md)
- [Komponenten-Dokumentation](../components/README.md)
- [ADRs](../adr/README.md)

---

**Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-20
