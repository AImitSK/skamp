'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { documentContentService } from '@/lib/firebase/document-content-service';
import type { InternalDocument } from '@/types/document-content';
import SpreadsheetEditor, { type SpreadsheetData } from '../strategy/SpreadsheetEditor';
import { toastService } from '@/lib/utils/toast';
import {
  TableCellsIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('projects.spreadsheetEditor');
  const tToast = useTranslations('toasts');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [title, setTitle] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lade existierendes Spreadsheet
  useEffect(() => {
    if (document?.contentRef && isOpen) {
      loadSpreadsheet();
    } else if (isOpen && !document) {
      // Neues Spreadsheet
      if (initialData && templateInfo) {
        // Template verwenden
        const templateTitle = `${templateInfo.name} - ${new Date().toLocaleDateString('de-DE')}`;
        setTitle(templateTitle);
        setSpreadsheetData(initialData);
      } else {
        // Leeres Spreadsheet
        setTitle('');
        setSpreadsheetData(null);
      }
    }
  }, [document, isOpen, initialData, templateInfo]);

  const loadSpreadsheet = async () => {
    if (!document?.contentRef || !user?.uid) return;

    setLoading(true);
    try {
      const docContent = await documentContentService.loadDocument(document.contentRef);

      if (docContent) {
        // Bereinige Dateinamen (entferne Endungen)
        const cleanTitle = (document.fileName || t('defaultTitle'))
          .replace('.celero-sheet.celero-doc', '')
          .replace('.celero-sheet', '')
          .replace('.celero-doc', '')
          .replace('.json', '');

        setTitle(cleanTitle);

        // Parse JSON content
        try {
          const data = JSON.parse(docContent.content);
          setSpreadsheetData(data);
        } catch (error) {
          console.error('Fehler beim Parsen der Spreadsheet-Daten:', error);
          setSpreadsheetData(null);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Tabelle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid || !title.trim() || !spreadsheetData) return;

    setSaving(true);
    try {
      const jsonContent = JSON.stringify(spreadsheetData);

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
        await documentContentService.createDocument(
          jsonContent,
          {
            fileName: `${title.trim()}.celero-sheet`,
            folderId,
            organizationId,
            projectId,
            userId: user.uid,
            fileType: 'celero-sheet',
          }
        );
      }

      onSave();
      handleClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Tabelle:', error);
      toastService.error(tToast('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setSpreadsheetData(null);
    setIsFullscreen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} size="5xl" className={isFullscreen ? 'fullscreen-dialog' : ''}>
      {/* Fullscreen Button neben dem Close X */}
      <div className="absolute top-0 right-0 pt-4 pr-14 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreen(!isFullscreen);
          }}
          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          title={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
        >
          <span className="sr-only">{isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}</span>
          {isFullscreen ? (
            <ArrowsPointingInIcon className="h-6 w-6" aria-hidden="true" />
          ) : (
            <ArrowsPointingOutIcon className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      <DialogTitle>
        <div className="flex items-center space-x-2 mb-3">
          <TableCellsIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-zinc-700">
            {document ? t('editTitle') : t('newTitle', { date: new Date().toLocaleDateString('de-DE') })}
          </span>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('namePlaceholder')}
          className="text-xl font-semibold w-full border-none outline-none bg-zinc-50 px-3 py-2 rounded-md focus:bg-zinc-100 transition-colors"
        />
      </DialogTitle>

      <DialogBody className={`p-0 ${isFullscreen ? 'fullscreen-body' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className={`overflow-y-auto bg-white ${isFullscreen ? 'flex-1' : 'min-h-[500px] max-h-[600px]'}`}>
            <SpreadsheetEditor
              data={spreadsheetData}
              onDataChange={setSpreadsheetData}
            />
            <style jsx global>{`
              :global(.fullscreen-dialog) {
                max-width: 900px !important;
                width: 100% !important;
                height: calc(100vh - 4rem) !important;
                margin: 2rem auto !important;
                border-radius: 0.5rem !important;
                display: flex !important;
                flex-direction: column !important;
              }
              :global(.fullscreen-dialog > *) {
                flex-shrink: 0 !important;
              }
              :global(.fullscreen-dialog .fullscreen-body) {
                flex: 1 !important;
                overflow-y: auto !important;
                display: flex !important;
                flex-direction: column !important;
              }
            `}</style>
          </div>
        )}
      </DialogBody>

      <DialogActions>
        <Button plain onClick={handleClose}>
          {t('actions.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !title.trim() || !spreadsheetData}
        >
          {saving ? t('actions.saving') : t('actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
