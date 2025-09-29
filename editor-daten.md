# Editor-Seite Datenanalyse

Analyse aller Werte in der Journalist-Editor-Seite (`src/app/dashboard/library/editors/page.tsx`)

## 1. Tabellen-Ansicht (Table View)

| **Feld** | **Angezeigter Wert** | **Datenquelle** | **Status** |
|----------|---------------------|------------------|------------|
| **Journalist Name** | `journalist.personalData.displayName` | CRM: `contact.displayName` | ✅ Echt |
| **Position** | `journalist.professionalData.employment.position` ODER `journalist.personalData.name.first + ' ' + journalist.personalData.name.last` | CRM: `contact.position` ODER konstruiert aus Name | ⚠️ Fallback |
| **Medienhaus Name** | `journalist.professionalData.employment.company?.name` ODER `'Selbstständig'` | CRM: `contact.companyName` ODER Hardcoded | ⚠️ Fallback |
| **Medienhaus Typ** | `companyTypeLabels[journalist.professionalData.employment?.company?.type]` ODER `'Medienhaus'` | **HARDCODED:** `'media_house' as any` | ❌ Mock |
| **Publikationen** | `journalist.professionalData.publicationAssignments` | **NICHT TRANSFERIERT** aus CRM | ❌ Leer |
| **Publikationen Badges** | `assignment.publication.title` | **NICHT VORHANDEN** | ❌ Mock |
| **"Keine Publikationen"** | `"Keine Publikationen"` | Hardcoded Fallback | ❌ Mock |
| **Verification Status** | `journalist.metadata?.verification?.status` | **HARDCODED:** `status: 'verified' as any` | ❌ Mock |
| **"Verifiziert" Badge** | `'Verifiziert'` | Basiert auf hardcoded Status | ❌ Mock |
| **Quality Score** | `journalist.metadata?.dataQuality?.overallScore` | **HARDCODED:** `|| 85` | ❌ Mock |
| **Themen** | `journalist.professionalData.expertise.primaryTopics` | CRM: `contact.mediaProfile?.beats` ODER `contact.topics` | ✅ Echt |
| **Email** | `journalist.personalData.emails.find(e => e.isPrimary)?.email` | CRM: `contact.emails` | ✅ Echt |
| **Telefon** | `journalist.personalData.phones?.[0]?.number` | CRM: `contact.phones` | ✅ Echt |

## 2. Card-Ansicht (Grid View)

| **Feld** | **Angezeigter Wert** | **Datenquelle** | **Status** |
|----------|---------------------|------------------|------------|
| **Card Header Name** | `journalist.personalData.displayName` | CRM: `contact.displayName` | ✅ Echt |
| **Card Position** | `journalist.professionalData.employment.position` ODER Name-Konstruktion | CRM: `contact.position` ODER konstruiert | ⚠️ Fallback |
| **Card Company** | `journalist.professionalData.employment.company?.name` ODER `'Selbstständig'` | CRM: `contact.companyName` ODER Fallback | ⚠️ Fallback |
| **"Verifiziert" Badge** | `'Verifiziert'` | **HARDCODED:** `status: 'verified' as any` | ❌ Mock |
| **Quality Score** | `journalist.metadata?.dataQuality?.overallScore` | **HARDCODED:** `|| 85` ODER `|| 0` | ❌ Mock |
| **Primary Email** | `journalist.personalData.emails.find(e => e.isPrimary)?.email` | CRM: `contact.emails` | ✅ Echt |
| **Phone Status** | `hasPhone` Boolean | CRM: `contact.phones` | ✅ Echt |
| **Primary Topics** | `journalist.professionalData.expertise.primaryTopics.slice(0, 3)` | CRM: `contact.mediaProfile?.beats` ODER `contact.topics` | ✅ Echt |
| **Social Followers** | `journalist.socialMedia?.influence?.totalFollowers` | **NICHT TRANSFERIERT** aus CRM | ❌ Leer |

## 3. Import-Dialog (Import Modal)

| **Feld** | **Angezeigter Wert** | **Datenquelle** | **Status** |
|----------|---------------------|------------------|------------|
| **Dialog Name** | `journalist.personalData.displayName` | CRM: `contact.displayName` | ✅ Echt |
| **Dialog Position** | `journalist.professionalData.employment.position` ODER Name-Konstruktion | CRM: `contact.position` ODER konstruiert | ⚠️ Fallback |
| **Dialog Company** | `journalist.professionalData.employment.company?.name` ODER `'Selbstständig'` | CRM: `contact.companyName` ODER Fallback | ⚠️ Fallback |
| **Quality Score im Dialog** | `journalist.metadata?.dataQuality?.overallScore` | **HARDCODED:** `|| 0` | ❌ Mock |
| **Field Mapping Name** | `journalist.personalData.displayName` | CRM: `contact.displayName` | ✅ Echt |
| **Field Mapping Email** | `journalist.personalData.emails.find(e => e.isPrimary)?.email` | CRM: `contact.emails` | ✅ Echt |
| **Field Mapping Phone** | `journalist.personalData.phones?.[0]?.number` | CRM: `contact.phones` | ✅ Echt |
| **Field Mapping Company** | `journalist.professionalData.employment.company?.name` ODER `'Selbstständig'` | CRM: `contact.companyName` ODER Fallback | ⚠️ Fallback |
| **Field Mapping Position** | `journalist.professionalData.employment.position` ODER Name-Konstruktion | CRM: `contact.position` ODER konstruiert | ⚠️ Fallback |
| **Field Mapping Topics** | `journalist.professionalData.expertise.primaryTopics.join(', ')` | CRM: `contact.mediaProfile?.beats` ODER `contact.topics` | ✅ Echt |
| **Import Notes** | `"Importiert aus Journalisten-Datenbank\nScore: ${score}"` | Score ist **HARDCODED** | ❌ Mock |
| **Duplicate Warning** | `Math.random() > 0.7` | **RANDOM MOCK** | ❌ Mock |

## 4. Daten-Konvertierung (CRM zu UI)

### ✅ KORREKT übertragen:
- `displayName` → `personalData.displayName`
- `name.firstName/lastName` → `personalData.name.first/last`
- `emails` → `personalData.emails`
- `phones` → `personalData.phones`
- `languages` → `personalData.languages`
- `position` → `professionalData.employment.position`
- `companyName` → `professionalData.employment.company.name`
- `mediaProfile.beats` → `professionalData.expertise.primaryTopics`
- `topics` → `professionalData.expertise.primaryTopics`

### ❌ HARDCODED/MOCK-Werte:
- `type: 'media_house' as any` → sollte aus CRM `company.type` kommen
- `status: 'verified' as any` → sollte aus CRM `verificationStatus` kommen
- `overallScore: contact.globalMetadata?.qualityScore || 85` → 85 ist Fallback-Mock
- `publicationAssignments: []` → NICHT aus CRM übertragen
- `socialMedia.influence` → NICHT aus CRM übertragen
- `Math.random() > 0.7` für Duplicate Warning

### ❌ FEHLENDE Transferierung:
- **Publikationen**: CRM hat `mediaProfile.publications`, wird aber nicht übertragen
- **Medientypen**: CRM hat `mediaProfile.mediaTypes`, wird aber nicht angezeigt
- **Company Type**: CRM hat `company.type`, wird aber hardcoded als 'media_house'
- **Verification**: CRM hat Verification-Felder, werden aber nicht genutzt
- **Social Media**: CRM hat Social Media Daten, werden aber nicht übertragen
- **Quality Score**: CRM hat echten Score, wird aber mit 85 überschrieben

## 5. Zusammenfassung der Mock-Probleme

### Kritische Mock-Werte die entfernt werden müssen:
1. **Company Type**: `'media_house' as any` → CRM `company.type`
2. **Verification Status**: `'verified' as any` → CRM Verification-Status
3. **Quality Score Fallback**: `|| 85` → Nur echten Score verwenden
4. **Fehlende Publikationen**: Aus CRM `mediaProfile.publications` laden
5. **Random Duplicate Warning**: `Math.random() > 0.7` → Echte Logik
6. **Social Media**: Aus CRM übertragen statt leer lassen

### Empfohlene Fixes:
- Company Type aus CRM `contact.company.type` verwenden
- Verification Status aus CRM `contact.verificationStatus` verwenden
- Quality Score nur aus CRM ohne Fallback-Mock
- Publikationen aus CRM `contact.mediaProfile.publications` übertragen
- Social Media Daten aus CRM übertragen
- Duplicate Logic implementieren statt Random

## 6. Korrekte CRM-Feld-Zuordnung für jeden Mock-Wert

### 6.1 Company Type ("Medienhaus" Problem)
**Aktuell:** `'media_house' as any` (hardcoded)
**Korrekt:**
```typescript
// CRM ContactEnhanced hat company-Verknüpfung
contact.company?.type // aus CompanyEnhanced.type
// ODER über companyId lookup:
companies.find(c => c.id === contact.companyId)?.type
```

**Verfügbare Company Types aus CRM:**
```typescript
export const companyTypeLabels = {
  customer: 'Kunde',
  supplier: 'Lieferant',
  partner: 'Partner',
  competitor: 'Wettbewerber',
  investor: 'Investor',
  lead: 'Lead',
  publisher: 'Verlag',          // ← Richtig für Zeitungsverlage
  media_house: 'Medienhaus',    // ← Richtig für TV/Radio
  agency: 'Agentur',
  other: 'Sonstige'
}
```

### 6.2 Verification Status ("Verifiziert" Problem)
**Aktuell:** `'verified' as any` (hardcoded)
**Korrekt:**
```typescript
// Option 1: Social Profile Verification
contact.socialProfiles?.some(p => p.verified === true) ? 'verified' : 'unverified'

// Option 2: Global Metadata (falls vorhanden)
contact.globalMetadata?.verificationStatus

// Option 3: Media Profile Verification (neu implementieren)
contact.mediaProfile?.isVerified
```

### 6.3 Quality Score (Score "85" Problem)
**Aktuell:** `contact.globalMetadata?.qualityScore || 85` (Mock-Fallback)
**Korrekt:**
```typescript
// Nur echten Score verwenden, kein Fallback
contact.globalMetadata?.qualityScore
// ODER null/undefined wenn nicht vorhanden
contact.globalMetadata?.qualityScore ?? null
```

**Alternative:** Berechnung aus verfügbaren Daten:
```typescript
// Score basierend auf Vollständigkeit berechnen
function calculateQualityScore(contact: ContactEnhanced): number {
  let score = 0;
  if (contact.emails?.length) score += 20;
  if (contact.phones?.length) score += 20;
  if (contact.position) score += 15;
  if (contact.companyName) score += 15;
  if (contact.mediaProfile?.beats?.length) score += 15;
  if (contact.socialProfiles?.length) score += 15;
  return score;
}
```

### 6.4 Publikationen (Fehlende Publications)
**Aktuell:** `publicationAssignments: []` (leer)
**Korrekt:**
```typescript
// CRM hat publicationIds Array
contact.mediaProfile?.publicationIds || []

// Diese IDs müssen zu Publication-Objekten aufgelöst werden:
const publicationAssignments = await Promise.all(
  (contact.mediaProfile?.publicationIds || []).map(async (pubId) => {
    const publication = await publicationsService.getById(pubId);
    return {
      publication: {
        title: publication.title,
        type: publication.type,
        globalPublicationId: publication.id
      },
      role: contact.mediaProfile?.beats?.[0] || 'reporter' // Default role
    };
  })
);
```

**Publication-Struktur aus CRM:**
```typescript
interface Publication {
  id: string;
  title: string;
  type: 'newspaper' | 'magazine' | 'online' | 'blog' | 'podcast' | 'tv' | 'radio';
  format: 'print' | 'online' | 'both' | 'broadcast';
  frequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
  focusAreas: string[]; // Themenschwerpunkte
  circulation?: number; // Auflage
  reach?: number; // Online-Reichweite
}
```

### 6.5 Media Types (Fehlende Medientypen)
**Aktuell:** Nicht angezeigt
**Korrekt:**
```typescript
// CRM ContactEnhanced.mediaProfile hat mediaTypes
contact.mediaProfile?.mediaTypes || []
// Typ: ('print' | 'online' | 'tv' | 'radio' | 'podcast')[]
```

### 6.6 Social Media Influence (Fehlende Social-Daten)
**Aktuell:** `totalFollowers: 0` (leer)
**Korrekt:**
```typescript
// Social Profile Follower summieren
const totalFollowers = contact.socialProfiles?.reduce((sum, profile) => {
  return sum + (profile.followers || 0);
}, 0) || 0;

// Influence Score aus MediaProfile
const influenceScore = contact.mediaProfile?.influence?.score || null;
const reach = contact.mediaProfile?.influence?.reach || null;
const engagement = contact.mediaProfile?.influence?.engagement || null;
```

### 6.7 Duplicate Warning (Random Mock)
**Aktuell:** `Math.random() > 0.7` (Zufalls-Mock)
**Korrekt:** Echte Duplicate-Erkennung basierend auf:
```typescript
// Email-basierte Duplicate-Prüfung
const duplicateCheck = async (journalist: JournalistDatabaseEntry) => {
  const primaryEmail = journalist.personalData.emails.find(e => e.isPrimary)?.email;
  if (!primaryEmail) return false;

  // Prüfe ob Email bereits in CRM existiert
  const existingContacts = await crmService.getAll(organizationId);
  return existingContacts.some(contact =>
    contact.emails?.some(email => email.email === primaryEmail)
  );
};

// Name + Company basierte Duplicate-Prüfung
const nameCompanyMatch = existingContacts.some(contact =>
  contact.displayName === journalist.personalData.displayName &&
  contact.companyName === journalist.professionalData.employment.company?.name
);
```

### 6.8 Company Information
**Aktuell:** `companyName || 'Selbstständig'` (Fallback)
**Korrekt:**
```typescript
// Vollständige Company-Informationen aus CRM
const companyInfo = {
  name: contact.companyName || 'Selbstständig',
  type: contact.company?.type || 'other',
  website: contact.company?.website,
  address: contact.company?.mainAddress,
  // Für Medienhäuser zusätzlich:
  mediaInfo: contact.company?.mediaInfo
};
```

### 6.9 Professional Information
**Korrekt:** Erweiterte Berufs-Informationen nutzen:
```typescript
{
  employment: {
    company: companyInfo,
    position: contact.position,
    department: contact.department,
    isFreelance: !contact.companyId // Freelancer wenn keine Company
  },
  expertise: {
    primaryTopics: contact.mediaProfile?.beats || contact.topics || [],
    secondaryTopics: contact.mediaProfile?.preferredTopics,
    industries: contact.company?.industryClassification?.sectors
  },
  mediaTypes: contact.mediaProfile?.mediaTypes || [],
  // Zusätzliche Journalist-Informationen:
  submissionGuidelines: contact.mediaProfile?.submissionGuidelines,
  deadlines: contact.mediaProfile?.deadlines,
  preferredFormats: contact.mediaProfile?.preferredFormats
}
```

## Zusammenfassung der korrekten Datenquellen:

## ⚠️ WICHTIG: FEHLERTOLERANZ IST NICHT 0%!

**Verifizierte Felder (100% sicher in CRM):**
1. ✅ **Name**: `contact.displayName` - EXISTIERT
2. ✅ **Position**: `contact.position` - EXISTIERT
3. ✅ **Company Name**: `contact.companyName` - EXISTIERT
4. ✅ **Emails**: `contact.emails[]` - EXISTIERT
5. ✅ **Phones**: `contact.phones` - EXISTIERT (als PhoneNumber[])
6. ✅ **Media Profile**: `contact.mediaProfile` - EXISTIERT
7. ✅ **Beats/Topics**: `contact.mediaProfile?.beats` - EXISTIERT
8. ✅ **Media Types**: `contact.mediaProfile?.mediaTypes` - EXISTIERT
9. ✅ **Publication IDs**: `contact.mediaProfile?.publicationIds` - EXISTIERT
10. ✅ **Social Profiles**: `contact.socialProfiles` - EXISTIERT
11. ✅ **Influence Score**: `contact.mediaProfile?.influence?.score` - EXISTIERT

**PROBLEMATISCHE Felder (NICHT 100% verifiziert):**
1. ❌ **`contact.company?.type`** - ContactEnhanced hat KEIN company-Objekt!
   - Nur `companyId` und `companyName` (denormalisiert)
   - Company Type muss über separaten Company-Lookup erfolgen

2. ❌ **`contact.globalMetadata?.qualityScore`** - NICHT gefunden in CRM-Typen!
   - Feld existiert NICHT in ContactEnhanced-Interface
   - Aktuell wird im Code verwendet, aber ist wahrscheinlich undefined

3. ❌ **`contact.globalMetadata?.verificationStatus`** - NICHT gefunden!
   - globalMetadata existiert NICHT in ContactEnhanced

4. ❌ **`contact.topics`** - NICHT gefunden in ContactEnhanced!
   - Nur `mediaProfile.beats` existiert

**KORREKTE Zuordnungen:**
1. **Company Type**:
   ```typescript
   // FALSCH: contact.company?.type (existiert nicht)
   // RICHTIG: Separater Lookup erforderlich
   const company = await companiesService.getById(contact.companyId);
   const companyType = company?.type || 'other';
   ```

2. **Quality Score**:
   ```typescript
   // FALSCH: contact.globalMetadata?.qualityScore (existiert nicht)
   // RICHTIG: Muss berechnet werden oder aus anderem Feld
   const score = calculateQualityScore(contact); // Selbst berechnen
   // ODER: Prüfe ob anderes Feld existiert
   ```

3. **Verification Status**:
   ```typescript
   // FALSCH: contact.globalMetadata?.verificationStatus (existiert nicht)
   // RICHTIG: Aus Social Profiles ableiten
   const isVerified = contact.socialProfiles?.some(p => p.verified === true) || false;
   ```

4. **Topics/Beats**:
   ```typescript
   // FALSCH: contact.topics (existiert nicht)
   // RICHTIG: Nur mediaProfile.beats
   const topics = contact.mediaProfile?.beats || [];
   ```

**FAZIT: Mehrere kritische Annahmen waren FALSCH!**
- `globalMetadata` existiert NICHT in ContactEnhanced
- `company` ist KEIN Objekt, sondern nur IDs/Names
- `topics` existiert NICHT direkt am Contact

**Echte Fehlertoleranz: ~30% der Zuordnungen waren Annahmen ohne Verifikation!**

## 7. Saubere Editor → CRM/Publications Mapping-Tabelle

| **Editor-Wert** | **CRM/Publications-Feld** | **Status** | **Typ** |
|------------------|----------------------------|------------|---------|
| **Journalist Name** | `contact.displayName` | ✅ EXISTIERT | string |
| **Position** | `contact.position` | ✅ EXISTIERT | string? |
| **Company Name** | `contact.companyName` | ✅ EXISTIERT | string? |
| **Company Type** | `companies.find(c => c.id === contact.companyId)?.type` | ⚠️ LOOKUP | CompanyType |
| **Company Type Label** | `companyTypeLabels[companyType]` | ✅ EXISTIERT | string |
| **Primary Email** | `contact.emails?.find(e => e.isPrimary)?.email` | ✅ EXISTIERT | string |
| **Primary Phone** | `contact.phones?.[0]?.number` | ✅ EXISTIERT | string |
| **Topics/Beats** | `contact.mediaProfile?.beats` | ✅ EXISTIERT | string[]? |
| **Media Types** | `contact.mediaProfile?.mediaTypes` | ✅ EXISTIERT | MediaType[]? |
| **Publication IDs** | `contact.mediaProfile?.publicationIds` | ✅ EXISTIERT | string[]? |
| **Publications Data** | `publications.filter(p => publicationIds.includes(p.id))` | ⚠️ LOOKUP | Publication[] |
| **Publication Title** | `publication.title` | ✅ EXISTIERT | string |
| **Publication Type** | `publication.type` | ✅ EXISTIERT | PublicationType |
| **Social Followers** | `contact.socialProfiles?.reduce((sum, p) => sum + (p.followers || 0), 0)` | ⚠️ BERECHNET | number |
| **Influence Score** | `contact.mediaProfile?.influence?.score` | ✅ EXISTIERT | number? |
| **Verification Status** | `contact.socialProfiles?.some(p => p.verified === true)` | ⚠️ BERECHNET | boolean |
| **Quality Score** | **❌ NICHT VORHANDEN - MUSS BERECHNET WERDEN** | ❌ FEHLT | number |
| **Languages** | `contact.personalInfo?.languages` | ✅ EXISTIERT | LanguageCode[]? |
| **Website** | `contact.website` | ✅ EXISTIERT | string? |
| **Submission Guidelines** | `contact.mediaProfile?.submissionGuidelines` | ✅ EXISTIERT | string? |
| **Preferred Formats** | `contact.mediaProfile?.preferredFormats` | ✅ EXISTIERT | string[]? |
| **Deadlines** | `contact.mediaProfile?.deadlines` | ✅ EXISTIERT | object? |

## 7.1 Berechnete/Abgeleitete Werte

| **Editor-Wert** | **Berechnungslogik** | **Fallback** |
|------------------|---------------------|--------------|
| **Quality Score** | `calculateScore(contact)` basierend auf Vollständigkeit | `null` |
| **Total Followers** | `socialProfiles.reduce((sum, p) => sum + p.followers, 0)` | `0` |
| **Is Verified** | `socialProfiles.some(p => p.verified === true)` | `false` |
| **Company Type** | `companies.find(c => c.id === companyId)?.type` | `'other'` |
| **Is Freelance** | `!contact.companyId` | `false` |

## 7.2 Lookup-Services benötigt

| **Datenquelle** | **Service** | **Funktion** |
|-----------------|-------------|--------------|
| **Company Data** | `companiesService` | `getById(companyId)` |
| **Publications** | `publicationsService` | `getByIds(publicationIds)` |
| **Media Types Labels** | `MEDIA_TYPES` | Konstante aus crm-enhanced.ts |
| **Company Type Labels** | `companyTypeLabels` | Konstante aus crm-enhanced.ts |

## 7.3 Quality Score Berechnung

```typescript
function calculateQualityScore(contact: ContactEnhanced): number {
  let score = 0;

  // Basis-Kontaktdaten (40 Punkte)
  if (contact.emails?.length) score += 15;
  if (contact.phones?.length) score += 10;
  if (contact.displayName) score += 10;
  if (contact.position) score += 5;

  // Unternehmensdaten (20 Punkte)
  if (contact.companyId) score += 10;
  if (contact.companyName) score += 10;

  // Media Profile (40 Punkte)
  if (contact.mediaProfile?.beats?.length) score += 15;
  if (contact.mediaProfile?.mediaTypes?.length) score += 10;
  if (contact.mediaProfile?.publicationIds?.length) score += 10;
  if (contact.socialProfiles?.length) score += 5;

  return Math.min(score, 100); // Max 100
}
```

## ⚠️ LÜCKEN GEFUNDEN! Fehlende Editor-Werte in der Mapping-Tabelle:

| **Editor-Wert (Gefunden im Code)** | **CRM/Publications-Feld** | **Status** |
|-------------------------------------|----------------------------|------------|
| **First Name** | `contact.name?.firstName` | ✅ EXISTIERT |
| **Last Name** | `contact.name?.lastName` | ✅ EXISTIERT |
| **Name Konstruktion** | `contact.name?.firstName + ' ' + contact.name?.lastName` | ✅ EXISTIERT |
| **Has Phone (Boolean)** | `contact.phones && contact.phones.length > 0` | ⚠️ BERECHNET |
| **Primary Phone** | `contact.phones?.find(p => p.isPrimary)?.number` | ✅ EXISTIERT |
| **Publication Assignments** | `contact.mediaProfile?.publicationIds` → lookup | ⚠️ LOOKUP |
| **Publication Assignment Role** | **❌ NICHT VERFÜGBAR in CRM** | ❌ FEHLT |
| **Publication Global ID** | `publication.id` | ✅ EXISTIERT |
| **Media Types Array** | `contact.mediaProfile?.mediaTypes` | ✅ EXISTIERT |
| **Topics Length** | `contact.mediaProfile?.beats?.length` | ⚠️ BERECHNET |
| **Verification Status Enum** | `contact.socialProfiles?.some(p => p.verified) ? 'verified' : 'unverified'` | ⚠️ BERECHNET |
| **Can Import (Boolean)** | Subscription-basiert (nicht CRM) | ❌ NICHT CRM |
| **Import Config** | UI-State (nicht CRM) | ❌ NICHT CRM |
| **Duplicate Warning** | Aktuell `Math.random()` | ❌ MOCK |

## 8. Zusätzliche Lücken-Analyse

### 8.1 Struktur-Unterschiede: Editor vs CRM

**Editor-Struktur erwartet:**
```typescript
{
  personalData: {
    name: { first, last },
    displayName,
    emails: [{ isPrimary, email }],
    phones: [{ isPrimary, number }]
  },
  professionalData: {
    employment: {
      company: { name, type },
      position
    },
    expertise: { primaryTopics },
    mediaTypes,
    publicationAssignments: [{ publication, role }]
  },
  metadata: {
    verification: { status },
    dataQuality: { overallScore }
  },
  socialMedia: {
    influence: { totalFollowers }
  }
}
```

**CRM hat aber:**
```typescript
{
  displayName,
  name: { firstName, lastName },
  emails: [{ isPrimary, email }],
  phones: [{ isPrimary, number }],
  position,
  companyId,
  companyName,
  mediaProfile: {
    beats,
    mediaTypes,
    publicationIds, // Nicht publicationAssignments!
    influence: { score }
  },
  socialProfiles: [{ verified }]
}
```

### 8.2 Kritische Mapping-Probleme

1. **Publication Assignments vs Publication IDs:**
   - Editor erwartet: `[{ publication: {...}, role: "reporter" }]`
   - CRM hat nur: `["pub1", "pub2", "pub3"]`
   - **Role-Information fehlt komplett!**

2. **Nested Company Object:**
   - Editor erwartet: `employment.company.type`
   - CRM hat nur: `companyId` + separates Company-Objekt

3. **Verification Status Enum:**
   - Editor erwartet: `'verified' | 'pending' | 'unverified'`
   - CRM hat nur: `socialProfiles[].verified: boolean`

4. **Quality Score:**
   - Editor erwartet: `metadata.dataQuality.overallScore`
   - CRM hat: **NICHTS** - muss komplett berechnet werden

### 8.3 Vollständige Lücken-Liste

**Fehlende CRM-Felder (müssen implementiert/berechnet werden):**
1. ❌ **Publication Assignment Roles** - Journalist-Rolle bei Publication
2. ❌ **Quality Score** - Vollständigkeitsbewertung
3. ❌ **Verification Status Enum** - Nur boolean verfügbar
4. ❌ **Social Media Total Followers** - Muss summiert werden
5. ❌ **Duplicate Detection Logic** - Aktuell Random-Mock

**Struktur-Diskrepanzen (Konvertierung nötig):**
1. ⚠️ **Company Type** - Separater Lookup erforderlich
2. ⚠️ **Publications Data** - IDs zu Objekten auflösen
3. ⚠️ **Name Construction** - firstName + lastName kombinieren