// src/lib/constants/crm-constants.ts
// Zentrale Konstanten für CRM Enhanced Module

import { 
  CompanyTabConfig, 
  ContactTabConfig, 
  CompanyTabId, 
  ContactTabId 
} from '@/types/crm-enhanced-ui';
import {
  BuildingOfficeIcon,
  ScaleIcon,
  GlobeAltIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  NewspaperIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  HeartIcon
} from '@heroicons/react/20/solid';

// Pagination Konstanten
export const CRM_PAGINATION_SIZE = 50;
export const CRM_DEFAULT_PAGE_SIZE = 25;

// Table Konstanten
export const CRM_MAX_BULK_OPERATIONS = 100;
export const CRM_SEARCH_DEBOUNCE_MS = 300;

// Import/Export Konstanten
export const CSV_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const CSV_CHUNK_SIZE = 100; // Verarbeitung in 100er-Batches
export const SUPPORTED_CSV_ENCODINGS = ['UTF-8', 'ISO-8859-1', 'Windows-1252'] as const;

// Company Modal Tab-Konfiguration
export const COMPANY_TABS: CompanyTabConfig[] = [
  { 
    id: 'general', 
    label: 'Allgemein', 
    icon: BuildingOfficeIcon,
    description: 'Basis-Informationen zur Firma' 
  },
  { 
    id: 'legal', 
    label: 'Rechtliches', 
    icon: ScaleIcon,
    description: 'Offizieller Name, Identifikatoren, Rechtsform' 
  },
  { 
    id: 'international', 
    label: 'International', 
    icon: GlobeAltIcon,
    description: 'Adressen, Telefonnummern, Sprachen' 
  },
  { 
    id: 'financial', 
    label: 'Finanzen', 
    icon: BanknotesIcon,
    description: 'Umsatz, Währung, Finanzkennzahlen' 
  },
  { 
    id: 'corporate', 
    label: 'Unternehmen', 
    icon: BuildingOffice2Icon,
    description: 'Hierarchie, Mitarbeiter, Struktur' 
  },
  { 
    id: 'media', 
    label: 'Medienhaus', 
    icon: NewspaperIcon,
    description: 'Publikationen und Medien-Features',
    visible: (formData) => formData.type === 'media_house'
  }
];

// Contact Modal Tab-Konfiguration
export const CONTACT_TABS: ContactTabConfig[] = [
  { 
    id: 'general', 
    label: 'Allgemein', 
    icon: UserIcon,
    description: 'Basis-Kontaktinformationen' 
  },
  { 
    id: 'communication', 
    label: 'Kommunikation', 
    icon: ChatBubbleLeftRightIcon,
    description: 'Kontaktdaten und Präferenzen' 
  },
  { 
    id: 'media', 
    label: 'Medien', 
    icon: NewspaperIcon,
    description: 'Journalist-Profil und Publikationen',
    visible: (formData) => formData.mediaProfile?.isJournalist === true
  },
  { 
    id: 'professional', 
    label: 'Beruflich', 
    icon: BriefcaseIcon,
    description: 'Position, Bildung, Qualifikationen' 
  },
  { 
    id: 'gdpr', 
    label: 'GDPR', 
    icon: ShieldCheckIcon,
    description: 'Datenschutz-Einwilligungen' 
  },
  { 
    id: 'personal', 
    label: 'Persönlich', 
    icon: HeartIcon,
    description: 'Private Notizen und Beziehungen' 
  }
];

// Validation Konstanten
export const VALIDATION_RULES = {
  COMPANY_NAME_MIN_LENGTH: 2,
  COMPANY_NAME_MAX_LENGTH: 100,
  CONTACT_NAME_MIN_LENGTH: 2,
  CONTACT_NAME_MAX_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_MIN_LENGTH: 5,
  WEBSITE_REGEX: /^https?:\/\/.+\..+/,
  REVENUE_MAX: 999999999999, // 1 Trillion
} as const;

// Status Messages
export const STATUS_MESSAGES = {
  IMPORT_PARSING: 'CSV-Datei wird analysiert...',
  IMPORT_VALIDATING: 'Daten werden validiert...',
  IMPORT_IMPORTING: 'Daten werden importiert...',
  IMPORT_DONE: 'Import erfolgreich abgeschlossen',
  EXPORT_GENERATING: 'Export wird erstellt...',
  EXPORT_READY: 'Export bereit zum Download',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Ungültige E-Mail-Adresse',
  INVALID_PHONE: 'Ungültige Telefonnummer',
  INVALID_WEBSITE: 'Ungültige Website-URL',
  REQUIRED_FIELD: 'Dieses Feld ist erforderlich',
  FILE_TOO_LARGE: `Datei zu groß. Maximum: ${CSV_MAX_FILE_SIZE / 1024 / 1024}MB`,
  INVALID_CSV: 'Ungültige CSV-Datei',
  DUPLICATE_EMAIL: 'E-Mail-Adresse bereits vorhanden',
} as const;