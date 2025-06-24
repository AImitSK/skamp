import { Timestamp } from 'firebase/firestore';

// Mögliche Typen für eine Firma
export type CompanyType = 'customer' | 'supplier' | 'partner' | 'other';

// Labels für die Firmentypen zur Anzeige
export const companyTypeLabels: Record<CompanyType, string> = {
  customer: 'Kunde',
  supplier: 'Lieferant',
  partner: 'Partner',
  other: 'Sonstiges'
};

// Farben für Tags
export type TagColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange' | 'zinc';

// NEU: Mögliche Plattformen für Social Media
export type SocialPlatform = 'linkedin' | 'xing' | 'facebook' | 'instagram' | 'website' | 'other';

// NEU: Labels für die Social-Media-Plattformen
export const socialPlatformLabels: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  xing: 'Xing',
  facebook: 'Facebook',
  instagram: 'Instagram',
  website: 'Website',
  other: 'Sonstiges'
};

// NEU: Datenstruktur für ein Social-Media-Profil
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

// Datenstruktur für eine Firma
export interface Company {
  id?: string;
  name: string;
  website?: string;
  industry?: string;
  type: CompanyType;
  address?: {
    street?: string;
    street2?: string; // NEU: Zweite Adresszeile
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  phone?: string;
  notes?: string;
  tagIds?: string[];
  socialMedia?: SocialMediaProfile[]; // NEU: Array für Social-Media-Profile
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Datenstruktur für eine Person/Kontakt
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
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Props für das CompanyModal
export interface CompanyModalProps {
  company: Company | null;
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

// Props für das ContactModal
export interface ContactModalProps {
  contact: Contact | null;
  companies: Company[];
  onClose: () => void;
  onSave: () => void;
  userId: string;
}