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
  const [, setUpdateTrigger] = useState(0);

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
    onUpdate: () => {
      // Trigger re-render für Toolbar-Button States
      setUpdateTrigger(prev => prev + 1);
    },
    onSelectionUpdate: () => {
      // Trigger re-render wenn Selection sich ändert
      setUpdateTrigger(prev => prev + 1);
    },
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
            plain
          >
            Abbrechen
          </Button>
        </div>
      </div>

      {/* Vereinfachte Toolbar */}
      <div className="flex items-center space-x-1 p-2 border-b bg-gray-50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-blue-100 text-blue-700 font-bold' : ''
          }`}
          title="Fett (Strg+B)"
        >
          <strong>B</strong>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Kursiv (Strg+I)"
        >
          <em>I</em>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700 font-bold' : ''
          }`}
          title="Überschrift 1"
        >
          H1
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
          }`}
          title="Überschrift 2"
        >
          H2
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Aufzählungsliste"
        >
          <ListBulletIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700 font-semibold' : ''
          }`}
          title="Nummerierte Liste"
        >
          1.
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors text-lg ${
            editor.isActive('blockquote') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Zitat"
        >
          "
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('codeBlock') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Code-Block"
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
          /* Editor Base Styles */
          .ProseMirror {
            outline: none;
            min-height: 400px;
          }
          .ProseMirror:focus {
            outline: none;
          }

          /* Liste Styles */
          .ProseMirror ul,
          .ProseMirror ol {
            padding: 0 1.5rem;
            margin: 1rem 0;
          }
          .ProseMirror ul {
            list-style-type: disc;
          }
          .ProseMirror ol {
            list-style-type: decimal;
          }
          .ProseMirror li {
            margin: 0.25rem 0;
            padding-left: 0.5rem;
          }
          .ProseMirror li > p {
            margin: 0;
          }
          .ProseMirror ul ul {
            list-style-type: circle;
            margin: 0.5rem 0;
          }
          .ProseMirror ul ul ul {
            list-style-type: square;
          }

          /* Blockquote */
          .ProseMirror blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #6b7280;
            font-style: italic;
          }

          /* Code Block */
          .ProseMirror pre {
            background: #1f2937;
            color: #f9fafb;
            font-family: 'JetBrainsMono', 'Courier New', Courier, monospace;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1rem 0;
          }
          .ProseMirror code {
            background: #f3f4f6;
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-size: 0.9em;
            color: #1f2937;
          }
          .ProseMirror pre code {
            background: none;
            padding: 0;
            color: inherit;
          }

          /* Headings */
          .ProseMirror h1 {
            font-size: 2rem;
            font-weight: 700;
            margin: 1.5rem 0 1rem;
            line-height: 1.2;
          }
          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 1.25rem 0 0.75rem;
            line-height: 1.3;
          }
          .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 1rem 0 0.5rem;
            line-height: 1.4;
          }

          /* Paragraphs */
          .ProseMirror p {
            margin: 0.75rem 0;
            line-height: 1.6;
          }

          /* Table Styles */
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

          /* Placeholder */
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #adb5bd;
            pointer-events: none;
            height: 0;
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