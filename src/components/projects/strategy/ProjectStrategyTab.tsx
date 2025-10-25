// src/components/projects/strategy/ProjectStrategyTab.tsx
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { STRATEGY_TEMPLATES, type TemplateType } from '@/constants/strategy-templates';
import StrategyTemplateGrid from './StrategyTemplateGrid';

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
  project?: {
    title: string;
    currentStage: any;
    customer?: { name: string };
  };
  dokumenteFolderId?: string;
  onDocumentSaved?: () => void;
}

export default function ProjectStrategyTab({
  projectId,
  organizationId,
  project,
  dokumenteFolderId,
  onDocumentSaved
}: ProjectStrategyTabProps) {
  // Document Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [templateInfo, setTemplateInfo] = useState<{type: TemplateType, name: string} | null>(null);

  // Spreadsheet Editor State
  const [showSpreadsheetEditor, setShowSpreadsheetEditor] = useState(false);

  // Template auswählen - unterscheidet zwischen Document und Spreadsheet
  const handleTemplateSelect = (templateType: TemplateType, content?: string) => {
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
  };

  // Dokument Editor schließen
  const handleCloseEditor = () => {
    setShowEditor(false);
    setTemplateContent(null);
    setTemplateInfo(null);
  };

  // Spreadsheet Editor schließen
  const handleCloseSpreadsheetEditor = () => {
    setShowSpreadsheetEditor(false);
    setTemplateInfo(null);
  };

  // Dokument/Spreadsheet gespeichert
  const handleDocumentSave = () => {
    setShowEditor(false);
    setShowSpreadsheetEditor(false);
    setTemplateContent(null);
    setTemplateInfo(null);
    // Aktualisiere das Ordnermodul
    if (onDocumentSaved) {
      onDocumentSaved();
    }
  };

  return (
    <>
      {/* Template-Kacheln */}
      <StrategyTemplateGrid onTemplateSelect={handleTemplateSelect} />

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
          initialContent={templateContent}
          templateInfo={templateInfo}
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
          templateInfo={templateInfo}
        />
      )}
    </>
  );
}