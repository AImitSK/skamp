# Matching-Kandidaten für Premium-Datenbank

## 📋 Übersicht

**Ziel:** Automatisch hochwertige Journalisten-Kontakte identifizieren, die von mehreren Organisationen unabhängig erfasst wurden, und diese nach manuellem Review in die globale Premium-Datenbank aufnehmen.

**Kern-Idee:** Wenn 2+ Organisationen denselben Journalisten in ihr CRM eingeben, ist das ein starker Qualitäts-Indikator (Crowd-Sourcing).

---

## 🎯 MVP-Scope (Phase 1)

### Was wird implementiert:
- ✅ Automatisches Matching von Kontakten über Organisationen hinweg
- ✅ SuperAdmin Review-Dashboard für Matching-Kandidaten
- ✅ Direkter Import ins SuperAdmin CRM (nutzt bestehende Infrastruktur)
- ✅ Automatische Globalisierung durch `autoGlobalMode`

### Was wird NICHT implementiert (später):
- ❌ Automatisches Firma/Publikation-Matching
- ❌ Komplexes Daten-Merging
- ❌ Duplikat-Erkennung für existierende globale Kontakte

**Begründung:** Start simple. Firma/Publikation-Zuordnung erfolgt manuell durch SuperAdmin beim Import (wie gewohnt im CRM).

---

## 🔍 Matching-Logik

### Primär-Kriterium: Match über Organisationen
```
Ein Kandidat entsteht, wenn:
├── Mindestens 2 verschiedene Organisationen
├── Einen ähnlichen Kontakt haben
└── Dieser ist noch nicht global (kein Reference)
```

### Match-Key Generierung
```typescript
function generateMatchKey(contact: ContactEnhanced): string {
  // Strategie 1: E-Mail (bevorzugt)
  if (contact.emails?.[0]?.email) {
    return contact.emails[0].email.toLowerCase().trim();
  }

  // Strategie 2: Name normalisiert (Fallback)
  const fullName = `${contact.name.firstName} ${contact.name.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return fullName;
}
```

### Scoring-System (0-100 Punkte)
```
Basis-Score:
├── +50: 2 Organisationen haben den Kontakt
├── +25: 3+ Organisationen haben den Kontakt (Bonus)
└── +10: 4+ Organisationen haben den Kontakt (Extra-Bonus)

Qualitäts-Score:
├── +10: Vollständiges Journalist-Profil (mediaProfile vorhanden)
├── +10: E-Mail mit verifizierter Domain (@spiegel.de, @zeit.de, etc.)
├── +5: Telefonnummer vorhanden
└── +5: Beats/Ressorts definiert

Maximaler Score: 100 Punkte
Empfohlener Mindest-Score: 60 Punkte
```

---

## 📊 Datenstruktur

### Collection: `matching_candidates`

```typescript
interface MatchingCandidate {
  id: string; // Auto-generated

  // Match-Information
  matchKey: string; // E-Mail oder normalisierter Name
  matchType: 'email' | 'name'; // Wie wurde gematched
  score: number; // 0-100

  // Gefundene Varianten (2+)
  variants: Array<{
    organizationId: string;
    organizationName: string; // Cache für UI
    contactId: string;

    // Kontakt-Daten (snapshot)
    contactData: {
      name: {
        firstName: string;
        lastName: string;
      };
      displayName: string;
      emails: Array<{ email: string; type: string; isPrimary: boolean }>;
      phones?: Array<{ number: string; type: string; isPrimary: boolean }>;
      position?: string;
      companyName?: string;
      companyId?: string;

      // Media-Profil Info
      hasMediaProfile: boolean;
      beats?: string[];
      publications?: string[]; // Namen der Publikationen
    };

    // Verwendungs-Statistik
    usageStats?: {
      lastUsedInCampaign?: Timestamp;
      campaignCount?: number;
      isActive: boolean; // Wurde in den letzten 90 Tagen verwendet
    };
  }>;

  // Review-Status
  status: 'pending' | 'imported' | 'skipped' | 'rejected';

  // Import-Info (wenn imported)
  importedGlobalContactId?: string; // ID des globalen Kontakts
  importedAt?: Timestamp;

  // Review-Info
  reviewedBy?: string; // User ID des SuperAdmin
  reviewedAt?: Timestamp;
  reviewNotes?: string;

  // Meta
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Scan-Info
  scanJobId?: string; // ID des Scan-Jobs der diesen Kandidaten erstellt hat
  lastScannedAt?: Timestamp;
}
```

### Collection: `matching_scan_jobs`

```typescript
interface MatchingScanJob {
  id: string;

  status: 'running' | 'completed' | 'failed';

  // Statistik
  stats: {
    organizationsScanned: number;
    contactsScanned: number;
    candidatesCreated: number;
    candidatesUpdated: number;
    errors: number;
  };

  // Timing
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number; // Millisekunden

  // Fehler
  error?: string;
  errorDetails?: any;

  // Meta
  triggeredBy?: string; // 'auto' oder User ID
  createdAt: Timestamp;
}
```

---

## 🛠️ Services

### `matching-candidates-service.ts`

```typescript
export const matchingCandidatesService = {

  /**
   * Haupt-Scan: Findet Matching-Kandidaten
   * Sollte täglich automatisch laufen (Cloud Function)
   */
  async scanForCandidates(options?: {
    organizationIds?: string[]; // Nur bestimmte Orgs scannen
    minScore?: number; // Standard: 60
    forceRescan?: boolean; // Auch bestehende Kandidaten neu bewerten
  }): Promise<MatchingScanJob>

  /**
   * Berechnet Score für einen potenziellen Kandidaten
   */
  scoreCandidate(variants: CandidateVariant[]): number

  /**
   * Lädt alle Kandidaten (mit Filtern)
   */
  async getCandidates(filters?: {
    status?: MatchingCandidate['status'][];
    minScore?: number;
    limit?: number;
    offset?: number;
  }): Promise<MatchingCandidate[]>

  /**
   * Lädt einen einzelnen Kandidaten mit Details
   */
  async getCandidateById(candidateId: string): Promise<MatchingCandidate | null>

  /**
   * Markiert Kandidaten als "imported"
   * Wird automatisch aufgerufen wenn SuperAdmin den Kontakt ins CRM importiert
   */
  async markAsImported(
    candidateId: string,
    globalContactId: string,
    userId: string
  ): Promise<void>

  /**
   * Markiert Kandidaten als "skipped"
   */
  async skipCandidate(
    candidateId: string,
    userId: string,
    reason?: string
  ): Promise<void>

  /**
   * Markiert Kandidaten als "rejected"
   */
  async rejectCandidate(
    candidateId: string,
    userId: string,
    reason: string
  ): Promise<void>

  /**
   * Löscht Kandidat permanent
   */
  async deleteCandidate(candidateId: string): Promise<void>

  /**
   * Analytics: Statistiken für Dashboard
   */
  async getAnalytics(): Promise<{
    total: number;
    byStatus: Record<MatchingCandidate['status'], number>;
    topOrganizations: Array<{ orgId: string; orgName: string; count: number }>;
    averageScore: number;
    lastScanAt?: Timestamp;
  }>
}
```

### Scan-Logik (Pseudo-Code)

```typescript
async function scanForCandidates() {
  // 1. Erstelle Scan-Job
  const job = await createScanJob();

  try {
    // 2. Lade alle Organisationen (außer SuperAdmin)
    const organizations = await getOrganizations({
      excludeSuperAdmin: true
    });

    // 3. Lade alle Kontakte mit mediaProfile aus allen Orgs
    const allContacts: Map<string, ContactEnhanced[]> = new Map();

    for (const org of organizations) {
      const contacts = await contactsEnhancedService.getAll(org.id);

      // Filter: nur Journalisten (haben mediaProfile)
      const journalists = contacts.filter(c => c.mediaProfile);

      // Gruppiere nach matchKey
      for (const contact of journalists) {
        // Skip wenn bereits Reference
        if (contact.id?.startsWith('local-ref-')) continue;

        const matchKey = generateMatchKey(contact);

        if (!allContacts.has(matchKey)) {
          allContacts.set(matchKey, []);
        }

        allContacts.get(matchKey)!.push({
          ...contact,
          _organizationId: org.id,
          _organizationName: org.name
        });
      }
    }

    // 4. Erstelle Kandidaten für Matches mit 2+ Orgs
    let candidatesCreated = 0;
    let candidatesUpdated = 0;

    for (const [matchKey, contacts] of allContacts.entries()) {
      // Prüfe: mindestens 2 verschiedene Organisationen?
      const uniqueOrgs = new Set(contacts.map(c => c._organizationId));

      if (uniqueOrgs.size < 2) continue;

      // Berechne Score
      const score = scoreCandidate(contacts);

      if (score < 60) continue; // Mindest-Score

      // Erstelle/Update Kandidat
      const existingCandidate = await getCandidateByMatchKey(matchKey);

      if (existingCandidate) {
        await updateCandidate(existingCandidate.id, {
          variants: buildVariants(contacts),
          score,
          updatedAt: serverTimestamp(),
          lastScannedAt: serverTimestamp()
        });
        candidatesUpdated++;
      } else {
        await createCandidate({
          matchKey,
          matchType: matchKey.includes('@') ? 'email' : 'name',
          score,
          variants: buildVariants(contacts),
          status: 'pending',
          scanJobId: job.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastScannedAt: serverTimestamp()
        });
        candidatesCreated++;
      }
    }

    // 5. Job als completed markieren
    await updateScanJob(job.id, {
      status: 'completed',
      completedAt: serverTimestamp(),
      stats: {
        organizationsScanned: organizations.length,
        contactsScanned: totalContactsScanned,
        candidatesCreated,
        candidatesUpdated,
        errors: 0
      }
    });

  } catch (error) {
    await updateScanJob(job.id, {
      status: 'failed',
      error: error.message,
      completedAt: serverTimestamp()
    });
    throw error;
  }
}
```

---

## 🎨 UI-Komponenten

### 1. Route: `/super-admin/matching/candidates`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Matching-Kandidaten                    [Scan starten]    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Filter: [Alle Status ▼] [Min Score: 60]  [Suche...]         │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Name          │ Score │ Orgs │ Status   │ Aktionen   │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Max Müller    │  85   │  3   │ Pending  │ [Details]  │   │
│ │ @spiegel.de   │       │      │          │            │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Anna Schmidt  │  70   │  2   │ Pending  │ [Details]  │   │
│ │ @zeit.de      │       │      │          │            │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Peter Weber   │  65   │  2   │ Skipped  │ [Details]  │   │
│ │ @taz.de       │       │      │          │            │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ Zeige 1-20 von 156 Kandidaten            [1] 2 3 ... 8 >    │
└─────────────────────────────────────────────────────────────┘
```

**Komponenten:**
- `MatchingCandidatesList.tsx` - Hauptseite
- `CandidateTableRow.tsx` - Zeile in Tabelle
- `CandidateFilters.tsx` - Filter-Leiste
- `ScanButton.tsx` - Button zum manuellen Scan-Start

---

### 2. Modal: Kandidaten-Detail & Review

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 👤 Max Müller                             Score: 85 / 100   │
│                                          [✕ Schließen]       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 📊 Gefunden in 3 Organisationen:                             │
│                                                               │
│ ┌───────────────────────────────────────┐                   │
│ │ 🏢 Premium Media GmbH                 │ [Auswählen]       │
│ │ ✓ Maximilian Müller                   │                   │
│ │ 📧 m.mueller@spiegel.de               │                   │
│ │ 📞 +49 40 1234567                     │                   │
│ │ 🏢 Der Spiegel (Politikredakteur)    │                   │
│ │ 📌 Beats: Politik, Wirtschaft         │                   │
│ │ 📊 Verwendet in 3 Kampagnen           │                   │
│ └───────────────────────────────────────┘                   │
│                                                               │
│ ┌───────────────────────────────────────┐                   │
│ │ 🏢 StartUp PR AG                      │ [Auswählen]       │
│ │ ✓ Max Müller                          │                   │
│ │ 📧 mueller@spiegel.de                 │                   │
│ │ 🏢 Spiegel Verlag (Redakteur)         │                   │
│ │ 📊 Verwendet in 1 Kampagne            │                   │
│ └───────────────────────────────────────┘                   │
│                                                               │
│ ┌───────────────────────────────────────┐                   │
│ │ 🏢 Agency Communications Ltd          │ [Auswählen]       │
│ │ ✓ M. Müller                           │                   │
│ │ 📧 max.mueller@spiegel.de             │                   │
│ │ 📞 +49 40 9876543                     │                   │
│ │ 🏢 Axel Springer (Senior Journalist)  │                   │
│ └───────────────────────────────────────┘                   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💡 Empfehlung:                                          │ │
│ │ Basierend auf Vollständigkeit empfehlen wir Variante 1  │ │
│ │ (Premium Media GmbH) als Grundlage für den Import.     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📝 Notizen (optional):                                  │ │
│ │ ┌───────────────────────────────────────────────────┐   │ │
│ │ │                                                   │   │ │
│ │ └───────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│                    [✅ Als Premium importieren]              │
│                    [⏭️ Überspringen]                         │
│                    [❌ Ablehnen]                             │
└─────────────────────────────────────────────────────────────┘
```

**Komponenten:**
- `CandidateDetailModal.tsx` - Modal Container
- `CandidateVariantCard.tsx` - Einzelne Variante
- `CandidateRecommendation.tsx` - Empfehlungs-Box
- `CandidateReviewActions.tsx` - Aktions-Buttons

---

### 3. Import-Flow beim Klick auf "Als Premium importieren"

```
1. Modal schließt
2. Öffnet bestehendes CRM-Modal mit vorausgefüllten Daten:
   ├── Name, E-Mail, Telefon (von ausgewählter Variante)
   ├── Position, Beats
   ├── autoGlobalMode ist aktiv (SuperAdmin)
   └── SuperAdmin kann Daten noch anpassen

3. Nach Import:
   ├── Kontakt ist in global-journalists Collection
   ├── Kandidat wird als "imported" markiert
   ├── importedGlobalContactId wird gespeichert
   └── Success-Toast: "Kontakt erfolgreich als Premium importiert!"

4. Zurück zur Kandidaten-Liste
   ├── Kandidat verschwindet aus "Pending" Filter
   └── Ist jetzt in "Imported" sichtbar
```

---

### 4. Route: `/super-admin/matching/analytics`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Matching Analytics                                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │ 156          │ │ 23           │ │ 12           │         │
│ │ Pending      │ │ Imported     │ │ Skipped      │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📈 Import-Rate über Zeit                                │ │
│ │                                                         │ │
│ │      [Line Chart]                                       │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏆 Top Organisationen (meiste Kandidaten)               │ │
│ │                                                         │ │
│ │ 1. Premium Media GmbH         (45 Kandidaten)          │ │
│ │ 2. StartUp PR AG              (32 Kandidaten)          │ │
│ │ 3. Agency Communications      (28 Kandidaten)          │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 Score-Verteilung                                     │ │
│ │                                                         │ │
│ │      [Histogram Chart]                                  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ 🔄 Letzter Scan: Heute, 03:00 Uhr                           │
│ ⏱️ Durchschnittliche Scan-Dauer: 2.5 Minuten                │
└─────────────────────────────────────────────────────────────┘
```

**Komponenten:**
- `MatchingAnalyticsDashboard.tsx` - Hauptseite
- `AnalyticsStatsCards.tsx` - KPI-Karten
- `ImportRateChart.tsx` - Zeitverlaufs-Chart
- `TopOrganizationsTable.tsx` - Rankings
- `ScoreDistributionChart.tsx` - Histogram

---

## 🔄 Automatisierung

### Cloud Function: Täglicher Scan

```typescript
// functions/src/scheduled/daily-matching-scan.ts

export const dailyMatchingScan = onSchedule({
  schedule: 'every day 03:00',
  timeZone: 'Europe/Berlin',
  memory: '2GB',
  timeoutSeconds: 540 // 9 Minuten
}, async (event) => {

  logger.info('🔍 Starting daily matching scan');

  try {
    const result = await matchingCandidatesService.scanForCandidates({
      minScore: 60,
      forceRescan: false
    });

    logger.info('✅ Daily matching scan completed', {
      jobId: result.id,
      candidatesCreated: result.stats.candidatesCreated,
      candidatesUpdated: result.stats.candidatesUpdated
    });

    return result;

  } catch (error) {
    logger.error('❌ Daily matching scan failed', { error });
    throw error;
  }
});
```

---

## 🔐 Sicherheit & Permissions

### Firestore Rules

```javascript
// matching_candidates Collection
match /matching_candidates/{candidateId} {
  // Nur SuperAdmin kann lesen/schreiben
  allow read, write: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
}

// matching_scan_jobs Collection
match /matching_scan_jobs/{jobId} {
  // Nur SuperAdmin kann lesen
  allow read: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';

  // Nur Cloud Functions können schreiben
  allow write: if false;
}
```

### Service-Level Checks

```typescript
// In jedem Service-Call
export const matchingCandidatesService = {
  async getCandidates() {
    // Prüfe SuperAdmin-Rechte
    const user = await getCurrentUser();
    if (!user || !isSuperAdmin(user)) {
      throw new Error('Unauthorized: SuperAdmin access required');
    }
    // ...
  }
}
```

---

## 📈 Metriken & Monitoring

### Key Performance Indicators (KPIs)

```
1. Kandidaten-Pipeline:
   ├── Pending (wartet auf Review)
   ├── Imported (erfolgreich importiert)
   ├── Skipped (übersprungen)
   └── Rejected (abgelehnt)

2. Qualitäts-Metriken:
   ├── Durchschnittlicher Score
   ├── Import-Rate (imported / total)
   └── Top-Score Kandidaten (> 90 Punkte)

3. Scan-Metriken:
   ├── Letzte Scan-Zeit
   ├── Scan-Dauer
   ├── Fehlerrate
   └── Kandidaten pro Scan

4. Organisations-Metriken:
   ├── Top-Contributor (meiste Kandidaten)
   ├── Qualitäts-Score pro Org
   └── Journalisten-Dichte (Journalisten / Gesamt-Kontakte)
```

### Logging

```typescript
// Wichtige Events loggen
logger.info('Matching candidate created', {
  candidateId,
  matchKey,
  score,
  variantCount: variants.length,
  organizations: variants.map(v => v.organizationId)
});

logger.info('Candidate imported', {
  candidateId,
  globalContactId,
  importedBy: userId,
  selectedVariant: variantIndex
});
```

---

## 🚀 Implementierungs-Reihenfolge

### Sprint 1: Foundation & Service
```
1. ✅ Datenstruktur definieren (TypeScript Interfaces)
2. ✅ Firestore Collections anlegen
3. ✅ matching-candidates-service.ts implementieren
   ├── scanForCandidates()
   ├── generateMatchKey()
   ├── scoreCandidate()
   └── CRUD-Operationen
4. ✅ Unit Tests für Service
5. ✅ Firestore Rules
```

### Sprint 2: UI - Kandidaten-Liste
```
1. ✅ Route /super-admin/matching/candidates anlegen
2. ✅ MatchingCandidatesList.tsx - Hauptseite
3. ✅ CandidateTableRow.tsx - Tabellenzeile
4. ✅ CandidateFilters.tsx - Filter
5. ✅ Integration mit Service
```

### Sprint 3: UI - Detail & Review
```
1. ✅ CandidateDetailModal.tsx - Modal
2. ✅ CandidateVariantCard.tsx - Varianten-Anzeige
3. ✅ CandidateRecommendation.tsx - Empfehlung
4. ✅ CandidateReviewActions.tsx - Aktionen
5. ✅ Integration mit CRM-Import (autoGlobalMode)
```

### Sprint 4: Analytics & Automation
```
1. ✅ MatchingAnalyticsDashboard.tsx
2. ✅ Analytics-Charts (Recharts/Chart.js)
3. ✅ Cloud Function: dailyMatchingScan
4. ✅ Monitoring & Logging
5. ✅ ScanButton für manuellen Scan
```

### Sprint 5: Polish & Testing
```
1. ✅ E2E Tests
2. ✅ Performance-Optimierung (große Datenmengen)
3. ✅ Error Handling & User Feedback
4. ✅ Dokumentation finalisieren
5. ✅ Deployment
```

---

## 🎯 Success Criteria

### MVP ist erfolgreich wenn:
- ✅ Täglicher Scan findet automatisch Kandidaten
- ✅ SuperAdmin kann Kandidaten reviewen
- ✅ Import ins SuperAdmin CRM funktioniert nahtlos
- ✅ Kontakte sind sofort global verfügbar (autoGlobalMode)
- ✅ Keine Duplikate in Premium-Datenbank
- ✅ Analytics zeigt aussagekräftige Metriken

### Qualitäts-Ziele:
- 📊 Mindestens 60% der Kandidaten haben Score > 70
- ⚡ Scan-Dauer unter 5 Minuten (bei 10.000 Kontakten)
- 🎯 Import-Rate > 40% (von pending zu imported)
- 🔍 Duplikat-Rate < 5% (nach Import)

---

## 🔮 Future Enhancements (Phase 2)

### Intelligente Firma/Publikation-Zuordnung
```
1. E-Mail Domain → Firma Matching
   └── @spiegel.de → automatisch "Der Spiegel" vorschlagen

2. Firma-Duplikat-Erkennung
   └── "Spiegel Verlag" ≈ "Der Spiegel" ≈ "Spiegel GmbH"

3. Publikations-Hierarchie
   └── "Der Spiegel" (Parent) → "Spiegel Online" (Child)

4. Smart Merge
   └── Beste Daten aus allen Varianten kombinieren
```

### Advanced Matching
```
1. Fuzzy Name Matching
   └── "Maximilian" = "Max" = "M."

2. Phone Number Matching
   └── +49 40 1234567 = 040-1234567

3. Social Media Links
   └── LinkedIn/Twitter Profile Matching

4. Position Normalisierung
   └── "Redakteur" = "Redakteurin" = "Editor"
```

### Workflow Automation
```
1. Auto-Approve bei Score > 95
2. Auto-Reject bei Score < 50
3. Bulk-Import (mehrere Kandidaten gleichzeitig)
4. Smart Notifications (Slack/E-Mail bei neuen Top-Kandidaten)
```

---

## 📚 Anhang

### Beispiel: Match-Key Generierung

```typescript
// Beispiel 1: E-Mail vorhanden
const contact1 = {
  name: { firstName: 'Max', lastName: 'Müller' },
  emails: [{ email: 'm.mueller@spiegel.de', isPrimary: true }]
};
generateMatchKey(contact1); // → "m.mueller@spiegel.de"

// Beispiel 2: Keine E-Mail
const contact2 = {
  name: { firstName: 'Anna', lastName: 'Schmidt' },
  emails: []
};
generateMatchKey(contact2); // → "anna-schmidt"

// Beispiel 3: Sonderzeichen im Namen
const contact3 = {
  name: { firstName: 'Peter-Paul', lastName: "O'Connor" },
  emails: []
};
generateMatchKey(contact3); // → "peter-paul-o-connor"
```

### Beispiel: Score-Berechnung

```typescript
// Szenario: 3 Organisationen haben den Kontakt
const variants = [
  {
    organizationId: 'org1',
    contactData: {
      name: { firstName: 'Max', lastName: 'Müller' },
      emails: [{ email: 'm.mueller@spiegel.de' }],
      phones: [{ number: '+49 40 1234567' }],
      hasMediaProfile: true,
      beats: ['Politik', 'Wirtschaft']
    }
  },
  {
    organizationId: 'org2',
    contactData: {
      name: { firstName: 'Maximilian', lastName: 'Müller' },
      emails: [{ email: 'mueller@spiegel.de' }],
      hasMediaProfile: true
    }
  },
  {
    organizationId: 'org3',
    contactData: {
      name: { firstName: 'M.', lastName: 'Müller' },
      emails: [{ email: 'max.mueller@spiegel.de' }],
      phones: [{ number: '+49 40 9876543' }],
      hasMediaProfile: true,
      beats: ['Politik']
    }
  }
];

const score = scoreCandidate(variants);
// Berechnung:
// +50 (2 Orgs Basis)
// +10 (3 Orgs Bonus)
// +10 (mediaProfile in allen 3)
// +10 (verifizierte Domain @spiegel.de)
// +5 (Telefon vorhanden)
// +5 (Beats vorhanden)
// = 90 Punkte
```

---

## ✅ Definition of Done

- [ ] Alle Services implementiert und getestet
- [ ] UI-Komponenten vollständig funktional
- [ ] Cloud Function deployed und getestet
- [ ] Firestore Rules aktiv
- [ ] E2E Test durchgeführt
- [ ] Performance-Test bestanden (10.000 Kontakte)
- [ ] Dokumentation vollständig
- [ ] SuperAdmin kann erfolgreich Kandidaten importieren
- [ ] Erste globale Kontakte via Matching erstellt
- [ ] Analytics Dashboard zeigt korrekte Daten

---

**Status:** 📝 Planung abgeschlossen, bereit für Implementierung
**Geschätzter Aufwand:** 4-5 Sprints (2-3 Wochen)
**Priorität:** Hoch
**Abhängigkeiten:**
- ✅ autoGlobalMode funktioniert
- ✅ Reference-System funktioniert
- ✅ SuperAdmin CRM funktioniert
