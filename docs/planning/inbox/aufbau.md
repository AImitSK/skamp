# Inbox Layout-Struktur

## Seite: `/dashboard/communication/inbox`

### Root: InboxLayout (layout.tsx)
- Versteckt die Dashboard-Sidebar
- Entfernt Padding vom Main-Content
- Stellt volle Breite für Inbox bereit

### Hauptkomponenten-Hierarchie:

```
InboxPage (page.tsx)
├── [Toolbar / Funktionsbar]
│   ├── Toggle Buttons (Sidebar-Controls)
│   ├── Suchfeld
│   ├── "Neue E-Mail" Button
│   └── Refresh Button
│
├── [Main Content Area] (3-Spalten-Layout)
│   ├── [Spalte 1] TeamFolderSidebar (Ordner-Spalte)
│   │   └── komponente: TeamFolderSidebar
│   │
│   ├── [Spalte 2] EmailList (Email-Liste)
│   │   ├── Folder Header (Mailbox-Email mit Copy-Button)
│   │   ├── Error State (bei Fehler)
│   │   └── EmailList Komponente
│   │       └── zeigt: threads (gefiltert)
│   │
│   └── [Spalte 3] EmailViewer (Email-Nachricht)
│       ├── EmailViewer Komponente (wenn Thread ausgewählt)
│       │   └── zeigt: threadEmails
│       └── Empty State (wenn keine Auswahl)
│
└── [Modal] ComposeEmail
    └── komponente: ComposeEmail (bei showCompose=true)
```

## Geladene Komponenten:

1. **TeamFolderSidebar**
   - Datei: `src/components/inbox/TeamFolderSidebar.tsx`
   - Verwendet in: page.tsx Zeile 805-812
   - Ordner-Sidebar links
   - Kann ein/ausgeblendet werden

2. **EmailList**
   - Datei: `src/components/inbox/EmailList.tsx`
   - Verwendet in: page.tsx Zeile 866-872
   - Thread-Liste in der Mitte
   - Kann ein/ausgeblendet werden
   - Props: threads, selectedThread, onThreadSelect, loading, onStar

3. **EmailViewer**
   - Datei: `src/components/inbox/EmailViewer.tsx`
   - Verwendet in: page.tsx Zeile 879-892
   - Email-Viewer rechts
   - Props: thread, emails, selectedEmail, onReply, onForward, onArchive, onDelete, onStar, onStatusChange, onPriorityChange, organizationId, showAI

4. **ComposeEmail**
   - Datei: `src/components/inbox/ComposeEmail.tsx`
   - Verwendet in: page.tsx Zeile 913-927
   - Modal für neue Emails / Antworten
   - Conditional: nur wenn showCompose=true

## EmailList Komponente - UI Aufbau:

### Visuelles Layout:

```
┌─────────────────────────────────────────────────────────┐
│  Stefan Kühne                     vor 3 Minuten        │
│  TEST 1.1: Solo-Empfänger A - Signatur, Bild          │
└─────────────────────────────────────────────────────────┘
```

### Komponenten-Struktur:

```
[Thread-Item]
└── Content (Zeile 114-135)
    ├── Header Row (Zeile 116-126)
    │   ├── Absender-Name (fett wenn ungelesen)
    │   └── Zeit (rechts, z.B. "vor 3 Minuten")
    │
    └── Betreff (Zeile 129-134)
        └── Subject-Text (fett wenn ungelesen)
```

### Feld-Details:

1. **Absender**: Name oder Email des ersten Participants
2. **Zeit**: Relative Zeitangabe (formatTime Funktion)
3. **Betreff**: Thread Subject, truncated

### Visuelle Zustände:

- **Ungelesen**: Weißer Hintergrund (bg-white), fetter Text
- **Gelesen**: Grauer Hintergrund (bg-gray-50), normaler Text
- **Selected**: Blauer Hintergrund (bg-blue-50)
- **Starred**: Gelber Hintergrund (bg-yellow-50)

## Datenfluss:

- **Threads**: Geladen via Firestore real-time listener (Zeile 196-238)
- **Messages**: Geladen via Firestore real-time listener (Zeile 247-282)
- **Filter**: Domain/Project basierend auf selectedFolderType + selectedTeamMemberId
