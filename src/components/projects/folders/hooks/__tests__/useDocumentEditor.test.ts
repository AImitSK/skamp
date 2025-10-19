import { renderHook, act } from '@testing-library/react';
import { useDocumentEditor } from '../useDocumentEditor';

describe('useDocumentEditor Hook', () => {
  it('sollte initial state korrekt setzen', () => {
    const { result } = renderHook(() => useDocumentEditor());

    expect(result.current.showDocumentEditor).toBe(false);
    expect(result.current.editingDocument).toBeNull();
  });

  it('sollte Document Editor öffnen für neues Dokument', () => {
    const { result } = renderHook(() => useDocumentEditor());

    act(() => {
      result.current.handleCreateDocument();
    });

    expect(result.current.showDocumentEditor).toBe(true);
    expect(result.current.editingDocument).toBeNull();
  });

  it('sollte Document Editor öffnen zum Editieren', () => {
    const mockAsset = {
      id: 'doc-1',
      fileName: 'test.celero-doc',
      contentRef: 'content-ref-123',
    };

    const { result } = renderHook(() => useDocumentEditor());

    act(() => {
      result.current.handleEditDocument(mockAsset);
    });

    expect(result.current.showDocumentEditor).toBe(true);
    expect(result.current.editingDocument).toEqual({
      ...mockAsset,
      contentRef: 'content-ref-123',
    });
  });

  it('sollte Document Editor schließen und state resetten', () => {
    const { result } = renderHook(() => useDocumentEditor());

    act(() => {
      result.current.handleCreateDocument();
    });

    act(() => {
      result.current.handleCloseEditor();
    });

    expect(result.current.showDocumentEditor).toBe(false);
    expect(result.current.editingDocument).toBeNull();
  });

  it('sollte onSaveSuccess callback aufrufen beim Speichern', () => {
    const mockOnSaveSuccess = jest.fn();
    const { result } = renderHook(() =>
      useDocumentEditor({ onSaveSuccess: mockOnSaveSuccess })
    );

    act(() => {
      result.current.handleCreateDocument();
    });

    act(() => {
      result.current.handleDocumentSave();
    });

    expect(mockOnSaveSuccess).toHaveBeenCalled();
    expect(result.current.showDocumentEditor).toBe(false);
    expect(result.current.editingDocument).toBeNull();
  });
});
