# Feature-Dokumentation: Textbausteine (Boilerplates)

## 🎯 Anwendungskontext

**CeleroPress** ist eine PR-Management-Plattform für den deutschsprachigen Raum, die PR-Agenturen und Kommunikationsabteilungen bei der Digitalisierung und Optimierung ihrer Medienarbeit unterstützt.

**Kernfunktionen der Plattform:**
- E-Mail-Management für Pressemitteilungen und Journalistenkommunikation
- Kontaktverwaltung mit Mediendatenbank
- Team-Kollaboration mit Multi-Tenancy
- KI-gestützte Textoptimierung und Vorschläge
- Workflow-Automatisierung für PR-Prozesse
- Analytics und Erfolgsmessung

**Dieses Feature im Kontext:**
Das Textbausteine-Feature ermöglicht die zentrale Verwaltung wiederverwendbarer Textblöcke für konsistente und effiziente Kommunikation. Es trägt zur Standardisierung und Professionalisierung der PR-Arbeit bei, indem häufig verwendete Inhalte wie Unternehmensbeschreibungen und rechtliche Hinweise zentral verwaltet werden.

## 📍 Navigation & Zugriff
- **Menüpfad:** Dashboard > PR-Tools > Textbausteine
- **Route:** `/dashboard/pr-tools/boilerplates`
- **Berechtigungen:** Alle Organisationsmitglieder (Read/Write basierend auf Rolle)

## 🧹 Clean-Code-Checkliste (Realistisch)
- [x] Alle console.log(), console.error() etc. entfernt (außer gezieltes Logging für Migration)
- [x] Debug-Kommentare entfernt (TODO, FIXME)
- [x] Ungenutzte Imports identifiziert und entfernt
- [x] Ungenutzte Variablen gelöscht
- [x] **Dokumentation:**
  - [x] Komplexe Business-Logik kommentiert
  - [x] Veraltete Kommentare entfernt
- [x] **Dateien im Feature-Ordner geprüft:**
  - [x] Keine offensichtlich ungenutzte Dateien gefunden
  - [x] Klare Struktur mit page.tsx und BoilerplateModal.tsx

## 🏗️ Code-Struktur (Realistisch)
- [x] **Typen-Organisation:**
  - [x] Boilerplate-Typen in `/types/crm-enhanced.ts` definiert
  - [x] LanguageCode Typ in `/types/international.ts`
  - [x] Konsistente TypeScript-Typisierung
- [x] **Code-Verbesserungen:**
  - [x] Service-Layer gut strukturiert (`boilerplate-service.ts`)
  - [x] Magic Numbers eliminiert (itemsPerPage = 25)
  - [x] Konstanten für Kategorie- und Sprach-Labels definiert
- [x] **Datei-Organisation:**
  - [x] Service-Logic in `/lib/firebase/boilerplate-service.ts`
  - [x] UI-Komponenten in Feature-Ordner organisiert
  - [x] Konsistente Namenskonventionen

## 📋 Feature-Beschreibung
### Zweck
Zentrale Verwaltung wiederverwendbarer Textbausteine für konsistente PR-Kommunikation. Benutzer können Standardtexte wie Unternehmensbeschreibungen, Kontaktinformationen und rechtliche Hinweise erstellen und in verschiedenen Kontexten wiederverwenden.

### Hauptfunktionen
1. **CRUD-Operationen** - Erstellen, Bearbeiten, Löschen von Textbausteinen
2. **Kategorisierung** - Einteilung in Unternehmen, Kontakt, Rechtliches, Produkt, Sonstige
3. **Rich-Text-Editor** - Formatierte Texterstellung mit Variables-System
4. **Sichtbarkeitssteuerung** - Global verfügbare oder kundenspezifische Bausteine
5. **Such- und Filterfunktionen** - Nach Name, Inhalt, Kategorie, Sprache
6. **Favoriten-System** - Häufig genutzte Bausteine markieren
7. **Mehrsprachigkeit** - Sprachspezifische Textbausteine
8. **Variables-System** - Platzhalter für dynamische Inhalte

### Workflow
1. Benutzer navigiert zu PR-Tools > Textbausteine
2. Klick auf "Baustein erstellen" öffnet Modal-Dialog
3. Eingabe von Name, Kategorie, Sprache und Inhalt
4. Optional: Kundenspezifische Zuordnung, Tags, Variablen
5. Speichern erstellt neuen Textbaustein
6. Übersicht zeigt alle Bausteine in Listen- oder Grid-Ansicht
7. Filter und Suche ermöglichen schnelle Navigation
8. Bearbeitung, Duplizierung und Löschung über Dropdown-Menüs

## 🔧 Technische Details
### Komponenten-Struktur
```
- BoilerplatesPage (page.tsx)
  - SearchInput (Suchfunktion)
  - FilterPopover (Kategorie, Sprache, Sichtbarkeit)
  - ViewToggle (Listen-/Grid-Ansicht)
  - TableView/GridView (Darstellung)
  - BoilerplateModal (Bearbeitungsdialog)
    - RichTextEditor
    - LanguageSelector
    - FocusAreasInput (Tags)
    - VariablesModal (Platzhalter)
  - ConfirmDialog (Löschbestätigung)
```

### State Management
- **Lokaler State:** 
  - Boilerplates-Liste, Companies-Liste
  - Filter-Zustände (Kategorien, Sprachen, Sichtbarkeit)
  - Pagination, View-Mode, Such-Term
  - Modal-Zustände, Selected Items
- **Global State:** OrganizationContext für Multi-Tenancy
- **Server State:** Firebase Firestore mit Real-time Updates

### API-Endpunkte
| Service-Methode | Zweck | Parameter |
|----------------|-------|-----------|
| `getAll()` | Alle Boilerplates laden | organizationId |
| `getForClient()` | Global + kundenspezifisch | organizationId, clientId |
| `create()` | Neuen Baustein erstellen | data, context |
| `update()` | Baustein aktualisieren | id, data, context |
| `delete()` | Baustein löschen | id |
| `toggleFavorite()` | Favorit umschalten | id, context |
| `duplicate()` | Baustein kopieren | id, newName, context |

### Datenmodelle
```typescript
interface Boilerplate {
  id?: string;
  name: string;
  content: string; // HTML-formatiert
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  description?: string;
  organizationId: string;
  isGlobal: boolean;
  clientId?: string;
  clientName?: string;
  tags?: string[];
  isFavorite: boolean;
  isArchived: boolean;
  usageCount: number;
  sortOrder?: number;
  language?: LanguageCode; // Sprachunterstützung
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

interface BoilerplateCreateData {
  name: string;
  content: string;
  category: string;
  description?: string;
  isGlobal?: boolean;
  clientId?: string;
  clientName?: string;
  tags?: string[];
  defaultPosition?: string;
  sortOrder?: number;
}
```

### Externe Abhängigkeiten
- **Libraries:** 
  - Headless UI (Popover, Dialog, Transition)
  - Hero Icons (24/outline für Design Pattern Compliance)
  - clsx (Conditional Styling)
- **Services:** 
  - Firebase Firestore (Datenspeicherung)
  - boilerplatesService, companiesEnhancedService
- **Components:**
  - RichTextEditor, LanguageSelector, FocusAreasInput
  - CeleroPress Design System Komponenten

## 🔄 Datenfluss
```
User Action → Component State → Service Call → Firestore → State Update → UI Update
```

**Beispiel - Textbaustein erstellen:**
1. User klickt "Baustein erstellen" → `setShowModal(true)`
2. User füllt Form aus → `setFormData()`, `setRichTextContent()`
3. User klickt Speichern → `handleSubmit()` 
4. Service-Call → `boilerplatesService.create(data, context)`
5. Firestore-Update → Document wird gespeichert
6. Success-Callback → `onSave()`, `loadData()`
7. UI-Update → Modal schließt, Liste wird neu geladen

## 🔗 Abhängigkeiten zu anderen Features
- **Nutzt:** 
  - CRM-Enhanced (Kundendaten für kundenspezifische Bausteine)
  - Organization Context (Multi-Tenancy)
  - Rich Text Editor (Formatierte Inhalte)
- **Wird genutzt von:** 
  - Kampagnen (Intelligente Textbaustein-Integration)
  - E-Mail-Editor (Quick-Insert Funktionalität)
  - AI-Assistant (Template-basierte Generierung)
- **Gemeinsame Komponenten:** 
  - Design System Komponenten (Button, Input, Select, Badge)
  - InfoTooltip, SimpleSwitch, SearchInput

## ⚠️ Bekannte Probleme & TODOs
- [ ] Variables werden in der Live-Vorschau nicht ersetzt
- [ ] Performance-Optimierung für große Mengen (>100 Bausteine)
- [ ] HTML-to-Editor Konvertierung könnte verbessert werden
- [ ] Migration von alten userId-basierten zu organizationId-basierten Einträgen läuft kontinuierlich

## 🎨 UI/UX Hinweise
- **Design-Patterns:** 
  - CeleroPress Design System v2.0 konform
  - InfoCard Pattern für Content-Boxen
  - Keine Shadow-Effekte oder störende Linien
- **Responsive:** Vollständig responsive mit Grid/List Toggle
- **Accessibility:** 
  - ARIA-Labels für alle interaktiven Elemente
  - Keyboard-Navigation unterstützt
  - Screen-Reader kompatibel

### 🎨 CeleroPress Design System Standards
- **Branding:** CeleroPress statt SKAMP verwendet
- **Icons:** Ausschließlich `/24/outline` Varianten
- **Buttons:** Primary-Farbe (`bg-primary hover:bg-primary-hover`)
- **Focus-States:** `focus:ring-primary` konsequent verwendet
- **Spacing:** Konsistente `px-6 py-4` für Tabellen, `p-4` für Cards
- **Filter-Button:** Badge für aktive Filter-Anzahl

## 📊 Performance (Wenn erkennbar)
- **Potenzielle Probleme:** 
  - Große Textbausteine-Listen ohne Pagination
  - Rich Text Editor Performance bei sehr langen Inhalten
- **Vorhandene Optimierungen:** 
  - Pagination mit 25 Items pro Seite
  - useMemo für gefilterte und paginierte Daten
  - Lazy Loading durch useEffect Dependencies

## 🧪 Tests (MUST BE 100% FUNCTIONAL - NO EXCEPTIONS!)

> ⚠️ **CRITICAL**: Tests müssen zu 100% funktionsfähig sein, nicht nur vorbereitet!

- **Test-Implementierung Status:**
  - [ ] **Tests vollständig implementiert** (Service-Layer bevorzugt)
  - [ ] **Alle Tests bestehen** (npm test zeigt 100% Pass-Rate)
  - [ ] **CRUD Operations getestet** (Create, Read, Update, Delete)
  - [ ] **Filter- und Suchfunktionalität getestet**
  - [ ] **Multi-Tenancy isoliert** (Organization-spezifische Daten)

- **Test-Kategorien (Alle müssen funktionieren):**
  - [ ] **Boilerplate CRUD:** Erstellen, Laden, Bearbeiten, Löschen
  - [ ] **Kategorisierung:** Filter nach Kategorie funktional
  - [ ] **Sichtbarkeitslogik:** Global vs. kundenspezifische Bausteine
  - [ ] **Such- und Filterfunktionen:** Textsuche, Sprachfilter
  - [ ] **Variables-System:** Platzhalter-Erkennung und -Einfügung
  - [ ] **Migration Logic:** User-zu-Organization Migration

- **Test-Infrastruktur Requirements:**
  - [ ] **Firebase Mock:** Firestore-Service vollständig gemockt
  - [ ] **Organization Context:** Multi-Tenancy-Isolation getestet
  - [ ] **Rich Text Editor:** Content-Handling ohne UI-Dependencies

- **User-Test-Anleitung (Production Verification):**
  1. Navigiere zu `/dashboard/pr-tools/boilerplates`
  2. Klicke "Baustein erstellen" 
  3. Fülle Name: "Test Baustein", Kategorie: "Unternehmen", Inhalt: "Test Text {{company_name}}" aus
  4. Klicke "Variablen einfügen" und wähle eine Variable
  5. Speichere den Baustein
  6. **Erfolg:** Baustein erscheint in der Liste mit korrekter Kategorisierung
  7. Teste Filter: Wähle Kategorie "Unternehmen" im Filter-Popover
  8. **Erfolg:** Nur Unternehmens-Bausteine werden angezeigt
  9. Teste Suche: Gib "Test" in Suchfeld ein
  10. **Erfolg:** Gefilterte Ergebnisse zeigen nur passende Bausteine

**🚨 KEINE AUSNAHMEN:** Alle Tests müssen 100% bestehen!

---
**Bearbeitet am:** 2025-08-09  
**Status:** ✅ Fertig