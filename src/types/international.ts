// src/types/international.ts
import { Timestamp } from 'firebase/firestore';

// ========================================
// Mandanten & Rechte-System
// ========================================

export type UserRole = 'owner' | 'admin' | 'member' | 'client' | 'guest';

export type Permission = 
  // CRM Permissions
  | 'crm.view' 
  | 'crm.create' 
  | 'crm.edit' 
  | 'crm.delete'
  | 'crm.export'
  | 'crm.import'
  // Library/Bibliothek Permissions
  | 'library.view' 
  | 'library.create' 
  | 'library.edit' 
  | 'library.delete'
  // Campaign Permissions
  | 'campaigns.view' 
  | 'campaigns.create' 
  | 'campaigns.edit' 
  | 'campaigns.send'
  | 'campaigns.delete'
  // Approval/Freigabe Permissions
  | 'approvals.view' 
  | 'approvals.respond'
  // Media Permissions
  | 'media.view.own' 
  | 'media.view.all' 
  | 'media.upload' 
  | 'media.delete'
  | 'media.share'
  // Team & Admin Permissions
  | 'team.view'
  | 'team.manage' 
  | 'billing.view'
  | 'billing.manage' 
  | 'account.settings'
  | 'account.delete';

// Vordefinierte Rollen-Permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    // Hat ALLE Permissions
    'crm.view', 'crm.create', 'crm.edit', 'crm.delete', 'crm.export', 'crm.import',
    'library.view', 'library.create', 'library.edit', 'library.delete',
    'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.send', 'campaigns.delete',
    'approvals.view', 'approvals.respond',
    'media.view.all', 'media.upload', 'media.delete', 'media.share',
    'team.view', 'team.manage', 'billing.view', 'billing.manage', 'account.settings', 'account.delete'
  ],
  admin: [
    // Alles außer kritische Account-Funktionen
    'crm.view', 'crm.create', 'crm.edit', 'crm.delete', 'crm.export', 'crm.import',
    'library.view', 'library.create', 'library.edit', 'library.delete',
    'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.send', 'campaigns.delete',
    'approvals.view', 'approvals.respond',
    'media.view.all', 'media.upload', 'media.delete', 'media.share',
    'team.view', 'team.manage', 'billing.view', 'account.settings'
  ],
  member: [
    // Vollzugriff auf Arbeitsmodule, kein Admin
    'crm.view', 'crm.create', 'crm.edit', 'crm.delete', 'crm.export', 'crm.import',
    'library.view', 'library.create', 'library.edit', 'library.delete',
    'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.send',
    'approvals.view', 'approvals.respond',
    'media.view.all', 'media.upload', 'media.share',
    'team.view'
  ],
  client: [
    // Externe Kunden - sehr eingeschränkt
    'approvals.view', 'approvals.respond',
    'media.view.own',
    'campaigns.view' // Nur eigene/freigegebene
  ],
  guest: [
    // Noch eingeschränkter - nur spezifische Freigaben
    'approvals.view', 'approvals.respond'
  ]
};

// Organization & Team Types
export interface Organization {
  id: string;
  name: string;
  slug: string; // URL-friendly name
  
  // Billing/Subscription
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  planValidUntil?: Timestamp;
  
  // Stammdaten
  legalName?: string;
  taxId?: string;
  
  // Limits
  limits?: {
    maxUsers?: number;
    maxContacts?: number;
    maxCampaignsPerMonth?: number;
    maxStorageGB?: number;
  };
  
  // Einstellungen
  settings?: {
    defaultLanguage: string; // ISO 639-1
    defaultCurrency: string; // ISO 4217
    defaultCountry: string;  // ISO 3166-1 Alpha-2
    timezone: string;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeamMember {
  id: string;
  userId: string;
  organizationId: string;
  
  // Basis-Infos (denormalisiert für Performance)
  email: string;
  displayName: string;
  photoUrl?: string;
  
  // Rolle & Rechte
  role: UserRole;
  customPermissions?: Permission[]; // Überschreibt Rollen-Permissions
  
  // Status
  status: 'invited' | 'active' | 'inactive' | 'suspended';
  invitedAt: Timestamp;
  invitedBy: string; // userId
  joinedAt?: Timestamp;
  lastActiveAt?: Timestamp;
  
  // Einschränkungen
  expiresAt?: Timestamp; // Für temporäre Zugänge (Guests)
  restrictedToCompanyIds?: string[]; // Nur bestimmte Firmen sehen (Clients)
}

// ========================================
// Basis-Entity für alle Datenmodelle
// ========================================

export interface BaseEntity {
  id?: string;
  
  // Mandanten-Zuordnung
  organizationId: string;
  
  // Audit-Trail
  createdBy: string; // userId
  createdAt?: Timestamp;
  updatedBy?: string; // userId
  updatedAt?: Timestamp;
  
  // Soft Delete Option
  deletedAt?: Timestamp;
  deletedBy?: string;
}

// ========================================
// ISO-Standard Types
// ========================================

// ISO 3166-1 Alpha-2 Ländercodes
export type CountryCode = 'DE' | 'AT' | 'CH' | 'US' | 'GB' | 'FR' | 'IT' | 'ES' | 'NL' | 'BE' | 'LU' | 'DK' | 'SE' | 'NO' | 'FI' | 'PL' | 'CZ' | 'HU' | 'RO' | 'BG' | 'GR' | 'PT' | 'IE' | string;

// ISO 4217 Währungscodes
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY' | 'CNY' | 'CAD' | 'AUD' | 'SEK' | 'NOK' | 'DKK' | 'PLN' | 'CZK' | 'HUF' | string;

// ISO 639-1 Sprachcodes
export type LanguageCode = 'de' | 'en' | 'fr' | 'it' | 'es' | 'nl' | 'pl' | 'pt' | 'cs' | 'hu' | 'ro' | 'bg' | 'el' | 'sv' | 'da' | 'no' | 'fi' | string;

// Strukturierte internationale Adresse
export interface InternationalAddress {
  // Pflichtfelder
  street: string;
  city: string;
  postalCode: string;
  countryCode: CountryCode; // ISO 3166-1 Alpha-2
  
  // Optionale Felder
  houseNumber?: string;
  addressLine2?: string;
  addressLine3?: string;
  region?: string; // Bundesland, Staat, Kanton, etc.
  
  // Formatierte Anzeige (generiert)
  formatted?: string;
  
  // Geo-Koordinaten (für Karten)
  latitude?: number;
  longitude?: number;
  
  // Validierung
  validatedAt?: Timestamp;
  validationService?: string;
}

// E.164 Telefonnummer
export interface PhoneNumber {
  type: 'business' | 'private' | 'mobile' | 'fax' | 'other';
  number: string; // E.164 Format: +49301234567
  extension?: string;
  isPrimary?: boolean;
  validatedAt?: Timestamp;
  
  // Formatierte Anzeige
  formattedNational?: string; // 030 1234567
  formattedInternational?: string; // +49 30 1234567
}

// Strukturierter Name (international)
export interface StructuredName {
  salutation?: string; // Mr., Ms., Dr., Prof., etc.
  title?: string; // Academic/Professional titles
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string; // Jr., Sr., III, etc.
  academicTitle?: string; // Prof. Dr., Dr. med., etc.
  
  // Spezielle Formate
  preferredName?: string; // Rufname
  phoneticFirstName?: string; // Für Aussprache
  phoneticLastName?: string;
  
  // Formatierte Anzeige
  formatted?: string; // Generiert basierend auf Land/Kultur
}

// ========================================
// Geschäfts-Identifikatoren
// ========================================

export type IdentifierType = 
  | 'VAT_EU'           // EU USt-IdNr.
  | 'EIN_US'           // US Employer ID
  | 'COMPANY_REG_DE'   // Handelsregister DE
  | 'COMPANY_REG_UK'   // Companies House UK
  | 'UID_CH'           // UID Schweiz
  | 'SIREN_FR'         // SIREN Frankreich
  | 'DUNS'             // D&B Universal Number
  | 'LEI'              // Legal Entity Identifier
  | 'OTHER';

export interface BusinessIdentifier {
  type: IdentifierType;
  value: string;
  description?: string;
  issuingAuthority?: string;
  validFrom?: Date;
  validUntil?: Date;
  validatedAt?: Timestamp;
  verificationUrl?: string;
}

// ========================================
// Finanz-Types
// ========================================

export interface MoneyAmount {
  amount: number;
  currency: CurrencyCode; // ISO 4217
  
  // Zusätzliche Infos
  isEstimate?: boolean;
  asOfDate?: Date;
  source?: string;
  
  // Für Anzeige
  formatted?: string; // z.B. "€ 1.234,56"
}

export interface FinancialInfo {
  annualRevenue?: MoneyAmount;
  fiscalYearEnd?: string; // MM-DD
  
  // Erweiterte Finanzdaten
  ebitda?: MoneyAmount;
  employees?: number;
  employeeRange?: EmployeeRange;
  
  // Ratings
  creditRating?: string;
  creditRatingAgency?: string;
  ratingDate?: Date;
}

export type EmployeeRange = 
  | '1-9'
  | '10-49' 
  | '50-249'
  | '250-999'
  | '1000-4999'
  | '5000+';

// ========================================
// DSGVO/GDPR Compliance
// ========================================

export interface GdprConsent {
  id: string;
  purpose: string; // z.B. "Marketing-Newsletter", "Telefonische Kontaktaufnahme"
  status: 'granted' | 'revoked' | 'pending';

  
  
  // Wann
  grantedAt?: Timestamp;
  revokedAt?: Timestamp;
  expiresAt?: Timestamp;
  
  // Was (welche Information wurde bereitgestellt)
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  informationProvided: string; // z.B. "Datenschutzerklärung v2.1"
  privacyPolicyVersion: string;
  
  // Wie (Nachweisbarkeit)
  method: 'webform' | 'email' | 'phone' | 'written' | 'double_opt_in' | 'import';
  evidenceUrl?: string; // Link zum Nachweis
  ipAddress?: string;
  userAgent?: string;
  
  // Double Opt-In
  confirmationSentAt?: Timestamp;
  confirmedAt?: Timestamp;
  confirmationToken?: string;

}

// ========================================
// Branchen-Klassifizierung
// ========================================

export interface IndustryClassification {
  primary: string;
  secondary?: string[];
  
  // Standard-Klassifizierungssysteme
  system?: 'NACE' | 'SIC' | 'NAICS' | 'CUSTOM';
  code?: string;
  
  // Für Suche/Filter
  tags?: string[];
}

// ========================================
// Helper Types & Constants
// ========================================

// Mapping für häufige Länder
export const COUNTRY_NAMES: Record<string, string> = {
  'DE': 'Deutschland',
  'AT': 'Österreich', 
  'CH': 'Schweiz',
  'US': 'USA',
  'GB': 'Vereinigtes Königreich',
  'FR': 'Frankreich',
  'IT': 'Italien',
  'ES': 'Spanien',
  'NL': 'Niederlande',
  'BE': 'Belgien',
  'LU': 'Luxemburg',
  'DK': 'Dänemark',
  'SE': 'Schweden',
  'NO': 'Norwegen',
  'FI': 'Finnland',
  'PL': 'Polen',
  'CZ': 'Tschechien',
  'HU': 'Ungarn',
  'RO': 'Rumänien',
  'BG': 'Bulgarien',
  'GR': 'Griechenland',
  'PT': 'Portugal',
  'IE': 'Irland'
};

// Währungs-Symbole
export const CURRENCY_SYMBOLS: Record<string, string> = {
  'EUR': '€',
  'USD': '$',
  'GBP': '£',
  'CHF': 'CHF',
  'JPY': '¥',
  'CNY': '¥',
  'CAD': 'C$',
  'AUD': 'A$',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'PLN': 'zł',
  'CZK': 'Kč',
  'HUF': 'Ft'
};

// Sprach-Namen
export const LANGUAGE_NAMES: Record<string, string> = {
  'de': 'Deutsch',
  'en': 'Englisch',
  'fr': 'Französisch',
  'it': 'Italienisch',
  'es': 'Spanisch',
  'nl': 'Niederländisch',
  'pl': 'Polnisch',
  'pt': 'Portugiesisch',
  'cs': 'Tschechisch',
  'hu': 'Ungarisch',
  'ro': 'Rumänisch',
  'bg': 'Bulgarisch',
  'el': 'Griechisch',
  'sv': 'Schwedisch',
  'da': 'Dänisch',
  'no': 'Norwegisch',
  'fi': 'Finnisch'
};

// Export für Type Guards
export function hasPermission(member: TeamMember, permission: Permission): boolean {
  // Custom permissions überschreiben Rollen-Permissions
  if (member.customPermissions) {
    return member.customPermissions.includes(permission);
  }
  
  // Sonst Rollen-basiert
  return ROLE_PERMISSIONS[member.role]?.includes(permission) || false;
}

export function canAccessCompany(member: TeamMember, companyId: string): boolean {
  // Clients können eingeschränkt sein
  if (member.role === 'client' && member.restrictedToCompanyIds) {
    return member.restrictedToCompanyIds.includes(companyId);
  }
  
  // Andere Rollen haben vollen Zugriff
  return hasPermission(member, 'crm.view');
}