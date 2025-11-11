// src/components/pr/email/EmailEditor.tsx
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  CodeBracketIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { StrikethroughIcon } from '@heroicons/react/24/outline';
import { QueueListIcon as ListOrderedIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmailEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onOpenVariables?: () => void;
  minHeight?: string;
  error?: string;
}

export default function EmailEditor({
  content,
  onChange,
  placeholder = 'Beginnen Sie mit der Eingabe Ihrer E-Mail...',
  onOpenVariables,
  minHeight = '400px',
  error
}: EmailEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#005fab] underline hover:text-[#004a8c]'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none px-4 py-3 text-gray-900 leading-relaxed',
      }
    },
    immediatelyRender: false // SSR-Fix für TipTap
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const openLinkDialog = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkDialog(true);
  }, [editor]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor) return;

    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }

    setShowLinkDialog(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const insertVariable = useCallback((variable: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(variable).run();
  }, [editor]);

  // Expose insertVariable method
  useEffect(() => {
    if (editor) {
      (window as any).emailEditorInsertVariable = insertVariable;
    }
    return () => {
      delete (window as any).emailEditorInsertVariable;
    };
  }, [insertVariable]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${error ? 'border-red-300' : 'border-gray-300'}`}>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 px-2 py-2 flex flex-wrap items-center gap-1">
        {/* Text-Formatierung */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : ''}`}
            title="Fett (Strg+B)"
          >
            <BoldIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : ''}`}
            title="Kursiv (Strg+I)"
          >
            <ItalicIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('underline') ? 'bg-gray-200 text-blue-600' : ''}`}
            title="Unterstrichen (Strg+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('strike') ? 'bg-gray-200 text-blue-600' : ''}`}
            title="Durchgestrichen"
          >
            <StrikethroughIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openLinkDialog(); }}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('link') ? 'bg-gray-200 text-blue-600' : ''}`}
            title="Link einfügen (Strg+K)"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Überschriften */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <select
            onChange={(e) => {
              const level = parseInt(e.target.value);
              if (level === 0) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
              }
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-50 transition-colors"
            value={
              editor.isActive('heading', { level: 1 }) ? 1 :
              editor.isActive('heading', { level: 2 }) ? 2 :
              editor.isActive('heading', { level: 3 }) ? 3 : 0
            }
          >
            <option value={0}>Normal</option>
            <option value={1}>Überschrift 1</option>
            <option value={2}>Überschrift 2</option>
            <option value={3}>Überschrift 3</option>
          </select>
        </div>

        {/* Listen */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : ''}`}
            title="Aufzählungsliste"
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : ''}`}
            title="Nummerierte Liste"
          >
            <ListOrderedIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Code */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('codeBlock') ? 'bg-gray-200 text-blue-600' : ''}`}
            title="Code-Block"
          >
            <CodeBracketIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().undo().run(); }}
            disabled={!editor.can().undo()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${!editor.can().undo() ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Rückgängig (Strg+Z)"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().redo().run(); }}
            disabled={!editor.can().redo()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${!editor.can().redo() ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Wiederholen (Strg+Y)"
          >
            <ArrowUturnRightIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Variables Button */}
        {onOpenVariables && (
          <button
            type="button"
            onClick={onOpenVariables}
            className="px-3 py-1.5 bg-[#005fab] text-white text-sm rounded hover:bg-[#004a8c] flex items-center gap-2 transition-colors"
            title="Variablen einfügen"
          >
            <CodeBracketIcon className="h-4 w-4" />
            Variablen
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="bg-white relative" style={{ minHeight }}>
        {!content && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
        <style jsx>{`
          :global(.ProseMirror) {
            font-size: 16px !important;
            line-height: 1.7 !important;
            color: #111827 !important;
          }
          :global(.ProseMirror p) {
            margin-bottom: 1.2em !important;
            color: #111827 !important;
          }
          :global(.ProseMirror h1) {
            font-size: 2em !important;
            font-weight: 700 !important;
            color: #111827 !important;
            margin-top: 1.5em !important;
            margin-bottom: 0.75em !important;
            line-height: 1.2 !important;
          }
          :global(.ProseMirror h2) {
            font-size: 1.5em !important;
            font-weight: 600 !important;
            color: #111827 !important;
            margin-top: 1.25em !important;
            margin-bottom: 0.5em !important;
            line-height: 1.3 !important;
          }
          :global(.ProseMirror h3) {
            font-size: 1.25em !important;
            font-weight: 600 !important;
            color: #374151 !important;
            margin-top: 1em !important;
            margin-bottom: 0.5em !important;
            line-height: 1.4 !important;
          }
          :global(.ProseMirror ul) {
            color: #111827 !important;
            padding-left: 1.5em !important;
            margin-top: 0.75em !important;
            margin-bottom: 0.75em !important;
            list-style-type: disc !important;
          }
          :global(.ProseMirror ol) {
            color: #111827 !important;
            padding-left: 1.5em !important;
            margin-top: 0.75em !important;
            margin-bottom: 0.75em !important;
            list-style-type: decimal !important;
          }
          :global(.ProseMirror ul li),
          :global(.ProseMirror ol li) {
            color: #111827 !important;
            margin-bottom: 0.5em !important;
          }
          :global(.ProseMirror code) {
            background-color: #f3f4f6 !important;
            padding: 0.2em 0.4em !important;
            border-radius: 0.25em !important;
            font-size: 0.9em !important;
          }
          :global(.ProseMirror pre) {
            background-color: #1f2937 !important;
            color: #f3f4f6 !important;
            padding: 1em !important;
            border-radius: 0.5em !important;
            margin-top: 1em !important;
            margin-bottom: 1em !important;
          }
          :global(.ProseMirror pre code) {
            background-color: transparent !important;
            padding: 0 !important;
            color: #f3f4f6 !important;
          }
        `}</style>
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onClose={() => setShowLinkDialog(false)} size="sm">
        <DialogTitle>Link einfügen</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-2">
                URL
              </label>
              <Input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://beispiel.de"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLinkSubmit();
                  }
                }}
              />
              <p className="mt-2 text-xs text-gray-500">
                Leer lassen um den Link zu entfernen
              </p>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowLinkDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleLinkSubmit} className="bg-[#005fab] hover:bg-[#004a8c] text-white">
            {linkUrl ? 'Link einfügen' : 'Link entfernen'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}