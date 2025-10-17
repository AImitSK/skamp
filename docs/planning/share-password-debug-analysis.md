# Share-Link Passwortschutz - Debug-Analyse

**Datum:** 2025-10-17
**Problem:** Passwortschutz bei Share-Links wird völlig ignoriert
**Beispiel-Link:** https://www.celeropress.com/share/oh3dbXAjsL

---

## 🔴 KRITISCHES PROBLEM GEFUNDEN

### Root Cause: API gibt `requirePassword` zurück, Share Page prüft `passwordRequired`

**Datei:** `src/app/api/media/share/[shareId]/route.ts` (Zeile 62-66)

```typescript
settings: {
  ...shareData.settings,
  passwordRequired: undefined, // ❌ KEIN Passwort-Hash an Client senden!
  requirePassword: !!shareData.settings?.passwordRequired, // ✅ Boolean Flag
},
```

**Die API setzt:**
- `passwordRequired` → `undefined` (aus Security-Gründen, Hash darf nicht an Client)
- `requirePassword` → `true/false` (Boolean Flag ob Passwort erforderlich)

**Aber die Share Page prüft:**

**Datei:** `src/app/share/[shareId]/page.tsx` (Zeile 62)

```typescript
// ❌ FALSCH: Prüft passwordRequired (ist immer undefined!)
if (shareLink.settings.passwordRequired && !passwordValidated) {
  setPasswordRequired(true);
  return;
}
```

**Ergebnis:** Die Bedingung ist NIEMALS `true`, weil `passwordRequired` immer `undefined` ist!

---

## 📊 Kompletter Flow-Analyse

### 1️⃣ Share-Link Erstellung

**ShareModal.tsx** (handleCreateLink):
```typescript
// ✅ KORREKT
const response = await fetch('/api/media/share/create', {
  body: JSON.stringify({
    settings: {
      passwordRequired: passwordRequired.trim() || null // Plain-Text Passwort
    }
  })
});
```

**API Route** `/api/media/share/create` (Zeile 39-44):
```typescript
// ✅ KORREKT: Passwort wird gehashed
if (settings?.passwordRequired) {
  const hashedPassword = await bcrypt.hash(settings.passwordRequired, 10);
  processedSettings = {
    ...settings,
    passwordRequired: hashedPassword, // ← Gehashtes Passwort in DB
  };
}
```

**In Firestore gespeichert:**
```json
{
  "shareId": "oh3dbXAjsL",
  "settings": {
    "passwordRequired": "$2a$10$abcd...", // ← bcrypt Hash
    "downloadAllowed": true,
    "expiresAt": null
  }
}
```

✅ **Share-Erstellung funktioniert korrekt!**

---

### 2️⃣ Share-Link Laden

**useShareLink Hook** (useMediaData.ts, Zeile 476-495):
```typescript
// ✅ KORREKT
queryFn: async () => {
  const response = await fetch(`/api/media/share/${shareId}`);
  return response.json();
}
```

**API Route** `/api/media/share/[shareId]` (Zeile 62-66):
```typescript
// ⚠️ HIER IST DAS PROBLEM
settings: {
  ...shareData.settings,
  passwordRequired: undefined, // ❌ Hash wird entfernt (Security)
  requirePassword: !!shareData.settings?.passwordRequired, // ✅ Nur Boolean
}
```

**An Client zurückgegeben:**
```json
{
  "shareId": "oh3dbXAjsL",
  "settings": {
    "passwordRequired": undefined,  // ← Wurde entfernt!
    "requirePassword": true,        // ← Neues Boolean Flag
    "downloadAllowed": true
  }
}
```

✅ **API funktioniert korrekt!** (Security-Maßnahme: Hash nicht an Client senden)

---

### 3️⃣ Share Page - Passwort-Check

**share/[shareId]/page.tsx** (useEffect, Zeile 54-96):
```typescript
// ❌ FALSCH: Prüft falsches Feld!
useEffect(() => {
  if (!shareLink) return;

  const loadAdditionalContent = async () => {
    // ❌ shareLink.settings.passwordRequired ist IMMER undefined!
    if (shareLink.settings.passwordRequired && !passwordValidated) {
      setPasswordRequired(true);
      return;
    }

    // Code lädt immer Content, weil Bedingung nie true ist
    await loadFolderContent(...);
  };

  loadAdditionalContent();
}, [shareLink, passwordValidated]);
```

**Problem:** Die Bedingung `shareLink.settings.passwordRequired` ist immer `false/undefined`, daher wird NIEMALS der Passwort-Prompt angezeigt!

❌ **Share Page prüft falsches Feld!**

---

### 4️⃣ Passwort-Validierung (funktioniert, wird aber nie aufgerufen)

**API Route** `/api/media/share/validate` (Zeile 48):
```typescript
// ✅ KORREKT
const isValid = await bcrypt.compare(password, requiredPassword);
```

✅ **Validierung funktioniert korrekt!** (Wird nur nie erreicht)

---

## 🔧 LÖSUNG

### Fix für `share/[shareId]/page.tsx`:

**Zeile 62 ändern von:**
```typescript
if (shareLink.settings.passwordRequired && !passwordValidated) {
```

**Nach:**
```typescript
if (shareLink.settings.requirePassword && !passwordValidated) {
```

### Warum?

Die API gibt `requirePassword` als Boolean zurück, nicht `passwordRequired` (das ist der Hash).

---

## 📋 TypeScript Type-Fix

Das TypeScript-Interface muss auch angepasst werden:

**Datei:** `src/types/media.ts`

```typescript
export interface ShareLinkSettings {
  expiresAt: Date | null;
  downloadAllowed: boolean;
  passwordRequired?: string; // Server-Side Hash (nicht an Client)
  requirePassword?: boolean; // ✅ Neues Client-Side Boolean Flag
  watermarkEnabled: boolean;
  showFileList?: boolean;
}
```

---

## 🧪 Test-Szenarien

### Vor dem Fix:
1. Share-Link mit Passwort erstellt ✅
2. Passwort wird in DB gehashed ✅
3. Share-Link aufgerufen → **Kein Passwort-Prompt** ❌
4. Content wird direkt angezeigt ❌

### Nach dem Fix:
1. Share-Link mit Passwort erstellt ✅
2. Passwort wird in DB gehashed ✅
3. Share-Link aufgerufen → **Passwort-Prompt erscheint** ✅
4. Falsches Passwort → Fehler-Meldung ✅
5. Korrektes Passwort → Content wird geladen ✅

---

## 📝 Betroffene Dateien

1. ✅ **ShareModal.tsx** - Funktioniert korrekt
2. ✅ **`/api/media/share/create`** - Funktioniert korrekt (hasht Passwort)
3. ✅ **`/api/media/share/[shareId]`** - Funktioniert korrekt (gibt `requirePassword` zurück)
4. ✅ **`/api/media/share/validate`** - Funktioniert korrekt (bcrypt.compare)
5. ❌ **`share/[shareId]/page.tsx`** - **MUSS GEFIXT WERDEN** (prüft falsches Feld)
6. ⚠️ **`src/types/media.ts`** - **Type-Definition erweitern** (requirePassword hinzufügen)

---

## 🔒 Security-Überlegungen

### ✅ Korrekte Implementierung:

1. **Passwort wird gehashed** (bcrypt, 10 Salt Rounds)
2. **Hash wird NICHT an Client gesendet** (nur Boolean Flag)
3. **Validierung erfolgt Server-Side** (bcrypt.compare in API)
4. **Audit-Logs für fehlgeschlagene Versuche**
5. **Access-Count wird erst nach erfolgreicher Validierung erhöht**

### ⚠️ Aktuelles Problem:

**Passwort-Schutz ist komplett deaktiviert**, weil Share Page falsches Feld prüft.

---

## 🎯 Nächste Schritte

1. **Sofort:** `share/[shareId]/page.tsx` fixen (`requirePassword` statt `passwordRequired`)
2. **Type-Safety:** `src/types/media.ts` erweitern
3. **Testing:** Neuen Share-Link mit Passwort erstellen und testen
4. **Alte Links:** Erwägen, alle Share-Links vor diesem Fix zu invalidieren (optional)

---

## 📄 Code-Änderungen

### 1. share/[shareId]/page.tsx

**Zeile 62:**
```diff
- if (shareLink.settings.passwordRequired && !passwordValidated) {
+ if (shareLink.settings.requirePassword && !passwordValidated) {
```

### 2. src/types/media.ts

```diff
export interface ShareLinkSettings {
  expiresAt: Date | null;
  downloadAllowed: boolean;
  passwordRequired?: string;
+ requirePassword?: boolean; // Client-Side Boolean Flag
  watermarkEnabled: boolean;
  showFileList?: boolean;
}
```

---

## ✅ Nach dem Fix

Der komplette Flow funktioniert dann so:

1. **User erstellt Share-Link mit Passwort "test123"**
2. **ShareModal** → POST `/api/media/share/create` mit `passwordRequired: "test123"`
3. **API** hasht mit bcrypt → `$2a$10$...`
4. **In Firestore:** `settings.passwordRequired = "$2a$10$..."`
5. **Empfänger öffnet Link**
6. **useShareLink** → GET `/api/media/share/oh3dbXAjsL`
7. **API antwortet:**
   ```json
   {
     "settings": {
       "passwordRequired": undefined,
       "requirePassword": true
     }
   }
   ```
8. **Share Page prüft:** `if (shareLink.settings.requirePassword)` → ✅ true
9. **Passwort-Prompt wird angezeigt**
10. **User gibt "test123" ein**
11. **Share Page** → POST `/api/media/share/validate` mit Passwort
12. **API:** `bcrypt.compare("test123", "$2a$10$...")` → ✅ true
13. **Content wird geladen**

---

**Autor:** Claude Code
**Status:** Critical Bug - Immediate Fix Required
**Impact:** Security-Feature komplett deaktiviert
