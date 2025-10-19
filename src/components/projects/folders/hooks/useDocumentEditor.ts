import { useState } from 'react';
import type { InternalDocument } from '@/types/document-content';

interface UseDocumentEditorProps {
  onSaveSuccess?: () => void;
}

/**
 * useDocumentEditor Hook
 *
 * Verwaltet Document Editor State (Create, Edit, Save)
 */
export function useDocumentEditor({ onSaveSuccess }: UseDocumentEditorProps = {}) {
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [editingDocument, setEditingDocument] = useState<InternalDocument | null>(null);

  const handleCreateDocument = () => {
    setEditingDocument(null);
    setShowDocumentEditor(true);
  };

  const handleEditDocument = (asset: any) => {
    const document: InternalDocument = {
      ...asset,
      contentRef: asset.contentRef
    };

    setEditingDocument(document);
    setShowDocumentEditor(true);
  };

  const handleDocumentSave = () => {
    setShowDocumentEditor(false);
    setEditingDocument(null);
    onSaveSuccess?.();
  };

  const handleCloseEditor = () => {
    setShowDocumentEditor(false);
    setEditingDocument(null);
  };

  return {
    showDocumentEditor,
    editingDocument,
    handleCreateDocument,
    handleEditDocument,
    handleDocumentSave,
    handleCloseEditor
  };
}
