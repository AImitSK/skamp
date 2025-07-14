// src/lib/firebase/domain-service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { 
  EmailDomain, 
  EmailDomainFormData,
  DnsRecord,
  DnsCheckResult,
  InboxTestResult,
  DomainStatus,
  DomainErrorCode
} from '@/types/email-domains';

/**
 * Service für Domain-Verwaltung in Firebase
 */
class DomainService {
  private collectionName = 'email_domains';

  /**
   * Erstellt eine neue Domain
   */
  async create(data: EmailDomainFormData & { userId: string; organizationId: string }): Promise<string> {
    try {
      // Prüfe ob Domain bereits existiert
      const existingDomain = await this.getByDomain(data.domain, data.organizationId);
      if (existingDomain) {
        throw new Error(DomainErrorCode.DOMAIN_ALREADY_EXISTS);
      }

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        status: 'pending' as DomainStatus,
        verificationAttempts: 0,
        dnsRecords: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error: any) {
      console.error('Error creating domain:', error);
      throw error;
    }
  }

  /**
   * Holt alle Domains einer Organisation
   */
  async getAll(organizationId: string): Promise<EmailDomain[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmailDomain));
    } catch (error) {
      console.error('Error getting domains:', error);
      return [];
    }
  }

  /**
   * Holt eine einzelne Domain
   */
  async getById(domainId: string): Promise<EmailDomain | null> {
    try {
      const docRef = doc(db, this.collectionName, domainId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as EmailDomain;
    } catch (error) {
      console.error('Error getting domain:', error);
      return null;
    }
  }

  /**
   * Sucht eine Domain nach Name
   */
  async getByDomain(domain: string, organizationId: string): Promise<EmailDomain | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('domain', '==', domain.toLowerCase()),
        where('organizationId', '==', organizationId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as EmailDomain;
    } catch (error) {
      console.error('Error getting domain by name:', error);
      return null;
    }
  }

  /**
   * Aktualisiert eine Domain
   */
  async update(domainId: string, data: Partial<EmailDomain>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, domainId);
      
      // Entferne undefined Werte und id
      const updateData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined && key !== 'id') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating domain:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert DNS Records
   */
  async updateDnsRecords(domainId: string, dnsRecords: DnsRecord[]): Promise<void> {
    await this.update(domainId, { dnsRecords });
  }

  /**
   * Aktualisiert DNS Check Results
   */
  async updateDnsCheckResults(domainId: string, results: DnsCheckResult[]): Promise<void> {
    await this.update(domainId, {
      dnsCheckResults: results,
      lastDnsCheckAt: Timestamp.now()
    });
  }

  /**
   * Fügt ein Inbox Test Result hinzu
   */
  async addInboxTestResult(domainId: string, result: InboxTestResult): Promise<void> {
    const domain = await this.getById(domainId);
    if (!domain) {
      throw new Error(DomainErrorCode.DOMAIN_NOT_FOUND);
    }

    const inboxTests = domain.inboxTests || [];
    inboxTests.unshift(result); // Neueste zuerst

    // Behalte nur die letzten 50 Tests
    const trimmedTests = inboxTests.slice(0, 50);

    await this.update(domainId, {
      inboxTests: trimmedTests,
      lastInboxTestAt: Timestamp.now()
    });
  }

  /**
   * Aktualisiert den Verifizierungsstatus
   */
  async updateVerificationStatus(
    domainId: string, 
    status: DomainStatus, 
    incrementAttempts: boolean = false
  ): Promise<void> {
    const domain = await this.getById(domainId);
    if (!domain) {
      throw new Error(DomainErrorCode.DOMAIN_NOT_FOUND);
    }

    const updateData: Partial<EmailDomain> = {
      status,
      lastVerificationAt: Timestamp.now()
    };

    if (incrementAttempts) {
      updateData.verificationAttempts = (domain.verificationAttempts || 0) + 1;
    }

    if (status === 'verified') {
      updateData.verifiedAt = Timestamp.now();
    }

    await this.update(domainId, updateData);
  }

  /**
   * Löscht eine Domain
   */
  async delete(domainId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, domainId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting domain:', error);
      throw error;
    }
  }

  /**
   * Batch-Update für mehrere Domains
   */
  async batchUpdate(updates: Array<{ id: string; data: Partial<EmailDomain> }>): Promise<void> {
    if (updates.length === 0) return;

    try {
      const batch = writeBatch(db);

      updates.forEach(({ id, data }) => {
        const docRef = doc(db, this.collectionName, id);
        
        // Entferne undefined Werte und id
        const updateData = Object.entries(data).reduce((acc, [key, value]) => {
          if (value !== undefined && key !== 'id') {
            acc[key] = value;
          }
          return acc;
        }, {} as any);

        batch.update(docRef, {
          ...updateData,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error in batch update:', error);
      throw error;
    }
  }

  /**
   * Holt Domains die verifiziert werden müssen
   */
  async getDomainsForVerification(organizationId: string): Promise<EmailDomain[]> {
    try {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        where('status', '==', 'pending'),
        where('verificationAttempts', '<', 10)
      );

      const snapshot = await getDocs(q);
      
      // Filtere Domains die vor mehr als 5 Minuten zuletzt geprüft wurden
      return snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as EmailDomain))
        .filter(domain => {
          if (!domain.lastVerificationAt) return true;
          const lastCheck = domain.lastVerificationAt.toDate();
          return lastCheck < fiveMinutesAgo;
        });
    } catch (error) {
      console.error('Error getting domains for verification:', error);
      return [];
    }
  }

  /**
   * Statistiken für Domains
   */
  async getStatistics(organizationId: string): Promise<{
    total: number;
    verified: number;
    pending: number;
    failed: number;
  }> {
    try {
      const domains = await this.getAll(organizationId);
      
      return {
        total: domains.length,
        verified: domains.filter(d => d.status === 'verified').length,
        pending: domains.filter(d => d.status === 'pending').length,
        failed: domains.filter(d => d.status === 'failed').length
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return { total: 0, verified: 0, pending: 0, failed: 0 };
    }
  }

  /**
   * Prüft ob eine Domain bereit für E-Mail-Versand ist
   */
  async isDomainReady(domainId: string): Promise<boolean> {
    const domain = await this.getById(domainId);
    if (!domain) return false;

    return domain.status === 'verified';
  }

  /**
   * Holt die neuesten Inbox-Tests
   */
  async getRecentInboxTests(organizationId: string, limit: number = 10): Promise<Array<{
    domain: string;
    test: InboxTestResult;
  }>> {
    try {
      const domains = await this.getAll(organizationId);
      const allTests: Array<{ domain: string; test: InboxTestResult }> = [];

      domains.forEach(domain => {
        if (domain.inboxTests) {
          domain.inboxTests.forEach(test => {
            allTests.push({ domain: domain.domain, test });
          });
        }
      });

      // Sortiere nach Timestamp und limitiere
      return allTests
        .sort((a, b) => b.test.timestamp.toMillis() - a.test.timestamp.toMillis())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent inbox tests:', error);
      return [];
    }
  }

  /**
   * Bereinigt alte Test-Daten
   */
  async cleanupOldTestData(domainId: string, keepTests: number = 20): Promise<void> {
    const domain = await this.getById(domainId);
    if (!domain || !domain.inboxTests) return;

    if (domain.inboxTests.length > keepTests) {
      await this.update(domainId, {
        inboxTests: domain.inboxTests.slice(0, keepTests)
      });
    }
  }

  /**
   * Exportiert Domain-Daten
   */
  async exportDomainData(organizationId: string): Promise<any[]> {
    const domains = await this.getAll(organizationId);
    
    return domains.map(domain => ({
      domain: domain.domain,
      status: domain.status,
      verifiedAt: domain.verifiedAt?.toDate().toISOString(),
      provider: domain.detectedProvider || 'Unbekannt',
      dnsRecords: domain.dnsRecords.length,
      lastCheck: domain.lastDnsCheckAt?.toDate().toISOString(),
      inboxTests: domain.inboxTests?.length || 0,
      createdAt: domain.createdAt.toDate().toISOString()
    }));
  }
}

// Singleton Export
export const domainService = new DomainService();