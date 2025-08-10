# CeleroPress API Implementation Plan
## Public API für Kontakte & Bibliothek

### 🎯 **Vision & Anwendungsfall**

**Ziel:** CeleroPress-Daten nahtlos mit externen Systemen austauschen
**User Story:** PR-Agenturen verwenden diverse Tools (Salesforce, HubSpot, benutzerdefinierte CRM-Systeme) und müssen Kontaktdaten, Publikationsinformationen und Mediendaten zwischen diesen Plattformen synchronisieren.

**Beispiel-Workflows:**
- Salesforce → CeleroPress: Neue Leads als Journalisten-Kontakte übertragen
- CeleroPress → SPR Software: Publikationsdaten für Media-Planning exportieren  
- Bidirektional: Kontakt-Updates in beiden Systemen synchron halten

---

## 🏗️ **Technische Architektur**

### **Aktueller Status (Analyse)**
- ✅ **Frontend:** Vollständige CRM/Library Features vorhanden
- ✅ **Services:** Umfangreiche Firebase Services (CrmServiceEnhanced, LibraryService)
- ❌ **REST APIs:** Keine öffentlichen APIs - nur interne Firebase-Integration
- ✅ **Admin Interface:** Basis vorhanden (`/dashboard/admin/api`)

### **Geplante API-Struktur**
```
/api/v1/
├── /contacts/              # CRM Kontakte
│   ├── GET /               # Liste aller Kontakte  
│   ├── POST /              # Neuen Kontakt erstellen
│   ├── GET /:id            # Spezifischen Kontakt abrufen
│   ├── PUT /:id            # Kontakt aktualisieren
│   └── DELETE /:id         # Kontakt löschen
├── /companies/             # CRM Firmen
│   ├── GET /               # Liste aller Firmen
│   ├── POST /              # Neue Firma erstellen  
│   ├── GET /:id            # Spezifische Firma abrufen
│   ├── PUT /:id            # Firma aktualisieren
│   └── DELETE /:id         # Firma löschen
├── /publications/          # Bibliothek Publikationen
│   ├── GET /               # Liste aller Publikationen
│   ├── POST /              # Neue Publikation erstellen
│   ├── GET /:id            # Spezifische Publikation abrufen  
│   ├── PUT /:id            # Publikation aktualisieren
│   └── DELETE /:id         # Publikation löschen
├── /advertisements/        # Bibliothek Werbemittel
│   ├── GET /               # Liste aller Anzeigenformate
│   ├── POST /              # Neues Anzeigenformat erstellen
│   └── ...
└── /auth/                  # API-Authentifizierung
    ├── POST /token         # API-Token generieren
    └── DELETE /token/:id   # Token widerrufen
```

---

## 📋 **Implementierungs-Roadmap**

### **Phase 1: Grundlagen (Woche 1-2)**

#### **1.1 API-Authentifizierung**
- [ ] **API-Key Management System**
  - Datenmodell: `api_keys` Collection in Firestore
  - User kann API-Keys über Admin-Interface generieren
  - Rate-Limiting basierend auf Organization
  - Key-Rotation und Ablaufzeiten

- [ ] **Middleware-Implementierung**
  ```typescript
  // src/middleware/api-auth.ts
  export async function validateAPIKey(request: Request): Promise<{
    organizationId: string;
    userId: string; 
    permissions: string[];
  }>
  ```

#### **1.2 Base API-Infrastruktur**
- [ ] **Error Handling & Response Format**
  ```typescript
  interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  }
  ```

- [ ] **Rate Limiting** (erweitert aus bestehender `rate-limit-service.ts`)
  ```typescript
  // 1000 requests/hour per organization
  // 10 requests/minute für einzelne endpoints
  ```

### **Phase 2: CRM API (Woche 2-3)**

#### **2.1 Contacts API**
- [ ] **GET /api/v1/contacts**
  - Paginierung (limit, offset)
  - Filterung (tags, company, dateRange)
  - Suche (fulltext search)
  - Sortierung (name, createdAt, lastContact)

- [ ] **POST/PUT /api/v1/contacts**  
  - Vollständige ContactEnhanced-Integration
  - Validierung (required fields, email format)
  - Conflict-Resolution (duplicate emails)

#### **2.2 Companies API**
- [ ] **GET /api/v1/companies**
  - Media-House spezifische Filter 
  - Publication-Verknüpfungen einschließen
  - Geo-Filtering (country, region)

- [ ] **Bulk Operations**
  ```typescript
  POST /api/v1/contacts/bulk
  // Bis zu 100 Kontakte in einer Anfrage
  // Async processing mit job-status tracking
  ```

### **Phase 3: Library API (Woche 3-4)**

#### **3.1 Publications API**
- [ ] **GET /api/v1/publications**
  - Umfangreiche Filter-Optionen:
    - type (newspaper, magazine, online, tv, radio)
    - language, country, frequency
    - circulation_min/max, reach_min/max
    - verified_status, premium_only
  - Include-Parameter für related data (advertisements, company)

- [ ] **Rich Metadata Support**
  ```typescript
  interface PublicationAPIResponse extends Publication {
    // Zusätzliche API-spezifische Felder
    advertisements_count: number;
    last_updated: string;
    api_links: {
      self: string;
      company: string;
      advertisements: string;
    };
  }
  ```

### **Phase 4: Advanced Features (Woche 4-5)**

#### **4.1 Webhook Integration**  
- [ ] **Event-System**
  ```typescript
  POST /api/v1/webhooks
  {
    url: "https://client-system.com/webhooks/celeropress",
    events: ["contact.created", "contact.updated", "publication.updated"],
    secret: "webhook_secret_for_signature"
  }
  ```

#### **4.2 Bulk Export/Import**
- [ ] **CSV/JSON Export**
  ```
  GET /api/v1/contacts/export?format=csv&filter=...
  Content-Type: text/csv
  ```

- [ ] **Async Bulk Import**  
  ```
  POST /api/v1/contacts/import
  Content-Type: multipart/form-data
  → Returns: { job_id: "uuid", status_url: "/api/v1/jobs/uuid" }
  ```

### **Phase 5: Dokumentation & User Experience (Woche 5-6)**

#### **5.1 Interactive API-Dokumentation**
- [ ] **In-App API Explorer** (ähnlich Swagger UI)
  ```
  /dashboard/admin/api-docs
  - Live API-Testing direkt im Browser
  - Code-Examples für curl, JavaScript, Python
  - Response-Schema-Validation
  ```

- [ ] **SDK-Generierung**
  ```javascript
  // JavaScript SDK
  import { CeleroPressAPI } from '@celeropress/sdk';
  
  const api = new CeleroPressAPI({ 
    apiKey: 'your-api-key',
    baseUrl: 'https://your-domain.com'
  });
  
  const contacts = await api.contacts.list({ 
    tags: ['journalist'], 
    limit: 50 
  });
  ```

#### **5.2 Developer Dashboard**
- [ ] **API Usage Analytics**
  - Request-Volumen pro Endpoint
  - Response-Zeit-Metriken  
  - Error-Rate-Monitoring
  - Rate-Limit-Utilization

- [ ] **API-Key Management**
  - Key-Generierung mit Permissions (read-only, read-write)
  - Usage-Logs und Request-History
  - Rate-Limit-Konfiguration pro Key

---

## 🔧 **Technische Implementation Details**

### **Service-Layer Integration**
**Bestehende Services nutzen:**
```typescript
// src/app/api/v1/contacts/route.ts
import { crmServiceEnhanced } from '@/lib/firebase/crm-service-enhanced';

export async function GET(request: Request) {
  const { organizationId } = await validateAPIKey(request);
  const contacts = await crmServiceEnhanced.getAllContactsWithPagination(
    organizationId, 
    queryParams
  );
  return APIResponse.success(contacts);
}
```

### **Type-Safety & Validation**
```typescript
// src/types/api.ts
export interface ContactCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  tags?: string[];
  // ... weitere Felder basierend auf ContactEnhanced
}

// Zod-Validation
export const ContactCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  // ...
});
```

### **Error Handling & Monitoring**
```typescript
// Standardisierte API-Errors
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string
  ) {
    super(message);
  }
}

// Examples:
// new APIError(400, 'VALIDATION_ERROR', 'Email is required')
// new APIError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests')
// new APIError(404, 'RESOURCE_NOT_FOUND', 'Contact not found')
```

---

## 📊 **Success Metrics & Rollout**

### **KPIs für API-Erfolg:**
- **Adoption:** Anzahl aktiver API-Keys nach 3 Monaten
- **Usage:** Durchschnittliche API-Requests pro Organization  
- **Integration-Erfolg:** % der User die APIs erfolgreich implementieren
- **Performance:** 95% der Requests < 200ms Response-Zeit

### **Rollout-Strategie:**
1. **Alpha (interne Tests):** Eigene Test-Integrationen
2. **Beta (ausgewählte Kunden):** 5-10 PR-Agenturen als Early Adopters
3. **Public Release:** Vollständige Dokumentation + Marketing

### **Support-Ressourcen:**
- **Code-Examples:** GitHub Repository mit Integration-Examples
- **Postman Collection:** Vorkonfigurierte API-Tests
- **Developer Support:** Dedicated Support-Channel für API-Fragen

---

## 💡 **Business Value & ROI**

### **Für CeleroPress:**
- **Competitive Advantage:** API-first Platform differentiation
- **User Retention:** Schwieriger zu wechseln bei tiefer Integration
- **Ecosystem Growth:** Partner-Integrationen erweitern Reichweite  
- **Upselling:** Premium API-Features für Enterprise-Kunden

### **Für Kunden:**
- **Workflow-Effizienz:** Elimination manueller Datenübertragung
- **Data Consistency:** Single Source of Truth für Kontaktdaten  
- **Automation:** Automated Workflows zwischen Systemen
- **Scalability:** Programmatische Verwaltung großer Datenmengen

---

## 🔒 **Security & Compliance**

### **API-Sicherheit:**
- **Authentication:** API-Key + HMAC-Signature für sensitive Operations  
- **Authorization:** Granular Permissions pro API-Key
- **Rate Limiting:** Multiple Layers (per-key, per-endpoint, per-organization)
- **Audit Logging:** Alle API-Calls mit User/Action/Timestamp

### **GDPR Compliance:**
- **Data Minimization:** Nur notwendige Felder in API-Response
- **Right to Deletion:** CASCADE-Delete über API möglich
- **Consent Tracking:** GDPR-Consent-Status in API-Response included
- **Data Export:** GDPR-konforme Datenexporte über API

---

## 📝 **Feature-Dokumentation & Design Patterns**

### **CeleroPress Design System Compliance**
- [ ] **Icons:** Ausschließlich @heroicons/react/24/outline verwenden
- [ ] **API-Status Cards:** Hellgelber Hintergrund (#f1f0e2) für API-Status-Übersichten
- [ ] **No Shadow Effects:** Alle API-Dashboard-Komponenten ohne Shadow-Effekte
- [ ] **CeleroPress Branding:** Vollständiges Rebranding, keine SKAMP-Referenzen

### **Feature-Dokumentation nach Template**
Nach Abschluss der Implementierung wird eine vollständige Feature-Dokumentation erstellt:

**Datei:** `/docs/features/docu_dashboard_admin_api.md`

**Inhalt basierend auf Template:**
```markdown
# Feature-Dokumentation: Admin API Management

## 🎯 Anwendungskontext
**Dieses Feature im Kontext:**
Das API-Management-System ermöglicht PR-Agenturen den nahtlosen Datenaustausch zwischen CeleroPress und externen Systemen wie Salesforce, HubSpot oder individuellen CRM-Lösungen.

## 📋 Feature-Beschreibung
### Hauptfunktionen
1. **API-Key Management** - Sichere Erstellung und Verwaltung von API-Schlüsseln
2. **Interactive API-Dokumentation** - Swagger-ähnliche Live-Dokumentation
3. **Developer Dashboard** - Usage Analytics und Performance-Monitoring
4. **Webhook Configuration** - Event-basierte Integrationen
5. **Rate Limiting Configuration** - Flexible Rate-Limit-Einstellungen

## 🔧 Technische Details
### Komponenten-Struktur
- APIManagementPage (/dashboard/admin/api/page.tsx)
  - APIKeyManager
  - APIDocumentation  
  - UsageAnalytics
  - WebhookManager
  - RateLimitConfig

### API-Endpunkte
[Vollständige API-Dokumentation wie im Plan beschrieben]
```

---

## 🧪 **Comprehensive Testing Strategy**

### **Test-Coverage-Anforderung: 100% Success Rate**

#### **1. Unit Tests (Service Layer)**
```typescript
// src/lib/api/__tests__/api-auth-service.test.ts
describe('API Authentication Service', () => {
  it('should generate valid API keys with proper permissions')
  it('should validate API keys and return organization context')
  it('should enforce rate limits per organization')
  it('should handle expired API keys gracefully')
  it('should log all API key usage for audit trail')
})

// src/lib/api/__tests__/contacts-api-service.test.ts  
describe('Contacts API Service', () => {
  it('should create contact via API with full validation')
  it('should list contacts with pagination and filtering')
  it('should update contact maintaining data integrity')
  it('should delete contact with proper cascade handling')
  it('should handle bulk operations with rollback on errors')
})

// src/lib/api/__tests__/publications-api-service.test.ts
describe('Publications API Service', () => {
  it('should fetch publications with complex filters')
  it('should include related advertisements when requested')
  it('should validate publication data integrity')
  it('should handle large dataset queries efficiently')
})
```

#### **2. Integration Tests (API Endpoints)**
```typescript
// src/app/api/v1/__tests__/contacts.integration.test.ts
describe('Contacts API Integration', () => {
  it('should authenticate with valid API key')
  it('should return 401 for invalid API key')
  it('should enforce rate limits correctly')
  it('should maintain multi-tenancy isolation')
  it('should validate request schema strictly')
  it('should return consistent error responses')
})

// src/app/api/v1/__tests__/webhooks.integration.test.ts
describe('Webhook Integration', () => {
  it('should register webhook with valid signature')
  it('should deliver webhook events reliably')
  it('should handle webhook failures with retry logic')
  it('should validate webhook signatures properly')
})
```

#### **3. E2E API Tests (External Integration)**
```typescript
// src/__tests__/e2e/api-workflow.test.ts
describe('Complete API Workflow', () => {
  it('should complete full contact lifecycle via API')
  it('should sync data bidirectionally with external system')
  it('should handle concurrent API requests safely')
  it('should maintain data consistency during bulk operations')
  it('should track API usage accurately for billing')
})
```

#### **4. Performance Tests**
```typescript
// src/__tests__/performance/api-load.test.ts
describe('API Performance', () => {
  it('should handle 1000 concurrent requests without degradation')
  it('should respond within 200ms for 95% of requests')
  it('should maintain memory usage under load')
  it('should scale pagination effectively for large datasets')
})
```

#### **5. Security Tests**
```typescript
// src/__tests__/security/api-security.test.ts
describe('API Security', () => {
  it('should prevent unauthorized access to other organizations')
  it('should sanitize all input parameters against injection')
  it('should enforce GDPR compliance in API responses')
  it('should audit all API access properly')
  it('should handle malformed requests securely')
})
```

### **Test Infrastructure Requirements**
- [ ] **Mock External Services:** Firestore, Rate Limiting, Webhook Delivery
- [ ] **Test Data Factory:** Realistic test data for all entities
- [ ] **Performance Benchmarks:** Baseline metrics for regression testing  
- [ ] **CI/CD Integration:** All tests must pass before deployment
- [ ] **Test Coverage Reporting:** 100% line coverage for API routes

### **User Acceptance Testing**
```markdown
#### Test 1: API Key Generation & First API Call
1. **Setup:** Navigate to /dashboard/admin/api
2. **Action:** Generate new API key with "read-write" permissions  
3. **Validation:** Make first API call to GET /api/v1/contacts
4. **Success:** Receive valid JSON response with contact data

#### Test 2: External System Integration (Salesforce Simulation)
1. **Setup:** Mock external system making API calls
2. **Action:** Create 50 contacts via bulk API endpoint
3. **Validation:** All contacts appear in CeleroPress UI correctly
4. **Success:** No data loss, proper validation, audit trail

#### Test 3: Rate Limiting & Error Handling
1. **Setup:** API key with 100 requests/hour limit
2. **Action:** Exceed rate limit with rapid API calls
3. **Validation:** Proper 429 responses with retry-after headers
4. **Success:** Service remains stable, limits enforced correctly

#### Test 4: Developer Experience  
1. **Setup:** New developer accessing API documentation
2. **Action:** Follow documentation to make first integration
3. **Validation:** Can complete integration without external help
4. **Success:** Working integration in under 30 minutes
```

---

## 📋 **Documentation Update Requirements**

### **Automatische Dokumentations-Updates**
Nach jeder Phase-Implementierung:

#### **1. Feature Documentation Updates**
- [ ] **`/docs/features/README.md`** - API Feature hinzufügen
- [ ] **`/docs/features/docu_dashboard_admin_api.md`** - Vollständige Feature-Docs
- [ ] **`/docs/README.md`** - API-Sektion in Haupt-Navigation

#### **2. Architecture Documentation**  
- [ ] **`/docs/architecture/adr/0008-public-api.md`** - Architectural Decision Record
- [ ] **`/docs/architecture/ARCHITECTURE.md`** - API-Layer-Diagramm hinzufügen

#### **3. Development Documentation**
- [ ] **`/docs/development/TESTING.md`** - API-Test-Strategien dokumentieren
- [ ] **`/docs/development/SECURITY.md`** - API-Security-Guidelines
- [ ] **`/docs/project/CHANGELOG.md`** - API-Release-Notes

#### **4. User-Facing Documentation**
```markdown
// Neue Dateien erstellen:
/docs/api/
├── quickstart.md              # Getting Started Guide
├── authentication.md         # API-Key Management  
├── endpoints/
│   ├── contacts.md           # Contacts API Reference
│   ├── companies.md          # Companies API Reference  
│   └── publications.md       # Publications API Reference
├── examples/                 # Integration Examples
│   ├── salesforce.md         # Salesforce Connector
│   ├── javascript-sdk.md     # JavaScript Examples
│   └── python-client.md      # Python Examples
└── webhooks.md               # Webhook Configuration
```

### **Documentation Quality Gates**
- [ ] **Jede API-Route:** Vollständige Dokumentation mit Examples
- [ ] **Error Codes:** Alle möglichen Fehlerfälle dokumentiert  
- [ ] **Schema Validation:** Request/Response-Schemas mit Examples
- [ ] **Code Examples:** Funktionsfähige Examples in 3+ Programmiersprachen
- [ ] **User Screenshots:** Aktuelle Screenshots aller UI-Komponenten

---

## 🎯 **Implementation Success Criteria**

### **Definition of Done (Per Phase)**
✅ **Code Quality:**
- [ ] 100% TypeScript coverage ohne any-Types
- [ ] ESLint/Prettier konforme Formatierung
- [ ] CeleroPress Design Patterns eingehalten
- [ ] Alle console.log() Statements entfernt

✅ **Testing:**
- [ ] 100% Test Success Rate (alle Tests bestehen)
- [ ] >95% Code Coverage auf kritischen Pfaden
- [ ] Performance-Tests bestanden (sub-200ms)
- [ ] Security-Tests bestanden (keine Vulnerabilities)

✅ **Documentation:**
- [ ] Feature-Dokumentation nach Template vollständig
- [ ] API-Dokumentation mit Live-Examples
- [ ] User-Test-Anleitungen praktisch validiert
- [ ] Screenshots und Code-Examples aktuell

✅ **User Experience:**
- [ ] Alle User-Tests erfolgreich absolviert
- [ ] API-Dashboard funktional und performant
- [ ] Developer-Onboarding unter 30 Minuten
- [ ] Rate-Limiting und Error-Handling benutzerfreundlich

---

**Created:** 2025-01-10  
**Updated:** 2025-01-10  
**Author:** Claude AI Assistant  
**Status:** ✅ READY FOR IMPLEMENTATION WITH FULL TESTING & DOCUMENTATION

**Erweiterte Next Steps:** 
1. **Phase 1 Start:** API-Authentifizierung mit vollständigen Tests
2. **Design Pattern Review:** Sicherstellung CeleroPress-Konformität  
3. **Test-First Development:** Alle Tests vor Implementation schreiben
4. **Documentation-Driven:** Dokumentation parallel zur Entwicklung
5. **100% Success Gate:** Keine Phase ohne 100% Test-Erfolg abschließen