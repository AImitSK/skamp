// src/app/dashboard/pr-tools/boilerplates/BoilerplateModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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
import { RichTextEditor } from "@/components/RichTextEditor";
import { FocusAreasInput } from "@/components/FocusAreasInput";
import { InfoTooltip } from "@/components/InfoTooltip";
import { SimpleSwitch } from "@/components/notifications/SimpleSwitch";
import type { LanguageCode } from "@/types/international";
import { 
  ClipboardDocumentIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

// Kategorie-Optionen
const CATEGORY_OPTIONS = [
  { value: 'company', label: 'Unternehmensbeschreibung' },
  { value: 'contact', label: 'Kontaktinformationen' },
  { value: 'legal', label: 'Rechtliche Hinweise' },
  { value: 'product', label: 'Produktbeschreibung' },
  { value: 'custom', label: 'Sonstige' }
];

// Boilerplate-spezifische Variablen
const BOILERPLATE_VARIABLES = [
  {
    key: '{{company_name}}',
    label: 'Firmenname',
    description: 'Der Name des Unternehmens',
    example: 'CeleroPress GmbH',
    category: 'company' as const,
    isRequired: false
  },
  {
    key: '{{contact_name}}',
    label: 'Kontaktname',
    description: 'Vollständiger Name des Kontakts',
    example: 'Max Mustermann',
    category: 'contact' as const,
    isRequired: false
  },
  {
    key: '{{contact_firstname}}',
    label: 'Vorname',
    description: 'Vorname des Kontakts',
    example: 'Max',
    category: 'contact' as const,
    isRequired: false
  },
  {
    key: '{{contact_lastname}}',
    label: 'Nachname',
    description: 'Nachname des Kontakts',
    example: 'Mustermann',
    category: 'contact' as const,
    isRequired: false
  },
  {
    key: '{{contact_position}}',
    label: 'Position',
    description: 'Position/Titel des Kontakts',
    example: 'Geschäftsführer',
    category: 'contact' as const,
    isRequired: false
  },
  {
    key: '{{current_date}}',
    label: 'Aktuelles Datum',
    description: 'Das heutige Datum',
    example: '25. Juli 2025',
    category: 'system' as const,
    isRequired: false
  },
  {
    key: '{{current_year}}',
    label: 'Aktuelles Jahr',
    description: 'Das aktuelle Jahr',
    example: '2025',
    category: 'system' as const,
    isRequired: false
  }
];

// Custom Variables Modal Component
function VariablesModal({
  isOpen,
  onClose,
  onInsert
}: {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (variable: string) => void;
}) {
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const handleCopyVariable = async (variable: string) => {
    try {
      await navigator.clipboard.writeText(variable);
      setCopiedVar(variable);
      setTimeout(() => setCopiedVar(null), 2000);
      
      // Auch direkt einfügen
      onInsert(variable);
      onClose();
    } catch (err) {
      // Fallback: Direkt einfügen
      onInsert(variable);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>Variablen einfügen</DialogTitle>
      <DialogBody>
        <div className="space-y-4">
          <Text className="text-sm text-gray-600">
            Klicken Sie auf eine Variable, um sie in den Text einzufügen.
          </Text>
          
          <div className="grid gap-3">
            {BOILERPLATE_VARIABLES.map((variable) => (
              <button
                key={variable.key}
                onClick={() => handleCopyVariable(variable.key)}
                className="flex items-start gap-3 p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-blue-600">{variable.key}</code>
                    {copiedVar === variable.key && (
                      <Badge color="green" className="text-xs">
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Kopiert
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">{variable.label}</p>
                  <p className="text-xs text-gray-500">{variable.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Beispiel: {variable.example}</p>
                </div>
                <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose}>
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
}

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
  const [showVariablesModal, setShowVariablesModal] = useState(false);
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

  const handleVariableInsert = (variable: string) => {
    // Füge die Variable am Ende des Texts hinzu
    // Da RichTextEditor kein ref unterstützt, fügen wir es am Ende ein
    setRichTextContent(prev => prev + ' ' + variable);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !richTextContent.trim()) {
      alert('Bitte füllen Sie Name und Inhalt aus.');
      return;
    }

    setSaving(true);
    
    try {
      const context = { organizationId, userId };
      const dataToSave: any = {
        ...formData,
        content: richTextContent
      };
      
      // Entferne language wenn es nicht unterstützt wird
      if (!('language' in formData)) {
        delete dataToSave.language;
      }
      
      if (boilerplate?.id) {
        await boilerplatesService.update(boilerplate.id, dataToSave, context);
      } else {
        await boilerplatesService.create(dataToSave, context);
      }
      
      onSave();
    } catch (error) {
      alert(`Fehler beim Speichern des Textbausteins: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <Field>
                <Label>
                  Sprache *
                  <InfoTooltip 
                    content="Wählen Sie die Sprache des Textbausteins. Dies hilft bei der Organisation und Filterung."
                    className="ml-1 inline-block"
                  />
                </Label>
                <LanguageSelector
                  value={formData.language || 'de'}
                  onChange={(lang) => setFormData({ ...formData, language: lang || 'de' })}
                  placeholder="Sprache wählen..."
                  showNative={false}
                />
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

            {/* Rich Text Editor */}
            <Field>
              <div className="flex items-center justify-between mb-2">
                <Label>Inhalt *</Label>
                <Button
                  type="button"
                  plain
                  onClick={() => setShowVariablesModal(true)}
                  className="text-sm"
                >
                  Variablen einfügen
                </Button>
              </div>
              <RichTextEditor
                content={richTextContent}
                onChange={setRichTextContent}
                key={`editor-${boilerplate?.id || 'new'}-${richTextContent.length}`} // Force re-render when content changes
              />
              <Description className="mt-2">
                Formatieren Sie Ihren Text mit der Toolbar. Nutzen Sie Variablen für dynamische Inhalte.
              </Description>
            </Field>

            {/* Kunde und Sichtbarkeit */}
            <Fieldset>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-1">
                    <Label>Global verfügbar</Label>
                    <Description>
                      Textbaustein ist für alle Kunden verfügbar
                    </Description>
                  </div>
                  <div className="ml-4">
                    <SimpleSwitch
                      checked={formData.isGlobal ?? true}
                      onChange={(checked) => {
                        setFormData({ 
                          ...formData, 
                          isGlobal: checked,
                          clientId: checked ? undefined : formData.clientId,
                          clientName: checked ? undefined : formData.clientName
                        });
                      }}
                    />
                  </div>
                </div>

                {!formData.isGlobal && (
                  <Field>
                    <Label>Kunde</Label>
                    <Select
                      value={formData.clientId || ''}
                      onChange={(e) => handleClientChange(e.target.value)}
                    >
                      <option value="">Bitte wählen...</option>
                      {companies.length === 0 ? (
                        <option value="" disabled>Keine Kunden gefunden</option>
                      ) : (
                        companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name || company.officialName || 'Unbenannt'}
                          </option>
                        ))
                      )}
                    </Select>
                    <Description>
                      Dieser Textbaustein ist nur für den ausgewählten Kunden sichtbar
                    </Description>
                  </Field>
                )}
              </div>
            </Fieldset>

            {/* Tags */}
            <Field>
              <Label>
                Tags
                <InfoTooltip 
                  content="Fügen Sie Tags hinzu, um Textbausteine besser zu organisieren und zu finden."
                  className="ml-1 inline-block"
                />
              </Label>
              <FocusAreasInput
                value={formData.tags || []}
                onChange={(tags) => setFormData({ ...formData, tags })}
                placeholder="Tag hinzufügen..."
                suggestions={[
                  'Newsletter', 'Pressemitteilung', 'Social Media', 'E-Mail',
                  'Webseite', 'Blog', 'Produktbeschreibung', 'FAQ',
                  'Allgemeine Geschäftsbedingungen', 'Datenschutz',
                  'Impressum', 'Über uns', 'Kontakt', 'Service'
                ]}
              />
            </Field>
          </div>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={saving} 
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Variables Modal */}
      <VariablesModal
        isOpen={showVariablesModal}
        onClose={() => setShowVariablesModal(false)}
        onInsert={handleVariableInsert}
      />
    </>
  );
}