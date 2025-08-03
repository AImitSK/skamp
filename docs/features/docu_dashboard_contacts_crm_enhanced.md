# Feature-Dokumentation: CRM Enhanced - Contact Relationship Management

## 🎯 Anwendungskontext

**celeroPress** ist eine PR-Management-Plattform für den deutschsprachigen Raum, die PR-Agenturen und Kommunikationsabteilungen bei der Digitalisierung und Optimierung ihrer Medienarbeit unterstützt.

**Kernfunktionen der Plattform:**
- E-Mail-Management für Pressemitteilungen und Journalistenkommunikation
- Kontaktverwaltung mit Mediendatenbank
- Team-Kollaboration mit Multi-Tenancy
- KI-gestützte Textoptimierung und Vorschläge
- Workflow-Automatisierung für PR-Prozesse
- Analytics und Erfolgsmessung

**Dieses Feature im Kontext:**
Das CRM-Enhanced-Modul ist das Herzstück der Plattform für die Verwaltung von Medienkontakten, Journalisten und Firmendaten. Es ermöglicht die effiziente Pflege von Medienbeziehungen und bildet die Basis für zielgerichtete PR-Kampagnen. Diese Enhanced-Version bietet erweiterte Funktionen für Import/Export, erweiterte Filter und Publikationsverwaltung.

## 📍 Navigation & Zugriff
- **Menüpfad:** Dashboard > Kontakte > CRM
- **Route:** /dashboard/contacts/crm
- **Berechtigungen:** Alle Team-Mitglieder haben Zugriff, Admin-Rechte für Import/Export und erweiterte Funktionen

## 🧹 Clean-Code-Checkliste (Realistisch)
- [x] Alle console.log(), console.error() etc. entfernt
- [x] Offensichtliche Debug-Kommentare entfernt (TODO, FIXME) - nur 2 funktionale TODOs verbleiben
- [x] Tote Importe entfernt (von TypeScript erkannt)
- [x] Ungenutzte Variablen gelöscht (von Linter markiert)
- [x] **Dokumentation:**
  - [x] Komplexe Business-Logik kommentiert
  - [x] Veraltete Kommentare im aktuellen Feature entfernt
- [x] **Dateien im Feature-Ordner geprüft:**
  - [x] Offensichtlich ungenutzte Dateien identifiziert
  - [x] [MANUELL PRÜFEN]: Keine ungenutzten Dateien gefunden

## 🏗️ Code-Struktur (Realistisch)
- [x] **Typen-Organisation:**
  - [x] Lokale Interface/Type Definitionen gefunden und extrahiert:
    - ImportResult, ImportProgress (ImportModalEnhanced.tsx) → @/types/crm-enhanced-ui.ts
    - TabConfig → CompanyTabConfig, ContactTabConfig in @/types/crm-enhanced-ui.ts
    - CompanyModalProps, ContactModalEnhancedProps → @/types/crm-enhanced-ui.ts
  - [x] ✅ ERLEDIGT: Typen nach @/types/crm-enhanced-ui.ts verschoben
- [x] **Offensichtliche Verbesserungen:**
  - [x] Duplizierter Code behoben: TabConfig aus mehreren Dateien entfernt
  - [x] Magic Numbers/Strings extrahiert: Pagination, Status-Strings, Validation-Rules
  - [x] ✅ ERLEDIGT: Extraktion in @/lib/constants/crm-constants.ts
- [x] **Datei-Organisation:**
  - [x] Aktuelle Struktur dokumentiert und verbessert
  - [x] ✅ ERLEDIGT: Type-Extraktion und Konstanten-Zentralisierung abgeschlossen

## 📋 Feature-Beschreibung
### Zweck
Enhanced CRM-System für die zentrale Verwaltung aller Kontakte und Firmen mit Fokus auf Medienbeziehungen. Bietet erweiterte Import/Export-Funktionen, detaillierte Filter und umfassende Publikationsverwaltung für effiziente PR-Arbeit.

### Hauptfunktionen
1. **Enhanced Kontaktverwaltung** - Vollständige CRUD-Operationen mit erweiterten Metadaten und Publikationszuordnung
2. **Enhanced Firmenverwaltung** - Detaillierte Firmenprofile mit Hierarchien, Publikationen und Business-Daten
3. **Erweiterte Import/Export** - CSV-Import mit Validierung, Duplikatserkennung und Batch-Verarbeitung
4. **Intelligente Filter** - Mehrkriterien-Suche mit Tags, Publikationen, Regionen und Branchen
5. **Publikationsmanagement** - Detaillierte Zuordnung von Kontakten zu Medien-Publikationen
6. **Tag-System Enhanced** - Farbcodierte, hierarchische Tags mit automatischen Vorschlägen

### Workflow
1. User navigiert zu Dashboard > Kontakte > CRM
2. Tab-basierte Navigation zwischen Firmen und Kontakten
3. Erweiterte Filter für präzise Suche und Segmentierung
4. Modal-basierte Bearbeitung mit mehrstufigen Formularen
5. Bulk-Operationen für Export/Import und Tag-Management
6. Detailansichten für individuelle Kontakt-/Firmenprofile

## 🔧 Technische Details
### Komponenten-Struktur
```
- CRMPage (/dashboard/contacts/crm/page.tsx) [Haupt-Interface]
  - EnhancedContactTable [Kontakt-Tabelle mit Filter]
  - EnhancedCompanyTable [Firmen-Tabelle mit Filter]
  - ContactModalEnhanced [Kontakt-Modal mit Tabs]
  - CompanyModal [Firmen-Modal mit Business-Logik]
  - ImportModalEnhanced [CSV-Import mit Validierung]
  - SearchInput [Globale Suche]
  - SearchableFilter [Multi-Kriterien Filter]
  - Detail-Seiten:
    - /contacts/[contactId]/page.tsx
    - /companies/[companyId]/page.tsx
```

### State Management
- **Lokaler State:** Tabellen-Filter, Modal-Zustände, Pagination, Auswahl-Sets
- **Global State:** CrmDataContext für Kontakte/Firmen, OrganizationContext für Team-Daten
- **Server State:** Firebase Firestore mit crm-service-enhanced.ts

### API-Endpunkte
| Methode | Endpoint | Zweck | Response |
|---------|----------|-------|----------|
| GET | /api/crm/contacts | Kontakte mit Filter abrufen | ContactEnhanced[] |
| POST | /api/crm/contacts | Kontakt erstellen/aktualisieren | ContactEnhanced |
| DELETE | /api/crm/contacts/bulk | Bulk-Löschung | BulkResult |
| GET | /api/crm/companies | Firmen mit Filter abrufen | CompanyEnhanced[] |
| POST | /api/crm/companies | Firma erstellen/aktualisieren | CompanyEnhanced |
| POST | /api/crm/import | CSV-Import verarbeiten | ImportResult |
| GET | /api/crm/export | CSV-Export generieren | Blob |
| GET | /api/crm/tags | Tags abrufen | Tag[] |
| GET | /api/crm/publications | Publikationen abrufen | Publication[] |

### Datenmodelle
```typescript
// Haupttypen die verwendet werden
interface ContactEnhanced extends Contact {
  tags: Tag[];
  publications: Publication[];
  company?: CompanyEnhanced;
  socialProfiles: SocialProfile[];
  communicationPreferences: CommunicationPrefs;
  activityHistory: ActivityRecord[];
}

interface CompanyEnhanced extends Company {
  tags: Tag[];
  publications: Publication[];
  contacts: ContactEnhanced[];
  businessData: BusinessData;
  hierarchy: CompanyHierarchy;
  mediaHouseFeatures?: MediaHouseData;
}

interface ImportResult {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  errors: ImportError[];
  duplicates: DuplicateInfo[];
}
```

### Externe Abhängigkeiten
- **Libraries:** @headlessui/react, clsx, papaparse (CSV), heroicons
- **Services:** Firebase Firestore, crm-service-enhanced.ts, export-utils
- **Contexts:** AuthContext, OrganizationContext, CrmDataContext

## 🔄 Datenfluss
```
User Action → CRM Component → Enhanced Service → Firebase → Context Update → UI Re-render
```
**Detaillierter Datenfluss:**
1. User-Interaktion in Tabelle, Filter oder Modal
2. Service-Aufruf an crm-service-enhanced.ts mit Parametern
3. Firebase Firestore Operation mit Team-Isolation
4. Context-Update über CrmDataContext mit optimistischen Updates
5. Komponenten-Re-render mit neuen Daten und Loading-States

## 🔗 Abhängigkeiten zu anderen Features
- **Nutzt:** 
  - Tag-System (shared)
  - Publikations-Management (Library)
  - Team-Verwaltung (Multi-Tenancy)
  - Media-Service (Avatars, Logos)
- **Wird genutzt von:** 
  - E-Mail-Kampagnen (Empfänger-Auswahl)
  - Verteilerlisten (Kontakt-Import)
  - PR-Tools (Journalist-Datenbank)
  - Analytics (Kontakt-Performance)
- **Gemeinsame Komponenten:** 
  - SearchInput, Badge, Button, Dialog
  - CountrySelector, LanguageSelector
  - PhoneInput, CurrencyInput

## ⚠️ Bekannte Probleme & TODOs
- [x] Console-Logging entfernt (13 Statements)
- [x] Type-Extraktion in zentrale Dateien (@/types/crm-enhanced-ui.ts)
- [x] TabConfig-Duplikation zwischen Modals behoben
- [x] Konstanten in zentrale Datei extrahiert (@/lib/constants/crm-constants.ts)
- [ ] Performance bei großen Datenmengen (>1000 Kontakte)
- [ ] Erweiterte Dubletten-Erkennung (Algorithmus-basiert)
- [ ] Aktivitäts-Historie für Kontakte implementieren
- [ ] Bulk-Edit-Funktionen erweitern

## 🎨 UI/UX Hinweise
- **Design-Patterns:** Master-Detail mit Tab-Navigation, Modal-Workflows
- **Responsive:** Vollständig responsive, mobile Tabellen mit Horizontal-Scroll
- **Accessibility:** 
  - ARIA-Labels für Tabellen und Filter
  - Tastatur-Navigation in Modals
  - Screen-Reader-freundliche Beschreibungen

## 📊 Performance (Wenn erkennbar)
- **Potenzielle Probleme:** 
  - Große Tabellen ohne Virtualisierung
  - Alle Filter-Daten im Memory
  - Mehrfache API-Calls bei Tab-Wechsel
- **Vorhandene Optimierungen:** 
  - React.memo für Tabellen-Zellen
  - useMemo für berechnete Filter-Werte
  - Debounced Search-Input
  - Pagination mit 50er-Batches

## 🧪 Tests (Realistisch)
- **Tests gefunden:** ✅ Ja - Umfassende Unit Tests erstellt
- **Test-Dateien:**
  - `src/__tests__/features/crm-enhanced-unit.test.ts` (14 Tests, alle erfolgreich)
  - `src/__tests__/features/crm-enhanced.test.tsx` (Vollständige Integration Tests)
- **Kritische Test-Szenarien:**
  - CRUD-Operationen für Kontakte und Firmen
  - CSV-Import/Export mit verschiedenen Formaten
  - Tag-Zuordnung und Filter-Kombinationen
  - Multi-Tenancy Datenisolation
  - Modal-Workflows und Validierungen
  - Bulk-Operationen und Performance
- **Test-Priorität:** Hoch [Kernfunktion der Anwendung, kritisch für Datenintegrität]
- **User-Test-Anleitung:**
  1. Als Admin einloggen und zu Dashboard > Kontakte > CRM navigieren
  2. **Kontakt-Management testen:**
     - Neuen Kontakt mit allen Feldern erstellen
     - Publikationen und Tags zuordnen
     - Firmenzuordnung vornehmen
     - Filter nach verschiedenen Kriterien testen
  3. **Firmen-Management testen:**
     - Neue Firma als Medienhaus erstellen
     - Publikationen hinzufügen
     - Hierarchie-Features testen
     - Business-Daten eingeben
  4. **Import/Export testen:**
     - CSV-Import mit Beispieldaten
     - Duplikatserkennung prüfen
     - Export und Re-Import-Konsistenz
  5. **Filter und Suche testen:**
     - Volltext-Suche
     - Tag-Filter kombinieren
     - Publikations-Filter
     - Performance bei größeren Datenmengen
  6. **Multi-Tenancy prüfen:**
     - Team wechseln und Datenisolation bestätigen
     - Berechtigungen für verschiedene Rollen

---
**Bearbeitet am:** 2025-08-03
**Status:** ✅ Fertig