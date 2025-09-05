# Kanban-Board UI - Spezifikation

## Anwendungskontext

Das **Kanban-Board** ist die zentrale visuelle Oberfläche der Projekt-Pipeline, die alle PR-Projekte in einem übersichtlichen Board mit 7 Pipeline-Phasen darstellt. Es fungiert als Dashboard für das gesamte Team und bietet Drag & Drop-Funktionalität für intuitive Projekt-Navigation.

**Kernfunktionalitäten:**
- 7-Spalten Kanban-Board für alle Pipeline-Phasen
- Drag & Drop zwischen Pipeline-Stages
- Real-time Team-Collaboration mit Live-Updates
- Umfassendes Filter- und Such-System
- Mobile-responsive Design für alle Endgeräte

---

## UI-Framework & Design Standards

### CeleroPress Design System v2.0 Compliance
**Strenge Einhaltung bestehender Patterns:**
- Nur `/24/outline` Heroicons verwenden
- Keine Shadow-Effekte (Design Pattern)
- CeleroPress Farb-Schema verwenden
- Bestehende UI-Komponenten wiederverwenden
- Konsistente Typography und Spacing

### Responsive Design Approach
**Mobile-First Strategie:**
```typescript
// Responsive Breakpoints
const BREAKPOINTS = {
  mobile: '320px-767px',   // Accordion-View
  tablet: '768px-1199px',  // 3-Column Layout  
  desktop: '1200px+',      // Full 7-Column Board
};
```

---

## Board Layout Architecture

### 7-Spalten Pipeline Structure
**Horizontal Kanban-Layout:**
```
| Ideas/Planning | Creation | Internal | Customer | Distribution | Monitoring | Completed |
|               |          | Approval | Approval |              |            |           |
|   [Cards...]   | [Cards]  | [Cards]  | [Cards]  |   [Cards]    |  [Cards]   | [Cards]   |
```

### Column Configuration
**Flexible Spalten-Management:**
```typescript
interface KanbanColumn {
  id: PipelineStage;
  title: string;
  subtitle?: string;
  color: string;
  maxItems?: number;
  allowDrop: boolean;
  sortOrder: number;
}
```

### Project Card Design
**Kompakte Informations-Darstellung:**
- **Header**: Projekt-Titel + Priority-Badge
- **Meta**: Kunde, Team, Deadline
- **Progress**: Task-Completion Bar
- **Tags**: Status-Badges und Custom-Tags
- **Actions**: Quick-Actions für häufige Tasks

---

## Drag & Drop Functionality

### React DnD Integration
**Intuitive Projekt-Navigation:**
```typescript
// Drag & Drop Implementation
interface DragDropConfig {
  dragType: 'PROJECT_CARD';
  canDrop: (item: Project, targetStage: PipelineStage) => boolean;
  onDrop: (item: Project, targetStage: PipelineStage) => Promise<void>;
  collectDrag: (monitor: DragSourceMonitor) => DragState;
  collectDrop: (monitor: DropTargetMonitor) => DropState;
}
```

### Drag Validation Rules
**Business Logic Enforcement:**
- Kritische Tasks müssen abgeschlossen sein
- Team-Permissions prüfen
- Stage-Requirements validieren  
- Multi-Tenancy-Isolation gewährleisten

### Visual Feedback System
**Drag State Indicators:**
- **Dragging**: Card-Opacity 50%, Cursor-Change
- **Drop-Zone**: Column-Highlight, Border-Change
- **Invalid-Drop**: Red-Border, Error-Animation
- **Success**: Green-Flash, Smooth-Transition

---

## Real-time Collaboration Features

### Live Updates via Firestore
**Instant Synchronisation:**
```typescript
// Real-time Listeners
const useBoardRealtime = (organizationId: string) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  
  useEffect(() => {
    // Firestore Real-time Queries
    const projectsQuery = query(
      collection(db, 'projects'),
      where('organizationId', '==', organizationId),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(projectsQuery, handleProjectUpdates);
  }, [organizationId]);
};
```

### User Presence Indicators
**Team-Collaboration Awareness:**
- **Active Users**: Avatar-Bubbles auf Board
- **Editing Indicators**: "User X bearbeitet Projekt Y"
- **Recent Changes**: Highlight für kürzlich aktualisierte Cards
- **Conflict Resolution**: Optimistic Updates mit Rollback

### Multi-User Drag & Drop
**Collision-Prevention:**
```typescript
// Prevent Drag Conflicts
interface DragLock {
  projectId: string;
  userId: string;
  lockedAt: Timestamp;
  expiresAt: Timestamp;
}
```

---

## Filter & Search System

### Advanced Filtering Options
**9+ Filter-Kategorien:**
```typescript
interface BoardFilters {
  search: string;                    // Freitext-Suche
  customers: string[];               // Kunden-Filter
  teamMembers: string[];             // Team-Filter
  priority: ProjectPriority[];       // Priorität
  status: ProjectStatus[];           // Status
  tags: string[];                    // Custom-Tags
  dateRange: [Date, Date];          // Zeitraum
  overdue: boolean;                  // Überfällige Projekte
  critical: boolean;                 // Kritische Tasks
}
```

### Smart Search Implementation
**Intelligent Suche:**
- **Fuzzy Search**: Typo-Toleranz
- **Multi-Field**: Titel, Beschreibung, Tags, Kunde
- **Highlight**: Search-Terms in Ergebnissen
- **Auto-Complete**: Vorschläge basierend auf Historie

### Filter Persistence
**User Experience Optimierung:**
- Filter-State in Local Storage
- User-spezifische Default-Filter
- Quick-Filter-Buttons für häufige Kombinationen
- Filter-Reset mit einem Klick

---

## Mobile Responsiveness

### Accordion View (Mobile)
**Platzsparende Navigation:**
```typescript
// Mobile Accordion Implementation
interface MobileAccordion {
  sections: {
    stage: PipelineStage;
    title: string;
    count: number;
    isExpanded: boolean;
    projects: Project[];
  }[];
  expandedStage: PipelineStage | null;
  onToggle: (stage: PipelineStage) => void;
}
```

### Touch Gestures
**Native Mobile Experience:**
- **Swipe-Navigation**: Between Columns
- **Long-Press**: Context-Menu
- **Pull-to-Refresh**: Board aktualisieren
- **Pinch-to-Zoom**: Card-Detail-View

### Tablet Optimization
**3-Column Hybrid-Layout:**
- Kombiniert-Spalten für bessere Übersicht
- Swipe zwischen Column-Groups
- Optimierte Touch-Targets (min. 44px)

---

## Performance Optimization

### Virtualization Strategy
**Große Datenmengen handhaben:**
```typescript
// React-Window Integration für >100 Projekte
import { FixedSizeGrid as Grid } from 'react-window';

const VirtualizedKanbanBoard = ({ projects }: { projects: Project[] }) => {
  const COLUMN_WIDTH = 320;
  const ROW_HEIGHT = 200;
  
  return (
    <Grid
      columnCount={7}
      rowCount={Math.ceil(projects.length / 7)}
      width={COLUMN_WIDTH * 7}
      height={600}
      columnWidth={COLUMN_WIDTH}
      rowHeight={ROW_HEIGHT}
    >
      {({ columnIndex, rowIndex, style }) => (
        <div style={style}>
          <ProjectCard project={getProjectAt(columnIndex, rowIndex)} />
        </div>
      )}
    </Grid>
  );
};
```

### Lazy Loading Implementation
**Progressive Loading:**
- Initial Load: Erste 20 Projekte pro Spalte
- Infinite Scroll: Weitere Projekte bei Bedarf
- Image Lazy-Loading: Projekt-Thumbnails
- Component Code-Splitting: Nicht-sichtbare Features

### State Management Optimization
**Efficient Updates:**
- Immutable State Updates
- Memoized Components wo sinnvoll
- Debounced Search/Filter (300ms)
- Optimistic UI Updates

---

## Accessibility (A11Y) Features

### Keyboard Navigation
**Vollständige Tastatur-Steuerung:**
- **Tab-Order**: Logische Navigation durch Board
- **Arrow-Keys**: Navigation zwischen Cards/Columns
- **Enter/Space**: Card-Actions auslösen
- **Escape**: Modal/Dialog schließen

### Screen Reader Support
**ARIA-Labels & Descriptions:**
```typescript
// Accessibility Attributes
const ProjectCard = ({ project }: { project: Project }) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={`Projekt ${project.title}, Status: ${project.currentStage}`}
    aria-describedby={`project-${project.id}-details`}
    onKeyDown={handleKeyboardNavigation}
  >
    {/* Card Content */}
  </div>
);
```

### Visual Accessibility
**Inclusive Design:**
- Hohe Kontrast-Verhältnisse (WCAG 2.1 AA)
- Farben-unabhängige Informationsvermittlung
- Skalierbare Text-Größen (bis 200%)
- Reduce-Motion Respektierung

---

## Integration Architecture

### Component Hierarchy
```typescript
KanbanBoard
├── BoardHeader (Search, Filters, Actions)
├── BoardColumns (7x KanbanColumn)
│   ├── ColumnHeader (Title, Count, Actions)
│   ├── ColumnDropZone (Drag & Drop Target)
│   └── ProjectCardList
│       └── ProjectCard (Draggable Items)
├── BoardFilters (Advanced Filter Panel)
├── ProjectCreationFab (Floating Action Button)
└── BoardSettingsMenu (View Options, Preferences)
```

### State Management Pattern
```typescript
// Zustand-Management mit Context + Reducer
interface BoardState {
  projects: Project[];
  filters: BoardFilters;
  dragState: DragState;
  loading: boolean;
  error: string | null;
  selectedProjects: string[];
  viewMode: 'board' | 'list' | 'calendar';
}

type BoardAction = 
  | { type: 'LOAD_PROJECTS_SUCCESS'; payload: Project[] }
  | { type: 'UPDATE_FILTER'; payload: Partial<BoardFilters> }
  | { type: 'DRAG_START'; payload: { projectId: string } }
  | { type: 'DRAG_END'; payload: { projectId: string; targetStage: PipelineStage } };
```

### External System Integration
**Nahtlose CeleroPress-Integration:**
- Shared Authentication Context
- Unified Notification System  
- Common Error Handling
- Consistent Loading States

---

## Testing Strategy

### Unit Tests
**Component-Level Testing:**
- Drag & Drop Functionality
- Filter Logic
- Search Algorithms  
- State Transitions

### Integration Tests
**System-Level Testing:**
- Firestore Real-time Updates
- Multi-User Collaboration
- Cross-Device Synchronization
- Performance under Load

### E2E Tests
**User Journey Testing:**
- Projekt durch komplette Pipeline bewegen
- Filter- und Such-Workflows
- Mobile/Desktop Feature-Parity
- Accessibility Compliance

---

## Success Criteria

### Performance Benchmarks
- ✅ Board lädt in <2 Sekunden (50 Projekte)
- ✅ Drag & Drop Response-Time <100ms
- ✅ Real-time Updates <500ms Latenz
- ✅ Mobile-Performance äquivalent zu Desktop

### User Experience Goals
- ✅ Intuitive Navigation ohne Training
- ✅ Vollständige Mobile-Funktionalität
- ✅ Accessibility Score: WCAG 2.1 AA
- ✅ User-Preference Persistierung

### Technical Requirements
- ✅ Multi-Tenancy-Sicherheit gewährleistet
- ✅ Real-time Collaboration ohne Konflikte
- ✅ Skalierbarkeit für 1000+ Projekte
- ✅ Offline-Capability (Basic View)

**Das Kanban-Board bildet das Herzstück der Projekt-Pipeline und muss höchsten UX- und Performance-Standards genügen.**