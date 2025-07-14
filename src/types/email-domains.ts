// src/types/email-domains.ts
import { Timestamp } from 'firebase/firestore';

/**
 * DNS Record Types für Domain-Authentifizierung
 */
export type DnsRecordType = 'CNAME' | 'TXT' | 'MX';

/**
 * Domain-Status während des Verifizierungsprozesses
 */
export type DomainStatus = 'pending' | 'verified' | 'failed';

/**
 * E-Mail-Zustellstatus für Inbox-Tests
 */
export type DeliveryStatus = 'delivered' | 'spam' | 'blocked' | 'pending';

/**
 * Unterstützte E-Mail-Provider für Inbox-Tests
 */
export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'gmx' | 'web' | 'other';

/**
 * DNS-Record Struktur von SendGrid
 */
export interface DnsRecord {
  type: DnsRecordType;
  host: string;
  data: string;
  valid?: boolean;
}

/**
 * Ergebnis einer DNS-Überprüfung
 */
export interface DnsCheckResult {
  recordType: string;
  hostname: string;
  expectedValue: string;
  actualValue?: string;
  isValid: boolean;
  checkedAt: Timestamp;
  error?: string;
}

/**
 * Ergebnis eines Inbox-Zustellbarkeitstests
 */
export interface InboxTestResult {
  id: string;
  testEmail: string;
  provider: EmailProvider;
  deliveryStatus: DeliveryStatus;
  deliveryTime?: number; // Millisekunden
  spamScore?: number; // 0-10
  headers?: Record<string, string>;
  warnings?: string[];
  recommendations?: string[];
  timestamp: Timestamp;
}

/**
 * Hauptstruktur für eine Email-Domain
 */
export interface EmailDomain {
  id?: string;
  domain: string;
  userId: string;
  organizationId: string;
  
  // SendGrid Integration
  sendgridDomainId?: number;
  dnsRecords: DnsRecord[];
  
  // Verifizierungsstatus
  status: DomainStatus;
  verificationAttempts: number;
  lastVerificationAt?: Timestamp;
  verifiedAt?: Timestamp;
  
  // DNS-Überprüfung Details
  dnsCheckResults?: DnsCheckResult[];
  lastDnsCheckAt?: Timestamp;
  
  // Inbox-Test Ergebnisse
  inboxTests?: InboxTestResult[];
  lastInboxTestAt?: Timestamp;
  
  // Provider-Informationen
  detectedProvider?: string; // z.B. 'ionos', 'strato', etc.
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Formular-Daten für neue Domain
 */
export interface EmailDomainFormData {
  domain: string;
  provider?: string;
}

/**
 * API Request für Domain-Erstellung
 */
export interface CreateDomainRequest {
  domain: string;
  provider?: string;
}

/**
 * API Response für Domain-Erstellung
 */
export interface CreateDomainResponse {
  success: boolean;
  domainId: string;
  dnsRecords: DnsRecord[];
  error?: string;
}

/**
 * API Request für DNS-Überprüfung
 */
export interface CheckDnsRequest {
  domainId: string;
}

/**
 * API Response für DNS-Überprüfung
 */
export interface CheckDnsResponse {
  success: boolean;
  results: DnsCheckResult[];
  allValid: boolean;
}

/**
 * API Request für Inbox-Test
 */
export interface InboxTestRequest {
  domainId: string;
  testEmail: string;
  provider: EmailProvider;
}

/**
 * API Response für Inbox-Test
 */
export interface InboxTestResponse {
  success: boolean;
  testId: string;
  messageId: string;
  status: 'sending' | 'sent' | 'failed';
  error?: string;
}

/**
 * API Request für Provider-Erkennung
 */
export interface DetectProviderRequest {
  domain: string;
}

/**
 * API Response für Provider-Erkennung
 */
export interface DetectProviderResponse {
  success: boolean;
  provider: string | null;
}

/**
 * SendGrid Domain Authentication Response
 */
export interface SendGridDomainAuth {
  id: number;
  user_id: number;
  domain: string;
  subdomain?: string;
  username: string;
  ips: string[];
  custom_spf: boolean;
  default: boolean;
  legacy: boolean;
  automatic_security: boolean;
  valid: boolean;
  dns: {
    mail_cname: {
      host: string;
      type: string;
      data: string;
      valid: boolean;
    };
    dkim1: {
      host: string;
      type: string;
      data: string;
      valid: boolean;
    };
    dkim2: {
      host: string;
      type: string;
      data: string;
      valid: boolean;
    };
  };
}

/**
 * Domain-Statistiken für Dashboard
 */
export interface DomainStatistics {
  totalDomains: number;
  verifiedDomains: number;
  pendingDomains: number;
  failedDomains: number;
  averageVerificationTime?: number; // Minuten
  successRate: number; // Prozent
}

/**
 * Webhook Event von SendGrid
 */
export interface SendGridWebhookEvent {
  event: 'delivered' | 'open' | 'click' | 'bounce' | 'spam_report';
  email: string;
  timestamp: number;
  sg_message_id: string;
  sg_event_id: string;
  category?: string[];
  url?: string; // Bei click events
  reason?: string; // Bei bounce events
  type?: string; // Bei bounce events
}

/**
 * Provider-Mapping für DNS-Erkennung
 */
export const DNS_PROVIDER_PATTERNS: Record<string, string[]> = {
  'ionos': ['ionos', 'ui-dns'],
  'strato': ['strato'],
  'godaddy': ['godaddy', 'domaincontrol'],
  'cloudflare': ['cloudflare'],
  'hetzner': ['hetzner', 'your-server.de'],
  'all-inkl': ['all-inkl', 'kasserver'],
  'domainfactory': ['domainfactory'],
  'united-domains': ['united-domains'],
  'namecheap': ['namecheap'],
  'ovh': ['ovh'],
  'hosteurope': ['hosteurope'],
  'mittwald': ['mittwald'],
  'netcup': ['netcup'],
  'aws': ['awsdns'],
  'google': ['googledomains'],
};

/**
 * Email-Provider Labels für UI
 */
export const EMAIL_PROVIDER_LABELS: Record<EmailProvider, string> = {
  'gmail': 'Gmail',
  'outlook': 'Outlook/Hotmail',
  'yahoo': 'Yahoo Mail',
  'gmx': 'GMX',
  'web': 'Web.de',
  'other': 'Andere'
};

/**
 * Status-Farben für Badges
 */
export const DOMAIN_STATUS_COLORS = {
  'pending': 'yellow',
  'verified': 'green',
  'failed': 'red'
} as const;

/**
 * Delivery-Status-Farben für Badges
 */
export const DELIVERY_STATUS_COLORS = {
  'delivered': 'green',
  'spam': 'yellow',
  'blocked': 'red',
  'pending': 'zinc'
} as const;

/**
 * Validation Rules
 */
export const DOMAIN_VALIDATION = {
  domain: {
    pattern: /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i,
    minLength: 4,
    maxLength: 253,
    message: 'Bitte geben Sie eine gültige Domain ein (z.B. ihre-firma.de)'
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
  }
} as const;

/**
 * Konstanten
 */
export const MAX_VERIFICATION_ATTEMPTS = 10;
export const VERIFICATION_RETRY_INTERVAL = 300000; // 5 Minuten in Millisekunden
export const DNS_CHECK_TIMEOUT = 30000; // 30 Sekunden
export const MAX_INBOX_TESTS_PER_DOMAIN = 50;
export const INBOX_TEST_COOLDOWN = 60000; // 1 Minute zwischen Tests

/**
 * Error Codes
 */
export enum DomainErrorCode {
  DOMAIN_ALREADY_EXISTS = 'DOMAIN_ALREADY_EXISTS',
  DOMAIN_NOT_FOUND = 'DOMAIN_NOT_FOUND',
  SENDGRID_API_ERROR = 'SENDGRID_API_ERROR',
  DNS_CHECK_FAILED = 'DNS_CHECK_FAILED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  INBOX_TEST_FAILED = 'INBOX_TEST_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_DOMAIN_FORMAT = 'INVALID_DOMAIN_FORMAT',
  UNAUTHORIZED = 'UNAUTHORIZED'
}