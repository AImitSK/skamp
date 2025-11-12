# Email-Versand-System: Test-Strategie und Implementierung

**Datum:** 2025-01-12
**Status:** Planning
**Basis:** Vorhandene Test-Infrastruktur Analyse

---

## 1. Vorhandene Test-Infrastruktur (✅ Funktioniert)

### Jest-Konfiguration
**Dateien:**
- `jest.config.js` - Haupt-Konfiguration
- `jest.setup.js` - Setup-Script
- `src/__tests__/setup.ts` - Test-Setup
- `src/__tests__/setupFirebaseMocks.ts` - Firebase Mocks

**Test-Scripts (package.json):**
```bash
npm test                # Jest ausführen
npm run test:watch      # Watch-Modus
npm run test:coverage   # Coverage-Report
npm run test:ci         # CI-Pipeline (mit Coverage)
npm run test:e2e        # Playwright E2E-Tests
```

### Vorhandene Mocks

**Firebase Client SDK** (`src/__tests__/__mocks__/firebase/`)
- ✅ `firestore.ts` - Firestore Client SDK
- ✅ `storage.ts` - Firebase Storage
- ✅ `app.ts` - Firebase App
- ✅ `config.ts` - Firebase Config

**Context Mocks** (`src/__tests__/test-utils.tsx`)
- ✅ `MockAuthProvider` - Auth Context
- ✅ `MockOrganizationProvider` - Organization Context
- ✅ `createTestQueryClient` - React Query

**Beispiel-Tests:**
- `src/__tests__/features/approvals-service.test.ts` - Service-Test-Pattern
- `src/__tests__/features/pdf-versions-service.test.ts` - PDF-Service-Tests
- 40+ weitere Test-Dateien

### Test-Pattern (bewährt)

```typescript
// 1. Firebase komplett mocken
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(),
  // ...
}));

// 2. Mock-Daten erstellen
const mockData = {
  id: 'test-123',
  // ...
};

// 3. Mock-Verhalten definieren
mockGetDocs.mockResolvedValue({
  docs: [{ id: 'test-123', data: () => mockData }],
  empty: false
});

// 4. Service testen
const result = await service.method();
expect(result).toEqual(expectedResult);
```

---

## 2. Fehlende Mocks (❌ Muss erstellt werden)

### Firebase Admin SDK
**Benötigt für:** Server-Side API-Routes (Cron-Job, Email-Send)

**Zu mocken:**
- `firebase-admin/firestore` (adminDb)
- `firebase-admin/app` (Admin App Init)

**Neue Datei:** `src/__tests__/__mocks__/firebase-admin.ts`

```typescript
// Mock Firebase Admin SDK
export const adminDb = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    })),
    where: jest.fn(() => ({
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
      count: jest.fn()
    })),
    add: jest.fn(),
    get: jest.fn()
  }))
};

export const admin = {
  firestore: {
    FieldValue: {
      serverTimestamp: jest.fn(() => new Date()),
      increment: jest.fn((n) => n),
      arrayUnion: jest.fn((...items) => items),
      arrayRemove: jest.fn((...items) => items)
    },
    Timestamp: {
      now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
      fromDate: jest.fn((date: Date) => ({
        seconds: date.getTime() / 1000,
        nanoseconds: 0
      }))
    }
  }
};
```

### SendGrid
**Benötigt für:** Email-Versand-Tests

**Zu mocken:**
- `@sendgrid/mail` (send, setApiKey)

**Neue Datei:** `src/__tests__/__mocks__/@sendgrid/mail.ts`

```typescript
export const mockSend = jest.fn(() => Promise.resolve([{ statusCode: 202 }]));
export const mockSetApiKey = jest.fn();

const sendgrid = {
  setApiKey: mockSetApiKey,
  send: mockSend
};

export default sendgrid;
```

### PDF-Generation API
**Benötigt für:** PDF-Generierung in Tests

**Mock-Strategie:** Fetch-Mock für `/api/generate-pdf`

```typescript
// In Test-Setup
global.fetch = jest.fn((url) => {
  if (url.includes('/api/generate-pdf')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        pdfBase64: 'mock-pdf-base64-string',
        fileName: 'test.pdf'
      })
    });
  }
  return Promise.reject(new Error('Unhandled fetch'));
}) as jest.Mock;
```

---

## 3. Zu erstellende Test-Suites

### 3.1 Unit-Tests: `email-sender-service.test.ts`

**Datei:** `src/__tests__/lib/email/email-sender-service.test.ts`

**Testfälle:**
```typescript
describe('EmailSenderService', () => {
  let service: EmailSenderService;

  beforeEach(() => {
    service = new EmailSenderService();
    jest.clearAllMocks();
  });

  describe('prepareEmailData', () => {
    it('should load campaign from Firestore', async () => {
      // Test: Campaign korrekt laden
    });

    it('should load HTML signature when signatureId provided', async () => {
      // Test: HTML-Signatur laden
    });

    it('should generate PDF with correct content', async () => {
      // Test: PDF-Generation mit mainContent
    });

    it('should create or reuse media share link', async () => {
      // Test: Share-Link-Generierung
    });

    it('should handle missing campaign gracefully', async () => {
      // Test: Fehlerbehandlung
    });
  });

  describe('sendToRecipients', () => {
    it('should send email to all recipients from lists', async () => {
      // Test: Versand an Listen-Empfänger
    });

    it('should send email to manual recipients', async () => {
      // Test: Versand an manuelle Empfänger
    });

    it('should replace all variables correctly', async () => {
      // Test: Variable Replacement ({{salutationFormal}}, etc.)
    });

    it('should attach PDF to email', async () => {
      // Test: PDF-Anhang
    });

    it('should include media share link in email body', async () => {
      // Test: Share-Link im Email-Body
    });

    it('should handle SendGrid errors gracefully', async () => {
      // Test: SendGrid-Fehler-Handling
    });

    it('should count successes and failures correctly', async () => {
      // Test: Erfolgs-/Fehler-Zählung
    });

    it('should not include unnecessary info boxes', async () => {
      // Test: Sauberes Email-HTML (keine Debug-Infos)
    });
  });

  describe('loadAllRecipients', () => {
    it('should load recipients from distribution lists', async () => {
      // Test: Listen laden
    });

    it('should merge list and manual recipients', async () => {
      // Test: Listen + Manuelle Empfänger kombinieren
    });

    it('should deduplicate recipients by email', async () => {
      // Test: Duplikate entfernen
    });
  });

  describe('buildEmailHtml', () => {
    it('should build email with HTML signature', async () => {
      // Test: HTML-Signatur einbinden
    });

    it('should fallback to text signature', async () => {
      // Test: Fallback Text-Signatur
    });

    it('should include media link when available', async () => {
      // Test: Media-Link einbinden
    });

    it('should not include test banner in production', async () => {
      // Test: Kein TEST-Banner in Produktion
    });
  });
});
```

**Coverage-Ziel:** 80%+

---

### 3.2 Integration-Tests: API-Routes

#### Test: `/api/email/send`

**Datei:** `src/__tests__/api/email/send.test.ts`

```typescript
describe('POST /api/email/send', () => {
  it('should schedule email when sendAt is in future', async () => {
    // Test: Geplanter Versand (Firestore-Eintrag)
  });

  it('should send email immediately when sendAt is null', async () => {
    // Test: Sofort-Versand
  });

  it('should require authentication', async () => {
    // Test: Auth-Prüfung
  });

  it('should validate draft data', async () => {
    // Test: Validierung
  });

  it('should return 400 for invalid data', async () => {
    // Test: Error-Handling
  });
});
```

#### Test: `/api/email/cron/process`

**Datei:** `src/__tests__/api/email/cron/process.test.ts`

```typescript
describe('POST /api/email/cron/process', () => {
  it('should require valid CRON_SECRET', async () => {
    // Test: Auth via Bearer Token
  });

  it('should process scheduled emails', async () => {
    // Test: Emails verarbeiten
  });

  it('should update status to processing', async () => {
    // Test: Status-Update
  });

  it('should update status to sent on success', async () => {
    // Test: Success-Status
  });

  it('should update status to failed on error', async () => {
    // Test: Error-Status
  });

  it('should limit batch size to 50', async () => {
    // Test: Batch-Limit
  });

  it('should handle empty queue gracefully', async () => {
    // Test: Leere Queue
  });
});

describe('GET /api/email/cron/process', () => {
  it('should return health check status', async () => {
    // Test: Health-Check
  });

  it('should require CRON_SECRET for health check', async () => {
    // Test: Auth auch bei Health-Check
  });
});
```

---

### 3.3 E2E-Tests: Email-Workflow (Playwright)

**Datei:** `e2e/pr-email-workflow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('PR Email Versand Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login, zu Campaign navigieren
  });

  test('Sofort-Versand: Email senden', async ({ page }) => {
    // 1. Step 1-3 ausfüllen
    // 2. Step 4: "Sofort versenden" wählen
    // 3. Email senden
    // 4. Success-Message prüfen
  });

  test('Geplanter Versand: Email planen', async ({ page }) => {
    // 1. Step 1-3 ausfüllen
    // 2. Step 4: "Geplanter Versand" wählen
    // 3. Datum/Zeit wählen (in Zukunft)
    // 4. Email planen
    // 5. Success-Message prüfen
    // 6. Firestore: scheduled_emails Entry prüfen
  });

  test('Test-Email: Alle Felder korrekt', async ({ page }) => {
    // 1. Test-Email senden
    // 2. Email empfangen (via Webhook/Mailhog)
    // 3. Prüfen:
    //    - Variablen ersetzt
    //    - PDF angehängt
    //    - Signatur korrekt
    //    - Share-Link vorhanden
    //    - Keine Debug-Infos
  });
});
```

---

## 4. Kaputte Tests reparieren

### Check: Welche Tests schlagen fehl?

```bash
npm test 2>&1 | grep -A5 "FAIL"
```

**Häufige Probleme:**
1. **Veraltete Mocks:** Firebase SDK-Updates
2. **Fehlende Dependencies:** Admin SDK, SendGrid
3. **Path-Imports:** `@/lib/...` nicht gefunden
4. **Type-Errors:** TypeScript-Fehler in Tests

### Reparatur-Strategie:

**1. Liste aller fehlenden Tests erstellen:**
```bash
npm test -- --listTests | grep -E "(email|pdf|approval)" > failing-tests.txt
```

**2. Tests einzeln durchgehen:**
```bash
npm test -- src/__tests__/features/pdf-versions-service.test.ts
```

**3. Fehler kategorisieren:**
- Mock fehlt → Mock erstellen
- Import fehlt → Path korrigieren
- Type-Error → Type-Definition updaten

---

## 5. Integration in Implementierungsplan

### Aktualisierte Phase-Aufteilung:

#### Phase 1: Vorbereitung (2-3 Tage) ← **ERWEITERT**
- [x] Environment Variables
- [ ] `email-sender-service.ts` erstellen
- [ ] Collection `scheduled_emails` in Firestore
- [ ] TypeScript-Typen
- [ ] **NEU: Test-Mocks erstellen**
  - [ ] Firebase Admin SDK Mock
  - [ ] SendGrid Mock
  - [ ] PDF-API Mock
- [ ] **NEU: Kaputte Tests reparieren**
  - [ ] Liste erstellen
  - [ ] Tests einzeln fixen

#### Phase 2: Backend (2-3 Tage)
- [ ] `/api/email/send` Route
- [ ] `/api/email/cron/process` Route
- [ ] `email-sender-service.ts` implementieren
- [ ] Vercel Cron in `vercel.json`
- [ ] Test-Email-Route refactoren
- [ ] **NEU: Tests parallel schreiben**
  - [ ] `email-sender-service.test.ts` (während Implementation)
  - [ ] API-Route-Tests

#### Phase 3: Frontend (1-2 Tage)
- [ ] Step4 UI (Datum/Zeit-Picker)
- [ ] Send-Handler
- [ ] **NEU: Component-Tests**
  - [ ] Step4SendOptions.test.tsx

#### Phase 4: Testing & Rollout (2-3 Tage)
- [ ] **Unit-Tests ausführen** (npm test)
- [ ] **Coverage prüfen** (npm run test:coverage) → Ziel: 80%+
- [ ] **E2E-Tests** (Playwright)
- [ ] Staging-Deployment
- [ ] Production-Deployment

#### Phase 5: Cleanup (1 Tag)
- [ ] Alte Route entfernen
- [ ] Test-Documentation
- [ ] Performance-Optimierung

### Geschätzter Gesamtaufwand:
**6-9 Arbeitstage** (statt 5-8, wegen Test-Erstellung + Reparatur)

---

## 6. Test-Kommandos für dieses Projekt

### Während Entwicklung:
```bash
# Watch-Modus für email-sender-service
npm run test:watch -- email-sender-service

# Einzelner Test
npm test -- email-sender-service.test.ts

# Mit Coverage
npm run test:coverage -- email-sender-service.test.ts
```

### Vor Commit:
```bash
# Alle Tests
npm test

# Type-Check
npm run type-check

# Lint
npm run lint
```

### CI/CD Pipeline:
```bash
# In GitHub Actions / Vercel
npm run test:ci
```

---

## 7. Success-Kriterien (Tests)

### Unit-Tests
- ✅ `email-sender-service.test.ts` → 80%+ Coverage
- ✅ Alle Methoden getestet
- ✅ Edge-Cases abgedeckt
- ✅ Mocks korrekt verwendet

### Integration-Tests
- ✅ API-Routes getestet (send, cron)
- ✅ Auth/Validation getestet
- ✅ Error-Handling getestet

### E2E-Tests
- ✅ Vollständiger Workflow funktioniert
- ✅ Email-Inhalte korrekt
- ✅ Scheduled Sending funktioniert

### Keine Regressions
- ✅ Alle existierenden Tests laufen
- ✅ Keine neuen Fehler eingeführt

---

## 8. Nächste Schritte (Test-spezifisch)

### Sofort:
1. **Kaputte Tests identifizieren**
   ```bash
   npm test 2>&1 | tee test-results.txt
   ```

2. **Mock-Dateien erstellen**
   - `src/__tests__/__mocks__/firebase-admin.ts`
   - `src/__tests__/__mocks__/@sendgrid/mail.ts`

3. **Test-Datei-Struktur vorbereiten**
   ```bash
   mkdir -p src/__tests__/lib/email
   mkdir -p src/__tests__/api/email
   touch src/__tests__/lib/email/email-sender-service.test.ts
   touch src/__tests__/api/email/send.test.ts
   touch src/__tests__/api/email/cron-process.test.ts
   ```

### Danach:
4. **Test-Driven Development**
   - Tests ZUERST schreiben
   - Implementation folgt Tests
   - Red → Green → Refactor

---

**Letzte Aktualisierung:** 2025-01-12
**Erstellt von:** Claude AI
**Review:** Pending
