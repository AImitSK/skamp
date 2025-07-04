# SKAMP Deployment Guide

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Voraussetzungen](#voraussetzungen)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Deployment-Optionen](#deployment-optionen)
  - [Vercel (Empfohlen)](#vercel-empfohlen)
  - [Firebase Hosting](#firebase-hosting)
  - [Self-Hosted](#self-hosted)
- [Produktions-Checkliste](#produktions-checkliste)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Skalierung](#skalierung)
- [Troubleshooting](#troubleshooting)

## 🌐 Übersicht

SKAMP ist eine Next.js 14 Anwendung, die für verschiedene Hosting-Umgebungen optimiert ist. Diese Anleitung führt Sie durch den kompletten Deployment-Prozess von der Entwicklung bis zur Produktion.

### Architektur-Übersicht

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│   Next.js App   │────▶│  Firebase BaaS   │────▶│    SendGrid     │
│   (Frontend)    │     │  (Backend)       │     │    (Email)      │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                         │
        │                        │                         │
        ▼                        ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     Vercel      │     │   Firestore DB   │     │  Google Gemini  │
│  (Hosting CDN)  │     │    Storage       │     │      (AI)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## ✅ Voraussetzungen

### Entwicklungsumgebung
- Node.js 18.17+ oder 20+ (LTS empfohlen)
- npm 9+ oder yarn 1.22+
- Git

### Externe Services (Accounts erforderlich)
1. **Firebase** (Google Cloud)
   - Neues Projekt erstellen
   - Firestore, Authentication, Storage aktivieren
   
2. **SendGrid** (Twilio)
   - Account erstellen
   - API Key generieren
   - Domain verifizieren

3. **Google AI Studio**
   - Gemini API Key erstellen
   - Quota-Limits prüfen

4. **Hosting** (einer von):
   - Vercel Account
   - Firebase Hosting
   - VPS/Cloud Server

## 🔑 Umgebungsvariablen

Erstellen Sie eine `.env.production` Datei im Root-Verzeichnis:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (für API Routes)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# SendGrid
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=SKAMP

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_APP_NAME=SKAMP
NEXT_PUBLIC_ENVIRONMENT=production

# Optional: Monitoring
SENTRY_DSN=your-sentry-dsn
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Sicherheitshinweise
- **Niemals** `.env.production` ins Git Repository committen
- Verwenden Sie Umgebungsvariablen des Hosting-Providers
- Rotieren Sie API Keys regelmäßig
- Beschränken Sie Firebase Admin SDK Berechtigungen

## 🚀 Deployment-Optionen

### Vercel (Empfohlen)

Vercel bietet die beste Integration für Next.js Apps mit automatischen Deployments.

#### 1. Vorbereitung

```bash
# Vercel CLI installieren
npm i -g vercel

# Build testen
npm run build
```

#### 2. Initiales Deployment

```bash
# Im Projekt-Root
vercel

# Folgen Sie den Prompts:
# - Set up and deploy? Yes
# - Which scope? (Ihr Account)
# - Link to existing project? No
# - Project name? skamp
# - Directory? ./
# - Override settings? No
```

#### 3. Umgebungsvariablen konfigurieren

```bash
# Einzeln hinzufügen
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add SENDGRID_API_KEY production

# Oder über Dashboard
# https://vercel.com/[your-account]/skamp/settings/environment-variables
```

#### 4. Domain konfigurieren

```bash
# Custom Domain hinzufügen
vercel domains add app.yourdomain.com

# DNS-Einträge konfigurieren (bei Ihrem Provider)
# A Record: @ -> 76.76.21.21
# CNAME: app -> cname.vercel-dns.com
```

#### 5. Automatische Deployments

Verbinden Sie Ihr GitHub Repository für automatische Deployments:

1. Vercel Dashboard → Project Settings → Git
2. Repository verbinden
3. Branch-Deployments konfigurieren:
   - `main` → Production
   - `develop` → Preview

### Firebase Hosting

Firebase Hosting ist ideal, wenn Sie alles im Google-Ökosystem halten möchten.

#### 1. Firebase CLI Setup

```bash
# Firebase CLI installieren
npm install -g firebase-tools

# Login
firebase login

# Projekt initialisieren
firebase init
# Wählen Sie: Hosting, Functions (optional)
# Existing project → Ihr Firebase Projekt
# Public directory: out
# Single-page app: No
# Automatic builds: No
```

#### 2. Build-Konfiguration

Erstellen Sie `firebase.json`:

```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

#### 3. Next.js für Static Export konfigurieren

Aktualisieren Sie `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Für static export
  },
  // Weitere Konfiguration...
}

export default nextConfig
```

#### 4. Deploy

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting

# Mit GitHub Actions (siehe .github/workflows/firebase-hosting.yml)
```

### Self-Hosted

Für vollständige Kontrolle oder On-Premise Anforderungen.

#### 1. Server-Vorbereitung

```bash
# Ubuntu 22.04 LTS
# Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 für Process Management
sudo npm install -g pm2

# Nginx für Reverse Proxy
sudo apt-get install nginx
```

#### 2. Anwendung vorbereiten

```bash
# Repository klonen
git clone https://github.com/youraccount/skamp.git
cd skamp

# Dependencies installieren
npm install

# Production Build
npm run build
```

#### 3. PM2 Konfiguration

Erstellen Sie `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'skamp',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
```

#### 4. Nginx Konfiguration

```nginx
# /etc/nginx/sites-available/skamp
server {
    listen 80;
    server_name app.yourdomain.com;
    
    # SSL redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5. SSL mit Let's Encrypt

```bash
# Certbot installieren
sudo apt-get install certbot python3-certbot-nginx

# SSL Zertifikat erstellen
sudo certbot --nginx -d app.yourdomain.com

# Auto-Renewal testen
sudo certbot renew --dry-run
```

#### 6. Deployment starten

```bash
# PM2 starten
pm2 start ecosystem.config.js

# PM2 beim Boot starten
pm2 startup
pm2 save

# Nginx aktivieren
sudo ln -s /etc/nginx/sites-available/skamp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## ✔️ Produktions-Checkliste

### Vor dem Go-Live

- [ ] **Performance**
  - [ ] Lighthouse Score >90
  - [ ] Bundle Size optimiert (<500KB First Load)
  - [ ] Images optimiert (WebP, richtige Größen)
  - [ ] Lazy Loading implementiert

- [ ] **Sicherheit**
  - [ ] Alle API Keys in Umgebungsvariablen
  - [ ] Firebase Security Rules konfiguriert
  - [ ] CORS richtig eingestellt
  - [ ] Rate Limiting aktiviert
  - [ ] SQL Injection Prevention (Firestore ist NoSQL)

- [ ] **Firebase Konfiguration**
  - [ ] Firestore Indizes erstellt
  - [ ] Security Rules für Production (siehe oben)
  - [ ] Storage Rules konfiguriert
  - [ ] Backup-Strategie implementiert
  - [ ] Firestore Composite Indizes:
    ```
    // Benötigte Indizes in firestore.indexes.json
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
          "collectionGroup": "media_assets",
          "queryScope": "COLLECTION",
          "fields": [
            { "fieldPath": "userId", "order": "ASCENDING" },
            { "fieldPath": "folderId", "order": "ASCENDING" },
            { "fieldPath": "uploadedAt", "order": "DESCENDING" }
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

- [ ] **E-Mail Setup**
  - [ ] SendGrid Domain verifiziert
  - [ ] SPF/DKIM Records gesetzt
  - [ ] Bounce Handling konfiguriert
  - [ ] Unsubscribe Links funktionieren

- [ ] **Monitoring**
  - [ ] Error Tracking (Sentry)
  - [ ] Performance Monitoring
  - [ ] Uptime Monitoring
  - [ ] Log Aggregation

- [ ] **Rechtliches**
  - [ ] Datenschutzerklärung aktuell
  - [ ] Impressum vollständig
  - [ ] Cookie-Banner (falls nötig)
  - [ ] DSGVO-Compliance

### Firebase Security Rules

#### Firestore Rules

Erstellen Sie `firestore.rules` mit folgenden Sicherheitsregeln:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // === CRM COLLECTIONS ===
    
    // Regeln für Firmen
    match /companies/{companyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Regeln für Kontakte
    match /contacts/{contactId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Regeln für Tags
    match /tags/{tagId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // === LISTEN SYSTEM ===
    
    // Regeln für Verteilerlisten
    match /distribution_lists/{listId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // === PR SYSTEM ===
    
    // Regeln für PR-Kampagnen
    match /pr_campaigns/{campaignId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId &&
        (!('clientId' in request.resource.data) || 
         (request.resource.data.clientId != null && request.resource.data.clientId != ''));
    }
    
    // PR Freigabe-Links - Öffentlich für Freigabe-Workflow
    match /pr_approval_shares/{docId} {
      allow create: if request.auth != null;
      allow read: if true; // Öffentlich lesbar - Sicherheit via shareId
      allow update: if true; // Für Status-Updates (viewed, feedback, approved)
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // === MEDIATHEK SYSTEM ===
    
    // Medien-Assets - App-Level Security
    match /media_assets/{assetId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow read: if true; // App kontrolliert Zugriff via Share-Links
    }
    
    // Medien-Ordner
    match /media_folders/{folderId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow read: if true; // App kontrolliert Zugriff
    }
    
    // Share-Links für Medien
    match /media_shares/{shareId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow read: if true; // Öffentlich - Sicherheit via shareId
    }
    
    // === WEITERE COLLECTIONS ===
    
    // Asset-Collections für Kampagnen
    match /asset_collections/{collectionId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.createdBy ||
         request.auth.uid == resource.data.userId);
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.createdBy &&
        request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
    }
    
    // Asset-Access-Logs für Compliance
    match /asset_access_logs/{logId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if true; // Für Tracking
      allow update, delete: if false; // Unveränderlich
    }
    
    // Boilerplates (Textbausteine)
    match /boilerplates/{boilerplateId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Tasks
    match /tasks/{taskId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.userId &&
                       request.resource.data.keys().hasAll(['userId', 'title', 'status', 'priority']);
      allow update: if request.auth != null && 
                       request.auth.uid == resource.data.userId &&
                       request.auth.uid == request.resource.data.userId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Weitere Collections hier...
  }
}
```

#### Storage Rules

Erstellen Sie `storage.rules` für Firebase Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Benutzer-Medien - nur der eigene Benutzer kann seine Dateien verwalten
    match /users/{userId}/media/{allPaths=**} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Alle anderen Pfade blockieren
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

#### Rules Deployment

```bash
# Firestore Rules deployen
firebase deploy --only firestore:rules

# Storage Rules deployen  
firebase deploy --only storage:rules

# Beide zusammen
firebase deploy --only firestore:rules,storage:rules
```

#### Wichtige Sicherheitshinweise

1. **Öffentliche Share-Links**: Die Collections `pr_approval_shares` und `media_shares` sind absichtlich öffentlich lesbar, da die Sicherheit über zufällige ShareIDs gewährleistet wird.

2. **Row-Level Security**: Alle anderen Collections verwenden strikte Row-Level Security basierend auf der `userId`.

3. **Compliance Logs**: `asset_access_logs` sind unveränderlich für Audit-Zwecke.

4. **Storage Isolation**: Jeder User kann nur auf seine eigenen Dateien unter `/users/{userId}/media/` zugreifen.

## 📊 Monitoring & Logging

### 1. Application Monitoring (Sentry)

```javascript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 0.1, // 10% in Production
  beforeSend(event) {
    // Filter sensitive data
    return event;
  },
});
```

### 2. Firebase Monitoring

- **Performance Monitoring**: Automatisch in Firebase Console
- **Crashlytics**: Für detaillierte Crash Reports
- **Analytics**: User-Verhalten tracking

### 3. Custom Logging

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
    // Send to logging service
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    Sentry.captureException(error);
  },
  metric: (name: string, value: number) => {
    // Send to metrics service
  }
};
```

## 💾 Backup & Recovery

### Firestore Backups

```bash
# Automatische tägliche Backups einrichten
gcloud firestore export gs://your-backup-bucket/$(date +%Y%m%d) \
  --collection-ids=companies,contacts,pr_campaigns,media_assets,distribution_lists

# Backup wiederherstellen
gcloud firestore import gs://your-backup-bucket/20240101

# Backup-Script für Automation (backup.sh)
#!/bin/bash
BUCKET="gs://skamp-backups"
DATE=$(date +%Y%m%d-%H%M%S)
COLLECTIONS="companies,contacts,tags,pr_campaigns,media_assets,media_folders,distribution_lists,boilerplates"

# Firestore Export
gcloud firestore export $BUCKET/firestore/$DATE \
  --collection-ids=$COLLECTIONS \
  --project=your-project-id

# Cleanup alte Backups (älter als 30 Tage)
gsutil -m rm -r $BUCKET/firestore/$(date -d "30 days ago" +%Y%m%d)*
```

### Backup-Strategie

1. **Täglich**: Firestore Datenbank
2. **Wöchentlich**: Firebase Storage (Medien)
3. **Monatlich**: Vollständiges System-Backup
4. **Aufbewahrung**: 30 Tage täglich, 12 Monate monatlich

## 📈 Skalierung

### Firestore Limits beachten

- **Dokument-Größe**: Max 1MB
- **Writes/Sekunde**: 500 pro Dokument
- **Reads/Sekunde**: Praktisch unbegrenzt
- **Lösung**: Sharding bei Hot Documents

### Performance-Optimierungen

```javascript
// next.config.mjs
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // CDN Headers
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|gif|ico)',
        headers: [{
          key: 'Cache-Control',
          value: 'public, immutable, max-age=31536000',
        }],
      },
    ];
  },
};
```

### Caching-Strategie

1. **Static Assets**: 1 Jahr Cache (immutable)
2. **API Responses**: 5 Minuten für Listen
3. **User-spezifisch**: Kein Cache
4. **CDN**: Cloudflare oder Vercel Edge Network

## 🔧 Troubleshooting

### Häufige Probleme

#### Build-Fehler

```bash
# Cache löschen
rm -rf .next node_modules
npm install
npm run build
```

#### Firebase Connection Issues

```javascript
// Timeout erhöhen
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
db.settings({ 
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  experimentalForceLongPolling: true // Bei Websocket-Problemen
});
```

#### Memory Leaks

```bash
# Node Memory erhöhen
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Debug-Modus

```bash
# Entwicklung
DEBUG=* npm run dev

# Production Debugging
NODE_ENV=production DEBUG=skamp:* npm start
```

### Health Checks

```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    services: {
      firebase: checkFirebase(),
      sendgrid: checkSendGrid(),
      gemini: checkGemini(),
    }
  });
}
```

## 📞 Support & Wartung

### Update-Strategie

1. **Dependencies**: Monatlich (Renovate Bot)
2. **Security Patches**: Sofort
3. **Feature Updates**: Quartalsweise
4. **Breaking Changes**: Mit Ankündigung

### Monitoring-Dashboards

- **Vercel Analytics**: Performance & Web Vitals
- **Firebase Console**: Database, Auth, Storage Metrics
- **SendGrid Dashboard**: E-Mail Analytics
- **Custom Dashboard**: Geschäftskritische KPIs

### Notfall-Kontakte

```
Firebase Support: https://firebase.google.com/support
Vercel Support: support@vercel.com
SendGrid Support: https://support.sendgrid.com
```

## 🔗 Weiterführende Dokumentation

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Firebase Hosting Guide](https://firebase.google.com/docs/hosting)
- [Vercel Documentation](https://vercel.com/docs)
- [SKAMP Configuration Guide](./CONFIGURATION.md)
- [Security Best Practices](./SECURITY.md)

---

*Letzte Aktualisierung: Januar 2025*