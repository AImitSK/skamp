# Sanity Backend - Hilfe-Content Schema

## Übersicht

Erweiterung des bestehenden Sanity-Schemas um Hilfe-Content-Typen.

## Kategorien (basierend auf App-Struktur)

```
📁 Hilfe-Center
├── 🚀 Erste Schritte (Onboarding)
├── 👥 CRM (Verlage, Journalisten, Verteiler)
├── 📚 Bibliothek (Publikationen, Medien, Marken-DNA)
├── 📁 Projekte (Tasks, Strategie, Pressemeldung, Versand)
├── 📊 Analytics (Monitoring, Reporting)
├── 💬 Kommunikation (Inbox, Benachrichtigungen)
├── ⚙️ Einstellungen (Team, E-Mail, Branding, Domains)
└── 👤 Account (Profil, Billing, API)
```

---

## Schema-Definitionen

### 1. helpCategory (Hilfe-Kategorie)

```typescript
// schemas/help/helpCategory.ts
export default {
  name: 'helpCategory',
  title: 'Hilfe-Kategorie',
  type: 'document',
  icon: FolderIcon,
  fields: [
    {
      name: 'title',
      title: 'Titel',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'titleEn',
      title: 'Titel (Englisch)',
      type: 'string'
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: Rule => Rule.required()
    },
    {
      name: 'description',
      title: 'Beschreibung',
      type: 'text',
      rows: 2
    },
    {
      name: 'descriptionEn',
      title: 'Beschreibung (Englisch)',
      type: 'text',
      rows: 2
    },
    {
      name: 'icon',
      title: 'Icon',
      type: 'string',
      description: 'Heroicon Name (z.B. "RocketLaunchIcon", "UserGroupIcon")'
    },
    {
      name: 'order',
      title: 'Sortierung',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'appSection',
      title: 'App-Bereich',
      type: 'string',
      options: {
        list: [
          { title: '🚀 Erste Schritte', value: 'onboarding' },
          { title: '👥 CRM', value: 'crm' },
          { title: '📚 Bibliothek', value: 'library' },
          { title: '📁 Projekte', value: 'projects' },
          { title: '📊 Analytics', value: 'analytics' },
          { title: '💬 Kommunikation', value: 'communication' },
          { title: '⚙️ Einstellungen', value: 'settings' },
          { title: '👤 Account', value: 'account' }
        ]
      }
    }
  ],
  preview: {
    select: { title: 'title', icon: 'icon' },
    prepare({ title, icon }) {
      return { title, subtitle: icon }
    }
  }
}
```

### 2. helpArticle (Hilfe-Artikel)

```typescript
// schemas/help/helpArticle.ts
export default {
  name: 'helpArticle',
  title: 'Hilfe-Artikel',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    { name: 'german', title: '🇩🇪 Deutsch' },
    { name: 'english', title: '🇬🇧 English' },
    { name: 'meta', title: '⚙️ Meta' },
    { name: 'extras', title: '📎 Extras' },
  ],
  fields: [
    // === DEUTSCH ===
    {
      name: 'title',
      title: 'Titel',
      type: 'string',
      group: 'german',
      validation: Rule => Rule.required()
    },
    {
      name: 'excerpt',
      title: 'Kurzbeschreibung',
      type: 'text',
      rows: 2,
      group: 'german',
      description: 'Für Suchergebnisse und Vorschau'
    },
    {
      name: 'content',
      title: 'Inhalt',
      type: 'portableText',
      group: 'german'
    },
    // === ENGLISCH ===
    {
      name: 'titleEn',
      title: 'Title',
      type: 'string',
      group: 'english'
    },
    {
      name: 'excerptEn',
      title: 'Short Description',
      type: 'text',
      rows: 2,
      group: 'english'
    },
    {
      name: 'contentEn',
      title: 'Content',
      type: 'portableText',
      group: 'english'
    },
    // === META ===
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      group: 'meta',
      validation: Rule => Rule.required()
    },
    {
      name: 'category',
      title: 'Kategorie',
      type: 'reference',
      to: [{ type: 'helpCategory' }],
      group: 'meta',
      validation: Rule => Rule.required()
    },
    {
      name: 'onboardingStep',
      title: 'Onboarding-Schritt',
      type: 'string',
      group: 'meta',
      description: 'Nur für Erste Schritte: z.B. "1.1", "1.2", "2.1"',
      hidden: ({ document }) => document?.category?._ref !== 'onboarding'
    },
    {
      name: 'keywords',
      title: 'Suchbegriffe',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      group: 'meta'
    },
    {
      name: 'publishedAt',
      title: 'Veröffentlicht am',
      type: 'datetime',
      group: 'meta'
    },
    {
      name: 'updatedAt',
      title: 'Aktualisiert am',
      type: 'datetime',
      group: 'meta'
    },
    // === EXTRAS ===
    {
      name: 'tips',
      title: 'Tipps',
      type: 'array',
      group: 'extras',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'tip', title: 'Tipp (DE)', type: 'string' },
            { name: 'tipEn', title: 'Tipp (EN)', type: 'string' }
          ],
          preview: {
            select: { title: 'tip' }
          }
        }
      ]
    },
    {
      name: 'videos',
      title: 'Videos',
      type: 'array',
      group: 'extras',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', title: 'Titel (DE)', type: 'string' },
            { name: 'titleEn', title: 'Title (EN)', type: 'string' },
            { name: 'url', title: 'Video-URL (YouTube/Vimeo)', type: 'url' },
            { name: 'duration', title: 'Dauer (Minuten)', type: 'number' }
          ],
          preview: {
            select: { title: 'title', duration: 'duration' },
            prepare({ title, duration }) {
              return { title, subtitle: duration ? `${duration} Min` : '' }
            }
          }
        }
      ]
    },
    {
      name: 'relatedArticles',
      title: 'Verwandte Artikel',
      type: 'array',
      group: 'extras',
      of: [{ type: 'reference', to: [{ type: 'helpArticle' }] }]
    }
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category.title',
      step: 'onboardingStep'
    },
    prepare({ title, category, step }) {
      return {
        title: step ? `${step} - ${title}` : title,
        subtitle: category
      }
    }
  }
}
```

### 3. helpPageMapping (Seiten-Zuordnung)

```typescript
// schemas/help/helpPageMapping.ts
export default {
  name: 'helpPageMapping',
  title: 'Seiten-Zuordnung',
  type: 'document',
  icon: LinkIcon,
  fields: [
    {
      name: 'pageName',
      title: 'Seiten-Name',
      type: 'string',
      description: 'Interner Name zur Identifikation',
      validation: Rule => Rule.required()
    },
    {
      name: 'routes',
      title: 'App-Routen',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'z.B. /dashboard/projects, /dashboard/projects/[id]/*',
      validation: Rule => Rule.required().min(1)
    },
    {
      name: 'mainArticle',
      title: 'Haupt-Artikel',
      type: 'reference',
      to: [{ type: 'helpArticle' }],
      description: 'Wird im Panel als FAQ angezeigt'
    },
    {
      name: 'quickTips',
      title: 'Quick-Tipps',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'tip', title: 'Tipp (DE)', type: 'string' },
            { name: 'tipEn', title: 'Tipp (EN)', type: 'string' }
          ]
        }
      ],
      description: 'Kurze Tipps speziell für diese Seite'
    },
    {
      name: 'featureVideo',
      title: 'Feature-Video',
      type: 'object',
      fields: [
        { name: 'title', title: 'Titel (DE)', type: 'string' },
        { name: 'titleEn', title: 'Title (EN)', type: 'string' },
        { name: 'url', title: 'Video-URL', type: 'url' },
        { name: 'thumbnailUrl', title: 'Thumbnail-URL', type: 'url' }
      ]
    },
    {
      name: 'additionalArticles',
      title: 'Weitere Artikel',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'helpArticle' }] }]
    }
  ],
  preview: {
    select: {
      title: 'pageName',
      routes: 'routes'
    },
    prepare({ title, routes }) {
      return {
        title,
        subtitle: routes?.[0] || 'Keine Route'
      }
    }
  }
}
```

---

## GROQ Queries

### Hilfe für aktuelle Seite laden

```groq
// Hilfe-Content für eine bestimmte Route
*[_type == "helpPageMapping" && $route in routes][0] {
  pageName,
  "mainArticle": mainArticle-> {
    title,
    titleEn,
    slug,
    excerpt,
    excerptEn,
    tips,
    "category": category-> { title, titleEn, slug }
  },
  quickTips,
  featureVideo,
  "additionalArticles": additionalArticles[]-> {
    title,
    titleEn,
    slug,
    excerpt,
    excerptEn
  }
}
```

### Alle Kategorien mit Artikeln

```groq
*[_type == "helpCategory"] | order(order asc) {
  title,
  titleEn,
  slug,
  description,
  descriptionEn,
  icon,
  appSection,
  "articles": *[_type == "helpArticle" && references(^._id)] | order(onboardingStep asc) {
    title,
    titleEn,
    slug,
    excerpt,
    excerptEn,
    onboardingStep
  }
}
```

### Onboarding-Artikel (sortiert nach Schritt)

```groq
*[_type == "helpArticle" && category->appSection == "onboarding"] | order(onboardingStep asc) {
  title,
  titleEn,
  slug,
  excerpt,
  excerptEn,
  onboardingStep,
  "category": category-> { title, slug }
}
```

### Artikel-Suche

```groq
*[_type == "helpArticle" && (
  title match $query + "*" ||
  titleEn match $query + "*" ||
  excerpt match $query + "*" ||
  $query in keywords
)] {
  title,
  titleEn,
  slug,
  excerpt,
  excerptEn,
  "category": category-> { title, slug }
}
```

---

## Sanity Studio Struktur

```
Sanity Studio
├── 📁 Blog (existiert)
│
└── 📁 Hilfe-Center (NEU)
    │
    ├── 📂 Kategorien
    │   ├── 🚀 Erste Schritte
    │   ├── 👥 CRM (Verlage, Journalisten, Verteiler)
    │   ├── 📚 Bibliothek
    │   ├── 📁 Projekte
    │   ├── 📊 Analytics
    │   ├── 💬 Kommunikation
    │   ├── ⚙️ Einstellungen
    │   └── 👤 Account
    │
    ├── 📂 Artikel
    │   │
    │   ├── [Erste Schritte]
    │   │   ├── 1.1 - Profil einrichten
    │   │   ├── 1.2 - Domain registrieren
    │   │   ├── 1.3 - E-Mail-Absender einrichten
    │   │   ├── 1.4 - Team einladen
    │   │   ├── 2.1 - Ersten Kunden anlegen
    │   │   └── 2.2 - Ansprechpartner anlegen
    │   │
    │   ├── [CRM]
    │   │   ├── Verlag anlegen
    │   │   ├── Journalist anlegen
    │   │   ├── Journalist mit Verlag verknüpfen
    │   │   ├── Journalist mit Publikation verknüpfen
    │   │   └── Verteiler erstellen
    │   │
    │   ├── [Bibliothek]
    │   │   ├── Publikation anlegen
    │   │   ├── Publikation dem Verlag zuordnen
    │   │   ├── Medien hochladen
    │   │   ├── Marken-DNA verstehen
    │   │   └── Marken-DNA pflegen
    │   │
    │   ├── [Projekte]
    │   │   ├── Projekt erstellen
    │   │   ├── Tasks verstehen
    │   │   ├── Strategie definieren
    │   │   ├── Verteiler auswählen
    │   │   ├── Pressemeldung erstellen
    │   │   ├── KI-Assistent nutzen
    │   │   ├── Freigabe-Workflow
    │   │   ├── E-Mail-Versand
    │   │   └── Projekt-Monitoring
    │   │
    │   └── [...]
    │
    └── 📂 Seiten-Zuordnung
        ├── Dashboard
        ├── CRM - Verlage
        ├── CRM - Journalisten
        ├── CRM - Verteilerlisten
        ├── Bibliothek - Publikationen
        ├── Bibliothek - Medien
        ├── Bibliothek - Marken-DNA
        ├── Projekte - Übersicht
        ├── Projekte - Detail
        ├── Projekte - Pressemeldung
        ├── Einstellungen - Team
        ├── Einstellungen - E-Mail
        └── ...
```

---

## Beispiel: Seiten-Zuordnungen

| Seiten-Name | Routen | Haupt-Artikel |
|-------------|--------|---------------|
| Dashboard | `/dashboard` | Willkommen bei CeleroPress |
| CRM - Verlage | `/dashboard/contacts/crm?tab=companies` | Verlag anlegen |
| CRM - Journalisten | `/dashboard/contacts/crm?tab=contacts` | Journalist anlegen |
| CRM - Verteilerlisten | `/dashboard/contacts/lists`, `/dashboard/contacts/lists/*` | Verteiler erstellen |
| Bibliothek - Publikationen | `/dashboard/library/publications` | Publikation anlegen |
| Bibliothek - Medien | `/dashboard/library/media` | Medien hochladen |
| Bibliothek - Marken-DNA | `/dashboard/library/marken-dna` | Marken-DNA verstehen |
| Projekte - Übersicht | `/dashboard/projects` | Projekt erstellen |
| Projekte - Detail | `/dashboard/projects/[id]`, `/dashboard/projects/[id]/*` | Projekt-Übersicht |
| Einstellungen - Team | `/dashboard/settings/team` | Team-Mitglieder einladen |
| Einstellungen - E-Mail | `/dashboard/settings/email` | E-Mail-Absender einrichten |
| Einstellungen - Domain | `/dashboard/settings/domain` | Domain registrieren |

---

## API-Integration in Next.js

```typescript
// lib/sanity/help.ts
import { client } from './client'

export async function getHelpForRoute(route: string, locale: string = 'de') {
  const query = `*[_type == "helpPageMapping" && $route in routes][0] {
    pageName,
    "mainArticle": mainArticle-> {
      "title": select($locale == "en" => titleEn, title),
      slug,
      "excerpt": select($locale == "en" => excerptEn, excerpt),
      "tips": tips[] {
        "text": select($locale == "en" => tipEn, tip)
      }
    },
    "quickTips": quickTips[] {
      "text": select($locale == "en" => tipEn, tip)
    },
    featureVideo
  }`

  return client.fetch(query, { route, locale })
}

export async function getOnboardingProgress(locale: string = 'de') {
  const query = `*[_type == "helpArticle" && category->appSection == "onboarding"] | order(onboardingStep asc) {
    "title": select($locale == "en" => titleEn, title),
    slug,
    onboardingStep,
    "excerpt": select($locale == "en" => excerptEn, excerpt)
  }`

  return client.fetch(query, { locale })
}

export async function searchHelpArticles(searchQuery: string, locale: string = 'de') {
  const query = `*[_type == "helpArticle" && (
    title match $searchQuery + "*" ||
    titleEn match $searchQuery + "*" ||
    excerpt match $searchQuery + "*" ||
    $searchQuery in keywords
  )] {
    "title": select($locale == "en" => titleEn, title),
    slug,
    "excerpt": select($locale == "en" => excerptEn, excerpt),
    "category": category-> {
      "title": select($locale == "en" => titleEn, title),
      slug
    }
  }`

  return client.fetch(query, { searchQuery, locale })
}

export async function getAllCategories(locale: string = 'de') {
  const query = `*[_type == "helpCategory"] | order(order asc) {
    "title": select($locale == "en" => titleEn, title),
    "description": select($locale == "en" => descriptionEn, description),
    slug,
    icon,
    appSection,
    "articleCount": count(*[_type == "helpArticle" && references(^._id)])
  }`

  return client.fetch(query, { locale })
}
```

---

## Nächste Schritte

- [ ] Schema in Sanity Studio erstellen
- [ ] Portable Text Komponenten definieren
- [ ] GROQ Queries testen
- [ ] API-Funktionen implementieren
- [ ] Erste Kategorien anlegen
- [ ] Onboarding-Artikel erstellen
