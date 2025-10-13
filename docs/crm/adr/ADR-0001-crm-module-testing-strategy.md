# ADR 0001: CRM Module Testing Strategy

**Status:** Accepted
**Date:** 2025-10-13
**Decision Makers:** SKAMP Development Team
**Related:** Phase 4: Testing Implementation

## Context

Das CRM-Modul benötigt eine umfassende Test-Strategie, um Production-Readiness zu gewährleisten. Die bisherige Test-Coverage lag bei nur 30-40% und fokussierte sich primär auf den API-Layer. Für ein produktionsreifes System ist dies unzureichend.

### Probleme ohne umfassende Tests:
- ❌ Unbekannter Code-Quality-Status
- ❌ Regressions werden erst in Production entdeckt
- ❌ Refactoring ist risikoreich
- ❌ Manuelle Testing-Aufwand: 30+ Minuten pro Feature-Änderung
- ❌ Keine Dokumentation des erwarteten Verhaltens

### Ziele:
- ✅ 80%+ Test-Coverage
- ✅ Automatisierte Qualitätssicherung
- ✅ Schnelles Feedback (<30 Sekunden)
- ✅ Sichere Refactorings
- ✅ Dokumentiertes Verhalten

## Decision

Wir implementieren eine **comprehensive Test-Suite** basierend auf der Test-Pyramide:

```
         /\
        /  \         10% E2E Tests (3 Tests)
       /____\        - Playwright Browser-Automation
      /      \       - Komplette User-Journeys
     /        \      - Company + Contact Creation
    /__________\     - Filter and Search
   /            \    - Bulk Export
  /              \
 /                \  20% Integration Tests (4 Tests)
/____________________\ - Jest + React Testing Library
                      - Companies CRUD Flow
                      - Contacts CRUD Flow
                      - Filter + Export Flow
                      - Bulk Actions Flow

                      70% Unit Tests (30 Tests)
                      - Jest + React Testing Library
                      - Component-isolierte Tests
                      - Schnell, einfach zu debuggen
```

### Test-Stack:

| Tool | Zweck | Verwendung |
|------|-------|------------|
| **Jest** | Test-Framework & Runner | Unit + Integration Tests |
| **React Testing Library** | Component Testing | DOM-Testing, User Interactions |
| **Playwright** | E2E Tests | Browser-Automation, User Journeys |

### Test-Kategorien:

#### 1. Unit Tests (30 Tests, ~70% Coverage)

**Companies Components (11 Tests):**
- `CompaniesTable.test.tsx` - 3 Tests (Rendering, Selection, Sorting)
- `CompanyFilters.test.tsx` - 5 Tests (Filter UI, Active Count, Callbacks)
- `CompanyBulkActions.test.tsx` - 3 Tests (Rendering, Import, Export)

**Contacts Components (12 Tests):**
- `ContactsTable.test.tsx` - 3 Tests (Rendering, Selection, View)
- `ContactFilters.test.tsx` - 5 Tests (Company/Tag/Journalist Filters)
- `ContactBulkActions.test.tsx` - 4 Tests (Import, Export, Bulk Delete)

**Shared Components (7 Tests):**
- `Alert.test.tsx` - 2 Tests (Rendering, Type Colors)
- `FlagIcon.test.tsx` - 2 Tests (Empty State, Dynamic Loading)
- `ConfirmDialog.test.tsx` - 3 Tests (Rendering, Confirm/Cancel)

**Charakteristik:**
- ⚡ Schnell (Millisekunden pro Test)
- 🎯 Isoliert (Mocks für Dependencies)
- 🐛 Einfach zu debuggen
- 📝 Dokumentieren Component-Verhalten

#### 2. Integration Tests (4 Tests, ~20% Coverage)

- `crm-companies-flow.test.tsx` - CRUD + Filter Flow
- `crm-contacts-flow.test.tsx` - CRUD + Filter Flow
- `crm-filter-export-flow.test.tsx` - Multi-Filter + CSV Export
- `crm-bulk-actions-flow.test.tsx` - Multi-Select + Bulk Operations

**Charakteristik:**
- 🔗 Testen Zusammenspiel mehrerer Komponenten
- ⏱️ Mittel-schnell (Sekunden)
- 🎭 Mocked Firebase Services
- 📊 Testen Business Logic

#### 3. E2E Tests (3 Tests, ~10% Coverage)

- `crm-company-contact-creation.spec.ts` - Komplette User Journey
- `crm-filter-search.spec.ts` - Filter Funktionalität
- `crm-bulk-export.spec.ts` - CSV Export Workflows

**Charakteristik:**
- 🌐 Echter Browser (Chromium)
- 🐢 Langsam (Sekunden bis Minuten)
- 💯 Realitätsnah (wie echter User)
- 🎯 Kritische Flows

## Alternatives Considered

### Alternative 1: Nur Unit Tests
**Abgelehnt** - Keine Integration/E2E Coverage, höheres Risiko von Integration-Bugs

### Alternative 2: Nur E2E Tests
**Abgelehnt** - Zu langsam, schwer zu debuggen, teuer in Wartung

### Alternative 3: 50% Unit, 50% E2E
**Abgelehnt** - Schlechtes Kosten/Nutzen-Verhältnis, zu langsam

### Alternative 4: Test-Pyramide (70/20/10) ✅ **GEWÄHLT**
**Vorteile:**
- ⚡ Schnelles Feedback (Unit Tests)
- 🔗 Integration Testing (Business Logic)
- 💯 E2E Coverage (Kritische Flows)
- 🎯 Optimales Kosten/Nutzen-Verhältnis

## Consequences

### Positive:

✅ **Code Quality:**
- 80%+ Test-Coverage
- Sofortiges Feedback bei Regressions
- Dokumentiertes Verhalten durch Tests

✅ **Development Velocity:**
- Sichere Refactorings
- Weniger Bugs in Production
- Schnellere Onboarding neuer Entwickler

✅ **Business Value:**
- Reduzierte manuelle Testing-Zeit (30 Min → 30 Sek)
- Höhere User-Zufriedenheit
- Geringere Maintenance-Kosten

### Negative:

❌ **Initiale Kosten:**
- 8 Stunden für Test-Implementation
- Learning Curve für Team
- CI/CD Integration notwendig

❌ **Maintenance:**
- Tests müssen bei Code-Änderungen aktualisiert werden
- Playwright Updates notwendig
- Mögliche Flaky Tests

### Mitigation:

🛡️ **Best Practices:**
- Klare Test-Naming-Conventions
- Shared Mock-Data in `__fixtures__`
- Test-Utils für wiederkehrende Patterns
- CI/CD Pipeline für automatisches Testing
- Regelmäßige Test-Reviews

## Implementation

### Phase 4.1: Unit Tests (4h)
```bash
# Tests erstellen
src/app/dashboard/contacts/crm/
├── companies/components/__tests__/
├── contacts/components/__tests__/
└── components/shared/__tests__/

# Ausführen
npm test -- crm
```

### Phase 4.2: Integration Tests (2h)
```bash
# Tests erstellen
src/app/dashboard/contacts/crm/__tests__/integration/

# Ausführen
npm test -- integration
```

### Phase 4.3: E2E Tests (2h)
```bash
# Tests erstellen
e2e/crm-*.spec.ts

# Ausführen
npm run test:e2e
```

## Metrics

### Erwartete Metriken:

| Metrik | Vor Tests | Nach Tests | Ziel |
|--------|-----------|------------|------|
| Code Coverage | 30% | 80%+ | ✅ |
| Test-Laufzeit | - | <30s | ✅ |
| Bug-Rate (Production) | Hoch | Niedrig | ✅ |
| Refactoring-Sicherheit | Niedrig | Hoch | ✅ |
| Manual Testing-Zeit | 30 Min | 30 Sek | ✅ |

### Tracking:

```bash
# Coverage Report
npm run test:coverage

# Test Results
npm test -- --verbose

# E2E Results
npm run test:e2e -- --reporter=html
```

## Related Documents

- [README.md](../../src/app/dashboard/contacts/crm/README.md) - CRM Module Overview
- [crm-refactoring-implementation-plan.md](../planning/crm-refactoring-implementation-plan.md) - Implementation Plan
- Test Files:
  - `src/app/dashboard/contacts/crm/**/__tests__/` - Unit Tests
  - `src/app/dashboard/contacts/crm/__tests__/integration/` - Integration Tests
  - `e2e/crm-*.spec.ts` - E2E Tests

## References

- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) - Martin Fowler
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Official Docs
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices) - GitHub
- [Playwright](https://playwright.dev/) - Official Docs

## Review & Updates

- **2025-10-13**: Initial Decision - Test-Pyramide 70/20/10
- **Next Review**: Q1 2026 - Coverage & Performance Evaluation

---

**Maintainer:** SKAMP Development Team
**Contact:** dev@skamp.de
