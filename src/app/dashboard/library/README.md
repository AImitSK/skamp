# SKAMP Bibliothek - Vollständiger Implementierungsplan

## ⚠️ WICHTIGE ÄNDERUNG: Mandantenfähigkeit integriert
**Stand: Januar 2025**

Während der Implementierung haben wir entschieden, die Mandantenfähigkeit direkt von Anfang an zu integrieren:
- ✅ Alle Types erweitern `BaseEntity` mit `organizationId`
- ✅ Rollen-System mit 5 Stufen (Owner, Admin, Member, Client, Guest)
- ✅ Granulare Permissions
- ✅ Team-Management in `organization-service.ts`
- ✅ Alle Services nutzen `BaseService` mit automatischer Mandanten-Filterung

Dies war eine strategische Entscheidung, um spätere aufwendige Migrationen zu vermeiden.

## Übersicht
Komplette Erweiterung des SKAMP CRM um eine internationale Bibliothek für Publikationen und Werbemittel mit allen Anforderungen aus der Gap-Analyse und den strategischen Übersichtstabellen.

## Neue Verzeichnisstruktur

```
src/
├── app/
│   └── dashboard/
│       └── library/                          # NEUER HAUPTBEREICH
│           ├── layout.tsx                    # Gemeinsames Layout mit Tabs
│           ├── page.tsx                      # Dashboard mit Statistiken
│           │
│           ├── publications/                 # Publikationen
│           │   ├── page.tsx                  # Übersichtstabelle (wie definiert)
│           │   ├── [publicationId]/
│           │   │   └── page.tsx              # Detailseite mit Metriken
│           │   ├── PublicationModal.tsx      # Create/Edit mit allen Feldern
│           │   ├── PublicationFilters.tsx    # Erweiterte Filter
│           │   └── ImportPublicationsModal.tsx
│           │
│           ├── advertisements/               # Werbemittel
│           │   ├── page.tsx                  # Liste gruppiert nach Publikation
│           │   ├── [adId]/
│           │   │   └── page.tsx              # Detailseite mit Spezifikationen
│           │   ├── AdvertisementModal.tsx    # Create/Edit Modal
│           │   ├── AdvertisementFilters.tsx  # Filter nach Format/Typ
│           │   └── AdSpecificationForm.tsx   # Flexible Spezifikationen
│           │
│           ├── media-kits/                   # Mediadaten
│           │   ├── page.tsx                  # Übersicht aller Media Kits
│           │   ├── [companyId]/
│           │   │   └── page.tsx              # Media Kit Generator
│           │   ├── MediaKitGenerator.tsx     # PDF-Erstellung
│           │   └── MediaKitTemplates.tsx     # Internationale Templates
│           │
│           └── overview/                     # Strategische Übersichten
│               ├── page.tsx                  # Alle Übersichtstabellen
│               ├── CompaniesOverview.tsx     # Firmen-Tabelle (erweitert)
│               ├── ContactsOverview.tsx      # Personen-Tabelle (erweitert)
│               └── PublicationsOverview.tsx  # Neue Publikations-Tabelle
│
├── components/
│   ├── library/                              # Bibliothek-Komponenten
│   │   ├── cards/
│   │   │   ├── PublicationCard.tsx
│   │   │   ├── AdvertisementCard.tsx
│   │   │   └── MediaKitCard.tsx
│   │   ├── tables/
│   │   │   ├── PublicationTable.tsx         # Mit allen Spalten aus Strategie
│   │   │   ├── AdvertisementTable.tsx
│   │   │   └── EnhancedCompanyTable.tsx     # Erweiterte Firmentabelle
│   │   ├── forms/
│   │   │   ├── PublicationForm.tsx          # Alle neuen Felder
│   │   │   ├── AdvertisementForm.tsx
│   │   │   └── MediaInfoForm.tsx
│   │   ├── international/                    # Internationalisierung
│   │   │   ├── CountrySelector.tsx          # ISO 3166-1 basiert
│   │   │   ├── LanguageSelector.tsx         # ISO 639-1 basiert
│   │   │   ├── CurrencyInput.tsx            # ISO 4217 basiert
│   │   │   ├── PhoneInput.tsx               # E.164 Format
│   │   │   └── AddressForm.tsx              # Strukturierte int. Adressen
│   │   └── metrics/
│   │       ├── PrintMetrics.tsx             # Auflagen-Details
│   │       ├── OnlineMetrics.tsx            # Digital-Metriken
│   │       └── MetricsComparison.tsx        # Vergleichsansicht
│   │
│   └── crm/                                  # Erweiterte CRM-Komponenten
│       ├── enhanced/
│       │   ├── CompanyIdentifiers.tsx        # Neue Identifikationsnummern
│       │   ├── GDPRConsent.tsx              # Detailliertes Einwilligungsmanagement
│       │   ├── HierarchyView.tsx            # Muttergesellschaft-Struktur
│       │   └── InternationalData.tsx        # Int. Stammdaten-Verwaltung
│       └── CompanyMediaSection.tsx           # (bereits vorhanden, erweitern)
│
├── lib/
│   ├── firebase/
│   │   ├── library-service.ts               # ✅ ERSTELLT
│   │   ├── crm-service-enhanced.ts          # ✅ ERSTELLT
│   │   ├── organization-service.ts          # ✅ ERSTELLT (NEU)
│   │   ├── service-base.ts                  # ✅ ERSTELLT (NEU)
│   │   └── crm-service.ts                   # (bestehend, wird erweitert)
│   ├── validators/
│   │   ├── iso-validators.ts                # ❌ NOCH ZU ERSTELLEN
│   │   ├── identifier-validators.ts         # ❌ NOCH ZU ERSTELLEN
│   │   └── phone-validators.ts              # ❌ NOCH ZU ERSTELLEN
│   └── utils/
│       ├── currency-converter.ts            # Währungsumrechnung
│       └── address-formatter.ts             # Int. Adressformatierung
│
└── types/
    ├── library.ts                            # ✅ ERSTELLT
    ├── crm-enhanced.ts                       # ✅ ERSTELLT
    └── international.ts                      # ✅ ERSTELLT

✅ = Bereits erstellt
❌ = Noch zu erstellen
```

## Phase 1: Datenmodell-Erweiterung (Backend) ✅ TEILWEISE ABGESCHLOSSEN

### 1.1 Erweiterte CRM-Types mit Internationalisierung ✅
**Datei:** `src/types/crm-enhanced.ts` (ERSTELLT)

Die Datei enthält:
- `CompanyEnhanced` mit BaseEntity
- `ContactEnhanced` mit BaseEntity
- `TagEnhanced` für Mandanten-Support
- Alle Felder aus der Gap-Analyse implementiert

### 1.2 Bibliothek-Types ✅
**Datei:** `src/types/library.ts` (ERSTELLT)

Enthält vollständige Definitionen für:
- `Publication` - Eigenständige Entität mit Metriken
- `Advertisement` - Flexible Werbemittel-Spezifikationen
- `MediaKit` - Für PDF-Generierung

### 1.3 Internationale Standards & Mandanten ✅
**Datei:** `src/types/international.ts` (ERSTELLT)

Neue Basis-Struktur mit:
- `BaseEntity` - Für alle Entitäten
- `Organization` & `TeamMember`
- Rollen & Permissions System
- ISO-konforme Types
- GDPR Consent Management

## Phase 2: Übersichtstabellen Implementation

### 2.1 Erweiterte Firmen-Übersicht
**Datei:** `src/components/library/tables/EnhancedCompanyTable.tsx`

```typescript
// Spalten genau wie in der Strategie definiert:
const columns = [
  { 
    key: 'name', 
    label: 'Firmenname', 
    sortable: true,
    render: (company) => (
      <Link href={`/dashboard/contacts/crm/companies/${company.id}`}>
        {company.officialName || company.name}
      </Link>
    )
  },
  { 
    key: 'type', 
    label: 'Typ',
    render: (company) => <Badge>{companyTypeLabels[company.type]}</Badge>
  },
  { 
    key: 'industry', 
    label: 'Branche',
    sortable: true 
  },
  { 
    key: 'location', 
    label: 'Ort & Land',
    render: (company) => (
      <span>
        {company.addressStructured?.city}, {company.addressStructured?.countryIsoCode}
      </span>
    )
  },
  { 
    key: 'website', 
    label: 'Website',
    render: (company) => company.website && (
      <a href={company.website} target="_blank" className="text-blue-600">
        {company.website}
      </a>
    )
  },
  { 
    key: 'contactCount', 
    label: '# Personen',
    sortable: true,
    render: (company) => company.contactCount || 0
  },
  { 
    key: 'lastContact', 
    label: 'Zuletzt kontaktiert',
    sortable: true,
    render: (company) => company.lastContactDate 
      ? formatDate(company.lastContactDate) 
      : '—'
  }
];
```

### 2.2 Erweiterte Personen-Übersicht
**Datei:** `src/components/library/tables/EnhancedContactTable.tsx`

```typescript
// Spalten genau wie in der Strategie definiert:
const columns = [
  { 
    key: 'name', 
    label: 'Vollständiger Name',
    render: (contact) => (
      <Link href={`/dashboard/contacts/crm/contacts/${contact.id}`}>
        {contact.formattedName || `${contact.firstName} ${contact.lastName}`}
      </Link>
    )
  },
  { 
    key: 'position', 
    label: 'Position',
    sortable: true 
  },
  { 
    key: 'company', 
    label: 'Firma',
    render: (contact) => contact.companyName && (
      <Link href={`/dashboard/contacts/crm/companies/${contact.companyId}`}>
        {contact.companyName}
      </Link>
    )
  },
  { 
    key: 'phone', 
    label: 'Telefon (Mobil/Geschäftlich)',
    render: (contact) => {
      const primaryPhone = contact.phoneNumbers?.find(p => p.isPrimary) 
        || contact.phoneNumbers?.[0];
      return primaryPhone && (
        <a href={`tel:${primaryPhone.number}`}>
          {primaryPhone.number}
        </a>
      );
    }
  },
  { 
    key: 'publications', 
    label: 'Zugeordnete Publikation(en)',
    render: (contact) => (
      <div className="flex gap-1 flex-wrap">
        {contact.publicationAccess?.publicationIds.map(id => (
          <Badge key={id} color="blue">{getPublicationName(id)}</Badge>
        ))}
      </div>
    )
  },
  { 
    key: 'beat', 
    label: 'Tags / Ressort',
    render: (contact) => (
      <div className="flex gap-1 flex-wrap">
        {contact.publicationAccess?.beats?.map(beat => (
          <Badge key={beat} color="zinc">{beat}</Badge>
        ))}
      </div>
    )
  }
];
```

### 2.3 Neue Publikations-Übersicht
**Datei:** `src/components/library/tables/PublicationTable.tsx`

```typescript
// Spalten genau wie in der Strategie definiert:
const columns = [
  { 
    key: 'title', 
    label: 'Titel der Publikation',
    sortable: true,
    render: (pub) => (
      <Link href={`/dashboard/library/publications/${pub.id}`}>
        {pub.title}
      </Link>
    )
  },
  { 
    key: 'publisher', 
    label: 'Verlag',
    render: (pub) => pub.publisherName
  },
  { 
    key: 'type', 
    label: 'Typ',
    render: (pub) => <Badge>{publicationTypeLabels[pub.type]}</Badge>
  },
  { 
    key: 'printMetric', 
    label: 'Metrik (Print)',
    render: (pub) => pub.metrics?.print?.circulation 
      ? `${pub.metrics.print.circulation.toLocaleString('de-DE')} Auflage`
      : '—'
  },
  { 
    key: 'onlineMetric', 
    label: 'Metrik (Online)',
    render: (pub) => pub.metrics?.online?.monthlyUniqueVisitors
      ? `${pub.metrics.online.monthlyUniqueVisitors.toLocaleString('de-DE')} UV/Monat`
      : '—'
  },
  { 
    key: 'frequency', 
    label: 'Frequenz',
    render: (pub) => frequencyLabels[pub.metrics?.frequency] || '—'
  },
  { 
    key: 'languages', 
    label: 'Sprache(n)',
    render: (pub) => pub.languages?.join(', ') || '—'
  },
  { 
    key: 'geoTargets', 
    label: 'Geografisches Zielgebiet',
    render: (pub) => pub.geographicTargets?.join(', ') || '—'
  }
];
```

## Phase 3: Firebase Services ✅ ABGESCHLOSSEN

### 3.1 Organization Service ✅
**Datei:** `src/lib/firebase/organization-service.ts` (ERSTELLT)

Implementiert:
- Organisation CRUD
- Team Member Management
- Permissions & Rollen
- Limit-Prüfung pro Plan
- Einladungs-System

### 3.2 Service Base ✅
**Datei:** `src/lib/firebase/service-base.ts` (ERSTELLT)

Basis-Klasse mit:
- Automatische Mandanten-Filterung
- Audit Trail (createdBy, updatedBy)
- Soft Delete mit Restore
- Batch-Operationen
- Pagination
- Export (CSV/JSON)

### 3.3 CRM Service Enhanced ✅
**Datei:** `src/lib/firebase/crm-service-enhanced.ts` (ERSTELLT)

Drei Services:
- `CompanyEnhancedService` - Mit Hierarchie, Identifikatoren
- `ContactEnhancedService` - Mit GDPR, Journalisten-Features
- `TagEnhancedService` - Mit Merge-Funktion

### 3.4 Library Service ✅
**Datei:** `src/lib/firebase/library-service.ts` (ERSTELLT)

Drei Services:
- `PublicationService` - Mit Import, Verifikation, Statistiken
- `AdvertisementService` - Mit Preis-Kalkulation, Duplikation
- `MediaKitService` - Mit Generierung, Sharing

## Phase 4: Validierung & Utilities ❌ NOCH ZU IMPLEMENTIEREN

### 4.1 ISO-Validatoren
**Datei:** `src/lib/validators/iso-validators.ts` (NOCH ZU ERSTELLEN)

```typescript
// ISO 3166-1 Alpha-2 Ländercode-Validierung
export const isValidCountryCode = (code: string): boolean => {
  const validCodes = ['DE', 'AT', 'CH', 'US', 'GB', 'FR', 'IT', 'ES', /* ... */];
  return validCodes.includes(code.toUpperCase());
};

// ISO 4217 Währungscode-Validierung
export const isValidCurrencyCode = (code: string): boolean => {
  const validCodes = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', /* ... */];
  return validCodes.includes(code.toUpperCase());
};

// ISO 639-1 Sprachcode-Validierung
export const isValidLanguageCode = (code: string): boolean => {
  const validCodes = ['de', 'en', 'fr', 'it', 'es', 'nl', /* ... */];
  return validCodes.includes(code.toLowerCase());
};

// E.164 Telefonnummer-Validierung
export const isValidE164Phone = (phone: string): boolean => {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
};

// Formatierung für Anzeige
export const formatE164Phone = (phone: string, countryCode?: string): string => {
  // Formatierung basierend auf Ländercode
  if (countryCode === 'DE' && phone.startsWith('+49')) {
    // +49 30 12345678 -> +49 30 123 456 78
    return phone.replace(/(\+49)(\d{2,4})(\d{3,4})(\d{3,4})/, '$1 $2 $3 $4');
  }
  // Weitere Länder...
  return phone;
};
```

### 4.2 Identifikationsnummern-Validatoren
**Datei:** `src/lib/validators/identifier-validators.ts` (NOCH ZU ERSTELLEN)

```typescript
// EU USt-IdNr. Validierung
export const validateEuVat = (vatNumber: string): boolean => {
  const patterns: Record<string, RegExp> = {
    'DE': /^DE\d{9}$/,
    'AT': /^ATU\d{8}$/,
    'FR': /^FR[A-Z0-9]{2}\d{9}$/,
    // ... weitere EU-Länder
  };
  
  const countryCode = vatNumber.substring(0, 2);
  return patterns[countryCode]?.test(vatNumber) || false;
};

// US EIN Validierung
export const validateUsEin = (ein: string): boolean => {
  const einRegex = /^\d{2}-\d{7}$/;
  return einRegex.test(ein);
};

// Schweizer UID Validierung
export const validateChUid = (uid: string): boolean => {
  const uidRegex = /^CHE-\d{3}\.\d{3}\.\d{3}$/;
  return uidRegex.test(uid);
};

// Deutsche Handelsregisternummer
export const validateDeHandelsregister = (hrNumber: string): boolean => {
  const hrRegex = /^(HRA|HRB)\s\d{1,6}(\s[A-Za-zÄÖÜäöüß\s]+)?$/;
  return hrRegex.test(hrNumber);
};
```

## Phase 5: UI-Komponenten

### 5.1 Internationale Eingabekomponenten
**Datei:** `src/components/library/international/CountrySelector.tsx`

```typescript
import { useState } from 'react';
import { Select } from '@/components/select';
import countries from 'i18n-iso-countries';
import de from 'i18n-iso-countries/langs/de.json';
import en from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(de);
countries.registerLocale(en);

interface CountrySelectorProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  label?: string;
  required?: boolean;
  language?: 'de' | 'en';
}

export function CountrySelector({ 
  value, 
  onChange, 
  multiple = false, 
  label = "Land",
  required = false,
  language = 'de' 
}: CountrySelectorProps) {
  const countryList = Object.entries(
    countries.getNames(language, { select: 'official' })
  ).map(([code, name]) => ({
    code,
    name
  })).sort((a, b) => a.name.localeCompare(b.name));

  if (multiple) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
          {countryList.map(({ code, name }) => (
            <label key={code} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={(value as string[]).includes(code)}
                onChange={(e) => {
                  const currentValues = value as string[];
                  if (e.target.checked) {
                    onChange([...currentValues, code]);
                  } else {
                    onChange(currentValues.filter(v => v !== code));
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{name} ({code})</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Select 
        value={value as string} 
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">Bitte wählen...</option>
        {countryList.map(({ code, name }) => (
          <option key={code} value={code}>
            {name} ({code})
          </option>
        ))}
      </Select>
    </div>
  );
}
```

### 5.2 GDPR Consent Management
**Datei:** `src/components/crm/enhanced/GDPRConsent.tsx`

```typescript
interface GDPRConsentProps {
  consents: GdprConsent[];
  contactId: string;
  onUpdate: () => void;
}

export function GDPRConsent({ consents, contactId, onUpdate }: GDPRConsentProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  
  const purposes = [
    'Marketing-Newsletter',
    'Telefonische Kontaktaufnahme',
    'Event-Einladungen', 
    'Produktinformationen',
    'Pressemitteilungen',
    'Marktforschung'
  ];
  
  const methods = [
    'Webformular Checkbox',
    'E-Mail-Bestätigung',
    'Mündliche Einwilligung',
    'Schriftliches Formular',
    'Double-Opt-In',
    'Vertragsbestandteil'
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">DSGVO-Einwilligungen</h3>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          Einwilligung dokumentieren
        </Button>
      </div>

      {consents.length === 0 ? (
        <Alert type="warning" title="Keine Einwilligungen vorhanden">
          Bitte dokumentieren Sie die Einwilligungen gemäß DSGVO Art. 7
        </Alert>
      ) : (
        <div className="space-y-3">
          {consents.map((consent, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{consent.purpose}</span>
                    <Badge color={consent.status === 'granted' ? 'green' : 'red'}>
                      {consent.status === 'granted' ? 'Erteilt' : 'Widerrufen'}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Datum:</span> {formatDate(consent.statusChangedAt)}
                    </div>
                    <div>
                      <span className="font-medium">Grundlage:</span> {consent.informationProvided}
                    </div>
                    <div>
                      <span className="font-medium">Methode:</span> {consent.method}
                    </div>
                    {consent.documentUrl && (
                      <div>
                        <a href={consent.documentUrl} target="_blank" className="text-blue-600 hover:underline">
                          Einwilligungsdokument anzeigen
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {consent.status === 'granted' && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => revokeConsent(consent)}
                  >
                    Widerrufen
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Consent Modal */}
      {showAddModal && (
        <GDPRConsentModal
          purposes={purposes}
          methods={methods}
          contactId={contactId}
          onClose={() => setShowAddModal(false)}
          onSave={onUpdate}
        />
      )}
    </div>
  );
}
```

## Phase 6: Migration & Deployment ❌ NOCH ZU IMPLEMENTIEREN

### 6.1 Migrationsskript für bestehende Daten
**Datei:** `scripts/migrate-to-enhanced-model.ts` (NOCH ZU ERSTELLEN)

```typescript
import { db } from '@/lib/firebase/admin-init';
import { Company, Contact } from '@/types/crm';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';

async function migrateCompanies() {
  console.log('Starting company migration...');
  
  const companiesRef = db.collection('companies');
  const snapshot = await companiesRef.get();
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    const oldData = doc.data() as Company;
    
    // Transformation zu neuem Schema
    const enhancedData: Partial<CompanyEnhanced> = {
      ...oldData,
      officialName: oldData.name,
      tradingName: oldData.name,
      
      // Adresse transformieren
      addressStructured: oldData.address ? {
        street: oldData.address.street || '',
        houseNumber: '', // Muss manuell extrahiert werden
        city: oldData.address.city || '',
        postalCode: oldData.address.zip || '',
        countryIsoCode: getCountryCode(oldData.address.country || 'Deutschland'),
        region: oldData.address.state
      } : undefined,
      
      // Publikationen extrahieren
      // Diese werden zu separaten Dokumenten
    };
    
    batch.update(doc.ref, enhancedData);
    count++;
  });
  
  await batch.commit();
  console.log(`Migrated ${count} companies`);
}

async function extractPublications() {
  console.log('Extracting publications from companies...');
  
  const companiesRef = db.collection('companies');
  const snapshot = await companiesRef.get();
  
  const publications: any[] = [];
  
  snapshot.forEach(doc => {
    const company = doc.data() as Company;
    
    if (company.mediaInfo?.publications) {
      company.mediaInfo.publications.forEach(pub => {
        publications.push({
          title: pub.name,
          publisherId: doc.id,
          publisherName: company.name,
          type: mapPublicationType(pub.type),
          format: pub.format,
          metrics: {
            frequency: pub.frequency,
            print: pub.circulation ? {
              circulation: pub.circulation,
              circulationType: 'distributed'
            } : undefined,
            online: pub.reach ? {
              monthlyUniqueVisitors: pub.reach
            } : undefined
          },
          focusAreas: pub.focusAreas,
          userId: company.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
    }
  });
  
  // Batch-Insert der Publikationen
  const publicationsRef = db.collection('publications');
  const batch = db.batch();
  
  publications.forEach(pub => {
    const docRef = publicationsRef.doc();
    batch.set(docRef, pub);
  });
  
  await batch.commit();
  console.log(`Created ${publications.length} publication documents`);
}

// Hilfsfunktionen
function getCountryCode(countryName: string): string {
  const mapping: Record<string, string> = {
    'Deutschland': 'DE',
    'Germany': 'DE',
    'Österreich': 'AT',
    'Austria': 'AT',
    'Schweiz': 'CH',
    'Switzerland': 'CH',
    // ... weitere Mappings
  };
  return mapping[countryName] || 'DE';
}

function mapPublicationType(oldType: string): string {
  const mapping: Record<string, string> = {
    'newspaper': 'newspaper',
    'magazine': 'magazine',
    'online': 'website',
    'blog': 'blog',
    // ... weitere Mappings
  };
  return mapping[oldType] || 'website';
}

// Hauptfunktion
async function runMigration() {
  try {
    await migrateCompanies();
    await extractPublications();
    // await migrateContacts();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

## Phase 7: Implementierungsreihenfolge (AKTUELLER STAND)

### Sprint 1 (Woche 1-2): Datenmodell & Backend - 75% FERTIG
- [x] Neue TypeScript-Interfaces erstellen
  - ✅ international.ts
  - ✅ crm-enhanced.ts  
  - ✅ library.ts
- [ ] Validatoren implementieren ❌ OFFEN
  - [ ] iso-validators.ts
  - [ ] identifier-validators.ts
  - [ ] phone-validators.ts
- [x] Firebase Services erweitern
  - ✅ organization-service.ts
  - ✅ service-base.ts
  - ✅ crm-service-enhanced.ts
  - ✅ library-service.ts
- [ ] Migrationsskripte vorbereiten ❌ OFFEN

### Sprint 2 (Woche 3-4): Basis-UI für Bibliothek - 0% OFFEN
- [ ] Navigation erweitern
- [ ] Publikations-Übersicht erstellen
- [ ] Werbemittel-Übersicht erstellen
- [ ] Basis-CRUD-Operationen

### Sprint 3 (Woche 5-6): Erweiterte CRM-Features - 0% OFFEN
- [ ] Company Modal um neue Felder erweitern
- [ ] Contact Modal um GDPR-Management erweitern
- [ ] Internationale Komponenten integrieren
- [ ] Übersichtstabellen implementieren

### Sprint 4 (Woche 7-8): Integration & Polish - 0% OFFEN
- [ ] Verknüpfungen zwischen Entitäten
- [ ] Import/Export erweitern
- [ ] Media Kit Generator
- [ ] Performance-Optimierung

### Sprint 5 (Woche 9-10): Testing & Deployment - 0% OFFEN
- [ ] Unit Tests schreiben
- [ ] Integration Tests
- [ ] Datenmigration durchführen
- [ ] Dokumentation vervollständigen

## Checkliste: Alle Strategie-Anforderungen

### ✅ Datenmodell-Anforderungen (aus Gap-Analyse)
- [x] Trennung offizieller_firmenname vs. markenname_dba
- [x] Strukturiertes Adress-Objekt mit ISO-Ländercode
- [x] Flexibles identifikationsnummern-Array
- [x] Strukturiertes jahresumsatz-Objekt mit Währungscode
- [x] muttergesellschaft_id für Hierarchien
- [x] Strukturiertes name_strukturiert-Objekt
- [x] E.164-Format für Telefonnummern
- [x] Detailliertes gdpr_einwilligung-Array
- [x] ISO-Standards für Sprache (639-1)
- [x] Publikation als eigenständige Top-Level-Entität
- [x] Strukturiertes metriken-Objekt
- [x] geografisches_zielgebiet_iso_code
- [x] identifikatoren-Array (ISSN, URL)
- [x] Komplette werbemittel-Entität

### ✅ Übersichtstabellen (aus Strategie-Dokument)
- [x] Erweiterte Firmen-Tabelle mit allen 7 Spalten (geplant)
- [x] Erweiterte Personen-Tabelle mit 6 Spalten (geplant)
- [x] Neue Publikations-Tabelle mit 8 Spalten (geplant)

### ✅ Technische Anforderungen
- [x] UUID v4 für alle IDs (Firestore generiert)
- [x] ISO-konforme Validierung (Types definiert, Validatoren ausstehend)
- [x] Flexibles Key-Value für Spezifikationen
- [x] Audit-Trail für GDPR
- [x] Performance-Optimierung für große Datenmengen (Basis vorhanden)
- [x] Mandantenfähigkeit (ZUSÄTZLICH IMPLEMENTIERT)

## Zusammenfassung Aktueller Stand

**Abgeschlossen:**
- ✅ Alle Type-Definitionen (3 Dateien)
- ✅ Alle Firebase Services (4 Dateien)
- ✅ Mandantenfähigkeit vollständig integriert

**Nächste Schritte (Sprint 1 abschließen):**
- ❌ Validatoren implementieren (3 Dateien)
- ❌ Migrationsskript erstellen (1 Datei)

**Gesamt-Fortschritt:** ~15% des Gesamtprojekts# SKAMP Bibliothek - Implementierungsstatus und Plan

## 📋 Projektstatus: Januar 2025

### ⚠️ WICHTIGE ÄNDERUNG: Mandantenfähigkeit wurde direkt integriert
Während der Implementierung haben wir entschieden, die Mandantenfähigkeit von Anfang an einzubauen:
- Alle Types erweitern `BaseEntity` mit `organizationId`
- Rollen-System mit 5 Stufen (Owner, Admin, Member, Client, Guest)
- Team-Management und Permissions
- Alle Services nutzen automatische Mandanten-Filterung

---

## 🚀 Sprint-Übersicht nach ursprünglichem Plan

### Sprint 1 (Woche 1-2): Datenmodell & Backend
- [x] Neue TypeScript-Interfaces erstellen
  - ✅ `src/types/international.ts` (mit Mandanten-Support)
  - ✅ `src/types/crm-enhanced.ts`
  - ✅ `src/types/library.ts`
- [ ] Validatoren implementieren ❌ NOCH OFFEN
  - [ ] `src/lib/validators/iso-validators.ts`
  - [ ] `src/lib/validators/identifier-validators.ts`
- [x] Firebase Services erweitern
  - ✅ `src/lib/firebase/organization-service.ts` (NEU - für Mandanten)
  - ✅ `src/lib/firebase/service-base.ts` (NEU - Basis-Klasse)
  - ✅ `src/lib/firebase/crm-service-enhanced.ts`
  - ✅ `src/lib/firebase/library-service.ts`
- [ ] Migrationsskripte vorbereiten ❌ NOCH OFFEN
  - [ ] `scripts/migrate-to-enhanced-model.ts`

**Sprint 1 Status: 75% abgeschlossen**

---

### Sprint 2 (Woche 3-4): Basis-UI für Bibliothek
- [ ] Navigation erweitern
- [ ] Publikations-Übersicht erstellen
  - [ ] `src/app/dashboard/library/publications/page.tsx`
  - [ ] `src/components/library/tables/PublicationTable.tsx`
- [ ] Werbemittel-Übersicht erstellen
  - [ ] `src/app/dashboard/library/advertisements/page.tsx`
  - [ ] `src/components/library/tables/AdvertisementTable.tsx`
- [ ] Basis-CRUD-Operationen
  - [ ] `PublicationModal.tsx`
  - [ ] `AdvertisementModal.tsx`

**Sprint 2 Status: 0% - Noch nicht begonnen**

---

### Sprint 3 (Woche 5-6): Erweiterte CRM-Features
- [ ] Company Modal um neue Felder erweitern
  - [ ] Internationale Adressen
  - [ ] Business Identifiers
  - [ ] Hierarchie (Mutter-/Tochtergesellschaften)
- [ ] Contact Modal um GDPR-Management erweitern
  - [ ] GDPR Consent UI
  - [ ] Strukturierte Namen
  - [ ] Media-Profile für Journalisten
- [ ] Internationale Komponenten integrieren
  - [ ] `CountrySelector.tsx`
  - [ ] `LanguageSelector.tsx`
  - [ ] `CurrencyInput.tsx`
  - [ ] `PhoneInput.tsx`
- [ ] Übersichtstabellen implementieren
  - [ ] Erweiterte Firmen-Tabelle
  - [ ] Erweiterte Personen-Tabelle
  - [ ] Neue Publikations-Tabelle

**Sprint 3 Status: 0% - Noch nicht begonnen**

---

### Sprint 4 (Woche 7-8): Integration & Polish
- [ ] Verknüpfungen zwischen Entitäten
- [ ] Import/Export erweitern
  - [ ] Publikationen Import
  - [ ] Erweiterte Felder in bestehenden Importen
- [ ] Media Kit Generator
  - [ ] PDF-Generierung
  - [ ] Templates
- [ ] Performance-Optimierung

**Sprint 4 Status: 0% - Noch nicht begonnen**

---

### Sprint 5 (Woche 9-10): Testing & Deployment
- [ ] Unit Tests schreiben
- [ ] Integration Tests
- [ ] Datenmigration durchführen
- [ ] Dokumentation vervollständigen

**Sprint 5 Status: 0% - Noch nicht begonnen**

---

## 📁 Erstellte Dateien bisher

### ✅ Types (3 Dateien)
1. `src/types/international.ts` - Basis-Types, Mandanten, ISO-Standards
2. `src/types/crm-enhanced.ts` - Erweiterte CRM-Types
3. `src/types/library.ts` - Publikationen & Werbemittel

### ✅ Services (4 Dateien)
1. `src/lib/firebase/organization-service.ts` - Mandanten & Teams
2. `src/lib/firebase/service-base.ts` - Basis-Service mit Mandanten-Filter
3. `src/lib/firebase/crm-service-enhanced.ts` - Erweiterte CRM-Services
4. `src/lib/firebase/library-service.ts` - Bibliothek-Services

---

## 🎯 Nächste Schritte

**Um Sprint 1 abzuschließen:**
1. **Validatoren implementieren**
   - ISO-Standard Validierung (Länder, Währungen, Sprachen)
   - Business Identifier Validierung (USt-ID, EIN, etc.)
   - Telefonnummern E.164 Format

2. **Migrationsskript erstellen**
   - Bestehende Companies/Contacts migrieren
   - Publikationen aus mediaInfo extrahieren
   - Neue Felder mit Defaults füllen

---

## 📊 Gesamt-Fortschritt

- **Sprint 1**: 75% ████████████████████░░░░░ (2 von 4 Aufgaben)
- **Sprint 2**: 0% ░░░░░░░░░░░░░░░░░░░░░░░░░
- **Sprint 3**: 0% ░░░░░░░░░░░░░░░░░░░░░░░░░
- **Sprint 4**: 0% ░░░░░░░░░░░░░░░░░░░░░░░░░
- **Sprint 5**: 0% ░░░░░░░░░░░░░░░░░░░░░░░░░

**Gesamt: ~15% abgeschlossen**