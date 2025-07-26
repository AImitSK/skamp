# Domain System Migration & Optimization Briefing

## 🚨 Aktueller Status & Probleme

### Hauptproblem: Firebase Permission Denied
Der Fehler zeigt, dass die API Route (`/api/email/domains`) versucht, direkt auf Firebase zuzugreifen, aber keine Authentifizierung hat:

```
[FirebaseError: Missing or insufficient permissions.]
code: 'permission-denied'
```

### Ursachen:
1. **Mischung von Client/Server Code**: `domainService` wird sowohl im Client als auch in API Routes verwendet
2. **Firebase Client SDK in API Routes**: API Routes können nicht auf Client-Auth zugreifen
3. **Fehlende Multi-Tenancy Integration**: Noch keine `organizationId` Unterstützung

## 🏗️ Aktuelle Architektur-Probleme

### 1. Service-Architektur
```
❌ Aktuell: API Route → domainService → Firebase Client SDK ❌
✅ Sollte:  Client → API Route (macht alles) → SendGrid
            Client → domainService → Firebase (für Reads)
```

### 2. Datenmodell
```
❌ Aktuell: email_domains (ohne Multi-Tenancy)
✅ Sollte: email_domains_enhanced (mit BaseEntity)
```

## 📋 Migration Plan (Ohne Admin SDK)

### Phase 1: Architektur-Trennung (Priorität: HOCH)

#### Neue Architektur:
1. **API Routes**: Handling nur für SendGrid-Operationen
2. **Client-Side**: Firebase-Operationen direkt vom Frontend
3. **Hybrid-Ansatz**: API erstellt bei SendGrid, Client speichert in Firebase

### Phase 2: API Routes Refactoring

#### 2.1 Domain Creation API Route (Nur SendGrid)
```typescript
// src/app/api/email/domains/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgClient from '@sendgrid/client';

sgClient.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data = await req.json();
      
      // NUR SendGrid Domain erstellen
      const [sgResponse] = await sgClient.request({
        method: 'POST',
        url: '/v3/whitelabel/domains',
        body: {
          domain: data.domain,
          subdomain: `em${Date.now()}`,
          automatic_security: true,
          custom_spf: false,
          default: false
        }
      });

      const sendgridDomain = sgResponse.body as any;
      
      // DNS Records extrahieren
      const dnsRecords = extractDnsRecords(sendgridDomain);

      // Domain-Daten für Firebase vorbereiten
      const domainData = {
        domain: data.domain.toLowerCase(),
        organizationId: auth.organizationId,
        userId: auth.userId,
        sendgridDomainId: sendgridDomain.id,
        dnsRecords,
        status: 'pending',
        verificationAttempts: 0,
        provider: data.provider,
        detectedProvider: data.provider
      };

      return NextResponse.json({
        success: true,
        sendgridDomainId: sendgridDomain.id,
        dnsRecords,
        domainData // Client speichert das in Firebase
      });

    } catch (error: any) {
      console.error('SendGrid domain creation error:', error);
      
      if (error.response?.body) {
        return NextResponse.json(
          { 
            success: false,
            error: error.response.body.errors?.[0]?.message || 'SendGrid-Fehler'
          },
          { status: error.code || 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to create domain' },
        { status: 500 }
      );
    }
  });
}

function extractDnsRecords(sendgridDomain: any) {
  const records = [];
  
  if (sendgridDomain.dns.mail_cname) {
    records.push({
      type: 'CNAME',
      host: sendgridDomain.dns.mail_cname.host,
      data: sendgridDomain.dns.mail_cname.data,
      valid: sendgridDomain.dns.mail_cname.valid
    });
  }
  
  if (sendgridDomain.dns.dkim1) {
    records.push({
      type: 'CNAME',
      host: sendgridDomain.dns.dkim1.host,
      data: sendgridDomain.dns.dkim1.data,
      valid: sendgridDomain.dns.dkim1.valid
    });
  }
  
  if (sendgridDomain.dns.dkim2) {
    records.push({
      type: 'CNAME',
      host: sendgridDomain.dns.dkim2.host,
      data: sendgridDomain.dns.dkim2.data,
      valid: sendgridDomain.dns.dkim2.valid
    });
  }
  
  return records;
}

// GET - Listet keine Domains, das macht der Client
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use client-side Firebase for listing domains'
  });
}
```

### Phase 3: Client-Side Domain Service Update

#### 3.1 Enhanced Domain Service (Client Only)
```typescript
// src/lib/firebase/domain-service-enhanced.ts
import { BaseService } from './service-base';
import { EmailDomainEnhanced } from '@/types/email-domains-enhanced';
import { 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';

class DomainServiceEnhanced extends BaseService<EmailDomainEnhanced> {
  constructor() {
    super('email_domains_enhanced');
  }

  /**
   * Prüft ob Domain bereits existiert
   */
  async getByDomain(domain: string, organizationId: string): Promise<EmailDomainEnhanced | null> {
    const results = await this.search(organizationId, {
      domain: domain.toLowerCase()
    }, { limit: 1 });
    
    return results[0] || null;
  }

  /**
   * Lädt Domains nach Status
   */
  async getByStatus(organizationId: string, status: string) {
    return this.search(organizationId, { status });
  }

  /**
   * Lädt Domains die verifiziert werden müssen
   */
  async getDomainsForVerification(organizationId: string): Promise<EmailDomainEnhanced[]> {
    const fiveMinutesAgo = Timestamp.fromDate(
      new Date(Date.now() - 5 * 60 * 1000)
    );

    const domains = await this.search(organizationId, {
      status: 'pending',
      verificationAttempts: { operator: '<', value: 10 }
    });

    // Client-seitige Filterung für lastVerificationAt
    return domains.filter(domain => {
      if (!domain.lastVerificationAt) return true;
      return domain.lastVerificationAt < fiveMinutesAgo;
    });
  }

  /**
   * Aktualisiert DNS Check Results
   */
  async updateDnsCheckResults(
    domainId: string, 
    results: any[],
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    await this.update(domainId, {
      dnsCheckResults: results,
      lastDnsCheckAt: Timestamp.now()
    }, context);
  }

  /**
   * Aktualisiert Verifizierungsstatus
   */
  async updateVerificationStatus(
    domainId: string,
    status: string,
    context: { organizationId: string; userId: string },
    incrementAttempts = false
  ): Promise<void> {
    const domain = await this.getById(domainId, context.organizationId);
    if (!domain) throw new Error('Domain not found');

    const updateData: any = {
      status,
      lastVerificationAt: Timestamp.now()
    };

    if (incrementAttempts) {
      updateData.verificationAttempts = (domain.verificationAttempts || 0) + 1;
    }

    if (status === 'verified') {
      updateData.verifiedAt = Timestamp.now();
    }

    await this.update(domainId, updateData, context);
  }
}

export const domainServiceEnhanced = new DomainServiceEnhanced();
```

### Phase 4: Frontend Integration Update

#### 4.1 Update AddDomainModal (Hybrid Approach)
```typescript
// src/components/domains/AddDomainModal.tsx
import { domainServiceEnhanced } from '@/lib/firebase/domain-service-enhanced';
import { useAuth } from '@/context/AuthContext';

const AddDomainModal = ({ ... }) => {
  const { user } = useAuth();
  
  const handleProviderContinue = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const context = {
        organizationId: user!.uid, // Multi-Tenancy Workaround
        userId: user!.uid
      };
      
      // 1. Check if domain exists (Client-Side)
      const existingDomain = await domainServiceEnhanced.getByDomain(
        domain, 
        context.organizationId
      );
      
      if (existingDomain) {
        setError('Diese Domain ist bereits registriert');
        setLoading(false);
        return;
      }
      
      // 2. Create at SendGrid (API Route)
      const response = await apiClient.post('/api/email/domains', { 
        domain: domain.toLowerCase(),
        provider: selectedProvider 
      });
      
      if (!response.success) {
        throw new Error(response.error || 'SendGrid-Fehler');
      }
      
      // 3. Save to Firebase (Client-Side)
      const domainId = await domainServiceEnhanced.create(
        response.domainData,
        context
      );
      
      console.log('✅ Domain saved to Firebase:', domainId);
      
      setDomainId(domainId);
      setDnsRecords(response.dnsRecords);
      setStep('dns');
      
    } catch (error: any) {
      setError(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };
};
```

#### 4.2 Update Domain Page (Pure Client-Side)
```typescript
// src/app/dashboard/settings/domain/page.tsx
import { domainServiceEnhanced } from '@/lib/firebase/domain-service-enhanced';

export default function DomainsPage() {
  const { user } = useAuth();
  const organizationId = user?.uid || '';
  
  const loadDomains = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Direkt von Firebase laden (Client-Side)
      const data = await domainServiceEnhanced.getAll(organizationId);
      setDomains(data);
    } catch (error: any) {
      console.error('Error loading domains:', error);
      setError('Domains konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    try {
      setVerifying(domainId);
      
      const domain = domains.find(d => d.id === domainId);
      if (!domain || !domain.sendgridDomainId) {
        setError('Domain oder SendGrid ID nicht gefunden');
        return;
      }
      
      // API Route nur für SendGrid-Check
      const response = await apiClient.post('/api/email/domains/verify', { 
        domainId,
        sendgridDomainId: domain.sendgridDomainId
      });
      
      if (response.success) {
        // Client-Side Update
        const context = { organizationId, userId: user!.uid };
        
        await domainServiceEnhanced.updateVerificationStatus(
          domainId,
          response.status,
          context
        );
        
        await domainServiceEnhanced.update(domainId, {
          dnsRecords: response.dnsRecords
        }, context);
        
        await loadDomains(); // Reload
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.message || 'Verifizierung fehlgeschlagen');
    } finally {
      setVerifying(null);
    }
  };
};
```

### Phase 5: Types & Models Update

#### 5.1 Enhanced Domain Types
```typescript
// src/types/email-domains-enhanced.ts
import { BaseEntity } from './international';

export interface EmailDomainEnhanced extends BaseEntity {
  // Core Fields
  domain: string;
  
  // SendGrid Integration
  sendgridDomainId?: number;
  dnsRecords: DnsRecord[];
  
  // Status & Verification
  status: 'pending' | 'verified' | 'failed';
  verificationAttempts: number;
  lastVerificationAt?: Timestamp;
  verifiedAt?: Timestamp;
  
  // DNS Check
  dnsCheckResults?: DnsCheckResult[];
  lastDnsCheckAt?: Timestamp;
  
  // Inbox Tests
  inboxTests?: InboxTestResult[];
  lastInboxTestAt?: Timestamp;
  
  // Provider Info
  detectedProvider?: string;
  
  // BaseEntity provides: id, organizationId, createdBy, createdAt, updatedBy, updatedAt
}
```

## 🔧 Firestore Security Rules Update

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Email Domains Enhanced
    match /email_domains_enhanced/{domainId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.organizationId;
      
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.organizationId &&
        request.auth.uid == request.resource.data.createdBy;
      
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.organizationId;
      
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.organizationId;
    }
  }
}
```

## 📁 Finale Dateistruktur

```
src/
├── app/
│   ├── api/
│   │   └── email/
│   │       └── domains/
│   │           ├── route.ts              # SendGrid Create/List
│   │           ├── verify/
│   │           │   └── route.ts          # SendGrid Verify
│   │           ├── check-dns/
│   │           │   └── route.ts          # DNS Check
│   │           └── test-inbox/
│   │               └── route.ts          # Inbox Test
│   └── dashboard/
│       └── settings/
│           └── domain/
│               ├── page.tsx              # Domain Management Page
│               └── components/
│                   ├── AddDomainModal.tsx
│                   ├── DnsStatusCard.tsx
│                   └── InboxTestModal.tsx
├── lib/
│   ├── firebase/
│   │   ├── client-init.ts               # ✅ Client Firebase
│   │   ├── domain-service-enhanced.ts   # ✅ NEW: Enhanced Service
│   │   └── service-base.ts              # ✅ Base Service Class
│   └── api/
│       ├── api-client.ts                # ✅ Authenticated Fetch
│       └── auth-middleware.ts           # ✅ API Auth
└── types/
    ├── email-domains.ts                 # Legacy Types
    ├── email-domains-enhanced.ts        # NEW: Enhanced Types
    └── international.ts                 # Base Types
```

## 🚀 Implementierungs-Reihenfolge

1. **Types erstellen** (`email-domains-enhanced.ts`)
2. **Domain Service Enhanced** implementieren
3. **API Routes** anpassen (nur SendGrid-Operationen)
4. **Frontend Components** updaten (Hybrid-Ansatz)
5. **Firestore Rules** deployen
6. **Migration** der existierenden Daten

## ⚡ Quick Fixes für aktuelles Problem

1. **Sofort**: Entferne Firebase-Calls aus API Routes
2. **AddDomainModal**: Implementiere Hybrid-Ansatz
3. **Domain Page**: Nutze Client-Side Firebase direkt

Diese Architektur umgeht das Admin SDK Problem und nutzt die Stärken beider Ansätze!