# Panel Integration - Strategie

## Übersicht

Schrittweise Integration des Hilfe-Panels in alle Bereiche der App.

## Integrations-Phasen

### Phase 1: Foundation (Woche 1)

```
□ HelpProvider ins Root-Layout einbinden
□ HelpButton global verfügbar machen
□ HelpPanel Basis-Komponente
□ API-Route für Hilfe-Content
□ Erste 5 Seiten-Mappings in Sanity
```

**Ziel-Seiten Phase 1:**
- `/dashboard` (Startseite)
- `/dashboard/pr-tools/campaigns` (Kampagnen-Liste)
- `/dashboard/pr-tools/campaigns/edit/*` (Kampagnen-Editor)
- `/dashboard/crm/contacts` (Kontakte-Liste)
- `/dashboard/settings/team` (Team-Einstellungen)

### Phase 2: PR-Tools (Woche 2)

```
□ Alle PR-Tools Seiten mappen
□ Content in Sanity erstellen
□ Videos einbinden
```

**Seiten:**
- `/dashboard/pr-tools/approvals`
- `/dashboard/pr-tools/calendar`
- `/dashboard/pr-tools/media`
- `/dashboard/pr-tools/textbausteine`
- Alle Unterseiten

### Phase 3: CRM & Library (Woche 3)

```
□ CRM-Bereich vollständig
□ Bibliothek vollständig
□ Projekte vollständig
```

**Seiten:**
- `/dashboard/crm/*`
- `/dashboard/library/*`
- `/dashboard/projects/*`

### Phase 4: Settings & Admin (Woche 4)

```
□ Alle Einstellungen
□ Admin-Center
□ Communication
□ QA & Testing
```

**Seiten:**
- `/dashboard/settings/*`
- `/dashboard/admin/*`
- `/dashboard/communication/*`

## Seiten-Mapping Übersicht

### Dashboard-Bereiche

| Bereich | Routen | Priorität | Status |
|---------|--------|-----------|--------|
| **Dashboard** | | | |
| Startseite | `/dashboard` | 🔴 Hoch | ⬜ |
| **PR-Tools** | | | |
| Kampagnen Liste | `/dashboard/pr-tools/campaigns` | 🔴 Hoch | ⬜ |
| Kampagne Erstellen | `/dashboard/pr-tools/campaigns/new` | 🔴 Hoch | ⬜ |
| Kampagne Bearbeiten | `/dashboard/pr-tools/campaigns/edit/*` | 🔴 Hoch | ⬜ |
| Freigaben | `/dashboard/pr-tools/approvals` | 🟡 Mittel | ⬜ |
| Kalender | `/dashboard/pr-tools/calendar` | 🟡 Mittel | ⬜ |
| Mediathek | `/dashboard/pr-tools/media` | 🟡 Mittel | ⬜ |
| Textbausteine | `/dashboard/pr-tools/textbausteine` | 🟢 Niedrig | ⬜ |
| **CRM** | | | |
| Kontakte | `/dashboard/crm/contacts` | 🔴 Hoch | ⬜ |
| Kontakt Detail | `/dashboard/crm/contacts/*` | 🟡 Mittel | ⬜ |
| Unternehmen | `/dashboard/crm/companies` | 🟡 Mittel | ⬜ |
| Unternehmen Detail | `/dashboard/crm/companies/*` | 🟡 Mittel | ⬜ |
| Verteilerlisten | `/dashboard/crm/lists` | 🟡 Mittel | ⬜ |
| Liste Detail | `/dashboard/crm/lists/*` | 🟡 Mittel | ⬜ |
| **Bibliothek** | | | |
| Publikationen | `/dashboard/library/publications` | 🟡 Mittel | ⬜ |
| Werbemittel | `/dashboard/library/marketing` | 🟢 Niedrig | ⬜ |
| **Projekte** | | | |
| Übersicht | `/dashboard/projects` | 🟡 Mittel | ⬜ |
| Projekt Detail | `/dashboard/projects/*` | 🟡 Mittel | ⬜ |
| **Kommunikation** | | | |
| Inbox | `/dashboard/communication/inbox` | 🟢 Niedrig | ⬜ |
| Benachrichtigungen | `/dashboard/communication/notifications` | 🟢 Niedrig | ⬜ |
| **Einstellungen** | | | |
| Team | `/dashboard/settings/team` | 🔴 Hoch | ⬜ |
| E-Mail | `/dashboard/settings/email` | 🔴 Hoch | ⬜ |
| Branding | `/dashboard/settings/branding` | 🟡 Mittel | ⬜ |
| Domains | `/dashboard/settings/domains` | 🟡 Mittel | ⬜ |
| Benachrichtigungen | `/dashboard/settings/notifications` | 🟢 Niedrig | ⬜ |
| Import/Export | `/dashboard/settings/import-export` | 🟢 Niedrig | ⬜ |
| **Admin** | | | |
| Profil | `/dashboard/admin/profile` | 🟡 Mittel | ⬜ |
| Vertrag | `/dashboard/admin/contract` | 🟡 Mittel | ⬜ |
| API | `/dashboard/admin/api` | 🟢 Niedrig | ⬜ |

## Route-Matching Strategie

### Exaktes Matching

```
Route: /dashboard/pr-tools/campaigns
→ Mapping: /dashboard/pr-tools/campaigns
```

### Wildcard Matching

```
Route: /dashboard/pr-tools/campaigns/edit/abc123
→ Mapping: /dashboard/pr-tools/campaigns/edit/*
```

### Fallback-Hierarchie

```
1. Exakte Route suchen
2. Wildcard-Route suchen
3. Parent-Route suchen
4. Bereichs-Default verwenden
5. Globaler Fallback
```

### Implementierung

```typescript
// lib/help/routeMatcher.ts
export function findHelpMapping(route: string, mappings: HelpPageMapping[]) {
  // 1. Exaktes Match
  const exact = mappings.find(m => m.routes.includes(route));
  if (exact) return exact;

  // 2. Wildcard Match
  const wildcard = mappings.find(m =>
    m.routes.some(r => {
      if (!r.includes('*')) return false;
      const pattern = r.replace('*', '.*');
      return new RegExp(`^${pattern}$`).test(route);
    })
  );
  if (wildcard) return wildcard;

  // 3. Parent Route
  const parentRoute = route.substring(0, route.lastIndexOf('/'));
  if (parentRoute) {
    return findHelpMapping(parentRoute, mappings);
  }

  // 4. Fallback
  return mappings.find(m => m.routes.includes('*'));
}
```

## Content-Erstellung Workflow

### Für jede neue Seite

```
1. Hilfe-Artikel in Sanity erstellen
   └── Titel, Inhalt, Tipps, Videos

2. Seiten-Zuordnung erstellen
   └── Route(n) angeben
   └── Artikel verknüpfen
   └── Quick-Tipps hinzufügen
   └── Feature-Video auswählen

3. Preview testen
   └── Seite öffnen
   └── F1 drücken
   └── Panel prüfen

4. Publish in Sanity
```

### Checkliste pro Seite

```markdown
## [Seitenname]

Route: /dashboard/...

- [ ] Hilfe-Artikel existiert
- [ ] Artikel hat Inhalt (DE)
- [ ] Artikel hat Inhalt (EN)
- [ ] 2-5 Quick-Tipps definiert
- [ ] Video vorhanden (optional)
- [ ] Seiten-Mapping erstellt
- [ ] Preview getestet
- [ ] Published
```

## Tracking & Analytics

### Events tracken

```typescript
// Hilfe-Panel Nutzung tracken
interface HelpEvent {
  action: 'open' | 'close' | 'article_click' | 'video_play' | 'support_click';
  route: string;
  articleSlug?: string;
  timestamp: Date;
}

// In HelpContext
const trackHelpEvent = (action: HelpEvent['action']) => {
  // Analytics Event senden
  analytics.track('help_panel', {
    action,
    route: pathname,
    articleSlug: content?.mainArticle?.slug,
  });
};
```

### Metriken

| Metrik | Beschreibung |
|--------|--------------|
| Panel Opens | Wie oft wird Hilfe geöffnet? |
| Top Routes | Welche Seiten brauchen am meisten Hilfe? |
| Article Clicks | Welche Artikel werden angeklickt? |
| Video Views | Welche Videos werden geschaut? |
| Support Clicks | Wie oft wird Support kontaktiert? |

## Qualitätssicherung

### Automatisierte Tests

```typescript
// tests/help-panel.test.ts
describe('HelpPanel', () => {
  it('opens on F1 keypress', () => { ... });
  it('closes on Escape', () => { ... });
  it('loads content for route', () => { ... });
  it('shows fallback when no content', () => { ... });
});
```

### Manuelle QA Checkliste

```
□ Panel öffnet auf allen Seiten
□ Content lädt korrekt
□ Tipps werden angezeigt
□ Video-Thumbnail lädt
□ Links funktionieren
□ Support-Button funktioniert
□ Keyboard-Navigation
□ Mobile-Ansicht
□ Beide Sprachen getestet
```

## Rollout-Plan

### Soft Launch

1. Feature-Flag aktivieren
2. Internes Team testet
3. Feedback sammeln
4. Bugs fixen

### Public Launch

1. Feature-Flag für alle
2. Announcement (Changelog)
3. Tutorial-Video
4. Monitoring

## Nächste Schritte

- [ ] Phase 1 Komponenten fertigstellen
- [ ] Erste 5 Seiten-Mappings in Sanity
- [ ] Content für Phase 1 erstellen
- [ ] Integration testen
- [ ] Phase 2-4 nach Plan
