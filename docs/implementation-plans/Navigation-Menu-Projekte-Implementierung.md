# Navigation Menu "Projekte" Implementierungsplan

## Übersicht
Implementierungsplan für den neuen "Projekte" Menüpunkt in der CeleroPress Top-Navigation. Dieser wird als gleichwertiger Hauptmenüpunkt neben den bestehenden Modulen positioniert.

---

## SCHRITT 1: TOP-NAVIGATION ERWEITERN

### 1.1 Bestehende Navigation-Struktur analysieren
**Agent:** `general-purpose`
**Dauer:** 0.2 Tage

**Aufgaben:**
1. Bestehende Navigation-Komponente lokalisieren
2. Current Navigation-Pattern verstehen
3. Routing-Struktur analysieren
4. Design-System Compliance prüfen

**Zu findende Dateien:**
- Hauptnavigation Komponente (wahrscheinlich in `src/components/layout/`)
- App-Router oder Navigation-Config
- Bestehende Dashboard-Routes

---

## SCHRITT 2: NAVIGATION-KOMPONENTE ERWEITERN

### 2.1 Navigation-Item "Projekte" hinzufügen
**Datei:** Bestehende Navigation-Komponente erweitern
**Agent:** `general-purpose`
**Dauer:** 0.2 Tage

**Umsetzung:**
```typescript
// Beispiel-Erweiterung der Navigation
const navigationItems = [
  // ... bestehende Items ...
  {
    id: 'projects',
    name: 'Projekte',
    href: '/dashboard/projects',
    icon: FolderIcon, // /24/outline Heroicon
    current: pathname.startsWith('/dashboard/projects'),
    permissions: ['projects.read'] // Falls Permission-System vorhanden
  }
  // ... weitere Items ...
];
```

**Design-Anforderungen:**
- ✅ Nur /24/outline Heroicons verwenden
- ✅ Konsistente Hover-States wie bestehende Items
- ✅ Active-State Styling
- ✅ Mobile-responsive Darstellung

---

## SCHRITT 3: ROUTING KONFIGURIEREN

### 3.1 Route für /dashboard/projects erstellen
**Datei:** Next.js App-Router erweitern
**Agent:** `general-purpose`
**Dauer:** 0.1 Tage

**Umsetzung:**
```typescript
// src/app/dashboard/projects/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projekte | CeleroPress',
  description: 'Projekt-Pipeline Management'
};

export default function ProjectsPage() {
  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Projekte</h1>
        <p className="text-gray-600 mt-2">
          Verwalten Sie Ihre PR-Projekte in der Pipeline
        </p>
      </div>
      
      {/* Placeholder Content */}
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="max-w-md mx-auto">
          <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Projekt-Pipeline wird geladen
          </h3>
          <p className="text-gray-600 mb-6">
            Das Kanban-Board für Ihre Projekt-Pipeline wird in Kürze verfügbar sein.
          </p>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Geplante Features:</h4>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• 7-Phasen Kanban-Board</li>
              <li>• Integriertes Task-Management</li>
              <li>• Team-Kollaboration</li>
              <li>• Asset-Verknüpfungen</li>
              <li>• Automatische Workflows</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Layout-Integration:**
```typescript
// src/app/dashboard/projects/layout.tsx
export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="projects-layout">
      {children}
    </div>
  );
}
```

---

## SCHRITT 4: PERMISSION-SYSTEM INTEGRATION (falls vorhanden)

### 4.1 Projekt-Berechtigung konfigurieren
**Agent:** `general-purpose`
**Dauer:** 0.1 Tage

**Umsetzung:**
```typescript
// Falls ein Permission-System vorhanden ist
const projectPermissions = {
  'projects.read': 'Projekte anzeigen',
  'projects.write': 'Projekte bearbeiten', 
  'projects.create': 'Projekte erstellen',
  'projects.delete': 'Projekte löschen'
};

// Navigation-Item nur anzeigen wenn Berechtigung vorhanden
const showProjectsNav = hasPermission('projects.read');
```

**Multi-Tenancy Integration:**
```typescript
// Projekt-Page mit Organization-Check
export default function ProjectsPage() {
  const { organizationId, user } = useAuth();
  
  if (!organizationId) {
    return <UnauthorizedPage />;
  }
  
  return (
    // ... Projekt-Interface
  );
}
```

---

## SCHRITT 5: MOBILE-NAVIGATION ERWEITERN

### 5.1 Mobile-Navigation-Pattern folgen
**Agent:** `general-purpose`
**Dauer:** 0.1 Tage

**Umsetzung:**
```typescript
// Mobile Navigation erweitern
const mobileNavItems = [
  // ... bestehende Items ...
  {
    name: 'Projekte',
    href: '/dashboard/projects',
    icon: FolderIcon,
    current: pathname.startsWith('/dashboard/projects')
  }
];

// Mobile-Navigation Component
<div className="mobile-nav md:hidden">
  {mobileNavItems.map((item) => (
    <Link
      key={item.name}
      href={item.href}
      className={cn(
        'flex items-center px-4 py-2 text-sm font-medium',
        item.current
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-700 hover:bg-gray-50'
      )}
    >
      <item.icon className="h-5 w-5 mr-3" />
      {item.name}
    </Link>
  ))}
</div>
```

---

## SCHRITT 6: TESTS ERSTELLEN

### 6.1 Navigation-Tests erweitern
**Agent:** `test-writer`
**Dauer:** 0.2 Tage

**Umsetzung:**
```typescript
// src/__tests__/components/navigation/Navigation.test.tsx
describe('Navigation - Projects Integration', () => {
  it('should show Projects menu item', () => {
    render(<Navigation />);
    expect(screen.getByText('Projekte')).toBeInTheDocument();
  });

  it('should navigate to projects page', () => {
    const router = createMockRouter();
    render(<Navigation />);
    
    fireEvent.click(screen.getByText('Projekte'));
    expect(router.push).toHaveBeenCalledWith('/dashboard/projects');
  });

  it('should highlight Projects when on projects page', () => {
    mockRouter.mockReturnValue({
      pathname: '/dashboard/projects',
      // ... other router props
    });
    
    render(<Navigation />);
    
    const projectsLink = screen.getByText('Projekte');
    expect(projectsLink.closest('a')).toHaveClass('current-active-class');
  });

  it('should respect permissions for Projects menu', () => {
    mockPermissions.mockReturnValue({
      hasPermission: (perm: string) => perm !== 'projects.read'
    });
    
    render(<Navigation />);
    expect(screen.queryByText('Projekte')).not.toBeInTheDocument();
  });

  it('should work in mobile navigation', () => {
    mockViewport({ width: 640 }); // Mobile breakpoint
    
    render(<Navigation />);
    
    // Open mobile menu
    fireEvent.click(screen.getByLabelText('Menu'));
    expect(screen.getByText('Projekte')).toBeInTheDocument();
  });
});
```

**Route-Test:**
```typescript
// src/__tests__/pages/dashboard/projects.test.tsx
describe('Projects Page', () => {
  it('should render projects placeholder page', () => {
    render(<ProjectsPage />);
    
    expect(screen.getByText('Projekte')).toBeInTheDocument();
    expect(screen.getByText('Projekt-Pipeline wird geladen')).toBeInTheDocument();
    expect(screen.getByText('7-Phasen Kanban-Board')).toBeInTheDocument();
  });

  it('should enforce authentication', () => {
    mockAuth.mockReturnValue({ user: null, organizationId: null });
    
    render(<ProjectsPage />);
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('should have correct metadata', () => {
    expect(metadata.title).toBe('Projekte | CeleroPress');
    expect(metadata.description).toBe('Projekt-Pipeline Management');
  });
});
```

---

## SCHRITT 7: ACCESSIBILITY & UX

### 7.1 Screen Reader Support
**Agent:** `general-purpose`
**Dauer:** 0.1 Tage

**Umsetzung:**
```typescript
// Navigation mit ARIA-Labels
<nav role="navigation" aria-label="Hauptnavigation">
  <ul>
    <li>
      <Link
        href="/dashboard/projects"
        aria-current={current ? 'page' : undefined}
        className="nav-link"
      >
        <FolderIcon className="h-5 w-5" aria-hidden="true" />
        <span>Projekte</span>
      </Link>
    </li>
  </ul>
</nav>
```

### 7.2 Keyboard Navigation
```typescript
// Keyboard-Support für Navigation
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      navigateToProjects();
      break;
  }
};
```

---

## SCHRITT 8: DOKUMENTATION

### 8.1 Navigation-Änderung dokumentieren
**Agent:** `documentation-orchestrator`
**Dauer:** 0.1 Tage

**Aufgaben:**
1. Navigation-Struktur-Dokumentation aktualisieren
2. Routing-Übersicht erweitern  
3. User-Guide für neuen Menüpunkt
4. Development-Guide für Navigation-Pattern

---

## ERFOLGSKRITERIEN

### Funktionale Anforderungen:
- ✅ "Projekte" Menüpunkt in Top-Navigation sichtbar
- ✅ Navigation zu `/dashboard/projects` funktioniert
- ✅ Placeholder-Page lädt korrekt
- ✅ Mobile-Navigation erweitert
- ✅ Active-State Highlighting funktional

### Qualitätsanforderungen:
- ✅ Tests für Navigation-Erweiterung
- ✅ Screen Reader Support
- ✅ Keyboard Navigation funktional
- ✅ Mobile-responsive Design
- ✅ Design-System Compliance

### Integration-Requirements:
- ✅ Bestehende Navigation unverändert
- ✅ Permission-System Integration (falls vorhanden)
- ✅ Multi-Tenancy-Schutz
- ✅ Consistent UX mit anderen Modulen

---

## RISIKEN & MITIGATION

### Risiko 1: Bestehende Navigation-Struktur beschädigen
**Mitigation:** Nur additive Änderungen, keine Modifikation bestehender Items

### Risiko 2: Mobile-Navigation Overflow
**Mitigation:** Responsive Design-Tests, ggf. Navigation-Collapse

### Risiko 3: Permission-System Inkonsistenz  
**Mitigation:** Bestehende Permission-Patterns analysieren und folgen

---

## TIMELINE

| Schritt | Dauer | Beschreibung |
|---------|-------|--------------|
| 1 | 0.2 Tage | Navigation-Struktur analysieren |
| 2 | 0.2 Tage | Menu-Item hinzufügen |
| 3 | 0.1 Tage | Routing konfigurieren |
| 4 | 0.1 Tage | Permissions integrieren |
| 5 | 0.1 Tage | Mobile-Navigation |
| 6 | 0.2 Tage | Tests erstellen |
| 7 | 0.1 Tage | Accessibility |
| 8 | 0.1 Tage | Dokumentation |

**Gesamt-Dauer: 1.1 Tage (aufgerundet auf 1.5 Tage für Buffer)**

---

## NÄCHSTE SCHRITTE

Nach erfolgreichem Abschluss:
1. **Navigation-Tests validieren** in allen Browser/Device-Kombinationen
2. **User-Feedback** zur Navigation-Ergänzung einholen
3. **Performance-Impact** der zusätzlichen Route messen
4. **Weiter mit Phase 1** des Hauptplans: Pipeline-Datenstruktur

**Dieser Navigation-Punkt ist die Basis für alle weiteren Projekt-Pipeline Features und muss als erstes implementiert werden.**