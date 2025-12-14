// src/components/templates/TemplateSelector.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { PDFTemplate } from "@/types/pdf-template";
import { pdfTemplateService } from "@/lib/firebase/pdf-template-service";
import { useAuth } from "@/context/AuthContext";
import { Timestamp } from "firebase/firestore";

// Einfacher Spinner als Ersatz für LoadingSpinner
const LoadingSpinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const t = useTranslations('templates.selector');
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className="flex items-center justify-center" role="status">
      <ArrowPathIcon className={`animate-spin text-gray-400 ${sizeClasses[size]}`} />
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
};

interface TemplateSelectorProps {
  organizationId: string;
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string, templateName: string, silent?: boolean) => void;
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

interface TemplateCategoryProps {
  title: string;
  templates: PDFTemplate[];
  selectedTemplateId?: string;
  onTemplateSelect: (template: PDFTemplate) => void;
  onTemplatePreview: (template: PDFTemplate) => Promise<void>;
  disabled?: boolean;
  showPreview?: boolean;
  defaultOpen?: boolean;
}

/**
 * Template-Kategorie mit Toggle-Funktionalität
 */
function TemplateCategory({
  title,
  templates,
  selectedTemplateId,
  onTemplateSelect,
  onTemplatePreview,
  disabled = false,
  showPreview = true,
  defaultOpen = true
}: TemplateCategoryProps) {
  const t = useTranslations('templates.selector');
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Kategorie-Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <Badge color="zinc">{templates.length}</Badge>
          {/* Badge für ausgewähltes Template bei geschlossenem Toggle */}
          {!isExpanded && selectedTemplateId && templates.some(t => t.id === selectedTemplateId) && (
            <Badge color="blue" className="ml-1">
              {templates.find(t => t.id === selectedTemplateId)?.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* Template-Grid */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onSelect={() => onTemplateSelect(template)}
              onPreview={showPreview ? () => onTemplatePreview(template) : undefined}
              disabled={disabled}
              showPreview={showPreview}
            />
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-center py-6 text-gray-500">
              <PhotoIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{t('category.empty')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  const t = useTranslations('templates.selector');
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreview = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPreview || disabled) return;

    setPreviewLoading(true);
    try {
      await onPreview();
    } finally {
      setPreviewLoading(false);
    }
  }, [onPreview, disabled]);

  // Konvertiere Timestamp zu Date für die Anzeige
  const getLastUsedDate = () => {
    if (!template.lastUsed) return null;
    
    if (template.lastUsed instanceof Date) {
      return template.lastUsed.toLocaleDateString('de-DE');
    }
    
    // Firestore Timestamp
    if (template.lastUsed && typeof template.lastUsed === 'object' && 'toDate' in template.lastUsed) {
      return (template.lastUsed as Timestamp).toDate().toLocaleDateString('de-DE');
    }
    
    return null;
  };

  const lastUsedDate = getLastUsedDate();

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
      aria-label={t('card.selectTemplate', { name: template.name })}
      aria-pressed={isSelected}
    >
      {/* Auswahl-Indikator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircleIcon className="h-6 w-6 text-blue-500" />
        </div>
      )}

      {/* Template-Vorschau-Thumbnail */}
      <div className="mb-3 aspect-[4/3] bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={t('card.previewAlt', { name: template.name })}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-center">
            <PhotoIcon className="h-10 w-10 text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">{template.name}</p>
            <div className="text-xs text-gray-400 mt-2">
              {t('card.thumbnailGenerating')}
            </div>
          </div>
        )}
      </div>

      {/* Template-Info */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {template.name}
          </h3>
          <div className="flex gap-1 flex-shrink-0">
            {template.isSystem && (
              <Badge color="blue">
                <SparklesIcon className="h-3 w-3" />
              </Badge>
            )}
          </div>
        </div>
        
        <p className="text-xs text-gray-600 line-clamp-2">
          {template.description}
        </p>
        
        {/* Template-Eigenschaften */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            v{template.version}
          </span>
          <div className="flex items-center gap-2">
            {template.usageCount !== undefined && template.usageCount > 0 && (
              <Badge color="zinc">{template.usageCount}x</Badge>
            )}
            {lastUsedDate && (
              <span className="hidden sm:inline">{lastUsedDate}</span>
            )}
          </div>
        </div>
      </div>

      {/* Vorschau-Button */}
      {showPreview && onPreview && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <Button
            onClick={handlePreview}
            disabled={disabled || previewLoading}
            color="secondary"
            className="w-full text-xs py-1.5"
          >
            {previewLoading ? (
              <>
                <ArrowPathIcon className="h-3 w-3 mr-1 animate-spin" />
                {t('loading')}
              </>
            ) : (
              <>
                <EyeIcon className="h-3 w-3 mr-1" />
                {t('card.preview')}
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
  const t = useTranslations('templates.selector');
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
      
      // Lade Templates für Organization
      const allTemplates = await pdfTemplateService.getAllTemplatesForOrganization(organizationId);
      
      if (allTemplates.length === 0) {
        // Keine Templates gefunden, lade System-Templates als Fallback
        const systemTemplates = await pdfTemplateService.getSystemTemplates();
        setTemplates(systemTemplates);
      } else {
        setTemplates(allTemplates);
      }
      
    } catch (err) {
      // Fehler beim Laden der Templates
      const errorMessage = err instanceof Error ? err.message : t('errorMessages.unknownError');
      setError(errorMessage);

      // Fallback: System-Templates laden
      try {
        const systemTemplates = await pdfTemplateService.getSystemTemplates();
        setTemplates(systemTemplates);
      } catch (fallbackErr) {
        // Auch System-Templates konnten nicht geladen werden
      }

    } finally {
      setLoading(false);
    }
  }, [organizationId, t]);

  /**
   * Templates beim ersten Laden laden
   */
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  /**
   * Erstes Template automatisch als Default auswählen (silent = keine Toast-Meldung)
   */
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const firstTemplate = templates[0];
      onTemplateSelect(firstTemplate.id, firstTemplate.name, true); // silent = true
    }
  }, [templates, selectedTemplateId, onTemplateSelect]);

  /**
   * Template-Auswahl handhaben
   */
  const handleTemplateSelect = useCallback((template: PDFTemplate) => {
    if (disabled) return;
    onTemplateSelect(template.id, template.name);
  }, [disabled, onTemplateSelect]);

  /**
   * Template-Thumbnail generieren
   */
  const generateThumbnail = useCallback(async (template: PDFTemplate) => {
    if (!user) return;
    
    try {
      // Verwende pdfTemplateService um Thumbnail zu generieren
      const thumbnailUrl = await pdfTemplateService.generateTemplateThumbnail(template);
      
      // Update Template mit neuer Thumbnail-URL (nur lokal für Vorschau)
      
      // Hier könnte man das Template in der Liste aktualisieren
      // Das wäre eine Erweiterung für später
      
    } catch (error) {
    }
  }, [user]);
  
  /**
   * Template-Vorschau generieren
   */
  const handleTemplatePreview = useCallback(async (template: PDFTemplate) => {
    if (!user || disabled) return;
    
    try {
      // Mock-Daten für Vorschau erstellen
      const mockData = {
        title: 'Beispiel Pressemitteilung',
        content: '<p>Dies ist eine Beispiel-Pressemitteilung um das Template-Design zu demonstrieren.</p>',
        companyName: 'Beispiel-Unternehmen GmbH',
        date: new Date().toISOString(),
        contactInfo: 'Max Mustermann\nTel: +49 123 456789\nE-Mail: info@beispiel.de'
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
        // Popup-Blocker verhindert Vorschau-Fenster
        if (onPreviewError) {
          onPreviewError(t('errorMessages.popupBlocked'));
        }
      }

    } catch (err) {
      // Fehler bei Template-Vorschau
      const errorMessage = err instanceof Error ? err.message : t('errorMessages.previewFailed');
      if (onPreviewError) {
        onPreviewError(errorMessage);
      }
    }
  }, [user, disabled, onPreviewError, t]);

  /**
   * Retry-Funktion
   */
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadTemplates();
  }, [loadTemplates]);

  // Kategorisiere Templates
  const systemTemplates = templates.filter(t => t.isSystem);
  const customTemplates = templates.filter(t => !t.isSystem);

  // Loading-Status
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600 mt-2">{t('loadingTemplates')}</p>
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
              {t('errorMessages.loadFailed')}
            </h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <div className="mt-3">
              <Button
                onClick={handleRetry}
                color="secondary"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                {t('retry')}
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
          {t('title')}
        </h3>
        <p className="text-sm text-gray-600">
          {t('description')}
          {templates.length > 0 && ` ${t('templatesAvailable', { count: templates.length })}`}
        </p>
        {error && (
          <div className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            {t('warning')}: {error}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* System-Templates */}
        {systemTemplates.length > 0 && (
          <TemplateCategory
            title={t('categories.system')}
            templates={systemTemplates}
            selectedTemplateId={selectedTemplateId}
            onTemplateSelect={handleTemplateSelect}
            onTemplatePreview={handleTemplatePreview}
            disabled={disabled}
            showPreview={showPreview}
            defaultOpen={false}
          />
        )}

        {/* Custom-Templates */}
        {customTemplates.length > 0 && (
          <TemplateCategory
            title={t('categories.custom')}
            templates={customTemplates}
            selectedTemplateId={selectedTemplateId}
            onTemplateSelect={handleTemplateSelect}
            onTemplatePreview={handleTemplatePreview}
            disabled={disabled}
            showPreview={showPreview}
            defaultOpen={false}
          />
        )}

        {/* Keine Templates verfügbar */}
        {templates.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
            <PhotoIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm mb-3">{t('noTemplates')}</p>
            <Button
              onClick={handleRetry}
              color="secondary"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              {t('refresh')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}