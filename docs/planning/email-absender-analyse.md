# Email-Absender-System Analyse

> **Status:** Kritischer Bug - Produktion blockiert
> **Erstellt:** 2025-11-13
> **Autor:** Claude Code Analyse

---

## Inhaltsverzeichnis

1. [Problem-Beschreibung](#1-problem-beschreibung)
2. [Ist-Zustand](#2-ist-zustand)
3. [Soll-Zustand](#3-soll-zustand)
4. [Technische Analyse](#4-technische-analyse)
5. [Lösungsvorschlag](#5-lösungsvorschlag)
6. [Betroffene Dateien](#6-betroffene-dateien)
7. [Implementierungs-Checkliste](#7-implementierungs-checkliste)

---

## 1. Problem-Beschreibung

### Das Hauptproblem

Der aktuelle Email-Absender-Workflow in Step 2 des Email-Composers ist fundamental falsch implementiert. Der User wählt einen CRM-Kontakt aus (z.B. "Martin Mart Stork" mit Email `mart@blondnetzwerk.de`), aber **diese Email-Adresse ist NICHT in SendGrid verifiziert**, was zu "403 Forbidden" Fehlern beim Versand führt.

### Konkrete Fehler

```javascript
// AKTUELL FALSCH:
// In Step2: User wählt CRM-Kontakt
const contact = {
  name: "Martin Mart Stork",
  email: "mart@blondnetzwerk.de" // ❌ NICHT verifiziert!
}

// Email-Versand schlägt fehl:
// SendGrid Error 403: "mart@blondnetzwerk.de" is not verified
```

### Symptome

1. **Test-Emails funktionieren** (Step 3) - verwenden korrekte Email-Adressen
2. **Echter Versand schlägt fehl** (Step 2) - verwendet unverifizierte CRM-Emails
3. **Inkonsistente Implementierung** zwischen Test und echtem Versand

---

## 2. Ist-Zustand

### 2.1 Aktueller falscher Workflow (Step 2)

#### Komponente: `SenderSelector.tsx`

```typescript
// src/components/pr/email/SenderSelector.tsx

// ❌ PROBLEM: Wählt CRM-Kontakt mit unverifyierter Email
const handleContactSelect = (contactId: string) => {
  const contact = companyContacts.find(c => c.id === contactId);

  if (contact) {
    const contactData = {
      name: contact.displayName || `${contact.name?.firstName} ${contact.name?.lastName}`.trim(),
      email: contact.email || contact.emails?.[0]?.email,  // ❌ Unverifizierte Email!
      title: contact.position || '',
      company: campaign.clientName || contact.companyName || '',
      phone: contact.phones?.[0]?.number || contact.phone || ''
    };

    onChange({
      type: 'contact',
      contactId: contact.id,
      contactData  // ❌ Diese Daten werden für FROM verwendet!
    });
  }
};
```

#### Type: `SenderInfo`

```typescript
// src/types/email-composer.ts

export interface SenderInfo {
  type: 'contact' | 'manual';

  // Bei type === 'contact'
  contactId?: string;
  contactData?: {
    name: string;
    email: string;      // ❌ Das ist die CRM-Email (unverifiziert)!
    title?: string;
    company?: string;
    phone?: string;
  };

  // Bei type === 'manual'
  manual?: {
    name: string;
    email: string;      // ❌ Auch hier kann unverifizierte Email eingegeben werden!
    title?: string;
    company?: string;
    phone?: string;
  };
}
```

### 2.2 Warum Test-Emails funktionieren (Step 3)

#### Komponente: `Step3Preview.tsx` (Zeilen 146-196)

```typescript
// src/components/pr/email/Step3Preview.tsx

// ✅ RICHTIG: Verwendet EmailAddress aus email_addresses Collection
useEffect(() => {
  // ...
  let emailAddress = await emailAddressService.getDefaultForOrganizationServer(
    auth.organizationId,
    token
  );

  if (!emailAddress) {
    // Fallback: Suche aktive Email
    const allEmails = await emailAddressService.getByOrganizationServer(
      auth.organizationId,
      auth.userId,
      token
    );
    const activeEmail = allEmails.find(e => e.isActive);
    if (activeEmail) {
      emailAddress = activeEmail;
    }
  }

  console.log('✅ Using email address:', emailAddress.email);

  // ✅ RICHTIG: Reply-To wird generiert
  const replyToAddress = emailAddressService.generateReplyToAddress(emailAddress);
}, []);
```

#### API Route: `/api/email/test/route.ts` (Zeilen 146-196)

```typescript
// src/app/api/email/test/route.ts

// ✅ RICHTIG: Lädt verifizierte EmailAddress
let emailAddress = await emailAddressService.getDefaultForOrganizationServer(
  auth.organizationId,
  token
);

// ✅ RICHTIG: Verwendet verifizierte Email für FROM
const fromEmail = emailAddress.email;  // z.B. "presse@sk-online-marketing.de"
const fromName = emailAddress.displayName || data.senderInfo.company;

// ✅ RICHTIG: Generiert komplexe Reply-To
const replyToAddress = emailAddressService.generateReplyToAddress(emailAddress);
// z.B. "presse-RvDjQVss-p4hJJbb3@inbox.sk-online-marketing.de"

// ✅ RICHTIG: SendGrid Konfiguration
const msg = {
  from: {
    email: fromEmail,           // ✅ Verifiziert!
    name: fromName
  },
  reply_to: {
    email: replyToAddress,      // ✅ Komplexe Reply-To!
    name: fromName
  },
  // ...
};
```

### 2.3 Aktueller Email-Versand Flow (Falscher Weg)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Versand-Details (SenderSelector.tsx)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User wählt Kontakt aus CRM:                            │
│     ┌────────────────────────────────────┐                 │
│     │ Martin Mart Stork                  │                 │
│     │ mart@blondnetzwerk.de              │ ❌              │
│     │ PR Manager                         │                 │
│     │ Blondnetzwerk GmbH                 │                 │
│     └────────────────────────────────────┘                 │
│                                                             │
│  2. SenderInfo wird gesetzt:                               │
│     {                                                       │
│       type: 'contact',                                     │
│       contactData: {                                        │
│         email: "mart@blondnetzwerk.de" ❌ UNVERIFIZIERT!   │
│       }                                                     │
│     }                                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Versand: emailSenderService.sendSingleEmail()              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  const senderEmail = sender.type === 'contact'             │
│    ? sender.contactData?.email  // ❌ "mart@blondnetzwerk.de" │
│    : sender.manual?.email;                                 │
│                                                             │
│  const msg = {                                             │
│    from: {                                                 │
│      email: senderEmail,  // ❌ UNVERIFIZIERT!             │
│      name: senderName                                      │
│    },                                                      │
│    // ...                                                  │
│  };                                                        │
│                                                             │
│  await sgMail.send(msg);  // ❌ 403 Forbidden!             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Soll-Zustand

### 3.1 Korrekter Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Voraussetzungen (bereits vorhanden)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Admin200 ist angemeldet (organizationId: XYZ)         │
│                                                             │
│  2. Domain registriert:                                    │
│     /dashboard/settings/domain                             │
│     ✅ sk-online-marketing.de (verified)                   │
│                                                             │
│  3. Email-Adresse angelegt:                                │
│     /dashboard/settings/email                              │
│     ┌────────────────────────────────────┐                 │
│     │ Email: presse@sk-online-marketing.de │ ✅            │
│     │ Display: "Pressestelle"            │                 │
│     │ Status: Active, Default            │                 │
│     │ Permissions: [Admin200]            │                 │
│     └────────────────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Versand-Details (EmailAddressSelector.tsx - NEU!)  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Lade ALLE freigegebenen Email-Adressen:               │
│     emailAddressService.getByOrganization(orgId, userId)   │
│                                                             │
│  2. Zeige Auswahl (nur verifizierte Adressen):            │
│     ┌────────────────────────────────────┐                 │
│     │ ○ presse@sk-online-marketing.de   │ ✅              │
│     │   Display: "Pressestelle"          │                 │
│     │   (Default)                        │                 │
│     ├────────────────────────────────────┤                 │
│     │ ○ info@sk-online-marketing.de     │                 │
│     │   Display: "Allgemein"             │                 │
│     └────────────────────────────────────┘                 │
│                                                             │
│  3. User wählt: presse@sk-online-marketing.de             │
│                                                             │
│  4. SEPARATES Feld für Absender-Infos (CRM-Kontakt):      │
│     "Wer ist der Ansprechpartner für Rückfragen?"         │
│     ┌────────────────────────────────────┐                 │
│     │ Kontakt wählen:                    │                 │
│     │ [Martin Mart Stork ▼]              │                 │
│     │                                    │                 │
│     │ Diese Daten werden verwendet für:  │                 │
│     │ • Signatur                         │                 │
│     │ • Reply-To Name                    │                 │
│     │ • {{senderName}} Variable          │                 │
│     └────────────────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Draft Struktur (NEU)                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  draft.sender = {                                          │
│    // NEU: Email-Adresse aus email_addresses              │
│    emailAddressId: "rtEdp7RD...",                          │
│    emailAddress: {                                         │
│      email: "presse@sk-online-marketing.de",  // ✅ FROM   │
│      displayName: "Pressestelle",                          │
│      replyTo: "presse-RvDjQVss-p4hJJbb3@inbox..."  // ✅   │
│    },                                                      │
│                                                             │
│    // NEU: Kontakt-Info nur für Signatur/Variablen        │
│    contactInfo: {                                          │
│      type: 'contact' | 'manual',                           │
│      contactId?: "abc123",                                 │
│      data: {                                               │
│        name: "Martin Mart Stork",                          │
│        email: "mart@blondnetzwerk.de",  // ❌ NICHT für FROM! │
│        title: "PR Manager",                                │
│        company: "Blondnetzwerk GmbH",                      │
│        phone: "+49 123 456789"                             │
│      }                                                     │
│    }                                                       │
│  }                                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Versand: emailSenderService.sendSingleEmail() (FIXED)      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  // ✅ RICHTIG: Email-Adresse aus draft.sender             │
│  const fromEmail = draft.sender.emailAddress.email;        │
│  const fromName = draft.sender.emailAddress.displayName;   │
│  const replyToAddress = draft.sender.emailAddress.replyTo; │
│                                                             │
│  // ✅ RICHTIG: Kontakt-Info für Variablen                 │
│  const contactInfo = draft.sender.contactInfo.data;        │
│                                                             │
│  const msg = {                                             │
│    from: {                                                 │
│      email: fromEmail,  // ✅ "presse@sk-online-marketing.de" │
│      name: fromName     // ✅ "Pressestelle"               │
│    },                                                      │
│    reply_to: {                                             │
│      email: replyToAddress,  // ✅ "presse-RvDj...@inbox..." │
│      name: contactInfo.name  // ✅ "Martin Mart Stork"     │
│    },                                                      │
│    // ...                                                  │
│  };                                                        │
│                                                             │
│  await sgMail.send(msg);  // ✅ SUCCESS!                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Email-Header Struktur (Korrekt)

```
From: Pressestelle <presse@sk-online-marketing.de>        ✅ Verifiziert
Reply-To: Martin Mart Stork <presse-RvDj...@inbox.sk...>  ✅ Komplex
Subject: {{subject}}

Sehr geehrter Herr {{title}} {{lastName}},

{{introduction}}

Mit freundlichen Grüßen

{{senderName}}              // ← "Martin Mart Stork" (aus contactInfo)
{{senderTitle}}             // ← "PR Manager"
{{senderCompany}}           // ← "Blondnetzwerk GmbH"
{{senderPhone}}             // ← "+49 123 456789"
{{senderEmail}}             // ← "mart@blondnetzwerk.de" (nur Info!)
```

### 3.3 Reply-To Routing

Wenn Empfänger auf Email antwortet:

```
Antwort geht an: presse-RvDjQVss-p4hJJbb3@inbox.sk-online-marketing.de
                  │      │        │
                  │      │        └─ EmailAddress.id (erste 8 Zeichen)
                  │      └────────── Organization.id (erste 8 Zeichen)
                  └───────────────── Email.localPart (erste 10 Zeichen)

SendGrid Inbound Parse Webhook:
1. Parse Email
2. Extrahiere Reply-To
3. emailAddressService.findByReplyToAddress()
4. Route zu korrektem Projekt/Kampagne
5. Benachrichtige zugewiesene User
```

---

## 4. Technische Analyse

### 4.1 Warum der aktuelle Code falsch ist

#### Problem 1: Verwechslung von "Absender" und "Ansprechpartner"

```typescript
// FALSCHE ANNAHME im aktuellen Code:
// "Der CRM-Kontakt IST der Email-Absender"

// RICHTIG:
// - Email-Absender = EmailAddress (verifiziert, aus email_addresses)
// - Ansprechpartner = Contact (für Signatur/Variablen)
```

#### Problem 2: Type `SenderInfo` ist semantisch falsch

```typescript
// src/types/email-composer.ts - AKTUELL FALSCH

export interface SenderInfo {
  type: 'contact' | 'manual';
  contactData?: {
    email: string;  // ❌ Diese Email wird für FROM verwendet!
  };
}

// SOLLTE SEIN:

export interface EmailSenderData {
  // Email-Adresse für FROM (verifiziert)
  emailAddressId: string;
  emailAddress: EmailAddress;

  // Kontakt-Info für Signatur/Variablen
  contactInfo: {
    type: 'contact' | 'manual';
    contactId?: string;
    data: ContactData;
  };
}
```

#### Problem 3: Keine Trennung zwischen FROM und Reply-To

```typescript
// AKTUELL: Alles vermischt
const msg = {
  from: {
    email: sender.contactData.email,  // ❌ Unverifiziert!
    name: sender.contactData.name
  }
};

// RICHTIG: Klare Trennung
const msg = {
  from: {
    email: emailAddress.email,        // ✅ Verifiziert
    name: emailAddress.displayName
  },
  reply_to: {
    email: emailAddress.replyTo,      // ✅ Komplex generiert
    name: contactInfo.name
  }
};
```

### 4.2 Vergleich Test vs. Echt Versand

| Aspekt | Test-Email (Step 3) ✅ | Echter Versand (Step 2) ❌ |
|--------|------------------------|---------------------------|
| **FROM Email** | `emailAddress.email` (verifiziert) | `sender.contactData.email` (unverifiziert) |
| **FROM Name** | `emailAddress.displayName` | `sender.contactData.company` |
| **Reply-To** | Generiert via `generateReplyToAddress()` | Nicht vorhanden |
| **Signatur** | Lädt HTML via `signatureId` | Verwendet Text-Signatur |
| **Variablen** | `contactInfo` für Variablen | `sender.contactData` für alles |
| **Status** | ✅ Funktioniert | ❌ 403 Forbidden |

### 4.3 Email-Address Service Analyse

#### Vorhandene Funktionen (Korrekt)

```typescript
// src/lib/email/email-address-service.ts

class EmailAddressService {
  // ✅ Holt Standard-Email für Organisation
  async getDefaultForOrganizationServer(
    organizationId: string,
    authToken?: string
  ): Promise<EmailAddress | null>

  // ✅ Holt alle Emails mit Permissions
  async getByOrganizationServer(
    organizationId: string,
    userId: string,
    authToken?: string
  ): Promise<EmailAddress[]>

  // ✅ Generiert komplexe Reply-To Adresse
  generateReplyToAddress(emailAddress: EmailAddress): string {
    const prefix = emailAddress.localPart.substring(0, 10);
    const shortOrgId = emailAddress.organizationId.substring(0, 8);
    const shortEmailId = emailAddress.id!.substring(0, 8);

    return `${prefix}-${shortOrgId}-${shortEmailId}@inbox.sk-online-marketing.de`;
  }

  // ✅ Findet Email-Adresse aus Reply-To
  async findByReplyToAddress(replyToEmail: string): Promise<EmailAddress | null>
}
```

#### Type: `EmailAddress` (Vollständig)

```typescript
// src/types/email-enhanced.ts

export interface EmailAddress extends BaseEntity {
  // Identifikation
  id?: string;
  email: string;                    // "presse@sk-online-marketing.de"
  localPart: string;                // "presse"
  domainId: string;                 // Referenz zu Domain

  // Konfiguration
  displayName: string;              // "Pressestelle"
  isActive: boolean;
  isDefault: boolean;

  // Permissions
  assignedUserIds: string[];        // Welche User dürfen verwenden
  permissions: {
    read: string[];
    write: string[];
    manage: string[];
  };

  // Statistiken
  emailsSent?: number;
  emailsReceived?: number;
  lastUsedAt?: Timestamp;

  // Organisationszuordnung
  organizationId: string;
  userId: string;
}
```

---

## 5. Lösungsvorschlag

### 5.1 Phase 1: Type-Definitionen anpassen

#### 1.1 Neuer Type: `EmailSenderConfig`

```typescript
// src/types/email-composer.ts - NEU

/**
 * Email-Sender-Konfiguration
 * Trennt Email-Adresse (FROM) von Kontakt-Info (Signatur/Variablen)
 */
export interface EmailSenderConfig {
  // Email-Adresse für FROM (verifiziert aus email_addresses)
  emailAddressId: string;
  emailAddress: {
    email: string;           // "presse@sk-online-marketing.de"
    displayName: string;     // "Pressestelle"
    replyTo: string;         // "presse-RvDj...@inbox.sk-online-marketing.de"
  };

  // Kontakt-Info für Signatur/Variablen (aus CRM oder manuell)
  contactInfo: {
    type: 'contact' | 'manual';
    contactId?: string;      // Falls type === 'contact'
    data: {
      name: string;          // "Martin Mart Stork"
      email: string;         // "mart@blondnetzwerk.de" (nur für Signatur!)
      title?: string;        // "PR Manager"
      company?: string;      // "Blondnetzwerk GmbH"
      phone?: string;        // "+49 123 456789"
    };
  };
}

// Migration: Alter Type wird deprecated
/**
 * @deprecated Verwende EmailSenderConfig statt SenderInfo
 */
export type SenderInfo = EmailSenderConfig;
```

#### 1.2 EmailDraft anpassen

```typescript
// src/types/email-composer.ts - UPDATE

export interface EmailDraft {
  // ... andere Felder ...

  // ALT (entfernen):
  // sender: SenderInfo;

  // NEU:
  sender: EmailSenderConfig;

  // ... andere Felder ...
}
```

### 5.2 Phase 2: Neue Komponente erstellen

#### 2.1 `EmailAddressSelector.tsx` (Komplett neu)

```typescript
// src/components/pr/email/EmailAddressSelector.tsx - NEU

"use client";

import { useState, useEffect } from 'react';
import { EmailAddress } from '@/types/email-enhanced';
import { emailAddressService } from '@/lib/email/email-address-service';
import { Select } from '@/components/ui/select';
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface EmailAddressSelectorProps {
  organizationId: string;
  userId: string;
  selectedId?: string;
  onChange: (emailAddress: EmailAddress) => void;
  error?: string;
}

export default function EmailAddressSelector({
  organizationId,
  userId,
  selectedId,
  onChange,
  error
}: EmailAddressSelectorProps) {
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmailAddresses = async () => {
      setLoading(true);
      try {
        const addresses = await emailAddressService.getByOrganization(
          organizationId,
          userId
        );

        // Nur aktive Adressen anzeigen
        const activeAddresses = addresses.filter(a => a.isActive);
        setEmailAddresses(activeAddresses);

        // Auto-select default address
        if (!selectedId && activeAddresses.length > 0) {
          const defaultAddr = activeAddresses.find(a => a.isDefault) || activeAddresses[0];
          onChange(defaultAddr);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Email-Adressen:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEmailAddresses();
  }, [organizationId, userId]);

  const handleSelect = (id: string) => {
    const selected = emailAddresses.find(a => a.id === id);
    if (selected) {
      onChange(selected);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
      </div>
    );
  }

  if (emailAddresses.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-sm text-yellow-800">
          Keine Email-Adressen gefunden. Bitte richten Sie zuerst eine Email-Adresse
          unter <a href="/dashboard/settings/email" className="underline">Einstellungen → E-Mail</a> ein.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Absender Email-Adresse (FROM)
      </label>

      <Select
        value={selectedId || ''}
        onChange={(e) => handleSelect(e.target.value)}
      >
        <option value="">Bitte wählen...</option>
        {emailAddresses.map(addr => (
          <option key={addr.id} value={addr.id}>
            {addr.email}
            {addr.displayName && ` - ${addr.displayName}`}
            {addr.isDefault && ' (Standard)'}
          </option>
        ))}
      </Select>

      {/* Info-Box */}
      <div className="p-3 bg-blue-50 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <EnvelopeIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-blue-800">
            <p className="font-medium">Diese Email-Adresse wird verwendet für:</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>FROM-Header (muss in SendGrid verifiziert sein)</li>
              <li>Automatisch generierte Reply-To Adresse</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Gewählte Adresse Preview */}
      {selectedId && emailAddresses.find(a => a.id === selectedId) && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-900">Gewählte Absender-Adresse:</p>
              <p className="text-green-700 mt-1">
                {emailAddresses.find(a => a.id === selectedId)?.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

#### 2.2 `ContactInfoSelector.tsx` (Neuer Name für SenderSelector)

```typescript
// src/components/pr/email/ContactInfoSelector.tsx - REFACTORED

"use client";

import { useState, useEffect } from 'react';
import { PRCampaign } from '@/types/pr';
import { Contact } from '@/types/crm';
import { contactsService } from '@/lib/firebase/crm-service';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ContactInfoData {
  name: string;
  email: string;
  title?: string;
  company?: string;
  phone?: string;
}

interface ContactInfoSelectorProps {
  campaign: PRCampaign;
  type: 'contact' | 'manual';
  contactId?: string;
  data: ContactInfoData;
  onTypeChange: (type: 'contact' | 'manual') => void;
  onContactChange: (contactId: string, data: ContactInfoData) => void;
  onDataChange: (data: ContactInfoData) => void;
  error?: string;
}

export default function ContactInfoSelector({
  campaign,
  type,
  contactId,
  data,
  onTypeChange,
  onContactChange,
  onDataChange,
  error
}: ContactInfoSelectorProps) {
  const [companyContacts, setCompanyContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Lade Kontakte der Firma
  useEffect(() => {
    const loadCompanyContacts = async () => {
      if (!campaign.clientId) return;

      setLoadingContacts(true);
      try {
        const contacts = await contactsService.getByCompanyId(campaign.clientId);
        setCompanyContacts(contacts);

        // Auto-select first contact
        if (type === 'contact' && !contactId && contacts.length > 0) {
          handleContactSelect(contacts[0].id!);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Kontakte:', error);
      } finally {
        setLoadingContacts(false);
      }
    };

    loadCompanyContacts();
  }, [campaign.clientId, type]);

  const handleContactSelect = (id: string) => {
    const contact = companyContacts.find(c => c.id === id);

    if (contact) {
      const contactData = {
        name: contact.displayName || `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`.trim(),
        email: contact.email || contact.emails?.[0]?.email || contact.emails?.[0]?.address || '',
        title: contact.position || '',
        company: campaign.clientName || contact.companyName || '',
        phone: contact.phones?.[0]?.number || contact.phone || ''
      };

      onContactChange(contact.id!, contactData);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info-Box */}
      <div className="p-3 bg-blue-50 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-blue-800">
            <p className="font-medium">Ansprechpartner für Rückfragen</p>
            <p className="mt-1">
              Diese Daten werden verwendet für:
            </p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>Email-Signatur</li>
              <li>Reply-To Name</li>
              <li>Variablen: {'{'}senderName{'}'}, {'{'}senderTitle{'}'}, etc.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Typ-Auswahl */}
      <div>
        <label className="block text-sm font-medium mb-2">Ansprechpartner-Typ</label>
        <Select
          value={type}
          onChange={(e) => onTypeChange(e.target.value as 'contact' | 'manual')}
        >
          <option value="contact">Kontakt aus {campaign.clientName || 'Firma'} wählen</option>
          <option value="manual">Manuell eingeben</option>
        </Select>
      </div>

      {/* Kontakt-Auswahl */}
      {type === 'contact' && (
        <div>
          {loadingContacts ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
            </div>
          ) : companyContacts.length === 0 ? (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                Keine Kontakte für {campaign.clientName} gefunden.
                Bitte wählen Sie &ldquo;Manuell eingeben&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Kontakt auswählen</label>
                <Select
                  value={contactId || ''}
                  onChange={(e) => handleContactSelect(e.target.value)}
                >
                  <option value="">Bitte wählen...</option>
                  {companyContacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.displayName || `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`.trim()}
                      {contact.position && ` - ${contact.position}`}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manuelle Eingabe */}
      {type === 'manual' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium mb-1">
                Name *
              </label>
              <Input
                id="contact-name"
                value={data.name}
                onChange={(e) => onDataChange({ ...data, name: e.target.value })}
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium mb-1">
                E-Mail *
              </label>
              <Input
                id="contact-email"
                type="email"
                value={data.email}
                onChange={(e) => onDataChange({ ...data, email: e.target.value })}
                placeholder="max@firma.de"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-title" className="block text-sm font-medium mb-1">
                Position
              </label>
              <Input
                id="contact-title"
                value={data.title}
                onChange={(e) => onDataChange({ ...data, title: e.target.value })}
                placeholder="PR Manager"
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="block text-sm font-medium mb-1">
                Telefon
              </label>
              <Input
                id="contact-phone"
                value={data.phone}
                onChange={(e) => onDataChange({ ...data, phone: e.target.value })}
                placeholder="+49 30 12345678"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-company" className="block text-sm font-medium mb-1">
              Firma
            </label>
            <Input
              id="contact-company"
              value={data.company}
              onChange={(e) => onDataChange({ ...data, company: e.target.value })}
              placeholder={campaign.clientName || 'Firma GmbH'}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

### 5.3 Phase 3: Step2 Component anpassen

#### 3.1 `Step2RecipientsAndSender.tsx` anpassen

```typescript
// src/components/pr/email/Step2RecipientsAndSender.tsx - UPDATE

"use client";

import { useState } from 'react';
import { EmailSenderConfig } from '@/types/email-composer';
import { EmailAddress } from '@/types/email-enhanced';
import EmailAddressSelector from './EmailAddressSelector';
import ContactInfoSelector from './ContactInfoSelector';
import { emailAddressService } from '@/lib/email/email-address-service';

interface Step2Props {
  // ... existing props ...
  sender: EmailSenderConfig;
  onChange: (sender: EmailSenderConfig) => void;
}

export default function Step2RecipientsAndSender({
  sender,
  onChange,
  campaign,
  // ... other props
}: Step2Props) {

  // Handler für Email-Address Auswahl
  const handleEmailAddressChange = (emailAddress: EmailAddress) => {
    // Generiere Reply-To
    const replyTo = emailAddressService.generateReplyToAddress(emailAddress);

    onChange({
      ...sender,
      emailAddressId: emailAddress.id!,
      emailAddress: {
        email: emailAddress.email,
        displayName: emailAddress.displayName,
        replyTo: replyTo
      }
    });
  };

  // Handler für Kontakt-Info Typ-Änderung
  const handleContactTypeChange = (type: 'contact' | 'manual') => {
    onChange({
      ...sender,
      contactInfo: {
        ...sender.contactInfo,
        type: type,
        contactId: type === 'manual' ? undefined : sender.contactInfo.contactId
      }
    });
  };

  // Handler für Kontakt-Auswahl
  const handleContactChange = (contactId: string, data: any) => {
    onChange({
      ...sender,
      contactInfo: {
        type: 'contact',
        contactId: contactId,
        data: data
      }
    });
  };

  // Handler für manuelle Daten
  const handleDataChange = (data: any) => {
    onChange({
      ...sender,
      contactInfo: {
        ...sender.contactInfo,
        data: data
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Empfänger-Auswahl (existing) */}
      <div>
        <h3 className="text-lg font-medium mb-4">Empfänger</h3>
        {/* ... existing recipient selection ... */}
      </div>

      {/* NEU: Email-Adresse (FROM) */}
      <div>
        <h3 className="text-lg font-medium mb-4">Absender Email-Adresse</h3>
        <EmailAddressSelector
          organizationId={organizationId}
          userId={userId}
          selectedId={sender.emailAddressId}
          onChange={handleEmailAddressChange}
        />
      </div>

      {/* NEU: Kontakt-Info (Signatur/Variablen) */}
      <div>
        <h3 className="text-lg font-medium mb-4">Ansprechpartner</h3>
        <ContactInfoSelector
          campaign={campaign}
          type={sender.contactInfo.type}
          contactId={sender.contactInfo.contactId}
          data={sender.contactInfo.data}
          onTypeChange={handleContactTypeChange}
          onContactChange={handleContactChange}
          onDataChange={handleDataChange}
        />
      </div>

      {/* Betreff & Preheader (existing) */}
      <div>
        <h3 className="text-lg font-medium mb-4">Email-Details</h3>
        {/* ... existing subject/preheader fields ... */}
      </div>
    </div>
  );
}
```

### 5.4 Phase 4: Email-Versand Services anpassen

#### 4.1 `email-sender-service.ts` anpassen

```typescript
// src/lib/email/email-sender-service.ts - UPDATE

import { EmailSenderConfig } from '@/types/email-composer';

export class EmailSenderService {

  private async sendSingleEmail(
    recipient: Recipient,
    preparedData: PreparedEmailData,
    sender: EmailSenderConfig,  // ✅ NEU: EmailSenderConfig statt SenderInfo
    metadata: EmailMetadata
  ): Promise<void> {
    // Variablen vorbereiten
    const variables = emailComposerService.prepareVariables(
      {
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        email: recipient.email,
        companyName: recipient.companyName,
        salutation: recipient.salutation,
        title: recipient.title
      },
      sender.contactInfo.data,  // ✅ Verwende contactInfo.data für Variablen
      preparedData.campaign
    );

    // Subject mit Variablen
    const personalizedSubject = emailComposerService.replaceVariables(
      metadata.subject,
      variables
    );

    // Email-HTML bauen
    const emailHtml = this.buildEmailHtml(
      preparedData,
      variables,
      metadata,
      false
    );

    // ✅ RICHTIG: Verwende EmailAddress für FROM
    const fromEmail = sender.emailAddress.email;      // ✅ "presse@sk-online-marketing.de"
    const fromName = sender.emailAddress.displayName; // ✅ "Pressestelle"
    const replyToEmail = sender.emailAddress.replyTo; // ✅ "presse-RvDj...@inbox..."
    const replyToName = sender.contactInfo.data.name; // ✅ "Martin Mart Stork"

    console.log('🔍 Email-Konfiguration:', {
      from: { email: fromEmail, name: fromName },
      replyTo: { email: replyToEmail, name: replyToName },
      emailAddressId: sender.emailAddressId
    });

    // SendGrid Mail Objekt
    const msg = {
      to: recipient.email,
      from: {
        email: fromEmail,     // ✅ Verifizierte Email!
        name: fromName        // ✅ Display Name!
      },
      reply_to: {
        email: replyToEmail,  // ✅ Komplexe Reply-To!
        name: replyToName     // ✅ Kontakt-Name!
      },
      subject: personalizedSubject,
      html: emailHtml,
      attachments: [
        {
          content: preparedData.pdfBase64,
          filename: `${preparedData.campaign.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ],
      // ✅ Custom headers für Tracking
      headers: {
        'X-CeleroPress-EmailAddress-ID': sender.emailAddressId,
        'X-CeleroPress-Campaign-ID': preparedData.campaign.id || '',
        'X-CeleroPress-Contact-ID': sender.contactInfo.contactId || ''
      }
    };

    // Senden via SendGrid
    await sgMail.send(msg);

    // ✅ Update Email-Statistiken
    if (sender.emailAddressId) {
      await this.updateEmailAddressStats(sender.emailAddressId);
    }
  }

  // ✅ NEU: Update Email-Address Statistiken
  private async updateEmailAddressStats(emailAddressId: string): Promise<void> {
    try {
      const { emailAddressService } = await import('@/lib/email/email-address-service');
      await emailAddressService.updateStats(emailAddressId, 'sent');
    } catch (error) {
      console.error('Fehler beim Update der Email-Statistiken:', error);
      // Nicht werfen - Statistiken sind nicht kritisch
    }
  }
}
```

#### 4.2 `email-composer-service.ts` anpassen

```typescript
// src/lib/email/email-composer-service.ts - UPDATE

class EmailComposerService {

  /**
   * Bereitet Variablen für Email vor
   */
  prepareVariables(
    recipient: any,
    contactInfo: any,  // ✅ NEU: contactInfo statt senderInfo
    campaign: any,
    mediaShareUrl?: string
  ): EmailVariables {
    // ... recipient variables ...

    return {
      recipient: {
        // ...
      },
      sender: {
        name: contactInfo.name,
        title: contactInfo.title || '',
        company: contactInfo.company || '',
        phone: contactInfo.phone || '',
        email: contactInfo.email || ''  // ❌ Nur für Signatur, NICHT für FROM!
      },
      campaign: {
        // ...
      },
      system: {
        currentDate: new Date().toLocaleDateString('de-DE'),
        currentYear: new Date().getFullYear().toString(),
        mediaShareUrl: mediaShareUrl
      }
    };
  }

  /**
   * Merged Email-Felder aus Draft und Campaign
   */
  mergeEmailFields(
    draft: EmailDraft,
    campaign: PRCampaign
  ): PRCampaignEmail {
    // ✅ Verwende contactInfo für Signatur-Variablen
    const contactInfo = draft.sender.contactInfo.data;

    return {
      subject: draft.metadata.subject,
      greeting: draft.content.sections?.greeting || '',
      introduction: draft.content.sections?.introduction || draft.content.body,
      pressReleaseHtml: campaign.contentHtml || '',
      closing: draft.content.sections?.closing || '',
      signature: this.buildSignature(contactInfo)  // ✅ Verwende contactInfo
    };
  }

  /**
   * Baut Signatur aus Kontakt-Info
   */
  private buildSignature(contactInfo: any): string {
    const parts = [
      contactInfo.name,
      contactInfo.title,
      contactInfo.company,
      contactInfo.phone,
      contactInfo.email
    ];

    return parts.filter(Boolean).join('\n');
  }
}
```

### 5.5 Phase 5: API Routes anpassen

#### 5.1 `/api/pr/email/send/route.ts` anpassen

```typescript
// src/app/api/pr/email/send/route.ts - UPDATE

export async function POST(request: NextRequest) {
  try {
    // ... auth ...

    const body: SendEmailRequest = await request.json();
    const { campaignId, organizationId, draft, sendImmediately, scheduledDate } = body;

    // ✅ Validierung: EmailAddress muss gesetzt sein
    if (!draft.sender.emailAddressId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Keine Email-Adresse ausgewählt'
        },
        { status: 400 }
      );
    }

    // ✅ Validierung: EmailAddress muss existieren und aktiv sein
    const { emailAddressService } = await import('@/lib/email/email-address-service');
    const emailAddress = await emailAddressService.get(draft.sender.emailAddressId);

    if (!emailAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email-Adresse nicht gefunden'
        },
        { status: 400 }
      );
    }

    if (!emailAddress.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email-Adresse ist nicht aktiv'
        },
        { status: 400 }
      );
    }

    if (emailAddress.organizationId !== organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email-Adresse gehört zu anderer Organization'
        },
        { status: 403 }
      );
    }

    // ✅ Validierung: Kontakt-Info muss vollständig sein
    if (!draft.sender.contactInfo.data.name || !draft.sender.contactInfo.data.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kontakt-Informationen sind unvollständig'
        },
        { status: 400 }
      );
    }

    // ... rest of implementation ...
  } catch (error) {
    // ...
  }
}
```

### 5.6 Phase 6: Migration & Backward Compatibility

#### 6.1 Migration Helper

```typescript
// src/lib/email/email-sender-migration.ts - NEU

import { SenderInfo, EmailSenderConfig } from '@/types/email-composer';
import { emailAddressService } from './email-address-service';

/**
 * Migriert altes SenderInfo Format zu neuem EmailSenderConfig
 */
export async function migrateSenderInfo(
  oldSender: SenderInfo,
  organizationId: string,
  userId: string
): Promise<EmailSenderConfig> {

  // Hole Standard Email-Adresse
  let emailAddress = await emailAddressService.getDefaultForOrganization(organizationId);

  if (!emailAddress) {
    throw new Error('Keine Email-Adresse konfiguriert');
  }

  // Generiere Reply-To
  const replyTo = emailAddressService.generateReplyToAddress(emailAddress);

  // Extrahiere Kontakt-Info aus altem Format
  let contactInfo;
  if (oldSender.type === 'contact' && oldSender.contactData) {
    contactInfo = {
      type: 'contact' as const,
      contactId: oldSender.contactId,
      data: {
        name: oldSender.contactData.name,
        email: oldSender.contactData.email,
        title: oldSender.contactData.title,
        company: oldSender.contactData.company,
        phone: oldSender.contactData.phone
      }
    };
  } else if (oldSender.type === 'manual' && oldSender.manual) {
    contactInfo = {
      type: 'manual' as const,
      data: {
        name: oldSender.manual.name,
        email: oldSender.manual.email,
        title: oldSender.manual.title,
        company: oldSender.manual.company,
        phone: oldSender.manual.phone
      }
    };
  } else {
    throw new Error('Ungültige Sender-Info');
  }

  return {
    emailAddressId: emailAddress.id!,
    emailAddress: {
      email: emailAddress.email,
      displayName: emailAddress.displayName,
      replyTo: replyTo
    },
    contactInfo: contactInfo
  };
}
```

---

## 6. Betroffene Dateien

### 6.1 Zu ändernde Dateien

#### Frontend Components

| Datei | Änderung | Priorität |
|-------|----------|-----------|
| `src/components/pr/email/SenderSelector.tsx` | **LÖSCHEN** → Ersetzen durch neue Komponenten | Hoch |
| `src/components/pr/email/EmailAddressSelector.tsx` | **NEU ERSTELLEN** | Hoch |
| `src/components/pr/email/ContactInfoSelector.tsx` | **NEU ERSTELLEN** (refactored SenderSelector) | Hoch |
| `src/components/pr/email/Step2RecipientsAndSender.tsx` | **UPDATE** - Verwende neue Selectors | Hoch |
| `src/components/pr/email/Step3Preview.tsx` | **MINOR UPDATE** - Type anpassen | Mittel |

#### Types

| Datei | Änderung | Priorität |
|-------|----------|-----------|
| `src/types/email-composer.ts` | **UPDATE** - Neuer Type `EmailSenderConfig` | Hoch |
| `src/types/email-enhanced.ts` | **KEINE ÄNDERUNG** - Bereits korrekt | - |

#### Services

| Datei | Änderung | Priorität |
|-------|----------|-----------|
| `src/lib/email/email-sender-service.ts` | **UPDATE** - Verwende `EmailSenderConfig` | Hoch |
| `src/lib/email/email-composer-service.ts` | **UPDATE** - Variablen-Handling anpassen | Hoch |
| `src/lib/email/email-service.ts` | **UPDATE** - Test-Email & Preview anpassen | Mittel |
| `src/lib/email/email-address-service.ts` | **KEINE ÄNDERUNG** - Bereits korrekt | - |
| `src/lib/email/email-sender-migration.ts` | **NEU ERSTELLEN** - Migration Helper | Mittel |

#### API Routes

| Datei | Änderung | Priorität |
|-------|----------|-----------|
| `src/app/api/pr/email/send/route.ts` | **UPDATE** - Validierung für EmailSenderConfig | Hoch |
| `src/app/api/email/test/route.ts` | **MINOR UPDATE** - Type anpassen | Mittel |
| `src/app/api/sendgrid/send-pr-campaign/route.ts` | **DEPRECATE** - Wird nicht mehr verwendet | Niedrig |

### 6.2 Bereits korrekte Dateien (Keine Änderung nötig)

- `src/lib/email/email-address-service.ts` ✅
- `src/types/email-enhanced.ts` ✅
- `src/app/api/email/test/route.ts` (größtenteils korrekt) ✅

---

## 7. Implementierungs-Checkliste

### Phase 1: Type-Definitionen ✅

- [ ] **T1.1** Neuen Type `EmailSenderConfig` in `email-composer.ts` erstellen
- [ ] **T1.2** `EmailDraft.sender` von `SenderInfo` zu `EmailSenderConfig` migrieren
- [ ] **T1.3** `SenderInfo` als `@deprecated` markieren mit Hinweis auf Migration
- [ ] **T1.4** TypeScript Compiler Errors prüfen (alle betroffenen Stellen finden)

**Erwartete Änderungen:**
```diff
// src/types/email-composer.ts

+ export interface EmailSenderConfig {
+   emailAddressId: string;
+   emailAddress: {
+     email: string;
+     displayName: string;
+     replyTo: string;
+   };
+   contactInfo: {
+     type: 'contact' | 'manual';
+     contactId?: string;
+     data: {
+       name: string;
+       email: string;
+       title?: string;
+       company?: string;
+       phone?: string;
+     };
+   };
+ }

+ /**
+  * @deprecated Use EmailSenderConfig instead
+  */
+ export type SenderInfo = EmailSenderConfig;

export interface EmailDraft {
  // ...
- sender: SenderInfo;
+ sender: EmailSenderConfig;
  // ...
}
```

---

### Phase 2: Neue Komponenten erstellen ✅

- [ ] **C2.1** `EmailAddressSelector.tsx` erstellen
  - [ ] Email-Adressen laden via `emailAddressService.getByOrganization()`
  - [ ] Nur aktive Adressen anzeigen
  - [ ] Auto-Select default address
  - [ ] Reply-To generieren bei Auswahl
  - [ ] Info-Box mit Verwendungszweck
  - [ ] Preview der gewählten Adresse

- [ ] **C2.2** `ContactInfoSelector.tsx` erstellen (refactored SenderSelector)
  - [ ] CRM-Kontakte laden
  - [ ] Typ-Auswahl (contact/manual)
  - [ ] Info-Box: "Nur für Signatur/Variablen"
  - [ ] Formulare für manuelle Eingabe
  - [ ] Validierung

- [ ] **C2.3** Components testen mit Storybook (optional)

**Datei-Struktur:**
```
src/components/pr/email/
├── EmailAddressSelector.tsx       [NEU]
├── ContactInfoSelector.tsx        [NEU]
├── SenderSelector.tsx             [LÖSCHEN später]
├── Step2RecipientsAndSender.tsx   [UPDATE]
└── Step3Preview.tsx               [MINOR UPDATE]
```

---

### Phase 3: Step2 Component Integration ✅

- [ ] **I3.1** `Step2RecipientsAndSender.tsx` anpassen
  - [ ] Import neue Komponenten
  - [ ] UI-Layout anpassen (3 Sektionen)
  - [ ] Handler für `EmailAddressSelector`
  - [ ] Handler für `ContactInfoSelector`
  - [ ] State-Management anpassen

- [ ] **I3.2** Validierung in Step2 erweitern
  - [ ] Prüfe `emailAddressId` ist gesetzt
  - [ ] Prüfe `contactInfo.data` ist vollständig
  - [ ] Error-Messages anpassen

- [ ] **I3.3** UI/UX Testing
  - [ ] Email-Adresse auswählen
  - [ ] Kontakt auswählen
  - [ ] Manuell eingeben
  - [ ] Zwischen Typen wechseln
  - [ ] Validierungs-Fehler prüfen

**Test-Cases:**
```typescript
// Test-Case 1: Email-Adresse Auswahl
- User wählt "presse@sk-online-marketing.de"
- Expected: emailAddressId ist gesetzt
- Expected: replyTo ist generiert

// Test-Case 2: Kontakt-Auswahl
- User wählt CRM-Kontakt "Martin Mart Stork"
- Expected: contactInfo.type === 'contact'
- Expected: contactInfo.contactId ist gesetzt
- Expected: contactInfo.data enthält alle Felder

// Test-Case 3: Manuelle Eingabe
- User wählt "Manuell eingeben"
- Expected: contactInfo.type === 'manual'
- Expected: Formular ist angezeigt
- Expected: Daten werden in contactInfo.data gespeichert

// Test-Case 4: Validierung
- User wählt keine Email-Adresse
- Expected: Error "Keine Email-Adresse ausgewählt"
```

---

### Phase 4: Services anpassen ✅

- [ ] **S4.1** `email-sender-service.ts` anpassen
  - [ ] `sendSingleEmail()`: Verwende `EmailSenderConfig`
  - [ ] FROM aus `sender.emailAddress.email`
  - [ ] Reply-To aus `sender.emailAddress.replyTo`
  - [ ] Variablen aus `sender.contactInfo.data`
  - [ ] Custom Headers hinzufügen
  - [ ] `updateEmailAddressStats()` aufrufen

- [ ] **S4.2** `email-composer-service.ts` anpassen
  - [ ] `prepareVariables()`: Parameter ändern zu `contactInfo`
  - [ ] `mergeEmailFields()`: Verwende `draft.sender.contactInfo.data`
  - [ ] `buildSignature()`: Verwende `contactInfo`

- [ ] **S4.3** `email-service.ts` anpassen
  - [ ] `sendTestEmail()`: Type anpassen
  - [ ] `generatePreview()`: contactInfo verwenden

- [ ] **S4.4** `email-sender-migration.ts` erstellen
  - [ ] `migrateSenderInfo()` implementieren
  - [ ] Tests für Migration

**Code-Validierung:**
```typescript
// Vor dem Versand prüfen:
console.log('📧 Email-Konfiguration:', {
  from: {
    email: sender.emailAddress.email,        // ✅ Verifiziert?
    name: sender.emailAddress.displayName
  },
  replyTo: {
    email: sender.emailAddress.replyTo,      // ✅ Generiert?
    name: sender.contactInfo.data.name
  },
  contactInfo: sender.contactInfo.data       // ✅ Vollständig?
});
```

---

### Phase 5: API Routes anpassen ✅

- [ ] **A5.1** `/api/pr/email/send/route.ts` anpassen
  - [ ] Type-Validierung für `EmailSenderConfig`
  - [ ] `emailAddressId` Validierung
  - [ ] EmailAddress existiert und ist aktiv
  - [ ] EmailAddress gehört zur Organization
  - [ ] `contactInfo` ist vollständig
  - [ ] Error-Handling verbessern

- [ ] **A5.2** `/api/email/test/route.ts` anpassen
  - [ ] Type anpassen (minor)
  - [ ] Logging verbessern

- [ ] **A5.3** API Tests
  - [ ] Test mit valider EmailAddress
  - [ ] Test mit inaktiver EmailAddress
  - [ ] Test mit fremder EmailAddress (403)
  - [ ] Test mit fehlender contactInfo

**Test-API-Calls:**
```bash
# Test 1: Valider Request
curl -X POST /api/pr/email/send \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "campaignId": "abc123",
    "organizationId": "org456",
    "draft": {
      "sender": {
        "emailAddressId": "email789",
        "emailAddress": {
          "email": "presse@sk-online-marketing.de",
          "displayName": "Pressestelle",
          "replyTo": "presse-RvDj...@inbox.sk-online-marketing.de"
        },
        "contactInfo": {
          "type": "contact",
          "contactId": "contact123",
          "data": {
            "name": "Martin Mart Stork",
            "email": "mart@blondnetzwerk.de",
            "title": "PR Manager",
            "company": "Blondnetzwerk GmbH",
            "phone": "+49 123 456789"
          }
        }
      }
    },
    "sendImmediately": true
  }'

# Expected: 200 OK, Email versendet

# Test 2: Fehlende EmailAddress
curl -X POST /api/pr/email/send \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "draft": {
      "sender": {
        "emailAddressId": "",
        ...
      }
    }
  }'

# Expected: 400 Bad Request, "Keine Email-Adresse ausgewählt"
```

---

### Phase 6: Testing & Validierung ✅

- [ ] **V6.1** Unit Tests
  - [ ] `EmailAddressSelector` Component Tests
  - [ ] `ContactInfoSelector` Component Tests
  - [ ] `emailSenderService.sendSingleEmail()` Tests
  - [ ] Migration Helper Tests

- [ ] **V6.2** Integration Tests
  - [ ] Kompletter Flow: Step1 → Step2 → Step3 → Send
  - [ ] Test-Email Versand
  - [ ] Echter Email-Versand
  - [ ] Scheduled Email

- [ ] **V6.3** E2E Tests
  - [ ] User-Flow: Campaign erstellen → Email senden
  - [ ] Error-Handling
  - [ ] Edge-Cases

**Test-Scenarios:**
```typescript
describe('Email-Absender-System', () => {

  it('sollte Email mit verifizierter Adresse versenden', async () => {
    // 1. Email-Adresse erstellen
    const emailAddress = await emailAddressService.create({
      localPart: 'presse',
      domainId: 'domain123',
      displayName: 'Pressestelle',
      isActive: true
    }, organizationId, userId);

    // 2. Draft mit EmailSenderConfig erstellen
    const draft = {
      sender: {
        emailAddressId: emailAddress.id,
        emailAddress: {
          email: emailAddress.email,
          displayName: emailAddress.displayName,
          replyTo: emailAddressService.generateReplyToAddress(emailAddress)
        },
        contactInfo: {
          type: 'manual',
          data: {
            name: 'Test User',
            email: 'test@example.com',
            company: 'Test GmbH'
          }
        }
      }
    };

    // 3. Email versenden
    const result = await emailSenderService.sendToRecipients(
      draft.recipients,
      preparedData,
      draft.sender,
      draft.metadata
    );

    // 4. Validierung
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
  });

  it('sollte Fehler werfen bei unverifyierter Email', async () => {
    const draft = {
      sender: {
        emailAddressId: 'invalid-id',
        // ...
      }
    };

    await expect(
      emailSenderService.sendToRecipients(...)
    ).rejects.toThrow('Email-Adresse nicht gefunden');
  });
});
```

---

### Phase 7: Migration bestehender Daten ✅

- [ ] **M7.1** Migration Script erstellen
  - [ ] Lade alle bestehenden Drafts
  - [ ] Migriere `SenderInfo` zu `EmailSenderConfig`
  - [ ] Update Firestore Documents
  - [ ] Logging & Error-Handling

- [ ] **M7.2** Migration ausführen
  - [ ] Backup erstellen
  - [ ] Script auf Test-Daten ausführen
  - [ ] Script auf Produktions-Daten ausführen
  - [ ] Validierung

- [ ] **M7.3** Cleanup
  - [ ] `SenderSelector.tsx` löschen
  - [ ] Alte API Route deprecaten
  - [ ] Type `SenderInfo` entfernen

**Migration Script:**
```typescript
// scripts/migrate-sender-info.ts

import { adminDb } from '@/lib/firebase/admin-init';
import { migrateSenderInfo } from '@/lib/email/email-sender-migration';

async function migrateDrafts() {
  console.log('🔄 Starte Migration von Email-Drafts...');

  const draftsRef = adminDb.collection('email_drafts');
  const snapshot = await draftsRef.get();

  let migratedCount = 0;
  let errorCount = 0;

  for (const doc of snapshot.docs) {
    try {
      const draft = doc.data();

      // Prüfe ob Migration nötig
      if (!draft.sender.emailAddressId) {
        const migratedSender = await migrateSenderInfo(
          draft.sender,
          draft.organizationId,
          draft.userId
        );

        await doc.ref.update({
          sender: migratedSender,
          migratedAt: new Date()
        });

        migratedCount++;
        console.log(`✅ Migriert: ${doc.id}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Fehler bei ${doc.id}:`, error);
    }
  }

  console.log(`\n📊 Migration abgeschlossen:`);
  console.log(`   Migriert: ${migratedCount}`);
  console.log(`   Fehler: ${errorCount}`);
}

migrateDrafts();
```

---

### Phase 8: Dokumentation & Deployment ✅

- [ ] **D8.1** Code-Dokumentation
  - [ ] JSDoc für alle neuen Funktionen
  - [ ] README für neue Komponenten
  - [ ] API-Dokumentation aktualisieren

- [ ] **D8.2** User-Dokumentation
  - [ ] Email-Address Setup Guide
  - [ ] Sender Configuration Guide
  - [ ] Troubleshooting Guide

- [ ] **D8.3** Deployment
  - [ ] Feature-Branch erstellen
  - [ ] Code-Review
  - [ ] QA Testing
  - [ ] Staging Deployment
  - [ ] Production Deployment

**Deployment Checklist:**
```
Pre-Deployment:
□ Alle Tests grün
□ Code-Review durchgeführt
□ Migration Script bereit
□ Backup erstellt
□ Rollback-Plan vorhanden

Deployment:
□ Feature-Flag aktivieren (optional)
□ Migration Script ausführen
□ Deployment auf Staging
□ Smoke Tests auf Staging
□ Deployment auf Production

Post-Deployment:
□ Monitoring prüfen
□ Error-Logs prüfen
□ User-Feedback sammeln
□ Performance-Metrics prüfen
```

---

## Zusammenfassung

### Das Problem

Der aktuelle Email-Absender-Workflow verwendet **unverifizierte CRM-Kontakt-Emails** als FROM-Adresse, was zu SendGrid "403 Forbidden" Fehlern führt.

### Die Lösung

**Klare Trennung** zwischen:
1. **Email-Adresse (FROM)**: Verifizierte Adresse aus `email_addresses` Collection
2. **Kontakt-Info (Signatur)**: CRM-Kontakt oder manuelle Eingabe für Variablen/Signatur

### Wichtigste Änderungen

1. **Neuer Type** `EmailSenderConfig` trennt Email-Adresse von Kontakt-Info
2. **Neue Komponenten**:
   - `EmailAddressSelector` für verifizierte Email-Adressen
   - `ContactInfoSelector` für Ansprechpartner-Daten
3. **Email-Versand** verwendet korrekt:
   - FROM: `emailAddress.email` (verifiziert)
   - Reply-To: `emailAddress.replyTo` (komplex generiert)
   - Variablen: `contactInfo.data` (nur für Signatur)

### Nächste Schritte

1. ✅ **Phase 1**: Type-Definitionen anpassen
2. ✅ **Phase 2**: Neue Komponenten erstellen
3. ✅ **Phase 3**: Step2 integrieren
4. ✅ **Phase 4**: Services anpassen
5. ✅ **Phase 5**: API Routes anpassen
6. ✅ **Phase 6**: Testen
7. ✅ **Phase 7**: Migration
8. ✅ **Phase 8**: Deployment

---

**Ende der Analyse** | Erstellt: 2025-11-13 | Version: 1.0
