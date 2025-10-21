# Communication Components - UI-Verhalten

**Version:** 1.0
**Erstellt:** 2025-10-20
**Zweck:** Detaillierte Verhaltensdokumentation für alle Interaktionen

---

## 🎹 Keyboard-Shortcuts

### TeamChat Input-Bereich

**Location:** `TeamChat.tsx:417-452` (`handleKeyDown`)

#### Normal Mode (kein @-Menü aktiv)

| Shortcut | Verhalten | Code-Location |
|----------|-----------|---------------|
| **Enter** (ohne Shift) | Message senden | Zeile 448-450 |
| **Shift+Enter** | Neue Zeile im Textarea | Implizit (Enter nur prevented wenn !shiftKey) |

```typescript
// Normale Enter-Behandlung (TeamChat.tsx:448)
if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
  e.preventDefault();
  handleSendMessage();
}
```

#### @-Mention Mode (Dropdown aktiv)

| Shortcut | Verhalten | Code-Location |
|----------|-----------|---------------|
| **ArrowDown** | Nächster User (wrap zu 0 bei Ende) | Zeile 424-428 |
| **ArrowUp** | Vorheriger User (wrap zu Ende bei 0) | Zeile 429-433 |
| **Enter** | User auswählen ← KRITISCH! | Zeile 434-439 |
| **Escape** | Menü schließen ohne Auswahl | Zeile 440-443 |

```typescript
// @-Menü Navigation (TeamChat.tsx:418-444)
if (showMentionDropdown) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setSelectedMentionIndex(prev => prev < filteredMembers.length - 1 ? prev + 1 : 0);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : filteredMembers.length - 1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (filteredMembers[selectedMentionIndex]) {
      selectMention(filteredMembers[selectedMentionIndex]);
    }
    return;
  } else if (e.key === 'Escape') {
    e.preventDefault();
    setShowMentionDropdown(false);
    return;
  }
}
```

---

## 🎭 Scrollbar-Verhalten

**Location:** `TeamChat.tsx:166-200`

### Problem
Wenn ein Modal öffnet und `overflow: hidden` auf Body gesetzt wird, verschwindet die Scrollbar. Das führt zu einem horizontalen Layout-Shift (Jump), weil der Content-Bereich breiter wird.

### Lösung
```typescript
// 1. Berechne Scrollbar-Breite
const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

// 2. Modal öffnet → Füge padding-right hinzu
document.body.style.paddingRight = `${scrollbarWidth}px`;
document.body.style.overflow = 'hidden';

// 3. Fixed Elements auch anpassen
const chatElement = document.querySelector('[data-floating-chat]');
if (chatElement instanceof HTMLElement) {
  chatElement.style.paddingRight = `${scrollbarWidth}px`;
}

// 4. Modal schließt → Reset
document.body.style.paddingRight = '';
document.body.style.overflow = '';
chatElement.style.paddingRight = '';
```

### Wann aktiv
- Asset Picker Modal öffnet (`showAssetPicker === true`)
- Emoji Picker Modal öffnet (`showEmojiPicker === true`)

### Verhindert
- ✅ Horizontal-Shift beim Modal-Öffnen
- ✅ Layout-Jump von Fixed-Elementen (z.B. FloatingChat)

**KRITISCH: Darf beim Refactoring NICHT entfernt werden!**

---

## 📝 Auto-Scroll

**Location:** `TeamChat.tsx:messagesEndRef` + `useEffect` für scroll-to-bottom

### Verhalten
1. **Neue Message empfangen:** Scroll to bottom (smooth)
2. **User scrollt hoch:** Auto-Scroll NICHT pausieren (immer aktiv in dieser Version)
3. **User scrollt ganz runter:** Auto-Scroll aktiv

### Implementation
```typescript
// Ref am Ende der Message-Liste
<div ref={messagesEndRef} />

// Auto-Scroll bei neuen Messages (useEffect)
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

**Note:** In der aktuellen Version gibt es KEINE Scroll-Pause-Logik. Der Chat scrollt immer zu neuen Messages, auch wenn User gerade alte Messages liest.

**Verbesserungsvorschlag für spätere Version:**
```typescript
// User scrollt hoch → Auto-Scroll pausieren
const isUserScrollingUp = scrollTop < prevScrollTop && scrollTop < scrollHeight - clientHeight - 100;
```

---

## 🔍 @-Mention-Menü

**Location:** `TeamChat.tsx:382-476`

### Trigger

**User tippt @ im Input** (TeamChat.tsx:389-414):
```typescript
// Prüfe auf @-Mention
const beforeCursor = value.substring(0, cursorPos);
const mentionMatch = beforeCursor.match(/@([\w\s]*)$/);

if (mentionMatch) {
  const searchTerm = mentionMatch[1];  // Text nach @
  setMentionSearchTerm(searchTerm);
  setShowMentionDropdown(true);
}
```

**Regex:** `/@([\w\s]*)$/`
- Matched: `@`, `@Max`, `@Max Mu`
- Sucht: Wort-Zeichen und Spaces nach @

### Position

```typescript
// Dynamisch berechnet basierend auf Cursor-Position
const rect = textareaRef.current.getBoundingClientRect();
const lines = beforeCursor.split('\n');
const currentLine = lines[lines.length - 1];
const charWidth = 8; // Geschätzte Zeichen-Breite

setMentionDropdownPosition({
  top: rect.top - 200,  // Über der Textarea
  left: rect.left + (currentLine.length * charWidth)
});
```

**Standard:** Dropdown öffnet **über** der Textarea (`top: rect.top - 200`)

### Filtering

```typescript
const filteredMembers = teamMembers.filter(member =>
  member.displayName.toLowerCase().includes(mentionSearchTerm.toLowerCase()) ||
  member.email.toLowerCase().includes(mentionSearchTerm.toLowerCase())
);
```

**Sucht in:** Display Name UND Email

### Navigation

- **ArrowDown:** `selectedIndex++` (wrap zu 0)
- **ArrowUp:** `selectedIndex--` (wrap zu Ende)
- **Enter:** `selectMention(filteredMembers[selectedIndex])`
- **Escape:** Dropdown schließen

### Einfügen (KRITISCH!)

**Location:** `TeamChat.tsx:454-476`

```typescript
const selectMention = (member: TeamMember) => {
  const beforeCursor = newMessage.substring(0, cursorPosition);
  const afterCursor = newMessage.substring(cursorPosition);

  // Finde das @ und ersetze es mit dem Namen
  const mentionMatch = beforeCursor.match(/@([\w\s]*)$/);
  if (mentionMatch) {
    const beforeMention = beforeCursor.substring(0, mentionMatch.index);
    const newText = beforeMention + `@${member.displayName} ` + afterCursor;
    const newCursorPos = beforeMention.length + member.displayName.length + 2; // +2 für @ und Space

    setNewMessage(newText);
    setShowMentionDropdown(false);

    // Setze Cursor-Position nach Name + Space
    setTimeout(() => {
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      textareaRef.current.focus();
    }, 0);
  }
};
```

**Format:** `@${member.displayName} ` (mit Space!)
**Cursor:** Nach Name + Space positioniert
**Focus:** Bleibt im Textarea

**KRITISCH:**
1. **Space am Ende** ist wichtig! (`+ ' '`)
2. **Cursor-Position** muss korrekt sein: `length + 2` (für @ und Space)
3. **Focus** muss zurück zum Textarea

---

## 😊 Emoji-Menü

**Location:** `TeamChat.tsx:1052-1091`

### Öffnen

Button-Click: `onClick={() => setShowEmojiPicker(true)}`

### Position

**Modal (Fullscreen Overlay):**
```typescript
// Backdrop
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  // Content zentriert
  <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
    ...
  </div>
</div>
```

**Z-Index:** `z-50` (über allem)
**Position:** Zentriert (flex center)

### Grid

**Layout:** `grid-cols-8 gap-2` (8 Spalten!)

**32 Standard-Emojis:**
```javascript
['😀', '😂', '😍', '🥰', '😎', '🤔', '😅', '😊',
 '👍', '👎', '👏', '🙌', '💯', '🔥', '❤️', '💪',
 '🎉', '🎊', '✨', '⭐', '💡', '✅', '❌', '⚡',
 '👌', '✌️', '🤝', '🙏', '💖', '😴', '🤷', '🎯']
```

### Selection

```typescript
const handleEmojiSelect = (emoji: string) => {
  // Füge Emoji an Cursor-Position ein
  const beforeCursor = newMessage.substring(0, cursorPosition);
  const afterCursor = newMessage.substring(cursorPosition);
  const newText = beforeCursor + emoji + afterCursor;

  setNewMessage(newText);
  setCursorPosition(beforeCursor.length + emoji.length);

  // Menü schließen (optional - aktuell bleibt offen)
  setShowEmojiPicker(false);
};
```

**Click:** Emoji in Input einfügen an Cursor-Position
**Menü:** Schließt nach Selection (in dieser Version)

### Schließen

- **X-Button:** Click schließt Modal
- **Backdrop-Click:** (nicht implementiert in dieser Version)
- **Escape:** (nicht implementiert in dieser Version)

---

## 💬 Message Reactions

**Location:** `TeamChat.tsx:892-944`

### Layout

**Position:** Unter Message-Content, über Timestamp
**Container:** `flex items-center gap-1`

### 3 Reactions

1. **👍** Gefällt mir (HandThumbUpIcon)
2. **👎** Gefällt mir nicht (HandThumbDownIcon)
3. **🤚** Entscheide ihr / Enthaltung (HandRaisedIcon)

### States

**Eigene Message:**
- Geklickt: `bg-primary-100 text-gray-800`
- Ungeklickt: `bg-primary-50 bg-opacity-80 text-gray-700`

**Fremde Message:**
- Geklickt: `bg-gray-200 text-gray-700`
- Ungeklickt: `bg-gray-100 bg-opacity-80 text-gray-700`

**Hover:** `transition-colors`

### Tooltip

**Wann:** Nur bei Count > 0
**Trigger:** `onMouseEnter` + `onMouseLeave`
**Content:** Komma-separierte User-Namen
**Position:** `absolute bottom-full left-1/2 -translate-x-1/2 mb-2`
**Style:** `bg-black text-white text-xs rounded whitespace-nowrap z-10`

```typescript
{showReactionTooltip === `${message.id}-${emoji}` && count > 0 && (
  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
    {reaction?.userNames.join(', ')}
  </div>
)}
```

### Click-Handler

```typescript
onClick={() => handleReaction(message.id!, emoji)}

const handleReaction = async (messageId: string, emoji: string) => {
  // Toggle Reaction in Firebase
  await teamChatService.addReaction({
    projectId,
    messageId,
    userId,
    reaction: emoji
  });
};
```

---

## 🔄 Real-time Updates

**Location:** `TeamChat.tsx:useEffect` mit Firebase Subscriptions

### Subscription

```typescript
useEffect(() => {
  if (!projectId || !isTeamMember) return;

  // Real-time Subscription
  const unsubscribe = teamChatService.subscribeToMessages(
    projectId,
    (newMessages) => {
      setMessages(newMessages);
      // Auto-Scroll zu neuen Messages
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  );

  return () => unsubscribe();
}, [projectId, isTeamMember]);
```

### Verhalten

1. **Neue Message von anderem User:** Erscheint sofort + Auto-Scroll
2. **Eigene Message gesendet:** Erscheint nach Firebase-Write + Auto-Scroll
3. **Message edited:** Update erscheint sofort
4. **Reaction hinzugefügt:** Update erscheint sofort

---

## 🚫 Team-Member Check

**Location:** `TeamChat.tsx:71-164`

### Check-Logik

```typescript
const isMember = Boolean(
  // Check mit Member-ID in assignedTo Array
  (project.assignedTo && project.assignedTo.includes(memberId)) ||
  // Check mit userId
  (project.assignedTo && project.assignedTo.includes(userId)) ||
  // Projekt-Admin
  project.userId === userId ||
  // Projekt-Manager
  (project.projectManager && project.projectManager === userId)
);
```

### UI-States

**Team-Member:** Input-Bereich sichtbar, kann Messages senden
**Non-Team-Member:**
- Input-Bereich NICHT sichtbar (`{isTeamMember && ...}`)
- Empty State zeigt: "Nur Team-Mitglieder können Nachrichten senden."

---

## 📋 Zusammenfassung: Kritische Verhaltensweisen

### ⚠️ MUSS BEIBEHALTEN WERDEN beim Refactoring:

1. **Scrollbar-Schutz** (TeamChat.tsx:166-200)
   - Modal öffnet → padding-right = scrollbarWidth
   - Verhindert Layout-Shift

2. **Enter-Bestätigung in @-Menü** (TeamChat.tsx:434-439)
   - Enter wählt User aus
   - Fügt `@Name ` mit Space ein
   - Cursor nach Space positioniert

3. **Input-Icons INNERHALB Textarea** (TeamChat.tsx:989-1012)
   - Absolute Position: `right-3 top-1/2 -translate-y-1/2`
   - Background: `bg-white` für Überlappungs-Schutz
   - Textarea hat `pr-20` für Platz

4. **Reaction States** (TeamChat.tsx:912-920)
   - 4 verschiedene States (geklickt/ungeklickt x eigene/fremde)
   - Tooltip nur bei Count > 0

5. **Auto-Scroll** (TeamChat.tsx:messagesEndRef)
   - Neue Messages → Smooth scroll to bottom

6. **Team-Member Check** (TeamChat.tsx:71-164)
   - Input nur für Team-Members sichtbar

---

**Status:** ✅ Vollständig dokumentiert
**Nächste Datei:** `communication-ui-inventory-checklist.md` (Checkliste für User-Review)
