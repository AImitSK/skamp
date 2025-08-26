// src/components/templates/TemplateComparison.tsx
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
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import type { PDFTemplate, MockPRData } from '@/types/pdf-template';

interface TemplateComparisonProps {
  templates: PDFTemplate[];
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

interface PreviewState {
  html: string;
  loading: boolean;
  error: string | null;
}

const MOCK_DATA_OPTIONS: MockDataOption[] = [
  { value: 'default', label: 'Standard Pressemitteilung', industry: 'Allgemein' },
  { value: 'tech', label: 'Tech-Startup Ankündigung', industry: 'Technologie' },
  { value: 'healthcare', label: 'Pharma Produktlaunch', industry: 'Gesundheit' },
  { value: 'finance', label: 'Finanzdienstleistung Update', industry: 'Finanzen' }
];

/**
 * Template-Vergleich-Modal für Side-by-Side Template-Vorschau
 * Ermöglicht gleichzeitigen Vergleich von bis zu 3 Templates
 */
export function TemplateComparison({
  templates,
  isOpen,
  onClose,
  onSelect,
  organizationId,
  className = ""
}: TemplateComparisonProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<PDFTemplate[]>([]);
  const [selectedMockData, setSelectedMockData] = useState<MockDataType>('default');
  const [previewStates, setPreviewStates] = useState<Map<string, PreviewState>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const maxTemplatesPerPage = isFullscreen ? 3 : 2;
  const totalPages = Math.ceil(selectedTemplates.length / maxTemplatesPerPage);
  const currentTemplates = selectedTemplates.slice(
    currentPage * maxTemplatesPerPage,
    (currentPage + 1) * maxTemplatesPerPage
  );

  /**
   * Template zu Vergleich hinzufügen/entfernen
   */
  const toggleTemplateInComparison = useCallback((template: PDFTemplate) => {
    setSelectedTemplates(prev => {
      const isSelected = prev.some(t => t.id === template.id);
      
      if (isSelected) {
        // Template entfernen
        const newTemplates = prev.filter(t => t.id !== template.id);
        setPreviewStates(prevStates => {
          const newStates = new Map(prevStates);
          newStates.delete(template.id);
          return newStates;
        });
        return newTemplates;
      } else {
        // Template hinzufügen (max 6 Templates)
        if (prev.length >= 6) {
          return prev;
        }
        return [...prev, template];
      }
    });
  }, []);

  /**
   * Preview für einzelnes Template generieren
   */
  const generateTemplatePreview = useCallback(async (template: PDFTemplate) => {
    try {
      // Generiere Vergleichs-Vorschau

      setPreviewStates(prev => new Map(prev.set(template.id, {
        ...prev.get(template.id),
        loading: true,
        error: null
      } as PreviewState)));

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
            responsive: true,
            compactMode: true // Für Vergleichsansicht optimiert
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

      setPreviewStates(prev => new Map(prev.set(template.id, {
        html: data.html,
        loading: false,
        error: null
      })));

      // Vergleichs-Vorschau generiert

    } catch (err) {
      // Fehler bei Vergleichs-Vorschau
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      
      setPreviewStates(prev => new Map(prev.set(template.id, {
        html: '',
        loading: false,
        error: errorMessage
      })));
    }
  }, [organizationId, selectedMockData]);

  /**
   * Alle Previews neu generieren
   */
  const regenerateAllPreviews = useCallback(async () => {
    for (const template of selectedTemplates) {
      await generateTemplatePreview(template);
    }
  }, [selectedTemplates, generateTemplatePreview]);

  /**
   * Templates bei Auswahl automatisch laden
   */
  useEffect(() => {
    for (const template of selectedTemplates) {
      if (!previewStates.has(template.id)) {
        generateTemplatePreview(template);
      }
    }
  }, [selectedTemplates, generateTemplatePreview, previewStates]);

  /**
   * Mock-Daten-Typ wechseln und Previews aktualisieren
   */
  const handleMockDataChange = useCallback(async (value: MockDataType | React.ChangeEvent<HTMLSelectElement>) => {
    const newType = typeof value === 'string' ? value : value.target.value as MockDataType;
    // Mock-Daten-Typ gewechselt
    setSelectedMockData(newType);
    // Nach kurzer Verzögerung alle Previews neu laden
    setTimeout(() => {
      regenerateAllPreviews();
    }, 100);
  }, [selectedMockData, regenerateAllPreviews]);

  /**
   * Template auswählen und Modal schließen
   */
  const handleSelectTemplate = useCallback((template: PDFTemplate) => {
    // Template aus Vergleich ausgewählt
    onSelect(template);
    onClose();
  }, [onSelect, onClose]);

  /**
   * Vollbild-Modus umschalten
   */
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    setCurrentPage(0); // Zurück zu erster Seite bei Layout-Wechsel
  }, []);

  /**
   * Seitenwechsel
   */
  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  }, []);

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

  /**
   * Initial verfügbare Templates als Standard auswählen
   */
  useEffect(() => {
    if (isOpen && templates.length > 0 && selectedTemplates.length === 0) {
      // Bis zu 3 Templates automatisch auswählen
      setSelectedTemplates(templates.slice(0, Math.min(3, templates.length)));
    }
  }, [isOpen, templates, selectedTemplates.length]);

  if (!isOpen) {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`
            bg-white rounded-lg border border-zinc-200 flex flex-col
            transition-all duration-300 ease-in-out
            ${isFullscreen 
              ? 'w-full h-full rounded-none' 
              : 'w-full max-w-7xl h-[90vh] max-h-[900px]'
            }
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Template-Vergleich
              </h2>
              <p className="text-sm text-zinc-600 mt-1">
                {selectedTemplates.length} von {templates.length} Templates • 
                Seite {currentPage + 1} von {totalPages}
              </p>
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

              {/* Seitenwechsel */}
              {totalPages > 1 && (
                <div className="flex gap-1">
                  <Button
                    onClick={previousPage}
                    disabled={currentPage === 0}
                    color="secondary"
                    size="sm"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={nextPage}
                    disabled={currentPage === totalPages - 1}
                    color="secondary"
                    size="sm"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Modal Schließen */}
              <Button
                onClick={onClose}
                color="secondary"
                size="sm"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Template-Auswahl */}
          <div className="p-4 border-b border-zinc-200 bg-zinc-50">
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => {
                const isSelected = selectedTemplates.some(t => t.id === template.id);
                return (
                  <button
                    key={template.id}
                    onClick={() => toggleTemplateInComparison(template)}
                    disabled={!isSelected && selectedTemplates.length >= 6}
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium transition-colors
                      flex items-center gap-2
                      ${isSelected
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
                      }
                      ${!isSelected && selectedTemplates.length >= 6 
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                      }
                    `}
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    {template.name}
                    {isSelected && <CheckIcon className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
            {selectedTemplates.length >= 6 && (
              <p className="text-xs text-amber-600 mt-2">
                Maximal 6 Templates können gleichzeitig verglichen werden.
              </p>
            )}
          </div>

          {/* Template-Vergleichsansicht */}
          <div className="flex-1 overflow-hidden">
            {selectedTemplates.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <DocumentTextIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-900 mb-2">
                    Keine Templates ausgewählt
                  </h3>
                  <p className="text-sm text-zinc-600">
                    Wählen Sie Templates aus um sie zu vergleichen.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full p-4">
                <div 
                  className={`
                    h-full grid gap-4
                    ${currentTemplates.length === 1 ? 'grid-cols-1' : 
                      currentTemplates.length === 2 ? 'grid-cols-2' : 
                      'grid-cols-3'
                    }
                  `}
                >
                  {currentTemplates.map((template) => {
                    const previewState = previewStates.get(template.id) || { html: '', loading: false, error: null };
                    
                    return (
                      <div key={template.id} className="border border-zinc-200 rounded-lg overflow-hidden">
                        {/* Template-Header */}
                        <div className="p-3 border-b border-zinc-200 bg-zinc-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-zinc-900 text-sm">
                                {template.name}
                              </h4>
                              <p className="text-xs text-zinc-600">
                                {template.description}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {template.isSystem && (
                                <Badge color="blue" size="sm">System</Badge>
                              )}
                              <Button
                                onClick={() => handleSelectTemplate(template)}
                                size="sm"
                                color="secondary"
                                className="text-xs px-2 py-1"
                              >
                                Verwenden
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Template-Preview */}
                        <div className="h-96 relative">
                          {previewState.loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white">
                              <div className="text-center">
                                <div className="animate-spin h-6 w-6 border-2 border-zinc-200 border-t-blue-500 rounded-full mx-auto mb-2" />
                                <p className="text-xs text-zinc-600">Lädt...</p>
                              </div>
                            </div>
                          )}

                          {previewState.error && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white">
                              <div className="text-center p-4">
                                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                                <p className="text-xs text-red-600 mb-2">
                                  Fehler beim Laden
                                </p>
                                <Button
                                  onClick={() => generateTemplatePreview(template)}
                                  size="sm"
                                  color="secondary"
                                  className="text-xs"
                                >
                                  <ArrowPathIcon className="h-3 w-3 mr-1" />
                                  Erneut
                                </Button>
                              </div>
                            </div>
                          )}

                          {previewState.html && !previewState.loading && (
                            <iframe
                              srcDoc={previewState.html}
                              className="w-full h-full border-0 bg-white"
                              title={`Vorschau: ${template.name}`}
                              sandbox="allow-same-origin allow-scripts"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t border-zinc-200 bg-zinc-50 flex-shrink-0">
            <div className="text-sm text-zinc-600">
              {selectedTemplates.length} Templates im Vergleich • 
              Mock-Daten: {MOCK_DATA_OPTIONS.find(o => o.value === selectedMockData)?.label}
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={regenerateAllPreviews}
                color="secondary"
                size="sm"
                disabled={selectedTemplates.length === 0}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Alle aktualisieren
              </Button>
              
              <Button
                onClick={onClose}
                color="secondary"
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}