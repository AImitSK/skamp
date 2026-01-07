# Pressemeldungs-Refactoring: Workflow & Agenten

> **Dieses Dokument dient zur Wiederherstellung des Kontexts bei Compacting oder neuem Chat.**

## Übersicht

Wir refaktorieren die Pressemeldungs-Generierung von einer monolithischen (~900 Zeilen) zu einer modularen Architektur mit zwei Modi:

- **Standard-Modus**: Für User ohne DNA-Strategie (~600 Zeilen Prompt)
- **Experten-Modus**: Für User mit DNA + Fakten-Matrix (~400 Zeilen Prompt)

## Ziele

1. **Token-Reduktion**: Kleinere, fokussierte Prompts → besseres Instruction Following
2. **Fakten-Sicherheit**: Strukturierte Fakten-Matrix verhindert Halluzinationen
3. **Saubere Trennung**: Standard-Library wird im Experten-Modus "gemutet"
4. **UI-Klarheit**: Strategie-Tab für Fundament, Editor für Handwerk

## Architektur

```
src/lib/ai/prompts/press-release/
├── core-engine.ts              # Shared: Output-Format, Parsing-Anker, SEO-Regeln
├── press-release-craftsmanship.ts  # Shared: Universelle journalistische Standards
├── standard-library.ts         # NUR Standard: Tonalitäten, Branchen, Zielgruppen
├── expert-builder.ts           # NUR Experte: DNA + Fakten-Matrix Builder
└── index.ts                    # Re-Exports
```

## Die 7 Implementierungsphasen

| Phase | Beschreibung | Agent | Status |
|-------|--------------|-------|--------|
| 1 | Typen & Schemas (FaktenMatrix, PMVorlage) | `pm-type-schema-agent` | ⏳ |
| 2 | Project-Wizard Fakten-Matrix speichern | Manuell | ⏳ |
| 3 | Prompt-Module erstellen | `pm-prompt-module-writer` | ⏳ |
| 4 | PM-Vorlage Genkit Flow | Manuell | ⏳ |
| 5 | UI: Strategie-Tab erweitern | Manuell | ⏳ |
| 6 | UI: Profi-Modus entfernen | Manuell | ⏳ |
| 7 | Integration & Testing | `pm-integration-agent` | ⏳ |

## Spezialisierte Agenten

### 1. `pm-type-schema-agent`
- **Aufgabe**: TypeScript-Typen und Zod-Schemas erstellen
- **Phase**: 1
- **Output**: `src/types/fakten-matrix.ts`, `src/types/pm-vorlage.ts`, Zod-Schemas

### 2. `pm-prompt-module-writer`
- **Aufgabe**: Prompt-Module aus monolithischer Datei extrahieren
- **Phase**: 3
- **Output**: `core-engine.ts`, `press-release-craftsmanship.ts`, `standard-library.ts`, `expert-builder.ts`

### 3. `pm-parsing-validator`
- **Aufgabe**: Parsing-Logik und HTML-Output validieren
- **Phase**: 7
- **Prüft**: Lead (`**...**`), Zitat (`"...", sagt`), CTA (`[[CTA:]]`), Hashtags (`[[HASHTAGS:]]`)

### 4. `pm-seo-validator`
- **Aufgabe**: SEO-Score berechnen und validieren
- **Phase**: 7
- **Ziel**: 85-95% Score

### 5. `pm-integration-agent`
- **Aufgabe**: Orchestrierung und End-to-End-Tests
- **Phase**: Alle
- **Koordiniert**: Alle anderen Agenten

## Kritische Anforderungen

### Editor-Kompatibilität
Diese Parsing-Anker MÜSSEN beibehalten werden:

| Element | Format | HTML-Output |
|---------|--------|-------------|
| Lead | `**Text**` | `<p><strong>...</strong></p>` |
| Zitat | `"Text", sagt Name, Rolle bei Firma.` | `<blockquote><footer>` |
| CTA | `[[CTA: Text]]` | `<span data-type="cta-text">` |
| Hashtags | `[[HASHTAGS: #Tag1 #Tag2]]` | `<span data-type="hashtag">` |

### SEO-Score-Gewichtung
| Kriterium | Gewichtung |
|-----------|------------|
| Headline | 20% |
| Keywords | 20% |
| Struktur | 20% |
| Relevanz | 15% |
| Konkretheit | 10% |
| Engagement | 10% |
| Social | 5% |

## Entscheidungen (bereits getroffen)

1. **JSON statt Regex**: Wizard sendet Fakten-Matrix via Tool-Call, nicht via Markdown-Parsing
2. **speakerId Referenz**: Zitatgeber wird via ID aus DNA-Kontakten referenziert
3. **Zweistufiger Flow**: Generierung → Entwurf, erst bei "Übernehmen" wird Editor beschrieben
4. **Hash-basierte Änderungserkennung**: `markenDNAHash` + `faktenMatrixHash` zeigen veraltete Vorlagen an
5. **History-Array**: Letzte 3 Versionen für rudimentäres Undo
6. **ZG-Auswahl**: User kann ZG1/ZG2/ZG3 wählen, Default = ZG3 (Media)

## Wie starte ich eine Phase?

### Option A: Manuell
```
1. Lies die Phase-Dokumentation in `06-IMPLEMENTATION-STEPS.md`
2. Führe die Aufgaben aus
3. Validiere mit TypeScript-Check und Tests
```

### Option B: Mit Agent
```
Verwende den Task-Tool mit dem passenden Agent:

Phase 1: pm-type-schema-agent
Phase 3: pm-prompt-module-writer
Phase 7: pm-parsing-validator + pm-seo-validator

Der pm-integration-agent kann als Orchestrator verwendet werden.
```

## Wichtige Dateien

### Planung
- `docs/planning/Press-Release-Refactoring/00-OVERVIEW.md` - Übersicht & Checkliste
- `docs/planning/Press-Release-Refactoring/03-PROMPT-MODULES.md` - Detaillierte Modul-Spezifikation
- `docs/planning/Press-Release-Refactoring/06-IMPLEMENTATION-STEPS.md` - 7 Phasen

### Quell-Code
- `src/lib/ai/flows/generate-press-release-structured.ts` - Aktuelle monolithische Implementierung
- `src/lib/ai/prompts/ai-sequence.ts` - Context-Builder für AI-Sequenzen

### Agenten
- `.claude/agents/pm-*.md` - Alle 5 spezialisierten Agenten

## Quick-Start für neuen Chat

```markdown
Kontext laden:
1. Lies `docs/planning/Press-Release-Refactoring/WORKFLOW.md` (dieses Dokument)
2. Prüfe Status der Phasen in `06-IMPLEMENTATION-STEPS.md`
3. Verwende `pm-integration-agent` für Orchestrierung

Aktueller Stand:
- Planung: ✅ Abgeschlossen
- Agenten: ✅ Erstellt
- Phase 1-7: ⏳ Ausstehend
```

## Checkliste: Nichts vergessen

- [ ] `parseStructuredOutput()` Funktion bleibt erhalten
- [ ] HTML-Generierung mit `data-type` Attributen bleibt erhalten
- [ ] Alle 5 Tonalitäten (formal, casual, modern, technical, startup) übernehmen
- [ ] Alle 7 Branchen-Prompts übernehmen
- [ ] Alle 3 Zielgruppen-Prompts übernehmen
- [ ] SEO Score-Regeln in core-engine.ts integrieren
- [ ] Final Check vor Ausgabe integrieren
