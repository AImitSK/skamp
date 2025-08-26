// src/components/templates/TemplateSelector.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { PDFTemplate } from "@/types/pdf-template";
import { pdfTemplateService } from "@/lib/firebase/pdf-template-service";
import { useAuth } from "@/context/AuthContext";
// Einfacher Spinner als Ersatz für LoadingSpinner
const LoadingSpinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };
  
  return (
    <div className="flex items-center justify-center" role="status">
      <ArrowPathIcon className={`animate-spin text-gray-400 ${sizeClasses[size]}`} />
      <span className="sr-only">Lädt...</span>
    </div>
  );
};

interface TemplateSelectorProps {
  organizationId: string;
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string, templateName: string) => void;
  className?: string;
  showPreview?: boolean;
  disabled?: boolean;
  onPreviewError?: (error: string) => void;
}

interface TemplateCardProps {
  template: PDFTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  disabled?: boolean;
  showPreview?: boolean;
}

/**
 * Template-Karte für einzelnes Template
 */
function TemplateCard({
  template,
  isSelected,
  onSelect,
  onPreview,
  disabled = false,
  showPreview = true
}: TemplateCardProps) {
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreview = useCallback(async () => {
    if (!onPreview || disabled) return;
    
    setPreviewLoading(true);
    try {
      await onPreview();
    } finally {
      setPreviewLoading(false);
    }
  }, [onPreview, disabled]);

  return (
    <div
      className={`
        relative border-2 rounded-lg p-4 cursor-pointer transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={!disabled ? onSelect : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Template auswählen: ${template.name}`}
      aria-pressed={isSelected}
    >
      {/* Auswahl-Indikator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircleIcon className="h-6 w-6 text-blue-500" />
        </div>
      )}

      {/* Template-Vorschau-Thumbnail */}
      <div className="mb-4 aspect-[4/3] bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
        {template.thumbnailUrl ? (
          <img 
            src={template.thumbnailUrl} 
            alt={`Vorschau ${template.name}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-center">
            <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Vorschau nicht verfügbar</p>
          </div>
        )}
      </div>

      {/* Template-Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {template.name}
          </h3>
          <div className="flex gap-1 ml-2">
            {template.isSystem && (
              <Badge color="blue" size="sm">System</Badge>
            )}
            {template.usageCount > 0 && (
              <Badge color="gray" size="sm">{template.usageCount}</Badge>
            )}
          </div>
        </div>
        
        <p className="text-xs text-gray-600 line-clamp-2">
          {template.description}
        </p>
        
        {/* Template-Eigenschaften */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            Version {template.version}
          </span>
          {template.lastUsed && (
            <span>
              Zuletzt: {template.lastUsed instanceof Date 
                ? template.lastUsed.toLocaleDateString('de-DE')
                : new Date(template.lastUsed).toLocaleDateString('de-DE')
              }
            </span>
          )}
        </div>
      </div>

      {/* Vorschau-Button */}
      {showPreview && onPreview && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handlePreview();
            }}
            disabled={disabled || previewLoading}
            color="secondary"
            size="sm"
            className="w-full"
          >
            {previewLoading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                Lädt...
              </>
            ) : (
              <>
                <EyeIcon className="h-4 w-4 mr-1" />
                Vorschau
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Template-Auswahl-Komponente für Campaign-Workflow
 * Zeigt verfügbare PDF-Templates an und ermöglicht Auswahl
 */
export function TemplateSelector({
  organizationId,
  selectedTemplateId,
  onTemplateSelect,
  className = "",
  showPreview = true,
  disabled = false,
  onPreviewError
}: TemplateSelectorProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Templates laden
   */
  const loadTemplates = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎯 Lade Templates für Organization:', organizationId);
      
      // Verwende den Service um alle verfügbaren Templates zu laden
      const allTemplates = await pdfTemplateService.getAllTemplatesForOrganization(organizationId);
      
      if (allTemplates.length === 0) {
        console.warn('⚠️ Keine Templates gefunden, lade System-Templates als Fallback');
        const systemTemplates = await pdfTemplateService.getSystemTemplates();
        setTemplates(systemTemplates);
      } else {
        setTemplates(allTemplates);
      }
      
      console.log(`✅ ${allTemplates.length} Templates geladen`);
      
    } catch (err) {
      console.error('❌ Fehler beim Laden der Templates:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden der Templates');
      
      // Fallback: System-Templates laden
      try {
        const systemTemplates = await pdfTemplateService.getSystemTemplates();
        setTemplates(systemTemplates);
        console.log('✅ System-Templates als Fallback geladen');
      } catch (fallbackErr) {
        console.error('❌ Auch System-Templates konnten nicht geladen werden:', fallbackErr);
      }
      
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  /**
   * Templates beim ersten Laden laden
   */
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  /**
   * Template-Auswahl handhaben
   */
  const handleTemplateSelect = useCallback((template: PDFTemplate) => {
    if (disabled) return;
    
    console.log('🎯 Template ausgewählt:', template.id, template.name);
    onTemplateSelect(template.id, template.name);
  }, [disabled, onTemplateSelect]);

  /**
   * Template-Vorschau generieren
   */
  const handleTemplatePreview = useCallback(async (template: PDFTemplate) => {
    if (!user || disabled) return;
    
    try {
      console.log('👁️ Generiere Template-Vorschau für:', template.id);
      
      // Mock-Daten für Vorschau erstellen
      const mockData = {
        title: 'Beispiel Pressemitteilung',
        content: '<p>Dies ist eine Beispiel-Pressemitteilung um das Template-Design zu demonstrieren.</p>',
        companyName: 'Beispiel-Unternehmen GmbH',
        date: new Date().toISOString()
      };
      
      // Template-Vorschau generieren
      const previewHtml = await pdfTemplateService.getTemplatePreview(
        template.id, 
        mockData
      );
      
      // Vorschau in neuem Tab öffnen
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(previewHtml);
        previewWindow.document.close();
      } else {
        console.warn('⚠️ Popup-Blocker verhindert Vorschau-Fenster');
        if (onPreviewError) {
          onPreviewError('Vorschau konnte nicht geöffnet werden. Bitte erlauben Sie Popups für diese Seite.');
        }
      }
      
    } catch (err) {
      console.error('❌ Fehler bei Template-Vorschau:', err);
      const errorMessage = err instanceof Error ? err.message : 'Vorschau konnte nicht generiert werden';
      if (onPreviewError) {
        onPreviewError(errorMessage);
      }
    }
  }, [user, disabled, onPreviewError]);

  /**
   * Retry-Funktion
   */
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadTemplates();
  }, [loadTemplates]);

  // Loading-Status
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600 mt-2">Templates werden geladen...</p>
        </div>
      </div>
    );
  }

  // Error-Status mit Retry
  if (error && templates.length === 0) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800">
              Templates konnten nicht geladen werden
            </h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <div className="mt-3">
              <Button
                onClick={handleRetry}
                color="secondary"
                size="sm"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Erneut versuchen
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Templates anzeigen
  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          PDF-Template auswählen
        </h3>
        <p className="text-sm text-gray-600">
          Wählen Sie ein Template für Ihre PDF-Pressemitteilung. 
          {templates.length > 0 && ` ${templates.length} Templates verfügbar.`}
        </p>
        {error && (
          <div className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Warnung: {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            onSelect={() => handleTemplateSelect(template)}
            onPreview={showPreview ? () => handleTemplatePreview(template) : undefined}
            disabled={disabled}
            showPreview={showPreview}
          />
        ))}
      </div>

      {templates.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <PhotoIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Keine Templates verfügbar</p>
          <Button
            onClick={handleRetry}
            color="secondary"
            size="sm"
            className="mt-2"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Aktualisieren
          </Button>
        </div>
      )}
    </div>
  );
}