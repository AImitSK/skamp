# Campaign API - Übersicht

**Version:** 1.1
**Letzte Aktualisierung:** 05. November 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Service-Architektur](#service-architektur)
- [API-Kategorien](#api-kategorien)
- [Schnellreferenz](#schnellreferenz)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Best Practices](#best-practices)

---

## Übersicht

Die Campaign-API besteht aus drei Hauptservices:

1. **pr-service** - Campaign CRUD, Approval-Workflow
2. **pdf-versions-service** - PDF-Generierung, Versionierung, Edit-Lock
3. **boilerplate-service** - Textbausteine-Verwaltung

### Service-Locations

```
src/lib/firebase/
├── pr-service.ts              # Campaign CRUD & Approval
├── pdf-versions-service.ts    # PDF-Generation & Edit-Lock
└── boilerplate-service.ts     # Textbausteine
```

---

## Service-Architektur

### pr-service (Campaign CRUD)

**Zweck:** Verwaltung von PR-Kampagnen mit Multi-Tenancy und Approval-Workflow

**Hauptfunktionen:**
- Campaign erstellen, lesen, aktualisieren, löschen
- Approval-Workflow (Kunden-Freigaben)
- Asset-Integration (Medien, Key Visuals)
- Pipeline-Integration (Projekt-Workflows)

**Collection:** `pr_campaigns`

**TypeScript-Types:**
```typescript
interface PRCampaign {
  id?: string;
  organizationId: string;
  userId: string;
  title: string;
  contentHtml: string;
  mainContent: string;
  boilerplateSections: CampaignBoilerplateSection[];
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectTitle?: string;
  keywords: string[];
  attachedAssets: CampaignAssetAttachment[];
  keyVisual?: KeyVisualData;
  status: 'draft' | 'scheduled' | 'sent';
  approvalData?: ApprovalData;
  seoMetrics?: SEOMetrics;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### pdf-versions-service (PDF-Generierung)

**Zweck:** PDF-Erstellung, Versionierung und Edit-Lock-Management

**Hauptfunktionen:**
- PDF-Generierung über Puppeteer-API
- Versionierung mit Content-Snapshots
- Edit-Lock bei Freigabe-Anforderungen
- Pipeline-PDF-Integration

**Collection:** `pdf_versions`

**TypeScript-Types:**
```typescript
interface PDFVersion {
  id?: string;
  campaignId: string;
  organizationId: string;
  version: number;
  status: 'draft' | 'pending_customer' | 'approved' | 'rejected';
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  contentSnapshot: {
    title: string;
    mainContent: string;
    boilerplateSections: any[];
    keyVisual?: any;
  };
  createdAt: Timestamp;
  createdBy: string;
}
```

### boilerplate-service (Textbausteine)

**Zweck:** Verwaltung wiederverwendbarer Content-Blöcke

**Hauptfunktionen:**
- Boilerplates erstellen, lesen, aktualisieren, löschen
- Kategorisierung und Tagging
- Client-spezifische Bausteine
- Organization-weite Templates

**Collection:** `boilerplates`

**TypeScript-Types:**
```typescript
interface Boilerplate {
  id?: string;
  organizationId: string;
  name: string;
  description?: string;
  content: string;
  category?: string;
  tags: string[];
  clientId?: string;
  isGlobal: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## API-Kategorien

### Campaign-Management (pr-service)

| Methode | Beschreibung | Return Type |
|---------|--------------|-------------|
| `create()` | Neue Campaign erstellen | `Promise<string>` |
| `getById()` | Campaign per ID laden | `Promise<PRCampaign \| null>` |
| `getAll()` | Alle Campaigns einer Organization | `Promise<PRCampaign[]>` |
| `update()` | Campaign aktualisieren | `Promise<void>` |
| `delete()` | Campaign löschen | `Promise<void>` |

### Approval-Workflow (pr-service)

| Methode | Beschreibung | Return Type |
|---------|--------------|-------------|
| `updateCampaignWithNewApproval()` | Campaign updaten + Approval erstellen | `Promise<{ workflowId?, pdfVersionId? }>` |
| `getCampaignByShareId()` | Campaign für Kunden-Zugriff laden | `Promise<PRCampaign \| null>` |
| `submitCustomerFeedback()` | Kunden-Feedback speichern | `Promise<void>` |

### PDF-Generation (pdf-versions-service)

| Methode | Beschreibung | Return Type |
|---------|--------------|-------------|
| `createPreviewPDF()` | Temporäre Vorschau-PDF (ohne DB) | `Promise<{ pdfUrl, fileSize }>` |
| `createPDFVersion()` | Neue PDF-Version mit DB-Eintrag | `Promise<string>` |
| `generatePipelinePDF()` | Pipeline-PDF für Projekte | `Promise<string>` |
| `getCurrentVersion()` | Aktuelle PDF-Version laden | `Promise<PDFVersion \| null>` |
| `getVersionHistory()` | Alle Versionen einer Campaign | `Promise<PDFVersion[]>` |

### Edit-Lock (pdf-versions-service)

| Methode | Beschreibung | Return Type |
|---------|--------------|-------------|
| `getEditLockStatus()` | Prüfe ob Campaign gesperrt ist | `Promise<EditLockData>` |
| `requestUnlock()` | Unlock-Request stellen | `Promise<void>` |
| `processUnlockRequest()` | Unlock-Request bearbeiten (Admin) | `Promise<void>` |

### Boilerplates (boilerplate-service)

| Methode | Beschreibung | Return Type |
|---------|--------------|-------------|
| `create()` | Neuen Textbaustein erstellen | `Promise<string>` |
| `getById()` | Textbaustein per ID laden | `Promise<Boilerplate \| null>` |
| `getAll()` | Alle Textbausteine | `Promise<Boilerplate[]>` |
| `getByCategory()` | Nach Kategorie filtern | `Promise<Boilerplate[]>` |
| `update()` | Textbaustein aktualisieren | `Promise<void>` |
| `delete()` | Textbaustein löschen | `Promise<void>` |

---

## Schnellreferenz

### Campaign erstellen

```typescript
import { prService } from '@/lib/firebase/pr-service';

const campaignId = await prService.create({
  organizationId: 'org-123',
  userId: 'user-456',
  title: 'Neue Produktankündigung',
  contentHtml: '<p>Pressemeldung...</p>',
  mainContent: '<p>Haupttext...</p>',
  boilerplateSections: [],
  clientId: 'client-789',
  clientName: 'Kunde GmbH',
  keywords: ['produkt', 'innovation', 'marktstart'],
  status: 'draft',
  attachedAssets: [],
  approvalRequired: false
});
```

### Campaign mit Approval updaten

```typescript
import { prService } from '@/lib/firebase/pr-service';

const result = await prService.updateCampaignWithNewApproval(
  campaignId,
  {
    // Campaign-Daten
    title: 'Überarbeiteter Titel',
    contentHtml: '<p>Neuer Inhalt...</p>',
    mainContent: '<p>Haupttext...</p>',
    // ... weitere Felder
  },
  {
    // Approval-Daten (optional)
    customerApprovalRequired: true,
    customerContact: {
      id: 'contact-123',
      name: 'Max Mustermann',
      email: 'max@kunde.de'
    },
    customerApprovalMessage: 'Bitte prüfen Sie die Änderungen.'
  },
  {
    // Context
    userId: user.uid,
    organizationId: currentOrganization.id
  }
);

// result.workflowId: ID des erstellten Approval-Workflows (falls Approval aktiviert)
// result.pdfVersionId: ID der generierten PDF-Version
```

### PDF generieren (Vorschau)

```typescript
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';

const { pdfUrl, fileSize } = await pdfVersionsService.createPreviewPDF(
  {
    title: 'Campaign-Titel',
    mainContent: '<p>Editor-Inhalt...</p>',
    boilerplateSections: [
      { id: 'section-1', type: 'boilerplate', content: '<p>Über uns...</p>', order: 0 }
    ],
    keyVisual: {
      assetId: 'asset-123',
      url: 'https://storage.../image.jpg',
      position: 'top',
      metadata: { width: 1920, height: 1080 }
    },
    clientName: 'Kunde GmbH'
  },
  organizationId,
  campaignId // Optional: Für projekt-basierten Upload
);

// pdfUrl: Firebase Storage Download-URL
// fileSize: Größe in Bytes
```

### Edit-Lock Status prüfen

```typescript
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';

const lockStatus = await pdfVersionsService.getEditLockStatus(campaignId);

if (lockStatus.isLocked) {
  console.log('Campaign ist gesperrt!');
  console.log('Grund:', lockStatus.reason); // z.B. "pending_customer_approval"
  console.log('Gesperrt von:', lockStatus.lockedBy?.displayName);
  console.log('Gesperrt am:', lockStatus.lockedAt?.toDate());

  // Unlock-Request stellen
  if (lockStatus.unlockRequests && lockStatus.unlockRequests.length > 0) {
    console.log('Bereits', lockStatus.unlockRequests.length, 'Unlock-Requests vorhanden');
  }
}
```

### Textbausteine laden

```typescript
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';

// Alle Textbausteine für Organization
const allBoilerplates = await boilerplatesService.getAll(organizationId);

// Nach Kategorie filtern
const aboutUsBoilerplates = await boilerplatesService.getByCategory(
  organizationId,
  'about_us'
);

// Client-spezifische Bausteine
const clientBoilerplates = allBoilerplates.filter(
  bp => bp.clientId === selectedClientId
);

// Globale Bausteine (für alle Clients)
const globalBoilerplates = allBoilerplates.filter(
  bp => bp.isGlobal === true
);
```

---

## Error Handling

### Typische Fehler

#### Firebase-Fehler

```typescript
try {
  const campaign = await prService.getById(campaignId);
} catch (error: any) {
  if (error.code === 'permission-denied') {
    // User hat keine Berechtigung für diese Campaign
    toastService.error('Zugriff verweigert: Keine Berechtigung für diese Kampagne');
  } else if (error.code === 'not-found') {
    // Campaign existiert nicht
    toastService.error('Kampagne nicht gefunden');
  } else {
    // Unbekannter Fehler
    toastService.error('Fehler beim Laden der Kampagne');
  }
}
```

#### Validierungs-Fehler

```typescript
// pr-service.create() wirft Error bei fehlenden Pflichtfeldern
try {
  await prService.create({
    // organizationId fehlt!
    userId: 'user-123',
    title: 'Test',
    // ...
  });
} catch (error) {
  console.error('Validierung fehlgeschlagen:', error.message);
  // "organizationId is required"
}
```

#### PDF-Generierungs-Fehler

```typescript
try {
  const { pdfUrl } = await pdfVersionsService.createPreviewPDF(content, orgId);
} catch (error) {
  if (error.message.includes('Puppeteer')) {
    // Puppeteer-API Fehler
    toastService.error('PDF-Generierung fehlgeschlagen: Server-Fehler');
  } else if (error.message.includes('Storage')) {
    // Firebase Storage Fehler
    toastService.error('PDF konnte nicht hochgeladen werden');
  } else {
    toastService.error('Fehler bei der PDF-Erstellung');
  }
}
```

### Best Practices für Error Handling

```typescript
// ✅ RICHTIG: Spezifische Fehler behandeln
try {
  const campaign = await prService.getById(campaignId);
  if (!campaign) {
    toastService.error('Kampagne nicht gefunden');
    router.push('/dashboard/projects');
    return;
  }
  // Weiterverarbeitung
} catch (error: any) {
  console.error('Campaign-Fehler:', error);
  toastService.error('Kampagne konnte nicht geladen werden');
}

// ❌ FALSCH: Generisches Error Handling
try {
  const campaign = await prService.getById(campaignId);
  // Keine Null-Prüfung!
  console.log(campaign.title); // Kann crashen wenn campaign null ist
} catch (error) {
  // Keine User-freundliche Fehlermeldung
  console.error(error);
}
```

---

## Performance

### Caching-Strategien

#### pr-service

**Built-in Caching:**
- Search-Results: 5 Minuten (searchCache)
- Stats: 5 Minuten (statsCache)

**Empfohlene Client-Side-Caching:**
```typescript
// React Query oder SWR für automatisches Caching
import { useQuery } from '@tanstack/react-query';

const { data: campaign, isLoading } = useQuery({
  queryKey: ['campaign', campaignId],
  queryFn: () => prService.getById(campaignId),
  staleTime: 5 * 60 * 1000, // 5 Minuten
  cacheTime: 10 * 60 * 1000 // 10 Minuten
});
```

#### pdf-versions-service

**Keine Built-in-Caches** (PDFs sind immer aktuell)

**Empfehlung:**
- PDF-URLs cachen (sind permanent gültig)
- Version-Historie nur bei Bedarf laden

#### boilerplate-service

**Keine Built-in-Caches**

**Empfehlung:**
```typescript
// Boilerplates einmal beim Mount laden und im State speichern
const [boilerplates, setBoilerplates] = useState<Boilerplate[]>([]);

useEffect(() => {
  const loadBoilerplates = async () => {
    const data = await boilerplatesService.getAll(organizationId);
    setBoilerplates(data);
  };
  loadBoilerplates();
}, [organizationId]); // Nur neu laden wenn Organization wechselt
```

### Performance-Tipps

#### 1. Batch-Operationen verwenden

```typescript
// ❌ LANGSAM: Einzelne Updates
for (const campaignId of campaignIds) {
  await prService.update(campaignId, { status: 'sent' });
}

// ✅ SCHNELL: Batch-Update (via pr-service.bulkUpdate)
await prService.bulkUpdate(campaignIds, { status: 'sent' });
```

#### 2. Pagination implementieren

```typescript
// pr-service.getAll() hat bereits ein limit von 100
// Für große Datenmengen: Pagination implementieren
const campaigns = await prService.getAll(organizationId);
const firstPage = campaigns.slice(0, 20);
const secondPage = campaigns.slice(20, 40);
// ... etc.
```

#### 3. Selective Fetching

```typescript
// ❌ LANGSAM: Alle Daten laden
const campaign = await prService.getById(campaignId);
const pdfVersions = await pdfVersionsService.getVersionHistory(campaignId);
const boilerplates = await boilerplatesService.getAll(organizationId);

// ✅ SCHNELL: Nur laden was benötigt wird
const campaign = await prService.getById(campaignId);
// PDFs erst laden wenn PreviewTab aktiv ist
if (activeTab === 'preview') {
  const pdfVersions = await pdfVersionsService.getVersionHistory(campaignId);
}
```

---

## Best Practices

### Multi-Tenancy

**IMMER organizationId verwenden:**
```typescript
// ✅ RICHTIG: Organization-basierte Queries
const campaigns = await prService.getAllByOrganization(organizationId);

// ❌ FALSCH: User-basierte Queries (veraltet)
const campaigns = await prService.getAll(userId, false);
```

### Type Safety

**TypeScript-Types verwenden:**
```typescript
import { PRCampaign, CampaignAssetAttachment } from '@/types/pr';

// ✅ Type-Safe
const campaign: PRCampaign = {
  organizationId: 'org-123',
  userId: 'user-456',
  title: 'Test',
  contentHtml: '<p>Test</p>',
  mainContent: '<p>Test</p>',
  boilerplateSections: [],
  status: 'draft',
  keywords: [],
  attachedAssets: [],
  approvalRequired: false
};

// ❌ Nicht Type-Safe (kann zu Runtime-Fehlern führen)
const campaign: any = {
  title: 'Test'
  // Fehlende Pflichtfelder!
};
```

### Async/Await

**IMMER try/catch verwenden:**
```typescript
// ✅ RICHTIG
const handleSave = async () => {
  try {
    await prService.update(campaignId, campaignData);
    toastService.success('Gespeichert');
  } catch (error) {
    console.error('Save-Fehler:', error);
    toastService.error('Speichern fehlgeschlagen');
  }
};

// ❌ FALSCH (unhandled promise rejection)
const handleSave = async () => {
  await prService.update(campaignId, campaignData);
  toastService.success('Gespeichert');
};
```

### Context-Integration

**Services über Context verwenden:**
```typescript
// ✅ RICHTIG: Context-Actions nutzen
const { updateTitle, saveCampaign } = useCampaign();

updateTitle('Neuer Titel');
await saveCampaign(); // Verwendet pr-service intern

// ❌ FALSCH: Direkter Service-Call (State-Inkonsistenz)
setCampaignTitle('Neuer Titel');
await prService.update(campaignId, { title: 'Neuer Titel' });
// Context weiß nichts von diesem Update!
```

---

## Siehe auch

- [pr-service API-Referenz](./pr-service.md)
- [pdf-versions-service API-Referenz](./pdf-versions-service.md)
- [boilerplate-service API-Referenz](./boilerplate-service.md)
- [Komponenten-Dokumentation](../components/README.md)
- [ADRs](../adr/README.md)

---

**Letzte Aktualisierung:** 05. November 2025
**Version:** 1.1 (Phase 1.1 - Foundation)
