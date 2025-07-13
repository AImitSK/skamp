# Implementierungsplan: Versand-Domains verwalten (Erweitert)

## 📋 Übersicht

Implementierung einer Domain-Authentifizierungs-Funktion für SKAMP mit besonderem Fokus auf **Benutzerfreundlichkeit**, **umfassende Anleitungen** und **Inbox-Testing**.

**Ziel:** Domain-Authentifizierung so einfach wie möglich machen, da dies eine kritische Hürde für den Erfolg der Software ist.

## 🎯 Erweiterte Features

1. **Inbox Delivery Test**: Test-E-Mail senden und Zustellbarkeit prüfen
2. **Provider-spezifische Anleitungen**: Step-by-Step Guides für IONOS, Strato, etc.
3. **DNS Record Checker**: Automatische Überprüfung ob Records korrekt gesetzt wurden
4. **Video-Tutorials**: Eingebettete Anleitungen
5. **Support-Chat Integration**: Direkter Support bei Problemen

## 🏗️ Erweiterte Architektur

```mermaid
graph TB
    subgraph "Frontend"
        A[Domain Settings Page]
        B[Add Domain Modal]
        C[DNS Records Display]
        D[Provider Guide Selector]
        E[Inbox Test Component]
        F[DNS Check Status]
    end
    
    subgraph "API Routes"
        G[/api/email/domains]
        H[/api/email/domains/verify]
        I[/api/email/domains/test-inbox]
        J[/api/email/domains/check-dns]
    end
    
    subgraph "Services"
        K[Domain Service]
        L[SendGrid Service]
        M[DNS Checker Service]
        N[Inbox Test Service]
    end
    
    A --> G
    E --> I
    F --> J
    I --> N
    J --> M
```

## 📁 Erweiterte Datenbankstruktur

```typescript
// src/types/email-domains.ts
export interface EmailDomain {
  id?: string;
  domain: string;
  userId: string;
  organizationId: string;
  
  // SendGrid Data
  sendgridDomainId?: number;
  dnsRecords: DnsRecord[];
  
  // Status
  status: 'pending' | 'verified' | 'failed';
  verificationAttempts: number;
  lastVerificationAt?: Timestamp;
  verifiedAt?: Timestamp;
  
  // DNS Check Details
  dnsCheckResults?: DnsCheckResult[];
  lastDnsCheckAt?: Timestamp;
  
  // Inbox Test Results
  inboxTests?: InboxTestResult[];
  lastInboxTestAt?: Timestamp;
  
  // Provider Info
  detectedProvider?: string; // IONOS, Strato, etc.
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DnsCheckResult {
  recordType: string;
  hostname: string;
  expectedValue: string;
  actualValue?: string;
  isValid: boolean;
  checkedAt: Timestamp;
  error?: string;
}

export interface InboxTestResult {
  id: string;
  testEmail: string;
  provider: string; // gmail, outlook, etc.
  deliveryStatus: 'delivered' | 'spam' | 'blocked' | 'pending';
  deliveryTime?: number; // ms
  spamScore?: number;
  headers?: Record<string, string>;
  timestamp: Timestamp;
}
```

## 🛠️ Erweiterte Implementierung

### Phase 1: Backend Services (Tag 1-2)

#### 1.1 DNS Checker Service

```typescript
// src/lib/email/dns-checker-service.ts
import { Resolver } from 'dns';
import { promisify } from 'util';
import { DnsCheckResult } from '@/types/email-domains';

export class DnsCheckerService {
  private resolver: Resolver;
  
  constructor() {
    this.resolver = new Resolver();
    // Verwende öffentliche DNS Server für konsistente Ergebnisse
    this.resolver.setServers(['8.8.8.8', '1.1.1.1']);
  }
  
  async checkCnameRecord(hostname: string, expectedValue: string): Promise<DnsCheckResult> {
    const resolveCname = promisify(this.resolver.resolveCname).bind(this.resolver);
    
    try {
      const values = await resolveCname(hostname);
      const actualValue = values[0];
      
      return {
        recordType: 'CNAME',
        hostname,
        expectedValue,
        actualValue,
        isValid: actualValue === expectedValue,
        checkedAt: new Date() as any,
      };
    } catch (error: any) {
      return {
        recordType: 'CNAME',
        hostname,
        expectedValue,
        isValid: false,
        checkedAt: new Date() as any,
        error: error.code === 'ENOTFOUND' ? 'Record nicht gefunden' : error.message
      };
    }
  }
  
  async checkAllRecords(dnsRecords: Array<{type: string; host: string; data: string}>): Promise<DnsCheckResult[]> {
    const results = await Promise.all(
      dnsRecords.map(record => 
        this.checkCnameRecord(record.host, record.data)
      )
    );
    
    return results;
  }
  
  // Provider Detection
  async detectDnsProvider(domain: string): Promise<string | null> {
    const resolveNs = promisify(this.resolver.resolveNs).bind(this.resolver);
    
    try {
      const nameservers = await resolveNs(domain);
      
      // Provider-Mapping
      const providerPatterns = {
        'ionos': ['ionos', 'ui-dns'],
        'strato': ['strato'],
        'godaddy': ['godaddy', 'domaincontrol'],
        'cloudflare': ['cloudflare'],
        'hetzner': ['hetzner', 'your-server.de'],
        'all-inkl': ['all-inkl', 'kasserver'],
        'domainfactory': ['domainfactory'],
        'united-domains': ['united-domains'],
      };
      
      for (const [provider, patterns] of Object.entries(providerPatterns)) {
        if (nameservers.some(ns => 
          patterns.some(pattern => ns.toLowerCase().includes(pattern))
        )) {
          return provider;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Provider detection failed:', error);
      return null;
    }
  }
}

export const dnsCheckerService = new DnsCheckerService();
```

#### 1.2 Inbox Test Service

```typescript
// src/lib/email/inbox-test-service.ts
import sgMail from '@sendgrid/mail';
import { nanoid } from 'nanoid';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface InboxTestConfig {
  domain: string;
  fromEmail: string;
  toEmail: string;
  userName: string;
}

export class InboxTestService {
  async sendTestEmail(config: InboxTestConfig): Promise<{
    messageId: string;
    testId: string;
  }> {
    const testId = nanoid();
    const timestamp = new Date().toISOString();
    
    const msg = {
      to: config.toEmail,
      from: {
        email: config.fromEmail,
        name: 'SKAMP Delivery Test'
      },
      subject: `[SKAMP Test] Domain-Verifizierung für ${config.domain}`,
      text: this.generateTestEmailText(config, testId, timestamp),
      html: this.generateTestEmailHtml(config, testId, timestamp),
      customArgs: {
        testId,
        domain: config.domain,
        type: 'inbox_test'
      },
      headers: {
        'X-SKAMP-Test-ID': testId,
        'X-SKAMP-Domain': config.domain
      }
    };
    
    const [response] = await sgMail.send(msg);
    
    return {
      messageId: response.headers['x-message-id'] || '',
      testId
    };
  }
  
  private generateTestEmailHtml(config: InboxTestConfig, testId: string, timestamp: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SKAMP Domain Test</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #005fab; margin: 0;">🎉 Herzlichen Glückwunsch!</h1>
        <p style="font-size: 18px; margin: 10px 0;">Ihre Domain-Authentifizierung funktioniert!</p>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
        <h2 style="color: #333; margin-top: 0;">Test-Details</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Domain:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${config.domain}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Absender:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${config.fromEmail}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Test ID:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-family: monospace;">${testId}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0;"><strong>Zeitstempel:</strong></td>
                <td style="padding: 8px 0;">${timestamp}</td>
            </tr>
        </table>
        
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 4px;">
            <p style="margin: 0; color: #2e7d32;">
                <strong>✓ Diese E-Mail wurde erfolgreich zugestellt!</strong><br>
                Ihre Domain ist korrekt konfiguriert und bereit für den Versand von Pressemitteilungen.
            </p>
        </div>
    </div>
    
    <div style="margin-top: 20px; font-size: 14px; color: #666; text-align: center;">
        <p>Diese Test-E-Mail wurde von SKAMP gesendet, um die Domain-Authentifizierung zu überprüfen.</p>
        <p style="margin-top: 10px;">
            <a href="https://app.skamp.de" style="color: #005fab; text-decoration: none;">app.skamp.de</a>
        </p>
    </div>
</body>
</html>`;
  }
  
  private generateTestEmailText(config: InboxTestConfig, testId: string, timestamp: string): string {
    return `
🎉 Herzlichen Glückwunsch!

Ihre Domain-Authentifizierung funktioniert!

Test-Details:
- Domain: ${config.domain}
- Absender: ${config.fromEmail}
- Test ID: ${testId}
- Zeitstempel: ${timestamp}

✓ Diese E-Mail wurde erfolgreich zugestellt!
Ihre Domain ist korrekt konfiguriert und bereit für den Versand von Pressemitteilungen.

---
Diese Test-E-Mail wurde von SKAMP gesendet.
https://app.skamp.de
`;
  }
  
  // Spam-Score Analyse (simuliert)
  analyzeDeliveryQuality(headers: Record<string, string>): {
    spamScore: number;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let spamScore = 0;
    
    // SPF Check
    if (!headers['Authentication-Results']?.includes('spf=pass')) {
      warnings.push('SPF-Check nicht bestanden');
      recommendations.push('Stellen Sie sicher, dass SendGrid in Ihrem SPF-Record enthalten ist');
      spamScore += 2;
    }
    
    // DKIM Check
    if (!headers['Authentication-Results']?.includes('dkim=pass')) {
      warnings.push('DKIM-Signatur fehlt oder ungültig');
      spamScore += 3;
    }
    
    // DMARC Check
    if (!headers['Authentication-Results']?.includes('dmarc=pass')) {
      recommendations.push('Erwägen Sie die Einrichtung eines DMARC-Records für zusätzlichen Schutz');
      spamScore += 1;
    }
    
    return {
      spamScore: Math.min(spamScore, 10),
      warnings,
      recommendations
    };
  }
}

export const inboxTestService = new InboxTestService();
```

#### 1.3 Provider-spezifische Anleitungen

```typescript
// src/lib/domain-providers/provider-guides.ts
export interface ProviderGuide {
  id: string;
  name: string;
  logo?: string;
  supportUrl: string;
  steps: GuideStep[];
  videoUrl?: string;
  commonIssues: CommonIssue[];
}

export interface GuideStep {
  title: string;
  description: string;
  screenshots?: string[];
  warning?: string;
  tip?: string;
}

export interface CommonIssue {
  problem: string;
  solution: string;
}

export const providerGuides: Record<string, ProviderGuide> = {
  ionos: {
    id: 'ionos',
    name: 'IONOS (1&1)',
    logo: '/images/providers/ionos.svg',
    supportUrl: 'https://www.ionos.de/hilfe/domains/dns-einstellungen/',
    videoUrl: 'https://youtube.com/watch?v=xxx', // Einbetten eines Tutorial-Videos
    steps: [
      {
        title: 'Einloggen im IONOS Control-Center',
        description: 'Melden Sie sich unter login.ionos.de mit Ihren Zugangsdaten an.',
        screenshots: ['/images/guides/ionos/step1.png']
      },
      {
        title: 'Domain & SSL → Domains',
        description: 'Klicken Sie im Hauptmenü auf "Domain & SSL" und dann auf "Domains".',
        screenshots: ['/images/guides/ionos/step2.png']
      },
      {
        title: 'Domain auswählen',
        description: 'Klicken Sie auf das Zahnrad-Symbol neben Ihrer Domain und wählen Sie "DNS".',
        screenshots: ['/images/guides/ionos/step3.png'],
        tip: 'Falls Sie mehrere Domains haben, achten Sie darauf, die richtige auszuwählen.'
      },
      {
        title: 'CNAME-Einträge hinzufügen',
        description: 'Klicken Sie auf "Eintrag hinzufügen" und wählen Sie "CNAME" als Typ.',
        screenshots: ['/images/guides/ionos/step4.png']
      },
      {
        title: 'Werte eintragen',
        description: 'Kopieren Sie die Werte aus SKAMP:\n- Hostname: Nur den Teil vor Ihrer Domain\n- Verweist auf: Den kompletten Zielwert',
        screenshots: ['/images/guides/ionos/step5.png'],
        warning: 'IONOS fügt Ihre Domain automatisch hinzu. Wenn der Hostname "em123.ihre-domain.de" ist, tragen Sie nur "em123" ein.'
      },
      {
        title: 'Speichern und warten',
        description: 'Klicken Sie auf "Speichern". Die Änderungen sind meist innerhalb von 5-15 Minuten aktiv.',
        tip: 'Sie können den Status direkt in SKAMP überprüfen.'
      }
    ],
    commonIssues: [
      {
        problem: 'IONOS zeigt "Hostname bereits vorhanden" an',
        solution: 'Löschen Sie den bestehenden Eintrag oder bearbeiten Sie ihn, statt einen neuen anzulegen.'
      },
      {
        problem: 'Die Verifizierung schlägt nach 30 Minuten immer noch fehl',
        solution: 'Prüfen Sie, ob Sie wirklich nur "em123" statt "em123.ihre-domain.de" eingetragen haben.'
      }
    ]
  },
  
  strato: {
    id: 'strato',
    name: 'STRATO',
    logo: '/images/providers/strato.svg',
    supportUrl: 'https://www.strato.de/faq/domains/dns-einstellungen/',
    steps: [
      {
        title: 'Login im STRATO Kunden-Login',
        description: 'Melden Sie sich unter www.strato.de/apps/CustomerService an.',
        screenshots: ['/images/guides/strato/step1.png']
      },
      {
        title: 'Domainverwaltung öffnen',
        description: 'Wählen Sie "Domainverwaltung" aus dem Hauptmenü.',
        screenshots: ['/images/guides/strato/step2.png']
      },
      {
        title: 'Domain-Einstellungen',
        description: 'Klicken Sie bei der gewünschten Domain auf "Einstellungen".',
        screenshots: ['/images/guides/strato/step3.png']
      },
      {
        title: 'DNS-Verwaltung',
        description: 'Wählen Sie "Nameserver- / DNS-Einstellungen" und dann "DNS-Einstellungen bearbeiten".',
        screenshots: ['/images/guides/strato/step4.png']
      },
      {
        title: 'CNAME-Records anlegen',
        description: 'Wählen Sie "CNAME" als Record-Typ und tragen Sie die Werte ein.',
        screenshots: ['/images/guides/strato/step5.png'],
        warning: 'Bei STRATO müssen Sie den kompletten Hostname inklusive Domain eingeben.'
      }
    ],
    commonIssues: [
      {
        problem: 'Die Option "DNS-Einstellungen" ist nicht sichtbar',
        solution: 'Stellen Sie sicher, dass Sie die STRATO-Nameserver verwenden. Bei externen Nameservern müssen Sie die Einträge dort vornehmen.'
      }
    ]
  },
  
  // Weitere Provider...
};

// Helper für unbekannte Provider
export const genericGuide: ProviderGuide = {
  id: 'generic',
  name: 'Allgemeine Anleitung',
  supportUrl: '',
  steps: [
    {
      title: 'DNS-Verwaltung Ihres Providers öffnen',
      description: 'Loggen Sie sich bei Ihrem Domain-Provider ein und suchen Sie nach:\n- DNS-Einstellungen\n- DNS-Verwaltung\n- Nameserver-Einstellungen\n- Zone Editor',
      tip: 'Die DNS-Verwaltung finden Sie meist unter "Domains", "Hosting" oder "Einstellungen".'
    },
    {
      title: 'Neuen CNAME-Eintrag erstellen',
      description: 'Suchen Sie nach einer Option wie:\n- "Eintrag hinzufügen"\n- "Add Record"\n- "Neuer DNS-Eintrag"\n\nWählen Sie als Typ "CNAME".'
    },
    {
      title: 'Werte eintragen',
      description: 'Kopieren Sie die Werte aus SKAMP:\n- Name/Host/Subdomain: Der Hostname\n- Wert/Target/Points to: Das Ziel',
      warning: 'Manche Provider fügen Ihre Domain automatisch hinzu. Wenn unsicher, probieren Sie beide Varianten.'
    },
    {
      title: 'Alle drei Einträge anlegen',
      description: 'Wiederholen Sie den Vorgang für alle drei CNAME-Einträge.',
      tip: 'Die Reihenfolge spielt keine Rolle.'
    },
    {
      title: 'Änderungen speichern',
      description: 'Speichern Sie die Änderungen. Die Aktivierung dauert meist 5-60 Minuten.',
      tip: 'Bei manchen Providern müssen Sie die Änderungen extra "aktivieren" oder "publizieren".'
    }
  ],
  commonIssues: [
    {
      problem: 'Ich finde die DNS-Einstellungen nicht',
      solution: 'Kontaktieren Sie den Support Ihres Providers und fragen Sie nach "CNAME-Einträgen für E-Mail-Authentifizierung".'
    },
    {
      problem: 'Soll ich den Punkt am Ende mit eingeben?',
      solution: 'Ja, wenn Ihr Provider ein Feld für den kompletten Wert hat. Der Punkt kennzeichnet eine absolute Adresse.'
    }
  ]
};
```

### Phase 2: Erweiterte Frontend-Komponenten (Tag 3-4)

#### 2.1 Erweiterte Domain Settings Page

```typescript
// src/app/dashboard/settings/domain/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@/components/table';
import { Badge } from '@/components/badge';
import { Alert } from '@/components/alert';
import { 
  PlusIcon, 
  TrashIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  InformationCircleIcon,
  PlayCircleIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/20/solid';
import { AddDomainModal } from '@/components/domains/AddDomainModal';
import { InboxTestModal } from '@/components/domains/InboxTestModal';
import { DnsStatusCard } from '@/components/domains/DnsStatusCard';
import { HelpSidebar } from '@/components/domains/HelpSidebar';
import { apiClient } from '@/lib/api/api-client';
import { EmailDomain } from '@/types/email-domains';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export default function DomainsPage() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInboxTest, setShowInboxTest] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<EmailDomain | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ... (loading logic bleibt gleich)

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <Heading level={1}>Versand-Domains authentifizieren</Heading>
            <Text className="mt-2 text-gray-600">
              Verbinden Sie Ihre Domain, um E-Mails im Namen Ihrer eigenen Marke zu versenden.
              Dies verbessert die Zustellbarkeit erheblich und schafft Vertrauen bei den Empfängern.
            </Text>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 gap-2">
            <Button plain onClick={() => window.open('/hilfe/domains', '_blank')}>
              <PlayCircleIcon className="w-4 h-4 mr-2" />
              Video-Tutorial
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Neue Domain hinzufügen
            </Button>
          </div>
        </div>

        {/* Info Alert für Erstnutzer */}
        {domains.length === 0 && !loading && (
          <Alert type="info" className="mb-6">
            <InformationCircleIcon className="w-5 h-5" />
            <div>
              <Text className="font-semibold">Warum ist das wichtig?</Text>
              <Text className="text-sm mt-1">
                Ohne eigene Domain werden Ihre E-Mails von einer fremden Adresse versendet, 
                was oft im Spam-Ordner landet. Mit Ihrer eigenen Domain erhöhen Sie die 
                Zustellrate um bis zu 95%.
              </Text>
            </div>
          </Alert>
        )}

        {/* Domains Table mit erweitertem Status */}
        {domains.length > 0 && (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div 
                key={domain.id}
                className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{domain.domain}</h3>
                      {getStatusBadge(domain.status)}
                    </div>
                    
                    <Text className="text-sm text-gray-500 mt-1">
                      Hinzugefügt {formatDistanceToNow(domain.createdAt.toDate(), {
                        addSuffix: true,
                        locale: de
                      })}
                    </Text>

                    {/* DNS Status Details */}
                    {domain.status !== 'verified' && domain.dnsCheckResults && (
                      <DnsStatusCard 
                        results={domain.dnsCheckResults}
                        onRefresh={() => checkDnsStatus(domain.id!)}
                      />
                    )}

                    {/* Inbox Test Results */}
                    {domain.status === 'verified' && domain.inboxTests && domain.inboxTests.length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <Text className="text-sm text-green-800">
                          ✓ Letzter Inbox-Test: {domain.inboxTests[0].deliveryStatus === 'delivered' ? 'Erfolgreich' : 'Fehlgeschlagen'}
                        </Text>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {domain.status === 'verified' ? (
                      <Button
                        plain
                        onClick={() => setShowInboxTest(domain.id!)}
                      >
                        <EnvelopeIcon className="w-4 h-4" />
                        Inbox testen
                      </Button>
                    ) : (
                      <>
                        <Button
                          plain
                          onClick={() => {
                            setSelectedDomain(domain);
                            setShowAddModal(true);
                          }}
                        >
                          <InformationCircleIcon className="w-4 h-4" />
                          DNS-Einträge
                        </Button>
                        <Button
                          plain
                          onClick={() => handleVerify(domain.id!)}
                          disabled={verifying === domain.id}
                        >
                          <ArrowPathIcon 
                            className={`w-4 h-4 ${verifying === domain.id ? 'animate-spin' : ''}`} 
                          />
                          Prüfen
                        </Button>
                      </>
                    )}
                    <Button
                      plain
                      onClick={() => handleDelete(domain.id!)}
                    >
                      <TrashIcon className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {domains.length === 0 && !loading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <EnvelopeIcon className="h-12 w-12 text-gray-400" />
            </div>
            <Text className="text-gray-500 mb-4">
              Sie haben noch keine Domains hinzugefügt.
            </Text>
            <Button onClick={() => setShowAddModal(true)} size="lg">
              <PlusIcon className="w-4 h-4 mr-2" />
              Erste Domain hinzufügen
            </Button>
            <Text className="text-sm text-gray-500 mt-4">
              Keine Sorge, wir führen Sie Schritt für Schritt durch den Prozess.
            </Text>
          </div>
        )}
      </div>

      {/* Help Sidebar */}
      {showHelp && (
        <HelpSidebar 
          onClose={() => setShowHelp(false)}
          currentStep={domains.length === 0 ? 'start' : 'manage'}
        />
      )}

      {/* Modals */}
      <AddDomainModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedDomain(null);
        }}
        onSuccess={() => {
          setShowAddModal(false);
          setSelectedDomain(null);
          loadDomains();
        }}
        existingDomain={selectedDomain}
      />

      {showInboxTest && (
        <InboxTestModal
          domainId={showInboxTest}
          onClose={() => setShowInboxTest(null)}
          onSuccess={() => {
            setShowInboxTest(null);
            loadDomains();
          }}
        />
      )}
    </div>
  );
}
```

#### 2.2 Erweiterte Add Domain Modal mit Provider Guide

```typescript
// src/components/domains/AddDomainModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Select } from '@/components/select';
import { Checkbox } from '@/components/checkbox';
import { Text } from '@/components/text';
import { Field, Label } from '@/components/fieldset';
import { Alert } from '@/components/alert';
import { ProviderGuideView } from './ProviderGuideView';
import { DnsRecordsList } from './DnsRecordsList';
import { 
  ClipboardDocumentIcon, 
  CheckIcon,
  QuestionMarkCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from '@heroicons/react/20/solid';
import { apiClient } from '@/lib/api/api-client';
import { DnsRecord, EmailDomain } from '@/types/email-domains';
import { providerGuides, genericGuide } from '@/lib/domain-providers/provider-guides';

interface AddDomainModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingDomain?: EmailDomain | null;
}

export function AddDomainModal({ 
  open, 
  onClose, 
  onSuccess, 
  existingDomain 
}: AddDomainModalProps) {
  const [step, setStep] = useState<'input' | 'provider' | 'dns' | 'verify'>(
    existingDomain ? 'dns' : 'input'
  );
  const [domain, setDomain] = useState(existingDomain?.domain || '');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>(
    existingDomain?.dnsRecords || []
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provider Detection
  useEffect(() => {
    if (domain && step === 'provider') {
      detectProvider();
    }
  }, [domain, step]);

  const detectProvider = async () => {
    try {
      setDetecting(true);
      const response = await apiClient.post<{provider: string | null}>(
        '/api/email/domains/detect-provider',
        { domain }
      );
      setDetectedProvider(response.provider);
      if (response.provider) {
        setSelectedProvider(response.provider);
      }
    } catch (error) {
      console.error('Provider detection failed:', error);
    } finally {
      setDetecting(false);
    }
  };

  const handleDomainSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (existingDomain) {
        // Bei existierender Domain direkt zu DNS
        setStep('dns');
      } else {
        // Neue Domain - erst Provider auswählen
        setStep('provider');
      }
    } catch (error: any) {
      setError(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderContinue = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // DNS Records von SendGrid generieren
      const response = await apiClient.post<{
        success: boolean;
        domainId: string;
        dnsRecords: DnsRecord[];
      }>('/api/email/domains', { 
        domain,
        provider: selectedProvider 
      });
      
      setDnsRecords(response.dnsRecords);
      setStep('dns');
    } catch (error: any) {
      setError(error.message || 'Domain konnte nicht hinzugefügt werden');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = existingDomain 
      ? ['DNS-Einträge', 'Verifizierung']
      : ['Domain', 'Provider', 'DNS-Einträge', 'Verifizierung'];
    
    const currentStepIndex = existingDomain
      ? step === 'dns' ? 0 : 1
      : ['input', 'provider', 'dns', 'verify'].indexOf(step);

    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((stepName, index) => (
          <div key={index} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
              ${index <= currentStepIndex 
                ? 'bg-[#005fab] text-white' 
                : 'bg-gray-200 text-gray-600'}
            `}>
              {index + 1}
            </div>
            <span className={`ml-2 text-sm ${
              index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {stepName}
            </span>
            {index < steps.length - 1 && (
              <div className={`mx-4 w-16 h-0.5 ${
                index < currentStepIndex ? 'bg-[#005fab]' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogPanel className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogTitle>
          {existingDomain 
            ? `DNS-Einträge für ${domain}`
            : step === 'input' 
              ? 'Domain hinzufügen' 
              : `Domain authentifizieren: ${domain}`
          }
        </DialogTitle>

        {renderStepIndicator()}

        {error && (
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Domain Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <Field>
                <Label>Domain</Label>
                <Input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="z.B. ihre-firma.de"
                  className="mt-2"
                />
                <Text className="mt-2 text-sm text-gray-600">
                  Geben Sie hier nur die Domain ein, nicht die E-Mail-Adresse.
                  Statt `max@ihre-firma.de` geben Sie `ihre-firma.de` ein.
                </Text>
              </Field>

              <Alert type="info">
                <InformationCircleIcon className="w-5 h-5" />
                <div>
                  <Text className="font-semibold">Gut zu wissen:</Text>
                  <Text className="text-sm mt-1">
                    Die Einrichtung dauert normalerweise nur 10-15 Minuten. 
                    Wir führen Sie Schritt für Schritt durch den Prozess.
                  </Text>
                </div>
              </Alert>
            </div>
          )}

          {/* Step 2: Provider Selection */}
          {step === 'provider' && (
            <div className="space-y-4">
              <div>
                <Label>Wo ist Ihre Domain registriert?</Label>
                <Text className="text-sm text-gray-600 mb-3">
                  Wählen Sie Ihren Domain-Provider für eine spezifische Anleitung.
                </Text>
                
                {detecting && (
                  <Alert type="info" className="mb-3">
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <Text>Provider wird automatisch erkannt...</Text>
                  </Alert>
                )}

                {detectedProvider && (
                  <Alert type="success" className="mb-3">
                    <CheckCircleIcon className="w-5 h-5" />
                    <Text>
                      Wir haben erkannt, dass Ihre Domain bei {providerGuides[detectedProvider]?.name || detectedProvider} registriert ist.
                    </Text>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {Object.values(providerGuides).map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-colors
                        ${selectedProvider === provider.id 
                          ? 'border-[#005fab] bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      <div className="font-medium">{provider.name}</div>
                      {provider.logo && (
                        <img 
                          src={provider.logo} 
                          alt={provider.name}
                          className="h-6 mt-2"
                        />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedProvider('other')}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-colors
                      ${selectedProvider === 'other' 
                        ? 'border-[#005fab] bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    <div className="font-medium">Anderer Provider</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Allgemeine Anleitung
                    </div>
                  </button>
                </div>
              </div>

              <Alert type="info">
                <QuestionMarkCircleIcon className="w-5 h-5" />
                <div>
                  <Text className="font-semibold">Nicht sicher?</Text>
                  <Text className="text-sm mt-1">
                    Prüfen Sie Ihre E-Mails nach der Domain-Registrierung oder 
                    schauen Sie in Ihre Rechnungen. Der Provider wird dort genannt.
                  </Text>
                </div>
              </Alert>
            </div>
          )}

          {/* Step 3: DNS Records with Guide */}
          {step === 'dns' && (
            <div className="space-y-6">
              {selectedProvider && selectedProvider !== 'other' ? (
                <ProviderGuideView
                  provider={providerGuides[selectedProvider]}
                  dnsRecords={dnsRecords}
                />
              ) : (
                <>
                  <Text className="text-gray-600">
                    Fast geschafft! Fügen Sie die folgenden DNS-Einträge bei Ihrem Provider hinzu:
                  </Text>
                  
                  <DnsRecordsList records={dnsRecords} />
                  
                  {selectedProvider === 'other' && (
                    <ProviderGuideView
                      provider={genericGuide}
                      dnsRecords={dnsRecords}
                    />
                  )}
                </>
              )}

              <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                <Text className="text-sm text-amber-800">
                  <strong>Tipp:</strong> Machen Sie Screenshots von den DNS-Einträgen, 
                  bevor Sie zu Ihrem Provider wechseln. So haben Sie alle Informationen griffbereit.
                </Text>
              </div>

              <div className="mt-6">
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={confirmed}
                    onChange={setConfirmed}
                    className="mt-1"
                  />
                  <Text className="text-sm">
                    Ich habe die DNS-Einträge bei meinem Provider hinzugefügt 
                    oder werde dies jetzt tun.
                  </Text>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Verification */}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircleIcon className="h-10 w-10 text-green-600" />
                </div>
                <Text className="text-lg font-semibold mb-2">
                  Einrichtung abgeschlossen!
                </Text>
                <Text className="text-gray-600">
                  Die DNS-Einträge wurden gespeichert. Die Verifizierung läuft 
                  automatisch im Hintergrund und dauert meist 5-15 Minuten.
                </Text>
              </div>

              <Alert type="info">
                <InformationCircleIcon className="w-5 h-5" />
                <div>
                  <Text className="font-semibold">Was passiert jetzt?</Text>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• Wir prüfen alle 5 Minuten automatisch den Status</li>
                    <li>• Sie erhalten eine E-Mail, sobald die Domain verifiziert ist</li>
                    <li>• Sie können den Status jederzeit manuell prüfen</li>
                  </ul>
                </div>
              </Alert>
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="mt-6 flex justify-between border-t pt-4">
          <div>
            {step !== 'input' && !existingDomain && (
              <Button 
                plain 
                onClick={() => {
                  if (step === 'provider') setStep('input');
                  if (step === 'dns') setStep('provider');
                  if (step === 'verify') setStep('dns');
                }}
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button plain onClick={onClose}>
              {step === 'verify' ? 'Schließen' : 'Abbrechen'}
            </Button>
            
            {step === 'input' && (
              <Button 
                onClick={handleDomainSubmit} 
                disabled={!domain || loading}
              >
                Weiter
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {step === 'provider' && (
              <Button 
                onClick={handleProviderContinue}
                disabled={!selectedProvider || loading}
              >
                {loading ? 'DNS-Einträge werden generiert...' : 'DNS-Einträge generieren'}
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {step === 'dns' && (
              <Button 
                onClick={() => setStep('verify')}
                disabled={!confirmed}
              >
                Einrichtung abschließen
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {step === 'verify' && (
              <Button onClick={onSuccess}>
                Zur Übersicht
              </Button>
            )}
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
```

#### 2.3 Inbox Test Modal

```typescript
// src/components/domains/InboxTestModal.tsx
"use client";

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Select } from '@/components/select';
import { Text } from '@/components/text';
import { Field, Label } from '@/components/fieldset';
import { Alert } from '@/components/alert';
import { 
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/20/solid';
import { apiClient } from '@/lib/api/api-client';

interface InboxTestModalProps {
  domainId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InboxTestModal({ domainId, onClose, onSuccess }: InboxTestModalProps) {
  const [testEmail, setTestEmail] = useState('');
  const [emailProvider, setEmailProvider] = useState('gmail');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const emailProviders = [
    { value: 'gmail', label: 'Gmail' },
    { value: 'outlook', label: 'Outlook/Hotmail' },
    { value: 'yahoo', label: 'Yahoo Mail' },
    { value: 'gmx', label: 'GMX' },
    { value: 'web', label: 'Web.de' },
    { value: 'other', label: 'Andere' }
  ];

  const handleSendTest = async () => {
    try {
      setSending(true);
      setError(null);
      setResult(null);

      const response = await apiClient.post('/api/email/domains/test-inbox', {
        domainId,
        testEmail,
        provider: emailProvider
      });

      setResult(response);
      
      // Auto-refresh nach 5 Sekunden
      setTimeout(() => {
        checkTestStatus(response.testId);
      }, 5000);
      
    } catch (error: any) {
      setError(error.message || 'Test fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  const checkTestStatus = async (testId: string) => {
    try {
      const status = await apiClient.get(`/api/email/domains/test-status/${testId}`);
      setResult(prev => ({ ...prev, ...status }));
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogPanel className="max-w-lg">
        <DialogTitle>Inbox-Zustellbarkeit testen</DialogTitle>

        <div className="mt-4 space-y-4">
          <Alert type="info">
            <InformationCircleIcon className="w-5 h-5" />
            <div>
              <Text className="font-semibold">So funktioniert der Test:</Text>
              <Text className="text-sm mt-1">
                Wir senden eine Test-E-Mail von Ihrer Domain an die angegebene 
                Adresse und prüfen, ob sie im Posteingang landet.
              </Text>
            </div>
          </Alert>

          <Field>
            <Label>Test-E-Mail-Adresse</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="ihre-email@gmail.com"
              className="mt-2"
            />
            <Text className="mt-2 text-sm text-gray-600">
              Verwenden Sie eine E-Mail-Adresse, auf die Sie Zugriff haben.
            </Text>
          </Field>

          <Field>
            <Label>E-Mail-Provider</Label>
            <Select
              value={emailProvider}
              onChange={(e) => setEmailProvider(e.target.value)}
              className="mt-2"
            >
              {emailProviders.map(provider => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </Select>
            <Text className="mt-2 text-sm text-gray-600">
              Verschiedene Provider haben unterschiedliche Spam-Filter.
            </Text>
          </Field>

          {/* Test Result */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                {result.status === 'sending' && (
                  <>
                    <ClockIcon className="w-5 h-5 text-blue-600 animate-pulse" />
                    <div>
                      <Text className="font-semibold">E-Mail wird gesendet...</Text>
                      <Text className="text-sm text-gray-600 mt-1">
                        Test-ID: {result.testId}
                      </Text>
                    </div>
                  </>
                )}
                
                {result.deliveryStatus === 'delivered' && (
                  <>
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <Text className="font-semibold text-green-800">
                        E-Mail erfolgreich zugestellt!
                      </Text>
                      <Text className="text-sm text-gray-600 mt-1">
                        Zustellzeit: {result.deliveryTime}ms
                      </Text>
                      {result.spamScore !== undefined && (
                        <Text className="text-sm text-gray-600">
                          Spam-Score: {result.spamScore}/10 
                          {result.spamScore <= 3 && ' (Sehr gut)'}
                        </Text>
                      )}
                    </div>
                  </>
                )}
                
                {result.deliveryStatus === 'spam' && (
                  <>
                    <XCircleIcon className="w-5 h-5 text-amber-600" />
                    <div>
                      <Text className="font-semibold text-amber-800">
                        E-Mail im Spam-Ordner gelandet
                      </Text>
                      <Text className="text-sm text-gray-600 mt-1">
                        Empfehlungen:
                      </Text>
                      <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                        {result.recommendations?.map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <Alert type="error">
              {error}
            </Alert>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button plain onClick={onClose}>
            Schließen
          </Button>
          <Button 
            onClick={handleSendTest}
            disabled={!testEmail || sending}
          >
            {sending ? (
              <>
                <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                Sende Test...
              </>
            ) : (
              <>
                <EnvelopeIcon className="w-4 h-4 mr-2" />
                Test senden
              </>
            )}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
```

#### 2.4 Help Sidebar Component

```typescript
// src/components/domains/HelpSidebar.tsx
"use client";

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  QuestionMarkCircleIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/20/solid';
import { Text } from '@/components/text';
import { Button } from '@/components/button';

interface HelpSidebarProps {
  onClose: () => void;
  currentStep: 'start' | 'manage' | 'trouble';
}

export function HelpSidebar({ onClose, currentStep }: HelpSidebarProps) {
  const helpContent = {
    start: {
      title: 'Erste Schritte',
      items: [
        {
          icon: PlayCircleIcon,
          title: '5-Minuten Video-Tutorial',
          description: 'Sehen Sie, wie einfach die Einrichtung ist',
          action: () => window.open('/tutorials/domain-setup', '_blank')
        },
        {
          icon: DocumentTextIcon,
          title: 'Warum eigene Domain?',
          description: 'Erfahren Sie, warum dies wichtig ist',
          action: () => window.open('/docs/why-domain', '_blank')
        },
        {
          icon: ChatBubbleLeftRightIcon,
          title: 'Live-Support',
          description: 'Wir helfen Ihnen bei der Einrichtung',
          action: () => window.open('/support/chat', '_blank')
        }
      ]
    },
    manage: {
      title: 'Domain verwalten',
      items: [
        {
          icon: QuestionMarkCircleIcon,
          title: 'Häufige Probleme',
          description: 'Lösungen für typische Fehler',
          action: () => window.open('/docs/troubleshooting', '_blank')
        },
        {
          icon: DocumentTextIcon,
          title: 'Best Practices',
          description: 'Tipps für optimale Zustellbarkeit',
          action: () => window.open('/docs/best-practices', '_blank')
        }
      ]
    },
    trouble: {
      title: 'Problembehebung',
      items: [
        {
          icon: ChatBubbleLeftRightIcon,
          title: 'Support kontaktieren',
          description: 'Direkter Kontakt zu unserem Team',
          action: () => window.open('/support/ticket', '_blank')
        }
      ]
    }
  };

  const content = helpContent[currentStep];

  return (
    <div className="w-80 bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{content.title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        {content.items.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-[#005fab] hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <item.icon className="h-5 w-5 text-gray-400 group-hover:text-[#005fab] mt-0.5" />
              <div className="flex-1">
                <Text className="font-medium text-sm">{item.title}</Text>
                <Text className="text-xs text-gray-600 mt-0.5">
                  {item.description}
                </Text>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded-lg">
        <Text className="text-sm text-blue-800">
          <strong>Tipp:</strong> Die meisten Probleme entstehen durch Tippfehler 
          in den DNS-Einträgen. Prüfen Sie jeden Buchstaben genau!
        </Text>
      </div>
    </div>
  );
}
```

### Phase 3: API Routes für erweiterte Features (Tag 5)

#### 3.1 DNS Check API

```typescript
// src/app/api/email/domains/check-dns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import { dnsCheckerService } from '@/lib/email/dns-checker-service';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { domainId } = await req.json();
      
      // Domain laden
      const domain = await domainService.getById(domainId);
      if (!domain || domain.organizationId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Domain not found' },
          { status: 404 }
        );
      }

      // DNS Records prüfen
      const checkResults = await dnsCheckerService.checkAllRecords(
        domain.dnsRecords
      );

      // Ergebnisse speichern
      await domainService.update(domainId, {
        dnsCheckResults: checkResults,
        lastDnsCheckAt: new Date()
      });

      // Wenn alle Records valid sind, Verifizierung triggern
      const allValid = checkResults.every(r => r.isValid);
      if (allValid) {
        // Trigger SendGrid verification
        // ... (verification logic)
      }

      return NextResponse.json({
        success: true,
        results: checkResults,
        allValid
      });

    } catch (error: any) {
      console.error('DNS check error:', error);
      return NextResponse.json(
        { error: 'DNS check failed' },
        { status: 500 }
      );
    }
  });
}
```

#### 3.2 Inbox Test API

```typescript
// src/app/api/email/domains/test-inbox/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from

#### 3.2 Inbox Test API (Fortsetzung)

```typescript
// src/app/api/email/domains/test-inbox/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import { inboxTestService } from '@/lib/email/inbox-test-service';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { domainId, testEmail, provider } = await req.json();
      
      // Domain laden und prüfen
      const domain = await domainService.getById(domainId);
      if (!domain || domain.organizationId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Domain not found' },
          { status: 404 }
        );
      }

      if (domain.status !== 'verified') {
        return NextResponse.json(
          { error: 'Domain must be verified before testing' },
          { status: 400 }
        );
      }

      // Test-Email senden
      const { messageId, testId } = await inboxTestService.sendTestEmail({
        domain: domain.domain,
        fromEmail: `test@${domain.domain}`,
        toEmail: testEmail,
        userName: auth.userId
      });

      // Test-Ergebnis initial speichern
      const testResult = {
        id: testId,
        testEmail,
        provider,
        deliveryStatus: 'pending' as const,
        timestamp: new Date()
      };

      await domainService.update(domainId, {
        inboxTests: [...(domain.inboxTests || []), testResult],
        lastInboxTestAt: new Date()
      });

      return NextResponse.json({
        success: true,
        testId,
        messageId,
        status: 'sending'
      });

    } catch (error: any) {
      console.error('Inbox test error:', error);
      return NextResponse.json(
        { error: 'Inbox test failed' },
        { status: 500 }
      );
    }
  });
}
```

#### 3.3 Provider Detection API

```typescript
// src/app/api/email/domains/detect-provider/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth-middleware';
import { dnsCheckerService } from '@/lib/email/dns-checker-service';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { domain } = await req.json();
      
      if (!domain) {
        return NextResponse.json(
          { error: 'Domain required' },
          { status: 400 }
        );
      }

      const provider = await dnsCheckerService.detectDnsProvider(domain);

      return NextResponse.json({
        success: true,
        provider
      });

    } catch (error: any) {
      console.error('Provider detection error:', error);
      return NextResponse.json({
        success: true,
        provider: null // Kein Fehler werfen, nur null zurückgeben
      });
    }
  });
}
```

### Phase 4: Komponenten für bessere UX (Tag 6)

#### 4.1 DNS Status Card Component

```typescript
// src/components/domains/DnsStatusCard.tsx
"use client";

import { useState } from 'react';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  InformationCircleIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/20/solid';
import { DnsCheckResult } from '@/types/email-domains';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface DnsStatusCardProps {
  results: DnsCheckResult[];
  onRefresh: () => void;
}

export function DnsStatusCard({ results, onRefresh }: DnsStatusCardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const validCount = results.filter(r => r.isValid).length;
  const totalCount = results.length;
  const allValid = validCount === totalCount;

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Text className="font-medium">DNS-Status</Text>
          <Badge color={allValid ? 'green' : validCount > 0 ? 'yellow' : 'red'}>
            {validCount}/{totalCount} konfiguriert
          </Badge>
        </div>
        <Button
          plain
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Prüfen
        </Button>
      </div>

      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded border ${
              result.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {result.isValid ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Text className="font-mono text-sm">{result.hostname}</Text>
                  <Badge size="xs" color={result.isValid ? 'green' : 'red'}>
                    {result.recordType}
                  </Badge>
                </div>
                
                {!result.isValid && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Text className="text-xs text-gray-600">Erwartet:</Text>
                      <code className="text-xs bg-white px-2 py-0.5 rounded">
                        {result.expectedValue}
                      </code>
                      <button
                        onClick={() => handleCopy(result.expectedValue, index)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {copiedIndex === index ? (
                          <CheckCircleIcon className="w-3 h-3 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    
                    {result.actualValue && (
                      <div className="flex items-center gap-2">
                        <Text className="text-xs text-gray-600">Gefunden:</Text>
                        <code className="text-xs bg-white px-2 py-0.5 rounded text-red-600">
                          {result.actualValue}
                        </code>
                      </div>
                    )}
                    
                    {result.error && (
                      <Text className="text-xs text-red-600 mt-1">
                        {result.error}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!allValid && (
        <div className="mt-3 p-3 bg-amber-50 rounded border border-amber-200">
          <div className="flex gap-2">
            <InformationCircleIcon className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <Text className="text-sm text-amber-800 font-medium">
                DNS-Einträge noch nicht vollständig
              </Text>
              <Text className="text-xs text-amber-700 mt-1">
                Es kann bis zu 48 Stunden dauern, bis DNS-Änderungen weltweit 
                verbreitet sind. Normalerweise sind sie jedoch innerhalb von 
                5-15 Minuten aktiv.
              </Text>
            </div>
          </div>
        </div>
      )}

      {results[0]?.checkedAt && (
        <Text className="text-xs text-gray-500 mt-3">
          Zuletzt geprüft {formatDistanceToNow(results[0].checkedAt, {
            addSuffix: true,
            locale: de
          })}
        </Text>
      )}
    </div>
  );
}
```

#### 4.2 Provider Guide View Component

```typescript
// src/components/domains/ProviderGuideView.tsx
"use client";

import { useState } from 'react';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlayCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  DocumentTextIcon
} from '@heroicons/react/20/solid';
import { ProviderGuide } from '@/lib/domain-providers/provider-guides';
import { DnsRecord } from '@/types/email-domains';
import { DnsRecordsList } from './DnsRecordsList';

interface ProviderGuideViewProps {
  provider: ProviderGuide;
  dnsRecords: DnsRecord[];
}

export function ProviderGuideView({ provider, dnsRecords }: ProviderGuideViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  const step = provider.steps[currentStep];

  return (
    <div className="space-y-6">
      {/* Provider Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {provider.logo && (
            <img 
              src={provider.logo} 
              alt={provider.name}
              className="h-8"
            />
          )}
          <h3 className="text-lg font-semibold">
            Anleitung für {provider.name}
          </h3>
        </div>
        
        {provider.videoUrl && (
          <Button
            plain
            size="sm"
            onClick={() => setShowVideo(!showVideo)}
          >
            <PlayCircleIcon className="w-4 h-4 mr-1" />
            Video-Tutorial
          </Button>
        )}
      </div>

      {/* Video Embed */}
      {showVideo && provider.videoUrl && (
        <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
          <iframe
            src={provider.videoUrl}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      )}

      {/* DNS Records */}
      <div>
        <Text className="font-medium mb-3">Diese Einträge benötigen Sie:</Text>
        <DnsRecordsList records={dnsRecords} compact />
      </div>

      {/* Step Navigation */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <Text className="text-sm text-gray-600">
            Schritt {currentStep + 1} von {provider.steps.length}
          </Text>
          <div className="flex gap-1">
            {provider.steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-[#005fab]' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current Step */}
        <div className="space-y-3">
          <h4 className="font-medium">{step.title}</h4>
          
          <Text className="text-sm whitespace-pre-line">
            {step.description}
          </Text>

          {step.screenshots && step.screenshots.length > 0 && (
            <div className="mt-3">
              <img
                src={step.screenshots[0]}
                alt={step.title}
                className="rounded border border-gray-200 max-w-full"
              />
            </div>
          )}

          {step.warning && (
            <div className="flex gap-2 p-3 bg-amber-50 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
              <Text className="text-sm text-amber-800">{step.warning}</Text>
            </div>
          )}

          {step.tip && (
            <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
              <LightBulbIcon className="w-5 h-5 text-blue-600 shrink-0" />
              <Text className="text-sm text-blue-800">{step.tip}</Text>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-4">
          <Button
            plain
            size="sm"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Zurück
          </Button>
          <Button
            plain
            size="sm"
            onClick={() => setCurrentStep(Math.min(provider.steps.length - 1, currentStep + 1))}
            disabled={currentStep === provider.steps.length - 1}
          >
            Weiter
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Common Issues */}
      {provider.commonIssues.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-gray-400" />
            Häufige Probleme & Lösungen
          </h4>
          <div className="space-y-3">
            {provider.commonIssues.map((issue, index) => (
              <details key={index} className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-gray-200 group-open:bg-[#005fab] text-gray-600 group-open:text-white flex items-center justify-center text-xs font-medium transition-colors">
                      ?
                    </div>
                    <Text className="font-medium">{issue.problem}</Text>
                  </div>
                </summary>
                <div className="mt-2 ml-7 p-3 bg-gray-50 rounded text-sm">
                  {issue.solution}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Support Link */}
      {provider.supportUrl && (
        <div className="text-center pt-4 border-t">
          <Text className="text-sm text-gray-600 mb-2">
            Benötigen Sie weitere Hilfe?
          </Text>
          <Button
            plain
            size="sm"
            onClick={() => window.open(provider.supportUrl, '_blank')}
          >
            {provider.name} Support-Artikel öffnen
          </Button>
        </div>
      )}
    </div>
  );
}
```

#### 4.3 DNS Records List Component

```typescript
// src/components/domains/DnsRecordsList.tsx
"use client";

import { useState } from 'react';
import { Text } from '@/components/text';
import { 
  ClipboardDocumentIcon, 
  CheckIcon,
  InformationCircleIcon 
} from '@heroicons/react/20/solid';
import { DnsRecord } from '@/types/email-domains';

interface DnsRecordsListProps {
  records: DnsRecord[];
  compact?: boolean;
}

export function DnsRecordsList({ records, compact = false }: DnsRecordsListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyAll = async () => {
    const allRecords = records.map(r => 
      `${r.type}\t${r.host}\t${r.data}`
    ).join('\n');
    
    try {
      await navigator.clipboard.writeText(allRecords);
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <button
            onClick={handleCopyAll}
            className="text-sm text-[#005fab] hover:text-[#004a8c] flex items-center gap-1"
          >
            {copiedIndex === -1 ? (
              <CheckIcon className="w-4 h-4 text-green-500" />
            ) : (
              <ClipboardDocumentIcon className="w-4 h-4" />
            )}
            Alle kopieren
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          {records.map((record, index) => (
            <div key={index} className="font-mono text-xs">
              <span className="text-gray-500">{record.type}:</span>{' '}
              <span className="text-gray-700">{record.host}</span>{' → '}
              <span className="text-gray-900">{record.data}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Text className="text-sm text-gray-600">
          Kopieren Sie diese Werte in Ihre DNS-Verwaltung:
        </Text>
        <button
          onClick={handleCopyAll}
          className="text-sm text-[#005fab] hover:text-[#004a8c] flex items-center gap-1"
        >
          {copiedIndex === -1 ? (
            <CheckIcon className="w-4 h-4 text-green-500" />
          ) : (
            <ClipboardDocumentIcon className="w-4 h-4" />
          )}
          Alle kopieren
        </button>
      </div>

      <div className="space-y-3">
        {records.map((record, index) => (
          <div 
            key={index}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  Typ
                </Text>
                <Text className="font-medium">{record.type}</Text>
              </div>
              
              <div>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  Hostname (Name)
                </Text>
                <div className="flex items-center gap-2">
                  <Text className="font-mono text-sm break-all">
                    {record.host}
                  </Text>
                  <button
                    onClick={() => handleCopy(record.host, index * 2)}
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    {copiedIndex === index * 2 ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  Wert (Ziel)
                </Text>
                <div className="flex items-center gap-2">
                  <Text className="font-mono text-sm break-all">
                    {record.data}
                  </Text>
                  <button
                    onClick={() => handleCopy(record.data, index * 2 + 1)}
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    {copiedIndex === index * 2 + 1 ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
        <Text className="text-sm text-blue-800">
          <strong>Wichtig:</strong> Manche Provider fügen Ihre Domain automatisch 
          zum Hostname hinzu. Wenn Ihr Provider nach "Subdomain" fragt, geben Sie 
          nur den Teil vor Ihrer Domain ein.
        </Text>
      </div>
    </div>
  );
}
```

## 🧪 Erweiterte Testing Checklist

### Usability Tests
- [ ] Nicht-technische Nutzer können Domain einrichten
- [ ] Provider-Guides sind verständlich
- [ ] DNS-Status ist klar erkennbar
- [ ] Fehler werden verständlich erklärt

### Inbox Tests
- [ ] Test-Emails kommen bei Gmail an
- [ ] Test-Emails kommen bei Outlook an
- [ ] Spam-Score wird korrekt berechnet
- [ ] Empfehlungen sind hilfreich

### Provider-spezifische Tests
- [ ] IONOS Guide funktioniert
- [ ] Strato Guide funktioniert
- [ ] All-Inkl Guide funktioniert
- [ ] Generic Guide deckt Edge Cases ab

## 📊 Erfolgsmetriken

### Zu tracken
- **Setup-Erfolgsrate**: Wie viele Nutzer schaffen die Einrichtung?
- **Zeit bis Verifizierung**: Durchschnittliche Dauer
- **Support-Anfragen**: Reduzierung durch bessere Guides
- **Inbox-Test Erfolgsrate**: Prozent der erfolgreichen Tests
- **Provider-Verteilung**: Welche Provider nutzen User?

### KPIs
- 90%+ Setup-Erfolgsrate (Ziel)
- < 30 Min durchschnittliche Setup-Zeit
- < 5% Support-Anfragen zu Domains
- 95%+ Inbox-Delivery-Rate

## 🎯 Kritische Erfolgsfaktoren

1. **Einfachheit**: Jeder Schritt muss kristallklar sein
2. **Fehlertoleranz**: Häufige Fehler abfangen und erklären
3. **Visuelle Hilfen**: Screenshots für jeden Provider
4. **Proaktive Unterstützung**: Probleme vorhersehen
5. **Schnelles Feedback**: DNS-Status in Echtzeit

---

**Geschätzte Implementierungszeit**: 6 Tage
- Tag 1-2: Erweiterte Backend Services
- Tag 3-4: Frontend mit allen UX-Verbesserungen
- Tag 5: API Routes und Integrationen
- Tag 6: Testing und Provider-Guides

**Priorität**: SEHR HOCH - Dies ist ein kritischer Erfolgsfaktor für die gesamte Anwendung!