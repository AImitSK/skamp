# Phase 2: Marken-DNA Bibliothek (UI)

## Ziel
Neuer Menüpunkt "Marken DNA" unter Bibliothek mit Kundenübersicht und Status-Anzeige.

---

## Aufgaben

### 2.1 Navigation erweitern

**Datei:** `src/components/layout/Sidebar.tsx` (oder entsprechend)

```typescript
// Unter "Bibliothek" hinzufügen:
{
  name: 'Marken DNA',
  href: '/dashboard/library/marken-dna',
  icon: SparklesIcon,  // oder DNA-Icon
}
```

---

### 2.2 Hauptseite erstellen

**Datei:** `src/app/dashboard/library/marken-dna/page.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Bibliothek > Marken DNA                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [🔍 Suche...]                        [Filter: Alle ▾]          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Kunde                          Status              Aktionen    │
│  ─────────────────────────────────────────────────────────────  │
│  IBD Wickeltechnik GmbH         ●●○○○○  33%        [⋮]         │
│  SK Online GmbH                 ●●●●●●  100% ✓     [⋮]         │
│  Coca Cola AG                   ○○○○○○  0%         [⋮]         │
│  Müller & Partner               ●●●●○○  67%        [⋮]         │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Zeige 1-4 von 4 Kunden                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Nur Kontakte mit `type: 'customer'` anzeigen
- Sortierbar nach Name, Status, letzte Aktualisierung
- Suchfunktion
- Filter: Alle / Vollständig / Unvollständig

---

### 2.3 Status-Kreise Komponente

**Datei:** `src/components/marken-dna/StatusCircles.tsx`

```typescript
interface StatusCirclesProps {
  documents: {
    briefing: boolean;
    swot: boolean;
    audience: boolean;
    positioning: boolean;
    goals: boolean;
    messages: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onCircleClick?: (type: MarkenDNADocumentType) => void;
}

// Rendering:
// ● = vorhanden (grün)
// ○ = fehlt (grau)
// Tooltip bei Hover zeigt Dokumentname
```

---

### 2.4 Dropdown-Menü Komponente

**Datei:** `src/components/marken-dna/CustomerActionsDropdown.tsx`

```
[⋮] Klick öffnet:
┌─────────────────────────────────────────────┐
│  IBD Wickeltechnik GmbH                     │
├─────────────────────────────────────────────┤
│  ● Briefing-Check        [Bearbeiten]       │
│  ● SWOT-Analyse          [Bearbeiten]       │
│  ○ Zielgruppen-Radar     [Erstellen]        │
│  ○ Positionierungs-D.    [Erstellen]        │
│  ○ Ziele-Setzer          [Erstellen]        │
│  ○ Botschaften-Bau.      [Erstellen]        │
├─────────────────────────────────────────────┤
│  🗑️ Alle Dokumente löschen                  │
└─────────────────────────────────────────────┘
```

**Logik:**
- Vorhanden (●): Zeigt [Ansehen] [Bearbeiten] [Löschen]
- Fehlend (○): Zeigt [Erstellen]
- "Alle löschen" mit Bestätigungsdialog

---

### 2.5 Dokument-Editor Modal

**Datei:** `src/components/marken-dna/MarkenDNAEditorModal.tsx`

Modal mit Split-View:
- Links: Chat mit KI
- Rechts: Live-Dokument-Vorschau

```
┌─────────────────────────────────────────────────────────────────┐
│  Briefing-Check für IBD Wickeltechnik GmbH              [✕]    │
├─────────────────────────────┬───────────────────────────────────┤
│  💬 KI-Assistent            │  📄 Dokument                      │
│                             │                                   │
│  KI: "Lass uns das          │  # Briefing-Check                 │
│  Unternehmensprofil         │                                   │
│  erarbeiten..."             │  ## Unternehmen                   │
│                             │  - Branche: IT-Dienstleistungen   │
│  User: "Wir sind ein        │  - Größe: 50 Mitarbeiter          │
│  IT-Dienstleister..."       │  - Standort: München              │
│                             │                                   │
│  KI: "Gut! Und wie          │  ## Wettbewerb                    │
│  viele Mitarbeiter?"        │  ...                              │
│                             │                                   │
│  [Eingabe...]               │                                   │
├─────────────────────────────┼───────────────────────────────────┤
│                             │  [✏️ Bearbeiten] [🤖 Umarbeiten]  │
├─────────────────────────────┴───────────────────────────────────┤
│  [Abbrechen]                          [💾 Speichern & Schließen]│
└─────────────────────────────────────────────────────────────────┘
```

---

## Komponenten-Struktur

```
src/app/dashboard/library/marken-dna/
├── page.tsx                          # Hauptseite
├── components/
│   ├── CustomerTable.tsx             # Tabelle mit Kunden
│   ├── StatusCircles.tsx             # ●●○○○○ Anzeige
│   └── CustomerActionsDropdown.tsx   # Dropdown-Menü
└── __tests__/

src/components/marken-dna/
├── MarkenDNAEditorModal.tsx          # Editor mit Chat
├── ChatInterface.tsx                 # Chat-Komponente (wiederverwendbar)
├── DocumentPreview.tsx               # Live-Vorschau
└── __tests__/
```

---

## State Management

```typescript
// Zustand für die Seite
interface MarkenDNAPageState {
  selectedCustomer: string | null;
  editingDocument: MarkenDNADocumentType | null;
  workshopActive: boolean;
  searchQuery: string;
  filter: 'all' | 'complete' | 'incomplete';
}
```

---

## Abhängigkeiten

- Phase 1 (Datenmodell & Services)
- Bestehende UI-Komponenten (Modal, Button, Table)
- Bestehender TipTap Editor (für Dokumentbearbeitung)

---

## Erledigungs-Kriterien

- [ ] Navigation erweitert
- [ ] Hauptseite mit Kundentabelle
- [ ] Status-Kreise funktional und klickbar
- [ ] Dropdown-Menü mit allen Aktionen
- [ ] Editor-Modal mit Split-View
- [ ] Löschen mit Bestätigung
- [ ] Suche und Filter funktionieren
- [ ] Responsive Design
- [ ] Tests geschrieben
