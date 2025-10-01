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

## 🧪 Development & Testing

### Test-Strategie

**Kontext:** Die Software ist in Entwicklung und wir arbeiten mit echten Firebase-Daten. Das vereinfacht das Testing erheblich!

**Ansatz:**
- ✅ Seed-Scripts zum Erstellen von Test-Organisationen und Kontakten
- ✅ Development-Modus mit niedrigeren Schwellwerten
- ✅ Manuelle Tests mit echten Daten
- ✅ Cleanup-Scripts zum Aufräumen

### Seed-Scripts

#### 1. `seed-matching-test-data.ts`

**Zweck:** Erstellt 3-5 Test-Organisationen mit ähnlichen Journalisten-Kontakten für Matching-Tests.

```typescript
// scripts/seed-matching-test-data.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { firebaseConfig } from '@/lib/firebase/config';

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface TestOrganization {
  id?: string;
  name: string;
  email: string;
  plan: 'free' | 'premium';
}

interface JournalistVariant {
  organizationId: string;
  data: {
    name: { firstName: string; lastName: string };
    displayName?: string;
    emails: Array<{ type: string; email: string; isPrimary: boolean }>;
    phones?: Array<{ type: string; number: string; isPrimary: boolean }>;
    position?: string;
    companyName?: string;
    companyId?: string;
    mediaProfile?: {
      isJournalist: boolean;
      beats?: string[];
      publicationIds?: string[];
    };
  };
}

/**
 * Erstellt Test-Organisationen
 */
async function createTestOrganizations(): Promise<TestOrganization[]> {
  const orgs: TestOrganization[] = [
    { name: 'Premium Media GmbH', email: 'admin@premium-media.de', plan: 'premium' },
    { name: 'StartUp PR AG', email: 'info@startup-pr.de', plan: 'free' },
    { name: 'Agency Communications Ltd', email: 'contact@agency-comms.de', plan: 'free' },
    { name: 'Digital Media House', email: 'hello@digital-media.de', plan: 'premium' }
  ];

  const createdOrgs: TestOrganization[] = [];

  for (const org of orgs) {
    try {
      const docRef = await addDoc(collection(db, 'organizations'), {
        ...org,
        type: 'agency',
        status: 'active',
        features: org.plan === 'premium' ? ['premium_library', 'analytics'] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      createdOrgs.push({ ...org, id: docRef.id });
      console.log(`✅ Organisation erstellt: ${org.name} (${docRef.id})`);
    } catch (error) {
      console.error(`❌ Fehler beim Erstellen von ${org.name}:`, error);
    }
  }

  return createdOrgs;
}

/**
 * Erstellt ähnliche Journalisten-Kontakte in mehreren Organisationen
 */
async function createJournalistVariants(orgs: TestOrganization[]): Promise<void> {
  // Journalist 1: Max Müller (Der Spiegel)
  const maxMuellerVariants: JournalistVariant[] = [
    {
      organizationId: orgs[0].id!,
      data: {
        name: { firstName: 'Max', lastName: 'Müller' },
        displayName: 'Max Müller',
        emails: [{ type: 'business', email: 'm.mueller@spiegel.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 40 1234567', isPrimary: true }],
        position: 'Politikredakteur',
        companyName: 'Der Spiegel',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik', 'Wirtschaft', 'Europa'],
          publicationIds: []
        }
      }
    },
    {
      organizationId: orgs[1].id!,
      data: {
        name: { firstName: 'Maximilian', lastName: 'Müller' },
        displayName: 'Maximilian Müller',
        emails: [{ type: 'business', email: 'mueller@spiegel.de', isPrimary: true }],
        position: 'Redakteur',
        companyName: 'Spiegel Verlag',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik'],
          publicationIds: []
        }
      }
    },
    {
      organizationId: orgs[2].id!,
      data: {
        name: { firstName: 'M.', lastName: 'Müller' },
        displayName: 'M. Müller',
        emails: [{ type: 'business', email: 'max.mueller@spiegel.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 40 9876543', isPrimary: true }],
        position: 'Senior Journalist',
        companyName: 'Axel Springer',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik', 'Wirtschaft'],
          publicationIds: []
        }
      }
    }
  ];

  // Journalist 2: Anna Schmidt (Die Zeit)
  const annaSchmidtVariants: JournalistVariant[] = [
    {
      organizationId: orgs[0].id!,
      data: {
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'Anna Schmidt',
        emails: [{ type: 'business', email: 'a.schmidt@zeit.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 40 3280 123', isPrimary: true }],
        position: 'Wirtschaftsredakteurin',
        companyName: 'Die Zeit',
        mediaProfile: {
          isJournalist: true,
          beats: ['Wirtschaft', 'Finanzen', 'Startups'],
          publicationIds: []
        }
      }
    },
    {
      organizationId: orgs[3].id!,
      data: {
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'Anna Schmidt',
        emails: [{ type: 'business', email: 'schmidt@zeit.de', isPrimary: true }],
        position: 'Redakteurin',
        companyName: 'Zeit Online',
        mediaProfile: {
          isJournalist: true,
          beats: ['Wirtschaft', 'Technologie'],
          publicationIds: []
        }
      }
    }
  ];

  // Journalist 3: Peter Weber (nur in 1 Org - sollte NICHT matchen)
  const peterWeberVariant: JournalistVariant[] = [
    {
      organizationId: orgs[1].id!,
      data: {
        name: { firstName: 'Peter', lastName: 'Weber' },
        displayName: 'Peter Weber',
        emails: [{ type: 'business', email: 'p.weber@faz.net', isPrimary: true }],
        position: 'Technikredakteur',
        companyName: 'FAZ',
        mediaProfile: {
          isJournalist: true,
          beats: ['Technologie', 'Digital'],
          publicationIds: []
        }
      }
    }
  ];

  // Alle Varianten kombinieren
  const allVariants = [
    ...maxMuellerVariants,
    ...annaSchmidtVariants,
    ...peterWeberVariant
  ];

  // Kontakte erstellen
  let successCount = 0;
  let errorCount = 0;

  for (const variant of allVariants) {
    try {
      await contactsEnhancedService.create(variant.data as any, {
        organizationId: variant.organizationId,
        userId: 'seed-script-admin',
        autoGlobalMode: false // WICHTIG: Nicht global!
      });

      console.log(`✅ Kontakt erstellt: ${variant.data.displayName} in Org ${variant.organizationId}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Fehler beim Erstellen von ${variant.data.displayName}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   ✅ Erfolgreich: ${successCount}`);
  console.log(`   ❌ Fehler: ${errorCount}`);
}

/**
 * Haupt-Funktion
 */
async function main() {
  console.log('🚀 Starte Matching Test-Daten Seed...\n');

  try {
    // 1. Organisationen erstellen
    console.log('📁 Erstelle Test-Organisationen...');
    const orgs = await createTestOrganizations();
    console.log(`\n✅ ${orgs.length} Organisationen erstellt\n`);

    if (orgs.length === 0) {
      throw new Error('Keine Organisationen erstellt. Abbruch.');
    }

    // 2. Journalisten-Kontakte erstellen
    console.log('👥 Erstelle Journalisten-Kontakte...');
    await createJournalistVariants(orgs);

    console.log('\n🎉 Seed erfolgreich abgeschlossen!\n');
    console.log('📋 Nächste Schritte:');
    console.log('   1. Führe Matching-Scan aus (manuell oder automatisch)');
    console.log('   2. Öffne /super-admin/matching/candidates');
    console.log('   3. Erwartete Kandidaten:');
    console.log('      - Max Müller (3 Varianten)');
    console.log('      - Anna Schmidt (2 Varianten)');
    console.log('      - Peter Weber (KEIN Kandidat - nur 1 Org)');

  } catch (error) {
    console.error('❌ Seed fehlgeschlagen:', error);
    process.exit(1);
  }
}

// Script ausführen
main();
```

**Usage:**
```bash
# Füge zu package.json hinzu:
"scripts": {
  "seed:matching-test": "tsx scripts/seed-matching-test-data.ts"
}

# Ausführen:
npm run seed:matching-test
```

---

#### 2. `cleanup-matching-test-data.ts`

**Zweck:** Löscht alle Test-Organisationen und deren Kontakte.

```typescript
// scripts/cleanup-matching-test-data.ts
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebase/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TEST_ORG_NAMES = [
  'Premium Media GmbH',
  'StartUp PR AG',
  'Agency Communications Ltd',
  'Digital Media House'
];

/**
 * Löscht Test-Organisationen
 */
async function deleteTestOrganizations(): Promise<string[]> {
  const deletedOrgIds: string[] = [];

  for (const orgName of TEST_ORG_NAMES) {
    try {
      const q = query(
        collection(db, 'organizations'),
        where('name', '==', orgName)
      );

      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'organizations', docSnap.id));
        deletedOrgIds.push(docSnap.id);
        console.log(`✅ Organisation gelöscht: ${orgName} (${docSnap.id})`);
      }
    } catch (error) {
      console.error(`❌ Fehler beim Löschen von ${orgName}:`, error);
    }
  }

  return deletedOrgIds;
}

/**
 * Löscht Kontakte der Test-Organisationen
 */
async function deleteTestContacts(orgIds: string[]): Promise<number> {
  let deletedCount = 0;

  for (const orgId of orgIds) {
    try {
      const q = query(
        collection(db, 'contacts_enhanced'),
        where('organizationId', '==', orgId)
      );

      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'contacts_enhanced', docSnap.id));
        deletedCount++;
      }

      console.log(`✅ ${snapshot.size} Kontakte gelöscht für Org ${orgId}`);
    } catch (error) {
      console.error(`❌ Fehler beim Löschen von Kontakten für Org ${orgId}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Löscht Matching-Kandidaten (falls erstellt)
 */
async function deleteMatchingCandidates(): Promise<number> {
  let deletedCount = 0;

  try {
    const q = query(collection(db, 'matching_candidates'));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      // Prüfe ob Kandidat Test-Org-Kontakte enthält
      const candidate = docSnap.data();
      const hasTestOrgVariant = candidate.variants?.some((v: any) =>
        TEST_ORG_NAMES.includes(v.organizationName)
      );

      if (hasTestOrgVariant) {
        await deleteDoc(doc(db, 'matching_candidates', docSnap.id));
        deletedCount++;
        console.log(`✅ Matching-Kandidat gelöscht: ${docSnap.id}`);
      }
    }
  } catch (error) {
    console.error('❌ Fehler beim Löschen von Matching-Kandidaten:', error);
  }

  return deletedCount;
}

/**
 * Haupt-Funktion
 */
async function main() {
  console.log('🧹 Starte Cleanup von Test-Daten...\n');

  try {
    // 1. Organisationen löschen
    console.log('📁 Lösche Test-Organisationen...');
    const deletedOrgIds = await deleteTestOrganizations();
    console.log(`\n✅ ${deletedOrgIds.length} Organisationen gelöscht\n`);

    // 2. Kontakte löschen
    if (deletedOrgIds.length > 0) {
      console.log('👥 Lösche Kontakte...');
      const deletedContacts = await deleteTestContacts(deletedOrgIds);
      console.log(`\n✅ ${deletedContacts} Kontakte gelöscht\n`);
    }

    // 3. Matching-Kandidaten löschen
    console.log('🎯 Lösche Matching-Kandidaten...');
    const deletedCandidates = await deleteMatchingCandidates();
    console.log(`\n✅ ${deletedCandidates} Kandidaten gelöscht\n`);

    console.log('🎉 Cleanup erfolgreich abgeschlossen!');

  } catch (error) {
    console.error('❌ Cleanup fehlgeschlagen:', error);
    process.exit(1);
  }
}

// Script ausführen
main();
```

**Usage:**
```bash
# Füge zu package.json hinzu:
"scripts": {
  "cleanup:matching-test": "tsx scripts/cleanup-matching-test-data.ts"
}

# Ausführen:
npm run cleanup:matching-test
```

---

### Development-Modus

**Zweck:** Erleichtert das Testen während der Entwicklung durch niedrigere Schwellwerte.

#### Im Service:
```typescript
// src/lib/firebase/matching-candidates-service.ts

export const matchingCandidatesService = {

  async scanForCandidates(options?: {
    developmentMode?: boolean; // NEU
    minOrganizations?: number;
    minScore?: number;
  }) {
    // Entwicklungs-freundliche Defaults
    const minOrgs = options?.developmentMode
      ? 1  // Im Dev: auch einzelne Orgs zeigen
      : (options?.minOrganizations || 2);

    const minScore = options?.developmentMode
      ? 40 // Im Dev: niedrigerer Score
      : (options?.minScore || 60);

    // ... Rest der Logik
  }
}
```

#### Im UI:
```tsx
// src/app/super-admin/matching/candidates/page.tsx

export default function MatchingCandidatesPage() {
  const [devMode, setDevMode] = useState(
    process.env.NODE_ENV === 'development'
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={devMode}
            onChange={(e) => setDevMode(e.target.checked)}
          />
          <span className="text-sm">🔧 Development-Modus</span>
        </label>
        {devMode && (
          <span className="text-xs text-gray-500">
            (zeigt auch 1-Org Kandidaten, min Score: 40)
          </span>
        )}
      </div>

      {/* Rest der UI */}
    </div>
  );
}
```

---

### Test-Checkliste

**Vor dem Testen:**
- [ ] Firebase-Config korrekt (`.env.local`)
- [ ] SuperAdmin-Account erstellt
- [ ] Seed-Script erfolgreich ausgeführt
- [ ] Test-Organisationen in Firestore sichtbar

**Test-Szenarien:**

1. **Basic Matching (E-Mail)**
   - [ ] Max Müller wird als Kandidat erkannt
   - [ ] 3 Varianten werden angezeigt
   - [ ] Score ist > 70

2. **Scoring**
   - [ ] Kandidat mit mehr Orgs hat höheren Score
   - [ ] Vollständiges Profil erhöht Score
   - [ ] Verifizierte E-Mail-Domain erhöht Score

3. **Import-Flow**
   - [ ] "Als Premium importieren" öffnet CRM-Import
   - [ ] Daten sind vorausgefüllt
   - [ ] autoGlobalMode ist aktiv
   - [ ] Nach Import: Kandidat ist "imported"
   - [ ] Kontakt ist in global-journalists sichtbar

4. **Edge Cases**
   - [ ] Peter Weber (nur 1 Org) ist KEIN Kandidat (ohne Dev-Modus)
   - [ ] Mit Dev-Modus: Peter Weber wird angezeigt
   - [ ] Keine Duplikate in Kandidaten-Liste

5. **Cleanup**
   - [ ] Cleanup-Script löscht alle Test-Daten
   - [ ] Keine Test-Orgs in Firestore
   - [ ] Keine Test-Kontakte in Firestore
   - [ ] Keine Test-Kandidaten in Firestore

---

### Debugging-Tipps

**Problem:** Kein Kandidat wird erstellt
```typescript
// Prüfe:
1. Haben Test-Kontakte mediaProfile? ✅
2. Sind sie in verschiedenen Organisationen? ✅
3. Ist matchKey identisch?
   - Console.log in generateMatchKey() einfügen
4. Ist minOrganizations korrekt gesetzt?
```

**Problem:** Score zu niedrig
```typescript
// Prüfe Scoring-Faktoren:
1. Anzahl Organisationen (50+ Punkte)
2. mediaProfile vorhanden (+10)
3. E-Mail-Domain verifiziert (+10)
4. Beats definiert (+5)
```

**Problem:** Import funktioniert nicht
```typescript
// Prüfe:
1. Ist SuperAdmin eingeloggt? ✅
2. Ist autoGlobalMode aktiv? ✅
3. Check Firestore Rules für global-journalists
4. Check Console für Fehler
```

---

### Performance-Tests

**Scan mit vielen Kontakten:**
```typescript
// Test mit 1.000 Kontakten über 10 Orgs
// Erwartete Dauer: < 30 Sekunden

// Test mit 10.000 Kontakten über 50 Orgs
// Erwartete Dauer: < 5 Minuten

// Bei Timeout: Pagination einbauen
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
