# SKAMP Marketing Suite

Eine moderne Marketing-Plattform mit integriertem CRM-System, entwickelt mit Next.js 14, Firebase und Tailwind CSS.

## 🚀 Aktueller Stand

**Version:** 1.0  
**Status:** CRM-Basis implementiert, Marketing-Tools in Entwicklung

### ✅ Implementierte Features

#### CRM-System
- **Firmenverwaltung**: Vollständige CRUD-Operationen für Unternehmen
- **Kontaktverwaltung**: Personen mit Firmen-Zuordnung
- **Tag-System**: Flexible Kategorisierung mit Farbkodierung
- **Social Media Profile**: LinkedIn, Xing, Facebook, Instagram etc.
- **Import/Export**: CSV-basierter Datenimport und -export
- **Erweiterte Filter**: Multi-Select-Filter nach Typ, Branche, Tags
- **Detailansichten**: Verlinkte Firmen- und Kontaktdetailseiten

#### Technische Features
- **Benutzerauthentifizierung**: Firebase Auth
- **Cloud-Datenbank**: Firestore mit Echtzeit-Synchronisation
- **Responsive Design**: Mobile-optimierte Benutzeroberfläche
- **Moderne UI**: Catalyst UI-Komponenten mit Tailwind CSS
- **TypeScript**: Vollständig typisiert
- **Performance**: Optimierte Datenbankabfragen und Client-Side-Rendering

## 🛠 Technologie-Stack

- **Framework**: Next.js 14 (App Router)
- **Sprache**: TypeScript
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI (@headlessui/react)
- **Icons**: Heroicons
- **Animation**: Framer Motion
- **CSV Processing**: PapaParse
- **Countries**: i18n-iso-countries

## 📁 Projektstruktur

```
src/
├── app/
│   ├── dashboard/
│   │   ├── contacts/           # CRM-Hauptbereich
│   │   │   ├── companies/      # Firmendetails
│   │   │   ├── contacts/       # Kontaktdetails
│   │   │   └── page.tsx        # CRM-Übersicht
│   │   ├── profile/
│   │   └── layout.tsx          # Dashboard-Layout
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # Landing/Login-Seite
├── components/
│   ├── ui/                    # Wiederverwendbare UI-Komponenten
│   ├── MultiSelectDropdown.tsx
│   ├── ProtectedRoute.tsx
│   └── tag-input.tsx
├── context/
│   └── AuthContext.tsx       # Firebase Auth Context
├── lib/
│   └── firebase/
│       ├── config.ts         # Firebase Konfiguration
│       ├── client-init.ts    # Client-side Firebase
│       └── crm-service.ts    # CRM-Datenschicht
└── types/
    └── crm.ts               # TypeScript-Definitionen
```

## 🚀 Setup & Installation

### Voraussetzungen
- Node.js 18+
- Firebase-Projekt

### Installation

1. **Repository klonen**
```bash
git clone [repository-url]
cd skamp
npm install
```

2. **Firebase-Konfiguration**
```bash
# .env.local erstellen
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. **Firestore-Regeln** (Firebase Console)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users können nur ihre eigenen Daten lesen/schreiben
    match /companies/{document} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /contacts/{document} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /tags/{document} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

4. **Entwicklungsserver starten**
```bash
npm run dev
```

## 📊 Datenmodell

### Company (Firma)
```typescript
interface Company {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'partner' | 'other';
  industry?: string;
  website?: string;
  phone?: string;
  address?: Address;
  socialMedia?: SocialMediaProfile[];
  tagIds?: string[];
  notes?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Contact (Kontakt)
```typescript
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  companyId?: string;
  tagIds?: string[];
  notes?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 🎯 Geplante Marketing-Tools

### 📧 E-Mail Marketing
- Newsletter-Erstellung
- Automatisierte Kampagnen
- Segmentierung basierend auf CRM-Daten
- A/B-Testing

### 📈 Analytics & Tracking
- Kampagnen-Performance
- ROI-Tracking
- Lead-Scoring
- Custom Dashboards

### 🎨 Content Management
- Landing Page Builder
- Asset-Bibliothek
- Template-System

### 🔗 Integrationen
- Social Media APIs
- E-Mail-Provider (Mailchimp, SendGrid)
- Analytics-Tools
- Webhook-System

## 🚀 Nächste Schritte

1. **Marketing-Dashboard** entwickeln
2. **E-Mail-Marketing-Modul** implementieren
3. **Campaign-Management** aufbauen
4. **Analytics-Integration** hinzufügen

## 🤝 Entwicklung

### Kommandos
```bash
npm run dev          # Entwicklungsserver
npm run build        # Production Build
npm run start        # Production Server
npm run lint         # Code Linting
```

### Code-Konventionen
- TypeScript für alle neuen Features
- Komponenten-basierte Architektur
- Firebase-first für Backend-Services
- Mobile-First Responsive Design

## 📝 Changelog

### v1.0.0 (Aktuell)
- ✅ CRM-Grundfunktionen
- ✅ Benutzerauthentifizierung
- ✅ Import/Export-Funktionalität
- ✅ Tag-System
- ✅ Social Media Profile
- ✅ Erweiterte Filter-Optionen

---

**SKAMP Marketing Suite** - Von CRM zu vollständiger Marketing-Automatisierung