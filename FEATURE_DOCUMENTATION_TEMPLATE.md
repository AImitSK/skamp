# Feature-Dokumentations-Vorlage

## ⚠️ WICHTIGE ANWEISUNGEN FÜR DIE KI

1. **Speicherort:** Erstelle für jedes dokumentierte Feature eine Markdown-Datei in `/docs/features/`
2. **Dateiname:** `docu_[bereich]_[unterbereich]_[feature].md` (z.B. `docu_dashboard_pr-tools_freigaben.md`)
3. **Arbeitsweise:** Gehe diese Vorlage Punkt für Punkt durch und dokumentiere alle Aspekte
4. **KEINE VERMUTUNGEN:** Erfinde keine Funktionen oder Details! Bei Unklarheiten:
   - Frage den User nach der genauen Funktionsweise
   - Markiere unklare Stellen mit [UNKLAR: Was genau macht diese Funktion?]
   - Dokumentiere nur, was tatsächlich im Code steht oder vom User bestätigt wurde

## 📚 DOKUMENTATIONS-WARTUNG (WICHTIG!)

**Nach jeder Feature-Dokumentation:**
1. **Index aktualisieren:** Füge das neue Feature zu `/docs/features/README.md` hinzu
2. **Status markieren:** Setze Status von "Geplant" auf "Abgeschlossen"
3. **Haupt-Navigation:** Ergänze `/docs/README.md` wenn neue Bereiche hinzukommen
4. **Template-Update:** Kopiere verbesserte Vorlage nach `/docs/development/`

**Bei Code-Änderungen am Feature:**
- Dokumentation entsprechend aktualisieren
- Besonders: API-Änderungen, neue Komponenten, geänderte Workflows
- Clean-Code-Checkliste bei Refactorings erneut durchgehen

**Qualitätssicherung:**
- Jede Dokumentation wird vom Team reviewt
- User-Test-Anleitungen praktisch überprüfen  
- Veraltete Informationen regelmäßig bereinigen

## 🎯 REALISTISCHE ERWARTUNGEN

**Was ich KANN:**
- Console.logs und Debug-Code entfernen
- TypeScript/Linter-Warnungen beheben
- Offensichtliche Code-Duplikationen erkennen
- Typen dokumentieren und Verschiebe-Vorschläge machen
- Import-Statements aktualisieren
- Feature-Funktionalität aus Code verstehen
- Test-Anleitungen basierend auf UI erstellen

**Was ich VORSCHLAGE (mit deiner Bestätigung):**
- Größere Refactorings
- Datei-Verschiebungen
- Architektur-Änderungen

**Was DU ENTSCHEIDEN musst:**
- Löschen von Dateien
- Business-Logik-Details
- Feature-Prioritäten

## 📁 STANDARD-ABLAGESTRUKTUR FÜR REFACTORING

Bei der Code-Organisation sollten Dateien nach diesem Pattern verschoben werden:

```
src/
├── app/                    # Next.js App Router Pages
│   └── dashboard/
│       └── [feature]/     # Feature-spezifische Seiten
│           ├── page.tsx   # Haupt-Seite
│           └── components/# Seiten-spezifische Komponenten
├── components/            # Wiederverwendbare UI-Komponenten
│   ├── ui/               # Basis-Komponenten (Button, Input, etc.)
│   └── [feature]/        # Feature-spezifische Komponenten
├── lib/                  # Business Logic & Services
│   ├── api/             # API-Calls
│   ├── hooks/           # Custom React Hooks
│   ├── utils/           # Utility Functions
│   └── [feature]/       # Feature-spezifische Logic
├── types/               # TypeScript Type Definitionen
│   ├── api.ts          # API Response Types
│   ├── models.ts       # Datenmodelle
│   └── [feature].ts    # Feature-spezifische Types
└── services/           # Externe Service-Integrationen
    ├── firebase/       # Firebase-spezifisch
    └── ai/            # AI-Service Integration
```

**Beispiel-Refactoring:**
- `/app/dashboard/emails/EmailComposer.tsx` → `/components/emails/EmailComposer.tsx`
- `/app/dashboard/emails/types.ts` → `/types/emails.ts`
- `/app/dashboard/emails/sendEmail.ts` → `/lib/api/emails.ts`

---

# Feature-Dokumentation: [Feature-Name]

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
[Wie trägt dieses spezifische Feature zur Gesamtvision bei?]

## 📍 Navigation & Zugriff
- **Menüpfad:** [z.B. Dashboard > PR-Tools > Freigaben]
- **Route:** [z.B. /dashboard/pr-tools/freigaben]
- **Berechtigungen:** [Welche Rollen haben Zugriff]

## 🧹 Clean-Code-Checkliste (Realistisch)
- [ ] Alle console.log(), console.error() etc. entfernt
- [ ] Offensichtliche Debug-Kommentare entfernt (TODO, FIXME)
- [ ] Tote Importe entfernt (von TypeScript erkannt)
- [ ] Ungenutzte Variablen gelöscht (von Linter markiert)
- [ ] **Dokumentation:**
  - [ ] Komplexe Business-Logik kommentiert
  - [ ] Veraltete Kommentare im aktuellen Feature entfernt
- [ ] **Dateien im Feature-Ordner geprüft:**
  - [ ] Offensichtlich ungenutzte Dateien identifiziert
  - [ ] [MANUELL PRÜFEN]: Vorschläge für zu löschende Dateien

## 🏗️ Code-Struktur (Realistisch)
- [ ] **Typen-Organisation:**
  - [ ] Lokale Interface/Type Definitionen gefunden
  - [ ] VORSCHLAG: Wo diese hingehören könnten
  - [ ] [NUR MIT BESTÄTIGUNG]: Typen verschieben
- [ ] **Offensichtliche Verbesserungen:**
  - [ ] Duplizierter Code identifiziert
  - [ ] Magic Numbers/Strings markiert
  - [ ] [VORSCHLAG]: Mögliche Extraktion in Konstanten
- [ ] **Datei-Organisation:**
  - [ ] Aktuelle Struktur dokumentiert
  - [ ] [EMPFEHLUNG]: Bessere Organisation vorgeschlagen
  - [ ] [MANUELL]: Entscheidung über Umstrukturierung

## 📋 Feature-Beschreibung
### Zweck
[Was macht dieses Feature für den Benutzer]

### Hauptfunktionen
1. [Funktion 1 - Benutzersicht]
2. [Funktion 2 - Benutzersicht]
3. ...

### Workflow
[Schritt-für-Schritt aus Benutzersicht]

## 🔧 Technische Details
### Komponenten-Struktur
```
- MainComponent
  - SubComponent1
  - SubComponent2
```

### State Management
- **Lokaler State:** [Was wird lokal verwaltet]
- **Global State:** [Redux/Context Nutzung]
- **Server State:** [React Query/SWR Keys]

### API-Endpunkte
| Methode | Endpoint | Zweck | Response |
|---------|----------|-------|----------|
| GET | /api/... | ... | ... |
| POST | /api/... | ... | ... |

### Datenmodelle
```typescript
// Haupttypen die verwendet werden
interface Example {
  ...
}
```

### Externe Abhängigkeiten
- **Libraries:** [spezielle npm packages]
- **Services:** [Firebase, externe APIs]
- **Assets:** [Bilder, Icons]

## 🔄 Datenfluss
```
User Action → Component → API Call → State Update → UI Update
```
[Detaillierte Beschreibung des Datenflusses]

## 🔗 Abhängigkeiten zu anderen Features
- **Nutzt:** [Welche anderen Features werden genutzt]
- **Wird genutzt von:** [Welche Features nutzen dieses]
- **Gemeinsame Komponenten:** [Shared components]

## ⚠️ Bekannte Probleme & TODOs
- [ ] [Problem 1]
- [ ] [Verbesserung 1]

## 🎨 UI/UX Hinweise
- **Design-Patterns:** [Verwendete UI-Patterns]
- **Responsive:** [Mobile Ansicht vorhanden?]
- **Accessibility:** [Barrierefreiheit beachtet?]

### 🎨 CeleroPress Design System Standards

#### Branding & Naming
- **WICHTIG:** Der alte Projektname "SKAMP" wird ÜBERALL durch "CeleroPress" ersetzt
- **Schreibweise:** Immer "CeleroPress" (CamelCase, ein Wort)
- **Domain:** https://www.celeropress.com/
- **In Texten:** Verwende "CeleroPress" konsistent in:
  - UI-Texten und Labels
  - Kommentaren im Code
  - Dokumentation
  - E-Mail-Templates
  - Fehlermeldungen
  - Meta-Descriptions

#### Farben
- **Primary-Farbe:** Alle Hauptaktions-Buttons verwenden `bg-primary hover:bg-primary-hover` (definiert in tailwind.config.ts)
  - Primary: `#005fab` 
  - Primary-Hover: `#004a8c`
- **Sekundäre Aktionen:** `plain` Button-Variante für Abbrechen/Zurück
- **Focus-States:** Immer `focus:ring-primary` verwenden, niemals Indigo oder andere Farben

#### Icons
- **Konsistenz:** IMMER Outline-Varianten verwenden (`@heroicons/react/24/outline`)
- **Größen:** Standard `h-4 w-4` für Buttons und kleine UI-Elemente, `h-5 w-5` für größere Bereiche
- **Farben:** Icons folgen der Text-Farbe ihres Containers

#### Spacing & Layout
- **Label-Abstände:** Konsistent `mt-4` (16px) für Input-Felder nach Labels
- **Button-Padding:** Standard `px-6 py-2` für normale Buttons, `px-4 py-1.5` für kompakte Buttons
- **Dropdown-Styling:** Focus-Ring mit `focus:ring-2 focus:ring-primary focus:ring-offset-2`

#### Komponenten-Patterns
- **CurrencyInput:** Euro-Symbol rechts positionieren mit `currencyPosition="right"`
- **Dropdown-Menüs in Tabellen:** Icons mit `h-4 w-4` und konsistenter Reihenfolge (View, Edit, Delete)
- **Hinzufügen-Buttons:** Immer mit PlusIcon `<PlusIcon className="h-4 w-4 mr-2" />`

#### Code-Standards
```typescript
// Button-Beispiel
<Button 
  className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
>
  <PlusIcon className="h-4 w-4 mr-2" />
  Hinzufügen
</Button>

// Icon-Import (RICHTIG)
import { UserIcon, TrashIcon } from "@heroicons/react/24/outline";

// Icon-Import (FALSCH - nicht verwenden!)
import { UserIcon, TrashIcon } from "@heroicons/react/20/solid";
```

## 📊 Performance (Wenn erkennbar)
- **Potenzielle Probleme:** [z.B. große Listen ohne Pagination]
- **Vorhandene Optimierungen:** [z.B. useMemo, React.memo gefunden]

## 🧪 Tests (Realistisch)
- **Tests gefunden:** Ja/Nein (im __tests__ Ordner gesucht)
- **Kritische Test-Szenarien:**
  - [Was sollte unbedingt getestet werden]
  - [Basierend auf Business-Logik]
- **Test-Priorität:** Hoch/Mittel/Niedrig [mit Begründung]
- **User-Test-Anleitung:**
  1. [Konkreter Schritt basierend auf UI]
  2. [Was der User klicken/eingeben soll]
  3. [Was passieren sollte]
  4. [Wie Erfolg erkennbar ist]

---
**Bearbeitet am:** [Datum]
**Status:** ⏳ In Bearbeitung / ✅ Fertig / 🔄 Needs Review