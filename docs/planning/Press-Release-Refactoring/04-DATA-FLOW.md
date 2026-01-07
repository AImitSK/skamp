# Datenfluss: Standard vs. Experte

## Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │         STRATEGIE-TAB           │
                    │    (Projekt → Strategie)        │
                    └─────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  1. DNA-SYNTHESE │     │  2. KERNBOTSCHAFT   │     │  3. PM-VORLAGE  │
│  (Marken-DNA)    │     │  (Project-Wizard)   │     │  (NEU!)         │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
         │                         │                         │
         │                         ▼                         │
         │              ┌─────────────────────┐              │
         │              │   FAKTEN-MATRIX     │              │
         │              │   (Sidebar-Output)  │              │
         │              └─────────────────────┘              │
         │                         │                         │
         └────────────┬────────────┘                         │
                      ▼                                      │
           ┌─────────────────────┐                          │
           │   EXPERTEN-MODUS    │                          │
           │   (automatisch)     │                          │
           └─────────────────────┘                          │
                      │                                      │
                      ▼                                      │
           ┌─────────────────────┐                          │
           │  PM-VORLAGE wird    │◄─────────────────────────┘
           │  generiert          │
           └─────────────────────┘
                      │
                      │  ⚠️ WARNUNG: Überschreibt
                      │     bestehende PM-Texte!
                      ▼
           ┌─────────────────────┐
           │   PRESSEMELDUNG     │
           │   (Editor)          │
           └─────────────────────┘
```

---

## Standard-Modus (ohne Strategie)

### Trigger
User hat:
- ❌ Keine DNA-Synthese
- ❌ Keine Fakten-Matrix

### Datenfluss

```
User-Eingabe im Editor
        │
        ├── Thema/Prompt (manuell)
        ├── Tonalität (Dropdown)
        ├── Branche (Dropdown)
        └── Zielgruppe (Dropdown)
        │
        ▼
┌─────────────────────┐
│  STANDARD LIBRARY   │
│  ──────────────────│
│  • Tone: formal     │
│  • Industry: tech   │
│  • Audience: b2b    │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  CORE ENGINE        │
│  + BASE RULES       │
│  + STANDARD LIBRARY │
│  ──────────────────│
│  ~600 Zeilen Prompt │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Gemini 2.5 Flash   │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Generierte PM      │
│  (generisch)        │
└─────────────────────┘
```

### Limitierungen
- Keine kundenspezifische Tonalität
- Keine gesicherten Fakten
- Zitatgeber muss manuell eingegeben werden
- Firmenstammdaten können halluziniert werden

---

## Experten-Modus (mit Strategie)

### Trigger
User hat:
- ✅ DNA-Synthese vorhanden
- ✅ Fakten-Matrix vorhanden (aus Project-Wizard)

### Datenfluss

```
┌─────────────────────────────────────────────────────────────────┐
│                     STRATEGIE-TAB                                │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────────┐
│ DNA-SYNTHESE  │    │ FAKTEN-MATRIX │    │ FIRMENSTAMMDATEN  │
│ ────────────  │    │ ──────────────│    │ ─────────────────│
│ • Tonalität   │    │ • Was & Wer   │    │ • Offizieller Name│
│ • Blacklist   │    │ • Wann & Wo   │    │ • Adresse         │
│ • Kernbotsch. │    │ • Delta       │    │ • Website         │
│ • Ansprechp.  │    │ • Beweise     │    │ • Kontakt         │
│ • SWOT-Essenz │    │ • Zitatgeber  │    │ • Social Media    │
└───────────────┘    └───────────────┘    └───────────────────┘
        │                     │                     │
        └──────────┬──────────┴─────────────────────┘
                   ▼
        ┌─────────────────────┐
        │   EXPERT BUILDER    │
        │   ─────────────────│
        │   Extrahiert nur:   │
        │   • Aktive ZG-Msg   │
        │   • Ton-Override    │
        │   • Blacklist       │
        │   • Fester Zitatgeb.│
        │   • Stammdaten      │
        └─────────────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │  CORE ENGINE        │
        │  + BASE RULES       │
        │  + EXPERT PROMPT    │
        │  ──────────────────│
        │  ~400 Zeilen Prompt │
        └─────────────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │  Gemini 2.5 Flash   │
        └─────────────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │  Generierte PM      │
        │  (maßgeschneidert)  │
        └─────────────────────┘
```

### Vorteile
- ✅ Kundenspezifische Tonalität aus DNA
- ✅ Gesicherte Fakten aus Matrix
- ✅ Fester Zitatgeber (kein Halluzinieren)
- ✅ Exakte Firmenstammdaten
- ✅ Blacklist als Hard Constraint
- ✅ Kürzerer, fokussierter Prompt

---

## Vergleich der Datenquellen

| Datenfeld | Standard-Modus | Experten-Modus |
|-----------|----------------|----------------|
| **Tonalität** | Dropdown (5 Optionen) | DNA-Tonalitäts-Override |
| **Branche** | Dropdown (7 Optionen) | DNA-Unternehmensprofil |
| **Zielgruppe** | Dropdown (3 Optionen) | DNA-Zielgruppen-Matrix + Routing |
| **Kernbotschaft** | Manuell eingeben | Fakten-Matrix |
| **Zitatgeber** | KI wählt / manuell | Fakten-Matrix (fest) |
| **Firmenname** | Manuell / halluziniert | Firmenstammdaten (exakt) |
| **Adresse** | Manuell / halluziniert | Firmenstammdaten (exakt) |
| **Website** | Manuell / halluziniert | Firmenstammdaten (exakt) |
| **Blacklist** | ❌ Nicht vorhanden | ✅ DNA-Blacklist |
| **Pflicht-Begriffe** | ❌ Nicht vorhanden | ✅ DNA-Pflicht-Begriffe |

---

## Speicherung der Fakten-Matrix

### Firestore-Struktur

```
projects/{projectId}/
├── strategy/
│   ├── dnaSynthese        # DNA-Synthese Dokument
│   ├── kernbotschaft      # Project-Wizard Output
│   │   ├── content        # Markdown/HTML
│   │   ├── plainText      # Plain-Text
│   │   └── faktenMatrix   # Strukturierte Daten (NEU!)
│   │       ├── wasUndWer
│   │       ├── wannUndWo
│   │       ├── newsWert
│   │       ├── delta
│   │       ├── beweisDaten
│   │       ├── nutzenFokus
│   │       ├── zitatgeber
│   │       │   ├── name
│   │       │   ├── position
│   │       │   └── kernAussage
│   │       └── belegStatus
│   └── pmVorlage          # Generierte PM-Vorlage (NEU!)
│       ├── headline
│       ├── leadParagraph
│       ├── bodyParagraphs[]
│       ├── quote
│       ├── cta
│       ├── hashtags[]
│       ├── htmlContent
│       └── generatedAt
```

### Synchronisation zur Pressemeldung

```typescript
// Wenn User "PM-Vorlage generieren" klickt:
async function generateAndApplyTemplate(projectId: string) {
  // 1. Lade alle benötigten Daten
  const dnaSynthese = await loadDNASynthese(projectId);
  const faktenMatrix = await loadFaktenMatrix(projectId);

  // 2. Prüfe ob Experten-Modus möglich
  if (!dnaSynthese || !faktenMatrix) {
    throw new Error('DNA-Synthese und Kernbotschaft müssen zuerst erstellt werden');
  }

  // 3. Generiere PM mit Experten-Modus
  const pmVorlage = await generatePressReleaseExpert({
    dnaSynthese,
    faktenMatrix
  });

  // 4. Speichere Vorlage
  await savePMVorlage(projectId, pmVorlage);

  // 5. Übertrage in alle Pressemeldungen des Projekts
  // ⚠️ Mit Warnung: "Dies überschreibt bestehende Texte!"
  await applyTemplateToAllCampaigns(projectId, pmVorlage);
}
```
