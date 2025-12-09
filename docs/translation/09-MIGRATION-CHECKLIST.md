# UI-Migration Checklist

**Status:** In Bearbeitung
**Zuletzt aktualisiert:** 2025-12-09

---

## Übersicht

Diese Checklist trackt die Migration aller UI-Komponenten auf next-intl i18n.

**Vorgehen:**
1. 3-4 `i18n-migration` Agenten parallel starten
2. Jeder Agent bearbeitet eine Seite/Komponente
3. Nach Abschluss hier abhaken
4. Nächste Runde starten

---

## Priorität 1: Globale Komponenten

Diese werden überall verwendet - Keys landen in `common` Namespace.

| Status | Datei | Beschreibung | Agent |
|--------|-------|--------------|-------|
| ⬜ | `src/components/DashboardNav.tsx` | Haupt-Navigation | - |
| ⬜ | `src/components/Sidebar.tsx` | Sidebar (falls vorhanden) | - |
| ⬜ | `src/components/SettingsNav.tsx` | Settings-Navigation | - |
| ⬜ | `src/components/ui/dialog.tsx` | Dialog-Komponente | - |
| ⬜ | `src/components/ui/dropdown.tsx` | Dropdown-Menüs | - |

---

## Priorität 2: Dashboard & Übersichtsseiten

Häufig genutzte Einstiegsseiten.

| Status | Datei | Namespace | Agent |
|--------|-------|-----------|-------|
| ⬜ | `src/app/dashboard/page.tsx` | `dashboard` | - |
| ⬜ | `src/app/dashboard/projects/page.tsx` | `projects` | - |
| ⬜ | `src/app/dashboard/contacts/crm/page.tsx` | `crm` | - |
| ⬜ | `src/app/dashboard/contacts/crm/contacts/page.tsx` | `contacts` | - |
| ⬜ | `src/app/dashboard/contacts/crm/companies/page.tsx` | `companies` | - |
| ⬜ | `src/app/dashboard/contacts/lists/page.tsx` | `lists` | - |

---

## Priorität 3: PR-Tools & Kampagnen

Kernfunktionalität der App.

| Status | Datei | Namespace | Agent |
|--------|-------|-----------|-------|
| ⬜ | `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx` | `campaigns` | - |
| ⬜ | `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx` | `campaigns` | - |
| ⬜ | `src/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/page.tsx` | `campaigns` | - |
| ⬜ | `src/components/pr/campaign/*.tsx` | `campaigns` | - |
| ⬜ | `src/components/pr/email/*.tsx` | `email` | - |

---

## Priorität 4: Mediathek & Library

| Status | Datei | Namespace | Agent |
|--------|-------|-----------|-------|
| ⬜ | `src/app/dashboard/library/media/page.tsx` | `media` | - |
| ⬜ | `src/app/dashboard/library/publications/page.tsx` | `publications` | - |
| ⬜ | `src/app/dashboard/library/boilerplates/page.tsx` | `boilerplates` | - |
| ⬜ | `src/app/dashboard/library/editors/page.tsx` | `editors` | - |

---

## Priorität 5: Monitoring & Analytics

| Status | Datei | Namespace | Agent |
|--------|-------|-----------|-------|
| ⬜ | `src/app/dashboard/analytics/monitoring/page.tsx` | `monitoring` | - |
| ⬜ | `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx` | `monitoring` | - |
| ⬜ | `src/app/dashboard/analytics/reporting/page.tsx` | `reporting` | - |
| ⬜ | `src/components/monitoring/*.tsx` | `monitoring` | - |

---

## Priorität 6: Settings

| Status | Datei | Namespace | Agent |
|--------|-------|-----------|-------|
| ✅ | `src/app/dashboard/settings/language/page.tsx` | `settings.language` | (bereits) |
| ⬜ | `src/app/dashboard/settings/team/page.tsx` | `settings.team` | - |
| ⬜ | `src/app/dashboard/settings/branding/page.tsx` | `settings.branding` | - |
| ⬜ | `src/app/dashboard/settings/email/page.tsx` | `settings.email` | - |
| ⬜ | `src/app/dashboard/settings/notifications/page.tsx` | `settings.notifications` | - |
| ⬜ | `src/app/dashboard/settings/templates/page.tsx` | `settings.templates` | - |
| ⬜ | `src/app/dashboard/settings/monitoring/page.tsx` | `settings.monitoring` | - |
| ⬜ | `src/app/dashboard/settings/domain/page.tsx` | `settings.domain` | - |
| ⬜ | `src/app/dashboard/settings/import-export/page.tsx` | `settings.import` | - |
| ⬜ | `src/app/dashboard/settings/spam-blocklist/page.tsx` | `settings.spam` | - |

---

## Priorität 7: Admin & Billing

| Status | Datei | Namespace | Agent |
|--------|-------|-----------|-------|
| ⬜ | `src/app/dashboard/admin/profile/page.tsx` | `admin.profile` | - |
| ⬜ | `src/app/dashboard/admin/billing/page.tsx` | `admin.billing` | - |
| ⬜ | `src/app/dashboard/admin/integrations/page.tsx` | `admin.integrations` | - |
| ⬜ | `src/app/dashboard/admin/api/page.tsx` | `admin.api` | - |

---

## Priorität 8: Detail-Seiten

| Status | Datei | Namespace | Agent |
|--------|-------|-----------|-------|
| ⬜ | `src/app/dashboard/projects/[projectId]/page.tsx` | `projects` | - |
| ⬜ | `src/app/dashboard/contacts/crm/contacts/[contactId]/page.tsx` | `contacts` | - |
| ⬜ | `src/app/dashboard/contacts/crm/companies/[companyId]/page.tsx` | `companies` | - |
| ⬜ | `src/app/dashboard/contacts/lists/[listId]/page.tsx` | `lists` | - |
| ⬜ | `src/app/dashboard/library/publications/[publicationId]/page.tsx` | `publications` | - |

---

## Priorität 9: Sonstige

| Status | Datei | Namespace | Agent |
|--------|-------|-----------|-------|
| ⬜ | `src/app/dashboard/communication/inbox/page.tsx` | `inbox` | - |
| ⬜ | `src/app/dashboard/communication/notifications/page.tsx` | `notifications` | - |
| ⬜ | `src/app/dashboard/academy/documentation/page.tsx` | `academy` | - |
| ⬜ | `src/app/dashboard/strategy-documents/[documentId]/page.tsx` | `strategy` | - |

---

## Priorität 10: Super-Admin (niedrigste Priorität)

| Status | Datei | Namespace | Agent |
|--------|-------|-----------|-------|
| ⬜ | `src/app/dashboard/super-admin/organizations/page.tsx` | `superadmin` | - |
| ⬜ | `src/app/dashboard/super-admin/accounts/page.tsx` | `superadmin` | - |
| ⬜ | `src/app/dashboard/super-admin/monitoring/page.tsx` | `superadmin` | - |
| ⬜ | `src/app/dashboard/super-admin/settings/page.tsx` | `superadmin` | - |
| ⬜ | `src/app/dashboard/super-admin/matching/*.tsx` | `superadmin` | - |

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ⬜ | Noch nicht begonnen |
| 🔄 | In Bearbeitung |
| ✅ | Abgeschlossen |
| ⏭️ | Übersprungen (nicht nötig) |

---

## Statistik

- **Gesamt:** ~55 Seiten
- **Abgeschlossen:** 1
- **In Bearbeitung:** 0
- **Ausstehend:** ~54

---

## Hinweise

1. **Toasts nicht migrieren** - Der Toast-Service wird separat behandelt
2. **Existierende Keys nutzen** - Vor dem Anlegen neuer Keys `messages/de.json` prüfen
3. **Beide Dateien synchron** - Immer `de.json` UND `en.json` gleichzeitig aktualisieren
4. **TypeScript-Check** - Nach jeder Migration `npm run type-check` ausführen
