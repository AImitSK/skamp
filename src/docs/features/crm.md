# CRM - Contact Relationship Management

## 📋 Übersicht

Das CRM-Modul ist das Herzstück von SKAMP für die Verwaltung von Medienkontakten, Journalisten, Firmen und deren Beziehungen. Es bietet eine spezialisierte Lösung für PR-Profis zur effizienten Kontaktpflege.

**Hauptzweck:** Zentrale Verwaltung aller Kontakte und Firmen mit Fokus auf Medienbeziehungen und PR-relevante Informationen.

## ✅ Implementierte Funktionen

### Firmenverwaltung
- [x] **CRUD-Operationen** für Firmen
- [x] **Firmentypen**: Kunde, Lieferant, Partner, Verlag, Medienhaus, Agentur
- [x] **Medienhäuser-Features**:
  - Publikationsverwaltung (mehrere Publikationen pro Medienhaus)
  - Detaillierte Publikationsdaten (Typ, Format, Frequenz, Auflage)
  - Themenschwerpunkte pro Publikation
- [x] **Adressverwaltung** mit internationaler Unterstützung
- [x] **Social Media Profile** (LinkedIn, Twitter, Xing, etc.)
- [x] **Tag-System** mit Farbcodierung
- [x] **Notizen** für interne Anmerkungen

### Kontaktverwaltung
- [x] **CRUD-Operationen** für Personen
- [x] **Firmenzuordnung** mit Positions-Angabe
- [x] **Publikationszuordnung** für Journalisten (Mehrfachauswahl)
- [x] **Social Media Profile** pro Kontakt
- [x] **Tag-System** (gleiche Tags wie Firmen)
- [x] **Kommunikationspräferenzen** (bevorzugter Kanal, beste Zeit)

### Erweiterte Features
- [x] **CSV Import/Export** für Bulk-Operationen
- [x] **Erweiterte Filterung**:
  - Nach Firma
  - Nach Tags
  - Nach Typ (bei Firmen)
  - Nach Position (bei Kontakten)
  - Nach Publikationen
- [x] **Inline-Editing** für schnelle Änderungen
- [x] **Quick Preview** on Hover
- [x] **Bulk-Operationen** (Mehrfachauswahl & Löschen)
- [x] **Responsive Tabellen** mit Pagination
- [x] **Detailansichten** für Firmen und Kontakte

### UI/UX Features
- [x] Tab-basierte Navigation (Firmen/Personen)
- [x] Echtzeit-Suche
- [x] Multi-Select Dropdown-Filter
- [x] Toast-Benachrichtigungen
- [x] Keyboard Shortcuts (⌘S zum Speichern)
- [x] Animations & Transitions
- [x] Dark Mode Support

## 🚧 In Entwicklung

- [ ] **Erweiterte Publikations-Features** (Branch: feature/publications-enhanced)
  - Automatischer Import von Mediadaten
  - Reichweiten-Tracking
  - Themengebiete-Matching

## ❗ Dringend benötigt

### 1. **Aktivitäts-Historie / Kommunikations-Log** 🔴
**Beschreibung:** Alle Interaktionen mit einem Kontakt chronologisch erfassen
- E-Mails (Integration mit Kampagnen-Modul)
- Anrufe und Meetings
- Versendete Pressemeldungen
- Notizen und Follow-ups

**Technische Anforderungen:**
- Neue Collection: `communications`
- Timeline-View pro Kontakt
- Integration mit SendGrid Webhooks
- Activity-Types: email, call, meeting, note, campaign

**Geschätzter Aufwand:** 2-3 Wochen

### 2. **Dubletten-Erkennung** 🔴
**Beschreibung:** Automatische Erkennung von Duplikaten beim Import/Anlegen
- Fuzzy-Matching für Namen
- E-Mail-basierte Erkennung
- Merge-Funktionalität
- Import-Konflikt-Resolution

**Geschätzter Aufwand:** 1 Woche

### 3. **Erweiterte Suche & Gespeicherte Filter** 🟡
**Beschreibung:** 
- Volltextsuche über alle Felder
- Komplexe Filter-Kombinationen
- Speichern von Filter-Sets
- Suche in Notizen und Tags

**Geschätzter Aufwand:** 1 Woche

### 4. **Beziehungs-Management** 🟡
**Beschreibung:** Beziehungen zwischen Kontakten abbilden
- Kollegen-Verknüpfungen
- Hierarchien (Vorgesetzter/Mitarbeiter)
- Kontakt-Gruppen
- Visualisierung als Graph

**Geschätzter Aufwand:** 2 Wochen

## 💡 Nice to Have

### Import & Integration
- **LinkedIn Integration** für automatischen Kontakt-Import
- **Outlook/Gmail Kontakte-Sync**
- **Visitenkarten-Scanner** (OCR mit Google Vision API)
- **Xing API Integration**
- **Mediendatenbank-APIs** (Zimpel, Kress)

### Erweiterte Features
- **Kontakt-Scoring** basierend auf Interaktionen
- **Geburtstags-Reminder** mit Kalender-Integration
- **Automatische Anreicherung** (Company-Daten aus APIs)
- **E-Mail-Finder** (Hunter.io Integration)
- **Kontakt-Vorschläge** basierend auf Themengebieten

### Analyse & Reporting
- **Beziehungs-Heatmap** (wer wurde lange nicht kontaktiert)
- **Medienlisten-Generator** basierend auf Themen
- **Export-Templates** für verschiedene Formate
- **Kontakt-Statistiken** (Response-Raten, beste Kanäle)

### UI/UX Verbesserungen
- **Kanban-View** für Kontakt-Pipeline
- **Karten-Ansicht** für geografische Verteilung
- **Drag & Drop** für Tag-Zuordnung
- **Batch-Edit** Modal für Mehrfachänderungen
- **Erweiterte Keyboard-Navigation**

## 🔧 Technische Details

### Datenbank-Struktur

```typescript
// Firestore Collections
companies/
  {companyId}/
    - name: string
    - type: CompanyType
    - mediaInfo?: {
        publications: Publication[]
        mediaType: string
        // ...
      }
    - tagIds: string[]
    - userId: string

contacts/
  {contactId}/
    - firstName: string
    - lastName: string
    - companyId?: string
    - companyName?: string (denormalized)
    - mediaInfo?: {
        publications: string[] // Publikationsnamen
      }
    - tagIds: string[]
    - userId: string

tags/
  {tagId}/
    - name: string
    - color: TagColor
    - userId: string
```

### Verwendete Services

```typescript
// src/lib/firebase/crm-service.ts
- companiesService
- contactsService  
- tagsService
```

### API Endpoints

Aktuell nur Client-Side Firebase SDK. Geplant:
- `GET /api/contacts/search` - Erweiterte Suche
- `POST /api/contacts/import` - Bulk Import
- `GET /api/contacts/export` - Export mit Templates

### Komponenten-Struktur

```
src/app/dashboard/contacts/crm/
├── page.tsx              # Hauptseite mit Tabellen
├── CompanyModal.tsx      # Firmen-Formular
├── ContactModal.tsx      # Kontakt-Formular
├── ImportModal.tsx       # CSV-Import
└── companies/
    └── [companyId]/
        └── page.tsx      # Firmen-Detailseite
```

## 📊 Metriken & KPIs

- **Anzahl Kontakte:** Gesamt und nach Typ
- **Aktive Kontakte:** Interaktion in letzten 30 Tagen
- **Response-Rate:** Antworten auf Pressemeldungen
- **Kontakt-Qualität:** Vollständigkeit der Daten

## 🐛 Bekannte Probleme

1. **Performance bei >1000 Kontakten** 
   - Lösung: Virtualisierung implementieren

2. **Keine Offline-Funktionalität**
   - Lösung: Firebase Offline Persistence aktivieren

3. **Fehlende Validierung bei Publikations-Zuordnung**
   - Kontakte können Publikationen zugeordnet werden, die nicht mehr existieren

## 🔒 Sicherheit & Datenschutz

- Row-Level Security via `userId`
- Keine öffentlichen Kontaktdaten
- DSGVO-konformer Export
- Lösch-Funktionalität für "Recht auf Vergessenwerden"

## 📈 Zukünftige Entwicklung

### Phase 1 (Q1 2025)
- Aktivitäts-Historie
- Dubletten-Erkennung
- Gmail/Outlook Integration

### Phase 2 (Q2 2025)
- LinkedIn Import
- Kontakt-Scoring
- Erweiterte Analytics

### Phase 3 (Q3 2025)
- KI-basierte Kontakt-Vorschläge
- Automatische Anreicherung
- Multi-Tenant Fähigkeiten

## 📚 Weiterführende Dokumentation

- [Firestore Datenstruktur](../adr/0003-firestore-data-structure.md)
- [Import/Export Spezifikation](./import-export-spec.md)
- [Tag-System Konzept](./tag-system.md)