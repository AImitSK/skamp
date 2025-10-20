# Teil 2: React Query & Admin SDK Integration

**Zurück:** [← Teil 1: Übersicht & Setup](./01-uebersicht-und-setup.md) | **Weiter:** [Teil 3: Modularisierung & Performance →](./03-modularisierung-performance.md)

---

## 📋 Inhalt

- Phase 1: React Query Integration
- **Phase 1.5: Admin SDK Integration (KRITISCH!)** 🔐

---

## 🔄 Phase 1: React Query Integration

**Ziel:** State Management mit React Query ersetzen

**Dauer:** 1 Tag

### 1.1 Custom Hooks erstellen

**WICHTIG:** Firebase Real-time Subscriptions + React Query kombinieren!

#### Hook 1: `useTeamMessages.ts`

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

#### Hook 2: `useCommunicationMessages.ts`

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

#### Hook 3: `useFloatingChatState.ts`

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

### 1.2 Komponenten anpassen

#### TeamChat.tsx anpassen

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
```

#### CommunicationModal.tsx anpassen

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

#### FloatingChat.tsx anpassen

```typescript
import { useFloatingChatState } from '@/lib/hooks/useFloatingChatState';

// Alte LocalStorage-Logik entfernen
// const [isOpen, setIsOpen] = useState(...);

// Neuer Hook
const { isOpen, setIsOpen } = useFloatingChatState(projectId);
```

### Checkliste Phase 1

- [ ] 3 Custom Hook-Dateien erstellt
  - [ ] `useTeamMessages.ts` (4 Hooks)
  - [ ] `useCommunicationMessages.ts` (2 Hooks)
  - [ ] `useFloatingChatState.ts` (1 Hook)
- [ ] TeamChat.tsx auf React Query umgestellt
- [ ] CommunicationModal.tsx auf React Query umgestellt
- [ ] FloatingChat.tsx auf Custom Hook umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test durchgeführt

### Phase-Bericht

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
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration abgeschlossen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🔐 Phase 1.5: Admin SDK Integration (KRITISCH!)

**Ziel:** Server-Side Validation für kritische Security-Verbesserungen

**Dauer:** 5-7 Tage

**Warum JETZT?**
- ✅ **Kritische Security-Gaps:** Spam-Prevention, Permission-Checks
- ✅ **Perfect Timing:** Refactoring ist beste Zeit für Architektur-Änderungen
- ✅ **React Query bereits fertig:** Hooks können direkt angepasst werden
- ✅ **Compliance:** Audit-Logs für GDPR/ISO-Compliance
- ✅ **Effizienz:** Nur einmal durch die Code-Basis gehen

### 📚 Vollständige Dokumentation

**Die vollständige Admin SDK Integration ist dokumentiert in:**

**→ [Admin SDK Analyse Dokument](../communication-components-admin-sdk-analysis.md)**

Dieses Dokument enthält:
- Detaillierte Security-Analyse
- 3 vollständige API Routes (DELETE, PATCH, POST)
- Server-Side Validation Code
- Rate-Limiting Implementation
- Audit-Log System
- Hook-Anpassungen
- UI für Edit/Delete
- Test-Strategien

### Quick-Übersicht: Was wird implementiert?

#### 1. Admin SDK Setup

```bash
npm install firebase-admin
```

**Datei:** `src/lib/firebase/admin.ts`
- Firebase Admin SDK Initialisierung
- adminDb & adminAuth Exports

#### 2. API Routes (3 Endpoints)

1. **DELETE** `/api/v1/messages/[messageId]`
   - Message Deletion mit Permission-Checks
   - Time-Limit (15min)
   - Soft-Delete für Audit
   - Audit-Logs

2. **PATCH** `/api/v1/messages/[messageId]`
   - Message Editing
   - Edit-History speichern
   - Time-Limit (15min)
   - Audit-Logs

3. **POST** `/api/v1/messages`
   - Message Sending mit Validation
   - Rate-Limiting (10 msg/min)
   - Content-Moderation
   - Mention & Attachment Validation
   - Audit-Logs

#### 3. Security-Features

- ✅ Permission-Checks (nur eigene Messages)
- ✅ Time-Limits (15min für Edits/Deletes)
- ✅ Rate-Limiting (10 Messages/Minute)
- ✅ Content-Moderation (Profanity-Filter)
- ✅ Mention-Validation (nur Team-Members)
- ✅ Attachment-Validation (Organization-Check)
- ✅ Vollständige Audit-Logs
- ✅ Edit-History für Transparency

#### 4. React Query Hooks anpassen

Die 3 Hooks werden angepasst:
- `useDeleteMessage()` → ruft API Route auf
- `useEditMessage()` → ruft API Route auf
- `useSendMessage()` → ruft API Route auf

#### 5. UI Updates

**MessageItem.tsx** bekommt:
- Edit/Delete Buttons (nur eigene Messages)
- Edit-Form mit Save/Cancel
- Edit-History Anzeige (collapsible)
- Error-Handling für Rate-Limits

### Checkliste Phase 1.5

- [ ] **Setup**
  - [ ] Firebase Admin SDK installiert
  - [ ] Service Account Key generiert
  - [ ] Environment Variables konfiguriert
  - [ ] Admin SDK initialisiert

- [ ] **API Routes erstellt**
  - [ ] `/api/v1/messages/[messageId]/route.ts` (DELETE + PATCH)
  - [ ] `/api/v1/messages/route.ts` (POST)

- [ ] **Features implementiert**
  - [ ] Message Deletion mit Permission-Checks
  - [ ] Message Editing mit Edit-History
  - [ ] Message Sending mit Rate-Limiting
  - [ ] Content-Moderation (Profanity-Filter)
  - [ ] Mention-Validation
  - [ ] Attachment-Validation
  - [ ] Audit-Logs für alle Operationen

- [ ] **Hooks angepasst**
  - [ ] useDeleteMessage → API Route
  - [ ] useEditMessage → API Route
  - [ ] useSendMessage → API Route

- [ ] **UI Updates**
  - [ ] Edit/Delete Buttons in MessageItem
  - [ ] Edit-Form in MessageItem
  - [ ] Edit-History Anzeige
  - [ ] Error-Handling für Rate-Limits

- [ ] **Tests**
  - [ ] API Route Tests (DELETE, PATCH, POST)
  - [ ] Rate-Limiting Tests
  - [ ] Permission-Check Tests
  - [ ] UI Tests für Edit/Delete

- [ ] **Manueller Test**
  - [ ] Message löschen (eigene Message)
  - [ ] Message löschen (fremde Message → sollte fehlschlagen)
  - [ ] Message editieren (innerhalb 15min)
  - [ ] Message editieren (nach 15min → sollte fehlschlagen)
  - [ ] Message senden (normal)
  - [ ] Message senden (Rate-Limit erreichen → sollte fehlschlagen)
  - [ ] Edit-History anzeigen

### Phase-Bericht

```markdown
## Phase 1.5: Admin SDK Integration ✅

### Implementiert
- Admin SDK Setup (`src/lib/firebase/admin.ts`)
- 3 API Routes:
  - DELETE `/api/v1/messages/[messageId]` (Message Deletion)
  - PATCH `/api/v1/messages/[messageId]` (Message Editing)
  - POST `/api/v1/messages` (Message Sending mit Validation)

### Security-Features
- ✅ Permission-Checks (nur eigene Messages editieren/löschen)
- ✅ Time-Limits (Messages nur 15min editierbar)
- ✅ Rate-Limiting (10 Messages/Minute)
- ✅ Content-Moderation (Profanity-Filter)
- ✅ Mention-Validation (nur Team-Members)
- ✅ Attachment-Validation (Assets gehören zu Organization)
- ✅ Audit-Logs für alle Operationen
- ✅ Edit-History für Transparency

### UI-Updates
- Edit/Delete Buttons in MessageItem
- Edit-Form mit Save/Cancel
- Edit-History Anzeige (collapsible)
- Error-Handling für Rate-Limits

### Ergebnis
- **Sicherheit:** ↑↑↑ (von 3/10 auf 9/10)
- **Spam-Prevention:** ↑↑↑ (von 0/10 auf 9/10)
- **Compliance:** ✅ Audit-Logs ready
- **User-Experience:** ↑↑ Edit-History sichtbar
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1.5 - Admin SDK Integration für Security & Validation

- Message Deletion/Editing API Routes
- Rate-Limiting (10 msg/min)
- Content-Moderation
- Audit-Logs
- Edit-History

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ✅ Abschluss Teil 2

**Erreicht:**
- ✅ React Query Integration (7 Hooks)
- ✅ Admin SDK Integration (3 API Routes)
- ✅ Security massiv verbessert (3/10 → 9/10)
- ✅ Rate-Limiting & Spam-Prevention aktiv
- ✅ Audit-Logs für Compliance

**Nächster Schritt:**
[→ Teil 3: Modularisierung & Performance](./03-modularisierung-performance.md)

---

**Navigation:**
[← Teil 1: Übersicht & Setup](./01-uebersicht-und-setup.md) | [Teil 3: Modularisierung & Performance →](./03-modularisierung-performance.md)
