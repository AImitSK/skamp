# Teil 1: Übersicht & Setup

**Zurück:** [← Master-Index](./README.md) | **Weiter:** [Teil 2: React Query & Admin SDK →](./02-react-query-admin-sdk.md)

---

## 📋 Übersicht

Die Communication Components sind **kritische Shared Components**, die in **allen Tabs** verwendet werden (GlobalChat). Ein Refactoring dieser Module ist essentiell, bevor die Tab-Module angegangen werden.

**Wichtige Korrektur:**
- **Geschätzte LOC in Master Checklist:** ~400+
- **Tatsächliche LOC:** **2.713 Zeilen** (fast 7x mehr!)
- **Aufwand-Update:** M (Medium) → **XL (Extra Large)** - 8-11 Tage
- **Admin SDK Integration:** Phase 1.5 für kritische Security-Verbesserungen hinzugefügt

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

## 🚀 Phase 0: Vorbereitung & Setup

**Ziel:** Sicherer Start mit Backup und Dokumentation des Ist-Zustands

**Dauer:** 1-2 Stunden

### Aufgaben

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

### Deliverable

- Feature-Branch erstellt
- 3 Backup-Dateien angelegt (TeamChat, CommunicationModal, FloatingChat)
- Dokumentation des Ist-Zustands (2.713 Zeilen Code)

### Phase-Bericht Template

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

## 📸 Phase 0.25: UI-Inventory (KRITISCH!) ⭐

**Ziel:** JEDES UI-Detail dokumentieren BEVOR mit Refactoring begonnen wird

**Dauer:** 2-3 Stunden

**Warum KRITISCH?**
- Beim letzten Refactoring wurden UI-Details zerstört (Scrollbar-Schutz, Input-Design, Emoji-Menü, Enter-Bestätigung)
- Dieses Inventory wird zur **Test-Checkliste** für Phase 2 (Modularisierung)
- User reviewed das Inventory BEVOR Phase 1 startet

### 0.25.1 TeamChat.tsx UI-Inventory

#### Layout & Struktur
- [ ] Container: `flex flex-col h-full`
- [ ] Header: Border, Padding, Unread-Badge Position
- [ ] Message-Liste: Scroll-Container, Auto-Scroll Verhalten
- [ ] Input-Bereich: **Buttons INNERHALB des Textareas** (nicht außerhalb!)

#### Input-Bereich (KRITISCH - wurde letztes Mal zerstört!)
```
Aktuelles Design:
┌─────────────────────────────────────────────┐
│ [@] [📎] [Nachricht eingeben...        ][→]│  ← Alles EINE Zeile
└─────────────────────────────────────────────┘

❌ NICHT SO (wie du es letztes Mal gemacht hast):
┌─────────────────────────────────────────────┐
│ [Nachricht eingeben...                    ] │
│ [@] [📎]                              [→]  │  ← Buttons außerhalb
└─────────────────────────────────────────────┘
```

**Genaue Struktur dokumentieren:**
- [ ] Textarea mit Buttons davor UND danach im gleichen Container?
- [ ] Flex-Layout des Input-Containers (`flex items-center gap-2`)?
- [ ] Button-Positionen (links: @, 📎 | rechts: →)?
- [ ] Textarea: `flex-1` für Rest-Breite?
- [ ] Border-Radius, Padding, Height?

#### Scrollbar-Schutz (KRITISCH - wurde letztes Mal zerstört!)
```typescript
// Aktueller Code - WO ist das?
// Verhindert Layout-Shift wenn Modal öffnet (Scrollbar erscheint)
```

**Zu dokumentieren:**
- [ ] Welche Komponente hat den Scrollbar-Schutz?
- [ ] Wie funktioniert er? (padding-right beim Body?)
- [ ] Wann wird er aktiviert? (Modal open?)
- [ ] Code-Location genau notieren

#### Emoji-Menü
- [ ] Trigger-Button: Welches Icon? Wo positioniert?
- [ ] Menü öffnet: Wo? (über/unter Input?)
- [ ] Menü-Design: Größe, Grid-Layout, Border, Shadow?
- [ ] Emoji-Selection: Click-Verhalten
- [ ] Close-Verhalten: Click outside?

#### @-Mention-Menü
- [ ] Trigger: @ im Input
- [ ] Dropdown-Position: Direkt über/unter Input?
- [ ] Dropdown-Design: Border, Shadow, Max-Height?
- [ ] Navigation: Pfeiltasten hoch/runter?
- [ ] **Enter-Bestätigung** (KRITISCH - wurde letztes Mal vergessen!)
- [ ] Escape-Close?
- [ ] Click outside Close?

#### Message-Item Design
- [ ] Eigene Messages: Rechts aligned? Anderer Background?
- [ ] Fremde Messages: Links aligned?
- [ ] Avatar: Größe, Position
- [ ] Timestamp: Format, Position, Farbe
- [ ] Edit/Delete Buttons: Nur bei hover? Position?
- [ ] Edit-Form: Inline? Layout?
- [ ] Edit-History: Collapsible `<details>`? Styling?

#### Reactions
- [ ] Position: Unter Message?
- [ ] Layout: Horizontal flex?
- [ ] Active State: Anderer Background?
- [ ] Hover States?

#### Attachments
- [ ] Preview: Grid-Layout?
- [ ] Thumbnail-Größe?
- [ ] Remove-Button: Position, Icon?

#### Animations/Transitions
- [ ] Message erscheinen: Fade-in? Slide-in?
- [ ] Auto-Scroll: Smooth? Duration?
- [ ] Dropdown öffnen: Transition?
- [ ] Hover States: Transition-Duration?

#### Loading & Error States
- [ ] Loading: Spinner? Position? Text?
- [ ] Error: Toast? Inline? Farbe?
- [ ] Empty State: Text, Icon, Position?

### 0.25.2 CommunicationModal.tsx UI-Inventory

#### Modal-Verhalten
- [ ] Backdrop: Blur? Farbe? Opacity?
- [ ] Modal-Size: Größe, Max-Width?
- [ ] Close-Behavior: X-Button, Escape, Click outside?
- [ ] **Scrollbar-Schutz aktiv?** (siehe TeamChat)

#### Filter-Bereich
- [ ] Layout: Horizontal? Vertical?
- [ ] Dropdown-Designs?
- [ ] Active-Filter Anzeige?

#### Message-Feed
- [ ] Scroll-Container?
- [ ] Message-Items: Gleich wie TeamChat?
- [ ] Trennung zwischen Messages?

### 0.25.3 FloatingChat.tsx UI-Inventory

#### Floating-Button
- [ ] Position: Fixed? Bottom-Right?
- [ ] Größe, Border-Radius?
- [ ] Icon?
- [ ] Unread-Badge: Position, Größe?
- [ ] Hover-State?
- [ ] Shadow?

#### Expanded-State
- [ ] Öffnet: Slide-in? From where?
- [ ] Größe: Width, Height?
- [ ] Position: Fixed?
- [ ] Shadow?
- [ ] Resize-Bar?

### 0.25.4 Screenshots erstellen

**Für jede Komponente:**
```bash
# Screenshots im Browser erstellen (F12 DevTools → Screenshot)
# Speichern unter: docs/planning/shared/communication-ui-screenshots/

Screenshots needed:
- TeamChat: Normal State
- TeamChat: Input mit Focus
- TeamChat: @-Menü offen
- TeamChat: Emoji-Menü offen
- TeamChat: Message hover (Edit/Delete Buttons)
- TeamChat: Edit-Form aktiv
- TeamChat: Edit-History expanded
- CommunicationModal: Geöffnet
- CommunicationModal: Filter aktiv
- FloatingChat: Minimiert
- FloatingChat: Expanded
```

### 0.25.5 Verhaltensdokumentation

**Datei:** `docs/planning/shared/communication-ui-behavior.md`

```markdown
# Communication Components - UI-Verhalten

## TeamChat Input-Bereich

### Keyboard-Shortcuts
- Enter (ohne Shift): Message senden
- Shift+Enter: Neue Zeile
- @ + Buchstabe: Mention-Menü öffnen
- Escape (in @-Menü): Menü schließen
- Pfeil hoch/runter (in @-Menü): Navigation
- Enter (in @-Menü): User auswählen ← KRITISCH!

### Scrollbar-Verhalten
- Modal öffnet: `document.body.style.paddingRight = '15px'` (Scrollbar-Breite)
- Modal schließt: Padding entfernen
- Verhindert: Layout-Shift beim Öffnen

### Auto-Scroll
- Neue Message: Scroll to bottom (smooth)
- User scrollt hoch: Auto-Scroll pausieren
- User scrollt ganz runter: Auto-Scroll reaktivieren

## @-Mention-Menü

### Trigger
- User tippt @ im Input
- Menü erscheint direkt darüber/darunter

### Navigation
- Pfeiltasten: Durch User-Liste navigieren
- Enter: Aktuell gehighlighteten User auswählen ← KRITISCH!
- Escape: Menü schließen ohne Auswahl
- Click outside: Menü schließen

### Einfügen
- User ausgewählt: "@Max Mustermann" in Input einfügen
- Cursor nach dem Namen positionieren
- Space automatisch hinzufügen

## Emoji-Menü

### Position
- Öffnet: [Position dokumentieren]
- Z-Index: [Wert dokumentieren]

### Grid
- Layout: [Spalten x Zeilen]
- Emoji-Größe: [Größe]

### Selection
- Click: Emoji in Input einfügen
- Menü bleibt offen (oder schließt?)
```

### Checkliste Phase 0.25

- [ ] TeamChat Input-Bereich: Design + Buttons-Position dokumentiert
- [ ] Scrollbar-Schutz: Code gefunden + dokumentiert
- [ ] Emoji-Menü: Position, Design, Verhalten dokumentiert
- [ ] @-Mention-Menü: Navigation + Enter-Bestätigung dokumentiert
- [ ] Message-Items: Alle States dokumentiert (normal, hover, edit, history)
- [ ] Reactions: Layout + States dokumentiert
- [ ] Attachments: Preview-Design dokumentiert
- [ ] Animations: Alle Transitions dokumentiert
- [ ] Screenshots erstellt (11+ Screenshots)
- [ ] Verhaltensdokumentation geschrieben
- [ ] **USER REVIEW:** User hat Inventory approved ✅

### Deliverable

**Datei:** `docs/planning/shared/communication-ui-inventory-checklist.md`

```markdown
## UI-Inventory Checklist ✅

### TeamChat
- ✅ Input-Bereich Design: Buttons INNERHALB, flex layout
- ✅ Scrollbar-Schutz: [Location + Code]
- ✅ Emoji-Menü: [Position + Design]
- ✅ @-Menü: Enter-Bestätigung + Navigation
- ✅ Message-Items: Alle States
- ✅ Edit-Form: Inline + Buttons
- ✅ Edit-History: Collapsible

### CommunicationModal
- ✅ Modal-Verhalten: Backdrop + Close
- ✅ Filter: Layout + Active-States
- ✅ Feed: Scroll + Messages

### FloatingChat
- ✅ Button: Position + Badge
- ✅ Expanded: Size + Position

### Screenshots
- [X] TeamChat Normal
- [X] TeamChat @-Menü
- [X] TeamChat Emoji-Menü
- [X] TeamChat Edit-Form
- ... etc.

### USER APPROVED: ✅ [Datum]
```

**WICHTIG:** Phase 1 startet ERST nach User-Approval des Inventorys!

**Commit:**
```bash
git add .
git commit -m "docs: Phase 0.25 - UI-Inventory erstellt

- Komplettes UI-Design dokumentiert
- Alle Interaktionen erfasst
- Screenshots erstellt
- Verhaltensdokumentation geschrieben

Ready für User-Review vor Phase 1.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🧹 Phase 0.5: Pre-Refactoring Cleanup

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

**Dauer:** 1-2 Stunden

### 0.5.1 TODO-Kommentare finden & entfernen

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

### 0.5.2 Console-Logs finden & entfernen

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

### 0.5.3 Deprecated Functions finden & entfernen

**Anzeichen für deprecated Functions:**
- Mock-Implementations (`setTimeout(resolve, 2000)`)
- Kommentare wie "old", "deprecated", "unused"
- Functions die nur noch an einer Stelle aufgerufen werden

**Aktion:**
- [ ] Code auf "deprecated", "old", "legacy" durchsuchen
- [ ] Mock-Implementations identifizieren
- [ ] Functions entfernen + alle Aufrufe

### 0.5.4 Unused State entfernen

```bash
# State-Deklarationen finden
grep -n "useState" src/components/projects/communication/*.tsx
```

**Aktion:**
- [ ] Alle useState-Deklarationen durchgehen
- [ ] Unused States identifizieren
- [ ] States + Setter entfernen

### 0.5.5 Kommentierte Code-Blöcke entfernen

**Aktion:**
- [ ] Auskommentierte Code-Blöcke identifizieren
- [ ] Entscheidung: Implementieren oder entfernen?
- [ ] Code-Blöcke vollständig löschen

### 0.5.6 ESLint Auto-Fix

```bash
# Unused imports/variables automatisch entfernen
npx eslint src/components/projects/communication --fix

# Prüfen was behoben wurde
npx eslint src/components/projects/communication
```

### 0.5.7 Manueller Test

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

### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt oder umgesetzt
- [ ] Debug-Console-Logs entfernt (~X Logs)
- [ ] Deprecated Functions entfernt
- [ ] Unused State-Variablen entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Unused imports entfernt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

### Deliverable

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

## ✅ Abschluss Teil 1

**Erreicht:**
- ✅ Ist-Zustand dokumentiert (2.713 LOC)
- ✅ Probleme identifiziert
- ✅ Feature-Branch & Backups erstellt
- ✅ Toter Code entfernt

**Nächster Schritt:**
[→ Teil 2: React Query & Admin SDK Integration](./02-react-query-admin-sdk.md)

---

**Navigation:**
[← Zurück zum Master-Index](./README.md) | [Teil 2: React Query & Admin SDK →](./02-react-query-admin-sdk.md)
