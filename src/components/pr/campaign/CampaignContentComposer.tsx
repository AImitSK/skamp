// src/components/pr/campaign/CampaignContentComposer.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { RichTextEditor } from '@/components/RichTextEditor';
import { GmailStyleEditor } from '@/components/GmailStyleEditor';
import IntelligentBoilerplateSection, { BoilerplateSection } from './IntelligentBoilerplateSection';
import { processBoilerplates } from '@/lib/boilerplate-processor';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { 
  DocumentArrowDownIcon, 
  FolderIcon, 
  HomeIcon,
  ChevronRightIcon 
} from '@heroicons/react/20/solid';
import { mediaService } from '@/lib/firebase/media-service';
import { MediaFolder } from '@/types/media';
import { Text } from '@/components/ui/text';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PRSEOHeaderBar } from '@/components/campaigns/PRSEOHeaderBar';
import { HeadlineGenerator } from '@/components/pr/ai/HeadlineGenerator';
import { toastService } from '@/lib/utils/toast';

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

// Folder Selector Dialog Component
function FolderSelectorDialog({
  isOpen,
  onClose,
  onFolderSelect,
  organizationId,
  clientId
}: {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelect: (folderId?: string) => void;
  organizationId: string;
  clientId?: string;
}) {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id?: string; name: string }>>([{ name: 'Mediathek' }]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen, currentFolderId]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const foldersData = await mediaService.getFolders(organizationId, currentFolderId);
      
      // Filter für Client-Ordner wenn clientId vorhanden
      const filteredFolders = clientId 
        ? foldersData.filter(f => f.clientId === clientId || !f.clientId)
        : foldersData;
      
      setFolders(filteredFolders);

      // Update breadcrumbs
      if (currentFolderId) {
        const crumbs = await mediaService.getBreadcrumbs(currentFolderId);
        setBreadcrumbs([
          { name: 'Mediathek' },
          ...crumbs.map(c => ({ id: c.id, name: c.name }))
        ]);
      } else {
        setBreadcrumbs([{ name: 'Mediathek' }]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ordner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (folderId?: string) => {
    setCurrentFolderId(folderId);
  };

  const handleConfirm = () => {
    onFolderSelect(currentFolderId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle className="px-6 py-4">PDF Speicherort auswählen</DialogTitle>
      <DialogBody className="px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
              <button
                onClick={() => handleNavigate(crumb.id)}
                className="text-[#005fab] hover:text-[#004a8c]"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
            <Text className="mt-4">Lade Ordner...</Text>
          </div>
        ) : (
          <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
            {/* Current Folder Option */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HomeIcon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {currentFolderId ? breadcrumbs[breadcrumbs.length - 1].name : 'Mediathek (Hauptordner)'}
                    </p>
                    <p className="text-sm text-blue-700">PDF hier speichern</p>
                  </div>
                </div>
                <Button
                  onClick={handleConfirm}
                  className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
                >
                  Hier speichern
                </Button>
              </div>
            </div>

            {/* Subfolders */}
            {folders.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => handleNavigate(folder.id)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border text-left transition-colors"
                  >
                    <FolderIcon 
                      className="h-5 w-5 shrink-0" 
                      style={{ color: folder.color || '#6B7280' }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{folder.name}</p>
                      {folder.description && (
                        <p className="text-sm text-gray-500">{folder.description}</p>
                      )}
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FolderIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Keine Unterordner vorhanden</p>
              </div>
            )}
          </div>
        )}
      </DialogBody>
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>Abbrechen</Button>
      </DialogActions>
    </Dialog>
  );
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
  const [processedContent, setProcessedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  // Keywords werden jetzt als Props übergeben
  const previewRef = useRef<HTMLDivElement>(null);

  // Konvertiere Legacy-Sections mit position zu neuen ohne position
  useEffect(() => {
    const convertedSections = initialBoilerplateSections.map((section, index) => {
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
    
    if (JSON.stringify(convertedSections) !== JSON.stringify(boilerplateSections)) {
      setBoilerplateSections(convertedSections);
    }
  }, [initialBoilerplateSections]);

  // Update parent when sections change
  const handleBoilerplateSectionsChange = (sections: BoilerplateSection[]) => {
    setBoilerplateSections(sections);
    if (onBoilerplateSectionsChange) {
      onBoilerplateSectionsChange(sections);
    }
  };

  // Process content whenever sections or main content changes
  useEffect(() => {
    const composeFullContent = async () => {
      
      // Erstelle den vollständigen HTML-Content aus allen Sections
      let fullHtml = '';
      
      // Füge Titel hinzu wenn vorhanden
      if (title) {
        fullHtml += `<h1 class="text-2xl font-bold mb-4">${title}</h1>\n\n`;
      }
      
      // Sortiere Sections nach order
      const sortedSections = [...boilerplateSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      
      // Füge alle Sections hinzu
      for (const section of sortedSections) {
        if (section.type === 'boilerplate' && section.boilerplate) {
          // Boilerplate content
          fullHtml += section.boilerplate.content + '\n\n';
        } else if (section.content) {
          // Strukturierte Inhalte (lead, main, quote)
          if (section.type === 'quote' && section.metadata) {
            fullHtml += `<blockquote class="border-l-4 border-blue-400 pl-4 italic">\n`;
            fullHtml += `${section.content}\n`;
            fullHtml += `<footer class="text-sm text-gray-600 mt-2">— ${section.metadata.person}`;
            if (section.metadata.role) fullHtml += `, ${section.metadata.role}`;
            if (section.metadata.company) fullHtml += ` bei ${section.metadata.company}`;
            fullHtml += `</footer>\n`;
            fullHtml += `</blockquote>\n\n`;
          } else {
            fullHtml += section.content + '\n\n';
          }
        }
      }
      
      // Füge Datum am Ende hinzu
      const currentDate = new Date().toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long', 
        year: 'numeric'
      });
      fullHtml += `<p class="text-sm text-gray-600 mt-8">${currentDate}</p>`;
      
      setProcessedContent(fullHtml);
      onFullContentChange(fullHtml);
    };

    composeFullContent();
  }, [boilerplateSections, title, clientName, onFullContentChange]);

  // PDF-Generation jetzt über Puppeteer API Route in pdf-versions-service
  // Diese lokale PDF-Generation wird nicht mehr verwendet
  const generatePdf = async (targetFolderId?: string) => {
    setGeneratingPdf(false);
    return;
  };

  const handlePdfExport = () => {
    if (!title) {
      toastService.error('Bitte geben Sie einen Titel für die Pressemitteilung ein.');
      return;
    }
    setShowFolderSelector(true);
  };

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
                    onClick={handlePdfExport}
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