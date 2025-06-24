// src/components/TiptapToolbar.tsx
"use client";

import { type Editor } from '@tiptap/react';
import clsx from 'clsx'; // Dieser Import sollte jetzt funktionieren

type ToolbarProps = {
  editor: Editor | null;
};

export const TiptapToolbar = ({ editor }: ToolbarProps) => {
  if (!editor) {
    return null;
  }

  const buttons = [
    { command: 'toggleBold', icon: 'B', label: 'Fett', activeName: 'bold' },
    { command: 'toggleItalic', icon: 'I', label: 'Kursiv', activeName: 'italic' },
    { command: 'toggleStrike', icon: 'S', label: 'Durchgestrichen', activeName: 'strike' },
    { command: 'toggleBulletList', icon: '•', label: 'Liste', activeName: 'bulletList' },
    { command: 'toggleOrderedList', icon: '1.', label: 'Nummerierte Liste', activeName: 'orderedList' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-300 p-2 bg-zinc-50">
      {buttons.map(btn => (
        <button
          key={btn.label}
          onClick={() => (editor.chain().focus() as any)[btn.command]().run()}
          disabled={!(editor.can() as any)[btn.command]()}
          className={clsx(
            'p-2 w-9 h-9 flex items-center justify-center rounded-md text-sm font-semibold transition-colors',
            {
              'bg-indigo-600 text-white': editor.isActive(btn.activeName),
              'hover:bg-zinc-200': !editor.isActive(btn.activeName),
              'text-zinc-400 cursor-not-allowed': !(editor.can() as any)[btn.command]()
            }
          )}
          title={btn.label}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
};