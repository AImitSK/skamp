# Architektur-Entscheidungen (ADR) - Projekt-Erstellung

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [ADR-001: 3-Step Multi-Step Wizard](#adr-001-3-step-multi-step-wizard)
3. [ADR-002: React Query Integration (Vorbereitet)](#adr-002-react-query-integration-vorbereitet)
4. [ADR-003: Komponenten-Modularisierung](#adr-003-komponenten-modularisierung)
5. [ADR-004: Step-basierte Validation](#adr-004-step-basierte-validation)
6. [ADR-005: Auto-Logic für Team-Zuordnung](#adr-005-auto-logic-für-team-zuordnung)
7. [ADR-006: Success Dashboard](#adr-006-success-dashboard)
8. [ADR-007: Multi-Tenancy-Sicherheit](#adr-007-multi-tenancy-sicherheit)
9. [ADR-008: Shared Components Pattern](#adr-008-shared-components-pattern)
10. [ADR-009: Error Handling Strategy](#adr-009-error-handling-strategy)

---

## Überblick

Diese Dokumentation enthält alle wichtigen Architektur-Entscheidungen (Architecture Decision Records) für das Projekt-Erstellungs-Modul. Jede ADR dokumentiert den Kontext, die Entscheidung, die Begründung und die Konsequenzen.

**Format:** Jede ADR folgt dem Standard-Format:
- **Status**: Akzeptiert / In Diskussion / Abgelehnt
- **Kontext**: Problemstellung und Hintergrund
- **Entscheidung**: Getroffene Lösung
- **Begründung**: Warum diese Lösung?
- **Konsequenzen**: Auswirkungen und Trade-offs
- **Alternativen**: Verworfene Optionen

---

## ADR-001: 3-Step Multi-Step Wizard

**Status:** ✅ Akzeptiert (Phase 3)

**Datum:** 2025-10-15

### Kontext

Das ursprüngliche Design hatte einen komplexen 4-Step Wizard mit folgenden Steps:
1. Projekt-Basis (Titel, Beschreibung, etc.)
2. Kunde-Auswahl
3. Team-Zuordnung
4. Optional: Template & Ressourcen

**Probleme:**
- Step 4 war optional und selten genutzt (Templates noch nicht implementiert)
- Unnötige Komplexität für den Standard-Flow
- Verwirrendes UX-Pattern (optionaler letzter Step)
- Längerer User-Flow bis zur Projekt-Erstellung

### Entscheidung

**Reduzierung auf 3 verpflichtende Steps:**
1. **Projekt** - Titel, Beschreibung, Priorität, Tags, PR-Kampagne-Toggle
2. **Kunde** - Client-Auswahl (required)
3. **Team** - Team-Members + Projekt-Manager (optional)

**Template & Ressourcen:**
- Werden in zukünftiger Iteration hinzugefügt
- Vorerst: PR-Kampagne über SimpleSwitch in Step 1

### Begründung

**Vorteile:**
- ✅ Einfacherer User-Flow (3 statt 4 Steps)
- ✅ Klare lineare Progression (alle Steps verpflichtend)
- ✅ Schnellere Projekt-Erstellung
- ✅ Fokus auf Kern-Funktionalität
- ✅ Bessere UX (keine optionalen Steps)

**Trade-offs:**
- ⚠️ Template-Support verschoben auf zukünftige Iteration
- ⚠️ PR-Kampagne in Step 1 statt separatem Step

### Konsequenzen

**Positiv:**
- Reduktion der Wizard-Komplexität
- Bessere Test-Abdeckung (weniger Steps)
- Klarere Validation-Logic
- Schnellere Time-to-Completion

**Negativ:**
- Template-Feature muss später nachgerüstet werden
- Weniger Flexibilität für Power-User

### Alternativen

1. **4-Step behalten** - Verworfen: Zu komplex für aktuellen Use-Case
2. **2-Step Wizard** - Verworfen: Kunde-Auswahl muss separater Step bleiben (UX)
3. **Single-Step Form** - Verworfen: Zu überladen, schlechte UX

---

## ADR-002: React Query Integration (Vorbereitet)

**Status:** 🚧 Vorbereitet (Phase 1)

**Datum:** 2025-10-12

### Kontext

Ursprünglicher Ansatz verwendete direktes State Management mit `useState` für API-Calls:

```typescript
const [creationOptions, setCreationOptions] = useState(null);
const [isLoading, setIsLoading] = useState(false);

const loadCreationOptions = async () => {
  setIsLoading(true);
  const options = await projectService.getProjectCreationOptions(organizationId);
  setCreationOptions(options);
  setIsLoading(false);
};
```

**Probleme:**
- Keine automatische Cache-Invalidierung
- Manuelles Loading-State-Management
- Keine Retry-Logic
- Keine Background-Refetching
- Komplexes State-Management bei Mutations

### Entscheidung

**Vorbereitung für React Query Migration:**
- Custom Hooks Pattern vorbereitet (aktuell mit useState)
- Service-Layer bleibt unverändert (weiterhin direkte API-Calls)
- Zukünftige Migration: Custom Hooks → React Query Hooks

**Aktuell (Phase 1):**
```typescript
// Custom Hook (useState-basiert)
function useProjectCreation(organizationId: string) {
  const [creationOptions, setCreationOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadOptions = async () => {
    setIsLoading(true);
    const options = await projectService.getProjectCreationOptions(organizationId);
    setCreationOptions(options);
    setIsLoading(false);
  };

  return { creationOptions, isLoading, loadOptions };
}
```

**Zukünftig (React Query):**
```typescript
// React Query Hook
function useProjectCreationOptions(organizationId: string) {
  return useQuery({
    queryKey: ['projectCreationOptions', organizationId],
    queryFn: () => projectService.getProjectCreationOptions(organizationId),
    staleTime: 5 * 60 * 1000, // 5 Minuten
    cacheTime: 10 * 60 * 1000 // 10 Minuten
  });
}
```

### Begründung

**Vorteile:**
- ✅ Vorbereitung für sauberere Architektur
- ✅ Custom Hooks Pattern bereits etabliert
- ✅ Einfache Migration später möglich
- ✅ Service-Layer bleibt stabil

**Trade-offs:**
- ⚠️ Aktuell noch manuelles State Management
- ⚠️ Keine automatische Cache-Invalidierung
- ⚠️ Migration erfordert zusätzlichen Aufwand

### Konsequenzen

**Positiv:**
- Code ist bereits für React Query vorbereitet
- Klare Trennung von Komponenten und Data-Fetching
- Einfache Migration in Zukunft

**Negativ:**
- Aktuell noch Overhead durch manuelle State-Verwaltung
- Keine Vorteile von React Query (Caching, Retry, etc.)

### Alternativen

1. **Sofortige React Query Migration** - Verworfen: Zu großer Scope für Phase 1
2. **Redux/Zustand** - Verworfen: Overkill für lokalen Wizard-State
3. **Context API** - Verworfen: Keine Vorteile gegenüber lokalem State

---

## ADR-003: Komponenten-Modularisierung

**Status:** ✅ Akzeptiert (Phase 2)

**Datum:** 2025-10-13

### Kontext

Ursprünglicher Wizard hatte alle Step-Logik inline im Main-Component:

```typescript
// ❌ VORHER: Alles inline
function ProjectCreationWizard() {
  return (
    <div>
      {currentStep === 1 && (
        <div>
          {/* 100+ Zeilen Step 1 Code */}
        </div>
      )}
      {currentStep === 2 && (
        <div>
          {/* 100+ Zeilen Step 2 Code */}
        </div>
      )}
      {/* ... */}
    </div>
  );
}
```

**Probleme:**
- Main-Component über 800 Zeilen
- Schwer testbar
- Schwer wartbar
- Keine Wiederverwendbarkeit

### Entscheidung

**Extraktion in separate Step-Components:**

```
steps/
├── types.ts                  # Shared Types
├── index.ts                  # Step Exports
├── ProjectStep.tsx           # Step 1 Component
├── ClientStep.tsx            # Step 2 Component
└── TeamStep.tsx              # Step 3 Component
```

**Shared Components:**
```
components/
├── StepTabs.tsx              # Navigation Component
└── StepActions.tsx           # Footer Actions Component
```

### Begründung

**Vorteile:**
- ✅ Bessere Testbarkeit (Unit-Tests pro Step)
- ✅ Bessere Wartbarkeit (kleinere Files)
- ✅ Wiederverwendbarkeit (Steps in anderen Wizards)
- ✅ Klare Verantwortlichkeiten
- ✅ Einfacheres Onboarding neuer Entwickler

**Trade-offs:**
- ⚠️ Mehr Dateien im Projekt
- ⚠️ Props-Passing zwischen Komponenten

### Konsequenzen

**Positiv:**
- Main-Component reduziert von 800+ auf 417 Zeilen
- Jeder Step ist einzeln testbar
- Klare Struktur und Verantwortlichkeiten

**Negativ:**
- Leichter erhöhte Komplexität durch Props-Passing
- Mehr Dateien zu navigieren

### Alternativen

1. **Alles inline behalten** - Verworfen: Nicht wartbar
2. **Nur Steps extrahieren** - Teilweise umgesetzt: Auch Navigation extrahiert
3. **Komplettes Monolith-Component** - Verworfen: Siehe oben

---

## ADR-004: Step-basierte Validation

**Status:** ✅ Akzeptiert

**Datum:** 2025-10-13

### Kontext

Validation muss sicherstellen, dass nur valide Daten in den nächsten Step übernommen werden.

**Anforderungen:**
- Step 1: Titel min 3 Zeichen, ClientId required
- Step 2: ClientId required
- Step 3: Keine Validation (Team optional)

### Entscheidung

**useMemo-basierte Validation im Main-Component:**

```typescript
const isStepValid = useMemo(() => {
  switch (currentStep) {
    case 1:
      return formData.title.trim().length >= 3;
    case 2:
      return !!formData.clientId;
    case 3:
      return true; // Team optional
    default:
      return false;
  }
}, [currentStep, formData]);
```

**Disabled-State für Weiter-Button:**
```typescript
<Button
  onClick={handleNext}
  disabled={!isStepValid || isLoading}
>
  Weiter
</Button>
```

### Begründung

**Vorteile:**
- ✅ Real-time Validation (onChange)
- ✅ Klare visuelle Feedback (disabled Button)
- ✅ Performant (useMemo)
- ✅ Einfach erweiterbar

**Trade-offs:**
- ⚠️ Validation-Logic im Main-Component (nicht in Steps)
- ⚠️ Keine granulare Feld-Validation

### Konsequenzen

**Positiv:**
- User kann nicht zu nächstem Step ohne valide Daten
- Klare visuelle Feedback
- Verhindert ungültige Submissions

**Negativ:**
- Validation-Logic zentral (nicht bei Steps)
- Keine Fehler-Messages pro Feld (nur disabled Button)

### Alternativen

1. **Form-Library (react-hook-form)** - Verworfen: Overkill für 3 Steps
2. **Validation in Steps** - Verworfen: Verletzt Single-Source-of-Truth
3. **Schema-Validation (Zod)** - Überlegt für zukünftige Iteration

---

## ADR-005: Auto-Logic für Team-Zuordnung

**Status:** ✅ Akzeptiert

**Datum:** 2025-10-14

### Kontext

Best Practice: Current User sollte automatisch als Team-Member und Projekt-Manager vorausgewählt werden.

**Anforderungen:**
- Current User automatisch als Team-Member
- Current User automatisch als Projekt-Manager
- Bei Entfernen aus Team: PM-Auswahl löschen

### Entscheidung

**Auto-Selection beim Laden:**
```typescript
useEffect(() => {
  if (isOpen && user?.uid && creationOptions?.availableTeamMembers) {
    const userMember = creationOptions.availableTeamMembers.find(member =>
      member.userId === user.uid
    );

    if (userMember) {
      setFormData(prev => ({
        ...prev,
        assignedTeamMembers: [userMember.id],
        projectManager: userMember.id
      }));
    }
  }
}, [isOpen, user?.uid, creationOptions]);
```

**Auto-Clear bei Team-Änderung:**
```typescript
const handleTeamMemberChange = (members: string[]) => {
  onUpdate({ assignedTeamMembers: members });

  // Clear PM if no longer in team
  if (formData.projectManager && !members.includes(formData.projectManager)) {
    onUpdate({ projectManager: '' });
  }
};
```

### Begründung

**Vorteile:**
- ✅ Bessere UX (weniger Klicks)
- ✅ Verhindert inkonsistenten State (PM nicht im Team)
- ✅ Best Practice (User ist meist PM des eigenen Projekts)

**Trade-offs:**
- ⚠️ Automatisches Verhalten (könnte User überraschen)
- ⚠️ Zusätzliche Logic-Komplexität

### Konsequenzen

**Positiv:**
- Schnellere Projekt-Erstellung
- Verhindert Fehler (PM nicht im Team)
- Intuitive UX

**Negativ:**
- User muss Auto-Selection manuell ändern, falls anders gewünscht
- Zusätzliche Edge-Cases

### Alternativen

1. **Keine Auto-Selection** - Verworfen: Schlechtere UX
2. **Nur PM auto-select** - Verworfen: Inkonsistent
3. **User-Präferenz speichern** - Überlegt für zukünftige Iteration

---

## ADR-006: Success Dashboard

**Status:** ✅ Akzeptiert

**Datum:** 2025-10-14

### Kontext

Nach erfolgreicher Projekt-Erstellung sollte User über erstellte Ressourcen informiert werden.

**Anforderungen:**
- Visuelle Bestätigung des Erfolgs
- Übersicht über alle erstellten Ressourcen
- Quick Actions (Zum Projekt, Schließen)

### Entscheidung

**Separates Success-Component:**
```typescript
if (creationResult?.success) {
  return <CreationSuccessDashboard result={creationResult} />;
}
```

**Features:**
- Animated Success Icon mit Sparkles
- Grid-Layout für erstellte Ressourcen
- Quick Actions Footer

### Begründung

**Vorteile:**
- ✅ Klare visuelle Bestätigung
- ✅ User weiß genau, was erstellt wurde
- ✅ Direkte Navigation zum Projekt
- ✅ Besseres User-Feedback

**Trade-offs:**
- ⚠️ Zusätzlicher Component
- ⚠️ Mehr Entwicklungsaufwand

### Konsequenzen

**Positiv:**
- Professionelles User-Feedback
- Transparenz über erstellte Ressourcen
- Bessere UX

**Negativ:**
- Zusätzlicher Wartungsaufwand
- Mehr Code zu testen

### Alternativen

1. **Simple Toast-Notification** - Verworfen: Zu wenig Information
2. **Inline Success-Message** - Verworfen: Nicht prominent genug
3. **Redirect zu Projekt** - Teilweise: Als Quick Action verfügbar

---

## ADR-007: Multi-Tenancy-Sicherheit

**Status:** ✅ Akzeptiert (Kritisch)

**Datum:** 2025-10-10

### Kontext

CeleroPress ist eine Multi-Tenancy-Anwendung. Jede Organisation muss vollständig isoliert sein.

**Sicherheits-Anforderungen:**
- OrganizationId in ALLEN Firestore-Queries
- OrganizationId in ALLEN erstellten Dokumenten
- Keine Cross-Tenant-Zugriffe möglich

### Entscheidung

**OrganizationId Enforcement:**

```typescript
// ✅ In allen Service-Methoden
async createProjectFromWizard(
  wizardData: ProjectCreationWizardData,
  userId: string,
  organizationId: string  // ← Required Parameter
): Promise<ProjectCreationResult> {
  const projectData = {
    ...wizardData,
    organizationId,  // ← Gespeichert im Projekt
    userId
  };

  await addDoc(collection(db, 'projects'), projectData);
}

// ✅ In allen Queries
const q = query(
  collection(db, 'projects'),
  where('organizationId', '==', organizationId),  // ← Filter
  where('userId', '==', userId)
);
```

### Begründung

**Vorteile:**
- ✅ Vollständige Daten-Isolation
- ✅ Verhindert Cross-Tenant-Zugriffe
- ✅ DSGVO-konform
- ✅ Security-Best-Practice

**Trade-offs:**
- ⚠️ OrganizationId muss überall übergeben werden
- ⚠️ Zusätzlicher Parameter in allen Methoden

### Konsequenzen

**Positiv:**
- Garantierte Daten-Isolation
- Keine versehentlichen Cross-Tenant-Zugriffe
- Compliance mit Datenschutz-Richtlinien

**Negativ:**
- Mehr Boilerplate-Code
- OrganizationId-Passing kann vergessen werden (Typ-Sicherheit hilft)

### Alternativen

1. **OrganizationId aus Auth-Context** - Verworfen: Unsicherer, schwer testbar
2. **Globaler OrganizationId-State** - Verworfen: Fehleranfällig
3. **Row-Level-Security (RLS)** - Ideal, aber Firestore unterstützt kein RLS

---

## ADR-008: Shared Components Pattern

**Status:** ✅ Akzeptiert

**Datum:** 2025-10-13

### Kontext

Mehrere Komponenten benötigen ähnliche UI-Elemente (Alert, Tabs, Actions, etc.).

**Probleme ohne Shared Components:**
- Code-Duplikation
- Inkonsistente Styles
- Schwer wartbar

### Entscheidung

**Shared Components Struktur:**

```
components/
├── StepTabs.tsx              # Wiederverwendbare Tab-Navigation
├── StepActions.tsx           # Wiederverwendbare Footer-Actions
└── (Alert inline im Main)    # Kleine Components inline
```

**Wiederverwendung:**
- StepTabs: Auch in Projekt-Edit-Wizard nutzbar
- StepActions: Auch in anderen Multi-Step-Wizards nutzbar
- Alert: Inline (zu spezifisch für Wizard)

### Begründung

**Vorteile:**
- ✅ DRY (Don't Repeat Yourself)
- ✅ Konsistente UI über alle Steps
- ✅ Einfach wartbar (zentrale Komponenten)
- ✅ Wiederverwendbar in anderen Wizards

**Trade-offs:**
- ⚠️ Mehr Abstraktionsebenen
- ⚠️ Props-Interface muss flexibel sein

### Konsequenzen

**Positiv:**
- Code-Reduktion (keine Duplikation)
- Konsistente UX
- Einfache Wartung

**Negativ:**
- Zusätzliche Props für Flexibilität (z.B. `allowAllSteps`, `showSubmitOnAllSteps`)
- Mehr Files zu navigieren

### Alternativen

1. **Keine Shared Components** - Verworfen: Code-Duplikation
2. **Alles inline** - Verworfen: Nicht wartbar
3. **UI-Library (Headless UI)** - Teilweise genutzt: Basis-Components

---

## ADR-009: Error Handling Strategy

**Status:** ✅ Akzeptiert

**Datum:** 2025-10-14

### Kontext

Fehler können an verschiedenen Stellen auftreten:
- Validation Errors (Client-seitig)
- Network Errors (API-Calls)
- Firestore Errors (DB-Zugriff)
- Partial Errors (Kampagne erstellt, aber Ordner-Fehler)

### Entscheidung

**Zweistufiges Error Handling:**

**1. Kritische Fehler (Projekt-Erstellung schlägt fehl):**
```typescript
try {
  const result = await projectService.createProjectFromWizard(...);
  if (result.success) {
    // Success
  } else {
    setError(result.error); // ← Kritischer Fehler
  }
} catch (error) {
  setError(error.message); // ← Exception
}
```

**2. Nicht-kritische Fehler (Teil-Ressourcen schlagen fehl):**
```typescript
// Projekt erstellt, aber Kampagne fehlgeschlagen
return {
  success: true,
  projectId: 'abc-123',
  campaignId: undefined,
  errors: ['PR-Kampagne konnte nicht erstellt werden']
};
```

**Alert-Anzeige:**
```typescript
{error && (
  <Alert
    type="error"
    message={error}
    onDismiss={() => setError(null)}
  />
)}
```

### Begründung

**Vorteile:**
- ✅ User sieht alle Fehler
- ✅ Projekt-Erstellung schlägt nicht komplett fehl bei Teil-Fehlern
- ✅ Klare Unterscheidung kritisch/nicht-kritisch
- ✅ Bessere UX (Teil-Erfolg statt kompletter Fehler)

**Trade-offs:**
- ⚠️ Komplexere Error-Struktur
- ⚠️ User muss Teil-Fehler nachträglich beheben

### Konsequenzen

**Positiv:**
- Projekt wird trotz Teil-Fehlern erstellt
- User kann Projekt sofort nutzen
- Transparenz über alle Fehler

**Negativ:**
- User muss Teil-Fehler manuell beheben (z.B. Kampagne nachträglich erstellen)
- Komplexere Error-Handling-Logic

### Alternativen

1. **All-or-Nothing** - Verworfen: Schlechtere UX
2. **Silent Failures** - Verworfen: Intransparent
3. **Automatic Retry** - Überlegt für zukünftige Iteration

---

## Zusammenfassung

### Kernentscheidungen

| ADR | Entscheidung | Impact | Status |
|-----|--------------|--------|--------|
| ADR-001 | 3-Step Wizard | 🔥 Hoch | ✅ Akzeptiert |
| ADR-002 | React Query Vorbereitung | 📊 Mittel | 🚧 Vorbereitet |
| ADR-003 | Komponenten-Modularisierung | 🔥 Hoch | ✅ Akzeptiert |
| ADR-004 | Step-basierte Validation | 📊 Mittel | ✅ Akzeptiert |
| ADR-005 | Auto-Logic Team | 📊 Mittel | ✅ Akzeptiert |
| ADR-006 | Success Dashboard | 💅 Niedrig | ✅ Akzeptiert |
| ADR-007 | Multi-Tenancy | 🔥 Kritisch | ✅ Akzeptiert |
| ADR-008 | Shared Components | 📊 Mittel | ✅ Akzeptiert |
| ADR-009 | Error Handling | 🔥 Hoch | ✅ Akzeptiert |

### Zukünftige ADRs

**Geplant:**
- ADR-010: Template-Support Integration
- ADR-011: Asset-Upload im Wizard
- ADR-012: Auto-Save zu LocalStorage
- ADR-013: React Query Migration (vollständig)

---

## Siehe auch

- [../README.md](../README.md) - Modul-Übersicht
- [../api/README.md](../api/README.md) - API-Referenz
- [../components/README.md](../components/README.md) - Komponenten-Dokumentation

---

**Version:** 1.0.0
**Letzte Aktualisierung:** 2025-10-19
**Status:** ✅ Vollständig dokumentiert
**Maintainer:** Stefan Kühne
