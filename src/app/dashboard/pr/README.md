# PR-Tool für SKAMP Marketing Suite

## 🎯 Vision

Das PR-Tool ermöglicht professionelle Pressearbeit durch intelligente Integration mit dem CRM und Listen-System. Journalisten werden zielgerichtet angesprochen, Kampagnen nachverfolgt und der Erfolg gemessen.

## 📊 Aktueller Status

### ✅ Fertig implementiert

#### Foundation
- **PR-Service** (`src/lib/firebase/pr-service.ts`) - CRUD für Kampagnen
- **PR-Datentypen** (`src/types/pr.ts`) - Vollständige Typisierung
- **Navigation** - PR-Bereich in Sidebar integriert

#### Kampagnen-Erstellung  
- **Neue Kampagne** (`/dashboard/pr/campaigns/new`) - Vollständiger Workflow
- **Verteiler-Integration** - Auswahl aus Listen-System
- **Rich-Text-Editor** - Professionelle Pressemitteilungs-Erstellung
- **Entwurf-Speicherung** - Kampagnen als Draft speichern

#### Kampagnen-Bearbeitung
- **Edit-Modus** (`/dashboard/pr/campaigns/edit/[id]`) - Entwürfe bearbeiten
- **Verteiler-Änderung** - Flexible Anpassung der Empfänger
- **Content-Updates** - Pressemitteilungen überarbeiten

### 🚧 In Entwicklung

#### Kampagnen-Management
- [ ] Kampagnen-Übersicht (`/dashboard/pr/page.tsx`)
- [ ] Status-Filter (Entwurf, Geplant, Versendet, Archiviert)
- [ ] Bulk-Operationen (Löschen, Archivieren)
- [ ] Suchfunktion in Kampagnen

#### E-Mail-Versand
- [ ] E-Mail-Service Integration (z.B. SendGrid, Mailgun)
- [ ] Template-System für E-Mail-Layout
- [ ] Personalisierung ({{firstName}}, {{company}}, etc.)
- [ ] Anhang-Management für Pressemitteilungen

## 🛠 Nächste Entwicklungsschritte

### Phase 1: Kampagnen-Übersicht (2-3 Tage)

```typescript
// /dashboard/pr/page.tsx - Neue Implementierung
- Kampagnen-Liste mit Status-Badges
- Filter nach Status, Datum, Verteiler
- Schnellaktionen (Bearbeiten, Versenden, Archivieren)
- Kampagnen-Metriken (Empfänger, Öffnungsrate)
```

### Phase 2: E-Mail-Versand (3-5 Tage)

```typescript
// src/lib/email/
- email-service.ts - Service-Abstraktion
- templates/ - HTML-E-Mail-Templates  
- personalization.ts - Platzhalter-Ersetzung

// Neue Firebase Collection: email_sends
- Tracking individueller E-Mail-Versendungen
- Öffnungs- und Klick-Tracking
```

### Phase 3: Analytics & Tracking (2-3 Tage)

```typescript
// /dashboard/pr/campaigns/[id]/analytics
- Öffnungsraten pro Empfänger
- Klick-Tracking auf Links
- Response-Management
- Export-Funktionen
```

### Phase 4: Template-System (2-3 Tage)

```typescript
// /dashboard/pr/templates/
- Vorgefertigte Pressemitteilungs-Templates
- Template-Editor mit Platzhaltern
- Wiederverwendbare Textbausteine
```

## 🗂 Dateistruktur

```
src/app/dashboard/pr/
├── page.tsx                     # Kampagnen-Übersicht
├── campaigns/
│   ├── new/
│   │   └── page.tsx            # ✅ Neue Kampagne erstellen
│   ├── edit/
│   │   └── [campaignId]/
│   │       └── page.tsx        # ✅ Kampagne bearbeiten
│   └── [campaignId]/
│       ├── page.tsx            # 📋 Kampagnen-Details
│       └── analytics/
│           └── page.tsx        # 📋 Analytics Dashboard
├── templates/
│   ├── page.tsx                # 📋 Template-Übersicht
│   └── [templateId]/
│       └── page.tsx            # 📋 Template bearbeiten
└── settings/
    └── page.tsx                # 📋 PR-Tool Einstellungen

src/lib/
├── firebase/
│   ├── pr-service.ts           # ✅ Kampagnen CRUD
│   └── email-service.ts        # 📋 E-Mail-Versand
├── email/
│   ├── templates/              # 📋 E-Mail-Templates
│   ├── providers/              # 📋 SendGrid, Mailgun, etc.
│   └── personalization.ts     # 📋 Platzhalter-System
└── analytics/
    └── pr-analytics.ts         # 📋 Tracking & Metriken

src/types/
├── pr.ts                       # ✅ PR-Datentypen
└── email.ts                    # 📋 E-Mail-Datentypen

src/components/pr/
├── CampaignCard.tsx            # 📋 Kampagnen-Übersicht
├── EmailEditor.tsx             # 📋 E-Mail-Template-Editor
├── PersonalizationPanel.tsx   # 📋 Platzhalter-Verwaltung
└── AnalyticsChart.tsx          # 📋 Charts für Metriken
```

**Legende:**
- ✅ = Implementiert
- 📋 = Geplant/ToDo

## 🎨 UI/UX Konzept

### Kampagnen-Status mit Farb-Coding
- 🟡 **Draft** - Entwurf in Bearbeitung
- 🔵 **Scheduled** - Geplant für Versand
- 🟢 **Sent** - Erfolgreich versendet  
- ⚫ **Archived** - Archiviert

### Dashboard-Layout
```
PR-Dashboard
├── Quick Stats (Kampagnen heute, diese Woche, Response-Rate)
├── Kampagnen-Filter (Status, Datum, Verteiler)
├── Kampagnen-Tabelle mit Inline-Aktionen
└── Floating Action Button (+Neue Kampagne)
```

## 💡 Technische Besonderheiten

### Integration mit bestehendem System
- **Listen-System**: Automatische Verteiler-Synchronisation
- **CRM-Daten**: Personalisierung mit Kontakt- und Firmendaten
- **Tag-System**: Kampagnen-Kategorisierung möglich

### Performance-Optimierungen
- **Paginierung** bei großen Kampagnen-Listen
- **Lazy Loading** für Analytics-Daten
- **Caching** von Verteiler-Vorschauen

### Skalierbarkeit
- **Service-Abstraktion** für verschiedene E-Mail-Provider
- **Template-System** für Corporate Design
- **Multi-User** Support durch userId-Filtering

## 🚀 Deployment Checklist

- [ ] Firebase Security Rules für PR-Collections
- [ ] E-Mail-Provider API-Keys konfigurieren
- [ ] Analytics-Tracking einrichten
- [ ] Performance-Monitoring aktivieren

## 🔍 Testing Strategy

```typescript
// Tests für kritische Funktionen
- Kampagnen-CRUD Operations
- Verteiler-Integration
- E-Mail-Personalisierung
- Analytics-Berechnung
```

---

**Nächster Meilenstein:** Kampagnen-Übersicht mit Status-Management  
**Geschätzter Aufwand:** 8-12 Entwicklungstage für vollständiges PR-Tool