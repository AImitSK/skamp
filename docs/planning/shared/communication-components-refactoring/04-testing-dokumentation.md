# Teil 4: Testing & Dokumentation

**Zurück:** [← Teil 3: Modularisierung & Performance](./03-modularisierung-performance.md) | **Weiter:** [Teil 5: Production & Abschluss →](./05-production-abschluss.md)

---

## 📋 Inhalt

- Phase 4: Testing
- Phase 5: Dokumentation

---

## 🧪 Phase 4: Testing

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**Dauer:** 2 Tage

---

## 🤖 AGENT-DELEGATION: refactoring-test (EMPFOHLEN!)

**Diese Phase sollte an den spezialisierten Agent delegiert werden!**

### Warum dieser Agent?

**Problem mit manuellem Testing:**
- ❌ Tests werden abgekürzt ("die anderen sind analog...")
- ❌ TODOs im Test-Code (`// TODO: Add more test cases`)
- ❌ Unvollständige Test-Suites (5 von 30 Tests geschrieben)
- ❌ "Ist fertig" obwohl Coverage <80%

**Lösung: refactoring-test Agent**
- ✅ Schreibt ALLE Tests vollständig (keine TODOs!)
- ✅ Gibt nicht auf bis Coverage >80%
- ✅ Systematisch durch ALLE Komponenten
- ✅ Strikte Regeln: Kein "analog", kein TODO

### Agent aufrufen

```bash
/refactoring-test
```

**Input für den Agent:**
- Refactoring-Plan: Teil 4 (dieses Dokument)
- Target Coverage: 85%+
- Komponenten: TeamChat, CommunicationModal, FloatingChat + Hooks + API Routes

**Der Agent erstellt:**
1. Hook-Tests (8 Tests vollständig)
2. Component-Tests (35 Tests vollständig)
3. API Route Tests (19 Tests vollständig)
4. Integration-Tests (4 Tests vollständig)
5. Coverage-Report (>80%)
6. Final Verification (npm test → alle grün)

**Garantie:**
- Keine TODOs im Code
- Keine "analog"-Kommentare
- ALLE Tests vollständig implementiert
- Coverage >80% erreicht

---

## 📋 Falls MANUELL (ohne Agent)

### 4.1 Hook Tests

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

### 4.2 Component Tests

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

### 4.3 API Route Tests

**Datei:** `src/app/api/v1/messages/__tests__/route.test.ts`

```typescript
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminDb } from '@/lib/firebase/admin';

jest.mock('next-auth');
jest.mock('@/lib/firebase/admin');

describe('POST /api/v1/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte 401 zurückgeben bei fehlendem Session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/v1/messages', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project-1',
        content: 'Test message',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('sollte Message erstellen bei validem Request', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1' }
    });

    // Mock Firebase calls...
    // ... (vollständiger Test im Original-Dokument)
  });

  it('sollte Rate-Limit enforc', async () => {
    // Rate-Limiting Test...
  });
});
```

### Checkliste Phase 4

**Option A: Agent-Delegation (EMPFOHLEN)**
- [ ] Agent aufgerufen: `/refactoring-test`
- [ ] Agent-Input bereitgestellt (Teil 4 Dokument, Target Coverage: 85%+)
- [ ] Agent-Output geprüft
- [ ] Keine TODOs im Test-Code ✅
- [ ] Keine "analog"-Kommentare ✅
- [ ] ALLE Tests vollständig implementiert ✅
- [ ] npm test → alle grün ✅
- [ ] Coverage >80% erreicht ✅

**Option B: Manuell**
- [ ] Hook-Tests erstellt
  - [ ] `useTeamMessages.test.tsx` (4 Tests VOLLSTÄNDIG)
  - [ ] `useCommunicationMessages.test.tsx` (2 Tests VOLLSTÄNDIG)
  - [ ] `useFloatingChatState.test.tsx` (2 Tests VOLLSTÄNDIG)
- [ ] Component-Tests erstellt
  - [ ] `MessageItem.test.tsx` (6 Tests VOLLSTÄNDIG)
  - [ ] `MessageList.test.tsx` (4 Tests VOLLSTÄNDIG)
  - [ ] `MessageInput.test.tsx` (8 Tests VOLLSTÄNDIG)
  - [ ] `ReactionBar.test.tsx` (4 Tests VOLLSTÄNDIG)
  - [ ] `UnreadIndicator.test.tsx` (3 Tests VOLLSTÄNDIG)
  - [ ] `MessageFeed.test.tsx` (4 Tests VOLLSTÄNDIG)
  - [ ] `MessageFilters.test.tsx` (6 Tests VOLLSTÄNDIG)
- [ ] API Route Tests erstellt
  - [ ] `DELETE /api/v1/messages/[messageId]` (6 Tests VOLLSTÄNDIG)
  - [ ] `PATCH /api/v1/messages/[messageId]` (5 Tests VOLLSTÄNDIG)
  - [ ] `POST /api/v1/messages` (8 Tests VOLLSTÄNDIG)
- [ ] Integration-Tests erstellt
  - [ ] `team-chat-flow.test.tsx` (2 Tests VOLLSTÄNDIG)
  - [ ] `communication-modal-flow.test.tsx` (2 Tests VOLLSTÄNDIG)
- [ ] Bestehende Tests aktualisiert
  - [ ] `CommunicationModal-planning-features.test.tsx` angepasst
- [ ] KEINE TODOs im Code
- [ ] KEINE "analog"-Kommentare
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage-Report erstellt (npm run test:coverage)
- [ ] Coverage >80%

### Phase-Bericht

```markdown
## Phase 4: Testing ✅

### Methode
- 🤖 Agent-Delegation: refactoring-test Agent verwendet (EMPFOHLEN)
  - Garantiert vollständige Test-Suite
  - Keine TODOs im Code
  - Keine "analog"-Kommentare
  - Alle Tests vollständig implementiert

ODER

- 📝 Manuell erstellt (mit strengen Regeln: KEINE TODOs, KEINE "analog"-Kommentare)

### Test Suite
- Hook-Tests: 8/8 bestanden (VOLLSTÄNDIG)
- Component-Tests: 35/35 bestanden (VOLLSTÄNDIG)
- API Route Tests: 19/19 bestanden (VOLLSTÄNDIG)
- Integration-Tests: 4/4 bestanden (VOLLSTÄNDIG)
- **Gesamt: 66/66 Tests bestanden**

### Quality Checks
- ✅ Keine TODOs im Test-Code
- ✅ Keine "analog"-Kommentare
- ✅ Alle Tests vollständig implementiert
- ✅ Alle Tests bestehen

### Coverage
- Statements: 85%+
- Branches: 82%
- Functions: 87%
- Lines: 86%

### Tests pro Kategorie
- Hook Tests: 8 Tests (vollständig)
- Component Tests: 35 Tests (vollständig)
- API Route Tests: 19 Tests (vollständig)
- Integration Tests: 4 Tests (vollständig)
```

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt

Erstellt via refactoring-test Agent.
Garantie: Keine TODOs, alle Tests vollständig.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 📚 Phase 5: Dokumentation

**Ziel:** Vollständige, wartbare Dokumentation

**Dauer:** 1 Tag

---

## 🤖 AGENT-DELEGATION: refactoring-dokumentation

**Diese Phase sollte an den spezialisierten Agent delegiert werden!**

### Agent aufrufen

```bash
/refactoring-dokumentation
```

**Oder per Task tool:**
```typescript
// Der Agent hat Zugriff auf: Read, Write, Glob, Grep, Bash
// Er erstellt automatisch:
// - README.md (Hauptdokumentation)
// - API-Dokumentation
// - Komponenten-Dokumentation
// - ADRs (Architecture Decision Records)
```

**Dem Agent mitteilen:**
- Modul: Communication Components
- Scope: TeamChat, CommunicationModal, FloatingChat
- Neue Features: Admin SDK Integration (Phase 1.5)
- Wichtige Änderungen: React Query, Modularisierung, Performance-Optimierung

**Der Agent erstellt:**
1. Vollständige Modul-Dokumentation
2. API-Referenzen
3. Komponenten-Übersichten
4. ADRs für wichtige Entscheidungen
5. Code-Beispiele
6. Troubleshooting-Guides

---

## 📋 Falls MANUELL (ohne Agent)

### 5.1 Struktur anlegen

```bash
mkdir -p docs/projects/communication/{api,components,adr}
```

### 5.2 Dokumente erstellen

#### README.md (Hauptdokumentation)

**Datei:** `docs/projects/communication/README.md`

```markdown
# Communication Components - Dokumentation

**Version:** 2.0
**Status:** ✅ Production-Ready
**Letzte Aktualisierung:** 2025-10-20

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

## Übersicht

Die Communication Components bieten eine vollständige Chat- und Kommunikations-Lösung für Projekte in CeleroPress. Sie umfassen:
- Real-time Team-Chat mit Mentions & Attachments
- Projekt-Kommunikations-Feed mit Filtern
- Floating Chat Widget
- Asset-Picker für Media-Attachments
- **Server-Side Validation mit Admin SDK**

**Verwendet in:** Alle Projekt-Tabs (GlobalChat)

## Features

### TeamChat
- ✅ **Real-time Messages** - Live-Updates über Firebase Subscriptions
- ✅ **Mentions (@-Funktion)** - Team-Mitglieder erwähnen
- ✅ **Asset-Attachments** - Bilder, Videos, Dokumente anhängen
- ✅ **Message-Reactions** - Thumbs up/down, Hand raised
- ✅ **Message Edit/Delete** - mit Permission-Checks & Time-Limits
- ✅ **Edit-History** - Vollständige Transparenz
- ✅ **Unread Indicator** - Badge für ungelesene Nachrichten
- ✅ **Auto-Scroll** - Automatisches Scrollen zu neuen Messages

### Security & Compliance (Phase 1.5)
- ✅ **Rate-Limiting** - 10 Messages/Minute
- ✅ **Content-Moderation** - Profanity-Filter
- ✅ **Permission-Checks** - Server-Side Validation
- ✅ **Audit-Logs** - GDPR/ISO-ready
- ✅ **Time-Limits** - 15min für Edits/Deletes

## Verwendung

### TeamChat

\`\`\`tsx
import { TeamChat } from '@/components/projects/communication/TeamChat';

<TeamChat
  projectId="project-123"
  projectTitle="Mein Projekt"
  organizationId="org-123"
  userId="user-123"
  userDisplayName="Max Mustermann"
  lastReadTimestamp={new Date()}
/>
\`\`\`

### CommunicationModal

\`\`\`tsx
import { CommunicationModal } from '@/components/projects/communication/CommunicationModal';

<CommunicationModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  projectId="project-123"
  projectTitle="Mein Projekt"
/>
\`\`\`

## Referenzen

- [API-Dokumentation](./api/team-chat-service.md)
- [Komponenten-Dokumentation](./components/README.md)
- [ADRs](./adr/README.md)
- [Design System](../../design-system/DESIGN_SYSTEM.md)
```

#### API-Dokumentation

**Datei:** `docs/projects/communication/api/README.md`

Enthält:
- Team Chat Service API
- Communication Service API
- **Admin SDK API Routes**
- Hooks Dokumentation

#### ADR-Dokumentation

**Datei:** `docs/projects/communication/adr/README.md`

Enthält Architecture Decision Records:
- ADR-0001: React Query + Firebase Real-time Subscriptions
- ADR-0002: TeamChat Modularisierung Strategie
- **ADR-0003: Admin SDK Integration für Security**

### Checkliste Phase 5

**Option A: Agent-Delegation (EMPFOHLEN)**
- [ ] Agent aufgerufen: `/refactoring-dokumentation`
- [ ] Agent-Input bereitgestellt (Modul, Scope, Features)
- [ ] Agent-Output geprüft
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

**Option B: Manuell**
- [ ] docs/projects/communication/README.md erstellt (400+ Zeilen)
- [ ] docs/projects/communication/api/README.md erstellt
- [ ] docs/projects/communication/api/team-chat-service.md erstellt (800+ Zeilen)
- [ ] docs/projects/communication/api/admin-sdk-routes.md erstellt (600+ Zeilen)
- [ ] docs/projects/communication/components/README.md erstellt (650+ Zeilen)
- [ ] docs/projects/communication/adr/README.md erstellt (400+ Zeilen)
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

### Phase-Bericht

```markdown
## Phase 5: Dokumentation ✅

### Methode
- 🤖 Agent-Delegation: refactoring-dokumentation Agent verwendet (EMPFOHLEN)
  - Automatische Generierung der Dokumentation
  - Vollständige API-Referenzen
  - ADRs für wichtige Entscheidungen

ODER

- 📝 Manuell erstellt (falls Agent nicht verwendet)

### Erstellt
- README.md (400+ Zeilen) - Hauptdokumentation
- api/README.md (300+ Zeilen) - API-Übersicht
- api/team-chat-service.md (800+ Zeilen) - Detaillierte API-Referenz
- api/admin-sdk-routes.md (600+ Zeilen) - Admin SDK Endpoints
- components/README.md (650+ Zeilen) - Komponenten-Dokumentation
- adr/README.md (400+ Zeilen) - Architecture Decision Records

### Gesamt
- **3.150+ Zeilen Dokumentation**
- Vollständige Code-Beispiele
- Troubleshooting-Guides
- Performance-Messungen
- Security-Dokumentation
```

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation erstellt

Erstellt via refactoring-dokumentation Agent.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ✅ Abschluss Teil 4

**Erreicht:**
- ✅ 66 Tests geschrieben (100% Pass Rate)
- ✅ API Route Tests für alle Endpoints
- ✅ Coverage >80%
- ✅ 3.150+ Zeilen Dokumentation
- ✅ ADRs für wichtige Entscheidungen

**Nächster Schritt:**
[→ Teil 5: Production & Abschluss](./05-production-abschluss.md)

---

**Navigation:**
[← Teil 3: Modularisierung & Performance](./03-modularisierung-performance.md) | [Teil 5: Production & Abschluss →](./05-production-abschluss.md)
