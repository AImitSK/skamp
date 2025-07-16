// src/components/TiptapToolbar.tsx
"use client";

import { type Editor } from '@tiptap/react';
import { useState } from 'react';
import clsx from 'clsx';
import {
  LinkIcon,
  ChevronDownIcon,
} from '@heroicons/react/20/solid';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Field, Label } from '@/components/fieldset';

type ToolbarProps = {
  editor: Editor | null;
};

export const TiptapToolbar = ({ editor }: ToolbarProps) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState('_self');

  if (!editor) {
    return null;
  }

  // Heading options
  const headingOptions = [
    { value: 0, label: 'Normal' },
    { value: 1, label: 'Überschrift 1' },
    { value: 2, label: 'Überschrift 2' },
    { value: 3, label: 'Überschrift 3' },
  ];

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 1;
    if (editor.isActive('heading', { level: 2 })) return 2;
    if (editor.isActive('heading', { level: 3 })) return 3;
    return 0;
  };

  const setHeading = (level: number) => {
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
    }
  };

  // Color presets
  const colorPresets = [
    { name: 'Schwarz', value: '#000000' },
    { name: 'Grau', value: '#6B7280' },
    { name: 'Rot', value: '#DC2626' },
    { name: 'Orange', value: '#EA580C' },
    { name: 'Gelb', value: '#CA8A04' },
    { name: 'Grün', value: '#16A34A' },
    { name: 'Blau', value: '#2563EB' },
    { name: 'Indigo', value: '#4F46E5' },
    { name: 'Lila', value: '#9333EA' },
    { name: 'SKAMP Blau', value: '#005fab' },
  ];

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .setLink({ 
          href: linkUrl, 
          target: linkTarget,
          rel: linkTarget === '_blank' ? 'noopener noreferrer' : undefined 
        })
        .run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkTarget('_self');
  };

  const openLinkDialog = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const previousTarget = editor.getAttributes('link').target || '_self';
    setLinkUrl(previousUrl);
    setLinkTarget(previousTarget);
    setShowLinkDialog(true);
  };

  const buttons = [
    { command: 'toggleBold', icon: 'B', label: 'Fett', activeName: 'bold' },
    { command: 'toggleItalic', icon: 'I', label: 'Kursiv', activeName: 'italic' },
    { command: 'toggleStrike', icon: 'S', label: 'Durchgestrichen', activeName: 'strike' },
    { command: 'toggleBulletList', icon: '•', label: 'Liste', activeName: 'bulletList' },
    { command: 'toggleOrderedList', icon: '1.', label: 'Nummerierte Liste', activeName: 'orderedList' },
  ];

  return (
    <>
      <div 
        className="flex flex-wrap items-center gap-1 border-b border-zinc-300 p-2 bg-zinc-50"
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Heading Dropdown */}
        <div className="relative">
          <select
            value={getCurrentHeading()}
            onChange={(e) => setHeading(Number(e.target.value))}
            onMouseDown={(e) => e.stopPropagation()}
            className="px-3 py-1.5 pr-8 text-sm border border-zinc-300 rounded-md hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary appearance-none bg-white"
          >
            {headingOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-300 mx-1" />

        {/* Format buttons */}
        {buttons.map(btn => (
          <button
            key={btn.label}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (editor.chain().focus() as any)[btn.command]().run();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
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

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-300 mx-1" />

        {/* Link button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openLinkDialog();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={clsx(
            'p-2 w-9 h-9 flex items-center justify-center rounded-md transition-colors',
            {
              'bg-indigo-600 text-white': editor.isActive('link'),
              'hover:bg-zinc-200': !editor.isActive('link'),
            }
          )}
          title="Link einfügen"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-300 mx-1" />

        {/* Color Picker */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-600 ml-2">Textfarbe:</span>
          <div className="flex gap-1">
            {colorPresets.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  editor.chain().focus().setColor(color.value).run();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
            {/* Reset color button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                editor.chain().focus().unsetColor().run();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="px-2 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
              title="Farbe zurücksetzen"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onClose={() => setShowLinkDialog(false)}>
        <DialogTitle className="px-6 py-4">Link einfügen</DialogTitle>
        <DialogBody className="px-6">
          <Field>
            <Label>URL</Label>
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
            />
          </Field>
          <Field className="mt-4">
            <Label>Link öffnen in</Label>
            <select
              value={linkTarget}
              onChange={(e) => setLinkTarget(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
            >
              <option value="_self">Gleichem Fenster</option>
              <option value="_blank">Neuem Fenster</option>
            </select>
          </Field>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={() => setShowLinkDialog(false)}>
            Abbrechen
          </Button>
          {editor.isActive('link') && (
            <Button
              color="zinc"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setShowLinkDialog(false);
              }}
            >
              Link entfernen
            </Button>
          )}
          <Button
            onClick={handleLinkSubmit}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            {linkUrl ? 'Link setzen' : 'Link entfernen'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};