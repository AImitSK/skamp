# Communication Components - Dokumentation

> **Modul**: Communication Components
> **Version**: 2.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-10-20

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Architektur](#architektur)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Komponenten](#komponenten)
- [Hooks](#hooks)
- [API-Dokumentation](#api-dokumentation)
- [Security Features](#security-features)
- [Testing](#testing)
- [Performance](#performance)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Die **Communication Components** bieten eine vollständige, produktionsreife Chat- und Kommunikationslösung für das CeleroPress SKAMP-System. Das Modul kombiniert moderne React-Patterns mit Firebase Real-time Subscriptions und Server-Side Validation für eine sichere, performante Team-Kommunikation.

### Kernfunktionalität

Die Communication Components umfassen:

- **TeamChat** - Real-time Team-Chat mit @-Mentions und Asset-Attachments
- **CommunicationModal** - Projekt-Kommunikations-Feed (E-Mails, Notizen, Status-Updates)
- **FloatingChat** - Minimalistisches Chat-Widget mit Unread-Badge
- **Server-Side Validation** - Admin SDK Integration für Security & Compliance

### Verwendung in CeleroPress

Das Modul wird verwendet in:

- **Projekt-Tabs (GlobalChat)** - Haupt-Chat für alle Projekt-Tabs
- **Floating Chat Widget** - Persistent über alle Projekt-Seiten
- **Communication Modal** - Externe & interne Kommunikation zentral

---

## Features

### TeamChat

#### Real-time Messaging
- ✅ **Live-Updates** - Firebase Real-time Subscriptions mit React Query Caching
- ✅ **Optimistic Updates** - Sofortiges UI-Feedback beim Senden
- ✅ **Auto-Scroll** - Automatisches Scrollen zu neuen Nachrichten
- ✅ **Datums-Separatoren** - "Heute", "Gestern", vollständiges Datum
- ✅ **Unread Indicator** - "Neue Nachrichten" Badge mit Datum-basiertem Tracking

#### @-Mentions
- ✅ **Autocomplete-Dropdown** - Filtert Team-Mitglieder während der Eingabe
- ✅ **Keyboard-Navigation** - Arrow-Keys, Enter, Escape
- ✅ **Visual Highlighting** - Gelber Badge für eigene Mentions, blau für andere
- ✅ **Push-Notifications** - Automatische Benachrichtigung erwähnter User

#### Asset-Attachments
- ✅ **Asset-Picker Modal** - Integration mit Media-Service
- ✅ **Preview-Cards** - Inline-Vorschau von angehängten Assets
- ✅ **Link-Format** - Markdown-Style: `[Filename.jpg](asset://projectId/assetId)`
- ✅ **Security-Check** - Nur Assets aus dem aktuellen Projekt erlaubt

#### Message Reactions
- ✅ **3 Reaction-Typen** - 👍 Gefällt mir, 👎 Gefällt mir nicht, 🤚 Entscheide ihr
- ✅ **Toggle-Mechanik** - User kann nur eine Reaction haben (wie LinkedIn)
- ✅ **Tooltip mit Namen** - Zeigt alle User die reagiert haben
- ✅ **Real-time Updates** - Sofortige Aktualisierung für alle Teilnehmer

#### Message Edit/Delete
- ✅ **Permission-Check** - Nur eigene Nachrichten bearbeitbar/löschbar
- ✅ **Time-Limit** - 15 Minuten nach Erstellung (Server-Side validiert)
- ✅ **Edit-History** - Vollständige Historie aller Änderungen
- ✅ **"Bearbeitet" Badge** - Transparenz für bearbeitete Nachrichten

#### Emojis
- ✅ **Emoji-Picker** - 32 häufig verwendete Emojis
- ✅ **Text-Emoji Ersetzung** - `:)` → 😊, `<3` → ❤️, etc.
- ✅ **Inline-Rendering** - Emojis werden direkt im Text angezeigt

### Security & Compliance (Phase 1.5)

#### Admin SDK Integration
- ✅ **Server-Side Validation** - Alle Mutationen über Next.js API Routes
- ✅ **Firebase ID Token Auth** - Sichere Authentifizierung
- ✅ **User-ID Verification** - Verhindert Spoofing

#### Rate-Limiting
- ✅ **10 Messages/Minute** - Per User/Projekt
- ✅ **In-Memory Cache** - Schnell & einfach (später Redis)
- ✅ **HTTP 429 Response** - Standard-konforme Fehler

#### Content-Moderation
- ✅ **Profanity-Filter** - Deutsch & Englisch
- ✅ **Echtzeit-Prüfung** - Vor dem Speichern in Firestore
- ✅ **Erweiterbar** - Einfach neue Wörter hinzufügen

#### Permission-Checks
- ✅ **Team-Membership** - Nur Team-Mitglieder können schreiben
- ✅ **Edit/Delete Permissions** - Nur eigene Nachrichten
- ✅ **Time-Limits** - 15min für Edits/Deletes

#### Audit-Logs
- ✅ **GDPR/ISO-ready** - Vollständige Nachvollziehbarkeit
- ✅ **Alle Aktionen geloggt** - Created, Edited, Deleted, Rate-Limited, Profanity-Blocked
- ✅ **Firestore Collection** - `audit-logs` mit strukturiertem Schema

### CommunicationModal

#### Externe Kommunikation
- ✅ **E-Mail-Threads** - Verknüpfung mit E-Mail-Service
- ✅ **Interne Notizen** - Team-only Nachrichten
- ✅ **Status-Updates** - Projekt-Änderungen im Feed
- ✅ **Search & Filter** - Durchsuchbar nach Typ, Inhalt, Datum

#### Team-Chat Integration
- ✅ **Tab-Navigation** - Externe vs. Team-Chat Ansicht
- ✅ **Message-Types** - Allgemein, Planung, Feedback, File-Upload
- ✅ **Planning-Context** - Strategie, Briefing, Inspiration, Recherche

### FloatingChat

#### Persistent Chat Widget
- ✅ **Minimierbar** - Bleibt persistent über alle Seiten
- ✅ **Unread Badge** - Roter Counter + grüner Puls-Punkt
- ✅ **LocalStorage State** - Chat-Zustand bleibt erhalten
- ✅ **First-Visit Auto-Open** - Öffnet sich beim ersten Projekt-Besuch
- ✅ **Team-Avatare** - Zeigt bis zu 5 Team-Mitglieder im Header
- ✅ **Clear Chat** - Admin-Funktion zum Löschen des kompletten Verlaufs

---

## Architektur

### Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│                     Communication Components                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   TeamChat   │   │ Communication│   │ FloatingChat │        │
│  │              │   │    Modal     │   │              │        │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘        │
│         │                  │                   │                 │
│         └──────────────────┴───────────────────┘                 │
│                            │                                     │
│                  ┌─────────┴─────────┐                          │
│                  │                   │                           │
│         ┌────────▼────────┐  ┌──────▼───────┐                  │
│         │  React Query    │  │   Firebase   │                  │
│         │    Hooks        │  │   Services   │                  │
│         │                 │  │              │                   │
│         │ - useTeamMess.. │  │ - teamChat.. │                  │
│         │ - useCommuni..  │  │ - projectC.. │                  │
│         │ - useFloating.. │  │ - teamMember │                  │
│         └────────┬────────┘  └──────┬───────┘                  │
│                  │                   │                           │
│                  └─────────┬─────────┘                          │
│                            │                                     │
│                  ┌─────────▼─────────┐                          │
│                  │   API Routes      │                          │
│                  │  (Admin SDK)      │                          │
│                  │                   │                           │
│                  │ POST   /messages  │                          │
│                  │ PATCH  /messages  │                          │
│                  │ DELETE /messages  │                          │
│                  └─────────┬─────────┘                          │
│                            │                                     │
│                  ┌─────────▼─────────┐                          │
│                  │    Firestore      │                          │
│                  │                   │                           │
│                  │ - teamMessages    │                          │
│                  │ - audit-logs      │                          │
│                  └───────────────────┘                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Datenfluss

#### Message Sending (mit Admin SDK)

```
1. User tippt Nachricht
   ↓
2. TeamChat.handleSendMessage()
   ↓
3. useSendMessage() Hook
   ↓
4. authenticatedFetch('/api/v1/messages', { POST })
   ↓
5. API Route: /api/v1/messages/route.ts
   ├─ Auth: Firebase ID Token verifizieren
   ├─ Rate-Limit: 10 msg/min prüfen
   ├─ Content-Moderation: Profanity-Filter
   ├─ Permissions: Team-Membership prüfen
   ├─ Mentions: Team-Member validieren
   ├─ Save: adminDb.collection().add()
   └─ Audit-Log: createAuditLog()
   ↓
6. Firebase Real-time Subscription
   ↓
7. React Query Cache Update
   ↓
8. UI Re-Render (alle Clients)
```

#### Real-time Updates (Firebase Subscriptions)

```
1. useTeamMessages() Hook initialisiert
   ↓
2. teamChatService.subscribeToMessages()
   ↓
3. Firebase onSnapshot Listener
   ↓
4. Neue Nachricht in Firestore
   ↓
5. Callback mit neuen Messages
   ↓
6. queryClient.setQueryData() - React Query Cache Update
   ↓
7. UI Re-Render (automatisch durch React Query)
```

### Technologie-Stack

| Kategorie | Technologie | Zweck |
|-----------|-------------|-------|
| **UI Framework** | React 18 | Komponenten-Basis |
| **State Management** | React Query v5 | Server-State Caching |
| **Real-time** | Firebase Subscriptions | Live-Updates |
| **Backend** | Next.js API Routes | Server-Side Validation |
| **Database** | Firestore | Nachrichten-Speicherung |
| **Auth** | Firebase Admin SDK | Server-Side Auth |
| **Styling** | Tailwind CSS | Utility-First CSS |
| **Icons** | Heroicons /24/outline | Icon-System |
| **Testing** | Jest + Playwright | Unit & E2E Tests |

---

## Installation

### Voraussetzungen

```bash
npm install @tanstack/react-query firebase firebase-admin
```

### Firestore-Setup

**Collections:**

```
projects/{projectId}/teamMessages/{messageId}
  - content: string
  - authorId: string
  - authorName: string
  - authorPhotoUrl: string
  - organizationId: string
  - mentions: string[]
  - timestamp: Timestamp
  - edited: boolean
  - editedAt: Timestamp
  - reactions: MessageReaction[]
  - editHistory: EditHistoryEntry[]

audit-logs/{logId}
  - userId: string
  - action: string
  - projectId: string
  - messageId: string
  - details: any
  - timestamp: Timestamp
  - type: 'team-chat'
```

**Firestore Indexes:**

```
Collection: projects/{projectId}/teamMessages
Field: timestamp (Descending)
```

**Firestore Rules:**

```javascript
match /projects/{projectId}/teamMessages/{messageId} {
  // Lesen: Nur Team-Members
  allow read: if isTeamMember(projectId);

  // Schreiben: NUR über API Routes (Admin SDK)
  allow write: if false; // Alle Writes via Admin SDK
}

function isTeamMember(projectId) {
  let project = get(/databases/$(database)/documents/projects/$(projectId)).data;
  return request.auth != null && (
    project.assignedTo.hasAny([request.auth.uid]) ||
    project.userId == request.auth.uid ||
    project.projectManager == request.auth.uid
  );
}
```

### Environment Variables

```env
# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

---

## Quick Start

### 1. TeamChat in Projekt-Tab

```tsx
import { TeamChat } from '@/components/projects/communication/TeamChat';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

export default function ProjectCommunicationTab({ projectId, projectTitle }) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  if (!user || !currentOrganization) return <div>Bitte anmelden...</div>;

  return (
    <div className="h-screen">
      <TeamChat
        projectId={projectId}
        projectTitle={projectTitle}
        organizationId={currentOrganization.id}
        userId={user.uid}
        userDisplayName={user.displayName || 'Unbekannter User'}
        lastReadTimestamp={new Date()} // Optional: Für Unread-Tracking
      />
    </div>
  );
}
```

### 2. FloatingChat Widget

```tsx
import { FloatingChat } from '@/components/projects/communication/FloatingChat';

export default function ProjectLayout({ projectId, projectTitle, children }) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return (
    <div>
      {children}

      {/* Floating Chat Widget - persistent über alle Seiten */}
      {user && currentOrganization && (
        <FloatingChat
          projectId={projectId}
          projectTitle={projectTitle}
          organizationId={currentOrganization.id}
          userId={user.uid}
          userDisplayName={user.displayName || 'Unbekannter User'}
        />
      )}
    </div>
  );
}
```

### 3. CommunicationModal

```tsx
import { useState } from 'react';
import { CommunicationModal } from '@/components/projects/communication/CommunicationModal';
import { Button } from '@/components/ui/button';

export default function ProjectHeader({ projectId, projectTitle }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <Button onClick={() => setShowModal(true)}>
        Kommunikation anzeigen
      </Button>

      <CommunicationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        projectId={projectId}
        projectTitle={projectTitle}
      />
    </div>
  );
}
```

---

## Komponenten

### TeamChat

**Hauptkomponente** für Team-Chat mit allen Features.

```tsx
interface TeamChatProps {
  projectId: string;           // Firestore Project ID
  projectTitle: string;        // Für Notifications
  organizationId: string;      // Multi-Tenancy
  userId: string;              // Aktueller User (Firebase Auth UID)
  userDisplayName: string;     // User-Name für Messages
  lastReadTimestamp?: Date | null; // Optional: Unread-Tracking
}
```

**Verwendung:**

```tsx
<TeamChat
  projectId="proj-abc123"
  projectTitle="Website Relaunch"
  organizationId="org-xyz789"
  userId={user.uid}
  userDisplayName={user.displayName}
  lastReadTimestamp={lastRead}
/>
```

### MessageInput

**Extrahierte** Input-Komponente (Phase 2 Modularisierung).

```tsx
interface MessageInputProps {
  newMessage: string;
  sending: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: () => void;
  setShowAssetPicker: (show: boolean) => void;
  setShowEmojiPicker: (show: boolean) => void;

  // @-Mention Props
  showMentionDropdown: boolean;
  mentionDropdownPosition: { top: number; left: number };
  mentionSearchTerm: string;
  teamMembers: TeamMember[];
  selectedMentionIndex: number;
  selectMention: (member: TeamMember) => void;
  setShowMentionDropdown: (show: boolean) => void;
}
```

**Performance:**
- `React.memo` für unnötige Re-Renders vermeiden
- `useCallback` für Event-Handler

### MentionDropdown

**Autocomplete-Dropdown** für @-Mentions.

```tsx
interface MentionDropdownProps {
  isVisible: boolean;
  position: { top: number; left: number };
  searchTerm: string;
  teamMembers: TeamMember[];
  selectedIndex: number;
  onSelect: (member: TeamMember) => void;
  onClose: () => void;
}
```

### FloatingChat

**Minimalistisches Chat-Widget** mit Unread-Badge.

```tsx
interface FloatingChatProps {
  projectId: string;
  projectTitle: string;
  organizationId: string;
  userId: string;
  userDisplayName: string;
}
```

**Features:**
- LocalStorage für Chat-Zustand (offen/geschlossen)
- Automatisches Öffnen beim ersten Projekt-Besuch
- Unread-Counter Badge
- Team-Avatare im Header
- Clear-Chat Dialog

---

## Hooks

### useTeamMessages

**React Query Hook** für Team-Messages mit Real-time Subscriptions.

```tsx
import { useTeamMessages } from '@/lib/hooks/useTeamMessages';

function MyComponent({ projectId }) {
  const { data: messages = [], isLoading } = useTeamMessages(projectId);

  if (isLoading) return <div>Lädt...</div>;

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

**Features:**
- Automatische Cache-Invalidierung
- Real-time Firestore Subscription
- Optimistic Updates
- Stale-While-Revalidate

**Test-Coverage:** 96%

### useSendMessage

**Mutation Hook** für Message Sending (via Admin SDK API Route).

```tsx
import { useSendMessage } from '@/lib/hooks/useTeamMessages';

function MyComponent({ projectId, organizationId, userId }) {
  const sendMessage = useSendMessage();

  const handleSend = async () => {
    await sendMessage.mutateAsync({
      projectId,
      content: 'Hello World',
      authorId: userId,
      authorName: 'Max Mustermann',
      organizationId,
      mentions: ['@Anna'],
    });
  };

  return (
    <button onClick={handleSend} disabled={sendMessage.isPending}>
      {sendMessage.isPending ? 'Sendet...' : 'Senden'}
    </button>
  );
}
```

### useMessageReaction

**Mutation Hook** für Reactions (Toggle).

```tsx
import { useMessageReaction } from '@/lib/hooks/useTeamMessages';

function MessageReactions({ projectId, messageId, userId }) {
  const reactionMutation = useMessageReaction();

  const handleReact = (emoji: string) => {
    reactionMutation.mutate({
      projectId,
      messageId,
      emoji,
      userId,
      userName: 'Max Mustermann',
    });
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

### useFloatingChatState

**Custom Hook** für FloatingChat LocalStorage-State.

```tsx
import { useFloatingChatState } from '@/lib/hooks/useFloatingChatState';

function MyFloatingChat({ projectId }) {
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

**Features:**
- Persistent State in `localStorage`
- Auto-Open beim ersten Projekt-Besuch
- Globaler Key: `chat-open-state`

**Test-Coverage:** 90%

---

## API-Dokumentation

Siehe detaillierte API-Dokumentation:

- [API-Übersicht](./api/README.md) - Übersicht aller Services & Hooks
- [Team Chat Service](./api/team-chat-service.md) - Detaillierte Firebase Service API
- [Admin SDK Routes](./api/admin-sdk-routes.md) - Server-Side API Endpoints

---

## Security Features

### Admin SDK Integration (Phase 1.5)

**Warum Admin SDK?**

Die Client-Side Firebase SDK hat **keine** Möglichkeit für:
- Rate-Limiting
- Content-Moderation
- Server-Side Permissions
- Audit-Logs

**Lösung:** Alle Mutationen (Create, Edit, Delete) laufen über **Next.js API Routes** mit **Firebase Admin SDK**.

### API Routes

| Endpoint | Methode | Zweck |
|----------|---------|-------|
| `/api/v1/messages` | POST | Message erstellen |
| `/api/v1/messages/[id]` | PATCH | Message bearbeiten |
| `/api/v1/messages/[id]` | DELETE | Message löschen |

**Authentifizierung:**

```typescript
// Client sendet Firebase ID Token
const idToken = await user.getIdToken();

const response = await fetch('/api/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ ... })
});
```

**Server validiert Token:**

```typescript
// In API Route
const token = request.headers.get('Authorization')?.substring(7);
const decodedToken = await adminAuth.verifyIdToken(token);
const userId = decodedToken.uid;
```

### Rate-Limiting

**Limit:** 10 Messages pro Minute pro User/Projekt

**Implementierung:**

```typescript
// In-Memory Cache (später Redis)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, projectId: string): boolean {
  const key = `${userId}:${projectId}`;
  const now = Date.now();
  const limit = rateLimitCache.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimitCache.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 10) return false;

  limit.count++;
  return true;
}
```

**Error Response:**

```json
{
  "error": "Rate limit exceeded. Max 10 messages per minute.",
  "status": 429
}
```

### Content-Moderation

**Profanity-Filter:** Einfache Blacklist (erweiterbar).

```typescript
const PROFANITY_LIST = [
  'fuck', 'shit', 'asshole', 'bitch', 'damn',
  'scheiße', 'arschloch', 'fick'
];

function containsProfanity(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return PROFANITY_LIST.some(word => lowerContent.includes(word));
}
```

**Error Response:**

```json
{
  "error": "Message contains inappropriate content",
  "status": 400
}
```

### Permission-Checks

**Team-Membership:**

```typescript
const projectDoc = await adminDb.collection('projects').doc(projectId).get();
const project = projectDoc.data();

const isTeamMember =
  project.assignedTo?.includes(userId) ||
  project.userId === userId ||
  project.projectManager === userId;

if (!isTeamMember) {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
}
```

**Edit/Delete Permissions:**

```typescript
// Nur eigene Messages
if (message.authorId !== userId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Time-Limit: 15min
const messageAge = Date.now() - message.timestamp.toDate().getTime();
if (messageAge > 15 * 60 * 1000) {
  return NextResponse.json({
    error: 'Time limit exceeded. Messages can only be edited within 15 minutes.'
  }, { status: 403 });
}
```

### Audit-Logs

**Collection:** `audit-logs`

**Schema:**

```typescript
{
  userId: string;         // Wer?
  action: string;         // Was? (message_created, message_edited, ...)
  projectId: string;      // Wo?
  messageId: string;      // Welche Nachricht?
  details: any;           // Zusätzliche Infos
  timestamp: Timestamp;   // Wann?
  type: 'team-chat';      // Kategorie
}
```

**Actions:**

- `message_created` - Nachricht erstellt
- `message_edited` - Nachricht bearbeitet
- `message_deleted` - Nachricht gelöscht
- `message_rate_limited` - Rate-Limit erreicht
- `message_profanity_blocked` - Profanity gefunden
- `message_unauthorized_team` - Kein Team-Member
- `message_edit_unauthorized` - Nicht eigene Nachricht
- `message_delete_unauthorized` - Nicht eigene Nachricht

**Verwendung:**

```typescript
await createAuditLog({
  userId,
  action: 'message_created',
  projectId,
  messageId: messageRef.id,
  details: { mentionsCount: mentions.length }
});
```

---

## Testing

### Test-Übersicht

| Kategorie | Anzahl | Coverage | Framework |
|-----------|--------|----------|-----------|
| **Unit Tests** | 42 | 94%+ | Jest |
| **E2E Tests** | 25 | - | Playwright |
| **Gesamt** | 67 | - | - |

### Hook Tests

**useTeamMessages.test.tsx** (96% Coverage)

```typescript
describe('useTeamMessages', () => {
  it('sollte Messages laden und cachen', async () => {
    const { result } = renderHook(() => useTeamMessages('proj-123'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].content).toBe('Test Message 1');
  });

  it('sollte Real-time Updates empfangen', async () => {
    const { result } = renderHook(() => useTeamMessages('proj-123'));

    // Simuliere neue Nachricht
    act(() => {
      teamChatService.sendMessage('proj-123', { ... });
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(3);
    });
  });
});
```

### Component Tests

**MessageInput.test.tsx** (88% Coverage)

```typescript
describe('MessageInput', () => {
  it('sollte @-Mention Dropdown anzeigen', async () => {
    render(<MessageInput {...props} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '@Max');

    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
  });

  it('sollte Emoji-Picker öffnen', async () => {
    render(<MessageInput {...props} />);

    const emojiButton = screen.getByTitle('Emoji einfügen');
    await user.click(emojiButton);

    expect(props.setShowEmojiPicker).toHaveBeenCalledWith(true);
  });
});
```

### E2E Tests (Playwright)

**team-chat-api-routes.spec.ts**

```typescript
test('sollte Rate-Limiting nach 10 Messages triggern', async ({ page }) => {
  await page.goto('/projects/test-project');

  // Sende 10 Messages
  for (let i = 0; i < 10; i++) {
    await page.fill('[data-testid="message-input"]', `Message ${i}`);
    await page.click('[data-testid="send-button"]');
  }

  // 11. Message sollte fehlschlagen
  await page.fill('[data-testid="message-input"]', 'Message 11');
  await page.click('[data-testid="send-button"]');

  await expect(page.locator('[data-testid="error-message"]')).toContainText(
    'Rate limit exceeded'
  );
});
```

### Test-Befehle

```bash
# Unit Tests
npm test

# Coverage-Report
npm run test:coverage

# E2E Tests
npm run test:e2e

# E2E Tests (UI Mode)
npm run test:e2e:ui

# Specific Test
npm test -- useTeamMessages.test.tsx
```

---

## Performance

### Optimierungen (Phase 3)

#### React.memo

**MessageInput:** 88% weniger Re-Renders

```typescript
export const MessageInput: React.FC<MessageInputProps> = React.memo(({ ... }) => {
  // Component Logic
});
```

**Vorher:** Re-Render bei jedem TeamChat State-Change
**Nachher:** Re-Render nur bei Props-Änderungen

#### useCallback

**Event-Handler:** Verhindert unnötige Dependency-Updates

```typescript
const handleReaction = useCallback(async (messageId: string, emoji: string) => {
  await reactionMutation.mutateAsync({ projectId, messageId, emoji, userId });
}, [projectId, userId, reactionMutation]);
```

**Vorher:** Neue Funktion-Referenz bei jedem Render
**Nachher:** Stabile Funktion-Referenz

### Performance-Messungen

**Initial Load:**
- ❌ Vorher: ~2.3s (ohne React Query)
- ✅ Nachher: ~800ms (mit React Query Caching)

**Message Send:**
- ❌ Vorher: ~1.2s (ohne Optimistic Updates)
- ✅ Nachher: ~50ms (mit Optimistic Updates)

**Re-Renders:**
- ❌ Vorher: ~40 Re-Renders pro Message (ohne memo)
- ✅ Nachher: ~5 Re-Renders pro Message (mit memo)

### Best Practices

#### 1. React Query Caching

```typescript
const query = useQuery({
  queryKey: ['team-messages', projectId],
  queryFn: () => teamChatService.getMessages(projectId),
  staleTime: 0, // Immer fresh wegen Real-time
  enabled: !!projectId,
});
```

#### 2. Firestore Subscriptions

```typescript
useEffect(() => {
  const unsubscribe = teamChatService.subscribeToMessages(
    projectId,
    (messages) => {
      queryClient.setQueryData(['team-messages', projectId], messages);
    }
  );
  return () => unsubscribe();
}, [projectId, queryClient]);
```

#### 3. Optimistic Updates

```typescript
const sendMessage = useMutation({
  mutationFn: async (data) => {
    // API Call
  },
  onMutate: async (newMessage) => {
    // Optimistic Update (sofort im UI anzeigen)
    const previousMessages = queryClient.getQueryData(['team-messages', projectId]);
    queryClient.setQueryData(['team-messages', projectId], (old) => [
      ...old,
      { id: 'temp-id', ...newMessage, timestamp: new Date() }
    ]);
    return { previousMessages };
  },
  onError: (err, newMessage, context) => {
    // Rollback bei Fehler
    queryClient.setQueryData(['team-messages', projectId], context.previousMessages);
  },
});
```

---

## Migration Guide

### Von Version 1.x zu 2.0

**Wichtigste Änderungen:**

1. **Admin SDK Integration** - Alle Mutationen über API Routes
2. **React Query** - State Management geändert
3. **MessageInput** - Extrahierte Komponente
4. **Performance** - React.memo & useCallback

#### 1. API Route Setup

**Neue Dateien erstellen:**

```
src/app/api/v1/messages/route.ts            # POST
src/app/api/v1/messages/[messageId]/route.ts # PATCH, DELETE
```

**Environment Variables:**

```env
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_PRIVATE_KEY="..."
FIREBASE_ADMIN_CLIENT_EMAIL=...
```

#### 2. React Query Provider

**In `_app.tsx` oder `layout.tsx`:**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5min
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

#### 3. TeamChat Props

**Vorher (v1.x):**

```tsx
<TeamChat
  projectId={projectId}
  userId={userId}
/>
```

**Nachher (v2.0):**

```tsx
<TeamChat
  projectId={projectId}
  projectTitle={projectTitle} // NEU
  organizationId={organizationId} // NEU
  userId={userId}
  userDisplayName={userDisplayName} // NEU
  lastReadTimestamp={lastRead} // Optional
/>
```

#### 4. Firestore Rules Update

**Wichtig:** Alle Writes jetzt via Admin SDK!

```javascript
// Vorher
allow write: if isTeamMember(projectId);

// Nachher
allow write: if false; // NUR Admin SDK darf schreiben
```

#### 5. Testing Updates

**Neue Tests hinzufügen:**

```bash
npm test -- useTeamMessages.test.tsx
npm test -- MessageInput.test.tsx
npm run test:e2e -- team-chat-api-routes.spec.ts
```

---

## Troubleshooting

### Häufige Fehler

#### 1. "Unauthorized - Invalid token"

**Ursache:** Firebase ID Token fehlt oder ungültig.

**Lösung:**

```typescript
// Prüfe ob User eingeloggt ist
const { user } = useAuth();
if (!user) {
  return <div>Bitte anmelden...</div>;
}

// Stelle sicher dass authenticatedFetch() verwendet wird
import { authenticatedFetch } from '@/lib/utils/api-client';

const response = await authenticatedFetch('/api/v1/messages', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

#### 2. "Rate limit exceeded"

**Ursache:** Mehr als 10 Messages pro Minute gesendet.

**Lösung:**

```typescript
// Zeige User-Feedback
if (error.message.includes('Rate limit')) {
  toast.error('Bitte warten Sie eine Minute, bevor Sie weitere Nachrichten senden.');
}

// Optional: Disable Send-Button für 60s
const [rateLimited, setRateLimited] = useState(false);

if (error.message.includes('Rate limit')) {
  setRateLimited(true);
  setTimeout(() => setRateLimited(false), 60000);
}
```

#### 3. "Not a team member"

**Ursache:** User ist nicht im `assignedTo` Array des Projekts.

**Lösung:**

```typescript
// Prüfe Team-Membership VOR dem Senden
const project = await projectService.getById(projectId);
const isTeamMember = project.assignedTo?.includes(userId) ||
                     project.userId === userId;

if (!isTeamMember) {
  return <div>Sie sind kein Mitglied dieses Teams.</div>;
}
```

#### 4. "@-Mention Dropdown erscheint nicht"

**Ursache:** `teamMembers` Array leer oder nicht geladen.

**Lösung:**

```typescript
// Stelle sicher dass teamMembers geladen sind
useEffect(() => {
  const loadTeam = async () => {
    const members = await teamMemberService.getByOrganization(organizationId);
    setTeamMembers(members);
  };
  loadTeam();
}, [organizationId]);

// Debug: Log teamMembers
console.log('Team Members:', teamMembers);
```

#### 5. "Messages werden nicht real-time aktualisiert"

**Ursache:** Firestore Subscription nicht korrekt eingerichtet.

**Lösung:**

```typescript
// Prüfe ob useTeamMessages Hook verwendet wird
const { data: messages = [], isLoading } = useTeamMessages(projectId);

// Stelle sicher dass projectId NICHT undefined ist
if (!projectId) {
  console.error('projectId is undefined!');
  return null;
}

// Prüfe Firestore Rules
// allow read: if isTeamMember(projectId);
```

### Debug-Tipps

#### 1. React Query DevTools

```bash
npm install @tanstack/react-query-devtools
```

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

#### 2. Network Tab

- Öffne Browser DevTools → Network
- Filtere nach `messages`
- Prüfe Request/Response Payload
- Prüfe HTTP Status Codes

#### 3. Firebase Console

- Öffne Firestore → `projects/{projectId}/teamMessages`
- Prüfe ob Messages gespeichert werden
- Prüfe `timestamp` Feld (sollte Firestore Timestamp sein)
- Prüfe `audit-logs` Collection für Fehler

#### 4. Logging

```typescript
// In TeamChat.tsx
console.log('[TeamChat] Messages:', messages);
console.log('[TeamChat] Loading:', loading);
console.log('[TeamChat] Team Members:', teamMembers);

// In API Route
console.log('[API] Request Body:', await request.json());
console.log('[API] Rate Limit:', rateLimitCache.get(`${userId}:${projectId}`));
```

---

## Siehe auch

### Verwandte Dokumentation

- [API-Übersicht](./api/README.md) - Alle Services & Hooks
- [Team Chat Service](./api/team-chat-service.md) - Firebase Service API
- [Admin SDK Routes](./api/admin-sdk-routes.md) - Server-Side Endpoints
- [Komponenten](./components/README.md) - Komponenten-Details
- [ADRs](./adr/README.md) - Architecture Decisions

### Externe Ressourcen

- [React Query Dokumentation](https://tanstack.com/query/latest/docs/react/overview)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Playwright Testing](https://playwright.dev/docs/intro)

### Design System

- [CeleroPress Design System](../../design-system/DESIGN_SYSTEM.md)
- Heroicons: Nur `/24/outline` Icons verwenden
- Tailwind CSS Utility-Klassen

---

**Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-20
**Maintainer:** CeleroPress Team
**Status:** ✅ Production-Ready
