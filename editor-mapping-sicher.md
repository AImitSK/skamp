# Editor → CRM/Publications Mapping (100% Sicher)

## Tabelle 1: Direkt verfügbare Werte (ContactEnhanced)

| **Editor-Wert** | **CRM-Feld** |
|------------------|--------------|
| Journalist Name | `contact.displayName` |
| Position | `contact.position` |
| Company Name | `contact.companyName` |
| Primary Email | `contact.emails?.find(e => e.isPrimary)?.email` |
| All Emails | `contact.emails` |
| Primary Phone | `contact.phones?.[0]?.number` |
| All Phones | `contact.phones` |
| First Name | `contact.name?.firstName` |
| Last Name | `contact.name?.lastName` |
| Website | `contact.website` |
| Company ID | `contact.companyId` |

## Tabelle 2: Media Profile Werte (ContactEnhanced.mediaProfile)

| **Editor-Wert** | **CRM-Feld** |
|------------------|--------------|
| Topics/Beats | `contact.mediaProfile?.beats` |
| Media Types | `contact.mediaProfile?.mediaTypes` |
| Publication IDs | `contact.mediaProfile?.publicationIds` |
| Influence Score | `contact.mediaProfile?.influence?.score` |
| Influence Reach | `contact.mediaProfile?.influence?.reach` |
| Influence Engagement | `contact.mediaProfile?.influence?.engagement` |
| Submission Guidelines | `contact.mediaProfile?.submissionGuidelines` |
| Preferred Topics | `contact.mediaProfile?.preferredTopics` |
| Excluded Topics | `contact.mediaProfile?.excludedTopics` |
| Preferred Formats | `contact.mediaProfile?.preferredFormats` |
| Deadlines | `contact.mediaProfile?.deadlines` |
| Is Journalist | `contact.mediaProfile?.isJournalist` |

## Tabelle 3: Social Media Werte (ContactEnhanced.socialProfiles)

| **Editor-Wert** | **CRM-Feld** |
|------------------|--------------|
| Social Profiles | `contact.socialProfiles` |
| Social Platform | `contact.socialProfiles?.[i]?.platform` |
| Social URL | `contact.socialProfiles?.[i]?.url` |
| Social Handle | `contact.socialProfiles?.[i]?.handle` |
| Social Verified | `contact.socialProfiles?.[i]?.verified` |

## Tabelle 4: Zusätzliche gefundene Werte

| **Editor-Wert** | **CRM-Feld** |
|------------------|--------------|
| Company Type Label | `companyTypeLabels[company.type]` |
| Biography | `contact.professionalInfo?.biography` |
| Languages | `contact.personalInfo?.languages` |
| Personal Notes | `contact.personalInfo?.notes` |

## Tabelle 5: Publication Data/Objects (gefunden auf Kontakt-Detailseite)

| **Editor-Wert** | **CRM-Feld** |
|------------------|--------------|
| Publication Title | `publication.title` |
| Publication Subtitle | `publication.subtitle` |
| Publication Type | `publication.type` |
| Publication Format | `publication.format` |
| Publication Frequency | `publication.metrics?.frequency` |
| Publication Focus Areas | `publication.focusAreas` |
| Publication Verified Status | `publication.verified` |
| Publication ID | `publication.id` |

**Lookup-Logik:**
```typescript
// 1. Contact hat Publication IDs
const publicationIds = contact.mediaProfile?.publicationIds || []

// 2. Publications werden geladen über Service
const allPublications = await publicationService.getAll(organizationId)
const contactPublications = allPublications.filter(pub =>
  publicationIds.includes(pub.id!)
)
```

## Tabelle 6: Quality Score (aus Masterplan definiert)

| **Editor-Wert** | **Masterplan Definition** | **Berechnung** |
|------------------|---------------------------|----------------|
| Quality Score | `overallScore: number (0-100)` | Basiert auf Vollständigkeit, Genauigkeit, Aktualität |
| Completeness | `completeness: number` | Anteil ausgefüllter Felder |
| Accuracy | `accuracy: number` | Validierte vs. unvalidierte Daten |
| Last Updated | `lastUpdated: timestamp` | Zeitpunkt der letzten Aktualisierung |

**Quality Score Komponenten laut Masterplan:**
- **Anzahl bestätigender Quellen** (min. 3)
- **Konsistenz der Daten** (Name, E-Mail, Medium)
- **Vollständigkeit des Profils**
- **Verifikations-Status**

**Masterplan-Struktur:**
```typescript
metadata: {
  dataQuality: {
    overallScore: number (0-100)
    completeness: number
    accuracy: number
    lastUpdated: timestamp
  }
}
```

## Tabelle 7: Publication Assignments with Roles (UI-Konstrukt)

| **Editor-Wert** | **Herkunft/Konstruktion** |
|------------------|----------------------------|
| Assignment Role | `roleTranslations[assignment.role]` |
| Role Options | `'editor' → 'Chefredakteur'`, `'reporter' → 'Reporter'`, `'columnist' → 'Kolumnist'` |
| Is Main Publication | `assignment.isMainPublication` |
| Contribution Frequency | `frequencyTranslations[assignment.contributionFrequency]` |

**Problem:** Publication Assignments sind ein **UI-Konstrukt** des Editors, existieren aber **NICHT** in CRM!

**CRM hat nur:** `contact.mediaProfile?.publicationIds: string[]`
**Editor erwartet:** `publicationAssignments: [{ publication, role, isMainPublication }]`

## Tabelle 8: Duplicate Warning (Mock-Code)

| **Editor-Wert** | **Aktuelle Implementierung** | **Status** |
|------------------|-------------------------------|------------|
| Duplicate Warning | `setDuplicateWarning(Math.random() > 0.7)` | ❌ MOCK/RANDOM |
| Duplicate Check Logic | **FEHLT KOMPLETT** | ❌ NICHT IMPLEMENTIERT |

**Problem:** Duplicate Warning ist **reiner Mock-Code** mit 30% Zufalls-Wahrscheinlichkeit!

## ❌ FELDER DIE IMPLEMENTIERT/GEFIXT WERDEN MÜSSEN:

**Publication Assignments:**
- Mapping von `publicationIds[]` zu Assignment-Objekten mit Default-Roles
- Role-System implementieren (aktuell nur UI-Mock)

**Duplicate Warning:**
- Echte Duplicate-Detection basierend auf Email/Name
- Random-Mock entfernen

## ❌ FELDER DIE ENTFERNT WERDEN MÜSSEN:

- **Verification Status** - Existiert NICHT für Kontakte, nur für Publikationen!
- **Total Followers** - Wird nicht erfasst, muss aus Editor entfernt werden!

## 🎯 NÄCHSTE SCHRITTE:

1. **Aus Editor-Seite entfernen:**
   - Verification Status Badges und Logic
   - Total Followers Display und Berechnung
   - Publication Assignment Roles (vereinfachen zu nur Publication-Liste)
   - Random Duplicate Warning

2. **TODOs im Code hinzufügen:**
   - `// TODO: Implement real duplicate detection logic`
   - `// TODO: Add role system for publication assignments`
   - `// TODO: Implement quality score calculation`
   - `// TODO: Add real verification system for publications only`

## Gefundener Wert aus CRM:

**Badge unter Company Name**: `companyTypeLabels[company.type]`
- **CRM-Feld**: `company.type` (CompanyType enum)
- **Label-Lookup**: `companyTypeLabels` aus `/types/crm.ts`
- **Anzeige**: Badge mit grauer Farbe (`color="zinc"`)