# Feature-Dokumentation: Freigaben-Center (Approvals)

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
Das Freigaben-Center ist eine zentrale Komponente für den Approval-Workflow von Pressemitteilungen. Es ermöglicht Agenturen, Kampagnen zur Kundenfreigabe zu senden und den gesamten Freigabeprozess zentral zu verwalten. Kunden können über einen öffentlichen Link (ohne Login) Pressemitteilungen prüfen, freigeben oder Änderungen anfordern.

## 📍 Navigation & Zugriff
- **Menüpfad:** Dashboard > PR-Tools > Freigaben
- **Route:** `/dashboard/pr-tools/approvals`
- **Öffentliche Freigabe-Seite:** `/freigabe/[shareId]`
- **Berechtigungen:** Alle angemeldeten Benutzer der Organisation haben Zugriff auf das Freigaben-Center

## 🧹 Clean-Code-Checkliste (Realistisch)
- [x] Alle console.log(), console.error() etc. entfernt (außer notwendige Error-Logs)
- [x] Offensichtliche Debug-Kommentare entfernt (TODO, FIXME)
- [x] Tote Importe entfernt (von TypeScript erkannt)
- [x] Ungenutzte Variablen gelöscht (von Linter markiert)
- [x] **Dokumentation:**
  - [x] Komplexe Business-Logik kommentiert
  - [x] Veraltete Kommentare im aktuellen Feature entfernt
- [x] **Dateien im Feature-Ordner geprüft:**
  - [x] Offensichtlich ungenutzte Dateien identifiziert
  - [x] README.md dokumentiert offene Punkte und Roadmap

## 🏗️ Code-Struktur (Realistisch)
- [x] **Typen-Organisation:**
  - [x] Lokale Interface/Type Definitionen gefunden: ApprovalEnhanced, ApprovalStatus, ApprovalFilters etc. in `/types/approvals.ts`
  - [x] Typen sind bereits gut organisiert in separater Datei
- [x] **Offensichtliche Verbesserungen:**
  - [x] Icons auf @heroicons/react/24/outline umgestellt (Design Pattern Compliance)
  - [x] SKAMP zu CeleroPress geändert
  - [x] Schatten-Effekte bei Media Gallery entfernt
- [x] **Datei-Organisation:**
  - [x] Aktuelle Struktur: `/app/dashboard/pr-tools/approvals/` mit page.tsx und [shareId]/page.tsx
  - [x] Service in `/lib/firebase/approval-service.ts`
  - [x] Typen in `/types/approvals.ts`

## 📋 Feature-Beschreibung
### Zweck
Das Freigaben-Center ermöglicht eine strukturierte Kundenfreigabe für PR-Kampagnen. Agenturen können Kampagnen zur Freigabe senden, Kunden können diese ohne Login über einen sicheren Link prüfen und entscheiden.

### Hauptfunktionen
1. **Zentrale Freigaben-Übersicht** - Alle ausstehenden und bearbeiteten Freigaben an einem Ort
2. **Filter & Suche** - Nach Status, Kunde, Priorität und weiteren Kriterien filtern
3. **Öffentliche Freigabe-Seite** - Kunden-freundliche Ansicht ohne Login-Zwang
4. **Feedback-System** - Vollständige Historie aller Kommentare und Status-Änderungen
5. **Multi-Approval-Support** - Mehrere Freigeber pro Kampagne möglich
6. **Erinnerungen & Benachrichtigungen** - Automatische Reminder bei ausstehenden Freigaben
7. **Analytics & Tracking** - Verfolgung von Link-Aufrufen und Bearbeitungszeiten

### Workflow
1. **Kampagnen-Erstellung:** Agentur erstellt Pressemitteilung in Kampagnen-Bereich
2. **Freigabe anfordern:** "Freigabe anfordern" Button in Kampagnen-Detail oder beim Speichern
3. **Freigabe-Link generiert:** System erstellt eindeutigen, sicheren Link
4. **Kunde-Benachrichtigung:** E-Mail mit Link an Kunden (geplant)
5. **Kunde-Prüfung:** Kunde öffnet Link, prüft Inhalt und Medien
6. **Entscheidung:** Freigabe erteilen oder Änderungen anfordern
7. **Status-Update:** Agentur sieht Status-Änderung in Echtzeit
8. **Weiteres Vorgehen:** Bei Änderungen → Überarbeitung → erneute Freigabe, bei Freigabe → Versand

## 🔧 Technische Details
### Komponenten-Struktur
```
- ApprovalsPage (Hauptseite)
  - Alert (Benachrichtigungen)
  - Stats Cards (Übersicht-Karten)
  - SearchInput & Filter-Popover
  - ApprovalsList (Tabelle)
  - FeedbackHistoryModal
  - Pagination
- ApprovalPage (Öffentliche Freigabe-Seite)
  - MediaGallery (Angehängte Medien)
  - RecipientStatus (Multi-Approval Status)
  - ContentDisplay (HTML-Inhalt)
  - ActionButtons (Freigabe/Änderungen)
```

### State Management
- **Lokaler State:** Filter-Zustände, Pagination, Modal-Visibility, Form-Daten
- **Global State:** Organization Context (Team-Zugehörigkeit)
- **Server State:** Approvals werden direkt über Firebase Service geladen

### API-Endpunkte
| Methode | Service-Funktion | Zweck | Response |
|---------|-----------------|-------|----------|
| GET | approvalService.searchEnhanced() | Freigaben mit Filtern laden | ApprovalListView[] |
| GET | approvalService.getByShareId() | Freigabe per shareId laden | ApprovalEnhanced |
| POST | approvalService.create() | Neue Freigabe erstellen | string (ID) |
| PUT | approvalService.submitDecision() | Freigabe-Entscheidung | void |
| PUT | approvalService.requestChanges() | Änderungen anfordern | void |
| PUT | approvalService.markAsViewed() | Als angesehen markieren | void |

### Datenmodelle
```typescript
interface ApprovalEnhanced extends BaseEntity {
  title: string;
  campaignId: string;
  clientName: string;
  recipients: ApprovalRecipient[];
  content: { html: string; plainText?: string };
  status: ApprovalStatus;
  workflow: ApprovalWorkflow;
  shareId: string;
  shareSettings: { requirePassword: boolean; accessLog: boolean };
  history: ApprovalHistoryEntry[];
  analytics: { totalViews: number; uniqueViews: number };
  // ... weitere Felder
}

type ApprovalStatus = 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested' | 'completed';
```

### Externe Abhängigkeiten
- **Libraries:** @headlessui/react (Popover), clsx (Styling), nanoid (ID-Generation)
- **Services:** Firebase Firestore, approvalService, companiesEnhancedService, mediaService, brandingService
- **Assets:** Heroicons (24/outline), CeleroPress Logo

## 🔄 Datenfluss
```
User Action (Filter/Search) → loadApprovals() → approvalService.searchEnhanced() → Firebase Query → State Update → UI Update

Freigabe-Link öffnen → loadApproval() → approvalService.getByShareId() → Campaign & Media Loading → UI Render

Kunde-Entscheidung → handleApprove/handleRequestChanges → submitDecision/requestChanges → History Update → Status Change
```

Der Datenfluss folgt einem Standard React-Pattern mit async Service-Calls und lokalem State-Management. Die öffentliche Freigabe-Seite arbeitet ohne Authentication und lädt Daten über die eindeutige shareId.

## 🔗 Abhängigkeiten zu anderen Features
- **Nutzt:** 
  - Kampagnen-System (PR-Campaigns) für Content und Metadaten
  - Medien-Bibliothek für angehängte Assets
  - CRM-System für Kunden-Informationen
  - Branding-Service für Logo und Firmeninfo
- **Wird genutzt von:** 
  - Kampagnen-Detail-Seiten (Freigabe anfordern Button)
  - E-Mail-Versand-System (Nach Freigabe automatisch senden)
- **Gemeinsame Komponenten:** 
  - UI-Komponenten (Button, Badge, Dialog, Dropdown)
  - Alert-System und useAlert Hook

## ⚠️ Bekannte Probleme & TODOs
- [ ] E-Mail-Benachrichtigungen noch nicht implementiert (Priorität: HOCH)
- [ ] Passwortschutz für Freigabe-Links geplant
- [ ] QR-Code Generator für Links fehlt
- [ ] Inline-Kommentare (Google Docs Style) geplant
- [ ] PDF-Export mit Freigabe-Stempel fehlt
- [ ] Mobile Optimierung der Freigabe-Seite verbesserbar

## 🎨 UI/UX Hinweise
- **Design-Patterns:** Folgt CeleroPress Design System v2.0
- **Icons:** Alle @heroicons/react/24/outline (korrekt implementiert)
- **Responsive:** Desktop-optimiert, Mobile-Verbesserungen geplant
- **Accessibility:** Grundlegende ARIA-Labels, Keyboard-Navigation vorhanden

### 🎨 CeleroPress Design System Standards

#### Branding & Naming
- [x] **CeleroPress** statt "SKAMP" konsistent verwendet
- [x] Domain: https://www.celeropress.com/
- [x] Korrekte Schreibweise in Footer und UI-Elementen

#### Icons & Farben
- [x] **Icons:** @heroicons/react/24/outline konsistent verwendet
- [x] **Primary-Farbe:** `bg-[#005fab] hover:bg-[#004a8c]` für Hauptaktionen
- [x] **Status-Farben:** Korrekte Badge-Farben für verschiedene Approval-Status

#### Komponenten-Patterns
- [x] **Filter-Popover:** Standard-Pattern mit Badge-Zähler
- [x] **Status-Cards:** Kompakte Darstellung mit Icons
- [x] **Tabellen-Layout:** Responsive Grid mit Hover-Effekten
- [x] **Modal-Dialoge:** Standard DialogTitle/Body/Actions Pattern

## 📊 Performance (Wenn erkennbar)
- **Potenzielle Probleme:** 
  - Große Listen ohne Virtualisierung (Pagination implementiert)
  - Auto-Refresh alle 30 Sekunden könnte bei vielen Benutzern belastend sein
- **Vorhandene Optimierungen:** 
  - useMemo für gefilterte und paginierte Daten
  - useCallback für Event-Handler
  - Conditional Rendering für große Komponenten

## 🧪 Tests (Realistisch)
- **Tests gefunden:** Nein (keine Tests im __tests__ Ordner für Approvals)
- **Kritische Test-Szenarien:**
  - Freigabe-Workflow: Draft → Pending → Approved/Rejected → Completed
  - Filter-Funktionalität mit verschiedenen Kombinationen
  - Öffentliche Freigabe-Seite ohne Authentication
  - Multi-Approval Workflows mit mehreren Empfängern
  - Error-Handling bei ungültigen shareIds
- **Test-Priorität:** Hoch - Kritischer Business-Workflow, fehlerhafte Freigaben können rechtliche Probleme verursachen
- **User-Test-Anleitung:**
  1. Als Agentur: Kampagne erstellen und Freigabe anfordern
  2. Freigabe-Link öffnen (neuer Tab/Inkognito-Modus)
  3. Inhalt und Medien prüfen
  4. Freigabe erteilen ODER Änderungen mit Kommentar anfordern
  5. Zurück zum Freigaben-Center → Status sollte aktualisiert sein
  6. Bei Änderungen: Kampagne überarbeiten und erneut senden
  7. Erfolg: Kompletter Workflow ohne Fehler durchlaufen

---
**Bearbeitet am:** 2025-08-08
**Status:** ✅ Fertig