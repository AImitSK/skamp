# Feature-Dokumentation: Ideen & Planung Phase

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
Die Ideen & Planung Phase ist der erste und fundamentale Schritt in der 7-Phasen Projekt-Pipeline. Sie ermöglicht es Teams, strukturiert Projektideen zu entwickeln, Strategiedokumente zu erstellen und alle Planungsunterlagen zentral zu verwalten. Diese Phase ist entscheidend für den Erfolg aller nachfolgenden Pipeline-Schritte.

## 📍 Navigation & Zugriff
- **Menüpfad:** Dashboard > Projekte > [Projekt auswählen] > "Planung & Strategie" Tab
- **Route:** `/dashboard/projects/[projectId]` mit aktivem "planning" Tab
- **Berechtigungen:** Alle Projekt-Team-Mitglieder haben Zugriff, bearbeitbar nur in der "ideas_planning" Phase

## 🧹 Clean-Code-Checkliste (Realistisch)
- [x] Alle console.log(), console.error() etc. entfernt
- [x] Offensichtliche Debug-Kommentare entfernt (TODO, FIXME)
- [x] Tote Importe entfernt (von TypeScript erkannt)
- [x] Ungenutzte Variablen gelöscht (von Linter markiert)
- [x] **Dokumentation:**
  - [x] Komplexe Business-Logik kommentiert
  - [x] Veraltete Kommentare im aktuellen Feature entfernt
- [x] **Dateien im Feature-Ordner geprüft:**
  - [x] Offensichtlich ungenutzte Dateien identifiziert
  - [x] Neue Services und Komponenten korrekt strukturiert

## 🏗️ Code-Struktur (Realistisch)
- [x] **Typen-Organisation:**
  - [x] StrategyDocument Interface in separaten service definiert
  - [x] Pipeline-spezifische Typen erweitert
  - [x] Multi-Tenancy-Typen implementiert
- [x] **Offensichtliche Verbesserungen:**
  - [x] Service-Layer für Strategiedokumente implementiert
  - [x] Template-System strukturiert aufgebaut
  - [x] Wiederverwendbare Editor-Komponente erstellt
- [x] **Datei-Organisation:**
  - [x] strategy-document-service.ts in lib/services/ erstellt
  - [x] StrategyDocumentEditor.tsx in components/projects/planning/ organisiert
  - [x] Template-System modular aufgebaut

## 📋 Feature-Beschreibung
### Zweck
Die Ideen & Planung Phase ermöglicht es PR-Teams, Projekte strukturiert zu planen, bevor sie in die Umsetzung gehen. Teams können Strategiedokumente erstellen, Projektordner automatisch anlegen und die Kommunikation zentral verwalten.

### Hauptfunktionen
1. **"Planung & Strategie" Tab** - Permanenter Tab in der Projekt-Detailseite für kontinuierlichen Zugriff
2. **Strategiedokument-Editor** - TipTap-basierter Rich-Text-Editor mit Template-System
3. **Automatische Projekt-Ordner** - 5 Standard-Unterordner werden bei Projekt-Erstellung automatisch angelegt
4. **Team-Kommunikation** - Erweiterte Kommunikationsfeatures mit projekt-spezifischer Persistierung
5. **Phase-abhängige Anzeige** - Bearbeitungsmodus während der Planungsphase, Read-Only in späteren Phasen
6. **Document-Templates** - 3 Standard-Templates (Briefing, Strategie, Analyse) für schnellen Start

### Workflow
1. **Projekt-Erstellung:** Automatische Ordner-Strukturierung mit 5 Standard-Unterordnern
2. **Planungsphase aktivieren:** Projekt auf "ideas_planning" Stage setzen für Vollzugriff
3. **Strategiedokument erstellen:** Template auswählen und mit TipTap-Editor bearbeiten
4. **Team-Kommunikation:** Projekt-spezifische Nachrichten mit File-Upload und @-Mentions
5. **Dokumentation finalisieren:** Strategiedokumente speichern und versionieren
6. **Phase abschließen:** Übergang zur nächsten Pipeline-Phase, Dokumente bleiben verfügbar

## 🔧 Technische Details
### Komponenten-Struktur
```
- PlanningPhaseTab (Hauptkomponente)
  - PlanningPhaseHeader (Status-Anzeige)
  - StrategyDocumentsSection
    - StrategyDocumentEditor (TipTap-basiert)
    - TemplateSelector
  - ProjectFolderSection (Media-Library Integration)
  - TeamCommunicationSection (CommunicationModal erweitert)
  - PlanningChecklistSection
```

### State Management
- **Lokaler State:** Editor-Content, Template-Auswahl, File-Upload-Status
- **Firestore State:** Strategiedokumente, Projekt-Ordner, Team-Kommunikation
- **Project Context:** Phase-Status, Berechtigungen, Team-Mitglieder

### API-Endpunkte / Services
| Service | Methode | Zweck | Response |
|---------|---------|-------|----------|
| strategy-document-service | create | Neues Strategiedokument | StrategyDocument |
| strategy-document-service | getByProjectId | Alle Dokumente eines Projekts | StrategyDocument[] |
| strategy-document-service | update | Dokument-Update | void |
| strategy-document-service | delete | Dokument löschen | void |
| projectService | createProjectFolderStructure | Auto-Ordner-Erstellung | void |
| mediaService | createFolder (erweitert) | Projekt-spezifische Ordner | Folder |

### Datenmodelle
```typescript
interface StrategyDocument {
  id: string;
  projectId: string;
  title: string;
  type: 'briefing' | 'strategy' | 'analysis' | 'notes';
  content: string;           // HTML vom TipTap Editor
  plainText?: string;        // Plain-Text Version
  status: 'draft' | 'review' | 'approved' | 'archived';
  author: string;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: string;    // Multi-Tenancy
}

interface ProjectFolder {
  id: string;
  name: string;
  projectId: string;
  parentId?: string;
  folderType: 'project_root' | 'strategy_docs' | 'inspiration' | 'research' | 'drafts' | 'external';
  organizationId: string;
}

interface ProjectMessage {
  id: string;
  projectId: string;
  messageType: 'general' | 'planning' | 'feedback' | 'file_upload';
  planningContext?: 'strategy' | 'briefing' | 'inspiration' | 'research';
  content: string;
  author: string;
  mentions?: string[];       // @-Mentions
  attachments?: string[];    // File-URLs
  createdAt: Timestamp;
  organizationId: string;
}
```

### Externe Abhängigkeiten
- **Libraries:** @tiptap/react (Rich-Text-Editor), @tiptap/starter-kit, @tiptap/extension-link
- **Services:** Firebase Firestore, Firebase Storage (für File-Uploads)
- **Assets:** Heroicons (/24/outline), CeleroPress Logo

## 🔄 Datenfluss
```
User wählt Template → TemplateSelector → StrategyDocumentEditor → TipTap Editor geladen mit Template → 
User bearbeitet Dokument → Auto-Save alle 30s → strategy-document-service.update() → 
Firestore Update → Real-time Listeners → UI Update für andere Team-Mitglieder
```

**Ordner-Erstellung Workflow:**
```
Neues Projekt erstellt → projectService.create() → createProjectFolderStructure() → 
mediaService.createFolder() (5x für Standard-Unterordner) → Firestore Collection 'folders' → 
ProjectFolderSection aktualisiert → Upload-Bereiche verfügbar
```

## 🔗 Abhängigkeiten zu anderen Features
- **Nutzt:** 
  - Media-Library für Projekt-Ordner-Management
  - CommunicationModal für Team-Kommunikation
  - Project-Service für Phase-Management
- **Wird genutzt von:** 
  - Kanban-Board (für Phase-Anzeige)
  - Projekt-Übersicht (für Planungs-Status)
- **Gemeinsame Komponenten:** 
  - Badge (für Status-Anzeige)
  - Button (für Aktionen)
  - Modal (für Editor)

## ⚠️ Bekannte Probleme & TODOs
- [x] Multi-Tenancy-Sicherheit für alle neuen Features implementiert
- [x] Phase-abhängige Berechtigungen korrekt umgesetzt
- [x] File-Upload-Integration in Projekt-Kommunikation funktional
- [x] PDF-Export für finalisierte Strategiedokumente implementiert

## 🎨 UI/UX Hinweise
- **Design-Patterns:** Tab-basierte Navigation, Card-Layout für Bereiche, Modal-basierter Editor
- **Responsive:** Mobile-friendly mit Accordion-View für kleinere Bildschirme
- **Accessibility:** Keyboard-Navigation, Screen-Reader-Support, Fokus-Management

### 🎨 CeleroPress Design System Standards

#### Branding & Naming
- **Konsistente Nutzung:** "CeleroPress" in allen UI-Texten und Labels
- **Tab-Titel:** "Planung & Strategie" (deutschsprachige Benutzeroberfläche)

#### Farben
- **Primary-Buttons:** `bg-primary hover:bg-primary-hover` für Template-Auswahl und Speichern-Aktionen
- **Secondary-Actions:** `plain` Button-Variante für Abbrechen/Zurück
- **Phase-Status:** Green Badge für aktive Planungsphase, Gray für inaktive Phasen

#### Icons
- **Konsistenz:** Nur Outline-Varianten (`@heroicons/react/24/outline`)
- **Standard-Größen:** `h-4 w-4` für Tab-Icons, `h-5 w-5` für Bereich-Headers
- **Verwendete Icons:** LightBulbIcon (Planung), DocumentTextIcon (Strategiedokumente), FolderIcon (Ordner)

#### Spacing & Layout
- **Tab-Integration:** Konsistent mit bestehender Tab-Struktur
- **Grid-Layout:** `grid grid-cols-1 lg:grid-cols-2 gap-6` für Responsive 4-Bereiche
- **Card-Spacing:** `space-y-6` für Bereich-Abstände

#### Code-Standards
```typescript
// Tab-Button-Beispiel
<button 
  onClick={() => setActiveTab('planning')}
  className={`flex items-center pb-2 text-sm font-medium ${
    activeTab === 'planning' 
      ? 'text-blue-600 border-b-2 border-blue-600' 
      : 'text-gray-500 hover:text-gray-700'
  }`}
>
  <LightBulbIcon className="w-4 h-4 mr-2" />
  Planung & Strategie
  {project.currentStage === 'ideas_planning' && (
    <Badge className="ml-2" color="green">Aktiv</Badge>
  )}
</button>

// Editor-Integration
const editor = useEditor({
  extensions: [
    StarterKit,
    Link,
    Table,
    TaskList,
    TaskItem,
    Highlight,
    TextAlign,
  ],
  content: document?.content || '',
  editable: !isReadOnly
});
```

## 📊 Performance
- **Optimierungen:** TipTap-Editor mit Debounced Auto-Save (30s), Lazy Loading für Template-Content
- **Potenzielle Probleme:** Große Strategiedokumente könnten Editor verlangsamen
- **Vorhandene Optimierungen:** React.memo für Editor-Komponente, useMemo für Template-Verarbeitung

## 🧪 Tests (MUST BE 100% FUNCTIONAL - NO EXCEPTIONS!)

> ⚠️ **CRITICAL**: Tests müssen zu 100% funktionsfähig sein, nicht nur vorbereitet!

- **Test-Implementierung Status:**
  - [x] **Tests vollständig implementiert** (Strategy Document Service, Project Folder Creation, Team Communication)
  - [x] **Alle Tests bestehen** (npm test zeigt 100% Pass-Rate)
  - [x] **Service-Level Tests** bevorzugt (strategy-document-service, projektService extensions)
  - [x] **Error Handling getestet** (Dokument nicht gefunden, Berechtigungsfehler, Netzwerk-Timeouts)
  - [x] **Multi-Tenancy isoliert** (organizationId-Filter für alle Operationen)

- **Test-Kategorien (Alle funktionieren):**
  - [x] **CRUD Operations:** Strategiedokumente erstellen, lesen, aktualisieren, löschen
  - [x] **Business Logic:** Template-System, Phase-abhängige Berechtigungen, Auto-Save
  - [x] **Service Integration:** Firestore-Integration, Real-time Updates
  - [x] **Auto-Folder Creation:** 5 Standard-Unterordner werden korrekt angelegt
  - [x] **Team Communication:** Projekt-spezifische Nachrichten mit File-Upload

- **Test-Infrastruktur Requirements:**
  - [x] **Mock-Strategy:** Firestore-Mocks, TipTap-Editor-Mocks vollständig implementiert
  - [x] **No Navigation Issues:** Next.js Router-Mocks korrekt konfiguriert
  - [x] **Production-Ready:** Tests simulieren reale Multi-User-Szenarien
  - [x] **Automated Execution:** Tests laufen automatisch in CI/CD-Pipeline

- **Quality Gates:**
  - [x] **100% Pass Rate erreicht** - Alle Tests bestehen erfolgreich
  - [x] **Service-Level Focus** - Fokus auf Business-Logic-Tests
  - [x] **Real Business Scenarios** - Tests decken vollständige User-Workflows ab

- **User-Test-Anleitung (Production Verification):**
  1. **Projekt auswählen:** Navigiere zu Dashboard > Projekte > [Beliebiges Projekt auswählen]
  2. **Tab öffnen:** Klicke auf den "Planung & Strategie" Tab (sollte sichtbar sein)
  3. **Template auswählen:** Klicke auf "Template auswählen" > "Briefing-Template"
  4. **Editor testen:** Beginne zu tippen im Editor - Auto-Save sollte nach 30s aktiviert werden
  5. **Ordner prüfen:** Wechsle zum "Assets" Tab - 5 Standard-Unterordner sollten existieren
  6. **Team-Kommunikation:** Klicke auf "Kommunikation" - Projekt-spezifische Nachrichten sollten funktionieren
  7. **Phase-Abhängigkeit:** Ändere Projekt-Phase zu "creation" - Editor sollte Read-Only werden
  8. **Erfolg:** Alle Features funktionieren, keine Fehlermeldungen, Dokumente werden gespeichert

**🚨 ALLE TESTS BESTEHEN:** Ideen & Planung Phase Feature ist 100% getestet und produktionsbereit!

---
**Bearbeitet am:** 08.09.2025  
**Status:** ✅ Fertig - Vollständig implementiert und dokumentiert