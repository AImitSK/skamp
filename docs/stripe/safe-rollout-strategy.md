# Safe Rollout Strategy - Usage Tracking mit Auth

**Ziel:** Alle APIs mit Auth ausstatten OHNE produktive Features zu brechen

**Prinzip:** Test → Deploy → Monitor → Rollback bei Problemen

---

## 1. Pre-Rollout Checklist

### ✅ Vorbedingungen (MUSS erfüllt sein)

- [ ] **Alle betroffenen APIs identifiziert**
  - Email: `/api/email/send`
  - AI: 9x `/api/ai/*` routes
  - CRM: Already has auth ✅

- [ ] **Alle Frontend-Komponenten gefunden**
  - Email Composer
  - Campaign Send
  - PR Assistent
  - Headline Generator
  - Email Response
  - Text Transform
  - SEO Analyzer
  - Custom Instructions
  - Merge Variants

- [ ] **Feature Flag vorbereitet**
  ```typescript
  // .env
  USAGE_TRACKING_ENABLED=false  // Start disabled
  USAGE_TRACKING_STRICT_AUTH=false
  ```

- [ ] **Rollback-Script bereit**
  ```bash
  # Revert commits, redeploy previous version
  ```

---

## 2. Phase-by-Phase Rollout

### Phase 1: Email API (Kritisch - Klein anfangen)

**Warum zuerst?**
- Nur 1 API Route
- Gut abgrenzbar
- Weniger Frontend-Komponenten

#### Step 1.1: Backend vorbereiten

```typescript
// src/app/api/email/send/route.ts
import { withAuth } from '@/lib/api/auth-middleware';
import { incrementEmailUsage } from '@/lib/usage/usage-tracker';

const TRACKING_ENABLED = process.env.USAGE_TRACKING_ENABLED === 'true';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth) => {
    // ... existing send logic ...

    // Track usage
    if (TRACKING_ENABLED) {
      await incrementEmailUsage(auth.organizationId, recipientCount);
    }

    return NextResponse.json({ success: true });
  });
}
```

**Wichtig:** `withAuth` ist drin, aber Tracking noch OFF

#### Step 1.2: Frontend anpassen

**Zentrale Fetch-Funktion:**
```typescript
// src/lib/api/authenticated-fetch.ts
import { auth } from '@/lib/firebase/client-init';

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error('Authenticated fetch failed:', error);
    throw error;
  }
}
```

**Alle Email-Send Calls ersetzen:**
```typescript
// VORHER
const response = await fetch('/api/email/send', {
  method: 'POST',
  body: JSON.stringify(data)
});

// NACHHER
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

const response = await authenticatedFetch('/api/email/send', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

#### Step 1.3: Deploy & Test (Staging)

**Deployment auf Staging:**
```bash
vercel deploy --env USAGE_TRACKING_ENABLED=false
```

**Test-Szenarien:**
1. ✅ Login als Test-User
2. ✅ Email senden via Composer → Funktioniert?
3. ✅ Campaign senden → Funktioniert?
4. ✅ Token fehlt → 401 Error korrekt?
5. ✅ Logs checken: Keine Errors?

**Wenn ALLE Tests ✅:**
→ Deploy Production

**Wenn irgendwas ❌:**
→ Fix, zurück zu Step 1.2

#### Step 1.4: Deploy Production (Auth ON, Tracking OFF)

```bash
# Deploy mit Auth enabled, aber Tracking disabled
vercel deploy --prod --env USAGE_TRACKING_ENABLED=false
```

**Monitor für 24h:**
- Sentry: Errors?
- Logs: 401s?
- User-Reports: Beschwerden?

**Wenn alles stabil:**
→ Step 1.5

**Bei Problemen:**
```bash
# Rollback
git revert HEAD
vercel deploy --prod
```

#### Step 1.5: Tracking aktivieren

```bash
# Enable tracking
vercel env add USAGE_TRACKING_ENABLED true
vercel deploy --prod
```

**Monitor:**
- Firestore: Usage-Updates kommen an?
- Billing Page: Zahlen steigen?
- Logs: Tracking-Errors?

**Phase 1 DONE ✅**

---

### Phase 2: AI APIs (Kritisch - Viele Routes)

**Gleicher Prozess wie Phase 1, aber für 9 APIs:**

1. Alle 9 APIs mit `withAuth` ausstatten
2. Alle Frontend AI-Calls auf `authenticatedFetch` umstellen
3. Deploy Staging → Test ALL AI features
4. Deploy Production → Monitor 24h
5. Tracking aktivieren

**Besonderheit: Word Counting**

```typescript
// src/lib/usage/word-counter.ts
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}
```

**Test Word Counter separat:**
```typescript
// __tests__/word-counter.test.ts
test('counts words correctly', () => {
  expect(countWords('Hello World')).toBe(2);
  expect(countWords('Hello   World  ')).toBe(2);
  expect(countWords('')).toBe(0);
});
```

---

### Phase 3: CRM APIs (Einfach - Hat schon Auth)

**Status:** APIs haben bereits Auth via `APIMiddleware.withAuth`

**Aufgabe:** Nur Tracking hinzufügen

```typescript
// In POST Handler
const contact = await contactsAPIService.createContact(...);

// Add tracking
if (TRACKING_ENABLED) {
  await updateContactsUsage(context.organizationId, +1);
}

return APIMiddleware.successResponse(contact, 201);
```

**Kein Breaking Change** → Sicherer

---

## 3. Rollback-Strategie

### Scenario A: Frontend-Fehler (401s)

**Symptom:** User können keine Emails/AI nutzen, 401 Errors

**Diagnose:**
```bash
# Check Sentry
# Check Vercel Logs: "Missing authorization header"
```

**Fix:**
```bash
# Option 1: Frontend-Fix deployen
git commit -m "fix: Add missing auth token"
vercel deploy --prod

# Option 2: Backend-Rollback
git revert HEAD~1  # Revert withAuth
vercel deploy --prod
```

### Scenario B: Tracking-Fehler

**Symptom:** Features funktionieren, aber Usage steigt nicht

**Diagnose:**
```bash
# Check Firestore: usage/current docs updating?
# Check Logs: "incrementEmailUsage" errors?
```

**Fix:**
```bash
# Tracking ausschalten
vercel env add USAGE_TRACKING_ENABLED false
vercel deploy --prod

# Problem fixen in usage-tracker.ts
# Dann re-enable
```

### Scenario C: Performance-Regression

**Symptom:** API-Calls dauern >2s

**Diagnose:**
```bash
# Check Vercel Metrics
# Check Firestore Usage
```

**Fix:**
```bash
# Tracking ausschalten
vercel env add USAGE_TRACKING_ENABLED false

# Optimize: Batch updates, caching
# Re-enable nach Fix
```

---

## 4. Monitoring & Alerts

### Critical Metrics

**Vercel Dashboard:**
- [ ] 401 Error Rate < 1%
- [ ] API Response Time < 500ms
- [ ] Function Duration < 10s

**Sentry:**
- [ ] No new "Authentication failed" errors
- [ ] No "Usage tracker" errors

**Firestore:**
- [ ] `usage/current` documents updating
- [ ] Update frequency matches API calls

**Custom Monitoring:**
```typescript
// Log jede Usage-Update
console.log('[Usage Tracking]', {
  organizationId,
  metric: 'emails',
  delta: count,
  timestamp: new Date()
});
```

### Alert Setup

**Slack Webhook bei:**
- 401 Rate > 5% für 5 Minuten
- Usage-Tracking Fehler > 10 in 5 Minuten
- API Response Time > 2s für 5 Minuten

---

## 5. Testing Strategy

### Unit Tests (Pre-Deployment)

```typescript
// __tests__/api/email-send.test.ts
describe('POST /api/email/send', () => {
  it('requires authentication', async () => {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({ to: 'test@test.com' })
    });

    expect(response.status).toBe(401);
  });

  it('sends email with valid token', async () => {
    const token = await getTestToken();

    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ to: 'test@test.com' })
    });

    expect(response.status).toBe(200);
  });

  it('increments usage counter', async () => {
    const orgId = 'test-org';
    await initializeUsageTracking(orgId, 'STARTER');

    // Send email
    await sendEmailWithAuth({ to: ['test@test.com'] });

    // Check usage
    const usage = await getUsage(orgId);
    expect(usage.emailsSent).toBe(1);
  });
});
```

### Integration Tests (Staging)

**Manual Test-Checklist:**
- [ ] Login als Test-User
- [ ] Email Composer öffnen
- [ ] Email senden → Success?
- [ ] Billing Page checken → Counter +1?
- [ ] AI Generate ausführen → Success?
- [ ] Billing Page checken → Words gestiegen?
- [ ] Contact erstellen → Success?
- [ ] Billing Page checken → Counter +1?
- [ ] Logout/Login → Usage bleibt?

### E2E Tests (Playwright)

```typescript
// e2e/usage-tracking.spec.ts
test('email send increments usage counter', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');

  // Go to billing
  await page.goto('/dashboard/admin/billing');
  const emailsBefore = await page.textContent('[data-metric="emails"] .current');

  // Send email
  await page.goto('/dashboard/email/compose');
  await page.fill('#to', 'recipient@test.com');
  await page.fill('#subject', 'Test');
  await page.fill('#body', 'Test message');
  await page.click('button[type="submit"]');

  // Check usage increased
  await page.goto('/dashboard/admin/billing');
  const emailsAfter = await page.textContent('[data-metric="emails"] .current');

  expect(parseInt(emailsAfter)).toBe(parseInt(emailsBefore) + 1);
});
```

---

## 6. Migration für bestehende Organizations

### Before Rollout

**Problem:** Bestehende Organizations haben keine Usage-Docs

**Lösung:** Migration VOR dem Rollout

```bash
# 1. Migration-Script ausführen (lokal)
npx tsx src/scripts/migrate-all-organizations.ts

# 2. Verify: Alle Orgs haben usage/current?
# Firestore Console checken

# 3. Wenn ja → Deploy
vercel deploy --prod
```

**Migration-Script:**
```typescript
// src/scripts/migrate-all-organizations.ts
import { adminDb } from '@/lib/firebase/admin-init';
import { initializeUsageTracking } from '@/lib/usage/usage-tracker';

async function migrateAll() {
  const orgs = await adminDb.collection('organizations').get();

  console.log(`Migrating ${orgs.size} organizations...`);

  let success = 0;
  let failed = 0;

  for (const orgDoc of orgs.docs) {
    try {
      const orgData = orgDoc.data();

      // Skip if already has usage
      const usageDoc = await orgDoc.ref
        .collection('usage')
        .doc('current')
        .get();

      if (usageDoc.exists) {
        console.log(`✓ Skip ${orgDoc.id} (already has usage)`);
        continue;
      }

      // Initialize
      await initializeUsageTracking(orgDoc.id, orgData.tier);

      // Sync contacts count
      const contactsCount = await adminDb
        .collection('contacts')
        .where('organizationId', '==', orgDoc.id)
        .count()
        .get();

      await orgDoc.ref
        .collection('usage')
        .doc('current')
        .update({ contactsTotal: contactsCount.data().count });

      console.log(`✅ Migrated ${orgDoc.id}`);
      success++;

    } catch (error) {
      console.error(`❌ Failed ${orgDoc.id}:`, error);
      failed++;
    }
  }

  console.log(`\n✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    throw new Error('Migration had failures!');
  }
}

migrateAll();
```

---

## 7. Communication Plan

### Vor Rollout (24h vorher)

**Email an alle User:**
```
Betreff: Wartungsarbeiten - Neue Usage Tracking Features

Liebe CeleroPress User,

morgen zwischen 10:00-12:00 Uhr führen wir ein Update durch:

✨ Neu: Real-Time Usage Tracking in eurem Billing Dashboard
📊 Seht genau wie viele Emails, AI-Wörter, Kontakte ihr nutzt
⚡ Bessere Performance und Stabilität

Was ihr beachten müsst:
- Kurze Unterbrechung möglich (< 5 Minuten)
- Nach dem Update einmal neu einloggen

Bei Problemen: support@celeropress.com

Viele Grüße,
Das CeleroPress Team
```

### Während Rollout

**Status Page:**
```
🟡 In Progress - Usage Tracking Update
Expected: 10:00 - 12:00 Uhr
Some features may be temporarily unavailable.
```

### Nach Rollout

**Email:**
```
Betreff: ✅ Update erfolgreich - Neue Features verfügbar

Das Update ist abgeschlossen!

Schaut euch eure neuen Real-Time Usage Stats an:
→ https://app.celeropress.com/dashboard/admin/billing

Bei Fragen: support@celeropress.com
```

---

## 8. Timeline

### Woche 1: Phase 1 (Email API)
- **Tag 1-2:** Backend + Frontend Implementation
- **Tag 3:** Testing (Unit + Integration)
- **Tag 4:** Deploy Staging → Test 24h
- **Tag 5:** Deploy Production → Monitor 24h

### Woche 2: Phase 2 (AI APIs)
- **Tag 1-3:** Alle 9 AI APIs + Frontend
- **Tag 4:** Testing (Unit + Integration + E2E)
- **Tag 5:** Deploy Staging → Test 24h

### Woche 3: Phase 2 (AI APIs) cont.
- **Tag 1:** Deploy Production → Monitor 48h
- **Tag 2-5:** Bug Fixes falls nötig

### Woche 4: Phase 3 (CRM APIs)
- **Tag 1:** Tracking Code hinzufügen
- **Tag 2:** Testing
- **Tag 3:** Deploy → Monitor

### Woche 5: Cleanup & Documentation
- **Tag 1-2:** Mock-Data Code entfernen
- **Tag 3-4:** Documentation Update
- **Tag 5:** Retrospective

**Total:** 5 Wochen, sicher und strukturiert

---

## 9. Success Criteria

**Phase 1 (Email) ist erfolgreich wenn:**
- [ ] 0 neue 401 Errors in Production
- [ ] Email-Versand funktioniert
- [ ] Usage Counter steigt bei jedem Email
- [ ] Billing Page zeigt korrekte Zahlen
- [ ] Performance: <500ms Response Time
- [ ] 24h stabil gelaufen

**Gesamtes Projekt ist erfolgreich wenn:**
- [ ] Alle APIs mit Auth ausgestattet
- [ ] Alle Frontend-Komponenten angepasst
- [ ] Real Usage Tracking läuft
- [ ] Keine Mock-Daten mehr
- [ ] Limit-Checks funktionieren
- [ ] 0 Downtime
- [ ] 0 User-Beschwerden

---

## 10. Rollback Decision Tree

```
Deploy Production
    ↓
Monitor 1h
    ↓
├─ 401 Rate > 5% ?
│   └─ YES → ROLLBACK SOFORT
│   └─ NO → Continue
    ↓
Monitor 6h
    ↓
├─ Performance Regression?
│   └─ YES → ROLLBACK
│   └─ NO → Continue
    ↓
Monitor 24h
    ↓
├─ Any User Complaints?
│   └─ YES → Investigate → Fix or Rollback
│   └─ NO → ✅ SUCCESS
```

---

## Zusammenfassung

**Saubere Lösung = Strukturierter Rollout**

1. ✅ Feature Flag
2. ✅ Schrittweise (Email → AI → CRM)
3. ✅ Testing auf jeder Stufe
4. ✅ Monitor 24h pro Phase
5. ✅ Rollback-Plan bereit
6. ✅ User-Communication

**Risiko minimiert, Qualität maximiert.**

Bereit?
