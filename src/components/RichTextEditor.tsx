// src/components/RichTextEditor.tsx
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TiptapToolbar } from './TiptapToolbar';

interface RichTextEditorProps {
  content: string;
  onChange: (richText: string) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
    ],
    content: content,
    // NEU: Diese Option behebt den Hydration-Fehler
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none m-5 focus:outline-none min-h-[200px]',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border border-zinc-300 rounded-md">
      <TiptapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};