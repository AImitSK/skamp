# Academy Überarbeitung

## Übersicht

Die bestehende Academy wird überarbeitet und mit dem neuen Hilfe-System integriert.

## Aktueller Stand

```
/dashboard/academy
├── Statische Inhalte
├── Hardcodierte Navigation
└── Keine Sanity-Integration
```

## Neues Konzept

```
/dashboard/academy
├── Content aus Sanity
├── Dynamische Navigation
├── Integration mit Hilfe-Panel
├── Personalisierte Empfehlungen
└── Fortschritts-Tracking (optional)
```

## Seitenstruktur (Neu)

### Startseite

```
┌─────────────────────────────────────────────────────────────┐
│  Academy                                            [?]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👋 Willkommen zurück, Stefan!                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎯 Weitermachen                                      │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Kampagne erstellen          [████████░░] 80%    │ │   │
│  │ │ Zuletzt: vor 2 Tagen                            │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🔍 [Dokumentation durchsuchen...]                          │
│                                                             │
│  📚 Kategorien                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │🚀 Erste   │ │📢 PR-     │ │👥 CRM     │ │⚙️ Settings│   │
│  │  Schritte │ │  Tools    │ │           │ │           │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                             │
│  🎬 Video-Tutorials                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │[Thumbnail]  │ │[Thumbnail]  │ │[Thumbnail]  │           │
│  │Erste Kampag.│ │Freigaben    │ │CRM Import   │           │
│  │3:24         │ │2:45         │ │4:12         │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  💬 Brauchst du persönliche Hilfe?                          │
│  [Support kontaktieren]  [FAQ durchsuchen]                  │
└─────────────────────────────────────────────────────────────┘
```

### Kategorie-Ansicht

```
┌─────────────────────────────────────────────────────────────┐
│  ← Academy │ 📢 PR-Tools                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Navigation              │ Artikel                          │
│  ┌─────────────────────┐ │ ┌─────────────────────────────┐ │
│  │ ▼ Kampagnen         │ │ │ # Kampagne erstellen        │ │
│  │   • Erstellen    ●  │ │ │                             │ │
│  │   • Bearbeiten      │ │ │ Erstelle deine erste...     │ │
│  │   • Key Visual      │ │ │                             │ │
│  │   • Vorlagen        │ │ │ [🎬 Video ansehen]          │ │
│  │                     │ │ │                             │ │
│  │ ▶ Freigaben         │ │ │ ## Schritt 1                │ │
│  │ ▶ Kalender          │ │ │ ...                         │ │
│  │ ▶ Mediathek         │ │ │                             │ │
│  │ ▶ Textbausteine     │ │ │ ## Schritt 2                │ │
│  │                     │ │ │ ...                         │ │
│  └─────────────────────┘ │ └─────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Technische Umsetzung

### Datei-Struktur

```
src/app/dashboard/academy/
├── layout.tsx              ← Academy Layout
├── page.tsx                ← Startseite (NEU)
├── [category]/
│   ├── page.tsx            ← Kategorie mit erstem Artikel
│   └── [slug]/
│       └── page.tsx        ← Artikel-Ansicht
├── search/
│   └── page.tsx            ← Suche
└── components/
    ├── AcademyNav.tsx      ← Sidebar Navigation
    ├── AcademySearch.tsx   ← Suchfeld
    ├── CategoryGrid.tsx    ← Kategorie-Karten
    ├── ArticleView.tsx     ← Artikel-Darstellung
    ├── VideoGallery.tsx    ← Video-Übersicht
    └── ProgressTracker.tsx ← Fortschritts-Anzeige (optional)
```

### Layout

```tsx
// app/dashboard/academy/layout.tsx
import { AcademyNav } from './components/AcademyNav';
import { getCategories } from '@/lib/sanity/help';

export default async function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategories();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 overflow-y-auto">
        <AcademyNav categories={categories} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

### Navigation-Komponente

```tsx
// components/academy/AcademyNav.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Category {
  title: string;
  slug: string;
  articles: { title: string; slug: string }[];
}

export function AcademyNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggleCategory = (slug: string) => {
    setExpanded(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    );
  };

  return (
    <nav className="p-4">
      {categories.map((category) => (
        <div key={category.slug} className="mb-2">
          <button
            onClick={() => toggleCategory(category.slug)}
            className="flex items-center justify-between w-full px-3 py-2
                       text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
          >
            {category.title}
            {expanded.includes(category.slug) ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>

          {expanded.includes(category.slug) && (
            <ul className="mt-1 ml-4 space-y-1">
              {category.articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/dashboard/academy/${category.slug}/${article.slug}`}
                    className={clsx(
                      'block px-3 py-1.5 text-sm rounded-lg',
                      pathname.includes(article.slug)
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
```

## Migration der alten Academy

### Zu entfernende Dateien

```
src/app/dashboard/academy/
├── page.tsx                    ← Ersetzen
├── layout.tsx                  ← Ersetzen
└── (alte Komponenten)          ← Entfernen
```

### Migrationsschritte

1. **Backup** der alten Academy-Dateien
2. **Neue Struktur** anlegen
3. **Sanity-Integration** implementieren
4. **Content migrieren** (falls vorhanden)
5. **Alte Dateien entfernen**
6. **Tests** durchführen

## Integration mit Hilfe-Panel

Die Academy und das Hilfe-Panel teilen sich:
- Dieselben Sanity-Inhalte
- Dieselbe Such-Funktionalität
- Dieselben Kategorien und Artikel

```
┌──────────────────┐     ┌──────────────────┐
│   Hilfe-Panel    │     │     Academy      │
│   (Kurzform)     │────▶│   (Vollversion)  │
│                  │     │                  │
│ • Quick-Tipps    │     │ • Voller Artikel │
│ • Excerpt        │     │ • Navigation     │
│ • "Mehr lesen →" │     │ • Video-Player   │
└──────────────────┘     └──────────────────┘
         │                        │
         └──────────┬─────────────┘
                    ▼
            ┌──────────────┐
            │    Sanity    │
            │   (Content)  │
            └──────────────┘
```

## Nächste Schritte

- [ ] Alte Academy analysieren
- [ ] Neue Dateistruktur anlegen
- [ ] Layout-Komponente erstellen
- [ ] Sanity-Queries implementieren
- [ ] Navigation bauen
- [ ] Alten Content migrieren
- [ ] Tests schreiben
