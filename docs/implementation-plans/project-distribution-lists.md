# Implementierungsplan: Projekt-Verteilerlisten Integration

## Übersicht
Integration von Verteilerlisten in Projekte, wobei bestehende globale Listen verknüpft und projekt-spezifische Listen erstellt werden können.

## Architektur-Ansatz

### 1. Zwei-Ebenen-System
- **Global (Organisation)**: Master-Verteilerlisten bleiben unverändert
- **Projekt-spezifisch**: Verknüpfte und eigene Listen pro Projekt

### 2. Datenmodell

```typescript
// Neue Collection: project_distribution_lists
interface ProjectDistributionList {
  id: string;
  projectId: string;
  organizationId: string;
  type: 'linked' | 'custom' | 'combined';

  // Für verknüpfte Listen
  masterListId?: string; // Referenz zur globalen Liste

  // Für projekt-eigene Listen
  name?: string;
  description?: string;
  filters?: ListFilters; // Wiederverwendung aus lists.ts
  contactIds?: string[];

  // Für kombinierte Listen
  linkedLists?: string[]; // Mehrere Master-Listen
  additionalContacts?: string[]; // Zusätzliche Kontakte

  // Metadaten
  addedBy: string; // userId
  addedAt: Timestamp;
  lastModified?: Timestamp;

  // Cache für Performance
  cachedContactCount?: number;
  cachedContactsSnapshot?: string[]; // IDs für schnellen Zugriff
}
```

## Implementierungs-Schritte

### Phase 1: Service-Layer erweitern

#### 1.1 Neuer Service: `project-lists-service.ts`
```typescript
// src/lib/firebase/project-lists-service.ts
// Basiert auf listsService, erweitert für Projekte

export const projectListsService = {
  // Projekt-Listen abrufen
  async getProjectLists(projectId: string): Promise<ProjectDistributionList[]>

  // Master-Liste mit Projekt verknüpfen
  async linkMasterList(projectId: string, masterListId: string): Promise<void>

  // Projekt-eigene Liste erstellen
  async createProjectList(projectId: string, listData: Partial<DistributionList>): Promise<string>

  // Kombinierte Liste erstellen
  async createCombinedList(projectId: string, listIds: string[], additionalContacts?: string[]): Promise<string>

  // Kontakte einer Projekt-Liste abrufen (mit Caching)
  async getProjectListContacts(projectListId: string): Promise<ContactEnhanced[]>

  // Verknüpfung entfernen
  async unlinkList(projectId: string, listId: string): Promise<void>
}
```

#### 1.2 Bestehenden `listsService` erweitern
- Methode hinzufügen: `getAvailableForProject(organizationId: string, excludeIds?: string[])`
- Methode für Batch-Operationen: `getMultipleById(ids: string[])`

### Phase 2: UI-Komponenten

#### 2.1 Wiederverwendung bestehender Komponenten

**Zu verwenden:**
- `ListModal` - Anpassen für Projekt-Kontext
- `ContactSelectorModal` - Direkt verwendbar
- `PublicationFilterSection` - Direkt verwendbar
- `MultiSelectDropdown` - Direkt verwendbar
- UI-Komponenten: `Badge`, `Button`, `Dialog`, `Dropdown`

#### 2.2 Neue Komponente: `ProjectDistributionLists.tsx`
```typescript
// src/components/projects/distribution/ProjectDistributionLists.tsx

interface Props {
  projectId: string;
  organizationId: string;
}

export function ProjectDistributionLists({ projectId, organizationId }: Props) {
  // States für Listen-Verwaltung
  const [projectLists, setProjectLists] = useState<ProjectDistributionList[]>([]);
  const [masterLists, setMasterLists] = useState<DistributionList[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => setShowLinkModal(true)}>
            <LinkIcon className="w-4 h-4 mr-2" />
            Liste verknüpfen
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Neue Liste
          </Button>
        </div>
      </div>

      {/* Projekt-Listen Grid/List (wie in lists/page.tsx) */}
      <ProjectListsView
        lists={projectLists}
        viewMode={viewMode}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Verfügbare Master-Listen Browser */}
      <MasterListBrowser
        lists={masterLists}
        linkedIds={linkedListIds}
        onLink={handleLinkList}
      />

      {/* Modals */}
      {showLinkModal && <LinkListModal />}
      {showCreateModal && <CreateProjectListModal />}
    </div>
  );
}
```

#### 2.3 Komponente: `MasterListBrowser.tsx`
```typescript
// src/components/projects/distribution/MasterListBrowser.tsx
// Kompakte Ansicht verfügbarer Master-Listen mit Such- und Filter-Funktionen
// Basiert auf Grid-View aus lists/page.tsx
```

#### 2.4 Komponente: `ProjectListCard.tsx`
```typescript
// src/components/projects/distribution/ProjectListCard.tsx
// Karten-Komponente für Projekt-Listen
// Zeigt Badge für Typ (Verknüpft/Projekt/Kombiniert)
// Wiederverwendet Design aus lists/page.tsx Grid-View
```

### Phase 3: Integration in Projekt-Seite

#### 3.1 Verteiler-Tab Content aktualisieren
```typescript
// In src/app/dashboard/projects/[projectId]/page.tsx

{activeTab === 'verteiler' && project && currentOrganization && (
  <ProjectDistributionLists
    projectId={project.id!}
    organizationId={currentOrganization.id}
  />
)}
```

### Phase 4: Features implementieren

#### 4.1 Basis-Features (MVP)
1. **Master-Listen durchsuchen & verknüpfen**
   - Suche nach Name, Beschreibung, Tags
   - Filter nach Kategorie (Presse, Kunden, etc.)
   - Ein-Klick-Verknüpfung

2. **Projekt-eigene Listen erstellen**
   - Wiederverwendung von `ListModal`
   - Kontakte aus Projekt-Kontext vorschlagen
   - Dynamische Filter wie bei Master-Listen

3. **Listen-Verwaltung**
   - Anzeige verknüpfter Listen mit Kontaktzahl
   - Entfernen von Verknüpfungen
   - Export-Funktion (CSV)

#### 4.2 Erweiterte Features (Phase 2)
1. **Kombinierte Listen**
   - Mehrere Master-Listen zusammenführen
   - Zusätzliche Einzelkontakte hinzufügen
   - Duplikate automatisch entfernen

### Phase 5: Performance-Optimierungen

#### 5.1 Caching-Strategie
```typescript
// Cache für häufig abgerufene Listen
const projectListCache = new Map<string, {
  data: ProjectDistributionList[];
  timestamp: number;
}>();

// Cache-Invalidierung bei Änderungen
const invalidateProjectListCache = (projectId: string) => {
  projectListCache.delete(projectId);
};
```

#### 5.2 Lazy Loading
- Master-Listen nur bei Bedarf laden
- Kontakte einer Liste erst beim Expand laden
- Pagination für große Listen

### Phase 6: Testing

#### 6.1 Unit Tests
- Service-Layer Tests
- Komponenten-Tests mit React Testing Library

#### 6.2 Integration Tests
- Verknüpfung/Entfernung von Listen
- Erstellung projekt-eigener Listen
- Export-Funktionalität

## Zeitplan

### Woche 1: Backend & Service Layer
- [ ] Firebase Collections Setup
- [ ] project-lists-service.ts implementieren
- [ ] listsService erweitern

### Woche 2: UI Komponenten
- [ ] ProjectDistributionLists Hauptkomponente
- [ ] MasterListBrowser implementieren
- [ ] Integration in Projekt-Seite

### Woche 3: Features & Testing
- [ ] Such- und Filter-Funktionen
- [ ] Export-Funktionalität
- [ ] Tests schreiben

### Woche 4: Optimierung & Polish
- [ ] Performance-Optimierungen
- [ ] UI/UX Verbesserungen
- [ ] Dokumentation

## Vorteile dieser Implementierung

✅ **Maximale Wiederverwendung**: Nutzt vorhandene Komponenten und Services
✅ **Konsistente UX**: Gleiche Patterns wie im Listen-Tool
✅ **Flexibel**: Unterstützt verschiedene Use Cases
✅ **Performant**: Mit Caching und Lazy Loading
✅ **Skalierbar**: Funktioniert mit wenigen oder tausenden Listen

## Risiken & Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Performance bei vielen Listen | Pagination & Caching implementieren |
| Komplexität bei kombinierten Listen | Schrittweise Einführung, MVP erst ohne |
| Duplikate bei Kontakten | Automatische Deduplizierung im Service |
| Rechteverwaltung | Projekt-Berechtigungen prüfen |

## Nächste Schritte

1. **Review & Feedback** zu diesem Plan
2. **Priorisierung** der Features
3. **Start mit Phase 1**: Service Layer Implementation
4. **Iterative Entwicklung** mit regelmäßigem Feedback

## Abhängigkeiten

- Bestehende Listen-Funktionalität (`listsService`, `ListModal`)
- Firebase Firestore für Datenspeicherung
- CRM-Service für Kontaktdaten
- Projekt-Service für Berechtigungen

## Erfolgsmetriken

- Anzahl verknüpfter Listen pro Projekt
- Zeit für Listen-Erstellung reduziert
- Wiederverwendungsrate von Master-Listen
- User Feedback zur Usability