# Contributing to SKAMP

Vielen Dank für dein Interesse, zu SKAMP beizutragen! Dieses Dokument erklärt den Prozess für Contributions und unsere Standards.

## 📋 Inhaltsverzeichnis

- [Code of Conduct](#code-of-conduct)
- [Wie kann ich beitragen?](#wie-kann-ich-beitragen)
- [Development Setup](#development-setup)
- [Entwicklungsworkflow](#entwicklungsworkflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Prozess](#pull-request-prozess)
- [Testing](#testing)
- [Dokumentation](#dokumentation)
- [Community](#community)

## 📜 Code of Conduct

### Unsere Standards

- **Respektvoller Umgang**: Wir behandeln alle Mitwirkenden mit Respekt
- **Konstruktives Feedback**: Kritik ist willkommen, sollte aber konstruktiv sein
- **Inklusive Sprache**: Wir verwenden eine einladende und inklusive Sprache
- **Fokus auf das Projekt**: Persönliche Angriffe werden nicht toleriert

## 🤝 Wie kann ich beitragen?

### 1. Bug Reports

Bugs helfen uns, SKAMP zu verbessern. Ein guter Bug Report enthält:

```markdown
**Beschreibung**
Eine klare Beschreibung des Problems.

**Schritte zur Reproduktion**
1. Gehe zu '...'
2. Klicke auf '...'
3. Scrolle zu '...'
4. Fehler erscheint

**Erwartetes Verhalten**
Was sollte passieren?

**Tatsächliches Verhalten**
Was passiert stattdessen?

**Screenshots**
Falls relevant, füge Screenshots hinzu.

**Umgebung**
- Browser: [z.B. Chrome 120]
- OS: [z.B. macOS 14]
- SKAMP Version: [z.B. 1.0.0]
```

### 2. Feature Requests

Feature Requests sind willkommen! Bitte prüfe zuerst, ob es bereits ein ähnliches Issue gibt.

```markdown
**Problem**
Welches Problem löst dieses Feature?

**Lösung**
Beschreibe deine gewünschte Lösung.

**Alternativen**
Welche Alternativen hast du in Betracht gezogen?

**Zusätzlicher Kontext**
Mockups, Beispiele aus anderen Apps, etc.
```

### 3. Code Contributions

- **Kleine Fixes**: Tippfehler, kleine Bugs → Direkt PR erstellen
- **Neue Features**: Erst Issue erstellen und diskutieren
- **Breaking Changes**: Immer erst diskutieren!

## 🛠 Development Setup

### Voraussetzungen

- Node.js 18.17+ oder 20+ (LTS)
- npm 9+ oder yarn 1.22+
- Git
- Firebase CLI (`npm install -g firebase-tools`)
- VS Code (empfohlen) mit Extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript

### Installation

```bash
# 1. Repository forken und klonen
git clone https://github.com/YOUR_USERNAME/skamp.git
cd skamp

# 2. Dependencies installieren
npm install

# 3. Umgebungsvariablen einrichten
cp .env.example .env.local
# Bearbeite .env.local mit deinen Firebase/SendGrid Keys

# 4. Firebase Emulators für lokale Entwicklung
firebase init emulators
# Wähle: Firestore, Auth, Storage

# 5. Development Server starten
npm run dev

# 6. Firebase Emulators starten (in separatem Terminal)
firebase emulators:start
```

### Firebase Emulator Setup

```json
// firebase.json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

```typescript
// src/lib/firebase/config.ts - Emulator Detection
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

## 🔄 Entwicklungsworkflow

### Git Workflow

Wir verwenden Git Flow mit folgenden Branches:

- `main` - Produktions-ready Code
- `develop` - Aktuelle Entwicklung
- `feature/*` - Neue Features
- `fix/*` - Bugfixes
- `hotfix/*` - Dringende Produktions-Fixes

### Branch Naming

```bash
# Features
feature/crm-bulk-import
feature/ai-text-improvement

# Fixes
fix/campaign-editor-crash
fix/firebase-auth-timeout

# Hotfixes (für Production)
hotfix/sendgrid-api-error
```

### Workflow Beispiel

```bash
# 1. Aktuellen develop Branch holen
git checkout develop
git pull origin develop

# 2. Feature Branch erstellen
git checkout -b feature/mein-feature

# 3. Entwickeln und committen
git add .
git commit -m "feat: Add awesome feature"

# 4. Regelmäßig develop mergen
git fetch origin
git merge origin/develop

# 5. Push und PR erstellen
git push origin feature/mein-feature
```

## 💻 Code Style Guidelines

### TypeScript

```typescript
// ✅ GOOD: Explizite Typen
interface User {
  id: string;
  email: string;
  createdAt: Timestamp;
}

const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
  // Implementation
};

// ❌ BAD: Any types
const updateUser = async (userId: any, data: any) => {
  // Implementation
};

// ✅ GOOD: Null checks
const userName = user?.name ?? 'Anonymous';

// ❌ BAD: Assuming values exist
const userName = user.name; // Could be undefined
```

### React/Next.js

```typescript
// ✅ GOOD: Functional Components mit TypeScript
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary',
  disabled = false 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 rounded-lg transition-colors',
        variant === 'primary' && 'bg-primary text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
};

// ❌ BAD: Class Components, PropTypes
class Button extends React.Component {
  // Don't use class components
}
```

### Tailwind CSS

```tsx
// ✅ GOOD: Utility-first, responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
  <Card className="hover:shadow-lg transition-shadow" />
</div>

// ❌ BAD: Inline styles, custom CSS
<div style={{ display: 'grid', gap: '1rem' }}>
  <Card style={{ boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} />
</div>

// ✅ GOOD: Component variants with cn()
import { cn } from '@/lib/utils';

<button className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "disabled-classes"
)} />
```

### Firebase/Firestore

```typescript
// ✅ GOOD: Service Layer Pattern
// src/lib/firebase/services/company-service.ts
export const companyService = {
  async getById(id: string): Promise<Company | null> {
    const docRef = doc(db, 'companies', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Company : null;
  },

  async create(data: Omit<Company, 'id' | 'createdAt'>): Promise<string> {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'companies'), docData);
    return docRef.id;
  }
};

// ❌ BAD: Direct Firestore calls in components
const MyComponent = () => {
  useEffect(() => {
    // Don't do this in components
    const q = query(collection(db, 'companies'));
    // ...
  }, []);
};
```

### Error Handling

```typescript
// ✅ GOOD: Comprehensive error handling
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  
  // User-friendly error messages
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      throw new Error('Sie haben keine Berechtigung für diese Aktion');
    }
  }
  
  // Default error
  throw new Error('Ein unerwarteter Fehler ist aufgetreten');
}

// ❌ BAD: Generic error handling
try {
  return await riskyOperation();
} catch (e) {
  console.log(e);
  throw e;
}
```

## 📝 Commit Guidelines

Wir folgen den [Conventional Commits](https://www.conventionalcommits.org/) Standards.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: Neues Feature
- `fix`: Bugfix
- `docs`: Dokumentation
- `style`: Code-Formatierung (keine Funktionsänderung)
- `refactor`: Code-Refactoring
- `perf`: Performance-Verbesserungen
- `test`: Tests hinzufügen/ändern
- `chore`: Build-Prozess, Tools, Dependencies

### Beispiele

```bash
# Feature
feat(crm): Add bulk import functionality for contacts

# Fix
fix(campaign): Resolve editor crash when pasting images

# Docs
docs(api): Update SendGrid webhook documentation

# Mit Breaking Change
feat(auth)!: Change authentication to use sessions

BREAKING CHANGE: JWT tokens are no longer supported.
Users need to re-authenticate after deployment.
```

### Commit Message Regeln

- **Präsens** verwenden ("Add feature" nicht "Added feature")
- **Kleinschreibung** für scope
- **Kein Punkt** am Ende der Subject-Line
- **Max 72 Zeichen** für Subject
- **Body** für Details (Was und Warum)

## 🔄 Pull Request Prozess

### Vor dem PR

- [ ] Code läuft lokal ohne Fehler
- [ ] Alle Tests bestehen
- [ ] Linter zeigt keine Fehler
- [ ] Dokumentation aktualisiert (falls nötig)
- [ ] CHANGELOG.md aktualisiert

### PR Template

```markdown
## Beschreibung
Kurze Beschreibung der Änderungen.

## Art der Änderung
- [ ] Bugfix
- [ ] Neues Feature
- [ ] Breaking Change
- [ ] Dokumentation

## Checkliste
- [ ] Code folgt den Style Guidelines
- [ ] Selbst-Review durchgeführt
- [ ] Tests hinzugefügt/aktualisiert
- [ ] Dokumentation aktualisiert
- [ ] Keine neuen Warnungen

## Screenshots (falls relevant)
Vorher/Nachher Screenshots für UI-Änderungen.

## Verwandte Issues
Fixes #123
```

### Review-Prozess

1. **Automatische Checks**: Linter, Tests, Build
2. **Code Review**: Mind. 1 Approval erforderlich
3. **Funktionstest**: Feature in Preview-Deployment testen
4. **Merge**: Squash and merge in `develop`

### Review-Kriterien

- **Funktionalität**: Löst es das Problem?
- **Code-Qualität**: Lesbar, wartbar, effizient?
- **Tests**: Ausreichende Test-Coverage?
- **Dokumentation**: Ist alles dokumentiert?
- **Performance**: Keine Regression?
- **Sicherheit**: Keine Sicherheitslücken?

## 🧪 Testing

### Test-Struktur

```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Test-Befehle

```bash
# Alle Tests ausführen
npm test

# Tests im Watch-Mode
npm test -- --watch

# Coverage Report
npm test -- --coverage

# Spezifische Test-Datei
npm test Button.test.tsx
```

### Testing Guidelines

- **Unit Tests**: Für Utilities und Services
- **Component Tests**: Mit React Testing Library
- **Integration Tests**: Für kritische User Flows
- **E2E Tests**: Für komplette Workflows (Cypress/Playwright)

## 📚 Dokumentation

### Code-Dokumentation

```typescript
/**
 * Erstellt eine neue Kampagne mit KI-generierten Inhalten
 * 
 * @param prompt - Der Eingabe-Prompt für die KI
 * @param context - Kontext-Informationen (Branche, Ton, Zielgruppe)
 * @returns Die generierte Kampagne mit strukturiertem Inhalt
 * @throws {Error} Wenn die KI-Generierung fehlschlägt
 * 
 * @example
 * const campaign = await createAICampaign(
 *   "Produktlaunch für neue Software",
 *   { industry: "tech", tone: "professional" }
 * );
 */
export async function createAICampaign(
  prompt: string,
  context: AIContext
): Promise<Campaign> {
  // Implementation
}
```

### README Updates

Bei neuen Features, aktualisiere:
- Feature-Liste in README.md
- Setup-Anweisungen (falls nötig)
- Umgebungsvariablen in .env.example

### ADR (Architecture Decision Records)

Für größere Architektur-Entscheidungen:

```markdown
# ADR-XXXX: Titel

**Status:** Proposed
**Datum:** YYYY-MM-DD
**Entscheider:** Name

## Kontext
Warum brauchen wir diese Entscheidung?

## Entscheidung
Was haben wir entschieden?

## Konsequenzen
Was sind die Auswirkungen?
```

## 🌍 Community

### Kommunikation

- **GitHub Issues**: Für Bugs und Features
- **GitHub Discussions**: Für Fragen und Ideen
- **Email**: entwicklung@skamp.de (für sensible Themen)

### Anerkennung

Alle Mitwirkenden werden in:
- CONTRIBUTORS.md aufgeführt
- Release Notes erwähnt
- README.md Credits (bei größeren Beiträgen)

### Erste Schritte für neue Contributors

1. Such dir ein "good first issue" Label
2. Kommentiere, dass du daran arbeiten möchtest
3. Stelle Fragen, wenn etwas unklar ist
4. Erstelle einen Draft PR früh für Feedback

## 🎉 Danke!

Danke, dass du SKAMP besser machen möchtest! Jeder Beitrag, egal wie klein, wird geschätzt.

---

*Happy Coding! 🚀*