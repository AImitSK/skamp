// src/app/dashboard/listen/ListModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Radio, RadioGroup, RadioField } from "@/components/radio";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { contactsService, companiesService, tagsService } from "@/lib/firebase/crm-service";
import { listsService } from "@/lib/firebase/lists-service";
import { DistributionList, ListFilters, LIST_TEMPLATES } from "@/types/lists";
import { Contact, Company, Tag, CompanyType } from "@/types/crm";
import { Description } from "@/components/fieldset";
import clsx from "clsx";

interface ListModalProps {
  list?: DistributionList;
  onClose: () => void;
  onSave: (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  userId: string;
}

export default function ListModal({ list, onClose, onSave, userId }: ListModalProps) {
  const [formData, setFormData] = useState<Partial<DistributionList>>({
    name: '',
    description: '',
    type: 'dynamic',
    category: 'custom',
    color: 'blue',
    filters: {},
    contactIds: []
  });

  const [loading, setLoading] = useState(false);
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Verfügbare Optionen für Filter
  const [tags, setTags] = useState<Tag[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);

  // Template-Modus
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    if (list) {
      setFormData({
        ...list,
        filters: list.filters || {},
        contactIds: list.contactIds || []
      });
    }
    loadFilterOptions();
  }, [list]);

  useEffect(() => {
    if (formData.type === 'dynamic' && formData.filters && userId) {
      updatePreview();
    } else if (formData.type === 'static' && formData.contactIds) {
      updateStaticPreview();
    }
  }, [formData.filters, formData.contactIds, formData.type]);

  const loadFilterOptions = async () => {
    try {
      const [tagsData, companiesData, contactsData] = await Promise.all([
        tagsService.getAll(userId),
        companiesService.getAll(userId),
        contactsService.getAll(userId)
      ]);

      setTags(tagsData);
      setCompanies(companiesData);

      // Verfügbare Industrien extrahieren (mit korrekter Type Guard)
      const industries = Array.from(new Set(
        companiesData.map(c => c.industry).filter((industry): industry is string => Boolean(industry))
      )).sort();
      setAvailableIndustries(industries);

      // Verfügbare Positionen extrahieren (mit korrekter Type Guard)
      const positions = Array.from(new Set(
        contactsData.map(c => c.position).filter((position): position is string => Boolean(position))
      )).sort();
      setAvailablePositions(positions);

      // Verfügbare Länder extrahieren (mit korrekter Type Guard)
      const countries = Array.from(new Set(
        companiesData.map(c => c.address?.country).filter((country): country is string => Boolean(country))
      )).sort();
      setAvailableCountries(countries);

    } catch (error) {
      console.error("Fehler beim Laden der Filter-Optionen:", error);
    }
  };

  const updatePreview = async () => {
    if (!formData.filters || !userId) return;
    
    setLoadingPreview(true);
    try {
      const contacts = await listsService.getContactsByFilters(formData.filters, userId);
      setPreviewContacts(contacts.slice(0, 10)); // Erste 10 für Vorschau
      setPreviewCount(contacts.length);
    } catch (error) {
      console.error("Fehler bei der Vorschau:", error);
      setPreviewContacts([]);
      setPreviewCount(0);
    } finally {
      setLoadingPreview(false);
    }
  };

  const updateStaticPreview = async () => {
    if (!formData.contactIds || formData.contactIds.length === 0) {
      setPreviewContacts([]);
      setPreviewCount(0);
      return;
    }

    setLoadingPreview(true);
    try {
      const contacts = await listsService.getContactsByIds(formData.contactIds);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      console.error("Fehler bei der Vorschau:", error);
      setPreviewContacts([]);
      setPreviewCount(0);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = LIST_TEMPLATES.find(t => t.name === templateId);
    if (template) {
      setFormData({
        ...formData,
        name: template.name,
        description: template.description,
        category: template.category,
        color: template.color,
        type: 'dynamic',
        filters: { ...template.filters }
      });
      setSelectedTemplate(templateId);
    }
  };

  const handleFilterChange = (filterKey: keyof ListFilters, value: any) => {
    setFormData({
      ...formData,
      filters: {
        ...formData.filters,
        [filterKey]: value
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        userId,
        filters: formData.type === 'dynamic' ? formData.filters : undefined,
        contactIds: formData.type === 'static' ? formData.contactIds : undefined
      } as Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>;

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern der Liste:", error);
      alert("Fehler beim Speichern der Liste");
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { value: 'press', label: 'Presse' },
    { value: 'customers', label: 'Kunden' },
    { value: 'partners', label: 'Partner' },
    { value: 'leads', label: 'Leads' },
    { value: 'custom', label: 'Benutzerdefiniert' }
  ];

  const colorOptions = [
    { value: 'blue', label: 'Blau', class: 'bg-blue-500' },
    { value: 'green', label: 'Grün', class: 'bg-green-500' },
    { value: 'purple', label: 'Lila', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'red', label: 'Rot', class: 'bg-red-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'yellow', label: 'Gelb', class: 'bg-yellow-500' },
    { value: 'zinc', label: 'Grau', class: 'bg-zinc-500' }
  ];

  const companyTypeOptions = [
    { value: 'customer', label: 'Kunde' },
    { value: 'supplier', label: 'Lieferant' },
    { value: 'partner', label: 'Partner' },
    { value: 'publisher', label: 'Verlag' },
    { value: 'media_house', label: 'Medienhaus' },
    { value: 'agency', label: 'Agentur' },
    { value: 'other', label: 'Sonstiges' }
  ];

  return (
    <Dialog open={true} onClose={onClose} size="4xl">
      <form onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-base font-semibold">
          {list ? 'Liste bearbeiten' : 'Neue Liste erstellen'}
        </DialogTitle>
        
        <DialogBody className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Linke Spalte: Grundeinstellungen */}
            <div className="space-y-6">
              <FieldGroup>
                {/* Template-Auswahl (nur bei neuen Listen) */}
                {!list && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <h3 className="font-medium text-blue-900 mb-3">Vorlage verwenden</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {LIST_TEMPLATES.map(template => (
                        <button
                          key={template.name}
                          type="button"
                          onClick={() => handleTemplateSelect(template.name)}
                          className={clsx(
                            "text-left p-3 rounded border text-sm",
                            selectedTemplate === template.name
                              ? "border-blue-300 bg-blue-100 text-blue-800"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          )}
                        >
                          <div className="font-medium">{template.name}</div>
                          <div className="text-gray-600 text-xs">{template.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Field>
                  <Label>Listen-Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus
                  />
                </Field>

                <Field>
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Kurze Beschreibung der Liste..."
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <Label>Kategorie</Label>
                    <Select
                      value={formData.category || 'custom'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field>
                    <Label>Farbe</Label>
                    <div className="flex gap-2 mt-1">
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: color.value as any })}
                          className={clsx(
                            "w-8 h-8 rounded-full border-2",
                            color.class,
                            formData.color === color.value
                              ? "border-gray-800 ring-2 ring-gray-300"
                              : "border-gray-300"
                          )}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </Field>
                </div>

                {/* Listen-Typ mit korrekter Typisierung */}
                <Field>
                  <Label>Listen-Typ</Label>
                  <RadioGroup
                    value={formData.type}
                    onChange={(value: 'dynamic' | 'static') => setFormData({ ...formData, type: value })}
                  >
                    <RadioField>
                      <Radio value="dynamic" />
                      <Label>Dynamische Liste</Label>
                      <Description>
                        Kontakte werden automatisch basierend auf Filtern hinzugefügt/entfernt
                      </Description>
                    </RadioField>
                    <RadioField>
                      <Radio value="static" />
                      <Label>Statische Liste</Label>
                      <Description>
                        Kontakte werden manuell ausgewählt und bleiben fest
                      </Description>
                    </RadioField>
                  </RadioGroup>
                </Field>

                {/* Filter für dynamische Listen */}
                {formData.type === 'dynamic' && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-medium mb-4">Filter-Kriterien</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Firmentypen</label>
                          <MultiSelectDropdown
                            label=""
                            placeholder="Firmentypen wählen..."
                            options={companyTypeOptions}
                            selectedValues={formData.filters?.companyTypes || []}
                            onChange={(values) => handleFilterChange('companyTypes', values)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                          <MultiSelectDropdown
                            label=""
                            placeholder="Tags wählen..."
                            options={tags.map(tag => ({ value: tag.id!, label: tag.name }))}
                            selectedValues={formData.filters?.tagIds || []}
                            onChange={(values) => handleFilterChange('tagIds', values)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Branchen</label>
                          <MultiSelectDropdown
                            label=""
                            placeholder="Branchen wählen..."
                            options={availableIndustries.map(industry => ({ value: industry, label: industry }))}
                            selectedValues={formData.filters?.industries || []}
                            onChange={(values) => handleFilterChange('industries', values)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Positionen</label>
                          <MultiSelectDropdown
                            label=""
                            placeholder="Positionen wählen..."
                            options={availablePositions.map(pos => ({ value: pos, label: pos }))}
                            selectedValues={formData.filters?.positions || []}
                            onChange={(values) => handleFilterChange('positions', values)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Länder</label>
                          <MultiSelectDropdown
                            label=""
                            placeholder="Länder wählen..."
                            options={availableCountries.map(country => ({ value: country, label: country }))}
                            selectedValues={formData.filters?.countries || []}
                            onChange={(values) => handleFilterChange('countries', values)}
                          />
                        </div>

                        <div className="flex items-center space-x-4 pt-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.filters?.hasEmail || false}
                              onChange={(e) => handleFilterChange('hasEmail', e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm">Hat E-Mail</span>
                          </label>
                        </div>

                        <div className="flex items-center space-x-4 pt-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.filters?.hasPhone || false}
                              onChange={(e) => handleFilterChange('hasPhone', e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm">Hat Telefon</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </FieldGroup>
            </div>

            {/* Rechte Spalte: Vorschau */}
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Vorschau</h3>
                  {loadingPreview ? (
                    <span className="text-sm text-gray-500">Lade...</span>
                  ) : (
                    <Badge color="blue" className="text-xs">
                      {previewCount.toLocaleString()} Kontakte
                    </Badge>
                  )}
                </div>

                {previewContacts.length > 0 ? (
                  <div className="space-y-2">
                    {previewContacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {contact.position && `${contact.position} • `}
                            {contact.companyName || 'Keine Firma'}
                          </div>
                        </div>
                        {contact.email && (
                          <div className="text-xs text-blue-600">📧</div>
                        )}
                      </div>
                    ))}
                    {previewCount > 10 && (
                      <div className="text-sm text-gray-500 text-center py-2">
                        ... und {previewCount - 10} weitere Kontakte
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-sm">
                      {formData.type === 'dynamic' 
                        ? "Keine Kontakte entsprechen den Filtern"
                        : "Noch keine Kontakte ausgewählt"
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogActions className="px-6 py-4 flex justify-end gap-x-4">
          <Button plain onClick={onClose}>Abbrechen</Button>
          <Button color="indigo" type="submit" disabled={loading || !formData.name}>
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}