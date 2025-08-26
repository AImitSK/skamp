// src/components/templates/TemplatePreviewModal.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import type { PDFTemplate, MockPRData } from '@/types/pdf-template';

interface TemplatePreviewModalProps {
  template: PDFTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: PDFTemplate) => void;
  organizationId: string;
  className?: string;
}

type MockDataType = 'default' | 'tech' | 'healthcare' | 'finance';

interface MockDataOption {
  value: MockDataType;
  label: string;
  industry: string;
}

const MOCK_DATA_OPTIONS: MockDataOption[] = [
  { value: 'default', label: 'Standard Pressemitteilung', industry: 'Allgemein' },
  { value: 'tech', label: 'Tech-Startup Ankündigung', industry: 'Technologie' },
  { value: 'healthcare', label: 'Pharma Produktlaunch', industry: 'Gesundheit' },
  { value: 'finance', label: 'Finanzdienstleistung Update', industry: 'Finanzen' }
];

/**
 * Template-Preview-Modal mit Live-Preview, Mock-Daten-Auswahl und Vollbild-Modus
 * Entspricht CeleroPress Design System v2.0
 */
export function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onSelect,
  organizationId,
  className = ""
}: TemplatePreviewModalProps) {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMockData, setSelectedMockData] = useState<MockDataType>('default');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  /**
   * Template-Vorschau generieren
   */
  const generatePreview = useCallback(async () => {
    if (!template || !organizationId) return;

    try {
      setLoading(true);
      setIsGeneratingPreview(true);
      setError(null);

      console.log('🎯 Generiere Template-Vorschau:', {
        templateId: template.id,
        mockDataType: selectedMockData,
        organizationId
      });

      const response = await fetch('/api/v1/pdf-templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template.id,
          organizationId,
          mockDataType: selectedMockData,
          renderOptions: {
            includeStyles: true,
            inlineAssets: true,
            responsive: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Preview-Generation fehlgeschlagen: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Preview konnte nicht generiert werden');
      }

      setPreviewHtml(data.html);
      console.log('✅ Template-Vorschau erfolgreich generiert');

    } catch (err) {
      console.error('❌ Fehler bei Template-Vorschau:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler bei Preview-Generation';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsGeneratingPreview(false);
    }
  }, [template, organizationId, selectedMockData]);

  /**
   * Preview bei Template-Änderung oder Modal-Öffnung neu generieren
   */
  useEffect(() => {
    if (isOpen && template) {
      generatePreview();
    }
  }, [isOpen, template, generatePreview]);

  /**
   * Template auswählen und Modal schließen
   */
  const handleSelectTemplate = useCallback(() => {
    if (template) {
      console.log('✅ Template aus Preview ausgewählt:', template.id);
      onSelect(template);
      onClose();
    }
  }, [template, onSelect, onClose]);

  /**
   * Vollbild-Modus umschalten
   */
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  /**
   * Mock-Daten-Typ wechseln
   */
  const handleMockDataChange = useCallback((value: MockDataType | React.ChangeEvent<HTMLSelectElement>) => {
    const newType = typeof value === 'string' ? value : value.target.value as MockDataType;
    console.log('🔄 Mock-Daten-Typ gewechselt von', selectedMockData, 'zu', newType);
    setSelectedMockData(newType);
  }, [selectedMockData]);

  /**
   * ESC-Taste zum Schließen
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !template) {
    return null;
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className={`
          fixed inset-0 z-50 flex items-center justify-center p-4
          ${isFullscreen ? 'p-0' : ''}
        `}
      >
        <div
          data-testid="template-preview-modal"
          className={`
            bg-white rounded-lg border border-zinc-200 flex flex-col
            transition-all duration-300 ease-in-out
            ${isFullscreen 
              ? 'w-full h-full rounded-none fullscreen' 
              : 'w-full max-w-6xl h-[90vh] max-h-[900px]'
            }
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  Template-Vorschau: {template.name}
                </h2>
                <p className="text-sm text-zinc-600 mt-1">
                  {template.description} • Version {template.version}
                </p>
              </div>
              <div className="flex gap-2">
                {template.isSystem && (
                  <Badge color="blue" size="sm">System</Badge>
                )}
                <Badge color="gray" size="sm">{template.layout.type}</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mock-Daten Auswahl */}
              <Select
                value={selectedMockData}
                onChange={handleMockDataChange}
                aria-label="Mock-Daten auswählen"
                className="min-w-48"
              >
                {MOCK_DATA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.industry})
                  </option>
                ))}
              </Select>

              {/* Vollbild Toggle */}
              <Button
                onClick={toggleFullscreen}
                color="secondary"
                size="sm"
                aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="h-4 w-4" />
                ) : (
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                )}
              </Button>

              {/* Preview Aktualisieren */}
              <Button
                onClick={generatePreview}
                disabled={loading}
                color="secondary"
                size="sm"
                aria-label="Vorschau aktualisieren"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              {/* Modal Schließen */}
              <Button
                onClick={onClose}
                color="secondary"
                size="sm"
                aria-label="Modal schließen"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-hidden">
            {loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div 
                    data-testid="loading-spinner"
                    className="animate-spin h-8 w-8 border-2 border-zinc-200 border-t-blue-500 rounded-full mx-auto mb-4"
                  />
                  <h3 className="text-lg font-medium text-zinc-900 mb-2">
                    Vorschau wird generiert
                  </h3>
                  <p className="text-sm text-zinc-600">
                    Template wird mit {MOCK_DATA_OPTIONS.find(o => o.value === selectedMockData)?.label} erstellt...
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-900 mb-2">
                    Fehler beim Generieren der Vorschau
                  </h3>
                  <p className="text-sm text-zinc-600 mb-4">
                    {error}
                  </p>
                  <Button
                    onClick={generatePreview}
                    color="secondary"
                    size="sm"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Erneut versuchen
                  </Button>
                </div>
              </div>
            )}

            {previewHtml && !loading && (
              <div className="h-full">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0 bg-white"
                  title={`Template-Vorschau: ${template.name}`}
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t border-zinc-200 bg-zinc-50 flex-shrink-0">
            <div className="text-sm text-zinc-600">
              {previewHtml ? (
                <span className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green-500" />
                  Vorschau bereit mit {MOCK_DATA_OPTIONS.find(o => o.value === selectedMockData)?.label}
                </span>
              ) : (
                <span>Template-Vorschau wird vorbereitet...</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                color="secondary"
                disabled={loading}
              >
                Schließen
              </Button>
              
              <Button
                onClick={handleSelectTemplate}
                disabled={loading || !previewHtml}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Template verwenden
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}