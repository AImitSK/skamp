# Troubleshooting Guide

## 🔧 SKAMP Fehlerbehebung

Dieser Guide hilft bei der Lösung häufiger Probleme mit SKAMP. Die Probleme sind nach Kategorien sortiert, mit Symptomen, Ursachen und Lösungen.

## 📋 Inhaltsverzeichnis

- [Quick Fixes](#quick-fixes)
- [Installation & Setup](#installation--setup)
- [Firebase Probleme](#firebase-probleme)
- [Authentifizierung](#authentifizierung)
- [Datenbank (Firestore)](#datenbank-firestore)
- [E-Mail (SendGrid)](#e-mail-sendgrid)
- [KI-Features (Gemini)](#ki-features-gemini)
- [Build & Deployment](#build--deployment)
- [Performance Probleme](#performance-probleme)
- [Browser-spezifische Probleme](#browser-spezifische-probleme)
- [Entwicklungsumgebung](#entwicklungsumgebung)
- [Fehler-Codes Referenz](#fehler-codes-referenz)
- [Support & Hilfe](#support--hilfe)

## 🚀 Quick Fixes

Die häufigsten Probleme und ihre schnellen Lösungen:

### 1. "Module not found" Fehler
```bash
rm -rf node_modules package-lock.json .next
npm install
npm run dev
```

### 2. Firebase Connection Error
```bash
# .env.local prüfen
cat .env.local | grep FIREBASE

# Alle Firebase ENV vars müssen gesetzt sein
# Server neu starten nach ENV-Änderungen
```

### 3. Build schlägt fehl
```bash
# Cache löschen
rm -rf .next

# Type-Fehler prüfen
npm run type-check

# Dann neu builden
npm run build
```

### 4. "CORS Error" bei API Calls
Server neu starten - Next.js lädt ENV-Variablen nur beim Start.

## 🛠 Installation & Setup

### Problem: npm install schlägt fehl

**Symptome:**
- `npm ERR! code ERESOLVE`
- `unable to resolve dependency tree`
- `peer dep missing`

**Lösungen:**

1. Node Version prüfen:
```bash
node --version  # Sollte 18.17+ oder 20+ sein
```

2. Mit Legacy Peer Deps:
```bash
npm install --legacy-peer-deps
```

3. Cache löschen:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

4. Mit npm 7+ force resolution:
```bash
npm install --force
```

### Problem: "Cannot find module '@/components/...'"

**Ursache:** TypeScript Path Aliasing nicht konfiguriert

**Lösung:**
1. Prüfe `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. VS Code neu starten
3. TypeScript Version prüfen:
```bash
npx tsc --version  # Sollte 5.0+ sein
```

### Problem: Environment Variables werden nicht geladen

**Symptome:**
- `undefined` Werte für process.env.NEXT_PUBLIC_*
- Firebase Init Error

**Lösungen:**

1. Dateiname prüfen:
```bash
# Muss genau .env.local heißen (nicht .env)
ls -la | grep env
```

2. NEXT_PUBLIC_ Prefix für Client-Side:
```bash
# Richtig
NEXT_PUBLIC_FIREBASE_API_KEY=xxx

# Falsch (nicht im Browser verfügbar)
FIREBASE_API_KEY=xxx
```

3. Server neu starten:
```bash
# Nach jeder ENV-Änderung!
npm run dev
```

4. Keine Leerzeichen um '=':
```bash
# Richtig
SENDGRID_API_KEY=SG.xxx

# Falsch
SENDGRID_API_KEY = SG.xxx
```

## 🔥 Firebase Probleme

### Problem: "Firebase: No Firebase App '[DEFAULT]' has been created"

**Ursache:** Firebase wird mehrfach initialisiert oder gar nicht

**Lösung:**

1. Singleton Pattern verwenden:
```typescript
// src/lib/firebase/config.ts
import { getApps, initializeApp } from 'firebase/app';

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
```

2. Import Order prüfen:
```typescript
// Immer firebase config zuerst importieren
import '@/lib/firebase/config';
import { auth, db } from '@/lib/firebase/config';
```

### Problem: "Missing or insufficient permissions"

**Ursache:** Firestore Security Rules blockieren Zugriff

**Lösungen:**

1. Prüfe ob User eingeloggt ist:
```typescript
const user = auth.currentUser;
if (!user) {
  console.error('Not authenticated');
  return;
}
```

2. Security Rules prüfen:
```bash
# Rules lokal testen
firebase emulators:start
```

3. UserId in Dokument prüfen:
```javascript
// Dokument muss userId Feld haben
{
  userId: 'current-user-id',
  // andere Felder...
}
```

### Problem: "Quota exceeded" Fehler

**Symptome:**
- `Quota exceeded for quota metric 'Read requests'`
- Plötzlich keine Daten mehr

**Lösungen:**

1. Firebase Console → Usage prüfen
2. Indizes optimieren:
```bash
firebase deploy --only firestore:indexes
```

3. Queries optimieren:
```typescript
// Schlecht - lädt alle Dokumente
const allDocs = await getDocs(collection(db, 'contacts'));

// Besser - mit Limit
const limitedDocs = await getDocs(
  query(collection(db, 'contacts'), 
    where('userId', '==', userId),
    limit(50)
  )
);
```

### Problem: Firebase Storage Upload schlägt fehl

**Symptome:**
- "User does not have permission to access"
- Upload Progress hängt bei 0%

**Lösungen:**

1. Storage Rules prüfen:
```javascript
// storage.rules
match /users/{userId}/media/{allPaths=**} {
  allow read, write: if request.auth.uid == userId;
}
```

2. File Size Limit prüfen:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large');
}
```

3. CORS für Storage:
```json
// cors.json
[
  {
    "origin": ["http://localhost:3000", "https://app.skamp.de"],
    "method": ["GET", "POST"],
    "maxAgeSeconds": 3600
  }
]
```
```bash
gsutil cors set cors.json gs://your-bucket
```

## 🔐 Authentifizierung

### Problem: Login funktioniert nicht

**Symptome:**
- "auth/invalid-email"
- "auth/user-not-found"
- Redirect Loop

**Lösungen:**

1. Firebase Auth Methoden aktiviert?
   - Firebase Console → Authentication → Sign-in method
   - Email/Password muss aktiviert sein

2. Auth Persistence prüfen:
```typescript
import { browserLocalPersistence, setPersistence } from 'firebase/auth';

// Für "Remember Me"
await setPersistence(auth, browserLocalPersistence);
```

3. Auth State Change Handler:
```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // User logged in
    } else {
      // User logged out
    }
  });
  return unsubscribe;
}, []);
```

### Problem: "auth/too-many-requests"

**Ursache:** Zu viele fehlgeschlagene Login-Versuche

**Lösung:**

1. Warte 1-2 Stunden
2. Implementiere Rate Limiting:
```typescript
// Login Komponente
const [attempts, setAttempts] = useState(0);
const MAX_ATTEMPTS = 5;

if (attempts >= MAX_ATTEMPTS) {
  // Zeige "Zu viele Versuche" Nachricht
  return;
}
```

### Problem: Session läuft ständig ab

**Lösungen:**

1. Auth Token Refresh:
```typescript
// Token automatisch refreshen
auth.currentUser?.getIdToken(true);
```

2. Session Extension implementieren:
```typescript
// Bei User-Aktivität
const extendSession = async () => {
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(true);
  }
};
```

## 💾 Datenbank (Firestore)

### Problem: Daten werden nicht geladen

**Debugging Steps:**

1. Console Network Tab prüfen:
   - 404? → Collection/Document existiert nicht
   - 403? → Permission denied
   - 429? → Rate limit

2. Firestore Emulator verwenden:
```bash
firebase emulators:start
# Öffne http://localhost:4000 für Emulator UI
```

3. Query debuggen:
```typescript
// Debug Query
console.log('Query:', query.toString());

try {
  const snapshot = await getDocs(query);
  console.log('Results:', snapshot.size);
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
} catch (error) {
  console.error('Query failed:', error);
}
```

### Problem: "Uncaught Error in snapshot listener"

**Ursache:** Listener Error Handling fehlt

**Lösung:**
```typescript
// Immer Error Handler hinzufügen
const unsubscribe = onSnapshot(
  query(collection(db, 'contacts')),
  (snapshot) => {
    // Handle data
  },
  (error) => {
    console.error('Listener error:', error);
    // User-friendly error message
    if (error.code === 'permission-denied') {
      showToast('Keine Berechtigung für diese Daten');
    }
  }
);
```

### Problem: Offline Persistence funktioniert nicht

**Lösung:**
```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

// Einmal beim App Start
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support
    console.warn('Persistence not available');
  }
});
```

## 📧 E-Mail (SendGrid)

### Problem: E-Mails werden nicht gesendet

**Debugging Checklist:**

1. API Key korrekt?
```bash
# Beginnt mit 'SG.'?
echo $SENDGRID_API_KEY | head -c 3
```

2. Sender verifiziert?
   - SendGrid Dashboard → Settings → Sender Authentication
   - Single Sender Verification completed?

3. Test mit cURL:
```bash
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer $SENDGRID_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "personalizations": [{
      "to": [{"email": "test@example.com"}]
    }],
    "from": {"email": "noreply@yourdomain.com"},
    "subject": "Test",
    "content": [{
      "type": "text/plain",
      "value": "Test email"
    }]
  }'
```

### Problem: "401 Unauthorized" von SendGrid

**Lösungen:**

1. API Key Permissions prüfen:
   - Full Access oder mindestens "Mail Send"

2. Environment Variable Format:
```bash
# Richtig (keine Leerzeichen!)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx

# Falsch
SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxx"
SENDGRID_API_KEY='SG.xxxxxxxxxxxxxxxxxxxx'
```

### Problem: E-Mails landen im Spam

**Lösungen:**

1. SPF/DKIM/DMARC einrichten:
   - SendGrid → Settings → Sender Authentication
   - Domain Authentication durchführen

2. E-Mail Content prüfen:
```typescript
// Spam-Trigger vermeiden
const subject = title
  .replace(/!/g, '')  // Keine Ausrufezeichen
  .replace(/CAPS/g, 'Caps')  // Keine GROSSBUCHSTABEN
  .replace(/€€€/g, 'Euro');  // Keine mehrfachen Währungszeichen
```

3. Unsubscribe Link hinzufügen:
```html
<p style="font-size: 12px; color: #666;">
  Sie erhalten diese E-Mail, weil Sie sich für unseren Presseverteiler angemeldet haben.
  <a href="{{{unsubscribe}}}">Abmelden</a>
</p>
```

### Problem: Webhook Events kommen nicht an

**Lösungen:**

1. Für Local Development - ngrok verwenden:
```bash
ngrok http 3000
# Use the HTTPS URL for webhook
```

2. Webhook Endpoint prüfen:
```typescript
// api/webhooks/sendgrid/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  
  // Verify webhook
  const signature = request.headers.get('x-twilio-email-event-webhook-signature');
  const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp');
  
  // Log for debugging
  console.log('Webhook received:', { signature, timestamp, body });
  
  return new Response('OK', { status: 200 });
}
```

## 🤖 KI-Features (Gemini)

### Problem: "429 Resource has been exhausted"

**Ursache:** Gemini API Rate Limit erreicht

**Lösungen:**

1. Rate Limiting implementieren:
```typescript
import { RateLimiter } from 'limiter';

const geminiLimiter = new RateLimiter({
  tokensPerInterval: 50,
  interval: 'minute',
});

async function callGemini(prompt: string) {
  await geminiLimiter.removeTokens(1);
  // API call
}
```

2. Exponential Backoff:
```typescript
async function callWithRetry(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

3. Free Tier Limits beachten:
   - 60 requests/minute
   - 32,000 tokens/minute

### Problem: "Safety settings blocked the content"

**Ursache:** Gemini's Safety Filter

**Lösungen:**

1. Safety Settings anpassen:
```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    // Weitere Kategorien...
  ],
});
```

2. Prompt reformulieren:
```typescript
// Vermeiden: "Vernichte die Konkurrenz"
// Besser: "Übertreffe die Wettbewerber"
```

### Problem: KI generiert falsches Format

**Lösung mit strukturiertem Output:**
```typescript
const prompt = `
Erstelle eine Pressemitteilung mit genau dieser Struktur:

HEADLINE: [Eine prägnante Überschrift]
LEAD: [Ein Absatz mit den wichtigsten Informationen]
BODY: [2-3 Absätze Haupttext]
QUOTE: [Ein Zitat mit Sprecher]
BOILERPLATE: [Über das Unternehmen]

Thema: ${userInput}
`;
```

## 🏗 Build & Deployment

### Problem: Build schlägt fehl mit "out of memory"

**Lösungen:**

1. Node Memory erhöhen:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

2. In package.json:
```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

### Problem: "Module not found" nur im Production Build

**Ursache:** Case-Sensitivity auf Linux-Servern

**Lösung:**
```bash
# Finde Case-Mismatches
find src -name "*.tsx" -o -name "*.ts" | xargs grep -E "from ['\"]\..*['\"]" | grep -v node_modules

# Beispiel Fix:
# Falsch: import Button from './button'
# Richtig: import Button from './Button'
```

### Problem: Static Export Fehler

**Für Firebase Hosting:**
```javascript
// next.config.mjs
const config = {
  output: 'export',
  images: {
    unoptimized: true, // Für static export
  },
  // Keine API Routes bei static export!
};
```

### Problem: Vercel Deployment schlägt fehl

**Common Issues:**

1. Environment Variables:
   - Alle in Vercel Dashboard gesetzt?
   - Für richtige Environments (Production/Preview)?

2. Build Command:
```bash
# Standard
npm run build

# Mit Install
npm ci && npm run build
```

3. Output Directory:
   - Next.js: `.next` (standard)
   - Static Export: `out`

## ⚡ Performance Probleme

### Problem: Langsame Ladezeiten

**Diagnose:**
```bash
# Bundle Analyse
npm run build:analyze

# Lighthouse
npx lighthouse http://localhost:3000 --view
```

**Lösungen:**

1. Code Splitting:
```typescript
// Dynamic Imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

2. Image Optimization:
```typescript
import Image from 'next/image';

// Statt <img>
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // für above-the-fold
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>
```

3. Font Optimization:
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});
```

### Problem: Firebase Queries sind langsam

**Optimierungen:**

1. Composite Indizes:
```typescript
// Langsam ohne Index
where('userId', '==', userId),
where('status', '==', 'active'),
orderBy('createdAt', 'desc')

// Index in firestore.indexes.json hinzufügen
```

2. Pagination implementieren:
```typescript
const PAGE_SIZE = 20;
let lastDoc = null;

// Erste Seite
const firstQuery = query(
  collection(db, 'contacts'),
  orderBy('createdAt'),
  limit(PAGE_SIZE)
);

// Nächste Seite
const nextQuery = query(
  collection(db, 'contacts'),
  orderBy('createdAt'),
  startAfter(lastDoc),
  limit(PAGE_SIZE)
);
```

3. Denormalisierung:
```typescript
// Statt Join über companyId
contact = {
  companyId: 'abc',
  companyName: 'Firma GmbH', // Denormalisiert
}
```

## 🌐 Browser-spezifische Probleme

### Problem: Safari - IndexedDB Fehler

**Lösung:**
```typescript
// Safari Private Mode Detection
const testIndexedDB = async () => {
  try {
    const db = await openDB('test');
    await db.close();
    await deleteDB('test');
    return true;
  } catch {
    console.warn('IndexedDB not available (Private Mode?)');
    return false;
  }
};
```

### Problem: Firefox - Cookie Blocking

**Lösung:**
```typescript
// Strict Cookie Settings
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // nicht 'strict'
  path: '/',
};
```

### Problem: Mobile - Touch Events

**Lösung:**
```typescript
// Touch-friendly Interactions
const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
  e.preventDefault();
  // Handle both mouse and touch
};

<button
  onClick={handleInteraction}
  onTouchEnd={handleInteraction}
  className="min-h-[44px] min-w-[44px]" // Apple Touch Guidelines
>
```

## 💻 Entwicklungsumgebung

### Problem: Hot Reload funktioniert nicht

**Lösungen:**

1. Fast Refresh aktivieren:
```javascript
// next.config.mjs
const config = {
  reactStrictMode: true, // Wichtig für Fast Refresh
};
```

2. WSL2 File Watching:
```bash
# In WSL2
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

3. Polling aktivieren (letzter Ausweg):
```bash
WATCHPACK_POLLING=true npm run dev
```

### Problem: TypeScript Fehler in VS Code

**Lösungen:**

1. TypeScript Version:
```bash
# Workspace TypeScript verwenden
Ctrl+Shift+P → "TypeScript: Select TypeScript Version" → "Use Workspace Version"
```

2. Cache löschen:
```bash
# VS Code Cache
rm -rf ~/Library/Application\ Support/Code/Cache/* # macOS
rm -rf ~/.config/Code/Cache/* # Linux
```

3. Restart TS Server:
```
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Problem: ESLint läuft nicht

**Lösungen:**

1. ESLint Extension installiert?
2. `.eslintrc.json` vorhanden?
3. ESLint Output prüfen:
```
View → Output → ESLint
```

## 📊 Fehler-Codes Referenz

### Firebase Auth Errors

| Code | Bedeutung | Lösung |
|------|-----------|---------|
| auth/invalid-email | Ungültige E-Mail | E-Mail-Format prüfen |
| auth/user-disabled | Account deaktiviert | Admin kontaktieren |
| auth/user-not-found | User existiert nicht | Registrierung prüfen |
| auth/wrong-password | Falsches Passwort | Passwort zurücksetzen |
| auth/too-many-requests | Zu viele Versuche | 1-2 Stunden warten |
| auth/network-request-failed | Netzwerkfehler | Internetverbindung prüfen |

### Firestore Errors

| Code | Bedeutung | Lösung |
|------|-----------|---------|
| permission-denied | Keine Berechtigung | Security Rules prüfen |
| unavailable | Service nicht verfügbar | Später erneut versuchen |
| resource-exhausted | Quota überschritten | Firebase Limits prüfen |
| failed-precondition | Vorbedingung fehlt | Index erstellen |
| not-found | Dokument nicht gefunden | Document ID prüfen |

### SendGrid Errors

| Code | Bedeutung | Lösung |
|------|-----------|---------|
| 401 | Unauthorized | API Key prüfen |
| 403 | Forbidden | Sender verifizieren |
| 429 | Rate Limited | Sende-Rate reduzieren |
| 500 | Server Error | SendGrid Status prüfen |

### Gemini API Errors

| Code | Bedeutung | Lösung |
|------|-----------|---------|
| 429 | Quota exceeded | Rate Limiting implementieren |
| 400 | Invalid request | Prompt prüfen |
| 403 | API key invalid | Key in AI Studio prüfen |
| 500 | Model overloaded | Später erneut versuchen |

## 🆘 Support & Hilfe

### Selbsthilfe

1. **Error Messages googeln**:
   - Exakte Fehlermeldung in Anführungszeichen
   - "+ Next.js" oder "+ Firebase" hinzufügen

2. **GitHub Issues durchsuchen**:
   - [SKAMP Issues](https://github.com/skamp/skamp/issues)
   - Auch geschlossene Issues prüfen

3. **Logs prüfen**:
   ```bash
   # Browser Console
   F12 → Console
   
   # Network Tab
   F12 → Network → Filter: Fetch/XHR
   
   # Node.js Logs
   DEBUG=* npm run dev
   ```

### Community Support

- **GitHub Discussions**: Für Fragen und Diskussionen
- **Stack Overflow**: Tag mit `skamp`
- **Discord**: [SKAMP Community](https://discord.gg/skamp) (geplant)

### Professioneller Support

- **E-Mail**: support@skamp.de
- **Priorität Support**: Für zahlende Kunden
- **Response Time**: 
  - Free: Best Effort
  - Pro: 24h
  - Enterprise: 4h

### Bug Report Template

```markdown
**Environment:**
- OS: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 120]
- Node Version: [e.g. 20.10.0]
- SKAMP Version: [e.g. 1.0.0]

**Problem Description:**
[Clear description of the issue]

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Error Messages:**
```
[Paste error messages here]
```

**Screenshots:**
[If applicable]

**Additional Context:**
[Any other relevant information]
```

---

*Wenn dein Problem hier nicht gelöst wird, erstelle ein [GitHub Issue](https://github.com/skamp/skamp/issues/new) mit dem Bug Report Template.*