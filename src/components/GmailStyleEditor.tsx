// src/components/GmailStyleEditor.tsx
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Heading from '@tiptap/extension-heading';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { Extension } from '@tiptap/core';

// Custom Extensions für TipTap v2 Kompatibilität
const FontSize = Extension.create({
  name: 'fontSize',
  
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
    }
  },
});

// Custom Underline Extension (kompatibel mit TipTap v2)
const CustomUnderline = Extension.create({
  name: 'customUnderline',
  
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          underline: {
            default: null,
            parseHTML: element => element.style.textDecoration?.includes('underline') ? 'underline' : null,
            renderHTML: attributes => {
              if (!attributes.underline) {
                return {}
              }
              return {
                style: 'text-decoration: underline',
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      toggleUnderline: () => ({ chain, editor }) => {
        const isActive = editor.isActive('textStyle', { underline: 'underline' });
        if (isActive) {
          return chain().setMark('textStyle', { underline: null }).run();
        }
        return chain().setMark('textStyle', { underline: 'underline' }).run();
      },
    }
  },
});

// Custom TextAlign Extension (kompatibel mit TipTap v2) 
const CustomTextAlign = Extension.create({
  name: 'customTextAlign',
  
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: 'left',
            parseHTML: element => element.style.textAlign || 'left',
            renderHTML: attributes => {
              if (!attributes.textAlign || attributes.textAlign === 'left') {
                return {}
              }
              return {
                style: `text-align: ${attributes.textAlign}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTextAlign: (alignment: string) => ({ chain }) => {
        return chain().updateAttributes('paragraph', { textAlign: alignment }).run();
      },
    }
  },
});
import { useEffect, useCallback } from 'react';
import { GmailStyleToolbar } from './GmailStyleToolbar';
import { FloatingAIToolbar } from './FloatingAIToolbar';

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

interface GmailStyleEditorProps {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSave?: (content: string) => void;
  className?: string;
  title?: string;
  onTitleChange?: (title: string) => void;
}

export const GmailStyleEditor = ({ 
  content, 
  onChange, 
  placeholder = 'Pressemitteilung schreiben...',
  autoSave = true,
  autoSaveDelay = 10000, // 10 Sekunden wie im Masterplan
  onAutoSave,
  className,
  title = '',
  onTitleChange
}: GmailStyleEditorProps) => {
  
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
        heading: false,
        bulletList: false, // Deaktivieren um eigene zu verwenden
        orderedList: false, // Deaktivieren um eigene zu verwenden
        listItem: false, // Deaktivieren um eigene zu verwenden
      }),
      Heading.configure({
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: 'font-semibold text-gray-900',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#005fab] underline hover:text-[#004a8c] cursor-pointer',
          rel: 'noopener noreferrer',
          target: '_blank'
        },
      }),
      // Explizite Listen-Konfiguration
      ListItem.configure({
        HTMLAttributes: {
          class: 'ml-4',
        },
      }),
      BulletList.configure({
        keepMarks: true,
        keepAttributes: false,
        HTMLAttributes: {
          class: 'list-disc list-outside ml-6 space-y-1',
        },
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: false,
        HTMLAttributes: {
          class: 'list-decimal list-outside ml-6 space-y-1',
        },
      }),
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      FontSize,
      CustomUnderline,
      CustomTextAlign,
    ],
    content: content,
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        class: `gmail-editor-content focus:outline-none ${className || ''}`,
        'data-placeholder': placeholder,
        style: 'min-height: 350px; padding: 1.5rem;',
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
    <div className="gmail-style-editor bg-white rounded-lg border border-gray-200">
      {/* Floating AI Toolbar - erscheint bei Text-Markierung */}
      <FloatingAIToolbar editor={editor} />
      
      {/* Titel-Bereich (wie Gmail Subject Line) */}
      {onTitleChange && (
        <div className="border-b border-gray-200">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Titel der Pressemitteilung..."
            className="w-full px-6 py-4 text-2xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none placeholder-gray-400"
          />
        </div>
      )}

      {/* Minimale Toolbar (Gmail-Style) */}
      <GmailStyleToolbar editor={editor} />
      
      {/* Editor Content (Clean white space) */}
      <div className="relative p-6" style={{ minHeight: '400px' }}>
        <EditorContent 
          editor={editor} 
          className="prose prose-lg max-w-none"
          style={{ minHeight: '350px' }}
        />
        
        {/* Gmail-Style Styling */}
        <style jsx>{`
          .gmail-style-editor {
            /* CeleroPress Design System v2.0 */
            --primary: #005fab;
            --primary-hover: #004a8c;
            --text-primary: #000000;
            --text-secondary: #666666;
            --border-gray: #d1d5db;
          }

          .gmail-editor-content {
            min-height: 400px;
            font-size: 16px;
            line-height: 1.6;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          /* ProseMirror Editor mit richtigem Padding */
          .gmail-editor-content .ProseMirror {
            padding: 1rem 1.5rem;
            min-height: 350px;
            outline: none;
            box-sizing: border-box;
          }
          
          /* Gmail-like placeholder */
          .gmail-editor-content:empty:before {
            content: attr(data-placeholder);
            color: #9CA3AF;
            pointer-events: none;
            position: absolute;
            font-style: italic;
          }
          
          /* Clean paragraph styling */
          .gmail-editor-content p {
            margin: 0 0 1rem 0;
            color: var(--text-primary);
          }
          
          /* Heading styles (CeleroPress conform) */
          .gmail-editor-content h1 {
            font-size: 1.875rem;
            line-height: 2.25rem;
            margin: 1.5rem 0 1rem 0;
            color: var(--text-primary);
          }
          
          .gmail-editor-content h2 {
            font-size: 1.5rem;
            line-height: 2rem;
            margin: 1.25rem 0 0.75rem 0;
            color: var(--text-primary);
          }
          
          .gmail-editor-content h3 {
            font-size: 1.25rem;
            line-height: 1.75rem;
            margin: 1rem 0 0.5rem 0;
            color: var(--text-primary);
          }
          
          /* List styling mit besserer Sichtbarkeit */
          .gmail-editor-content ul,
          .gmail-editor-content ol {
            margin: 1rem 0;
            padding-left: 2rem;
          }
          
          .gmail-editor-content ul {
            list-style-type: disc;
            list-style-position: outside;
          }
          
          .gmail-editor-content ol {
            list-style-type: decimal;
            list-style-position: outside;
          }
          
          .gmail-editor-content li {
            margin: 0.5rem 0;
            padding-left: 0.5rem;
            position: relative;
          }
          
          /* Ensure list markers are visible */
          .gmail-editor-content ul li::marker,
          .gmail-editor-content ol li::marker {
            color: var(--text-primary);
            font-weight: normal;
          }
          
          /* Link styling (CeleroPress Primary) */
          .gmail-editor-content a {
            color: var(--primary);
            text-decoration: underline;
            transition: color 0.2s ease;
          }
          
          .gmail-editor-content a:hover {
            color: var(--primary-hover);
          }
          
          /* Clean blockquote styling */
          .gmail-editor-content blockquote {
            border-left: 3px solid var(--primary);
            padding-left: 1rem;
            margin: 1.5rem 0;
            color: var(--text-secondary);
            font-style: italic;
            background: #f1f0e2; /* CeleroPress hellgelb */
            padding: 1rem;
            border-radius: 0.375rem;
          }
          
          /* Focus states */
          .gmail-editor-content:focus-within {
            /* Subtle focus indication ohne störende Outlines */
          }
          
          /* KEINE Schatten-Effekte (Design Pattern) */
          .gmail-style-editor * {
            box-shadow: none !important;
          }
        `}</style>
      </div>
    </div>
  );
};