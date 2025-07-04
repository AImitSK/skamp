# ADR-0006: Context API statt Redux für State Management

**Status:** Accepted  
**Datum:** 2024-12-21  
**Entscheider:** Development Team  

## Kontext

SKAMP benötigt eine Lösung für globales State Management:
- Authentifizierungs-Status
- Benutzerdaten
- Shared Data zwischen Komponenten (z.B. CRM-Daten)
- App-weite Einstellungen

Die Lösung sollte:
- Einfach zu verstehen und zu warten sein
- Gut mit Next.js App Router funktionieren
- Nicht überdimensioniert sein
- TypeScript-freundlich sein

## Entscheidung

Wir verwenden React Context API mit Custom Hooks für State Management.

## Alternativen

### Option 1: React Context API ✅
- **Vorteile:**
  - Native React-Lösung (kein Extra-Dependency)
  - Einfach zu verstehen
  - Perfekt für kleine bis mittlere Apps
  - Gute TypeScript-Integration
  - Funktioniert gut mit Server Components
  - Kein Boilerplate
- **Nachteile:**
  - Performance-Probleme bei sehr häufigen Updates
  - Kein Time-Travel Debugging
  - Keine DevTools
  - Context-Verschachtelung kann komplex werden

### Option 2: Redux Toolkit
- **Vorteile:**
  - Industriestandard
  - Mächtige DevTools
  - Time-Travel Debugging
  - Optimiert für Performance
  - Große Community
- **Nachteile:**
  - Overkill für SKAMP
  - Steile Lernkurve
  - Viel Boilerplate (trotz Toolkit)
  - Zusätzliche Komplexität
  - 43KB Bundle-Größe

### Option 3: Zustand
- **Vorteile:**
  - Sehr leichtgewichtig (8KB)
  - Einfache API
  - TypeScript-first
  - Kein Provider nötig
- **Nachteile:**
  - Externe Dependency
  - Kleinere Community
  - Weniger Patterns etabliert

### Option 4: Jotai
- **Vorteile:**
  - Atomic State Management
  - React Suspense Support
  - Keine Provider
- **Nachteile:**
  - Relativ neu
  - Andere Mental Model
  - Kleine Community

### Option 5: Server State Only (React Query/SWR)
- **Vorteile:**
  - Optimal für Server-Daten
  - Eingebautes Caching
  - Optimistic Updates
- **Nachteile:**
  - Löst nicht Client-State Problem
  - Zusätzliche Dependency
  - Nicht für Auth-State geeignet

## Begründung

Context API wurde gewählt, weil:
1. **Einfachheit**: SKAMP ist (noch) keine komplexe App mit hunderten Komponenten
2. **Kein Overhead**: Keine zusätzlichen Libraries oder Konzepte
3. **Ausreichend**: Deckt alle aktuellen Use Cases ab
4. **Vertraut**: Standard React-Pattern, jeder React-Dev kennt es
5. **Migration**: Bei Bedarf später einfach zu Redux migrierbar

## Konsequenzen

### Positive
- Minimale Lernkurve
- Weniger Code zu warten
- Kleinere Bundle-Größe
- Native React-Lösung
- Einfaches Onboarding neuer Entwickler

### Negative
- Re-Renders bei Context-Updates (optimization nötig)
- Keine ausgefeilten DevTools
- Manuelles Performance-Tuning bei Wachstum
- Pattern müssen selbst etabliert werden

### Neutral
- Context-Splitting für Performance
- Custom Hooks für Context-Zugriff
- useReducer für komplexere State-Logik

## Notizen

### Implementierte Contexts
```typescript
// Auth Context - Kritisch, selten Updates
<AuthContext.Provider>
  
// CRM Data Context - Shared Data, moderate Updates  
<CrmDataContext.Provider>

// App Context - UI State, häufige Updates
<AppContext.Provider>
```

### Best Practices
1. **Context Splitting**: Separater Context pro Concern
2. **Memoization**: useMemo für Context-Values
3. **Custom Hooks**: Kapseln Context-Zugriff
4. **Lazy Initial State**: Für teure Initialisierungen

### Performance-Optimierungen
```typescript
// Beispiel: Optimierter Context
const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Memoize context value
  const value = useMemo(
    () => ({ state, dispatch }),
    [state]
  );
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
```

### Migrations-Pfad zu Redux
Falls SKAMP stark wächst und Redux nötig wird:
1. Redux Toolkit installieren
2. Contexts einzeln migrieren
3. Custom Hooks beibehalten (nur Implementation ändern)
4. Schrittweise Migration möglich

### Wann Redux reconsideren?
- [ ] > 100 Komponenten mit Shared State
- [ ] Complex Time-Based Logic
- [ ] Multiple Entwickler-Teams
- [ ] Debugging wird zum Problem
- [ ] Performance-Probleme trotz Optimierung

## Referenzen

- [React Context Documentation](https://react.dev/learn/passing-data-deeply-with-context)
- [Context vs Redux](https://www.robinwieruch.de/react-state-usereducer-usestate-usecontext/)
- [Performance Optimization](https://react.dev/reference/react/useMemo#optimizing-by-skipping-expensive-recalculations)