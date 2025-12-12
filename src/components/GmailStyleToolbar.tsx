// src/components/GmailStyleToolbar.tsx
"use client";

import { type Editor } from '@tiptap/react';
import { useState } from 'react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
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
  SparklesIcon,
} from '@heroicons/react/24/outline'; // CeleroPress Design Pattern: nur 24/outline
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';

type GmailStyleToolbarProps = {
  editor: Editor | null;
  isAIToolbarExpanded?: boolean;
  onToggleAIToolbar?: () => void;
};

export const GmailStyleToolbar = ({ editor, isAIToolbarExpanded = false, onToggleAIToolbar }: GmailStyleToolbarProps) => {
  const t = useTranslations('common.editor');
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
      label: t('formatting.bold'),
      activeName: 'bold',
      shortcut: t('shortcuts.bold')
    },
    {
      command: 'toggleItalic',
      icon: ItalicIcon,
      label: t('formatting.italic'),
      activeName: 'italic',
      shortcut: t('shortcuts.italic')
    },
    {
      command: 'toggleUnderline',
      icon: () => <span className="font-bold underline text-sm">U</span>,
      label: t('formatting.underline'),
      activeName: 'underline',
      shortcut: t('shortcuts.underline')
    },
    {
      command: () => editor.chain().focus().toggleBulletList().run(),
      icon: ListBulletIcon,
      label: t('formatting.bulletList'),
      activeName: 'bulletList',
      shortcut: t('shortcuts.bulletList'),
      isActive: () => editor.isActive('bulletList')
    },
    {
      command: () => editor.chain().focus().toggleOrderedList().run(),
      icon: () => <span className="font-bold text-sm">1.</span>,
      label: t('formatting.orderedList'),
      activeName: 'orderedList',
      shortcut: t('shortcuts.orderedList'),
      isActive: () => editor.isActive('orderedList')
    },
    {
      command: 'toggleBlockquote',
      icon: ChatBubbleLeftRightIcon,
      label: t('formatting.quote'),
      activeName: 'blockquote',
      shortcut: t('shortcuts.quote')
    },
    {
      command: () => editor.chain().focus().toggleCTA().run(),
      icon: MegaphoneIcon,
      label: t('formatting.cta'),
      activeName: 'ctaText',
      shortcut: t('shortcuts.cta'),
      isActive: () => editor.isActive('ctaText')
    },
    {
      command: 'toggleHashtag',
      icon: () => <span className="font-bold">#</span>,
      label: t('formatting.hashtag'),
      activeName: 'hashtag',
      shortcut: t('shortcuts.hashtag')
    },
  ];

  const alignmentActions = [
    {
      command: () => (editor.chain().focus() as any).setTextAlign('left').run(),
      icon: Bars3BottomLeftIcon,
      label: t('alignment.left'),
      activeName: 'left',
      shortcut: t('shortcuts.alignLeft')
    },
    {
      command: () => (editor.chain().focus() as any).setTextAlign('center').run(),
      icon: Bars3Icon,
      label: t('alignment.center'),
      activeName: 'center',
      shortcut: t('shortcuts.alignCenter')
    },
    {
      command: () => (editor.chain().focus() as any).setTextAlign('right').run(),
      icon: Bars3BottomRightIcon,
      label: t('alignment.right'),
      activeName: 'right',
      shortcut: t('shortcuts.alignRight')
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
      { name: t('colors.black'), value: '#000000' },
      { name: t('colors.darkGray'), value: '#374151' },
      { name: t('colors.gray'), value: '#6B7280' },
      { name: t('colors.lightGray'), value: '#9CA3AF' },
    ],
    [
      { name: t('colors.primary'), value: '#005fab' },
      { name: t('colors.blue'), value: '#3B82F6' },
      { name: t('colors.indigo'), value: '#4F46E5' },
      { name: t('colors.purple'), value: '#7C3AED' },
    ],
    [
      { name: t('colors.red'), value: '#EF4444' },
      { name: t('colors.orange'), value: '#F97316' },
      { name: t('colors.yellow'), value: '#EAB308' },
      { name: t('colors.green'), value: '#10B981' },
    ],
  ];

  // Schriftgrößen wie in deinem Screenshot
  const fontSizes = [
    { name: t('fontSize.small'), value: '14px', class: 'text-sm' },
    { name: t('fontSize.normal'), value: '16px', class: 'text-base' },
    { name: t('fontSize.large'), value: '20px', class: 'text-lg' },
    { name: t('fontSize.huge'), value: '24px', class: 'text-xl' },
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
            title={t('link.insertTitle')}
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
              title={t('fontSize.label')}
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

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* KI-Assistent Toggle Button - Premium Feature */}
          {onToggleAIToolbar && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleAIToolbar();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded transition-all text-sm font-medium',
                {
                  'bg-[#005fab] text-white shadow-sm': isAIToolbarExpanded,
                  'hover:bg-gray-100 text-gray-700': !isAIToolbarExpanded,
                }
              )}
              title={isAIToolbarExpanded ? t('aiAssistant.hide') : t('aiAssistant.show')}
            >
              <SparklesIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('aiAssistant.label')}</span>
              <svg
                className={clsx(
                  'h-3 w-3 ml-0.5 transition-transform',
                  isAIToolbarExpanded && 'rotate-180'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Formatierung löschen */}
          <button
            type="button"
            onClick={handleClearFormatting}
            className="p-2 w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-gray-100 text-gray-700"
            title={t('formatting.clearFormatting')}
          >
            <DocumentIcon className="h-4 w-4" />
          </button>

          {/* Farben Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorDropdown(!showColorDropdown)}
              className="p-2 w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-gray-100 text-gray-700"
              title={t('colors.textColor')}
            >
              <div className="w-4 h-4 rounded border border-gray-300" style={{background: 'linear-gradient(45deg, #000 25%, #005fab 25%, #005fab 50%, #EF4444 50%, #EF4444 75%, #10B981 75%)'}} />
            </button>

            {showColorDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-sm z-10 p-2">
                <div className="text-xs font-medium text-gray-600 mb-2 px-1">{t('colors.textColor')}</div>
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
      </div>

      {/* Link Dialog (CeleroPress Design Pattern konform) */}
      <Dialog open={showLinkDialog} onClose={() => setShowLinkDialog(false)}>
        <DialogTitle>{t('link.dialogTitle')}</DialogTitle>
        <DialogBody>
          <Field>
            <Label>{t('link.urlLabel')}</Label>
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder={t('link.urlPlaceholder')}
              autoFocus
            />
          </Field>
        </DialogBody>
        <DialogActions>
          <Button
            className="bg-gray-50 hover:bg-gray-100 text-gray-900 border-0"
            onClick={() => setShowLinkDialog(false)}
          >
            {t('link.cancel')}
          </Button>
          {editor.isActive('link') && (
            <Button
              className="bg-gray-50 hover:bg-gray-100 text-gray-900 border-0"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setShowLinkDialog(false);
              }}
            >
              {t('link.remove')}
            </Button>
          )}
          <Button
            onClick={handleLinkSubmit}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            {linkUrl ? t('link.set') : t('link.remove')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};