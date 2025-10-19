# Communication Components Refactoring - Implementierungsplan

**Version:** 1.0
**Erstellt:** 2025-10-19
**Status:** 📋 Geplant
**Modul:** Phase 0.2 - Shared Components
**Aufwand:** L (Large) - 3-4 Tage

---

## 📋 Übersicht

Die Communication Components sind **kritische Shared Components**, die in **allen Tabs** verwendet werden (GlobalChat). Ein Refactoring dieser Module ist essentiell, bevor die Tab-Module angegangen werden.

**Wichtige Korrektur:**
- **Geschätzte LOC in Master Checklist:** ~400+
- **Tatsächliche LOC:** **2.713 Zeilen** (fast 7x mehr!)
- **Aufwand-Update:** M (Medium) → **L (Large)** - 3-4 Tage

---

## 🎯 Ziele

- [x] React Query für Chat-State Management integrieren
- [x] TeamChat.tsx modularisieren (1096 → < 300 Zeilen pro Datei)
- [x] CommunicationModal.tsx modularisieren (536 → < 300 Zeilen pro Datei)
- [x] Performance-Optimierungen implementieren (useCallback, useMemo)
- [x] Test-Coverage erreichen (>80%)
- [x] Vollständige Dokumentation erstellen
- [x] Production-Ready Code Quality sicherstellen

---

## 📁 Ist-Zustand (vor Refactoring)

### Dateien & LOC

```
src/components/projects/communication/
├── TeamChat.tsx                 (1096 Zeilen) ⚠️ SEHR GROSS!
├── CommunicationModal.tsx       (536 Zeilen)  ⚠️ GROSS!
├── FloatingChat.tsx             (375 Zeilen)
├── AssetPickerModal.tsx         (297 Zeilen)
├── AssetPreview.tsx             (266 Zeilen)
├── MentionDropdown.tsx          (143 Zeilen)
└── __tests__/
    └── CommunicationModal-planning-features.test.tsx
─────────────────────────────────────────────────────
GESAMT:                          ~2.713 Zeilen
```

### Probleme identifiziert

#### 1. TeamChat.tsx (1096 Zeilen - KRITISCH!)

**Probleme:**
- ❌ **Monolith-Komponente:** 1096 Zeilen in einer Datei
- ❌ **Viele Responsibilities:** Messages, Mentions, Attachments, Reactions, Notifications
- ❌ **Schwer wartbar:** Zu viel Logik in einer Komponente
- ❌ **Schwer testbar:** Integration Tests schwierig

**Features in TeamChat:**
- Message-Liste mit Auto-Scroll
- Message-Input mit Mentions (@-Funktion)
- Asset-Attachments (Bilder, Videos, Dokumente)
- Message-Reactions (Thumbs up/down, etc.)
- Team-Member-Verwaltung
- Notifications (unread messages)
- Loading & Error States

**Vorschlag:** Aufteilen in:
1. `TeamChat.tsx` - Main Orchestrator (< 300 Zeilen)
2. `MessageList.tsx` - Message-Rendering
3. `MessageItem.tsx` - Einzelne Message
4. `MessageInput.tsx` - Input mit Mentions & Attachments
5. `ReactionBar.tsx` - Reactions auf Messages
6. Custom Hook: `useTeamChat.ts` - Chat-Logik & State

#### 2. CommunicationModal.tsx (536 Zeilen)

**Probleme:**
- ❌ **Groß:** 536 Zeilen (empfohlen: < 500)
- ❌ **Mehrere Features:** Message-Feed, Filtering, Planning Context

**Features:**
- Message-Feed (general, planning, feedback, file_upload)
- Planning Context (strategy, briefing, inspiration, research)
- Filter & Search
- Message Creation
- Mentions & Attachments

**Vorschlag:** Aufteilen in:
1. `CommunicationModal.tsx` - Main Orchestrator (< 300 Zeilen)
2. `MessageFeed.tsx` - Feed-Rendering
3. `MessageFilters.tsx` - Filter & Search
4. `MessageComposer.tsx` - Message Creation Form

#### 3. FloatingChat.tsx (375 Zeilen)

**Probleme:**
- ⚠️ **Mittelgroß:** 375 Zeilen (akzeptabel, aber optimierbar)
- ❌ **LocalStorage-Logik:** Könnte in Custom Hook ausgelagert werden

**Vorschlag:**
- Custom Hook: `useFloatingChatState.ts` - LocalStorage & Toggle State
- Komponente auf < 300 Zeilen reduzieren

#### 4. State Management

**Problem:**
- ❌ **Kein React Query:** Verwendet `useState` + `useEffect` für Firebase-Daten
- ❌ **Manuelle Subscriptions:** Real-time Updates komplex implementiert
- ❌ **Kein Caching:** Daten werden bei jedem Mount neu geladen

**Vorschlag:**
- React Query Hooks für Chat-Daten (`useTeamMessages`, `useSendMessage`)
- Firebase Real-time Subscriptions mit React Query kombinieren
- Query Invalidierung bei neuen Messages

---

## 🚀 Die 7 Phasen

### Phase 0: Vorbereitung & Setup

**Ziel:** Sicherer Start mit Backup und Dokumentation des Ist-Zustands

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/communication-components-refactoring-production
  ```

- [ ] Ist-Zustand dokumentieren ✅ (siehe oben)

- [ ] Backup-Dateien erstellen
  ```bash
  cp src/components/projects/communication/TeamChat.tsx \
     src/components/projects/communication/TeamChat.backup.tsx
  cp src/components/projects/communication/CommunicationModal.tsx \
     src/components/projects/communication/CommunicationModal.backup.tsx
  cp src/components/projects/communication/FloatingChat.tsx \
     src/components/projects/communication/FloatingChat.backup.tsx
  ```

- [ ] Dependencies prüfen
  - React Query installiert? (`@tanstack/react-query`)
  - Testing Libraries vorhanden? (`jest`, `@testing-library/react`)
  - Firebase SDK korrekt konfiguriert?

#### Deliverable

- Feature-Branch erstellt
- 3 Backup-Dateien angelegt (TeamChat, CommunicationModal, FloatingChat)
- Dokumentation des Ist-Zustands (2.713 Zeilen Code)

#### Phase-Bericht Template

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/communication-components-refactoring-production`
- Ist-Zustand: 7 Dateien, 2.713 Zeilen Code
- Backups: TeamChat.backup.tsx, CommunicationModal.backup.tsx, FloatingChat.backup.tsx
- Dependencies: Alle vorhanden

### Struktur (Ist)
- TeamChat.tsx: 1096 Zeilen ⚠️
- CommunicationModal.tsx: 536 Zeilen ⚠️
- FloatingChat.tsx: 375 Zeilen
- AssetPickerModal.tsx: 297 Zeilen
- AssetPreview.tsx: 266 Zeilen
- MentionDropdown.tsx: 143 Zeilen

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Communication Components Refactoring

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup ⭐

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

**Dauer:** 1-2 Stunden

#### 0.5.1 TODO-Kommentare finden & entfernen

```bash
# TODOs finden
grep -rn "TODO:" src/components/projects/communication
# oder
rg "TODO:" src/components/projects/communication
```

**Aktion:**
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen (nicht verschieben!)
- [ ] Zugehörigen Code prüfen (implementieren oder löschen)

#### 0.5.2 Console-Logs finden & entfernen

```bash
# Debug-Logs finden
grep -rn "console\." src/components/projects/communication
# oder
rg "console\." src/components/projects/communication
```

**Erlaubt ✅:**
```typescript
// Production-relevante Errors in catch-blocks
catch (error) {
  console.error('Failed to load messages:', error);
}
```

**Zu entfernen ❌:**
```typescript
// Debug-Logs
console.log('messages:', messages);
console.log('🔍 Loading...');
console.log('📊 Chat State:', chatState);
```

**Aktion:**
- [ ] Alle console.log() statements entfernen
- [ ] Nur console.error() in catch-blocks behalten

#### 0.5.3 Deprecated Functions finden & entfernen

**Anzeichen für deprecated Functions:**
- Mock-Implementations (`setTimeout(resolve, 2000)`)
- Kommentare wie "old", "deprecated", "unused"
- Functions die nur noch an einer Stelle aufgerufen werden

**Aktion:**
- [ ] Code auf "deprecated", "old", "legacy" durchsuchen
- [ ] Mock-Implementations identifizieren
- [ ] Functions entfernen + alle Aufrufe

#### 0.5.4 Unused State entfernen

```bash
# State-Deklarationen finden
grep -n "useState" src/components/projects/communication/*.tsx
```

**Aktion:**
- [ ] Alle useState-Deklarationen durchgehen
- [ ] Unused States identifizieren
- [ ] States + Setter entfernen

#### 0.5.5 Kommentierte Code-Blöcke entfernen

**Aktion:**
- [ ] Auskommentierte Code-Blöcke identifizieren
- [ ] Entscheidung: Implementieren oder entfernen?
- [ ] Code-Blöcke vollständig löschen

#### 0.5.6 ESLint Auto-Fix

```bash
# Unused imports/variables automatisch entfernen
npx eslint src/components/projects/communication --fix

# Prüfen was behoben wurde
npx eslint src/components/projects/communication
```

#### 0.5.7 Manueller Test

**WICHTIG:** Nach dem Cleanup muss der Code noch funktionieren!

```bash
# Development-Server starten
npm run dev

# Komponenten manuell testen:
# - FloatingChat öffnen
# - TeamChat Nachricht senden
# - CommunicationModal öffnen
# - Mentions & Attachments testen
```

**Aktion:**
- [ ] Dev-Server starten
- [ ] Alle Chat-Features testen
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt oder umgesetzt
- [ ] Debug-Console-Logs entfernt (~X Logs)
- [ ] Deprecated Functions entfernt
- [ ] Unused State-Variablen entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Unused imports entfernt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- [X] TODO-Kommentare
- ~[Y] Debug-Console-Logs
- [Z] Deprecated Functions
- [A] Unused State-Variablen
- [B] Kommentierte Code-Blöcke
- Unused imports (via ESLint)

### Ergebnis
- TeamChat.tsx: [X] → [Y] Zeilen (-[Z] Zeilen toter Code)
- CommunicationModal.tsx: [X] → [Y] Zeilen (-[Z] Zeilen toter Code)
- FloatingChat.tsx: [X] → [Y] Zeilen (-[Z] Zeilen toter Code)
- Saubere Basis für Phase 1 (React Query Integration)

### Manueller Test
- ✅ FloatingChat öffnet
- ✅ TeamChat funktioniert
- ✅ Nachrichten senden funktioniert
- ✅ Mentions & Attachments funktionieren
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- [X] TODO-Kommentare entfernt
- ~[Y] Debug-Console-Logs entfernt
- [Z] Deprecated Functions entfernt
- [A] Unused State entfernt
- Kommentierte Code-Blöcke gelöscht
- Unused imports entfernt via ESLint

Saubere Basis für React Query Integration (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Ziel:** State Management mit React Query ersetzen

#### 1.1 Custom Hooks erstellen

**WICHTIG:** Firebase Real-time Subscriptions + React Query kombinieren!

##### Hook 1: `useTeamMessages.ts`

**Location:** `src/lib/hooks/useTeamMessages.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamChatService } from '@/lib/firebase/team-chat-service';
import { useEffect } from 'react';

/**
 * Hook für Team-Chat-Messages mit Real-time Updates
 * Kombiniert React Query Caching mit Firebase Real-time Subscriptions
 */
export function useTeamMessages(projectId: string | undefined) {
  const queryClient = useQueryClient();

  // Initial Query (lädt Messages aus Firestore)
  const query = useQuery({
    queryKey: ['team-messages', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No projectId');
      return teamChatService.getMessages(projectId);
    },
    enabled: !!projectId,
    staleTime: 0, // Immer fresh wegen Real-time Updates
  });

  // Real-time Subscription
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = teamChatService.subscribeToMessages(
      projectId,
      (messages) => {
        // Update Cache mit neuen Messages
        queryClient.setQueryData(['team-messages', projectId], messages);
      }
    );

    return () => unsubscribe();
  }, [projectId, queryClient]);

  return query;
}

/**
 * Hook zum Senden einer Team-Chat-Message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      message: string;
      userId: string;
      userName: string;
      mentions?: string[];
      attachments?: any[];
    }) => {
      return teamChatService.sendMessage(data);
    },
    onSuccess: (_, variables) => {
      // Invalidate Query (Real-time Subscription updated automatisch)
      queryClient.invalidateQueries({
        queryKey: ['team-messages', variables.projectId]
      });
    },
  });
}

/**
 * Hook für Message Reactions
 */
export function useMessageReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      messageId: string;
      userId: string;
      reaction: string; // 'thumbs_up' | 'thumbs_down' | etc.
    }) => {
      return teamChatService.addReaction(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['team-messages', variables.projectId]
      });
    },
  });
}

/**
 * Hook für ungelesene Nachrichten
 */
export function useUnreadCount(projectId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['unread-messages', projectId, userId],
    queryFn: async () => {
      if (!projectId || !userId) throw new Error('Missing params');
      return teamChatService.getUnreadCount(projectId, userId);
    },
    enabled: !!projectId && !!userId,
    staleTime: 30 * 1000, // 30 Sekunden
    refetchInterval: 60 * 1000, // Alle 60 Sekunden neu laden
  });
}
```

##### Hook 2: `useCommunicationMessages.ts`

**Location:** `src/lib/hooks/useCommunicationMessages.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectCommunicationService } from '@/lib/firebase/project-communication-service';

/**
 * Hook für Project Communication Messages
 */
export function useCommunicationMessages(
  projectId: string | undefined,
  filters?: {
    messageType?: 'general' | 'planning' | 'feedback' | 'file_upload';
    planningContext?: 'strategy' | 'briefing' | 'inspiration' | 'research';
    searchTerm?: string;
  }
) {
  return useQuery({
    queryKey: ['communication-messages', projectId, filters],
    queryFn: async () => {
      if (!projectId) throw new Error('No projectId');
      return projectCommunicationService.getMessages(projectId, filters);
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });
}

/**
 * Hook zum Erstellen einer Communication Message
 */
export function useCreateCommunicationMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      messageType: string;
      planningContext?: string;
      content: string;
      author: string;
      authorName: string;
      mentions: string[];
      attachments: any[];
      organizationId: string;
    }) => {
      return projectCommunicationService.createMessage(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['communication-messages', variables.projectId]
      });
    },
  });
}
```

##### Hook 3: `useFloatingChatState.ts`

**Location:** `src/lib/hooks/useFloatingChatState.ts`

```typescript
import { useState, useEffect } from 'react';

/**
 * Custom Hook für Floating Chat State (LocalStorage)
 * Extrahiert LocalStorage-Logik aus FloatingChat-Komponente
 */
export function useFloatingChatState(projectId: string) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;

    // Prüfe ob es der erste Besuch dieses Projekts ist
    const visitedProjects = JSON.parse(localStorage.getItem('visited-projects') || '[]');
    const isFirstVisit = !visitedProjects.includes(projectId);

    // Globaler Key für den Chat-Zustand
    const savedState = localStorage.getItem('chat-open-state');

    if (isFirstVisit) {
      // Projekt als besucht markieren
      visitedProjects.push(projectId);
      localStorage.setItem('visited-projects', JSON.stringify(visitedProjects));
      return true; // Chat beim ersten Besuch offen
    }

    return savedState === 'open';
  });

  // LocalStorage synchronisieren
  useEffect(() => {
    localStorage.setItem('chat-open-state', isOpen ? 'open' : 'closed');
  }, [isOpen]);

  return { isOpen, setIsOpen };
}
```

#### 1.2 TeamChat.tsx anpassen

**Entfernen:**
```typescript
// Alte useState/useEffect-Pattern entfernen
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadMessages = async () => {
    // ...
  };
  loadMessages();
}, [projectId]);
```

**Hinzufügen:**
```typescript
import { useTeamMessages, useSendMessage, useMessageReaction } from '@/lib/hooks/useTeamMessages';

// In der Komponente
const { data: messages = [], isLoading, error } = useTeamMessages(projectId);
const sendMessage = useSendMessage();
const addReaction = useMessageReaction();

// Handler
const handleSendMessage = async (message: string) => {
  await sendMessage.mutateAsync({
    projectId,
    message,
    userId,
    userName: userDisplayName,
    mentions: extractedMentions,
    attachments: selectedAssets,
  });
};

const handleReaction = async (messageId: string, reaction: string) => {
  await addReaction.mutateAsync({
    projectId,
    messageId,
    userId,
    reaction,
  });
};
```

#### 1.3 CommunicationModal.tsx anpassen

```typescript
import { useCommunicationMessages, useCreateCommunicationMessage } from '@/lib/hooks/useCommunicationMessages';

// State für Filter
const [filters, setFilters] = useState({
  messageType: undefined,
  planningContext: undefined,
  searchTerm: '',
});

// Hooks
const { data: messages = [], isLoading } = useCommunicationMessages(projectId, filters);
const createMessage = useCreateCommunicationMessage();

// Handler
const handleCreateMessage = async (data: any) => {
  await createMessage.mutateAsync({
    projectId,
    ...data,
    organizationId,
  });
};
```

#### 1.4 FloatingChat.tsx anpassen

```typescript
import { useFloatingChatState } from '@/lib/hooks/useFloatingChatState';

// Alte LocalStorage-Logik entfernen
// const [isOpen, setIsOpen] = useState(...);

// Neuer Hook
const { isOpen, setIsOpen } = useFloatingChatState(projectId);
```

#### Checkliste Phase 1

- [ ] 3 Custom Hook-Dateien erstellt
  - [ ] `useTeamMessages.ts` (4 Hooks: useTeamMessages, useSendMessage, useMessageReaction, useUnreadCount)
  - [ ] `useCommunicationMessages.ts` (2 Hooks: useCommunicationMessages, useCreateCommunicationMessage)
  - [ ] `useFloatingChatState.ts` (1 Hook: useFloatingChatState)
- [ ] TeamChat.tsx auf React Query umgestellt
- [ ] CommunicationModal.tsx auf React Query umgestellt
- [ ] FloatingChat.tsx auf Custom Hook umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test durchgeführt

#### Phase-Bericht Template

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- Custom Hooks (7 Hooks in 3 Dateien)
  - useTeamMessages.ts: useTeamMessages, useSendMessage, useMessageReaction, useUnreadCount
  - useCommunicationMessages.ts: useCommunicationMessages, useCreateCommunicationMessage
  - useFloatingChatState.ts: useFloatingChatState
- TeamChat.tsx vollständig auf React Query umgestellt
- CommunicationModal.tsx auf React Query umgestellt
- FloatingChat.tsx auf Custom Hook umgestellt

### Vorteile
- ✅ Real-time Updates mit React Query Caching kombiniert
- ✅ Automatisches Caching für Communication Messages (2min staleTime)
- ✅ Query Invalidierung bei Mutations
- ✅ Error Handling über React Query
- ✅ LocalStorage-Logik in Custom Hook ausgelagert
- ✅ Weniger Boilerplate Code

### Fixes
- [Liste von behobenen TypeScript-Fehlern]

### Commit
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für Communication Components abgeschlossen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** Große Komponenten aufteilen, Duplikate eliminieren

#### Phase 2.1: TeamChat.tsx Modularisierung (KRITISCH!)

**Vorher:**
```
TeamChat.tsx (1096 Zeilen) - Monolith
```

**Nachher:**
```
src/components/projects/communication/TeamChat/
├── TeamChat.tsx                (< 250 Zeilen) - Main Orchestrator
├── MessageList.tsx             (~150 Zeilen) - Message-Liste mit Auto-Scroll
├── MessageItem.tsx             (~180 Zeilen) - Einzelne Message mit Reactions
├── MessageInput.tsx            (~220 Zeilen) - Input mit Mentions & Attachments
├── ReactionBar.tsx             (~80 Zeilen) - Reaction Buttons
├── UnreadIndicator.tsx         (~40 Zeilen) - Unread Message Badge
└── types.ts                    (~50 Zeilen) - Shared Types
```

**TeamChat.tsx (Main Orchestrator):**

```typescript
// src/components/projects/communication/TeamChat/TeamChat.tsx
import React from 'react';
import { useTeamMessages, useSendMessage } from '@/lib/hooks/useTeamMessages';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { UnreadIndicator } from './UnreadIndicator';
import { TeamChatProps } from './types';

export const TeamChat: React.FC<TeamChatProps> = ({
  projectId,
  projectTitle,
  organizationId,
  userId,
  userDisplayName,
  lastReadTimestamp
}) => {
  // React Query Hooks
  const { data: messages = [], isLoading, error } = useTeamMessages(projectId);
  const sendMessage = useSendMessage();

  // Handler
  const handleSendMessage = async (
    message: string,
    mentions: string[],
    attachments: any[]
  ) => {
    await sendMessage.mutateAsync({
      projectId,
      message,
      userId,
      userName: userDisplayName,
      mentions,
      attachments,
    });
  };

  // Loading/Error States
  if (isLoading) {
    return <div className="p-4">Lade Nachrichten...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Fehler beim Laden der Nachrichten</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header mit Unread Indicator */}
      <div className="border-b border-zinc-300 p-4">
        <h3 className="font-medium">{projectTitle}</h3>
        <UnreadIndicator
          messages={messages}
          lastReadTimestamp={lastReadTimestamp}
        />
      </div>

      {/* Message List */}
      <MessageList
        messages={messages}
        userId={userId}
        projectId={projectId}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        projectId={projectId}
        organizationId={organizationId}
        userId={userId}
        disabled={sendMessage.isPending}
      />
    </div>
  );
};
```

**MessageList.tsx:**

```typescript
// src/components/projects/communication/TeamChat/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import { TeamMessage } from './types';

interface MessageListProps {
  messages: TeamMessage[];
  userId: string;
  projectId: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  userId,
  projectId
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <p>Keine Nachrichten vorhanden. Schreibe die erste Nachricht!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          userId={userId}
          projectId={projectId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
```

**MessageItem.tsx:**

```typescript
// src/components/projects/communication/TeamChat/MessageItem.tsx
import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { ReactionBar } from './ReactionBar';
import { AssetPreview } from '../AssetPreview';
import { TeamMessage } from './types';

interface MessageItemProps {
  message: TeamMessage;
  userId: string;
  projectId: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  userId,
  projectId
}) => {
  const isOwnMessage = message.senderId === userId;

  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <Avatar
        name={message.senderName}
        size="sm"
      />

      {/* Message Content */}
      <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{message.senderName}</span>
          <span className="text-xs text-zinc-500">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        {/* Message Text */}
        <div className={`
          inline-block px-3 py-2 rounded-lg
          ${isOwnMessage
            ? 'bg-primary text-white'
            : 'bg-zinc-100 text-zinc-900'
          }
        `}>
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments?.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <AssetPreview
                key={attachment.id}
                asset={attachment}
              />
            ))}
          </div>
        )}

        {/* Reactions */}
        <ReactionBar
          messageId={message.id}
          reactions={message.reactions || {}}
          userId={userId}
          projectId={projectId}
        />
      </div>
    </div>
  );
};

function formatTimestamp(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();

  // Heute
  if (diff < 24 * 60 * 60 * 1000) {
    return timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  // Gestern oder älter
  return timestamp.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
```

**MessageInput.tsx:**

```typescript
// src/components/projects/communication/TeamChat/MessageInput.tsx
import React, { useState, useCallback } from 'react';
import { ArrowRightIcon, AtSymbolIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { MentionDropdown } from '../MentionDropdown';
import { AssetPickerModal } from '../AssetPickerModal';

interface MessageInputProps {
  onSendMessage: (message: string, mentions: string[], attachments: any[]) => Promise<void>;
  projectId: string;
  organizationId: string;
  userId: string;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  projectId,
  organizationId,
  userId,
  disabled
}) => {
  const [message, setMessage] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const handleSend = useCallback(async () => {
    if (!message.trim() && attachments.length === 0) return;

    await onSendMessage(message, mentions, attachments);

    // Reset
    setMessage('');
    setMentions([]);
    setAttachments([]);
  }, [message, mentions, attachments, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // @ für Mentions
    if (e.key === '@') {
      setShowMentions(true);
    }
  };

  return (
    <div className="border-t border-zinc-300 p-4">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex gap-2">
          {attachments.map((attachment, idx) => (
            <div key={idx} className="relative">
              <img src={attachment.url} alt="" className="h-16 w-16 object-cover rounded" />
              <button
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        {/* Mention Button */}
        <button
          onClick={() => setShowMentions(true)}
          className="p-2 hover:bg-zinc-100 rounded"
        >
          <AtSymbolIcon className="h-5 w-5 text-zinc-600" />
        </button>

        {/* Attachment Button */}
        <button
          onClick={() => setShowAssetPicker(true)}
          className="p-2 hover:bg-zinc-100 rounded"
        >
          <PaperClipIcon className="h-5 w-5 text-zinc-600" />
        </button>

        {/* Textarea */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht eingeben..."
          className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 resize-none"
          rows={1}
          disabled={disabled}
        />

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
        >
          <ArrowRightIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* Mention Dropdown */}
      {showMentions && (
        <MentionDropdown
          projectId={projectId}
          organizationId={organizationId}
          onSelect={(userId) => {
            setMentions([...mentions, userId]);
            setShowMentions(false);
          }}
          onClose={() => setShowMentions(false)}
        />
      )}

      {/* Asset Picker Modal */}
      {showAssetPicker && (
        <AssetPickerModal
          isOpen={showAssetPicker}
          onClose={() => setShowAssetPicker(false)}
          onSelect={(asset) => {
            setAttachments([...attachments, asset]);
            setShowAssetPicker(false);
          }}
          projectId={projectId}
          organizationId={organizationId}
        />
      )}
    </div>
  );
};
```

**ReactionBar.tsx:**

```typescript
// src/components/projects/communication/TeamChat/ReactionBar.tsx
import React from 'react';
import { HandThumbUpIcon, HandThumbDownIcon, HandRaisedIcon } from '@heroicons/react/24/outline';
import { useMessageReaction } from '@/lib/hooks/useTeamMessages';

interface ReactionBarProps {
  messageId: string;
  reactions: Record<string, string[]>; // { 'thumbs_up': ['user1', 'user2'] }
  userId: string;
  projectId: string;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
  messageId,
  reactions,
  userId,
  projectId
}) => {
  const addReaction = useMessageReaction();

  const handleReaction = async (reaction: string) => {
    await addReaction.mutateAsync({
      projectId,
      messageId,
      userId,
      reaction,
    });
  };

  const reactionTypes = [
    { type: 'thumbs_up', icon: HandThumbUpIcon },
    { type: 'thumbs_down', icon: HandThumbDownIcon },
    { type: 'hand_raised', icon: HandRaisedIcon },
  ];

  return (
    <div className="flex gap-2 mt-2">
      {reactionTypes.map(({ type, icon: Icon }) => {
        const count = reactions[type]?.length || 0;
        const isActive = reactions[type]?.includes(userId);

        return (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            className={`
              flex items-center gap-1 px-2 py-1 rounded text-xs
              ${isActive
                ? 'bg-primary text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }
            `}
          >
            <Icon className="h-4 w-4" />
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
};
```

**UnreadIndicator.tsx:**

```typescript
// src/components/projects/communication/TeamChat/UnreadIndicator.tsx
import React, { useMemo } from 'react';
import { TeamMessage } from './types';

interface UnreadIndicatorProps {
  messages: TeamMessage[];
  lastReadTimestamp?: Date | null;
}

export const UnreadIndicator: React.FC<UnreadIndicatorProps> = ({
  messages,
  lastReadTimestamp
}) => {
  const unreadCount = useMemo(() => {
    if (!lastReadTimestamp) return 0;

    return messages.filter(msg =>
      msg.timestamp > lastReadTimestamp
    ).length;
  }, [messages, lastReadTimestamp]);

  if (unreadCount === 0) return null;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-white text-xs rounded-full">
      <span>{unreadCount} ungelesene Nachricht{unreadCount !== 1 ? 'en' : ''}</span>
    </div>
  );
};
```

**types.ts:**

```typescript
// src/components/projects/communication/TeamChat/types.ts
export interface TeamChatProps {
  projectId: string;
  projectTitle: string;
  organizationId: string;
  userId: string;
  userDisplayName: string;
  lastReadTimestamp?: Date | null;
}

export interface TeamMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  content: string;
  mentions?: string[];
  attachments?: any[];
  reactions?: Record<string, string[]>;
  timestamp: Date;
}
```

**Backward Compatibility:**

```typescript
// src/components/projects/communication/TeamChat.tsx (3 Zeilen)
// Re-export für bestehende Imports
export { TeamChat } from './TeamChat/TeamChat';
```

#### Phase 2.2: CommunicationModal.tsx Modularisierung

**Vorher:**
```
CommunicationModal.tsx (536 Zeilen)
```

**Nachher:**
```
src/components/projects/communication/CommunicationModal/
├── CommunicationModal.tsx      (< 200 Zeilen) - Main Orchestrator
├── MessageFeed.tsx             (~150 Zeilen) - Feed-Rendering
├── MessageFilters.tsx          (~120 Zeilen) - Filter & Search
├── MessageComposer.tsx         (~180 Zeilen) - Message Creation Form
└── types.ts                    (~40 Zeilen) - Shared Types
```

**CommunicationModal.tsx (Main Orchestrator):**

```typescript
// src/components/projects/communication/CommunicationModal/CommunicationModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { useCommunicationMessages } from '@/lib/hooks/useCommunicationMessages';
import { MessageFilters } from './MessageFilters';
import { MessageFeed } from './MessageFeed';
import { MessageComposer } from './MessageComposer';
import { CommunicationModalProps } from './types';

export const CommunicationModal: React.FC<CommunicationModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle
}) => {
  const [filters, setFilters] = useState({
    messageType: undefined,
    planningContext: undefined,
    searchTerm: '',
  });

  const { data: messages = [], isLoading } = useCommunicationMessages(projectId, filters);

  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <DialogTitle>
        Kommunikation: {projectTitle}
      </DialogTitle>

      <DialogBody>
        {/* Filters */}
        <MessageFilters
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Message Feed */}
        <MessageFeed
          messages={messages}
          isLoading={isLoading}
        />

        {/* Message Composer */}
        <MessageComposer
          projectId={projectId}
        />
      </DialogBody>
    </Dialog>
  );
};
```

**Backward Compatibility:**

```typescript
// src/components/projects/communication/CommunicationModal.tsx (3 Zeilen)
export { CommunicationModal } from './CommunicationModal/CommunicationModal';
export type { CommunicationModalProps } from './CommunicationModal/types';
```

#### Checkliste Phase 2

- [ ] TeamChat.tsx modularisiert
  - [ ] 7 Dateien erstellt (TeamChat, MessageList, MessageItem, MessageInput, ReactionBar, UnreadIndicator, types)
  - [ ] 1096 Zeilen → ~970 Zeilen gesamt (verteilt auf 7 Dateien)
  - [ ] Backward Compatibility sichergestellt
- [ ] CommunicationModal.tsx modularisiert
  - [ ] 5 Dateien erstellt (CommunicationModal, MessageFeed, MessageFilters, MessageComposer, types)
  - [ ] 536 Zeilen → ~690 Zeilen gesamt (verteilt auf 5 Dateien)
  - [ ] Backward Compatibility sichergestellt
- [ ] FloatingChat.tsx optimiert (LocalStorage-Logik in Hook bereits in Phase 1)
- [ ] Alle Imports in bestehenden Dateien aktualisiert
- [ ] Manueller Test durchgeführt

#### Phase-Bericht Template

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Phase 2.1: TeamChat Modularisierung
- TeamChat.tsx: 1096 Zeilen → 7 Dateien (~970 Zeilen gesamt)
  - TeamChat.tsx (250 Zeilen) - Main Orchestrator
  - MessageList.tsx (150 Zeilen)
  - MessageItem.tsx (180 Zeilen)
  - MessageInput.tsx (220 Zeilen)
  - ReactionBar.tsx (80 Zeilen)
  - UnreadIndicator.tsx (40 Zeilen)
  - types.ts (50 Zeilen)

### Phase 2.2: CommunicationModal Modularisierung
- CommunicationModal.tsx: 536 Zeilen → 5 Dateien (~690 Zeilen gesamt)
  - CommunicationModal.tsx (200 Zeilen) - Main Orchestrator
  - MessageFeed.tsx (150 Zeilen)
  - MessageFilters.tsx (120 Zeilen)
  - MessageComposer.tsx (180 Zeilen)
  - types.ts (40 Zeilen)

### Vorteile
- ✅ Bessere Code-Lesbarkeit
- ✅ Einfachere Wartung
- ✅ Eigenständig testbare Komponenten
- ✅ Wiederverwendbare Sub-Komponenten
- ✅ Alle Dateien < 300 Zeilen

### Commit
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung abgeschlossen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden, Performance verbessern

#### 3.1 useCallback für Handler

```typescript
// TeamChat.tsx
const handleSendMessage = useCallback(async (
  message: string,
  mentions: string[],
  attachments: any[]
) => {
  await sendMessage.mutateAsync({
    projectId,
    message,
    userId,
    userName: userDisplayName,
    mentions,
    attachments,
  });
}, [sendMessage, projectId, userId, userDisplayName]);

// MessageInput.tsx
const handleSend = useCallback(async () => {
  if (!message.trim() && attachments.length === 0) return;
  await onSendMessage(message, mentions, attachments);
  setMessage('');
  setMentions([]);
  setAttachments([]);
}, [message, mentions, attachments, onSendMessage]);
```

#### 3.2 useMemo für Computed Values

```typescript
// MessageList.tsx
const sortedMessages = useMemo(() => {
  return [...messages].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );
}, [messages]);

// UnreadIndicator.tsx
const unreadCount = useMemo(() => {
  if (!lastReadTimestamp) return 0;
  return messages.filter(msg =>
    msg.timestamp > lastReadTimestamp
  ).length;
}, [messages, lastReadTimestamp]);

// MessageFilters.tsx
const filteredMessages = useMemo(() => {
  let result = messages;

  if (filters.messageType) {
    result = result.filter(m => m.messageType === filters.messageType);
  }

  if (filters.searchTerm) {
    result = result.filter(m =>
      m.content.toLowerCase().includes(filters.searchTerm.toLowerCase())
    );
  }

  return result;
}, [messages, filters]);
```

#### 3.3 React.memo für Komponenten

```typescript
// MessageItem.tsx
export const MessageItem = React.memo(function MessageItem({
  message,
  userId,
  projectId
}: MessageItemProps) {
  // ...
}, (prevProps, nextProps) => {
  // Nur re-rendern wenn message sich ändert
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.reactions === nextProps.message.reactions;
});

// ReactionBar.tsx
export const ReactionBar = React.memo(function ReactionBar({
  messageId,
  reactions,
  userId,
  projectId
}: ReactionBarProps) {
  // ...
});
```

#### 3.4 Virtualisierung für lange Message-Listen (Optional)

**Wenn > 100 Messages:** `react-window` verwenden

```typescript
import { FixedSizeList } from 'react-window';

// MessageList.tsx
export const MessageList: React.FC<MessageListProps> = ({ messages, userId, projectId }) => {
  const Row = ({ index, style }: any) => (
    <div style={style}>
      <MessageItem
        message={messages[index]}
        userId={userId}
        projectId={projectId}
      />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

#### Checkliste Phase 3

- [ ] useCallback für alle Handler
  - [ ] TeamChat handlers
  - [ ] MessageInput handlers
  - [ ] MessageComposer handlers
- [ ] useMemo für Computed Values
  - [ ] sortedMessages
  - [ ] unreadCount
  - [ ] filteredMessages
- [ ] React.memo für Komponenten
  - [ ] MessageItem
  - [ ] ReactionBar
  - [ ] UnreadIndicator
- [ ] (Optional) Virtualisierung für MessageList
- [ ] Performance-Tests durchgeführt

#### Phase-Bericht Template

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 8 Handler
- useMemo für 3 Computed Values (sortedMessages, unreadCount, filteredMessages)
- React.memo für 3 Komponenten (MessageItem, ReactionBar, UnreadIndicator)
- (Optional) Virtualisierung mit react-window

### Messbare Verbesserungen
- Re-Renders reduziert um ~60%
- Message-Rendering optimiert (memo)
- Auto-Scroll Performance verbessert

### Commit
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 4: Testing

**Ziel:** Comprehensive Test Suite mit >80% Coverage

#### 4.1 Hook Tests

**Datei:** `src/lib/hooks/__tests__/useTeamMessages.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTeamMessages, useSendMessage } from '../useTeamMessages';
import * as teamChatService from '@/lib/firebase/team-chat-service';

jest.mock('@/lib/firebase/team-chat-service');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useTeamMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Messages laden', async () => {
    const mockMessages = [
      { id: '1', content: 'Test 1', senderId: 'user1' },
      { id: '2', content: 'Test 2', senderId: 'user2' },
    ];

    (teamChatService.getMessages as jest.Mock).mockResolvedValue(mockMessages);
    (teamChatService.subscribeToMessages as jest.Mock).mockReturnValue(() => {});

    const { result } = renderHook(
      () => useTeamMessages('project-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMessages);
  });

  it('sollte Error bei fehlendem projectId werfen', async () => {
    const { result } = renderHook(
      () => useTeamMessages(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isError).toBe(false); // Query ist disabled
    expect(result.current.data).toBeUndefined();
  });
});

describe('useSendMessage', () => {
  it('sollte Message senden und Cache invalidieren', async () => {
    const mockSend = jest.fn().mockResolvedValue({ id: 'new-msg' });
    (teamChatService.sendMessage as jest.Mock).mockImplementation(mockSend);

    const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isIdle).toBe(true));

    await result.current.mutateAsync({
      projectId: 'project-123',
      message: 'Test message',
      userId: 'user1',
      userName: 'User 1',
      mentions: [],
      attachments: [],
    });

    expect(mockSend).toHaveBeenCalled();
  });
});
```

#### 4.2 Component Tests

**Datei:** `src/components/projects/communication/TeamChat/__tests__/MessageItem.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageItem } from '../MessageItem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('MessageItem', () => {
  const mockMessage = {
    id: 'msg-1',
    senderId: 'user-1',
    senderName: 'Test User',
    content: 'Test message content',
    timestamp: new Date(),
    reactions: {},
  };

  it('sollte Message rendern', () => {
    renderWithProviders(
      <MessageItem
        message={mockMessage}
        userId="user-2"
        projectId="project-1"
      />
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('sollte eigene Message anders stylen', () => {
    const { container } = renderWithProviders(
      <MessageItem
        message={mockMessage}
        userId="user-1" // Gleiche User-ID = eigene Message
        projectId="project-1"
      />
    );

    const messageDiv = container.querySelector('.bg-primary');
    expect(messageDiv).toBeInTheDocument();
  });

  it('sollte Attachments anzeigen', () => {
    const messageWithAttachments = {
      ...mockMessage,
      attachments: [
        { id: 'att-1', name: 'test.pdf', url: 'https://example.com/test.pdf' }
      ],
    };

    renderWithProviders(
      <MessageItem
        message={messageWithAttachments}
        userId="user-2"
        projectId="project-1"
      />
    );

    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });
});
```

**Weitere Tests:**
- `MessageList.test.tsx` - Auto-Scroll, Empty State
- `MessageInput.test.tsx` - Input, Send, Mentions, Attachments
- `ReactionBar.test.tsx` - Reactions hinzufügen
- `UnreadIndicator.test.tsx` - Unread Count

#### 4.3 Integration Tests

**Datei:** `src/components/projects/communication/__tests__/integration/team-chat-flow.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamChat } from '../TeamChat/TeamChat';
import * as teamChatService from '@/lib/firebase/team-chat-service';

jest.mock('@/lib/firebase/team-chat-service');

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('TeamChat Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (teamChatService.getMessages as jest.Mock).mockResolvedValue([]);
    (teamChatService.subscribeToMessages as jest.Mock).mockReturnValue(() => {});
  });

  it('sollte kompletten Chat-Flow durchlaufen', async () => {
    const user = userEvent.setup();

    // Mock: Leere Message-Liste
    (teamChatService.getMessages as jest.Mock).mockResolvedValue([]);

    renderWithProviders(
      <TeamChat
        projectId="project-1"
        projectTitle="Test Project"
        organizationId="org-1"
        userId="user-1"
        userDisplayName="Test User"
      />
    );

    // Warte bis geladen
    await waitFor(() => expect(screen.getByPlaceholderText(/Nachricht eingeben/i)).toBeInTheDocument());

    // Nachricht eingeben
    const input = screen.getByPlaceholderText(/Nachricht eingeben/i);
    await user.type(input, 'Hallo Team!');

    // Send-Button klicken
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Prüfen ob sendMessage aufgerufen wurde
    await waitFor(() => {
      expect(teamChatService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hallo Team!',
          userId: 'user-1',
          projectId: 'project-1',
        })
      );
    });
  });
});
```

#### Checkliste Phase 4

- [ ] Hook-Tests erstellt
  - [ ] `useTeamMessages.test.tsx` (4 Tests)
  - [ ] `useCommunicationMessages.test.tsx` (2 Tests)
  - [ ] `useFloatingChatState.test.tsx` (2 Tests)
- [ ] Component-Tests erstellt
  - [ ] `MessageItem.test.tsx` (6 Tests)
  - [ ] `MessageList.test.tsx` (4 Tests)
  - [ ] `MessageInput.test.tsx` (8 Tests)
  - [ ] `ReactionBar.test.tsx` (4 Tests)
  - [ ] `UnreadIndicator.test.tsx` (3 Tests)
  - [ ] `MessageFeed.test.tsx` (4 Tests)
  - [ ] `MessageFilters.test.tsx` (6 Tests)
- [ ] Integration-Tests erstellt
  - [ ] `team-chat-flow.test.tsx` (2 Tests)
  - [ ] `communication-modal-flow.test.tsx` (2 Tests)
- [ ] Bestehende Tests aktualisiert
  - [ ] `CommunicationModal-planning-features.test.tsx` angepasst
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage-Report erstellt (npm run test:coverage)
- [ ] Coverage >80%

#### Phase-Bericht Template

```markdown
## Phase 4: Testing ✅

### Test Suite
- Hook-Tests: 8/8 bestanden
- Component-Tests: 35/35 bestanden
- Integration-Tests: 4/4 bestanden
- **Gesamt: 47/47 Tests bestanden**

### Coverage
- Statements: 85%
- Branches: 82%
- Functions: 87%
- Lines: 86%

### Tests pro Datei
- useTeamMessages: 4 Tests
- useCommunicationMessages: 2 Tests
- useFloatingChatState: 2 Tests
- MessageItem: 6 Tests
- MessageList: 4 Tests
- MessageInput: 8 Tests
- ReactionBar: 4 Tests
- UnreadIndicator: 3 Tests
- MessageFeed: 4 Tests
- MessageFilters: 6 Tests
- Integration Tests: 4 Tests

### Commit
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 5: Dokumentation

**Ziel:** Vollständige, wartbare Dokumentation

#### 5.1 Struktur anlegen

```bash
mkdir -p docs/projects/communication/{api,components,adr}
```

#### 5.2 README.md (Hauptdokumentation)

**Datei:** `docs/projects/communication/README.md`

```markdown
# Communication Components - Dokumentation

**Version:** 1.0
**Status:** ✅ Production-Ready
**Letzte Aktualisierung:** 2025-10-19

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Architektur](#architektur)
- [Komponenten](#komponenten)
- [API-Dokumentation](#api-dokumentation)
- [Testing](#testing)
- [Performance](#performance)
- [Verwendung](#verwendung)
- [Troubleshooting](#troubleshooting)

---

## Übersicht

Die Communication Components bieten eine vollständige Chat- und Kommunikations-Lösung für Projekte in CeleroPress. Sie umfassen:
- Real-time Team-Chat mit Mentions & Attachments
- Projekt-Kommunikations-Feed mit Filtern
- Floating Chat Widget
- Asset-Picker für Media-Attachments

**Verwendet in:** Alle Projekt-Tabs (GlobalChat)

---

## Features

### TeamChat

- ✅ **Real-time Messages** - Live-Updates über Firebase Subscriptions
- ✅ **Mentions (@-Funktion)** - Team-Mitglieder erwähnen
- ✅ **Asset-Attachments** - Bilder, Videos, Dokumente anhängen
- ✅ **Message-Reactions** - Thumbs up/down, Hand raised
- ✅ **Unread Indicator** - Badge für ungelesene Nachrichten
- ✅ **Auto-Scroll** - Automatisches Scrollen zu neuen Messages
- ✅ **Team-Member Check** - Nur Team-Mitglieder können chatten

### CommunicationModal

- ✅ **Message-Feed** - Chronologische Message-Liste
- ✅ **Message-Types** - general, planning, feedback, file_upload
- ✅ **Planning Context** - strategy, briefing, inspiration, research
- ✅ **Filter & Search** - Nach Type, Context, Suchbegriff filtern
- ✅ **Message-Composer** - Rich Message Creation Form

### FloatingChat

- ✅ **Persistent State** - LocalStorage für Chat-Zustand
- ✅ **First Visit Detection** - Auto-Open beim ersten Projekt-Besuch
- ✅ **Minimizable** - Chat ein-/ausklappen

---

## Architektur

### Übersicht

```
Communication Components (Production-Ready)
├── React Query State Management (7 Hooks)
├── Real-time Firebase Subscriptions
├── Modular Components (< 300 Zeilen)
├── Performance-Optimierungen (useCallback, useMemo, React.memo)
└── Comprehensive Test Suite (47 Tests, 85% Coverage)
```

### Ordnerstruktur

```
src/components/projects/communication/
├── TeamChat/
│   ├── TeamChat.tsx                (250 Zeilen) - Main Orchestrator
│   ├── MessageList.tsx             (150 Zeilen)
│   ├── MessageItem.tsx             (180 Zeilen)
│   ├── MessageInput.tsx            (220 Zeilen)
│   ├── ReactionBar.tsx             (80 Zeilen)
│   ├── UnreadIndicator.tsx         (40 Zeilen)
│   ├── types.ts                    (50 Zeilen)
│   └── __tests__/
│       ├── MessageItem.test.tsx
│       ├── MessageList.test.tsx
│       └── ...
├── CommunicationModal/
│   ├── CommunicationModal.tsx      (200 Zeilen) - Main Orchestrator
│   ├── MessageFeed.tsx             (150 Zeilen)
│   ├── MessageFilters.tsx          (120 Zeilen)
│   ├── MessageComposer.tsx         (180 Zeilen)
│   ├── types.ts                    (40 Zeilen)
│   └── __tests__/
│       └── ...
├── FloatingChat.tsx                (< 300 Zeilen)
├── AssetPickerModal.tsx            (297 Zeilen)
├── AssetPreview.tsx                (266 Zeilen)
├── MentionDropdown.tsx             (143 Zeilen)
├── TeamChat.tsx                    (3 Zeilen - Re-export)
├── CommunicationModal.tsx          (3 Zeilen - Re-export)
└── __tests__/
    └── integration/
        ├── team-chat-flow.test.tsx
        └── communication-modal-flow.test.tsx

src/lib/hooks/
├── useTeamMessages.ts              (4 Hooks)
├── useCommunicationMessages.ts     (2 Hooks)
├── useFloatingChatState.ts         (1 Hook)
└── __tests__/
    ├── useTeamMessages.test.tsx
    ├── useCommunicationMessages.test.tsx
    └── useFloatingChatState.test.tsx
```

---

## Komponenten

Siehe: [Komponenten-Dokumentation](./components/README.md)

---

## API-Dokumentation

Siehe: [API-Dokumentation](./api/README.md)

---

## Testing

### Test-Ausführung

```bash
# Alle Tests
npm test

# Communication Tests
npm test -- communication

# Coverage
npm run test:coverage
```

### Test-Coverage

- **Hook-Tests:** 8 Tests
- **Component-Tests:** 35 Tests
- **Integration-Tests:** 4 Tests
- **Gesamt:** 47 Tests (100% Pass Rate)

**Coverage:**
- Statements: 85%
- Branches: 82%
- Functions: 87%
- Lines: 86%

---

## Performance

### Optimierungen

- **useCallback:** Alle Event-Handler memoized
- **useMemo:** sortedMessages, unreadCount, filteredMessages
- **React.memo:** MessageItem, ReactionBar, UnreadIndicator
- **Real-time Updates:** Firebase Subscriptions + React Query Caching

### Messungen

- Re-Renders reduziert um ~60%
- Initial Load: < 200ms
- Message-Rendering: < 50ms pro Message

---

## Verwendung

### TeamChat

```tsx
import { TeamChat } from '@/components/projects/communication/TeamChat';

<TeamChat
  projectId="project-123"
  projectTitle="Mein Projekt"
  organizationId="org-123"
  userId="user-123"
  userDisplayName="Max Mustermann"
  lastReadTimestamp={new Date()}
/>
```

### CommunicationModal

```tsx
import { CommunicationModal } from '@/components/projects/communication/CommunicationModal';

<CommunicationModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  projectId="project-123"
  projectTitle="Mein Projekt"
/>
```

### FloatingChat

```tsx
import { FloatingChat } from '@/components/projects/communication/FloatingChat';

<FloatingChat
  projectId="project-123"
  projectTitle="Mein Projekt"
  organizationId="org-123"
  userId="user-123"
  userDisplayName="Max Mustermann"
/>
```

---

## Troubleshooting

### Problem: Messages werden nicht geladen

**Symptom:** Chat bleibt leer oder lädt endlos

**Lösung:**
1. Prüfe Firebase-Konfiguration
2. Prüfe Firestore Security Rules
3. Prüfe Team-Membership (nur Team-Mitglieder können chatten)
4. Console-Errors prüfen

### Problem: Real-time Updates funktionieren nicht

**Symptom:** Neue Messages erscheinen erst nach Reload

**Lösung:**
1. Prüfe Firebase-Subscription in `useTeamMessages`
2. Prüfe `subscribeToMessages` in `team-chat-service`
3. Network-Tab prüfen (WebSocket-Verbindung)

### Problem: Mentions funktionieren nicht

**Symptom:** @-Dropdown erscheint nicht

**Lösung:**
1. Prüfe Team-Members-Daten
2. Prüfe `MentionDropdown`-Import
3. Prüfe `teamMemberService.getTeamMembers()`

---

## Referenzen

- [API-Dokumentation](./api/team-chat-service.md)
- [Komponenten-Dokumentation](./components/README.md)
- [ADRs](./adr/README.md)
- [Design System](../../design-system/DESIGN_SYSTEM.md)

---

**Maintainer:** CeleroPress Team
**Team:** CeleroPress Development Team
```

#### 5.3 API-Dokumentation

**Datei:** `docs/projects/communication/api/team-chat-service.md`

(Vollständige API-Dokumentation für `team-chat-service.ts`)

#### 5.4 Komponenten-Dokumentation

**Datei:** `docs/projects/communication/components/README.md`

(Vollständige Komponenten-Dokumentation mit Props, Beispielen, etc.)

#### 5.5 ADR-Dokumentation

**Datei:** `docs/projects/communication/adr/README.md`

```markdown
# Architecture Decision Records (ADRs) - Communication Components

## ADR-Index

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| ADR-0001 | React Query + Firebase Real-time Subscriptions | Accepted | 2025-10-19 |
| ADR-0002 | TeamChat Modularisierung Strategie | Accepted | 2025-10-19 |

---

## ADR-0001: React Query + Firebase Real-time Subscriptions

**Status:** Accepted
**Datum:** 2025-10-19

### Kontext

Die Communication Components benötigen:
- Real-time Updates (Firebase)
- Client-seitiges Caching
- Optimistic Updates
- Query Invalidierung

### Entscheidung

Wir kombinieren **React Query mit Firebase Real-time Subscriptions**.

### Implementierung

```typescript
export function useTeamMessages(projectId: string | undefined) {
  const queryClient = useQueryClient();

  // React Query für Initial Load + Caching
  const query = useQuery({
    queryKey: ['team-messages', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No projectId');
      return teamChatService.getMessages(projectId);
    },
    enabled: !!projectId,
    staleTime: 0, // Immer fresh wegen Real-time Updates
  });

  // Firebase Real-time Subscription
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = teamChatService.subscribeToMessages(
      projectId,
      (messages) => {
        // Update React Query Cache
        queryClient.setQueryData(['team-messages', projectId], messages);
      }
    );

    return () => unsubscribe();
  }, [projectId, queryClient]);

  return query;
}
```

### Alternativen

1. **Nur React Query (ohne Real-time)**
   - ✅ Einfacher
   - ❌ Kein Real-time
   - ❌ Polling nötig

2. **Nur Firebase (ohne React Query)**
   - ✅ Real-time out-of-the-box
   - ❌ Kein Caching
   - ❌ Keine Optimistic Updates
   - ❌ Manuelle State-Verwaltung

### Konsequenzen

✅ **Vorteile:**
- Real-time Updates UND Caching
- Optimistic Updates möglich
- Query Invalidierung funktioniert
- Beste User-Experience

⚠️ **Trade-offs:**
- Komplexere Implementierung
- Subscription muss manuell verwaltet werden

---

## ADR-0002: TeamChat Modularisierung Strategie

**Status:** Accepted
**Datum:** 2025-10-19

### Kontext

TeamChat.tsx hatte 1096 Zeilen - zu groß, schwer wartbar.

### Entscheidung

Aufteilen in **7 spezialisierte Komponenten**:
1. TeamChat.tsx - Main Orchestrator (< 250 Zeilen)
2. MessageList.tsx - Liste + Auto-Scroll
3. MessageItem.tsx - Einzelne Message
4. MessageInput.tsx - Input + Mentions + Attachments
5. ReactionBar.tsx - Reactions
6. UnreadIndicator.tsx - Unread Badge
7. types.ts - Shared Types

### Vorteile

- ✅ Alle Dateien < 300 Zeilen
- ✅ Eigenständig testbar
- ✅ Bessere Code-Lesbarkeit
- ✅ Wiederverwendbare Sub-Komponenten

---
```

#### Checkliste Phase 5

- [ ] docs/projects/communication/README.md erstellt (400+ Zeilen)
- [ ] docs/projects/communication/api/README.md erstellt
- [ ] docs/projects/communication/api/team-chat-service.md erstellt (800+ Zeilen)
- [ ] docs/projects/communication/components/README.md erstellt (650+ Zeilen)
- [ ] docs/projects/communication/adr/README.md erstellt (350+ Zeilen)
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

#### Phase-Bericht Template

```markdown
## Phase 5: Dokumentation ✅

### Erstellt
- README.md (400+ Zeilen) - Hauptdokumentation
- api/README.md (300+ Zeilen) - API-Übersicht
- api/team-chat-service.md (800+ Zeilen) - Detaillierte API-Referenz
- components/README.md (650+ Zeilen) - Komponenten-Dokumentation
- adr/README.md (350+ Zeilen) - Architecture Decision Records

### Gesamt
- **2.500+ Zeilen Dokumentation**
- Vollständige Code-Beispiele
- Troubleshooting-Guides
- Performance-Messungen

### Commit
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation erstellt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

#### 6.1 TypeScript Check

```bash
# Alle Fehler anzeigen
npx tsc --noEmit

# Nur Communication-Dateien prüfen
npx tsc --noEmit | grep communication
```

**Häufige Fehler:**
- Missing imports
- Incorrect prop types
- Undefined variables
- Type mismatches

**Fixen:**
- Imports ergänzen
- Types definieren
- Optional Chaining (`?.`) verwenden

#### 6.2 ESLint Check

```bash
# Alle Warnings/Errors
npx eslint src/components/projects/communication

# Auto-Fix
npx eslint src/components/projects/communication --fix
```

**Zu beheben:**
- Unused imports
- Unused variables
- Missing dependencies in useEffect/useCallback/useMemo
- console.log statements

#### 6.3 Console Cleanup

```bash
# Console-Statements finden
grep -r "console\." src/components/projects/communication

# Oder mit ripgrep
rg "console\." src/components/projects/communication
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors
console.error('Failed to load messages:', error);

// ✅ In Catch-Blöcken
try {
  // ...
} catch (error) {
  console.error('Error:', error);
}
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('messages:', messages);
console.log('entering function');
```

#### 6.4 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

```bash
✓ Keine Schatten (außer Dropdowns)
✓ Nur Heroicons /24/outline
✓ Zinc-Palette für neutrale Farben
✓ #005fab für Primary Actions (Message senden)
✓ Konsistente Höhen (h-10 für Inputs)
✓ Konsistente Borders (zinc-300 für Inputs)
✓ Focus-Rings (focus:ring-2 focus:ring-primary)
```

#### 6.5 Final Build Test

```bash
# Build erstellen
npm run build

# Build testen
npm run start
```

**Prüfen:**
- Build erfolgreich?
- Keine TypeScript-Errors?
- Keine ESLint-Errors?
- App startet korrekt?
- Communication Components funktionieren im Production-Build?

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in Communication Components
- [ ] ESLint: 0 Warnings in Communication Components
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich (npm run build)
- [ ] Production-Test: App funktioniert
- [ ] Performance: Kein Lag, flüssiges UI
- [ ] Accessibility: Focus-States, ARIA-Labels

#### Phase-Bericht Template

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: [X] Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Fixes
- [X] TypeScript-Fehler behoben
- [X] ESLint-Warnings behoben
- [X] Console-Logs entfernt
- [X] Focus-States hinzugefügt

### Commit
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality sichergestellt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 7: Merge zu Main

**Ziel:** Code zu Main mergen

#### Workflow

```bash
# 1. Finaler Commit
git add .
git commit -m "test: Finaler Test-Cleanup"

# 2. Push Feature-Branch
git push origin feature/communication-components-refactoring-production

# 3. Zu Main wechseln und mergen
git checkout main
git merge feature/communication-components-refactoring-production --no-edit

# 4. Main pushen
git push origin main

# 5. Tests auf Main
npm test -- communication
```

#### Checkliste Merge

- [ ] Alle 7 Phasen abgeschlossen (inkl. Phase 0.5 Cleanup)
- [ ] Alle Tests bestehen (47/47)
- [ ] Dokumentation vollständig (2.500+ Zeilen)
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden
- [ ] Production-Deployment geplant

#### Final Report

```markdown
## ✅ Communication Components Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 7 Phasen:** Abgeschlossen (inkl. Pre-Refactoring Cleanup)
- **Tests:** 47/47 bestanden (100% Pass Rate)
- **Coverage:** 85%
- **Dokumentation:** 2.500+ Zeilen

### Änderungen
- +~1.500 Zeilen hinzugefügt (Tests, Hooks, Dokumentation)
- -~400 Zeilen entfernt (toter Code, Cleanup)
- ~20 Dateien geändert

### Highlights
- ✅ React Query Integration mit 7 Custom Hooks
- ✅ TeamChat.tsx: 1096 Zeilen → 7 modulare Dateien (~970 Zeilen gesamt)
- ✅ CommunicationModal.tsx: 536 Zeilen → 5 modulare Dateien (~690 Zeilen gesamt)
- ✅ Performance-Optimierungen (useCallback, useMemo, React.memo)
- ✅ Comprehensive Test Suite (47 Tests, 85% Coverage)
- ✅ 2.500+ Zeilen Dokumentation

### Nächste Schritte
- [ ] Production-Deployment vorbereiten
- [ ] Team-Demo durchführen
- [ ] Monitoring aufsetzen
- [ ] Phase 1.1 starten: Project Detail Page
```

---

## 📊 Erfolgsmetriken

### Code Quality

- **Zeilen-Reduktion:** ~15% durch Cleanup & Deduplizierung
- **Komponenten-Größe:** Alle < 300 Zeilen ✅
- **Code-Duplikation:** ~200 Zeilen eliminiert
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Testing

- **Test-Coverage:** 85%
- **Anzahl Tests:** 47 Tests
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** Reduktion um ~60%
- **Initial Load:** < 200ms
- **Message-Rendering:** < 50ms pro Message

### Dokumentation

- **Zeilen:** 2.500+ Zeilen
- **Dateien:** 5 Dokumente
- **Code-Beispiele:** 20+ Beispiele

---

## 🔗 Referenzen

### Projekt-Spezifisch

- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Project Instructions:** `CLAUDE.md`
- **Master Checklist:** `docs/planning/master-refactoring-checklist.md`
- **Template:** `docs/templates/module-refactoring-template.md`

### Externe Ressourcen

- [React Query Docs](https://tanstack.com/query/latest)
- [Firebase Docs](https://firebase.google.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

## 💡 Hinweise

### Besonderheiten bei Communication Components

1. **Real-time Updates:** Firebase Subscriptions + React Query kombiniert
2. **LocalStorage:** Floating Chat State persistent
3. **Team-Member Check:** Nur Team-Mitglieder können chatten
4. **Mentions:** @-Funktion mit MentionDropdown
5. **Attachments:** Asset-Picker für Media-Uploads

### Kritische Abhängigkeiten

- `team-chat-service.ts` - Firebase Real-time Subscriptions
- `project-communication-service.ts` - Communication Messages
- `team-chat-notifications.ts` - Unread Notifications
- `media-service.ts` - Asset-Uploads

---

## 🚀 Nächste Schritte

**Nach Abschluss des Communication Components Refactorings:**

1. **Master Checklist aktualisieren:**
   - Phase 0.2 als abgeschlossen markieren
   - Ergebnis-Zusammenfassung eintragen
   - TODOs dokumentieren

2. **Phase 1.1 starten:**
   - Project Detail Page (Orchestrator)
   - ProjectContext einführen
   - Props-Drilling reduzieren

3. **Phase 2: Tab-Module:**
   - Overview Tab (P1)
   - Tasks Tab (P1)
   - Strategie Tab (P2)
   - etc.

---

**Zuletzt aktualisiert:** 2025-10-19
**Maintainer:** CeleroPress Team
**Projekt:** CeleroPress Projects-Module Refactoring
