'use client';

import React, { useState, useCallback } from 'react';
import Spreadsheet from 'react-spreadsheet';
import { Button } from '@/components/ui/button';
import { DocumentIcon } from '@heroicons/react/24/outline';

// ========================================
// TYPES
// ========================================

export interface SpreadsheetData {
  rows: number;
  cols: number;
  data: Array<Array<{ value: string }>>;
}

interface SpreadsheetEditorProps {
  initialData?: SpreadsheetData;
  title?: string;
  onSave: (data: SpreadsheetData, title: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

const createEmptySpreadsheet = (rows: number = 10, cols: number = 6): SpreadsheetData => {
  return {
    rows,
    cols,
    data: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ value: '' }))
    ),
  };
};

// ========================================
// SPREADSHEET EDITOR COMPONENT
// ========================================

export default function SpreadsheetEditor({
  initialData,
  title: initialTitle = '',
  onSave,
  onCancel,
  isLoading = false,
}: SpreadsheetEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<Array<Array<{ value: string }>>>(
    initialData?.data || createEmptySpreadsheet().data
  );

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      alert('Bitte geben Sie einen Titel ein');
      return;
    }

    setIsSaving(true);
    try {
      const spreadsheetData: SpreadsheetData = {
        rows: data.length,
        cols: data[0]?.length || 0,
        data,
      };
      await onSave(spreadsheetData, title);
    } catch (error) {
      console.error('Fehler beim Speichern der Tabelle:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSaving(false);
    }
  }, [data, title, onSave]);

  const handleAddRow = () => {
    const cols = data[0]?.length || 6;
    setData([...data, Array.from({ length: cols }, () => ({ value: '' }))]);
  };

  const handleAddColumn = () => {
    setData(data.map(row => [...row, { value: '' }]));
  };

  const handleRemoveLastRow = () => {
    if (data.length > 1) {
      setData(data.slice(0, -1));
    }
  };

  const handleRemoveLastColumn = () => {
    if (data[0]?.length > 1) {
      setData(data.map(row => row.slice(0, -1)));
    }
  };

  return (
    <div className="spreadsheet-editor h-full flex flex-col bg-white">
      {/* Header mit Titel und Aktionen */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex-1 mr-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tabellenname eingeben..."
            className="text-xl font-semibold w-full border-none outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || isLoading}
            className="flex items-center space-x-2"
          >
            <DocumentIcon className="w-4 h-4" />
            <span>{isSaving ? 'Speichern...' : 'Speichern'}</span>
          </Button>

          <Button onClick={onCancel} variant="outline">
            Abbrechen
          </Button>
        </div>
      </div>

      {/* Toolbar für Zeilen/Spalten */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Button onClick={handleAddRow} variant="outline" className="text-sm">
            + Zeile
          </Button>
          <Button onClick={handleAddColumn} variant="outline" className="text-sm">
            + Spalte
          </Button>
          <Button onClick={handleRemoveLastRow} variant="outline" className="text-sm text-red-600">
            - Letzte Zeile
          </Button>
          <Button onClick={handleRemoveLastColumn} variant="outline" className="text-sm text-red-600">
            - Letzte Spalte
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {data.length} Zeilen × {data[0]?.length || 0} Spalten
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 p-4 overflow-auto">
        <Spreadsheet
          data={data}
          onChange={setData}
          columnLabels={Array.from({ length: data[0]?.length || 0 }, (_, i) =>
            String.fromCharCode(65 + i)
          )}
          rowLabels={Array.from({ length: data.length }, (_, i) => String(i + 1))}
        />
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 flex justify-between">
        <span>
          {initialData ? 'Bearbeitung' : 'Neue Tabelle'} •
          {data.length} Zeilen × {data[0]?.length || 0} Spalten
        </span>
        <span className="text-gray-400">
          Excel-ähnliche Bedienung • Copy/Paste unterstützt
        </span>
      </div>

      <style jsx global>{`
        .Spreadsheet {
          --background-color: white;
          --header-background-color: #f8f9fa;
          --border-color: #dee2e6;
          --text-color: #212529;
        }
        .Spreadsheet__table {
          border-collapse: collapse;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .Spreadsheet__cell {
          min-width: 100px;
          min-height: 32px;
          border: 1px solid var(--border-color);
          padding: 4px 8px;
        }
        .Spreadsheet__header {
          background-color: var(--header-background-color);
          font-weight: 600;
          text-align: center;
          border: 1px solid var(--border-color);
          padding: 4px 8px;
        }
        .Spreadsheet__cell--selected {
          background-color: rgba(0, 95, 171, 0.1);
          outline: 2px solid #005fab;
        }
        .Spreadsheet__cell input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          padding: 0;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
