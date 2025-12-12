'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { 
  CodeBracketIcon, 
  EyeIcon, 
  DocumentTextIcon,
  PaintBrushIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface TemplateEditorProps {
  templateId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: any) => void;
}

interface EditorTab {
  id: 'html' | 'css' | 'preview' | 'variables';
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const editorTabs: EditorTab[] = [
  { id: 'html', labelKey: 'tabs.html', icon: CodeBracketIcon },
  { id: 'css', labelKey: 'tabs.css', icon: PaintBrushIcon },
  { id: 'variables', labelKey: 'tabs.variables', icon: DocumentTextIcon },
  { id: 'preview', labelKey: 'tabs.preview', icon: EyeIcon },
];

interface TemplateVariable {
  name: string;
  description: string;
  defaultValue: string;
  required: boolean;
  type: 'text' | 'html' | 'image' | 'date';
}

export default function TemplateEditor({ templateId, isOpen, onClose, onSave }: TemplateEditorProps) {
  const t = useTranslations('settings.templates.editor');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'preview' | 'variables'>('html');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Template Data
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  
  // Editor State
  const [previewHtml, setPreviewHtml] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load existing template if editing
  useEffect(() => {
    if (templateId && isOpen) {
      loadTemplate();
    } else if (isOpen && !templateId) {
      // New template - set defaults
      setTemplateData({
        name: t('defaultName'),
        description: '',
        htmlContent: getDefaultHtmlTemplate(),
        cssContent: getDefaultCssTemplate(),
        variables: getDefaultVariables(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, isOpen]);

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      const template = await pdfTemplateService.getTemplateById(templateId!);
      if (template) {
        setTemplateData(template);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Templates:', error);
      setError(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const setTemplateData = (data: any) => {
    setTemplateName(data.name || '');
    setTemplateDescription(data.description || '');
    setHtmlContent(data.htmlContent || '');
    setCssContent(data.cssContent || '');
    setVariables(data.variables || []);
    updatePreview(data.htmlContent || '', data.cssContent || '');
  };

  const getDefaultHtmlTemplate = () => `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{templateTitle}}</title>
</head>
<body>
    <div class="template-container">
        <header class="header">
            <h1>{{companyName}}</h1>
            <p>{{companySlogan}}</p>
        </header>
        
        <main class="content">
            <h2>{{title}}</h2>
            <div class="content-body">
                {{content}}
            </div>
        </main>
        
        <footer class="footer">
            <p>{{footerText}}</p>
        </footer>
    </div>
</body>
</html>`;

  const getDefaultCssTemplate = () => `/* Template Basis-Styling */
.template-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
}

.header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #eee;
}

.header h1 {
    color: #2563eb;
    margin-bottom: 10px;
    font-size: 2.5rem;
}

.header p {
    color: #666;
    font-style: italic;
}

.content {
    margin-bottom: 30px;
}

.content h2 {
    color: #374151;
    margin-bottom: 20px;
    font-size: 1.8rem;
}

.content-body {
    background: #f9fafb;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #2563eb;
}

.footer {
    text-align: center;
    padding-top: 20px;
    border-top: 1px solid #eee;
    color: #666;
    font-size: 0.9rem;
}

/* Print-spezifische Styles */
@media print {
    .template-container {
        max-width: none;
        margin: 0;
        padding: 15px;
    }
    
    .header h1 {
        font-size: 2rem;
    }
    
    .content h2 {
        font-size: 1.5rem;
    }
}`;

  const getDefaultVariables = (): TemplateVariable[] => [
    {
      name: 'templateTitle',
      description: t('defaultVariables.templateTitle.description'),
      defaultValue: t('defaultVariables.templateTitle.defaultValue'),
      required: false,
      type: 'text'
    },
    {
      name: 'companyName',
      description: t('defaultVariables.companyName.description'),
      defaultValue: t('defaultVariables.companyName.defaultValue'),
      required: true,
      type: 'text'
    },
    {
      name: 'companySlogan',
      description: t('defaultVariables.companySlogan.description'),
      defaultValue: t('defaultVariables.companySlogan.defaultValue'),
      required: false,
      type: 'text'
    },
    {
      name: 'title',
      description: t('defaultVariables.title.description'),
      defaultValue: t('defaultVariables.title.defaultValue'),
      required: true,
      type: 'text'
    },
    {
      name: 'content',
      description: t('defaultVariables.content.description'),
      defaultValue: t('defaultVariables.content.defaultValue'),
      required: true,
      type: 'html'
    },
    {
      name: 'footerText',
      description: t('defaultVariables.footerText.description'),
      defaultValue: t('defaultVariables.footerText.defaultValue'),
      required: false,
      type: 'text'
    }
  ];

  const updatePreview = useCallback((html: string, css: string) => {
    // Template mit Beispieldaten füllen
    let previewContent = html;
    variables.forEach(variable => {
      const placeholder = `{{${variable.name}}}`;
      previewContent = previewContent.replace(
        new RegExp(placeholder, 'g'), 
        variable.defaultValue
      );
    });

    // CSS einbetten
    const styledHtml = `
      <style>
        ${css}
      </style>
      ${previewContent}
    `;
    
    setPreviewHtml(styledHtml);
  }, [variables]);

  const validateTemplate = useCallback(() => {
    const errors: string[] = [];

    // HTML Validation
    if (!htmlContent.trim()) {
      errors.push(t('validation.htmlEmpty'));
    } else {
      // Prüfe auf grundlegende HTML-Struktur
      if (!htmlContent.includes('<html') || !htmlContent.includes('<body')) {
        errors.push(t('validation.htmlStructure'));
      }
    }

    // Variable Validation
    const htmlVariables = extractVariablesFromHtml(htmlContent);
    const definedVariables = variables.map(v => v.name);

    // Prüfe auf undefinierte Variablen im HTML
    htmlVariables.forEach(variable => {
      if (!definedVariables.includes(variable)) {
        errors.push(t('validation.undefinedVariable', { variable }));
      }
    });

    // Prüfe auf erforderliche Variablen
    variables.forEach(variable => {
      if (variable.required && !htmlVariables.includes(variable.name)) {
        errors.push(t('validation.requiredVariable', { variable: variable.name }));
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [htmlContent, variables, t]);

  const extractVariablesFromHtml = (html: string): string[] => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = variableRegex.exec(html)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    
    return matches;
  };

  // Syntax Highlighting (einfache Implementierung)
  const highlightCode = useCallback((code: string, language: 'html' | 'css') => {
    if (!code) return '';
    
    let highlighted = code;
    
    if (language === 'html') {
      // HTML Tags hervorheben
      highlighted = highlighted.replace(
        /(&lt;\/?)(\w+)(.*?&gt;)/g,
        '$1<span style="color: #2563eb; font-weight: bold;">$2</span>$3'
      );
      // Template-Variablen hervorheben
      highlighted = highlighted.replace(
        /(\{\{[^}]+\}\})/g,
        '<span style="color: #dc2626; font-weight: bold;">$1</span>'
      );
    } else if (language === 'css') {
      // CSS Properties hervorheben
      highlighted = highlighted.replace(
        /([\w-]+)(\s*:\s*)/g,
        '<span style="color: #2563eb;">$1</span>$2'
      );
      // CSS Values hervorheben
      highlighted = highlighted.replace(
        /(:\s*)([^;]+)(;)/g,
        '$1<span style="color: #dc2626;">$2</span>$3'
      );
    }
    
    return highlighted;
  }, []);

  const handleSave = useCallback(async () => {
    if (!validateTemplate()) {
      setError(t('errors.validationFailed'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const templateData = {
        name: templateName,
        description: templateDescription,
        category: 'custom' as const,
        htmlContent,
        cssContent,
        variables,
        isCustom: true,
        organizationId: currentOrganization?.id || '',
        updatedAt: new Date().toISOString(),
      };

      if (templateId) {
        await pdfTemplateService.updateCustomTemplate(templateId, templateData);
      } else {
        await pdfTemplateService.createCustomTemplate({
          ...templateData,
          createdBy: user?.uid || '',
          thumbnailUrl: '',
        });
      }

      onSave(templateData);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setError(t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [templateId, templateName, templateDescription, htmlContent, cssContent, variables, user, validateTemplate, onSave, onClose, t]);

  const addVariable = () => {
    const newVariable: TemplateVariable = {
      name: 'neueVariable',
      description: t('newVariable.description'),
      defaultValue: '',
      required: false,
      type: 'text'
    };
    setVariables([...variables, newVariable]);
  };

  const updateVariable = (index: number, field: keyof TemplateVariable, value: any) => {
    const updatedVariables = [...variables];
    updatedVariables[index] = { ...updatedVariables[index], [field]: value };
    setVariables(updatedVariables);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  // Update preview when content changes
  useEffect(() => {
    updatePreview(htmlContent, cssContent);
  }, [htmlContent, cssContent, updatePreview]);

  // Validate when content changes
  useEffect(() => {
    if (htmlContent || variables.length > 0) {
      validateTemplate();
    }
  }, [htmlContent, variables, validateTemplate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 h-5/6 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {templateId ? t('title.edit') : t('title.create')}
              </h2>
              <div className="flex items-center mt-2 space-x-4">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="text-sm bg-transparent border-none focus:outline-none focus:ring-0 font-medium text-gray-700"
                  placeholder={t('placeholders.name')}
                />
                {validationErrors.length === 0 && htmlContent && (
                  <div className="flex items-center text-green-600">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    <span className="text-xs">{t('status.valid')}</span>
                  </div>
                )}
                {validationErrors.length > 0 && (
                  <div className="flex items-center text-red-600">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    <span className="text-xs">{t('status.errors', { count: validationErrors.length })}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => updatePreview(htmlContent, cssContent)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 flex items-center"
                title={t('actions.refresh')}
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                {t('actions.refresh')}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">{t('actions.close')}</span>
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-gray-200 flex-shrink-0">
          <nav className="flex space-x-8">
            {editorTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <tab.icon className="h-4 w-4 mr-2" />
                  {t(tab.labelKey)}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="font-medium text-yellow-900 mb-2">{t('validation.title')}</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="h-full p-6 overflow-auto">
            {/* HTML Tab */}
            {activeTab === 'html' && (
              <div className="h-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('labels.htmlTemplate')}
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full h-5/6 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('placeholders.html')}
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('hints.variableSyntax')}
                </p>
              </div>
            )}

            {/* CSS Tab */}
            {activeTab === 'css' && (
              <div className="h-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('labels.cssStyling')}
                </label>
                <textarea
                  value={cssContent}
                  onChange={(e) => setCssContent(e.target.value)}
                  className="w-full h-5/6 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('placeholders.css')}
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('hints.cssEmbed')}
                </p>
              </div>
            )}

            {/* Variables Tab */}
            {activeTab === 'variables' && (
              <div className="h-full">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-700">
                    {t('labels.templateVariables')}
                  </label>
                  <button
                    onClick={addVariable}
                    className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                  >
                    {t('actions.addVariable')}
                  </button>
                </div>

                <div className="space-y-4 h-5/6 overflow-auto">
                  {variables.map((variable, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('variableFields.name')}
                          </label>
                          <input
                            type="text"
                            value={variable.name}
                            onChange={(e) => updateVariable(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('variableFields.type')}
                          </label>
                          <select
                            value={variable.type}
                            onChange={(e) => updateVariable(index, 'type', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="text">{t('variableTypes.text')}</option>
                            <option value="html">{t('variableTypes.html')}</option>
                            <option value="image">{t('variableTypes.image')}</option>
                            <option value="date">{t('variableTypes.date')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('variableFields.description')}
                        </label>
                        <input
                          type="text"
                          value={variable.description}
                          onChange={(e) => updateVariable(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('variableFields.defaultValue')}
                        </label>
                        <input
                          type="text"
                          value={variable.defaultValue}
                          onChange={(e) => updateVariable(index, 'defaultValue', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={variable.required}
                            onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                            className="mr-2"
                          />
                          {t('variableFields.required')}
                        </label>
                        <button
                          onClick={() => removeVariable(index)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          {t('actions.removeVariable')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="h-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('labels.livePreview')}
                </label>
                <div className="w-full h-5/6 border border-gray-300 rounded-lg overflow-auto bg-white">
                  {previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-full"
                      title={t('labels.previewTitle')}
                      sandbox="allow-same-origin allow-scripts"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <EyeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>{t('preview.noPreview')}</p>
                        <p className="text-sm">{t('preview.addHtml')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            {templateDescription && (
              <input
                type="text"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0"
                placeholder={t('placeholders.description')}
              />
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || validationErrors.length > 0 || !templateName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('actions.saving') : templateId ? t('actions.saveChanges') : t('actions.createTemplate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}