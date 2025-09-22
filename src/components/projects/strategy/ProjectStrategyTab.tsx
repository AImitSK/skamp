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

  // Lade Strategiedokumente aus beiden Services
  const loadDocuments = async () => {
    try {
      setLoading(true);

      // 1. Lade direkte Strategiedokumente
      const strategyDocs = await strategyDocumentService.getByProjectId(projectId, {
        organizationId
      });

      // 2. Lade Dokumente aus dem Ordner-System (Media Assets mit contentRef)
      const folderDocs = await loadFolderDocuments();

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

  // Lade Dokumente aus dem Ordner-System (spezifisch aus dem "Dokumente"-Ordner)
  const loadFolderDocuments = async (): Promise<UnifiedStrategyDocument[]> => {
    try {
      // 1. Finde den "Dokumente"-Ordner für dieses Projekt
      const result = await mediaService.getMediaByClientId(organizationId, projectId, false);
      const projectFolders = result.folders;

      // Suche nach dem "Dokumente"-Ordner
      const documentsFolder = projectFolders.find(folder =>
        folder.name?.toLowerCase().includes('dokumente') ||
        folder.name?.toLowerCase().includes('documents')
      );

      if (!documentsFolder) {
        console.log('Kein Dokumente-Ordner gefunden für Projekt:', projectId);
        return [];
      }

      // 2. Lade Assets aus dem Dokumente-Ordner
      const documentsAssets = await mediaService.getMediaAssetsInFolder(documentsFolder.id);

      const folderDocs: UnifiedStrategyDocument[] = [];

      for (const asset of documentsAssets) {
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

      return folderDocs;
    } catch (error) {
      console.error('Fehler beim Laden der Folder-Dokumente:', error);
      return [];
    }
  };

  useEffect(() => {
    loadDocuments();
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