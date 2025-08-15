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
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { InfoTooltip } from '@/components/InfoTooltip';
import { SEOHeaderBar } from '@/components/campaigns/SEOHeaderBar';

// Dynamic import für html2pdf to avoid SSR issues
const loadHtml2Pdf = () => import('html2pdf.js');

// Success/Error Alert Component
function AlertMessage({ 
  type, 
  message, 
  onClose 
}: { 
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md animate-slide-in-right`}>
      <div className={`rounded-lg px-4 py-3 shadow-lg flex items-start gap-3 ${
        type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      }`}>
        {type === 'success' ? (
          <CheckCircleIcon className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
        ) : (
          <XCircleIcon className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`ml-4 shrink-0 rounded-md p-1.5 inline-flex hover:bg-opacity-20 ${
            type === 'success' ? 'hover:bg-green-600' : 'hover:bg-red-600'
          }`}
        >
          <span className="sr-only">Schließen</span>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

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
  enableSEOFeatures?: boolean; // Neue SEO-Features aktivieren
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
  enableSEOFeatures = false
}: CampaignContentComposerProps) {
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>(initialBoilerplateSections);
  const [processedContent, setProcessedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
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

  // Generate PDF
  const generatePdf = async (targetFolderId?: string) => {
    if (!previewRef.current || !title) return;
    
    setGeneratingPdf(true);
    try {
      // Dynamically import html2pdf
      const html2pdfModule = await loadHtml2Pdf();
      const html2pdf = html2pdfModule.default;

      // PDF Options mit besseren Margins
      const opt = {
        margin: [15, 15, 20, 15], // top, left, bottom, right
        filename: `Pressemitteilung_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          windowHeight: previewRef.current.scrollHeight + 50
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Generate PDF Blob
      const pdfBlob = await html2pdf()
        .from(previewRef.current)
        .set(opt)
        .outputPdf('blob');

      // Create File object
      const pdfFile = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

      // Upload to Media Center
      const uploadedAsset = await mediaService.uploadMedia(
        pdfFile,
        organizationId,
        targetFolderId,
        undefined // No progress callback needed
      );

      // Set clientId if available
      if (clientId && uploadedAsset.id) {
        await mediaService.updateAsset(uploadedAsset.id, { clientId });
      }

      setPdfDownloadUrl(uploadedAsset.downloadUrl);
      
      // Success message
      setAlertMessage({
        type: 'success',
        message: 'PDF wurde erfolgreich erstellt und im Mediacenter gespeichert!'
      });
      
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      setAlertMessage({
        type: 'error',
        message: 'Fehler beim Erstellen des PDFs. Bitte versuchen Sie es erneut.'
      });
    } finally {
      setGeneratingPdf(false);
      setShowFolderSelector(false);
    }
  };

  const handlePdfExport = () => {
    if (!title) {
      setAlertMessage({
        type: 'error',
        message: 'Bitte geben Sie einen Titel für die Pressemitteilung ein.'
      });
      return;
    }
    setShowFolderSelector(true);
  };

  return (
    <>
      {/* Alert Messages */}
      {alertMessage && (
        <AlertMessage
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <div className="space-y-6">
        {/* Title Input */}
        <Field>
          <Label className="flex items-center">
            Titel der Pressemitteilung
            <InfoTooltip 
              content="Pflichtfeld: Der Titel sollte prägnant und aussagekräftig sein. Er wird als Überschrift in der Pressemitteilung und im E-Mail-Betreff verwendet."
              className="ml-1"
            />
          </Label>
          <Input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="z.B. Neue Partnerschaft revolutioniert die Branche"
            required
          />
        </Field>

        {/* Gmail-Style Main Content Editor - nur wenn nicht versteckt */}
        {!hideMainContentField && (
          <Field>
            <Label className="flex items-center">
              Hauptinhalt der Pressemitteilung
              <InfoTooltip 
                content="Gmail-Style Editor: Verfassen Sie hier den individuellen Inhalt Ihrer Pressemitteilung. Nutzen Sie die minimale Toolbar für professionelle Formatierung."
                className="ml-1"
              />
            </Label>
            <div className="mt-2">
              <GmailStyleEditor
                content={mainContent}
                onChange={onMainContentChange}
                placeholder="Pressemitteilung schreiben... (Gmail-Style)"
                autoSave={false}
                keywords={keywords}
                // Auto-Save deaktiviert für neue Kampagnen wegen Pflichtfeldern
                // Kann später für Edit-Mode aktiviert werden
              />
              {/* Debug Keywords */}
              {process.env.NODE_ENV === 'development' && (
                <div style={{ fontSize: '10px', color: 'red', padding: '5px' }}>
                  🔍 CampaignContentComposer Keywords: {JSON.stringify(keywords)} (Length: {keywords.length})
                </div>
              )}
            </div>
            {/* SEO-Features nach dem Editor */}
            {enableSEOFeatures && (
              <div className="mt-4">
                <SEOHeaderBar 
                  title="SEO-Optimierung"
                  content={`${title ? `${title}\n\n` : ''}${mainContent}`}
                  keywords={keywords}
                  onKeywordsChange={setKeywords}
                />
              </div>
            )}
          </Field>
        )}

        {/* Boilerplate Sections */}
        <div className="bg-gray-50 rounded-lg p-4">
          <IntelligentBoilerplateSection
            organizationId={organizationId}
            clientId={clientId}
            clientName={clientName}
            onContentChange={handleBoilerplateSectionsChange}
            initialSections={boilerplateSections}
          />
        </div>

        {/* Preview Toggle */}
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