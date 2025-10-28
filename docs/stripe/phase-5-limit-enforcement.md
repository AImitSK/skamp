# Phase 5: Limit Enforcement

> **Ziel:** Feature-Blocking bei Limit-Überschreitung, Email-Benachrichtigungen und Upgrade-Prompts implementieren

**Dauer:** 3-4 Tage
**Status:** ⏳ Pending
**Abhängigkeiten:** Phase 2 (Usage Tracking)

---

## Übersicht

Diese Phase implementiert die eigentliche Durchsetzung der Subscription-Limits:
- ✅ Feature-Blocking bei Limit-Überschreitung
- ✅ API-Middleware für automatisches Blocking
- ✅ UI-Blocking für gesperrte Features
- ✅ Email-Benachrichtigungen (80%, 90%, 100%)
- ✅ Upgrade-Prompts & Modals

---

## Enforcement-Strategie

### Wo wird geprüft?

| Feature | Prüfung-Ort | Blockierung |
|---------|-------------|-------------|
| **Emails** | Vor SendGrid API Call | API-Fehler + Modal |
| **Kontakte** | Vor Firestore Create | API-Fehler + Modal |
| **Storage** | Vor Firebase Upload | API-Fehler + Modal |
| **AI-Wörter** | Vor Genkit Flow Call | API-Fehler + Modal |
| **Team-Members** | Vor Invitation Send | API-Fehler + Modal |
| **Journalisten-DB** | UI + API Route | Feature versteckt + 403 |

---

## Tasks

### 1. Limit Enforcement Service erstellen

**Datei:** `src/lib/stripe/limit-enforcement-service.ts`

```typescript
import { usageTrackingService } from './usage-tracking-service';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';
import { sendLimitWarningEmail, sendLimitReachedEmail } from '@/lib/email/limit-notification-service';

export class LimitEnforcementService {
  /**
   * Check if feature usage is allowed
   * Throws error if limit reached
   */
  async enforceLimit(
    organizationId: string,
    feature: 'emails' | 'contacts' | 'storage' | 'ai_words' | 'team_members',
    requestedAmount: number = 1,
    options?: { gracePeriod?: boolean }
  ): Promise<void> {
    const result = await usageTrackingService.checkLimit(
      organizationId,
      feature,
      requestedAmount
    );

    // Unlimited = always allowed
    if (result.limit === -1) {
      return;
    }

    // Grace period: Allow 5% over limit
    const gracePeriodLimit = options?.gracePeriod
      ? result.limit * 1.05
      : result.limit;

    if (result.current + requestedAmount > gracePeriodLimit) {
      throw new LimitReachedError(
        feature,
        result.current,
        result.limit,
        'Limit erreicht. Bitte upgraden Sie Ihr Abo.'
      );
    }

    // Send warning emails at 80%, 90%, 100%
    const newPercentage = ((result.current + requestedAmount) / result.limit) * 100;
    const currentPercentage = (result.current / result.limit) * 100;

    if (currentPercentage < 80 && newPercentage >= 80) {
      await this.sendWarningEmail(organizationId, feature, 80);
    } else if (currentPercentage < 90 && newPercentage >= 90) {
      await this.sendWarningEmail(organizationId, feature, 90);
    } else if (currentPercentage < 100 && newPercentage >= 100) {
      await sendLimitReachedEmail(organizationId, feature);
    }
  }

  /**
   * Check if feature is accessible (for tier-based features like Journalisten-DB)
   */
  async checkFeatureAccess(
    organizationId: string,
    feature: 'editors_access'
  ): Promise<boolean> {
    const usage = await usageTrackingService.getUsage(organizationId);

    if (!usage) {
      throw new Error('Usage data not found');
    }

    const limits = SUBSCRIPTION_LIMITS[usage.tier];

    return limits[feature] === true;
  }

  /**
   * Send warning email
   */
  private async sendWarningEmail(
    organizationId: string,
    feature: string,
    percentage: number
  ): Promise<void> {
    try {
      await sendLimitWarningEmail(organizationId, feature, percentage);
    } catch (error) {
      console.error('Failed to send warning email:', error);
      // Don't throw - email failure shouldn't block feature usage
    }
  }
}

export class LimitReachedError extends Error {
  constructor(
    public feature: string,
    public current: number,
    public limit: number,
    message: string
  ) {
    super(message);
    this.name = 'LimitReachedError';
  }
}

export const limitEnforcementService = new LimitEnforcementService();
```

**Tasks:**
- [ ] Service implementieren
- [ ] Error-Klasse erstellen
- [ ] Grace-Period Logic (5% über Limit)
- [ ] Warning-Email-Trigger

---

### 2. Email-Versand Enforcement

**Datei zu ändern:** `src/app/api/sendgrid/send-pr-campaign/route.ts`

**Vor dem Versand (Zeile ~70):**

```typescript
import { limitEnforcementService, LimitReachedError } from '@/lib/stripe/limit-enforcement-service';

// ... existing code ...

try {
  // NEU: Check email limit BEFORE sending
  await limitEnforcementService.enforceLimit(
    auth.organizationId,
    'emails',
    validRecipients.length
  );

  // ... existing send logic ...

} catch (error) {
  if (error instanceof LimitReachedError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Email-Limit erreicht',
        limit: {
          feature: error.feature,
          current: error.current,
          limit: error.limit,
        },
        upgradeRequired: true,
      },
      { status: 429 }
    );
  }

  // ... other error handling ...
}
```

**Tasks:**
- [ ] Enforcement vor SendGrid Call
- [ ] Error Response mit Upgrade-Flag
- [ ] Testen: Limit erreichen → Blocking

---

### 3. CRM Enforcement

**Datei zu ändern:** `src/lib/firebase/crm-service.ts`

**Vor Create:**

```typescript
// In createCompany() / createContact():
await limitEnforcementService.enforceLimit(organizationId, 'contacts', 1);

// ... dann create ...
```

**Vor Bulk-Import:**

```typescript
// In bulkImportContacts():
const importCount = validContacts.length;
await limitEnforcementService.enforceLimit(organizationId, 'contacts', importCount);

// ... dann import ...
```

**Tasks:**
- [ ] Enforcement in Create-Funktionen
- [ ] Enforcement in Bulk-Import
- [ ] Error-Handling im Frontend

---

### 4. Storage Enforcement

**Datei zu ändern:** `src/lib/firebase/media-service.ts`

**Vor Upload:**

```typescript
// In uploadAsset():
const fileSize = file.size;

// Check if adding this file would exceed limit
const currentUsage = await usageTrackingService.getUsage(organizationId);
await limitEnforcementService.enforceLimit(
  organizationId,
  'storage',
  fileSize
);

// ... dann upload ...
```

**Tasks:**
- [ ] Enforcement vor Firebase Storage Upload
- [ ] Dateigröße vorher prüfen
- [ ] UI-Feedback bei Limit-Erreichen

---

### 5. AI Enforcement

**Datei zu ändern:** `src/app/api/ai/generate-structured/route.ts`

**Strategie:** Geschätzten Wort-Count prüfen, dann nach Generation nochmal tracken.

```typescript
// BEFORE AI call:
const estimatedWords = Math.ceil(prompt.length / 5); // Rough estimate
await limitEnforcementService.enforceLimit(
  auth.organizationId,
  'ai_words',
  estimatedWords,
  { gracePeriod: true } // Allow some flexibility
);

// ... AI generation ...

// AFTER AI call:
const actualWords = countWords(response.text);
await usageTrackingService.trackAIWordsUsed(auth.organizationId, actualWords);
```

**Tasks:**
- [ ] Pre-Check mit geschätzten Wörtern
- [ ] Post-Tracking mit tatsächlichen Wörtern
- [ ] Grace-Period nutzen für Flexibilität

---

### 6. Team-Members Enforcement

**Datei zu ändern:** `src/app/api/team/invite/route.ts`

**Vor Einladung:**

```typescript
// Get current team member count
const currentCount = await getTeamMemberCount(organizationId);

// Check if adding 1 more would exceed limit
await limitEnforcementService.enforceLimit(
  organizationId,
  'team_members',
  1
);

// ... then send invitation ...
```

**Tasks:**
- [ ] Enforcement vor Invitation-Send
- [ ] Current Count berechnen
- [ ] UI-Feedback

---

### 7. Journalisten-DB Access Control

#### 7.1 API Route Protection

**Datei:** `src/app/api/editors/route.ts` (oder wo immer Editors abgerufen werden)

```typescript
// In GET handler:
const hasAccess = await limitEnforcementService.checkFeatureAccess(
  auth.organizationId,
  'editors_access'
);

if (!hasAccess) {
  return NextResponse.json(
    {
      error: 'Journalisten-Datenbank nur ab BUSINESS-Tier verfügbar',
      upgradeRequired: true,
      requiredTier: 'BUSINESS',
    },
    { status: 403 }
  );
}

// ... dann Editors zurückgeben ...
```

#### 7.2 UI-Protection

**Datei:** `src/app/dashboard/library/editors/page.tsx`

```typescript
'use client';

import { useSubscription } from '@/lib/hooks/useSubscription';
import FeatureLockedModal from '@/components/subscription/FeatureLockedModal';

export default function EditorsPage() {
  const { subscription } = useSubscription();
  const hasAccess = subscription?.tier !== 'STARTER';

  if (!hasAccess) {
    return (
      <FeatureLockedModal
        feature="Journalisten-Datenbank"
        currentTier={subscription?.tier || 'STARTER'}
        requiredTier="BUSINESS"
      />
    );
  }

  // ... normal page ...
}
```

**Tasks:**
- [ ] API Route Protection
- [ ] UI-Level Blocking
- [ ] Feature-Locked Modal

---

### 8. Feature-Locked Modal Component

**Datei:** `src/components/subscription/FeatureLockedModal.tsx`

```typescript
import { ArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SubscriptionTier } from '@/config/subscription-limits';

interface Props {
  feature: string;
  currentTier: SubscriptionTier;
  requiredTier: SubscriptionTier;
  onClose?: () => void;
}

export default function FeatureLockedModal({
  feature,
  currentTier,
  requiredTier,
  onClose
}: Props) {
  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}

        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Feature gesperrt
          </h3>

          <p className="text-gray-600 mb-6">
            <strong>{feature}</strong> ist nur ab dem <strong>{requiredTier}</strong>-Tier verfügbar.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700 mb-2">
              Ihr aktueller Plan: <strong>{currentTier}</strong>
            </p>
            <p className="text-sm text-gray-700">
              Benötigt: <strong>{requiredTier}</strong> oder höher
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/dashboard/admin/contract'}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <ArrowUpIcon className="w-5 h-5" />
              Jetzt upgraden
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Später
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Tasks:**
- [ ] Modal implementieren
- [ ] Upgrade-Button → Contract Page
- [ ] Optional Close-Button

---

### 9. Limit-Warning Email Service

**Datei:** `src/lib/email/limit-notification-service.ts`

```typescript
import sgMail from '@sendgrid/mail';
import { db } from '@/lib/firebase/firebase-admin';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendLimitWarningEmail(
  organizationId: string,
  feature: string,
  percentage: number
) {
  // Get organization admin email
  const orgDoc = await db.collection('organizations').doc(organizationId).get();
  const org = orgDoc.data();

  if (!org?.adminEmail) {
    console.error('No admin email found for organization:', organizationId);
    return;
  }

  const featureLabels = {
    emails: 'Email-Versand',
    contacts: 'Kontakte',
    storage: 'Cloud-Speicher',
    ai_words: 'KI-Nutzung',
    team_members: 'Team-Mitglieder',
  };

  const msg = {
    to: org.adminEmail,
    from: 'noreply@celeropress.com',
    subject: `⚠️ ${featureLabels[feature]}-Limit bei ${percentage}%`,
    html: `
      <h2>Limit-Warnung</h2>
      <p>Hallo,</p>
      <p>Sie haben <strong>${percentage}% Ihres ${featureLabels[feature]}-Limits</strong> erreicht.</p>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/contract">
          Jetzt upgraden
        </a>, um mehr Kapazität zu erhalten.
      </p>
      <p>
        <small>Ihr CeleroPress Team</small>
      </p>
    `,
  };

  await sgMail.send(msg);
}

export async function sendLimitReachedEmail(
  organizationId: string,
  feature: string
) {
  // Similar to above, but for 100% reached
  // ... implementation ...
}
```

**Tasks:**
- [ ] Email-Templates erstellen (HTML)
- [ ] SendGrid Integration
- [ ] Admin-Email aus Organization holen
- [ ] Testen mit Test-Emails

---

### 10. Upgrade-Prompt Component

**Datei:** `src/components/subscription/UpgradePrompt.tsx`

**Usage:** Zeige diesen Banner an, wenn User nahe am Limit ist (>80%).

```typescript
interface Props {
  feature: string;
  percentage: number;
  currentTier: string;
}

export default function UpgradePrompt({ feature, percentage, currentTier }: Props) {
  if (percentage < 80) return null;

  const severity = percentage >= 95 ? 'critical' : 'warning';

  return (
    <div
      className={`rounded-lg p-4 mb-6 ${
        severity === 'critical'
          ? 'bg-red-50 border border-red-200'
          : 'bg-yellow-50 border border-yellow-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">
          {severity === 'critical' ? '🚨' : '⚠️'}
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold ${severity === 'critical' ? 'text-red-900' : 'text-yellow-900'}`}>
            {severity === 'critical' ? 'Limit fast erreicht!' : 'Limit-Warnung'}
          </h4>
          <p className={`text-sm mt-1 ${severity === 'critical' ? 'text-red-700' : 'text-yellow-700'}`}>
            Sie haben <strong>{percentage}%</strong> Ihres {feature}-Limits erreicht.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard/admin/contract'}
            className={`mt-3 px-4 py-2 rounded-lg font-medium text-sm transition ${
              severity === 'critical'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            Jetzt upgraden
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Tasks:**
- [ ] Component implementieren
- [ ] In relevanten Pages einbinden
- [ ] Color-Coding (gelb/rot)

---

## Testing

### Test Scenarios:

#### 1. Email-Limit:
- [ ] Sende Emails bis 80% → Warning-Email erhalten
- [ ] Sende Emails bis 95% → Gelber Banner erscheint
- [ ] Sende Emails bis 100% → Limit-Reached Email
- [ ] Versuch über 100% → API-Fehler 429 + Modal

#### 2. Kontakte-Limit:
- [ ] Importiere bis 80% → Warning
- [ ] Importiere bis 100% → Limit-Reached
- [ ] Create über Limit → Fehler + Modal

#### 3. Journalisten-DB:
- [ ] STARTER-User → Feature versteckt
- [ ] API-Call von STARTER → 403
- [ ] BUSINESS-User → Feature verfügbar

#### 4. Grace Period:
- [ ] Test: 100% + 5% = noch erlaubt
- [ ] Test: 105% + 1% = blockiert

---

## Definition of Done

- ✅ `limit-enforcement-service.ts` implementiert & getestet
- ✅ Enforcement in allen Features integriert (Emails, CRM, Storage, AI, Team)
- ✅ Journalisten-DB Access Control (UI + API)
- ✅ Feature-Locked Modal funktioniert
- ✅ Email-Benachrichtigungen bei 80%, 90%, 100%
- ✅ Upgrade-Prompt Komponente in relevanten Pages
- ✅ Grace-Period Logic (5% Puffer)
- ✅ Alle Test-Scenarios erfolgreich
- ✅ Error Handling & User-Friendly Messages

---

## Post-Launch Monitoring

### Metriken zu tracken:
- Wie oft erreichen User Limits?
- Welches Feature wird am häufigsten blockiert?
- Conversion Rate: Limit-Reached → Upgrade
- False-Positive Rate (Grace-Period Usage)

---

## Fertig! 🎉

Nach Abschluss von Phase 5 ist die komplette Stripe-Integration produktionsbereit:
- ✅ Subscription-Management
- ✅ Usage-Tracking
- ✅ Admin-Dashboards (Contract + Billing)
- ✅ Limit-Enforcement

**Nächste Schritte:**
1. Soft-Launch mit Test-Usern
2. Monitoring & Bug-Fixing
3. Public Launch
4. Profit! 💰

---

**Erstellt:** 2025-10-28
**Version:** 1.0
**Status:** 📋 Ready to Start
