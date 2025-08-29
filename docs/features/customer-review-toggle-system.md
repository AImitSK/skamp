# Customer-Freigabe Toggle-System

## Übersicht

Das Customer-Freigabe Toggle-System ist eine interaktive Benutzeroberfläche, die es Kunden ermöglicht, verschiedene Aspekte einer PDF-Kampagne in organisierte, erweiterbare Bereiche zu überprüfen und zu genehmigen. Das System basiert auf einem Toggle-basierten Design mit vier Hauptbereichen:

1. **Medien-Anzeige** - Übersicht aller verwendeten Medien
2. **PDF-Versionshistorie** - Chronologische Auflistung aller PDF-Versionen  
3. **Kommunikation** - Nachrichten und Feedback zwischen Kunde und Agentur
4. **Freigabe-Entscheidung** - Interface zur finalen Genehmigung oder Ablehnung

## Architektur

### Komponenten-Struktur

```
src/components/customer-review/toggle/
├── index.ts                          # Export-Index
├── BaseToggleBox.tsx                 # Basis-Toggle-Komponente
├── MediaToggleBox.tsx                # Medien-spezifische Toggle-Box
├── PDFHistoryToggleBox.tsx          # PDF-Historie Toggle-Box
├── CommunicationToggleBox.tsx       # Kommunikations-Toggle-Box
├── DecisionToggleBox.tsx            # Entscheidungs-Toggle-Box
├── CustomerReviewToggleContainer.tsx # Haupt-Container
├── useCustomerReviewToggle.ts       # Haupt-Hook
├── useToggleState.ts                # State-Management Hook
├── useTogglePersistence.ts          # Persistierung Hook
├── toggleUtils.ts                   # Utility-Funktionen
└── toggleAnimations.ts              # Animation-Utilities
```

### Typ-Definitionen

Alle TypeScript-Typen sind in `src/types/customer-review.ts` definiert:

- `ToggleBoxProps` - Basis-Props für alle Toggle-Boxen
- `MediaToggleBoxProps` - Medien-spezifische Props
- `PDFHistoryToggleBoxProps` - PDF-Historie Props
- `CommunicationToggleBoxProps` - Kommunikations-Props
- `DecisionToggleBoxProps` - Entscheidungs-Props
- `ToggleState` - Zustands-Management
- `CustomerReviewToggleContext` - Gesamter Context

## Design System Integration

### CeleroPress Design System v2.0 Konformität

- **Icons**: Ausschließlich Heroicons /24/outline
- **Farben**: CeleroPress Farbpalette
- **Typografie**: Systemkonforme Schriftarten und -größen
- **Spacing**: 4px-Grid-System
- **Keine Schatten-Effekte**: Gemäß Design-Richtlinien

### Responsive Design

```typescript
// Breakpoints
const breakpoints = {
  mobile: '320px',
  tablet: '768px', 
  desktop: '1024px',
  wide: '1440px'
};
```

### Toggle-Box Layout

```
┌─────────────────────────────────┐
│ [Icon] Titel            [Badge] │ ← Header (immer sichtbar)
│                         [↓/↑]   │
├─────────────────────────────────┤
│                                 │ ← Content (erweiterbar)
│ Inhalt basierend auf Toggle-Typ │
│                                 │
└─────────────────────────────────┘
```

## Funktionale Anforderungen

### Toggle-Verhalten

1. **Einzelerweiterung**: Standardmäßig nur eine Toggle-Box gleichzeitig geöffnet
2. **Konfigurierbare Limits**: Maximal 2 gleichzeitig erweiterte Boxen (konfigurierbar)
3. **Persistierung**: Toggle-Status wird im LocalStorage gespeichert
4. **Animation**: Sanfte Übergänge (200ms expand, 150ms collapse)

### Medien-Toggle (`MediaToggleBox`)

```typescript
interface MediaToggleBoxProps extends ToggleBoxProps {
  mediaItems: MediaItem[];
  onMediaSelect?: (mediaId: string) => void;
  selectedMediaIds?: string[];
  maxDisplayCount?: number; // Standard: 6
}
```

**Funktionen:**
- Anzeige von Medien-Thumbnails in Grid-Layout
- Dateiinformationen (Name, Größe, Upload-Datum)
- Lightbox-View für vergrößerte Ansicht
- Auswahl-Modus für Multiple-Selection
- "Mehr anzeigen" für große Medien-Listen

### PDF-Historie Toggle (`PDFHistoryToggleBox`)

```typescript
interface PDFHistoryToggleBoxProps extends ToggleBoxProps {
  pdfVersions: PDFVersion[];
  currentVersionId?: string;
  onVersionSelect?: (versionId: string) => void;
  showDownloadButtons?: boolean;
}
```

**Funktionen:**
- Chronologische Liste aller PDF-Versionen
- Hervorhebung der aktuellen Version
- Versions-Vergleich (Side-by-Side)
- Download-Buttons für jede Version
- Änderungskommentare und Ersteller-Info

### Kommunikations-Toggle (`CommunicationToggleBox`)

```typescript
interface CommunicationToggleBoxProps extends ToggleBoxProps {
  communications: CommunicationItem[];
  onNewMessage?: () => void;
  allowNewMessages?: boolean;
  unreadCount?: number;
}
```

**Funktionen:**
- Threaded-Nachrichten-System
- Unterscheidung nach Nachrichtentyp (Kommentar, Feedback, Frage)
- Ungelesene-Nachrichten-Badge
- Inline-Editor für neue Nachrichten
- Anhänge-Support
- Push-Benachrichtigungen

### Entscheidungs-Toggle (`DecisionToggleBox`)

```typescript
interface DecisionToggleBoxProps extends ToggleBoxProps {
  decision?: CustomerDecision;
  onDecisionChange?: (decision: CustomerDecision) => void;
  availableDecisions?: DecisionType[];
  deadline?: Date;
}
```

**Funktionen:**
- Entscheidungs-Interface mit klaren Aktions-Buttons
- Kommentar-Feld für Begründungen
- Änderungswünsche mit Section-Zuordnung
- Deadline-Anzeige mit Countdown
- Status-Tracking (Pending, Approved, Rejected, Changes Requested)

## API Integration

### Firebase Firestore Collections

```typescript
// Collection-Struktur
collections = {
  organizations: 'organizations',
  campaigns: 'campaigns', 
  mediaItems: 'media-items',
  pdfVersions: 'pdf-versions',
  communications: 'communications',
  decisions: 'customer-decisions'
}

// Multi-Tenancy Pattern
document.path = `organizations/{organizationId}/campaigns/{campaignId}`
```

### Service Layer

```typescript
// Services für Toggle-System
services = {
  mediaService: 'src/lib/services/media',
  pdfService: 'src/lib/services/pdf',
  communicationService: 'src/lib/services/communication', 
  decisionService: 'src/lib/services/decisions'
}
```

## Verwendung

### Basis-Implementation

```typescript
import { CustomerReviewToggleContainer } from '@/components/customer-review/toggle';

function CustomerReviewPage() {
  const { campaign, customer, organization } = usePageData();
  
  return (
    <CustomerReviewToggleContainer
      campaignId={campaign.id}
      customerId={customer.id}
      organizationId={organization.id}
      userRole="customer"
      canEdit={true}
      canApprove={true}
      config={{
        defaultExpanded: ['decision-toggle'],
        maxExpandedBoxes: 2,
        persistToggleState: true,
        enableKeyboardNavigation: true
      }}
    />
  );
}
```

### Hook-basierte Verwendung

```typescript
import { useCustomerReviewToggle } from '@/components/customer-review/toggle';

function CustomToggleImplementation() {
  const {
    toggleState,
    actions,
    loadMedia,
    loadPDFVersions,
    sendMessage,
    saveDecision
  } = useCustomerReviewToggle({
    campaignId: 'campaign-123',
    organizationId: 'org-456',
    config: { maxExpandedBoxes: 1 }
  });

  return (
    <div>
      {/* Custom implementation */}
    </div>
  );
}
```

### Einzelne Toggle-Boxen

```typescript
import { 
  MediaToggleBox,
  PDFHistoryToggleBox 
} from '@/components/customer-review/toggle';

function CustomLayout() {
  const [expandedToggles, setExpandedToggles] = useState({});
  
  const handleToggle = (id: string) => {
    setExpandedToggles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-4">
      <MediaToggleBox
        id="media-toggle"
        title="Kampagnen-Medien"
        isExpanded={expandedToggles['media-toggle']}
        onToggle={handleToggle}
        organizationId="org-123"
        mediaItems={mediaItems}
      />
      
      <PDFHistoryToggleBox
        id="pdf-toggle"
        title="Versions-Historie"
        isExpanded={expandedToggles['pdf-toggle']}
        onToggle={handleToggle}
        organizationId="org-123"
        pdfVersions={pdfVersions}
        currentVersionId="current-version"
      />
    </div>
  );
}
```

## Konfiguration

### Toggle-System-Konfiguration

```typescript
interface ToggleSystemConfig {
  defaultExpanded?: string[];           // Standard: ['decision-toggle']
  enableAnimations?: boolean;           // Standard: true
  maxExpandedBoxes?: number;           // Standard: 2
  autoCollapseAfter?: number;          // Standard: 0 (deaktiviert)
  persistToggleState?: boolean;        // Standard: true
  enableKeyboardNavigation?: boolean;  // Standard: true
}
```

### Anpassung des Designs

```typescript
// CSS-Custom-Properties für Theming
:root {
  --toggle-border-color: theme('colors.gray.200');
  --toggle-header-bg: theme('colors.white');
  --toggle-content-bg: theme('colors.gray.50');
  --toggle-expanded-border: theme('colors.blue.500');
  --toggle-animation-duration: 200ms;
}
```

## Accessibility (WCAG 2.1)

### Tastatur-Navigation

- `Tab/Shift+Tab`: Navigation zwischen Toggle-Boxen
- `Enter/Space`: Toggle erweitern/minimieren  
- `Arrow Down/Up`: Zwischen Toggle-Boxen navigieren
- `Escape`: Aktive Toggle-Box schließen

### Screen Reader Support

```typescript
// ARIA-Attribute
aria-expanded={isExpanded}
aria-controls={`toggle-content-${id}`}
aria-describedby={`toggle-description-${id}`}
role="button"
tabIndex={0}
```

### Farbkontrast

- Alle Texte mindestens 4.5:1 Kontrast
- Interactive Elemente mindestens 3:1 Kontrast
- Status-Indikatoren auch ohne Farbe verständlich

## Performance-Optimierung

### Code-Splitting

```typescript
// Lazy Loading für Toggle-Komponenten
const MediaToggleBox = lazy(() => import('./MediaToggleBox'));
const PDFHistoryToggleBox = lazy(() => import('./PDFHistoryToggleBox'));
```

### Virtualisierung

- Große Medien-Listen mit React-Window
- Pagination für PDF-Versionen (>10 Versionen)
- Lazy Loading von Thumbnails

### Caching-Strategie

```typescript
// React Query für API-Calls
const { data: mediaItems } = useQuery(
  ['media', campaignId, organizationId],
  () => loadMedia(campaignId),
  {
    staleTime: 5 * 60 * 1000, // 5 Minuten
    cacheTime: 30 * 60 * 1000 // 30 Minuten
  }
);
```

## Testing-Strategie

### Unit-Tests (Jest + React Testing Library)

- Alle Toggle-Komponenten: 100% Coverage
- State-Management-Hooks: Vollständige Abdeckung
- User-Interaktionen: Event-Handler-Tests
- Accessibility: ARIA-Attribute und Keyboard-Navigation

### Integration-Tests

- Toggle-System-Container mit allen Sub-Komponenten
- API-Integration mit Mock-Services
- LocalStorage-Persistierung
- Error-Boundary-Verhalten

### E2E-Tests (Cypress/Playwright)

- Kompletter User-Journey: Kampagnen-Review und -Genehmigung
- Cross-Browser-Kompatibilität
- Mobile-Responsive-Verhalten
- Performance-Benchmarks

## Deployment & Monitoring

### Build-Optimierung

```json
{
  "scripts": {
    "build:toggle": "webpack --config webpack.toggle.config.js",
    "bundle-analyze:toggle": "npm run build:toggle -- --analyze"
  }
}
```

### Monitoring

- Performance-Metriken: Toggle-Expand-Zeit, API-Response-Zeit
- User-Interaktions-Tracking: Häufigkeit der Toggle-Nutzung
- Error-Monitoring: Failed API-Calls, Rendering-Fehler
- A/B-Testing: Toggle-Layout-Varianten

## Roadmap

### Phase 1: MVP (aktuell)
- ✅ Basis-Toggle-Komponenten
- ✅ TypeScript-Typen
- ✅ Test-Setup
- 🔄 Kern-Funktionalität implementieren

### Phase 2: Enhancement
- 📋 Advanced Animations
- 📋 Drag & Drop für Medien
- 📋 Real-time Updates via WebSocket
- 📋 Offline-Support mit Service Worker

### Phase 3: Advanced Features
- 📋 AI-gestützte Kommentar-Vorschläge
- 📋 Video-Call-Integration
- 📋 Advanced Approval-Workflows
- 📋 Mobile App (React Native)

## Support & Dokumentation

### Entwickler-Resources

- **Implementierungsplan**: `docs/implementation-plans/customer-review/toggle-system.md`
- **API-Dokumentation**: `docs/api/customer-review-toggles.md`
- **Styling-Guide**: `docs/styling/toggle-components.md`
- **Testing-Guide**: `docs/testing/toggle-system-tests.md`

### Troubleshooting

**Häufige Probleme:**

1. **Toggle erweitert sich nicht**
   - Prüfe `isExpanded` State
   - Verifiziere `onToggle` Callback
   - Console-Logs für State-Changes

2. **Daten laden nicht**
   - Prüfe Firebase-Berechtigungen
   - Verifiziere organizationId Parameter
   - Network-Tab für API-Calls prüfen

3. **Performance-Probleme**
   - React DevTools Profiler nutzen
   - Memo-isierung prüfen
   - Bundle-Size analysieren

### Contribution Guidelines

1. Feature-Branch erstellen: `feature/toggle-[feature-name]`
2. Tests schreiben BEVOR Implementierung
3. TypeScript-Typen aktualisieren
4. Deutsche Commit-Messages verwenden
5. Review durch Senior-Developer

---

**Erstellt**: 2024-01-01  
**Letzte Aktualisierung**: 2024-01-01  
**Maintainer**: Development Team  
**Status**: In Entwicklung