# Implementierungsplan: Claude-Style Chat UI

## Übersicht

Komplette Neugestaltung der Marken-DNA Chat-Oberfläche nach Vorbild von Claude.ai.

**Referenz:** `08-CHAT-UI-KONZEPT.md`

---

## Phase 1: Grundgerüst (Foundation)

**Ziel:** Fullscreen Modal mit neuem Chat-Layout

### Aufgaben

- [ ] `MarkenDNAChatModal.tsx` erstellen
  - Fullscreen Modal Container (`fixed inset-0`)
  - Flex-Layout: Header, Chat-Area, Input-Area

- [ ] `ChatHeader.tsx`
  - Links: Close-Button (XMarkIcon), Dokumenttyp-Titel, Company-Name
  - Rechts: Sidebar-Toggle (DocumentTextIcon) - erstmal disabled
  - Styling: `h-14 border-b border-zinc-200`

- [ ] `ChatMessages.tsx`
  - Scroll-Container für Messages
  - Auto-Scroll zu neuen Messages
  - Styling: `flex-1 overflow-y-auto`

- [ ] `ChatInput.tsx` (Claude-Style)
  - Mehrzeilige Textarea mit dynamischer Höhe
  - Send-Button rechts (PaperAirplaneIcon)
  - Enter = Senden, Shift+Enter = Neue Zeile
  - Styling: `rounded-xl border shadow-sm`

- [ ] `ActionBubbles.tsx`
  - 3 feste Buttons: Zwischenstand, Neu starten, Speichern
  - Zentriert unter Input
  - Styling: `rounded-full border`

### Dateien

```
src/components/marken-dna/chat/
├── MarkenDNAChatModal.tsx
└── components/
    ├── ChatHeader.tsx
    ├── ChatMessages.tsx
    ├── ChatInput.tsx
    └── ActionBubbles.tsx
```

### Ergebnis Phase 1

- [ ] Modal öffnet fullscreen
- [ ] Header mit Titel und Close
- [ ] Chat-Bereich scrollbar
- [ ] Große Input-Box unten (Claude-Style)
- [ ] 3 Action-Bubbles sichtbar (noch ohne Funktion)

---

## Phase 2: Message-Komponenten

**Ziel:** Schöne AI/User Messages mit Result-Boxen

### Aufgaben

- [ ] `UserMessage.tsx`
  - Rechts ausgerichtet
  - Styling: `bg-zinc-100 rounded-2xl ml-auto max-w-md`

- [ ] `AIMessage.tsx`
  - Links ausgerichtet, volle Breite nutzen
  - Markdown-Rendering mit react-markdown
  - Icon-Buttons unten rechts (nur Icons mit Tooltip):
    - ClipboardDocumentIcon → Kopieren
    - ArrowPathIcon → Neu generieren
  - Styling: `max-w-3xl`

- [ ] `ResultBox.tsx`
  - Formatierte Box für Phasen-Ergebnisse
  - Header mit Icon + Titel
  - Markdown-Content
  - Styling: `bg-zinc-50 border border-zinc-200 rounded-lg`

- [ ] `LoadingIndicator.tsx`
  - Typing-Animation (3 Punkte)
  - Erscheint während AI generiert

### Dateien

```
src/components/marken-dna/chat/
└── components/
    ├── UserMessage.tsx
    ├── AIMessage.tsx
    ├── ResultBox.tsx
    └── LoadingIndicator.tsx
```

### Ergebnis Phase 2

- [ ] User-Messages rechts, clean
- [ ] AI-Messages mit Markdown-Rendering
- [ ] Result-Boxen für Phasen-Zusammenfassungen
- [ ] Copy/Regenerate Icons mit Tooltip
- [ ] Loading-Animation während Generierung

---

## Phase 3: Sidebar & Interaktionen

**Ziel:** Dokument-Sidebar und Action-Button-Logik

### Aufgaben

- [ ] `DocumentSidebar.tsx`
  - Slide-in von rechts
  - Header: Titel + Close-Button
  - Content: Markdown-gerendert, scrollbar
  - Optional: Bearbeiten-Button
  - Animation: `transition-transform duration-300`
  - Styling: `w-[500px] border-l`

- [ ] Sidebar-Toggle aktivieren
  - Im Header: DocumentTextIcon klickbar
  - State: `sidebarOpen` in Modal

- [ ] Action-Bubble: "Zwischenstand"
  - Öffnet Sidebar mit aktuellem Dokument
  - Gleiche Funktion wie Header-Icon

- [ ] Action-Bubble: "Neu starten"
  - Bestätigungs-Dialog zeigen
  - Bei OK: Chat leeren, neu beginnen
  - Dokument bleibt bis explizit gespeichert

- [ ] Action-Bubble: "Speichern"
  - Speichert Dokument als Entwurf
  - Schließt Modal
  - Toast: "Entwurf gespeichert"

### Dateien

```
src/components/marken-dna/chat/
└── components/
    └── DocumentSidebar.tsx
```

### Ergebnis Phase 3

- [ ] Sidebar öffnet/schließt smooth
- [ ] Dokument wird in Sidebar angezeigt
- [ ] "Zwischenstand" öffnet Sidebar
- [ ] "Neu starten" mit Bestätigung
- [ ] "Speichern" speichert und schließt

---

## Phase 4: Integration & Polish

**Ziel:** Altes Modal ersetzen, Feinschliff

### Aufgaben

- [ ] Detail-Seite (`[companyId]/page.tsx`) umstellen
  - `MarkenDNAEditorModal` → `MarkenDNAChatModal`
  - Props anpassen

- [ ] Hook-Integration prüfen
  - `useGenkitChat` weiter nutzen
  - Ggf. erweitern für Result-Box Extraktion

- [ ] Keyboard-Shortcuts
  - `Enter` = Senden (ohne Shift)
  - `Shift+Enter` = Neue Zeile
  - `Escape` = Modal schließen (mit Warnung wenn ungespeichert)

- [ ] Auto-Scroll
  - Bei neuer Message nach unten scrollen
  - Smooth scroll animation

- [ ] Animationen
  - Sidebar slide-in/out
  - Message fade-in

- [ ] Cleanup
  - Debug console.logs entfernen
  - Alte `MarkenDNAEditorModal` entfernen (wenn nicht mehr gebraucht)
  - Alte `AIChatInterface` entfernen

### Ergebnis Phase 4

- [ ] Neues Chat-UI ist live
- [ ] Altes Modal entfernt
- [ ] Keine Debug-Logs mehr
- [ ] Smooth Animationen
- [ ] Keyboard-Shortcuts funktionieren

---

## Komponenten-Übersicht (Final)

```
src/components/marken-dna/chat/
├── MarkenDNAChatModal.tsx       # Fullscreen Container
│
└── components/
    ├── ChatHeader.tsx           # Titel, Close, Sidebar-Toggle
    ├── ChatMessages.tsx         # Scroll-Container
    ├── UserMessage.tsx          # User-Bubble rechts
    ├── AIMessage.tsx            # AI-Message mit Icons
    ├── ResultBox.tsx            # Phasen-Ergebnis Box
    ├── ChatInput.tsx            # Große Input-Box
    ├── ActionBubbles.tsx        # 3 feste Buttons
    ├── DocumentSidebar.tsx      # Slide-in Sidebar
    └── LoadingIndicator.tsx     # Typing-Animation
```

---

## Abhängigkeiten

- `react-markdown` (bereits installiert)
- `@headlessui/react` für Dialog/Transitions (bereits installiert)
- `useGenkitChat` Hook (bereits vorhanden)
- Heroicons (bereits installiert)

---

## Notizen

- Kein Split-Screen mehr
- Keine dynamischen Suggestion-Bubbles
- Fokus auf cleanes, Claude-ähnliches Design
- Mobile-Version später (erstmal Desktop-fokussiert)
