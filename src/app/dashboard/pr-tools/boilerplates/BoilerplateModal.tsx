// src/app/dashboard/pr-tools/boilerplates/BoilerplateModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { companiesService } from "@/lib/firebase/crm-service";
import { Boilerplate } from "@/types/crm";
import { Company } from "@/types/crm";
import { RichTextEditor } from "@/components/RichTextEditor";
import { BuildingOfficeIcon, GlobeAltIcon, InformationCircleIcon } from "@heroicons/react/20/solid";
import { InfoTooltip } from "@/components/InfoTooltip";

interface BoilerplateModalProps {
  boilerplate: Boilerplate | null;
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

const CATEGORIES = [
  { value: 'company', label: 'Unternehmensbeschreibung' },
  { value: 'contact', label: 'Kontaktinformationen' },
  { value: 'legal', label: 'Rechtliche Hinweise' },
  { value: 'product', label: 'Produktbeschreibung' },
  { value: 'custom', label: 'Sonstige' }
];

const POSITIONS = [
  { value: 'top', label: 'Am Anfang' },
  { value: 'bottom', label: 'Am Ende' },
  { value: 'signature', label: 'Als Signatur' },
  { value: 'custom', label: 'Manuell einfügen' }
];

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message 
}: { 
  type?: 'info' | 'error';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700'
  };

  const Icon = InformationCircleIcon;

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

const BoilerplateModal = ({ boilerplate, onClose, onSave, userId }: BoilerplateModalProps) => {
  const [formData, setFormData] = useState<Partial<Boilerplate>>({
    name: '',
    category: 'custom',
    content: '',
    description: '',
    isGlobal: true,
    clientId: '',
    defaultPosition: 'custom'
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [tags, setTags] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (boilerplate) {
      setFormData(boilerplate);
      setTags(boilerplate.tags?.join(', ') || '');
    }
  }, [boilerplate]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const data = await companiesService.getAll(userId);
      setCompanies(data);
    } catch (error) {
      console.error("Fehler beim Laden der Kunden:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    const errors: string[] = [];
    if (!formData.name?.trim()) {
      errors.push('Name ist erforderlich');
    }
    if (!formData.content?.trim()) {
      errors.push('Inhalt ist erforderlich');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setLoading(true);
    
    try {
      // Tags verarbeiten
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Client Name hinzufügen wenn clientId gesetzt
      let clientName = '';
      if (!formData.isGlobal && formData.clientId) {
        const client = companies.find(c => c.id === formData.clientId);
        clientName = client?.name || '';
      }

      if (boilerplate?.id) {
        // Update
        const { id, ...updateData } = formData;
        await boilerplatesService.update(boilerplate.id, {
          ...updateData,
          tags: tagArray,
          clientName: clientName
        });
      } else {
        // Create
        const dataToSave = {
          name: formData.name!,
          content: formData.content!,
          category: formData.category as 'company' | 'contact' | 'legal' | 'product' | 'custom',
          description: formData.description || '',
          isGlobal: formData.isGlobal !== false,
          clientId: formData.isGlobal ? undefined : formData.clientId,
          clientName: clientName,
          defaultPosition: formData.defaultPosition as 'top' | 'bottom' | 'signature' | 'custom',
          tags: tagArray,
          userId: userId,
        };
        await boilerplatesService.create(dataToSave);
      }
      onSave();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      setValidationErrors(['Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="3xl">
      <form onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-lg font-semibold">
          {boilerplate ? 'Textbaustein bearbeiten' : 'Neuer Textbaustein'}
        </DialogTitle>
        
        <DialogBody className="p-6">
          {validationErrors.length > 0 && (
            <div className="mb-4">
              <Alert type="error" message={validationErrors[0]} />
            </div>
          )}

          <FieldGroup>
            {/* Basis-Informationen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="z.B. Über uns - Standard"
                />
              </Field>
              
              <Field>
                <Label>Kategorie *</Label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as 'company' | 'contact' | 'legal' | 'product' | 'custom' })}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Kunden-Zuordnung */}
            <div className="space-y-4 rounded-md border p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Verfügbarkeit</div>
                <Badge color={formData.isGlobal ? 'blue' : 'orange'}>
                  {formData.isGlobal ? (
                    <>
                      <GlobeAltIcon className="h-3 w-3 mr-1" />
                      Global
                    </>
                  ) : (
                    <>
                      <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                      Kundenspezifisch
                    </>
                  )}
                </Badge>
              </div>
              
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={formData.isGlobal !== false}
                  onChange={(checked) => setFormData({ 
                    ...formData, 
                    isGlobal: checked,
                    clientId: checked ? '' : formData.clientId 
                  })}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm">Für alle Kunden verfügbar</div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Wenn deaktiviert, ist dieser Textbaustein nur für einen spezifischen Kunden verfügbar.
                  </p>
                </div>
              </label>

              {!formData.isGlobal && (
                <Field>
                  <Label>Kunde auswählen *</Label>
                  <Select
                    value={formData.clientId || ''}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    required={!formData.isGlobal}
                    disabled={loadingCompanies}
                  >
                    <option value="">Kunde wählen...</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>

            {/* Beschreibung */}
            <Field>
              <Label>
                Beschreibung
                <InfoTooltip content="Kurze Beschreibung wann dieser Baustein verwendet wird" className="ml-1.5 inline-flex align-text-top" />
              </Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Kurze Beschreibung wann dieser Baustein verwendet wird..."
                rows={2}
              />
            </Field>

            {/* Tags */}
            <Field>
              <Label>
                Tags
                <InfoTooltip content="Kommagetrennte Schlagwörter für bessere Suche" className="ml-1.5 inline-flex align-text-top" />
              </Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="z.B. standard, startup, tech (kommagetrennt)"
              />
            </Field>

            {/* Position */}
            <Field>
              <Label>Standard-Position beim Einfügen</Label>
              <Select
                value={formData.defaultPosition || 'custom'}
                onChange={(e) => setFormData({ ...formData, defaultPosition: e.target.value as any })}
              >
                {POSITIONS.map(pos => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Inhalt */}
            <Field>
              <Label>Inhalt *</Label>
              <RichTextEditor
                content={formData.content || ''}
                onChange={(content) => setFormData({ ...formData, content })}
              />
            </Field>
          </FieldGroup>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose}>Abbrechen</Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default BoilerplateModal;