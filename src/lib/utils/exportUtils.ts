// src/lib/utils/exportUtils.ts
import Papa from 'papaparse';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';
import { companyTypeLabels } from '@/types/crm';
import { format } from 'date-fns';

interface ExportOptions {
  includeIds?: boolean;
  includeTimestamps?: boolean;
  includeTags?: boolean;
  dateFormat?: string;
}

/**
 * Exports enhanced companies to CSV format
 */
export function exportCompaniesToCSV(
  companies: CompanyEnhanced[],
  tags: Map<string, { name: string; color: string }>,
  options: ExportOptions = {}
): string {
  const {
    includeIds = false,
    includeTimestamps = false,
    includeTags = true,
    dateFormat = 'dd.MM.yyyy'
  } = options;

  const data = companies.map(company => {
    const row: any = {
      'Firmenname*': company.name,
      'Offizieller Firmenname': company.officialName || '',
      'Handelsname': company.tradingName || '',
      'Typ*': companyTypeLabels[company.type] || company.type,
      'Branche': company.industryClassification?.primary || '',
      'Status': company.status || 'active',
      'Lifecycle Stage': company.lifecycleStage || '',
      'Rechtsform': company.legalForm || '',
      'Gründungsjahr': company.foundedDate ? new Date(company.foundedDate).getFullYear() : '',
      'Website': company.website || '',
      'Beschreibung': company.description || '',
      'Interne Notizen': company.internalNotes || '',
      
      // Address
      'Straße': company.mainAddress?.street || '',
      'PLZ': company.mainAddress?.postalCode || '',
      'Stadt': company.mainAddress?.city || '',
      'Bundesland': company.mainAddress?.region || '',
      'Land (ISO)': company.mainAddress?.countryCode || '',
      
      // Phones
      'Telefon 1': company.phones?.[0]?.number || '',
      'Telefon Typ 1': company.phones?.[0]?.type || '',
      'Telefon 2': company.phones?.[1]?.number || '',
      'Telefon Typ 2': company.phones?.[1]?.type || '',
      
      // Emails
      'E-Mail 1': company.emails?.[0]?.email || '',
      'E-Mail Typ 1': company.emails?.[0]?.type || '',
      'E-Mail 2': company.emails?.[1]?.email || '',
      'E-Mail Typ 2': company.emails?.[1]?.type || '',
      
      // Identifiers
      'USt-IdNr': company.identifiers?.find(i => i.type === 'VAT_EU')?.value || '',
      'Handelsregister': company.identifiers?.find(i => i.type === 'COMPANY_REG_DE')?.value || '',
      
      // Financial
      'Jahresumsatz': company.financial?.annualRevenue?.amount || '',
      'Währung': company.financial?.annualRevenue?.currency || '',
      'Mitarbeiterzahl': company.financial?.employees || '',
      'Geschäftsjahresende': company.financial?.fiscalYearEnd || '',
      
      // Parent company - would need to be resolved by name
      'Muttergesellschaft': '',
      
      // Social Media
      'LinkedIn': company.socialMedia?.find(s => s.platform === 'linkedin')?.url || '',
      'Twitter': company.socialMedia?.find(s => s.platform === 'twitter')?.url || '',
      'Facebook': company.socialMedia?.find(s => s.platform === 'facebook')?.url || '',
      'Instagram': company.socialMedia?.find(s => s.platform === 'instagram')?.url || '',
      'YouTube': company.socialMedia?.find(s => s.platform === 'youtube')?.url || '',
      'Xing': company.socialMedia?.find(s => s.platform === 'xing')?.url || ''
    };

    // Optional fields
    if (includeIds) {
      row['ID'] = company.id || '';
    }

    if (includeTags && company.tagIds) {
      const tagNames = company.tagIds
        .map(tagId => tags.get(tagId)?.name)
        .filter(Boolean)
        .join(';');
      row['Tags'] = tagNames;
    }

    if (includeTimestamps) {
      row['Erstellt am'] = company.createdAt ? 
        format(company.createdAt.toDate(), dateFormat) : '';
      row['Aktualisiert am'] = company.updatedAt ? 
        format(company.updatedAt.toDate(), dateFormat) : '';
    }

    return row;
  });

  return Papa.unparse(data, {
    delimiter: ',',
    header: true,
    quotes: true
  });
}

/**
 * Exports enhanced contacts to CSV format
 */
export function exportContactsToCSV(
  contacts: ContactEnhanced[],
  companies: Map<string, { name: string; type: string }>,
  tags: Map<string, { name: string; color: string }>,
  options: ExportOptions = {}
): string {
  const {
    includeIds = false,
    includeTimestamps = false,
    includeTags = true,
    dateFormat = 'dd.MM.yyyy'
  } = options;

  const data = contacts.map(contact => {
    const row: any = {
      'Vorname*': contact.name.firstName,
      'Nachname*': contact.name.lastName,
      'Anrede': contact.name.salutation || '',
      'Titel': contact.name.title || '',
      'Position': contact.position || '',
      'Abteilung': contact.department || '',
      'Firma': contact.companyId ? companies.get(contact.companyId)?.name || contact.companyName || '' : '',
      'Status': contact.status || 'active',
      
      // Emails
      'E-Mail Geschäftlich': contact.emails?.find(e => e.type === 'business')?.email || '',
      'E-Mail Privat': contact.emails?.find(e => e.type === 'private')?.email || '',
      
      // Phones
      'Telefon Geschäftlich': contact.phones?.find(p => p.type === 'business')?.number || '',
      'Telefon Mobil': contact.phones?.find(p => p.type === 'mobile')?.number || '',
      'Telefon Privat': contact.phones?.find(p => p.type === 'private')?.number || '',
      
      // Address
      'Straße': contact.addresses?.[0]?.address.street || '',
      'PLZ': contact.addresses?.[0]?.address.postalCode || '',
      'Stadt': contact.addresses?.[0]?.address.city || '',
      'Bundesland': contact.addresses?.[0]?.address.region || '',
      'Land (ISO)': contact.addresses?.[0]?.address.countryCode || '',
      
      // Communication preferences
      'Bevorzugte Sprache': contact.communicationPreferences?.preferredLanguage || '',
      'Bevorzugter Kanal': contact.communicationPreferences?.preferredChannel || '',
      
      // Media profile
      'Ist Journalist': contact.mediaProfile?.isJournalist ? 'ja' : 'nein',
      'Publikationen': '', // Would need to resolve publication names
      'Ressorts': contact.mediaProfile?.beats?.join(';') || '',
      
      // Social profiles
      'Website': contact.socialProfiles?.find(s => s.platform === 'website')?.url || contact.website || '',
      'LinkedIn': contact.socialProfiles?.find(s => s.platform === 'linkedin')?.url || '',
      'Twitter': contact.socialProfiles?.find(s => s.platform === 'twitter')?.url || '',
      'Facebook': contact.socialProfiles?.find(s => s.platform === 'facebook')?.url || '',
      'Instagram': contact.socialProfiles?.find(s => s.platform === 'instagram')?.url || '',
      'Xing': contact.socialProfiles?.find(s => s.platform === 'xing')?.url || '',
      
      // Personal info
      'Geburtstag': contact.personalInfo?.birthday ? 
        format(new Date(contact.personalInfo.birthday), dateFormat) : '',
      'Interessen': contact.personalInfo?.interests?.join(';') || '',
      
      // GDPR consents
      'GDPR Marketing': contact.gdprConsents?.find(c => c.purpose === 'Marketing')?.status === 'granted' ? 'ja' : 'nein',
      'GDPR Newsletter': contact.gdprConsents?.find(c => c.purpose === 'Newsletter')?.status === 'granted' ? 'ja' : 'nein',
      'GDPR Telefon': contact.gdprConsents?.find(c => c.purpose === 'Telefonische Kontaktaufnahme')?.status === 'granted' ? 'ja' : 'nein',
      
      'Notizen': contact.personalInfo?.notes || ''
    };

    // Optional fields
    if (includeIds) {
      row['ID'] = contact.id || '';
      row['Firma ID'] = contact.companyId || '';
    }

    if (includeTags && contact.tagIds) {
      const tagNames = contact.tagIds
        .map(tagId => tags.get(tagId)?.name)
        .filter(Boolean)
        .join(';');
      row['Tags'] = tagNames;
    }

    if (includeTimestamps) {
      row['Erstellt am'] = contact.createdAt ? 
        format(contact.createdAt.toDate(), dateFormat) : '';
      row['Aktualisiert am'] = contact.updatedAt ? 
        format(contact.updatedAt.toDate(), dateFormat) : '';
      row['Letzte Aktivität'] = contact.lastActivityAt ? 
        format(contact.lastActivityAt.toDate(), dateFormat) : '';
    }

    return row;
  });

  return Papa.unparse(data, {
    delimiter: ',',
    header: true,
    quotes: true
  });
}

/**
 * Downloads a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports companies with all related data (contacts, publications, etc.)
 * This creates a more comprehensive export for backup purposes
 */
export function exportCompaniesWithRelations(
  companies: CompanyEnhanced[],
  contacts: ContactEnhanced[],
  tags: Map<string, { name: string; color: string }>,
  options: ExportOptions = {}
): { companiesCSV: string; contactsCSV: string } {
  // Group contacts by company
  const contactsByCompany = new Map<string, ContactEnhanced[]>();
  contacts.forEach(contact => {
    if (contact.companyId) {
      const list = contactsByCompany.get(contact.companyId) || [];
      list.push(contact);
      contactsByCompany.set(contact.companyId, list);
    }
  });

  // Export companies with contact count
  const companiesWithStats = companies.map(company => ({
    ...company,
    _contactCount: contactsByCompany.get(company.id!)?.length || 0
  }));

  const companiesCSV = exportCompaniesToCSV(companiesWithStats, tags, options);
  
  // Export all contacts
  const companiesMap = new Map(
    companies.map(c => [c.id!, { name: c.name, type: c.type }])
  );
  const contactsCSV = exportContactsToCSV(contacts, companiesMap, tags, options);

  return { companiesCSV, contactsCSV };
}

/**
 * Creates a sample CSV file content
 */
export function createSampleCSV(type: 'companies' | 'contacts'): string {
  if (type === 'companies') {
    return `Firmenname*,Offizieller Firmenname,Handelsname,Typ*,Branche,Status,Lifecycle Stage,Rechtsform,Gründungsjahr,Website,Beschreibung,Interne Notizen,Straße,PLZ,Stadt,Bundesland,Land (ISO),Telefon 1,Telefon Typ 1,Telefon 2,Telefon Typ 2,E-Mail 1,E-Mail Typ 1,E-Mail 2,E-Mail Typ 2,USt-IdNr,Handelsregister,Jahresumsatz,Währung,Mitarbeiterzahl,Geschäftsjahresende,Muttergesellschaft,LinkedIn,Twitter,Facebook,Instagram,YouTube,Xing,Tags
Beispiel GmbH,Beispiel Gesellschaft mit beschränkter Haftung,Beispiel,Kunde,IT-Dienstleistungen,active,customer,GmbH,2010,https://www.beispiel.de,"Führender IT-Dienstleister in Deutschland","Wichtiger Kunde seit 2020",Musterstraße 123,10115,Berlin,Berlin,DE,+49 30 1234567,business,+49 171 1234567,mobile,info@beispiel.de,general,vertrieb@beispiel.de,sales,DE123456789,HRB 12345 Berlin,5000000,EUR,50,31.12.,,https://linkedin.com/company/beispiel,https://twitter.com/beispiel,,,,,Premium;Partner
Muster AG,Muster Aktiengesellschaft,,Lieferant,Handel,active,partner,AG,2005,https://www.muster-ag.de,,,Hauptstraße 1,80331,München,Bayern,DE,+49 89 9876543,business,,,kontakt@muster-ag.de,general,,,DE987654321,HRB 98765 München,10000000,EUR,100,31.03.,,https://linkedin.com/company/muster-ag,,,,,https://xing.com/companies/muster-ag,Wichtig
Test & Co. KG,,,Partner,Beratung,prospect,lead,KG,2015,,,Neue Partnerschaft in Verhandlung,Testweg 5,50667,Köln,NRW,DE,+49 221 5555555,business,,,info@test-co.de,general,,,,,1000000,EUR,10,31.12.,,,,,,,,Neu`;
  } else {
    return `Vorname*,Nachname*,Anrede,Titel,Position,Abteilung,Firma,Status,E-Mail Geschäftlich,E-Mail Privat,Telefon Geschäftlich,Telefon Mobil,Telefon Privat,Straße,PLZ,Stadt,Bundesland,Land (ISO),Bevorzugte Sprache,Ist Journalist,Publikationen,Ressorts,Bevorzugter Kanal,Website,LinkedIn,Twitter,Facebook,Instagram,Xing,Geburtstag,Interessen,GDPR Marketing,GDPR Newsletter,GDPR Telefon,Tags,Notizen
Max,Mustermann,Herr,Dr.,Geschäftsführer,Geschäftsleitung,Beispiel GmbH,active,max.mustermann@beispiel.de,,+49 30 1234567,+49 171 1234567,,"Musterstraße 123",10115,Berlin,Berlin,DE,de,nein,,,email,https://www.max-mustermann.de,https://linkedin.com/in/max-mustermann,,,,https://xing.com/profile/max-mustermann,15.05.1975,"Golf, Technologie",ja,ja,nein,VIP;Entscheider,"Bevorzugt Kontakt per E-Mail"
Anna,Schmidt,Frau,,Einkaufsleiterin,Einkauf,Muster AG,active,a.schmidt@muster-ag.de,anna.schmidt@gmail.com,+49 89 9876543,+49 172 9876543,,"Hauptstraße 1",80331,München,Bayern,DE,de,nein,,,phone,,https://linkedin.com/in/anna-schmidt,,,,,,"Reisen, Kunst",ja,nein,ja,Einkauf,"Beste Erreichbarkeit vormittags"
Peter,Müller,Herr,Prof.,Chefredakteur,Redaktion,Tech Magazin,active,p.mueller@tech-magazin.de,,+49 40 5555555,+49 170 5555555,,,,Hamburg,Hamburg,DE,de,ja,"Tech Magazin","IT, KI, Startups",email,,https://linkedin.com/in/peter-mueller-journalist,https://twitter.com/pmueller_tech,,,,,Technologie,nein,ja,nein,Journalist;Multiplikator,"Deadline: Immer Mittwochs 15 Uhr"`;
  }
}