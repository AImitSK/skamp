# Implementierungsplan: Super-Admin System + Relations-Import

## 📋 **SCHRITT 1: Datenquelle korrigieren**

### **1.1 Von lokalem CRM zu globaler Premium-DB wechseln**
```typescript
// ÄNDERN IN: src/app/dashboard/library/editors/page.tsx

// ❌ AKTUELL (FALSCH):
const allContacts = await contactsEnhancedService.getAll(currentOrganization.id);

// ✅ ZIEL (RICHTIG):
const globalJournalists = await journalistDatabaseService.search({
  filters: {},
  organizationId: currentOrganization.id
});
```

### **1.2 Imports korrigieren**
```typescript
// ENTFERNEN:
import { contactsEnhancedService, companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";

// HINZUFÜGEN:
import { journalistDatabaseService } from "@/lib/firebase/journalist-database-service";
```

### **1.3 State-Variablen anpassen**
```typescript
// ENTFERNEN:
const [companies, setCompanies] = useState<CompanyEnhanced[]>([]);
const [publications, setPublications] = useState<Publication[]>([]);

// BEHALTEN:
const [journalists, setJournalists] = useState<JournalistDatabaseEntry[]>([]);
```

---

## 📋 **SCHRITT 2: convertContactToJournalist Funktion entfernen**

### **2.1 Komplette Funktion löschen**
```typescript
// LÖSCHEN: Zeilen 59-248
function convertContactToJournalist(
  contact: ContactEnhanced,
  companies: CompanyEnhanced[],
  publications: Publication[]
): JournalistDatabaseEntry | null {
  // GANZE FUNKTION LÖSCHEN
}
```

### **2.2 loadData vereinfachen**
```typescript
// ERSETZEN:
const loadData = useCallback(async () => {
  if (!user || !currentOrganization) return;

  try {
    setLoading(true);

    // EINFACH: Nur globale Journalisten laden
    const globalJournalists = await journalistDatabaseService.search({
      filters: {},
      organizationId: currentOrganization.id
    });

    setJournalists(globalJournalists);
  } catch (error) {
    showAlert('error', 'Fehler beim Laden', 'Die Daten konnten nicht geladen werden.');
  } finally {
    setLoading(false);
  }
}, [user, currentOrganization, showAlert]);
```

---

## 📋 **SCHRITT 3: Save-Interceptor implementieren**

### **3.1 Neue Datei erstellen: `src/lib/utils/global-interceptor.ts`**
```typescript
import { useAutoGlobal, getGlobalMetadata } from '@/lib/hooks/useAutoGlobal';
import { useAuth } from '@/context/AuthContext';

export interface InterceptableData {
  isGlobal?: boolean;
  globalMetadata?: any;
  [key: string]: any;
}

export function useGlobalInterceptor() {
  const { user } = useAuth();
  const { autoGlobalMode } = useAutoGlobal();

  const interceptSave = async <T extends InterceptableData>(
    data: T,
    context: 'contact' | 'company' | 'publication'
  ): Promise<T> => {
    if (!autoGlobalMode || !user) {
      return data;
    }

    return {
      ...data,
      isGlobal: true,
      globalMetadata: getGlobalMetadata(user, context)
    } as T;
  };

  return {
    interceptSave,
    autoGlobalMode
  };
}
```

### **3.2 Werte die übertragen werden müssen:**
- **data**: Original ContactEnhanced/CompanyEnhanced/Publication
- **context**: 'contact' | 'company' | 'publication'
- **user.email**: Für globalMetadata.addedBy
- **autoGlobalMode**: Boolean ob SuperAdmin aktiv

---

## 📋 **SCHRITT 4: CRM-Integration - Kontakte-Seite**

### **4.1 GlobalModeBanner einbauen in: `src/app/dashboard/contacts/crm/contacts/page.tsx`**
```typescript
// HINZUFÜGEN Import:
import { GlobalModeBanner } from '@/components/super-admin/GlobalModeBanner';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';

// HINZUFÜGEN im Component:
const { showGlobalBanner } = useAutoGlobal();

// HINZUFÜGEN vor dem Content:
{showGlobalBanner && (
  <GlobalModeBanner
    context="contact"
    className="mb-6"
  />
)}
```

### **4.2 Save-Interceptor in Contact-Forms einbauen**
```typescript
// HINZUFÜGEN in ContactModalEnhanced:
import { useGlobalInterceptor } from '@/lib/utils/global-interceptor';

// IM Component:
const { interceptSave } = useGlobalInterceptor();

// VOR dem Save:
const dataToSave = await interceptSave(contactData, 'contact');
await contactsEnhancedService.create(dataToSave);
```

---

## 📋 **SCHRITT 5: Company-Relations sicherstellen**

### **5.1 Company automatisch global schalten**
```typescript
// IN: src/app/dashboard/contacts/crm/companies/CompanyModalEnhanced.tsx
const { interceptSave } = useGlobalInterceptor();

// VOR Company Save:
const companyToSave = await interceptSave(companyData, 'company');
await companiesEnhancedService.create(companyToSave);
```

### **5.2 Werte die übertragen werden:**
- **companyData.name**: String
- **companyData.type**: 'publisher' | 'media_house' | 'agency'
- **companyData.website**: String
- **companyData.mediaInfo**: Object
- **isGlobal**: true (via interceptSave)
- **globalMetadata**: Object (via interceptSave)

---

## 📋 **SCHRITT 6: Publication-Relations sicherstellen**

### **6.1 Publication automatisch global schalten**
```typescript
// IN: src/app/dashboard/library/publications/PublicationModal.tsx
const { interceptSave } = useGlobalInterceptor();

// VOR Publication Save:
const publicationToSave = await interceptSave(publicationData, 'publication');
await publicationService.create(publicationToSave);
```

### **6.2 Werte die übertragen werden:**
- **publicationData.title**: String
- **publicationData.type**: PublicationType
- **publicationData.format**: PublicationFormat
- **publicationData.frequency**: PublicationFrequency
- **isGlobal**: true (via interceptSave)
- **globalMetadata**: Object (via interceptSave)

---

## 📋 **SCHRITT 7: Multi-Entity Import implementieren**

### **7.1 Neue Import-Funktion: `importJournalistWithRelations`**
```typescript
// IN: src/lib/firebase/journalist-database-service.ts
export async function importJournalistWithRelations(
  journalist: JournalistDatabaseEntry,
  targetOrganizationId: string,
  config: {
    companyStrategy: 'create_new' | 'use_existing' | 'merge';
    publicationStrategy: 'import_all' | 'import_selected' | 'skip';
    selectedPublicationIds?: string[];
  }
): Promise<{
  contactId: string;
  companyId: string;
  publicationIds: string[];
}> {
  // 1. Company erstellen/finden
  // 2. Publications erstellen/verknüpfen
  // 3. Contact mit Relations erstellen
}
```

### **7.2 Reihenfolge der Datenübertragung:**
1. **Company-Daten**: `journalist.employment.company.fullProfile` → `CompanyEnhanced`
2. **Publication-Daten**: `journalist.publicationAssignments[].publication.fullProfile` → `Publication[]`
3. **Contact-Daten**: `journalist.personalData` + Relations → `ContactEnhanced`

### **7.3 Werte die übertragen werden:**
```typescript
// Company:
- globalCompanyId → companyId
- name → companyName
- type → type
- website → website
- fullProfile → CompanyEnhanced (komplett)

// Publications:
- globalPublicationId → publicationId
- title → title
- type → type
- format → format
- frequency → frequency
- fullProfile → Publication (komplett)

// Contact Relations:
- companyId → contact.companyId
- companyName → contact.companyName
- publicationIds → contact.mediaProfile.publicationIds
- employment.position → contact.position
```

---

## 📋 **SCHRITT 8: Import-Dialog erweitern**

### **8.1 Relations-Step hinzufügen**
```typescript
// IN: JournalistImportDialog.tsx
const [currentStep, setCurrentStep] = useState<'preview' | 'relations' | 'mapping' | 'confirm'>('preview');

// Relations-Step UI:
{currentStep === 'relations' && (
  <div>
    <h3>Company-Strategie</h3>
    <RadioGroup value={companyStrategy}>
      <Radio value="create_new">Neue Firma anlegen: {journalist.employment.company.name}</Radio>
      <Radio value="use_existing">Mit bestehender Firma verknüpfen</Radio>
      <Radio value="merge">Zusammenführen</Radio>
    </RadioGroup>

    <h3>Publications-Strategie</h3>
    <RadioGroup value={publicationStrategy}>
      <Radio value="import_all">Alle {journalist.publicationAssignments.length} Publikationen importieren</Radio>
      <Radio value="import_selected">Ausgewählte Publikationen</Radio>
      <Radio value="skip">Publikationen überspringen</Radio>
    </RadioGroup>
  </div>
)}
```

### **8.2 Import-Config Werte:**
```typescript
interface MultiEntityImportConfig {
  companyStrategy: 'create_new' | 'use_existing' | 'merge';
  selectedCompanyId?: string;
  publicationStrategy: 'import_all' | 'import_selected' | 'skip';
  selectedPublicationIds: string[];
  fieldMapping: FieldMapping;
}
```

---

## 📋 **SCHRITT 9: Validierung - Jeder Wert prüfbar**

### **9.1 Company-Daten Validierung:**
```typescript
// PRÜFEN dass diese Werte korrekt übertragen werden:
✓ journalist.employment.company.name → CompanyEnhanced.name
✓ journalist.employment.company.type → CompanyEnhanced.type
✓ journalist.employment.company.website → CompanyEnhanced.website
✓ isGlobal: true → CompanyEnhanced.isGlobal
✓ globalMetadata → CompanyEnhanced.globalMetadata
```

### **9.2 Publication-Daten Validierung:**
```typescript
// PRÜFEN dass diese Werte korrekt übertragen werden:
✓ journalist.publicationAssignments[0].publication.title → Publication.title
✓ journalist.publicationAssignments[0].publication.type → Publication.type
✓ journalist.publicationAssignments[0].publication.format → Publication.format
✓ journalist.publicationAssignments[0].publication.frequency → Publication.frequency
✓ isGlobal: true → Publication.isGlobal
✓ globalMetadata → Publication.globalMetadata
```

### **9.3 Contact-Relations Validierung:**
```typescript
// PRÜFEN dass diese Werte korrekt übertragen werden:
✓ journalist.personalData.name → ContactEnhanced.name
✓ journalist.employment.company.globalCompanyId → ContactEnhanced.companyId
✓ journalist.employment.company.name → ContactEnhanced.companyName
✓ journalist.employment.position → ContactEnhanced.position
✓ journalist.publicationAssignments.map(p => p.publication.globalPublicationId) → ContactEnhanced.mediaProfile.publicationIds
✓ isGlobal: true → ContactEnhanced.isGlobal
✓ globalMetadata → ContactEnhanced.globalMetadata
```

---

## ✅ **ERFOLGSKRITERIEN - Jeder Schritt prüfbar:**

1. **Datenquelle**: `journalistDatabaseService.search()` statt `contactsEnhancedService.getAll()`
2. **GlobalModeBanner**: Sichtbar in `/dashboard/contacts/crm/contacts/` für SuperAdmin
3. **Save-Interceptor**: `isGlobal: true` wird automatisch gesetzt
4. **Company-Import**: Neue Companies erscheinen mit `isGlobal: true`
5. **Publication-Import**: Neue Publications erscheinen mit `isGlobal: true`
6. **Relations-Import**: Contact hat korrekte `companyId` und `publicationIds`
7. **Multi-Entity**: Ein Import erstellt Company + Publications + Contact in korrekter Reihenfolge

**Jeder Wert ist nachverfolgbar und prüfbar.**