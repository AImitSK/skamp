// src/app/dashboard/pr-tools/boilerplates/BoilerplateModal.tsx
"use client";

import { useState, useEffect } from "react";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { Boilerplate, BoilerplateCreateData } from "@/types/crm-enhanced";
import { Dialog, DialogActions, DialogBody, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, Label, Description, Fieldset } from "@/components/ui/fieldset";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/ui/language-selector";
// Einfacher Editor ohne KI-Toolbar - ersetzt GmailStyleEditor
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  QueueListIcon as ListOrderedIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
// FocusAreasInput entfernt - Tags werden nicht mehr benötigt
import { InfoTooltip } from "@/components/InfoTooltip";
import { SimpleSwitch } from "@/components/notifications/SimpleSwitch";
import type { LanguageCode } from "@/types/international";

// Kategorie-Optionen
const CATEGORY_OPTIONS = [
  { value: 'company', label: 'Unternehmensbeschreibung' },
  { value: 'contact', label: 'Kontaktinformationen' },
  { value: 'legal', label: 'Rechtliche Hinweise' },
  { value: 'product', label: 'Produktbeschreibung' },
  { value: 'custom', label: 'Sonstige' }
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
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);

  // Einfacher Tiptap Editor Setup (ohne KI-Toolbar)
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
      })
    ],
    content: '<p>Geben Sie hier Ihren Textbaustein ein...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-3 py-2 text-gray-900 leading-relaxed border rounded-md border-gray-300'
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
        editor.commands.setContent(boilerplate.content || '<p>Geben Sie hier Ihren Textbaustein ein...</p>');
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
        editor.commands.setContent('<p>Geben Sie hier Ihren Textbaustein ein...</p>');
      }
    }
  }, [boilerplate, editor]);

  const loadCompanies = async () => {
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
      alert('Bitte füllen Sie Name und Inhalt aus.');
      return;
    }

    setSaving(true);

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
        await boilerplatesService.update(
          boilerplate.id,
          boilerplateData,
          { organizationId, userId }
        );
      } else {
        await boilerplatesService.create(
          boilerplateData,
          { organizationId, userId }
        );
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      className="sm:max-w-4xl"
    >
      <DialogTitle>
        {boilerplate ? 'Textbaustein bearbeiten' : 'Neuer Textbaustein'}
      </DialogTitle>
      
      <DialogBody>
        <Fieldset className="space-y-6">
          {/* Name und Kategorie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Unternehmensprofil kurz"
              />
            </Field>
            
            <Field>
              <Label>Kategorie</Label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Inhalt */}
          <Field>
            <Label>Inhalt</Label>
            <div className="mt-2">
              {/* Einfache Editor-Toolbar */}
              {editor && (
                <div className="border border-gray-300 rounded-t-md p-2 bg-gray-50 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
                    title="Fett"
                  >
                    <BoldIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
                    title="Kursiv"
                  >
                    <ItalicIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
                    title="Unterstrichen"
                  >
                    <UnderlineIcon className="h-4 w-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
                    title="Aufzählung"
                  >
                    <ListBulletIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
                    title="Nummerierte Liste"
                  >
                    <ListOrderedIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
              {/* Editor */}
              <EditorContent editor={editor} />
            </div>
            <Description className="mt-2">
              Einfacher Texteditor ohne KI-Funktionen - perfekt für Textbausteine.
            </Description>
          </Field>

          {/* Kunde und Sichtbarkeit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <Label className="flex items-center gap-2">
                Kunde
                <InfoTooltip content="Wählen Sie einen Kunden aus, um den Textbaustein nur für diesen sichtbar zu machen." />
              </Label>
              <Select
                value={formData.clientId || ''}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="">Global (für alle Kunden)</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
              <Description className="mt-2">
                {formData.isGlobal ? (
                  <Badge color="blue">Global sichtbar</Badge>
                ) : (
                  <Badge color="green">Kundenspezifisch</Badge>
                )}
              </Description>
            </Field>

            <Field>
              <Label>Sprache</Label>
              <LanguageSelector
                value={formData.language || 'de'}
                onChange={(lang) => setFormData({ ...formData, language: lang as LanguageCode })}
              />
              <Description className="mt-2">
                Sprache des Textbausteins für mehrsprachige Unterstützung
              </Description>
            </Field>
          </div>

          {/* Beschreibung */}
          <Field>
            <Label>Beschreibung (optional)</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Kurze Beschreibung des Verwendungszwecks..."
            />
          </Field>

          {/* Tags entfernt - werden nicht mehr benötigt */}
        </Fieldset>
      </DialogBody>
      
      <DialogActions>
        <Button plain onClick={onClose}>
          Abbrechen
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={saving}
          className="bg-[#005fab] hover:bg-[#004a8c] text-white"
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}