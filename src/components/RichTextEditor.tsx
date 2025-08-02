// src/components/RichTextEditor.tsx
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Heading from '@tiptap/extension-heading';
import { TiptapToolbar } from './TiptapToolbar';
import { useEffect, useCallback } from 'react';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface RichTextEditorProps {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSave?: (content: string) => void;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor = ({ 
  content, 
  onChange, 
  placeholder = 'Nachricht eingeben...',
  autoSave = false,
  autoSaveDelay = 2000,
  onAutoSave,
  className,
  minHeight = '200px'
}: RichTextEditorProps) => {
  
  // Auto-save functionality
  const debouncedAutoSave = useCallback(
    debounce((content: string) => {
      if (onAutoSave && content.trim()) {
        onAutoSave(content);
      }
    }, autoSaveDelay),
    [onAutoSave, autoSaveDelay]
  );
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Deaktivieren, da wir unsere eigene Heading-Extension verwenden
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Heading.configure({
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: 'font-bold',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#005fab] underline hover:text-[#004a8c]',
          rel: 'noopener noreferrer',
          target: '_blank'
        },
      }),
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
    ],
    content: content,
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base lg:prose-lg max-w-none m-5 focus:outline-none ${className || ''}`,
        style: `min-height: ${minHeight};`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html);
      
      // Auto-save wenn aktiviert
      if (autoSave && onAutoSave) {
        debouncedAutoSave(html);
      }
    },
  });
  
  // Content synchronisieren wenn sich der content prop ändert
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="border border-zinc-300 rounded-md email-editor">
      <TiptapToolbar editor={editor} />
      <div className="relative">
        <EditorContent editor={editor} />
        {/* Placeholder styling */}
        <style jsx>{`
          .email-editor .ProseMirror:before {
            content: attr(data-placeholder);
            float: left;
            color: #9CA3AF;
            pointer-events: none;
            height: 0;
          }
          
          .email-editor .ProseMirror:has(> *) :before,
          .email-editor .ProseMirror:focus:before {
            display: none;
          }
          
          /* Email-specific styling */
          .email-editor .ProseMirror blockquote {
            border-left: 3px solid #d1d5db;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #6b7280;
            background-color: #f9fafb;
            padding: 0.75rem 1rem;
            border-radius: 0.375rem;
          }
          
          /* Signature styling */
          .email-editor .signature {
            border-top: 1px solid #e5e7eb;
            margin-top: 2rem;
            padding-top: 1rem;
            color: #6b7280;
            font-size: 0.875rem;
          }
          
          /* Basic HTML table support (if pasted) */
          .email-editor table {
            border-collapse: collapse;
            margin: 1rem 0;
            width: 100%;
            border: 1px solid #d1d5db;
          }
          
          .email-editor table td,
          .email-editor table th {
            border: 1px solid #d1d5db;
            padding: 0.5rem;
            text-align: left;
          }
          
          .email-editor table th {
            background-color: #f3f4f6;
            font-weight: 600;
          }
        `}</style>
      </div>
    </div>
  );
};