# Journalist Detail Modal - Feldanalyse

## Übersicht
Dieses Dokument analysiert alle Felder im Journalist Detail-Modal (`/dashboard/library/editors`) und prüft, ob sie aus echten Datenquellen kommen oder Mock-Daten sind.

## Datenquellen

Das Modal zeigt Daten aus **zwei verschiedenen Quellen**:

1. **ContactEnhanced** (normales CRM) - Zeile `c:\Users\StefanKühne\Desktop\Projekte\skamp\src\types\crm-enhanced.ts`
2. **JournalistDatabaseEntry** (Premium-Feature) - Zeile `c:\Users\StefanKühne\Desktop\Projekte\skamp\src\types\journalist-database.ts`

---

## 1. Basis-Informationen (Header)

### ✅ Name
- **Modal-Quelle**: `journalist.personalData.name` / `displayName`
- **CRM-Feld**: `contact.displayName` ✅
- **Status**: VERFÜGBAR aus CRM

### ✅ Position
- **Modal-Quelle**: `journalist.professionalData.employment.position`
- **CRM-Feld**: `contact.position` ✅
- **Status**: VERFÜGBAR aus CRM

### ✅ Score
- **Modal-Quelle**: `journalist.metadata.dataQuality.overallScore`
- **Berechnung**: `calculateQualityScore(contact)`
- **Status**: BERECHNET (funktioniert mit CRM-Daten)

---

## 2. Kontaktinformationen Section

### ✅ E-Mail
- **Modal-Quelle**: `journalist.personalData.emails[]`
- **CRM-Feld**: `contact.emails[]` ✅
- **Status**: VERFÜGBAR aus CRM

### ✅ Telefon
- **Modal-Quelle**: `journalist.personalData.phones[]`
- **CRM-Feld**: `contact.phones[]` ✅
- **Status**: VERFÜGBAR aus CRM

---

## 3. Position Section

### ✅ Position
- **Modal-Quelle**: `journalist.professionalData.employment.position`
- **CRM-Feld**: `contact.position` ✅
- **Status**: VERFÜGBAR aus CRM

### ✅ Abteilung
- **Modal-Quelle**: `journalist.professionalData.employment.department`
- **CRM-Feld**: `contact.department` ✅
- **Status**: VERFÜGBAR aus CRM

### ⚠️ "Seit:" Datum
- **Modal-Quelle**: `journalist.professionalData.employment.startDate`
- **Database-Type**: `JournalistDatabaseEntry.professionalData.employment.startDate` (Zeile 104) ✅
- **CRM-Feld**: Nicht vorhanden in ContactEnhanced
- **Status**: **NUR in Premium-Database verfügbar** - nicht aus normalem CRM

---

## 4. Company/Medienhaus Section

### ✅ Company Name
- **Modal-Quelle**: `journalist.professionalData.employment.company.name`
- **CRM-Feld**: `contact.companyName` ✅ / `company.name` ✅
- **Status**: VERFÜGBAR aus CRM

### ✅ Company Type
- **Modal-Quelle**: `journalist.professionalData.employment.company.type`
- **CRM-Feld**: `company.type` ✅
- **Status**: VERFÜGBAR aus CRM

### ✅ Company Website
- **Modal-Quelle**: `journalist.professionalData.employment.company.website`
- **CRM-Feld**: `company.website` ✅
- **Status**: VERFÜGBAR aus CRM

### ⚠️ Zielgruppe (Company)
- **Modal-Quelle**: `journalist.professionalData.employment.company.mediaInfo.targetAudience`
- **Database-Type**: `JournalistDatabaseEntry.professionalData.employment.company.mediaInfo.targetAudience` (Zeile 86) ✅
- **CRM-Feld**: Nicht vorhanden in CompanyEnhanced
- **Hinweis**: Es gibt `publication.metrics.targetAudience` ✅ - aber NICHT `company.mediaInfo.targetAudience`
- **Status**: **NUR in Database** - Company hat kein targetAudience Feld im normalen CRM

### ⚠️ Reichweite
- **Modal-Quelle**: `journalist.professionalData.employment.company.mediaInfo.reach`
- **Database-Type**: `JournalistDatabaseEntry.professionalData.employment.company.mediaInfo.reach` (Zeile 87) ✅
- **CRM-Feld**: Nicht vorhanden in CompanyEnhanced
- **Status**: **NUR in Premium-Database verfügbar** - nicht aus normalem CRM

---

## 5. Publikationen Section

### ✅ Publication Title
- **Modal-Quelle**: `assignment.publication.title`
- **CRM-Feld**: `publication.title` ✅
- **Status**: VERFÜGBAR aus CRM

### ✅ Publication Type
- **Modal-Quelle**: `assignment.publication.type`
- **CRM-Feld**: `publication.type` ✅
- **Status**: VERFÜGBAR aus CRM

### ✅ Publication Format
- **Modal-Quelle**: `assignment.publication.format`
- **Database-Type**: `JournalistDatabaseEntry.professionalData.publicationAssignments[].publication.format` (Zeile 115) ✅
- **CRM-Feld**: `publication.format` ✅ (library.ts Zeile 64)
- **Status**: **VERFÜGBAR** - existiert in Publication Type!

### ✅ Role / Position
- **Modal-Quelle**: `assignment.role`
- **Database-Type**: `JournalistDatabaseEntry.professionalData.publicationAssignments[].role` (Zeile 130) ✅
- **CRM-Feld**: Kann aus `contact.position` abgeleitet werden
- **Status**: VERFÜGBAR (mit Fallback)

### ⚠️ Häufigkeit (Contribution Frequency)
- **Modal-Quelle**: `assignment.contributionFrequency`
- **Database-Type**: `JournalistDatabaseEntry.professionalData.publicationAssignments[].contributionFrequency` (Zeile 133) ✅
- **CRM-Feld**: Nicht vorhanden in ContactEnhanced
- **Status**: **NUR in Premium-Database verfügbar** - nicht aus normalem CRM

### ✅ Erscheinung (Publication Frequency)
- **Modal-Quelle**: `assignment.publication.frequency`
- **Database-Type**: `JournalistDatabaseEntry.professionalData.publicationAssignments[].publication.frequency` (Zeile 116) ✅
- **CRM-Feld**: `publication.metrics.frequency` ✅ (library.ts Zeile 68)
- **Status**: **VERFÜGBAR** - existiert in Publication Type!

### ⚠️ Themen für diese Publikation
- **Modal-Quelle**: `assignment.topics[]`
- **Database-Type**: `JournalistDatabaseEntry.professionalData.publicationAssignments[].topics` (Zeile 131) ✅
- **CRM-Feld**: Nicht vorhanden in ContactEnhanced
- **Status**: **NUR in Premium-Database verfügbar** - nicht aus normalem CRM

### ✅ Haupt-Publikation
- **Modal-Quelle**: `assignment.isMainPublication`
- **Status**: BERECHNET im Code

---

## 6. Themen Section

### ✅ Primäre Themen
- **Modal-Quelle**: `journalist.professionalData.expertise.primaryTopics`
- **CRM-Feld**: `contact.mediaProfile.beats[]` ✅
- **Status**: VERFÜGBAR aus CRM

---

## 7. Social Media Section

### ✅ Social Media Profiles
- **Modal-Quelle**: `journalist.socialMedia.profiles[]`
- **CRM-Feld**: `contact.socialProfiles[]` ✅
- **Status**: VERFÜGBAR aus CRM

---

## 8. Medientypen Section

### ✅ Media Types
- **Modal-Quelle**: `journalist.professionalData.mediaTypes[]`
- **CRM-Feld**: `contact.mediaProfile.mediaTypes[]` ✅
- **Status**: VERFÜGBAR aus CRM

---

## Zusammenfassung

### ✅ FELDER AUS NORMALEM CRM (ContactEnhanced/CompanyEnhanced):
1. Name (`displayName`)
2. Position (`position`)
3. Abteilung (`department`)
4. Quality Score (berechnet)
5. E-Mails (`emails[]`)
6. Telefonnummern (`phones[]`)
7. Company Name (`companyName`)
8. Company Type (`company.type`)
9. Company Website (`company.website`)
10. Publication Title, Type, Format, Frequency
11. Themen / Beats (`mediaProfile.beats[]`)
12. Social Media Profiles (`socialProfiles[]`)
13. Media Types (`mediaProfile.mediaTypes[]`)

### ⚠️ FELDER NUR IN PREMIUM JOURNALIST-DATABASE:
Diese Felder existieren im `JournalistDatabaseEntry` Type, sind aber NICHT in normalen CRM-Kontakten/Publications verfügbar:

1. **"Seit:" Datum** (`employment.startDate`) - nur Database
2. **Company Zielgruppe** (`company.mediaInfo.targetAudience`) - nur Database (Publication hat targetAudience, aber nicht Company!)
3. **Company Reichweite** (`company.mediaInfo.reach`) - nur Database
4. **Häufigkeit** (`assignment.contributionFrequency`) - nur Database (ist pro Assignment, nicht Publication-Metrik!)
5. **Themen pro Publikation** (`assignment.topics[]`) - nur Database (sind Assignment-spezifische Topics, nicht die Hauptthemen!)

### ❌ KEINE MOCK-DATEN GEFUNDEN
Alle angezeigten Felder sind entweder:
- Aus dem normalen CRM verfügbar, ODER
- Aus der Premium Journalist-Database verfügbar

---

## Wichtige Erkenntnis: Assignment-Struktur

**Das Haupt-Problem:**
Die `JournalistDatabaseEntry` hat eine spezielle `publicationAssignments[]` Struktur:

```typescript
publicationAssignments: Array<{
  publication: { ... },
  role: 'editor' | 'reporter' | ...,
  topics: string[],               // ⚠️ NUR in Database!
  contributionFrequency: ...,     // ⚠️ NUR in Database!
  isMainPublication: boolean
}>
```

Im **normalen CRM** haben wir nur:
- `contact.mediaProfile.publicationIds: string[]` (einfache IDs)
- Separate `Publication` Objekte mit `metrics.frequency` ✅

Die **Assignment-Struktur** mit role, topics und contributionFrequency gibt es NUR in der Database!

---

## Empfehlung

**Problem:**
Das Modal zeigt Felder an, die nur in der Premium Journalist-Database existieren. Wenn ein Journalist aus dem normalen CRM kommt (kein Import aus Database), sind diese Felder leer oder undefined.

**Lösung-Optionen:**

1. **Option A: Felder ausblenden wenn nicht verfügbar**
   - Zeige nur Felder an, die tatsächlich Daten haben
   - Verwende `{field && (...)}` Conditional Rendering

2. **Option B: Felder als "Nicht verfügbar" markieren**
   - Zeige alle Felder, aber mit Platzhalter wenn leer
   - z.B. "Nicht verfügbar" oder "Nur in Premium-Database"

3. **Option C: Felder komplett entfernen**
   - Entferne alle Database-only Felder aus dem Modal
   - Zeige nur CRM-Felder an

**Betroffene Code-Zeilen (page.tsx):**
- Zeilen 1937-1939: `employment.startDate`
- Zeilen 1979-1982: `company.mediaInfo.targetAudience`
- Zeilen 1984-1987: `company.mediaInfo.reach`
- Zeilen 2034-2036: `assignment.contributionFrequency`
- Zeilen 2045-2063: `assignment.topics[]`

**Publication-Felder BEHALTEN (sind verfügbar):**
- Zeile 2019: `publication.format` ✅
- Zeile 2039: `publication.frequency` ✅
