# System-Emails Internationalisierung

**Status:** Konzept
**Priorität:** Hoch (Kundenrelevant)
**Zuletzt aktualisiert:** 2025-12-10

---

## Übersicht

System-Emails sind automatisch versendete E-Mails für:
1. **Freigabe-Emails** - Approval-Anfragen und Status-Updates
2. **Reporting-Emails** - Automatische Monitoring-Reports

Diese müssen internationalisiert werden, damit englischsprachige Empfänger entsprechende Emails erhalten.

---

## 1. Freigabe-Emails (Approval Emails)

### Betroffene Templates

**Datei:** `src/lib/email/approval-email-templates.ts`

| Template-Funktion | Beschreibung | Priorität |
|-------------------|--------------|-----------|
| `getApprovalRequestEmailTemplate()` | Neue Freigabe-Anfrage | Hoch |
| `getApprovalReminderEmailTemplate()` | Erinnerung an Freigabe | Hoch |
| `getApprovalGrantedEmailTemplate()` | Freigabe erteilt | Mittel |
| `getChangesRequestedEmailTemplate()` | Änderungen angefordert | Mittel |
| `getApprovalStatusUpdateTemplate()` | Status-Update intern | Niedrig |
| `getApprovalDeadlineReminderTemplate()` | Deadline-Erinnerung | Mittel |
| `getApprovalReRequestEmailTemplate()` | Erneute Freigabe-Anfrage | Mittel |

### Aktuelle Struktur

```typescript
// Aktuell: Nur Deutsche Templates
export function getApprovalRequestEmailTemplate(params: ApprovalEmailParams) {
  return {
    subject: `Freigabe angefordert: ${params.campaignTitle}`,
    html: `
      <h1>Freigabe angefordert</h1>
      <p>Sehr geehrte(r) ${params.recipientName},</p>
      <p>Sie wurden um Freigabe für folgende Pressemitteilung gebeten:</p>
      ...
    `,
    text: `...`
  };
}
```

### Ziel-Struktur

```typescript
// NEU: Sprachabhängige Templates
export function getApprovalRequestEmailTemplate(
  params: ApprovalEmailParams,
  language: 'de' | 'en' = 'de'
) {
  const content = language === 'en'
    ? getApprovalRequestEnglish(params)
    : getApprovalRequestGerman(params);

  return {
    subject: content.subject,
    html: wrapInEmailLayout(content.html, params.branding, language),
    text: content.text
  };
}

function getApprovalRequestEnglish(params: ApprovalEmailParams) {
  return {
    subject: `Approval requested: ${params.campaignTitle}`,
    html: `
      <h1>Approval Requested</h1>
      <p>Dear ${params.recipientName},</p>
      <p>You have been asked to approve the following press release:</p>
      ...
    `,
    text: `...`
  };
}

function getApprovalRequestGerman(params: ApprovalEmailParams) {
  return {
    subject: `Freigabe angefordert: ${params.campaignTitle}`,
    html: `
      <h1>Freigabe angefordert</h1>
      <p>Sehr geehrte(r) ${params.recipientName},</p>
      <p>Sie wurden um Freigabe für folgende Pressemitteilung gebeten:</p>
      ...
    `,
    text: `...`
  };
}
```

### Implementierungsplan

#### Phase 1: Template-Struktur refactoren

1. **Interface für mehrsprachige Templates**
   ```typescript
   interface MultilingualEmailContent {
     subject: string;
     html: string;
     text: string;
   }

   interface EmailTemplateParams extends ApprovalEmailParams {
     language?: 'de' | 'en';
   }
   ```

2. **Separate Sprach-Funktionen**
   - `getApprovalRequestGerman()`
   - `getApprovalRequestEnglish()`
   - ... für jedes Template

#### Phase 2: Alle Templates übersetzen

| Template | Deutsche Version | Englische Version |
|----------|------------------|-------------------|
| Request | ✅ Existiert | ⬜ Erstellen |
| Reminder | ✅ Existiert | ⬜ Erstellen |
| Granted | ✅ Existiert | ⬜ Erstellen |
| Changes Requested | ✅ Existiert | ⬜ Erstellen |
| Status Update | ✅ Existiert | ⬜ Erstellen |
| Deadline Reminder | ✅ Existiert | ⬜ Erstellen |
| Re-Request | ✅ Existiert | ⬜ Erstellen |

#### Phase 3: API-Routes anpassen

**Datei:** `src/app/api/sendgrid/send-approval-email/route.ts`

```typescript
// NEU: Sprache aus Empfänger-Präferenz oder Projekt-Sprache
const getRecipientLanguage = async (
  recipientEmail: string,
  projectLanguage?: string
): Promise<'de' | 'en'> => {
  // 1. Empfänger-Präferenz prüfen (wenn verfügbar)
  // 2. Projekt-Sprache als Fallback
  // 3. Default: 'de'
  return projectLanguage === 'en' ? 'en' : 'de';
};
```

---

## 2. Reporting-Emails (Auto-Reporting)

### Betroffene Templates

**Datei:** `src/lib/email/auto-reporting-email-templates.ts`

| Template-Funktion | Beschreibung |
|-------------------|--------------|
| `getAutoReportEmailTemplate()` | Monatlicher/Wöchentlicher Report |
| `getAutoReportEmailTemplateWithBranding()` | Mit Branding-Integration |

### Aktuelle Struktur

```typescript
// Aktuell: Deutscher Text
export function getAutoReportEmailTemplate(params: AutoReportEmailParams) {
  return {
    subject: `Monitoring-Report: ${params.campaignTitle}`,
    html: `
      <h1>Ihr automatischer Monitoring-Report</h1>
      <p>Berichtszeitraum: ${params.period}</p>
      <p>Anbei finden Sie den aktuellen Report mit folgenden Inhalten:</p>
      <ul>
        <li>Medienresonanz und Clippings</li>
        <li>Email-Performance-Metriken</li>
        <li>Reichweiten-Analyse</li>
      </ul>
    `,
    text: `...`
  };
}
```

### Ziel-Struktur

```typescript
// NEU: Mehrsprachig
export function getAutoReportEmailTemplate(
  params: AutoReportEmailParams,
  language: 'de' | 'en' = 'de'
) {
  const content = language === 'en'
    ? {
        subject: `Monitoring Report: ${params.campaignTitle}`,
        heading: 'Your Automatic Monitoring Report',
        periodLabel: 'Report Period',
        contentIntro: 'Please find attached the current report including:',
        items: [
          'Media Coverage and Clippings',
          'Email Performance Metrics',
          'Reach Analysis'
        ]
      }
    : {
        subject: `Monitoring-Report: ${params.campaignTitle}`,
        heading: 'Ihr automatischer Monitoring-Report',
        periodLabel: 'Berichtszeitraum',
        contentIntro: 'Anbei finden Sie den aktuellen Report mit folgenden Inhalten:',
        items: [
          'Medienresonanz und Clippings',
          'Email-Performance-Metriken',
          'Reichweiten-Analyse'
        ]
      };

  return {
    subject: content.subject,
    html: `
      <h1>${content.heading}</h1>
      <p>${content.periodLabel}: ${params.period}</p>
      <p>${content.contentIntro}</p>
      <ul>
        ${content.items.map(item => `<li>${item}</li>`).join('')}
      </ul>
    `,
    text: `...`
  };
}
```

### API/CRON Anpassungen

**Datei:** `src/app/api/reporting/cron/route.ts`

```typescript
// NEU: Sprache pro Empfänger
const sendReportEmail = async (reporting: AutoReporting, recipient: string) => {
  // Sprache ermitteln
  const language = await getRecipientLanguage(recipient, reporting.language);

  // Template mit Sprache generieren
  const emailContent = await getAutoReportEmailTemplateWithBranding(
    {
      campaignTitle: reporting.campaignTitle,
      period: formatReportPeriod(reporting.frequency),
      // ...
    },
    reporting.organizationId,
    language
  );

  // Versenden
  await sendEmail(recipient, emailContent);
};
```

---

## 3. Datenmodell-Erweiterungen

### AutoReporting erweitern

**Datei:** `src/types/auto-reporting.ts`

```typescript
interface AutoReporting {
  // ... bestehende Felder
  language?: 'de' | 'en';  // Report-Sprache
}
```

### ApprovalShare erweitern

```typescript
interface ApprovalShare {
  // ... bestehende Felder
  language?: 'de' | 'en';  // Freigabe-Email-Sprache
}
```

---

## 4. Sprach-Ermittlung

### Strategie

Die Sprache für System-Emails wird wie folgt ermittelt:

1. **Empfänger-Präferenz** (höchste Priorität)
   - Falls Empfänger ein User ist: `user.preferences.language`

2. **Projekt/Kampagnen-Sprache**
   - `PRCampaign.language` oder `Project.language`

3. **Organisation-Default**
   - `organization.defaultLanguage`

4. **Fallback**
   - `'de'`

```typescript
async function getEmailLanguage(
  recipientEmail: string,
  projectId?: string,
  organizationId?: string
): Promise<'de' | 'en'> {
  // 1. User-Präferenz
  const user = await getUserByEmail(recipientEmail);
  if (user?.preferences?.language) {
    return user.preferences.language;
  }

  // 2. Projekt-Sprache
  if (projectId) {
    const project = await getProject(projectId);
    if (project?.language) {
      return project.language;
    }
  }

  // 3. Organisations-Default
  if (organizationId) {
    const org = await getOrganization(organizationId);
    if (org?.defaultLanguage) {
      return org.defaultLanguage;
    }
  }

  // 4. Fallback
  return 'de';
}
```

---

## 5. Betroffene Dateien - Vollständige Liste

### Templates

| Datei | Änderung |
|-------|----------|
| `src/lib/email/approval-email-templates.ts` | Englische Versionen aller 7 Templates |
| `src/lib/email/auto-reporting-email-templates.ts` | Englische Version |
| `src/lib/email/team-invitation-templates.ts` | Englische Version |

### API Routes

| Datei | Änderung |
|-------|----------|
| `src/app/api/sendgrid/send-approval-email/route.ts` | Language Parameter |
| `src/app/api/email/send-approval/route.ts` | Language Parameter |
| `src/app/api/reporting/cron/route.ts` | Language Parameter |

### Services

| Datei | Änderung |
|-------|----------|
| `src/lib/firebase/auto-reporting-service.ts` | Language Feld |

---

## 6. Test-Szenarien

### Freigabe-Emails

- [ ] Deutsche Freigabe-Anfrage
- [ ] Englische Freigabe-Anfrage
- [ ] Deutsche Erinnerung
- [ ] Englische Erinnerung
- [ ] Deutsche Status-Updates
- [ ] Englische Status-Updates

### Reporting-Emails

- [ ] Deutscher Report
- [ ] Englischer Report
- [ ] Korrekte Datumsformatierung pro Sprache
- [ ] PDF-Anhang unabhängig von Email-Sprache

### Sprach-Ermittlung

- [ ] User mit DE-Präferenz → Deutsche Email
- [ ] User mit EN-Präferenz → Englische Email
- [ ] User ohne Präferenz, deutsches Projekt → Deutsche Email
- [ ] User ohne Präferenz, englisches Projekt → Englische Email

---

## 7. Aufwandsschätzung

| Komponente | Aufwand |
|------------|---------|
| Approval Templates (7 Stück) übersetzen | 4h |
| Reporting Templates übersetzen | 1h |
| Team Invitation Templates übersetzen | 1h |
| Sprach-Ermittlung implementieren | 2h |
| API-Routes anpassen | 2h |
| Datenmodell-Erweiterungen | 1h |
| Tests | 3h |
| **Gesamt** | **~14h** |

---

## 8. Migration bestehender Daten

### AutoReporting

```typescript
// Migration: Default-Sprache setzen
await db.collection('auto_reporting')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      if (!doc.data().language) {
        doc.ref.update({ language: 'de' });
      }
    });
  });
```

---

## 9. Email-Layout Internationalisierung

### Footer

Der Email-Footer enthält auch Text, der übersetzt werden muss:

```typescript
const getEmailFooter = (language: 'de' | 'en', branding: EmailBranding) => {
  const content = language === 'en'
    ? {
        poweredBy: 'Powered by CeleroPress',
        unsubscribe: 'Unsubscribe from these notifications',
        contact: 'Contact'
      }
    : {
        poweredBy: 'Powered by CeleroPress',
        unsubscribe: 'Von diesen Benachrichtigungen abmelden',
        contact: 'Kontakt'
      };

  return `
    <footer>
      <p>${content.poweredBy}</p>
      <p><a href="#">${content.unsubscribe}</a></p>
      ${branding.email ? `<p>${content.contact}: ${branding.email}</p>` : ''}
    </footer>
  `;
};
```

---

## 10. Abhängigkeiten

- User-Präferenzen System (aus Phase 1)
- Projekt/Kampagnen-Sprache (aus KI-Assistent Erweiterung)
- SendGrid für Email-Versand

