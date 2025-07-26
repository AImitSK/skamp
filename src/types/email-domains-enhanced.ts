// src/types/email-domains-enhanced.ts
import { BaseEntity } from './international';
import { Timestamp } from 'firebase/firestore';

/**
 * DNS Record types for domain verification
 */
export interface DnsRecord {
  type: 'CNAME' | 'TXT' | 'MX';
  host: string;
  data: string;
  valid: boolean;
  priority?: number; // For MX records
}

/**
 * Result of a DNS check operation
 */
export interface DnsCheckResult {
  recordType: 'CNAME' | 'TXT' | 'MX';
  host: string;
  expected: string;
  actual: string | null;
  valid: boolean;
  checkedAt: Timestamp;
  error?: string;
}

/**
 * Result of an inbox delivery test
 */
export interface InboxTestResult {
  id: string;
  testEmail: string;
  sentAt: Timestamp;
  deliveryStatus: 'delivered' | 'bounced' | 'spam' | 'pending' | 'failed';
  deliveredAt?: Timestamp;
  spamScore?: number;
  spamReasons?: string[];
  headers?: Record<string, string>;
  provider?: string; // gmail, outlook, etc.
}

/**
 * Domain status types
 */
export type DomainStatus = 'pending' | 'verified' | 'failed';

/**
 * Domain provider types
 */
export type DomainProvider = 
  | 'namecheap' 
  | 'godaddy' 
  | 'cloudflare' 
  | 'hetzner' 
  | 'strato' 
  | 'united-domains'
  | 'ionos'
  | 'other';

/**
 * Enhanced Email Domain with multi-tenancy support
 */
export interface EmailDomainEnhanced extends BaseEntity {
  // Core Fields
  domain: string;
  subdomain?: string; // Optional subdomain for email sending
  
  // SendGrid Integration
  sendgridDomainId?: number;
  sendgridDomainData?: Record<string, any>; // Raw SendGrid response data
  
  // DNS Records
  dnsRecords: DnsRecord[];
  dnsCheckResults?: DnsCheckResult[];
  lastDnsCheckAt?: Timestamp;
  
  // Status & Verification
  status: DomainStatus;
  verificationAttempts: number;
  lastVerificationAt?: Timestamp;
  verifiedAt?: Timestamp;
  
  // Inbox Testing
  inboxTests?: InboxTestResult[];
  lastInboxTestAt?: Timestamp;
  inboxTestScore?: number; // Average delivery score 0-100
  
  // Provider Information
  provider?: DomainProvider;
  detectedProvider?: string; // Auto-detected provider name
  providerInstructions?: string; // Custom instructions for this provider
  
  // Configuration
  isDefault?: boolean; // Is this the default sending domain?
  allowedSenders?: string[]; // Email addresses allowed to send from this domain
  
  // Usage Statistics
  emailsSent?: number;
  lastEmailSentAt?: Timestamp;
  bounceRate?: number;
  spamRate?: number;
  
  // Additional Metadata
  notes?: string;
  tags?: string[];
  
  // BaseEntity provides:
  // - id: string
  // - organizationId: string
  // - createdBy: string
  // - createdAt: Timestamp
  // - updatedBy?: string
  // - updatedAt?: Timestamp
}

/**
 * Create/Update DTO for Email Domain
 */
export interface CreateEmailDomainDto {
  domain: string;
  subdomain?: string;
  provider?: DomainProvider;
  notes?: string;
  tags?: string[];
}

export interface UpdateEmailDomainDto extends Partial<CreateEmailDomainDto> {
  status?: DomainStatus;
  isDefault?: boolean;
  allowedSenders?: string[];
  dnsRecords?: DnsRecord[];
}

/**
 * Domain verification request
 */
export interface DomainVerificationRequest {
  domainId: string;
  sendgridDomainId: number;
  force?: boolean; // Force verification even if recently checked
}

/**
 * Domain verification response
 */
export interface DomainVerificationResponse {
  success: boolean;
  status: DomainStatus;
  dnsRecords: DnsRecord[];
  message?: string;
  details?: {
    mail_cname?: boolean;
    dkim1?: boolean;
    dkim2?: boolean;
  };
}

/**
 * DNS check request
 */
export interface DnsCheckRequest {
  domainId: string;
  dnsRecords: DnsRecord[];
}

/**
 * DNS check response
 */
export interface DnsCheckResponse {
  success: boolean;
  results: DnsCheckResult[];
  allValid: boolean;
  validCount: number;
  totalCount: number;
}

/**
 * Inbox test request
 */
export interface InboxTestRequest {
  domainId: string;
  testAddresses?: string[]; // Optional specific test addresses
}

/**
 * Inbox test response
 */
export interface InboxTestResponse {
  success: boolean;
  testId: string;
  results?: InboxTestResult[];
  overallScore?: number;
  message?: string;
}

/**
 * Type guards
 */
export function isDomainVerified(domain: EmailDomainEnhanced): boolean {
  return domain.status === 'verified' && domain.verifiedAt !== undefined;
}

export function isDomainPending(domain: EmailDomainEnhanced): boolean {
  return domain.status === 'pending';
}

export function isDomainFailed(domain: EmailDomainEnhanced): boolean {
  return domain.status === 'failed';
}

export function canRetryVerification(domain: EmailDomainEnhanced): boolean {
  if (domain.verificationAttempts >= 10) return false;
  if (!domain.lastVerificationAt) return true;
  
  // Allow retry after 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return domain.lastVerificationAt.toDate() < fiveMinutesAgo;
}

/**
 * Helper functions
 */
export function getDomainDisplayName(domain: EmailDomainEnhanced): string {
  if (domain.subdomain) {
    return `${domain.subdomain}.${domain.domain}`;
  }
  return domain.domain;
}

export function getDomainAge(domain: EmailDomainEnhanced): number {
  if (!domain.createdAt) return 0;
  return Date.now() - domain.createdAt.toDate().getTime();
}

export function isRecentlyVerified(domain: EmailDomainEnhanced): boolean {
  if (!domain.verifiedAt) return false;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return domain.verifiedAt.toDate() > oneDayAgo;
}

/**
 * Status color mapping
 */
export const DOMAIN_STATUS_COLORS_ENHANCED: Record<DomainStatus, string> = {
  pending: 'yellow',
  verified: 'green',
  failed: 'red'
};

/**
 * Provider display names
 */
export const DOMAIN_PROVIDER_NAMES: Record<DomainProvider, string> = {
  namecheap: 'Namecheap',
  godaddy: 'GoDaddy',
  cloudflare: 'Cloudflare',
  hetzner: 'Hetzner',
  strato: 'STRATO',
  'united-domains': 'United Domains',
  ionos: 'IONOS',
  other: 'Andere'
};

/**
 * Default DNS record templates
 */
export const DEFAULT_DNS_RECORDS: Partial<DnsRecord>[] = [
  { type: 'CNAME', valid: false },
  { type: 'CNAME', valid: false }, // DKIM1
  { type: 'CNAME', valid: false }  // DKIM2
];