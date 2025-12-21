# Marken-DNA: Masterplan

## Vision

Die Marken-DNA revolutioniert den Strategie-Bereich von CeleroPress durch einen KI-gestützten, interaktiven Ansatz. Statt statischer Templates führt ein intelligenter Chat-Wizard durch die Erstellung strategischer Dokumente.

**Kernprinzip:** Trennung von langfristiger Strategie (Marken-DNA auf Kundenebene) und kurzfristiger Operative (Projekt-Kernbotschaft auf Projektebene).

---

## Workflow-Agent

> **WICHTIG:** Für die Implementierung der Phasen den `marken-dna-impl` Agent verwenden!
>
> ```
> Starte den marken-dna-impl Agent für Phase X
> ```
>
> Der Agent:
> - Liest ALLE relevanten Dokumente (nicht nur diesen Masterplan!)
> - Erstellt Todo-Listen und zeigt sie dem User
> - Arbeitet schrittweise mit User-Zustimmung
> - Führt Qualitätsprüfungen durch (Linter, TypeScript, Tests)
> - Committet nach jedem abgeschlossenen Schritt
>
> Siehe `10-WORKFLOW-AGENT.md` für Details.

---

## Drei-Ebenen-Architektur

### Ebene 1: Marken-DNA (Kundenebene)

| Aspekt | Beschreibung |
|--------|--------------|
| **Charakter** | Langfristig, statisch (jährliche Überprüfung) |
| **Speicherort** | Firestore: `companies/{companyId}/markenDNA/{docType}` |
| **UI-Pfad** | Bibliothek → Marken DNA → [Kunde] |
| **Inhalt** | 6 Strategie-Dokumente |
| **Zweck** | "Gedächtnis" der KI - Leitplanken für alle Kommunikation |

> **Hinweis:** Kunden sind `Company`-Dokumente mit `type: 'customer'`. Es gibt keine separate `customers`-Collection.

**Die 6 Dokumente:**
1. Briefing-Check (Faktenbasis)
2. SWOT-Analyse (Bewertung)
3. Zielgruppen-Radar (Adressaten)
4. Positionierungs-Designer (USP)
5. Ziele-Setzer (Messlatte)
6. Botschaften-Baukasten (Dachbotschaften)

### Ebene 2: 🧪 DNA Synthese (Unternehmensebene)

| Aspekt | Beschreibung |
|--------|--------------|
| **Charakter** | Globales Brand-Manual für den Kunden, nicht projektspezifisch |
| **Speicherort** | `companies/{companyId}/markenDNA/synthesis` |
| **Inhalt** | Kompakte Kurzform (~500 Tokens statt ~5.000) |
| **Zweck** | Effizienter KI-Kontext für Textgenerierung |

**Warum DNA Synthese?**
- Token-Ersparnis: 6 Dokumente = ~5.000 Tokens → Synthese = ~500 Tokens
- KI-optimiert: Strukturiert für schnelle Verarbeitung
- Fokus auf Textgenerierung: Tonalität, Kernbotschaften, Do's & Don'ts

**Icon:** BeakerIcon (Erlenmeyerkolben) 🧪 - überall wo mit der Synthese gearbeitet wird

### Ebene 3: 💬 Kernbotschaft (Projektebene)

| Aspekt | Beschreibung |
|--------|--------------|
| **Charakter** | Kurzfristig, dynamisch (pro Projekt neu) |
| **Speicherort** | Projekt → Strategie-Tab |
| **Inhalt** | Anlass, Ziel, Teilbotschaften, Material |
| **Zweck** | Konkrete Ausrichtung für dieses eine Projekt |

### Ebene 4: 🧬 AI Sequenz → 📋 Text-Matrix

| Aspekt | Beschreibung |
|--------|--------------|
| **AI Sequenz** | KI-Prozess der DNA Synthese + Kernbotschaft kombiniert |
| **Text-Matrix** | Strategisches Roh-Skelett (High-Fidelity Draft) |
| **Human-in-the-Loop** | Nach menschlichem Feinschliff → fertige 📰 Pressemeldung |
| **Zweck** | Strategisch fundierte Textvorlage für Feinschliff |

**Der Prozess (Die CeleroPress Formel):**
```
🧪 DNA Synthese + 💬 Kernbotschaft → 🧬 AI Sequenz → 📋 Text-Matrix → 📰 Pressemeldung
```

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
│  🧪 DNA SYNTHESE                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Noch nicht erstellt                                    │   │
│  │  [🧪 DNA synthetisieren]                                │   │
│  │  └─ Nur aktivierbar wenn Marken-DNA 100% vollständig    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Nach Synthetisierung:                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🧪 DNA Synthese ✓                                 [⋮]  │   │
│  │  ──────────────────────────────────────────────────     │   │
│  │  **Positionierung:** Innovativer Technologieführer...   │   │
│  │  **Tonalität:** Seriös, nahbar, kompetent               │   │
│  │  **Kernbotschaften:** ...                               │   │
│  │  **Vermeiden:** ...                                     │   │
│  │  ──────────────────────────────────────────────────     │   │
│  │  [✏️ Bearbeiten]                                        │   │
│  │                                                         │   │
│  │  [⋮] → Neu synthetisieren | Löschen                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  💬 KERNBOTSCHAFT                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Chat-Bereich (KI-Wizard)                               │   │
│  │  • KI fragt nach Anlass, Ziel, Teilbotschaft            │   │
│  │  • User antwortet oder gibt Copy/Paste                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [🧬 AI Sequenz starten]                                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📋 TEXT-MATRIX (wenn vorhanden)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Dokument-Ansicht / Editor]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  [✏️ Bearbeiten]  [🧬 Mit AI Sequenz umarbeiten]                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Nach Feinschliff + Freigabe:                                   │
│  [📰 Als Pressemeldung finalisieren]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Die CeleroPress Formel:**
```
🧪 M-DNA Synthese + 💬 Kernbotschaft → 🧬 AI Sequenz → 📋 Text-Matrix → 📰 Pressemeldung
```

**Änderungen zum alten Strategie-Tab:**
- ❌ Keine Vorlagen mehr
- ❌ Kein Datei-Upload für Strategie
- ✅ Chat-basierte Erstellung (Kernbotschaft)
- ✅ 🧪 DNA Synthese (Token-optimierte Kurzform)
- ✅ 🧬 AI Sequenz (KI-Prozess)
- ✅ 📋 Text-Matrix (bearbeitbare Vorlage)

---

## KI-Assistenten Integration

### Modi

| Modus | Beschreibung | Was wird übergeben |
|-------|--------------|-------------------|
| **Standard** | Wie bisher | Checkboxen + Templates |
| **Experte** | Mit CeleroPress Formel | 🧪 DNA Synthese + 💬 Kernbotschaft |

### DNA Synthese Übergabe

```
WENN DNA Synthese vorhanden:
  → 🧪 DNA Synthese wird an KI übergeben (~500 Tokens)
  → NICHT die 6 Original-Dokumente (~5.000 Tokens)
  → 🧬 AI Sequenz kombiniert alles zur 📋 Text-Matrix
```

### Prompt-Struktur für AI Sequenz (Drei-Schichten-Architektur)

Die AI Sequenz nutzt eine **Drei-Schichten-Architektur** mit klarer Priorität:

EBENE 1: MARKEN-DNA (Höchste Priorität)
- Tonalität → ÜBERSCHREIBT Ebene 2 bei Konflikten!
- USP & Positionierung
- Kernbotschaften (Dachbotschaften)
- No-Go-Words (Blacklist)
- Quelle: DNA Synthese (~500 Tokens)

EBENE 2: SCORE-REGELN (Journalistisches Handwerk)
- Headline: 40-75 Zeichen, aktive Verben, Keywords
- Lead: 80-200 Zeichen, 5 W-Fragen
- Struktur: 3-4 Absätze, je 150-400 Zeichen
- Zitat, CTA, Hashtags
- Quelle: Shared Prompt Library (SCORE_PROMPTS)

EBENE 3: PROJEKT-KONTEXT (Aktuelle Fakten)
- Anlass, Ziel, Teilbotschaft
- Quelle: Kernbotschaft

**Kritische Regel:** Die Tonalität der DNA (Ebene 1) hat bei Konflikten **immer Vorrang** vor den Score-Regeln (Ebene 2).

> Siehe `06-PHASE-5-KI-ASSISTENTEN.md` für die vollständige Implementierung.

---

## Datenmodell

### Marken-DNA Collection

```typescript
// Firestore: companies/{companyId}/markenDNA/{documentType}
// Hinweis: Kunden sind Companies mit type: 'customer'
interface MarkenDNADocument {
  id: string;
  companyId: string;         // Referenz auf Company (type: 'customer')
  companyName: string;
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

### 🧪 DNA Synthese (NEU)

```typescript
// Firestore: companies/{companyId}/markenDNA/synthesis
interface DNASynthese {
  id: string;
  companyId: string;         // Referenz auf Company (type: 'customer')
  organizationId: string;

  // Inhalt (KI-optimierte Kurzform)
  content: string;           // HTML für Anzeige
  plainText: string;         // Plain-Text für KI-Übergabe (~500 Tokens)

  // Tracking & Aktualitäts-Check
  synthesizedAt: Timestamp;
  synthesizedFrom: string[]; // IDs der 6 Marken-DNA Dokumente
  markenDNAVersion: string;  // Hash um Änderungen zu erkennen (siehe unten)
  manuallyEdited: boolean;   // Wurde manuell angepasst?

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

**markenDNAVersion Hash-Tracking:**
```
Bei Synthese-Erstellung:
  → Hash über alle 6 Marken-DNA Dokumente berechnen
  → Hash speichern in markenDNAVersion

Später im Projekt:
  → Aktuellen Hash der 6 Dokumente berechnen
  → Vergleich mit gespeichertem markenDNAVersion
  → Bei Mismatch: "⚠️ Marken-DNA wurde geändert. Neu synthetisieren?"
```

### 💬 Kernbotschaft

```typescript
// Firestore: projects/{projectId}/kernbotschaft
interface Kernbotschaft {
  id: string;
  projectId: string;
  companyId: string;         // Referenz auf Company (type: 'customer')
  organizationId: string;

  // Inhalt
  occasion: string;          // Anlass
  goal: string;              // Ziel
  keyMessage: string;        // Teilbotschaft
  content: string;           // Generiertes Dokument
  plainText: string;         // Für KI

  // Status
  status: 'draft' | 'completed';

  // Chat-Verlauf
  chatHistory?: ChatMessage[];

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
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

### MVP (Release 1)

| Phase | Beschreibung | Abhängigkeiten | Status |
|-------|--------------|----------------|--------|
| **1** | Datenmodell & Services | - | ✅ Abgeschlossen (2025-12-20) |
| **2** | Marken-DNA Bibliothek (UI) | Phase 1 | ✅ Abgeschlossen (2025-12-21) |
| **3** | KI-Chat (Genkit Flows + Streaming) | Phase 1 | ✅ Abgeschlossen (2025-12-21) |

### Release 2

| Phase | Beschreibung | Abhängigkeiten | Status |
|-------|--------------|----------------|--------|
| **4** | Strategie-Tab Umbau | Phase 2, 3 | ✅ Abgeschlossen (2025-12-21) |

### Release 3

| Phase | Beschreibung | Abhängigkeiten | Status |
|-------|--------------|----------------|--------|
| **5** | KI-Assistenten Integration | Phase 4 | ⏳ Offen |

### Abschluss

| Phase | Beschreibung | Abhängigkeiten | Status |
|-------|--------------|----------------|--------|
| **6** | Dokumentation | Phasen 1-5 | ⏳ Offen |

> **Hinweis:** Diese Aufteilung ermöglicht schnelleres Feedback und reduziert Risiko.
> Phase 6 (Dokumentation) wird parallel zu den anderen Phasen vorbereitet und am Ende finalisiert.

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
| `02-PHASE-1-DATENMODELL.md` | Implementierungsplan Phase 1: Datenmodell & Services |
| `03-PHASE-2-BIBLIOTHEK.md` | Implementierungsplan Phase 2: Marken-DNA Bibliothek (UI) |
| `04-PHASE-3-KI-CHAT.md` | Implementierungsplan Phase 3: KI-Chat mit Genkit Flows |
| `05-PHASE-4-STRATEGIE-TAB.md` | Implementierungsplan Phase 4: Strategie-Tab Umbau |
| `06-PHASE-5-KI-ASSISTENTEN.md` | Implementierungsplan Phase 5: KI-Assistenten Integration |
| `07-ENTWICKLUNGSRICHTLINIEN.md` | Projektweite Patterns (Design System, Toasts, i18n, Tests) |
| `08-CHAT-UI-KONZEPT.md` | Chat-UI Konzept mit Genkit |
| `09-DOKUMENTATION.md` | Implementierungsplan Phase 6: Dokumentation nach Abschluss |
| `10-WORKFLOW-AGENT.md` | Workflow-Agent für schrittweise Implementierung |
