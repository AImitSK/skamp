# Toast Service Internationalisierung

**Status:** Konzept
**Priorität:** Mittel (nach UI-Migration)
**Zuletzt aktualisiert:** 2025-12-10

---

## Übersicht

Der Toast-Service (`src/lib/utils/toast.ts`) wird von **91 Dateien** mit hardcodierten deutschen Texten aufgerufen. Diese müssen migriert werden, damit Toasts in der gewählten UI-Sprache angezeigt werden.

---

## Gewählter Ansatz: Übersetzung im aufrufenden Code

### Warum dieser Ansatz?

| Kriterium | Bewertung |
|-----------|-----------|
| **Explizit** | ✅ Man sieht sofort, dass übersetzt wird |
| **Standard-Pattern** | ✅ Entspricht next-intl Best Practices |
| **Keine Magie** | ✅ Service bleibt simpel, keine globalen States |
| **Type-Safe** | ✅ TypeScript validiert Keys |
| **Testbar** | ✅ Einfach zu unit-testen |

### Alternatives (abgelehntes) Konzept

Ein "intelligenter" Toast-Service, der Keys automatisch erkennt, wurde verworfen weil:
- React Hooks können nicht außerhalb von Komponenten verwendet werden
- Globaler Translation-State ist fehleranfällig
- Versteckte Logik erschwert Debugging

---

## Migrations-Pattern

### Vorher (aktuell)

```typescript
// Ohne Übersetzung
toastService.success('Erfolgreich gespeichert');
toastService.error('Fehler beim Laden der Daten');
toastService.info('Änderungen werden verarbeitet...');
```

### Nachher (migriert)

```typescript
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('toasts');

  // Einfache Meldungen
  toastService.success(t('saved'));
  toastService.error(t('loadError'));
  toastService.info(t('processing'));

  // Mit Variablen
  toastService.success(t('contactCreated', { name: contact.name }));
  toastService.error(t('deleteError', { item: 'Kontakt' }));
}
```

---

## Toast-Keys Namespace

### Bestehende Keys in `messages/de.json`

```json
{
  "toasts": {
    "saved": "Erfolgreich gespeichert",
    "deleted": "Erfolgreich gelöscht",
    "error": "Ein Fehler ist aufgetreten",
    "loadError": "Fehler beim Laden",
    "saveError": "Fehler beim Speichern",
    "deleteError": "Fehler beim Löschen",
    "networkError": "Netzwerkfehler",
    "unauthorized": "Nicht autorisiert",
    "notFound": "Nicht gefunden",
    "validationError": "Validierungsfehler",
    "uploadSuccess": "Upload erfolgreich",
    "uploadError": "Upload fehlgeschlagen",
    "downloadStarted": "Download gestartet",
    "copySuccess": "In Zwischenablage kopiert",
    "emailSent": "E-Mail versendet",
    "emailError": "E-Mail-Versand fehlgeschlagen",
    "loginSuccess": "Erfolgreich angemeldet",
    "logoutSuccess": "Erfolgreich abgemeldet",
    "passwordChanged": "Passwort geändert",
    "profileUpdated": "Profil aktualisiert",
    "settingsSaved": "Einstellungen gespeichert",
    "inviteSent": "Einladung versendet",
    "memberRemoved": "Mitglied entfernt",
    "roleChanged": "Rolle geändert",
    "contactCreated": "Kontakt erstellt",
    "contactUpdated": "Kontakt aktualisiert",
    "contactDeleted": "Kontakt gelöscht",
    "companyCreated": "Firma erstellt",
    "companyUpdated": "Firma aktualisiert",
    "companyDeleted": "Firma gelöscht",
    "listCreated": "Liste erstellt",
    "listUpdated": "Liste aktualisiert",
    "listDeleted": "Liste gelöscht",
    "campaignCreated": "Kampagne erstellt",
    "campaignUpdated": "Kampagne aktualisiert",
    "campaignDeleted": "Kampagne gelöscht",
    "translationStarted": "Übersetzung gestartet",
    "translationComplete": "Übersetzung abgeschlossen"
  }
}
```

### Neue Keys hinzufügen

Bei der Migration werden weitere spezifische Keys benötigt. Diese sollten dem Pattern folgen:

```
toasts.{aktion}{Objekt}     → toasts.contactCreated
toasts.{aktion}Error        → toasts.saveError
toasts.{kontext}.{aktion}   → toasts.monitoring.reportGenerated
```

---

## Betroffene Dateien (91 Stück)

### Priorität 1: Bereits migrierte Seiten (Toast hinzufügen)

Diese Seiten haben bereits `useTranslations` - nur Toast-Aufrufe anpassen:

| Datei | Toast-Aufrufe |
|-------|---------------|
| `src/app/dashboard/settings/spam-blocklist/page.tsx` | 3 |
| `src/app/dashboard/settings/monitoring/page.tsx` | 2 |
| `src/app/dashboard/settings/domain/page.tsx` | 4 |
| `src/app/dashboard/admin/billing/page.tsx` | 2 |
| `src/app/dashboard/settings/team/page.tsx` | 5 |
| `src/app/dashboard/settings/email/page.tsx` | 3 |
| `src/app/dashboard/settings/branding/page.tsx` | 2 |
| `src/app/dashboard/library/boilerplates/page.tsx` | 3 |
| `src/app/dashboard/library/publications/page.tsx` | 2 |
| `src/app/dashboard/library/editors/page.tsx` | 2 |
| `src/app/dashboard/library/media/page.tsx` | 3 |
| `src/app/dashboard/contacts/lists/page.tsx` | 3 |
| `src/app/dashboard/contacts/crm/contacts/page.tsx` | 4 |
| `src/app/dashboard/contacts/crm/companies/page.tsx` | 4 |
| `src/app/dashboard/projects/page.tsx` | 3 |
| `src/app/dashboard/settings/language/page.tsx` | 2 |
| `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx` | 2 |
| `src/app/dashboard/analytics/reporting/page.tsx` | 2 |

### Priorität 2: Komponenten

| Datei | Toast-Aufrufe |
|-------|---------------|
| `src/components/notifications/NotificationSettings.tsx` | 2 |
| `src/components/monitoring/AutoReportingModal.tsx` | 3 |
| `src/components/subscription/SubscriptionManagement.tsx` | 4 |
| `src/components/subscription/ChangePlanModal.tsx` | 2 |
| `src/components/subscription/CancelSubscriptionModal.tsx` | 2 |
| `src/components/projects/pressemeldungen/components/CampaignTableRow.tsx` | 3 |
| `src/components/projects/pressemeldungen/ProjectPressemeldungenTab.tsx` | 4 |
| `src/components/projects/kanban/card/index.tsx` | 2 |
| `src/components/pr/email/Step3Preview.tsx` | 5 |
| `src/components/campaigns/TranslationList.tsx` | 2 |
| `src/components/campaigns/TranslationEditModal.tsx` | 2 |
| `src/components/projects/ProjectTaskManager.tsx` | 3 |
| `src/components/projects/ProjectMonitoringTab.tsx` | 2 |
| `src/components/inbox/InternalNotes.tsx` | 2 |
| `src/components/projects/distribution/ProjectDistributionLists.tsx` | 3 |
| `src/components/campaigns/KeyVisualSection.tsx` | 2 |
| `src/components/pr/email/RecipientManager.tsx` | 2 |
| `src/components/inbox/ComposeEmail.tsx` | 3 |
| `src/components/projects/SpreadsheetEditorModal.tsx` | 2 |
| `src/components/monitoring/RecipientTrackingList.tsx` | 2 |
| `src/components/pr/ai/KeyVisualGenerator.tsx` | 2 |
| `src/components/projects/DocumentEditorModal.tsx` | 2 |
| `src/components/projects/communication/TeamChat/MessageItem.tsx` | 1 |
| `src/components/pr/email/EmailAddressSelector.tsx` | 2 |
| `src/components/pr/ai/StructuredGenerationModal.tsx` | 3 |
| `src/components/inbox/StatusManager.tsx` | 2 |
| `src/components/inbox/InboxAssetSelectorModal.tsx` | 2 |
| `src/components/pr/email/Step2Details.tsx` | 2 |
| `src/components/monitoring/PublicationSelector.tsx` | 2 |
| `src/components/pr/ai/HeadlineGenerator.tsx` | 2 |
| `src/components/projects/pressemeldungen/CampaignCreateModal.tsx` | 3 |
| `src/components/projects/tasks/TaskTemplateButton.tsx` | 2 |
| `src/components/projects/distribution/ListDetailsModal.tsx` | 3 |
| `src/components/projects/ProjectFoldersView.tsx` | 2 |
| `src/components/projects/workflow/PipelineProgressDashboard.tsx` | 2 |
| `src/components/mediathek/ShareModal.tsx` | 2 |

### Priorität 3: Detail-Seiten (noch nicht UI-migriert)

| Datei |
|-------|
| `src/app/dashboard/contacts/crm/companies/[companyId]/page.tsx` |
| `src/app/dashboard/contacts/crm/contacts/[contactId]/page.tsx` |
| `src/app/dashboard/communication/inbox/page.tsx` |
| `src/app/dashboard/library/publications/[publicationId]/page.tsx` |
| `src/app/dashboard/projects/[projectId]/page.tsx` |
| `src/app/dashboard/contacts/lists/[listId]/page.tsx` |
| `src/app/dashboard/library/boilerplates/BoilerplateModal.tsx` |
| `src/app/dashboard/library/media/UploadModal.tsx` |
| `src/app/dashboard/library/publications/PublicationModal/index.tsx` |
| `src/app/dashboard/library/publications/PublicationModal/MonitoringSection.tsx` |
| `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx` |
| `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/PreviewTab.tsx` |
| `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/context/CampaignContext.tsx` |
| `src/app/dashboard/projects/components/tables/ProjectTable.tsx` |

### Priorität 4: Hooks & Services

| Datei |
|-------|
| `src/lib/hooks/useMonitoringMutations.ts` |
| `src/lib/hooks/usePDFDeleteMutation.ts` |
| `src/lib/hooks/useMonitoringReport.ts` |
| `src/hooks/useProjectLists.ts` |
| `src/hooks/useListLinking.ts` |
| `src/hooks/useListExport.ts` |
| `src/components/pr/campaign/hooks/usePDFGeneration.ts` |
| `src/components/pr/ai/structured-generation/hooks/useStructuredGeneration.ts` |

**Hinweis zu Hooks:** Hooks können `useTranslations` direkt verwenden, da sie in React-Komponenten aufgerufen werden.

### Priorität 5: Test-Dateien (Optional)

Test-Dateien können übersprungen werden, da sie keine User-facing Toasts anzeigen.

---

## Migrations-Workflow

### Für jeden Agent-Aufruf:

1. **Datei lesen** und alle `toastService.*` Aufrufe finden
2. **Prüfen** ob `useTranslations` bereits importiert ist
3. **Import hinzufügen** falls nicht vorhanden:
   ```typescript
   import { useTranslations } from 'next-intl';
   ```
4. **Hook hinzufügen** in der Komponente:
   ```typescript
   const tToast = useTranslations('toasts');
   ```
5. **Toast-Aufrufe ersetzen:**
   ```typescript
   // Vorher
   toastService.success('Erfolgreich gespeichert');

   // Nachher
   toastService.success(tToast('saved'));
   ```
6. **Neue Keys** in `messages/de.json` und `messages/en.json` hinzufügen falls nicht vorhanden
7. **TypeScript-Check** ausführen

### Namenskonvention für Hook

Um Konflikte mit bestehendem `t` zu vermeiden:
- `tToast` für Toast-Übersetzungen
- Oder `t` erweitern wenn nur ein Namespace verwendet wird

---

## Beispiel-Migration

### Vorher

```typescript
'use client';

import { toastService } from '@/lib/utils/toast';

export function SettingsPage() {
  const handleSave = async () => {
    try {
      await saveSettings();
      toastService.success('Einstellungen gespeichert');
    } catch (error) {
      toastService.error('Fehler beim Speichern');
    }
  };

  return <button onClick={handleSave}>Speichern</button>;
}
```

### Nachher

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { toastService } from '@/lib/utils/toast';

export function SettingsPage() {
  const tToast = useTranslations('toasts');

  const handleSave = async () => {
    try {
      await saveSettings();
      toastService.success(tToast('settingsSaved'));
    } catch (error) {
      toastService.error(tToast('saveError'));
    }
  };

  return <button onClick={handleSave}>Speichern</button>;
}
```

---

## Aufwandsschätzung

| Kategorie | Dateien | Aufwand pro Datei | Gesamt |
|-----------|---------|-------------------|--------|
| Bereits migrierte Seiten | 18 | 5 min | 1.5h |
| Komponenten | 36 | 10 min | 6h |
| Detail-Seiten | 14 | 15 min | 3.5h |
| Hooks | 8 | 10 min | 1.5h |
| Neue Keys anlegen | - | - | 1h |
| **Gesamt** | **76** | | **~13.5h** |

Mit 4 parallelen Agenten: **~3-4 Runden**

---

## Agent-Konfiguration

Siehe `.claude/agents/toast-i18n-migration.md` für die Agent-Definition.

---

## Qualitätssicherung

Nach jeder Runde:
1. `npm run type-check` - TypeScript-Fehler prüfen
2. Stichproben-Test der migrierten Toasts
3. Prüfen ob alle neuen Keys in beiden Sprach-Dateien existieren

---

## Abhängigkeiten

- UI-Migration sollte weitgehend abgeschlossen sein (weniger Merge-Konflikte)
- `messages/de.json` und `messages/en.json` müssen synchron gehalten werden

