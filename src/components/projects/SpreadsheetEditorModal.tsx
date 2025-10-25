'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogBody } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { documentContentService } from '@/lib/firebase/document-content-service';
import type { InternalDocument } from '@/types/document-content';
import SpreadsheetEditor, { type SpreadsheetData } from '../strategy/SpreadsheetEditor';

interface SpreadsheetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  document?: InternalDocument | null;
  folderId: string;
  organizationId: string;
  projectId: string;
  initialData?: SpreadsheetData;
  templateInfo?: {
    type: string;
    name: string;
  };
}

export default function SpreadsheetEditorModal({
  isOpen,
  onClose,
  onSave,
  document,
  folderId,
  organizationId,
  projectId,
  initialData,
  templateInfo
}: SpreadsheetEditorModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [initialTitle, setInitialTitle] = useState('');

  // Lade existierendes Spreadsheet
  useEffect(() => {
    if (document?.contentRef && isOpen) {
      loadSpreadsheet();
    } else if (isOpen && !document) {
      // Neues Spreadsheet
      if (initialData && templateInfo) {
        // Template verwenden
        const templateTitle = `${templateInfo.name} - ${new Date().toLocaleDateString()}`;
        setInitialTitle(templateTitle);
        setSpreadsheetData(initialData);
      } else {
        // Leeres Spreadsheet
        setInitialTitle('Neue Tabelle');
        setSpreadsheetData(null);
      }
    }
  }, [document, isOpen, initialData, templateInfo]);

  const loadSpreadsheet = async () => {
    if (!document?.contentRef || !user?.uid) return;

    setLoading(true);
    try {
      console.log('Loading spreadsheet with contentRef:', document.contentRef);
      const docContent = await documentContentService.loadDocument(document.contentRef);

      if (docContent) {
        console.log('Document loaded, parsing content...');

        // Bereinige Dateinamen (entferne Endungen)
        const cleanTitle = (document.fileName || 'Tabelle')
          .replace('.celero-sheet.celero-doc', '')
          .replace('.celero-sheet', '')
          .replace('.celero-doc', '')
          .replace('.json', '');

        setInitialTitle(cleanTitle);

        // Parse JSON content
        try {
          const data = JSON.parse(docContent.content);
          console.log('Spreadsheet data parsed:', data);
          setSpreadsheetData(data);
        } catch (error) {
          console.error('Fehler beim Parsen der Spreadsheet-Daten:', error);
          console.error('Content was:', docContent.content);
          setSpreadsheetData(null);
        }
      } else {
        console.error('No document content returned');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Tabelle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: SpreadsheetData, title: string) => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const jsonContent = JSON.stringify(data);

      if (document?.contentRef) {
        // Update existierendes Dokument
        await documentContentService.updateDocument(
          document.contentRef,
          jsonContent,
          user.uid,
          true // Neue Version erstellen
        );
      } else {
        // Neues Dokument erstellen
        const { documentId, assetId } = await documentContentService.createDocument(
          jsonContent,
          {
            fileName: `${title}.celero-sheet`,
            folderId,
            organizationId,
            projectId,
            userId: user.uid,
            fileType: 'celero-sheet',
          }
        );
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Tabelle:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="5xl">
      <DialogBody className="p-0 h-[700px]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        {!loading && (
          <SpreadsheetEditor
            initialData={spreadsheetData || undefined}
            title={initialTitle}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={loading}
          />
        )}
      </DialogBody>
    </Dialog>
  );
}
