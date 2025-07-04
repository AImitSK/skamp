# Setup & Installation Guide

## 🚀 SKAMP Entwicklungsumgebung einrichten

Diese Anleitung führt Sie Schritt für Schritt durch die Einrichtung einer lokalen Entwicklungsumgebung für SKAMP.

## 📋 Inhaltsverzeichnis

- [Voraussetzungen](#voraussetzungen)
- [Quick Start](#quick-start)
- [Detaillierte Installation](#detaillierte-installation)
- [Firebase Setup](#firebase-setup)
- [SendGrid Setup](#sendgrid-setup)
- [Google Gemini Setup](#google-gemini-setup)
- [Entwicklungsumgebung](#entwicklungsumgebung)
- [Datenbank-Initialisierung](#datenbank-initialisierung)
- [Häufige Probleme](#häufige-probleme)
- [Nächste Schritte](#nächste-schritte)

## ✅ Voraussetzungen

### System-Anforderungen

- **Betriebssystem**: Windows 10+, macOS 10.15+, oder Linux (Ubuntu 20.04+ empfohlen)
- **RAM**: Mindestens 8GB (16GB empfohlen)
- **Festplatte**: 2GB freier Speicherplatz

### Software-Anforderungen

1. **Node.js** (18.17+ oder 20+ LTS)
   ```bash
   # Version prüfen
   node --version  # sollte v18.17.0 oder höher sein
   npm --version   # sollte 9.0.0 oder höher sein
   ```

2. **Git**
   ```bash
   git --version  # sollte 2.25.0 oder höher sein
   ```

3. **Code Editor** (VS Code empfohlen)
   - [Download VS Code](https://code.visualstudio.com/)

4. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version  # sollte 12.0.0 oder höher sein
   ```

### Accounts (kostenlos)

- [ ] [GitHub Account](https://github.com/signup)
- [ ] [Firebase/Google Account](https://console.firebase.google.com/)
- [ ] [SendGrid Account](https://signup.sendgrid.com/)
- [ ] [Google AI Studio Account](https://makersuite.google.com/)

## 🏃 Quick Start

Für erfahrene Entwickler - komplette Installation in 5 Minuten:

```bash
# 1. Repository klonen
git clone https://github.com/skamp/skamp.git
cd skamp

# 2. Dependencies installieren
npm install

# 3. Umgebungsvariablen kopieren
cp .env.example .env.local

# 4. .env.local mit Ihren Keys ausfüllen
# (siehe Detaillierte Installation)

# 5. Development Server starten
npm run dev

# 6. Browser öffnen
open http://localhost:3000
```

## 📝 Detaillierte Installation

### Schritt 1: Repository klonen

```bash
# HTTPS (empfohlen)
git clone https://github.com/skamp/skamp.git

# oder SSH (wenn konfiguriert)
git clone git@github.com:skamp/skamp.git

# In Projekt-Verzeichnis wechseln
cd skamp
```

### Schritt 2: Node.js Version prüfen

```bash
# Node Version prüfen
node --version

# Falls Node nicht installiert ist:
# Windows: https://nodejs.org/en/download/
# macOS: brew install node
# Linux: sudo apt install nodejs npm
```

Für mehrere Node-Versionen empfehlen wir [nvm](https://github.com/nvm-sh/nvm):

```bash
# nvm installieren (macOS/Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Node 20 LTS installieren und verwenden
nvm install 20
nvm use 20
```

### Schritt 3: Dependencies installieren

```bash
# Mit npm (Standard)
npm install

# oder mit yarn
yarn install

# oder mit pnpm (schneller)
pnpm install
```

Dies installiert alle notwendigen Pakete:
- Next.js 14 & React 18
- Firebase SDK
- Tailwind CSS
- TypeScript
- und viele mehr...

### Schritt 4: Umgebungsvariablen einrichten

```bash
# Template kopieren
cp .env.example .env.local

# .env.local in Editor öffnen
code .env.local  # VS Code
# oder
nano .env.local  # Terminal
```

Die `.env.local` Datei sollte folgende Struktur haben:

```bash
# ===========================
# FIREBASE CONFIGURATION
# ===========================
# Aus Firebase Console > Project Settings > General
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK - Aus Service Account JSON
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# ===========================
# SENDGRID CONFIGURATION
# ===========================
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=SKAMP

# ===========================
# GOOGLE AI (GEMINI)
# ===========================
GEMINI_API_KEY=

# ===========================
# APP CONFIGURATION
# ===========================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=SKAMP
NEXT_PUBLIC_ENVIRONMENT=development
```

## 🔥 Firebase Setup

### 1. Firebase Projekt erstellen

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Klicke auf "Projekt hinzufügen"
3. Projektname: `skamp-dev` (oder ähnlich)
4. Google Analytics: Optional (kann aktiviert werden)
5. Warte bis das Projekt erstellt ist

### 2. Firebase Services aktivieren

#### Authentication
1. Im Firebase Console: **Authentication** → **Get started**
2. **Sign-in method** → **Email/Password** aktivieren
3. (Optional) **Google** als Provider hinzufügen

#### Firestore Database
1. **Firestore Database** → **Create database**
2. **Start in production mode** wählen
3. Location: `eur3 (Europe)` für DSGVO
4. **Enable** klicken

#### Storage
1. **Storage** → **Get started**
2. **Start in production mode**
3. Location: Gleiche wie Firestore
4. **Done** klicken

### 3. Firebase Konfiguration abrufen

1. **Project Settings** (Zahnrad-Icon)
2. Scrolle zu **Your apps** → **Web app**
3. App registrieren: Name `SKAMP Web`
4. Firebase SDK snippet: **Config** auswählen
5. Kopiere die Werte in `.env.local`:

```javascript
// Diese Werte in .env.local eintragen:
const firebaseConfig = {
  apiKey: "...",            // → NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "...",        // → NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "...",         // → NEXT_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "...",     // → NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "...", // → NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "..."              // → NEXT_PUBLIC_FIREBASE_APP_ID
};
```

### 4. Firebase Admin SDK einrichten

1. **Project Settings** → **Service accounts**
2. **Generate new private key** → **Generate key**
3. JSON-Datei wird heruntergeladen
4. Öffne die JSON-Datei und kopiere:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (mit Anführungszeichen!)

⚠️ **WICHTIG**: Die private_key muss genau so kopiert werden, inklusive `\n` Zeichen!

### 5. Security Rules deployen

```bash
# Firebase einloggen
firebase login

# Projekt initialisieren
firebase init
# Wähle: Firestore, Storage
# Use existing project → dein-projekt
# Firestore Rules: firestore.rules (default)
# Storage Rules: storage.rules (default)

# Rules deployen
firebase deploy --only firestore:rules,storage:rules
```

### 6. Firestore Indizes erstellen

Erstelle `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "contacts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "lastName", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "companies",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "pr_campaigns",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy:
```bash
firebase deploy --only firestore:indexes
```

## 📧 SendGrid Setup

### 1. SendGrid Account erstellen

1. Gehe zu [SendGrid Signup](https://signup.sendgrid.com/)
2. Fülle das Formular aus (kostenloser Plan reicht)
3. E-Mail bestätigen
4. Warte auf Account-Aktivierung (kann 1-2 Stunden dauern)

### 2. API Key erstellen

1. **Settings** → **API Keys** → **Create API Key**
2. API Key Name: `SKAMP Development`
3. API Key Permissions: **Full Access**
4. **Create & View** klicken
5. API Key kopieren → `SENDGRID_API_KEY` in `.env.local`

### 3. Sender Verification

1. **Settings** → **Sender Authentication**
2. **Single Sender Verification** (für Development)
3. Fülle das Formular aus:
   - From Email: `noreply@yourdomain.com`
   - From Name: `SKAMP`
4. Bestätigungsmail öffnen und verifizieren

### 4. Webhook einrichten (Optional)

Für E-Mail-Tracking in Development:

1. Nutze [ngrok](https://ngrok.com/) für lokale Webhooks:
   ```bash
   ngrok http 3000
   ```

2. In SendGrid: **Settings** → **Mail Settings** → **Event Webhook**
3. HTTP Post URL: `https://your-ngrok-url.ngrok.io/api/webhooks/sendgrid`
4. Events auswählen: Delivered, Opened, Clicked, Bounced

## 🤖 Google Gemini Setup

### 1. Google AI Studio

1. Gehe zu [Google AI Studio](https://makersuite.google.com/)
2. Mit Google Account einloggen
3. **Get API key** → **Create API key**
4. **Create API key in new project** oder existing wählen
5. API Key kopieren → `GEMINI_API_KEY` in `.env.local`

### 2. API Limits prüfen

- Free Tier: 60 Requests/Minute
- Reicht für Development völlig aus
- Production: Upgrade zu Pay-as-you-go empfohlen

## 💻 Entwicklungsumgebung

### VS Code Extensions

Installiere diese empfohlenen Extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "formulahendry.auto-rename-tag",
    "aaron-bond.better-comments",
    "usernamehw.errorlens",
    "wix.vscode-import-cost"
  ]
}
```

Oder installiere alle auf einmal:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
# ... etc
```

### VS Code Settings

Erstelle `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### Git Hooks einrichten

```bash
# Husky installieren (falls nicht bereits geschehen)
npm install --save-dev husky lint-staged
npx husky install

# Pre-commit Hook
npx husky add .husky/pre-commit "npx lint-staged"
```

## 🗄️ Datenbank-Initialisierung

### Test-Daten erstellen (Optional)

Erstelle `scripts/seed-db.ts`:

```typescript
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp();
const db = getFirestore();

async function seedDatabase() {
  // Test-Firma erstellen
  const companyRef = await db.collection('companies').add({
    name: 'Test Medienhaus GmbH',
    type: 'media_house',
    address: {
      street: 'Musterstraße 1',
      city: 'Berlin',
      zip: '10115',
      country: 'DE'
    },
    mediaInfo: {
      mediaType: 'print',
      publications: [{
        name: 'Test Tageszeitung',
        type: 'newspaper',
        frequency: 'daily',
        circulation: 50000
      }]
    },
    userId: 'development-user',
    createdAt: new Date()
  });

  // Test-Kontakt erstellen
  await db.collection('contacts').add({
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@testmedien.de',
    companyId: companyRef.id,
    companyName: 'Test Medienhaus GmbH',
    position: 'Chefredakteur',
    mediaInfo: {
      publications: ['Test Tageszeitung'],
      topics: ['Politik', 'Wirtschaft']
    },
    userId: 'development-user',
    createdAt: new Date()
  });

  console.log('✅ Test-Daten erstellt!');
}

seedDatabase().catch(console.error);
```

Ausführen:
```bash
npx ts-node scripts/seed-db.ts
```

### Firebase Emulators (Lokal testen)

```bash
# Emulators einrichten
firebase init emulators
# Wähle: Authentication, Firestore, Storage

# Emulators starten
firebase emulators:start

# Mit Daten-Import/Export
firebase emulators:start --import=./emulator-data --export-on-exit
```

## 🚨 Häufige Probleme

### Problem: "Module not found"

```bash
# Cache löschen und neu installieren
rm -rf node_modules package-lock.json
npm install
```

### Problem: "Firebase App not initialized"

Prüfe:
1. Sind alle Firebase ENV-Variablen gesetzt?
2. Ist `.env.local` im richtigen Format?
3. Server neu starten nach ENV-Änderungen

### Problem: "CORS Error" bei API Calls

```typescript
// In next.config.mjs hinzufügen:
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
      ],
    },
  ];
}
```

### Problem: "SendGrid 401 Unauthorized"

1. API Key korrekt? (Beginnt mit `SG.`)
2. Sender verifiziert?
3. Account aktiviert? (E-Mail prüfen)

### Problem: "Gemini API Rate Limit"

```typescript
// Rate Limiting implementieren:
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 50,
  interval: 'minute'
});

await limiter.removeTokens(1);
// Dann API Call
```

### Problem: Build Fehler

```bash
# Type-Check
npm run type-check

# Linter
npm run lint

# Clean Build
rm -rf .next
npm run build
```

## ✅ Verifizierung

### 1. Development Server testen

```bash
npm run dev
```

Öffne http://localhost:3000 - du solltest die SKAMP Landing Page sehen.

### 2. Registrierung testen

1. Klicke auf "Registrieren"
2. Erstelle einen Test-Account
3. Du solltest zum Dashboard weitergeleitet werden

### 3. Firebase Connection testen

In der Browser-Konsole (F12):

```javascript
// Sollte keine Fehler zeigen
console.log('Firebase initialized:', window.firebase);
```

### 4. Build testen

```bash
npm run build
npm start
```

Wenn der Build erfolgreich ist, ist alles korrekt eingerichtet!

## 🎯 Nächste Schritte

### 1. Entwicklung starten

```bash
# Feature Branch erstellen
git checkout -b feature/mein-feature

# Änderungen machen
# ...

# Tests ausführen
npm test

# Commit
git add .
git commit -m "feat: Add awesome feature"
```

### 2. Dokumentation lesen

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [API Documentation](./docs/API.md)

### 3. Erste Aufgaben

Gute Starter-Issues:
- UI-Verbesserungen
- Dokumentation erweitern
- Tests hinzufügen
- Kleine Bug Fixes

### 4. Hilfe bekommen

- GitHub Issues für Bugs/Features
- Discussions für Fragen
- E-Mail: entwicklung@skamp.de

## 🔗 Nützliche Links

### Dokumentation
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)

### Tools
- [Firebase Console](https://console.firebase.google.com/)
- [SendGrid Dashboard](https://app.sendgrid.com/)
- [Google AI Studio](https://makersuite.google.com/)
- [Vercel Dashboard](https://vercel.com/dashboard)

---

**Viel Erfolg mit SKAMP! 🚀**

*Bei Problemen: Erstelle ein Issue auf GitHub oder kontaktiere uns direkt.*