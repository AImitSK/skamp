// src/types/branding.ts
import { Timestamp } from 'firebase/firestore';

export interface BrandingSettings {
  id?: string;
  userId: string;
  
  // Firmeninformationen
  companyName: string;
  logoUrl?: string;
  logoAssetId?: string; // Referenz zum Media Asset
  
  // Kontaktdaten
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  
  // Anzeigeoptionen
  showCopyright: boolean; // Standard: true
  
  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Validierungsregeln
export const BRANDING_VALIDATION = {
  companyName: { 
    required: true, 
    minLength: 2, 
    maxLength: 100 
  },
  email: { 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
  },
  website: { 
    pattern: /^https?:\/\/.+\..+/,
    message: 'Bitte geben Sie eine gültige URL ein (z.B. https://example.com)'
  },
  phone: { 
    pattern: /^\+?[\d\s\-\(\)]+$/,
    message: 'Bitte geben Sie eine gültige Telefonnummer ein'
  }
} as const;