# Communication Components - Komponenten-Dokumentation

> **Modul**: Communication Components
> **Version**: 2.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-10-20

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [TeamChat](#teamchat)
- [MessageInput](#messageinput)
- [MentionDropdown](#mentiondropdown)
- [FloatingChat](#floatingchat)
- [CommunicationModal](#communicationmodal)
- [AssetPreview](#assetpreview)
- [AssetPickerModal](#assetpickermodal)
- [Common Patterns](#common-patterns)
- [Styling-Richtlinien](#styling-richtlinien)
- [Accessibility](#accessibility)
- [Performance-Tipps](#performance-tipps)

---

## Übersicht

Die Communication Components bestehen aus 7 Haupt-Komponenten:

| Komponente | Datei | Zweck | Test-Coverage |
|------------|-------|-------|---------------|
| **TeamChat** | `TeamChat.tsx` | Haupt-Chat-Komponente | 90% |
| **MessageInput** | `TeamChat/MessageInput.tsx` | Extrahiertes Input-Feld | 88% |
| **MentionDropdown** | `MentionDropdown.tsx` | @-Mention Autocomplete | 85% |
| **FloatingChat** | `FloatingChat.tsx` | Minimalistisches Widget | 87% |
| **CommunicationModal** | `CommunicationModal.tsx` | Projekt-Kommunikation | 82% |
| **AssetPreview** | `AssetPreview.tsx` | Asset-Card Vorschau | 90% |
| **AssetPickerModal** | `AssetPickerModal.tsx` | Asset-Auswahl Modal | 85% |

---

## TeamChat

**Datei:** `src/components/projects/communication/TeamChat.tsx`

Haupt-Komponente für Team-Chat mit Real-time Messages, @-Mentions, Reactions, Asset-Attachments.

### Props

```typescript
interface TeamChatProps {
  projectId: string;              // Firestore Project ID
  projectTitle: string;           // Für Push-Notifications
  organizationId: string;         // Multi-Tenancy
  userId: string;                 // Firebase User UID
  userDisplayName: string;        // User Display Name
  lastReadTimestamp?: Date | null; // Optional: Unread-Tracking
}
```

### Verwendung

```tsx
import { TeamChat } from '@/components/projects/communication/TeamChat';

<TeamChat
  projectId="project-123"
  projectTitle="Website Relaunch"
  organizationId="org-456"
  userId={user.uid}
  userDisplayName={user.displayName || 'Unbekannter User'}
  lastReadTimestamp={new Date()}
/>
```

### Features

#### Real-time Messages
- ✅ Firebase Real-time Subscriptions (via `useTeamMessages` Hook)
- ✅ React Query Caching
- ✅ Optimistic Updates beim Senden
- ✅ Auto-Scroll zu neuen Messages

#### Message Display
- ✅ **Datums-Separatoren** - "Heute", "Gestern", Datum
- ✅ **Unread Indicator** - "Neue Nachrichten" Badge
- ✅ **Eigene Messages rechts** - Fremde links
- ✅ **Avatar-Anzeige** - Mit Initials Fallback
- ✅ **Bearbeitet-Badge** - Transparenz für Edits

#### @-Mentions
- ✅ **Autocomplete-Dropdown** - Filtert Team-Mitglieder
- ✅ **Keyboard-Navigation** - Arrow-Keys, Enter, Escape
- ✅ **Visual Highlighting** - Gelber Badge für eigene Mentions
- ✅ **Push-Notifications** - Via `teamChatNotificationsService`

#### Reactions
- ✅ **3 Reaction-Typen** - 👍 👎 🤚
- ✅ **Toggle-Mechanik** - User kann nur 1 Reaction haben
- ✅ **Tooltip mit Namen** - Zeigt alle Reagierenden
- ✅ **Real-time Updates**

#### Asset-Attachments
- ✅ **Asset-Picker Modal** - Integration mit Media-Service
- ✅ **Preview-Cards** - Inline-Vorschau
- ✅ **Link-Format** - `[Filename.jpg](asset://projectId/assetId)`
- ✅ **Security-Check** - Nur Assets aus aktuellem Projekt

#### Emojis
- ✅ **Emoji-Picker** - 32 häufig verwendete Emojis
- ✅ **Text-Emoji Ersetzung** - `:)` → 😊, `<3` → ❤️
- ✅ **Inline-Rendering**

### State Management

```typescript
// React Query Hooks
const { data: messages = [], isLoading } = useTeamMessages(projectId);
const sendMessageMutation = useSendMessage();
const reactionMutation = useMessageReaction();

// Local State
const [newMessage, setNewMessage] = useState('');
const [isTeamMember, setIsTeamMember] = useState(false);
const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
const [showMentionDropdown, setShowMentionDropdown] = useState(false);
const [showAssetPicker, setShowAssetPicker] = useState(false);
```

### Event Handlers

#### handleSendMessage

```typescript
const handleSendMessage = async () => {
  if (!newMessage.trim() || !isTeamMember) return;

  // Extract Mentions
  const mentions = teamChatService.extractMentions(newMessage);

  // Send via Admin SDK API Route
  await sendMessageMutation.mutateAsync({
    projectId,
    content: newMessage,
    authorId: userId,
    authorName: userDisplayName,
    organizationId,
    mentions,
  });

  // Push-Notifications für Mentions
  if (mentions.length > 0) {
    const mentionedUserIds = teamChatNotificationsService.extractMentionedUserIds(
      newMessage,
      teamMembers
    );

    await teamChatNotificationsService.sendMentionNotifications({
      mentionedUserIds,
      messageContent: newMessage,
      authorId: userId,
      authorName: userDisplayName,
      projectId,
      projectTitle,
      organizationId
    });
  }

  setNewMessage('');
};
```

#### handleReaction

```typescript
const handleReaction = useCallback(async (messageId: string, emoji: string) => {
  await reactionMutation.mutateAsync({
    projectId,
    messageId,
    emoji,
    userId,
    userName: userDisplayName,
  });
}, [projectId, userId, userDisplayName, reactionMutation]);
```

### Performance-Optimierungen

- ✅ `useCallback` für Event-Handler (verhindert Re-Renders)
- ✅ MessageInput als `React.memo` (88% weniger Re-Renders)
- ✅ React Query Caching (800ms Initial Load vs. 2.3s vorher)
- ✅ Optimistic Updates (50ms UI-Feedback vs. 1.2s vorher)

### Styling

```tsx
{/* Eigene Messages - rechts */}
<div className="bg-primary-50 text-gray-900 rounded-l-lg rounded-tr-lg px-4 py-2">
  {message.content}
</div>

{/* Fremde Messages - links */}
<div className="bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg px-4 py-2">
  {message.content}
</div>
```

**Design System:** [CeleroPress Design System](../../../design-system/DESIGN_SYSTEM.md)

---

## MessageInput

**Datei:** `src/components/projects/communication/TeamChat/MessageInput.tsx`

Extrahierte Input-Komponente (Phase 2 Modularisierung) mit @-Mentions, Asset-Picker, Emoji-Picker.

### Props

```typescript
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

### Verwendung

```tsx
import { MessageInput } from '@/components/projects/communication/TeamChat/MessageInput';

<MessageInput
  newMessage={newMessage}
  sending={sendMessageMutation.isPending}
  textareaRef={textareaRef}
  handleTextChange={handleTextChange}
  handleKeyDown={handleKeyDown}
  handleSendMessage={handleSendMessage}
  setShowAssetPicker={setShowAssetPicker}
  setShowEmojiPicker={setShowEmojiPicker}
  showMentionDropdown={showMentionDropdown}
  mentionDropdownPosition={mentionDropdownPosition}
  mentionSearchTerm={mentionSearchTerm}
  teamMembers={teamMembers}
  selectedMentionIndex={selectedMentionIndex}
  selectMention={selectMention}
  setShowMentionDropdown={setShowMentionDropdown}
/>
```

### Features

- ✅ **Textarea** - Auto-resize (1 Row default)
- ✅ **Icon-Buttons** - Asset-Picker, Emoji-Picker (innerhalb Textarea)
- ✅ **Send-Button** - Rechts vom Textarea (ArrowRightIcon)
- ✅ **MentionDropdown** - Inline Autocomplete
- ✅ **Enter-to-Send** - Shift+Enter für neue Zeile
- ✅ **Disabled State** - Während Sending

### Performance

**React.memo:**

```typescript
export const MessageInput: React.FC<MessageInputProps> = React.memo(({ ... }) => {
  // Component Logic
});
```

**Vorher:** 40 Re-Renders pro Message
**Nachher:** 5 Re-Renders pro Message (88% Reduktion)

### Styling

```tsx
<div className="border-t border-gray-200 px-4 pt-4 pb-2 bg-white">
  <div className="flex items-center space-x-3">
    {/* Textarea mit Icons INNERHALB */}
    <div className="flex-1 relative">
      <textarea
        className="w-full text-base border border-gray-300 rounded-lg px-3 py-2 pr-20 h-[44px]"
        rows={1}
      />

      {/* Icons Container */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-white flex items-center space-x-1">
        <button><PaperClipIcon /></button>
        <button><FaceSmileIcon /></button>
      </div>
    </div>

    {/* Send-Button */}
    <button className="h-[44px] px-4 bg-primary">
      <ArrowRightIcon />
    </button>
  </div>
</div>
```

---

## MentionDropdown

**Datei:** `src/components/projects/communication/MentionDropdown.tsx`

Autocomplete-Dropdown für @-Mentions mit Keyboard-Navigation.

### Props

```typescript
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

### Verwendung

```tsx
<MentionDropdown
  isVisible={showMentionDropdown}
  position={{ top: 100, left: 200 }}
  searchTerm="Max"
  teamMembers={teamMembers}
  selectedIndex={0}
  onSelect={(member) => console.log('Selected:', member)}
  onClose={() => setShowMentionDropdown(false)}
/>
```

### Features

- ✅ **Fuzzy-Search** - Filtert nach `displayName` und `email`
- ✅ **Keyboard-Navigation** - Arrow-Keys, Enter, Escape
- ✅ **Avatar-Anzeige** - Mit Initials Fallback
- ✅ **Hover-Highlight** - Visual Feedback
- ✅ **Position-Berechnung** - Über der Textarea

### Keyboard Shortcuts

| Key | Aktion |
|-----|--------|
| `Arrow Down` | Nächster Member |
| `Arrow Up` | Vorheriger Member |
| `Enter` | Member auswählen |
| `Escape` | Dropdown schließen |

---

## FloatingChat

**Datei:** `src/components/projects/communication/FloatingChat.tsx`

Minimalistisches Chat-Widget mit Unread-Badge und LocalStorage State.

### Props

```typescript
interface FloatingChatProps {
  projectId: string;
  projectTitle: string;
  organizationId: string;
  userId: string;
  userDisplayName: string;
}
```

### Verwendung

```tsx
<FloatingChat
  projectId="project-123"
  projectTitle="Website Relaunch"
  organizationId="org-456"
  userId={user.uid}
  userDisplayName={user.displayName}
/>
```

### Features

#### Chat-Zustand
- ✅ **LocalStorage** - Persistent State (offen/geschlossen)
- ✅ **Auto-Open** - Beim ersten Projekt-Besuch
- ✅ **Globaler Key** - `chat-open-state`

#### Unread-Tracking
- ✅ **Counter-Badge** - Roter Badge mit Anzahl (max 9+)
- ✅ **Puls-Punkt** - Grüner animierter Punkt
- ✅ **Auto-Reset** - Bei Chat-Öffnung

#### Team-Avatare
- ✅ **Bis zu 5 Avatare** - Im Header
- ✅ **"+X" Badge** - Für weitere Mitglieder
- ✅ **Hover-Tooltip** - Namen anzeigen

#### Clear-Chat
- ✅ **Admin-Funktion** - Löscht kompletten Verlauf
- ✅ **Confirmation-Dialog** - Warnung vor Löschen

### State Management

```typescript
// Custom Hook für LocalStorage
const { isOpen, setIsOpen } = useFloatingChatState(projectId);

// Unread-Tracking
const [unreadCount, setUnreadCount] = useState(0);
const [lastReadTimestamp, setLastReadTimestamp] = useState<Date | null>(null);

// Team-Daten
const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
const [assignedMembers, setAssignedMembers] = useState<TeamMember[]>([]);
```

### Animations

```css
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
```

---

## CommunicationModal

**Datei:** `src/components/projects/communication/CommunicationModal.tsx`

Modal für Projekt-Kommunikations-Feed (E-Mails, Notizen, Status-Updates).

### Props

```typescript
interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}
```

### Verwendung

```tsx
<CommunicationModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  projectId="project-123"
  projectTitle="Website Relaunch"
/>
```

### Features

#### Tab-Navigation
- ✅ **Externe Kommunikation** - E-Mails, Meetings, Anrufe
- ✅ **Team-Chat** - Interne Nachrichten

#### Externe Kommunikation
- ✅ **E-Mail-Threads** - Verknüpfte E-Mails
- ✅ **Interne Notizen** - Team-only
- ✅ **Status-Updates** - Projekt-Änderungen
- ✅ **Search & Filter** - Durchsuchbar

#### Team-Chat Integration
- ✅ **Message-Types** - Allgemein, Planung, Feedback
- ✅ **Planning-Context** - Strategie, Briefing, Inspiration, Recherche
- ✅ **@-Mentions** - Team erwähnen
- ✅ **Attachments** - Dateien anhängen

---

## AssetPreview

**Datei:** `src/components/projects/communication/AssetPreview.tsx`

Preview-Card für Asset-Links in Messages.

### Props

```typescript
interface AssetPreviewProps {
  assetId: string;
  assetType: 'asset' | 'folder';
  linkText: string;
  projectId: string;
  organizationId: string;
  isOwnMessage: boolean;
  onAssetClick: () => void;
}
```

### Features

- ✅ **Thumbnail-Anzeige** - Für Bilder
- ✅ **Fallback-Icon** - Für andere Dateitypen
- ✅ **Click-Handler** - Öffnet Asset
- ✅ **Security-Check** - Nur Assets aus aktuellem Projekt

---

## AssetPickerModal

**Datei:** `src/components/projects/communication/AssetPickerModal.tsx`

Modal zur Asset-Auswahl für Attachments.

### Props

```typescript
interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: SelectedAsset) => void;
  projectId: string;
  organizationId: string;
}

interface SelectedAsset {
  id: string;
  name: string;
  type: 'asset' | 'folder';
}
```

### Features

- ✅ **Media-Service Integration** - Lädt Assets aus Firestore
- ✅ **Grid-Layout** - Thumbnails mit Hover-Effects
- ✅ **Search** - Asset-Namen durchsuchen
- ✅ **Multi-Type Support** - Bilder, Videos, Dokumente

---

## Common Patterns

### 1. Team-Membership Check

```typescript
useEffect(() => {
  const checkTeamMembership = async () => {
    const [project, members] = await Promise.all([
      projectService.getById(projectId, { organizationId }),
      teamMemberService.getByOrganization(organizationId)
    ]);

    const isMember = Boolean(
      project.assignedTo?.includes(userId) ||
      project.userId === userId ||
      project.projectManager === userId
    );

    setIsTeamMember(isMember);
  };

  checkTeamMembership();
}, [projectId, userId, organizationId]);
```

### 2. Auto-Scroll zu neuen Messages

```typescript
useEffect(() => {
  if (messages.length > 0 && !loading) {
    setTimeout(() => scrollToBottom(), 300);
  }
}, [messages.length, loading]);

const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
};
```

### 3. Body-Scroll-Jump Prevention

```typescript
useEffect(() => {
  if (showModal) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';
  }

  return () => {
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';
  };
}, [showModal]);
```

---

## Styling-Richtlinien

### Tailwind CSS Classes

**Buttons:**

```tsx
<button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg disabled:opacity-50">
  Senden
</button>
```

**Input-Felder:**

```tsx
<textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
```

**Message-Bubbles:**

```tsx
{/* Eigene Message */}
<div className="bg-primary-50 text-gray-900 rounded-l-lg rounded-tr-lg px-4 py-2 shadow-sm">

{/* Fremde Message */}
<div className="bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg px-4 py-2 shadow-sm">
```

### Icons (Heroicons /24/outline)

```tsx
import {
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  FaceSmileIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

<ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
```

---

## Accessibility

### ARIA-Labels

```tsx
<button aria-label="Send message" onClick={handleSend}>
  <ArrowRightIcon />
</button>

<textarea
  aria-label="Message input"
  placeholder="Nachricht schreiben..."
/>
```

### Keyboard-Navigation

- ✅ **Enter-to-Send** - Shift+Enter für neue Zeile
- ✅ **Arrow-Keys** - Mention-Dropdown Navigation
- ✅ **Escape** - Modals schließen
- ✅ **Tab-Order** - Logische Tab-Reihenfolge

### Screen-Reader Support

```tsx
<div role="log" aria-live="polite" aria-label="Chat messages">
  {messages.map(msg => (
    <div key={msg.id} role="article">
      <span className="sr-only">{msg.authorName} sagt:</span>
      {msg.content}
    </div>
  ))}
</div>
```

---

## Performance-Tipps

### 1. React.memo für teure Komponenten

```typescript
export const MessageInput = React.memo(({ ... }) => {
  // Component Logic
});
```

### 2. useCallback für Event-Handler

```typescript
const handleReaction = useCallback((messageId: string, emoji: string) => {
  // Handler Logic
}, [projectId, userId]);
```

### 3. Virtualization für lange Listen

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
});
```

### 4. Lazy Loading für Modals

```typescript
import dynamic from 'next/dynamic';

const AssetPickerModal = dynamic(() =>
  import('./AssetPickerModal').then(mod => mod.AssetPickerModal)
);
```

---

**Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-20
