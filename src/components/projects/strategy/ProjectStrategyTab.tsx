// src/components/projects/strategy/ProjectStrategyTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { STRATEGY_TEMPLATES, type TemplateType } from '@/constants/strategy-templates';
import StrategyTemplateGrid from './StrategyTemplateGrid';
import ProjectFoldersView from '../ProjectFoldersView';
import { mediaService } from '@/lib/firebase/media-service';
import type { InternalDocument } from '@/types/document-content';

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
}

export default function ProjectStrategyTab({
  projectId,
  organizationId,
  project
}: ProjectStrategyTabProps) {
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [templateInfo, setTemplateInfo] = useState<{type: TemplateType, name: string} | null>(null);

  // Dokumente-Ordner spezifische States
  const [documentsFolder, setDocumentsFolder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Lade Dokumente-Ordner beim Initialisieren
  useEffect(() => {
    const loadDocumentsFolder = async () => {
      if (!projectId || !organizationId) return;

      try {
        setLoading(true);
        // Lade Projekt-Hauptordner
        const result = await mediaService.getMediaByClientId(organizationId, projectId, false);

        // Finde den Dokumente-Ordner
        const documentsFolder = result.folders?.find((folder: any) => folder.name === 'Dokumente');

        if (documentsFolder) {
          setDocumentsFolder(documentsFolder);
        } else {
          console.warn('Dokumente-Ordner nicht gefunden in Projekt:', projectId);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Dokumente-Ordners:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocumentsFolder();
  }, [projectId, organizationId]);

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

  // Dokument gespeichert - ProjectFoldersView wird sich selbst aktualisieren
  const handleDocumentSave = () => {
    setShowEditor(false);
    setTemplateContent(null);
    setTemplateInfo(null);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <StrategyTemplateGrid onTemplateSelect={handleTemplateSelect} />
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!documentsFolder) {
    return (
      <div className="space-y-8">
        <StrategyTemplateGrid onTemplateSelect={handleTemplateSelect} />
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-gray-500">Dokumente-Ordner nicht gefunden</p>
          <p className="text-sm text-gray-400 mt-2">
            Nur neue Projekte haben automatische Ordnerstrukturen
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template-Kacheln */}
      <StrategyTemplateGrid onTemplateSelect={handleTemplateSelect} />

      {/* ProjectFoldersView - startet direkt im Dokumente-Ordner */}
      <ProjectFoldersView
        projectId={projectId}
        organizationId={organizationId}
        projectFolders={documentsFolder} // Übergebe Dokumente-Ordner als "Projekt-Root"
        foldersLoading={loading}
        onRefresh={() => {/* Nicht benötigt da wir statisch im Dokumente-Ordner sind */}}
        clientId={projectId} // ClientId ist ProjectId
        project={project}
      />

      {/* Document Editor Modal für Templates */}
      {showEditor && (
        <DocumentEditorModal
          isOpen={showEditor}
          onClose={handleCloseEditor}
          onSave={handleDocumentSave}
          document={null} // Neues Dokument
          folderId={documentsFolder.id} // Direkt im Dokumente-Ordner speichern
          organizationId={organizationId}
          projectId={projectId}
          useStrategyService={false} // Verwende Ordner-System
          initialContent={templateContent}
          templateInfo={templateInfo}
        />
      )}
    </div>
  );
}