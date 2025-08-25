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
import { GmailStyleEditor } from "@/components/GmailStyleEditor";
import { FocusAreasInput } from "@/components/FocusAreasInput";
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
  const [richTextContent, setRichTextContent] = useState('');
  
  const [formData, setFormData] = useState<BoilerplateCreateData & { language?: LanguageCode }>({
    name: '',
    content: '',
    category: 'custom',
    description: '',
    isGlobal: true,
    clientId: undefined,
    clientName: undefined,
    tags: [],
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
        tags: boilerplate.tags || [],
        language: ((boilerplate as any).language || 'de') as LanguageCode
      };
      
      setFormData(newFormData);
      
      // WICHTIG: Setze den Rich Text Content mit einem kleinen Delay
      // damit der Editor Zeit hat sich zu initialisieren
      setTimeout(() => {
        setRichTextContent(boilerplate.content);
      }, 100);
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
        tags: [],
        language: 'de' as LanguageCode
      });
      setRichTextContent('');
    }
  }, [boilerplate]);

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
    if (!formData.name.trim() || !richTextContent.trim()) {
      alert('Bitte füllen Sie Name und Inhalt aus.');
      return;
    }

    setSaving(true);
    
    try {
      const boilerplateData: BoilerplateCreateData = {
        name: formData.name,
        content: richTextContent,
        category: formData.category,
        description: formData.description,
        isGlobal: formData.isGlobal,
        clientId: formData.clientId,
        clientName: formData.clientName,
        tags: formData.tags || []
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
            <div className="border rounded-lg mt-2">
              <GmailStyleEditor
                content={richTextContent}
                onChange={(newContent) => {
                  setRichTextContent(newContent);
                }}
                placeholder="Geben Sie hier Ihren Textbaustein ein..."
                className="min-h-[200px]"
              />
            </div>
            <Description className="mt-2">
              Formatieren Sie Ihren Text mit der Toolbar.
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

          {/* Tags */}
          <Field>
            <Label>Tags (optional)</Label>
            <FocusAreasInput
              value={formData.tags || []}
              onChange={(tags) => setFormData({ ...formData, tags })}
              placeholder="Tags hinzufügen..."
            />
            <Description className="mt-2">
              Fügen Sie Tags zur besseren Organisation hinzu
            </Description>
          </Field>
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