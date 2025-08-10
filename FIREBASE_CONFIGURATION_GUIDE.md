# Firebase Konfigurationsleitfaden - CeleroPress

## 🚨 Erforderliche Konfigurationsschritte in der Firebase Console

### 1. **Multi-Factor Authentication (MFA) aktivieren**

**Problem:** `SMS based MFA not enabled. (auth/operation-not-allowed)`

**Lösung:**
1. Firebase Console → Authentication → Sign-in method
2. Unter "Advanced" → Multi-factor authentication
3. ✅ Enable SMS Multi-factor authentication 
4. ✅ Enable TOTP Multi-factor authentication (optional)

**Status:** ✅ AKTIVIERT

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

### 4. **reCAPTCHA Enterprise konfigurieren** 🔥 KRITISCH

**Problem:** 
- `Failed to initialize reCAPTCHA Enterprise config`
- `Triggering the reCAPTCHA v2 verification`
- Websiteschlüssel der Plattform zeigen 0 Bewertungen

**DRINGENDE Lösung:**
1. **Firebase Console → Authentication → Settings → reCAPTCHA**
2. **Websiteschlüssel der Plattform konfigurieren:**
   - Klicken Sie auf jeden "Key for Identity Platform reCAPTCHA integration" 
   - **Domains hinzufügen:**
     ```
     celeropress.com
     www.celeropress.com
     localhost (für Development)
     [your-project].vercel.app (für Staging)
     ```
3. **Erzwingungsmodus auf "ENFORCE" setzen** (statt AUDIT)
4. **Schwellenwert:** Auf 0.7-0.8 erhöhen für weniger aggressive Blockierung

**Warum kritisch:**
- Ohne korrekte reCAPTCHA-Konfiguration funktioniert 2FA NICHT
- SMS-Versendung wird blockiert
- Benutzer können sich nicht mit 2FA anmelden

**Status:** ❌ KRITISCH - SOFORT BEHEBEN ERFORDERLICH

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

### Schritt 1: ✅ MFA aktivieren (ERLEDIGT)
```
Firebase Console → Authentication → Sign-in method → Advanced → Multi-factor
✅ Enable SMS Multi-factor authentication
```

### Schritt 2: 🔥 reCAPTCHA konfigurieren (KRITISCH - SOFORT!)
```
Firebase Console → Authentication → Settings → reCAPTCHA
Für jeden "Key for Identity Platform reCAPTCHA integration":
1. Klicken Sie auf den Key
2. Domains hinzufügen:
   - celeropress.com
   - www.celeropress.com  
   - localhost
   - [project].vercel.app
3. Erzwingungsmodus: ENFORCE (statt AUDIT)
4. Schwellenwert: 0.7-0.8 
```

### Schritt 3: Domain autorisieren
```
Firebase Console → Authentication → Settings → Authorized domains
+ www.celeropress.com
+ celeropress.com
```

### Schritt 4: E-Mail-Templates auf Deutsch
```
Firebase Console → Authentication → Templates
- Email verification: Deutsche Vorlage + CeleroPress Branding
- Password reset: Deutsche Vorlage + CeleroPress Branding
```

---

## ⚡ Verbesserte Fehlerbehandlung (Bereits implementiert)

✅ **Erweiterte 2FA-Fehlerbehandlung implementiert:**

```typescript
// Spezifische Fehlerbehandlung für verschiedene reCAPTCHA/2FA-Probleme
if (error.code === 'auth/operation-not-allowed') {
  setError('SMS-basierte 2FA ist nicht aktiviert. Bitte kontaktiere den Support.');
} else if (error.code === 'auth/captcha-check-failed') {
  setError('reCAPTCHA-Verifizierung fehlgeschlagen. Bitte versuche es erneut.');
} else if (error.message?.includes('reCAPTCHA Enterprise')) {
  setError('reCAPTCHA-Konfigurationsfehler. Bitte kontaktiere den Support.');
}
```

✅ **Erweiterte reCAPTCHA-Konfiguration:**
- Invisible reCAPTCHA mit Callback-Funktionen
- Expired-Callback für bessere UX
- Detaillierte Konsolen-Logs für Debugging

---

## 📞 Support-Informationen

**Bei Problemen:**
- Firebase-Konfiguration muss vom Firebase-Admin durchgeführt werden
- Domain-Autorisierung kann bis zu 24h dauern
- E-Mail-Templates sind sofort wirksam nach der Änderung

**Priorität:** 🔴 KRITISCH - Blockiert wichtige Sicherheitsfeatures