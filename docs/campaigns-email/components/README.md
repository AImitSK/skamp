# Campaign Email Komponenten Dokumentation

**Version:** 1.0
**Projekt:** CeleroPress / SKAMP

---

## 📋 Komponenten-Übersicht

| Komponente | Datei | Zeilen | Zweck |
|------------|-------|--------|-------|
| EmailComposer | EmailComposer.tsx | 450 | Main Orchestrator (3-Step Wizard) |
| Step2Details | Step2Details.tsx | 230 | Email-Details & Absender |
| Step3Preview | Step3Preview.tsx | 800 | Preview & Versand |
| EmailAddressSelector | EmailAddressSelector.tsx | 190 | Verifizierte Emails Auswahl |
| RecipientManager | RecipientManager.tsx | 365 | Listen + Manuelle Empfänger |
| StepIndicator | StepIndicator.tsx | 80 | Wizard Navigation |

---

## EmailComposer

**Main Orchestrator für den Email-Versand-Wizard**

### Props

```typescript
interface EmailComposerProps {
  campaign: PRCampaign;              // Kampagne mit Content
  onSent?: () => void;               // Callback nach Versand
  pipelineMode?: boolean;            // Pipeline-Integration
  autoTransitionAfterSend?: boolean; // Auto-Weiterleitung
  onPipelineComplete?: (campaignId: string) => void;
}
```

### State Management

```typescript
interface EmailDraft {
  campaignId: string;
  campaignTitle: string;
  content: {
    body: string;              // ⭐ User-verfasster Email-Text
                               // - Personalisierte Nachricht an Journalisten
                               // - Unterstützt Variablen wie {{firstName}}, {{companyName}}
                               // - NICHT die vollständige Pressemitteilung!
                               // - campaign.mainContent wird nur als PDF angehängt
    signatureId?: string;      // Optional: HTML-Signatur ID
  };
  recipients: {
    listIds: string[];
    listNames: string[];
    manual: ManualRecipient[];
    totalCount: number;
    validCount: number;
  };
  emailAddressId: string;          // ← WICHTIG: Verifizierte Email
  metadata: {
    subject: string;
    preheader: string;
  };
  scheduling?: {
    sendAt?: Date;
    timezone?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Email-Content Best Practices:**

1. **Email-Body schreiben:**
   ```typescript
   draft.content.body = `Sehr geehrte{{r}} {{salutation}} {{lastName}},

anbei senden wir Ihnen unsere Pressemitteilung zu {{campaignTitle}}.

Die vollständige Pressemitteilung finden Sie im PDF-Anhang.

Beste Grüße`;
   ```

2. **Verfügbare Variablen:**
   - `{{firstName}}`, `{{lastName}}` → Empfänger-Name
   - `{{salutation}}` → Herr/Frau
   - `{{salutationFormal}}` → Sehr geehrter Herr / Sehr geehrte Frau
   - `{{title}}` → Dr., Prof., etc.
   - `{{companyName}}` → Firma des Empfängers
   - `{{campaignTitle}}` → Titel der Kampagne
   - `{{senderName}}` → Name des Absenders

3. **Pressemitteilung:**
   - Liegt in `campaign.mainContent`
   - Wird automatisch als PDF generiert
   - NICHT im Email-Body enthalten
```

### Reducer Actions

```typescript
type Action =
  | { type: 'SET_RECIPIENTS'; payload: Partial<EmailDraft['recipients']> }
  | { type: 'ADD_MANUAL_RECIPIENT'; payload: Omit<ManualRecipient, 'id'> }
  | { type: 'REMOVE_MANUAL_RECIPIENT'; payload: string }
  | { type: 'SET_EMAIL_ADDRESS'; payload: string }
  | { type: 'SET_METADATA'; payload: Partial<EmailDraft['metadata']> }
  | { type: 'SET_SCHEDULING'; payload: EmailDraft['scheduling'] };
```

### Verwendung

```typescript
import EmailComposer from '@/components/pr/email/EmailComposer';

function CampaignDetailPage() {
  const [campaign, setCampaign] = useState<PRCampaign>(...);

  return (
    <EmailComposer
      campaign={campaign}
      onSent={() => {
        toastService.success('Email versendet!');
        router.push('/campaigns');
      }}
    />
  );
}
```

---

## Step2Details

**Email-Details & Absender-Konfiguration**

### Props

```typescript
interface Step2DetailsProps {
  recipients: EmailDraft['recipients'];
  emailAddressId: string;
  metadata: EmailDraft['metadata'];
  onRecipientsChange: (recipients: Partial<EmailDraft['recipients']>) => void;
  onAddManualRecipient: (recipient: Omit<ManualRecipient, 'id'>) => void;
  onRemoveManualRecipient: (id: string) => void;
  onEmailAddressChange: (emailAddressId: string) => void;
  onMetadataChange: (metadata: Partial<EmailDraft['metadata']>) => void;
  validation: StepValidation['step2'];
  campaign: PRCampaign;
}
```

### Features

**1. Projekt-Verteilerlisten Auto-Load**

```typescript
useEffect(() => {
  const loadProjectLists = async () => {
    if (!campaign.projectId) return;

    const projectLists = await projectListsService.getProjectLists(
      campaign.projectId
    );

    const allListIds = [
      ...projectLists.filter(pl => pl.type === 'linked').map(pl => pl.masterListId),
      ...projectLists.filter(pl => pl.type === 'custom').map(pl => pl.id)
    ];

    if (allListIds.length > 0) {
      onRecipientsChange({ listIds: allListIds });
      toastService.success(`${allListIds.length} Verteilerliste(n) geladen`);
    }
  };

  loadProjectLists();
}, [campaign.projectId]);
```

**2. EmailAddressSelector**

Zeigt nur:
- `isActive === true`
- `verificationStatus === 'verified'`

Auto-Select:
- isDefault → erste Default-Email
- Fallback → erste Email

**3. Validation**

```typescript
const validateStep2 = (): boolean => {
  if (recipients.totalCount === 0) {
    validation.errors.recipients = 'Mindestens ein Empfänger erforderlich';
    return false;
  }

  if (!emailAddressId) {
    validation.errors.emailAddress = 'Absender-Email erforderlich';
    return false;
  }

  if (!metadata.subject.trim()) {
    validation.errors.subject = 'Betreff erforderlich';
    return false;
  }

  return true;
};
```

---

## Step3Preview

**Email-Vorschau & Versand**

### Props

```typescript
interface Step3PreviewProps {
  draft: EmailDraft;
  scheduling: EmailDraft['scheduling'];
  onSchedulingChange: (scheduling: EmailDraft['scheduling']) => void;
  validation: StepValidation['step3'];
  campaign: PRCampaign;
  onSent?: () => void;
  pipelineMode?: boolean;
  autoTransitionAfterSend?: boolean;
  onPipelineComplete?: (campaignId: string) => void;
}
```

### Features

**1. Preview-Modus (Desktop/Mobile)**

```typescript
const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

<div className={clsx(
  'preview-container',
  previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
)}>
  {/* Email Preview */}
</div>
```

**2. Test-Email**

```typescript
const handleSendTest = async () => {
  if (!validateTestEmail(testEmail)) return;

  setSendingTest(true);
  try {
    const result = await emailService.sendTestEmail({
      campaignId: campaign.id,
      recipientEmail: testEmail,
      recipientName: 'Test Empfänger',
      draft: draft
    });

    if (result.success) {
      toastService.success(`Test-Email an ${testEmail} versendet`);
      setTestSent(true);
    } else {
      toastService.error(result.error || 'Test-Versand fehlgeschlagen');
    }
  } finally {
    setSendingTest(false);
  }
};
```

**3. Finaler Versand (Sofort/Geplant)**

```typescript
const confirmSend = async () => {
  setSending(true);

  try {
    const idToken = await user?.getIdToken();

    if (sendMode === 'scheduled') {
      // Geplanter Versand
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

      const response = await fetch('/api/pr/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          organizationId: currentOrganization?.id,
          draft: draft,
          sendImmediately: false,
          scheduledDate: scheduledDateTime.toISOString()
        })
      });

      const result = await response.json();
      if (result.success) {
        toastService.success(`Email für ${scheduledDateTime.toLocaleString('de-DE')} geplant`);
      }
    } else {
      // Sofort-Versand
      const response = await fetch('/api/pr/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          organizationId: currentOrganization?.id,
          draft: draft,
          sendImmediately: true
        })
      });

      const result = await response.json();
      if (result.success) {
        toastService.success(`Email erfolgreich an ${result.result.successCount} Empfänger gesendet`);
      }
    }
  } catch (error: any) {
    toastService.error(`Versand fehlgeschlagen: ${error.message}`);
  } finally {
    setSending(false);
  }
};
```

---

## EmailAddressSelector

**Dropdown für verifizierte Absender-Emails**

### Props

```typescript
interface EmailAddressSelectorProps {
  value: string;                     // emailAddressId
  onChange: (emailAddressId: string) => void;
  organizationId: string;
}
```

### Funktionsweise

```typescript
const loadEmailAddresses = async () => {
  if (!user) {
    setError('Nicht eingeloggt');
    return;
  }

  try {
    // Lade alle Email-Adressen der Organisation
    const addresses = await emailAddressService.getEmailAddressesByOrganization(
      organizationId
    );

    // Filter: Nur aktive und verifizierte Emails
    const activeAddresses = addresses.filter(
      (addr) => addr.isActive && addr.verificationStatus === 'verified'
    );

    setEmailAddresses(activeAddresses);

    // Auto-Select: Wenn noch keine Auswahl und es gibt eine Default-Email
    if (!value && activeAddresses.length > 0) {
      const defaultAddress = activeAddresses.find((addr) => addr.isDefault);
      if (defaultAddress) {
        onChange(defaultAddress.id!);
      } else {
        // Fallback: Erste Email
        onChange(activeAddresses[0].id!);
      }
    }
  } catch (err) {
    toastService.error('Fehler beim Laden der Email-Adressen');
  }
};
```

### States

**Loading:**
```tsx
<div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600">
  Lade Email-Adressen...
</div>
```

**Error:**
```tsx
<div className="p-3 bg-red-50 border border-red-200 rounded-md">
  <p className="text-sm text-red-600">{error}</p>
</div>
```

**Empty:**
```tsx
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
  <p className="text-sm text-yellow-800">
    <strong>Keine verifizierten Email-Adressen gefunden.</strong>
  </p>
  <p className="text-sm text-yellow-700 mt-1">
    Bitte fügen Sie zuerst eine Email-Adresse unter{' '}
    <a href="/settings/email" className="underline font-medium">
      Einstellungen → Email
    </a>{' '}
    hinzu und verifizieren Sie diese.
  </p>
</div>
```

**Dropdown:**
```tsx
<select
  value={value}
  onChange={(e) => onChange(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-md"
  required
>
  <option value="">Bitte wählen...</option>
  {emailAddresses.map((emailAddress) => (
    <option key={emailAddress.id} value={emailAddress.id}>
      {emailAddress.email}
      {emailAddress.domain && ` (${emailAddress.domain})`}
      {emailAddress.isDefault && ' [Standard]'}
    </option>
  ))}
</select>
```

---

## RecipientManager

**Verwaltung von Verteilerlisten & Manuellen Empfängern**

### Props

```typescript
interface RecipientManagerProps {
  selectedListIds: string[];         // Read-only: kommt aus Campaign
  manualRecipients: ManualRecipient[];
  onListsChange: (listIds: string[], listNames: string[], totalFromLists: number) => void;
  onAddManualRecipient: (recipient: Omit<ManualRecipient, 'id'>) => void;
  onRemoveManualRecipient: (id: string) => void;
  recipientCount: number;
}
```

### Listen Laden

```typescript
useEffect(() => {
  const loadCampaignLists = async () => {
    // Lade nur die Listen die in selectedListIds sind
    const listPromises = selectedListIds.map(listId =>
      listsService.getById(listId, currentOrganization.id, user.uid)
    );
    const loadedLists = await Promise.all(listPromises);
    setCampaignLists(loadedLists.filter(Boolean) as DistributionList[]);
  };

  loadCampaignLists();
}, [selectedListIds]);
```

### Manuelle Empfänger

**AddRecipientModal:**

```typescript
<Dialog open={isOpen} onClose={onClose}>
  <DialogTitle>Empfänger hinzufügen</DialogTitle>
  <DialogBody>
    <Input
      label="Vorname *"
      value={formData.firstName}
      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
    />
    <Input
      label="Nachname *"
      value={formData.lastName}
      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
    />
    <Input
      label="E-Mail-Adresse *"
      type="email"
      value={formData.email}
      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
    />
    {/* ... weitere Felder */}
  </DialogBody>
  <DialogActions>
    <Button plain onClick={onClose}>Abbrechen</Button>
    <Button onClick={handleSubmit}>
      <UserPlusIcon />
      Hinzufügen
    </Button>
  </DialogActions>
</Dialog>
```

**Validation:**

```typescript
const validateForm = () => {
  const newErrors: Record<string, string> = {};

  if (!formData.salutation.trim()) {
    newErrors.salutation = 'Anrede ist erforderlich';
  }
  if (!formData.firstName.trim()) {
    newErrors.firstName = 'Vorname ist erforderlich';
  }
  if (!formData.lastName.trim()) {
    newErrors.lastName = 'Nachname ist erforderlich';
  }
  if (!formData.email.trim()) {
    newErrors.email = 'E-Mail ist erforderlich';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    newErrors.email = 'Ungültige E-Mail-Adresse';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

---

## StepIndicator

**Wizard-Navigation mit Validierung**

### Props

```typescript
interface StepIndicatorProps {
  currentStep: number;
  steps: {
    id: number;
    name: string;
    isValid: boolean;
  }[];
  onStepClick: (step: number) => void;
}
```

### Verwendung

```typescript
<StepIndicator
  currentStep={currentStep}
  steps={[
    { id: 1, name: 'Empfänger', isValid: validation.step1.isValid },
    { id: 2, name: 'Details', isValid: validation.step2.isValid },
    { id: 3, name: 'Vorschau', isValid: validation.step3.isValid }
  ]}
  onStepClick={handleStepChange}
/>
```

---

## Toast-Service Integration

**Alle Komponenten verwenden toastService für User-Feedback**

```typescript
import { toastService } from '@/lib/utils/toast';

// Erfolg
toastService.success('Email erfolgreich versendet');

// Fehler
toastService.error('Versand fehlgeschlagen');

// Warnung
toastService.warning('Einige Empfänger ungültig');

// Info
toastService.info('Email wird versendet...');
```

**Konfiguration in Layout:**

```typescript
import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
```

---

## Styling & Design System

**CeleroPress Design System Compliance:**

```typescript
// Farben
const colors = {
  primary: '#005fab',           // Blau für Primary Actions
  zinc: 'zinc-xxx',             // Neutrale Farben
  success: 'green-xxx',         // Erfolg
  error: 'red-xxx',             // Fehler
  warning: 'yellow-xxx'         // Warnung
};

// Icons (Heroicons /24/outline)
import {
  EnvelopeIcon,
  UserIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Buttons
<Button color="primary">   // #005fab
<Button plain>             // Outline Button

// Focus Rings
className="focus:ring-2 focus:ring-primary-500 focus:border-primary-500"

// Keine Schatten (außer Dropdowns)
className="rounded-lg border" // ✅
className="rounded-lg shadow-lg" // ❌
```

---

## Weitere Informationen

- [Haupt-Dokumentation](../README.md)
- [API-Dokumentation](../api/README.md)
- [Architecture Decision Records](../adr/README.md)

---

**Version:** 1.0
**Letzte Aktualisierung:** 13. November 2025
