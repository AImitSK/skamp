// src/app/dashboard/settings/templates/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import type { PDFTemplate } from '@/types/pdf-template';

export default function TemplatesPage() {
  const { currentOrganization } = useOrganization();
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      loadTemplates();
    }
  }, [currentOrganization]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // System Templates laden (falls verfügbar)
      const systemTemplates = await pdfTemplateService.getSystemTemplates();
      
      // Organization Templates laden (falls verfügbar) 
      const orgTemplates = await pdfTemplateService.getOrganizationTemplates?.(currentOrganization!.id) || [];
      
      setTemplates([...systemTemplates, ...orgTemplates]);
    } catch (error) {
      console.error('Error loading templates:', error);
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

  const handlePreviewTemplate = async (template: PDFTemplate) => {
    try {
      // Template Vorschau öffnen
      const previewUrl = `/api/v1/pdf-templates/preview?templateId=${template.id}`;
      window.open(previewUrl, '_blank');
    } catch (error) {
      console.error('Error previewing template:', error);
    }
  };

  const handleSetDefault = async (template: PDFTemplate) => {
    try {
      await pdfTemplateService.setDefaultTemplate?.(currentOrganization!.id, template.id);
      await loadTemplates();
    } catch (error) {
      console.error('Error setting default template:', error);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Heading>PDF Templates</Heading>
          <Text>Verwalte deine PDF-Layout-Vorlagen für Pressemitteilungen</Text>
        </div>
        <Button color="indigo">
          <PlusIcon className="h-4 w-4" />
          Custom Template erstellen
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
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
                  variant="ghost"
                  onClick={() => handlePreviewTemplate(template)}
                >
                  <EyeIcon className="h-4 w-4" />
                  Vorschau
                </Button>
                
                {!template.isDefault && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleSetDefault(template)}
                  >
                    <PencilIcon className="h-4 w-4" />
                    Als Standard
                  </Button>
                )}
              </div>
              
              {!template.isDefault && (
                <Button 
                  size="sm" 
                  color="red" 
                  variant="ghost"
                  onClick={() => {/* Handle Delete */}}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

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
            <Button color="indigo">
              <PlusIcon className="h-4 w-4" />
              Template erstellen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}