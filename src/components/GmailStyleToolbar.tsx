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
  PlusIcon,
  MinusIcon,
  DocumentIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  Bars3BottomRightIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
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
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  if (!editor) {
    return null;
  }

  // Gmail-Style Actions (erweitert)
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
      command: 'toggleUnderline', 
      icon: () => <span className="font-bold underline text-sm">U</span>, 
      label: 'Unterstreichen', 
      activeName: 'underline',
      shortcut: 'Strg+U'
    },
    { 
      command: () => editor.chain().focus().toggleBulletList().run(), 
      icon: ListBulletIcon, 
      label: 'Aufzählung', 
      activeName: 'bulletList',
      shortcut: 'Strg+Shift+8',
      isActive: () => editor.isActive('bulletList')
    },
    { 
      command: () => editor.chain().focus().toggleOrderedList().run(), 
      icon: () => (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      ), 
      label: 'Nummerierte Liste', 
      activeName: 'orderedList',
      shortcut: 'Strg+Shift+7',
      isActive: () => editor.isActive('orderedList')
    },
    { 
      command: 'toggleQuote', 
      icon: ChatBubbleLeftRightIcon, 
      label: 'Zitat', 
      activeName: 'quote',
      shortcut: 'Strg+Shift+Q'
    },
    { 
      command: () => editor.chain().focus().toggleCTA().run(), 
      icon: MegaphoneIcon, 
      label: 'Call-to-Action', 
      activeName: 'ctaText',
      shortcut: 'Strg+Shift+C',
      isActive: () => editor.isActive('ctaText')
    },
  ];

  const alignmentActions = [
    { 
      command: () => editor.chain().focus().setTextAlign('left').run(), 
      icon: Bars3BottomLeftIcon, 
      label: 'Linksbündig', 
      activeName: 'left',
      shortcut: 'Strg+Shift+L'
    },
    { 
      command: () => editor.chain().focus().setTextAlign('center').run(), 
      icon: Bars3Icon, 
      label: 'Zentriert', 
      activeName: 'center',
      shortcut: 'Strg+Shift+E'
    },
    { 
      command: () => editor.chain().focus().setTextAlign('right').run(), 
      icon: Bars3BottomRightIcon, 
      label: 'Rechtsbündig', 
      activeName: 'right',
      shortcut: 'Strg+Shift+R'
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

  // Elegante Farben-Organisation wie in deinem Screenshot
  const colorRows = [
    [
      { name: 'Schwarz', value: '#000000' },
      { name: 'Dunkelgrau', value: '#374151' },
      { name: 'Grau', value: '#6B7280' },
      { name: 'Hellgrau', value: '#9CA3AF' },
    ],
    [
      { name: 'Primary', value: '#005fab' },
      { name: 'Blau', value: '#3B82F6' },
      { name: 'Indigo', value: '#4F46E5' },
      { name: 'Lila', value: '#7C3AED' },
    ],
    [
      { name: 'Rot', value: '#EF4444' },
      { name: 'Orange', value: '#F97316' },
      { name: 'Gelb', value: '#EAB308' },
      { name: 'Grün', value: '#10B981' },
    ],
  ];

  // Schriftgrößen wie in deinem Screenshot
  const fontSizes = [
    { name: 'Klein', value: '14px', class: 'text-sm' },
    { name: 'Normal', value: '16px', class: 'text-base' },
    { name: 'Groß', value: '20px', class: 'text-lg' },
    { name: 'Riesig', value: '24px', class: 'text-xl' },
  ];

  const handleFontSizeChange = (fontSize: string) => {
    // Setze FontSize über TextStyle Mark
    editor.chain().focus().setMark('textStyle', { fontSize }).run();
    setShowFontSizeDropdown(false);
  };

  // Aktuell aktive Schriftgröße ermitteln (fallback auf Normal)
  const getCurrentFontSize = () => {
    const attrs = editor.getAttributes('textStyle');
    const currentSize = attrs.fontSize || '16px';
    return fontSizes.find(size => size.value === currentSize) || fontSizes[1];
  };

  const handleClearFormatting = () => {
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  };

  const handleColorChange = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setShowColorDropdown(false);
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
                if (typeof action.command === 'function') {
                  action.command();
                } else {
                  (editor.chain().focus() as any)[action.command]().run();
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              disabled={typeof action.command === 'string' ? !(editor.can() as any)[action.command]() : false}
              className={clsx(
                'p-2 w-8 h-8 flex items-center justify-center rounded transition-colors',
                // CeleroPress Design Pattern: Primary-Farben
                {
                  'bg-[#005fab] text-white': action.isActive ? 
                    action.isActive() : 
                    editor.isActive(action.activeName),
                  'hover:bg-gray-100 text-gray-700': action.isActive ? 
                    !action.isActive() : 
                    !editor.isActive(action.activeName),
                  'text-gray-400 cursor-not-allowed': typeof action.command === 'string' ? 
                    !(editor.can() as any)[action.command]() : false
                }
              )}
              title={`${action.label} (${action.shortcut})`}
            >
              {typeof action.icon === 'function' ? 
                action.icon() : 
                <action.icon className="h-4 w-4" />
              }
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

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Ausrichtung Buttons */}
          {alignmentActions.map(action => (
            <button
              key={action.label}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                action.command();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={clsx(
                'p-2 w-8 h-8 flex items-center justify-center rounded transition-colors',
                {
                  'bg-[#005fab] text-white': editor.isActive('paragraph', { textAlign: action.activeName }) || 
                                           (action.activeName === 'left' && !editor.getAttributes('paragraph').textAlign),
                  'hover:bg-gray-100 text-gray-700': !editor.isActive('paragraph', { textAlign: action.activeName }) && 
                                                   !(action.activeName === 'left' && !editor.getAttributes('paragraph').textAlign),
                }
              )}
              title={`${action.label} (${action.shortcut})`}
            >
              <action.icon className="h-4 w-4" />
            </button>
          ))}

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Schriftgröße Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors min-w-[70px] text-left"
              title="Schriftgröße"
            >
              {getCurrentFontSize().name}
            </button>
            
            {showFontSizeDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-sm z-10 min-w-[100px]">
                {fontSizes.map(size => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => handleFontSizeChange(size.value)}
                    className={clsx(
                      'w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-md last:rounded-b-md',
                      size.class,
                      {
                        'bg-blue-50 text-blue-700': getCurrentFontSize().value === size.value
                      }
                    )}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Formatierung löschen */}
          <button
            type="button"
            onClick={handleClearFormatting}
            className="p-2 w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-gray-100 text-gray-700"
            title="Formatierung entfernen"
          >
            <DocumentIcon className="h-4 w-4" />
          </button>

          {/* Farben Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorDropdown(!showColorDropdown)}
              className="p-2 w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-gray-100 text-gray-700"
              title="Textfarbe"
            >
              <div className="w-4 h-4 rounded border border-gray-300" style={{background: 'linear-gradient(45deg, #000 25%, #005fab 25%, #005fab 50%, #EF4444 50%, #EF4444 75%, #10B981 75%)'}} />
            </button>
            
            {showColorDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-sm z-10 p-2">
                <div className="text-xs font-medium text-gray-600 mb-2 px-1">Schriftfarbe</div>
                {colorRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1 mb-1">
                    {row.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleColorChange(color.value)}
                        className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 transition-colors"
                        style={{backgroundColor: color.value}}
                        title={color.name}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rechts: Auto-Save Indicator (links neben Formatierung) */}
        <div className="flex-1" />
        
        {/* Auto-Save Indicator - weiter links positioniert */}
        <div className="text-xs text-gray-500 mr-12">
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