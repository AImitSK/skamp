// src/app/dashboard/settings/templates/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettingsNav } from '@/components/SettingsNav';
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/ui/dropdown';
import { 
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ScaleIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  CloudArrowUpIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
// pdfTemplateService wird über API Routes verwendet
import type { PDFTemplate } from '@/types/pdf-template';
import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal';
import { TemplateComparison } from '@/components/templates/TemplateComparison';
import { TemplateUploadWizard } from '@/components/templates/TemplateUploadWizard';
import { TemplateEditor } from '@/components/templates/TemplateEditor';

export default function TemplatesPage() {
  const { currentOrganization } = useOrganization();
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PDFTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PDFTemplate | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      loadTemplates();
    }
  }, [currentOrganization]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      // Verwende API Route für Server-seitige Template-Loading
      const response = await fetch('/api/templates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        throw new Error('Failed to load templates');
      }
    } catch (error) {
      // Template-Loading fehlgeschlagen - fallback auf Default Templates
      // Fallback: Default Templates
      const defaultTemplates: PDFTemplate[] = [
        {
          id: 'standard',
          name: 'Standard Template',
          description: 'Klassisches CeleroPress PDF-Layout',
          version: '1.0.0',
          layout: {
            type: 'standard',
            headerHeight: 60,
            footerHeight: 40,
            margins: { top: 15, right: 15, bottom: 15, left: 15 },
            columns: 1,
            pageFormat: 'A4'
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
            header: { backgroundColor: '#005fab', textColor: '#ffffff', padding: 20 },
            title: { fontSize: 24, fontWeight: 'bold', textColor: '#1e293b' },
            content: { fontSize: 11, textColor: '#475569' },
            sidebar: { backgroundColor: '#f8fafc' },
            footer: { backgroundColor: '#f8fafc' },
            logo: {},
            keyVisual: {},
            boilerplate: {}
          },
          isSystem: true,
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'modern',
          name: 'Modern Template',
          description: 'Modernes, sauberes Design',
          version: '1.0.0',
          layout: {
            type: 'modern',
            headerHeight: 80,
            footerHeight: 50,
            margins: { top: 15, right: 15, bottom: 15, left: 15 },
            columns: 1,
            pageFormat: 'A4'
          },
          typography: {
            primaryFont: 'Open Sans',
            secondaryFont: 'Roboto',
            baseFontSize: 10,
            lineHeight: 1.5,
            headingScale: [22, 18, 14, 12]
          },
          colorScheme: {
            primary: '#3b82f6',
            secondary: '#fbbf24',
            accent: '#10b981',
            text: '#111827',
            background: '#ffffff',
            border: '#d1d5db'
          },
          components: {
            header: { backgroundColor: '#3b82f6', textColor: '#ffffff', padding: 20 },
            title: { fontSize: 22, fontWeight: 'bold', textColor: '#111827' },
            content: { fontSize: 10, textColor: '#4b5563' },
            sidebar: { backgroundColor: '#f9fafb' },
            footer: { backgroundColor: '#f9fafb' },
            logo: {},
            keyVisual: {},
            boilerplate: {}
          },
          isSystem: true,
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'classic',
          name: 'Classic Template', 
          description: 'Traditionelles Business-Layout',
          version: '1.0.0',
          layout: {
            type: 'classic',
            headerHeight: 100,
            footerHeight: 80,
            margins: { top: 15, right: 15, bottom: 15, left: 15 },
            columns: 1,
            pageFormat: 'A4'
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
            border: '#e5e7eb'
          },
          components: {
            header: { backgroundColor: '#1f2937', textColor: '#ffffff', padding: 25 },
            title: { fontSize: 28, fontWeight: 'bold', textColor: '#111827' },
            content: { fontSize: 12, textColor: '#374151' },
            sidebar: { backgroundColor: '#f9fafb' },
            footer: { backgroundColor: '#f9fafb' },
            logo: {},
            keyVisual: {},
            boilerplate: {}
          },
          isSystem: true,
          isActive: true,
          createdAt: new Date()
        }
      ];
      setTemplates(defaultTemplates);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewTemplate = (template: PDFTemplate) => {
    // Template-Vorschau öffnen
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  const handleClosePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewTemplate(null);
  };

  const handleSelectFromPreview = (template: PDFTemplate) => {
    // Template aus Vorschau ausgewählt
    handleSetDefault(template);
  };

  const handleShowComparison = () => {
    // Template-Vergleich öffnen
    setShowComparisonModal(true);
  };

  const handleCloseComparison = () => {
    setShowComparisonModal(false);
  };

  const handleSelectFromComparison = (template: PDFTemplate) => {
    // Template aus Vergleich ausgewählt
    handleSetDefault(template);
  };

  const handleSetDefault = async (template: PDFTemplate) => {
    try {
      // Verwende API Route für Server-seitige Operations
      const response = await fetch('/api/templates/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: currentOrganization!.id,
          templateId: template.id
        }),
      });

      if (response.ok) {
        await loadTemplates();
      } else {
        throw new Error('Failed to set default template');
      }
    } catch (error) {
      // Fehler beim Setzen des Default-Templates
    }
  };

  const handleTemplateUploaded = (templateId: string) => {
    // Template wurde hochgeladen - Liste neu laden
    loadTemplates();
    setShowUploadWizard(false);
  };

  const handleTemplateCreated = (templateData: any) => {
    // Template wurde erstellt - Liste neu laden
    loadTemplates();
    setShowTemplateEditor(false);
    setEditingTemplate(null);
  };

  const handleEditTemplate = (template: PDFTemplate) => {
    setEditingTemplate(template);
    setShowTemplateEditor(true);
  };

  const handleDeleteTemplate = async (template: PDFTemplate) => {
    if (!currentOrganization?.id) return;
    
    try {
      const response = await fetch(`/api/v1/pdf-templates/upload?templateId=${template.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await loadTemplates();
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Templates:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <Heading>PDF Templates</Heading>
        <div className="mt-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    // Flex-Container für das zweispaltige Layout (Design Pattern)
    <div className="flex flex-col gap-10 lg:flex-row">
      
      {/* Linke Spalte: Navigation */}
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <SettingsNav />
      </aside>

      {/* Rechte Spalte: Hauptinhalt */}
      <div className="flex-1 space-y-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <Heading level={1}>PDF Templates</Heading>
            <Text className="mt-2 text-gray-600">
              Verwalte deine PDF-Layout-Vorlagen für Pressemitteilungen
            </Text>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button 
              onClick={handleShowComparison}
              color="secondary"
              disabled={templates.length < 2}
              className="px-6 py-2"
            >
              <ScaleIcon className="h-4 w-4 mr-2" />
              Vergleichen
            </Button>
            <Button 
              onClick={() => setShowTemplateEditor(true)}
              color="secondary"
              className="px-6 py-2"
            >
              <CodeBracketIcon className="h-4 w-4 mr-2" />
              Template erstellen
            </Button>
            <Button 
              onClick={() => setShowUploadWizard(true)}
              className="px-6 py-2"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Template hochladen
            </Button>
          </div>
        </div>

        {/* Templates Table */}
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center">
              <div className="w-[40%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Template
              </div>
              <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Typ
              </div>
              <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Status
              </div>
              <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Version
              </div>
              <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                Aktionen
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <div className="px-6 py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto"></div>
              </div>
            ) : templates.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <div className="space-y-4">
                  <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400" />
                  <div>
                    <Text className="text-lg font-medium text-gray-900 mb-2">
                      Noch keine Templates vorhanden
                    </Text>
                    <Text className="text-gray-500">
                      Erstelle dein erstes PDF-Template um loszulegen.
                    </Text>
                    <div className="mt-6">
                      <Button className=" px-6 py-2">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Template erstellen
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center">
                    <div className="w-[40%] min-w-0">
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="h-5 w-5 text-zinc-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {template.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {template.description}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-[20%]">
                      <Badge color="zinc" className="whitespace-nowrap">
                        {template.layout.type}
                      </Badge>
                    </div>
                    <div className="w-[20%]">
                      {template.isSystem ? (
                        <Badge color="blue" className="whitespace-nowrap">
                          System
                        </Badge>
                      ) : (
                        <Badge color="zinc" className="whitespace-nowrap">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <div className="w-[15%]">
                      <span className="text-sm text-gray-500">
                        v{template.version}
                      </span>
                    </div>
                    <div className="flex-1 flex justify-end">
                      <Dropdown>
                        <DropdownButton plain>
                          <EllipsisVerticalIcon className="h-4 w-4" />
                        </DropdownButton>
                        <DropdownMenu>
                          <DropdownItem onClick={() => handlePreviewTemplate(template)}>
                            <EyeIcon className="h-4 w-4 mr-2" />
                            Vorschau
                          </DropdownItem>
                          {!template.isSystem && (
                            <DropdownItem onClick={() => handleEditTemplate(template)}>
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownItem>
                          )}
                          {!template.isSystem && (
                            <DropdownItem color="red" onClick={() => handleDeleteTemplate(template)}>
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownItem>
                          )}
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Template Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={showPreviewModal}
        onClose={handleClosePreviewModal}
        onSelect={handleSelectFromPreview}
        organizationId={currentOrganization?.id || ''}
      />

      {/* Template Comparison Modal */}
      <TemplateComparison
        templates={templates}
        isOpen={showComparisonModal}
        onClose={handleCloseComparison}
        onSelect={handleSelectFromComparison}
        organizationId={currentOrganization?.id || ''}
      />

      {/* Template Upload Wizard */}
      <TemplateUploadWizard
        isOpen={showUploadWizard}
        onClose={() => setShowUploadWizard(false)}
        onTemplateUploaded={handleTemplateUploaded}
      />

      {/* Template Editor */}
      <TemplateEditor
        templateId={editingTemplate?.id}
        isOpen={showTemplateEditor}
        onClose={() => {
          setShowTemplateEditor(false);
          setEditingTemplate(null);
        }}
        onSave={handleTemplateCreated}
      />
    </div>
  );
}