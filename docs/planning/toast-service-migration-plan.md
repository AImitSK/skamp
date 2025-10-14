# Implementierungsplan: Zentraler Toast-Service (react-hot-toast)

**Projekt:** CeleroPress
**Version:** 1.0
**Status:** In Planung
**Erstellt:** 14. Januar 2025
**Typ:** Infrastructure Improvement

---

## 📋 Übersicht

### Ziel

Zentralisierung aller Toast/Alert-Meldungen über einen einheitlichen `toastService` basierend auf `react-hot-toast` in den bereits refactorierten Bereichen (CRM, Lists, Editors) und Integration ins Refactoring-Template für zukünftige Module.

### Problem

**Aktueller Zustand:**
- **3 verschiedene Ansätze** existieren parallel:
  1. Custom `useAlert` Hook (nicht verwendet)
  2. Inline `showAlert` Funktionen (Code-Duplikation in Lists, Editors, CRM)
  3. `react-hot-toast` direkt importiert (9 Dateien in Super Admin)

**Probleme:**
- ❌ Code-Duplikation (~60+ Dateien mit eigenem `showAlert`)
- ❌ Inkonsistente UX (verschiedene Toast-Styles)
- ❌ Schwer wartbar (Änderungen müssen überall gemacht werden)
- ❌ Keine zentrale Konfiguration

**Lösung:**
- ✅ Ein zentraler `toastService` mit einheitlicher API
- ✅ Basierend auf `react-hot-toast` (bereits installiert)
- ✅ Integration in Refactoring-Template
- ✅ Schrittweise Migration (CRM → Lists → Editors → Rest)

---

## 🎯 Scope

### In-Scope (Phase 1)

**Ziel-Bereiche (bereits refactoriert):**
- ✅ CRM Module (Companies, Contacts)
- ✅ Lists Module
- ✅ Editors Module

**Deliverables:**
1. Zentraler Toast-Service (`src/lib/utils/toast.ts`)
2. Toaster-Provider Integration (App Layout)
3. Migration der 3 Module
4. Template-Update (Refactoring-Template)
5. Dokumentations-Updates (3 Module + Template)

### Out-of-Scope (Phase 2+)

**Für später:**
- Andere Module (wird bei deren Refactoring gemacht)
- Legacy-Code (bleibt unverändert bis Refactoring)
- Super Admin Bereiche (nutzen bereits react-hot-toast direkt)

---

## 📐 Architektur

### Toast-Service Design

```typescript
// src/lib/utils/toast.ts
import toast from 'react-hot-toast';

/**
 * Zentraler Toast-Service mit kompaktem Single-Line-Layout
 * Format: [Icon] Meldung
 */
export const toastService = {
  success: (message: string) => { /* ... */ },
  error: (message: string) => { /* ... */ },
  info: (message: string) => { /* ... */ },
  warning: (message: string) => { /* ... */ },
  loading: (message: string) => toast.loading(message),
  dismiss: (toastId?: string) => toast.dismiss(toastId),
  dismissAll: () => toast.dismiss(),
  promise: <T>(promise: Promise<T>, messages: { /* ... */ }) => toast.promise(promise, messages),
};
```

### Migration Pattern

**Vorher (Inline showAlert):**
```typescript
// Jede Komponente hat eigene Implementierung
const [alert, setAlert] = useState<AlertState | null>(null);

const showAlert = useCallback((type, title, message) => {
  setAlert({ type, title, message });
  setTimeout(() => setAlert(null), 3000);
}, []);

// Verwendung
showAlert('success', 'Liste erstellt', 'Die Liste wurde erfolgreich erstellt.');
```

**Nachher (Toast-Service):**
```typescript
import { toastService } from '@/lib/utils/toast';

// Verwendung (kein lokaler State nötig)
toastService.success('Liste erfolgreich erstellt');
```

---

## 🚀 Implementierung

### Phase 1: Infrastruktur (30 Min)

#### 1.1 Toast-Service erstellen

**Datei:** `src/lib/utils/toast.ts`

```typescript
import toast, { Toaster } from 'react-hot-toast';

/**
 * Zentraler Toast-Service für konsistente Benachrichtigungen
 *
 * Basiert auf react-hot-toast mit CeleroPress Design System
 * Layout: [Icon] Meldung - kompakt in einer Zeile
 */

// Basis-Styling für alle Toasts (kompakt, eine Zeile)
const baseStyle = {
  maxWidth: '500px',
  fontSize: '14px',
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const toastService = {
  /**
   * Success Toast - Kompakt in einer Zeile
   * @param message Hauptnachricht
   */
  success: (message: string) => {
    return toast.success(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        ...baseStyle,
        background: '#f0fdf4', // green-50
        border: '1px solid #86efac', // green-300
        color: '#166534', // green-800
      },
      iconTheme: {
        primary: '#16a34a', // green-600
        secondary: '#f0fdf4',
      },
    });
  },

  /**
   * Error Toast - Kompakt in einer Zeile
   * @param message Fehlermeldung
   */
  error: (message: string) => {
    return toast.error(message, {
      duration: 5000, // Länger für Fehler
      position: 'top-right',
      style: {
        ...baseStyle,
        background: '#fef2f2', // red-50
        border: '1px solid #fca5a5', // red-300
        color: '#991b1b', // red-800
      },
      iconTheme: {
        primary: '#dc2626', // red-600
        secondary: '#fef2f2',
      },
    });
  },

  /**
   * Info Toast - Kompakt in einer Zeile
   * @param message Info-Nachricht
   */
  info: (message: string) => {
    return toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        ...baseStyle,
        background: '#eff6ff', // blue-50
        border: '1px solid #93c5fd', // blue-300
        color: '#1e40af', // blue-800
      },
    });
  },

  /**
   * Warning Toast - Kompakt in einer Zeile
   * @param message Warnung
   */
  warning: (message: string) => {
    return toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        ...baseStyle,
        background: '#fefce8', // yellow-50
        border: '1px solid #fde047', // yellow-300
        color: '#854d0e', // yellow-900
      },
    });
  },

  /**
   * Loading Toast - Kompakt in einer Zeile
   * @param message Loading-Text
   * @returns Toast-ID (für dismiss)
   */
  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
      style: {
        ...baseStyle,
        background: '#f4f4f5', // zinc-100
        border: '1px solid #d4d4d8', // zinc-300
        color: '#18181b', // zinc-900
      },
    });
  },

  /**
   * Promise Toast
   * Zeigt Loading → Success/Error automatisch
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages, {
      position: 'top-right',
    });
  },

  /**
   * Toast schließen
   * @param toastId Optional: Spezifische Toast-ID
   */
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  /**
   * Alle Toasts schließen
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

// Re-export Toaster Component für Layout
export { Toaster } from 'react-hot-toast';
```

#### 1.2 Toaster-Provider Integration

**Datei:** `src/app/dashboard/layout.tsx`

```typescript
import { Toaster } from '@/lib/utils/toast';

export default function DashboardLayout({ children }) {
  return (
    <div>
      {/* Bestehender Content */}
      {children}

      {/* Toast-Notifications (ganz am Ende) */}
      <Toaster />
    </div>
  );
}
```

#### 1.3 Tests für Toast-Service

**Datei:** `src/lib/utils/__tests__/toast.test.ts`

```typescript
import { toastService } from '../toast';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast');

describe('toastService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show success toast', () => {
    toastService.success('Success message');
    expect(toast.success).toHaveBeenCalledWith(
      'Success message',
      expect.objectContaining({
        duration: 3000,
        position: 'top-right',
      })
    );
  });

  it('should show error toast with longer duration', () => {
    toastService.error('Error message');
    expect(toast.error).toHaveBeenCalledWith(
      'Error message',
      expect.objectContaining({
        duration: 5000,
      })
    );
  });

  it('should show info toast', () => {
    toastService.info('Info message');
    expect(toast).toHaveBeenCalledWith(
      'Info message',
      expect.objectContaining({
        duration: 4000,
        icon: 'ℹ️',
      })
    );
  });

  it('should dismiss specific toast', () => {
    toastService.dismiss('toast-id-123');
    expect(toast.dismiss).toHaveBeenCalledWith('toast-id-123');
  });

  it('should dismiss all toasts', () => {
    toastService.dismissAll();
    expect(toast.dismiss).toHaveBeenCalled();
  });
});
```

---

### Phase 2: Lists Migration (1 Stunde)

#### 2.1 Alert-State entfernen

**Datei:** `src/app/dashboard/contacts/lists/page.tsx`

```typescript
// ENTFERNEN:
const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);

const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
  setAlert({ type, title, message });
  setTimeout(() => setAlert(null), 3000);
}, []);

// HINZUFÜGEN:
import { toastService } from '@/lib/utils/toast';
```

#### 2.2 Alle showAlert Aufrufe ersetzen

**Beispiele:**

```typescript
// VORHER:
showAlert('success', 'Liste erstellt', 'Die Liste wurde erfolgreich erstellt.');

// NACHHER (kompakt, eine Zeile):
toastService.success('Liste erfolgreich erstellt');

// ---

// VORHER:
showAlert('error', 'Fehler', 'Die Liste konnte nicht erstellt werden.');

// NACHHER (kompakt, eine Zeile):
toastService.error('Liste konnte nicht erstellt werden');

// ---

// VORHER (Bulk-Delete):
showAlert('success', `${count} Listen gelöscht`);

// NACHHER:
toastService.success(`${count} Listen erfolgreich gelöscht`);
```

#### 2.3 Alert-Komponente entfernen (optional)

```typescript
// ENTFERNEN:
{alert && (
  <div className="mb-4">
    <Alert
      type={alert.type}
      title={alert.title}
      message={alert.message}
      onClose={() => setAlert(null)}
    />
  </div>
)}
```

**Note:** Alert-Komponente in `components/shared/Alert.tsx` kann für spezielle Fälle (z.B. inline Validierungs-Feedback) behalten werden.

#### 2.4 Tests anpassen

**Datei:** `src/app/dashboard/contacts/lists/__tests__/integration/lists-crud-flow.test.tsx`

```typescript
import { toastService } from '@/lib/utils/toast';

// Mock Toast-Service
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// In Tests:
await waitFor(() => {
  expect(toastService.success).toHaveBeenCalledWith(
    'Die Liste wurde erfolgreich erstellt',
    'Liste erstellt'
  );
});
```

---

### Phase 3: CRM Migration (1.5 Stunden)

**Gleicher Ansatz wie Lists:**

1. Alert-State entfernen (`page.tsx` in Companies + Contacts)
2. `toastService` importieren
3. Alle `showAlert` Aufrufe ersetzen
4. Alert-Komponenten aus JSX entfernen
5. Tests anpassen

**Dateien:**
- `src/app/dashboard/contacts/crm/companies/page.tsx`
- `src/app/dashboard/contacts/crm/contacts/page.tsx`
- `src/app/dashboard/contacts/crm/companies/[companyId]/page.tsx`
- `src/app/dashboard/contacts/crm/contacts/[contactId]/page.tsx`

---

### Phase 4: Editors Migration (1 Stunde)

**Gleicher Ansatz wie Lists + CRM:**

1. Alert-State entfernen (`page.tsx`)
2. `toastService` importieren
3. Alle `showAlert` Aufrufe ersetzen (~10 Stellen)
4. Alert-Komponente aus JSX entfernen
5. Tests anpassen

**Datei:**
- `src/app/dashboard/library/editors/page.tsx`

**Spezielle Cases:**
```typescript
// Multi-Entity Verweis erstellt (kompakt, eine Zeile)
toastService.success('Journalist als Multi-Entity Verweis importiert');

// SuperAdmin-Hinweis (Info-Toast statt Alert, kompakt)
toastService.info('SuperAdmin: Journalisten direkt im CRM verwalten - kein Verweis nötig');

// Premium-Feature (Warning-Toast, kompakt)
toastService.warning('Importieren von Journalisten nur mit Premium-Abo verfügbar');
```

---

### Phase 5: Template-Integration (30 Min)

#### 5.1 Refactoring-Template erweitern

**Datei:** `docs/templates/module-refactoring-template.md`

**Neue Sektion hinzufügen (nach Phase 1):**

```markdown
#### 1.4 Toast-Service Integration ⭐ NEU

**WICHTIG:** Keine inline Alert-State mehr verwenden!

**Entfernen:**
```typescript
// ❌ Alte Alert-Implementierung
const [alert, setAlert] = useState<AlertState | null>(null);
const showAlert = useCallback((type, title, message) => {
  setAlert({ type, title, message });
  setTimeout(() => setAlert(null), 3000);
}, []);
```

**Hinzufügen:**
```typescript
// ✅ Zentraler Toast-Service (kompakt, eine Zeile)
import { toastService } from '@/lib/utils/toast';

// Verwendung
toastService.success('Operation erfolgreich');
toastService.error('Fehler beim Speichern');
toastService.info('Hinweis beachten');
toastService.warning('Achtung: Daten unvollständig');

// Promise-basiert (automatisch Loading → Success/Error)
await toastService.promise(
  mutation.mutateAsync(data),
  {
    loading: 'Speichert...',
    success: 'Erfolgreich gespeichert',
    error: 'Fehler beim Speichern',
  }
);
```

**Vorteile:**
- ✅ Kein lokaler State nötig
- ✅ Konsistente UX über ganze App
- ✅ Weniger Code (~50 Zeilen gespart)
- ✅ Automatisches Timing & Positioning
- ✅ Bessere Performance (kein Component Re-Render)
```

#### 5.2 Quick Reference aktualisieren

**Datei:** `docs/templates/QUICK_REFERENCE.md`

```markdown
## Toast-Benachrichtigungen

**Zentraler Service (react-hot-toast) - Kompakt, eine Zeile:**

```typescript
import { toastService } from '@/lib/utils/toast';

// Success (3s)
toastService.success('Liste erstellt');
toastService.success('Änderungen gespeichert');

// Error (5s)
toastService.error('Fehler beim Löschen');

// Info/Warning (4s)
toastService.info('Hinweis beachten');
toastService.warning('Achtung: Daten unvollständig');

// Promise (automatisch Loading → Success/Error)
await toastService.promise(
  apiCall(),
  {
    loading: 'Lädt...',
    success: 'Fertig!',
    error: 'Fehler!',
  }
);
```

**Nicht mehr verwenden:**
- ❌ Inline `showAlert` Funktionen
- ❌ Lokaler Alert-State
- ❌ Custom `useAlert` Hook
```

---

### Phase 6: Dokumentations-Updates (1 Stunde)

#### 6.1 Lists-Dokumentation

**Datei:** `docs/lists/README.md`

**Update "Testing" Sektion:**
```markdown
### Test-Mocks

**Toast-Service:**
```typescript
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
```
```

**Update "Architektur" Sektion:**
```markdown
### Benachrichtigungen

- **Toast-Service:** Zentraler Service für alle Benachrichtigungen
- **react-hot-toast:** Library für konsistente Toast-Darstellung
- **Kein lokaler State:** Toasts werden global verwaltet
```

#### 6.2 CRM-Dokumentation

**Datei:** `docs/crm/README.md`

**Gleiche Updates wie Lists:**
- Testing-Sektion (Toast-Mocks)
- Architektur-Sektion (Toast-Service Erwähnung)

#### 6.3 Editors-Dokumentation

**Datei:** `docs/editors/README.md`

**Gleiche Updates wie Lists + CRM**

#### 6.4 Toast-Service Dokumentation

**Neue Datei:** `docs/utils/toast-service.md`

```markdown
# Toast-Service Dokumentation

**Service:** `toast.ts`
**Location:** `src/lib/utils/toast.ts`
**Basiert auf:** react-hot-toast

---

## Übersicht

Der Toast-Service bietet eine zentrale, konsistente API für alle Toast-Benachrichtigungen in CeleroPress.

---

## API

### success()

Zeigt eine Erfolgs-Benachrichtigung (kompakt, eine Zeile).

**Signatur:**
```typescript
toastService.success(message: string): string
```

**Parameter:**
- `message` (string) - Nachricht (kompakt, eine Zeile)

**Rückgabe:**
- `string` - Toast-ID (für dismiss)

**Beispiele:**
```typescript
toastService.success('Liste erfolgreich erstellt');
toastService.success('Änderungen gespeichert');
toastService.success(`${count} Listen gelöscht`);
```

---

[Weitere Methoden dokumentieren: error, info, warning, loading, promise, dismiss]

---

## Styling

**Design System Konform:**
- Success: Green-50 Background, Green-600 Icon
- Error: Red-50 Background, Red-600 Icon
- Info: Blue-50 Background, Info Icon
- Warning: Yellow-50 Background, Warning Icon

**Position:** top-right
**Duration:**
- Success: 3s
- Error: 5s
- Info/Warning: 4s
- Loading: Bis dismiss
```

---

### Phase 7: Cleanup (30 Min)

#### 7.1 Alte Alert-Komponenten prüfen

```bash
# Alert-Komponenten finden
find src -name "Alert.tsx" -type f

# Prüfen ob noch verwendet
grep -r "import.*Alert" src/app/dashboard/contacts/{crm,lists}
grep -r "import.*Alert" src/app/dashboard/library/editors
```

**Entscheidung:**
- Wenn nicht mehr verwendet → Komponente entfernen
- Wenn für spezielle Cases (z.B. Validierung) → Behalten & dokumentieren

#### 7.2 useAlert Hook prüfen

**Datei:** `src/hooks/useAlert.ts`

```bash
# Prüfen ob verwendet
grep -r "useAlert" src
```

**Wenn nicht verwendet:**
- Hook entfernen
- Tests entfernen (`src/__tests__/hooks/useAlert.test.tsx`)

#### 7.3 ESLint & TypeScript Check

```bash
# TypeScript
npx tsc --noEmit

# ESLint
npx eslint src/app/dashboard/contacts/{crm,lists}
npx eslint src/app/dashboard/library/editors
npx eslint src/lib/utils
```

---

## 📊 Erfolgsmetriken

### Code-Reduktion

**Listen-Modul:**
- Vorher: ~80 Zeilen Alert-Code (State + showAlert Function + Alert JSX)
- Nachher: 1 Zeile Import
- **Ersparnis: ~79 Zeilen pro Modul**

**Gesamt (3 Module):**
- **~240 Zeilen Code eliminiert**
- **~15 useState/useCallback entfernt**
- **Bessere Performance** (kein lokaler State, kein Re-Render)

### Konsistenz

- ✅ **1 API** für alle Toasts
- ✅ **Konsistente Styles** über alle Module
- ✅ **Zentrale Konfiguration** (Timing, Position, etc.)

### Wartbarkeit

- ✅ **Änderungen an einem Ort** (toast.ts)
- ✅ **Einfacher zu testen** (ein Mock für alle)
- ✅ **Dokumentiert im Template** (für neue Module)

---

## ✅ Checkliste

### Phase 1: Infrastruktur
- [ ] Toast-Service erstellt (`src/lib/utils/toast.ts`)
- [ ] Toaster-Provider integriert (Layout)
- [ ] Toast-Service Tests geschrieben
- [ ] Tests laufen durch

### Phase 2: Lists Migration
- [ ] Alert-State entfernt
- [ ] toastService importiert
- [ ] Alle showAlert ersetzt (~15 Stellen)
- [ ] Alert-JSX entfernt
- [ ] Tests angepasst
- [ ] Tests laufen durch

### Phase 3: CRM Migration
- [ ] Companies/page.tsx migriert
- [ ] Contacts/page.tsx migriert
- [ ] Detail-Pages migriert
- [ ] Tests angepasst
- [ ] Tests laufen durch

### Phase 4: Editors Migration
- [ ] page.tsx migriert (~10 Stellen)
- [ ] Tests angepasst
- [ ] Tests laufen durch

### Phase 5: Template-Integration
- [ ] Refactoring-Template erweitert (Phase 1.4)
- [ ] Quick Reference aktualisiert
- [ ] Code-Beispiele hinzugefügt

### Phase 6: Dokumentation
- [ ] Lists/README.md aktualisiert
- [ ] CRM/README.md aktualisiert
- [ ] Editors/README.md aktualisiert
- [ ] Toast-Service Docs erstellt

### Phase 7: Cleanup
- [ ] Alte Alert-Komponenten geprüft
- [ ] useAlert Hook entfernt (falls ungenutzt)
- [ ] ESLint: 0 Warnings
- [ ] TypeScript: 0 Errors
- [ ] Alle Tests bestehen

---

## 🚀 Rollout

### Phase 1: Pilot (CRM, Lists, Editors)
**Dauer:** ~5 Stunden
**Ziel:** Proof of Concept, Template-Integration

**Deliverables:**
1. Toast-Service funktioniert
2. 3 Module migriert
3. Template aktualisiert
4. Dokumentation vollständig

### Phase 2: Weitere Module (Kontinuierlich)
**Wann:** Bei zukünftigen Refactorings
**Wie:** Refactoring-Template folgen (Phase 1.4)

**Priorisierung:**
1. Module die gerade refactored werden
2. Module mit viel Alert-Code
3. Legacy-Module (lowest priority)

---

## 📝 Testing-Strategie

### Unit Tests

**Toast-Service:**
```typescript
// src/lib/utils/__tests__/toast.test.ts
- success() zeigt Success-Toast (3s Duration, kompakt)
- error() zeigt Error-Toast (5s Duration, kompakt)
- info() zeigt Info-Toast (4s Duration, kompakt)
- warning() zeigt Warning-Toast (4s Duration, kompakt)
- dismiss() schließt spezifischen Toast
- dismissAll() schließt alle Toasts
```

### Integration Tests

**Lists/CRM/Editors:**
```typescript
// Bestehende Tests anpassen
- Mock toastService statt Alert-State
- Verify toastService.success() aufgerufen
- Verify korrekte Message (kompakt, eine Zeile)

// Beispiel:
await waitFor(() => {
  expect(toastService.success).toHaveBeenCalledWith(
    'Liste erfolgreich erstellt'
  );
});
```

### Manual Testing

**Checklist:**
- [ ] Success-Toast erscheint (grün, 3s)
- [ ] Error-Toast erscheint (rot, 5s)
- [ ] Info-Toast erscheint (blau, 4s)
- [ ] Warning-Toast erscheint (gelb, 4s)
- [ ] Loading-Toast funktioniert
- [ ] Promise-Toast (Loading → Success)
- [ ] Position: top-right
- [ ] Keine doppelten Toasts
- [ ] Dismiss funktioniert

---

## 🔄 Migration-Hilfe

### Find & Replace Patterns

**Pattern 1: Mit Titel und Message**
```bash
# Suchen:
showAlert\('success',\s*'([^']*)',?\s*'?([^']*)'?\)

# Ersetzen (kompakt, ohne Titel):
toastService.success('$2')
```

**Pattern 2: Nur Titel (kein Message)**
```bash
# Suchen:
showAlert\('success',\s*'([^']*)'\)

# Ersetzen:
toastService.success('$1')
```

**Weitere Patterns:**
```bash
# Error (kompakt)
showAlert('error', 'TITLE', 'MESSAGE')
→ toastService.error('MESSAGE')

# Info (kompakt)
showAlert('info', 'TITLE', 'MESSAGE')
→ toastService.info('MESSAGE')

# Warning (kompakt)
showAlert('warning', 'TITLE', 'MESSAGE')
→ toastService.warning('MESSAGE')
```

---

## 🐛 Troubleshooting

### Problem: Toast erscheint nicht

**Lösung:**
1. Toaster-Provider im Layout integriert?
2. Import korrekt? (`@/lib/utils/toast`)
3. Browser-Console auf Fehler prüfen

### Problem: Tests schlagen fehl

**Lösung:**
```typescript
// Mock fehlt?
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));
```

### Problem: Toasts stapeln sich

**Lösung:**
```typescript
// Vor neuem Toast alte schließen
toastService.dismiss();
toastService.success('Neue Nachricht');
```

---

## 📞 Support

**Questions?** Siehe Refactoring-Template oder frage im Team

**Maintainer:** CeleroPress Development Team

---

**Version:** 1.0
**Erstellt:** 14. Januar 2025
**Geschätzter Aufwand:** 5 Stunden
**Status:** Ready for Implementation

---

*Dieser Plan ist Teil der kontinuierlichen Code-Quality-Verbesserungen in CeleroPress.*
