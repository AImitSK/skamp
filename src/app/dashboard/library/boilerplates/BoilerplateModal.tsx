// src/app/dashboard/pr-tools/boilerplates/BoilerplateModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { Boilerplate, BoilerplateCreateData } from "@/types/crm-enhanced";
import { toastService } from '@/lib/utils/toast';
import { useCreateBoilerplate, useUpdateBoilerplate } from "@/lib/hooks/useBoilerplatesData";
import { Dialog, DialogActions, DialogBody, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, Label, Description, Fieldset } from "@/components/ui/fieldset";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
// Vollständiger Editor mit allen Formatierungsoptionen (wie Strategiedokumente)
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  ListBulletIcon,
  QueueListIcon as ListOrderedIcon,
  CodeBracketIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon
} from '@heroicons/react/24/outline';
// FocusAreasInput entfernt - Tags werden nicht mehr benötigt
import { InfoTooltip } from "@/components/InfoTooltip";
import { SimpleSwitch } from "@/components/notifications/SimpleSwitch";
import type { LanguageCode } from "@/types/international";
import * as Flags from 'country-flag-icons/react/3x2';

// Flag Component
const FlagIcon = ({ countryCode, className = "h-3 w-5" }: { countryCode?: string; className?: string }) => {
  if (!countryCode) return null;
  // @ts-ignore - Dynamic import from flag library
  const Flag = Flags[countryCode.toUpperCase()];
  if (!Flag) return null;
  return <Flag className={className} title={countryCode} />;
};

// Kategorie Keys
const CATEGORY_OPTIONS = [
  { value: 'company' },
  { value: 'contact' },
  { value: 'legal' },
  { value: 'product' },
  { value: 'custom' }
];

interface BoilerplateModalProps {
  boilerplate: Boilerplate | null;
  onClose: () => void;
  onSave: () => void;
  organizationId: string;
  userId: string;
}

export default function BoilerplateModal({
  boilerplate,
  onClose,
  onSave,
  organizationId,
  userId
}: BoilerplateModalProps) {
  const t = useTranslations('boilerplates.modal');
  const tToast = useTranslations('boilerplates.toasts');
  const [companies, setCompanies] = useState<any[]>([]);

  // React Query Mutations
  const createBoilerplateMutation = useCreateBoilerplate();
  const updateBoilerplateMutation = useUpdateBoilerplate();

  // Vollständiger Tiptap Editor Setup (mit allen Formatierungsoptionen wie Strategiedokumente)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      })
    ],
    content: `<p>${t('contentPlaceholder')}</p>`,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[300px] px-4 py-3 text-gray-900 leading-relaxed'
      }
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setFormData(prev => ({ ...prev, content }));
    }
  });
  
  const [formData, setFormData] = useState<BoilerplateCreateData & { language?: LanguageCode }>({
    name: '',
    content: '',
    category: 'custom',
    description: '',
    isGlobal: true,
    clientId: undefined,
    clientName: undefined,
    language: 'de' as LanguageCode
  });

  useEffect(() => {
    loadCompanies();
  }, [organizationId]);

  useEffect(() => {
    if (boilerplate) {
      // Setze alle Felder aus dem Boilerplate
      const newFormData = {
        name: boilerplate.name,
        content: boilerplate.content,
        category: boilerplate.category,
        description: boilerplate.description || '',
        isGlobal: boilerplate.isGlobal,
        clientId: boilerplate.clientId,
        clientName: boilerplate.clientName,
        language: ((boilerplate as any).language || 'de') as LanguageCode
      };
      
      setFormData(newFormData);

      // Setze Editor Content
      if (editor) {
        editor.commands.setContent(boilerplate.content || `<p>${t('contentPlaceholder')}</p>`);
      }
    } else {
      // Reset für neuen Boilerplate
      setFormData({
        name: '',
        content: '',
        category: 'custom',
        description: '',
        isGlobal: true,
        clientId: undefined,
        clientName: undefined,
        language: 'de' as LanguageCode
      });

      // Reset Editor Content
      if (editor) {
        editor.commands.setContent(`<p>${t('contentPlaceholder')}</p>`);
      }
    }
  }, [boilerplate, editor, t]);

  const loadCompanies = async () => {
    if (!organizationId) return;

    try {
      const companiesData = await companiesEnhancedService.getAll(organizationId);
      setCompanies(companiesData);
    } catch (error) {
      setCompanies([]);
    }
  };

  const handleClientChange = (clientId: string) => {
    const company = companies.find(c => c.id === clientId);
    setFormData({
      ...formData,
      clientId: clientId || undefined,
      clientName: company?.name || undefined,
      isGlobal: !clientId
    });
  };

  const handleSubmit = async () => {
    const content = editor?.getHTML() || '';
    if (!formData.name.trim() || !content.trim()) {
      toastService.warning(t('validation.nameAndContentRequired'));
      return;
    }

    try {
      const boilerplateData: BoilerplateCreateData = {
        name: formData.name,
        content: content,
        category: formData.category,
        description: formData.description,
        isGlobal: formData.isGlobal,
        clientId: formData.clientId,
        clientName: formData.clientName
      };

      if (boilerplate && boilerplate.id) {
        // Update mit React Query Mutation
        await updateBoilerplateMutation.mutateAsync({
          id: boilerplate.id,
          organizationId,
          userId,
          boilerplateData
        });
        toastService.success(tToast('updated', { name: formData.name }));
      } else {
        // Create mit React Query Mutation
        await createBoilerplateMutation.mutateAsync({
          organizationId,
          userId,
          boilerplateData
        });
        toastService.success(tToast('created', { name: formData.name }));
      }

      onSave();
      onClose();
    } catch (error) {
      toastService.error(
        error instanceof Error
          ? tToast('saveError', { message: error.message })
          : tToast('saveErrorGeneric')
      );
    }
  };

  // Saving state aus Mutations
  const saving = createBoilerplateMutation.isPending || updateBoilerplateMutation.isPending;

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      className="sm:max-w-4xl"
    >
      <DialogTitle>
        {boilerplate ? t('editTitle') : t('createTitle')}
      </DialogTitle>
      
      <DialogBody>
        <Fieldset className="space-y-6">
          {/* Name und Kategorie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <Label>{t('fields.name')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('fields.namePlaceholder')}
              />
            </Field>

            <Field>
              <Label>{t('fields.category')}</Label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {t(`categories.${option.value}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Inhalt */}
          <Field>
            <Label>{t('fields.content')}</Label>
            <div className="mt-2">
              {/* Vollständige Editor-Toolbar (wie Strategiedokumente) */}
              {editor && (
                <div className="border border-gray-300 rounded-t-md p-2 bg-gray-50 flex flex-wrap items-center gap-1">
                  {/* Text-Formatierung */}
                  <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                      className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : ''}`}
                      title={t('toolbar.bold')}
                    >
                      <BoldIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
                      className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : ''}`}
                      title={t('toolbar.italic')}
                    >
                      <ItalicIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
                      className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('underline') ? 'bg-gray-200 text-blue-600' : ''}`}
                      title={t('toolbar.underline')}
                    >
                      <UnderlineIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
                      className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('strike') ? 'bg-gray-200 text-blue-600' : ''}`}
                      title={t('toolbar.strikethrough')}
                    >
                      <StrikethroughIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Überschriften */}
                  <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                    <select
                      onChange={(e) => {
                        const level = parseInt(e.target.value);
                        if (level === 0) {
                          editor.chain().focus().setParagraph().run();
                        } else {
                          editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
                        }
                      }}
                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-50 transition-colors"
                      value={
                        editor.isActive('heading', { level: 1 }) ? 1 :
                        editor.isActive('heading', { level: 2 }) ? 2 :
                        editor.isActive('heading', { level: 3 }) ? 3 : 0
                      }
                    >
                      <option value={0}>{t('toolbar.normal')}</option>
                      <option value={1}>{t('toolbar.heading1')}</option>
                      <option value={2}>{t('toolbar.heading2')}</option>
                      <option value={3}>{t('toolbar.heading3')}</option>
                    </select>
                  </div>

                  {/* Listen */}
                  <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
                      className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : ''}`}
                      title={t('toolbar.bulletList')}
                    >
                      <ListBulletIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
                      className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : ''}`}
                      title={t('toolbar.orderedList')}
                    >
                      <ListOrderedIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Code */}
                  <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}
                      className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('codeBlock') ? 'bg-gray-200 text-blue-600' : ''}`}
                      title={t('toolbar.codeBlock')}
                    >
                      <CodeBracketIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Undo/Redo */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().undo().run(); }}
                      disabled={!editor.can().undo()}
                      className={`p-2 rounded hover:bg-gray-200 transition-colors ${!editor.can().undo() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={t('toolbar.undo')}
                    >
                      <ArrowUturnLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().redo().run(); }}
                      disabled={!editor.can().redo()}
                      className={`p-2 rounded hover:bg-gray-200 transition-colors ${!editor.can().redo() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={t('toolbar.redo')}
                    >
                      <ArrowUturnRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              {/* Editor mit Custom CSS für Heading-Styling */}
              <div className="border border-gray-300 border-t-0 rounded-b-md bg-white">
                <EditorContent editor={editor} />
                <style jsx>{`
                  :global(.ProseMirror) {
                    font-size: 16px !important;
                    line-height: 1.7 !important;
                    color: #111827 !important;
                  }
                  :global(.ProseMirror p) {
                    margin-bottom: 1.2em !important;
                    color: #111827 !important;
                  }
                  :global(.ProseMirror h1) {
                    font-size: 2em !important;
                    font-weight: 700 !important;
                    color: #111827 !important;
                    margin-top: 1.5em !important;
                    margin-bottom: 0.75em !important;
                    line-height: 1.2 !important;
                  }
                  :global(.ProseMirror h2) {
                    font-size: 1.5em !important;
                    font-weight: 600 !important;
                    color: #111827 !important;
                    margin-top: 1.25em !important;
                    margin-bottom: 0.5em !important;
                    line-height: 1.3 !important;
                  }
                  :global(.ProseMirror h3) {
                    font-size: 1.25em !important;
                    font-weight: 600 !important;
                    color: #374151 !important;
                    margin-top: 1em !important;
                    margin-bottom: 0.5em !important;
                    line-height: 1.4 !important;
                  }
                  :global(.ProseMirror ul) {
                    color: #111827 !important;
                    padding-left: 1.5em !important;
                    margin-top: 0.75em !important;
                    margin-bottom: 0.75em !important;
                    list-style-type: disc !important;
                  }
                  :global(.ProseMirror ol) {
                    color: #111827 !important;
                    padding-left: 1.5em !important;
                    margin-top: 0.75em !important;
                    margin-bottom: 0.75em !important;
                    list-style-type: decimal !important;
                  }
                  :global(.ProseMirror ul li),
                  :global(.ProseMirror ol li) {
                    color: #111827 !important;
                    margin-bottom: 0.5em !important;
                  }
                  :global(.ProseMirror code) {
                    background-color: #f3f4f6 !important;
                    padding: 0.2em 0.4em !important;
                    border-radius: 0.25em !important;
                    font-size: 0.9em !important;
                  }
                  :global(.ProseMirror pre) {
                    background-color: #1f2937 !important;
                    color: #f3f4f6 !important;
                    padding: 1em !important;
                    border-radius: 0.5em !important;
                    margin-top: 1em !important;
                    margin-bottom: 1em !important;
                  }
                  :global(.ProseMirror pre code) {
                    background-color: transparent !important;
                    padding: 0 !important;
                    color: #f3f4f6 !important;
                  }
                `}</style>
              </div>
            </div>
            <Description className="mt-2">
              {t('fields.contentDescription')}
            </Description>
          </Field>

          {/* Kunde und Sichtbarkeit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <Label className="flex items-center gap-2">
                {t('fields.client')}
                <InfoTooltip content={t('fields.clientTooltip')} />
              </Label>
              <Select
                value={formData.clientId || ''}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="">{t('fields.clientGlobal')}</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
              <Description className="mt-2">
                {formData.isGlobal ? (
                  <Badge color="blue">{t('scope.globalVisible')}</Badge>
                ) : (
                  <Badge color="green">{t('scope.clientSpecific')}</Badge>
                )}
              </Description>
            </Field>

            <Field>
              <Label>{t('fields.language')}</Label>
              <div className="relative" data-slot="control">
                {formData.language && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                    <FlagIcon
                      countryCode={formData.language === 'en' ? 'GB' : formData.language.toUpperCase()}
                      className="h-3 w-5"
                    />
                  </div>
                )}
                <Select
                  value={formData.language || 'de'}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as LanguageCode })}
                  className={formData.language ? 'pl-11' : ''}
                >
                  <option value="">{t('fields.languageSelect')}</option>
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="it">Italiano</option>
                  <option value="pt">Português</option>
                  <option value="nl">Nederlands</option>
                  <option value="pl">Polski</option>
                  <option value="ru">Русский</option>
                  <option value="ja">日本語</option>
                </Select>
              </div>
            </Field>
          </div>

          {/* Beschreibung */}
          <Field>
            <Label>{t('fields.description')}</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('fields.descriptionPlaceholder')}
            />
          </Field>

          {/* Tags entfernt - werden nicht mehr benötigt */}
        </Fieldset>
      </DialogBody>
      
      <DialogActions>
        <Button plain onClick={onClose}>
          {t('actions.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-[#005fab] hover:bg-[#004a8c] text-white"
        >
          {saving ? t('actions.saving') : t('actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}