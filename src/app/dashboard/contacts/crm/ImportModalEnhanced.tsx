// src/app/dashboard/contacts/crm/ImportModalEnhanced.tsx
"use client";

import { useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { Badge } from '@/components/badge';
import { Field, Label, FieldGroup } from '@/components/fieldset';
import { Checkbox } from '@/components/checkbox';
import Papa from 'papaparse';
import { companiesEnhancedService, contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { CompanyEnhanced, ContactEnhanced, COMPANY_STATUS_OPTIONS, LIFECYCLE_STAGE_OPTIONS, CONTACT_STATUS_OPTIONS } from '@/types/crm-enhanced';
import { CompanyType, companyTypeLabels } from '@/types/crm';
import { useAuth } from '@/context/AuthContext';
import {
  InformationCircleIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  UserIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon
} from '@heroicons/react/20/solid';
import { CountryCode, CurrencyCode, LanguageCode } from '@/types/international';
import clsx from 'clsx';

// Tab type
type ImportTab = 'companies' | 'contacts';

// Import result type
interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; error: string }[];
  warnings: { row: number; warning: string }[];
}

// Import progress type
interface ImportProgress {
  current: number;
  total: number;
  status: 'parsing' | 'validating' | 'importing' | 'done';
}

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message,
  action
}: { 
  type?: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    error: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${
            type === 'error' ? 'text-red-400' : 
            type === 'success' ? 'text-green-400' : 
            type === 'warning' ? 'text-amber-400' :
            'text-blue-400'
          }`} />
        </div>
        <div className="ml-3 flex-1">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
          {action && (
            <div className="mt-2">
              <button
                onClick={action.onClick}
                className={`text-sm font-medium ${styles[type].split(' ')[1]} hover:opacity-80`}
              >
                {action.label} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ progress }: { progress: ImportProgress }) {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  
  const statusText = {
    parsing: 'Datei wird gelesen...',
    validating: 'Daten werden validiert...',
    importing: `Importiere ${progress.current} von ${progress.total}...`,
    done: 'Import abgeschlossen!'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{statusText[progress.status]}</span>
        <span className="text-gray-500">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className={clsx(
            "h-full transition-all duration-300",
            progress.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface ImportModalEnhancedProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ImportModalEnhanced({ onClose, onImportSuccess }: ImportModalEnhancedProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ImportTab>('companies');
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update'>('skip');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample CSV templates
  // Helper function to parse dates safely
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Clean the date string
    dateStr = dateStr.trim();
    
    // Try different date formats
    const formats = [
      /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // D.M.YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let day, month, year;
        if (format === formats[2]) {
          // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1; // JS months are 0-based
          day = parseInt(match[3]);
        } else if (format === formats[3]) {
          // DD/MM/YYYY format
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          year = parseInt(match[3]);
        } else {
          // DD.MM.YYYY format
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1; // JS months are 0-based
          year = parseInt(match[3]);
        }
        
        // Validate the values
        if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
          return null;
        }
        
        const date = new Date(year, month, day);
        // Validate the date
        if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date;
        }
      }
    }
    
    return null; // Return null instead of undefined
  };

  const companySampleCSV = `Firmenname*,Offizieller Firmenname,Handelsname,Typ*,Branche,Status,Lifecycle Stage,Rechtsform,Gründungsjahr,Website,Beschreibung,Interne Notizen,Straße,PLZ,Stadt,Bundesland,Land (ISO),Telefon 1,Telefon Typ 1,Telefon 2,Telefon Typ 2,E-Mail 1,E-Mail Typ 1,E-Mail 2,E-Mail Typ 2,USt-IdNr,Handelsregister,Jahresumsatz,Währung,Mitarbeiterzahl,Geschäftsjahresende,Muttergesellschaft,LinkedIn,Twitter,Facebook,Instagram,YouTube,Xing,Tags
Beispiel GmbH,Beispiel Gesellschaft mit beschränkter Haftung,Beispiel,Kunde,IT-Dienstleistungen,active,customer,GmbH,2010,https://www.beispiel.de,"Führender IT-Dienstleister in Deutschland","Wichtiger Kunde seit 2020",Musterstraße 123,10115,Berlin,Berlin,DE,+49 30 1234567,business,+49 171 1234567,mobile,info@beispiel.de,general,vertrieb@beispiel.de,sales,DE123456789,HRB 12345 Berlin,5000000,EUR,50,31.12.,,https://linkedin.com/company/beispiel,https://twitter.com/beispiel,,,,,Premium;Partner
Muster AG,Muster Aktiengesellschaft,,Lieferant,Handel,active,partner,AG,2005,https://www.muster-ag.de,,,Hauptstraße 1,80331,München,Bayern,DE,+49 89 9876543,business,,,kontakt@muster-ag.de,general,,,DE987654321,HRB 98765 München,10000000,EUR,100,31.03.,,https://linkedin.com/company/muster-ag,,,,,https://xing.com/companies/muster-ag,Wichtig
Test & Co. KG,,,Partner,Beratung,prospect,lead,KG,2015,,,Neue Partnerschaft in Verhandlung,Testweg 5,50667,Köln,NRW,DE,+49 221 5555555,business,,,info@test-co.de,general,,,,,1000000,EUR,10,31.12.,,,,,,,,Neu`;

  const contactSampleCSV = `Vorname*,Nachname*,Anrede,Titel,Position,Abteilung,Firma,Status,E-Mail Geschäftlich,E-Mail Privat,Telefon Geschäftlich,Telefon Mobil,Telefon Privat,Straße,PLZ,Stadt,Bundesland,Land (ISO),Bevorzugte Sprache,Ist Journalist,Publikationen,Ressorts,Bevorzugter Kanal,Website,LinkedIn,Twitter,Facebook,Instagram,Xing,Geburtstag,Interessen,GDPR Marketing,GDPR Newsletter,GDPR Telefon,Tags,Notizen
Max,Mustermann,Herr,Dr.,Geschäftsführer,Geschäftsleitung,Beispiel GmbH,active,max.mustermann@beispiel.de,,+49 30 1234567,+49 171 1234567,,"Musterstraße 123",10115,Berlin,Berlin,DE,de,nein,,,email,https://www.max-mustermann.de,https://linkedin.com/in/max-mustermann,,,,https://xing.com/profile/max-mustermann,15.05.1975,"Golf, Technologie",ja,ja,nein,VIP;Entscheider,"Bevorzugt Kontakt per E-Mail"
Anna,Schmidt,Frau,,Einkaufsleiterin,Einkauf,Muster AG,active,a.schmidt@muster-ag.de,anna.schmidt@gmail.com,+49 89 9876543,+49 172 9876543,,"Hauptstraße 1",80331,München,Bayern,DE,de,nein,,,phone,,https://linkedin.com/in/anna-schmidt,,,,,,"Reisen, Kunst",ja,nein,ja,Einkauf,"Beste Erreichbarkeit vormittags"
Peter,Müller,Herr,Prof.,Chefredakteur,Redaktion,Tech Magazin,active,p.mueller@tech-magazin.de,,+49 40 5555555,+49 170 5555555,,,,Hamburg,Hamburg,DE,de,ja,"Tech Magazin","IT, KI, Startups",email,,https://linkedin.com/in/peter-mueller-journalist,https://twitter.com/pmueller_tech,,,,,Technologie,nein,ja,nein,Journalist;Multiplikator,"Deadline: Immer Mittwochs 15 Uhr"`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError('');
      setImportResult(null);
      setImportProgress(null);
      
      // Preview first 5 rows
      Papa.parse(selectedFile, {
        header: true,
        preview: 5,
        complete: (results) => {
          setPreviewData(results.data);
        }
      });
    }
  };

  const downloadTemplate = () => {
    const template = activeTab === 'companies' ? companySampleCSV : contactSampleCSV;
    const filename = activeTab === 'companies' ? 'firmen-import-vorlage.csv' : 'kontakte-import-vorlage.csv';
    
    const blob = new Blob([`\uFEFF${template}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCompanyRow = (row: any): Partial<CompanyEnhanced> => {
    const company: Partial<CompanyEnhanced> = {
      // Basic fields
      name: row["Firmenname*"] || row["Firmenname"],
      officialName: row["Offizieller Firmenname"] || row["Firmenname*"] || row["Firmenname"],
      tradingName: row["Handelsname"],
      type: mapCompanyType(row["Typ*"] || row["Typ"]),
      website: row["Website"],
      description: row["Beschreibung"],
      internalNotes: row["Interne Notizen"],
      
      // Status
      status: mapCompanyStatus(row["Status"]),
      lifecycleStage: mapLifecycleStage(row["Lifecycle Stage"]),
      
      // Legal
      legalForm: row["Rechtsform"],
      foundedDate: row["Gründungsjahr"] ? new Date(row["Gründungsjahr"], 0, 1) : undefined,
      
      // Address
      mainAddress: row["Straße"] || row["PLZ"] || row["Stadt"] ? {
        street: row["Straße"] || '',
        postalCode: row["PLZ"] || '',
        city: row["Stadt"] || '',
        region: row["Bundesland"] || '',
        countryCode: (row["Land (ISO)"] || 'DE') as CountryCode
      } : undefined,
      
      // Industry
      industryClassification: row["Branche"] ? {
        primary: row["Branche"]
      } : undefined,
      
      // Financial
      financial: {
        annualRevenue: row["Jahresumsatz"] ? {
          amount: parseFloat(row["Jahresumsatz"]),
          currency: (row["Währung"] || 'EUR') as CurrencyCode
        } : undefined,
        employees: row["Mitarbeiterzahl"] ? parseInt(row["Mitarbeiterzahl"]) : undefined,
        fiscalYearEnd: row["Geschäftsjahresende"]
      },
      
      // Arrays
      phones: [],
      emails: [],
      identifiers: [],
      socialMedia: []
    };

    // Parse phones
    if (row["Telefon 1"]) {
      company.phones!.push({
        type: mapPhoneType(row["Telefon Typ 1"]) || 'business',
        number: row["Telefon 1"],
        isPrimary: true
      });
    }
    if (row["Telefon 2"]) {
      company.phones!.push({
        type: mapPhoneType(row["Telefon Typ 2"]) || 'business',
        number: row["Telefon 2"],
        isPrimary: false
      });
    }

    // Parse emails
    if (row["E-Mail 1"]) {
      company.emails!.push({
        type: mapEmailType(row["E-Mail Typ 1"]) || 'general',
        email: row["E-Mail 1"],
        isPrimary: true
      });
    }
    if (row["E-Mail 2"]) {
      company.emails!.push({
        type: mapEmailType(row["E-Mail Typ 2"]) || 'general',
        email: row["E-Mail 2"],
        isPrimary: false
      });
    }

    // Parse identifiers
    if (row["USt-IdNr"]) {
      company.identifiers!.push({
        type: 'VAT_EU',
        value: row["USt-IdNr"],
        issuingAuthority: 'DE'
      });
    }
    if (row["Handelsregister"]) {
      company.identifiers!.push({
        type: 'COMPANY_REG_DE',
        value: row["Handelsregister"],
        issuingAuthority: 'DE'
      });
    }

    // Parse social media
    const socialPlatforms = ['LinkedIn', 'Twitter', 'Facebook', 'Instagram', 'YouTube', 'Xing'];
    socialPlatforms.forEach(platform => {
      if (row[platform]) {
        company.socialMedia!.push({
          platform: platform.toLowerCase() as any,
          url: row[platform]
        });
      }
    });

    // Clean up empty arrays/objects
    if (company.phones?.length === 0) delete company.phones;
    if (company.emails?.length === 0) delete company.emails;
    if (company.identifiers?.length === 0) delete company.identifiers;
    if (company.socialMedia?.length === 0) delete company.socialMedia;
    if (!company.financial?.annualRevenue && !company.financial?.employees && !company.financial?.fiscalYearEnd) {
      delete company.financial;
    }

    return company;
  };

  const parseContactRow = (row: any): Partial<ContactEnhanced> => {
    const contact: Partial<ContactEnhanced> = {
      // Name
      name: {
        salutation: row["Anrede"],
        title: row["Titel"],
        firstName: row["Vorname*"] || row["Vorname"],
        lastName: row["Nachname*"] || row["Nachname"]
      },
      displayName: `${row["Vorname*"] || row["Vorname"]} ${row["Nachname*"] || row["Nachname"]}`,
      
      // Professional
      position: row["Position"],
      department: row["Abteilung"],
      companyName: row["Firma"],
      
      // Status
      status: mapContactStatus(row["Status"]),
      
      // Arrays
      emails: [],
      phones: [],
      addresses: [],
      socialProfiles: [],
      
      // Communication preferences
      communicationPreferences: row["Bevorzugter Kanal"] ? {
        preferredChannel: mapCommunicationChannel(row["Bevorzugter Kanal"]),
        preferredLanguage: (row["Bevorzugte Sprache"] || 'de') as LanguageCode
      } : undefined,
      
      // Personal info - only create if there's actual data
      personalInfo: (row["Geburtstag"] || row["Interessen"] || row["Notizen"]) ? (() => {
        const info: any = {};
        const parsedDate = parseDate(row["Geburtstag"]);
        if (parsedDate) {
          info.birthday = parsedDate;
        }
        if (row["Interessen"]) {
          const interests = row["Interessen"].split(';').map((i: string) => i.trim()).filter((i: string) => i.length > 0);
          if (interests.length > 0) {
            info.interests = interests;
          }
        }
        if (row["Notizen"] && row["Notizen"].trim()) {
          info.notes = row["Notizen"].trim();
        }
        return Object.keys(info).length > 0 ? info : null;
      })() : null
    };

    // Parse emails
    if (row["E-Mail Geschäftlich"]) {
      contact.emails!.push({
        type: 'business',
        email: row["E-Mail Geschäftlich"],
        isPrimary: true
      });
    }
    if (row["E-Mail Privat"]) {
      contact.emails!.push({
        type: 'private',
        email: row["E-Mail Privat"],
        isPrimary: false
      });
    }

    // Parse phones
    if (row["Telefon Geschäftlich"]) {
      contact.phones!.push({
        type: 'business',
        number: row["Telefon Geschäftlich"],
        isPrimary: true
      });
    }
    if (row["Telefon Mobil"]) {
      contact.phones!.push({
        type: 'mobile',
        number: row["Telefon Mobil"],
        isPrimary: false
      });
    }
    if (row["Telefon Privat"]) {
      contact.phones!.push({
        type: 'private',
        number: row["Telefon Privat"],
        isPrimary: false
      });
    }

    // Parse address
    if (row["Straße"] || row["PLZ"] || row["Stadt"]) {
      contact.addresses!.push({
        type: 'business',
        address: {
          street: row["Straße"] || '',
          postalCode: row["PLZ"] || '',
          city: row["Stadt"] || '',
          region: row["Bundesland"] || '',
          countryCode: (row["Land (ISO)"] || 'DE') as CountryCode
        }
      });
    }

    // Parse journalist info
    if (row["Ist Journalist"] === 'ja' || row["Ist Journalist"] === 'true') {
      contact.mediaProfile = {
        isJournalist: true,
        publicationIds: [], // Would need to map to actual IDs
        beats: row["Ressorts"] ? row["Ressorts"].split(';').map((b: string) => b.trim()) : []
      };
    }

    // Parse social profiles
    const socialPlatforms = ['Website', 'LinkedIn', 'Twitter', 'Facebook', 'Instagram', 'Xing'];
    socialPlatforms.forEach(platform => {
      if (row[platform]) {
        contact.socialProfiles!.push({
          platform: platform === 'Website' ? 'website' : platform.toLowerCase(),
          url: row[platform]
        });
      }
    });

    // Parse GDPR consents
    contact.gdprConsents = [];
    if (row["GDPR Marketing"]) {
      contact.gdprConsents.push({
        id: `consent_marketing_${Date.now()}`,
        purpose: 'Marketing',
        status: row["GDPR Marketing"] === 'ja' ? 'granted' : 'revoked',
        method: 'import',
        legalBasis: 'consent',
        informationProvided: 'Imported from CSV',
        privacyPolicyVersion: '1.0'
      });
    }
    if (row["GDPR Newsletter"]) {
      contact.gdprConsents.push({
        id: `consent_newsletter_${Date.now()}`,
        purpose: 'Newsletter',
        status: row["GDPR Newsletter"] === 'ja' ? 'granted' : 'revoked',
        method: 'import',
        legalBasis: 'consent',
        informationProvided: 'Imported from CSV',
        privacyPolicyVersion: '1.0'
      });
    }
    if (row["GDPR Telefon"]) {
      contact.gdprConsents.push({
        id: `consent_phone_${Date.now()}`,
        purpose: 'Telefonische Kontaktaufnahme',
        status: row["GDPR Telefon"] === 'ja' ? 'granted' : 'revoked',
        method: 'import',
        legalBasis: 'consent',
        informationProvided: 'Imported from CSV',
        privacyPolicyVersion: '1.0'
      });
    }

    // Clean up empty objects/arrays to avoid Firebase errors
    if (contact.phones?.length === 0) delete contact.phones;
    if (contact.emails?.length === 0) delete contact.emails;
    if (contact.addresses?.length === 0) delete contact.addresses;
    if (contact.socialProfiles?.length === 0) delete contact.socialProfiles;
    if (contact.gdprConsents?.length === 0) delete contact.gdprConsents;
    
    // Clean up personalInfo - remove undefined fields
    if (contact.personalInfo) {
      const cleanedPersonalInfo: any = {};
      if (contact.personalInfo.birthday !== undefined) {
        cleanedPersonalInfo.birthday = contact.personalInfo.birthday;
      }
      if (contact.personalInfo.birthplace !== undefined) {
        cleanedPersonalInfo.birthplace = contact.personalInfo.birthplace;
      }
      if (contact.personalInfo.nationality !== undefined) {
        cleanedPersonalInfo.nationality = contact.personalInfo.nationality;
      }
      if (contact.personalInfo.languages !== undefined && contact.personalInfo.languages.length > 0) {
        cleanedPersonalInfo.languages = contact.personalInfo.languages;
      }
      if (contact.personalInfo.interests !== undefined && contact.personalInfo.interests.length > 0) {
        cleanedPersonalInfo.interests = contact.personalInfo.interests;
      }
      if (contact.personalInfo.notes !== undefined && contact.personalInfo.notes !== '') {
        cleanedPersonalInfo.notes = contact.personalInfo.notes;
      }
      
      // Only keep personalInfo if it has at least one field
      if (Object.keys(cleanedPersonalInfo).length > 0) {
        contact.personalInfo = cleanedPersonalInfo;
      } else {
        delete contact.personalInfo;
      }
    }
    
    // Clean up communicationPreferences
    if (contact.communicationPreferences) {
      const cleanedPrefs: any = {};
      if (contact.communicationPreferences.preferredChannel !== undefined) {
        cleanedPrefs.preferredChannel = contact.communicationPreferences.preferredChannel;
      }
      if (contact.communicationPreferences.preferredLanguage !== undefined) {
        cleanedPrefs.preferredLanguage = contact.communicationPreferences.preferredLanguage;
      }
      
      if (Object.keys(cleanedPrefs).length > 0) {
        contact.communicationPreferences = cleanedPrefs;
      } else {
        delete contact.communicationPreferences;
      }
    }

    return contact;
  };

  // Helper mapping functions
  const mapCompanyType = (type: string): CompanyType => {
    const typeMap: Record<string, CompanyType> = {
      'kunde': 'customer',
      'lieferant': 'supplier',
      'partner': 'partner',
      'verlag': 'publisher',
      'medienhaus': 'media_house',
      'agentur': 'agency',
      'sonstiges': 'other'
    };
    return typeMap[type?.toLowerCase()] || 'other';
  };

  const mapCompanyStatus = (status: string): CompanyEnhanced['status'] => {
    const statusMap: Record<string, CompanyEnhanced['status']> = {
      'prospect': 'prospect',
      'active': 'active',
      'aktiv': 'active',
      'inactive': 'inactive',
      'inaktiv': 'inactive',
      'archived': 'archived',
      'archiviert': 'archived'
    };
    return statusMap[status?.toLowerCase()] || 'active';
  };

  const mapLifecycleStage = (stage: string): CompanyEnhanced['lifecycleStage'] => {
    const stageMap: Record<string, CompanyEnhanced['lifecycleStage']> = {
      'lead': 'lead',
      'opportunity': 'opportunity',
      'customer': 'customer',
      'kunde': 'customer',
      'partner': 'partner',
      'former': 'former',
      'ehemalig': 'former'
    };
    return stageMap[stage?.toLowerCase()] || 'lead';
  };

  const mapContactStatus = (status: string): ContactEnhanced['status'] => {
    const statusMap: Record<string, ContactEnhanced['status']> = {
      'active': 'active',
      'aktiv': 'active',
      'inactive': 'inactive',
      'inaktiv': 'inactive',
      'unsubscribed': 'unsubscribed',
      'abgemeldet': 'unsubscribed',
      'bounced': 'bounced',
      'unzustellbar': 'bounced',
      'archived': 'archived',
      'archiviert': 'archived'
    };
    return statusMap[status?.toLowerCase()] || 'active';
  };

  const mapPhoneType = (type: string): 'business' | 'mobile' | 'fax' | 'private' | 'other' => {
    const typeMap: Record<string, any> = {
      'geschäftlich': 'business',
      'business': 'business',
      'mobil': 'mobile',
      'mobile': 'mobile',
      'fax': 'fax',
      'privat': 'private',
      'private': 'private'
    };
    return typeMap[type?.toLowerCase()] || 'other';
  };

  const mapEmailType = (type: string): 'general' | 'support' | 'sales' | 'billing' | 'press' => {
    const typeMap: Record<string, any> = {
      'allgemein': 'general',
      'general': 'general',
      'support': 'support',
      'vertrieb': 'sales',
      'sales': 'sales',
      'buchhaltung': 'billing',
      'billing': 'billing',
      'presse': 'press',
      'press': 'press'
    };
    return typeMap[type?.toLowerCase()] || 'general';
  };

  const mapCommunicationChannel = (channel: string): 'email' | 'phone' | 'messaging' | 'mail' | undefined => {
    const channelMap: Record<string, 'email' | 'phone' | 'messaging' | 'mail'> = {
      'email': 'email',
      'e-mail': 'email',
      'telefon': 'phone',
      'phone': 'phone',
      'messaging': 'messaging',
      'post': 'mail',
      'mail': 'mail'
    };
    return channelMap[channel?.toLowerCase()];
  };

  const handleImport = async () => {
    if (!file || !user) return;
    
    setIsImporting(true);
    setError('');
    setImportResult(null);
    
    // Start progress
    setImportProgress({
      current: 0,
      total: 0,
      status: 'parsing'
    });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const totalRows = results.data.length;
          setImportProgress({
            current: 0,
            total: totalRows,
            status: 'validating'
          });

          if (activeTab === 'companies') {
            // Parse company data
            const companies: Partial<CompanyEnhanced>[] = [];
            const parseErrors: { row: number; error: string }[] = [];
            
            results.data.forEach((row: any, index: number) => {
              try {
                if (!row["Firmenname*"] && !row["Firmenname"]) {
                  parseErrors.push({
                    row: index + 2,
                    error: 'Firmenname fehlt'
                  });
                  return;
                }
                
                const company = parseCompanyRow(row);
                
                // Parse tags
                if (row["Tags"]) {
                  // For now, we'll store tag names - in production, these would need to be mapped to tag IDs
                  (company as any).tagNames = row["Tags"].split(';').map((t: string) => t.trim());
                }
                
                companies.push(company);
              } catch (err) {
                parseErrors.push({
                  row: index + 2,
                  error: err instanceof Error ? err.message : 'Parsing-Fehler'
                });
              }
            });

            if (companies.length === 0 && parseErrors.length > 0) {
              setError(`Import fehlgeschlagen. ${parseErrors.length} Fehler gefunden.`);
              setImportResult({
                created: 0,
                updated: 0,
                skipped: 0,
                errors: parseErrors,
                warnings: []
              });
              return;
            }

            // Import companies
            setImportProgress({
              current: 0,
              total: companies.length,
              status: 'importing'
            });

            const result = await companiesEnhancedService.import(
              companies,
              { organizationId: user.uid, userId: user.uid },
              {
                duplicateCheck: true,
                updateExisting: duplicateHandling === 'update'
              }
            );

            // Add parse errors to result
            result.errors = [...parseErrors, ...result.errors];
            result.warnings = result.warnings || [];

            setImportResult(result);
            setImportProgress({
              current: companies.length,
              total: companies.length,
              status: 'done'
            });

            if (result.created > 0 || result.updated > 0) {
              setTimeout(() => {
                onImportSuccess();
                onClose();
              }, 2000);
            }
          } else {
            // Parse contact data
            const contacts: Partial<ContactEnhanced>[] = [];
            const parseErrors: { row: number; error: string }[] = [];
            
            results.data.forEach((row: any, index: number) => {
              try {
                if (!row["Vorname*"] && !row["Vorname"]) {
                  parseErrors.push({
                    row: index + 2,
                    error: 'Vorname fehlt'
                  });
                  return;
                }
                if (!row["Nachname*"] && !row["Nachname"]) {
                  parseErrors.push({
                    row: index + 2,
                    error: 'Nachname fehlt'
                  });
                  return;
                }
                
                const contact = parseContactRow(row);
                
                // Parse tags
                if (row["Tags"]) {
                  // For now, we'll store tag names - in production, these would need to be mapped to tag IDs
                  (contact as any).tagNames = row["Tags"].split(';').map((t: string) => t.trim());
                }
                
                contacts.push(contact);
              } catch (err) {
                parseErrors.push({
                  row: index + 2,
                  error: err instanceof Error ? err.message : 'Parsing-Fehler'
                });
              }
            });

            if (contacts.length === 0 && parseErrors.length > 0) {
              setError(`Import fehlgeschlagen. ${parseErrors.length} Fehler gefunden.`);
              setImportResult({
                created: 0,
                updated: 0,
                skipped: 0,
                errors: parseErrors,
                warnings: []
              });
              return;
            }

            // Import contacts
            setImportProgress({
              current: 0,
              total: contacts.length,
              status: 'importing'
            });

            const result = await contactsEnhancedService.import(
              contacts,
              { organizationId: user.uid, userId: user.uid },
              {
                duplicateCheck: true,
                updateExisting: duplicateHandling === 'update'
              }
            );

            // Add parse errors to result
            result.errors = [...parseErrors, ...result.errors];
            result.warnings = result.warnings || [];

            setImportResult(result);
            setImportProgress({
              current: contacts.length,
              total: contacts.length,
              status: 'done'
            });

            if (result.created > 0 || result.updated > 0) {
              setTimeout(() => {
                onImportSuccess();
                onClose();
              }, 2000);
            }
          }
        } catch (err) {
          console.error("Import error:", err);
          setError("Ein Fehler ist aufgetreten. Bitte überprüfen Sie das Dateiformat.");
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        setError(`Fehler beim Lesen der Datei: ${error.message}`);
        setIsImporting(false);
      }
    });
  };

  const resetImport = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setImportProgress(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="5xl">
      <DialogTitle className="px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Daten importieren</span>
          <div className="flex items-center gap-2">
            <Badge color="blue">{file ? '1 Datei ausgewählt' : 'Keine Datei'}</Badge>
          </div>
        </div>
      </DialogTitle>
      
      <DialogBody className="p-0">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              disabled={isImporting}
              className={clsx(
                'group inline-flex items-center border-b-2 px-6 py-4 text-sm font-medium transition-colors flex-1',
                activeTab === 'companies'
                  ? 'border-[#005fab] text-[#005fab]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              <BuildingOfficeIcon
                className={clsx(
                  'mr-2 h-5 w-5',
                  activeTab === 'companies' ? 'text-[#005fab]' : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              Firmen importieren
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab('contacts')}
              disabled={isImporting}
              className={clsx(
                'group inline-flex items-center border-b-2 px-6 py-4 text-sm font-medium transition-colors flex-1',
                activeTab === 'contacts'
                  ? 'border-[#005fab] text-[#005fab]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              <UserIcon
                className={clsx(
                  'mr-2 h-5 w-5',
                  activeTab === 'contacts' ? 'text-[#005fab]' : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              Kontakte importieren
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {!importResult ? (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex">
                  <div className="shrink-0">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <Text className="text-sm font-medium text-blue-800">
                      {activeTab === 'companies' ? 'Firmen-Import' : 'Kontakte-Import'}
                    </Text>
                    <Text className="mt-1 text-sm text-blue-700">
                      Laden Sie eine CSV-Datei hoch, um {activeTab === 'companies' ? 'Firmen' : 'Kontakte'} zu importieren.
                      Die Datei sollte UTF-8 kodiert sein und Semikolon (;) oder Komma (,) als Trennzeichen verwenden.
                    </Text>
                    <div className="mt-2">
                      <button
                        onClick={downloadTemplate}
                        className="text-sm font-medium text-blue-800 hover:text-blue-900"
                      >
                        <DocumentArrowDownIcon className="inline h-4 w-4 mr-1" />
                        Vorlage herunterladen
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <FieldGroup>
                <Field>
                  <Label>Duplikate-Behandlung</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="skip"
                        checked={duplicateHandling === 'skip'}
                        onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update')}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm">Duplikate überspringen</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="update"
                        checked={duplicateHandling === 'update'}
                        onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update')}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm">Bestehende Einträge aktualisieren</span>
                    </label>
                  </div>
                </Field>
              </FieldGroup>

              {/* File Upload */}
              <div>
                <h3 className="block text-sm font-medium text-gray-700 mb-2">
                  CSV-Datei auswählen
                </h3>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ArrowUpTrayIcon className="w-8 h-8 mb-3 text-gray-400" />
                      <Text className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Klicken Sie hier</span> oder ziehen Sie eine Datei hierher
                      </Text>
                      <Text className="text-xs text-gray-500">CSV-Datei (max. 10MB)</Text>
                    </div>
                    <input 
                      ref={fileInputRef}
                      id="file-upload" 
                      type="file" 
                      accept=".csv" 
                      onChange={handleFileChange} 
                      className="hidden" 
                      disabled={isImporting}
                    />
                  </label>
                </div>
                {file && (
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>Ausgewählte Datei: <span className="font-medium">{file.name}</span></span>
                    <Button plain onClick={resetImport}>
                      Zurücksetzen
                    </Button>
                  </div>
                )}
              </div>

              {/* Preview */}
              {previewData.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Vorschau (erste 5 Zeilen)</h3>
                  <div className="mt-2 overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(previewData[0]).slice(0, 5).map((key) => (
                            <th
                              key={key}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {key}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                            ...
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).slice(0, 5).map((value: any, i) => (
                              <td key={i} className="px-3 py-2 text-sm text-gray-900">
                                {value || '—'}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center text-sm text-gray-400">
                              ...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Progress */}
              {importProgress && (
                <ProgressBar progress={importProgress} />
              )}

              {/* Error */}
              {error && (
                <Alert type="error" message={error} />
              )}
            </div>
          ) : (
            // Import Results
            <div className="space-y-6">
              <div className="text-center py-8">
                {importResult.errors.length === 0 ? (
                  <>
                    <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold">Import erfolgreich!</h3>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                    <h3 className="text-lg font-semibold">Import mit Warnungen abgeschlossen</h3>
                  </>
                )}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                  <div className="text-sm text-green-600">Neu erstellt</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
                  <div className="text-sm text-blue-600">Aktualisiert</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-700">{importResult.skipped}</div>
                  <div className="text-sm text-gray-600">Übersprungen</div>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                    <Text className="font-medium text-red-800">
                      {importResult.errors.length} Fehler gefunden
                    </Text>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <Text key={index} className="text-sm text-red-700">
                        Zeile {error.row}: {error.error}
                      </Text>
                    ))}
                    {importResult.errors.length > 10 && (
                      <Text className="text-sm text-red-700 font-medium">
                        ... und {importResult.errors.length - 10} weitere Fehler
                      </Text>
                    )}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {importResult.warnings && importResult.warnings.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 mr-2" />
                    <Text className="font-medium text-amber-800">
                      {importResult.warnings.length} Warnungen
                    </Text>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.warnings.slice(0, 10).map((warning, index) => (
                      <Text key={index} className="text-sm text-amber-700">
                        Zeile {warning.row}: {warning.warning}
                      </Text>
                    ))}
                    {importResult.warnings.length > 10 && (
                      <Text className="text-sm text-amber-700 font-medium">
                        ... und {importResult.warnings.length - 10} weitere Warnungen
                      </Text>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button plain onClick={resetImport}>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Neuen Import starten
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogBody>
      
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>
          {importResult ? 'Schließen' : 'Abbrechen'}
        </Button>
        {!importResult && (
          <Button 
            onClick={handleImport} 
            disabled={!file || isImporting}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {isImporting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Importiere...
              </>
            ) : (
              'Import starten'
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}