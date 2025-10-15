# Publications - Komponenten-Dokumentation

**Version:** 1.0
**Letztes Update:** 15. Oktober 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Komponenten-Architektur](#komponenten-architektur)
- [Section Components](#section-components)
  - [BasicInfoSection](#basicinfosection)
  - [MetricsSection](#metricssection)
  - [IdentifiersSection](#identifierssection)
  - [MonitoringSection](#monitoringsection)
- [Helper Components](#helper-components)
- [Shared Services](#shared-services)
- [Props-Dokumentation](#props-dokumentation)
- [Best Practices](#best-practices)
- [Code-Beispiele](#code-beispiele)

---

## Übersicht

Das Publications-Modul besteht aus modularen, wiederverwendbaren Komponenten, die nach dem **Section-Pattern** organisiert sind.

### Vorteile der Modularisierung

✅ **Wartbarkeit:** Jede Section < 300 Zeilen
✅ **Testbarkeit:** Eigenständig testbar
✅ **Wiederverwendbarkeit:** Sections können isoliert verwendet werden
✅ **Performance:** React.memo für alle Sections

---

## Komponenten-Architektur

### Haupt-Komponenten

```
PublicationModal (index.tsx)
├── Tab Navigation
├── Form State Management
└── 4 Section Components
    ├── BasicInfoSection
    ├── MetricsSection
    ├── IdentifiersSection
    └── MonitoringSection
```

### Data Flow

```
index.tsx (Main Modal)
    │
    ├─ formData: PublicationFormData
    ├─ setFormData: (data) => void
    │
    ├─→ BasicInfoSection
    │       props: { formData, setFormData, publishers, ... }
    │
    ├─→ MetricsSection
    │       props: { formData, metrics, setMetrics }
    │
    ├─→ IdentifiersSection
    │       props: { identifiers, setIdentifiers, ... }
    │
    └─→ MonitoringSection
            props: { monitoringConfig, setMonitoringConfig, ... }
```

---

## Section Components

### BasicInfoSection

Verwaltet Grunddaten der Publikation.

**Pfad:** `src/app/dashboard/library/publications/PublicationModal/BasicInfoSection.tsx`

**Features:**
- Titel & Untertitel
- Publisher-Auswahl (Dropdown)
- Typ & Format (Dropdowns)
- Sprachen & Geografische Ziele (Multi-Select)
- Themenbereiche (TagInput)
- Verified-Flag (Checkbox)
- Interne Notizen (Textarea)

**Props:**

```typescript
interface BasicInfoSectionProps {
  formData: PublicationFormData;
  setFormData: (data: PublicationFormData) => void;
  publishers: CompanyEnhanced[];
  loadingPublishers: boolean;
  onPublisherChange: (publisherId: string) => void;
}
```

**Verwendung:**

```typescript
<BasicInfoSection
  formData={formData}
  setFormData={setFormData}
  publishers={publishers}
  loadingPublishers={loadingPublishers}
  onPublisherChange={handlePublisherChange}
/>
```

**Validierung:**

```typescript
// Pflichtfelder:
- formData.title         // ✅ Required
- formData.publisherId   // ✅ Required
- formData.type          // ✅ Required
- formData.languages     // ✅ Required (min. 1)
- formData.geographicTargets  // ✅ Required (min. 1)
```

**Besonderheiten:**

- **Loading State:** Zeigt Skeleton während Publisher laden
- **Empty State:** Warnung wenn keine Publisher vorhanden
- **Link to CRM:** Button zu Companies-Page wenn leer

---

### MetricsSection

Verwaltet Metriken (Print & Online).

**Pfad:** `src/app/dashboard/library/publications/PublicationModal/MetricsSection.tsx`

**Features:**
- Erscheinungsfrequenz
- Target Audience Daten (Alter, Geschlecht)
- **Print-Metriken** (wenn format = 'print' oder 'both'):
  - Auflage & Auflagentyp
  - Preis pro Ausgabe
  - Abo-Preise (Monat/Jahr)
  - Seitenanzahl & Format
- **Online-Metriken** (wenn format = 'online' oder 'both'):
  - Traffic (Unique Visitors, PageViews)
  - Engagement (Session Duration, Bounce Rate)
  - Users (Registriert, Paid, Newsletter)
  - SEO (Domain Authority)
  - Features (Paywall, Mobile App)

**Props:**

```typescript
interface MetricsSectionProps {
  formData: PublicationFormData;  // Für format-Check
  metrics: MetricsState;
  setMetrics: (metrics: MetricsState) => void;
}
```

**Verwendung:**

```typescript
<MetricsSection
  formData={formData}
  metrics={metrics}
  setMetrics={setMetrics}
/>
```

**Conditional Rendering:**

```typescript
// Print-Metriken nur bei:
formData.format === 'print' || formData.format === 'both'

// Online-Metriken nur bei:
formData.format === 'online' || formData.format === 'both'
```

**State-Struktur:**

```typescript
interface MetricsState {
  frequency: PublicationFrequency;
  targetAudience: string;
  targetAgeGroup: string;
  targetGender: 'all' | 'predominantly_male' | 'predominantly_female';

  print: {
    circulation: string;           // Als String für Input
    circulationType: string;
    pricePerIssue: string;
    subscriptionPriceMonthly: string;
    subscriptionPriceAnnual: string;
    pageCount: string;
    paperFormat: string;
  };

  online: {
    monthlyUniqueVisitors: string;
    monthlyPageViews: string;
    avgSessionDuration: string;
    bounceRate: string;
    registeredUsers: string;
    paidSubscribers: string;
    newsletterSubscribers: string;
    domainAuthority: string;
    hasPaywall: boolean;
    hasMobileApp: boolean;
  };
}
```

**Besonderheiten:**

- Alle numerischen Werte als **String** im State (für Input-Felder)
- Conversion zu Number bei Submit (in utils.ts)
- Bordered Sections für Print/Online Trennung

---

### IdentifiersSection

Verwaltet Identifikatoren & Social Media.

**Pfad:** `src/app/dashboard/library/publications/PublicationModal/IdentifiersSection.tsx`

**Features:**
- **Identifikatoren:** ISSN, ISBN, DOI, URL, Domain, Social Handle, Other
- **Social Media URLs:** Platform + URL Paare
- Dynamisches Hinzufügen/Entfernen
- Mindestens 1 Identifikator (kann nicht alle entfernen)

**Props:**

```typescript
interface IdentifiersSectionProps {
  identifiers: IdentifierItem[];
  setIdentifiers: (identifiers: IdentifierItem[]) => void;
  socialMediaUrls: SocialMediaItem[];
  setSocialMediaUrls: (urls: SocialMediaItem[]) => void;
}
```

**Verwendung:**

```typescript
<IdentifiersSection
  identifiers={identifiers}
  setIdentifiers={setIdentifiers}
  socialMediaUrls={socialMediaUrls}
  setSocialMediaUrls={setSocialMediaUrls}
/>
```

**State-Struktur:**

```typescript
interface IdentifierItem {
  type: 'ISSN' | 'ISBN' | 'DOI' | 'URL' | 'DOMAIN' | 'SOCIAL_HANDLE' | 'OTHER';
  value: string;
  description?: string;
}

interface SocialMediaItem {
  platform: string;  // z.B. "Twitter", "LinkedIn"
  url: string;       // z.B. "https://twitter.com/..."
}
```

**Interaktionen:**

```typescript
// Identifikator hinzufügen
<Button onClick={addIdentifier}>
  <PlusIcon />
  Identifikator hinzufügen
</Button>

// Identifikator entfernen
<Button
  onClick={() => removeIdentifier(index)}
  disabled={identifiers.length === 1}  // Min. 1 muss bleiben
>
  <TrashIcon />
</Button>
```

**Besonderheiten:**

- **Mindestens 1 Identifikator:** Remove-Button disabled bei length === 1
- **Grid-Layout:** Type (3 cols), Value (8 cols), Actions (1 col)
- Social Media optional (kann leer sein)

---

### MonitoringSection

Verwaltet RSS-Monitoring-Konfiguration.

**Pfad:** `src/app/dashboard/library/publications/PublicationModal/MonitoringSection.tsx`

**Features:**
- **Enable/Disable Toggle** für Monitoring
- **Website URL** mit Auto-Detect Button
- **RSS-Feed Auto-Detection** (via API)
- **Manuelle Feed-Eingabe** (Fallback)
- **Check-Frequenz** (täglich, zweimal täglich)
- **Keywords** für Filtering
- **Statistiken** (Artikel-Count)

**Props:**

```typescript
interface MonitoringSectionProps {
  monitoringConfig: MonitoringConfigState;
  setMonitoringConfig: (config: MonitoringConfigState) => void;
  rssDetectionStatus: RssDetectionStatus;
  setRssDetectionStatus: (status: RssDetectionStatus) => void;
  detectedFeeds: string[];
  setDetectedFeeds: (feeds: string[]) => void;
  showManualRssInput: boolean;
  setShowManualRssInput: (show: boolean) => void;
  publication?: Publication;
}
```

**Verwendung:**

```typescript
<MonitoringSection
  monitoringConfig={monitoringConfig}
  setMonitoringConfig={setMonitoringConfig}
  rssDetectionStatus={rssDetectionStatus}
  setRssDetectionStatus={setRssDetectionStatus}
  detectedFeeds={detectedFeeds}
  setDetectedFeeds={setDetectedFeeds}
  showManualRssInput={showManualRssInput}
  setShowManualRssInput={setShowManualRssInput}
  publication={publication}
/>
```

**RSS Detection Flow:**

```
1. User gibt Website URL ein
   ↓
2. Klickt "RSS-Feed suchen"
   ↓
3. API Call: POST /api/rss-detect
   ↓
4a. Feeds gefunden
    → Status: 'found'
    → Zeigt gefundene Feeds
    → Auto-Fill in rssFeedUrls

4b. Keine Feeds gefunden
    → Status: 'not_found'
    → Zeigt Warnung
    → Öffnet manuelle Eingabe
```

**State-Struktur:**

```typescript
interface MonitoringConfigState {
  isEnabled: boolean;
  websiteUrl: string;
  rssFeedUrls: string[];
  autoDetectRss: boolean;
  checkFrequency: 'daily' | 'twice_daily';
  keywords: string[];
  totalArticlesFound: number;
}

type RssDetectionStatus = 'idle' | 'checking' | 'found' | 'not_found';
```

**Status-Anzeigen:**

```typescript
// Erfolgsmeldung (grün)
{rssDetectionStatus === 'found' && (
  <div className="p-4 bg-green-50 border border-green-200">
    <CheckIcon /> RSS Feeds gefunden!
    <ul>
      {detectedFeeds.map(feed => (
        <li key={feed}>{feed}</li>
      ))}
    </ul>
  </div>
)}

// Warnung (gelb)
{rssDetectionStatus === 'not_found' && (
  <div className="p-4 bg-yellow-50 border border-yellow-200">
    <XMarkIcon /> Keine RSS Feeds gefunden
  </div>
)}
```

**Besonderheiten:**

- **Toggle:** Großer Enable/Disable Switch oben
- **Conditional Content:** Alle Felder nur sichtbar wenn `isEnabled = true`
- **API Integration:** Kommuniziert mit `/api/rss-detect`
- **Error Handling:** Zeigt Alerts bei API-Fehlern

---

## Helper Components

### TagInput

Wiederverwendbare Input-Komponente für Tags/Keywords.

**Pfad:** `src/app/dashboard/library/publications/PublicationModal/TagInput.tsx`

**Features:**
- Enter oder Komma zum Hinzufügen
- Tags mit X-Button zum Entfernen
- Verhindert Duplikate
- Trim & Validierung

**Props:**

```typescript
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}
```

**Verwendung:**

```typescript
<TagInput
  value={formData.focusAreas}
  onChange={(tags) => setFormData({ ...formData, focusAreas: tags })}
  placeholder="Tippen Sie und drücken Sie Enter..."
/>
```

---

## Shared Services

### Toast Service

Für User-Feedback nach Aktionen.

**Import:**
```typescript
import { toastService } from '@/lib/utils/toast';
```

**Verwendung:**

```typescript
// Erfolg
toastService.success('Publikation erstellt!');

// Fehler
toastService.error('Fehler beim Speichern');

// Info
toastService.info('Änderungen wurden gespeichert');

// Warnung
toastService.warning('Bitte füllen Sie alle Pflichtfelder aus');
```

---

## Props-Dokumentation

### PublicationFormData

```typescript
interface PublicationFormData {
  title: string;
  subtitle: string;
  publisherId: string;
  publisherName: string;
  type: PublicationType;
  format: PublicationFormat;
  languages: LanguageCode[];
  geographicTargets: CountryCode[];
  focusAreas: string[];
  verified: boolean;
  status: PublicationStatus;
  metrics: {
    frequency: PublicationFrequency;
    targetAudience?: string;
    targetAgeGroup?: string;
    targetGender?: string;
  };
  geographicScope?: GeographicScope;
  websiteUrl?: string;
  internalNotes?: string;
}
```

### CompanyEnhanced

```typescript
interface CompanyEnhanced {
  id?: string;
  name?: string;
  companyName?: string;  // Legacy field
  type: 'publisher' | 'media_house' | 'partner' | string;
  organizationId: string;
  isGlobal: boolean;
  // ... weitere Felder
}
```

---

## Best Practices

### 1. Performance

**✅ DO: React.memo für Sections**
```typescript
export const BasicInfoSection = memo(function BasicInfoSection(props) {
  // ...
});
```

**✅ DO: useCallback für Handler**
```typescript
const handlePublisherChange = useCallback((publisherId: string) => {
  // ...
}, [publishers]);
```

### 2. State Management

**✅ DO: Single Source of Truth**
```typescript
// Main Modal verwaltet ALL state
const [formData, setFormData] = useState(/* ... */);
const [metrics, setMetrics] = useState(/* ... */);

// Sections bekommen nur was sie brauchen
<BasicInfoSection formData={formData} setFormData={setFormData} />
```

**❌ DON'T: Section-interner State**
```typescript
// Nicht in Sections:
const [localState, setLocalState] = useState();
```

### 3. Validierung

**✅ DO: Validierung im Main Modal**
```typescript
const handleSubmit = () => {
  if (!formData.publisherId) {
    alert('Bitte wählen Sie einen Verlag aus.');
    return;
  }
  // ...
};
```

### 4. TypeScript

**✅ DO: Strikte Props-Typen**
```typescript
interface BasicInfoSectionProps {
  formData: PublicationFormData;  // Nicht "any"
  // ...
}
```

---

## Code-Beispiele

### Komplettes Modal-Setup

```typescript
export function PublicationModal({
  isOpen,
  onClose,
  publication,
  onSuccess
}: PublicationModalProps) {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState(createDefaultFormData());
  const [metrics, setMetrics] = useState(createDefaultMetrics());
  const [identifiers, setIdentifiers] = useState([{ type: 'ISSN', value: '' }]);
  const [socialMediaUrls, setSocialMediaUrls] = useState([]);
  const [monitoringConfig, setMonitoringConfig] = useState(createDefaultMonitoringConfig());

  // Handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    // Validierung + Submit-Logic
  }, [formData, metrics, identifiers, socialMediaUrls, monitoringConfig]);

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>
        {publication ? 'Publikation bearbeiten' : 'Neue Publikation'}
      </DialogTitle>

      <DialogBody>
        {/* Tab Navigation */}
        <Tabs activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'basic' && (
          <BasicInfoSection
            formData={formData}
            setFormData={setFormData}
            publishers={publishers}
            loadingPublishers={loadingPublishers}
            onPublisherChange={handlePublisherChange}
          />
        )}

        {activeTab === 'metrics' && (
          <MetricsSection
            formData={formData}
            metrics={metrics}
            setMetrics={setMetrics}
          />
        )}

        {/* ... weitere Tabs */}
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Speichern...' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

**Nächste Schritte:**

- 📖 [Zurück zur Hauptdokumentation](../README.md)
- 📖 [API-Dokumentation](../api/README.md)
- 📖 [ADRs](../adr/README.md)
