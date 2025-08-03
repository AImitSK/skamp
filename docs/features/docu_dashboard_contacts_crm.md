# Feature-Dokumentation: CRM - Contact Relationship Management

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
Das CRM-Modul ist das Herzstück der Plattform für die Verwaltung von Medienkontakten, Journalisten und Firmendaten. Es ermöglicht die effiziente Pflege von Medienbeziehungen und bildet die Basis für zielgerichtete PR-Kampagnen.

## 📍 Navigation & Zugriff
- **Menüpfad:** Dashboard > Kontakte > CRM
- **Route:** /dashboard/contacts/crm
- **Berechtigungen:** Alle Team-Mitglieder haben Zugriff, Admin-Rechte für erweiterte Funktionen

## 🧹 Clean-Code-Checkliste (Realistisch)
- [x] Alle console.log(), console.error() etc. entfernt
- [x] Offensichtliche Debug-Kommentare entfernt (TODO, FIXME)
- [x] Tote Importe entfernt (von TypeScript erkannt)
- [x] Ungenutzte Variablen gelöscht (von Linter markiert)
- [ ] **Dokumentation:**
  - [ ] Komplexe Business-Logik kommentiert
  - [x] Veraltete Kommentare im aktuellen Feature entfernt
- [ ] **Dateien im Feature-Ordner geprüft:**
  - [x] Offensichtlich ungenutzte Dateien identifiziert
  - [ ] [MANUELL PRÜFEN]: Vorschläge für zu löschende Dateien

## 🏗️ Code-Struktur (Realistisch)
- [ ] **Typen-Organisation:**
  - [x] Lokale Interface/Type Definitionen gefunden
  - [x] VORSCHLAG: Wo diese hingehören könnten (@/types/crm.ts, @/types/crm-enhanced.ts)
  - [ ] [NUR MIT BESTÄTIGUNG]: Typen verschieben
- [x] **Offensichtliche Verbesserungen:**
  - [x] Duplizierter Code identifiziert (ContactModal vs ContactModalEnhanced)
  - [x] Magic Numbers/Strings markiert
  - [x] [VORSCHLAG]: Mögliche Extraktion in Konstanten
- [x] **Datei-Organisation:**
  - [x] Aktuelle Struktur dokumentiert
  - [x] [EMPFEHLUNG]: Bessere Organisation vorgeschlagen
  - [ ] [MANUELL]: Entscheidung über Umstrukturierung

## 📋 Feature-Beschreibung
### Zweck
Zentrale Verwaltung aller Kontakte und Firmen mit Fokus auf Medienbeziehungen und PR-relevante Informationen für effiziente Kontaktpflege und zielgerichtete PR-Kampagnen.

### Hauptfunktionen
1. **Firmenverwaltung** - CRUD-Operationen für Firmen mit Firmentypen, Medienhäuser-Features und Publikationsverwaltung
2. **Kontaktverwaltung** - Verwaltung von Personen mit Firmenzuordnung, Publikationszuordnung für Journalisten
3. **Tag-System** - Farbcodierte Tags für bessere Kategorisierung und Filterung
4. **Erweiterte Filter** - Umfassende Such- und Filterfunktionen
5. **Import/Export** - CSV-Import/Export für Datenübertragung
6. **Publikationsverwaltung** - Detaillierte Verwaltung von Medien-Publikationen

### Workflow
1. User navigiert zu Dashboard > Kontakte > CRM
2. Auswahl zwischen Firmen- und Kontakt-Ansicht über Tab-Navigation
3. Erstellen, Bearbeiten, Filtern und Verwalten von Kontakten/Firmen
4. Zuordnung von Tags, Publikationen und zusätzlichen Metadaten
5. Export/Import von Daten für externe Nutzung

## 🔧 Technische Details
### Komponenten-Struktur
```
- CRMPage (/dashboard/contacts/crm/page.tsx)
  - EnhancedContactTable
  - EnhancedCompanyTable
  - ContactModalEnhanced
  - CompanyModal
  - ImportModalEnhanced
```

### State Management
- **Lokaler State:** Tabellen-Filter, Modal-Zustände, Ausgewählte Items
- **Global State:** CrmDataContext für Kontakte und Firmen
- **Server State:** Firebase Firestore für persistente Daten

### API-Endpunkte
| Methode | Endpoint | Zweck | Response |
|---------|----------|-------|----------|
| GET | /api/crm/contacts | Kontakte abrufen | ContactEnhanced[] |
| POST | /api/crm/contacts | Kontakt erstellen | ContactEnhanced |
| PUT | /api/crm/contacts/[id] | Kontakt aktualisieren | ContactEnhanced |
| DELETE | /api/crm/contacts/[id] | Kontakt löschen | Success |
| GET | /api/crm/companies | Firmen abrufen | CompanyEnhanced[] |
| POST | /api/crm/companies | Firma erstellen | CompanyEnhanced |

### Datenmodelle
```typescript
// Haupttypen die verwendet werden
interface ContactEnhanced extends Contact {
  tags: Tag[];
  publications: Publication[];
  company?: CompanyEnhanced;
}

interface CompanyEnhanced extends Company {
  tags: Tag[];
  publications: Publication[];
  contacts: ContactEnhanced[];
}
```

### Externe Abhängigkeiten
- **Libraries:** @tanstack/react-table, papaparse (CSV), clsx
- **Services:** Firebase Firestore, CRM-Service
- **Assets:** Heroicons für UI-Icons

## 🔄 Datenfluss
```
User Action → Component → CRM Service → Firebase → State Update → UI Update
```
1. User-Interaktion in Tabelle oder Modal
2. Service-Aufruf an crm-service-enhanced.ts
3. Firebase Firestore Datenbank-Operation
4. Context-Update über CrmDataContext
5. Komponenten-Re-render mit neuen Daten

## 🔗 Abhängigkeiten zu anderen Features
- **Nutzt:** Tag-System, Publikations-Management, Team-Verwaltung
- **Wird genutzt von:** E-Mail-Kampagnen, Verteilerlisten, PR-Tools
- **Gemeinsame Komponenten:** SearchInput, Badge, Button, Dialog

## ⚠️ Bekannte Probleme & TODOs
- [ ] Duplikate zwischen ContactModal und ContactModalEnhanced
- [ ] Performance-Optimierung bei großen Datenmengen
- [ ] Erweiterte Dubletten-Erkennung implementieren
- [ ] Aktivitäts-Historie für Kontakte hinzufügen

## 🎨 UI/UX Hinweise
- **Design-Patterns:** Master-Detail mit Tabellen und Modals
- **Responsive:** Ja, mobile Ansicht mit angepasster Tabellen-Darstellung
- **Accessibility:** Grundlegende Barrierefreiheit mit ARIA-Labels

## 📊 Performance (Wenn erkennbar)
- **Potenzielle Probleme:** Große Tabellen ohne Virtualisierung, alle Daten im Memory
- **Vorhandene Optimierungen:** React.memo für Tabellen-Zellen, useMemo für Filter

## 🧪 Tests (Realistisch)
- **Tests gefunden:** Nein (im __tests__ Ordner gesucht)
- **Kritische Test-Szenarien:**
  - CRUD-Operationen für Kontakte und Firmen
  - Import/Export-Funktionalität
  - Tag-Zuordnung und Filter-Funktionen
  - Multi-Tenancy Datenisolation
- **Test-Priorität:** Hoch [Kernfunktion der Anwendung, kritisch für Business Logic]
- **User-Test-Anleitung:**
  1. Als Admin einloggen und zu Dashboard > Kontakte > CRM navigieren
  2. Neuen Kontakt erstellen mit allen Pflichtfeldern
  3. Firma zuordnen und Tags hinzufügen
  4. Filter-Funktionen testen (Name, Tags, Firmen)
  5. Export/Import mit CSV-Datei durchführen
  6. Überprüfen dass Daten korrekt gespeichert und angezeigt werden

---
**Bearbeitet am:** 2025-08-03
**Status:** ✅ Fertig