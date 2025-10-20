# Communication Components - UI-Inventory Checklist

**Version:** 1.0
**Erstellt:** 2025-10-20
**Status:** ⏳ Wartet auf User-Review
**Zweck:** UI-Details dokumentieren BEVOR Refactoring beginnt (Phase 0.25)

---

## ⚠️ WICHTIG: Warum dieses Inventory?

Beim letzten Refactoring wurden UI-Details zerstört:
- ❌ Scrollbar-Schutz entfernt → Layout-Shift beim Modal-Öffnen
- ❌ Input-Button-Layout geändert → Buttons außerhalb statt innerhalb
- ❌ Enter-Bestätigung in @-Menü vergessen
- ❌ Emoji-Menü Design verändert

**Dieses Inventory verhindert das:**
- ✅ Dokumentiert JEDES UI-Detail VOR dem Refactoring
- ✅ Wird zur Test-Checkliste für Phase 2 (Modularisierung)
- ✅ Requires USER REVIEW bevor Phase 1 startet

---

## 📋 TeamChat.tsx UI-Inventory

### Layout & Struktur

- [x] **Container:** `flex flex-col h-full`
- [x] **Header:** Border (`border-b border-gray-200`), Padding, Unread-Badge Position
- [x] **Message-Liste:**
  - Scroll-Container: `flex-1 overflow-y-auto px-4 pt-6 pb-4 space-y-4`
  - Auto-Scroll Verhalten: `messagesEndRef` für Scroll-to-Bottom
- [x] **Input-Bereich:** Nur für Team-Mitglieder sichtbar (`{isTeamMember && ...}`)

### Input-Bereich (KRITISCH!)

✅ **Aktuelles Design (BEIBEHALTEN!):**
```
┌────────────────────────────────────────────────────┐
│ [Textarea mit Icons RECHTS INNEN]            [→] │
│   ↑                       ↑                    ↑   │
│   flex-1                  📎😊                Rechts│
└────────────────────────────────────────────────────┘
```

**Genaue Struktur (TeamChat.tsx:976-1036):**
- Container: `flex items-center space-x-3`
- Textarea:
  - `flex-1` (nimmt Rest-Breite)
  - `h-[44px]` (feste Höhe)
  - `border border-gray-300 rounded-lg`
  - `px-3 py-2 pr-20` (extra padding-right für Icons!)
  - `focus:ring-blue-500 focus:border-blue-500`
  - `resize-none`
  - Placeholder: leer (`""`)
- **Icons-Container (INNERHALB Textarea):**
  - Position: `absolute right-3 top-1/2 -translate-y-1/2`
  - Background: `bg-white rounded-md` (verhindert Überlappung mit Text)
  - Layout: `flex items-center space-x-1 px-1`
  - Asset-Button: `<PaperClipIcon className="h-4 w-4" />`
  - Emoji-Button: `<FaceSmileIcon className="h-4 w-4" />`
  - Hover: `hover:text-gray-600 hover:bg-gray-100`
- **Send-Button (RECHTS vom Textarea):**
  - `h-[44px] min-h-[44px] px-4`
  - `bg-primary hover:bg-primary-hover text-white rounded-lg`
  - Icon: `<ArrowRightIcon className="h-4 w-4" />`
  - Disabled: `!newMessage.trim() || sending`

### Scrollbar-Schutz (KRITISCH!)

**Location:** `TeamChat.tsx:166-200`

**Funktionsweise:**
```typescript
// Verhindert Layout-Shift wenn Modal öffnet
useEffect(() => {
  const isModalOpen = showAssetPicker || showEmojiPicker;

  if (isModalOpen) {
    // Berechne Scrollbar-Breite
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    // Füge padding-right hinzu
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';
    // Wichtig: Fixed Elemente auch anpassen
    const chatElement = document.querySelector('[data-floating-chat]');
    if (chatElement instanceof HTMLElement) {
      chatElement.style.paddingRight = `${scrollbarWidth}px`;
    }
  } else {
    // Reset
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';
    const chatElement = document.querySelector('[data-floating-chat]');
    if (chatElement instanceof HTMLElement) {
      chatElement.style.paddingRight = '';
    }
  }
}, [showAssetPicker, showEmojiPicker]);
```

**Wann aktiv:**
- Modal öffnet (Asset Picker oder Emoji Picker)
- Verhindert: Horizontal-Shift durch erscheinende Scrollbar

**MUSS BEIBEHALTEN WERDEN!**

### @-Mention-Menü

**Komponente:** `<MentionDropdown>` (TeamChat.tsx:1014-1023)

**Trigger (TeamChat.tsx:389-414):**
- User tippt `@` im Input
- Menü öffnet bei Match: `/@([\w\s]*)$/`

**Position:**
- Dynamisch berechnet basierend auf Cursor-Position
- Standard: `top: rect.top - 200` (über Textarea)
- `left: rect.left + (currentLine.length * charWidth)`

**Navigation (TeamChat.tsx:417-452):**
- **ArrowDown:** Nächster User (wrap zu 0 bei Ende)
- **ArrowUp:** Vorheriger User (wrap zu length-1 bei Anfang)
- **Enter:** Aktuell gehighlighteten User auswählen ← KRITISCH!
- **Escape:** Menü schließen ohne Auswahl

**Einfügen (TeamChat.tsx:454-476):**
- Format: `@${member.displayName} ` (mit Space am Ende!)
- Cursor wird nach Name + Space positioniert
- Focus bleibt im Textarea

### Emoji-Menü

**Location:** `TeamChat.tsx:1052-1091`

**Struktur:**
- **Backdrop:** `fixed inset-0 bg-black bg-opacity-50 z-50`
- **Content:**
  - `bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4`
  - Header: "Emoji auswählen" + X-Button
  - Grid: `grid-cols-8 gap-2` (8 Spalten!)
- **Emoji-Buttons:**
  - `text-2xl p-2 hover:bg-gray-100 rounded`
  - 32 Standard-Emojis

**Verhalten:**
- Click auf Emoji: Fügt Emoji am Cursor ein, Menü bleibt offen
- X-Button: Menü schließen

### Message-Item Design

**Eigene Messages (TeamChat.tsx:856-860):**
- Position: `justify-end` (rechts aligned)
- Background: `bg-primary-50`
- Border-Radius: `rounded-l-lg rounded-tr-lg` (rechte untere Ecke gerade!)
- Text: `text-gray-900`
- Avatar: Rechts vom Bubble (`ml-3 self-end`)

**Fremde Messages:**
- Position: `justify-start` (links aligned)
- Background: `bg-gray-100`
- Border-Radius: `rounded-r-lg rounded-tl-lg` (linke untere Ecke gerade!)
- Text: `text-gray-800`
- Avatar: Links vom Bubble (`mr-3 self-end`)

**Message-Bubble:**
- Width: `min-w-[200px] max-w-xs lg:max-w-md xl:max-w-lg`
- Padding: `px-4 py-2`
- Shadow: `shadow-sm`

**Content:**
- Text: `text-base break-words whitespace-pre-wrap leading-relaxed mb-2`
- Mentions: `@-Icon + Komma-Liste` (graue Text)
- Timestamp: Rechts unten (`text-xs`, `text-gray-600/500`, `ml-2 flex-shrink-0`)

**Edit-Hinweis:**
- Text: `(bearbeitet)`
- Style: `text-xs`, eigene: `text-gray-600`, fremde: `text-gray-400`

### Reactions (TeamChat.tsx:892-944)

**Position:** Unter Message-Content, über Timestamp

**Layout:**
- Container: `flex items-center gap-1`
- 3 Reactions: 👍 (HandThumbUpIcon), 👎 (HandThumbDownIcon), 🤚 (HandRaisedIcon)

**Styling:**
- Button: `flex items-center gap-1 px-2 py-1 rounded-full`
- Icon: `h-4 w-4`
- Count: `text-xs` (nur wenn > 0)

**States:**
- **Geklickt + Eigene Message:** `bg-primary-100 text-gray-800`
- **Geklickt + Fremde Message:** `bg-gray-200 text-gray-700`
- **Ungeklickt + Eigene Message:** `bg-primary-50 bg-opacity-80 text-gray-700`
- **Ungeklickt + Fremde Message:** `bg-gray-100 bg-opacity-80 text-gray-700`

**Tooltip (TeamChat.tsx:927-930):**
- Nur bei Count > 0
- Position: `absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2`
- Style: `bg-black text-white text-xs rounded whitespace-nowrap z-10`
- Content: Komma-separierte User-Namen

### Loading & Error States

**Loading (TeamChat.tsx:804-808):**
- Spinner: `animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600`
- Text: "Lade Nachrichten..." (`text-gray-500`)

**Empty State (TeamChat.tsx:961-967):**
- Container: `bg-gray-50 rounded-lg p-8 mx-4`
- Text: "Noch keine Nachrichten..."
- Hinweis für Non-Team-Members: "Nur Team-Mitglieder können Nachrichten senden."

**Send-Loading:**
- Button zeigt Spinner: `animate-spin rounded-full h-4 w-4 border-b-2 border-white`

### Animations/Transitions

- **Button Hover:** `transition-colors`
- **Reaction Hover:** `transition-colors`
- **Auto-Scroll:** Scroll to `messagesEndRef` (smooth behavior)

---

## 📋 CommunicationModal.tsx UI-Inventory

*(Wird im nächsten Schritt dokumentiert - File lesen erforderlich)*

---

## 📋 FloatingChat.tsx UI-Inventory

*(Wird im nächsten Schritt dokumentiert - File lesen erforderlich)*

---

## 📸 Screenshots (TODO - USER ERSTELLT)

**HINWEIS:** Screenshots können nur im Browser erstellt werden. Diese müssen manuell hinzugefügt werden.

**Benötigte Screenshots (in `docs/planning/shared/communication-ui-screenshots/`):**
- [ ] `teamchat-normal.png` - TeamChat Normal State
- [ ] `teamchat-input-focus.png` - Input mit Focus
- [ ] `teamchat-mention-menu.png` - @-Menü offen
- [ ] `teamchat-emoji-menu.png` - Emoji-Menü offen
- [ ] `teamchat-message-hover.png` - Message hover (Edit/Delete Buttons falls vorhanden)
- [ ] `teamchat-reactions.png` - Message mit Reactions
- [ ] `communication-modal.png` - CommunicationModal geöffnet
- [ ] `floating-chat-minimized.png` - FloatingChat minimiert
- [ ] `floating-chat-expanded.png` - FloatingChat expanded

**Oder: Screenshots überspringen und direkt zum Refactoring (mit Risiko!)**

---

## ✅ Checkliste für Phase 0.25

- [x] TeamChat Input-Bereich: Design + Icons-Position dokumentiert
- [x] Scrollbar-Schutz: Code gefunden + dokumentiert (TeamChat.tsx:166-200)
- [x] Emoji-Menü: Position, Design, Verhalten dokumentiert
- [x] @-Mention-Menü: Navigation + Enter-Bestätigung dokumentiert
- [x] Message-Items: Alle States dokumentiert (eigene/fremde, hover, edit)
- [x] Reactions: Layout + States dokumentiert
- [x] Loading & Error States dokumentiert
- [x] Verhaltensdokumentation geschrieben (separates Dokument)
- [ ] Screenshots erstellt (OPTIONAL - User entscheidet)
- [ ] **USER REVIEW:** User hat Inventory approved ✅

---

## 🚨 NÄCHSTER SCHRITT

**WICHTIG:** Phase 1 (React Query Integration) darf ERST starten nach:
1. **CommunicationModal.tsx** + **FloatingChat.tsx** auch dokumentiert (pending)
2. **USER REVIEW** des kompletten Inventorys

**Frage an User:**
- Screenshots selbst erstellen? (Browser öffnen, F12 DevTools → Screenshot)
- Oder: Screenshots überspringen und mit Code-Beschreibung fortfahren?

**Commit wird erst nach User-Review erstellt!**

---

**Status:** ⏳ Wartet auf User-Review
**Nächste Datei:** `communication-ui-behavior.md` (Keyboard-Shortcuts, Navigation)
