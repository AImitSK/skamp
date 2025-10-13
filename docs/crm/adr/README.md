# Architecture Decision Records (ADRs)

**Status:** Active
**Last Updated:** 2025-10-13

## Übersicht

Dieser Ordner enthält alle Architecture Decision Records (ADRs) für das CRM-Modul. ADRs dokumentieren wichtige architektonische Entscheidungen, ihre Begründungen und Konsequenzen.

## ADR-Format

Jeder ADR folgt diesem Template:

```markdown
# ADR [Nummer]: [Titel]

**Status:** [Proposed | Accepted | Deprecated | Superseded]
**Date:** YYYY-MM-DD
**Decision Makers:** [Team/Personen]

## Context
Beschreibung des Problems und der Anforderungen

## Decision
Die getroffene Entscheidung

## Alternatives Considered
Alternativen, die in Betracht gezogen wurden

## Consequences
Positive und negative Auswirkungen der Entscheidung

## Implementation
Umsetzungsdetails

## Related Documents
Links zu relevanten Dokumenten

## References
Externe Quellen und Links
```

## ADR-Index

| ADR | Titel | Status | Datum | Thema |
|-----|-------|--------|-------|-------|
| [0001](./ADR-0001-crm-module-testing-strategy.md) | CRM Module Testing Strategy | ✅ Accepted | 2025-10-13 | Test-Pyramide, Unit/Integration/E2E Tests |
| [0002](./ADR-0002-route-based-navigation.md) | Route-Based Navigation | ✅ Accepted | 2025-10-13 | Routing-Migration, Performance-Optimierung |

## ADR-Lifecycle

### Status-Definitionen

- **Proposed**: Vorgeschlagen, noch nicht final entschieden
- **Accepted**: Akzeptiert und wird umgesetzt
- **Deprecated**: Veraltet, nicht mehr gültig
- **Superseded**: Ersetzt durch neueren ADR

### Review-Prozess

1. **Proposal**: ADR wird als Draft erstellt
2. **Discussion**: Team-Review und Feedback
3. **Decision**: Finale Entscheidung durch Decision Makers
4. **Implementation**: Umsetzung der Entscheidung
5. **Review**: Regelmäßige Überprüfung (alle 6 Monate)

## Wichtige Entscheidungen

### ADR-0001: Testing Strategy (2025-10-13)

**Problem**: CRM-Modul hatte nur 30-40% Test-Coverage und manuelle Testing-Aufwand war zu hoch.

**Entscheidung**: Implementierung einer Test-Pyramide (70% Unit, 20% Integration, 10% E2E) mit Jest, React Testing Library und Playwright.

**Impact**:
- ✅ 80%+ Test-Coverage erreicht
- ✅ Manuelle Testing-Zeit: 30 Min → 30 Sek
- ✅ Sichere Refactorings möglich

### ADR-0002: Route-Based Navigation (2025-10-13)

**Problem**: Client-Side Tab-Navigation mit schlechter UX (keine Bookmarks, kein Browser-Back) und Performance-Problemen.

**Entscheidung**: Migration zu Route-Based Navigation mit Next.js App Router.

**Impact**:
- ✅ Bookmarkable URLs
- ✅ Browser-Navigation funktioniert
- ✅ 20% Bundle-Size Reduktion
- ✅ 25% schnellere Time-to-Interactive

## Erstellung neuer ADRs

### Wann einen ADR erstellen?

Erstelle einen ADR für:
- ✅ Architektonische Änderungen (Routing, State Management)
- ✅ Technologie-Entscheidungen (Bibliotheken, Frameworks)
- ✅ Performance-Optimierungen mit Breaking Changes
- ✅ Security-relevante Entscheidungen
- ✅ Data-Model-Änderungen

Kein ADR notwendig für:
- ❌ Bug-Fixes
- ❌ UI-Tweaks ohne architektonische Auswirkungen
- ❌ Dokumentations-Updates
- ❌ Code-Style-Änderungen

### Prozess

1. Kopiere das ADR-Template
2. Erstelle `ADR-[XXXX]-[titel-in-kebab-case].md`
3. Fülle alle Sections aus
4. Team-Review anfordern
5. Nach Approval: Status auf "Accepted" setzen
6. Dieses README aktualisieren (Index-Tabelle)
7. Commit mit Präfix `docs: ADR-XXXX - [Titel]`

## Referenzen

- [Architecture Decision Records](https://adr.github.io/) - ADR Best Practices
- [When to Write an ADR](https://github.com/joelparkerhenderson/architecture-decision-record#when-to-write-an-adr) - Guidelines
- [ADR Tools](https://github.com/npryce/adr-tools) - CLI für ADR-Management

---

**Maintainer:** SKAMP Development Team
**Contact:** dev@skamp.de
**Last Review:** 2025-10-13
**Next Review:** Q2 2026
