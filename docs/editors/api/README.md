# Editors API-Dokumentation

**Version:** 1.0
**Status:** ✅ Production-Ready
**Letzte Aktualisierung:** Januar 2025

---

## Übersicht

Die Editors API besteht aus React Query Hooks und Firebase Services für das Multi-Entity Reference-System.

**Komponenten:**
- **React Query Hooks** (`useEditorsData.ts`) - Frontend State Management
- **Multi-Entity Reference-Service** (`multi-entity-reference-service.ts`) - Backend Operations
- **Firebase Services** - Direkte Firestore-Operationen

---

## React Query Hooks

### useGlobalJournalists()

Lädt alle globalen Journalisten aus der Firestore-Datenbank.

**Signatur:**
```typescript
function useGlobalJournalists(): UseQueryResult<ContactEnhanced[]>
```

**Rückgabe:**
```typescript
{
  data: ContactEnhanced[];        // Array der globalen Journalisten
  isLoading: boolean;             // true während des Ladens
  isError: boolean;               // true bei Fehler
  error: Error | null;            // Fehler-Objekt
  isSuccess: boolean;             // true wenn erfolgreich geladen
  refetch: () => Promise<...>;    // Manueller Refetch
}
```

**Implementierung:**
```typescript
export function useGlobalJournalists() {
  return useQuery({
    queryKey: ['editors', 'global'],
    queryFn: async () => {
      const globalContactsQuery = query(
        collection(db, 'contacts_enhanced'),
        where('isGlobal', '==', true)
      );
      const snapshot = await getDocs(globalContactsQuery);
      const allContacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return allContacts.filter(c => c.isGlobal && c.mediaProfile?.isJournalist);
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}
```

**Verwendung:**
```typescript
function EditorsPage() {
  const { data: journalists = [], isLoading } = useGlobalJournalists();

  if (isLoading) return <Loading />;

  return <JournalistTable journalists={journalists} />;
}
```

**Caching:**
- staleTime: 5 Minuten
- Query Key: `['editors', 'global']`
- Automatischer Background Refetch

---

### useImportedJournalists()

Lädt alle importierten Journalist-References einer Organisation.

**Signatur:**
```typescript
function useImportedJournalists(
  organizationId: string | undefined
): UseQueryResult<Set<string>>
```

**Parameter:**
- `organizationId` (string | undefined) - ID der Organisation

**Rückgabe:**
```typescript
{
  data: Set<string>;              // Set der importierten Journalist-IDs
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  enabled: boolean;               // false wenn organizationId undefined
}
```

**Implementierung:**
```typescript
export function useImportedJournalists(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['editors', 'imported', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');
      const references = await multiEntityService.getAllContactReferences(organizationId);
      return new Set(references.map(ref => ref._globalJournalistId));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Verwendung:**
```typescript
function EditorsPage() {
  const { currentOrganization } = useOrganization();
  const { data: importedIds } = useImportedJournalists(currentOrganization?.id);

  const isImported = (journalistId: string) => importedIds?.has(journalistId);

  return <JournalistTable importedIds={importedIds} />;
}
```

**Enabled Guard:**
- Query wird nur ausgeführt wenn `organizationId` definiert ist
- Verhindert unnötige API-Calls

---

### useCreateJournalistReference()

Erstellt eine Multi-Entity Reference (Company + Publications + Journalist).

**Signatur:**
```typescript
function useCreateJournalistReference(): UseMutationResult<
  { success: boolean; errors?: string[] },
  Error,
  {
    journalistId: string;
    organizationId: string;
    userId: string;
    notes?: string;
  }
>
```

**Implementierung:**
```typescript
export function useCreateJournalistReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      journalistId: string;
      organizationId: string;
      userId: string;
      notes?: string;
    }) => {
      return multiEntityService.createJournalistReference(
        data.journalistId,
        data.organizationId,
        data.userId,
        data.notes || `Importiert als Verweis am ${new Date().toLocaleDateString('de-DE')}`
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['editors', 'imported', variables.organizationId]
      });
    },
  });
}
```

**Verwendung:**
```typescript
function EditorsPage() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const createReference = useCreateJournalistReference();

  const handleImport = async (journalist: JournalistDatabaseEntry) => {
    try {
      const result = await createReference.mutateAsync({
        journalistId: journalist.id,
        organizationId: currentOrganization.id,
        userId: user.uid,
        notes: 'Wichtig für Tech-PR'
      });

      if (result.success) {
        showAlert('success', 'Multi-Entity Verweis erstellt');
      } else {
        showAlert('error', 'Fehler', result.errors?.join(', '));
      }
    } catch (error) {
      showAlert('error', 'Import fehlgeschlagen');
    }
  };

  return <ImportButton onClick={() => handleImport(journalist)} />;
}
```

**Cache Invalidierung:**
Nach erfolgreicher Erstellung wird der `imported` Query automatisch invalidiert und neu geladen.

---

### useRemoveJournalistReference()

Entfernt eine Journalist-Reference.

**Signatur:**
```typescript
function useRemoveJournalistReference(): UseMutationResult<
  void,
  Error,
  {
    journalistId: string;
    organizationId: string;
  }
>
```

**Implementierung:**
```typescript
export function useRemoveJournalistReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      journalistId: string;
      organizationId: string;
    }) => {
      await multiEntityService.removeJournalistReference(
        data.journalistId,
        data.organizationId
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['editors', 'imported', variables.organizationId]
      });
    },
  });
}
```

**Verwendung:**
```typescript
function EditorsPage() {
  const { currentOrganization } = useOrganization();
  const removeReference = useRemoveJournalistReference();

  const handleRemove = async (journalist: JournalistDatabaseEntry) => {
    try {
      await removeReference.mutateAsync({
        journalistId: journalist.id,
        organizationId: currentOrganization.id
      });

      showAlert('success', 'Verweis entfernt');
    } catch (error) {
      showAlert('error', 'Fehler beim Entfernen');
    }
  };

  return <RemoveButton onClick={() => handleRemove(journalist)} />;
}
```

---

### useCompanies()

Lädt lokale und globale Companies.

**Signatur:**
```typescript
function useCompanies(
  organizationId: string | undefined
): UseQueryResult<CompanyEnhanced[]>
```

**Implementierung:**
```typescript
export function useCompanies(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['editors', 'companies', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');

      const localCompanies = await companiesEnhancedService.getAll(organizationId);

      // Globale Companies
      const globalCompaniesQuery = query(
        collection(db, 'companies_enhanced'),
        where('isGlobal', '==', true)
      );
      const globalSnapshot = await getDocs(globalCompaniesQuery);
      const globalCompanies = globalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Kombiniere ohne Duplikate
      const combined = [...localCompanies];
      globalCompanies.forEach(globalComp => {
        if (!combined.find(localComp => localComp.id === globalComp.id)) {
          combined.push(globalComp);
        }
      });

      return combined;
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 Minuten
  });
}
```

**Caching:**
- staleTime: 10 Minuten (Companies ändern sich selten)
- Deduplication: Verhindert doppelte Companies

---

### usePublications()

Lädt lokale und referenced Publications.

**Signatur:**
```typescript
function usePublications(
  organizationId: string | undefined
): UseQueryResult<Publication[]>
```

**Implementierung:**
```typescript
export function usePublications(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['editors', 'publications', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');
      return publicationService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}
```

**Caching:**
- staleTime: 10 Minuten (Publications ändern sich selten)

---

## Multi-Entity Reference-Service

Siehe: [Multi-Entity Reference-Service Dokumentation](./multi-entity-reference-service.md)

**Hauptmethoden:**
- `createJournalistReference()` - Erstellt Multi-Entity Reference
- `removeJournalistReference()` - Entfernt Reference
- `getAllContactReferences()` - Lädt alle References

---

## TypeScript Types

### ContactEnhanced

```typescript
interface ContactEnhanced {
  id: string;
  displayName: string;
  isGlobal: boolean;
  emails: Array<{
    email: string;
    type: 'business' | 'private';
    isPrimary: boolean;
    isVerified: boolean;
  }>;
  phones?: Array<{
    number: string;
    type: string;
    isPrimary: boolean;
  }>;
  companyId?: string;
  companyName?: string;
  position?: string;
  mediaProfile?: {
    isJournalist: boolean;
    beats?: string[];
    mediaTypes?: string[];
    publicationIds?: string[];
  };
  // ...
}
```

### JournalistDatabaseEntry

```typescript
interface JournalistDatabaseEntry {
  id: string;
  globalId: string;
  personalData: {
    name: {
      firstName: string;
      lastName: string;
    };
    displayName: string;
    emails: Email[];
    phones?: Phone[];
    languages: string[];
  };
  professionalData: {
    currentEmployment: {
      mediumName: string;
      position: string;
      department?: string;
      isFreelance: boolean;
    };
    employment?: {
      company: {
        name: string;
        type: string;
      };
      position: string;
    };
    expertise: {
      primaryTopics: string[];
    };
    mediaTypes: MediaType[];
    publicationAssignments?: PublicationAssignment[];
  };
  // ...
}
```

### JournalistSubscription

```typescript
interface JournalistSubscription {
  organizationId: string;
  plan: 'free' | 'professional' | 'business' | 'enterprise';
  status: 'active' | 'trial' | 'suspended';
  features: {
    searchEnabled: boolean;
    importEnabled: boolean;
    exportEnabled: boolean;
    apiAccess: boolean;
    advancedFilters: boolean;
  };
  limits: {
    searchesPerMonth: number;
    importsPerMonth: number;
    maxSyncedContacts: number;
  };
  usage: {
    currentPeriod: {
      searches: number;
      imports: number;
    };
  };
}
```

---

## Error Handling

### Query Errors

```typescript
const { data, error, isError } = useGlobalJournalists();

if (isError) {
  console.error('Failed to load journalists:', error);
  return <ErrorAlert message={error.message} />;
}
```

### Mutation Errors

```typescript
const createReference = useCreateJournalistReference();

try {
  const result = await createReference.mutateAsync({...});

  if (!result.success) {
    // Handle business logic errors
    console.error('Reference creation failed:', result.errors);
  }
} catch (error) {
  // Handle network/system errors
  console.error('System error:', error);
}
```

### Best Practices

```typescript
// ✅ RICHTIG: Try-Catch + Result-Check
try {
  const result = await createReference.mutateAsync(data);

  if (result.success) {
    showAlert('success', 'Erfolgreich');
  } else {
    showAlert('error', result.errors?.join(', '));
  }
} catch (error) {
  showAlert('error', 'Systemfehler');
  console.error(error);
}

// ❌ FALSCH: Nur Try-Catch
try {
  await createReference.mutateAsync(data);
  showAlert('success', 'Erfolgreich');
} catch (error) {
  showAlert('error', 'Fehler');
}
```

---

## Performance

### Caching-Strategie

```typescript
// Journalists: 5min (ändern sich häufiger)
staleTime: 5 * 60 * 1000

// Companies/Publications: 10min (selten ändernd)
staleTime: 10 * 60 * 1000
```

### Query Invalidation

```typescript
// Nach Mutation automatisch invalidieren
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({
    queryKey: ['editors', 'imported', variables.organizationId]
  });
}
```

### Paralleles Laden

```typescript
// Alle Queries parallel ausführen
const { data: journalists } = useGlobalJournalists();
const { data: importedIds } = useImportedJournalists(orgId);
const { data: companies } = useCompanies(orgId);
const { data: publications } = usePublications(orgId);

// React Query lädt alle parallel!
```

---

## Migration Guide

### Von useState zu React Query

**Vorher:**
```typescript
const [journalists, setJournalists] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadData() {
    setLoading(true);
    const data = await fetchJournalists();
    setJournalists(data);
    setLoading(false);
  }
  loadData();
}, []);
```

**Nachher:**
```typescript
const { data: journalists = [], isLoading } = useGlobalJournalists();

// Automatisches Caching, Background Refetch, Error Handling!
```

### Von direkten Service-Calls zu Mutations

**Vorher:**
```typescript
async function handleImport(journalist) {
  try {
    await multiEntityService.createJournalistReference(...);
    await loadData(); // Manueller Reload
  } catch (error) {
    console.error(error);
  }
}
```

**Nachher:**
```typescript
const createReference = useCreateJournalistReference();

async function handleImport(journalist) {
  await createReference.mutateAsync({...});
  // Automatische Cache Invalidation & Reload!
}
```

---

**Version:** 1.0
**Maintainer:** CeleroPress Development Team
**Letzte Aktualisierung:** Januar 2025
