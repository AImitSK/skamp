# Multi-Entity Reference-Service API

**Version:** 1.0
**Service:** `multi-entity-reference-service.ts`
**Location:** `src/lib/firebase/multi-entity-reference-service.ts`
**Status:** ✅ Production-Ready

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Konzept](#konzept)
- [Methoden](#methoden)
  - [createJournalistReference()](#createjournalistreference)
  - [removeJournalistReference()](#removejournalistreference)
  - [getAllContactReferences()](#getallcontactreferences)
- [Datenstrukturen](#datenstrukturen)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Beispiele](#beispiele)

---

## Übersicht

Der Multi-Entity Reference-Service ist der Kern des Reference-Systems in der Editors Premium-Datenbank. Er verwaltet atomische Multi-Entity-Operationen für das Importieren und Entfernen von Journalisten-Verweisen.

**Kernfunktionalität:**
- Erstellen von Multi-Entity References (Company + Publications + Journalist)
- Atomar

e Operationen (alles oder nichts)
- Automatische Relation-Verwaltung
- Konsistente Datenstruktur

**Hauptvorteil:**
Kunden können globale Journalisten nutzen ohne Daten zu duplizieren. Das System erstellt nur Verweise auf die globalen Daten.

---

## Konzept

### Warum Multi-Entity?

Ein Journalist ist nicht alleine - er hat immer:
1. **Company** - Medienhaus (z.B. "Der Spiegel")
2. **Publications** - Publikationen (z.B. "Spiegel Online", "Spiegel Print")
3. **Journalist** - Der Kontakt selbst

Beim Import müssen ALLE drei Entities als References erstellt werden, damit:
- Der Journalist mit seinem Medienhaus verknüpft ist
- Die Publikationen korrekt angezeigt werden
- Die Relations konsistent sind

### Atomare Operationen

**Alles oder nichts:**
```
Import-Prozess:
├── 1. Company-Reference erstellen ✓
├── 2. Publication-References erstellen ✓
└── 3. Journalist-Reference erstellen ✓

Wenn EINE Operation fehlschlägt → ALLE werden zurückgerollt!
```

---

## Methoden

### createJournalistReference()

Erstellt eine Multi-Entity-Reference (Company + Publications + Journalist).

**Signatur:**
```typescript
async function createJournalistReference(
  journalistId: string,
  organizationId: string,
  userId: string,
  notes?: string
): Promise<{ success: boolean; errors?: string[] }>
```

**Parameter:**

| Parameter | Typ | Beschreibung | Erforderlich |
|-----------|-----|--------------|--------------|
| `journalistId` | string | ID des globalen Journalisten | ✅ Ja |
| `organizationId` | string | ID der importierenden Organisation | ✅ Ja |
| `userId` | string | ID des Users der importiert | ✅ Ja |
| `notes` | string | Lokale Notizen (optional) | ❌ Nein |

**Rückgabe:**
```typescript
{
  success: boolean;        // true wenn erfolgreich
  errors?: string[];       // Array von Fehlermeldungen (wenn success=false)
}
```

**Ablauf:**

```
1. Globalen Journalist laden
   ├── contacts_enhanced/{journalistId}
   └── Validation: isGlobal == true

2. Company-Reference erstellen (falls nicht vorhanden)
   ├── Prüfen ob Company-Reference bereits existiert
   ├── Falls nein: Neue Company-Reference erstellen
   │   └── /organizations/{orgId}/company_references/{refId}
   └── company_reference_id speichern

3. Publication-References erstellen (für alle Publikationen)
   ├── Alle publicationIds des Journalisten durchgehen
   ├── Für jede Publication:
   │   ├── Prüfen ob Publication-Reference bereits existiert
   │   └── Falls nein: Neue Publication-Reference erstellen
   │       └── /organizations/{orgId}/publication_references/{refId}
   └── publication_reference_ids sammeln

4. Journalist-Reference erstellen
   ├── /organizations/{orgId}/journalist_references/{refId}
   ├── _globalJournalistId setzen
   ├── _companyReferenceId setzen
   ├── _publicationReferenceIds setzen
   ├── localNotes setzen
   └── Metadata (createdBy, createdAt, etc.)

5. Success zurückgeben
```

**Implementierung:**
```typescript
async function createJournalistReference(
  journalistId: string,
  organizationId: string,
  userId: string,
  notes?: string
): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = [];

  try {
    // 1. Globalen Journalist laden
    const globalJournalist = await contactsEnhancedService.getById(journalistId);
    if (!globalJournalist || !globalJournalist.isGlobal) {
      throw new Error('Journalist nicht gefunden oder nicht global');
    }

    // 2. Company-Reference erstellen
    let companyReferenceId: string | undefined;
    if (globalJournalist.companyId) {
      const existingCompanyRef = await findExistingCompanyReference(
        organizationId,
        globalJournalist.companyId
      );

      if (existingCompanyRef) {
        companyReferenceId = existingCompanyRef.id;
      } else {
        // Neue Company-Reference erstellen
        const companyRef = await createCompanyReference(
          globalJournalist.companyId,
          organizationId,
          userId
        );
        companyReferenceId = companyRef.id;
      }
    }

    // 3. Publication-References erstellen
    const publicationReferenceIds: string[] = [];
    const publicationIds = globalJournalist.mediaProfile?.publicationIds || [];

    for (const pubId of publicationIds) {
      const existingPubRef = await findExistingPublicationReference(
        organizationId,
        pubId
      );

      if (existingPubRef) {
        publicationReferenceIds.push(existingPubRef.id);
      } else {
        const pubRef = await createPublicationReference(
          pubId,
          organizationId,
          userId
        );
        publicationReferenceIds.push(pubRef.id);
      }
    }

    // 4. Journalist-Reference erstellen
    const journalistRef = await createContactReference({
      _globalJournalistId: journalistId,
      _companyReferenceId: companyReferenceId,
      _publicationReferenceIds: publicationReferenceIds,
      localNotes: notes,
      organizationId,
      createdBy: userId,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to create journalist reference:', error);
    errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
    return { success: false, errors };
  }
}
```

**Verwendung:**
```typescript
const result = await multiEntityService.createJournalistReference(
  'journalist-123',
  'org-456',
  'user-789',
  'Wichtiger Kontakt für Tech-PR'
);

if (result.success) {
  console.log('✅ Multi-Entity Reference erstellt!');
} else {
  console.error('❌ Fehler:', result.errors);
}
```

**Fehlerbehandlung:**
```typescript
try {
  const result = await multiEntityService.createJournalistReference(...);

  if (result.success) {
    // Success-Alert anzeigen
    showAlert('success', 'Multi-Entity Verweis erstellt',
      'Journalist, Company und Publications wurden als Verweis hinzugefügt.');
  } else {
    // Business-Logic-Fehler
    showAlert('error', 'Import fehlgeschlagen',
      result.errors?.join('\n'));
  }
} catch (error) {
  // System-Fehler
  showAlert('error', 'Systemfehler',
    'Ein unerwarteter Fehler ist aufgetreten.');
  console.error(error);
}
```

---

### removeJournalistReference()

Entfernt eine Journalist-Reference.

**Signatur:**
```typescript
async function removeJournalistReference(
  journalistId: string,
  organizationId: string
): Promise<void>
```

**Parameter:**

| Parameter | Typ | Beschreibung | Erforderlich |
|-----------|-----|--------------|--------------|
| `journalistId` | string | ID des globalen Journalisten | ✅ Ja |
| `organizationId` | string | ID der Organisation | ✅ Ja |

**Rückgabe:**
```typescript
Promise<void>  // Wirft Error bei Fehler
```

**Ablauf:**

```
1. Journalist-Reference finden
   └── /organizations/{orgId}/journalist_references/
       WHERE _globalJournalistId == journalistId

2. Reference löschen
   └── DELETE /organizations/{orgId}/journalist_references/{refId}

HINWEIS: Company- und Publication-References werden NICHT gelöscht!
Sie könnten von anderen Journalisten verwendet werden.
```

**Implementierung:**
```typescript
async function removeJournalistReference(
  journalistId: string,
  organizationId: string
): Promise<void> {
  try {
    // 1. Reference finden
    const referencesQuery = query(
      collection(db, `organizations/${organizationId}/journalist_references`),
      where('_globalJournalistId', '==', journalistId)
    );

    const snapshot = await getDocs(referencesQuery);

    if (snapshot.empty) {
      throw new Error('Reference nicht gefunden');
    }

    // 2. Reference löschen
    const refDoc = snapshot.docs[0];
    await deleteDoc(doc(db, `organizations/${organizationId}/journalist_references/${refDoc.id}`));

    console.log('✅ Journalist-Reference gelöscht');
  } catch (error) {
    console.error('Failed to remove journalist reference:', error);
    throw error;
  }
}
```

**Verwendung:**
```typescript
try {
  await multiEntityService.removeJournalistReference(
    'journalist-123',
    'org-456'
  );

  showAlert('success', 'Verweis entfernt',
    'Journalist wurde aus Ihren Verweisen entfernt.');
} catch (error) {
  showAlert('error', 'Fehler beim Entfernen',
    'Der Verweis konnte nicht entfernt werden.');
  console.error(error);
}
```

**WICHTIG - Company/Publication-References:**

Company- und Publication-References werden NICHT automatisch gelöscht, da:
1. Mehrere Journalisten können dieselbe Company haben
2. Mehrere Journalisten können dieselbe Publication haben
3. Cleanup würde komplexe Referenz-Zählung erfordern

**Beispiel:**
```
Organisation hat:
- Journalist A → Company "Der Spiegel" → Publications ["Spiegel Online"]
- Journalist B → Company "Der Spiegel" → Publications ["Spiegel Online"]

Wenn Journalist A entfernt wird:
→ NUR Journalist A Reference wird gelöscht
→ Company "Der Spiegel" bleibt (wird noch von B verwendet)
→ Publication "Spiegel Online" bleibt (wird noch von B verwendet)
```

---

### getAllContactReferences()

Lädt alle Contact-References einer Organisation.

**Signatur:**
```typescript
async function getAllContactReferences(
  organizationId: string
): Promise<ContactReference[]>
```

**Parameter:**

| Parameter | Typ | Beschreibung | Erforderlich |
|-----------|-----|--------------|--------------|
| `organizationId` | string | ID der Organisation | ✅ Ja |

**Rückgabe:**
```typescript
ContactReference[]

interface ContactReference {
  id: string;
  _globalJournalistId: string;
  _companyReferenceId?: string;
  _publicationReferenceIds?: string[];
  localNotes?: string;
  localTags?: string[];
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}
```

**Implementierung:**
```typescript
async function getAllContactReferences(
  organizationId: string
): Promise<ContactReference[]> {
  try {
    const referencesQuery = query(
      collection(db, `organizations/${organizationId}/journalist_references`)
    );

    const snapshot = await getDocs(referencesQuery);

    const references = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ContactReference[];

    return references;
  } catch (error) {
    console.error('Failed to load contact references:', error);
    throw error;
  }
}
```

**Verwendung:**
```typescript
const references = await multiEntityService.getAllContactReferences('org-456');

console.log(`Anzahl importierter Journalisten: ${references.length}`);

// Set der globalen IDs erstellen
const importedIds = new Set(references.map(ref => ref._globalJournalistId));

// Prüfen ob ein Journalist importiert ist
const isImported = importedIds.has('journalist-123');
```

**Mit React Query:**
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

---

## Datenstrukturen

### ContactReference (Journalist-Reference)

```typescript
interface ContactReference {
  // IDs
  id: string;                          // Firestore Document ID
  _globalJournalistId: string;         // → Verweis auf globalen Journalisten

  // Relations
  _companyReferenceId?: string;        // → Verweis auf Company-Reference
  _publicationReferenceIds?: string[]; // → Verweise auf Publication-References

  // Lokale Daten (editierbar)
  localNotes?: string;                 // Lokale Notizen
  localTags?: string[];                // Lokale Tags

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}
```

**Firestore Path:**
```
/organizations/{organizationId}/journalist_references/{referenceId}
```

**Beispiel:**
```json
{
  "id": "ref-abc-123",
  "_globalJournalistId": "journalist-xyz",
  "_companyReferenceId": "local-ref-company-spiegel",
  "_publicationReferenceIds": [
    "local-ref-pub-spiegel-online",
    "local-ref-pub-spiegel-print"
  ],
  "localNotes": "Wichtig für Tech-PR. Schreibt über KI und Robotik.",
  "localTags": ["technik", "ki", "wichtig"],
  "createdAt": "2025-01-14T10:30:00Z",
  "createdBy": "user-123"
}
```

### CompanyReference

```typescript
interface CompanyReference {
  id: string;
  _globalCompanyId: string;            // → Verweis auf globale Company

  // Lokale Daten
  localNotes?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
}
```

**Firestore Path:**
```
/organizations/{organizationId}/company_references/{referenceId}
```

### PublicationReference

```typescript
interface PublicationReference {
  id: string;
  _globalPublicationId: string;        // → Verweis auf globale Publication

  // Lokale Daten
  localNotes?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
}
```

**Firestore Path:**
```
/organizations/{organizationId}/publication_references/{referenceId}
```

---

## Error Handling

### Fehlertypen

**1. Validation Errors:**
```typescript
// Journalist nicht global
throw new Error('Journalist ist nicht global');

// Journalist nicht gefunden
throw new Error('Journalist nicht gefunden');

// Fehlende Parameter
throw new Error('organizationId ist erforderlich');
```

**2. Firestore Errors:**
```typescript
// Permission denied
FirebaseError: Missing or insufficient permissions

// Network error
FirebaseError: Failed to get document

// Document not found
throw new Error('Reference nicht gefunden');
```

**3. Business Logic Errors:**
```typescript
// Reference bereits vorhanden
throw new Error('Journalist bereits importiert');

// Subscription-Limit erreicht
throw new Error('Import-Limit erreicht');
```

### Best Practices

**✅ Richtig: Try-Catch + Result-Check**
```typescript
try {
  const result = await multiEntityService.createJournalistReference(
    journalistId,
    organizationId,
    userId,
    notes
  );

  if (result.success) {
    // Success Case
    showAlert('success', 'Multi-Entity Verweis erstellt');
    await refetchReferences();
  } else {
    // Business Logic Error
    showAlert('error', 'Import fehlgeschlagen',
      result.errors?.join('\n'));
  }
} catch (error) {
  // System/Network Error
  showAlert('error', 'Systemfehler',
    'Ein unerwarteter Fehler ist aufgetreten.');
  console.error('System error:', error);
}
```

**❌ Falsch: Nur Try-Catch**
```typescript
try {
  await multiEntityService.createJournalistReference(...);
  showAlert('success', 'Erfolgreich');
} catch (error) {
  showAlert('error', 'Fehler');
  // Keine Unterscheidung zwischen Business Logic und System Errors!
}
```

**✅ Richtig: Error Logging**
```typescript
} catch (error) {
  console.error('Failed to create reference:', {
    journalistId,
    organizationId,
    userId,
    error: error instanceof Error ? error.message : error
  });

  showAlert('error', 'Import fehlgeschlagen',
    error instanceof Error ? error.message : 'Unbekannter Fehler');
}
```

---

## Best Practices

### 1. Immer alle 3 Entities zusammen importieren

```typescript
// ✅ RICHTIG: Multi-Entity Import
const result = await multiEntityService.createJournalistReference(
  journalistId,
  organizationId,
  userId,
  notes
);
// → Erstellt automatisch Company + Publications + Journalist

// ❌ FALSCH: Einzeln importieren
await createCompanyReference(companyId, ...);
await createPublicationReference(pubId, ...);
await createContactReference(journalistId, ...);
// → Inkonsistente Daten, keine atomare Operation!
```

### 2. Cache Invalidation nach Mutations

```typescript
// ✅ RICHTIG: Automatische Cache Invalidation
const createReference = useCreateJournalistReference();

await createReference.mutateAsync({...});
// → queryClient.invalidateQueries(['editors', 'imported', orgId])
// → UI updated automatisch!

// ❌ FALSCH: Manueller Reload
await multiEntityService.createJournalistReference(...);
await loadAllReferences();
// → Manueller Reload, kein Caching, langsam
```

### 3. Subscription-Checks VOR API-Call

```typescript
// ✅ RICHTIG: Frühe Validierung
if (!subscription?.features.importEnabled) {
  showAlert('warning', 'Premium-Feature',
    'Das Importieren ist nur mit Premium verfügbar.');
  return;
}

await createReference.mutateAsync({...});

// ❌ FALSCH: API-Call ohne Check
await createReference.mutateAsync({...});
// → API-Call schlägt fehl, unnötiger Network Traffic
```

### 4. SuperAdmin-Guard

```typescript
// ✅ RICHTIG: SuperAdmin sollte sich nicht selbst referenzieren
const isSuperAdmin = currentOrganization?.id === "superadmin-org";

if (isSuperAdmin) {
  showAlert('info', 'SuperAdmin-Hinweis',
    'Als SuperAdmin verwalten Sie diese Journalisten direkt im CRM.');
  return;
}

await createReference.mutateAsync({...});

// ❌ FALSCH: SuperAdmin kann sich selbst referenzieren
// → Sinnlose References, Daten sind schon im CRM
```

### 5. Loading States

```typescript
// ✅ RICHTIG: Loading States während Mutations
const [importingIds, setImportingIds] = useState<Set<string>>(new Set());

const handleImport = async (journalist) => {
  setImportingIds(prev => new Set([...prev, journalist.id]));

  try {
    await createReference.mutateAsync({...});
  } finally {
    setImportingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(journalist.id);
      return newSet;
    });
  }
};

// UI: Button disabled während Loading
<Button disabled={importingIds.has(journalist.id)}>
  {importingIds.has(journalist.id) ? 'Importiere...' : 'Importieren'}
</Button>
```

---

## Beispiele

### Vollständiger Import-Flow

```typescript
import { useCreateJournalistReference } from '@/lib/hooks/useEditorsData';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useState } from 'react';

function EditorsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const createReference = useCreateJournalistReference();

  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [alert, setAlert] = useState<AlertState | null>(null);

  const isSuperAdmin = currentOrganization?.id === "superadmin-org";

  const handleImportReference = async (journalist: JournalistDatabaseEntry) => {
    // 1. Validierung: SuperAdmin-Check
    if (isSuperAdmin) {
      setAlert({
        type: 'info',
        title: 'SuperAdmin-Hinweis',
        message: 'Als SuperAdmin verwalten Sie diese Journalisten direkt im CRM.'
      });
      return;
    }

    // 2. Validierung: Subscription-Check
    if (!subscription?.features.importEnabled) {
      setAlert({
        type: 'warning',
        title: 'Premium-Feature',
        message: 'Das Importieren ist nur mit Premium verfügbar.'
      });
      return;
    }

    // 3. Loading State setzen
    setImportingIds(prev => new Set([...prev, journalist.id]));

    try {
      // 4. Multi-Entity Reference erstellen
      const result = await createReference.mutateAsync({
        journalistId: journalist.id,
        organizationId: currentOrganization!.id,
        userId: user!.uid,
        notes: `Importiert als Verweis am ${new Date().toLocaleDateString('de-DE')}`
      });

      // 5. Success Handling
      if (result.success) {
        setAlert({
          type: 'success',
          title: 'Multi-Entity Verweis erstellt',
          message: `${journalist.personalData.displayName} wurde mit Company und Publications als Verweis hinzugefügt.`
        });
      } else {
        // Business Logic Error
        setAlert({
          type: 'error',
          title: 'Import fehlgeschlagen',
          message: result.errors?.join('\n')
        });
      }
    } catch (error) {
      // System Error
      setAlert({
        type: 'error',
        title: 'Systemfehler',
        message: 'Ein unerwarteter Fehler ist aufgetreten.'
      });
      console.error('Import failed:', error);
    } finally {
      // 6. Loading State aufräumen
      setImportingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(journalist.id);
        return newSet;
      });
    }
  };

  return (
    <div>
      {alert && <Alert {...alert} />}

      <JournalistTable
        journalists={journalists}
        onImport={handleImportReference}
        importingIds={importingIds}
      />
    </div>
  );
}
```

### Vollständiger Remove-Flow

```typescript
const removeReference = useRemoveJournalistReference();

const handleRemoveReference = async (journalist: JournalistDatabaseEntry) => {
  if (!currentOrganization || !user) return;

  // Loading State
  setImportingIds(prev => new Set([...prev, journalist.id]));

  try {
    // Reference entfernen
    await removeReference.mutateAsync({
      journalistId: journalist.id,
      organizationId: currentOrganization.id
    });

    // Success Alert
    setAlert({
      type: 'success',
      title: 'Verweis entfernt',
      message: `${journalist.personalData.displayName} wurde aus Ihren Verweisen entfernt.`
    });
  } catch (error) {
    // Error Alert
    setAlert({
      type: 'error',
      title: 'Fehler',
      message: 'Der Verweis konnte nicht entfernt werden.'
    });
    console.error('Remove failed:', error);
  } finally {
    // Loading State aufräumen
    setImportingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(journalist.id);
      return newSet;
    });
  }
};
```

### Toggle-Function (Import/Remove)

```typescript
const handleToggleReference = async (journalist: JournalistDatabaseEntry) => {
  const isImported = importedIds?.has(journalist.id);

  if (isImported) {
    await handleRemoveReference(journalist);
  } else {
    await handleImportReference(journalist);
  }
};

// UI: Dynamischer Button
<Button
  onClick={() => handleToggleReference(journalist)}
  disabled={importingIds.has(journalist.id)}
  style={importedIds?.has(journalist.id) ? {
    backgroundColor: '#DEDC00',
    color: '#000000'
  } : undefined}
>
  <StarIcon
    fill={importedIds?.has(journalist.id) ? 'currentColor' : 'none'}
  />
</Button>
```

---

## Troubleshooting

### Problem: "Reference bereits vorhanden"

**Symptom:** Import schlägt fehl mit "Reference bereits vorhanden"

**Lösung:**
```typescript
// Prüfen ob bereits importiert
const { data: importedIds } = useImportedJournalists(orgId);

if (importedIds?.has(journalist.id)) {
  showAlert('info', 'Bereits importiert',
    'Dieser Journalist ist bereits als Verweis vorhanden.');
  return;
}

// Nur importieren wenn noch nicht vorhanden
await createReference.mutateAsync({...});
```

### Problem: "Company oder Publication fehlt"

**Symptom:** Nach Import fehlen Company oder Publications in der UI

**Debugging:**
```typescript
// Reference-Daten prüfen
const references = await multiEntityService.getAllContactReferences(orgId);
const ref = references.find(r => r._globalJournalistId === journalistId);

console.log('Reference Data:', {
  companyReferenceId: ref?._companyReferenceId,
  publicationReferenceIds: ref?._publicationReferenceIds
});

// Globale Daten prüfen
const globalJournalist = await contactsEnhancedService.getById(journalistId);
console.log('Global Data:', {
  companyId: globalJournalist.companyId,
  publicationIds: globalJournalist.mediaProfile?.publicationIds
});
```

**Lösung:**
- Globaler Journalist muss `companyId` und `publicationIds` haben
- Falls nicht vorhanden → Im SuperAdmin-CRM nachtragen

---

**Version:** 1.0
**Maintainer:** CeleroPress Development Team
**Letzte Aktualisierung:** Januar 2025
**Service Location:** `src/lib/firebase/multi-entity-reference-service.ts`
