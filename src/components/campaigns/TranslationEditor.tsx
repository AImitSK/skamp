// src/components/campaigns/TranslationEditor.tsx
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect } from 'react';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  ListBulletIcon,
  QueueListIcon as ListOrderedIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from '@heroicons/react/24/outline';
import { CTAExtension } from '@/components/editor/CTAExtension';
import { HashtagExtension } from '@/components/editor/HashtagExtension';
import { QuoteExtension } from '@/components/editor/QuoteExtension';
import { useTranslations } from 'next-intl';

interface TranslationEditorProps {
  content: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minHeight?: string;
  placeholder?: string;
}

/**
 * Rich-Text-Editor für Übersetzungen mit allen PR-Extensions
 * (CTA, Hashtag, Quote) - damit spezielle Markups erhalten bleiben
 */
export function TranslationEditor({
  content,
  onChange,
  disabled = false,
  minHeight = '200px',
  placeholder
}: TranslationEditorProps) {
  const t = useTranslations('campaigns.translation');
  const defaultPlaceholder = t('placeholder');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: false, // Eigene QuoteExtension verwenden
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // PR-spezifische Extensions für Markups
      CTAExtension,
      HashtagExtension,
      QuoteExtension,
    ],
    content,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-4 py-3 text-gray-900',
        style: `min-height: ${minHeight};`,
        'data-placeholder': placeholder || defaultPlaceholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Content synchronisieren wenn sich props ändern
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div
        className="border border-gray-300 rounded-md bg-gray-50 animate-pulse"
        style={{ minHeight }}
      />
    );
  }

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 bg-gray-50 flex flex-wrap items-center gap-1">
        {/* Text-Formatierung */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
            title={t('toolbar.bold')}
            disabled={disabled}
          >
            <BoldIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
            title={t('toolbar.italic')}
            disabled={disabled}
          >
            <ItalicIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('underline') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
            title={t('toolbar.underline')}
            disabled={disabled}
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('strike') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
            title={t('toolbar.strikethrough')}
            disabled={disabled}
          >
            <StrikethroughIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Überschriften */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300">
          <select
            onChange={(e) => {
              const level = parseInt(e.target.value);
              if (level === 0) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
              }
            }}
            className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white hover:bg-gray-50 transition-colors"
            value={
              editor.isActive('heading', { level: 1 }) ? 1 :
              editor.isActive('heading', { level: 2 }) ? 2 :
              editor.isActive('heading', { level: 3 }) ? 3 : 0
            }
            disabled={disabled}
          >
            <option value={0}>{t('toolbar.headingNormal')}</option>
            <option value={1}>{t('toolbar.heading1')}</option>
            <option value={2}>{t('toolbar.heading2')}</option>
            <option value={3}>{t('toolbar.heading3')}</option>
          </select>
        </div>

        {/* Listen */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
            title={t('toolbar.bulletList')}
            disabled={disabled}
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
            title={t('toolbar.orderedList')}
            disabled={disabled}
          >
            <ListOrderedIcon className="h-4 w-4" />
          </button>
        </div>

        {/* PR-spezifische Markups */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors text-xs font-medium ${editor.isActive('blockquote') ? 'bg-purple-100 text-purple-700' : 'text-gray-600'}`}
            title={t('toolbar.quote')}
            disabled={disabled}
          >
            ❝
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHashtag().run(); }}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors text-xs font-medium ${editor.isActive('hashtag') ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            title={t('toolbar.hashtag')}
            disabled={disabled}
          >
            #
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCTA().run(); }}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors text-xs font-bold ${editor.isActive('ctaText') ? 'bg-amber-100 text-amber-700' : 'text-gray-600'}`}
            title={t('toolbar.cta')}
            disabled={disabled}
          >
            CTA
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().undo().run(); }}
            disabled={!editor.can().undo() || disabled}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${!editor.can().undo() ? 'opacity-40 cursor-not-allowed' : 'text-gray-600'}`}
            title={t('toolbar.undo')}
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().redo().run(); }}
            disabled={!editor.can().redo() || disabled}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${!editor.can().redo() ? 'opacity-40 cursor-not-allowed' : 'text-gray-600'}`}
            title={t('toolbar.redo')}
          >
            <ArrowUturnRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="bg-white">
        <EditorContent editor={editor} />

        {/* CSS für PR-Markups */}
        <style jsx>{`
          :global(.ProseMirror) {
            font-size: 14px !important;
            line-height: 1.6 !important;
          }
          :global(.ProseMirror p) {
            margin-bottom: 0.75em !important;
          }
          :global(.ProseMirror h1) {
            font-size: 1.5em !important;
            font-weight: 700 !important;
            margin-top: 1em !important;
            margin-bottom: 0.5em !important;
          }
          :global(.ProseMirror h2) {
            font-size: 1.25em !important;
            font-weight: 600 !important;
            margin-top: 0.75em !important;
            margin-bottom: 0.4em !important;
          }
          :global(.ProseMirror h3) {
            font-size: 1.1em !important;
            font-weight: 600 !important;
            margin-top: 0.5em !important;
            margin-bottom: 0.3em !important;
          }
          :global(.ProseMirror ul, .ProseMirror ol) {
            padding-left: 1.5em !important;
            margin: 0.5em 0 !important;
          }
          :global(.ProseMirror li) {
            margin-bottom: 0.25em !important;
          }
          /* CTA Markup */
          :global(.ProseMirror [data-type="cta-text"]) {
            font-weight: 700 !important;
            color: #000 !important;
          }
          /* Hashtag Markup */
          :global(.ProseMirror [data-type="hashtag"]) {
            color: #2563eb !important;
            font-weight: 600 !important;
          }
          /* Quote Markup */
          :global(.ProseMirror [data-type="pr-quote"]),
          :global(.ProseMirror blockquote) {
            border-left: 4px solid #d1d5db !important;
            padding-left: 1rem !important;
            font-style: italic !important;
            color: #374151 !important;
            margin: 0.75em 0 !important;
          }
        `}</style>
      </div>
    </div>
  );
}

export default TranslationEditor;
