// src/lib/email/customer-campaign-matcher.ts

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  limit,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { EmailMessage } from '@/types/inbox-enhanced';

export interface CustomerCampaignMatch {
  customerId?: string;
  customerName?: string;
  campaignId?: string;
  campaignName?: string;
  folderType: 'customer' | 'campaign' | 'general';
  confidence: number; // 0-100
  matchedBy?: 'email' | 'domain' | 'campaign' | 'subject' | 'none';
}

export class CustomerCampaignMatcher {
  private organizationId: string;
  private cache: Map<string, CustomerCampaignMatch> = new Map();

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Hauptmethode zur Zuordnung einer E-Mail zu Kunde/Kampagne
   */
  async matchEmail(email: EmailMessage): Promise<CustomerCampaignMatch> {
    
    // Check cache first
    const cacheKey = this.getCacheKey(email);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let match: CustomerCampaignMatch = {
      folderType: 'general',
      confidence: 0
    };

    // 1. Prüfe Reply-To Header für PR-Kampagnen
    const campaignMatch = await this.matchByCampaignReplyTo(email);
    if (campaignMatch.confidence > match.confidence) {
      match = campaignMatch;
    }

    // 2. Prüfe E-Mail-Adresse gegen bekannte Kontakte
    const contactMatch = await this.matchByContactEmail(email);
    if (contactMatch.confidence > match.confidence) {
      match = contactMatch;
    }

    // 3. Prüfe Domain gegen bekannte Unternehmen
    const domainMatch = await this.matchByDomain(email);
    if (domainMatch.confidence > match.confidence) {
      match = domainMatch;
    }

    // 4. Prüfe Subject-Keywords
    const subjectMatch = await this.matchBySubjectKeywords(email);
    if (subjectMatch.confidence > match.confidence) {
      match = subjectMatch;
    }

    // Cache result
    this.cache.set(cacheKey, match);
    
    return match;
  }

  /**
   * Matche über Reply-To Header (für PR-Kampagnen)
   */
  private async matchByCampaignReplyTo(email: EmailMessage): Promise<CustomerCampaignMatch> {
    // Prüfe Reply-To Header falls vorhanden
    const replyToEmail = email.replyTo?.email;
    if (!replyToEmail) {
      return { folderType: 'general', confidence: 0 };
    }

    try {
      // Suche PR-Kampagne mit diesem Reply-To Pattern
      const campaignsQuery = query(
        collection(db, 'pr_campaigns'),
        where('organizationId', '==', this.organizationId),
        where('status', '==', 'sent'),
        limit(10)
      );

      const snapshot = await getDocs(campaignsQuery);
      
      for (const docSnapshot of snapshot.docs) {
        const campaign = docSnapshot.data();
        // Prüfe ob die E-Mail zu dieser Kampagne gehört
        // Prüfe Subject und Reply-To E-Mail
        if (email.subject.includes(campaign.title) || 
            (campaign.replyToEmail && replyToEmail.includes(campaign.replyToEmail))) {
          
          // Lade Kundeninfo
          let customerName = 'Unbekannter Kunde';
          if (campaign.customerId) {
            const customerDoc = await getDoc(doc(db, 'companies_enhanced', campaign.customerId));
            if (customerDoc.exists()) {
              customerName = customerDoc.data().name || customerName;
            }
          }

          return {
            customerId: campaign.customerId,
            customerName: customerName,
            campaignId: docSnapshot.id,
            campaignName: campaign.title,
            folderType: 'campaign',
            confidence: 100,
            matchedBy: 'campaign'
          };
        }
      }
    } catch (error) {
    }

    return { folderType: 'general', confidence: 0 };
  }

  /**
   * Matche über E-Mail-Adresse gegen CRM-Kontakte
   */
  private async matchByContactEmail(email: EmailMessage): Promise<CustomerCampaignMatch> {
    const fromEmail = email.from.email.toLowerCase();
    
    try {
      // Suche Kontakt mit dieser E-Mail
      const contactsQuery = query(
        collection(db, 'contacts_enhanced'),
        where('organizationId', '==', this.organizationId),
        where('email', '==', fromEmail),
        limit(1)
      );

      const snapshot = await getDocs(contactsQuery);
      
      if (!snapshot.empty) {
        const contact = snapshot.docs[0].data();
        
        return {
          customerId: contact.company || snapshot.docs[0].id,
          customerName: contact.company || contact.firstName + ' ' + contact.lastName,
          folderType: 'customer',
          confidence: contact.company ? 95 : 85,
          matchedBy: 'email'
        };
      }
    } catch (error) {
    }

    return { folderType: 'general', confidence: 0 };
  }

  /**
   * Matche über Domain gegen bekannte Unternehmen
   */
  private async matchByDomain(email: EmailMessage): Promise<CustomerCampaignMatch> {
    const domain = email.from.email.split('@')[1]?.toLowerCase();
    if (!domain || this.isGenericDomain(domain)) {
      return { folderType: 'general', confidence: 0 };
    }

    try {
      // Suche Unternehmen mit dieser Domain (über Website URL)
      const orgsQuery = query(
        collection(db, 'companies_enhanced'),
        where('organizationId', '==', this.organizationId),
        where('website', '>=', domain),
        where('website', '<=', domain + '\uf8ff'),
        limit(1)
      );

      const snapshot = await getDocs(orgsQuery);
      
      if (!snapshot.empty) {
        const org = snapshot.docs[0].data();
        
        return {
          customerId: snapshot.docs[0].id,
          customerName: org.name,
          folderType: 'customer',
          confidence: 80,
          matchedBy: 'domain'
        };
      }

      // Alternative: Suche in Kontakten nach Domain
      const contactsQuery = query(
        collection(db, 'contacts_enhanced'),
        where('organizationId', '==', this.organizationId),
        where('email', '>=', '@' + domain),
        where('email', '<=', '@' + domain + '\uf8ff'),
        limit(5)
      );

      const contactsSnapshot = await getDocs(contactsQuery);
      
      if (!contactsSnapshot.empty) {
        // Gruppiere nach Unternehmen
        const companies = new Map<string, { name: string, count: number }>();
        
        contactsSnapshot.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
          const contact = docSnapshot.data();
          if (contact.company) {
            const current = companies.get(contact.company) || { name: contact.company, count: 0 };
            current.count++;
            companies.set(contact.company, current);
          }
        });

        // Nimm das häufigste Unternehmen
        const sortedCompanies = Array.from(companies.entries())
          .sort((a, b) => b[1].count - a[1].count);
          
        if (sortedCompanies.length > 0) {
          return {
            customerId: sortedCompanies[0][0],
            customerName: sortedCompanies[0][1].name,
            folderType: 'customer',
            confidence: 75,
            matchedBy: 'domain'
          };
        }
      }
    } catch (error) {
    }

    return { folderType: 'general', confidence: 0 };
  }

  /**
   * Matche über Keywords im Betreff
   */
  private async matchBySubjectKeywords(email: EmailMessage): Promise<CustomerCampaignMatch> {
    const subject = email.subject.toLowerCase();
    
    try {
      // Suche aktive Kampagnen
      const campaignsQuery = query(
        collection(db, 'pr_campaigns'),
        where('organizationId', '==', this.organizationId),
        where('status', 'in', ['draft', 'scheduled', 'sent']),
        limit(20)
      );

      const snapshot = await getDocs(campaignsQuery);
      
      for (const docSnapshot of snapshot.docs) {
        const campaign = docSnapshot.data();
        const campaignTitle = campaign.title.toLowerCase();
        
        // Prüfe ob Kampagnen-Titel im Betreff vorkommt
        if (subject.includes(campaignTitle) || 
            this.calculateSimilarity(subject, campaignTitle) > 0.7) {
          
          // Lade Kundeninfo
          let customerName = 'Unbekannter Kunde';
          if (campaign.customerId) {
            const customerDoc = await getDoc(doc(db, 'companies_enhanced', campaign.customerId));
            if (customerDoc.exists()) {
              customerName = customerDoc.data().name || customerName;
            }
          }

          return {
            customerId: campaign.customerId,
            customerName: customerName,
            campaignId: docSnapshot.id,
            campaignName: campaign.title,
            folderType: 'campaign',
            confidence: 70,
            matchedBy: 'subject'
          };
        }
      }

      // Prüfe auf Kunden-Keywords
      const orgsQuery = query(
        collection(db, 'companies_enhanced'),
        where('organizationId', '==', this.organizationId),
        limit(50)
      );

      const orgsSnapshot = await getDocs(orgsQuery);
      
      for (const docSnapshot of orgsSnapshot.docs) {
        const org = docSnapshot.data();
        const orgName = org.name.toLowerCase();
        
        if (subject.includes(orgName) || 
            this.calculateSimilarity(subject, orgName) > 0.8) {
          
          return {
            customerId: docSnapshot.id,
            customerName: org.name,
            folderType: 'customer',
            confidence: 60,
            matchedBy: 'subject'
          };
        }
      }
    } catch (error) {
    }

    return { folderType: 'general', confidence: 0 };
  }

  /**
   * Prüft ob es sich um eine generische Domain handelt
   */
  private isGenericDomain(domain: string): boolean {
    const genericDomains = [
      'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.de', 
      'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
      'gmx.de', 'gmx.net', 'web.de', 't-online.de',
      'aol.com', 'mail.com', 'protonmail.com', 'icloud.com'
    ];
    
    return genericDomains.includes(domain);
  }

  /**
   * Berechnet Ähnlichkeit zwischen zwei Strings (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein-Distanz für String-Ähnlichkeit
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Generiert Cache-Key für E-Mail
   */
  private getCacheKey(email: EmailMessage): string {
    return `${email.from.email}-${email.subject}-${email.receivedAt?.toString() || Date.now()}`;
  }

  /**
   * Leert den Cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
let matcherInstance: CustomerCampaignMatcher | null = null;

export function getCustomerCampaignMatcher(organizationId: string): CustomerCampaignMatcher {
  if (!matcherInstance || matcherInstance['organizationId'] !== organizationId) {
    matcherInstance = new CustomerCampaignMatcher(organizationId);
  }
  return matcherInstance;
}