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

interface ProjectStrategyTabProps {
  projectId: string;
  organizationId: string;
  project?: {
    title: string;
    currentStage: any;
    customer?: { name: string };
  };
  dokumenteFolderId?: string;
}

export default function ProjectStrategyTab({
  projectId,
  organizationId,
  project,
  dokumenteFolderId
}: ProjectStrategyTabProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [templateInfo, setTemplateInfo] = useState<{type: TemplateType, name: string} | null>(null);

  // Template auswählen - direkt mit DocumentEditorModal verbinden
  const handleTemplateSelect = (templateType: TemplateType, content?: string) => {
    const template = STRATEGY_TEMPLATES[templateType];
    setTemplateContent(content || '');
    setTemplateInfo({ type: templateType, name: template.title });
    setShowEditor(true);
  };

  // Dokument Editor schließen
  const handleCloseEditor = () => {
    setShowEditor(false);
    setTemplateContent(null);
    setTemplateInfo(null);
  };

  // Dokument gespeichert
  const handleDocumentSave = () => {
    setShowEditor(false);
    setTemplateContent(null);
    setTemplateInfo(null);
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
    </>
  );
}