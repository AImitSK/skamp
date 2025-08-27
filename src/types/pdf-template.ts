// src/types/pdf-template.ts - TypeScript-Interfaces für PDF-Template-System

import { Timestamp } from 'firebase/firestore';

/**
 * Haupt-Interface für PDF-Templates
 * Definiert Struktur, Design und Verhalten eines PDF-Templates
 */
export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  version: string; // z.B. "1.0.0"
  
  // LAYOUT-KONFIGURATION:
  layout: TemplateLayout;
  
  // TYPOGRAFIE:
  typography: TemplateTypography;
  
  // FARBSCHEMA:
  colorScheme: TemplateColorScheme;
  
  // KOMPONENTEN-STYLING:
  components: TemplateComponents;
  
  // TEMPLATE-METADATEN:
  isSystem: boolean; // True für Standard-Templates
  isActive: boolean;
  createdAt: Timestamp | Date;
  createdBy?: string; // User ID für custom templates
  organizationId?: string; // Für org-spezifische templates
  
  // USAGE-TRACKING:
  usageCount?: number;
  lastUsed?: Timestamp | Date;
  
  // PREVIEW:
  thumbnailUrl?: string; // URL für Template-Vorschau-Bild
  
  // CUSTOM TEMPLATE SPECIFIC:
  category?: 'standard' | 'premium' | 'custom';
  variables?: TemplateVariable[];
  customContent?: {
    htmlContent: string;
    cssContent?: string;
    variables: TemplateVariable[];
  };
}

/**
 * Layout-Konfiguration für Templates
 */
export interface TemplateLayout {
  type: 'standard' | 'modern' | 'classic' | 'custom';
  headerHeight: number;
  footerHeight: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  columns: 1 | 2;
  pageFormat: 'A4' | 'Letter' | 'A3';
}

/**
 * Typografie-Einstellungen für Templates
 */
export interface TemplateTypography {
  primaryFont: string; // 'Inter' | 'Open Sans' | 'Roboto' | 'Times New Roman' | 'Georgia'
  secondaryFont: string;
  baseFontSize: number;
  lineHeight: number;
  headingScale: number[]; // [h1, h2, h3, h4] font sizes
}

/**
 * Farbschema für Templates
 */
export interface TemplateColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
  border: string;
  success?: string;
  warning?: string;
  error?: string;
}

/**
 * Template-Komponenten-Styling
 */
export interface TemplateComponents {
  header: ComponentStyle;
  title: ComponentStyle;
  content: ComponentStyle;
  sidebar: ComponentStyle;
  footer: ComponentStyle;
  logo: ComponentStyle;
  keyVisual: ComponentStyle;
  boilerplate: ComponentStyle;
}

/**
 * Styling-Eigenschaften für Komponenten
 */
export interface ComponentStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  display?: string;
  width?: string;
  height?: string;
  // CSS-spezifische Eigenschaften:
  boxShadow?: string;
  gradient?: string;
}

/**
 * Template-Dokument für Firestore
 */
export interface PDFTemplateDocument {
  id: string;
  template: PDFTemplate;
  
  // SYSTEM-MANAGEMENT:
  isDefault: boolean; // Ein Template pro Org als Standard
  usageCount: number; // Tracking für beliebte Templates
  lastUsed: Timestamp;
  
  // UPLOAD-INFORMATION (für Custom Templates):
  uploadedFile?: {
    originalName: string;
    storageUrl: string;
    fileSize: number;
    checksum: string;
    mimeType: string;
  };
  
  // VERSIONING:
  parentTemplateId?: string; // Bei Custom-Templates von System-Template abgeleitet
  isCustomization: boolean; // True wenn Template eine Anpassung eines System-Templates ist
  
  // METADATA:
  metadata?: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    version: string;
    isActive: boolean;
    organizationId: string;
    createdBy: string;
  };
}

/**
 * Template-Anwendung auf Campaigns
 */
export interface CampaignTemplateAssignment {
  campaignId: string;
  templateId: string;
  templateOverrides?: Partial<PDFTemplate>; // Individuelle Anpassungen
  appliedAt: Timestamp | Date;
  appliedBy: string; // User ID
}

/**
 * Mock-Daten für Template-Vorschau
 */
export interface MockPRData {
  title: string;
  subtitle?: string;
  content: string;
  companyName: string;
  contactInfo?: string; // Optional gemacht für einfachere Mock-Daten
  date: string;
  logo?: string;
  keyVisual?: {
    url: string;
    alt: string;
    caption?: string;
  };
  boilerplateSections?: Array<{
    customTitle?: string;
    content: string;
    type: 'lead' | 'main' | 'quote' | 'contact';
  }>;
}

/**
 * Template-Usage-Statistiken
 */
export interface TemplateUsageStats {
  templateId: string;
  templateName: string;
  usageCount: number;
  lastUsed: Date;
  isDefault: boolean;
  isSystem: boolean;
  averageGenerationTime?: number; // in milliseconds
}

/**
 * Template-Validierung
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Template-Variable für Custom Templates
 */
export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue: string;
  required: boolean;
  type: 'text' | 'html' | 'image' | 'date';
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string; // RegEx pattern
    allowedValues?: string[]; // Für Select-Felder
  };
}

/**
 * Template-Customization-Options für UI
 */
export interface TemplateCustomizationOptions {
  allowColorSchemeChange: boolean;
  allowTypographyChange: boolean;
  allowLayoutChange: boolean;
  allowComponentStyling: boolean;
  maxCustomTemplates: number;
  supportedFileTypes: string[]; // ['json', 'html', 'css']
}

/**
 * Template-Kategorie für bessere Organisation
 */
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  templates: string[]; // Template-IDs
}

/**
 * Template-Export/Import-Formate
 */
export interface TemplateExportData {
  template: PDFTemplate;
  assets?: Array<{
    type: 'css' | 'font' | 'image';
    name: string;
    data: string; // Base64 encoded
  }>;
  exportedAt: Date;
  exportedBy: string;
  version: string;
}

/**
 * Erweiterte Template-Konfiguration für Organizations
 */
export interface OrganizationTemplateSettings {
  organizationId: string;
  defaultTemplateId: string;
  allowCustomTemplates: boolean;
  maxCustomTemplates: number;
  customizationOptions: TemplateCustomizationOptions;
  templateCategories?: TemplateCategory[];
  brandingAssets?: {
    logo?: string;
    colors?: TemplateColorScheme;
    fonts?: string[];
  };
}

/**
 * Template-Performance-Metriken
 */
export interface TemplatePerformanceMetrics {
  templateId: string;
  averageRenderTime: number; // milliseconds
  averagePdfGenerationTime: number; // milliseconds
  cacheHitRate: number; // percentage
  errorRate: number; // percentage
  totalUsages: number;
  lastMetricsUpdate: Date;
}

/**
 * System-Template-Definitionen (Konstanten)
 */
export const SYSTEM_TEMPLATE_IDS = {
  MODERN_PROFESSIONAL: 'modern-professional',
  CLASSIC_ELEGANT: 'classic-elegant',
  CREATIVE_BOLD: 'creative-bold'
} as const;

export type SystemTemplateId = typeof SYSTEM_TEMPLATE_IDS[keyof typeof SYSTEM_TEMPLATE_IDS];

/**
 * Template-Events für Tracking/Analytics
 */
export interface TemplateEvent {
  eventType: 'template_selected' | 'template_customized' | 'template_applied' | 'pdf_generated';
  templateId: string;
  organizationId: string;
  userId: string;
  campaignId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}