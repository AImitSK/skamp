# 🎨 PDF Template System - Implementierungsplan

## 🎯 **ÜBERSICHT**

Erweiterung des bestehenden PDF-Versionierungssystems um ein flexibles Template-System mit 3 Standard-Layouts, Vorschau-Funktionalität und API für benutzerdefinierte Templates.

**🚨 INTEGRATION**: Nahtlose Anbindung an das bestehende PDFVersionsService System

---

## 🏗️ **TEMPLATE-SYSTEM ARCHITEKTUR**

### 📋 **Template-Struktur**

```typescript
interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  version: string; // z.B. "1.0.0"
  
  // LAYOUT-KONFIGURATION:
  layout: {
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
  };
  
  // TYPOGRAFIE:
  typography: {
    primaryFont: string; // 'Inter' | 'Open Sans' | 'Roboto'
    secondaryFont: string;
    baseFontSize: number;
    lineHeight: number;
    headingScale: number[];
  };
  
  // FARBSCHEMA:
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
    border: string;
  };
  
  // KOMPONENTEN-STYLING:
  components: {
    header: ComponentStyle;
    title: ComponentStyle;
    content: ComponentStyle;
    sidebar: ComponentStyle;
    footer: ComponentStyle;
    logo: ComponentStyle;
  };
  
  // TEMPLATE-METADATEN:
  isSystem: boolean; // True für Standard-Templates
  isActive: boolean;
  createdAt: Timestamp;
  createdBy?: string; // User ID für custom templates
  organizationId?: string; // Für org-spezifische templates
}

interface ComponentStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}
```

---

## 🗄️ **DATENBANK-SCHEMA ERWEITERUNG**

### PDF Templates Collection

```typescript
// Neue Collection: pdf_templates
interface PDFTemplateDocument {
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
  };
}

// Organization Collection Erweiterung
interface Organization {
  // ... bestehende Felder
  
  // TEMPLATE-EINSTELLUNGEN:
  pdfSettings: {
    defaultTemplateId: string;
    allowCustomTemplates: boolean;
    maxCustomTemplates: number; // z.B. 5 für Pro-Plan
  };
}

// Campaign Collection Erweiterung  
interface Campaign {
  // ... bestehende Felder
  
  // TEMPLATE-ZUORDNUNG:
  templateId?: string; // Verwendetes Template
  templateOverrides?: Partial<PDFTemplate>; // Individuelle Anpassungen
}
```

---

## 🎨 **STANDARD-TEMPLATES**

### Template 1: "Modern Professional"

```typescript
const MODERN_PROFESSIONAL_TEMPLATE: PDFTemplate = {
  id: 'modern-professional',
  name: 'Modern Professional',
  description: 'Klares, minimalistisches Design für Business-Kommunikation',
  version: '1.0.0',
  
  layout: {
    type: 'modern',
    headerHeight: 80,
    footerHeight: 60,
    margins: { top: 60, right: 50, bottom: 60, left: 50 },
    columns: 1
  },
  
  typography: {
    primaryFont: 'Inter',
    secondaryFont: 'Inter',
    baseFontSize: 11,
    lineHeight: 1.6,
    headingScale: [24, 20, 16, 14]
  },
  
  colorScheme: {
    primary: '#005fab',
    secondary: '#f8fafc',
    accent: '#0ea5e9',
    text: '#1e293b',
    background: '#ffffff',
    border: '#e2e8f0'
  },
  
  components: {
    header: {
      backgroundColor: '#005fab',
      textColor: '#ffffff',
      padding: 20,
      borderRadius: 0
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textColor: '#1e293b',
      textAlign: 'left',
      margin: 20
    },
    content: {
      fontSize: 11,
      textColor: '#475569',
      padding: 20,
      lineHeight: 1.6
    },
    sidebar: {
      backgroundColor: '#f8fafc',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 15,
      borderRadius: 8
    },
    footer: {
      backgroundColor: '#f8fafc',
      textColor: '#64748b',
      fontSize: 9,
      padding: 15,
      textAlign: 'center'
    },
    logo: {
      margin: 10
    }
  },
  
  isSystem: true,
  isActive: true,
  createdAt: new Date(),
};
```

### Template 2: "Classic Elegant"

```typescript
const CLASSIC_ELEGANT_TEMPLATE: PDFTemplate = {
  id: 'classic-elegant',
  name: 'Classic Elegant',
  description: 'Traditionelles Design mit serif-Typografie für formelle Dokumente',
  version: '1.0.0',
  
  layout: {
    type: 'classic',
    headerHeight: 100,
    footerHeight: 80,
    margins: { top: 80, right: 60, bottom: 80, left: 60 },
    columns: 1
  },
  
  typography: {
    primaryFont: 'Times New Roman',
    secondaryFont: 'Georgia',
    baseFontSize: 12,
    lineHeight: 1.8,
    headingScale: [28, 22, 18, 16]
  },
  
  colorScheme: {
    primary: '#1f2937',
    secondary: '#f9fafb',
    accent: '#6b7280',
    text: '#111827',
    background: '#ffffff',
    border: '#d1d5db'
  },
  
  components: {
    header: {
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      padding: 30,
      borderColor: '#1f2937',
      borderWidth: 2
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      textColor: '#1f2937',
      textAlign: 'center',
      margin: 30
    },
    content: {
      fontSize: 12,
      textColor: '#111827',
      padding: 30,
      lineHeight: 1.8
    },
    sidebar: {
      backgroundColor: '#f9fafb',
      borderColor: '#d1d5db',
      borderWidth: 1,
      padding: 20,
      borderRadius: 0
    },
    footer: {
      backgroundColor: '#ffffff',
      textColor: '#6b7280',
      fontSize: 10,
      padding: 20,
      textAlign: 'center',
      borderColor: '#1f2937',
      borderWidth: 1
    },
    logo: {
      margin: 15
    }
  },
  
  isSystem: true,
  isActive: true,
  createdAt: new Date(),
};
```

### Template 3: "Creative Bold"

```typescript
const CREATIVE_BOLD_TEMPLATE: PDFTemplate = {
  id: 'creative-bold',
  name: 'Creative Bold',
  description: 'Lebendiges Design mit starken Farben für kreative Branchen',
  version: '1.0.0',
  
  layout: {
    type: 'modern',
    headerHeight: 120,
    footerHeight: 50,
    margins: { top: 50, right: 40, bottom: 50, left: 40 },
    columns: 1
  },
  
  typography: {
    primaryFont: 'Roboto',
    secondaryFont: 'Open Sans',
    baseFontSize: 11,
    lineHeight: 1.5,
    headingScale: [26, 20, 16, 14]
  },
  
  colorScheme: {
    primary: '#7c3aed',
    secondary: '#fef3c7',
    accent: '#f59e0b',
    text: '#1f2937',
    background: '#ffffff',
    border: '#e5e7eb'
  },
  
  components: {
    header: {
      backgroundColor: '#7c3aed',
      textColor: '#ffffff',
      padding: 25,
      borderRadius: 12
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      textColor: '#7c3aed',
      textAlign: 'left',
      margin: 25
    },
    content: {
      fontSize: 11,
      textColor: '#374151',
      padding: 25,
      lineHeight: 1.5
    },
    sidebar: {
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
      borderWidth: 2,
      padding: 18,
      borderRadius: 12
    },
    footer: {
      backgroundColor: '#f3f4f6',
      textColor: '#6b7280',
      fontSize: 9,
      padding: 12,
      textAlign: 'center',
      borderRadius: 8
    },
    logo: {
      margin: 12
    }
  },
  
  isSystem: true,
  isActive: true,
  createdAt: new Date(),
};
```

---

## 🔧 **SERVICE-ARCHITECTURE**

### PDF Template Service

```typescript
// src/lib/firebase/pdf-template-service.ts

class PDFTemplateService {
  
  // TEMPLATE-MANAGEMENT:
  async getSystemTemplates(): Promise<PDFTemplate[]>
  
  async getOrganizationTemplates(orgId: string): Promise<PDFTemplate[]>
  
  async getDefaultTemplate(orgId: string): Promise<PDFTemplate>
  
  async setDefaultTemplate(orgId: string, templateId: string): Promise<void>
  
  // CUSTOM TEMPLATE-UPLOAD:
  async uploadCustomTemplate(
    orgId: string,
    templateFile: File,
    metadata: Partial<PDFTemplate>
  ): Promise<PDFTemplate>
  
  async validateTemplateFile(file: File): Promise<{
    isValid: boolean;
    errors: string[];
  }>
  
  // TEMPLATE-ANWENDUNG:
  async applyTemplate(
    campaignId: string,
    templateId: string,
    overrides?: Partial<PDFTemplate>
  ): Promise<void>
  
  async getTemplatePreview(
    templateId: string,
    mockData: MockPRData
  ): Promise<string> // HTML Preview
  
  // SYSTEM-MANAGEMENT:
  async initializeSystemTemplates(): Promise<void>
  
  async getTemplateUsageStats(orgId: string): Promise<TemplateUsageStats>
}

// Mock Data für Vorschau
interface MockPRData {
  title: string;
  subtitle: string;
  content: string;
  companyName: string;
  contactInfo: string;
  date: string;
  logo?: string;
}

interface TemplateUsageStats {
  templateId: string;
  templateName: string;
  usageCount: number;
  lastUsed: Date;
  isDefault: boolean;
}
```

### PDF Generator Service Erweiterung

```typescript
// src/lib/services/pdf-generator-service.ts (erweitert)

class PDFGeneratorService {
  
  // TEMPLATE-INTEGRATION:
  async generateWithTemplate(
    campaign: Campaign,
    templateId: string,
    overrides?: Partial<PDFTemplate>
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    metadata: PDFMetadata;
  }>
  
  private async renderWithTemplate(
    content: string,
    template: PDFTemplate
  ): Promise<string>
  
  private async injectTemplateStyles(
    html: string,
    template: PDFTemplate
  ): Promise<string>
  
  // CSS-GENERATION:
  private generateTemplateCSS(template: PDFTemplate): string
  
  private generateComponentCSS(
    componentName: string,
    style: ComponentStyle
  ): string
}
```

---

## 🎨 **UI-KOMPONENTEN**

### Settings Page: PDF Template

```typescript
// src/app/dashboard/settings/pdf-template/page.tsx

export default function PDFTemplateSettingsPage() {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [previewData, setPreviewData] = useState<MockPRData>(DEFAULT_MOCK_DATA);
  const [customizations, setCustomizations] = useState<Partial<PDFTemplate>>({});
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">PDF-Template Einstellungen</h1>
        <p className="mt-2 text-gray-600">
          Wählen Sie ein Layout für Ihre PDF-Exporte und passen Sie das Design an.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TEMPLATE-AUSWAHL */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Layout wählen</h2>
          
          <div className="space-y-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onClick={() => setSelectedTemplate(template)}
              />
            ))}
          </div>
          
          {/* CUSTOM TEMPLATE UPLOAD */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-medium mb-3">Eigenes Template</h3>
            <CustomTemplateUpload
              onUpload={handleCustomTemplateUpload}
            />
          </div>
        </div>
        
        {/* ANPASSUNGEN */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Anpassungen</h2>
          
          {selectedTemplate && (
            <TemplateCustomizer
              template={selectedTemplate}
              customizations={customizations}
              onChange={setCustomizations}
            />
          )}
        </div>
        
        {/* VORSCHAU */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h2 className="text-lg font-semibold mb-4">Vorschau</h2>
            
            <TemplatePreview
              template={selectedTemplate}
              customizations={customizations}
              mockData={previewData}
            />
            
            {/* AKTIONEN */}
            <div className="mt-6 space-y-3">
              <Button
                onClick={handleSaveAsDefault}
                className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white"
              >
                Als Standard speichern
              </Button>
              
              <Button
                onClick={handleDownloadPreview}
                variant="outline"
                className="w-full"
              >
                Vorschau-PDF herunterladen
              </Button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
```

### Template Card Component

```typescript
// src/components/settings/TemplateCard.tsx

interface TemplateCardProps {
  template: PDFTemplate;
  isSelected: boolean;
  onClick: () => void;
}

export function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-[#005fab] bg-blue-50 ring-2 ring-[#005fab] ring-opacity-20'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      {/* TEMPLATE-PREVIEW */}
      <div className="mb-3">
        <div 
          className="h-24 rounded border overflow-hidden"
          style={{ backgroundColor: template.colorScheme.background }}
        >
          <TemplateMiniPreview template={template} />
        </div>
      </div>
      
      {/* TEMPLATE-INFO */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">{template.name}</h3>
          {template.isSystem && (
            <Badge color="gray" className="text-xs">System</Badge>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
        
        {/* FARBSCHEMA-PREVIEW */}
        <div className="flex items-center gap-1 mt-3">
          <div
            className="w-4 h-4 rounded-full border"
            style={{ backgroundColor: template.colorScheme.primary }}
          />
          <div
            className="w-4 h-4 rounded-full border"
            style={{ backgroundColor: template.colorScheme.secondary }}
          />
          <div
            className="w-4 h-4 rounded-full border"
            style={{ backgroundColor: template.colorScheme.accent }}
          />
          <span className="text-xs text-gray-500 ml-2">
            {template.typography.primaryFont}
          </span>
        </div>
      </div>
    </div>
  );
}
```

### Template Customizer

```typescript
// src/components/settings/TemplateCustomizer.tsx

interface TemplateCustomizerProps {
  template: PDFTemplate;
  customizations: Partial<PDFTemplate>;
  onChange: (customizations: Partial<PDFTemplate>) => void;
}

export function TemplateCustomizer({ 
  template, 
  customizations, 
  onChange 
}: TemplateCustomizerProps) {
  
  const updateColorScheme = (color: string, value: string) => {
    onChange({
      ...customizations,
      colorScheme: {
        ...template.colorScheme,
        ...customizations.colorScheme,
        [color]: value
      }
    });
  };
  
  const updateTypography = (property: string, value: string | number) => {
    onChange({
      ...customizations,
      typography: {
        ...template.typography,
        ...customizations.typography,
        [property]: value
      }
    });
  };
  
  return (
    <div className="space-y-6">
      
      {/* FARBSCHEMA */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Farbschema</h3>
        <div className="space-y-3">
          
          <ColorInput
            label="Primärfarbe"
            value={customizations.colorScheme?.primary || template.colorScheme.primary}
            onChange={(value) => updateColorScheme('primary', value)}
          />
          
          <ColorInput
            label="Akzentfarbe"
            value={customizations.colorScheme?.accent || template.colorScheme.accent}
            onChange={(value) => updateColorScheme('accent', value)}
          />
          
          <ColorInput
            label="Textfarbe"
            value={customizations.colorScheme?.text || template.colorScheme.text}
            onChange={(value) => updateColorScheme('text', value)}
          />
          
        </div>
      </div>
      
      {/* TYPOGRAFIE */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Typografie</h3>
        <div className="space-y-3">
          
          <div>
            <Label htmlFor="primary-font">Hauptschriftart</Label>
            <Select
              value={customizations.typography?.primaryFont || template.typography.primaryFont}
              onValueChange={(value) => updateTypography('primaryFont', value)}
            >
              <SelectItem value="Inter">Inter</SelectItem>
              <SelectItem value="Open Sans">Open Sans</SelectItem>
              <SelectItem value="Roboto">Roboto</SelectItem>
              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="font-size">Schriftgröße</Label>
            <Input
              type="number"
              min="8"
              max="16"
              value={customizations.typography?.baseFontSize || template.typography.baseFontSize}
              onChange={(e) => updateTypography('baseFontSize', parseInt(e.target.value))}
            />
          </div>
          
        </div>
      </div>
      
      {/* RESET */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => onChange({})}
          className="w-full"
        >
          Anpassungen zurücksetzen
        </Button>
      </div>
      
    </div>
  );
}
```

### Template Preview

```typescript
// src/components/settings/TemplatePreview.tsx

interface TemplatePreviewProps {
  template: PDFTemplate | null;
  customizations: Partial<PDFTemplate>;
  mockData: MockPRData;
}

export function TemplatePreview({ 
  template, 
  customizations, 
  mockData 
}: TemplatePreviewProps) {
  
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const effectiveTemplate = useMemo(() => {
    if (!template) return null;
    
    return {
      ...template,
      colorScheme: { ...template.colorScheme, ...customizations.colorScheme },
      typography: { ...template.typography, ...customizations.typography },
      components: { ...template.components, ...customizations.components }
    };
  }, [template, customizations]);
  
  useEffect(() => {
    if (!effectiveTemplate) return;
    
    const generatePreview = async () => {
      setLoading(true);
      try {
        const html = await pdfTemplateService.getTemplatePreview(
          effectiveTemplate.id,
          mockData
        );
        setPreviewHtml(html);
      } catch (error) {
        console.error('Preview generation failed:', error);
      } finally {
        setLoading(false);
      }
    };
    
    generatePreview();
  }, [effectiveTemplate, mockData]);
  
  if (!template) {
    return (
      <div className="border rounded-lg h-[500px] flex items-center justify-center text-gray-500">
        Wählen Sie ein Template aus
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Vorschau</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">A4</span>
            {loading && (
              <LoadingSpinner className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>
      
      <div className="h-[500px] overflow-auto bg-white">
        {previewHtml ? (
          <div
            className="transform scale-75 origin-top-left"
            style={{ width: '133.33%', height: '133.33%' }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {loading ? 'Vorschau wird geladen...' : 'Keine Vorschau verfügbar'}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🔌 **API ROUTES**

### Custom Template Upload API

```typescript
// src/app/api/v1/pdf-templates/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);
    const organizationId = formData.get('organizationId') as string;
    
    // VALIDATION:
    if (!file) {
      return NextResponse.json(
        { error: 'No template file provided' },
        { status: 400 }
      );
    }
    
    const validation = await pdfTemplateService.validateTemplateFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid template file', details: validation.errors },
        { status: 400 }
      );
    }
    
    // UPLOAD:
    const template = await pdfTemplateService.uploadCustomTemplate(
      organizationId,
      file,
      metadata
    );
    
    return NextResponse.json({
      success: true,
      template: template
    });
    
  } catch (error) {
    console.error('Template upload failed:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

### Template Management API

```typescript
// src/app/api/v1/pdf-templates/route.ts

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const includeSystem = searchParams.get('includeSystem') === 'true';
  
  try {
    let templates: PDFTemplate[] = [];
    
    if (includeSystem) {
      const systemTemplates = await pdfTemplateService.getSystemTemplates();
      templates.push(...systemTemplates);
    }
    
    if (organizationId) {
      const orgTemplates = await pdfTemplateService.getOrganizationTemplates(organizationId);
      templates.push(...orgTemplates);
    }
    
    return NextResponse.json({
      success: true,
      templates: templates
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { organizationId, templateId, action } = body;
  
  try {
    switch (action) {
      case 'set_default':
        await pdfTemplateService.setDefaultTemplate(organizationId, templateId);
        break;
        
      case 'delete':
        await pdfTemplateService.deleteCustomTemplate(templateId);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}
```

### Template Preview API

```typescript
// src/app/api/v1/pdf-templates/preview/route.ts

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { templateId, customizations, mockData } = body;
  
  try {
    // TEMPLATE LADEN:
    const template = await pdfTemplateService.getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // CUSTOMIZATIONS ANWENDEN:
    const effectiveTemplate = {
      ...template,
      ...customizations
    };
    
    // HTML-PREVIEW GENERIEREN:
    const html = await pdfTemplateService.getTemplatePreview(
      effectiveTemplate,
      mockData
    );
    
    return NextResponse.json({
      success: true,
      html: html
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Preview generation failed' },
      { status: 500 }
    );
  }
}
```

---

## 📱 **NAVIGATION INTEGRATION**

### Settings Navigation

```typescript
// src/components/SettingsNav.tsx (erweitert)

const settingsNavigation = [
  // ... bestehende Navigation
  
  {
    name: 'PDF-Templates',
    href: '/dashboard/settings/pdf-template',
    icon: DocumentIcon,
    description: 'Layout und Design für PDF-Exporte anpassen'
  },
  
  // ... weitere Navigation
];
```

### Dashboard Layout

```typescript
// src/app/dashboard/layout.tsx (erweitert)

// Neue Route in der Navigation hinzufügen:
const dashboardNavigation = [
  // ... bestehende Navigation
  
  {
    name: 'Einstellungen',
    children: [
      { name: 'Allgemein', href: '/dashboard/settings' },
      { name: 'PDF-Templates', href: '/dashboard/settings/pdf-template' },
      { name: 'Team', href: '/dashboard/settings/team' },
    ],
  },
  
  // ... weitere Navigation
];
```

---

## 🧪 **TESTING-STRATEGIE**

### Template Service Tests

```typescript
// src/__tests__/pdf-template-service.test.ts

describe('PDFTemplateService', () => {
  
  describe('getSystemTemplates', () => {
    it('should return all 3 system templates', async () => {
      const templates = await pdfTemplateService.getSystemTemplates();
      
      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.id)).toEqual([
        'modern-professional',
        'classic-elegant', 
        'creative-bold'
      ]);
    });
    
    it('should return templates with valid structure', async () => {
      const templates = await pdfTemplateService.getSystemTemplates();
      
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('colorScheme');
        expect(template).toHaveProperty('typography');
        expect(template).toHaveProperty('components');
        expect(template.isSystem).toBe(true);
      });
    });
  });
  
  describe('uploadCustomTemplate', () => {
    it('should validate and upload custom template', async () => {
      const mockFile = new File(['template-content'], 'custom.json', {
        type: 'application/json'
      });
      
      const template = await pdfTemplateService.uploadCustomTemplate(
        'org-id',
        mockFile,
        {
          name: 'Custom Template',
          description: 'Test template'
        }
      );
      
      expect(template.name).toBe('Custom Template');
      expect(template.isSystem).toBe(false);
      expect(template.organizationId).toBe('org-id');
    });
    
    it('should reject invalid template files', async () => {
      const mockFile = new File(['invalid'], 'invalid.txt', {
        type: 'text/plain'
      });
      
      const validation = await pdfTemplateService.validateTemplateFile(mockFile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unsupported file type');
    });
  });
  
  describe('applyTemplate', () => {
    it('should apply template to campaign', async () => {
      await pdfTemplateService.applyTemplate(
        'campaign-id',
        'modern-professional',
        { colorScheme: { primary: '#ff0000' } }
      );
      
      const campaign = await prService.get('campaign-id');
      expect(campaign.templateId).toBe('modern-professional');
      expect(campaign.templateOverrides.colorScheme.primary).toBe('#ff0000');
    });
  });
  
});
```

### UI Component Tests

```typescript
// src/__tests__/components/TemplateCard.test.tsx

describe('TemplateCard', () => {
  
  const mockTemplate: PDFTemplate = {
    id: 'test-template',
    name: 'Test Template',
    description: 'Test description',
    // ... weitere Template-Daten
  };
  
  it('should render template information', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onClick={jest.fn()}
      />
    );
    
    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });
  
  it('should show selected state', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={true}
        onClick={jest.fn()}
      />
    );
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('border-[#005fab]');
    expect(card).toHaveClass('bg-blue-50');
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    
    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onClick={handleClick}
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
});
```

---

## 📦 **IMPLEMENTIERUNGS-REIHENFOLGE**

### Phase 1: Service Foundation (Woche 1)
1. **PDFTemplateService erstellen**
   - Database Schema implementieren
   - System-Templates definieren
   - CRUD Operations

2. **PDF Generator erweitern**
   - Template-Integration
   - CSS-Generation für Templates

### Phase 2: Settings UI (Woche 2)
1. **Settings Page erstellen**
   - Template-Auswahl Interface
   - Vorschau-Funktionalität
   - Navigation Integration

2. **Template Customizer**
   - Farb- und Schrift-Anpassungen
   - Live-Preview Updates

### Phase 3: API Development (Woche 3)
1. **Upload API implementieren**
   - File-Validation
   - Template-Parsing
   - Storage-Integration

2. **Template Management API**
   - CRUD Operations
   - Preview-Generation

### Phase 4: Integration & Testing (Woche 4)
1. **Campaign Integration**
   - Template-Auswahl im Campaign Editor
   - PDF-Generation mit Templates

2. **Comprehensive Testing**
   - Unit Tests
   - Integration Tests
   - UI Testing

---

## 🎯 **SUCCESS METRICS**

### Performance-Ziele
- **Template-Loading**: < 200ms für Template-Liste
- **Preview-Generation**: < 1 Sekunde für HTML-Preview
- **PDF-Generation**: < 4 Sekunden mit Custom-Template

### User Experience-Ziele
- **Template-Adoption**: 80% der Nutzer verwenden Custom-Templates
- **Customization-Rate**: 60% der Nutzer passen Templates an
- **Upload-Success**: 95% erfolgreiche Custom-Template-Uploads

---

## 🚀 **DEPLOYMENT PLAN**

### Feature-Flags
```typescript
const PDF_TEMPLATE_FLAGS = {
  TEMPLATE_SETTINGS_UI: 'template_settings_ui_enabled',
  CUSTOM_TEMPLATE_UPLOAD: 'custom_template_upload_enabled',
  TEMPLATE_CUSTOMIZATION: 'template_customization_enabled',
  ADVANCED_PREVIEW: 'advanced_preview_enabled'
};
```

### Rollout-Strategie
1. **Week 1**: Service-Layer für Beta-Organisationen
2. **Week 2**: Settings UI für Pro-Plan Kunden
3. **Week 3**: Custom Upload für Enterprise-Kunden
4. **Week 4**: 100% Rollout nach Tests

---

**Status:** 🎯 **BEREIT FÜR IMPLEMENTIERUNG**  
**Erstellt:** 2025-08-20  
**Author:** CeleroPress Team  
**Dependencies:** PDF-Versionierung System (✅ implementiert)  
**Geschätzte Entwicklungszeit:** 4 Wochen