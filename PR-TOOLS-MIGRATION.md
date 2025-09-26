# PR-Tools Migration Status

## Verbleibende pr-tools Referenzen

### 🔴 **Kritisch - Müssen migriert werden:**

1. **Media Library** (`/dashboard/pr-tools/media-library`)
   - Verwendet in: CompanyMediaSection, MediaUploadLink
   - Migration: Sollte nach `/dashboard/library/media` umziehen

2. **Calendar/Event Links**
   - EventDetailsModal: Links zu Kampagnen-Details
   - ApprovalWidget: Links zu Approval-Seite
   - Migration: Sollten auf Projekt-basierte URLs umgestellt werden

3. **Freigabe-nicht-mehr-verfügbar Page**
   - Links zu pr-tools/campaigns und pr-tools/approvals
   - Migration: Auf Projekt-Links umstellen

### ⚠️ **Alte Seiten die gelöscht werden können:**

Nach Migration der kritischen Links können folgende Seiten gelöscht werden:

- `/app/dashboard/pr-tools/campaigns/page.tsx` - Kampagnen-Übersicht (ersetzt durch Projekte)
- `/app/dashboard/pr-tools/campaigns/[id]/page.tsx` - Alte Detail-Seite
- `/app/dashboard/pr-tools/approvals/page.tsx` - Freigaben-Seite (in Projekte integriert)

### ✅ **Bereits migriert:**

- Campaign Edit/New Save-Actions → zu Projekt-Navigation
- Abbrechen-Buttons → zu Projekt-Navigation

### 📋 **Campaign-Seiten die BLEIBEN müssen (vorerst):**

Diese werden noch von vielen Stellen referenziert und sollten schrittweise migriert werden:

- `/campaigns/campaigns/new/page.tsx` - Neue Kampagne erstellen
- `/campaigns/campaigns/edit/[campaignId]/page.tsx` - Kampagne bearbeiten
- `/campaigns/campaigns/[campaignId]/page.tsx` - Kampagnen-Details
- `/campaigns/campaigns/[campaignId]/analytics/page.tsx` - Analytics

## Empfohlenes Vorgehen:

### Phase 1: Redirects einrichten
```typescript
// In den alten Seiten:
redirect('/dashboard/projects');
```

### Phase 2: Media Library Migration
- Neue Route: `/dashboard/library/media`
- Alle Referenzen updaten

### Phase 3: Campaign-Seiten schrittweise migrieren
- In Projekt-Kontext integrieren
- URLs beibehalten aber intern umleiten

### Phase 4: Alte Seiten löschen
- Erst wenn alle Referenzen entfernt sind