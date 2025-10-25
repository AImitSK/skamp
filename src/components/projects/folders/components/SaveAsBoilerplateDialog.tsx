'use client';

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field, Label } from '@/components/ui/fieldset';
import { BookmarkIcon } from '@heroicons/react/24/outline';

interface SaveAsBoilerplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BoilerplateFormData) => Promise<void>;
  documentName: string;
  documentContent: string;
}

interface BoilerplateFormData {
  name: string;
  description: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  isGlobal: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'company', label: 'Unternehmensbeschreibung' },
  { value: 'contact', label: 'Kontaktinformationen' },
  { value: 'legal', label: 'Rechtliche Hinweise' },
  { value: 'product', label: 'Produktbeschreibung' },
  { value: 'custom', label: 'Sonstige' }
];

export default function SaveAsBoilerplateDialog({
  isOpen,
  onClose,
  onSave,
  documentName,
  documentContent
}: SaveAsBoilerplateDialogProps) {
  const [name, setName] = useState(documentName.replace('.celero-doc', ''));
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'company' | 'contact' | 'legal' | 'product' | 'custom'>('custom');
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Bitte geben Sie einen Namen ein');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category,
        isGlobal
      });
      handleClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName(documentName.replace('.celero-doc', ''));
    setDescription('');
    setCategory('custom');
    setIsGlobal(false);
    onClose();
  };

  // Vorschau des Inhalts (erste 150 Zeichen, HTML entfernt)
  const contentPreview = documentContent.replace(/<[^>]*>/g, '').substring(0, 150);

  return (
    <Dialog open={isOpen} onClose={handleClose} size="2xl">
      <DialogTitle>Als Boilerplate speichern</DialogTitle>

      <DialogBody className="space-y-4">
        {/* Vorschau */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <BookmarkIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1">
                Dokument-Inhalt
              </p>
              <p className="text-xs text-gray-600 line-clamp-3">
                {contentPreview}...
              </p>
            </div>
          </div>
        </div>

        {/* Name */}
        <Field>
          <Label>Name *</Label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Unternehmensprofil Standard"
            required
          />
        </Field>

        {/* Beschreibung - KEIN Textarea, nur Input */}
        <Field>
          <Label>Beschreibung (optional)</Label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung des Textbausteins..."
          />
        </Field>

        {/* Kategorie */}
        <Field>
          <Label>Kategorie *</Label>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
          >
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>

        {/* Scope */}
        <Field>
          <Label>Verfügbarkeit</Label>
          <Select
            value={isGlobal ? 'global' : 'project'}
            onChange={(e) => setIsGlobal(e.target.value === 'global')}
          >
            <option value="project">Nur für dieses Projekt</option>
            <option value="global">Für alle Projekte (Global)</option>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Globale Boilerplates sind in allen Projekten verfügbar
          </p>
        </Field>
      </DialogBody>

      <DialogActions>
        <Button variant="outline" onClick={handleClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Speichert...' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
