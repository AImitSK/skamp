import { useState } from 'react';
import type { InternalDocument } from '@/types/document-content';
import type { SpreadsheetData } from '@/components/strategy/SpreadsheetEditor';

interface UseSpreadsheetEditorProps {
  onSaveSuccess?: () => void;
}

/**
 * useSpreadsheetEditor Hook
 *
 * Verwaltet Spreadsheet Editor State (Create, Edit, Save)
 */
export function useSpreadsheetEditor({ onSaveSuccess }: UseSpreadsheetEditorProps = {}) {
  const [showSpreadsheetEditor, setShowSpreadsheetEditor] = useState(false);
  const [editingSpreadsheet, setEditingSpreadsheet] = useState<InternalDocument | null>(null);
  const [initialSpreadsheetData, setInitialSpreadsheetData] = useState<SpreadsheetData | null>(null);

  const handleCreateSpreadsheet = (initialData?: SpreadsheetData) => {
    setEditingSpreadsheet(null);
    setInitialSpreadsheetData(initialData || null);
    setShowSpreadsheetEditor(true);
  };

  const handleEditSpreadsheet = (asset: any) => {
    const document: InternalDocument = {
      ...asset,
      contentRef: asset.contentRef
    };

    setEditingSpreadsheet(document);
    setInitialSpreadsheetData(null);
    setShowSpreadsheetEditor(true);
  };

  const handleSpreadsheetSave = () => {
    setShowSpreadsheetEditor(false);
    setEditingSpreadsheet(null);
    setInitialSpreadsheetData(null);
    onSaveSuccess?.();
  };

  const handleCloseEditor = () => {
    setShowSpreadsheetEditor(false);
    setEditingSpreadsheet(null);
    setInitialSpreadsheetData(null);
  };

  return {
    showSpreadsheetEditor,
    editingSpreadsheet,
    initialSpreadsheetData,
    handleCreateSpreadsheet,
    handleEditSpreadsheet,
    handleSpreadsheetSave,
    handleCloseEditor
  };
}
