# SKAMP Marketing Suite - Vollständige Projektdokumentation

Eine moderne, integrierte Marketing-Plattform mit CRM-System, Verteilerlisten, PR-Tools und Enterprise-DAM-System, entwickelt mit Next.js 14, Firebase und Tailwind CSS.

## 🎯 Projektübersicht

**Status:** Production-Ready  
**Version:** 2.1  
**Letztes Update:** Dezember 2024

SKAMP ist eine vollständige Marketing-Suite, die von einem einfachen CRM zu einer umfassenden Marketing-Automatisierungsplattform mit Enterprise-Level Digital Asset Management gewachsen ist. Das System ist besonders für PR-Agenturen, Marketing-Teams und Medienunternehmen optimiert.

## 🛠 Technologie-Stack

### Core Technologies
- **Framework:** Next.js 14 (App Router)
- **Sprache:** TypeScript
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth  
- **File Storage:** Firebase Storage
- **Styling:** Tailwind CSS
- **UI Components:** Headless UI (@headlessui/react)

### Key Dependencies
```json
{
  "next": "14.2.5",
  "firebase": "^11.9.1",
  "@headlessui/react": "^2.2.4",
  "@heroicons/react": "^2.2.0",
  "tailwindcss": "^3.4.17",
  "typescript": "^5",
  "papaparse": "^5.5.3",
  "recharts": "^2.8.0",
  "@sendgrid/mail": "^8.1.5"
}
```

### External Services
- **SendGrid:** E-Mail-Versand und Tracking
- **Firebase:** Backend-as-a-Service
- **Vercel:** Hosting (empfohlen)

## 📁 Projektstruktur

```
skamp/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── dashboard/                # Hauptanwendung
│   │   │   ├── contacts/             # CRM-System
│   │   │   │   ├── companies/[id]/   # Firmendetails
│   │   │   │   ├── contacts/[id]/    # Kontaktdetails
│   │   │   │   ├── CompanyModal.tsx
│   │   │   │   ├── ContactModal.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── listen/               # Verteilerlisten-System
│   │   │   │   ├── [listId]/        # Listen-Details
│   │   │   │   ├── ContactSelectorModal.tsx
│   │   │   │   ├── ListModal.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── pr/                   # PR-Tools
│   │   │   │   ├── campaigns/
│   │   │   │   │   ├── new/         # Neue Kampagne
│   │   │   │   │   ├── edit/[id]/   # Kampagne bearbeiten
│   │   │   │   │   └── [id]/analytics/ # Analytics
│   │   │   │   └── page.tsx
│   │   │   ├── mediathek/           # Enterprise DAM-System
│   │   │   │   ├── UploadModal.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── settings/            # Einstellungen
│   │   │   │   └── boilerplates/   # Textbausteine
│   │   │   └── layout.tsx           # Dashboard Layout
│   │   ├── share/                   # 🆕 Öffentliche Share-Galerien
│   │   │   ├── [shareId]/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/                     # API Routes
│   │   │   └── sendgrid/           # E-Mail Integration
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                 # Login/Landing
│   ├── components/                  # Wiederverwendbare UI
│   │   ├── ui/                     # Basis-UI-Komponenten
│   │   ├── pr/                     # PR-spezifische Komponenten
│   │   ├── mediathek/              # 🆕 DAM-System Komponenten
│   │   │   ├── AssetDetailsModal.tsx
│   │   │   ├── BreadcrumbNavigation.tsx
│   │   │   ├── FolderCard.tsx
│   │   │   ├── FolderModal.tsx
│   │   │   ├── ShareModal.tsx
│   │   │   └── MediaUploadLink.tsx
│   │   ├── MultiSelectDropdown.tsx
│   │   ├── RichTextEditor.tsx
│   │   └── tag-input.tsx
│   ├── context/                    # React Context
│   │   ├── AuthContext.tsx
│   │   └── CrmDataContext.tsx
│   ├── lib/                       # Business Logic
│   │   ├── firebase/              # Firebase Services
│   │   │   ├── client-init.ts
│   │   │   ├── config.ts
│   │   │   ├── crm-service.ts     # CRM CRUD
│   │   │   ├── lists-service.ts   # Listen-Management
│   │   │   ├── pr-service.ts      # PR-Kampagnen
│   │   │   ├── media-service.ts   # 🆕 Enterprise DAM Service
│   │   │   ├── analytics-service.ts # E-Mail Analytics
│   │   │   └── email-campaign-service.ts
│   │   ├── email/                 # E-Mail Services
│   │   │   └── email-service.ts
│   │   └── utils/                 # 🆕 Utilities
│   │       └── folder-utils.ts    # Firma-Vererbung Logic
│   └── types/                     # TypeScript Definitionen
│       ├── crm.ts                # CRM-Datentypen (erweitert)
│       ├── lists.ts              # Listen-System
│       ├── pr.ts                 # PR-Kampagnen
│       ├── email.ts              # E-Mail & Analytics
│       └── media.ts              # 🆕 DAM-System
├── functions/                     # Firebase Functions (optional)
├── .env.local                    # Environment Variables
├── firebase.json                 # Firebase Konfiguration
├── package.json
└── README.md
```

## 🚀 Setup & Installation

### 1. Repository klonen
```bash
git clone [repository-url]
cd skamp
npm install
```

### 2. Environment Variables
Erstelle `.env.local`:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# SendGrid Configuration (für E-Mail-Versand)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME="Your Company Name"
```

### 3. Firebase Setup

#### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // CRM Collections
    match /companies/{companyId} {
      allow read, create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /contacts/{contactId} {
      allow read, create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /tags/{tagId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Listen System
    match /distribution_lists/{listId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // PR System
    match /pr_campaigns/{campaignId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // E-Mail Tracking
    match /email_campaign_sends/{sendId} {
      allow read, create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // 🆕 DAM-System
    match /media_assets/{assetId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    match /media_folders/{folderId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // 🆕 Share-Links (öffentlich lesbar wenn aktiv)
    match /media_shares/{shareId} {
      allow read: if resource.data.isActive == true;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Textbausteine
    match /boilerplates/{boilerplateId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

#### Firebase Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/media/{allPaths=**} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Entwicklungsserver starten
```bash
npm run dev
```

## 🎯 Hauptfunktionen

### ✅ CRM-System (contacts/)
- **Firmenverwaltung:** Vollständige CRUD-Operationen mit Medien-spezifischen Feldern
- **Kontaktverwaltung:** Personen mit Firmen-Zuordnung und Journalisten-Features
- **Tag-System:** Flexible Kategorisierung mit Farbkodierung
- **Import/Export:** CSV-basierter Datenimport und -export
- **Detailansichten:** Verlinkte Firmen- und Kontaktdetailseiten
- **Erweiterte Filter:** Multi-Select-Filter nach Typ, Branche, Tags
- **🆕 Medien-Integration:** Direkter Zugriff auf Kunden-Medien

### ✅ Listen-System (listen/)
- **Dynamische Listen:** Filter-basiert, aktualisieren sich automatisch
- **Statische Listen:** Manuell kuratierte Kontaktlisten
- **Smart Templates:** Vorgefertigte Listen für häufige Use Cases
- **Live-Vorschau:** Echtzeitanzeige der gefilterten Kontakte
- **Performance-Tracking:** Verwendungshistorie und Metriken

### ✅ PR-Tools (pr/)
- **Kampagnen-Erstellung:** Rich-Text-Editor für Pressemitteilungen
- **Verteiler-Integration:** Auswahl aus Listen-System
- **E-Mail-Versand:** SendGrid-Integration mit Tracking
- **Analytics:** Vollständige Öffnungs-, Klick- und Engagement-Statistiken
- **Template-System:** Wiederverwendbare E-Mail-Templates
- **🆕 Medien-Integration:** Bilder direkt aus DAM-System einbetten

### ✅ Enterprise DAM-System (mediathek/) 🆕
- **Hierarchische Ordnerstruktur:** Unbegrenzte Verschachtelung mit Drag & Drop
- **Kunden-Integration:** Automatische Firma-Vererbung in Ordnern
- **Share-System:** Öffentliche Galerien mit Passwort-Schutz
- **Bulk-Operationen:** Mehrfachauswahl und -bearbeitung
- **Asset-Details:** Metadaten-Management mit CRM-Verknüpfung
- **Responsive UI:** Grid- und Listen-Ansicht
- **URL-Parameter:** Direkte Upload-Links für Kunden
- **Performance:** Optimiert für große Datenmengen

### ✅ Share-Link System 🆕
- **Öffentliche Galerien:** Professionelle Share-Seiten ohne Login
- **Ordner & Einzeldateien:** Flexible Sharing-Optionen
- **Passwort-Schutz:** Optional für sensible Inhalte
- **Download-Kontrolle:** Granulare Berechtigungen
- **Access-Tracking:** Automatische Nutzungsstatistiken
- **UUID-basiert:** Sichere, eindeutige Share-URLs

### ✅ Analytics & Tracking
- **E-Mail-Metriken:** Öffnungsraten, Klickraten, Bounce-Tracking
- **Kampagnen-Performance:** Detaillierte Engagement-Statistiken
- **Empfänger-Tracking:** Individuelle Interaktions-Historie
- **Trend-Analyse:** Engagement über Zeit visualisiert
- **🆕 Share-Analytics:** Zugriffe auf geteilte Inhalte

## 🏗 Architektur-Prinzipien

### 1. Listen-zentrierter Ansatz
Das Listen-System ist das Herzstück der Anwendung. Alle Marketing-Tools (PR, Newsletter, Events) nutzen dieselben Verteilerlisten als Datenquelle.

### 2. Service-Layer Pattern
```typescript
// Beispiel: Media Service
export const mediaService = {
  async createFolder(folder: Omit<MediaFolder, 'id'>): Promise<string>
  async uploadMedia(file: File, userId: string, folderId?: string): Promise<MediaAsset>
  async createShareLink(shareData: ShareLinkData): Promise<ShareLink>
  // ...
}
```

### 3. Type-First Development
Alle Datenstrukturen sind vollständig typisiert mit TypeScript:
```typescript
interface MediaAsset {
  id?: string;
  fileName: string;
  fileType: string;
  folderId?: string;
  clientId?: string; // CRM-Integration
  // ...
}
```

### 4. Context-basierte Datenverwaltung
```typescript
// CrmDataContext stellt zentrale Daten bereit
const { companies, contacts, tags } = useCrmData();
```

### 5. 🆕 Firma-Vererbung in DAM
```typescript
// Ordner vererben Kunden-Zuordnung an Unterordner und Assets
const inheritedClientId = await getRootFolderClientId(folder, allFolders);
```

## 📊 Datenmodell

### Core Entities (erweitert)

#### Company (Firma) - Erweitert
```typescript
interface Company {
  id?: string;
  name: string;
  type: 'customer' | 'supplier' | 'partner' | 'publisher' | 'media_house' | 'agency' | 'other';
  industry?: string;
  address?: Address;
  socialMedia?: SocialMediaProfile[];
  mediaInfo?: {        // 🆕 Für Medienunternehmen
    circulation?: number;
    reach?: number;
    focusAreas?: string[];
    publicationFrequency?: string;
    mediaType?: string;
  };
  userId: string;
}
```

#### Contact (Kontakt) - Erweitert
```typescript
interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  position?: string;
  companyId?: string;
  mediaInfo?: {        // 🆕 Für Journalisten
    beat?: string;     // Ressort
    expertise?: string[];
    preferredContactTime?: string;
    socialHandles?: object;
  };
  userId: string;
}
```

#### 🆕 MediaFolder (DAM-Ordner)
```typescript
interface MediaFolder {
  id?: string;
  userId: string;
  name: string;
  parentFolderId?: string; // Hierarchie
  clientId?: string; // CRM-Integration
  color?: string; // Visuelle Unterscheidung
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

#### 🆕 MediaAsset (DAM-Datei)
```typescript
interface MediaAsset {
  id?: string;
  userId: string;
  fileName: string;
  fileType: string;
  storagePath: string;
  downloadUrl: string;
  description?: string;
  tags?: string[];
  folderId?: string; // Ordner-Zuordnung
  clientId?: string; // CRM-Integration
  createdAt?: Timestamp;
}
```

#### 🆕 ShareLink (Öffentliche Freigaben)
```typescript
interface ShareLink {
  id?: string;
  userId: string;
  shareId: string; // Öffentliche UUID
  type: 'folder' | 'file';
  targetId: string;
  title: string;
  description?: string;
  isActive: boolean;
  accessCount: number;
  settings: {
    passwordRequired?: string;
    downloadAllowed: boolean;
    showFileList?: boolean;
  };
  createdAt?: Timestamp;
}
```

## 🔧 Entwicklung

### Kommandos
```bash
npm run dev          # Entwicklungsserver
npm run build        # Production Build
npm run start        # Production Server
npm run lint         # Code Linting
```

### Code-Konventionen
- **TypeScript:** Alle Features sind vollständig typisiert
- **Komponenten-Architektur:** Kleine, wiederverwendbare React-Komponenten
- **Service-Pattern:** Business Logic in separaten Service-Dateien
- **Firebase-First:** Alle Backend-Operationen über Firebase
- **Mobile-First:** Responsive Design für alle Screens
- **🆕 Drag & Drop:** Intuitive Bedienung im DAM-System

### 🆕 DAM-System Features
```typescript
// URL-Parameter für direkten Upload
/dashboard/mediathek?uploadFor=COMPANY_ID

// Firma-Vererbung
getRootFolderClientId(folder, allFolders)

// Share-Links
/share/abc123def456 (öffentlich zugänglich)
```

## 🚀 Deployment

### Vercel (Empfohlen)
```bash
# Vercel CLI installieren
npm i -g vercel

# Projekt deployen
vercel

# Environment Variables in Vercel Dashboard konfigurieren
```

### Firebase Hosting (Alternative)
```bash
# Firebase CLI installieren
npm install -g firebase-tools

# Build und Deploy
npm run build
firebase deploy
```

## 🔐 Sicherheit

### Firebase Security Rules
- Alle Datenbank-Zugriffe sind benutzer-isoliert (`userId`-basiert)
- Storage-Regeln verhindern Cross-User-Zugriffe
- Authentication ist für alle geschützten Routen erforderlich
- **🆕 Share-Links:** Öffentlich lesbar nur wenn `isActive: true`

### API-Sicherheit
- SendGrid API-Keys sind server-seitig gespeichert
- E-Mail-Versand läuft über Next.js API Routes
- Keine sensiblen Daten im Client-Code
- **🆕 Share-URLs:** UUID-basiert für Sicherheit

## 📈 Performance

### Optimierungen
- **Code Splitting:** Automatisch durch Next.js
- **Image Optimization:** Next.js Image-Komponente + Firebase CDN
- **Database Queries:** Optimierte Firestore-Abfragen mit Client-side Filterung
- **Caching:** Static Generation wo möglich
- **🆕 Lazy Loading:** Infinite Scroll für große Asset-Listen
- **🆕 Drag & Drop Performance:** Optimiert für große Dateimengen

### Monitoring
- Firebase Performance Monitoring ist aktiviert
- Vercel Analytics für Web Vitals
- Error Tracking über Firebase Crashlytics

## 🛣 Roadmap

### Phase 3: Geplante Features
1. **Erweiterte Suche:** Volltextsuche in Asset-Metadaten
2. **Thumbnail-System:** Automatische Vorschaubilder
3. **Versionierung:** Asset-Versionen verwalten
4. **Duplikate-Erkennung:** Hash-basierte Erkennung
5. **Bulk-Tags:** Massenbearbeitung von Metadaten

### Zukünftige Features
1. **KI-Integration:** ChatGPT für Pressemitteilungs-Generierung
2. **Social Media Tools:** Instagram/LinkedIn-Integration
3. **Event-Management:** Event-basierte Kampagnen
4. **Advanced Analytics:** Dashboard mit Trends und Insights
5. **API-Integration:** Zapier/Make.com Webhooks

### Bekannte Limitations
- SendGrid ist der einzige E-Mail-Provider (erweiterbar)
- Firestore hat Größenlimits für große Anhänge
- Real-time Updates könnten bei großen Datenmengen optimiert werden

## 🤝 Entwickler-Notizen

### Wichtige Patterns
```typescript
// 1. Service-Layer für alle Firebase-Operationen
await mediaService.uploadMedia(file, userId, folderId);

// 2. Context für geteilte Daten
const { companies } = useCrmData();

// 3. Modal-Pattern für CRUD-Operationen
<AssetDetailsModal asset={asset} onSave={handleSave} />

// 4. URL-Parameter für Integration
const uploadFor = searchParams.get('uploadFor');

// 5. 🆕 Firma-Vererbung
const inheritedClientId = await getRootFolderClientId(folder, allFolders);
```

### Debug-Tipps
```typescript
// Firebase Emulator für lokale Entwicklung
firebase emulators:start

// Firestore Debug-Logs
console.log('Firestore query:', query);

// 🆕 DAM-System Debugging
console.log('Folder hierarchy:', getFolderPath(folder, allFolders));
console.log('Drag data:', e.dataTransfer.getData('text/plain'));
```

## 📞 Support & Wartung

### Logs & Monitoring
- **Firebase Console:** Database, Storage und Share-Analytics
- **Vercel Dashboard:** Performance und Error Logs
- **SendGrid Dashboard:** E-Mail Delivery Statistics
- **🆕 Share-Tracking:** Zugriffe auf öffentliche Galerien

### Backup-Strategie
- Firestore hat automatische Backups
- Firebase Storage CDN für Verfügbarkeit
- Code ist in Git versioniert
- Environment Variables sind dokumentiert

### Wartung
- Dependencies regelmäßig updaten (`npm audit`)
- Firebase Security Rules reviewen
- Performance-Metriken überwachen
- **🆕 Share-Links:** Inaktive Links regelmäßig bereinigen

---

**SKAMP Marketing Suite 2.1 - Enterprise Marketing Automation**  
**Von CRM zu vollständiger Marketing-Automatisierung mit Enterprise DAM-System.**

*Letztes Update: 27.06.2025*