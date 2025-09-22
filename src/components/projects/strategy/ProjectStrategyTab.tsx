// src/components/projects/strategy/ProjectStrategyTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { strategyDocumentService, type StrategyDocument } from '@/lib/firebase/strategy-document-service';
import { STRATEGY_TEMPLATES, type TemplateType } from '@/constants/strategy-templates';
import StrategyTemplateGrid from './StrategyTemplateGrid';
import StrategyDocumentsTable from './StrategyDocumentsTable';

// Lazy load Document Editor Modal
const DocumentEditorModal = dynamic(
  () => import('../DocumentEditorModal'),
  { ssr: false }
);

interface ProjectStrategyTabProps {
  projectId: string;
  organizationId: string;
}

export default function ProjectStrategyTab({
  projectId,
  organizationId
}: ProjectStrategyTabProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<StrategyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<StrategyDocument | null>(null);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [templateInfo, setTemplateInfo] = useState<{type: TemplateType, name: string} | null>(null);

  // Lade Strategiedokumente
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await strategyDocumentService.getByProjectId(projectId, {
        organizationId
      });
      setDocuments(docs);
    } catch (error) {
      console.error('Fehler beim Laden der Strategiedokumente:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
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
  const handleDocumentEdit = (document: StrategyDocument) => {
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
      await strategyDocumentService.delete(documentId);
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
          folderId="strategy" // Virtueller Ordner für Strategiedokumente
          organizationId={organizationId}
          projectId={projectId}
          useStrategyService={true}
          initialContent={templateContent}
          templateInfo={templateInfo}
        />
      )}
    </div>
  );
}