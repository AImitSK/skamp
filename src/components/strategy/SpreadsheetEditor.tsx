'use client';

import React, { useState, useCallback } from 'react';
import Spreadsheet from 'react-spreadsheet';
import { Button } from '@/components/ui/button';
import {
  TableCellsIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    <div className={`spreadsheet-editor flex flex-col bg-white ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'} relative`}>
      {/* Close und Fullscreen Buttons */}
      <div className="absolute top-0 right-0 pt-4 pr-4 z-30 flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          title={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
        >
          <span className="sr-only">{isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}</span>
          {isFullscreen ? (
            <ArrowsPointingInIcon className="h-6 w-6" aria-hidden="true" />
          ) : (
            <ArrowsPointingOutIcon className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <span className="sr-only">Schließen</span>
          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2 mb-3">
          <TableCellsIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-zinc-700">
            {initialData ? 'Tabelle bearbeiten' : `Neue Tabelle - ${new Date().toLocaleDateString('de-DE')}`}
          </span>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tabellenname eingeben..."
          className="text-xl font-semibold w-full border-none outline-none bg-zinc-50 px-3 py-2 rounded-md focus:bg-zinc-100 transition-colors"
        />
      </div>

      {/* Toolbar für Zeilen/Spalten */}
      <div className="flex items-center justify-between p-3 border-b bg-zinc-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddRow}
            className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-4 rounded-lg transition-colors text-sm"
          >
            + Zeile
          </button>
          <button
            onClick={handleAddColumn}
            className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-4 rounded-lg transition-colors text-sm"
          >
            + Spalte
          </button>
          <button
            onClick={handleRemoveLastRow}
            className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-4 rounded-lg transition-colors text-sm"
          >
            - Letzte Zeile
          </button>
          <button
            onClick={handleRemoveLastColumn}
            className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-4 rounded-lg transition-colors text-sm"
          >
            - Letzte Spalte
          </button>
        </div>
        <div className="text-sm text-zinc-600">
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

      {/* Footer mit Aktionen */}
      <div className="flex items-center justify-end space-x-3 p-4 border-t bg-gray-50">
        <button
          onClick={onCancel}
          className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-6 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !title.trim() || isLoading}
          className="bg-primary hover:bg-primary-hover text-white font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Speichert...' : 'Speichern'}
        </button>
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
