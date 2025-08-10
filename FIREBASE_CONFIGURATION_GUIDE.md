# Firebase Konfigurationsleitfaden - CeleroPress

## 🚨 Erforderliche Konfigurationsschritte in der Firebase Console

### 1. **Multi-Factor Authentication (MFA) aktivieren**

**Problem:** `SMS based MFA not enabled. (auth/operation-not-allowed)`

**Lösung:**
1. Firebase Console → Authentication → Sign-in method
2. Unter "Advanced" → Multi-factor authentication
3. ✅ Enable SMS Multi-factor authentication 
4. ✅ Enable TOTP Multi-factor authentication (optional)

**Status:** ❌ NICHT KONFIGURIERT

---

### 2. **OAuth-Domains autorisieren**

**Problem:** `The current domain is not authorized for OAuth operations`

**Lösung:**
1. Firebase Console → Authentication → Settings → Authorized domains
2. Hinzufügen:
   ```
   www.celeropress.com
   celeropress.com
   [staging-domain].vercel.app
   localhost (für Development)
   ```

**Status:** ❌ NICHT KONFIGURIERT

---

### 3. **E-Mail-Templates konfigurieren**

**Problem:** E-Mails kommen von `noreply@skamp-prod.firebaseapp.com` mit englischen Texten

**Lösung:**
1. Firebase Console → Authentication → Templates
2. **Email address verification:**
   - Absendername: `CeleroPress`
   - Absender-E-Mail: `noreply@celeropress.com`
   - Betreff: `CeleroPress - E-Mail-Adresse bestätigen`
   - Text: Deutsche Vorlage verwenden
3. **Password reset:**
   - Absendername: `CeleroPress`
   - Absender-E-Mail: `noreply@celeropress.com`
   - Betreff: `CeleroPress - Passwort zurücksetzen`

**Status:** ❌ NICHT KONFIGURIERT

---

### 4. **reCAPTCHA Enterprise konfigurieren**

**Problem:** `Failed to initialize reCAPTCHA Enterprise config`

**Lösung:**
1. Firebase Console → Authentication → Settings
2. reCAPTCHA Enterprise konfigurieren:
   - Domains hinzufügen: `celeropress.com`, `www.celeropress.com`
   - Test-Domains: `localhost`, `*.vercel.app`

**Status:** ❌ NICHT KONFIGURIERT

---

### 5. **Google OAuth Provider konfigurieren**

**Lösung:**
1. Firebase Console → Authentication → Sign-in method → Google
2. ✅ Enable Google Sign-in
3. **Web SDK configuration:**
   - Support email: `support@celeropress.com`
   - Project public-facing name: `CeleroPress`
4. **OAuth redirect domains** in Google Cloud Console:
   ```
   https://celeropress.com
   https://www.celeropress.com
   https://[project-id].firebaseapp.com
   ```

**Status:** ⚠️ TEILWEISE KONFIGURIERT

---

## 🎯 Code-seitige Verbesserungen (Bereits implementiert)

✅ **Autocomplete-Attribute hinzugefügt:**
- Login-Formular: `email`, `current-password`/`new-password`
- Profil-Formular: `name`, `tel`, `email`
- Password-Change: `current-password`, `new-password`
- Delete-Account: `current-password`

✅ **Verbesserte Fehlerbehandlung:**
- Google OAuth: Spezifische Fehlermeldungen für Domain-Probleme
- 2FA: Bessere Fehlerbehandlung für MFA-Konfigurationsprobleme
- Password-Change: Behält neue Passwörter bei Fehlern

✅ **E-Mail-Verifizierung:**
- CeleroPress Branding-URLs konfiguriert
- Deutsche Redirect-URLs zu `/dashboard/admin/profile?verified=true`

---

## 🔧 Sofort-Maßnahmen für den Admin

### Schritt 1: MFA aktivieren (Höchste Priorität)
```
Firebase Console → Authentication → Sign-in method → Advanced → Multi-factor
✅ Enable SMS Multi-factor authentication
```

### Schritt 2: Domain autorisieren
```
Firebase Console → Authentication → Settings → Authorized domains
+ www.celeropress.com
+ celeropress.com
```

### Schritt 3: E-Mail-Templates auf Deutsch
```
Firebase Console → Authentication → Templates
- Email verification: Deutsche Vorlage + CeleroPress Branding
- Password reset: Deutsche Vorlage + CeleroPress Branding
```

---

## ⚡ Quick-Fix für 2FA (Temporäre Lösung)

Falls die Firebase-Konfiguration Zeit braucht, kann in `TwoFactorSettings.tsx` eine Fallback-Behandlung implementiert werden:

```typescript
// Temporäre Deaktivierung bei MFA-Konfigurationsproblemen
if (error.code === 'auth/operation-not-allowed') {
  setMessage({ 
    type: 'info', 
    text: '2FA ist derzeit nicht verfügbar. Bitte kontaktiere den Support.' 
  });
  return;
}
```

---

## 📞 Support-Informationen

**Bei Problemen:**
- Firebase-Konfiguration muss vom Firebase-Admin durchgeführt werden
- Domain-Autorisierung kann bis zu 24h dauern
- E-Mail-Templates sind sofort wirksam nach der Änderung

**Priorität:** 🔴 KRITISCH - Blockiert wichtige Sicherheitsfeatures