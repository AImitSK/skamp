// src/components/projects/strategy/ProjectStrategyTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { strategyDocumentService, type StrategyDocument } from '@/lib/firebase/strategy-document-service';
import { mediaService } from '@/lib/firebase/media-service';
import { documentContentService } from '@/lib/firebase/document-content-service';
import { STRATEGY_TEMPLATES, type TemplateType } from '@/constants/strategy-templates';
import StrategyTemplateGrid from './StrategyTemplateGrid';
import StrategyDocumentsTable from './StrategyDocumentsTable';
import type { InternalDocument } from '@/types/document-content';
import {
  FolderIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

// Lazy load Document Editor Modal
const DocumentEditorModal = dynamic(
  () => import('../DocumentEditorModal'),
  { ssr: false }
);

interface ProjectStrategyTabProps {
  projectId: string;
  organizationId: string;
}

// Unified Document Interface für Strategy Tab
interface UnifiedStrategyDocument extends StrategyDocument {
  source?: 'strategy' | 'folder'; // Quelle des Dokuments
  assetId?: string; // Für Folder-Dokumente
  contentRef?: string; // Für Folder-Dokumente
}

export default function ProjectStrategyTab({
  projectId,
  organizationId
}: ProjectStrategyTabProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UnifiedStrategyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UnifiedStrategyDocument | null>(null);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [templateInfo, setTemplateInfo] = useState<{type: TemplateType, name: string} | null>(null);

  // Ordner-System States (wie in ProjectFoldersView)
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [currentAssets, setCurrentAssets] = useState<any[]>([]);
  const [projectFolders, setProjectFolders] = useState<any[]>([]);
  const [currentFolders, setCurrentFolders] = useState<any[]>([]);
  const [navigationStack, setNavigationStack] = useState<{id: string, name: string}[]>([]);

  // Ordner-System Loading (exakt wie ProjectFoldersView)
  const loadFolderContent = async (folderId?: string) => {
    setLoading(true);
    try {
      if (folderId) {
        // Lade Inhalte des spezifischen Ordners (wie ProjectFoldersView)
        const [folders, assets] = await Promise.all([
          mediaService.getFolders(organizationId, folderId),
          mediaService.getMediaAssets(organizationId, folderId)
        ]);
        setCurrentFolders(folders);
        setCurrentAssets(assets);
      } else {
        // Lade Projekt-Hauptordner
        const result = await mediaService.getMediaByClientId(organizationId, projectId, false);
        setProjectFolders(result.folders);
        setCurrentFolders(result.folders);
        setCurrentAssets([]);
        setNavigationStack([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ordnerinhalte:', error);
      setCurrentAssets([]);
      setCurrentFolders([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigation in Ordner (wie ProjectFoldersView)
  const handleFolderClick = (folderId: string) => {
    const folder = currentFolders.find(f => f.id === folderId) ||
                   projectFolders.find((f: any) => f.id === folderId);
    if (folder) {
      const newStack = [...navigationStack, { id: folder.id, name: folder.name }];
      setNavigationStack(newStack);
      setSelectedFolderId(folderId);
      loadFolderContent(folderId);
    }
  };

  // Zurück-Navigation (wie ProjectFoldersView)
  const handleBackClick = () => {
    if (navigationStack.length > 0) {
      const newStack = navigationStack.slice(0, -1);
      setNavigationStack(newStack);

      if (newStack.length > 0) {
        const previousFolder = newStack[newStack.length - 1];
        setSelectedFolderId(previousFolder.id);
        loadFolderContent(previousFolder.id);
      } else {
        setSelectedFolderId(undefined);
        loadFolderContent();
      }
    } else {
      setSelectedFolderId(undefined);
      loadFolderContent();
    }
  };

  // Kombiniere Strategy-Dokumente und aktuelle Ordner-Assets
  const loadDocuments = async () => {
    try {
      setLoading(true);

      // 1. Lade direkte Strategiedokumente
      const strategyDocs = await strategyDocumentService.getByProjectId(projectId, {
        organizationId
      });

      // 2. Konvertiere currentAssets zu UnifiedStrategyDocument
      const folderDocs: UnifiedStrategyDocument[] = [];

      for (const asset of currentAssets) {
        // Prüfe ob es ein internes Dokument ist (hat contentRef und ist celero-doc/celero-sheet)
        if (asset.contentRef &&
            (asset.fileType === 'celero-doc' || asset.fileType === 'celero-sheet')) {
          try {
            // Lade den Content des Dokuments
            const docContent = await documentContentService.loadDocument(asset.contentRef);

            if (docContent) {
              // Konvertiere zu UnifiedStrategyDocument Format
              const unifiedDoc: UnifiedStrategyDocument = {
                id: asset.contentRef, // Nutze contentRef als ID
                projectId,
                title: asset.fileName?.replace('.celero-doc', '').replace('.celero-sheet', '') || 'Unbekanntes Dokument',
                type: asset.fileType === 'celero-sheet' ? 'analysis' : 'notes', // Default mapping
                content: docContent.content,
                plainText: docContent.plainText,
                status: 'draft', // Default status für Folder-Dokumente
                author: docContent.createdBy,
                authorName: 'Unbekannt', // Media Asset hat keine authorName
                version: docContent.version || 1,
                createdAt: asset.createdAt,
                updatedAt: asset.updatedAt || asset.createdAt,
                organizationId,
                source: 'folder',
                assetId: asset.id,
                contentRef: asset.contentRef
              };

              folderDocs.push(unifiedDoc);
            }
          } catch (contentError) {
            console.warn('Konnte Content für Asset nicht laden:', asset.id, contentError);
          }
        }
      }

      // 3. Kombiniere beide Listen
      const unifiedDocs: UnifiedStrategyDocument[] = [
        ...strategyDocs.map(doc => ({ ...doc, source: 'strategy' as const })),
        ...folderDocs
      ];

      // Sortiere nach updatedAt/createdAt
      unifiedDocs.sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt;
        const bTime = b.updatedAt || b.createdAt;
        return bTime.toMillis() - aTime.toMillis();
      });

      setDocuments(unifiedDocs);
    } catch (error) {
      console.error('Fehler beim Laden der Strategiedokumente:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load documents when currentAssets changes (reactive to folder selection)
  useEffect(() => {
    loadDocuments();
  }, [projectId, organizationId, currentAssets]);

  // Initial load of folder content (load all assets initially)
  useEffect(() => {
    loadFolderContent();
  }, [projectId, organizationId]);

  // Template auswählen
  const handleTemplateSelect = (templateType: TemplateType, content?: string) => {
    const template = STRATEGY_TEMPLATES[templateType];
    setTemplateContent(content || '');
    setTemplateInfo({ type: templateType, name: template.title });
    setSelectedDocument(null); // Neues Dokument
    setShowEditor(true);
  };

  // Dokument bearbeiten
  const handleDocumentEdit = (document: UnifiedStrategyDocument) => {
    setSelectedDocument(document);
    setTemplateContent(null);
    setTemplateInfo(null);
    setShowEditor(true);
  };

  // Dokument löschen
  const handleDocumentDelete = async (documentId: string) => {
    if (!confirm('Möchten Sie dieses Strategiedokument wirklich löschen?')) {
      return;
    }

    try {
      // Finde das Dokument um zu bestimmen, welcher Service verwendet werden soll
      const document = documents.find(doc => doc.id === documentId);

      if (!document) {
        throw new Error('Dokument nicht gefunden');
      }

      if (document.source === 'strategy') {
        // Direkte Strategiedokumente über strategyDocumentService löschen
        await strategyDocumentService.delete(documentId);
      } else if (document.source === 'folder' && document.assetId) {
        // Folder-Dokumente über mediaService und documentContentService löschen
        // 1. Lösche den Content
        await documentContentService.deleteDocument(documentId);
        // 2. Lösche das Media Asset
        await mediaService.deleteAsset(document.assetId);
      }

      await loadDocuments(); // Refresh list
    } catch (error) {
      console.error('Fehler beim Löschen des Dokuments:', error);
      alert('Fehler beim Löschen des Dokuments');
    }
  };

  // Dokument speichern
  const handleDocumentSave = async () => {
    await loadDocuments(); // Refresh list
    setShowEditor(false);
    setSelectedDocument(null);
    setTemplateContent(null);
    setTemplateInfo(null);
  };

  // Modal schließen
  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedDocument(null);
    setTemplateContent(null);
    setTemplateInfo(null);
  };

  return (
    <div className="space-y-8">
      {/* Template-Kacheln */}
      <StrategyTemplateGrid onTemplateSelect={handleTemplateSelect} />

      {/* Ordner-Browser (exakt wie ProjectFoldersView) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Ordner-Navigation
          </h3>
          {navigationStack.length > 0 && (
            <button
              onClick={handleBackClick}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Zurück
            </button>
          )}
        </div>

        {/* Breadcrumb */}
        {navigationStack.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Projekt {navigationStack.map((folder, index) => (
              <span key={folder.id}>
                {' > '}{folder.name}
              </span>
            ))}
          </div>
        )}

        {/* Ordner anzeigen */}
        <div className="space-y-2">
          {currentFolders.map((folder: any) => (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder.id)}
              className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FolderIcon className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-medium text-gray-900">{folder.name}</div>
                <div className="text-sm text-gray-500">
                  {folder.subfolders?.length || 0} Unterordner
                </div>
              </div>
            </button>
          ))}

          {currentFolders.length === 0 && !loading && (
            <p className="text-gray-500 text-center py-4">
              {selectedFolderId ? 'Keine Unterordner vorhanden' : 'Lade Ordner...'}
            </p>
          )}
        </div>
      </div>

      {/* Bestehende Dokumente */}
      <StrategyDocumentsTable
        documents={documents}
        onEdit={handleDocumentEdit}
        onDelete={handleDocumentDelete}
        loading={loading}
      />

      {/* Document Editor Modal */}
      {showEditor && (
        <DocumentEditorModal
          isOpen={showEditor}
          onClose={handleCloseEditor}
          onSave={handleDocumentSave}
          document={selectedDocument}
          folderId={selectedDocument?.source === 'folder' ? 'strategy' : "strategy"}
          organizationId={organizationId}
          projectId={projectId}
          useStrategyService={selectedDocument?.source !== 'folder'} // Nur für Strategy-Dokumente
          initialContent={templateContent}
          templateInfo={templateInfo}
        />
      )}
    </div>
  );
}