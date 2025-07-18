// src/lib/firebase/crm-migration-helper.ts
import { Company, Contact } from '@/types/crm';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';
import { CountryCode, CurrencyCode } from '@/types/international';
import { Timestamp } from 'firebase/firestore';

/**
 * Converts a legacy Company to CompanyEnhanced format
 */
export function migrateCompanyToEnhanced(
  company: Company,
  organizationId: string,
  userId: string
): CompanyEnhanced {
  const now = Timestamp.now();
  
  // Map country name to country code
  const mapCountryToCode = (countryName?: string): CountryCode => {
    const countryMap: Record<string, CountryCode> = {
      'Deutschland': 'DE',
      'Germany': 'DE',
      'Österreich': 'AT',
      'Austria': 'AT',
      'Schweiz': 'CH',
      'Switzerland': 'CH',
      'USA': 'US',
      'United States': 'US',
      'Vereinigtes Königreich': 'GB',
      'United Kingdom': 'GB',
      'Frankreich': 'FR',
      'France': 'FR',
      'Italien': 'IT',
      'Italy': 'IT',
      'Spanien': 'ES',
      'Spain': 'ES',
      'Niederlande': 'NL',
      'Netherlands': 'NL',
      'Belgien': 'BE',
      'Belgium': 'BE'
    };
    
    return countryMap[countryName || ''] || 'DE';
  };

  const enhanced: CompanyEnhanced = {
    // Base Entity fields
    id: company.id,
    organizationId,
    createdBy: userId,
    createdAt: company.createdAt || now,
    updatedBy: userId,
    updatedAt: company.updatedAt || now,
    
    // Basic fields
    name: company.name,
    type: company.type,
    
    // Enhanced name fields
    officialName: company.name,
    tradingName: undefined,
    
    // Main address
    mainAddress: company.address ? {
      street: company.address.street || '',
      city: company.address.city || '',
      postalCode: company.address.zip || company.address.postalCode || '',
      countryCode: mapCountryToCode(company.address.country),
      region: company.address.state
    } : undefined,
    
    // Contact info arrays
    phones: company.phone ? [{
      type: 'business',
      number: company.phone,
      isPrimary: true
    }] : [],
    
    emails: company.email ? [{
      type: 'general',
      email: company.email,
      isPrimary: true
    }] : [],
    
    website: company.website,
    
    // Financial info
    financial: (company.revenue || company.employees) ? {
      annualRevenue: company.revenue ? {
        amount: company.revenue,
        currency: 'EUR' as CurrencyCode
      } : undefined,
      employees: company.employees
    } : undefined,
    
    // Industry classification
    industryClassification: company.industry ? {
      primary: company.industry,
      system: 'CUSTOM'
    } : undefined,
    
    // Media info (keep as is)
    mediaInfo: company.mediaInfo,
    
    // Social media (keep as is)
    socialMedia: company.socialMedia,
    
    // Other fields
    description: company.description,
    internalNotes: company.notes,
    tagIds: company.tagIds,
    
    // Default status
    status: 'active',
    lifecycleStage: 'customer',
    
    // Logo
    logoUrl: company.logoUrl
  };
  
  return enhanced;
}

/**
 * Converts CompanyEnhanced back to legacy Company format
 */
export function migrateCompanyFromEnhanced(enhanced: CompanyEnhanced): Omit<Company, 'userId'> {
  return {
    id: enhanced.id,
    name: enhanced.name,
    type: enhanced.type,
    industry: enhanced.industryClassification?.primary,
    website: enhanced.website,
    email: enhanced.emails?.find(e => e.isPrimary)?.email || enhanced.emails?.[0]?.email,
    phone: enhanced.phones?.find(p => p.isPrimary)?.number || enhanced.phones?.[0]?.number,
    address: enhanced.mainAddress ? {
      street: enhanced.mainAddress.street,
      street2: enhanced.mainAddress.addressLine2,
      city: enhanced.mainAddress.city,
      state: enhanced.mainAddress.region,
      postalCode: enhanced.mainAddress.postalCode,
      zip: enhanced.mainAddress.postalCode,
      country: enhanced.mainAddress.countryCode
    } : undefined,
    mediaInfo: enhanced.mediaInfo,
    description: enhanced.description,
    employees: enhanced.financial?.employees,
    revenue: enhanced.financial?.annualRevenue?.amount,
    notes: enhanced.internalNotes,
    logoUrl: enhanced.logoUrl,
    tagIds: enhanced.tagIds,
    socialMedia: enhanced.socialMedia,
    createdAt: enhanced.createdAt,
    updatedAt: enhanced.updatedAt
  };
}

/**
 * Converts a legacy Contact to ContactEnhanced format
 */
export function migrateContactToEnhanced(
  contact: Contact,
  organizationId: string,
  userId: string
): ContactEnhanced {
  const now = Timestamp.now();
  
  const enhanced: ContactEnhanced = {
    // Base Entity fields
    id: contact.id,
    organizationId,
    createdBy: userId,
    createdAt: contact.createdAt || now,
    updatedBy: userId,
    updatedAt: contact.updatedAt || now,
    
    // Structured name
    name: {
      firstName: contact.firstName,
      lastName: contact.lastName
    },
    displayName: `${contact.firstName} ${contact.lastName}`,
    
    // Company association
    companyId: contact.companyId,
    companyName: contact.companyName,
    
    // Position
    position: contact.position,
    department: contact.department,
    
    // Contact info
    emails: contact.email ? [{
      type: 'business',
      email: contact.email,
      isPrimary: true
    }] : [],
    
    phones: contact.phone ? [{
      type: 'business',
      number: contact.phone,
      isPrimary: true
    }] : [],
    
    // Social profiles
    socialProfiles: contact.socialMedia?.map(sm => ({
      platform: sm.platform,
      url: sm.url
    })),
    
    // Communication preferences
    communicationPreferences: contact.communicationPreferences ? {
      preferredChannel: contact.communicationPreferences.preferredChannel === 'meeting' ? 'messaging' :
                       contact.communicationPreferences.preferredChannel === 'social' ? 'messaging' :
                       contact.communicationPreferences.preferredChannel,
      preferredLanguage: contact.communicationPreferences.language as any,
      doNotContact: contact.communicationPreferences.doNotContact
    } : undefined,
    
    // Media profile
    mediaProfile: contact.mediaInfo ? {
      isJournalist: true,
      publicationIds: [],
      beats: contact.mediaInfo.expertise,
      preferredTopics: contact.mediaInfo.expertise
    } : undefined,
    
    // Personal info
    personalInfo: contact.birthday ? {
      birthday: contact.birthday,
      notes: contact.notes
    } : contact.notes ? {
      notes: contact.notes
    } : undefined,
    
    // Other fields
    tagIds: contact.tagIds,
    photoUrl: contact.photoUrl,
    status: 'active',
    
    // Activity tracking
    lastActivityAt: contact.lastContactDate
  };
  
  return enhanced;
}

/**
 * Converts ContactEnhanced back to legacy Contact format
 */
export function migrateContactFromEnhanced(enhanced: ContactEnhanced): Omit<Contact, 'userId'> {
  return {
    id: enhanced.id,
    firstName: enhanced.name.firstName,
    lastName: enhanced.name.lastName,
    email: enhanced.emails?.find(e => e.isPrimary)?.email || enhanced.emails?.[0]?.email,
    phone: enhanced.phones?.find(p => p.isPrimary)?.number || enhanced.phones?.[0]?.number,
    position: enhanced.position,
    department: enhanced.department,
    companyId: enhanced.companyId,
    companyName: enhanced.companyName,
    address: enhanced.addresses?.[0]?.address ? {
      street: enhanced.addresses[0].address.street,
      city: enhanced.addresses[0].address.city,
      state: enhanced.addresses[0].address.region,
      postalCode: enhanced.addresses[0].address.postalCode,
      country: enhanced.addresses[0].address.countryCode
    } : undefined,
    socialMedia: enhanced.socialProfiles?.map(sp => ({
      platform: sp.platform as any,
      url: sp.url
    })),
    communicationPreferences: enhanced.communicationPreferences ? {
      preferredChannel: enhanced.communicationPreferences.preferredChannel === 'messaging' ? 'meeting' :
                       enhanced.communicationPreferences.preferredChannel === 'mail' ? 'meeting' :
                       enhanced.communicationPreferences.preferredChannel,
      bestTimeToContact: enhanced.communicationPreferences.preferredTime?.bestHours?.from,
      doNotContact: enhanced.communicationPreferences.doNotContact,
      language: enhanced.communicationPreferences.preferredLanguage
    } : undefined,
    mediaInfo: enhanced.mediaProfile ? {
      publications: enhanced.mediaProfile.publicationIds,
      expertise: enhanced.mediaProfile.beats
    } : undefined,
    birthday: enhanced.personalInfo?.birthday,
    notes: enhanced.personalInfo?.notes,
    photoUrl: enhanced.photoUrl,
    tagIds: enhanced.tagIds,
    createdAt: enhanced.createdAt,
    updatedAt: enhanced.updatedAt,
    lastContactDate: enhanced.lastActivityAt,
    totalInteractions: enhanced.relationshipInfo?.lifetime?.totalInteractions
  };
}

/**
 * Batch migration helper
 */
export async function batchMigrateCompanies(
  companies: Company[],
  organizationId: string,
  userId: string,
  batchSize: number = 500
): Promise<CompanyEnhanced[]> {
  const results: CompanyEnhanced[] = [];
  
  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);
    const migrated = batch.map(company => 
      migrateCompanyToEnhanced(company, organizationId, userId)
    );
    results.push(...migrated);
    
    // Add small delay between batches to avoid rate limiting
    if (i + batchSize < companies.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Batch migration helper for contacts
 */
export async function batchMigrateContacts(
  contacts: Contact[],
  organizationId: string,
  userId: string,
  batchSize: number = 500
): Promise<ContactEnhanced[]> {
  const results: ContactEnhanced[] = [];
  
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    const migrated = batch.map(contact => 
      migrateContactToEnhanced(contact, organizationId, userId)
    );
    results.push(...migrated);
    
    // Add small delay between batches to avoid rate limiting
    if (i + batchSize < contacts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Validation helpers
 */
export function validateCompanyMigration(original: Company, enhanced: CompanyEnhanced): string[] {
  const errors: string[] = [];
  
  if (original.name !== enhanced.name) {
    errors.push('Name mismatch');
  }
  
  if (original.type !== enhanced.type) {
    errors.push('Type mismatch');
  }
  
  // Add more validation as needed
  
  return errors;
}

export function validateContactMigration(original: Contact, enhanced: ContactEnhanced): string[] {
  const errors: string[] = [];
  
  if (original.firstName !== enhanced.name.firstName) {
    errors.push('First name mismatch');
  }
  
  if (original.lastName !== enhanced.name.lastName) {
    errors.push('Last name mismatch');
  }
  
  // Add more validation as needed
  
  return errors;
}