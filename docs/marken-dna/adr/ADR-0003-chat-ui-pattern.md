# ADR-0003: Chat-UI Pattern für Marken-DNA Erstellung

**Status:** Accepted
**Datum:** 2025-12-21
**Autor:** CeleroPress Development Team

---

## Kontext

Die Marken-DNA Dokumente werden durch einen interaktiven KI-Chat erstellt. Für die UI musste entschieden werden, wie dieser Chat am besten präsentiert wird.

### Anforderungen

1. **Fokussiertes Arbeiten:** Chat-Erstellung ist kognitiv anspruchsvoll
2. **Kontext-Erhalt:** User muss sowohl Chat als auch Dokument sehen können
3. **Mobile-Optimierung:** Sollte auch auf Tablets nutzbar sein
4. **Design System Compliance:** Muss CeleroPress Design System folgen
5. **Ähnlich zu bekannten Tools:** ChatGPT-ähnliche UX für Vertrautheit

---

## Entscheidung

**Wir verwenden ein Fullscreen Modal mit collapsible Document Preview.**

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [DocumentTextIcon] Briefing-Check für IBD   [XMarkIcon]   │ Header
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ CeleroPress                  [📋][🔄]                 │ │ AI Message
│  │ Willkommen! ...                                       │ │
│  │                                                       │ │
│  │ ┌─────────────────────────────────────────────────┐  │ │ Document Preview
│  │ │ [DocumentTextIcon] Dokument  [ChevronUpIcon]    │  │ │ (collapsible)
│  │ ├─────────────────────────────────────────────────┤  │ │
│  │ │ ## Unternehmen                                  │  │ │
│  │ │ - Branche: Maschinenbau                         │  │ │
│  │ └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                              Du      │ │ User Message
│  │ Wir sind Maschinenbauer aus Stuttgart.              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Suggestion] [Suggestion] [Suggestion]                    │ Prompts
│                                                             │
│  ════════════════════════════════════════════════════════  │ Progress
│  Fortschritt: ████████░░░░ 40% · 3 von 8 Bereichen         │
│  ════════════════════════════════════════════════════════  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Nachricht eingeben...]                 [➤]               │ Input
│                                                             │
│  [📄 Dokument]                    [✓ Speichern & Schließen]│ Footer
└─────────────────────────────────────────────────────────────┘
```

### Begründung

#### 1. Fullscreen = Fokus

**Problem:** Split-View (Chat links, Dokument rechts) fragmentiert Aufmerksamkeit

**Lösung:** Fullscreen Modal
- User konzentriert sich auf **eine Aufgabe**: Chat
- Dokument ist nur **ein Klick entfernt** (Collapsible Preview)
- Keine Ablenkung durch andere UI-Elemente

**Referenz:** ChatGPT, Claude, Google AI Studio nutzen alle Fullscreen

#### 2. Collapsible Document Preview

**Problem:** Dokument muss sichtbar sein für Kontext

**Lösung:** Eingebettet in AI-Message, aufklappbar
```
┌─────────────────────────────────────────────────┐
│ [DocumentTextIcon] Dokument  [ChevronDownIcon] │ ← Collapsed (Standard)
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ [DocumentTextIcon] Dokument  [ChevronUpIcon]   │ ← Expanded
├─────────────────────────────────────────────────┤
│ ## Unternehmen                                  │
│ - Branche: Maschinenbau                         │
│ - Standort: Stuttgart                           │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

**Vorteile:**
- Dokument ist **im Kontext** der AI-Antwort
- Kein Extra-Modal notwendig
- Mobile-freundlich (aufklappen bei Bedarf)

#### 3. Design System Compliance

Alle Komponenten folgen `docs/design-system/DESIGN_SYSTEM.md`:

```typescript
// ✅ Heroicons statt Emojis
import { DocumentTextIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

// ✅ Design System Farben
className="bg-primary text-white"          // Primary Button
className="border-zinc-200"                // Borders
className="bg-zinc-50"                     // Subtle Backgrounds

// ✅ Input-Höhe
className="h-10"                           // Alle interaktiven Elemente

// ✅ Keine Schatten (außer Dropdowns)
className="border border-zinc-200"        // Statt shadow-md
```

#### 4. ChatGPT-ähnliche UX

**User Erwartung:** Chat-Tools funktionieren wie ChatGPT

**Implementierung:**
- Markdown-Rendering für AI-Antworten
- Code-Highlighting für Beispiele
- Copy-Button für Messages
- Regenerate-Button
- Suggested Prompts als Pills

**Referenz:** `docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md`

---

## Konsequenzen

### Positiv ✅

1. **Fokussiertes Arbeiten**
   - Keine Ablenkung durch Split-Views
   - Fullscreen = volle Konzentration
   - Modal schließt sich → zurück zur Übersicht

2. **Mobile-Optimierung**
   - Fullscreen Modal funktioniert auf Tablets
   - Collapsible Document spart Platz
   - Touch-freundlich (große Buttons)

3. **Kontext-Erhalt**
   - Dokument ist immer **einen Klick entfernt**
   - AI-Message zeigt Document Preview inline
   - Footer-Button für Vollansicht

4. **Wiederverwendbarkeit**
   ```typescript
   // Marken-DNA
   <AIChatModal documentType="briefing" />

   // Projekt-Strategie
   <AIChatModal documentType="kernbotschaft" />

   // Zukünftig: andere Chat-Use-Cases
   <AIChatModal documentType="..." />
   ```

### Negativ ⚠️

1. **Dokument-Ansicht nicht permanent sichtbar**
   - **Mitigation:** Collapsible Preview in AI-Message
   - **Mitigation:** Footer-Button "Dokument anzeigen"
   - **Bewertung:** ✅ Akzeptabel (Fokus wichtiger)

2. **Fullscreen Modal blockiert andere Aktionen**
   - **Mitigation:** "Speichern & Schließen" Button prominent
   - **Mitigation:** Auto-Save im Hintergrund
   - **Bewertung:** ✅ Akzeptabel (Gewünscht für Fokus)

3. **Mehr Komponenten als Split-View**
   - Fullscreen Modal
   - Message List
   - Collapsible Document
   - Chat Input
   - **Bewertung:** ✅ Akzeptabel (bessere UX rechtfertigt es)

---

## Alternativen

### Alternative 1: Split-View (Chat links, Dokument rechts)

```
┌─────────────────────┬─────────────────────┐
│  Chat               │  Dokument           │
│  ├─ AI Message      │  ├─ ## Unternehmen  │
│  ├─ User Message    │  ├─ - Branche: ...  │
│  └─ Input           │  └─ ...             │
└─────────────────────┴─────────────────────┘
```

**Vorteile:**
- Dokument permanent sichtbar
- Beide Bereiche gleichzeitig im Blick

**Nachteile:**
- ❌ Fragmentierte Aufmerksamkeit
- ❌ Komplexere Responsive-Implementierung
- ❌ Weniger Platz für Chat (50/50 Split)
- ❌ Nicht ChatGPT-ähnlich

**Bewertung:** ❌ Abgelehnt

### Alternative 2: Tabs (Chat Tab vs. Dokument Tab)

```
┌─────────────────────────────────────────┐
│  [Chat] [Dokument]                      │
│  ───────────────────────────────────    │
│  Chat-Inhalt ODER Dokument-Inhalt       │
└─────────────────────────────────────────┘
```

**Vorteile:**
- Klare Trennung
- Einfache Implementierung

**Nachteile:**
- ❌ Kein Kontext-Erhalt (Dokument versteckt während Chat)
- ❌ Ständiges Tab-Wechseln notwendig
- ❌ Schlechte UX für Chat

**Bewertung:** ❌ Abgelehnt

### Alternative 3: Inline-Editor (Kein Modal)

```
/dashboard/library/marken-dna/[companyId]/[documentType]

┌─────────────────────────────────────────┐
│  Briefing-Check für IBD Wickeltechnik   │
│  ─────────────────────────────────────  │
│  [Chat-Bereich]                         │
│  [Dokument-Bereich]                     │
└─────────────────────────────────────────┘
```

**Vorteile:**
- Permanenter Link (bookmarkable)
- Kein Modal

**Nachteile:**
- ❌ Lenkt ab (Sidebar, Navigation sichtbar)
- ❌ Komplexeres Routing
- ❌ Nicht ChatGPT-ähnlich

**Bewertung:** ❌ Abgelehnt

---

## Implementierung

### Komponenten-Struktur

```
src/components/ai-chat/
├── AIChatModal.tsx              # Fullscreen Modal Container
├── components/
│   ├── ChatHeader.tsx           # Titel, Progress, Close
│   ├── MessageList.tsx          # Scroll-Container
│   ├── AIMessage.tsx            # Markdown + Document Preview
│   ├── UserMessage.tsx          # Einfache Bubble
│   ├── DocumentPreview.tsx      # Collapsible Card
│   ├── SuggestedPrompts.tsx     # Klickbare Pills
│   ├── ProgressBar.tsx          # Fortschrittsanzeige
│   └── ChatInput.tsx            # Textarea + Send Button
└── hooks/
    └── useGenkitChat.ts         # Chat-Logik
```

### Design System Integration

```typescript
// AI Message - Design System konform
<div className="bg-white border border-zinc-200 rounded-lg">
  <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50">
    <span className="font-medium text-zinc-900">CeleroPress</span>
  </div>
  <div className="px-4 py-3 prose prose-sm prose-zinc">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
</div>

// User Message - Primary Color
<div className="bg-primary text-white rounded-lg px-4 py-2">
  {content}
</div>

// Suggested Prompts - Pills
<button className="px-3 py-1.5 bg-white border border-zinc-200 rounded-full
                   hover:bg-zinc-50 hover:border-zinc-300">
  {prompt}
</button>
```

---

## Mobile-Optimierung

### Responsive Breakpoints

```typescript
// Desktop (>= 1024px)
- Fullscreen Modal mit max-width
- 2-Spalten Layout für Messages (AI links, User rechts)
- Alle Features sichtbar

// Tablet (768px - 1023px)
- Fullscreen Modal
- 1-Spalte Layout
- Document Preview collapsed by default

// Mobile (< 768px)
- Native Fullscreen
- 1-Spalte Layout
- Simplified Header
- Document Preview nur via Button
```

---

## Accessibility

```typescript
// Keyboard Navigation
- Tab: Fokus durch Elemente
- Enter: Nachricht senden
- Esc: Modal schließen

// Screen Reader
<div role="log" aria-live="polite" aria-label="Chat messages">
  {messages.map(m => (
    <div role="article" aria-label={`${m.role} message`}>
      {m.content}
    </div>
  ))}
</div>

// Focus Management
- Modal öffnen → Fokus auf Input
- Modal schließen → Fokus zurück auf Trigger-Button
```

---

## Referenzen

- Design System: `docs/design-system/DESIGN_SYSTEM.md`
- Chat-UI Konzept: `docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md`
- Implementierung: `src/components/ai-chat/`
- Beispiel: ChatGPT (https://chat.openai.com)

---

**Entscheidung getroffen:** 2025-12-21
**Review:** Stefan Kühne
**Status:** ✅ Accepted
