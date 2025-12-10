# Öffentliche Seiten Internationalisierung

**Status:** Konzept
**Priorität:** Hoch (Kundenrelevant)
**Zuletzt aktualisiert:** 2025-12-10

---

## Übersicht

Öffentliche Seiten sind ohne Login zugänglich und werden von externen Personen (Kunden, Journalisten) genutzt. Diese müssen übersetzt werden:

1. **Freigabe-Seiten** (`/freigabe/[shareId]`) - Kunden geben Pressemeldungen frei
2. **Share-Seiten** (`/share/[shareId]`) - Öffentliche Medien-Freigabe
3. **Marketing-Seiten** (Homepage, Features, Pricing, Login, Signup)

---

## 1. Freigabe-Seiten (Höchste Priorität)

### Betroffene Dateien

| Datei | Beschreibung | Zeilen |
|-------|--------------|--------|
| `src/app/freigabe/[shareId]/page.tsx` | Kundenfreigabe-Interface | ~1176 |
| `src/app/freigabe-nicht-mehr-verfuegbar/page.tsx` | Error-Page | ~74 |

### Aktuelle Texte (Auszug)

```typescript
// Hardcodierte deutsche Texte in freigabe/[shareId]/page.tsx
"Lade Pressemitteilung..."
"Fehler beim Laden..."
"Freigabe erfolgreich erteilt"
"Passwort erforderlich"
"Änderungen angefordert"
"Freigabe anfordern"
"Kommentar hinzufügen"
"Versionshistorie"
"Status: Freigegeben"
"Status: Ausstehend"
"Status: Änderungen angefordert"
// ... und viele mehr
```

### Namespace-Struktur

```json
{
  "approval": {
    "loading": "Loading press release...",
    "error": {
      "loading": "Error loading...",
      "notFound": "Press release not found",
      "expired": "This approval link has expired"
    },
    "password": {
      "required": "Password required",
      "placeholder": "Enter password",
      "submit": "Submit",
      "incorrect": "Incorrect password"
    },
    "status": {
      "pending": "Pending",
      "approved": "Approved",
      "changesRequested": "Changes Requested",
      "expired": "Expired"
    },
    "actions": {
      "approve": "Approve",
      "requestChanges": "Request Changes",
      "addComment": "Add Comment",
      "viewHistory": "View History"
    },
    "success": {
      "approved": "Approval granted successfully",
      "commentAdded": "Comment added"
    },
    "form": {
      "commentPlaceholder": "Enter your feedback...",
      "submitComment": "Submit Comment"
    }
  }
}
```

### Implementierungsplan

#### Phase 1: next-intl für öffentliche Seiten einrichten

Da die Freigabe-Seiten außerhalb des Dashboard-Layouts liegen, muss next-intl auch dort verfügbar sein.

**Option A: URL-basierte Locale**
```
/de/freigabe/[shareId]
/en/freigabe/[shareId]
```

**Option B: Cookie/Header-basierte Locale (Empfohlen)**
- Locale aus Accept-Language Header
- Oder aus Cookie (wenn User Sprache gewählt hat)
- Keine URL-Änderung nötig

#### Phase 2: Freigabe-Seite migrieren

**Datei:** `src/app/freigabe/[shareId]/page.tsx`

```typescript
// VORHER
'use client';
import { ... } from 'react';

export default function FreigabePage() {
  return (
    <div>
      <h1>Freigabe</h1>
      <p>Lade Pressemitteilung...</p>
    </div>
  );
}

// NACHHER
'use client';
import { useTranslations } from 'next-intl';

export default function ApprovalPage() {
  const t = useTranslations('approval');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('loading')}</p>
    </div>
  );
}
```

#### Phase 3: Sprach-Switcher für öffentliche Seiten

```tsx
// Komponente für Sprach-Auswahl auf öffentlichen Seiten
function PublicLanguageSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();

  return (
    <div className="absolute top-4 right-4">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="text-sm border rounded"
      >
        <option value="de">🇩🇪 Deutsch</option>
        <option value="en">🇬🇧 English</option>
      </select>
    </div>
  );
}
```

---

## 2. Share-Seiten

### Betroffene Dateien

| Datei | Beschreibung | Zeilen |
|-------|--------------|--------|
| `src/app/share/[shareId]/page.tsx` | Öffentliche Medien-Freigabe | ~444 |

### Aktuelle Texte

```typescript
"Lade geteilten Inhalt..."
"Fehler beim Laden des Inhalts"
"Passwort eingeben"
"Falsches Passwort"
"Keine Medien in dieser Kampagne gefunden"
"Herunterladen"
"Alle herunterladen"
```

### Namespace-Struktur

```json
{
  "share": {
    "loading": "Loading shared content...",
    "error": {
      "loading": "Error loading content",
      "notFound": "Content not found",
      "noMedia": "No media found in this campaign"
    },
    "password": {
      "required": "Password required",
      "placeholder": "Enter password",
      "submit": "Submit",
      "incorrect": "Incorrect password"
    },
    "actions": {
      "download": "Download",
      "downloadAll": "Download All",
      "preview": "Preview"
    }
  }
}
```

---

## 3. Marketing-Seiten (Niedrigere Priorität)

### Betroffene Dateien

| Datei | Beschreibung | Zeilen |
|-------|--------------|--------|
| `src/app/(marketing)/page.tsx` | Homepage | ~316 |
| `src/app/(marketing)/features/page.tsx` | Features | ~375 |
| `src/app/(marketing)/pricing/page.tsx` | Pricing | ~450 |
| `src/app/(marketing)/login/page.tsx` | Login | ~230 |
| `src/app/(marketing)/signup/page.tsx` | Signup | ~351 |

### Namespace-Struktur für Marketing

```json
{
  "marketing": {
    "home": {
      "hero": {
        "title": "PR with AI Power",
        "subtitle": "The modern platform for press releases",
        "cta": "Book Onboarding Now"
      },
      "features": {
        "title": "What CeleroPress offers",
        "items": [...]
      }
    },
    "features": {
      "title": "All Features at a Glance",
      "subtitle": "Everything you need for modern PR work"
    },
    "pricing": {
      "title": "Pricing that grows with your team",
      "plans": {...},
      "faq": {...}
    },
    "auth": {
      "login": {
        "title": "Welcome back!",
        "emailLabel": "Email Address",
        "passwordLabel": "Password",
        "submit": "Sign In",
        "forgotPassword": "Forgot Password?",
        "noAccount": "Don't have an account?"
      },
      "signup": {
        "title": "Create Account",
        "emailLabel": "Email Address",
        "passwordLabel": "Password",
        "confirmPassword": "Confirm Password",
        "submit": "Sign Up",
        "hasAccount": "Already have an account?",
        "termsAgreement": "I agree to the Terms of Service"
      }
    }
  }
}
```

---

## 4. Sprach-Erkennung für öffentliche Seiten

### Strategie

```typescript
// Hierarchie der Sprach-Ermittlung
async function getPublicPageLocale(request: NextRequest): Promise<'de' | 'en'> {
  // 1. URL-Parameter (?lang=en)
  const urlParam = request.nextUrl.searchParams.get('lang');
  if (urlParam === 'en' || urlParam === 'de') {
    return urlParam;
  }

  // 2. Cookie
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale === 'en' || cookieLocale === 'de') {
    return cookieLocale;
  }

  // 3. Accept-Language Header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage?.startsWith('en')) {
    return 'en';
  }

  // 4. Default
  return 'de';
}
```

### Middleware für öffentliche Seiten

**Datei:** `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Öffentliche Seiten die Locale brauchen
  if (
    pathname.startsWith('/freigabe') ||
    pathname.startsWith('/share') ||
    pathname === '/' ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup')
  ) {
    const locale = getPublicPageLocale(request);

    // Locale in Header setzen für getLocale()
    const response = NextResponse.next();
    response.headers.set('x-locale', locale);
    return response;
  }

  return NextResponse.next();
}
```

---

## 5. Layout für öffentliche Seiten

### Aktuelles Layout

Die Marketing-Seiten nutzen `(marketing)/layout.tsx`, die Freigabe-Seiten haben kein eigenes Layout.

### Empfohlene Struktur

```
src/app/
├── (marketing)/
│   ├── layout.tsx          # Marketing Layout mit Nav/Footer
│   ├── page.tsx            # Homepage
│   ├── features/
│   ├── pricing/
│   ├── login/
│   └── signup/
├── freigabe/
│   ├── layout.tsx          # NEU: Minimal Layout mit Sprach-Switcher
│   └── [shareId]/
│       └── page.tsx
├── share/
│   ├── layout.tsx          # NEU: Minimal Layout mit Sprach-Switcher
│   └── [shareId]/
│       └── page.tsx
```

### Neues Layout für Freigabe/Share

```tsx
// src/app/freigabe/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import PublicLanguageSwitcher from '@/components/public/PublicLanguageSwitcher';

export default async function ApprovalLayout({
  children
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen bg-gray-50">
        <PublicLanguageSwitcher />
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
```

---

## 6. Übersetzungsdateien Struktur

### messages/de.json (Erweiterung)

```json
{
  "approval": { ... },
  "share": { ... },
  "marketing": { ... }
}
```

### messages/en.json (Erweiterung)

```json
{
  "approval": { ... },
  "share": { ... },
  "marketing": { ... }
}
```

---

## 7. Priorisierte Migrations-Reihenfolge

### Priorität 1: Kundenrelevant (KRITISCH)

| Seite | Namespace | Aufwand |
|-------|-----------|---------|
| `/freigabe/[shareId]` | `approval` | 6h |
| `/share/[shareId]` | `share` | 3h |

### Priorität 2: Auth-Flow

| Seite | Namespace | Aufwand |
|-------|-----------|---------|
| `/login` | `marketing.auth.login` | 2h |
| `/signup` | `marketing.auth.signup` | 2h |

### Priorität 3: Marketing (kann warten)

| Seite | Namespace | Aufwand |
|-------|-----------|---------|
| `/` (Homepage) | `marketing.home` | 3h |
| `/features` | `marketing.features` | 2h |
| `/pricing` | `marketing.pricing` | 2h |

---

## 8. Technische Herausforderungen

### 1. SEO für mehrsprachige Marketing-Seiten

```tsx
// Hreflang Tags für SEO
export async function generateMetadata() {
  return {
    alternates: {
      languages: {
        'de': '/de',
        'en': '/en',
      },
    },
  };
}
```

### 2. Dynamische OG-Images

```tsx
// Mehrsprachige Open Graph Images
export const metadata = {
  openGraph: {
    images: [
      {
        url: `/api/og?locale=${locale}`,
        width: 1200,
        height: 630,
      },
    ],
  },
};
```

### 3. Formular-Validierung

```tsx
// Mehrsprachige Fehlermeldungen in Formularen
const validationMessages = {
  de: {
    required: 'Dieses Feld ist erforderlich',
    email: 'Bitte gib eine gültige E-Mail-Adresse ein',
  },
  en: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
  },
};
```

---

## 9. Test-Szenarien

### Freigabe-Seite

- [ ] Deutsche Version vollständig
- [ ] Englische Version vollständig
- [ ] Sprach-Switcher funktioniert
- [ ] Passwort-Dialog in beiden Sprachen
- [ ] Fehler-Meldungen in beiden Sprachen
- [ ] Status-Labels in beiden Sprachen

### Share-Seite

- [ ] Deutsche Version vollständig
- [ ] Englische Version vollständig
- [ ] Download-Buttons in beiden Sprachen

### Marketing-Seiten

- [ ] Homepage in beiden Sprachen
- [ ] Login/Signup in beiden Sprachen
- [ ] SEO-Tags korrekt pro Sprache

---

## 10. Aufwandsschätzung

| Bereich | Aufwand |
|---------|---------|
| Freigabe-Seite (`/freigabe`) | 6h |
| Share-Seite (`/share`) | 3h |
| Error-Page | 1h |
| Auth-Seiten (Login/Signup) | 4h |
| Marketing-Seiten (Homepage, Features, Pricing) | 7h |
| Layouts & Middleware | 2h |
| Tests | 3h |
| **Gesamt** | **~26h** |

---

## 11. Abhängigkeiten

- next-intl Setup (bereits vorhanden)
- Middleware-Anpassung für öffentliche Routen
- Cookie-basierte Locale-Persistierung

---

## 12. Empfohlene Reihenfolge

1. **Freigabe-Seite** - Höchste Priorität, Kunden nutzen diese
2. **Share-Seite** - Journalisten/Partner nutzen diese
3. **Login/Signup** - Auth-Flow für neue User
4. **Marketing-Seiten** - Kann als letztes erfolgen

