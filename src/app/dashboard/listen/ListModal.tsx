// src/app/dashboard/listen/ListModal.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Radio, RadioGroup, RadioField } from "@/components/radio";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { listsService } from "@/lib/firebase/lists-service";
import { useCrmData } from "@/context/CrmDataContext";
import { DistributionList, ListFilters, LIST_TEMPLATES, ExtendedCompanyType } from "@/types/lists";
import { Contact } from "@/types/crm";
import clsx from "clsx";
import ContactSelectorModal from "./ContactSelectorModal";

interface ListModalProps {
  list?: DistributionList;
  onClose: () => void;
  onSave: (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  userId: string;
}

export default function ListModal({ list, onClose, onSave, userId }: ListModalProps) {
  const { companies, contacts, tags } = useCrmData();

  const [formData, setFormData] = useState<Partial<DistributionList>>({
    name: '',
    description: '',
    type: 'dynamic',
    category: 'custom',
    color: 'blue',
    filters: {},
    contactIds: []
  });
  
  const [isContactSelectorOpen, setIsContactSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const availableIndustries = useMemo(() => Array.from(new Set(companies.map(c => c.industry).filter((item): item is string => !!item))).sort(), [companies]);
  const availablePositions = useMemo(() => Array.from(new Set(contacts.map(c => c.position).filter((item): item is string => !!item))).sort(), [contacts]);
  const availableCountries = useMemo(() => Array.from(new Set(companies.map(c => c.address?.country).filter((item): item is string => !!item))).sort(), [companies]);

  useEffect(() => {
    if (list) {
      setFormData({
        ...list,
        filters: list.filters || {},
        contactIds: list.contactIds || []
      });
    }
  }, [list]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.type === 'dynamic') {
        updatePreview();
      } else if (formData.type === 'static') {
        updateStaticPreview();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.filters, formData.contactIds, formData.type]);

  const updatePreview = async () => {
    if (!formData.filters || !userId) return;
    setLoadingPreview(true);
    try {
      const contacts = await listsService.getContactsByFilters(formData.filters, userId);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      console.error("Fehler bei der Vorschau:", error);
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
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = LIST_TEMPLATES.find(t => t.name === templateId);
    if (template) {
      setFormData(prev => ({ ...prev, name: template.name, description: template.description, category: template.category, color: template.color, type: 'dynamic', filters: { ...template.filters } }));
      setSelectedTemplate(templateId);
    }
  };

  const handleFilterChange = (filterKey: keyof ListFilters, value: any) => {
    setFormData(prev => ({ ...prev, filters: { ...prev.filters, [filterKey]: value } }));
  };

  const handleSaveContactSelection = (selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, contactIds: selectedIds }));
    setIsContactSelectorOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setLoading(true);
    try {
      const dataToSave: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'> = {
        name: formData.name, description: formData.description || '', type: formData.type!, category: formData.category || 'custom',
        color: formData.color || 'blue', userId: userId,
        filters: formData.type === 'dynamic' ? formData.filters : {},
        contactIds: formData.type === 'static' ? formData.contactIds : [],
      };
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern der Liste:", error);
      alert("Fehler beim Speichern der Liste");
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [ { value: 'press', label: 'Presse' }, { value: 'customers', label: 'Kunden' }, { value: 'partners', label: 'Partner' }, { value: 'leads', label: 'Leads' }, { value: 'custom', label: 'Benutzerdefiniert' }];
  const colorOptions = [ { value: 'blue', class: 'bg-blue-500' }, { value: 'green', class: 'bg-green-500' }, { value: 'purple', class: 'bg-purple-500' }, { value: 'orange', class: 'bg-orange-500' }, { value: 'red', class: 'bg-red-500' }, { value: 'pink', class: 'bg-pink-500' }, { value: 'yellow', class: 'bg-yellow-500' }, { value: 'zinc', class: 'bg-zinc-500' }];
  const companyTypeOptions = [ { value: 'customer', label: 'Kunde' }, { value: 'supplier', label: 'Lieferant' }, { value: 'partner', label: 'Partner' }, { value: 'publisher', label: 'Verlag' }, { value: 'media_house', label: 'Medienhaus' }, { value: 'agency', label: 'Agentur' }, { value: 'other', label: 'Sonstiges' } ];

  return (
    <>
      <Dialog open={true} onClose={onClose} size="4xl">
        <form onSubmit={handleSubmit}>
          <DialogTitle className="px-6 py-4 text-base font-semibold">
            {list ? 'Liste bearbeiten' : 'Neue Liste erstellen'}
          </DialogTitle>
          <DialogBody className="p-6 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <FieldGroup>
                  {!list && (
                    <Field>
                      <Label>Vorlage verwenden</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {LIST_TEMPLATES.map(template => (
                          <button key={template.name} type="button" onClick={() => handleTemplateSelect(template.name)} className={clsx("text-left p-3 rounded-lg border text-sm", selectedTemplate === template.name ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500" : "bg-white hover:border-gray-300")}>
                            <div className="font-semibold">{template.name}</div>
                            <div className="text-gray-600 text-xs mt-1">{template.description}</div>
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}
                  <Field>
                    <Label>Listen-Name *</Label>
                    <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required autoFocus />
                  </Field>
                  <Field>
                    <Label>Beschreibung</Label>
                    <Textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Kurze Beschreibung der Liste..."/>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <Label>Kategorie</Label>
                      <Select value={formData.category || 'custom'} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}>
                        {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                    </Field>
                    <Field>
                      <Label>Farbe</Label>
                      <div className="flex gap-2 mt-1">
                        {colorOptions.map(color => (
                          <button key={color.value} type="button" onClick={() => setFormData({ ...formData, color: color.value as any })} className={clsx("w-8 h-8 rounded-full border-2 transition", color.class, formData.color === color.value ? "border-indigo-600 ring-2 ring-indigo-300" : "border-gray-300 hover:border-indigo-400")} />
                        ))}
                      </div>
                    </Field>
                  </div>
                  <Field>
                    <Label>Listen-Typ</Label>
                    <RadioGroup value={formData.type} onChange={(value: 'dynamic' | 'static') => setFormData({ ...formData, type: value })} className="mt-2 space-y-4">
                      <RadioField><Radio value="dynamic" /><div className="ml-3 text-sm leading-6"><Label>Dynamische Liste</Label><Description>Kontakte werden automatisch basierend auf Filtern aktualisiert.</Description></div></RadioField>
                      <RadioField><Radio value="static" /><div className="ml-3 text-sm leading-6"><Label>Statische Liste</Label><Description>Kontakte werden manuell ausgewählt und bleiben fest.</Description></div></RadioField>
                    </RadioGroup>
                  </Field>
                  {formData.type === 'dynamic' && (
                    <div className="border rounded-lg p-4 bg-zinc-50/50">
                      <h3 className="font-medium mb-4 text-zinc-900">Filter-Kriterien</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <MultiSelectDropdown label="Firmentypen" placeholder="Alle Typen" options={companyTypeOptions} selectedValues={formData.filters?.companyTypes || []} onChange={(values) => handleFilterChange('companyTypes', values as ExtendedCompanyType[])}/>
                          <MultiSelectDropdown label="Tags" placeholder="Alle Tags" options={tags.map(tag => ({ value: tag.id!, label: tag.name }))} selectedValues={formData.filters?.tagIds || []} onChange={(values) => handleFilterChange('tagIds', values)}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <MultiSelectDropdown label="Branchen" placeholder="Alle Branchen" options={availableIndustries.map(i => ({ value: i, label: i }))} selectedValues={formData.filters?.industries || []} onChange={(values) => handleFilterChange('industries', values)}/>
                          <MultiSelectDropdown label="Positionen" placeholder="Alle Positionen" options={availablePositions.map(p => ({ value: p, label: p }))} selectedValues={formData.filters?.positions || []} onChange={(values) => handleFilterChange('positions', values)}/>
                        </div>
                        <MultiSelectDropdown label="Länder" placeholder="Alle Länder" options={availableCountries.map(c => ({ value: c, label: c }))} selectedValues={formData.filters?.countries || []} onChange={(values) => handleFilterChange('countries', values)}/>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="relative flex items-center"><input id="hasEmail" type="checkbox" checked={formData.filters?.hasEmail || false} onChange={(e) => handleFilterChange('hasEmail', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"/><label htmlFor="hasEmail" className="ml-3 block text-sm leading-6 text-gray-900">Hat E-Mail</label></div>
                          <div className="relative flex items-center"><input id="hasPhone" type="checkbox" checked={formData.filters?.hasPhone || false} onChange={(e) => handleFilterChange('hasPhone', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"/><label htmlFor="hasPhone" className="ml-3 block text-sm leading-6 text-gray-900">Hat Telefon</label></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {formData.type === 'static' && (
                    <div className="border rounded-lg p-4 bg-zinc-50/50">
                        <h3 className="font-medium mb-2 text-zinc-900">Manuelle Kontaktauswahl</h3>
                        <p className="text-sm text-zinc-600 mb-4">Füge Kontakte manuell zu dieser Liste hinzu. Die Auswahl bleibt unverändert, bis du sie wieder anpasst.</p>
                        <Button type="button" onClick={() => setIsContactSelectorOpen(true)}>
                            {(formData.contactIds?.length || 0).toLocaleString()} Kontakte auswählen
                        </Button>
                    </div>
                  )}
                </FieldGroup>
              </div>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-white sticky top-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-zinc-900">Vorschau</h3>
                    {loadingPreview ? (<span className="text-sm text-zinc-500">Lade...</span>) : (<Badge color="blue">{previewCount.toLocaleString()} Kontakte</Badge>)}
                  </div>
                  {previewContacts.length > 0 ? (
                    <div className="space-y-1">
                      {previewContacts.map(contact => (
                        <div key={contact.id} className="flex items-center justify-between py-1.5 px-2 bg-zinc-50 rounded">
                          <div>
                            <div className="font-medium text-sm text-zinc-800">{contact.firstName} {contact.lastName}</div>
                            <div className="text-xs text-zinc-500">{contact.position && `${contact.position} • `}{contact.companyName || 'Keine Firma'}</div>
                          </div>
                          {contact.email && (<div className="text-xs text-indigo-600" title={contact.email}>📧</div>)}
                        </div>
                      ))}
                      {previewCount > 10 && (<div className="text-sm text-zinc-500 text-center pt-2">... und {(previewCount - 10).toLocaleString()} weitere Kontakte</div>)}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500"><div className="text-sm">{formData.type === 'dynamic' ? "Keine Kontakte entsprechen den Filtern." : "Noch keine Kontakte ausgewählt."}</div></div>
                  )}
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogActions className="px-6 py-4 flex justify-end gap-x-4">
            <Button plain onClick={onClose}>Abbrechen</Button>
            <Button color="indigo" type="submit" disabled={loading || !formData.name}>{loading ? 'Speichern...' : 'Speichern'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {isContactSelectorOpen && (
        <ContactSelectorModal
          initialSelectedIds={formData.contactIds || []}
          onClose={() => setIsContactSelectorOpen(false)}
          onSave={handleSaveContactSelection}
        />
      )}
    </>
  );
}