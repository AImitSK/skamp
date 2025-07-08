// src/components/pr/email/EmailEditor.tsx
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { 
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  LinkIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  CodeBracketIcon,
  HashtagIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/20/solid';
import { useCallback, useEffect } from 'react';

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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#005fab] underline hover:text-[#004a8c]'
        }
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-4',
      }
    }
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL eingeben:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

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

  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    disabled = false, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    disabled?: boolean; 
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded transition-colors
        ${active 
          ? 'bg-gray-200 text-gray-900' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className={`border rounded-lg overflow-hidden ${error ? 'border-red-300' : 'border-gray-300'}`}>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 px-2 py-1 flex items-center gap-1 flex-wrap">
        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Fett (Strg+B)"
          >
            <BoldIcon className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Kursiv (Strg+I)"
          >
            <ItalicIcon className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={setLink}
            active={editor.isActive('link')}
            title="Link einfügen"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Headings */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Überschrift 1"
          >
            <span className="text-xs font-bold">H1</span>
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Überschrift 2"
          >
            <span className="text-xs font-bold">H2</span>
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Überschrift 3"
          >
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Aufzählungsliste"
          >
            <ListBulletIcon className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Nummerierte Liste"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10m-7 5h4" />
            </svg>
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Zitat"
          >
            <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* History */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Rückgängig (Strg+Z)"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Wiederholen (Strg+Y)"
          >
            <ArrowUturnRightIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Variables Button */}
        {onOpenVariables && (
          <>
            <div className="w-px h-6 bg-gray-300" />
            <button
              onClick={onOpenVariables}
              className="ml-2 px-3 py-1.5 bg-[#005fab] text-white text-sm rounded hover:bg-[#004a8c] flex items-center gap-2"
            >
              <CodeBracketIcon className="h-4 w-4" />
              Variablen
            </button>
          </>
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
      </div>
    </div>
  );
}