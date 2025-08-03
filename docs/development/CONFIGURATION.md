# Configuration Guide

## 🔧 SKAMP Konfiguration

Diese Dokumentation beschreibt alle Konfigurationsmöglichkeiten von SKAMP - von Umgebungsvariablen über Next.js-Einstellungen bis zu Firebase-Konfigurationen.

## 📋 Inhaltsverzeichnis

- [Umgebungsvariablen](#umgebungsvariablen)
- [Next.js Konfiguration](#nextjs-konfiguration)
- [Firebase Konfiguration](#firebase-konfiguration)
- [Tailwind CSS Konfiguration](#tailwind-css-konfiguration)
- [TypeScript Konfiguration](#typescript-konfiguration)
- [ESLint & Prettier](#eslint--prettier)
- [Feature Flags](#feature-flags)
- [Sicherheits-Konfiguration](#sicherheits-konfiguration)
- [Performance-Optimierungen](#performance-optimierungen)

## 🔑 Umgebungsvariablen

### Übersicht

SKAMP nutzt Umgebungsvariablen für sensitive Daten und umgebungsspezifische Konfigurationen. Diese werden in `.env.local` (Development) oder über den Hosting-Provider (Production) gesetzt.

### Variablen-Referenz

#### Firebase Konfiguration

```bash
# Client-Side Firebase Config (NEXT_PUBLIC_ Prefix = im Browser verfügbar)
NEXT_PUBLIC_FIREBASE_API_KEY=
# Beschreibung: Firebase Web API Key
# Beispiel: AIzaSyDOCAbC123dEf456GhI789jKl01-MnO
# Erforderlich: Ja

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
# Beschreibung: Firebase Auth Domain
# Beispiel: your-project.firebaseapp.com
# Erforderlich: Ja

NEXT_PUBLIC_FIREBASE_PROJECT_ID=
# Beschreibung: Firebase Project ID
# Beispiel: skamp-production
# Erforderlich: Ja

NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
# Beschreibung: Firebase Storage Bucket
# Beispiel: your-project.appspot.com
# Erforderlich: Ja

NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
# Beschreibung: Firebase Cloud Messaging Sender ID
# Beispiel: 123456789012
# Erforderlich: Ja

NEXT_PUBLIC_FIREBASE_APP_ID=
# Beschreibung: Firebase App ID
# Beispiel: 1:123456789012:web:abcdef123456
# Erforderlich: Ja

# Server-Side Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=
# Beschreibung: Firebase Admin Project ID (gleich wie NEXT_PUBLIC_FIREBASE_PROJECT_ID)
# Beispiel: skamp-production
# Erforderlich: Ja (für API Routes)

FIREBASE_ADMIN_CLIENT_EMAIL=
# Beschreibung: Service Account E-Mail
# Beispiel: firebase-adminsdk-abc12@skamp-production.iam.gserviceaccount.com
# Erforderlich: Ja (für API Routes)

FIREBASE_ADMIN_PRIVATE_KEY=
# Beschreibung: Service Account Private Key (mit \n)
# Beispiel: "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
# Erforderlich: Ja (für API Routes)
# WICHTIG: In Anführungszeichen, mit \n Zeichen!
```

#### SendGrid Konfiguration

```bash
SENDGRID_API_KEY=
# Beschreibung: SendGrid API Key für E-Mail-Versand
# Beispiel: SG.actuallyALongRandomString
# Erforderlich: Ja (für E-Mail-Features)
# Sicherheit: Full Access oder Restricted (Mail Send)

SENDGRID_FROM_EMAIL=
# Beschreibung: Verifizierte Absender-E-Mail
# Beispiel: noreply@skamp.de
# Erforderlich: Ja
# Hinweis: Muss in SendGrid verifiziert sein

SENDGRID_FROM_NAME=
# Beschreibung: Absender-Name für E-Mails
# Beispiel: SKAMP
# Erforderlich: Nein
# Standard: "SKAMP"

SENDGRID_WEBHOOK_SECRET=
# Beschreibung: Webhook Verification Key
# Beispiel: MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQg...
# Erforderlich: Nein (nur für Webhook-Verifikation)
# Generierung: In SendGrid Webhook Settings
```

#### Google AI (Gemini) Konfiguration

```bash
GEMINI_API_KEY=
# Beschreibung: Google Gemini API Key
# Beispiel: AIzaSyDOCAbC123dEf456GhI789jKl01-MnO
# Erforderlich: Ja (für KI-Features)
# Limits: 60 req/min (Free), unbegrenzt (Paid)

GEMINI_MODEL=
# Beschreibung: Gemini Model Version
# Beispiel: gemini-1.5-flash
# Erforderlich: Nein
# Standard: "gemini-1.5-flash"
# Optionen: gemini-1.5-flash, gemini-1.5-pro

GEMINI_MAX_TOKENS=
# Beschreibung: Maximale Token-Anzahl pro Response
# Beispiel: 2048
# Erforderlich: Nein
# Standard: 2048
# Range: 1-8192
```

#### Anwendungs-Konfiguration

```bash
NEXT_PUBLIC_APP_URL=
# Beschreibung: Basis-URL der Anwendung
# Beispiel Development: http://localhost:3000
# Beispiel Production: https://app.skamp.de
# Erforderlich: Ja
# Verwendung: Für absolute URLs (Shares, E-Mails)

NEXT_PUBLIC_APP_NAME=
# Beschreibung: Anwendungsname
# Beispiel: SKAMP
# Erforderlich: Nein
# Standard: "SKAMP"

NEXT_PUBLIC_ENVIRONMENT=
# Beschreibung: Aktuelle Umgebung
# Beispiel: development, staging, production
# Erforderlich: Nein
# Standard: "development"
# Auswirkung: Logging-Level, Error-Reporting

NODE_ENV=
# Beschreibung: Node.js Umgebung
# Werte: development, production, test
# Erforderlich: Automatisch gesetzt
# Hinweis: Nicht manuell setzen!
```

#### Monitoring & Analytics (Optional)

```bash
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
# Beschreibung: Google Analytics 4 Measurement ID
# Beispiel: G-XXXXXXXXXX
# Erforderlich: Nein
# Datenschutz: Cookie-Banner erforderlich

SENTRY_DSN=
# Beschreibung: Sentry Error Tracking DSN
# Beispiel: https://abc123@o123456.ingest.sentry.io/123456
# Erforderlich: Nein
# Empfohlen für: Production

SENTRY_AUTH_TOKEN=
# Beschreibung: Sentry Auth Token für Source Maps
# Beispiel: sntrys_eyJpYXQiOjE2...
# Erforderlich: Nein
# Verwendung: Build-Zeit für Source Map Upload
```

### Umgebungsvariablen-Validierung

Erstelle `src/lib/env.ts` für Validierung:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Firebase
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  
  // SendGrid
  SENDGRID_API_KEY: z.string().startsWith('SG.'),
  SENDGRID_FROM_EMAIL: z.string().email(),
  SENDGRID_FROM_NAME: z.string().optional().default('SKAMP'),
  
  // Gemini
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().optional().default('gemini-1.5-flash'),
  
  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);
```

## ⚙️ Next.js Konfiguration

### next.config.mjs

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode für bessere Entwicklung
  reactStrictMode: true,
  
  // TypeScript und ESLint Fehler blockieren Build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Bilder-Optimierung
  images: {
    domains: [
      'firebasestorage.googleapis.com', // Firebase Storage
      'lh3.googleusercontent.com',      // Google Profile Pictures
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Experimentelle Features
  experimental: {
    // Optimierungen
    optimizePackageImports: ['@heroicons/react', 'date-fns'],
  },
  
  // Headers für Sicherheit
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
  
  // Rewrites für API Proxy (falls benötigt)
  async rewrites() {
    return [
      // Beispiel: Legacy API Support
      // {
      //   source: '/api/v1/:path*',
      //   destination: 'https://old-api.skamp.de/:path*',
      // },
    ];
  },
  
  // Webpack-Konfiguration
  webpack: (config, { isServer }) => {
    // SVG als React-Komponenten
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    
    // Bundle Analyzer (nur in Development)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
        })
      );
    }
    
    return config;
  },
  
  // Environment Variables Runtime Config
  publicRuntimeConfig: {
    version: process.env.npm_package_version,
  },
  
  // Output Configuration
  output: 'standalone', // Für Docker
  poweredByHeader: false, // Sicherheit
  compress: true, // gzip
  
  // Trailing Slash
  trailingSlash: false,
  
  // i18n (Zukunft)
  // i18n: {
  //   locales: ['de', 'en'],
  //   defaultLocale: 'de',
  // },
};

export default nextConfig;
```

### Build-Optimierungen

```javascript
// next.config.mjs Erweiterungen für Production
const productionConfig = {
  // SWC Minify (schneller als Terser)
  swcMinify: true,
  
  // Compiler Optimierungen
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    
    // React Remove Properties
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    
    // Emotion (falls verwendet)
    // emotion: true,
  },
  
  // Module ID Strategie für besseres Caching
  optimization: {
    moduleIds: 'deterministic',
  },
};
```

## 🔥 Firebase Konfiguration

### Firebase Client Config (`src/lib/firebase/config.ts`)

```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton Pattern
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | undefined;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

// Analytics nur im Browser und Production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  analytics = getAnalytics(app);
}

// Firestore Settings
if (process.env.NODE_ENV === 'development') {
  // Offline Persistence
  // enableIndexedDbPersistence(db).catch((err) => {
  //   console.warn('Firestore offline persistence failed:', err);
  // });
}

// Auth Settings
auth.languageCode = 'de'; // Deutsch als Standard

export { app, auth, db, storage, analytics };
```

### Firebase Admin Config (`src/lib/firebase/admin.ts`)

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();

// Firestore Settings
adminDb.settings({
  ignoreUndefinedProperties: true, // Wichtig für TypeScript
});
```

### Firebase Emulator Config

```typescript
// src/lib/firebase/emulator-config.ts
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';
import { auth, db, storage } from './config';

// Nur einmal verbinden
let emulatorsConnected = false;

export function connectToEmulators() {
  if (emulatorsConnected || process.env.NODE_ENV === 'production') {
    return;
  }

  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    emulatorsConnected = true;
    console.log('🔥 Connected to Firebase Emulators');
  } catch (error) {
    console.warn('Failed to connect to emulators:', error);
  }
}

// Auto-connect in development
if (process.env.NODE_ENV === 'development') {
  connectToEmulators();
}
```

## 🎨 Tailwind CSS Konfiguration

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SKAMP Brand Colors
        primary: {
          50: '#e6f3ff',
          100: '#cce7ff',
          200: '#99cfff',
          300: '#66b7ff',
          400: '#339fff',
          500: '#0087ff', // Main
          600: '#006fcc',
          700: '#005799',
          800: '#003f66',
          900: '#002733',
        },
        secondary: colors.gray,
        success: colors.emerald,
        warning: colors.amber,
        error: colors.red,
        
        // Custom Colors
        'brand-blue': '#005fab',
        'brand-orange': '#ff6b35',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem', // 10px
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    // Custom Plugin für Utilities
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.text-balance': {
          'text-wrap': 'balance',
        },
      });
    },
  ],
  // Dark Mode (Zukunft)
  darkMode: 'class',
};

export default config;
```

## 📘 TypeScript Konfiguration

### tsconfig.json

```json
{
  "compilerOptions": {
    // Language and Environment
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    
    // Modules
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    
    // Emit
    "noEmit": true,
    "incremental": true,
    
    // Type Checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,
    
    // JavaScript Support
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    
    // Skip Lib Check
    "skipLibCheck": true,
    
    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/contexts/*": ["./src/contexts/*"],
      "@/services/*": ["./src/services/*"]
    },
    
    // Next.js
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "out",
    "coverage",
    "dist",
    "build"
  ]
}
```

## 🔍 ESLint & Prettier

### .eslintrc.json

```json
{
  "extends": [
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "unused-imports"],
  "rules": {
    // TypeScript
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    
    // React
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    
    // General
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-irregular-whitespace": "error",
    
    // Unused Imports
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      { 
        "vars": "all", 
        "varsIgnorePattern": "^_",
        "args": "after-used", 
        "argsIgnorePattern": "^_" 
      }
    ]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "ignorePatterns": [
    "node_modules/",
    ".next/",
    "out/",
    "public/",
    "*.config.js",
    "*.config.ts"
  ]
}
```

### .prettierrc

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxBracketSameLine": false,
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "embeddedLanguageFormatting": "auto",
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindConfig": "./tailwind.config.ts"
}
```

## 🚩 Feature Flags

### Feature Flag System

```typescript
// src/lib/features.ts
export const features = {
  // KI Features
  AI_TEXT_IMPROVEMENT: process.env.NEXT_PUBLIC_FEATURE_AI_IMPROVEMENT === 'true',
  AI_TEMPLATES: true,
  AI_PERSONALIZATION: false,
  
  // Kalender
  CALENDAR_SYNC: process.env.NEXT_PUBLIC_FEATURE_CALENDAR_SYNC === 'true',
  GOOGLE_CALENDAR: false,
  OUTLOOK_CALENDAR: false,
  
  // Freigaben
  MULTI_APPROVAL: process.env.NEXT_PUBLIC_FEATURE_MULTI_APPROVAL === 'true',
  APPROVAL_COMMENTS: true,
  
  // Mediathek
  IMAGE_EDITING: false,
  VIDEO_SUPPORT: process.env.NEXT_PUBLIC_FEATURE_VIDEO === 'true',
  
  // Analytics
  CAMPAIGN_ANALYTICS: true,
  ADVANCED_TRACKING: false,
  
  // Payment
  BILLING: process.env.NEXT_PUBLIC_FEATURE_BILLING === 'true',
  STRIPE_INTEGRATION: false,
  
  // Experimental
  DARK_MODE: process.env.NEXT_PUBLIC_FEATURE_DARK_MODE === 'true',
  BETA_FEATURES: process.env.NEXT_PUBLIC_ENVIRONMENT !== 'production',
} as const;

// Type-safe feature check
export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature] ?? false;
}

// Feature Flag Hook
export function useFeature(feature: keyof typeof features) {
  return isFeatureEnabled(feature);
}
```

### Verwendung in Komponenten

```typescript
// In React Components
import { useFeature } from '@/lib/features';

function CampaignEditor() {
  const aiImprovementEnabled = useFeature('AI_TEXT_IMPROVEMENT');
  
  return (
    <>
      {aiImprovementEnabled && (
        <Button onClick={improveText}>
          Text mit KI verbessern
        </Button>
      )}
    </>
  );
}

// In API Routes
import { isFeatureEnabled } from '@/lib/features';

export async function POST(req: Request) {
  if (!isFeatureEnabled('AI_TEXT_IMPROVEMENT')) {
    return new Response('Feature not enabled', { status: 403 });
  }
  // ...
}
```

## 🔒 Sicherheits-Konfiguration

### Content Security Policy

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Content Security Policy
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    media-src 'self' https://firebasestorage.googleapis.com;
    connect-src 'self' https://*.firebase.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://api.sendgrid.com;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\n/g, '');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Weitere Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Rate Limiting Config

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Verschiedene Limiter für verschiedene Endpoints
export const rateLimiters = {
  // API allgemein
  api: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true,
  }),
  
  // Auth Endpoints
  auth: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
  }),
  
  // AI Endpoints
  ai: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
  }),
  
  // SendGrid
  email: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(50, '1 h'),
    analytics: true,
  }),
};

// Helper für API Routes
export async function checkRateLimit(
  identifier: string,
  limiter: keyof typeof rateLimiters = 'api'
) {
  const { success, limit, reset, remaining } = await rateLimiters[limiter].limit(identifier);
  
  return {
    allowed: success,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    },
  };
}
```

## ⚡ Performance-Optimierungen

### Bundle-Optimierung

```javascript
// next.config.mjs Ergänzungen
const performanceConfig = {
  // Webpack Bundle Splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Firebase chunk
            firebase: {
              name: 'firebase',
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              chunks: 'all',
              priority: 30,
            },
          },
        },
      };
    }
    return config;
  },
};
```

### Lazy Loading Config

```typescript
// src/lib/lazy-imports.ts
import dynamic from 'next/dynamic';

// Heavy Components
export const RichTextEditor = dynamic(
  () => import('@/components/RichTextEditor'),
  { 
    loading: () => <div>Editor lädt...</div>,
    ssr: false 
  }
);

export const Calendar = dynamic(
  () => import('@/components/Calendar'),
  { 
    loading: () => <div>Kalender lädt...</div>,
    ssr: false 
  }
);

export const ChartComponent = dynamic(
  () => import('@/components/Analytics/Chart'),
  { 
    loading: () => <div>Diagramm lädt...</div>,
    ssr: false 
  }
);

// Lazy load heavy libraries
export const loadPapaParse = () => import('papaparse');
export const loadXLSX = () => import('xlsx');
export const loadPDF = () => import('jspdf');
```

## 📊 Monitoring Konfiguration

### Sentry Setup

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Integrations
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Filtering
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
  
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Event:', event);
      return null;
    }
    
    return event;
  },
});
```

## 🔧 Development Tools Config

### VS Code Workspace Settings

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

## 📚 Weitere Konfigurationen

### package.json Scripts

```json
{
  "scripts": {
    // Development
    "dev": "next dev",
    "dev:turbo": "next dev --turbo",
    
    // Build & Production
    "build": "next build",
    "start": "next start",
    "build:analyze": "ANALYZE=true next build",
    
    // Type Checking & Linting
    "type-check": "tsc --noEmit",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,css,md}\"",
    
    // Testing
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    
    // Firebase
    "firebase:emulators": "firebase emulators:start",
    "firebase:deploy": "firebase deploy",
    
    // Database
    "db:seed": "ts-node scripts/seed-db.ts",
    "db:backup": "ts-node scripts/backup-db.ts",
    
    // Utilities
    "clean": "rm -rf .next out node_modules",
    "reinstall": "npm run clean && npm install",
    "update:deps": "npm update && npm audit fix"
  }
}
```

---

*Diese Konfiguration ist optimiert für SKAMP v1.0.0. Bei Updates siehe [UPGRADE.md](./UPGRADE.md) für Änderungen.*