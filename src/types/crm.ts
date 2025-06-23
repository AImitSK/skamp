// src/types/crm.ts
import { Timestamp } from 'firebase/firestore';

// Datenstruktur für eine Firma
export interface Company {
  id?: string;
  name: string;
  website?: string;
  industry?: string;
  type: CompanyType;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  phone?: string;
  notes?: string;
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
  companyName?: string; // Denormalisiert für einfache Anzeige
  notes?: string;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Mögliche Typen für eine Firma
export type CompanyType = 'customer' | 'supplier' | 'partner' | 'other';

// Labels für die Firmentypen zur Anzeige
export const companyTypeLabels: Record<CompanyType, string> = {
  customer: 'Kunde',
  supplier: 'Lieferant',
  partner: 'Partner',
  other: 'Sonstiges'
};

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
