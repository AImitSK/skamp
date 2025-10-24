// src/components/strategy/StrategyDocumentEditor.tsx - PLAN 11/11 Vereinfachter Editor
'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  ListBulletIcon,
  CodeBracketIcon,
  LinkIcon,
  DocumentIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

import type { StrategyDocument } from '@/lib/firebase/strategy-document-service';

// ========================================
// INTERFACES
// ========================================

interface StrategyDocumentEditorProps {
  document?: StrategyDocument;
  onSave: (content: string, title: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ========================================
// STRATEGY DOCUMENT EDITOR COMPONENT
// ========================================

export default function StrategyDocumentEditor({
  document,
  onSave,
  onCancel,
  isLoading = false
}: StrategyDocumentEditorProps) {
  const [title, setTitle] = useState(document?.title || '');
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: document?.content || '<p>Beginnen Sie hier mit der Erstellung Ihres Strategiedokuments...</p>',
    editable: true,
  });

  useEffect(() => {
    if (editor && document?.content) {
      editor.commands.setContent(document.content);
    }
  }, [editor, document?.content]);

  const handleSave = async () => {
    if (!editor || !title.trim()) return;

    setIsSaving(true);
    try {
      const content = editor.getHTML();
      await onSave(content, title);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!editor) {
    return <div>Editor wird geladen...</div>;
  }

  return (
    <div className="strategy-document-editor h-full flex flex-col">
      {/* Header mit Titel und Aktionen */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex-1 mr-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dokumenttitel eingeben..."
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
          
          <Button
            onClick={onCancel}
            variant="outline"
          >
            Abbrechen
          </Button>
        </div>
      </div>

      {/* Vereinfachte Toolbar */}
      <div className="flex items-center space-x-1 p-2 border-b bg-gray-50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bold') ? 'bg-gray-200' : ''
          }`}
        >
          <strong>B</strong>
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('italic') ? 'bg-gray-200' : ''
          }`}
        >
          <em>I</em>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''
          }`}
        >
          H1
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''
          }`}
        >
          H2
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bulletList') ? 'bg-gray-200' : ''
          }`}
        >
          <ListBulletIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('orderedList') ? 'bg-gray-200' : ''
          }`}
        >
          1.
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('blockquote') ? 'bg-gray-200' : ''
          }`}
        >
          "
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('codeBlock') ? 'bg-gray-200' : ''
          }`}
        >
          <CodeBracketIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="p-2 rounded hover:bg-gray-200"
          title="Tabelle einfügen (3x3)"
        >
          <TableCellsIcon className="w-4 h-4" />
        </button>

        {editor.isActive('table') && (
          <>
            <button
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="p-2 rounded hover:bg-gray-200 text-xs"
              title="Spalte links hinzufügen"
            >
              +C◄
            </button>
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="p-2 rounded hover:bg-gray-200 text-xs"
              title="Spalte rechts hinzufügen"
            >
              +C►
            </button>
            <button
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="p-2 rounded hover:bg-gray-200 text-xs"
              title="Spalte löschen"
            >
              -C
            </button>
            <button
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="p-2 rounded hover:bg-gray-200 text-xs"
              title="Zeile oben hinzufügen"
            >
              +R▲
            </button>
            <button
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="p-2 rounded hover:bg-gray-200 text-xs"
              title="Zeile unten hinzufügen"
            >
              +R▼
            </button>
            <button
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="p-2 rounded hover:bg-gray-200 text-xs"
              title="Zeile löschen"
            >
              -R
            </button>
            <button
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="p-2 rounded hover:bg-gray-200 text-xs text-red-600"
              title="Tabelle löschen"
            >
              ✕T
            </button>
          </>
        )}
      </div>

      {/* Editor Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none focus:outline-none"
        />
        <style jsx global>{`
          .ProseMirror table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            margin: 1em 0;
            overflow: hidden;
          }
          .ProseMirror td,
          .ProseMirror th {
            min-width: 1em;
            border: 2px solid #ced4da;
            padding: 8px 12px;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
          }
          .ProseMirror th {
            font-weight: bold;
            text-align: left;
            background-color: #f8f9fa;
          }
          .ProseMirror .selectedCell:after {
            z-index: 2;
            position: absolute;
            content: "";
            left: 0; right: 0; top: 0; bottom: 0;
            background: rgba(200, 200, 255, 0.4);
            pointer-events: none;
          }
          .ProseMirror .column-resize-handle {
            position: absolute;
            right: -2px;
            top: 0;
            bottom: -2px;
            width: 4px;
            background-color: #005fab;
            pointer-events: none;
          }
          .ProseMirror.resize-cursor {
            cursor: ew-resize;
            cursor: col-resize;
          }
        `}</style>
      </div>

      {/* Status Bar */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-500 flex justify-between">
        <span>
          {document ? 'Bearbeitung' : 'Neues Dokument'} • 
          Typ: {document?.type || 'strategy'} •
          {editor.storage.characterCount?.characters() || 0} Zeichen
        </span>
        
        {document && (
          <span>
            Version {document.version} • 
            Zuletzt bearbeitet: {document.updatedAt?.toDate?.()?.toLocaleDateString('de-DE') || 'Unbekannt'}
          </span>
        )}
      </div>
    </div>
  );
}