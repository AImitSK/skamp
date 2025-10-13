# CRM (Customer Relationship Management)

**Version:** 2.0 (Production-Ready)
**Status:** ✅ Production Ready
**Letzte Aktualisierung:** 2025-10-13

---

## 📋 Übersicht

Das CRM-Modul von SKAMP ermöglicht die Verwaltung von Firmen (Companies) und Kontakten (Contacts) mit umfangreichen Filtermöglichkeiten, Bulk-Actions und Export-Funktionen.

### Hauptfunktionen

- **Firmenverwaltung**: Erfassung und Verwaltung von Medienunternehmen, Verlagen, Agenturen
- **Kontaktverwaltung**: Journalisten, Redakteure und weitere Medienkontakte
- **Tag-System**: Flexible Kategorisierung mit Custom Tags
- **Import/Export**: CSV-Import und Excel-Export
- **Bulk-Actions**: Massenbearbeitung und -löschung
- **Erweiterte Filter**: Nach Typ, Status, Land, Tags, etc.

---

## 🏗️ Architektur

### Routing-Struktur

```
/dashboard/contacts/crm/
├── layout.tsx                    # Tab-Navigation (Companies | Contacts)
├── companies/
│   ├── page.tsx                  # Firmen-Übersicht
│   ├── components/               # Firmen-spezifische Komponenten
│   └── [companyId]/
│       └── page.tsx              # Firmen-Detailseite
└── contacts/
    ├── page.tsx                  # Kontakt-Übersicht
    ├── components/               # Kontakt-spezifische Komponenten
    └── [contactId]/
        └── page.tsx              # Kontakt-Detailseite
```

### Komponenten-Struktur

```
src/app/dashboard/contacts/crm/
├── layout.tsx                    # Haupt-Layout mit Tab-Navigation
├── components/
│   ├── shared/                   # Gemeinsam genutzte Komponenten
│   │   ├── Alert.tsx
│   │   ├── FlagIcon.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── EmptyState.tsx
│   └── modals/                   # Modal-Komponenten
│       ├── CompanyModal/
│       │   ├── index.tsx
│       │   ├── BasicInfoSection.tsx
│       │   ├── ContactInfoSection.tsx
│       │   └── AddressSection.tsx
│       └── ContactModal/
│           ├── index.tsx
│           ├── PersonalInfoSection.tsx
│           ├── MediaProfileSection.tsx
│           └── CompanySelectionSection.tsx
├── companies/
│   ├── page.tsx                  # Firmen-Übersicht (~400 Zeilen)
│   ├── components/
│   │   ├── CompaniesTable.tsx
│   │   ├── CompanyFilters.tsx
│   │   └── CompanyBulkActions.tsx
│   └── [companyId]/page.tsx      # Firmen-Detailseite
└── contacts/
    ├── page.tsx                  # Kontakt-Übersicht (~400 Zeilen)
    ├── components/
    │   ├── ContactsTable.tsx
    │   ├── ContactFilters.tsx
    │   └── ContactBulkActions.tsx
    └── [contactId]/page.tsx      # Kontakt-Detailseite
```

---

## 🔧 Technologie-Stack

### Frontend
- **Next.js 15.4.4** (App Router)
- **React 19** mit TypeScript
- **Tailwind CSS** für Styling
- **Headless UI** für Komponenten
- **Heroicons** (nur /24/outline)

### State Management & Data Fetching
- **React Query (@tanstack/react-query)** - Data Caching & Server State
- **React Context** - Auth & Organization State

### Performance
- **React Virtual (@tanstack/react-virtual)** - Virtualisierung für lange Listen
- **useMemo/useCallback** - Optimierte Renders
- **Dynamic Imports** - Code-Splitting

### Backend
- **Firebase Firestore** - Datenbank
- **Enhanced Services** - Type-Safe API Layer

---

## 📊 Performance-Ziele

| Metrik | Aktuell (v1) | Ziel (v2) |
|--------|--------------|-----------|
| Initial Load (1000 Firmen) | 3-5s | <2s |
| Filter Response | 200-500ms | <100ms |
| Bundle Size | ~850 KB | <680 KB (20% Reduktion) |
| Test Coverage | 30-40% | 80%+ |
| Lighthouse Score | 75-80 | 90+ |

---

## 🧪 Testing

### Test-Struktur

```
src/app/dashboard/contacts/crm/__tests__/
├── unit/
│   ├── CompaniesTable.test.tsx
│   ├── ContactsTable.test.tsx
│   ├── CompanyFilters.test.tsx
│   └── ContactFilters.test.tsx
├── integration/
│   ├── companies-flow.test.tsx
│   ├── contacts-flow.test.tsx
│   └── bulk-actions.test.tsx
└── e2e/
    ├── crm-companies.spec.ts
    ├── crm-contacts.spec.ts
    └── crm-import-export.spec.ts
```

### Test-Kommandos

```bash
# Alle CRM-Tests ausführen
npm test -- crm

# Nur Unit-Tests
npm test -- crm/unit

# Coverage-Report
npm run test:coverage -- crm
```

---

## 📖 API-Dokumentation

### Companies Enhanced Service

```typescript
import { companiesEnhancedService } from '@/lib/firebase/services/companies-enhanced-service';

// Alle Firmen abrufen
const companies = await companiesEnhancedService.getAll(organizationId);

// Einzelne Firma abrufen
const company = await companiesEnhancedService.getById(companyId);

// Neue Firma erstellen
const newCompany = await companiesEnhancedService.create(organizationId, companyData);

// Firma aktualisieren
await companiesEnhancedService.update(companyId, updates);

// Firma löschen
await companiesEnhancedService.delete(companyId);
```

Siehe auch: [Companies API Documentation](./api/companies.md)

### Contacts Enhanced Service

```typescript
import { contactsEnhancedService } from '@/lib/firebase/services/contacts-enhanced-service';

// Alle Kontakte abrufen
const contacts = await contactsEnhancedService.getAll(organizationId);

// Kontakte nach Firma
const companyContacts = await contactsEnhancedService.getByCompany(companyId);

// Neuen Kontakt erstellen
const newContact = await contactsEnhancedService.create(organizationId, contactData);
```

Siehe auch: [Contacts API Documentation](./api/contacts.md)

---

## 🚀 Migration von v1 zu v2

### Breaking Changes

⚠️ **URL-Struktur geändert:**

```
Alt: /crm?tab=companies
Neu: /crm/companies

Alt: /crm?tab=contacts
Neu: /crm/contacts
```

→ Automatische Redirects sind implementiert (siehe `layout.tsx`)

### Neue Features in v2

- ✅ Route-basierte Navigation
- ✅ Server-Side Pagination (API-Level)
- ✅ Virtualisierung für große Listen (100+ Items)
- ✅ React Query Caching
- ✅ Optimierte Bundle Size
- ✅ Umfassende Test-Suite
- ✅ JSDoc-Dokumentation

---

## 📚 Dokumentations-Struktur

Diese Dokumentation ist vollständig und gliedert sich in folgende Bereiche:

### 1. API-Dokumentation
**[→ API-Übersicht](./api/README.md)** - Firebase Services API-Referenz

Vollständige Dokumentation aller Firebase Services:
- **[Companies API](./api/companies.md)** - `companiesEnhancedService`
  - CRUD-Operationen, Erweiterte Suche, Konzernstrukturen, Import/Export
  - Multi-Entity References (Globale Firmen)
- **[Contacts API](./api/contacts.md)** - `contactsEnhancedService`
  - CRUD-Operationen, Journalist-Features, GDPR-Management
  - Multi-Entity References (Globale Journalisten)
- **[Tags API](./api/tags.md)** - `tagsEnhancedService`
  - Tag-Verwaltung, Usage Statistics, Tag-Merging

### 2. Component-Dokumentation
**[→ Component-Übersicht](./components/README.md)** - React Components Guide

Vollständige Dokumentation aller React-Komponenten:
- **Companies Components:** CompaniesTable, CompanyFilters, CompanyBulkActions
- **Contacts Components:** ContactsTable, ContactFilters, ContactBulkActions
- **Shared Components:** Alert, FlagIcon, ConfirmDialog, EmptyState
- **Component Patterns:** State Management, Selection, CRUD Operations, Styling

### 3. Architecture Decision Records (ADRs)
**[→ ADR-Übersicht](./adr/README.md)** - Architektur-Entscheidungen

Dokumentierte Design-Entscheidungen:
- **[ADR-0001: Testing Strategy](./adr/ADR-0001-crm-module-testing-strategy.md)**
  - Test-Pyramide (70% Unit, 20% Integration, 10% E2E)
  - 80%+ Test-Coverage erreicht
- **[ADR-0002: Route-Based Navigation](./adr/ADR-0002-route-based-navigation.md)**
  - Migration zu Route-Based Navigation
  - 20% Bundle-Size Reduktion, 25% schnellere TTI

### 4. Planning Documents
**[→ Implementierungsplan](./planning/crm-refactoring-implementation-plan.md)** - 5-Phasen-Refactoring

Detaillierter Plan für das CRM-Refactoring:
- Phase 0: Setup & Infrastructure (2h) ✅
- Phase 1: Core Components (6h) ✅
- Phase 2: Routing Migration (8h) ✅
- Phase 3: Integration & Polish (4h) ✅
- Phase 4: Testing Implementation (8h) ✅
- Phase 5: Documentation (4h) ✅ **AKTUELL ABGESCHLOSSEN**

---

## 🔒 Berechtigungen

Das CRM-Modul erfordert:
- ✅ Authentifizierung (Firebase Auth)
- ✅ Organization-Membership
- ✅ Role: `member` oder höher

Siehe: [Authentication & Authorization Guide](../auth/README.md)

---

## 🐛 Bekannte Probleme & Roadmap

### Aktuelle Einschränkungen
- Import unterstützt nur CSV-Format
- Export auf 10.000 Einträge limitiert
- Keine Offline-Unterstützung

### Roadmap
- [ ] Excel-Import Support
- [ ] Erweiterte Duplikaterkennung
- [ ] Team-Collaboration Features
- [ ] Activity Timeline
- [ ] Email-Integration

---

## 👥 Kontakt & Support

**Entwickler:** Stefan Kühne & SKAMP Development Team
**Letzte Änderung:** 2025-10-13
**Status:** ✅ Production Ready (Phase 0-5 abgeschlossen)

Bei Fragen siehe: [Project README](../../README.md)

---

**Maintainer:** SKAMP Development Team
**Contact:** dev@skamp.de
**Documentation Version:** 2.0
**Last Review:** 2025-10-13
**Next Review:** Q2 2026
