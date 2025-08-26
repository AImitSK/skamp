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
  EllipsisVerticalIcon
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
            <Button className=" px-6 py-2">
              <PlusIcon className="h-4 w-4 mr-2" />
              Template erstellen
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
                      <Badge color="gray" className="whitespace-nowrap">
                        {template.layout.type}
                      </Badge>
                    </div>
                    <div className="w-[20%]">
                      {template.isDefault ? (
                        <Badge color="green" className="whitespace-nowrap">
                          <CheckIcon className="h-3 w-3 mr-1" />
                          Standard
                        </Badge>
                      ) : template.isSystem ? (
                        <Badge color="blue" className="whitespace-nowrap">
                          System
                        </Badge>
                      ) : (
                        <Badge color="gray" className="whitespace-nowrap">
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
                        <DropdownButton outline>
                          <EllipsisVerticalIcon className="h-4 w-4" />
                        </DropdownButton>
                        <DropdownMenu>
                          <DropdownItem onClick={() => handlePreviewTemplate(template)}>
                            <EyeIcon className="h-4 w-4 mr-2" />
                            Vorschau
                          </DropdownItem>
                          {!template.isDefault && (
                            <DropdownItem onClick={() => handleSetDefault(template)}>
                              <CheckIcon className="h-4 w-4 mr-2" />
                              Als Standard setzen
                            </DropdownItem>
                          )}
                          {!template.isSystem && (
                            <DropdownItem>
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownItem>
                          )}
                          {!template.isDefault && !template.isSystem && (
                            <DropdownItem color="red" onClick={() => {/* Handle Delete */}}>
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
    </div>
  );
}