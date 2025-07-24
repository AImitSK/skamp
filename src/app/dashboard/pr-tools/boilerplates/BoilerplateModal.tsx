// src/app/dashboard/pr-tools/boilerplates/BoilerplateModal.tsx
"use client";

import { useState, useEffect } from "react";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { companiesService } from "@/lib/firebase/crm-service";
import { Boilerplate, BoilerplateCreateData } from "@/types/crm-enhanced";
import { Dialog, DialogActions, DialogBody, DialogTitle } from "@/components/dialog";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Switch } from "@/components/switch";
import { Field, Label, Description, Fieldset } from "@/components/fieldset";
import { Text } from "@/components/text";
import { Badge } from "@/components/badge";

// Kategorie-Optionen
const CATEGORY_OPTIONS = [
  { value: 'company', label: 'Unternehmensbeschreibung' },
  { value: 'contact', label: 'Kontaktinformationen' },
  { value: 'legal', label: 'Rechtliche Hinweise' },
  { value: 'product', label: 'Produktbeschreibung' },
  { value: 'custom', label: 'Sonstige' }
];

// Positions-Optionen
const POSITION_OPTIONS = [
  { value: 'top', label: 'Am Anfang des Textes' },
  { value: 'bottom', label: 'Am Ende des Textes' },
  { value: 'signature', label: 'Als E-Mail-Signatur' },
  { value: 'custom', label: 'Manuelle Platzierung' }
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
  const [tagInput, setTagInput] = useState('');
  
  const [formData, setFormData] = useState<BoilerplateCreateData>({
    name: '',
    content: '',
    category: 'custom',
    description: '',
    isGlobal: true,
    clientId: undefined,
    clientName: undefined,
    tags: [],
    defaultPosition: 'custom',
    sortOrder: 999
  });

  useEffect(() => {
    loadCompanies();
    
    if (boilerplate) {
      setFormData({
        name: boilerplate.name,
        content: boilerplate.content,
        category: boilerplate.category,
        description: boilerplate.description || '',
        isGlobal: boilerplate.isGlobal,
        clientId: boilerplate.clientId,
        clientName: boilerplate.clientName,
        tags: boilerplate.tags || [],
        defaultPosition: boilerplate.defaultPosition || 'custom',
        sortOrder: boilerplate.sortOrder || 999
      });
    }
  }, [boilerplate]);

  const loadCompanies = async () => {
    try {
      const companiesData = await companiesService.getAll(organizationId);
      setCompanies(companiesData);
    } catch (error) {
      console.warn("Companies konnten nicht geladen werden:", error);
      // Setze leeres Array, damit die App weiter funktioniert
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

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || []
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      alert('Bitte füllen Sie Name und Inhalt aus.');
      return;
    }

    setSaving(true);
    
    try {
      const context = { organizationId, userId };
      
      if (boilerplate?.id) {
        // Update
        await boilerplatesService.update(boilerplate.id, formData, context);
      } else {
        // Create
        await boilerplatesService.create(formData, context);
      }
      
      onSave();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert('Fehler beim Speichern des Textbausteins');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="5xl">
      <div className="px-6 py-4 border-b">
        <DialogTitle>
          {boilerplate ? 'Textbaustein bearbeiten' : 'Neuer Textbaustein'}
        </DialogTitle>
        <Text className="mt-1 text-sm text-gray-600">
          Erstellen Sie wiederverwendbare Textbausteine für Ihre Kommunikation
        </Text>
      </div>

      <DialogBody className="p-6">
        <div className="space-y-6">
          {/* Name und Kategorie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <Label>Name *</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Standardbeschreibung Unternehmen"
                required
              />
            </Field>

            <Field>
              <Label>Kategorie *</Label>
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

          {/* Beschreibung */}
          <Field>
            <Label>Beschreibung</Label>
            <Input
              type="text"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Kurze Beschreibung des Inhalts"
            />
          </Field>

          {/* Inhalt */}
          <Field>
            <Label>Inhalt *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Geben Sie hier den Text ein..."
              rows={10}
              required
            />
            <Description>
              Sie können Platzhalter wie {`{{company_name}}`}, {`{{contact_name}}`} verwenden
            </Description>
          </Field>

          {/* Kunde und Sichtbarkeit */}
          <Fieldset>
            <div className="space-y-4">
              <Field className="flex items-center justify-between">
                <div>
                  <Label>Global verfügbar</Label>
                  <Description>
                    Für alle Kunden sichtbar
                  </Description>
                </div>
                <Switch
                  checked={formData.isGlobal !== false}
                  onChange={(checked) => setFormData({ 
                    ...formData, 
                    isGlobal: checked,
                    clientId: checked ? undefined : formData.clientId,
                    clientName: checked ? undefined : formData.clientName
                  })}
                />
              </Field>

              {!formData.isGlobal && (
                <Field>
                  <Label>Kunde</Label>
                  <Select
                    value={formData.clientId || ''}
                    onChange={(e) => handleClientChange(e.target.value)}
                  >
                    <option value="">Bitte wählen...</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </Fieldset>

          {/* Position */}
          <Field>
            <Label>Standard-Position</Label>
            <Select
              value={formData.defaultPosition || 'custom'}
              onChange={(e) => setFormData({ ...formData, defaultPosition: e.target.value as any })}
            >
              {POSITION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* Tags */}
          <Field>
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Tag hinzufügen..."
                  className="flex-1"
                />
                <Button type="button" plain onClick={handleAddTag}>
                  Hinzufügen
                </Button>
              </div>
              
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      color="zinc"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {/* Sortierung */}
          <Field>
            <Label>Sortierreihenfolge</Label>
            <Input
              type="number"
              value={formData.sortOrder || 999}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 999 })}
              min="0"
              step="10"
            />
            <Description>
              Niedrigere Zahlen erscheinen weiter oben
            </Description>
          </Field>
        </div>
      </DialogBody>

      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-[#005fab] hover:bg-[#004a8c] text-white">
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}