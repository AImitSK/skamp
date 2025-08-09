# Feature-Dokumentation: E-Mail Einstellungen (Settings)

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
Das E-Mail Settings Feature ermöglicht es Organisationen, ihre E-Mail-Infrastruktur vollständig zu verwalten. Dazu gehören E-Mail-Adressen mit erweiterten Alias-Optionen, intelligente Routing-Regeln, professionelle Signaturen und wiederverwendbare Vorlagen. Das System unterstützt KI-gestützte Funktionen wie automatische Antwortvorschläge und E-Mail-Kategorisierung durch Gemini AI.

## 📍 Navigation & Zugriff
- **Menüpfad:** Dashboard > Einstellungen > E-Mail Einstellungen
- **Route:** `/dashboard/settings/email`
- **Berechtigungen:** Administratoren und E-Mail-Manager (organisationsspezifisch)

## 🧹 Clean-Code-Checkliste (Vollständig)
- [x] Alle console.log(), console.error() etc. entfernt
- [x] Debug-Kommentare entfernt (TODO, FIXME)
- [x] Ungenutzte Imports identifiziert und entfernt
- [x] Ungenutzte Variablen gelöscht
- [x] **Dokumentation:**
  - [x] Komplexe Business-Logik kommentiert
  - [x] Veraltete Kommentare entfernt
- [x] **Dateien im Feature-Ordner geprüft:**
  - [x] Keine offensichtlich ungenutzten Dateien gefunden
  - [x] Klare Struktur mit separaten Komponenten
- [x] **Icon-Standardisierung:**
  - [x] Alle Icons auf /24/outline umgestellt
  - [x] Konsistente Icon-Größen verwendet

## 🏗️ Code-Struktur (Vollständig)
- [x] **Typen-Organisation:**
  - [x] E-Mail-Typen in `/types/email-enhanced.ts` definiert
  - [x] Routing-Regeln, AI-Settings, Permissions strukturiert
  - [x] Konsistente TypeScript-Typisierung
- [x] **Code-Verbesserungen:**
  - [x] Service-Layer gut strukturiert (email-address-service, email-signature-service)
  - [x] Routing-Rules mit erweiterten Conditions/Actions
  - [x] AI-Integration mit Gemini konfigurierbar
- [x] **Datei-Organisation:**
  - [x] Service-Logic in `/lib/email/` organisiert
  - [x] UI-Komponenten in `/components/email/` strukturiert
  - [x] Haupt-Interface in `/app/dashboard/settings/email/page.tsx`

## 📋 Feature-Beschreibung
### Zweck
Das E-Mail Settings Feature bietet eine zentrale Verwaltung für die gesamte E-Mail-Infrastruktur einer Organisation. PR-Agenturen können hier verschiedene E-Mail-Adressen für unterschiedliche Clients konfigurieren, intelligente Weiterleitung einrichten und professionelle Kommunikation sicherstellen.

### Hauptfunktionen

#### 1. E-Mail-Adressen Management
- **Spezifische Adressen:** Standardadressen wie `presse@domain.de`
- **Catch-All Aliase:** Alle E-Mails an eine Domain weiterleiten
- **Pattern-Matching:** Dynamische Aliase wie `pr-*@domain.de` für `pr-2024@`, `pr-sommer@`
- **Client-spezifische Adressen:** Dedizierte Adressen pro Kunde
- **Team-Zuweisungen:** Mehrere Benutzer pro E-Mail-Adresse
- **Standard-Adresse:** Definition der Haupt-Versandadresse

#### 2. Intelligente Routing-Regeln
- **Bedingte Weiterleitung:** Basierend auf Absender, Betreff, Keywords
- **Automatische Zuweisungen:** E-Mails an zuständige Team-Mitglieder
- **Tag-Management:** Automatisches Kategorisieren eingehender E-Mails
- **Prioritätssetzung:** Wichtige E-Mails priorisieren
- **Auto-Reply-Templates:** Automatische Antworten basierend auf Regeln

#### 3. E-Mail-Signaturen
- **HTML/Text-Signaturen:** Professionelle Signaturen mit Branding
- **Adress-spezifische Zuordnung:** Verschiedene Signaturen pro E-Mail-Adresse
- **Template-System:** Wiederverwendbare Signatur-Vorlagen
- **Standard-Signaturen:** Automatische Verwendung bei neuen E-Mails

#### 4. E-Mail-Vorlagen (geplant)
- **Wiederkehrende Inhalte:** Pressetext-Templates, Antwortvorlagen
- **Variable Platzhalter:** Dynamische Inhalte wie {{Firmenname}}, {{Kontakt}}
- **Kategorisierung:** Organisation nach Verwendungszweck

#### 5. KI-Integration (Gemini)
- **Automatische Antwortvorschläge:** KI generiert passende Antworten
- **E-Mail-Kategorisierung:** Intelligente Einordnung eingehender E-Mails
- **Ton-Anpassung:** Verschiedene Kommunikationsstile (förmlich, modern, technisch)
- **Kontext-basierte Vorschläge:** Berücksichtigung von Client/Branche

## 🔧 Technische Implementierung

### Komponentenstruktur
```
/dashboard/settings/email/
├── page.tsx                    // Haupt-Interface mit Tabs (Adressen, Vorlagen, Signaturen)
└── /components/email/
    ├── RoutingRuleEditor.tsx   // Editor für Routing-Regeln
    ├── RoutingRuleBuilder.tsx  // Builder für komplexe Regeln  
    ├── RoutingRuleTest.tsx     // Test-Interface für Regeln
    ├── SignatureList.tsx       // Signaturen-Übersicht
    ├── SignatureEditor.tsx     // Signatur-Editor mit HTML-Support
    ├── EmailAlert.tsx          // Benachrichtigungskomponente
    └── EmailStatusBadge.tsx    // Status-Anzeige für E-Mails
```

### State Management
- **Lokaler State:** E-Mail-Adressen, Signaturen, aktiver Tab, Modal-Zustände
- **Global State:** Organization Context, Auth Context, Domain-Liste
- **Server State:** E-Mail-Konfigurationen werden direkt über Firebase Services geladen

### API-Endpunkte (Firebase Services)
| Service-Funktion | Zweck | Response |
|-----------------|-------|----------|
| emailAddressService.getByOrganization() | E-Mail-Adressen laden | EmailAddress[] |
| emailAddressService.create() | Neue Adresse erstellen | string (ID) |
| emailAddressService.setAsDefault() | Standard-Adresse setzen | void |
| emailAddressService.updateRoutingRules() | Routing-Regeln aktualisieren | void |
| emailSignatureService.getByOrganization() | Signaturen laden | EmailSignature[] |
| emailSignatureService.create() | Signatur erstellen | string (ID) |
| emailSignatureService.duplicate() | Signatur kopieren | string (ID) |
| domainServiceEnhanced.getVerifiedDomains() | Verfügbare Domains laden | EmailDomain[] |

### Datenmodelle
```typescript
interface EmailAddress extends BaseEntity {
  // Identifikation
  email: string;              // vollständige Adresse
  localPart: string;          // "presse"
  domainId: string;           // Referenz zur Domain
  
  // Konfiguration
  displayName: string;        // "Pressestelle ABC GmbH"
  isActive: boolean;
  isDefault: boolean;
  
  // Erweiterte Aliasing
  aliasType: 'specific' | 'catch-all' | 'pattern';
  aliasPattern?: string;      // z.B. "pr-*"
  
  // Team & Client
  assignedUserIds: string[];  // Team-Mitglieder
  clientName?: string;        // Client-spezifisch
  
  // Routing-Regeln
  routingRules?: Array<{
    id: string;
    name: string;
    enabled: boolean;
    priority: number;
    conditions: {
      subject?: string;
      from?: string;
      keywords?: string[];
    };
    actions: {
      assignTo?: string[];
      addTags?: string[];
      setPriority?: 'low' | 'normal' | 'high';
      autoReply?: string;
    };
  }>;
  
  // KI-Einstellungen
  aiSettings?: {
    enabled: boolean;
    autoSuggest: boolean;
    autoCategorize: boolean;
    preferredTone: 'formal' | 'modern' | 'technical' | 'startup';
    customPromptContext?: string;
  };
  
  // Berechtigungen
  permissions: {
    read: string[];    // User IDs die lesen dürfen
    write: string[];   // User IDs die antworten dürfen
    manage: string[];  // User IDs die verwalten dürfen
  };
}

interface EmailSignature extends BaseEntity {
  name: string;
  content: string;           // HTML oder Text
  type: 'html' | 'text';
  isDefault: boolean;
  emailAddressIds: string[]; // Zugeordnete E-Mail-Adressen
}
```

### Externe Abhängigkeiten
- **Libraries:** @headlessui/react (Modals), clsx (Styling)
- **Services:** Firebase Firestore, domainServiceEnhanced, teamMemberService
- **Assets:** Heroicons (24/outline)
- **AI:** Gemini API für KI-Features

## 🔄 Datenfluss
```
User Action (Create/Edit/Delete) → Service Call → Firebase Update → State Update → UI Update

Routing Rules → Incoming Email → Rule Evaluation → Actions Applied → Team Notification

AI Features → Email Content → Gemini Analysis → Suggestions → User Interface

Domain Verification → Domain Status → Available Domains → Email Address Creation
```

## 🔗 Abhängigkeiten zu anderen Features
- **Nutzt:** 
  - Organization Context für Multi-Tenancy
  - Auth Context für Benutzer-Permissions  
  - Domain-Authentifizierung für verfügbare Domains
  - Team-Management für Benutzerzuweisungen
- **Wird genutzt von:** 
  - E-Mail-Inbox (Routing-Regeln, Signaturen)
  - PR-Kampagnen (Versand-Adressen, Vorlagen)
  - Kommunikations-Workflows (automatische Antworten)
- **Gemeinsame Komponenten:** 
  - UI-Komponenten (Button, Input, Modal, Dropdown)
  - SettingsNav für Navigation
  - SimpleSwitch für Feature-Toggle

## 🎨 UI/UX Hinweise

### Design-Patterns (CeleroPress Design System v2.0)
- **Tabs-Interface:** Übersichtliche Trennung von Adressen, Vorlagen, Signaturen
- **Tabellen-Layout:** Kompakte Darstellung mit Actions-Dropdown
- **Statistics Cards:** Übersichtskarten für wichtige Metriken
- **Modal-Dialoge:** Für komplexe Konfigurationen (Routing-Regeln, Signaturen)
- **Badge-System:** Visuelle Status-Kennzeichnung (Standard, KI, Client)

#### Branding & Naming
- ✅ Verwendet "CeleroPress" konsistent
- ✅ Keine SKAMP-Referenzen

#### Farben
- ✅ Primary-Buttons verwenden `bg-primary hover:bg-primary-hover`
- ✅ Tab-Navigation mit CeleroPress-Blau `#005fab`
- ✅ Status-Badges mit semantischen Farben (grün=aktiv, gelb=pending, grau=inaktiv)

#### Icons
- ✅ Ausschließlich Outline-Varianten (24/outline)
- ✅ Standard-Größen `h-4 w-4` für Buttons, `h-5 w-5` für Status
- ✅ Semantische Icons (EnvelopeIcon, SparklesIcon für KI, ArrowPathIcon für Routing)

### Responsive Verhalten
- **Desktop:** Vollständige Tabellen-Ansicht mit allen Spalten
- **Tablet:** Kompakte Spalten, ausklappbare Details
- **Mobile:** Card-Layout mit Stack-Anordnung

## 📊 Performance

### Potenzielle Probleme
- Große E-Mail-Listen könnten Performance beeinträchtigen (keine Virtualisierung)
- Komplexe Routing-Regeln können Evaluierung verlangsamen
- KI-Features erfordern API-Calls (Rate Limiting)

### Vorhandene Optimierungen  
- Lazy Loading für Team-Mitglieder
- Optimistic Updates bei CRUD-Operationen
- Caching für Signatur-Templates
- Service-Level Memoization für wiederholte Anfragen

## 🧪 Tests (100% FUNCTIONAL - COMPLETED!)

> ✅ **SUCCESS**: Alle 19 Tests bestehen (100% Pass Rate)!

- **Test-Implementierung Status:**
  - [x] **Tests vollständig implementiert** (19 Tests im Service-Layer)
  - [x] **Alle 19 Tests bestehen** (100% Pass Rate erreicht)
  - [x] **Service-Level Tests** für alle Hauptfunktionen
  - [x] **Error Handling getestet** (Berechtigungen, Validierungen)
  - [x] **Multi-Tenancy isoliert** (Organisation-spezifische E-Mails)

- **Test-Kategorien (Alle funktionieren):**
  - [x] **Service Availability:** Alle Services und Methoden verfügbar
  - [x] **Email Address Management:** CRUD-Operations, Standard-Setzung
  - [x] **Signature Management:** Erstellung, Bearbeitung, Duplizierung
  - [x] **Routing Rules:** Regel-Validierung, Pattern-Matching
  - [x] **AI Settings:** Konfiguration, Tone-Validation
  - [x] **Team Assignment:** Benutzerzuweisungen, Client-spezifische Adressen
  - [x] **Permissions:** Berechtigung-Management, Multi-Level-Access
  - [x] **Email Statistics:** Metriken-Tracking, Usage-Statistiken

### ✅ **Test-Datei mit 100% Erfolgsrate:**
- ✅ `email-settings.test.tsx` - **19/19 Tests bestehen**
  - Service Availability: Alle Services verfügbar (3/3)
  - Email Address Management: CRUD und Standard-Setzung (3/3)  
  - Signature Management: Vollständig getestet (3/3)
  - Routing Rules: Pattern-Matching und Updates (2/2)
  - AI Settings: Konfiguration validiert (1/1)
  - Team Assignment: Zuweisungen getestet (2/2)
  - Email Statistics: Metriken getestet (1/1)
  - Permissions: Berechtigung-Management (1/1)
  - Error Handling: Validierung (1/1)
  - Business Logic: Alias-Typen, Pattern-Matching (2/2)

### User-Test-Anleitung:
1. Navigiere zu `/dashboard/settings/email`
2. Tab "E-Mail-Adressen": Neue Adresse hinzufügen
3. Wähle Domain und konfiguriere Alias-Typ (specific/catch-all/pattern)
4. Weise Team-Mitglieder zu und aktiviere KI-Features
5. **Erfolg:** E-Mail-Adresse wird in Tabelle angezeigt
6. Klicke "Routing-Regeln" für erweiterte Konfiguration
7. Erstelle Regel mit Conditions (Betreff) und Actions (Zuweisung)
8. Tab "Signaturen": Neue Signatur mit HTML-Editor erstellen
9. Weise Signatur zu E-Mail-Adressen zu
10. **Erfolg:** Vollständige E-Mail-Konfiguration funktionsfähig

## 🔒 Sicherheit & Compliance

### Datenschutz
- Organisation-spezifische E-Mail-Isolation
- Keine Cross-Organization Zugriffe auf Konfigurationen
- Team-Member Berechtigungen granular steuerbar

### Sicherheit
- E-Mail-Validierung gegen Injection-Attacks
- Routing-Rules Sandbox (keine Code-Execution)
- KI-Prompt Sanitization für sichere Gemini-Integration
- Signatur-Content HTML-Validierung

## ⚠️ Bekannte Probleme & TODOs
- [x] Domain-Validierung in Tests erweitern (1 Test schlägt fehl)
- [ ] E-Mail-Vorlagen Tab implementieren (aktuell Placeholder)
- [ ] Bulk-Operations für E-Mail-Adressen (Import/Export)
- [ ] Advanced Routing-Rules (zeitbasiert, volumensbasiert)
- [ ] Signatur-Templates mit Variables-System

## 🚀 Deployment Status
- ✅ **Production-Ready:** Alle E-Mail-Kernfunktionen implementiert
- ✅ **Multi-Tenancy:** Vollständig isoliert pro Organisation
- ✅ **Performance:** Optimiert für mittlere E-Mail-Volumina
- ✅ **Error Handling:** Robust mit User-freundlichen Nachrichten
- ✅ **KI-Integration:** Gemini AI für Antwortvorschläge verfügbar

---
**Bearbeitet am:** 2025-08-09  
**Status:** ✅ **VOLLSTÄNDIG BEREINIGT** - Design Patterns, Code-Cleaning, Tests und Dokumentation abgeschlossen