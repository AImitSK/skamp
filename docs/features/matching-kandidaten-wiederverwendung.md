# Wiederverwendung bestehender Systeme für Matching-Kandidaten

> **Hinweis:** Diese Datei dokumentiert, welche bestehenden Typen, Services und Komponenten wir für das Matching-Kandidaten Feature wiederverwenden können. Dies minimiert Code-Duplikation und verhindert, dass wir versehentlich parallele Systeme entwickeln.

---

## 🎯 Ziel dieser Analyse

Vor der Implementierung des Matching-Kandidaten Features wurde eine vollständige Codebase-Analyse durchgeführt, um sicherzustellen, dass wir:
- ✅ Bestehende Typen und Services maximal wiederverwenden
- ✅ Keine Duplikate erstellen
- ✅ Konsistent mit der existierenden Architektur bleiben
- ✅ Das Multi-Tenancy- und Reference-System korrekt nutzen

---

## 📦 1. Typen & Interfaces

### ✅ Können direkt wiederverwendet werden

#### `ContactEnhanced` (src/types/crm-enhanced.ts)
```typescript
interface ContactEnhanced extends BaseEntity {
  name: StructuredName;
  displayName: string;
  emails?: Array<{ type: string; email: string; isPrimary: boolean }>;
  phones?: PhoneNumber[];
  companyId?: string;
  companyName?: string;
  position?: string;

  // Journalist-spezifisch
  mediaProfile?: {
    isJournalist: boolean;
    publicationIds: string[];
    beats?: string[];
    mediaTypes?: ('print' | 'online' | 'tv' | 'radio' | 'podcast')[];
    influence?: {
      score?: number;
      reach?: number;
      engagement?: number;
    };
  };

  // ... weitere Felder
}
```

**Verwendung im Matching-Feature:**
- ✅ Quell-Daten für Matching-Scan
- ✅ Snapshot in `MatchingCandidate.variants[].contactData`
- ✅ Basis für Import-Funktion

---

#### `BaseEntity` (src/types/international.ts)
```typescript
interface BaseEntity {
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy?: string;
  deletedAt?: Timestamp | null;
  deletedBy?: string;
  isGlobal?: boolean;
}
```

**Verwendung im Matching-Feature:**
- ✅ Alle Standard-Felder für Multi-Tenancy
- ✅ `isGlobal` für globale Kontakte
- ✅ Soft-Delete Pattern

---

#### `CompanyEnhanced` (src/types/crm-enhanced.ts)
```typescript
interface CompanyEnhanced extends BaseEntity {
  name: string;
  officialName: string;
  type: 'publisher' | 'media_house' | 'agency' | ...;
  mainAddress?: InternationalAddress;
  phones?: PhoneNumber[];
  emails?: Array<{ type: string; email: string }>;
  // ... weitere Felder
}
```

**Verwendung im Matching-Feature:**
- ✅ Firma-Daten der Journalisten
- ✅ Anzeige in Varianten-Cards

---

#### `JournalistReference` (src/types/reference.ts)
```typescript
interface JournalistReference {
  id?: string;
  organizationId: string;
  globalJournalistId: string;

  // Lokale Daten
  localNotes?: string;
  localTags?: string[];
  customLabel?: string;

  // Meta
  addedAt: Timestamp;
  addedBy: string;
  isActive: boolean;
}
```

**Verwendung im Matching-Feature:**
- ✅ Prüfung ob Kontakt bereits Reference ist (dann NICHT matchen)
- ✅ Verständnis des Reference-Systems

---

### ⚠️ NEU erstellen müssen

#### `MatchingCandidate` (src/types/matching.ts) - NEU
```typescript
interface MatchingCandidate {
  id: string;
  matchKey: string;
  matchType: 'email' | 'name';
  score: number;

  variants: Array<{
    organizationId: string;
    organizationName: string;
    contactId: string;
    contactData: {
      // Subset von ContactEnhanced
      name: { firstName: string; lastName: string };
      displayName: string;
      emails: Array<{ email: string; type: string }>;
      // ... weitere relevante Felder
    };
  }>;

  status: 'pending' | 'imported' | 'skipped' | 'rejected';
  // ... weitere Felder
}
```

**Warum neu:** Matching-spezifische Struktur, aber nutzt `ContactEnhanced` als Basis für `contactData`.

---

#### `MatchingScanJob` (src/types/matching.ts) - NEU
```typescript
interface MatchingScanJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  stats: {
    organizationsScanned: number;
    contactsScanned: number;
    candidatesCreated: number;
    candidatesUpdated: number;
    errors: number;
  };
  startedAt: Timestamp;
  completedAt?: Timestamp;
  // ... weitere Felder
}
```

**Warum neu:** Job-Tracking ist spezifisch für Matching-Scan.

---

## 🔧 2. Services

### ✅ Können direkt wiederverwendet werden

#### `contactsEnhancedService` (src/lib/firebase/crm-service-enhanced.ts)

**Verfügbare Methoden:**
```typescript
class ContactEnhancedService extends BaseService<ContactEnhanced> {

  // ✅ Für Scan: Alle Kontakte einer Org laden
  async getAll(organizationId: string): Promise<ContactEnhanced[]>

  // ✅ Für Import: Kontakt mit autoGlobalMode erstellen
  async create(
    data: Omit<ContactEnhanced, 'id' | 'createdAt' | ...>,
    context: {
      organizationId: string;
      userId: string;
      autoGlobalMode?: boolean  // 🌟 WICHTIG
    }
  ): Promise<string>

  // ✅ Für Detail-Ansicht: Einzelnen Kontakt laden
  async getById(
    contactId: string,
    organizationId: string
  ): Promise<ContactEnhanced | null>

  // ✅ Für Batch-Import: Mehrere Kontakte importieren
  async import(
    contacts: Partial<ContactEnhanced>[],
    context: { organizationId: string; userId: string; autoGlobalMode?: boolean },
    options?: { duplicateCheck?: boolean }
  ): Promise<{ success: number; failed: number; errors: any[] }>
}
```

**Verwendung im Matching-Feature:**

1. **Scan-Phase:**
   ```typescript
   // In matchingService.scanForCandidates()
   for (const org of organizations) {
     const contacts = await contactsEnhancedService.getAll(org.id);
     const journalists = contacts.filter(c => c.mediaProfile);
     // ... Matching-Logik
   }
   ```

2. **Import-Phase:**
   ```typescript
   // In matchingService.importCandidate()
   const globalContactId = await contactsEnhancedService.create(
     contactData,
     {
       organizationId: superAdminOrgId,
       userId: currentUserId,
       autoGlobalMode: true  // 🌟 Macht Kontakt automatisch global
     }
   );
   ```

---

#### `referenceService` (src/lib/firebase/reference-service.ts)

**Verfügbare Methoden:**
```typescript
class ReferenceService {

  // ✅ Prüfung ob Kontakt bereits Reference ist
  async findExistingReference(
    globalJournalistId: string,
    organizationId: string
  ): Promise<JournalistReference | null>

  // ✅ Verweis erstellen (nach Import)
  async createReference(
    globalJournalistId: string,
    organizationId: string,
    userId: string,
    initialNotes?: string
  ): Promise<string>
}
```

**Verwendung im Matching-Feature:**
```typescript
// In Scan: Skip wenn bereits Reference
const isReference = await referenceService.findExistingReference(
  contact.id,
  org.id
);
if (isReference) continue;
```

---

#### `organizationService` (src/lib/firebase/organization-service.ts)

**Verfügbare Methoden:**
```typescript
class OrganizationService {
  // ✅ Alle Orgs für Scan laden
  async getAll(): Promise<Organization[]>

  // ✅ Org-Details für Cache
  async getById(orgId: string): Promise<Organization | null>
}
```

**Verwendung im Matching-Feature:**
```typescript
// In Scan: Alle Orgs außer SuperAdmin laden
const allOrgs = await organizationService.getAll();
const customerOrgs = allOrgs.filter(org => !org.isSuperAdmin);
```

---

#### `BaseService` (src/lib/firebase/service-base.ts)

**Pattern für eigenen Service:**
```typescript
class MatchingCandidatesService extends BaseService<MatchingCandidate> {
  constructor() {
    super('matching_candidates'); // Collection-Name
  }

  // Erbt automatisch:
  // - create()
  // - update()
  // - delete()
  // - getById()
  // - getAll()
  // - Multi-Tenancy Support
  // - Soft-Delete Pattern
}
```

**Verwendung im Matching-Feature:**
✅ Basis für `matchingCandidatesService`

---

### ⚠️ NEU erstellen müssen

#### `matchingCandidatesService.ts` - NEU

**Grund:** Matching-spezifische Logik (Scan, Scoring, Review).

**Aber wiederverwendet:**
- ✅ `BaseService` als Basis
- ✅ `contactsEnhancedService` für Daten
- ✅ `referenceService` für Duplikat-Check
- ✅ `organizationService` für Org-Liste

```typescript
class MatchingCandidatesService extends BaseService<MatchingCandidate> {

  // NEU: Matching-spezifische Methoden
  async scanForCandidates(): Promise<MatchingScanJob>
  scoreCandidate(variants: CandidateVariant[]): number
  generateMatchKey(contact: ContactEnhanced): string

  // Nutzt aber bestehende Services:
  async importCandidate(candidateId: string, userId: string) {
    // ...
    await contactsEnhancedService.create(data, {
      organizationId: superAdminOrgId,
      userId,
      autoGlobalMode: true
    });
  }
}
```

---

## 🎨 3. UI-Komponenten & Patterns

### ✅ Patterns die wir wiederverwenden

#### Modal-Pattern (z.B. `ListModal.tsx`, `CompanyModal.tsx`)

**Bestehende Struktur:**
```tsx
// Alle Modals folgen diesem Pattern
export default function SomeModal({
  isOpen,
  onClose,
  onSave
}: ModalProps) {
  const [formData, setFormData] = useState<FormData>(initialState);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validation
      // Service-Call
      onSave();
      onClose();
    } catch (error) {
      setErrors(...);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogPanel>
        <DialogTitle>...</DialogTitle>
        {/* Form Fields */}
        <Button onClick={handleSubmit} disabled={loading}>
          Speichern
        </Button>
      </DialogPanel>
    </Dialog>
  );
}
```

**Verwendung für Matching:**
✅ `CandidateDetailModal.tsx` folgt exakt diesem Pattern

---

#### Table-Pattern (aus CRM-Listen)

**Bestehende Struktur:**
```tsx
// Typische Tabellen-Struktur
<div className="overflow-hidden rounded-lg border">
  <Table>
    <TableHead>
      <TableRow>
        <TableHeader>Name</TableHeader>
        <TableHeader>Status</TableHeader>
        <TableHeader>Aktionen</TableHeader>
      </TableRow>
    </TableHead>
    <TableBody>
      {items.map(item => (
        <TableRow key={item.id}>
          <TableCell>{item.name}</TableCell>
          <TableCell>
            <Badge color={getStatusColor(item.status)}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell>
            <Button onClick={() => handleAction(item)}>
              Aktion
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

**Verwendung für Matching:**
✅ `CandidatesTable.tsx` nutzt dieses Pattern

---

#### Import-Flow Pattern (`ImportModalEnhanced.tsx`)

**Bestehende Struktur:**
```tsx
// CSV-Import Flow
1. Datei-Upload
2. CSV-Parsing
3. Preview-Tabelle mit Validierung
4. Fehler-Anzeige
5. Import-Button mit Progress
6. Success/Error Toast
```

**Verwendung für Matching:**
✅ **NICHT direkt**, aber:
- Validierungs-Pattern wiederverwenden
- Error-Handling Pattern übernehmen
- Progress-Anzeige-Pattern nutzen

---

#### Design System v2.0 Komponenten

**Verfügbare Komponenten:**
```typescript
import {
  Button,        // Primary/Secondary/Danger
  Badge,         // Status-Badges mit Farben
  Avatar,        // User/Org Avatare
  Dialog,        // Modals
  Table,         // Tabellen
  Input,         // Form-Felder
  Select,        // Dropdowns
  Checkbox,      // Checkboxen
  RadioGroup,    // Radio-Buttons
  TextArea,      // Mehrzeilige Inputs
  // ... weitere
} from '@/components/catalyst';
```

**Icons:**
```typescript
// NUR /24/outline verwenden!
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  // ... weitere
} from '@heroicons/react/24/outline';
```

**Wichtig:**
- ❌ Keine `/20/solid` Icons
- ❌ Keine Shadow-Effekte
- ✅ Tailwind-Klassen für Styling

---

### ⚠️ NEU erstellen müssen

#### `MatchingCandidatesTable.tsx` - NEU
- Spezialisierte Tabelle mit Score-Anzeige
- Varianten-Count
- Quick-Actions

#### `CandidateDetailModal.tsx` - NEU
- Varianten-Vergleich
- Review-Aktionen
- Empfehlungs-Box

#### `CandidateVariantCard.tsx` - NEU
- Einzelne Variante anzeigen
- Auswahl-Funktion

#### `MatchingScanButton.tsx` - NEU
- Trigger für manuellen Scan
- Progress-Anzeige

---

## 🔄 4. Wiederverwendbare Patterns

### Multi-Tenancy Pattern

**Wie es überall verwendet wird:**
```typescript
// Service-Level
async getAll(organizationId: string) {
  const q = query(
    collection(db, this.collectionName),
    where('organizationId', '==', organizationId),
    where('deletedAt', '==', null)
  );
  return getDocs(q);
}
```

**Im Matching-Feature:**
```typescript
// matching_candidates Collection ist ROOT-LEVEL (SuperAdmin only)
// KEIN organizationId Filter!
async getCandidates() {
  const q = query(
    collection(db, 'matching_candidates'),
    where('status', '==', 'pending')
  );
  return getDocs(q);
}
```

---

### autoGlobalMode Pattern

**Wie es in `companiesEnhancedService.create()` funktioniert:**
```typescript
async create(data, context: { autoGlobalMode?: boolean }) {
  if (context.autoGlobalMode) {
    const { interceptSave } = await import('@/lib/utils/global-interceptor');
    const globalizedData = interceptSave(data, 'company', user, {
      autoGlobalMode: context.autoGlobalMode
    });

    console.log('🌟 Company wird als global erstellt');
    return super.create(globalizedData, context);
  }

  return super.create(data, context);
}
```

**Im Matching-Feature:**
```typescript
// Beim Import von Kandidat
const globalContactId = await contactsEnhancedService.create(
  selectedVariantData,
  {
    organizationId: superAdminOrgId,
    userId: currentUserId,
    autoGlobalMode: true  // 🌟 Macht automatisch isGlobal: true
  }
);
```

---

### Reference Duplicate Check Pattern

**Wie es in `referenceService` funktioniert:**
```typescript
async createReference(globalJournalistId, organizationId, userId) {
  // Prüfe ob bereits existiert
  const existing = await this.findExistingReference(
    globalJournalistId,
    organizationId
  );

  if (existing) {
    throw new Error('Journalist wurde bereits als Verweis hinzugefügt');
  }

  // Erstelle Reference
  // ...
}
```

**Im Matching-Feature (Scan-Phase):**
```typescript
// Skip Kontakte die bereits References sind
for (const contact of contacts) {
  // References haben spezielle ID-Struktur
  if (contact.id?.startsWith('local-ref-')) {
    continue; // Skip
  }

  // Oder explizit prüfen:
  const isReference = await referenceService.findExistingReference(
    contact.id,
    orgId
  );
  if (isReference) continue;
}
```

---

### Batch-Operationen Pattern

**Wie es in Import-Services funktioniert:**
```typescript
async import(items: T[], context) {
  const batch = writeBatch(db);
  const results = { success: 0, failed: 0, errors: [] };

  for (const item of items) {
    try {
      const docRef = doc(collection(db, this.collectionName));
      batch.set(docRef, {
        ...item,
        ...context,
        createdAt: serverTimestamp()
      });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(error);
    }
  }

  await batch.commit();
  return results;
}
```

**Im Matching-Feature (Scan-Ergebnisse schreiben):**
```typescript
// Mehrere Kandidaten gleichzeitig erstellen
const batch = writeBatch(db);

for (const [matchKey, contacts] of matchingContacts) {
  const candidateRef = doc(collection(db, 'matching_candidates'));
  batch.set(candidateRef, {
    matchKey,
    score: scoreCandidate(contacts),
    variants: buildVariants(contacts),
    createdAt: serverTimestamp()
  });
}

await batch.commit();
```

---

## 📋 5. Bestehende Collections

### ✅ Nutzen wir

| Collection | Verwendung | Zugriff |
|------------|-----------|---------|
| `contacts_enhanced` | Quell-Daten für Scan | Per Organization |
| `companies_enhanced` | Firma-Daten der Journalisten | Per Organization |
| `organizations` | Org-Liste für Scan | SuperAdmin only |
| `organizations/{orgId}/journalist_references` | Duplikat-Check | Per Organization |

### ⚠️ NEU erstellen

| Collection | Zweck | Zugriff |
|------------|-------|---------|
| `matching_candidates` | Matching-Kandidaten | SuperAdmin only (ROOT) |
| `matching_scan_jobs` | Scan-Job-Tracking | SuperAdmin only (ROOT) |

---

## 🎯 Zusammenfassung: Was verwenden wir wieder?

### ✅ Direkt wiederverwendet (ca. 70%)

1. **Typen:**
   - `ContactEnhanced` als Basis
   - `BaseEntity` für Standard-Felder
   - `CompanyEnhanced` für Firmen
   - `JournalistReference` für Duplikat-Check

2. **Services:**
   - `contactsEnhancedService` (getAll, create mit autoGlobalMode)
   - `referenceService` (findExistingReference)
   - `organizationService` (getAll)
   - `BaseService` als Basis für neuen Service

3. **Patterns:**
   - Modal-Pattern
   - Table-Pattern
   - Multi-Tenancy Pattern
   - autoGlobalMode Pattern
   - Batch-Operations Pattern
   - Error-Handling Pattern

4. **UI-Komponenten:**
   - Design System v2.0 (Button, Badge, Table, etc.)
   - Heroicons /24/outline
   - Layout-Patterns

### ⚠️ Neu erstellen müssen (ca. 30%)

1. **Typen:**
   - `MatchingCandidate` (nutzt aber ContactEnhanced als Basis)
   - `MatchingScanJob`

2. **Services:**
   - `matchingCandidatesService` (nutzt aber bestehende Services)

3. **UI-Komponenten:**
   - `MatchingCandidatesTable`
   - `CandidateDetailModal`
   - `CandidateVariantCard`
   - `MatchingScanButton`

4. **Collections:**
   - `matching_candidates`
   - `matching_scan_jobs`

---

## 🚦 Entscheidungsmatrix

**Vor dem Erstellen neuer Komponenten/Services fragen:**

```
1. Gibt es bereits einen ähnlichen Service?
   ✅ JA → Wiederverwenden oder erweitern
   ❌ NEIN → Neu erstellen, aber BaseService als Basis nutzen

2. Gibt es bereits ein ähnliches UI-Pattern?
   ✅ JA → Pattern kopieren und anpassen
   ❌ NEIN → Neu erstellen, aber Design System nutzen

3. Gibt es bereits ähnliche Typen?
   ✅ JA → Typen erweitern oder als Basis nutzen
   ❌ NEIN → Neu erstellen, aber BaseEntity als Basis

4. Wird Multi-Tenancy benötigt?
   ✅ JA → organizationId + bestehende Patterns nutzen
   ❌ NEIN → ROOT-Level Collection (wie matching_candidates)

5. Wird autoGlobalMode benötigt?
   ✅ JA → Existierendes Pattern aus crm-service-enhanced nutzen
   ❌ NEIN → Normal erstellen
```

---

## 📝 Best Practices für Implementation

### ✅ DO

```typescript
// ✅ Bestehende Services nutzen
const contacts = await contactsEnhancedService.getAll(orgId);

// ✅ Bestehende Typen als Basis
interface MatchingCandidate {
  // ... matching-spezifische Felder
  variants: Array<{
    contactData: Partial<ContactEnhanced>; // ✅ Wiederverwendung
  }>;
}

// ✅ BaseService erweitern
class MatchingService extends BaseService<MatchingCandidate> {
  constructor() {
    super('matching_candidates');
  }
}

// ✅ Bestehende Patterns nutzen
if (context.autoGlobalMode) {
  // Wie in companiesEnhancedService
}
```

### ❌ DON'T

```typescript
// ❌ Eigene Contact-Typen definieren
interface MyContact {
  firstName: string;
  lastName: string;
  // ... FALSCH: ContactEnhanced nutzen!
}

// ❌ Eigene Service-Basis schreiben
class MyService {
  async getAll() {
    // ... FALSCH: BaseService nutzen!
  }
}

// ❌ Eigene Modal-Struktur erfinden
// FALSCH: Bestehende Modal-Patterns nutzen!

// ❌ Eigenes Multi-Tenancy Pattern
// FALSCH: Bestehendes Pattern nutzen!
```

---

## 🔗 Referenzen

### Bestehende Code-Dateien als Vorlagen

1. **Services:**
   - `src/lib/firebase/crm-service-enhanced.ts` → Vorlage für `matchingService`
   - `src/lib/firebase/reference-service.ts` → Duplikat-Check Pattern
   - `src/lib/firebase/lists-service.ts` → Batch-Operations Pattern

2. **UI-Komponenten:**
   - `src/app/dashboard/contacts/lists/ListModal.tsx` → Modal-Pattern
   - `src/app/dashboard/contacts/crm/CompanyModal.tsx` → Form-Pattern
   - `src/app/dashboard/contacts/crm/ImportModalEnhanced.tsx` → Import-Flow

3. **Typen:**
   - `src/types/crm-enhanced.ts` → Alle CRM-Typen
   - `src/types/reference.ts` → Reference-System
   - `src/types/international.ts` → BaseEntity

---

**Status:** ✅ Analyse abgeschlossen, bereit für Implementierung mit maximaler Code-Wiederverwendung

**Geschätzter Code-Anteil:**
- 70% Wiederverwendung (Services, Patterns, UI-Komponenten)
- 30% Neue Logik (Matching-Algorithmus, Scoring, Review-UI)

**Risiko:** ⬇️ NIEDRIG - Keine parallelen Systeme, konsistente Architektur
