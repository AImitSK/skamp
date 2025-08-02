// src/lib/email/customer-campaign-matcher-enhanced.ts
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { CustomerMatchResult, EmailMessage, TeamMember } from '@/types/inbox-enhanced';

/**
 * Enhanced Customer Campaign Matcher Service 
 * 
 * Intelligente Zuordnung von E-Mails zu Kunden und Kampagnen
 * mit Fuzzy-Matching, VIP-Erkennung und Team-Assignment-Vorschlägen
 */
export class CustomerCampaignMatcherEnhanced {
  
  /**
   * Findet passende Kunden und Kampagnen für eine eingehende E-Mail
   */
  async matchEmailToCustomerAndCampaign(
    email: Partial<EmailMessage>,
    organizationId: string
  ): Promise<CustomerMatchResult> {
    console.log('🔍 Enhanced Customer/Campaign Matching für:', {
      from: email.from?.email,
      subject: email.subject,
      organizationId
    });

    try {
      // 1. Domain-basiertes Matching (höchste Priorität)
      const domainMatch = await this.matchByDomain(email, organizationId);
      if (domainMatch.confidence >= 90) {
        console.log('✅ High-confidence domain match found');
        return domainMatch;
      }

      // 2. E-Mail-Adress-basiertes Matching
      const emailMatch = await this.matchByEmail(email, organizationId);
      if (emailMatch.confidence >= 85) {
        console.log('✅ High-confidence email match found');
        return emailMatch;
      }

      // 3. Firmenname-basiertes Matching (Fuzzy)
      const nameMatch = await this.matchByCompanyName(email, organizationId);
      if (nameMatch.confidence >= 75) {
        console.log('✅ Company name match found');
        return nameMatch;
      }

      // 4. Kampagnen-basiertes Matching über Subject/Content
      const campaignMatch = await this.matchByCampaign(email, organizationId);
      if (campaignMatch.confidence >= 70) {
        console.log('✅ Campaign match found');
        return campaignMatch;
      }

      // 5. Fallback: Unbekannter Absender
      return {
        confidence: 0,
        matchType: 'manual',
        isVip: false,
        suggestedAssignments: await this.getSuggestedAssignments(email, organizationId)
      };

    } catch (error) {
      console.error('❌ Error in customer/campaign matching:', error);
      return {
        confidence: 0,
        matchType: 'manual',
        isVip: false
      };
    }
  }

  /**
   * Domain-basiertes Matching
   * Sucht nach Kunden basierend auf der E-Mail-Domain
   */
  private async matchByDomain(
    email: Partial<EmailMessage>,
    organizationId: string
  ): Promise<CustomerMatchResult> {
    if (!email.from?.email) {
      return { confidence: 0, matchType: 'domain', isVip: false };
    }

    const domain = email.from.email.split('@')[1];
    if (!domain) {
      return { confidence: 0, matchType: 'domain', isVip: false };
    }

    try {
      // Suche in companies_enhanced nach Domain
      const companiesQuery = query(
        collection(db, 'companies_enhanced'),
        where('organizationId', '==', organizationId),
        where('website', '>=', domain),
        where('website', '<=', domain + '\uf8ff'),
        limit(5)
      );

      const companiesSnapshot = await getDocs(companiesQuery);
      
      for (const doc of companiesSnapshot.docs) {
        const company = doc.data();
        
        // Prüfe verschiedene Domain-Formate
        const websiteMatch = this.isDomainMatch(domain, company.website);
        const emailDomainMatch = company.email && this.isDomainMatch(domain, company.email.split('@')[1]);
        
        if (websiteMatch || emailDomainMatch) {
          // Prüfe VIP-Status
          const isVip = this.isVipCustomer(company) || false;
          
          // Suche nach zugehörigen Kampagnen
          const { campaignId, campaignName } = await this.findRelatedCampaign(
            doc.id, 
            organizationId
          );

          return {
            customerId: doc.id,
            customerName: company.name,
            confidence: websiteMatch ? 95 : 90,
            matchType: 'domain',
            isVip,
            campaignId,
            campaignName,
            suggestedAssignments: await this.getSuggestedAssignments(email, organizationId)
          };
        }
      }

      return { confidence: 0, matchType: 'domain', isVip: false };
    } catch (error) {
      console.error('Error in domain matching:', error);
      return { confidence: 0, matchType: 'domain', isVip: false };
    }
  }

  /**
   * E-Mail-Adress-basiertes Matching
   * Sucht nach Kontakten mit der exakten E-Mail-Adresse
   */
  private async matchByEmail(
    email: Partial<EmailMessage>,
    organizationId: string
  ): Promise<CustomerMatchResult> {
    if (!email.from?.email) {
      return { confidence: 0, matchType: 'email', isVip: false };
    }

    try {
      // Suche in contacts_enhanced nach E-Mail-Adresse
      const contactsQuery = query(
        collection(db, 'contacts_enhanced'),
        where('organizationId', '==', organizationId),
        where('email', '==', email.from.email.toLowerCase()),
        limit(1)
      );

      const contactsSnapshot = await getDocs(contactsQuery);
      
      if (!contactsSnapshot.empty) {
        const contact = contactsSnapshot.docs[0].data();
        
        // Hole zugehörige Firma
        let companyData = null;
        if (contact.companyId) {
          const companyDoc = await getDocs(query(
            collection(db, 'companies_enhanced'),
            where('organizationId', '==', organizationId),
            where('id', '==', contact.companyId),
            limit(1)
          ));
          
          if (!companyDoc.empty) {
            companyData = companyDoc.docs[0].data();
          }
        }

        const isVip = this.isVipContact(contact) || (companyData && this.isVipCustomer(companyData)) || false;
        
        // Suche nach zugehörigen Kampagnen
        const { campaignId, campaignName } = await this.findRelatedCampaign(
          contact.companyId || contactsSnapshot.docs[0].id,
          organizationId
        );

        return {
          customerId: contact.companyId || contactsSnapshot.docs[0].id,
          customerName: companyData?.name || contact.firstName + ' ' + contact.lastName,
          confidence: 88,
          matchType: 'email',
          isVip,
          campaignId,
          campaignName,
          suggestedAssignments: await this.getSuggestedAssignments(email, organizationId)
        };
      }

      return { confidence: 0, matchType: 'email', isVip: false };
    } catch (error) {
      console.error('Error in email matching:', error);
      return { confidence: 0, matchType: 'email', isVip: false };
    }
  }

  /**
   * Firmenname-basiertes Matching mit Fuzzy-Search
   */
  private async matchByCompanyName(
    email: Partial<EmailMessage>,
    organizationId: string
  ): Promise<CustomerMatchResult> {
    if (!email.from?.name && !email.subject) {
      return { confidence: 0, matchType: 'name', isVip: false };
    }

    try {
      // Extrahiere potentielle Firmennamen aus E-Mail
      const potentialNames = this.extractCompanyNames(email);
      
      if (potentialNames.length === 0) {
        return { confidence: 0, matchType: 'name', isVip: false };
      }

      // Suche nach ähnlichen Firmennamen
      const companiesQuery = query(
        collection(db, 'companies_enhanced'),
        where('organizationId', '==', organizationId),
        orderBy('name'),
        limit(20)
      );

      const companiesSnapshot = await getDocs(companiesQuery);
      
      let bestMatch: CustomerMatchResult = { confidence: 0, matchType: 'name', isVip: false };

      for (const doc of companiesSnapshot.docs) {
        const company = doc.data();
        
        for (const potentialName of potentialNames) {
          const similarity = this.calculateStringSimilarity(
            potentialName.toLowerCase(),
            company.name.toLowerCase()
          );
          
          if (similarity > bestMatch.confidence && similarity >= 0.75) {
            const isVip = this.isVipCustomer(company) || false;
            
            const { campaignId, campaignName } = await this.findRelatedCampaign(
              doc.id,
              organizationId
            );

            bestMatch = {
              customerId: doc.id,
              customerName: company.name,
              confidence: Math.round(similarity * 100),
              matchType: 'name',
              isVip,
              campaignId,
              campaignName,
              suggestedAssignments: await this.getSuggestedAssignments(email, organizationId)
            };
          }
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('Error in company name matching:', error);
      return { confidence: 0, matchType: 'name', isVip: false };
    }
  }

  /**
   * Kampagnen-basiertes Matching über Subject und Content
   */
  private async matchByCampaign(
    email: Partial<EmailMessage>,
    organizationId: string
  ): Promise<CustomerMatchResult> {
    if (!email.subject && !email.textContent) {
      return { confidence: 0, matchType: 'campaign', isVip: false };
    }

    try {
      // Extrahiere Keywords aus Subject und Content
      const keywords = this.extractCampaignKeywords(email);
      
      if (keywords.length === 0) {
        return { confidence: 0, matchType: 'campaign', isVip: false };
      }

      // Suche nach PR-Kampagnen mit ähnlichen Keywords
      const campaignQuery = query(
        collection(db, 'pr_campaigns'),
        where('organizationId', '==', organizationId),
        where('status', 'in', ['active', 'published']),
        limit(10)
      );

      const campaignSnapshot = await getDocs(campaignQuery);
      
      let bestMatch: CustomerMatchResult = { confidence: 0, matchType: 'campaign', isVip: false };

      for (const doc of campaignSnapshot.docs) {
        const campaign = doc.data();
        
        // Prüfe Keyword-Übereinstimmungen
        const keywordScore = this.calculateKeywordScore(keywords, campaign);
        
        if (keywordScore > bestMatch.confidence && keywordScore >= 0.7) {
          // Versuche Kunde über Kampagne zu finden
          let customerId = campaign.clientId;
          let customerName = campaign.clientName;
          let isVip = false;

          if (customerId) {
            const companyDoc = await getDocs(query(
              collection(db, 'companies_enhanced'),
              where('organizationId', '==', organizationId),
              where('id', '==', customerId),
              limit(1)
            ));
            
            if (!companyDoc.empty) {
              const company = companyDoc.docs[0].data();
              customerName = company.name;
              isVip = this.isVipCustomer(company) || false;
            }
          }

          bestMatch = {
            customerId,
            customerName,
            campaignId: doc.id,
            campaignName: campaign.title,
            confidence: Math.round(keywordScore * 100),
            matchType: 'campaign',
            isVip,
            suggestedAssignments: await this.getSuggestedAssignments(email, organizationId)
          };
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('Error in campaign matching:', error);
      return { confidence: 0, matchType: 'campaign', isVip: false };
    }
  }

  /**
   * Hilfsmethoden
   */

  private isDomainMatch(emailDomain: string, websiteUrl?: string): boolean {
    if (!websiteUrl) return false;
    
    // Normalisiere Website URL zu Domain
    const websiteDomain = websiteUrl
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase();
      
    return emailDomain.toLowerCase() === websiteDomain;
  }

  private isVipCustomer(company: any): boolean {
    return company.isVip || 
           company.priority === 'high' || 
           company.tags?.includes('VIP') ||
           company.revenue > 100000; // Beispiel-Kriterium
  }

  private isVipContact(contact: any): boolean {
    return contact.isVip || 
           contact.tags?.includes('VIP') ||
           contact.role?.toLowerCase().includes('ceo') ||
           contact.role?.toLowerCase().includes('founder');
  }

  private async findRelatedCampaign(
    customerId: string,
    organizationId: string
  ): Promise<{ campaignId?: string; campaignName?: string }> {
    try {
      const campaignQuery = query(
        collection(db, 'pr_campaigns'),
        where('organizationId', '==', organizationId),
        where('clientId', '==', customerId),
        where('status', 'in', ['active', 'published']),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const campaignSnapshot = await getDocs(campaignQuery);
      
      if (!campaignSnapshot.empty) {
        const campaign = campaignSnapshot.docs[0].data();
        return {
          campaignId: campaignSnapshot.docs[0].id,
          campaignName: campaign.title
        };
      }
    } catch (error) {
      console.error('Error finding related campaign:', error);
    }
    
    return {};
  }

  private extractCompanyNames(email: Partial<EmailMessage>): string[] {
    const names: string[] = [];
    
    // Aus From-Name extrahieren
    if (email.from?.name) {
      names.push(email.from.name);
    }
    
    // Aus Subject extrahieren (einfache Heuristik)
    if (email.subject) {
      const subjectWords = email.subject.split(/\s+/)
        .filter(word => word.length > 3 && /^[A-Z]/.test(word));
      names.push(...subjectWords);
    }
    
    return names;
  }

  private extractCampaignKeywords(email: Partial<EmailMessage>): string[] {
    const keywords: string[] = [];
    
    // Keywords aus Subject
    if (email.subject) {
      const words = email.subject.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !/^(re|fwd|aw|wg):?$/i.test(word));
      keywords.push(...words);
    }
    
    // Keywords aus Content (erste 200 Zeichen)
    if (email.textContent) {
      const contentWords = email.textContent.substring(0, 200)
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4);
      keywords.push(...contentWords.slice(0, 10)); // Limit auf 10 Keywords
    }
    
    return keywords;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Einfache Levenshtein-Distance basierte Ähnlichkeit
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
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

  private calculateKeywordScore(keywords: string[], campaign: any): number {
    const campaignText = [
      campaign.title,
      campaign.description,
      campaign.industry,
      campaign.targetAudience
    ].join(' ').toLowerCase();
    
    let matches = 0;
    for (const keyword of keywords) {
      if (campaignText.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    
    return keywords.length > 0 ? matches / keywords.length : 0;
  }

  private async getSuggestedAssignments(
    email: Partial<EmailMessage>,
    organizationId: string
  ): Promise<string[]> {
    try {
      // Hole Team-Mitglieder für Vorschläge
      const teamQuery = query(
        collection(db, 'team_members'),
        where('organizationId', '==', organizationId),
        where('status', '==', 'active'),
        limit(5)
      );

      const teamSnapshot = await getDocs(teamQuery);
      
      // Einfache Heuristik für Assignment-Vorschläge
      const suggestions: string[] = [];
      
      teamSnapshot.forEach(doc => {
        const member = doc.data();
        
        // Prüfe Expertise basierend auf E-Mail-Content
        if (this.memberHasExpertise(member, email)) {
          suggestions.push(member.userId);
        }
      });
      
      return suggestions.slice(0, 3); // Max 3 Vorschläge
    } catch (error) {
      console.error('Error getting suggested assignments:', error);
      return [];
    }
  }

  private memberHasExpertise(member: any, email: Partial<EmailMessage>): boolean {
    // Einfache Heuristik - in der Realität würde man komplexere Logik verwenden
    const memberSkills = (member.skills || []).map((s: string) => s.toLowerCase());
    const emailContent = [email.subject, email.textContent].join(' ').toLowerCase();
    
    return memberSkills.some((skill: string) => emailContent.includes(skill));
  }
}

// Singleton Export
export const customerCampaignMatcherEnhanced = new CustomerCampaignMatcherEnhanced();