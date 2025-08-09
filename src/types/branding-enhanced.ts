// src/types/branding-enhanced.ts

import { BrandingSettings } from './branding';

// Enhanced Branding Settings für Component Props
export interface BrandingSettingsEnhanced extends BrandingSettings {
  // Status-Informationen
  isLoading?: boolean;
  isSaving?: boolean;
  isUploadingLogo?: boolean;
  hasChanges?: boolean;
  
  // Validation State
  validationErrors?: Record<string, string>;
  isValid?: boolean;
}

// Component Props Interfaces
export interface BrandingPageProps {
  className?: string;
}

export interface BrandingFormProps {
  formData: Partial<BrandingSettings>;
  onSubmit: (data: Partial<BrandingSettings>) => void;
  onChange: (data: Partial<BrandingSettings>) => void;
  loading?: boolean;
  saving?: boolean;
  validationErrors?: Record<string, string>;
  className?: string;
}

export interface BrandingLogoUploadProps {
  currentLogoUrl?: string;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
  uploading?: boolean;
  className?: string;
}

export interface BrandingFormFieldsProps {
  formData: Partial<BrandingSettings>;
  onChange: (data: Partial<BrandingSettings>) => void;
  validationErrors?: Record<string, string>;
  className?: string;
}

export interface BrandingPreviewProps {
  settings: BrandingSettings;
  showFullPreview?: boolean;
  className?: string;
}

// Alert Props für Feedback
export interface BrandingAlertProps {
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

// Service Context Interface
export interface BrandingServiceContext {
  organizationId: string;
  userId: string;
}

// Upload Configuration
export interface BrandingUploadConfig {
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  uploadPath: string;
  thumbnailSizes?: number[];
}

// Validation Result
export interface BrandingValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

// Form State Interface
export interface BrandingFormState {
  formData: Partial<BrandingSettings>;
  originalData: Partial<BrandingSettings>;
  validationErrors: Record<string, string>;
  isDirty: boolean;
  isSubmitting: boolean;
}

// Hook Return Types
export interface UseBrandingReturn {
  settings: BrandingSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<BrandingSettings>) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  removeLogo: () => Promise<void>;
  resetForm: () => void;
  validateSettings: (data: Partial<BrandingSettings>) => BrandingValidationResult;
}

// Constants
export const BRANDING_CONSTANTS = {
  MAX_LOGO_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_COMPANY_NAME_LENGTH: 100,
  MIN_COMPANY_NAME_LENGTH: 2,
  DEFAULT_COUNTRY: 'Deutschland',
  
  // Form Field Names
  FORM_FIELDS: {
    COMPANY_NAME: 'companyName',
    LOGO_URL: 'logoUrl',
    STREET: 'address.street',
    POSTAL_CODE: 'address.postalCode',
    CITY: 'address.city',
    COUNTRY: 'address.country',
    PHONE: 'phone',
    EMAIL: 'email',
    WEBSITE: 'website',
    SHOW_COPYRIGHT: 'showCopyright'
  } as const,
  
  // Validation Messages
  VALIDATION_MESSAGES: {
    COMPANY_NAME_REQUIRED: 'Firmenname ist erforderlich',
    COMPANY_NAME_TOO_SHORT: 'Firmenname muss mindestens 2 Zeichen lang sein',
    COMPANY_NAME_TOO_LONG: 'Firmenname darf maximal 100 Zeichen lang sein',
    EMAIL_INVALID: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
    WEBSITE_INVALID: 'Bitte geben Sie eine gültige URL ein (z.B. https://example.com)',
    PHONE_INVALID: 'Bitte geben Sie eine gültige Telefonnummer ein',
    LOGO_TOO_LARGE: 'Die Datei darf maximal 5MB groß sein',
    LOGO_INVALID_TYPE: 'Bitte wählen Sie eine Bilddatei aus'
  } as const,
  
  // Success Messages  
  SUCCESS_MESSAGES: {
    SETTINGS_SAVED: 'Branding-Einstellungen erfolgreich gespeichert',
    LOGO_UPLOADED: 'Logo erfolgreich hochgeladen',
    LOGO_REMOVED: 'Logo erfolgreich entfernt'
  } as const,
  
  // Error Messages
  ERROR_MESSAGES: {
    SETTINGS_SAVE_FAILED: 'Fehler beim Speichern der Einstellungen',
    SETTINGS_LOAD_FAILED: 'Fehler beim Laden der Einstellungen',
    LOGO_UPLOAD_FAILED: 'Fehler beim Hochladen des Logos',
    LOGO_REMOVE_FAILED: 'Fehler beim Entfernen des Logos',
    VALIDATION_FAILED: 'Bitte überprüfen Sie Ihre Eingaben',
    ORGANIZATION_MISSING: 'Bitte warten Sie, bis die Daten geladen sind'
  } as const,
  
  // CSS Classes
  CSS_CLASSES: {
    FORM_CONTAINER: 'max-w-4xl',
    CARD: 'bg-white rounded-lg shadow-sm border border-gray-200',
    CARD_CONTENT: 'p-6 space-y-6',
    CARD_FOOTER: 'bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3',
    LOGO_PREVIEW: 'h-24 w-auto rounded-lg border border-gray-200',
    LOGO_PLACEHOLDER: 'h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50',
    ERROR_TEXT: 'text-sm text-red-600 mt-1',
    SUCCESS_ALERT: 'bg-green-50 text-green-700',
    ERROR_ALERT: 'bg-red-50 text-red-700',
    INFO_BOX: 'bg-blue-50 border border-blue-200 rounded-lg p-4',
    LOADING_SPINNER: 'animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto'
  } as const
} as const;

// Type Guards
export const isBrandingSettings = (obj: any): obj is BrandingSettings => {
  return obj && typeof obj === 'object' && typeof obj.companyName === 'string';
};

export const isBrandingValidationResult = (obj: any): obj is BrandingValidationResult => {
  return obj && 
    typeof obj === 'object' && 
    typeof obj.isValid === 'boolean' &&
    typeof obj.errors === 'object';
};

// Utility Types
export type BrandingFormField = keyof BrandingSettings;
export type BrandingValidationField = 'companyName' | 'email' | 'website' | 'phone';
export type BrandingAlertType = 'success' | 'error' | 'info' | 'warning';

// Helper Functions
export const getBrandingFieldValue = (
  settings: Partial<BrandingSettings>, 
  field: string
): any => {
  if (field.includes('.')) {
    const [parent, child] = field.split('.');
    return (settings as any)[parent]?.[child];
  }
  return (settings as any)[field];
};

export const setBrandingFieldValue = (
  settings: Partial<BrandingSettings>,
  field: string,
  value: any
): Partial<BrandingSettings> => {
  if (field.includes('.')) {
    const [parent, child] = field.split('.');
    return {
      ...settings,
      [parent]: {
        ...(settings as any)[parent],
        [child]: value
      }
    };
  }
  
  return {
    ...settings,
    [field]: value
  };
};

export const hasValidLogo = (settings: Partial<BrandingSettings>): boolean => {
  return !!(settings.logoUrl && settings.logoUrl.trim());
};

export const getFormattedAddress = (address?: BrandingSettings['address']): string => {
  if (!address) return '';
  
  const parts = [
    address.street,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
};

// Default Values
export const DEFAULT_BRANDING_SETTINGS: Partial<BrandingSettings> = {
  companyName: '',
  address: {
    street: '',
    postalCode: '',
    city: '',
    country: BRANDING_CONSTANTS.DEFAULT_COUNTRY
  },
  phone: '',
  email: '',
  website: '',
  showCopyright: true
};

export const DEFAULT_BRANDING_FORM_STATE: BrandingFormState = {
  formData: DEFAULT_BRANDING_SETTINGS,
  originalData: DEFAULT_BRANDING_SETTINGS,
  validationErrors: {},
  isDirty: false,
  isSubmitting: false
};