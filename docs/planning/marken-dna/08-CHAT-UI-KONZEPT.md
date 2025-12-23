# Chat-UI Konzept: Claude-ähnliches Interface

## Ziel

Ein modernes Chat-Erlebnis wie Claude.ai für die Marken-DNA Erstellung. Voller Fokus auf den Chat, Dokument als Slide-in Sidebar bei Bedarf.

---

## Design-Referenz

**Vorbild:** Claude.ai Interface
- Großer Chat-Bereich mit viel Platz
- Große Input-Box unten
- Ergebnisse in formatierten Boxen im Chat
- Dokument als Slide-in Sidebar (wie Artifacts)

### Design System

> **WICHTIG:** Alle UI-Komponenten MÜSSEN dem CeleroPress Design System entsprechen!
> Referenz: `docs/design-system/DESIGN_SYSTEM.md`

- **Icons:** Ausschließlich Heroicons `/24/outline`
- **Farben:** Primary (#005fab), Zinc-Palette
- **Borders:** `border-zinc-200` für Cards, `border-zinc-300` für Inputs

---

## Layout

### Hauptansicht (Fullscreen Modal)

```
┌─────────────────────────────────────────────────────────────────┐
│  [X] Briefing-Check · Golf-Club Widukind-Land            [📄]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│     ┌───────────────────────────────────────────────────────┐   │
│     │ Willkommen! Ich helfe dir, das Briefing für           │   │
│     │ Golf-Club Widukind-Land zu erstellen.                 │   │
│     │                                                       │   │
│     │ In welcher Branche ist das Unternehmen tätig?         │   │
│     │                                              [📋][🔄] │   │
│     └───────────────────────────────────────────────────────┘   │
│                                                                 │
│                        ┌────────────────────────────────────┐   │
│                        │ Wir betreiben einen Golf-Club mit  │   │
│                        │ 18-Loch-Platz und Restaurant.      │   │
│                        └────────────────────────────────────┘   │
│                                                                 │
│     ┌───────────────────────────────────────────────────────┐   │
│     │ Perfekt! Golf & Gastronomie - ein spannendes         │   │
│     │ Geschäftsmodell mit mehreren Zielgruppen.            │   │
│     │                                                       │   │
│     │ ┌─────────────────────────────────────────────────┐   │   │
│     │ │ 📊 Phase 1: Unternehmensprofil                  │   │   │
│     │ ├─────────────────────────────────────────────────┤   │   │
│     │ │                                                 │   │   │
│     │ │ **Branche:** Golf & Gastronomie                 │   │   │
│     │ │ **Geschäftsmodell:**                            │   │   │
│     │ │ • Mitgliedschaften (Golf)                       │   │   │
│     │ │ • Greenfee-Gäste                                │   │   │
│     │ │ • Restaurant (auch Nicht-Golfer)                │   │   │
│     │ │                                                 │   │   │
│     │ └─────────────────────────────────────────────────┘   │   │
│     │                                                       │   │
│     │ Wer sind eure Hauptzielgruppen?                       │   │
│     │                                              [📋][🔄] │   │
│     └───────────────────────────────────────────────────────┘   │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │ Nachricht eingeben...                                     │  │
│  │                                                       [➤] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│    [📄 Zwischenstand]    [🔄 Neu starten]    [💾 Speichern]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mit Sidebar (Dokument-Ansicht)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [X] Briefing-Check · Golf-Club Widukind-Land                        [📄]  │
├─────────────────────────────────────────┬───────────────────────────────────┤
│                                         │ 📄 Dokument                    [X]│
│     Chat-Bereich                        ├───────────────────────────────────┤
│     (wie oben)                          │                                   │
│                                         │ # Briefing-Check                  │
│                                         │                                   │
│                                         │ ## Phase 1: Unternehmen           │
│                                         │ **Branche:** Golf & Gastronomie   │
│                                         │ **Geschäftsmodell:**              │
│                                         │ • Mitgliedschaften                │
│                                         │ • Greenfee-Gäste                  │
│                                         │ • Restaurant                      │
│                                         │                                   │
│                                         │ ## Phase 2: Zielgruppen           │
│                                         │ (noch nicht ausgefüllt)           │
│                                         │                                   │
│                                         │                                   │
├─────────────────────────────────────────┤                                   │
│  ┌───────────────────────────────────┐  │                                   │
│  │ Nachricht...                  [➤] │  │                                   │
│  └───────────────────────────────────┘  │                                   │
│  [Zwischenstand] [Neu starten] [Speich] │                                   │
└─────────────────────────────────────────┴───────────────────────────────────┘
```

---

## UI-Elemente

### 1. Header

```
┌─────────────────────────────────────────────────────────────────┐
│  [XMarkIcon] Briefing-Check · Golf-Club Widukind-Land    [📄]  │
└─────────────────────────────────────────────────────────────────┘
```

- **Links:** Close-Button (X), Dokumenttyp-Titel, Company-Name
- **Rechts:** Sidebar-Toggle Icon (DocumentTextIcon)
- Styling: `bg-white border-b border-zinc-200`

### 2. Chat-Nachrichten

#### AI-Nachricht

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│ Markdown-formatierter Text der KI-Antwort.                   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ 📊 Phasen-Titel                                         │   │
│ ├─────────────────────────────────────────────────────────┤   │
│ │ Strukturiertes Ergebnis in einer Box                    │   │
│ │ • Bullet Points                                         │   │
│ │ • Weitere Punkte                                        │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ Weitere Frage oder Hinweis?                                   │
│                                                               │
│                                          [📋] [🔄]            │
└───────────────────────────────────────────────────────────────┘
```

- **Ergebnis-Box:** `bg-zinc-50 border border-zinc-200 rounded-lg`
- **Icon-Buttons:** Nur Icons mit Tooltip, rechts unten
  - 📋 `ClipboardDocumentIcon` → "Kopieren"
  - 🔄 `ArrowPathIcon` → "Neu generieren"
- Styling Message: `bg-white` (kein Border, clean)

#### User-Nachricht

```
                        ┌────────────────────────────────────┐
                        │ User-Text rechts ausgerichtet      │
                        └────────────────────────────────────┘
```

- Styling: `bg-primary text-white rounded-lg` oder `bg-zinc-100 rounded-lg`
- Rechts ausgerichtet

### 3. Input-Box (Claude-Style)

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│ Nachricht eingeben...                                         │
│                                                           [➤] │
└───────────────────────────────────────────────────────────────┘
```

- **Mehrzeilig:** `textarea` mit `min-height` und `max-height`
- **Placeholder:** "Nachricht eingeben..."
- **Send-Button:** `PaperAirplaneIcon` rechts, Primary-Color
- Styling: `bg-white border border-zinc-300 rounded-xl shadow-sm`
- Enter = Senden, Shift+Enter = Neue Zeile

### 4. Action-Bubbles (3 feste)

```
   [📄 Zwischenstand]    [🔄 Neu starten]    [💾 Speichern]
```

- **Immer sichtbar**, nicht dynamisch
- Zentriert unter der Input-Box
- Styling: `bg-white border border-zinc-200 rounded-full px-4 py-2 hover:bg-zinc-50`

| Button | Icon | Aktion |
|--------|------|--------|
| Zwischenstand | `DocumentTextIcon` | Öffnet Sidebar mit aktuellem Dokument |
| Neu starten | `ArrowPathIcon` | Chat zurücksetzen (mit Bestätigung) |
| Speichern | `BookmarkIcon` | Speichert als Entwurf und schließt |

### 5. Dokument-Sidebar

- **Slide-in von rechts** (wie Claude Artifacts)
- **Breite:** `w-[500px]` oder `w-1/3`
- **Header:** Titel + Close-Button
- **Content:** Markdown-gerendert, scrollbar
- **Optional:** Bearbeiten-Button um direkt zu editieren

---

## Komponenten-Struktur

```
src/components/marken-dna/chat/
├── MarkenDNAChatModal.tsx       # Fullscreen Modal Container
│
├── components/
│   ├── ChatHeader.tsx           # Titel, Company, Sidebar-Toggle, Close
│   ├── ChatMessages.tsx         # Scroll-Container für Messages
│   ├── AIMessage.tsx            # AI-Nachricht mit Result-Box + Icons
│   ├── UserMessage.tsx          # User-Nachricht (rechts)
│   ├── ResultBox.tsx            # Formatierte Ergebnis-Box in AI-Message
│   ├── ChatInput.tsx            # Große mehrzeilige Input-Box
│   ├── ActionBubbles.tsx        # 3 feste Buttons
│   ├── DocumentSidebar.tsx      # Slide-in Dokument-Ansicht
│   └── LoadingIndicator.tsx     # Typing-Animation
│
├── hooks/
│   └── useMarkenDNAChat.ts      # Chat-Logik (erweitert useGenkitChat)
│
└── types.ts
```

---

## Interaktionen

### Chat-Flow

1. User öffnet Modal → Begrüßung + erste Frage
2. User antwortet → AI verarbeitet, zeigt Ergebnis in Box
3. Nach jeder Phase → Box mit Zusammenfassung im Chat
4. Dokument wird im Hintergrund aufgebaut
5. User kann jederzeit "Zwischenstand" klicken → Sidebar öffnet
6. "Speichern" → Dokument wird als Entwurf gespeichert

### Sidebar-Toggle

- Click auf 📄 im Header → Sidebar slides in
- Click auf X in Sidebar → Sidebar slides out
- Chat bleibt interaktiv während Sidebar offen

### Neu starten

- Bestätigungs-Dialog: "Chat wirklich zurücksetzen?"
- Bei Bestätigung: Chat leeren, neu beginnen
- Bisheriger Entwurf bleibt (bis explizit gespeichert)

---

## Verwendete Heroicons

```typescript
import {
  // Header
  XMarkIcon,              // Modal schließen
  DocumentTextIcon,       // Sidebar toggle / Zwischenstand

  // Message Actions
  ClipboardDocumentIcon,  // Kopieren (nur Icon)
  ArrowPathIcon,          // Neu generieren (nur Icon)

  // Input
  PaperAirplaneIcon,      // Senden

  // Action Bubbles
  BookmarkIcon,           // Speichern

} from '@heroicons/react/24/outline';
```

---

## Styling-Zusammenfassung

| Element | Styling |
|---------|---------|
| Modal | `fixed inset-0 bg-white z-50` |
| Header | `h-14 border-b border-zinc-200 px-4` |
| Chat Area | `flex-1 overflow-y-auto p-6` |
| AI Message | `max-w-3xl` (zentriert, Platz lassen) |
| Result Box | `bg-zinc-50 border border-zinc-200 rounded-lg p-4 mt-3` |
| User Message | `bg-zinc-100 rounded-2xl px-4 py-2 ml-auto max-w-md` |
| Input Container | `border-t border-zinc-200 p-4` |
| Input Box | `bg-white border border-zinc-300 rounded-xl shadow-sm` |
| Action Bubbles | `flex justify-center gap-3 mt-3` |
| Bubble | `bg-white border border-zinc-200 rounded-full px-4 py-2 text-sm` |
| Sidebar | `w-[500px] border-l border-zinc-200 bg-white` |

---

## Tech-Stack

```
Frontend:
├── React + TypeScript
├── react-markdown              # Markdown-Rendering
├── Tailwind CSS               # Styling
├── Headless UI                # Dialog/Transitions
└── Heroicons                  # Icons

Backend:
├── Genkit Flows               # AI-Chat-Logik
├── Next.js API Routes         # /api/ai-chat/marken-dna
└── Firestore                  # Persistenz
```

---

## Offene Punkte

- [ ] Animation für Sidebar (slide-in/out)
- [ ] Typing-Indicator während AI generiert
- [ ] Auto-Scroll zu neuen Messages
- [ ] Keyboard-Shortcuts (Enter = Send, Esc = Close)
- [ ] Mobile-Responsive Version

---

## Nächste Schritte

1. **ChatHeader** + **ChatInput** + **ActionBubbles** bauen
2. **AIMessage** mit **ResultBox** implementieren
3. **DocumentSidebar** als Slide-in
4. Integration mit bestehendem `useGenkitChat` Hook
5. Styling & Polish
