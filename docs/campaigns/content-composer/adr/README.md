# Architecture Decision Records (ADRs)

> **Modul**: Campaign Content Composer ADRs
> **Version**: 2.0.0
> **Letzte Aktualisierung**: 04. November 2025

## Überblick

Diese ADRs dokumentieren die architektonischen Entscheidungen während des CampaignContentComposer-Refactorings.

## ADR-Liste

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| [001](./001-modularisierung.md) | Modularisierung durch Custom Hooks & Shared Components | ✅ Akzeptiert | 2025-11-04 |
| [002](./002-performance-optimierung.md) | Performance-Optimierung mit useCallback/useMemo/React.memo | ✅ Akzeptiert | 2025-11-04 |
| [003](./003-testing-strategie.md) | Testing-Strategie: 97 Tests mit 100% Coverage | ✅ Akzeptiert | 2025-11-04 |

## ADR-Format

Jedes ADR folgt diesem Standard-Format:

```markdown
# ADR-XXX: [Titel]

## Status
[Akzeptiert | Abgelehnt | Deprecated | Superseded]

## Kontext
[Beschreibung des Problems oder der Situation]

## Entscheidung
[Was wurde entschieden?]

## Konsequenzen
### Positive
- [Pro 1]
- [Pro 2]

### Negative
- [Con 1]
- [Con 2]

## Alternativen
[Betrachtete aber verworfene Optionen]

## Lessons Learned
[Was haben wir gelernt?]
```

## Schnellreferenz

### ADR-001: Modularisierung

**Problem:** 470-Zeilen-Komponente schwer wartbar

**Lösung:**
- Custom Hooks extrahiert (usePDFGeneration, useBoilerplateProcessing)
- Shared Component extrahiert (FolderSelectorDialog)

**Ergebnis:** 45.5% Code-Reduktion, bessere Wartbarkeit

---

### ADR-002: Performance-Optimierung

**Problem:** Zu viele Re-Renders bei Section-Updates

**Lösung:**
- useCallback für Handler
- useMemo für teure Berechnungen
- React.memo für Child-Components

**Ergebnis:** 60-70% weniger Re-Renders

---

### ADR-003: Testing-Strategie

**Problem:** Keine Tests vorhanden, Refactoring-Risk hoch

**Lösung:**
- 97 Tests implementiert
- 100% Coverage angestrebt
- Test-Kategorien definiert

**Ergebnis:** 100% Coverage erreicht, hohes Vertrauen in Code

## Navigation

- [ADR-001: Modularisierung](./001-modularisierung.md)
- [ADR-002: Performance-Optimierung](./002-performance-optimierung.md)
- [ADR-003: Testing-Strategie](./003-testing-strategie.md)

---

**Dokumentation erstellt am:** 04. November 2025
**Autor:** Claude AI (CeleroPress Documentation Agent)
