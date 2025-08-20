// src/app/dashboard/settings/pdf-templates/page.tsx - PDF Template Settings Page

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DocumentIcon, 
  PhotoIcon, 
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { PDFTemplate, MockPRData, TemplateUsageStats } from '@/types/pdf-template';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';

export default function PDFTemplateSettingsPage() {
  const { user, organization } = useAuth();
  
  // State Management
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>('');
  const [customizations, setCustomizations] = useState<Partial<PDFTemplate>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [usageStats, setUsageStats] = useState<TemplateUsageStats[]>([]);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Error States
  const [error, setError] = useState<string>('');
  
  // UI States
  const [activeTab, setActiveTab] = useState('selection');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  /**
   * Templates laden
   */
  const loadTemplates = useCallback(async () => {
    if (!organization?.id) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/v1/pdf-templates?organizationId=${organization.id}&includeSystem=true`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Templates konnten nicht geladen werden');
      }
      
      setTemplates(data.templates);
      setDefaultTemplateId(data.defaultTemplateId || '');
      
      // Erstes Template auswählen falls noch keines gewählt
      if (!selectedTemplate && data.templates.length > 0) {
        setSelectedTemplate(data.templates[0]);
      }
      
      console.log('✅ Templates erfolgreich geladen:', data.templates.length);
      
    } catch (error: any) {
      console.error('❌ Fehler beim Laden der Templates:', error);
      setError(error.message || 'Templates konnten nicht geladen werden');
      toast.error('Templates konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [organization?.id, selectedTemplate]);

  /**
   * Usage-Statistiken laden
   */
  const loadUsageStats = useCallback(async () => {
    if (!organization?.id) return;
    
    try {
      const response = await fetch('/api/v1/pdf-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          action: 'get_usage_stats'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUsageStats(data.stats || []);
      }
      
    } catch (error) {
      console.warn('⚠️ Usage-Stats konnten nicht geladen werden:', error);
    }
  }, [organization?.id]);

  /**
   * Template-Vorschau generieren
   */
  const generatePreview = useCallback(async () => {
    if (!selectedTemplate || !organization?.id) return;
    
    try {
      setPreviewLoading(true);
      
      const mockData: MockPRData = {
        title: 'Beispiel-Pressemitteilung: Template-Vorschau',
        content: '<p>Dies ist eine Vorschau-Pressemitteilung, um zu zeigen, wie Ihr Template aussieht.</p><h3>Wichtige Punkte</h3><ul><li>Professionelles Design</li><li>Klare Struktur</li><li>Corporate Identity</li></ul>',
        companyName: organization.name || 'Ihr Unternehmen',
        contactInfo: 'Kontakt: presse@unternehmen.de',
        date: new Date().toLocaleDateString('de-DE'),
        keyVisual: {
          url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop',
          alt: 'Beispielbild',
          caption: 'Beispielbild für Template-Vorschau'
        }
      };
      
      const response = await fetch('/api/v1/pdf-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          customizations,
          mockData,
          organizationId: organization.id,
          includeMetadata: true
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Vorschau konnte nicht generiert werden');
      }
      
      setPreviewHtml(data.html);
      
    } catch (error: any) {
      console.error('❌ Fehler bei Vorschau-Generierung:', error);
      toast.error('Vorschau konnte nicht generiert werden');
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedTemplate, customizations, organization]);

  /**
   * Template als Standard setzen
   */
  const handleSetDefault = async () => {
    if (!selectedTemplate || !organization?.id) return;
    
    try {
      setSaving(true);
      
      const response = await fetch('/api/v1/pdf-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          templateId: selectedTemplate.id,
          action: 'set_default'
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Standard-Template konnte nicht gesetzt werden');
      }
      
      setDefaultTemplateId(selectedTemplate.id);
      toast.success(`${selectedTemplate.name} wurde als Standard-Template gesetzt`);
      
    } catch (error: any) {
      console.error('❌ Fehler beim Setzen des Standard-Templates:', error);
      toast.error(error.message || 'Standard-Template konnte nicht gesetzt werden');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Custom Template hochladen
   */
  const handleCustomUpload = async () => {
    if (!uploadFile || !organization?.id || !user?.id) return;
    
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('template', uploadFile);
      formData.append('organizationId', organization.id);
      formData.append('userId', user.id);
      formData.append('metadata', JSON.stringify({
        name: uploadFile.name.replace(/\.[^/.]+$/, ''), // Dateiendung entfernen
        description: `Custom Template hochgeladen am ${new Date().toLocaleDateString('de-DE')}`
      }));
      
      const response = await fetch('/api/v1/pdf-templates/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Template-Upload fehlgeschlagen');
      }
      
      toast.success('Custom Template erfolgreich hochgeladen');
      setUploadFile(null);
      
      // Templates neu laden
      await loadTemplates();
      
    } catch (error: any) {
      console.error('❌ Fehler beim Template-Upload:', error);
      toast.error(error.message || 'Template-Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  /**
   * PDF-Vorschau herunterladen
   */
  const handleDownloadPreview = async () => {
    if (!selectedTemplate) return;
    
    try {
      toast.loading('PDF wird generiert...', { id: 'pdf-preview' });
      
      const mockData = {
        title: 'Template-Vorschau',
        mainContent: '<p>Dies ist eine Vorschau Ihres Templates als PDF-Dokument.</p>',
        clientName: organization?.name || 'Ihr Unternehmen',
        campaignId: 'preview',
        organizationId: organization?.id || '',
        userId: user?.id || '',
        templateId: selectedTemplate.id,
        templateCustomizations: customizations,
        boilerplateSections: []
      };
      
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockData)
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'PDF-Generierung fehlgeschlagen');
      }
      
      // PDF herunterladen
      window.open(data.pdfUrl, '_blank');
      toast.success('PDF-Vorschau erfolgreich generiert', { id: 'pdf-preview' });
      
    } catch (error: any) {
      console.error('❌ Fehler bei PDF-Vorschau:', error);
      toast.error(error.message || 'PDF-Vorschau fehlgeschlagen', { id: 'pdf-preview' });
    }
  };

  // Effects
  useEffect(() => {
    if (organization?.id) {
      loadTemplates();
      loadUsageStats();
    }
  }, [organization?.id, loadTemplates, loadUsageStats]);

  useEffect(() => {
    if (selectedTemplate && activeTab === 'preview') {
      generatePreview();
    }
  }, [selectedTemplate, customizations, generatePreview, activeTab]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">PDF-Template Einstellungen</h1>
        <p className="mt-2 text-gray-600">
          Wählen Sie ein Layout für Ihre PDF-Exporte und passen Sie das Design an Ihre Corporate Identity an.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6" variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="selection">Template wählen</TabsTrigger>
          <TabsTrigger value="customization">Anpassen</TabsTrigger>
          <TabsTrigger value="preview">Vorschau</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        {/* Template Selection */}
        <TabsContent value="selection" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                isDefault={defaultTemplateId === template.id}
                onClick={() => setSelectedTemplate(template)}
                usageStats={usageStats.find(s => s.templateId === template.id)}
              />
            ))}
          </div>

          {/* Template Actions */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DocumentIcon className="h-5 w-5" />
                  {selectedTemplate.name}
                </CardTitle>
                <CardDescription>{selectedTemplate.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSetDefault}
                    disabled={saving || defaultTemplateId === selectedTemplate.id}
                    className="bg-[#005fab] hover:bg-[#004a8c]"
                  >
                    {saving ? 'Speichern...' : 'Als Standard setzen'}
                  </Button>
                  
                  {defaultTemplateId === selectedTemplate.id && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Standard-Template
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Template Customization */}
        <TabsContent value="customization" className="space-y-6">
          {selectedTemplate ? (
            <TemplateCustomizer
              template={selectedTemplate}
              customizations={customizations}
              onChange={setCustomizations}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">
                  Wählen Sie zuerst ein Template aus, um es anzupassen.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Template Preview */}
        <TabsContent value="preview" className="space-y-6">
          {selectedTemplate ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vorschau-Einstellungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Template</Label>
                    <div className="mt-1 text-sm text-gray-600">
                      {selectedTemplate.name} (Version {selectedTemplate.version})
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={generatePreview}
                      disabled={previewLoading}
                      variant="outline"
                    >
                      {previewLoading ? 'Generiere...' : 'Vorschau aktualisieren'}
                    </Button>
                    
                    <Button
                      onClick={handleDownloadPreview}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      PDF herunterladen
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <TemplatePreview
                html={previewHtml}
                loading={previewLoading}
                templateName={selectedTemplate.name}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">
                  Wählen Sie zuerst ein Template aus, um eine Vorschau zu sehen.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Custom Upload */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Eigenes Template hochladen</CardTitle>
              <CardDescription>
                Laden Sie Ihr eigenes Template im JSON-Format hoch. 
                Unterstützte Dateiformate: .json (maximal 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template-upload">Template-Datei</Label>
                <Input
                  id="template-upload"
                  type="file"
                  accept=".json"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
              
              {uploadFile && (
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm">
                    <strong>Datei:</strong> {uploadFile.name}<br />
                    <strong>Größe:</strong> {(uploadFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              )}
              
              <Button
                onClick={handleCustomUpload}
                disabled={!uploadFile || uploading}
                className="flex items-center gap-2"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                {uploading ? 'Wird hochgeladen...' : 'Template hochladen'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === KOMPONENTEN ===

interface TemplateCardProps {
  template: PDFTemplate;
  isSelected: boolean;
  isDefault: boolean;
  onClick: () => void;
  usageStats?: TemplateUsageStats;
}

function TemplateCard({ template, isSelected, isDefault, onClick, usageStats }: TemplateCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-[#005fab] border-[#005fab] bg-blue-50' 
          : 'hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Template Preview */}
        <div className="mb-4 h-32 rounded border overflow-hidden bg-white relative">
          <TemplateMiniPreview template={template} />
          {isDefault && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-100 text-green-800 text-xs">
                Standard
              </Badge>
            </div>
          )}
        </div>
        
        {/* Template Info */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{template.name}</h3>
            {template.isSystem && (
              <Badge variant="secondary" className="text-xs">System</Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
          
          {/* Color Scheme Preview */}
          <div className="flex items-center gap-2 mb-2">
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
          
          {/* Usage Stats */}
          {usageStats && (
            <div className="text-xs text-gray-500">
              Verwendet: {usageStats.usageCount}x
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TemplateMiniPreviewProps {
  template: PDFTemplate;
}

function TemplateMiniPreview({ template }: TemplateMiniPreviewProps) {
  return (
    <div className="w-full h-full p-2 text-xs">
      {/* Header */}
      <div
        className="h-4 rounded mb-1 flex items-center px-2"
        style={{ 
          backgroundColor: template.colorScheme.primary,
          color: template.components.header.textColor || '#ffffff'
        }}
      >
        <div className="text-xs font-medium">HEADER</div>
      </div>
      
      {/* Title */}
      <div
        className="h-3 mb-1"
        style={{ 
          color: template.colorScheme.primary,
          fontFamily: template.typography.primaryFont 
        }}
      >
        <div className="text-xs font-bold truncate">Template Titel</div>
      </div>
      
      {/* Content Lines */}
      <div className="space-y-1">
        <div className="h-1 bg-gray-300 rounded w-full"></div>
        <div className="h-1 bg-gray-300 rounded w-4/5"></div>
        <div className="h-1 bg-gray-300 rounded w-3/4"></div>
      </div>
      
      {/* Sidebar */}
      <div
        className="h-4 mt-2 rounded px-1 flex items-center"
        style={{ 
          backgroundColor: template.colorScheme.secondary,
          borderLeft: `2px solid ${template.colorScheme.primary}`
        }}
      >
        <div className="text-xs">Textbaustein</div>
      </div>
    </div>
  );
}

interface TemplateCustomizerProps {
  template: PDFTemplate;
  customizations: Partial<PDFTemplate>;
  onChange: (customizations: Partial<PDFTemplate>) => void;
}

function TemplateCustomizer({ template, customizations, onChange }: TemplateCustomizerProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Farbschema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog6ToothIcon className="h-5 w-5" />
            Farbschema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primary-color">Primärfarbe</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="primary-color"
                type="color"
                value={customizations.colorScheme?.primary || template.colorScheme.primary}
                onChange={(e) => updateColorScheme('primary', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={customizations.colorScheme?.primary || template.colorScheme.primary}
                onChange={(e) => updateColorScheme('primary', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="accent-color">Akzentfarbe</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="accent-color"
                type="color"
                value={customizations.colorScheme?.accent || template.colorScheme.accent}
                onChange={(e) => updateColorScheme('accent', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={customizations.colorScheme?.accent || template.colorScheme.accent}
                onChange={(e) => updateColorScheme('accent', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="text-color">Textfarbe</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="text-color"
                type="color"
                value={customizations.colorScheme?.text || template.colorScheme.text}
                onChange={(e) => updateColorScheme('text', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={customizations.colorScheme?.text || template.colorScheme.text}
                onChange={(e) => updateColorScheme('text', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Typografie */}
      <Card>
        <CardHeader>
          <CardTitle>Typografie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primary-font">Hauptschriftart</Label>
            <Select
              value={customizations.typography?.primaryFont || template.typography.primaryFont}
              onValueChange={(value) => updateTypography('primaryFont', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="font-size">Schriftgröße (pt)</Label>
            <Input
              id="font-size"
              type="number"
              min="8"
              max="16"
              value={customizations.typography?.baseFontSize || template.typography.baseFontSize}
              onChange={(e) => updateTypography('baseFontSize', parseInt(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="line-height">Zeilenhöhe</Label>
            <Input
              id="line-height"
              type="number"
              min="1"
              max="3"
              step="0.1"
              value={customizations.typography?.lineHeight || template.typography.lineHeight}
              onChange={(e) => updateTypography('lineHeight', parseFloat(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Reset Button */}
      <div className="md:col-span-2">
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              onClick={() => onChange({})}
              className="w-full"
            >
              Anpassungen zurücksetzen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface TemplatePreviewProps {
  html: string;
  loading: boolean;
  templateName: string;
}

function TemplatePreview({ html, loading, templateName }: TemplatePreviewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vorschau wird geladen...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhotoIcon className="h-5 w-5" />
          Vorschau: {templateName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="h-96 overflow-auto">
            {html ? (
              <div
                className="transform scale-50 origin-top-left"
                style={{ width: '200%', height: '200%' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Keine Vorschau verfügbar
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}