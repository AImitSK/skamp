# Admin/Profil - Implementierungsplan

## Überblick
Vollständige Implementierung aller fehlenden Profil-Features für erhöhte Sicherheit und Benutzerfreundlichkeit.

## 🎯 Implementierte Features (✅ Abgeschlossen - Stand: 10.08.2025)
- ✅ Avatar-Upload mit Multi-Tenancy
- ✅ Quadratisches Bild-Cropping
- ✅ Profilbild löschen
- ✅ E-Mail anzeigen (read-only)
- ✅ Basis Benutzerinformationen anzeigen
- ✅ **Anzeigename + Telefon speichern** - Firebase Auth + Firestore Integration
- ✅ **E-Mail-Verifizierung** - Mit Resend-Funktion
- ✅ **Benutzerrolle anzeigen** - Aus OrganizationContext
- ✅ **Passwort ändern** - Mit Reauthentifizierung
- ✅ **2FA Integration** - SMS-basiert mit Backup-Codes
- ✅ **Google Sign-In** - Provider Linking/Unlinking
- ✅ **Design Patterns** - Alle Buttons und Modals angepasst
- ✅ **Admin-Navigation** - Layout konsistent mit Settings
- ✅ **Login-Seite** - CeleroPress Branding mit Google Sign-In & 2FA
- ✅ **Profil löschen** - 3-Stufen-Bestätigung mit Account-Löschung
- ✅ **Tests** - Unit Tests für User Service und Komponenten

## 🔧 Noch zu implementierende Features

### 1. Profil löschen (Niedrige Priorität)
**Account Deletion:**
- Confirmation Dialog mit Passwort
- Firestore Data Cleanup
- Firebase Auth Account Deletion
- Redirect nach Löschung

**Betroffene Dateien:**
- `src/components/profile/DeleteAccount.tsx` - NEU
- `src/lib/firebase/user-deletion-service.ts` - NEU

### 2. Session Management (Empfohlen)
**Aktive Sessions verwalten:**
- Aktive Sessions anzeigen
- Remote Session Termination
- Login History/Audit Log
- Device-basierte Session-Info

**Betroffene Dateien:**
- `src/components/profile/SessionManager.tsx` - NEU
- `src/lib/firebase/session-service.ts` - NEU


## 🔒 Sicherheits-Features (Zusätzliche Empfehlungen)

### 1. Session Management (Hoch empfohlen)
- Aktive Sessions anzeigen
- Remote Session Termination
- Login History/Audit Log
- Device-basierte Session-Info

### 2. API Keys/Tokens (Für Entwickler)
- Personal Access Tokens erstellen
- API Key Management
- Token Expiration/Rotation
- Scoped Permissions

### 3. Account Security Center
- Password Last Changed
- Recent Login Attempts
- Security Score/Recommendations
- Data Export/Download

### 4. Notification Preferences
- E-Mail Notification Settings
- Security Alert Preferences
- Marketing Communication Opt-out

## 🎨 Design Pattern Konformität

### Button Standards
```tsx
// Primary Actions
<Button className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2">Speichern</Button>

// Secondary/Destructive Actions  
<Button className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2">Abbrechen</Button>

// Dangerous Actions
<Button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2">Account löschen</Button>
```

### Icons
- Nur `@heroicons/react/24/outline` verwenden
- Standard-Größen: `h-4 w-4` für Buttons, `h-5 w-5` für Navigation

### Modal/Dialog Patterns
- `p-6` für Standard-Padding
- Confirmation Dialogs für destructive Actions
- Loading States mit Spinner

## 📋 Implementierungsstatus

**✅ Phase 1: Grundfunktionen (ABGESCHLOSSEN)**
1. ✅ Anzeigename + Telefon speichern
2. ✅ E-Mail-Verifizierung
3. ✅ Passwort ändern
4. ✅ Design Pattern Updates

**✅ Phase 2: Erweiterte Sicherheit (ABGESCHLOSSEN)**
5. ✅ Zwei-Faktor-Authentifizierung
6. ✅ Google Sign-In Integration
7. ✅ Benutzerrolle anzeigen

**🔄 Phase 3: Zusätzliche Features (AUSSTEHEND)**
8. ⏳ Session Management
9. ⏳ Account löschen
10. ⏳ Security Center/Audit Log

## 🧪 Testing-Strategie

### Unit Tests (Jest + React Testing Library)
- Form Validation Logic
- AuthContext Methods
- Service Layer Functions

### Integration Tests
- Complete User Profile Update Flow
- 2FA Setup/Verification Flow
- Password Change Flow
- Account Deletion Flow

### E2E Tests (Optional)
- Critical Security Flows
- Form Submission Edge Cases

## 📚 Dependencies

### Neue npm Packages
```bash
# 2FA/TOTP Support
npm install qrcode react-qr-code speakeasy

# Form Validation
npm install react-hook-form @hookform/resolvers yup

# Password Strength
npm install zxcvbn @types/zxcvbn

# QR Code für 2FA Setup
npm install qrcode @types/qrcode
```

### Firebase Features
- Firebase Auth MFA (bereits verfügbar)
- Firestore Security Rules Updates
- Cloud Functions für User Cleanup (optional)

## 🔧 Technische Implementierung

### AuthContext Erweiterungen
```typescript
interface AuthContextType {
  // ... existing
  updateUserProfile: (data: UserProfileData) => Promise<void>;
  enableTwoFactor: (method: 'sms' | 'totp') => Promise<void>;
  disableTwoFactor: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  linkGoogleProvider: () => Promise<void>;
  unlinkGoogleProvider: () => Promise<void>;
}
```

### Firestore Schema
```typescript
// users/{userId}
interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'sms' | 'totp';
  emailVerified: boolean;
  linkedProviders: string[];
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## 📈 Success Metrics
- ✅ 100% Test Coverage für kritische Security-Features
- ✅ Alle TypeScript/Linter Checks bestehen
- ✅ Design Pattern Compliance
- ✅ Performance < 3s für alle Profile-Operationen
- ✅ Accessibility AA Standards

---

**Status:** Bereit für Implementierung  
**Geschätzte Entwicklungszeit:** 2-3 Arbeitstage  
**Priorität:** Hoch (Sicherheitskritische Features)