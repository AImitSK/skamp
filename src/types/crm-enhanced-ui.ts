// src/types/crm-enhanced-ui.ts
// Zentrale UI-Typen für CRM Enhanced Komponenten

import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';

// Import Modal Typen
export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; error: string }[];
  warnings: { row: number; warning: string }[];
}

export interface ImportProgress {
  current: number;
  total: number;
  status: 'parsing' | 'validating' | 'importing' | 'done';
}

export type ImportTab = 'companies' | 'contacts';

// Tab-Konfiguration für Company Modal
export type CompanyTabId = 'general' | 'legal' | 'international' | 'financial' | 'corporate' | 'media';

export interface CompanyTabConfig {
  id: CompanyTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  visible?: (formData: Partial<CompanyEnhanced>) => boolean;
}

// Tab-Konfiguration für Contact Modal
export type ContactTabId = 'general' | 'communication' | 'media' | 'professional' | 'gdpr' | 'personal';

export interface ContactTabConfig {
  id: ContactTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  visible?: (formData: Partial<ContactEnhanced>) => boolean;
}

// Modal Props
export interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: CompanyEnhanced;
  mode: 'create' | 'edit';
}

export interface ContactModalEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: ContactEnhanced;
  mode: 'create' | 'edit';
}

export interface ImportModalEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: ImportResult) => void;
}