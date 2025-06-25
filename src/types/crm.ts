// src/types/crm.ts - Erweitert für Medien-Support
import { Timestamp } from 'firebase/firestore';

// ERWEITERTE Firmentypen für Medien
export type CompanyType = 'customer' | 'supplier' | 'partner' | 'publisher' | 'media_house' | 'agency' | 'other';

// Erweiterte Labels für die Firmentypen
export const companyTypeLabels: Record<CompanyType, string> = {
  customer: 'Kunde',
  supplier: 'Lieferant',
  partner: 'Partner',
  publisher: 'Verlag',          // NEU für Presse
  media_house: 'Medienhaus',    // NEU für Presse
  agency: 'Agentur',            // NEU für Presse
  other: 'Sonstiges'
};

// Farben für Tags
export type TagColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange' | 'zinc';

// Mögliche Plattformen für Social Media
export type SocialPlatform = 'linkedin' | 'xing' | 'facebook' | 'instagram' | 'website' | 'other';

// Labels für die Social-Media-Plattformen
export const socialPlatformLabels: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  xing: 'Xing',
  facebook: 'Facebook',
  instagram: 'Instagram',
  website: 'Website',
  other: 'Sonstiges'
};

// Datenstruktur für ein Social-Media-Profil
export interface SocialMediaProfile {
  platform: SocialPlatform;
  url: string;
}

// Datenstruktur für ein Tag
export interface Tag {
  id?: string;
  name: string;
  color: TagColor;
  userId: string;
  createdAt?: Timestamp;
}

// ERWEITERTE Datenstruktur für eine Firma (Medien-Features)
export interface Company {
  id?: string;
  name: string;
  website?: string;
  industry?: string;
  type: CompanyType;
  
  // Erweiterte Adresse
  address?: {
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  
  phone?: string;
  notes?: string;
  tagIds?: string[];
  socialMedia?: SocialMediaProfile[];
  
  // NEU: Medien-spezifische Felder
  mediaInfo?: {
    circulation?: number;        // Auflage bei Print
    reach?: number;             // Reichweite online
    focusAreas?: string[];      // Themenschwerpunkte
    publicationFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'other';
    mediaType?: 'print' | 'online' | 'tv' | 'radio' | 'podcast' | 'mixed';
  };
  
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ERWEITERTE Datenstruktur für eine Person/Kontakt (Journalisten-Features)
export interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  companyId?: string;
  companyName?: string;
  notes?: string;
  tagIds?: string[];
  
  // NEU: Journalisten-spezifische Felder
  mediaInfo?: {
    beat?: string;              // Ressort (Tech, Politik, Wirtschaft, etc.)
    expertise?: string[];       // Expertise-Bereiche
    preferredContactTime?: string; // Bevorzugte Kontaktzeit
    deadlines?: string;         // Deadline-Informationen
    languagePreferences?: string[]; // Sprach-Präferenzen
    socialHandles?: {
      twitter?: string;
      linkedin?: string;
      mastodon?: string;
    };
  };
  
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Standard Presse-Tags für schnelles Setup
export const STANDARD_PRESS_TAGS: Omit<Tag, 'id' | 'userId' | 'createdAt'>[] = [
  { name: 'Presse', color: 'blue' },
  { name: 'Journalist', color: 'green' },
  { name: 'Redakteur', color: 'purple' },
  { name: 'Chefredakteur', color: 'red' },
  { name: 'Freier Journalist', color: 'orange' },
  { name: 'Blogger', color: 'pink' },
  { name: 'Influencer', color: 'yellow' },
  { name: 'Moderator', color: 'zinc' },
];

// Standard Ressorts/Beats für Journalisten
export const STANDARD_BEATS = [
  'Technologie',
  'Wirtschaft', 
  'Politik',
  'Wissenschaft',
  'Gesundheit',
  'Umwelt',
  'Sport',
  'Kultur',
  'Lifestyle',
  'Automobile',
  'Immobilien',
  'Bildung',
  'Startups',
  'Finanzen',
  'Marketing',
  'Digitalisierung',
  'KI & Machine Learning',
  'Cybersecurity',
  'E-Commerce',
  'Nachhaltigkeit'
];

// Medientypen für Kategorisierung
export const MEDIA_TYPES = [
  { value: 'print', label: 'Print (Zeitung/Magazin)' },
  { value: 'online', label: 'Online-Publikation' },
  { value: 'tv', label: 'Fernsehen' },
  { value: 'radio', label: 'Radio' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'mixed', label: 'Gemischt' }
];

// Props für das CompanyModal (erweitert)
export interface CompanyModalProps {
  company: Company | null;
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

// Props für das ContactModal (erweitert)
export interface ContactModalProps {
  contact: Contact | null;
  companies: Company[];
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

// Hilfsfunktionen für Medien-Kontakte
export const isMediaContact = (contact: Contact): boolean => {
  return contact.tagIds?.some(tagId => 
    ['presse', 'journalist', 'redakteur', 'blogger'].some(tag => 
      tagId.toLowerCase().includes(tag)
    )
  ) || false;
};

export const isMediaCompany = (company: Company): boolean => {
  return ['publisher', 'media_house', 'agency'].includes(company.type);
};

// Utility-Funktionen für die Listen-Integration
export const getContactDisplayName = (contact: Contact): string => {
  return `${contact.firstName} ${contact.lastName}`;
};

export const getContactDescription = (contact: Contact): string => {
  const parts = [];
  if (contact.position) parts.push(contact.position);
  if (contact.companyName) parts.push(contact.companyName);
  if (contact.mediaInfo?.beat) parts.push(`Ressort: ${contact.mediaInfo.beat}`);
  return parts.join(' • ');
};

export const getCompanyDescription = (company: Company): string => {
  const parts = [];
  parts.push(companyTypeLabels[company.type]);
  if (company.industry) parts.push(company.industry);
  if (company.mediaInfo?.mediaType) {
    const mediaType = MEDIA_TYPES.find(mt => mt.value === company.mediaInfo?.mediaType);
    if (mediaType) parts.push(mediaType.label);
  }
  return parts.join(' • ');
};

// NEU: Datenstruktur für wiederverwendbare Textbausteine (Boilerplates)
export interface Boilerplate {
  id?: string;
  name: string;        // z.B. "Unternehmensbeschreibung (Kurz)"
  content: string;     // Der eigentliche Text des Bausteins
  category?: string;   // z.B. "Über Uns", "Produkt-Info"
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}