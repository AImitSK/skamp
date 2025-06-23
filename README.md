# SKAMP - Marketing Tool Suite

Eine moderne All-in-One Marketing-Tool-Suite, entwickelt als Web-Anwendung mit Next.js und Firebase.

## 🚀 Projektstatus

### ✅ Implementiert
- **Authentifizierung**: Login/Registrierung mit Firebase Auth
- **Dashboard**: Responsive Layout mit Sidebar-Navigation
- **CRM Basisversion**:
  - Firmenverwaltung (CRUD-Operationen)
  - Kontaktverwaltung (CRUD-Operationen)
  - Verknüpfung von Personen zu Firmen
  - Suchfunktion
  - Tab-Navigation

### 🔄 In Arbeit
- Modal-Dialoge für Firmen/Kontakte
- Firestore-Indizes

### 📋 Geplante Features
- **Phase 2**: Tags, Kategorien, Import/Export, erweiterte Filter
- **Phase 3**: Aktivitätenverfolgung, Aufgaben, Dokumente
- **Phase 4**: Pipeline/Deals, Team-Features, Dashboards

## 🛠 Technologie-Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Sprache**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI-Komponenten**: [Catalyst UI Kit](https://tailwindcss.com/plus/ui-kit)
- **Icons**: [Heroicons](https://heroicons.com/)
- **Backend**: [Firebase](https://firebase.google.com/)
  - Authentication
  - Cloud Firestore
- **Deployment**: Vercel (geplant)

## 📁 Projektstruktur

```
skamp/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Login/Registrierung
│   │   ├── layout.tsx                  # Root-Layout
│   │   └── dashboard/
│   │       ├── layout.tsx              # Dashboard-Layout mit Sidebar
│   │       ├── page.tsx                # Dashboard-Startseite
│   │       ├── contacts/
│   │       │   ├── page.tsx            # CRM Hauptseite
│   │       │   ├── CompanyModal.tsx    # Modal für Firmen
│   │       │   └── ContactModal.tsx    # Modal für Kontakte
│   │       └── profile/
│   │           └── page.tsx            # Profil-Seite
│   ├── components/                     # Catalyst UI Komponenten
│   │   ├── ProtectedRoute.tsx         # Auth-Guard
│   │   └── ... (weitere UI-Komponenten)
│   ├── context/
│   │   └── AuthContext.tsx            # Globaler Auth-State
│   ├── lib/
│   │   └── firebase/
│   │       ├── client-init.ts         # Firebase-Initialisierung
│   │       ├── config.ts              # Firebase-Konfiguration
│   │       └── crm-service.ts         # CRM CRUD-Operationen
│   └── types/
│       └── crm.ts                     # TypeScript Types für CRM
└── .env.local                         # Umgebungsvariablen (nicht im Git!)
```

## 🔧 Installation & Setup

### 1. Repository klonen
```bash
git clone https://github.com/AImitSK/skamp.git
cd skamp
```

### 2. Abhängigkeiten installieren
```bash
npm install
```

### 3. Firebase-Projekt einrichten
1. Erstelle ein neues Firebase-Projekt auf [console.firebase.google.com](https://console.firebase.google.com)
2. Aktiviere **Authentication** (E-Mail/Passwort)
3. Aktiviere **Cloud Firestore**
4. Kopiere die Konfiguration

### 4. Umgebungsvariablen
Erstelle eine `.env.local` Datei im Root-Verzeichnis:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=dein-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dein-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dein-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dein-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=dein-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=dein-app-id
```

### 5. Firestore Security Rules
Füge diese Rules in der Firebase Console ein:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{companyId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }
    
    match /contacts/{contactId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 6. Firestore Indizes
Erstelle folgende zusammengesetzte Indizes:

**contacts:**
- userId (ASC) + lastName (ASC) + firstName (ASC)
- companyId (ASC) + lastName (ASC) + firstName (ASC)

**companies:**
- userId (ASC) + name (ASC)

### 7. Entwicklungsserver starten
```bash
npm run dev
```

Die Anwendung läuft unter `http://localhost:3000`

## 📝 Datenmodell

### Company
```typescript
interface Company {
  id?: string;
  name: string;
  website?: string;
  industry?: string;
  type: 'customer' | 'supplier' | 'partner' | 'other';
  address?: {
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
  };
  phone?: string;
  notes?: string;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

### Contact
```typescript
interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  companyId?: string;
  companyName?: string;
  notes?: string;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

## 🚦 Verwendung

### Login/Registrierung
1. Öffne die Startseite
2. Registriere dich mit E-Mail und Passwort
3. Nach dem Login wirst du zum Dashboard weitergeleitet

### CRM nutzen
1. Navigiere zu "Kontakte" in der Sidebar
2. Wechsle zwischen "Firmen" und "Personen" Tabs
3. Nutze die "Hinzufügen" Buttons zum Erstellen
4. Klicke auf "Bearbeiten" zum Ändern
5. Nutze die Suchleiste zum Filtern

## 🐛 Bekannte Probleme

- Firestore-Indizes müssen manuell erstellt werden (Links in der Konsole)
- Modal-Komponenten müssen manuell aus den Artifacts kopiert werden

## 🔮 Nächste Schritte

1. **Kurzfristig**:
   - E-Mail-Verifizierung implementieren
   - Passwort-Reset Funktion
   - Bessere Fehlerbehandlung

2. **Mittelfristig**:
   - CSV Import/Export
   - Tags und Kategorien
   - Erweiterte Filteroptionen
   - Aktivitätenverfolgung

3. **Langfristig**:
   - E-Mail-Integration
   - Kalender-Synchronisation
   - Reporting & Analytics
   - Multi-User Support

## 👥 Mitwirken

Pull Requests sind willkommen! Für größere Änderungen bitte erst ein Issue erstellen.

## 📄 Lizenz

[MIT](https://choosealicense.com/licenses/mit/)

## 🤝 Support

Bei Fragen oder Problemen:
- Issue auf GitHub erstellen
- E-Mail an: support@skamp.de (noch nicht aktiv)

---

**Version**: 1.0.0-beta  
**Stand**: Juni 2025