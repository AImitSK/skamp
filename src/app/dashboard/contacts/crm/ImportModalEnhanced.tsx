// src/app/dashboard/contacts/crm/ImportModalEnhanced.tsx
"use client";

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { companiesEnhancedService, contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { CompanyEnhanced, ContactEnhanced, COMPANY_STATUS_OPTIONS, LIFECYCLE_STAGE_OPTIONS, CONTACT_STATUS_OPTIONS } from '@/types/crm-enhanced';
import { CompanyType, companyTypeLabels } from '@/types/crm';
import { ImportResult, ImportProgress, ImportTab, ImportModalEnhancedProps } from '@/types/crm-enhanced-ui';
import { CSV_MAX_FILE_SIZE, CSV_CHUNK_SIZE, STATUS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants/crm-constants';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';
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
} from '@heroicons/react/24/outline';
import { CountryCode, CurrencyCode, LanguageCode } from '@/types/international';
import clsx from 'clsx';

// Typen sind jetzt in @/types/crm-enhanced-ui.ts definiert

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
function ProgressBar({ progress, t }: { progress: ImportProgress; t: any }) {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  const getStatusText = () => {
    switch (progress.status) {
      case 'parsing':
        return t('progress.parsing');
      case 'validating':
        return t('progress.validating');
      case 'importing':
        return t('progress.importing', { current: progress.current, total: progress.total });
      case 'done':
        return t('progress.done');
      default:
        return '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{getStatusText()}</span>
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

// Props Interface ist jetzt in @/types/crm-enhanced-ui.ts definiert

interface Props {
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ImportModalEnhanced({ onClose, onImportSuccess }: Props) {
  const t = useTranslations('crm.importModal');
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { autoGlobalMode } = useAutoGlobal();
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
// Helper function to parse dates
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr || dateStr.trim() === '') return undefined;
    
    // Try different date formats
    const formats = [
      /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // D.M.YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
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
        } else {
          // DD.MM.YYYY format
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1; // JS months are 0-based
          year = parseInt(match[3]);
        }
        
        const date = new Date(year, month, day);
        // Validate the date
        if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date;
        }
      }
    }
    
    // Try native parsing as last resort
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  };

  // Helper function to clean undefined values from objects
  const cleanObject = (obj: any): any => {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          const cleanedValue = cleanObject(value);
          if (Object.keys(cleanedValue).length > 0) {
            cleaned[key] = cleanedValue;
          }
        } else if (Array.isArray(value) && value.length > 0) {
          cleaned[key] = value;
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  };

  const companySampleCSV = `Firmenname*;Offizieller Firmenname;Handelsname;Typ*;Branche;Status;Rechtsform;Gründungsdatum;Website;Beschreibung;Straße;PLZ;Stadt;Bundesland;Land (ISO);Telefon 1 Typ;Telefon 1 Land;Telefon 1 Nummer;Telefon 1 Primär;Telefon 2 Typ;Telefon 2 Land;Telefon 2 Nummer;Telefon 2 Primär;E-Mail 1 Typ;E-Mail 1 Adresse;E-Mail 1 Primär;E-Mail 2 Typ;E-Mail 2 Adresse;E-Mail 2 Primär;Kennung 1 Typ;Kennung 1 Wert;Kennung 1 Behörde;Kennung 2 Typ;Kennung 2 Wert;Kennung 2 Behörde;Jahresumsatz;Währung;Mitarbeiterzahl;Geschäftsjahresende;Kreditrating;LinkedIn;Twitter;Facebook;Instagram;YouTube;Xing;Tags
TechVision GmbH;TechVision Gesellschaft mit beschränkter Haftung;TechVision;customer;IT & Software;active;GmbH;2015-03-15;https://www.techvision.de;Innovativer Anbieter für KI-gestützte Unternehmenslösungen mit Fokus auf mittelständische Betriebe;Innovationsstraße 42;10115;Berlin;Berlin;DE;business;DE;30 98765432;ja;mobile;DE;171 98765432;nein;general;kontakt@techvision.de;ja;sales;vertrieb@techvision.de;nein;VAT_EU;DE123456789;DE;COMPANY_REG_DE;HRB 12345 B;Berlin;3500000;EUR;45;31.12.;AAA;https://linkedin.com/company/techvision-gmbh;https://twitter.com/techvision_de;https://facebook.com/techvision;;https://youtube.com/@techvision;https://xing.com/companies/techvision;"Premium, IT, Innovation"
Bergmann Verlag AG;Bergmann Verlag Aktiengesellschaft;Bergmann Verlag;publisher;Verlagswesen;active;AG;1987-06-01;https://www.bergmann-verlag.de;Traditioneller Fachverlag mit über 30 Jahren Erfahrung spezialisiert auf technische und wissenschaftliche Publikationen;Verlagsallee 15;80331;München;Bayern;DE;business;DE;89 12345678;ja;business;DE;89 12345679;nein;general;info@bergmann-verlag.de;ja;press;presse@bergmann-verlag.de;nein;VAT_EU;DE987654321;DE;COMPANY_REG_DE;HRB 98765 M;München;12000000;EUR;180;30.06.;AA+;https://linkedin.com/company/bergmann-verlag;https://twitter.com/bergmannverlag;https://facebook.com/bergmannverlag;https://instagram.com/bergmannverlag;;https://xing.com/companies/bergmann-verlag;"Medien, Verlag, Partner"
Greentech Solutions KG;Greentech Solutions Kommanditgesellschaft;;partner;Umwelttechnologie;active;KG;2019-09-20;https://www.greentech-solutions.com;Nachhaltige Technologielösungen für erneuerbare Energien und Ressourcenmanagement;Zukunftsweg 88;50667;Köln;Nordrhein-Westfalen;DE;business;DE;221 55566677;ja;;;;;general;info@greentech-solutions.com;ja;support;support@greentech-solutions.com;nein;VAT_EU;DE456789123;DE;;;;;2800000;EUR;32;31.12.;A;https://linkedin.com/company/greentech-solutions-kg;https://twitter.com/greentech_sol;;https://instagram.com/greentech.solutions;;;"Technologie, Nachhaltigkeit, Innovation"`;

  const contactSampleCSV = `Vorname*;Nachname*;Anrede;Titel;Position;Abteilung;Firma;Status;E-Mail 1 Typ;E-Mail 1 Adresse;E-Mail 1 Primär;E-Mail 2 Typ;E-Mail 2 Adresse;E-Mail 2 Primär;Telefon 1 Typ;Telefon 1 Land;Telefon 1 Nummer;Telefon 1 Primär;Telefon 2 Typ;Telefon 2 Land;Telefon 2 Nummer;Telefon 2 Primär;LinkedIn;Twitter;Facebook;Instagram;Xing;Website;Bevorzugter Kanal;Bevorzugte Sprache;Ist Journalist;Ressorts;Medientypen;Bevorzugte Formate;Einreichungsrichtlinien;Biografie;Geburtstag;Nationalität;Interessen;GDPR Marketing;GDPR Newsletter;GDPR Telefon;Interne Notizen;Tags
Maximilian;Weber;Herr;Dr.;Geschäftsführer;Geschäftsleitung;TechVision GmbH;active;business;m.weber@techvision.de;ja;private;max.weber@gmail.com;nein;business;DE;30 98765432;ja;mobile;DE;171 23456789;nein;https://linkedin.com/in/maximilian-weber;https://twitter.com/maxweber_tech;https://facebook.com/max.weber;;https://xing.com/profile/maximilian_weber;;email;de;nein;;;;Studium der Informatik an der TU Berlin. Über 15 Jahre Erfahrung in der Softwareentwicklung und IT-Beratung.;1978-03-22;DE;Technologie | Golf | Klassische Musik;ja;ja;nein;Sehr technikaffin bevorzugt digitale Kommunikation. Reagiert meist innerhalb von 2 Stunden.;"VIP, Entscheider, IT"
Dr. Sarah;Hoffmann;Frau;Prof.;Chefredakteurin;Redaktion;Bergmann Verlag AG;active;business;s.hoffmann@bergmann-verlag.de;ja;;;;business;DE;89 12345678;ja;mobile;DE;172 98765432;nein;https://linkedin.com/in/sarah-hoffmann-dr;https://twitter.com/drsarahhoffmann;;https://instagram.com/prof.sarah.hoffmann;https://xing.com/profile/dr_sarah_hoffmann;;email;de;ja;Wissenschaft | Technologie | Innovation;print | online;press_release | interview | exclusive;Pressemitteilungen bis spätestens Dienstag 12 Uhr. Bevorzugt exklusive Geschichten mit wissenschaftlichem Hintergrund. Keine Massenmails!;Professorin für Wissenschaftsjournalismus an der Uni München. Promovierte Physikerin mit Schwerpunkt Quantencomputing. Seit 2010 beim Bergmann Verlag seit 2018 Chefredakteurin.;1975-11-08;DE;Wissenschaft | Fotografie | Bergsteigen;nein;ja;nein;Sehr anspruchsvoll bei Themenqualität. Deadline Dienstag 12 Uhr STRIKT einhalten! Bevorzugt persönliche Ansprache.;"Journalist, Wissenschaft, Premium"
Thomas;Schneider;Herr;;Nachhaltigkeitsmanager;CSR;Greentech Solutions KG;active;business;t.schneider@greentech-solutions.com;ja;;;;business;DE;221 55566677;ja;mobile;DE;160 11223344;nein;https://linkedin.com/in/thomas-schneider-nachhaltigkeit;;;https://instagram.com/thomas.green;https://xing.com/profile/thomas_schneider_green;;phone;de;nein;;;;;BWL-Studium mit Schwerpunkt Nachhaltigkeit. 10 Jahre Erfahrung in Umwelttechnologie-Unternehmen. Zertifizierter Nachhaltigkeitsberater (DNK).;1985-06-15;DE;Umweltschutz | Wandern | Fahrradfahren;ja;nein;ja;Sehr engagiert im Bereich Nachhaltigkeit. Guter Multiplikator in der Green-Tech-Branche. Erreichbar am besten vormittags zwischen 9-11 Uhr.;"Partner, Nachhaltigkeit, CSR"`;

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
        delimiter: ';', // Excel-Standard für deutsche Systeme
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

      // Status (Lifecycle Stage ausgeschlossen wie angefordert)
      status: mapCompanyStatus(row["Status"]),

      // Legal
      legalForm: row["Rechtsform"],
      foundedDate: row["Gründungsdatum"] ? parseDate(row["Gründungsdatum"]) : undefined,

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
        fiscalYearEnd: row["Geschäftsjahresende"],
        creditRating: row["Kreditrating"]
      },

      // Arrays
      phones: [],
      emails: [],
      identifiers: [],
      socialMedia: []
    };

    // Parse phones mit neuer Struktur: Typ, Land, Nummer, Primär
    if (row["Telefon 1 Nummer"]) {
      const countryCode = row["Telefon 1 Land"] || 'DE';
      company.phones!.push({
        type: mapPhoneType(row["Telefon 1 Typ"]) || 'business',
        countryCode: countryCode as CountryCode,
        number: row["Telefon 1 Nummer"],
        isPrimary: row["Telefon 1 Primär"]?.toLowerCase() === 'ja' || row["Telefon 1 Primär"]?.toLowerCase() === 'true'
      });
    }
    if (row["Telefon 2 Nummer"]) {
      const countryCode = row["Telefon 2 Land"] || 'DE';
      company.phones!.push({
        type: mapPhoneType(row["Telefon 2 Typ"]) || 'business',
        countryCode: countryCode as CountryCode,
        number: row["Telefon 2 Nummer"],
        isPrimary: row["Telefon 2 Primär"]?.toLowerCase() === 'ja' || row["Telefon 2 Primär"]?.toLowerCase() === 'true'
      });
    }

    // Parse emails mit neuer Struktur: Typ, Adresse, Primär
    if (row["E-Mail 1 Adresse"]) {
      company.emails!.push({
        type: mapEmailType(row["E-Mail 1 Typ"]) || 'general',
        email: row["E-Mail 1 Adresse"],
        isPrimary: row["E-Mail 1 Primär"]?.toLowerCase() === 'ja' || row["E-Mail 1 Primär"]?.toLowerCase() === 'true'
      });
    }
    if (row["E-Mail 2 Adresse"]) {
      company.emails!.push({
        type: mapEmailType(row["E-Mail 2 Typ"]) || 'general',
        email: row["E-Mail 2 Adresse"],
        isPrimary: row["E-Mail 2 Primär"]?.toLowerCase() === 'ja' || row["E-Mail 2 Primär"]?.toLowerCase() === 'true'
      });
    }

    // Parse identifiers mit neuer Struktur: Typ, Wert, Behörde
    if (row["Kennung 1 Wert"]) {
      company.identifiers!.push({
        type: row["Kennung 1 Typ"] as any || 'OTHER',
        value: row["Kennung 1 Wert"],
        issuingAuthority: row["Kennung 1 Behörde"] || 'DE'
      });
    }
    if (row["Kennung 2 Wert"]) {
      company.identifiers!.push({
        type: row["Kennung 2 Typ"] as any || 'OTHER',
        value: row["Kennung 2 Wert"],
        issuingAuthority: row["Kennung 2 Behörde"] || 'DE'
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
    if (!company.financial?.annualRevenue && !company.financial?.employees && !company.financial?.fiscalYearEnd && !company.financial?.creditRating) {
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

      // Interne Notizen
      internalNotes: row["Interne Notizen"],

      // Arrays
      emails: [],
      phones: [],
      addresses: [],
      socialProfiles: [],

      // Communication preferences
      communicationPreferences: row["Bevorzugter Kanal"] || row["Bevorzugte Sprache"] ? {
        preferredChannel: mapCommunicationChannel(row["Bevorzugter Kanal"]),
        preferredLanguage: (row["Bevorzugte Sprache"] || 'de') as LanguageCode
      } : undefined,

      // Professional info (mit Biografie)
      professionalInfo: row["Biografie"] ? {
        biography: row["Biografie"]
      } : undefined,

      // Personal info (mit Nationalität)
      personalInfo: row["Geburtstag"] || row["Nationalität"] || row["Interessen"] ? {
        birthday: row["Geburtstag"] ? parseDate(row["Geburtstag"]) : undefined,
        nationality: row["Nationalität"] as CountryCode || undefined,
        interests: row["Interessen"] ? row["Interessen"].split('|').map((i: string) => i.trim()) : undefined
      } : undefined
    };

    // Parse emails mit neuer Struktur: Typ, Adresse, Primär
    if (row["E-Mail 1 Adresse"]) {
      contact.emails!.push({
        type: mapContactEmailType(row["E-Mail 1 Typ"]) || 'business',
        email: row["E-Mail 1 Adresse"],
        isPrimary: row["E-Mail 1 Primär"]?.toLowerCase() === 'ja' || row["E-Mail 1 Primär"]?.toLowerCase() === 'true'
      });
    }
    if (row["E-Mail 2 Adresse"]) {
      contact.emails!.push({
        type: mapContactEmailType(row["E-Mail 2 Typ"]) || 'private',
        email: row["E-Mail 2 Adresse"],
        isPrimary: row["E-Mail 2 Primär"]?.toLowerCase() === 'ja' || row["E-Mail 2 Primär"]?.toLowerCase() === 'true'
      });
    }

    // Parse phones mit neuer Struktur: Typ, Land, Nummer, Primär
    if (row["Telefon 1 Nummer"]) {
      const countryCode = row["Telefon 1 Land"] || 'DE';
      contact.phones!.push({
        type: mapPhoneType(row["Telefon 1 Typ"]) || 'business',
        countryCode: countryCode as CountryCode,
        number: row["Telefon 1 Nummer"],
        isPrimary: row["Telefon 1 Primär"]?.toLowerCase() === 'ja' || row["Telefon 1 Primär"]?.toLowerCase() === 'true'
      });
    }
    if (row["Telefon 2 Nummer"]) {
      const countryCode = row["Telefon 2 Land"] || 'DE';
      contact.phones!.push({
        type: mapPhoneType(row["Telefon 2 Typ"]) || 'mobile',
        countryCode: countryCode as CountryCode,
        number: row["Telefon 2 Nummer"],
        isPrimary: row["Telefon 2 Primär"]?.toLowerCase() === 'ja' || row["Telefon 2 Primär"]?.toLowerCase() === 'true'
      });
    }

    // Parse journalist info mit vollständigen Feldern
    if (row["Ist Journalist"] === 'ja' || row["Ist Journalist"] === 'true') {
      contact.mediaProfile = {
        isJournalist: true,
        publicationIds: [], // Would need to map to actual IDs
        beats: row["Ressorts"] ? row["Ressorts"].split('|').map((b: string) => b.trim()) : [],
        mediaTypes: row["Medientypen"] ? row["Medientypen"].split('|').map((m: string) => m.trim()) : undefined,
        preferredFormats: row["Bevorzugte Formate"] ? row["Bevorzugte Formate"].split('|').map((f: string) => f.trim()) : undefined,
        submissionGuidelines: row["Einreichungsrichtlinien"] || undefined
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

    // Clean up personalInfo if all fields are undefined
    if (contact.personalInfo) {
      const hasContent = Object.values(contact.personalInfo).some(v => v !== undefined);
      if (!hasContent) {
        delete contact.personalInfo;
      }
    }

    // Clean up professionalInfo if all fields are undefined
    if (contact.professionalInfo) {
      const hasContent = Object.values(contact.professionalInfo).some(v => v !== undefined);
      if (!hasContent) {
        delete contact.professionalInfo;
      }
    }

    // Clean up communicationPreferences if undefined
    if (contact.communicationPreferences && !contact.communicationPreferences.preferredChannel && !contact.communicationPreferences.preferredLanguage) {
      delete contact.communicationPreferences;
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

  const mapContactEmailType = (type: string): 'business' | 'private' | 'other' => {
    const typeMap: Record<string, 'business' | 'private' | 'other'> = {
      'geschäftlich': 'business',
      'business': 'business',
      'privat': 'private',
      'private': 'private',
      'sonstige': 'other',
      'other': 'other'
    };
    return typeMap[type?.toLowerCase()] || 'business';
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
    if (!file || !user || !currentOrganization) return;

    // SuperAdmin Bestätigung: Warnung bei globalem Import
    if (autoGlobalMode) {
      const confirmed = window.confirm(
        activeTab === 'companies'
          ? t('confirmDialog.companiesMessage')
          : t('confirmDialog.contactsMessage')
      );

      if (!confirmed) {
        return; // Import abbrechen
      }
    }

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
      delimiter: ';', // Excel-Standard für deutsche Systeme
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
                    error: t('errors.companyNameMissing')
                  });
                  return;
                }

                const company = parseCompanyRow(row);

                // Parse tags (Komma-getrennt in Anführungszeichen)
                if (row["Tags"]) {
                  // For now, we'll store tag names - in production, these would need to be mapped to tag IDs
                  (company as any).tagNames = row["Tags"].split(',').map((t: string) => t.trim());
                }

                companies.push(company);
              } catch (err) {
                parseErrors.push({
                  row: index + 2,
                  error: err instanceof Error ? err.message : t('errors.parsingError')
                });
              }
            });

            if (companies.length === 0 && parseErrors.length > 0) {
              setError(t('errors.importFailed', { count: parseErrors.length }));
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
              {
                organizationId: currentOrganization!.id,
                userId: user.uid,
                autoGlobalMode: autoGlobalMode
              },
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
                    error: t('errors.firstNameMissing')
                  });
                  return;
                }
                if (!row["Nachname*"] && !row["Nachname"]) {
                  parseErrors.push({
                    row: index + 2,
                    error: t('errors.lastNameMissing')
                  });
                  return;
                }

                const contact = parseContactRow(row);

                // Parse tags (Komma-getrennt in Anführungszeichen)
                if (row["Tags"]) {
                  // For now, we'll store tag names - in production, these would need to be mapped to tag IDs
                  (contact as any).tagNames = row["Tags"].split(',').map((t: string) => t.trim());
                }

                contacts.push(contact);
              } catch (err) {
                parseErrors.push({
                  row: index + 2,
                  error: err instanceof Error ? err.message : t('errors.parsingError')
                });
              }
            });

            if (contacts.length === 0 && parseErrors.length > 0) {
              setError(t('errors.importFailed', { count: parseErrors.length }));
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
              {
                organizationId: currentOrganization!.id,
                userId: user.uid,
                autoGlobalMode: autoGlobalMode
              },
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
          // Import error handled via UI error message
          setError(t('errors.fileFormatError'));
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        setError(t('errors.fileReadError', { message: error.message }));
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
          <span className="text-lg font-semibold">{t('title')}</span>
          <div className="flex items-center gap-2">
            {autoGlobalMode && (
              <Badge color="orange" className="text-xs font-semibold">
                🌐 {t('globalMode')}
              </Badge>
            )}
            <Badge color="blue">{file ? t('fileSelected') : t('noFile')}</Badge>
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
              {t('tabs.companies')}
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
              {t('tabs.contacts')}
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {!importResult ? (
            <div className="space-y-6">
              {/* SuperAdmin Warnung */}
              {autoGlobalMode && (
                <div className="rounded-lg bg-orange-50 border-2 border-orange-300 p-4">
                  <div className="flex">
                    <div className="shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="ml-3">
                      <Text className="text-sm font-semibold text-orange-800">
                        {t('globalWarning.title')}
                      </Text>
                      <Text className="mt-1 text-sm text-orange-700">
                        {activeTab === 'companies' ? t('globalWarning.companiesMessage') : t('globalWarning.contactsMessage')}
                      </Text>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex">
                  <div className="shrink-0">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <Text className="text-sm font-medium text-blue-800">
                      {activeTab === 'companies' ? t('instructions.companiesTitle') : t('instructions.contactsTitle')}
                    </Text>
                    <Text className="mt-1 text-sm text-blue-700">
                      {activeTab === 'companies' ? t('instructions.companiesDescription') : t('instructions.contactsDescription')}
                    </Text>
                    <div className="mt-2">
                      <button
                        onClick={downloadTemplate}
                        className="text-sm font-medium text-blue-800 hover:text-blue-900"
                      >
                        <DocumentArrowDownIcon className="inline h-4 w-4 mr-1" />
                        {t('instructions.downloadTemplate')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <FieldGroup>
                <Field>
                  <Label>{t('duplicateHandling.label')}</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="skip"
                        checked={duplicateHandling === 'skip'}
                        onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update')}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm">{t('duplicateHandling.skip')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="update"
                        checked={duplicateHandling === 'update'}
                        onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update')}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm">{t('duplicateHandling.update')}</span>
                    </label>
                  </div>
                </Field>
              </FieldGroup>

              {/* File Upload */}
              <div>
                <h3 className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fileUpload.label')}
                </h3>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ArrowUpTrayIcon className="w-8 h-8 mb-3 text-gray-400" />
                      <Text className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">{t('fileUpload.clickOrDrag')}</span> {t('fileUpload.orDrag')}
                      </Text>
                      <Text className="text-xs text-gray-500">{t('fileUpload.fileType')}</Text>
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
                    <span>{t('fileUpload.selectedFile')} <span className="font-medium">{file.name}</span></span>
                    <Button plain onClick={resetImport}>
                      {t('fileUpload.reset')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Preview */}
              {previewData.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{t('preview.title')}</h3>
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
                            {t('preview.more')}
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
                              {t('preview.more')}
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
                <ProgressBar progress={importProgress} t={t} />
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
                    <h3 className="text-lg font-semibold">{t('results.successTitle')}</h3>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                    <h3 className="text-lg font-semibold">{t('results.warningsTitle')}</h3>
                  </>
                )}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                  <div className="text-sm text-green-600">{t('results.created')}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
                  <div className="text-sm text-blue-600">{t('results.updated')}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-700">{importResult.skipped}</div>
                  <div className="text-sm text-gray-600">{t('results.skipped')}</div>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                    <Text className="font-medium text-red-800">
                      {t('results.errorsFound', { count: importResult.errors.length })}
                    </Text>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <Text key={index} className="text-sm text-red-700">
                        {t('results.errorRow', { row: error.row, error: error.error })}
                      </Text>
                    ))}
                    {importResult.errors.length > 10 && (
                      <Text className="text-sm text-red-700 font-medium">
                        {t('results.moreErrors', { count: importResult.errors.length - 10 })}
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
                      {t('results.warningsFound', { count: importResult.warnings.length })}
                    </Text>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.warnings.slice(0, 10).map((warning, index) => (
                      <Text key={index} className="text-sm text-amber-700">
                        {t('results.warningRow', { row: warning.row, warning: warning.warning })}
                      </Text>
                    ))}
                    {importResult.warnings.length > 10 && (
                      <Text className="text-sm text-amber-700 font-medium">
                        {t('results.moreWarnings', { count: importResult.warnings.length - 10 })}
                      </Text>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button plain onClick={resetImport}>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  {t('results.newImport')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogBody>
      
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>
          {importResult ? t('actions.close') : t('actions.cancel')}
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
                {t('actions.importing')}
              </>
            ) : (
              t('actions.import')
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}