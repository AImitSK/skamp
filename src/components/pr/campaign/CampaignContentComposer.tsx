// src/components/pr/campaign/CampaignContentComposer.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GmailStyleEditor } from '@/components/GmailStyleEditor';
import IntelligentBoilerplateSection, { BoilerplateSection } from './IntelligentBoilerplateSection';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DocumentArrowDownIcon } from '@heroicons/react/20/solid';
import { Text } from '@/components/ui/text';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PRSEOHeaderBar } from '@/components/campaigns/PRSEOHeaderBar';
import { HeadlineGenerator } from '@/components/pr/ai/HeadlineGenerator';
import { toastService } from '@/lib/utils/toast';
import FolderSelectorDialog from './shared/FolderSelectorDialog';
import { usePDFGeneration } from './hooks/usePDFGeneration';
import { useBoilerplateProcessing } from './hooks/useBoilerplateProcessing';

interface CampaignContentComposerProps {
  organizationId: string;
  clientId?: string;
  clientName?: string;
  title: string;
  onTitleChange: (title: string) => void;
  mainContent: string;
  onMainContentChange: (content: string) => void;
  onFullContentChange: (fullContent: string) => void;
  onBoilerplateSectionsChange?: (sections: BoilerplateSection[]) => void;
  initialBoilerplateSections?: BoilerplateSection[];
  hideMainContentField?: boolean;
  hidePreview?: boolean; // Neue Option um Vorschau zu verstecken
  hideBoilerplates?: boolean; // Neue Option um Boilerplates zu verstecken
  readOnlyTitle?: boolean; // Neue Option für read-only Titel in Vorschau
  // PR-SEO props
  keywords?: string[];
  onKeywordsChange?: (keywords: string[]) => void;
  onSeoScoreChange?: (score: any) => void;
}

export default function CampaignContentComposer({
  organizationId,
  clientId,
  clientName,
  title,
  onTitleChange,
  mainContent,
  onMainContentChange,
  onFullContentChange,
  onBoilerplateSectionsChange,
  initialBoilerplateSections = [],
  hideMainContentField = false,
  hidePreview = false,
  hideBoilerplates = false,
  readOnlyTitle = false,
  keywords = [],
  onKeywordsChange,
  onSeoScoreChange
}: CampaignContentComposerProps) {
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>(initialBoilerplateSections);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Custom Hooks
  const {
    generatingPdf,
    pdfDownloadUrl,
    showFolderSelector,
    setShowFolderSelector,
    generatePdf,
    handlePdfExport
  } = usePDFGeneration();

  const processedContent = useBoilerplateProcessing(
    boilerplateSections,
    title,
    onFullContentChange
  );

  // Konvertiere Legacy-Sections mit position zu neuen ohne position (memoized)
  const convertedSections = useMemo(() => {
    return initialBoilerplateSections.map((section, index) => {
      // Wenn section noch position hat (legacy), entferne es
      if ('position' in section) {
        const { position, ...sectionWithoutPosition } = section as any;
        return {
          ...sectionWithoutPosition,
          order: section.order ?? index
        };
      }
      return {
        ...section,
        order: section.order ?? index
      };
    });
  }, [initialBoilerplateSections]);

  // Update state wenn convertedSections sich ändern
  useEffect(() => {
    if (JSON.stringify(convertedSections) !== JSON.stringify(boilerplateSections)) {
      setBoilerplateSections(convertedSections);
    }
  }, [convertedSections]);

  // Update parent when sections change
  const handleBoilerplateSectionsChange = useCallback((sections: BoilerplateSection[]) => {
    setBoilerplateSections(sections);
    if (onBoilerplateSectionsChange) {
      onBoilerplateSectionsChange(sections);
    }
  }, [onBoilerplateSectionsChange]);

  return (
    <>
      <div className="space-y-6">
        {/* Title Input */}
        {!readOnlyTitle ? (
          <Field>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center">
                Titel der Pressemitteilung
                <InfoTooltip 
                  content="Pflichtfeld: Der Titel sollte prägnant und aussagekräftig sein. Er wird als Überschrift in der Pressemitteilung und im E-Mail-Betreff verwendet."
                  className="ml-1"
                />
              </Label>
              <HeadlineGenerator
                currentTitle={title}
                content={mainContent}
                onTitleSelect={onTitleChange}
              />
            </div>
            <Input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="z.B. Neue Partnerschaft revolutioniert die Branche"
              required
            />
          </Field>
        ) : (
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{title || 'Kein Titel vorhanden'}</h2>
          </div>
        )}

        {/* Gmail-Style Main Content Editor - nur wenn nicht versteckt */}
        {!hideMainContentField && (
          <Field className="mt-8">
            <Label className="flex items-center">
              Hauptinhalt der Pressemitteilung
              <InfoTooltip 
                content="Verfassen Sie hier den individuellen Inhalt Ihrer Pressemitteilung. Nutzen Sie die minimale Toolbar für professionelle Formatierung."
                className="ml-1"
              />
            </Label>
            <div className="mt-2">
              <GmailStyleEditor
                content={mainContent}
                onChange={onMainContentChange}
                placeholder="Pressemitteilung schreiben... (Gmail-Style)"
                autoSave={false}
                // Keywords entfernt - SEO-Optimierung nicht mehr im Floating Toolbar
                // Auto-Save deaktiviert für neue Kampagnen wegen Pflichtfeldern
                // Kann später für Edit-Mode aktiviert werden
              />
            </div>
            {/* PR-SEO Analyse */}
            {onKeywordsChange && (
              <div className="mt-8">
                <PRSEOHeaderBar
                  title="PR-SEO Analyse"
                  content={`${title ? `${title}\n\n` : ''}${mainContent}`}
                  keywords={keywords}
                  onKeywordsChange={onKeywordsChange}
                  documentTitle={title}
                  onSeoScoreChange={onSeoScoreChange}
                />
              </div>
            )}
          </Field>
        )}

        {/* Boilerplate Sections - nur wenn nicht versteckt */}
        {!hideBoilerplates && (
          <div className="bg-gray-50 rounded-lg p-4">
            <IntelligentBoilerplateSection
              organizationId={organizationId}
              clientId={clientId}
              clientName={clientName}
              onContentChange={handleBoilerplateSectionsChange}
              initialSections={boilerplateSections}
            />
          </div>
        )}

        {/* Preview Toggle - nur anzeigen wenn nicht versteckt */}
        {!hidePreview && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-2"
              >
                <span>{showPreview ? '▼' : '▶'}</span>
                Vorschau der vollständigen Pressemitteilung
              </button>
              
              {showPreview && (
                <div className="flex items-center gap-3">
                  {pdfDownloadUrl && (
                    <a
                      href={pdfDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#005fab] hover:text-[#004a8c] underline"
                    >
                      PDF öffnen
                    </a>
                  )}
                  <Button
                    type="button"
                    onClick={() => handlePdfExport(title)}
                    disabled={generatingPdf || !processedContent}
                    className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                    {generatingPdf ? 'PDF wird erstellt...' : 'Als PDF exportieren'}
                  </Button>
                </div>
              )}
            </div>
            
            {showPreview && (
              <div className="mt-4 p-6 bg-white border rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Vorschau</h3>
                <div 
                  ref={previewRef}
                  className="prose prose-sm sm:prose-base lg:prose-lg max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2"
                  style={{ paddingBottom: '20px' }}
                  dangerouslySetInnerHTML={{ __html: processedContent || '<p class="text-gray-500">Noch kein Inhalt vorhanden</p>' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Folder Selector Dialog */}
        <FolderSelectorDialog
          isOpen={showFolderSelector}
          onClose={() => setShowFolderSelector(false)}
          onFolderSelect={generatePdf}
          organizationId={organizationId}
          clientId={clientId}
        />
      </div>
    </>
  );
}