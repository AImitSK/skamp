# Pressemeldungs-Generierung Refactoring

## Status: PLANUNG

## Ziel
Modulare Prompt-Architektur mit klarer Trennung zwischen:
- **Standard-Modus**: Generische Bibliothek für User ohne Strategie-Vorarbeit
- **Experten-Modus**: DNA-gesteuerte Generierung mit Fakten-Matrix

## Änderungen im Überblick

### 1. UI-Änderungen
- [ ] Profi-Modus aus KI-Assistent in Pressemeldung **entfernen**
- [ ] Strategie-Tab erweitern um "Vorlage für Pressemeldung generieren"

### 2. Architektur-Änderungen
- [ ] `generate-press-release-structured.ts` → Core-Engine (nur Skelett)
- [ ] Neue Datei: `core-engine.ts` (Output-Format, Parsing-Anker)
- [ ] Neue Datei: `press-release-craftsmanship.ts` (universelle journalistische Standards) ← NEU
- [ ] Neue Datei: `standard-library.ts` (Branchen/Tonalitäten - nur Standard-Modus)
- [ ] Neue Datei: `expert-builder.ts` (DNA + Fakten-Matrix - nur Experten-Modus)
- [ ] Structured JSON statt Regex-Parsing für Fakten-Matrix ← WICHTIG

### 3. Datenfluss neu
```
┌─────────────────────────────────────────────────────────────────┐
│                      STRATEGIE-TAB                               │
├─────────────────────────────────────────────────────────────────┤
│  1. DNA-Synthese        → Marken-DNA komprimiert                │
│  2. Kernbotschaft       → Project-Wizard (Fakten-Matrix)        │
│  3. PM-Vorlage          → Generierte Pressemeldung (NEU!)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRESSEMELDUNG-TAB                             │
├─────────────────────────────────────────────────────────────────┤
│  Editor mit vorausgefüllter Vorlage                              │
│  KI-Assistent (nur noch Standard-Modus)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Planungsdateien

| Datei | Inhalt |
|-------|--------|
| `01-CURRENT-STATE.md` | Ist-Analyse der aktuellen Architektur |
| `02-TARGET-ARCHITECTURE.md` | Ziel-Architektur mit Modulen |
| `03-PROMPT-MODULES.md` | Detaillierte Prompt-Aufteilung |
| `04-DATA-FLOW.md` | Datenfluss Standard vs. Experte |
| `05-UI-CHANGES.md` | UI-Änderungen im Detail |
| `06-IMPLEMENTATION-STEPS.md` | Implementierungsreihenfolge |
| `07-MIGRATION.md` | Migration bestehender Daten |

## Entscheidungen (geklärt)

1. **Überschreiben-Warnung**: ✅ ENTSCHIEDEN
   - Modal mit expliziter Bestätigung
   - **Erweiterung:** Zweistufiger Flow mit "Entwurf-Status"
   - Erst bei Klick auf "In Editor übernehmen" wird überschrieben

2. **Fallback bei fehlender Fakten-Matrix**: ✅ ENTSCHIEDEN
   - Button deaktiviert + Tooltip
   - Tooltip: "⚠️ Bitte zuerst Kernbotschaft im Project-Wizard abschließen."

3. **Caching der Vorlage**: ✅ ENTSCHIEDEN
   - Speicherung in `projects/{id}/strategy/pmVorlage`
   - **Erweiterung:** `markenDNAHash` + `faktenMatrixHash` mitspeichern
   - UI zeigt: "⚠️ DNA wurde geändert. Vorlage neu generieren?"

4. **Versionierung alter Vorlagen**: ✅ ENTSCHIEDEN
   - Einfaches History-Array mit letzten 3 generierten Ständen
   - Rudimentäres "Undo" ohne komplexes Datenmodell

5. **Zielgruppen-Auswahl**: ✅ ENTSCHIEDEN
   - User kann ZG1/ZG2/ZG3 vor Generierung wählen
   - **Default:** ZG3 (Media) - primärer Zweck einer Pressemitteilung

## ⚠️ Kritische Anforderungen: Editor & SEO

### Editor-Kompatibilität (Parsing-Anker)
Diese Formate MÜSSEN beibehalten werden, da der TipTap-Editor sie erkennt:

| Element | Format | HTML-Output |
|---------|--------|-------------|
| Lead | `**Text in Sternen**` | `<p><strong>...</strong></p>` |
| Zitat | `"Text", sagt Name, Rolle bei Firma.` | `<blockquote><footer>...</footer>` |
| CTA | `[[CTA: Text]]` | `<span data-type="cta-text">` |
| Hashtags | `[[HASHTAGS: #Tag1 #Tag2]]` | `<span data-type="hashtag">` |

**Quelle:** `parseStructuredOutput()` in `generate-press-release-structured.ts`

### SEO Score-Optimierung (85-95% Ziel)
Diese Regeln MÜSSEN in den neuen Modulen enthalten sein:

| Kriterium | Gewichtung | Regel |
|-----------|------------|-------|
| Headline | 20% | 40-75 Zeichen, Keywords früh, aktive Verben |
| Keywords | 20% | Dichte 0.3-2.5%, in Headline + Lead |
| Struktur | 20% | Lead 80-200 Zeichen, 3-4 Body-Absätze |
| Relevanz | 15% | Branchenspezifisch, kontextuell |
| Konkretheit | 10% | Mind. 2 Zahlen, 1 Datum, Firmennamen |
| Engagement | 10% | Zitat + CTA mit Kontaktdaten |
| Social | 5% | Headline ≤280 Zeichen, 2-3 Hashtags |

### Checkliste: Nichts vergessen!

- [ ] `parseStructuredOutput()` Funktion bleibt erhalten
- [ ] HTML-Generierung mit `data-type` Attributen bleibt erhalten
- [ ] Alle 5 Tonalitäten (formal, casual, modern, technical, startup) übernehmen
- [ ] Alle 7 Branchen-Prompts übernehmen
- [ ] Alle 3 Zielgruppen-Prompts übernehmen
- [ ] SEO Score-Regeln in core-engine.ts integrieren
- [ ] Final Check vor Ausgabe integrieren

## Nächste Schritte

1. ✅ Planung erstellt (diese Dateien)
2. ⏳ Offene Fragen klären mit User
3. ⏳ Phase 1 starten: Typen & Schemas
4. ⏳ Phase 2-7 nach Plan

## Geschätzter Aufwand

| Phase | Aufwand |
|-------|---------|
| Phase 1: Typen & Schemas | Klein |
| Phase 2: Sidebar speichern | Mittel |
| Phase 3: Prompt-Module | Mittel |
| Phase 4: PM-Vorlage Flow | Mittel |
| Phase 5: UI Strategie-Tab | Mittel |
| Phase 6: Profi-Modus entfernen | Klein |
| Phase 7: Integration | Mittel |
| **Gesamt** | **~7 Arbeitspakete** |
