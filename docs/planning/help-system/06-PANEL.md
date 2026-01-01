# Hilfe-Panel

## Übersicht

Slide-out Panel für kontextuelle Hilfe innerhalb der App.

## Design

### Geschlossen (Button)

```
┌─────────────────────────────────────────────────────────[?]─┐
│  Seiten-Inhalt                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                                            ↑
                                               Hilfe-Button (fest)
```

### Geöffnet (Panel)

```
┌─────────────────────────────────────────────┬───────────────┐
│                                             │ ❓ Hilfe   [×]│
│  Seiten-Inhalt                              ├───────────────┤
│  (leicht abgedunkelt)                       │               │
│                                             │ 📋 FAQ        │
│                                             │ ┌───────────┐ │
│                                             │ │Wie erstelle│ │
│                                             │ │ich eine   │ │
│                                             │ │Kampagne?  │ │
│                                             │ └───────────┘ │
│                                             │ [Mehr lesen →]│
│                                             │               │
│                                             │ 💡 Tipps      │
│                                             │ • Tipp 1      │
│                                             │ • Tipp 2      │
│                                             │               │
│                                             │ 🎬 Video      │
│                                             │ ┌───────────┐ │
│                                             │ │[▶ Thumb]  │ │
│                                             │ │Tutorial   │ │
│                                             │ └───────────┘ │
│                                             │               │
│                                             │ ━━━━━━━━━━━━━ │
│                                             │ 📧 Support    │
│                                             │ [Kontaktieren]│
└─────────────────────────────────────────────┴───────────────┘
```

## Komponenten-Struktur

```
components/help/
├── HelpButton.tsx          ← Floating Button [?]
├── HelpPanel.tsx           ← Slide-out Container
├── HelpPanelContent.tsx    ← Inhalt des Panels
├── HelpFAQ.tsx             ← FAQ-Sektion
├── HelpTips.tsx            ← Tipps-Sektion
├── HelpVideo.tsx           ← Video-Sektion
├── HelpSupport.tsx         ← Support-Button
└── HelpContext.tsx         ← Context Provider
```

## Implementation

### HelpContext (State Management)

```tsx
// components/help/HelpContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface HelpContent {
  pageName: string;
  mainArticle: {
    title: string;
    slug: string;
    excerpt: string;
    category: { title: string; slug: string };
  } | null;
  quickTips: { text: string }[];
  featureVideo: {
    title: string;
    url: string;
    thumbnailUrl?: string;
  } | null;
}

interface HelpContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  content: HelpContent | null;
  loading: boolean;
}

const HelpContext = createContext<HelpContextType | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // Lade Hilfe-Content wenn sich die Route ändert
  useEffect(() => {
    async function loadHelpContent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/help?route=${encodeURIComponent(pathname)}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data);
        } else {
          setContent(null);
        }
      } catch (error) {
        console.error('Failed to load help content:', error);
        setContent(null);
      } finally {
        setLoading(false);
      }
    }

    loadHelpContent();
  }, [pathname]);

  // Keyboard Shortcut (F1 oder ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || (e.key === '?' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <HelpContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev),
        content,
        loading,
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within HelpProvider');
  }
  return context;
}
```

### HelpButton

```tsx
// components/help/HelpButton.tsx
'use client';

import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useHelp } from './HelpContext';
import clsx from 'clsx';

export function HelpButton() {
  const { toggle, isOpen } = useHelp();

  return (
    <button
      onClick={toggle}
      className={clsx(
        'fixed bottom-6 right-6 z-40 p-3 rounded-full shadow-lg transition-all',
        'bg-primary-600 text-white hover:bg-primary-700',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        isOpen && 'opacity-0 pointer-events-none'
      )}
      aria-label="Hilfe öffnen"
      title="Hilfe (F1)"
    >
      <QuestionMarkCircleIcon className="h-6 w-6" />
    </button>
  );
}
```

### HelpPanel

```tsx
// components/help/HelpPanel.tsx
'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useHelp } from './HelpContext';
import { HelpPanelContent } from './HelpPanelContent';

export function HelpPanel() {
  const { isOpen, close } = useHelp();

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                      <Dialog.Title className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <span>❓</span> Hilfe
                      </Dialog.Title>
                      <button
                        onClick={close}
                        className="rounded-md text-gray-400 hover:text-gray-500"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                      <HelpPanelContent />
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
```

### HelpPanelContent

```tsx
// components/help/HelpPanelContent.tsx
'use client';

import { useHelp } from './HelpContext';
import { HelpFAQ } from './HelpFAQ';
import { HelpTips } from './HelpTips';
import { HelpVideo } from './HelpVideo';
import { HelpSupport } from './HelpSupport';

export function HelpPanelContent() {
  const { content, loading } = useHelp();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-6">
        <p className="text-gray-500 text-center">
          Für diese Seite ist noch keine Hilfe verfügbar.
        </p>
        <HelpSupport />
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {/* FAQ Section */}
      {content.mainArticle && (
        <HelpFAQ article={content.mainArticle} />
      )}

      {/* Tips Section */}
      {content.quickTips.length > 0 && (
        <HelpTips tips={content.quickTips} />
      )}

      {/* Video Section */}
      {content.featureVideo && (
        <HelpVideo video={content.featureVideo} />
      )}

      {/* Support Section */}
      <HelpSupport />
    </div>
  );
}
```

### HelpTips

```tsx
// components/help/HelpTips.tsx
'use client';

import { LightBulbIcon } from '@heroicons/react/24/outline';

interface HelpTipsProps {
  tips: { text: string }[];
}

export function HelpTips({ tips }: HelpTipsProps) {
  return (
    <div className="p-4">
      <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-3">
        <LightBulbIcon className="h-5 w-5 text-yellow-500" />
        Tipps
      </h3>
      <ul className="space-y-2">
        {tips.map((tip, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-primary-500">•</span>
            {tip.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### HelpSupport

```tsx
// components/help/HelpSupport.tsx
'use client';

import { EnvelopeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

export function HelpSupport() {
  const t = useTranslations('help');

  return (
    <div className="p-4 bg-gray-50">
      <h3 className="font-medium text-gray-900 mb-3">
        {t('support.title')}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {t('support.description')}
      </p>
      <div className="space-y-2">
        <a
          href="mailto:support@celeropress.com"
          className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium
                     text-gray-700 bg-white border border-gray-300 rounded-lg
                     hover:bg-gray-50 transition-colors"
        >
          <EnvelopeIcon className="h-4 w-4" />
          {t('support.email')}
        </a>
      </div>
    </div>
  );
}
```

## API Route

```tsx
// app/api/help/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity/client';
import { getLocale } from 'next-intl/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const route = searchParams.get('route');
  const locale = await getLocale();

  if (!route) {
    return NextResponse.json({ error: 'Route required' }, { status: 400 });
  }

  // Finde passendes Mapping (exakt oder Wildcard)
  const query = `*[_type == "helpPageMapping" && (
    $route in routes ||
    count(routes[@ match $routePattern]) > 0
  )][0] {
    pageName,
    "mainArticle": mainArticle-> {
      "title": select($locale == "en" => titleEn, title),
      slug,
      "excerpt": select($locale == "en" => excerptEn, excerpt),
      "category": category-> {
        "title": select($locale == "en" => titleEn, title),
        slug
      }
    },
    "quickTips": quickTips[] {
      "text": select($locale == "en" => tipEn, tip)
    },
    featureVideo
  }`;

  const helpContent = await client.fetch(query, {
    route,
    routePattern: route.replace(/\/[^/]+$/, '/*'),
    locale,
  });

  if (!helpContent) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(helpContent);
}
```

## Integration ins Layout

```tsx
// app/dashboard/layout.tsx
import { HelpProvider } from '@/components/help/HelpContext';
import { HelpButton } from '@/components/help/HelpButton';
import { HelpPanel } from '@/components/help/HelpPanel';

export default function DashboardLayout({ children }) {
  return (
    <HelpProvider>
      <div className="...">
        {/* Bestehender Layout-Content */}
        {children}

        {/* Help Components */}
        <HelpButton />
        <HelpPanel />
      </div>
    </HelpProvider>
  );
}
```

## Features

### Keyboard Shortcuts

| Taste | Aktion |
|-------|--------|
| `F1` | Panel öffnen/schließen |
| `?` | Panel öffnen/schließen |
| `Escape` | Panel schließen |

### Responsive Verhalten

- **Desktop**: Panel 400px breit, Slide-in von rechts
- **Tablet**: Panel 350px breit
- **Mobile**: Vollbild-Modal von unten

### Accessibility

- Focus-Trap im geöffneten Panel
- ARIA-Labels für alle Buttons
- Keyboard-Navigation
- Screen-Reader kompatibel

## Nächste Schritte

- [ ] Komponenten erstellen
- [ ] HelpContext implementieren
- [ ] API-Route bauen
- [ ] Ins Dashboard-Layout integrieren
- [ ] Styling anpassen
- [ ] Keyboard-Shortcuts testen
- [ ] Mobile-Ansicht optimieren
