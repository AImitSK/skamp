# Übersetzung / i18n Strategie

## Übersicht

Zweisprachige Hilfe-Inhalte (DE/EN) mit Sanity als Content-Source.

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                        Sanity CMS                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ helpArticle                                          │   │
│  │ ├── title (DE)                                       │   │
│  │ ├── titleEn (EN)                                     │   │
│  │ ├── content (DE) [Portable Text]                     │   │
│  │ ├── contentEn (EN) [Portable Text]                   │   │
│  │ ├── tips[] { tip (DE), tipEn (EN) }                 │   │
│  │ └── ...                                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      GROQ Query                             │
│  select($locale == "en" => titleEn, title)                 │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Deutsche App      │     │   Englische App     │
│   (locale: de)      │     │   (locale: en)      │
└─────────────────────┘     └─────────────────────┘
```

## Sanity Schema mit Übersetzungen

### Feld-Strategie: Suffix-Ansatz

```typescript
// Jedes übersetzbare Feld hat ein EN-Pendant
{
  name: 'title',
  title: 'Titel (Deutsch)',
  type: 'string',
},
{
  name: 'titleEn',
  title: 'Title (English)',
  type: 'string',
},
```

**Vorteile:**
- Einfach zu implementieren
- Redakteure sehen beide Sprachen
- Keine zusätzlichen Plugins nötig

**Nachteile:**
- Mehr Felder im Schema
- Manuelles Handling

### Alternative: Document-Level i18n

```typescript
// Mit @sanity/document-internationalization Plugin
{
  name: 'helpArticle',
  type: 'document',
  i18n: {
    languages: ['de', 'en'],
    base: 'de',
  },
  // Separate Dokumente pro Sprache
}
```

**Empfehlung:** Suffix-Ansatz für Einfachheit

## GROQ Queries mit Sprachauswahl

### Artikel laden

```groq
*[_type == "helpArticle" && slug.current == $slug][0] {
  "title": select(
    $locale == "en" && defined(titleEn) => titleEn,
    title
  ),
  "excerpt": select(
    $locale == "en" && defined(excerptEn) => excerptEn,
    excerpt
  ),
  "content": select(
    $locale == "en" && defined(contentEn) => contentEn,
    content
  ),
  "tips": tips[] {
    "text": select(
      $locale == "en" && defined(tipEn) => tipEn,
      tip
    )
  },
  videos[] {
    "title": select(
      $locale == "en" && defined(titleEn) => titleEn,
      title
    ),
    url,
    duration
  },
  "category": category-> {
    "title": select(
      $locale == "en" && defined(titleEn) => titleEn,
      title
    ),
    slug
  }
}
```

### Kategorien laden

```groq
*[_type == "helpCategory"] | order(order asc) {
  "title": select(
    $locale == "en" && defined(titleEn) => titleEn,
    title
  ),
  "description": select(
    $locale == "en" && defined(descriptionEn) => descriptionEn,
    description
  ),
  slug,
  icon
}
```

## Next.js Integration

### API-Route mit Locale

```typescript
// app/api/help/route.ts
import { getLocale } from 'next-intl/server';

export async function GET(request: NextRequest) {
  const locale = await getLocale();
  const route = request.nextUrl.searchParams.get('route');

  const content = await client.fetch(helpQuery, {
    route,
    locale,
  });

  return NextResponse.json(content);
}
```

### Komponenten mit next-intl

```tsx
// components/help/HelpSupport.tsx
'use client';

import { useTranslations } from 'next-intl';

export function HelpSupport() {
  // UI-Texte aus next-intl (statisch)
  const t = useTranslations('help');

  return (
    <div>
      <h3>{t('support.title')}</h3>
      <p>{t('support.description')}</p>
      <button>{t('support.contactButton')}</button>
    </div>
  );
}
```

## Übersetzungs-Struktur

### Statische UI-Texte (next-intl)

```json
// messages/de.json
{
  "help": {
    "panel": {
      "title": "Hilfe",
      "close": "Schließen",
      "loading": "Laden...",
      "noContent": "Für diese Seite ist noch keine Hilfe verfügbar."
    },
    "sections": {
      "faq": "FAQ",
      "tips": "Tipps",
      "video": "Video-Tutorial",
      "relatedArticles": "Verwandte Artikel"
    },
    "support": {
      "title": "Brauchst du Hilfe?",
      "description": "Unser Support-Team hilft dir gerne weiter.",
      "contactButton": "Support kontaktieren",
      "emailSubject": "Hilfe benötigt"
    },
    "feedback": {
      "helpful": "War dieser Artikel hilfreich?",
      "yes": "Ja",
      "no": "Nein",
      "thanks": "Danke für dein Feedback!"
    },
    "search": {
      "placeholder": "Hilfe durchsuchen...",
      "noResults": "Keine Ergebnisse gefunden",
      "resultsCount": "{count} Ergebnis(se)"
    },
    "readMore": "Mehr lesen",
    "watchVideo": "Video ansehen",
    "backToOverview": "Zurück zur Übersicht"
  }
}
```

```json
// messages/en.json
{
  "help": {
    "panel": {
      "title": "Help",
      "close": "Close",
      "loading": "Loading...",
      "noContent": "No help available for this page yet."
    },
    "sections": {
      "faq": "FAQ",
      "tips": "Tips",
      "video": "Video Tutorial",
      "relatedArticles": "Related Articles"
    },
    "support": {
      "title": "Need help?",
      "description": "Our support team is happy to assist you.",
      "contactButton": "Contact Support",
      "emailSubject": "Help needed"
    },
    "feedback": {
      "helpful": "Was this article helpful?",
      "yes": "Yes",
      "no": "No",
      "thanks": "Thanks for your feedback!"
    },
    "search": {
      "placeholder": "Search help...",
      "noResults": "No results found",
      "resultsCount": "{count} result(s)"
    },
    "readMore": "Read more",
    "watchVideo": "Watch video",
    "backToOverview": "Back to overview"
  }
}
```

### Dynamische Inhalte (Sanity)

| Content | Deutsch | Englisch |
|---------|---------|----------|
| Artikel-Titel | `title` | `titleEn` |
| Artikel-Inhalt | `content` | `contentEn` |
| Kurzbeschreibung | `excerpt` | `excerptEn` |
| Tipps | `tip` | `tipEn` |
| Kategorie-Titel | `title` | `titleEn` |
| Video-Titel | `title` | `titleEn` |

## Sanity Studio Übersetzungs-UI

### Nebeneinander-Ansicht

```typescript
// schemas/help/helpArticle.ts
{
  name: 'helpArticle',
  type: 'document',
  groups: [
    { name: 'german', title: '🇩🇪 Deutsch' },
    { name: 'english', title: '🇬🇧 English' },
    { name: 'meta', title: '⚙️ Meta' },
  ],
  fields: [
    // Deutsche Felder
    {
      name: 'title',
      title: 'Titel',
      type: 'string',
      group: 'german',
    },
    {
      name: 'content',
      title: 'Inhalt',
      type: 'portableText',
      group: 'german',
    },
    // Englische Felder
    {
      name: 'titleEn',
      title: 'Title',
      type: 'string',
      group: 'english',
    },
    {
      name: 'contentEn',
      title: 'Content',
      type: 'portableText',
      group: 'english',
    },
    // Meta-Felder (sprachunabhängig)
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
    },
    {
      name: 'category',
      title: 'Kategorie',
      type: 'reference',
      to: [{ type: 'helpCategory' }],
      group: 'meta',
    },
  ],
}
```

## Übersetzungs-Workflow

### Für Redakteure

```
1. Artikel auf Deutsch erstellen
   └── Titel, Inhalt, Tipps eingeben

2. Zur English-Gruppe wechseln
   └── Englische Übersetzungen eingeben

3. Preview in beiden Sprachen
   └── DE: /support/de/artikel-slug
   └── EN: /support/en/article-slug

4. Publish
```

### Qualitätssicherung

```typescript
// Validation: Englisch erforderlich wenn Deutsch vorhanden
{
  name: 'titleEn',
  validation: Rule => Rule.custom((value, context) => {
    const { title } = context.document;
    if (title && !value) {
      return 'English title is required when German title exists';
    }
    return true;
  }),
}
```

## Fallback-Strategie

### Wenn englische Übersetzung fehlt

```groq
// Fallback zu Deutsch wenn EN nicht vorhanden
"title": select(
  $locale == "en" && defined(titleEn) => titleEn,
  title  // Fallback zu DE
)
```

### Visuelle Warnung im Panel

```tsx
// Zeige Hinweis wenn Fallback aktiv
{!hasTranslation && locale === 'en' && (
  <div className="bg-yellow-50 text-yellow-700 text-xs p-2 rounded">
    This content is not yet available in English.
  </div>
)}
```

## URL-Struktur

### Support-Website

```
/support/de/kategorie/artikel-slug  ← Deutsche Version
/support/en/category/article-slug   ← Englische Version
```

### Slug-Handling

```typescript
// Option 1: Gleicher Slug für beide Sprachen
slug: "kampagne-erstellen"
→ /support/de/pr-tools/kampagne-erstellen
→ /support/en/pr-tools/kampagne-erstellen

// Option 2: Übersetzte Slugs (komplexer)
slug: "kampagne-erstellen"
slugEn: "create-campaign"
→ /support/de/pr-tools/kampagne-erstellen
→ /support/en/pr-tools/create-campaign
```

**Empfehlung:** Option 1 (gleicher Slug) für Einfachheit

## Checkliste

### Initial Setup

- [ ] Sanity Schema mit DE/EN Feldern
- [ ] GROQ Queries mit locale-Parameter
- [ ] next-intl Keys für `help` Namespace
- [ ] API-Route mit Locale-Detection

### Pro Artikel

- [ ] Deutscher Content vollständig
- [ ] Englischer Content vollständig
- [ ] Tipps in beiden Sprachen
- [ ] Video-Titel übersetzt
- [ ] Preview in beiden Sprachen getestet

### QA

- [ ] Fallback funktioniert
- [ ] Sprachumschaltung korrekt
- [ ] Keine Mixed-Language Inhalte
- [ ] SEO-Tags pro Sprache

## Nächste Schritte

- [ ] next-intl Keys hinzufügen
- [ ] Sanity Schema mit Gruppen
- [ ] GROQ Queries anpassen
- [ ] Fallback-Logik implementieren
