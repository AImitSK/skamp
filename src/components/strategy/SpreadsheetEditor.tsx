'use client';

import React, { useState } from 'react';
import Spreadsheet from 'react-spreadsheet';

// ========================================
// TYPES
// ========================================

export interface SpreadsheetData {
  rows: number;
  cols: number;
  data: Array<Array<{ value: string }>>;
}

interface SpreadsheetEditorProps {
  data: SpreadsheetData | null;
  onDataChange: (data: SpreadsheetData) => void;
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
  data: initialData,
  onDataChange,
}: SpreadsheetEditorProps) {
  const [data, setData] = useState<Array<Array<{ value: string }>>>(
    initialData?.data || createEmptySpreadsheet().data
  );

  const handleDataChange = (newData: Array<Array<{ value: string }>>) => {
    setData(newData);
    onDataChange({
      rows: newData.length,
      cols: newData[0]?.length || 0,
      data: newData,
    });
  };

  const handleAddRow = () => {
    const cols = data[0]?.length || 6;
    const newData = [...data, Array.from({ length: cols }, () => ({ value: '' }))];
    handleDataChange(newData);
  };

  const handleAddColumn = () => {
    const newData = data.map(row => [...row, { value: '' }]);
    handleDataChange(newData);
  };

  const handleRemoveLastRow = () => {
    if (data.length > 1) {
      handleDataChange(data.slice(0, -1));
    }
  };

  const handleRemoveLastColumn = () => {
    if (data[0]?.length > 1) {
      handleDataChange(data.map(row => row.slice(0, -1)));
    }
  };

  return (
    <div className="spreadsheet-editor flex flex-col bg-white h-full">
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
          onChange={handleDataChange}
          columnLabels={Array.from({ length: data[0]?.length || 0 }, (_, i) =>
            String.fromCharCode(65 + i)
          )}
          rowLabels={Array.from({ length: data.length }, (_, i) => String(i + 1))}
        />
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
