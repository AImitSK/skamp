# Support-Webseite

## Übersicht

Öffentliche Support-Seite basierend auf Radiant Theme (bereits für Marketing-Seite verwendet).

## URL-Struktur

```
support.celeropress.com (oder celeropress.com/support)
│
├── /de/                              ← Deutsche Startseite
│   ├── /pr-tools/                    ← Kategorie-Übersicht
│   │   ├── /kampagne-erstellen       ← Artikel
│   │   ├── /kampagne-bearbeiten      ← Artikel
│   │   └── ...
│   ├── /crm/
│   ├── /einstellungen/
│   └── ...
│
└── /en/                              ← Englische Version
    ├── /pr-tools/
    └── ...
```

## Seitentypen

### 1. Startseite

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 [Suchfeld: "Wie können wir helfen?"]                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Beliebte Themen                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Erste    │ │Kampagne │ │Kontakte │ │E-Mail   │           │
│  │Schritte │ │erstellen│ │anlegen  │ │einricht.│           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  Kategorien                                                 │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ 📢 PR-Tools   │ │ 👥 CRM        │ │ 📚 Bibliothek │     │
│  │ 12 Artikel    │ │ 8 Artikel     │ │ 5 Artikel     │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ 📁 Projekte   │ │ ⚙️ Settings   │ │ 👤 Admin      │     │
│  │ 6 Artikel     │ │ 10 Artikel    │ │ 4 Artikel     │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Noch Fragen? [Support kontaktieren]                        │
└─────────────────────────────────────────────────────────────┘
```

### 2. Kategorie-Seite

```
┌─────────────────────────────────────────────────────────────┐
│  ← Zurück │ 📢 PR-Tools                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Alles rund um Kampagnen, Freigaben und PR-Workflows.       │
│                                                             │
│  Unterkategorien                                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Kampagnen   │ │ Freigaben   │ │ Mediathek   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  Alle Artikel                                               │
│  ├── Kampagne erstellen                            →       │
│  ├── Kampagne bearbeiten                           →       │
│  ├── Key Visual hochladen                          →       │
│  ├── Vorlagen verwenden                            →       │
│  ├── PDF generieren                                →       │
│  ├── Kundenfreigabe einrichten                     →       │
│  └── Kampagne versenden                            →       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Artikel-Seite

```
┌─────────────────────────────────────────────────────────────┐
│  PR-Tools › Kampagnen                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  # Kampagne erstellen                                       │
│                                                             │
│  Erstelle deine erste Pressemitteilung in wenigen          │
│  Schritten.                                                 │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ 🎬 Video-Tutorial (3:24)            │                   │
│  │ [▶️ Thumbnail]                       │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ## Schritt 1: Neue Kampagne anlegen                       │
│  ...                                                        │
│                                                             │
│  ## Schritt 2: Kunde auswählen                             │
│  ...                                                        │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  💡 Tipps                                                   │
│  • Nutze Vorlagen für schnellere Erstellung                │
│  • Key Visuals erhöhen die Öffnungsrate                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  📚 Verwandte Artikel                                       │
│  • Vorlagen verwenden                                       │
│  • Key Visual hochladen                                     │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  War dieser Artikel hilfreich? [👍] [👎]                    │
└─────────────────────────────────────────────────────────────┘
```

## Technische Umsetzung

### Projekt-Struktur

```
src/app/support/
├── layout.tsx              ← Support-Layout (Header, Footer)
├── page.tsx                ← Startseite
├── [locale]/
│   ├── page.tsx            ← Lokalisierte Startseite
│   ├── [category]/
│   │   ├── page.tsx        ← Kategorie-Übersicht
│   │   └── [slug]/
│   │       └── page.tsx    ← Artikel-Seite
│   └── search/
│       └── page.tsx        ← Suchergebnisse
└── components/
    ├── SearchBar.tsx
    ├── CategoryCard.tsx
    ├── ArticleCard.tsx
    ├── ArticleContent.tsx  ← Portable Text Renderer
    ├── VideoEmbed.tsx
    ├── TipBox.tsx
    └── FeedbackButtons.tsx
```

### Komponenten

#### SearchBar

```tsx
// components/support/SearchBar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export function SearchBar({ locale }: { locale: string }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/support/${locale}/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
      <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Wie können wir helfen?"
        className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border border-gray-200
                   focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
      />
    </form>
  );
}
```

#### CategoryCard

```tsx
// components/support/CategoryCard.tsx
import Link from 'next/link';
import * as Icons from '@heroicons/react/24/outline';

interface CategoryCardProps {
  title: string;
  slug: string;
  icon: string;
  articleCount: number;
  locale: string;
}

export function CategoryCard({ title, slug, icon, articleCount, locale }: CategoryCardProps) {
  const IconComponent = Icons[icon as keyof typeof Icons] || Icons.FolderIcon;

  return (
    <Link
      href={`/support/${locale}/${slug}`}
      className="block p-6 bg-white rounded-xl border border-gray-200
                 hover:border-primary-300 hover:shadow-md transition-all"
    >
      <IconComponent className="h-8 w-8 text-primary-600 mb-3" />
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{articleCount} Artikel</p>
    </Link>
  );
}
```

### Data Fetching

```tsx
// app/support/[locale]/[category]/[slug]/page.tsx
import { client } from '@/lib/sanity/client';
import { ArticleContent } from '@/components/support/ArticleContent';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { locale: string; category: string; slug: string };
}

async function getArticle(slug: string, locale: string) {
  const query = `*[_type == "helpArticle" && slug.current == $slug][0] {
    "title": select($locale == "en" => titleEn, title),
    "content": select($locale == "en" => contentEn, content),
    "excerpt": select($locale == "en" => excerptEn, excerpt),
    "tips": tips[] { "text": select($locale == "en" => tipEn, tip) },
    videos,
    "relatedArticles": relatedArticles[]-> {
      "title": select($locale == "en" => titleEn, title),
      slug,
      "category": category-> { slug }
    },
    "category": category-> {
      "title": select($locale == "en" => titleEn, title),
      slug
    }
  }`;

  return client.fetch(query, { slug, locale });
}

export default async function ArticlePage({ params }: PageProps) {
  const article = await getArticle(params.slug, params.locale);

  if (!article) {
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <ArticleContent article={article} locale={params.locale} />
    </article>
  );
}

// SEO Metadata
export async function generateMetadata({ params }: PageProps) {
  const article = await getArticle(params.slug, params.locale);

  return {
    title: `${article?.title} | CeleroPress Support`,
    description: article?.excerpt,
  };
}
```

## SEO & Performance

### Meta-Tags

```tsx
// Für jede Seite
export const metadata = {
  title: 'CeleroPress Support',
  description: 'Hilfe und Dokumentation für CeleroPress',
  openGraph: {
    title: 'CeleroPress Support',
    description: 'Hilfe und Dokumentation',
    type: 'website',
  },
};
```

### Sitemap

```tsx
// app/support/sitemap.ts
import { client } from '@/lib/sanity/client';

export default async function sitemap() {
  const articles = await client.fetch(`
    *[_type == "helpArticle"] {
      slug,
      "category": category->slug,
      updatedAt
    }
  `);

  return articles.map((article: any) => ({
    url: `https://support.celeropress.com/de/${article.category.current}/${article.slug.current}`,
    lastModified: article.updatedAt,
  }));
}
```

### Caching

```tsx
// ISR für Support-Seiten
export const revalidate = 3600; // 1 Stunde

// Oder On-Demand Revalidation via Sanity Webhook
// POST /api/revalidate?secret=xxx&path=/support/de/pr-tools/kampagne-erstellen
```

## Design (Radiant Theme)

- Nutzt bestehende Radiant-Komponenten
- Primärfarben aus CeleroPress Design System
- Mobile-first Layout
- Dark Mode Support (optional)

## Nächste Schritte

- [ ] Route-Struktur anlegen
- [ ] Radiant-Komponenten anpassen
- [ ] Sanity-Integration
- [ ] Suche implementieren
- [ ] SEO optimieren
