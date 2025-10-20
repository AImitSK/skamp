# Teil 3: Modularisierung & Performance

**Zurück:** [← Teil 2: React Query & Admin SDK](./02-react-query-admin-sdk.md) | **Weiter:** [Teil 4: Testing & Dokumentation →](./04-testing-dokumentation.md)

---

## 📋 Inhalt

- Phase 2: Code-Separation & Modularisierung
- Phase 3: Performance-Optimierung

---

## 🔀 Phase 2: Code-Separation & Modularisierung

**Ziel:** Große Komponenten aufteilen, Duplikate eliminieren

**Dauer:** 2 Tage

---

## ⚠️ KRITISCHE REGEL: UI-Inventory ist PFLICHT!

**BEVOR du auch nur EINE Zeile änderst:**

1. **UI-Inventory aus Phase 0.25 öffnen**
   - `docs/planning/shared/communication-ui-inventory-checklist.md`
   - Alle Screenshots in `docs/planning/shared/communication-ui-screenshots/`
   - `docs/planning/shared/communication-ui-behavior.md`

2. **Für JEDE Sub-Komponente die du erstellst:**
   - ✅ CSS/Styling 1:1 vom Original kopieren (NICHT neu schreiben!)
   - ✅ Layout-Struktur EXAKT beibehalten
   - ✅ Alle Event-Handler kopieren
   - ✅ DANN erst in kleinere Komponenten trennen

3. **Nach JEDER Sub-Komponente:**
   - [ ] Sieht EXAKT wie Screenshot aus?
   - [ ] Verhält sich wie in UI-Behavior dokumentiert?
   - [ ] Input-Buttons INNERHALB? (nicht außerhalb!)
   - [ ] Scrollbar-Schutz noch da?
   - [ ] Enter-Bestätigung in @-Menü?
   - [ ] Emoji-Menü Position korrekt?
   - [ ] Alle Transitions vorhanden?

4. **Bei Unsicherheit:**
   - STOPP! User fragen!
   - Zeige deine geplante Änderung
   - Warte auf ✅

**REMEMBER:** Letztes Mal hast du UI-Details ignoriert und zerstört. Diesmal: UI-Inventory ist dein ERSTES Dokument, nicht der Code!

---

### Phase 2.1: TeamChat.tsx Modularisierung (KRITISCH!)

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

#### 📋 WORKFLOW-BEISPIEL: MessageInput.tsx extrahieren

**SCHRITT 1: UI-Inventory checken**
```markdown
✓ UI-Inventory lesen: Input-Bereich (KRITISCH)
✓ Screenshot anschauen: TeamChat Input mit Focus
✓ Behavior-Doc lesen: Keyboard-Shortcuts
```

**SCHRITT 2: Original-Code KOMPLETT lesen**
```tsx
// TeamChat.tsx - Input-Bereich finden (ca. Zeile X-Y)
// ALLE Zeilen kopieren, NICHTS ändern!
const inputContainer = (
  <div className="flex items-center gap-2 p-2 border-t">  {/* ✓ Flex-Layout */}
    <button onClick={handleMentionClick}>@</button>       {/* ✓ Links */}
    <button onClick={handleAttachClick}>📎</button>      {/* ✓ Links */}
    <textarea
      className="flex-1 ..."                             {/* ✓ flex-1 */}
      onKeyDown={handleKeyDown}                          {/* ✓ Enter-Handler */}
    />
    <button onClick={handleSend}>→</button>              {/* ✓ Rechts */}
  </div>
);
```

**SCHRITT 3: Neue Datei erstellen - 1:1 KOPIEREN**
```tsx
// src/components/projects/communication/TeamChat/MessageInput.tsx
// EXAKT kopierter Code aus TeamChat.tsx
export const MessageInput = ({ ... }) => {
  // GLEICHE Event-Handler
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {  // ✓ Wie im Original!
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-t">  {/* ✓ GLEICHE Klassen! */}
      <button onClick={onMentionClick}>@</button>
      <button onClick={onAttachClick}>📎</button>
      <textarea className="flex-1 ..." onKeyDown={handleKeyDown} />
      <button onClick={onSend}>→</button>
    </div>
  );
};
```

**SCHRITT 4: Vergleich mit UI-Inventory**
- [X] Buttons INNERHALB des Containers? ✅
- [X] Flex-Layout gleich? ✅
- [X] Button-Reihenfolge (@, 📎, textarea, →)? ✅
- [X] Enter-Handler für Senden? ✅
- [X] Shift+Enter für neue Zeile? ✅

**SCHRITT 5: Screenshot-Vergleich**
```bash
# Browser öffnen, Komponente testen
# Vergleich mit: docs/.../TeamChat-Input-Focus.png
# Sieht EXAKT gleich aus? ✅
```

**NUR WENN ALLE ✅:**
- Dann in TeamChat.tsx einbauen
- Dann manuell testen
- Dann committen

**WENN AUCH NUR EINE KLEINIGKEIT ANDERS AUSSIEHT:**
- STOPP!
- User zeigen
- Warten auf Feedback

---

**Backward Compatibility:**
```typescript
// src/components/projects/communication/TeamChat.tsx (3 Zeilen)
// Re-export für bestehende Imports
export { TeamChat } from './TeamChat/TeamChat';
```

### Phase 2.2: CommunicationModal.tsx Modularisierung

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

**Backward Compatibility:**
```typescript
// src/components/projects/communication/CommunicationModal.tsx (3 Zeilen)
export { CommunicationModal } from './CommunicationModal/CommunicationModal';
export type { CommunicationModalProps } from './CommunicationModal/types';
```

### Checkliste Phase 2

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

### Phase-Bericht

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
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung abgeschlossen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ⚡ Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden, Performance verbessern

**Dauer:** 1 Tag

### 3.1 useCallback für Handler

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

### 3.2 useMemo für Computed Values

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

### 3.3 React.memo für Komponenten

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

### Checkliste Phase 3

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
- [ ] Performance-Tests durchgeführt

### Phase-Bericht

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 8 Handler
- useMemo für 3 Computed Values (sortedMessages, unreadCount, filteredMessages)
- React.memo für 3 Komponenten (MessageItem, ReactionBar, UnreadIndicator)

### Messbare Verbesserungen
- Re-Renders reduziert um ~60%
- Message-Rendering optimiert (memo)
- Auto-Scroll Performance verbessert
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ✅ Abschluss Teil 3

**Erreicht:**
- ✅ TeamChat modularisiert (1096 → 7 Dateien)
- ✅ CommunicationModal modularisiert (536 → 5 Dateien)
- ✅ Performance-Optimierungen (useCallback, useMemo, React.memo)
- ✅ Re-Renders um 60% reduziert
- ✅ Alle Dateien < 300 Zeilen

**Nächster Schritt:**
[→ Teil 4: Testing & Dokumentation](./04-testing-dokumentation.md)

---

**Navigation:**
[← Teil 2: React Query & Admin SDK](./02-react-query-admin-sdk.md) | [Teil 4: Testing & Dokumentation →](./04-testing-dokumentation.md)
