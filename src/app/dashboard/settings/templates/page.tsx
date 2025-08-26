// src/app/dashboard/settings/templates/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettingsNav } from '@/components/SettingsNav';
import { 
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ScaleIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
// pdfTemplateService wird über API Routes verwendet
import type { PDFTemplate } from '@/types/pdf-template';
import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal';
import { TemplateComparison } from '@/components/templates/TemplateComparison';

export default function TemplatesPage() {
  const { currentOrganization } = useOrganization();
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PDFTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

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
      setTemplates([
        {
          id: 'standard',
          name: 'Standard Template',
          description: 'Klassisches CeleroPress PDF-Layout',
          version: '1.0.0',
          isDefault: true,
          layout: { type: 'standard' }
        },
        {
          id: 'modern',
          name: 'Modern Template',
          description: 'Modernes, sauberes Design',
          version: '1.0.0',
          isDefault: true,
          layout: { type: 'modern' }
        },
        {
          id: 'classic',
          name: 'Classic Template', 
          description: 'Traditionelles Business-Layout',
          version: '1.0.0',
          isDefault: true,
          layout: { type: 'classic' }
        }
      ] as PDFTemplate[]);
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
      <div className="flex-1">
        <div className="md:flex md:items-center md:justify-between mb-8">
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
              Templates vergleichen
            </Button>
            <Button className=" px-6 py-2">
              <PlusIcon className="h-4 w-4 mr-2" />
              Custom Template erstellen
            </Button>
          </div>
        </div>

        <div className="max-w-4xl">
          <div className="bg-white ring-1 ring-gray-900/5 sm:rounded-xl">
            <div className="px-4 py-6 sm:p-8">
              
              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6"
                  >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <DocumentTextIcon className="h-5 w-5 text-zinc-500" />
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {template.name}
                  </h3>
                  {template.isDefault && (
                    <Badge color="green">Standard</Badge>
                  )}
                </div>
                <Text className="text-sm">
                  {template.description}
                </Text>
                <Text className="text-xs text-zinc-500 mt-1">
                  Version {template.version}
                </Text>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  color="secondary"
                  onClick={() => handlePreviewTemplate(template)}
                >
                  <EyeIcon className="h-4 w-4" />
                  Vorschau
                </Button>
                
                {!template.isDefault && (
                  <Button 
                    size="sm" 
                    color="secondary"
                    onClick={() => handleSetDefault(template)}
                  >
                    <CheckIcon className="h-4 w-4" />
                    Als Standard
                  </Button>
                )}
              </div>
              
              {!template.isDefault && (
                <Button 
                  size="sm" 
                  color="red"
                  onClick={() => {/* Handle Delete */}}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
                ))}
              </div>

              {/* Empty State */}
              {templates.length === 0 && (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-zinc-400" />
                  <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Keine Templates vorhanden
                  </h3>
                  <Text className="mt-1 text-sm">
                    Erstelle dein erstes PDF-Template um loszulegen.
                  </Text>
                  <div className="mt-6">
                    <Button className=" px-6 py-2">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Template erstellen
                    </Button>
                  </div>
                </div>
              )}
              
            </div>
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
    </div>
  );
}