// src/components/projects/strategy/ProjectStrategyTab.tsx
'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { STRATEGY_TEMPLATES, type TemplateType } from '@/constants/strategy-templates';
import { useStrategyDocuments, useArchiveStrategyDocument } from '@/lib/hooks/useStrategyDocuments';
import { toastService } from '@/lib/utils/toast';
import StrategyTemplateGrid from './StrategyTemplateGrid';
import StrategyDocumentsTable from './StrategyDocumentsTable';

// Lazy load Document Editor Modal
const DocumentEditorModal = dynamic(
  () => import('../DocumentEditorModal'),
  { ssr: false }
);

// Lazy load Spreadsheet Editor Modal
const SpreadsheetEditorModal = dynamic(
  () => import('../SpreadsheetEditorModal'),
  { ssr: false }
);

interface ProjectStrategyTabProps {
  projectId: string;
  organizationId: string;
  userId?: string;
  project?: {
    title: string;
    currentStage: any;
    customer?: { name: string };
  };
  dokumenteFolderId?: string;
  onDocumentSaved?: () => void;
}

const ProjectStrategyTab = React.memo(function ProjectStrategyTab({
  projectId,
  organizationId,
  userId,
  project,
  dokumenteFolderId,
  onDocumentSaved
}: ProjectStrategyTabProps) {
  // React Query Hooks
  const { data: strategyDocuments = [], isLoading: documentsLoading } = useStrategyDocuments(
    projectId,
    organizationId
  );
  const { mutate: archiveDocument, isPending: isArchiving } = useArchiveStrategyDocument();

  // Document Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [templateInfo, setTemplateInfo] = useState<{type: TemplateType, name: string} | null>(null);

  // Spreadsheet Editor State
  const [showSpreadsheetEditor, setShowSpreadsheetEditor] = useState(false);

  // Template auswählen - unterscheidet zwischen Document und Spreadsheet
  const handleTemplateSelect = useCallback((templateType: TemplateType, content?: string) => {
    const template = STRATEGY_TEMPLATES[templateType];

    if (templateType === 'table') {
      // Öffne Spreadsheet Editor
      setTemplateInfo({ type: templateType, name: template.title });
      setShowSpreadsheetEditor(true);
    } else {
      // Öffne Document Editor
      setTemplateContent(content || '');
      setTemplateInfo({ type: templateType, name: template.title });
      setShowEditor(true);
    }
  }, []);

  // Dokument Editor schließen
  const handleCloseEditor = useCallback(() => {
    setShowEditor(false);
    setTemplateContent(null);
    setTemplateInfo(null);
  }, []);

  // Spreadsheet Editor schließen
  const handleCloseSpreadsheetEditor = useCallback(() => {
    setShowSpreadsheetEditor(false);
    setTemplateInfo(null);
  }, []);

  // Dokument/Spreadsheet gespeichert
  const handleDocumentSave = useCallback(() => {
    setShowEditor(false);
    setShowSpreadsheetEditor(false);
    setTemplateContent(null);
    setTemplateInfo(null);
    // Aktualisiere das Ordnermodul
    if (onDocumentSaved) {
      onDocumentSaved();
    }
  }, [onDocumentSaved]);

  // Dokument löschen (archivieren)
  const handleDeleteDocument = useCallback((documentId: string) => {
    if (!userId) {
      toastService.error('Benutzer-ID fehlt');
      return;
    }

    if (!confirm('Möchten Sie dieses Strategiedokument wirklich löschen?')) {
      return;
    }

    archiveDocument(
      {
        id: documentId,
        projectId,
        organizationId,
        userId
      },
      {
        onSuccess: () => {
          toastService.success('Strategiedokument erfolgreich gelöscht');
        },
        onError: (error) => {
          toastService.error(`Fehler beim Löschen: ${error.message}`);
        }
      }
    );
  }, [userId, projectId, organizationId, archiveDocument]);

  return (
    <>
      {/* Template-Kacheln */}
      <StrategyTemplateGrid onTemplateSelect={handleTemplateSelect} />

      {/* Dokumente-Tabelle */}
      <div className="mt-8">
        <StrategyDocumentsTable
          documents={strategyDocuments}
          onEdit={(id) => {
            // TODO: Edit-Funktionalität implementieren
            toastService.info('Bearbeiten-Funktion wird noch implementiert');
          }}
          onDelete={handleDeleteDocument}
          loading={documentsLoading || isArchiving}
        />
      </div>

      {/* Document Editor Modal für Templates */}
      {showEditor && dokumenteFolderId && (
        <DocumentEditorModal
          isOpen={showEditor}
          onClose={handleCloseEditor}
          onSave={handleDocumentSave}
          document={null} // Neues Dokument
          folderId={dokumenteFolderId} // Speichert direkt im Dokumente-Ordner
          organizationId={organizationId}
          projectId={projectId}
          useStrategyService={false} // Verwende Ordner-System
          initialContent={templateContent || undefined}
          templateInfo={templateInfo || undefined}
        />
      )}

      {/* Spreadsheet Editor Modal für Tabellen-Template */}
      {showSpreadsheetEditor && dokumenteFolderId && (
        <SpreadsheetEditorModal
          isOpen={showSpreadsheetEditor}
          onClose={handleCloseSpreadsheetEditor}
          onSave={handleDocumentSave}
          document={null} // Neue Tabelle
          folderId={dokumenteFolderId} // Speichert direkt im Dokumente-Ordner
          organizationId={organizationId}
          projectId={projectId}
          templateInfo={templateInfo || undefined}
        />
      )}
    </>
  );
});

export default ProjectStrategyTab;