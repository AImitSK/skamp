// src/components/GmailStyleToolbar.tsx
"use client";

import { type Editor } from '@tiptap/react';
import { useState } from 'react';
import clsx from 'clsx';
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline'; // CeleroPress Design Pattern: nur 24/outline
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';

type GmailStyleToolbarProps = {
  editor: Editor | null;
};

export const GmailStyleToolbar = ({ editor }: GmailStyleToolbarProps) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  if (!editor) {
    return null;
  }

  // Minimale Gmail-Style Actions (nur essentials)
  const toolbarActions = [
    { 
      command: 'toggleBold', 
      icon: BoldIcon, 
      label: 'Fett', 
      activeName: 'bold',
      shortcut: 'Strg+B'
    },
    { 
      command: 'toggleItalic', 
      icon: ItalicIcon, 
      label: 'Kursiv', 
      activeName: 'italic',
      shortcut: 'Strg+I'
    },
    { 
      command: 'toggleBulletList', 
      icon: ListBulletIcon, 
      label: 'Aufzählung', 
      activeName: 'bulletList',
      shortcut: 'Strg+Shift+8'
    },
  ];

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .setLink({ 
          href: linkUrl, 
          target: '_blank',
          rel: 'noopener noreferrer'
        })
        .run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  const openLinkDialog = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkDialog(true);
  };

  return (
    <>
      {/* Gmail-Style minimale Toolbar */}
      <div 
        className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50"
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Format buttons (nur essentials) */}
        <div className="flex items-center gap-1">
          {toolbarActions.map(action => (
            <button
              key={action.label}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (editor.chain().focus() as any)[action.command]().run();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              disabled={!(editor.can() as any)[action.command]()}
              className={clsx(
                'p-2 w-8 h-8 flex items-center justify-center rounded transition-colors',
                // CeleroPress Design Pattern: Primary-Farben
                {
                  'bg-[#005fab] text-white': editor.isActive(action.activeName),
                  'hover:bg-gray-100 text-gray-700': !editor.isActive(action.activeName),
                  'text-gray-400 cursor-not-allowed': !(editor.can() as any)[action.command]()
                }
              )}
              title={`${action.label} (${action.shortcut})`}
            >
              <action.icon className="h-4 w-4" />
            </button>
          ))}

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300 mx-2" />

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
              'p-2 w-8 h-8 flex items-center justify-center rounded transition-colors',
              {
                'bg-[#005fab] text-white': editor.isActive('link'),
                'hover:bg-gray-100 text-gray-700': !editor.isActive('link'),
              }
            )}
            title="Link einfügen (Strg+K)"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Rechts: Zusätzliche Gmail-Style Actions (später) */}
        <div className="flex-1" />
        
        {/* Auto-Save Indicator (später für Floating Toolbar) */}
        <div className="text-xs text-gray-500">
          Auto-Speichern aktiv
        </div>
      </div>

      {/* Link Dialog (CeleroPress Design Pattern konform) */}
      <Dialog open={showLinkDialog} onClose={() => setShowLinkDialog(false)}>
        <DialogTitle>Link einfügen</DialogTitle>
        <DialogBody>
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
        </DialogBody>
        <DialogActions>
          <Button 
            className="bg-gray-50 hover:bg-gray-100 text-gray-900 border-0"
            onClick={() => setShowLinkDialog(false)}
          >
            Abbrechen
          </Button>
          {editor.isActive('link') && (
            <Button
              className="bg-gray-50 hover:bg-gray-100 text-gray-900 border-0"
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