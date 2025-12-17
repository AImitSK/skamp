# Marken-DNA: Masterplan

## Vision

Die Marken-DNA revolutioniert den Strategie-Bereich von CeleroPress durch einen KI-gestützten, interaktiven Ansatz. Statt statischer Templates führt ein intelligenter Chat-Wizard durch die Erstellung strategischer Dokumente.

**Kernprinzip:** Trennung von langfristiger Strategie (Marken-DNA auf Kundenebene) und kurzfristiger Operative (Projekt-Kernbotschaft auf Projektebene).

---

## Zwei-Ebenen-Architektur

### Ebene 1: Marken-DNA (Kundenebene)

| Aspekt | Beschreibung |
|--------|--------------|
| **Charakter** | Langfristig, statisch (jährliche Überprüfung) |
| **Speicherort** | Bibliothek → Marken DNA → [Kunde] |
| **Inhalt** | 6 Strategie-Dokumente |
| **Zweck** | "Gedächtnis" der KI - Leitplanken für alle Kommunikation |

**Die 6 Dokumente:**
1. Briefing-Check (Faktenbasis)
2. SWOT-Analyse (Bewertung)
3. Zielgruppen-Radar (Adressaten)
4. Positionierungs-Designer (USP)
5. Ziele-Setzer (Messlatte)
6. Botschaften-Baukasten (Dachbotschaften)

### Ebene 2: Projekt-Kernbotschaft (Projektebene)

| Aspekt | Beschreibung |
|--------|--------------|
| **Charakter** | Kurzfristig, dynamisch (pro Projekt neu) |
| **Speicherort** | Projekt → Strategie-Tab |
| **Inhalt** | Anlass, Ziel, Teilbotschaften, Material |
| **Zweck** | Konkrete Ausrichtung für dieses eine Projekt |

---

## Systemarchitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         BIBLIOTHEK                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Kunden     │  │  Boilerplates │  │  Marken DNA  │ ← NEU    │
│  │  (bleibt)    │  │   (bleibt)    │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MARKEN DNA                                   │
├─────────────────────────────────────────────────────────────────┤
│  Kunde                          Status              Aktionen    │
│  ───────────────────────────────────────────────────────────    │
│  IBD Wickeltechnik GmbH         ●●○○○○  33%         [⋮]        │
│  SK Online GmbH                 ●●●●●●  100% ✓      [⋮]        │
│  Coca Cola AG                   ○○○○○○  0%          [⋮]        │
│                                                                 │
│  [⋮] Dropdown:                                                  │
│  ├── Briefing         ● [Bearbeiten] / ○ [Erstellen]           │
│  ├── SWOT             ● [Bearbeiten] / ○ [Erstellen]           │
│  ├── Zielgruppen      ○ [Erstellen]                            │
│  ├── Positionierung   ○ [Erstellen]                            │
│  ├── Ziele            ○ [Erstellen]                            │
│  ├── Dachbotschaften  ○ [Erstellen]                            │
│  ├── ─────────────────                                         │
│  ├── 🚀 Komplett-Workshop                                      │
│  └── 🗑️ Alle löschen                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Strategie-Tab (Projekt) - Neues Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Projekt: Produktlaunch XY                                      │
│  Kunde: IBD Wickeltechnik GmbH                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Marken DNA verwenden: [====○]                                  │
│  └─ Nur aktivierbar wenn Marken DNA 100% vollständig            │
│  └─ Sonst: "Vervollständigen Sie die Marken DNA"                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  💬 PROJEKT-KERNBOTSCHAFT                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Chat-Bereich (KI-Wizard)                               │   │
│  │  • KI fragt nach Anlass, Ziel, Teilbotschaft            │   │
│  │  • User antwortet oder gibt Copy/Paste                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [📄 Strategie erzeugen]                                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📄 ERZEUGTE STRATEGIE (wenn vorhanden)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Dokument-Ansicht / Editor]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  [✏️ Bearbeiten]  [🤖 Mit KI besprechen/umarbeiten]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Änderungen zum alten Strategie-Tab:**
- ❌ Keine Vorlagen mehr
- ❌ Kein Datei-Upload für Strategie
- ✅ Chat-basierte Erstellung
- ✅ Marken DNA Toggle

---

## KI-Assistenten Integration

### Modi

| Modus | Beschreibung | Was wird übergeben |
|-------|--------------|-------------------|
| **Standard** | Wie bisher | Checkboxen + Templates |
| **Experte** | Mit Strategie | Projekt-Strategie-Dokument |

### Marken DNA Übergabe

```
WENN "Marken DNA verwenden" = AKTIV:
  → Marken DNA wird IMMER an KI übergeben (beide Modi)
  → KI hat Anleitung wie sie damit umgehen soll
```

### Prompt-Struktur für KI

```
"Du bist ein PR-Profi.

Schritt 1 (Kontext):
Lade die Marken-DNA:
- Positionierung: [aus Dokument]
- Tonalität: [aus Dokument]
- Zielgruppen: [aus Dokument]
- Dachbotschaften: [aus Dokument]

Schritt 2 (Aufgabe):
Nutze das Projekt-Briefing:
- Anlass: [aus Projekt-Strategie]
- Ziel: [aus Projekt-Strategie]
- Teilbotschaft: [aus Projekt-Strategie]

Schritt 3 (Execution):
Schreibe die Pressemeldung, ABER nutze dabei
den Sprachstil und die Werte aus der Marken-DNA."
```

---

## Datenmodell

### Marken-DNA Collection

```typescript
// Firestore: customers/{customerId}/markenDNA/{documentType}
interface MarkenDNADocument {
  id: string;
  customerId: string;
  customerName: string;
  organizationId: string;

  // Dokument-Typ
  type: 'briefing' | 'swot' | 'audience' | 'positioning' | 'goals' | 'messages';

  // Inhalt
  content: string;           // HTML-Inhalt
  plainText?: string;        // Plain-Text für KI
  structuredData?: object;   // Strukturierte Daten (optional)

  // Status
  status: 'draft' | 'completed';
  completeness: number;      // 0-100%

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

### Projekt-Strategie

```typescript
// Firestore: projects/{projectId}/strategyDocument
interface ProjectStrategy {
  id: string;
  projectId: string;
  customerId: string;
  organizationId: string;

  // Marken DNA Verknüpfung
  useMarkenDNA: boolean;
  markenDNAComplete: boolean;

  // Inhalt
  occasion: string;          // Anlass
  goal: string;              // Ziel
  keyMessage: string;        // Teilbotschaft
  content: string;           // Generiertes Dokument

  // Chat-Verlauf
  chatHistory?: ChatMessage[];

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Abgrenzung zu bestehenden Features

| Feature | Alte Funktion | Neue Funktion |
|---------|---------------|---------------|
| Strategie-Vorlagen | 6 Templates laden & bearbeiten | ❌ Entfällt komplett |
| Boilerplates | Auch für Strategie-Dokumente | Nur noch für andere Zwecke (company, contact, legal, product) |
| Marken DNA | - | ✅ NEU: 6 Dokumente pro Kunde via KI-Chat |
| Projekt-Strategie | Manuelle Dokumente | ✅ NEU: Chat-basiert erstellen |
| KI-Assistenten | Standard-Modus | + Experten-Modus mit Strategie |

---

## Implementierungsphasen

| Phase | Beschreibung | Abhängigkeiten |
|-------|--------------|----------------|
| **1** | Datenmodell & Services | - |
| **2** | Marken-DNA Bibliothek (UI) | Phase 1 |
| **3** | KI-Chat-Wizard (Genkit Flows) | Phase 1 |
| **4** | Strategie-Tab Umbau | Phase 2, 3 |
| **5** | KI-Assistenten Integration | Phase 4 |

---

## Erfolgskriterien

1. **Konsistenz**: Alle Kommunikation eines Kunden folgt der gleichen Strategie
2. **Effizienz**: Neue Projekte starten schneller (Strategie ist schon da)
3. **Qualität**: KI-generierte Texte sind markentreu und strategisch fundiert
4. **Benutzerfreundlichkeit**: Chat-basierte Erstellung ist intuitiver als Template-Bearbeitung

---

## Dateien in diesem Ordner

| Datei | Inhalt |
|-------|--------|
| `00-MASTERPLAN.md` | Diese Datei - Gesamtübersicht |
| `01-DOKUMENTE.md` | Details zu den 6 Strategie-Dokumenten |
| `02-PHASE-1-DATENMODELL.md` | Implementierungsplan Phase 1 |
| `03-PHASE-2-BIBLIOTHEK.md` | Implementierungsplan Phase 2 |
| `04-PHASE-3-KI-CHAT.md` | Implementierungsplan Phase 3 |
| `05-PHASE-4-STRATEGIE-TAB.md` | Implementierungsplan Phase 4 |
| `06-PHASE-5-KI-ASSISTENTEN.md` | Implementierungsplan Phase 5 |
