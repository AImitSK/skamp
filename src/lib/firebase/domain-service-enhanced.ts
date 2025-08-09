// src/lib/firebase/domain-service-enhanced.ts
import { BaseService } from './service-base';
import { 
  EmailDomainEnhanced, 
  DnsCheckResult, 
  InboxTestResult,
  DomainStatus,
  CreateEmailDomainDto,
  UpdateEmailDomainDto,
  canRetryVerification
} from '@/types/email-domains-enhanced';
import { 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  QueryConstraint,
  DocumentData,
  FieldValue,
  increment
} from 'firebase/firestore';

/**
 * Enhanced Domain Service with multi-tenancy support
 * Client-side only - uses Firebase Auth from the browser
 */
class DomainServiceEnhanced extends BaseService<EmailDomainEnhanced> {
  constructor() {
    super('email_domains_enhanced');
  }

  /**
   * Convert Firestore document to EmailDomainEnhanced
   */
  protected toEntity(doc: DocumentData): EmailDomainEnhanced {
    return {
      id: doc.id,
      ...doc,
      // Ensure all required fields have defaults
      dnsRecords: doc.dnsRecords || [],
      status: doc.status || 'pending',
      verificationAttempts: doc.verificationAttempts || 0,
      // Convert Firestore timestamps
      createdAt: doc.createdAt || Timestamp.now(),
      updatedAt: doc.updatedAt,
      lastVerificationAt: doc.lastVerificationAt,
      verifiedAt: doc.verifiedAt,
      lastDnsCheckAt: doc.lastDnsCheckAt,
      lastInboxTestAt: doc.lastInboxTestAt,
      lastEmailSentAt: doc.lastEmailSentAt
    } as EmailDomainEnhanced;
  }

  /**
   * Check if a domain already exists for the organization
   */
  async getByDomain(domain: string, organizationId: string): Promise<EmailDomainEnhanced | null> {
    try {
      const results = await this.search(organizationId, {
        domain: domain.toLowerCase()
      }, { limit: 1 });
      
      return results[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all domains by status
   */
  async getByStatus(
    organizationId: string, 
    status: DomainStatus
  ): Promise<EmailDomainEnhanced[]> {
    return this.search(organizationId, { status });
  }

  /**
   * Get domains that need verification
   * Returns domains that are pending and haven't been checked recently
   */
  async getDomainsForVerification(organizationId: string): Promise<EmailDomainEnhanced[]> {
    try {
      // Get all pending domains
      const pendingDomains = await this.getByStatus(organizationId, 'pending');
      
      // Filter domains that can be retried
      return pendingDomains.filter(domain => canRetryVerification(domain));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get the default sending domain
   */
  async getDefaultDomain(organizationId: string): Promise<EmailDomainEnhanced | null> {
    try {
      const results = await this.search(organizationId, {
        isDefault: true,
        status: 'verified'
      }, { limit: 1 });
      
      return results[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get verified domains
   */
  async getVerifiedDomains(organizationId: string): Promise<EmailDomainEnhanced[]> {
    return this.getByStatus(organizationId, 'verified');
  }

  /**
   * Update DNS check results
   */
  async updateDnsCheckResults(
    domainId: string,
    results: DnsCheckResult[],
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    await this.update(domainId, {
      dnsCheckResults: results,
      lastDnsCheckAt: Timestamp.now()
    }, context);
  }

  /**
   * Update verification status with automatic attempt tracking
   */
  async updateVerificationStatus(
    domainId: string,
    status: DomainStatus,
    context: { organizationId: string; userId: string },
    incrementAttempts = false
  ): Promise<void> {
    const updateData: any = {
      status,
      lastVerificationAt: Timestamp.now()
    };

    if (incrementAttempts) {
      // Note: increment() is not available in UpdateData type, so we need to fetch and update
      const domain = await this.getById(domainId, context.organizationId);
      if (domain) {
        updateData.verificationAttempts = (domain.verificationAttempts || 0) + 1;
      }
    }

    if (status === 'verified') {
      updateData.verifiedAt = Timestamp.now();
      updateData.verificationAttempts = 0; // Reset attempts on success
    }

    await this.update(domainId, updateData, context);
  }

  /**
   * Update DNS records from SendGrid
   */
  async updateDnsRecords(
    domainId: string,
    dnsRecords: any[],
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    await this.update(domainId, {
      dnsRecords
    }, context);
  }

  /**
   * Add inbox test result
   */
  async addInboxTestResult(
    domainId: string,
    testResult: InboxTestResult,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const domain = await this.getById(domainId, context.organizationId);
    if (!domain) throw new Error('Domain not found');

    const inboxTests = domain.inboxTests || [];
    inboxTests.unshift(testResult); // Add to beginning
    
    // Keep only last 10 tests
    if (inboxTests.length > 10) {
      inboxTests.splice(10);
    }

    // Calculate average score
    const deliveredTests = inboxTests.filter(t => t.deliveryStatus === 'delivered');
    const inboxTestScore = deliveredTests.length > 0 
      ? Math.round((deliveredTests.length / inboxTests.length) * 100)
      : 0;

    await this.update(domainId, {
      inboxTests,
      inboxTestScore,
      lastInboxTestAt: Timestamp.now()
    }, context);
  }

  /**
   * Set domain as default
   */
  async setAsDefault(
    domainId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    // First, unset any existing default
    const currentDefault = await this.getDefaultDomain(context.organizationId);
    if (currentDefault && currentDefault.id && currentDefault.id !== domainId) {
      await this.update(currentDefault.id, {
        isDefault: false
      }, context);
    }

    // Set new default
    await this.update(domainId, {
      isDefault: true
    }, context);
  }

  /**
   * Update usage statistics
   */
  async updateUsageStats(
    domainId: string,
    stats: {
      emailsSent?: number;
      bounceRate?: number;
      spamRate?: number;
    },
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const updateData: any = {};
    
    if (stats.emailsSent !== undefined) {
      updateData.emailsSent = stats.emailsSent;
      updateData.lastEmailSentAt = Timestamp.now();
    }
    
    if (stats.bounceRate !== undefined) {
      updateData.bounceRate = stats.bounceRate;
    }
    
    if (stats.spamRate !== undefined) {
      updateData.spamRate = stats.spamRate;
    }

    await this.update(domainId, updateData, context);
  }

  /**
   * Increment emails sent counter
   */
  async incrementEmailsSent(
    domainId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const domain = await this.getById(domainId, context.organizationId);
    if (!domain) throw new Error('Domain not found');

    await this.update(domainId, {
      emailsSent: (domain.emailsSent || 0) + 1,
      lastEmailSentAt: Timestamp.now()
    }, context);
  }

  /**
   * Search domains by allowed sender email
   */
  async getByAllowedSender(
    email: string,
    organizationId: string
  ): Promise<EmailDomainEnhanced[]> {
    try {
      // Note: Firestore doesn't support array-contains with other conditions well,
      // so we need to fetch all domains and filter client-side
      const allDomains = await this.getVerifiedDomains(organizationId);
      
      return allDomains.filter(domain => 
        domain.allowedSenders?.includes(email.toLowerCase())
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Update allowed senders list
   */
  async updateAllowedSenders(
    domainId: string,
    allowedSenders: string[],
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    // Normalize email addresses to lowercase
    const normalizedSenders = allowedSenders.map(email => email.toLowerCase());
    
    await this.update(domainId, {
      allowedSenders: normalizedSenders
    }, context);
  }

  /**
   * Create a new domain with validation
   */
  async createDomain(
    data: CreateEmailDomainDto & { 
      sendgridDomainId?: number;
      sendgridDomainData?: any;
      dnsRecords?: any[];
    },
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    // Check if domain already exists
    const existing = await this.getByDomain(data.domain, context.organizationId);
    if (existing) {
      throw new Error('Domain already exists');
    }

    // Prepare domain data with all required fields
    const domainData: Omit<EmailDomainEnhanced, 'id' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'> = {
      domain: data.domain.toLowerCase(),
      organizationId: context.organizationId,
      subdomain: data.subdomain || undefined,
      provider: data.provider || undefined,
      notes: data.notes || undefined, // Let Firebase handle undefined
      tags: data.tags || undefined,
      sendgridDomainId: data.sendgridDomainId || undefined,
      sendgridDomainData: data.sendgridDomainData || undefined,
      dnsRecords: data.dnsRecords || [],
      status: 'pending',
      verificationAttempts: 0,
      isDefault: false,
      emailsSent: 0
    };

    // Remove undefined values
    Object.keys(domainData).forEach(key => {
      if (domainData[key as keyof typeof domainData] === undefined) {
        delete domainData[key as keyof typeof domainData];
      }
    });

    return this.create(domainData, context);
  }

  /**
   * Get domains with poor performance
   */
  async getDomainsWithIssues(
    organizationId: string,
    thresholds = {
      bounceRate: 5, // 5%
      spamRate: 1    // 1%
    }
  ): Promise<EmailDomainEnhanced[]> {
    try {
      const allDomains = await this.getVerifiedDomains(organizationId);
      
      return allDomains.filter(domain => {
        const hasBounceIssue = domain.bounceRate && domain.bounceRate > thresholds.bounceRate;
        const hasSpamIssue = domain.spamRate && domain.spamRate > thresholds.spamRate;
        return hasBounceIssue || hasSpamIssue;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up old inbox test results
   */
  async cleanupOldInboxTests(
    domainId: string,
    keepCount: number = 10,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const domain = await this.getById(domainId, context.organizationId);
    if (!domain || !domain.inboxTests) return;

    if (domain.inboxTests.length > keepCount) {
      const trimmedTests = domain.inboxTests.slice(0, keepCount);
      await this.update(domainId, {
        inboxTests: trimmedTests
      }, context);
    }
  }
}

// Export singleton instance
export const domainServiceEnhanced = new DomainServiceEnhanced();